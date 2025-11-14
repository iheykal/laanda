import React, { useState, useEffect, useContext, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { SocketContext } from '../../App';
import { useAuth } from '../../context/AuthContext';
import styles from './MatchmakingScreen.module.css';

const MatchmakingScreen = ({ betAmount, onCancel }) => {
    const socket = useContext(SocketContext);
    const { user } = useAuth();
    const navigate = useNavigate();
    const [searchTime, setSearchTime] = useState(0);
    const [status, setStatus] = useState('searching');
    
    // Refs to prevent duplicate operations and track state
    const hasJoinedRef = useRef(false);
    const roomCreatedRef = useRef(false);
    const pollingIntervalRef = useRef(null);
    const statusRef = useRef('searching');
    const searchTimeRef = useRef(0);
    const ourRoomIdRef = useRef(null);
    const navigationTimeoutRef = useRef(null);

    useEffect(() => {
        // Reset refs when betAmount changes
        hasJoinedRef.current = false;
        roomCreatedRef.current = false;
        ourRoomIdRef.current = null;
        searchTimeRef.current = 0;
        if (navigationTimeoutRef.current) {
            clearTimeout(navigationTimeoutRef.current);
            navigationTimeoutRef.current = null;
        }
        
        // Define linkSessionToWallet first
        const linkSessionToWallet = async () => {
            try {
                const token = localStorage.getItem('token');
                await fetch(`${window.location.protocol}//${window.location.host}/api/game/set-session`, {
                    method: 'POST',
                    headers: {
                        'Authorization': `Bearer ${token}`,
                        'Content-Type': 'application/json'
                    },
                    credentials: 'include'
                });
                console.log('✅ Session linked for matchmaking');
            } catch (error) {
                console.error('Failed to link session:', error);
            }
        };

        // Define navigateToGame function first (used by multiple handlers)
        const navigateToGame = () => {
            if (statusRef.current === 'found') return; // Already navigating or navigated
            
            console.log('🎮 Navigating to game...');
            setStatus('found');
            statusRef.current = 'found';
            
            // Stop polling
            if (pollingIntervalRef.current) {
                clearInterval(pollingIntervalRef.current);
                pollingIntervalRef.current = null;
            }
            
            // Clear navigation timeout if it exists
            if (navigationTimeoutRef.current) {
                clearTimeout(navigationTimeoutRef.current);
                navigationTimeoutRef.current = null;
            }
            
            // Navigate to game immediately - GameRoute will handle loading
            console.log('🚀 Navigating to /game...');
            navigate('/game', { replace: true });
        };

        // Link session to wallet first
        linkSessionToWallet();

        // Define handlers inside useEffect to avoid stale closures
        const handleRoomUpdate = (data) => {
            // Prevent processing if we've already joined and room is full
            if (hasJoinedRef.current && statusRef.current === 'found') return;
            
            const rooms = JSON.parse(data);
            
            // If we created a room and joined it, check if opponent joined
            if (ourRoomIdRef.current && hasJoinedRef.current && statusRef.current === 'creating') {
                const ourRoom = rooms.find(room => String(room._id) === String(ourRoomIdRef.current));
                if (ourRoom) {
                    console.log(`📊 Our room status: ${ourRoom.players.length}/2 players, started: ${ourRoom.started}, full: ${ourRoom.full}`);
                    
                    // Navigate if room is full or has 2+ players or game started
                    if (ourRoom.players.length >= 2 || ourRoom.started || ourRoom.full) {
                        console.log('✅ Opponent joined our room! Navigating to game...');
                        navigateToGame();
                        return;
                    }
                }
            }
            
            // If we created a room and are in 'creating' status, try to join it
            if (roomCreatedRef.current && statusRef.current === 'creating' && !hasJoinedRef.current) {
                const ourRoom = rooms.find(
                    room => !room.started && 
                            room.betAmount === betAmount &&
                            !room.private &&
                            room.players.length < 2
                );
                
                if (ourRoom) {
                    // Join the room we created (so we're player 1)
                    ourRoomIdRef.current = String(ourRoom._id);
                    hasJoinedRef.current = true;
                    
                    console.log(`✅ Joining our created room: ${ourRoom._id}`);
                    socket.emit('player:login', {
                        name: user.username,
                        password: '',
                        roomId: ourRoom._id
                    });
                    // Continue polling to detect when opponent joins (don't stop polling here)
                    return;
                }
            }
            
            // Find available room with same bet amount (for finding existing matches)
            // Prioritize rooms with exactly 1 player (waiting for opponent)
            const availableRoom = rooms.find(
                room => !room.started && 
                        room.players.length === 1 && 
                        room.betAmount === betAmount &&
                        !room.private &&
                        room.players[0].name !== user.username // Don't join our own room
            );

            if (availableRoom && !hasJoinedRef.current) {
                // Found a match! Join immediately
                console.log(`✅ Match found! Joining room: ${availableRoom._id} immediately`);
                ourRoomIdRef.current = String(availableRoom._id);
                
                // Join IMMEDIATELY - no delay
                socket.emit('player:login', {
                    name: user.username,
                    password: '',
                    roomId: availableRoom._id
                });
                // Don't set hasJoinedRef here - wait for player:data event
                // Don't navigate here - wait for player:data and room:data events
            } else if (!roomCreatedRef.current && !hasJoinedRef.current && searchTimeRef.current >= 2) {
                // No match found after 2 seconds, create new room
                // Increased delay to give more time for finding matches
                createNewRoom();
            }
        };
        
        const handlePlayerJoined = (data) => {
            // Prevent duplicate handling
            if (hasJoinedRef.current && statusRef.current === 'found') return;
            
            const playerData = JSON.parse(data);
            console.log('✅ Joined room successfully:', playerData.roomId);
            
            ourRoomIdRef.current = String(playerData.roomId);
            hasJoinedRef.current = true;
            
            // Request room data to check if game should start
            console.log('📡 Requesting room data to check game status...');
            socket.emit('room:data');
            
            // Clear any existing timeout
            if (navigationTimeoutRef.current) {
                clearTimeout(navigationTimeoutRef.current);
            }
            
            // Set a navigation timeout as fallback - navigate after 1.5 seconds regardless
            // This ensures navigation even if room:data events are delayed
            navigationTimeoutRef.current = setTimeout(() => {
                if (hasJoinedRef.current && statusRef.current !== 'found') {
                    console.log('⏰ Timeout reached - navigating to game now');
                    navigateToGame();
                }
            }, 1500);
        };
        
        const createNewRoom = () => {
            // Prevent duplicate room creation
            if (roomCreatedRef.current || hasJoinedRef.current) return;
            
            roomCreatedRef.current = true;
            setStatus('creating');
            statusRef.current = 'creating';
            
            const roomName = `${user.username}'s Quick Match`;
            console.log(`🎮 Creating new room: ${roomName} with bet: $${betAmount}`);
            
            socket.emit('room:create', {
                name: roomName,
                password: '',
                private: false,
                betAmount: betAmount,
                requiresBet: betAmount > 0,
            });

            // After creating, refresh room list to get our new room and join it
            setTimeout(() => {
                socket.emit('room:rooms'); // This will trigger handleRoomUpdate which will join the room
            }, 300);
        };
        
        const startContinuousPolling = () => {
            console.log(`🔍 Starting continuous search for match with bet: $${betAmount}`);
            
            // Initial search
            socket.emit('room:rooms');
            
            // Poll every 500ms for matching to reduce race conditions
            // More frequent polling helps catch rooms created by other players quickly
            pollingIntervalRef.current = setInterval(() => {
                if (!hasJoinedRef.current || (hasJoinedRef.current && roomCreatedRef.current && statusRef.current === 'creating')) {
                    // Continue polling if not joined, or if we joined our own room (waiting for opponent)
                    socket.emit('room:rooms');
                } else if (hasJoinedRef.current && statusRef.current === 'found') {
                    // Stop polling if we joined an existing room
                    if (pollingIntervalRef.current) {
                        clearInterval(pollingIntervalRef.current);
                        pollingIntervalRef.current = null;
                    }
                }
            }, 500);
        };

        // Start continuous polling for matches
        startContinuousPolling();

        // Timer for search duration
        const timer = setInterval(() => {
            setSearchTime(prev => {
                const newTime = prev + 1;
                searchTimeRef.current = newTime;
                return newTime;
            });
        }, 1000);

        // Listen for room updates
        socket.on('room:rooms', handleRoomUpdate);
        
        // Listen for player data (joined room successfully)
        socket.on('player:data', handlePlayerJoined);
        
        // Listen for room data updates (to detect when game starts or room becomes full)
        const handleRoomDataUpdate = (data) => {
            try {
                const roomData = JSON.parse(data);
                
                // Check if this is our room
                const isOurRoom = ourRoomIdRef.current && String(roomData._id) === String(ourRoomIdRef.current);
                
                if (!isOurRoom && !hasJoinedRef.current) {
                    return; // Not our room, ignore
                }
                
                console.log('📡 Received room data update:', {
                    roomId: roomData._id,
                    started: roomData.started,
                    full: roomData.full,
                    players: roomData.players?.length || 0,
                    ourRoomId: ourRoomIdRef.current
                });
                
                // Update our room ID if we don't have it yet
                if (!ourRoomIdRef.current && roomData._id) {
                    ourRoomIdRef.current = String(roomData._id);
                }
                
                // Navigate if:
                // 1. Game has started, OR
                // 2. Room is full (2 players), OR
                // 3. Room has 2+ players (regardless of started flag)
                const shouldNavigate = roomData.started || 
                                     roomData.full || 
                                     (roomData.players && roomData.players.length >= 2);
                
                if (shouldNavigate && hasJoinedRef.current) {
                    console.log(`✅ Match complete! (started: ${roomData.started}, full: ${roomData.full}, players: ${roomData.players?.length}) - Navigating to game...`);
                    navigateToGame();
                }
            } catch (error) {
                console.error('Error parsing room data:', error);
            }
        };
        
        socket.on('room:data', handleRoomDataUpdate);

        return () => {
            clearInterval(timer);
            if (pollingIntervalRef.current) {
                clearInterval(pollingIntervalRef.current);
            }
            if (navigationTimeoutRef.current) {
                clearTimeout(navigationTimeoutRef.current);
            }
            socket.off('room:rooms', handleRoomUpdate);
            socket.off('player:data', handlePlayerJoined);
            socket.off('room:data', handleRoomDataUpdate);
        };
    }, [betAmount, socket, user, navigate]);

    const formatTime = (seconds) => {
        const mins = Math.floor(seconds / 60);
        const secs = seconds % 60;
        return `${mins}:${secs.toString().padStart(2, '0')}`;
    };

    const getStatusMessage = () => {
        switch (status) {
            case 'searching':
                return 'Searching for opponent...';
            case 'found':
                return 'Opponent found!';
            case 'creating':
                return 'Creating game room...';
            default:
                return 'Connecting...';
        }
    };

    return (
        <div className={styles.overlay}>
            <div className={styles.matchmakingCard}>
                {/* Animated Search Icon */}
                <div className={styles.searchAnimation}>
                    {status === 'searching' && (
                        <>
                            <div className={styles.radar}></div>
                            <div className={styles.searchIcon}>🎯</div>
                        </>
                    )}
                    {status === 'found' && (
                        <div className={styles.successIcon}>✅</div>
                    )}
                    {status === 'creating' && (
                        <div className={styles.creatingIcon}>🎮</div>
                    )}
                </div>

                {/* Status Message */}
                <h2 className={styles.statusMessage}>{getStatusMessage()}</h2>

                {/* Bet Amount Display */}
                <div className={styles.betDisplay}>
                    <span className={styles.betLabel}>Bet Amount:</span>
                    <span className={styles.betValue}>
                        {betAmount === 0 ? '🆓 Free' : `💰 $${betAmount}`}
                    </span>
                </div>

                {/* Search Time */}
                <div className={styles.searchTime}>
                    <span className={styles.timeIcon}>⏱️</span>
                    <span className={styles.timeValue}>{formatTime(searchTime)}</span>
                </div>

                {/* Loading Dots */}
                {status === 'searching' && (
                    <div className={styles.loadingDots}>
                        <span className={styles.dot}></span>
                        <span className={styles.dot}></span>
                        <span className={styles.dot}></span>
                    </div>
                )}

                {/* Success Message */}
                {status === 'found' && (
                    <div className={styles.successMessage}>
                        <p className={styles.successText}>🎉 Match found!</p>
                        <p className={styles.subText}>Joining game...</p>
                    </div>
                )}

                {/* Creating Message */}
                {status === 'creating' && (
                    <div className={styles.creatingMessage}>
                        <p className={styles.creatingText}>Creating your game room...</p>
                        <p className={styles.subText}>Other players can join you</p>
                    </div>
                )}

                {/* Cancel Button */}
                {status === 'searching' && (
                    <button 
                        className={styles.cancelButton}
                        onClick={onCancel}
                    >
                        Cancel Search
                    </button>
                )}

                {/* Info Text */}
                <div className={styles.infoText}>
                    {status === 'searching' && (
                        <p>We're finding the perfect opponent for you...</p>
                    )}
                    {status === 'creating' && (
                        <p>Your room will be visible to other players</p>
                    )}
                </div>
            </div>
        </div>
    );
};

export default MatchmakingScreen;



