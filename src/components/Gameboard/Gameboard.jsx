import React, { useState, useEffect, useContext, useRef } from 'react';
import ReactLoading from 'react-loading';
import { PlayerDataContext, SocketContext } from '../../App';
import { useAuth } from '../../context/AuthContext';
import useSocketData from '../../hooks/useSocketData';
import { playTokenKilled, playPawnMove } from '../../utils/soundEffects';
import Map from './Map/Map';
import Dashboard from './Dashboard/Dashboard';
import Navbar from '../Navbar/Navbar';
import Overlay from '../Overlay/Overlay';
import styles from './Gameboard.module.css';
import trophyImage from '../../images/trophy.webp';

const Gameboard = () => {
    const socket = useContext(SocketContext);
    const context = useContext(PlayerDataContext);
    const auth = useAuth();
    const user = auth?.user || null;
    const [pawns, setPawns] = useState([]);
    const [players, setPlayers] = useState([]);

    const [rolledNumber, setRolledNumber] = useSocketData('game:roll');
    const [rollHistory, setRollHistory] = useState([]);
    const [selectedRoll, setSelectedRoll] = useState(null);
    const [time, setTime] = useState();
    const [isReady, setIsReady] = useState();
    const [nowMoving, setNowMoving] = useState(false);
    const [started, setStarted] = useState(false);

    const [movingPlayer, setMovingPlayer] = useState('red');

    const [winner, setWinner] = useState(null);
    const [payoutInfo, setPayoutInfo] = useState(null);
    const [matchResult, setMatchResult] = useState(null); // { isWinner: boolean, amount: number }
    
    // Track previous pawns to detect captures
    const prevPawnsRef = useRef([]);

    useEffect(() => {
        // Request initial room data
        socket.emit('room:data', context.roomId);
        
        // Set up room:data listener with proper error handling
        const handleRoomData = (data) => {
            try {
                data = JSON.parse(data);
                console.log('📦 Room data received:', {
                    players: data.players?.length,
                    pawns: data.pawns?.length,
                    started: data.started,
                    nowMoving: data.players?.find(p => p.nowMoving)?.color
                });
                
                if (data.players == null) {
                    console.warn('⚠️ Room data missing players array');
                    return;
                }
                
                // Checks if client is currently moving player by session ID
                const nowMovingPlayer = data.players.find(player => player.nowMoving === true);
                if (nowMovingPlayer) {
                    const isMyTurn = nowMovingPlayer._id === context.playerId;
                    setNowMoving(isMyTurn);
                    setMovingPlayer(nowMovingPlayer.color);
                    console.log(`🔄 Turn update: ${nowMovingPlayer.color} is moving (${isMyTurn ? 'MY TURN ✅' : 'NOT MY TURN ❌'})`);
                } else {
                    setNowMoving(false);
                    console.warn('⚠️ No player marked as moving in room data');
                }
                
                const currentPlayer = data.players.find(player => player._id === context.playerId);
                if (currentPlayer) {
                    setIsReady(currentPlayer.ready);
                }
                setRolledNumber(data.rolledNumber);
                setRollHistory(data.rollHistory || []);
                // Auto-select the latest roll if not already selected
                if (data.rollHistory && data.rollHistory.length > 0) {
                    if (!selectedRoll || !data.rollHistory.includes(selectedRoll)) {
                        setSelectedRoll(data.rollHistory[data.rollHistory.length - 1]);
                    }
                } else {
                    // Clear selection when history is empty
                    setSelectedRoll(null);
                }
                setPlayers(data.players);
                
                // Detect pawn captures and moves by comparing positions
                const prevPawns = prevPawnsRef.current;
                if (prevPawns.length > 0 && data.pawns) {
                    let captureDetected = false;
                    let moveDetected = false;
                    
                    // Check if any pawn moved back to base position (captured)
                    data.pawns.forEach((currentPawn) => {
                        const prevPawn = prevPawns.find(p => p._id === currentPawn._id);
                        if (prevPawn) {
                            // If pawn was on the board (position !== basePos) and now is at basePos, it was captured
                            if (prevPawn.position !== prevPawn.basePos && 
                                currentPawn.position === currentPawn.basePos) {
                                captureDetected = true;
                            } 
                            // If pawn moved normally (not captured and not at base), it's a move
                            else if (prevPawn.position !== currentPawn.position && 
                                     currentPawn.position !== currentPawn.basePos &&
                                     prevPawn.position !== prevPawn.basePos) {
                                moveDetected = true;
                            }
                        }
                    });
                    
                    // Play sounds (capture takes priority)
                    if (captureDetected) {
                        console.log('⚔️ Pawn captured detected!');
                        playTokenKilled();
                    } else if (moveDetected) {
                        playPawnMove();
                    }
                }
                
                prevPawnsRef.current = JSON.parse(JSON.stringify(data.pawns || []));
                setPawns(data.pawns);
                setTime(data.nextMoveTime);
                setStarted(data.started);
            } catch (error) {
                console.error('❌ Error parsing room:data:', error, data);
            }
        };

        const handleGameWinner = (winner) => {
            setWinner(winner);
        };
        
        const handlePayout = (data) => {
            setPayoutInfo(data);
            console.log('💰 Payout received:', data);
        };
        
        const handleRedirect = () => {
            window.location.reload();
        };

        const handleBalanceUpdate = (data) => {
            console.log('💰 Balance update received:', data);
            // Only update if this is the current user
            if (user && user.id === data.userId) {
                const setBalance = auth?.setBalance || (() => {});
                setBalance(data.newBalance);
                
                // Store match result for display
                if (data.reason === 'game_win') {
                    setMatchResult(prev => ({
                        isWinner: true,
                        amount: data.added || (prev?.amount || 0)
                    }));
                    console.log(`🎉 YOU WON! Added: $${data.added.toFixed(2)} | New balance: $${data.newBalance.toFixed(2)}`);
                } else if (data.reason === 'game_loss') {
                    setMatchResult(prev => ({
                        isWinner: false,
                        amount: data.deducted || (prev?.amount || 0)
                    }));
                    console.log(`💔 You lost. Deducted: $${data.deducted.toFixed(2)} | New balance: $${data.newBalance.toFixed(2)}`);
                }
            }
        };

        // Register all socket listeners
        socket.on('room:data', handleRoomData);
        socket.on('game:winner', handleGameWinner);
        socket.on('game:payout', handlePayout);
        socket.on('redirect', handleRedirect);
        socket.on('balance:update', handleBalanceUpdate);

        // Cleanup function to remove all listeners when component unmounts or dependencies change
        return () => {
            console.log('🧹 Cleaning up socket listeners for Gameboard');
            socket.off('room:data', handleRoomData);
            socket.off('game:winner', handleGameWinner);
            socket.off('game:payout', handlePayout);
            socket.off('redirect', handleRedirect);
            socket.off('balance:update', handleBalanceUpdate);
        };

    }, [socket, context.playerId, context.roomId, setRolledNumber, user, auth, selectedRoll]);

    // Fallback: Determine win/loss from winner color if matchResult not set yet
    useEffect(() => {
        if (winner && !matchResult && context.color) {
            const isWinner = context.color === winner;
            setMatchResult({
                isWinner: isWinner,
                amount: 0 // Will be updated when balance update arrives
            });
        }
    }, [winner, matchResult, context.color]);

    // Auto-move if only one pawn can move
    const autoMovedRef = useRef(false);
    const lastRollRef = useRef(null);
    
    useEffect(() => {
        // Only auto-move if it's the player's turn
        if (!nowMoving || !pawns.length || !context.color) {
            autoMovedRef.current = false;
            lastRollRef.current = null;
            return;
        }
        
        // Determine which roll to use
        const rollToUse = selectedRoll || rolledNumber;
        
        // No valid roll available
        if (!rollToUse) {
            autoMovedRef.current = false;
            lastRollRef.current = null;
            return;
        }
        
        // Check if we already auto-moved for this specific roll
        if (autoMovedRef.current && lastRollRef.current === rollToUse) {
            return;
        }

        // Find all pawns of the current player's color that can move
        const canPawnMove = require('./Map/canPawnMove').default;
        const playerPawns = pawns.filter(pawn => pawn.color === context.color);
        const movablePawns = playerPawns.filter(pawn => canPawnMove(pawn, rollToUse));

        // If exactly one pawn can move, auto-move it
        if (movablePawns.length === 1) {
            autoMovedRef.current = true;
            lastRollRef.current = rollToUse;
            console.log('🤖 Auto-moving the only valid pawn:', movablePawns[0]._id, 'with roll:', rollToUse);
            
            // Small delay to make it feel more natural
            setTimeout(() => {
                socket.emit('game:move', {
                    pawnId: movablePawns[0]._id,
                    rollNumber: rollToUse
                });
            }, 300);
        } else {
            autoMovedRef.current = false;
            lastRollRef.current = null;
        }
    }, [nowMoving, rolledNumber, selectedRoll, pawns, context.color, socket]);

    return (
        <>
            {players.length >= 2 && pawns.length > 0 ? (
                <div className='container'>
                    <Navbar
                        players={players}
                        started={started}
                        time={time}
                        isReady={isReady}
                        movingPlayer={movingPlayer}
                        rolledNumber={rolledNumber}
                        rollHistory={rollHistory}
                        selectedRoll={selectedRoll}
                        onSelectRoll={setSelectedRoll}
                        nowMoving={nowMoving}
                        ended={winner !== null}
                    />
                    <Map 
                        pawns={pawns}
                        nowMoving={nowMoving}
                        rolledNumber={rolledNumber}
                        selectedRoll={selectedRoll}
                        movingPlayer={movingPlayer}
                    />
                    <Dashboard 
                        currentTurn={movingPlayer}
                        rolledNumber={rolledNumber}
                        nowMoving={nowMoving}
                    />
                </div>
            ) : (
                <ReactLoading type='spinningBubbles' color='white' height={667} width={375} />
            )}
            {winner ? (
                <Overlay>
                    <div className={matchResult && matchResult.isWinner ? styles.winnerContainer : styles.loserContainer}>
                        {matchResult && matchResult.isWinner ? (
                            <>
                                <img src={trophyImage} alt='winner' />
                                <h1>
                                    1st: <span style={{ color: winner }}>{winner}</span>
                                </h1>
                                <div className={styles.resultMessage}>
                                    <h2>🎉 You Won!</h2>
                                    {matchResult.amount > 0 && (
                                        <p className={styles.winAmount}>💰 ${matchResult.amount.toFixed(2)}</p>
                                    )}
                                </div>
                                {payoutInfo && (
                                    <div className={styles.payoutInfo}>
                                        <h2>🎉 Congratulations {payoutInfo.winner}! 🎉</h2>
                                        <div className={styles.payoutDetails}>
                                            <p className={styles.payoutAmount}>💰 Winner Payout: <strong>${payoutInfo.amount.toFixed(2)}</strong></p>
                                            <p className={styles.payoutBreakdown}>
                                                Total Pot: ${payoutInfo.totalPot.toFixed(2)} | 
                                                Platform Fee (10%): ${payoutInfo.platformFee.toFixed(2)}
                                            </p>
                                            <p className={styles.payoutNote}>✅ Money has been added to your wallet!</p>
                                        </div>
                                    </div>
                                )}
                            </>
                        ) : (
                            <>
                                <div className={styles.loserIcon}>😔</div>
                                <h1>
                                    1st: <span style={{ color: winner }}>{winner}</span>
                                </h1>
                                <div className={styles.resultMessage}>
                                    <h2>💔 You Lost</h2>
                                    {matchResult && matchResult.amount > 0 && (
                                        <p className={styles.lossAmount}>You lost ${matchResult.amount.toFixed(2)}</p>
                                    )}
                                </div>
                            </>
                        )}
                        <button onClick={() => socket.emit('player:exit')}>Play again</button>
                    </div>
                </Overlay>
            ) : null}
        </>
    );
};

export default Gameboard;
