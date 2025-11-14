import React, { useState, useEffect, useContext, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { SocketContext } from '../../App';
import { useAuth } from '../../context/AuthContext';
import MatchmakingScreen from './MatchmakingScreen';
import Leaderboard from './Leaderboard';
import styles from './ModernDashboard.module.css';

const ModernDashboard = () => {
    const socket = useContext(SocketContext);
    const { user, logout, updateBalance } = useAuth();
    const navigate = useNavigate();
    const [showBetSelection, setShowBetSelection] = useState(false);
    const [showMatchmaking, setShowMatchmaking] = useState(false);
    const [selectedBet, setSelectedBet] = useState(0);
    const [activeView, setActiveView] = useState('home'); // 'home' or 'leaderboard'
    const [balanceAnimation, setBalanceAnimation] = useState('');
    const prevBalanceRef = useRef(user?.balance);

    useEffect(() => {
        updateBalance();
        socket.emit('room:rooms');
        const handleRooms = (data) => {
            // Room data received but not stored since rooms variable was unused
            JSON.parse(data);
        };
        socket.on('room:rooms', handleRooms);
        return () => {
            socket.off('room:rooms', handleRooms);
        };
    }, [socket, updateBalance]);

    // Animate balance changes
    useEffect(() => {
        if (prevBalanceRef.current !== undefined && user?.balance !== undefined) {
            const prevBalance = prevBalanceRef.current || 0;
            const currentBalance = user.balance || 0;
            
            if (prevBalance !== currentBalance) {
                // Determine animation type
                if (currentBalance > prevBalance) {
                    setBalanceAnimation('increase');
                } else if (currentBalance < prevBalance) {
                    setBalanceAnimation('decrease');
                }
                
                // Reset animation after it completes
                setTimeout(() => {
                    setBalanceAnimation('');
                }, 600);
            }
        }
        
        prevBalanceRef.current = user?.balance;
    }, [user?.balance]);

    const handleModeSelect = () => {
        setShowBetSelection(true);
    };

    const handleQuickPlay = (betAmount = 0) => {
        // Check balance if betting
        if (betAmount > 0 && user.balance < betAmount) {
            alert(`Insufficient balance! You need $${betAmount} but have $${user.balance.toFixed(2)}`);
            return;
        }

        // Show matchmaking screen
        setSelectedBet(betAmount);
        setShowBetSelection(false);
        setShowMatchmaking(true);
    };

    const handleCancelMatchmaking = () => {
        setShowMatchmaking(false);
        setShowBetSelection(true);
    };

    // If showing leaderboard, render it instead
    if (activeView === 'leaderboard') {
        return (
            <div className={styles.dashboard}>
                <Leaderboard />
                {/* Bottom Navigation */}
                <div className={styles.bottomNav}>
                    <button 
                        className={styles.navItem}
                        onClick={() => navigate('/wallet')}
                    >
                        <span className={styles.navIcon}>💳</span>
                        <span className={styles.navLabel}>Wallet</span>
                    </button>
                    <button 
                        className={styles.navItem}
                        onClick={() => setActiveView('home')}
                    >
                        <span className={styles.navIcon}>🏠</span>
                        <span className={styles.navLabel}>Home</span>
                    </button>
                    <button 
                        className={`${styles.navItem} ${styles.active}`}
                    >
                        <span className={styles.navIcon}>🏆</span>
                        <span className={styles.navLabel}>Leaderboard</span>
                    </button>
                    <button 
                        className={styles.navItem}
                        onClick={logout}
                    >
                        <span className={styles.navIcon}>🚪</span>
                        <span className={styles.navLabel}>Logout</span>
                    </button>
                </div>
            </div>
        );
    }

    return (
        <div className={styles.dashboard}>
            {/* Top Bar */}
            <div className={styles.topBar}>
                <div className={styles.userProfile}>
                    <div className={styles.avatar}>
                        {user?.username?.charAt(0).toUpperCase()}
                    </div>
                    <div className={styles.userInfo}>
                        <span className={styles.username}>{user?.username}</span>
                        <span className={styles.userLevel}>Level 1</span>
                    </div>
                </div>
                
                <div className={styles.coins}>
                    <div className={styles.coinBadge}>
                        <div className={styles.coinGlow}></div>
                        <div className={styles.coinContent}>
                            <div className={styles.coinIconWrapper}>
                                <span className={styles.coinIcon}>💰</span>
                                <div className={styles.coinShine}></div>
                            </div>
                            <div className={styles.coinInfo}>
                                <span className={styles.coinLabel}>Balance</span>
                                <span 
                                    className={`${styles.coinAmount} ${balanceAnimation ? styles[balanceAnimation] : ''}`}
                                    key={user?.balance}
                                >
                                    ${user?.balance?.toFixed(2) || '0.00'}
                                </span>
                            </div>
                        </div>
                        <div className={styles.coinDecorations}>
                            <div className={styles.coinSparkle1}>✨</div>
                            <div className={styles.coinSparkle2}>✨</div>
                        </div>
                    </div>
                    <button 
                        className={styles.addButton}
                        onClick={() => navigate('/wallet')}
                        title="Add Balance"
                    >
                        <span className={styles.addButtonIcon}>+</span>
                        <span className={styles.addButtonRipple}></span>
                    </button>
                </div>
            </div>

            {/* Logo */}
            <div className={styles.logoSection}>
                <h1 className={styles.logo}>
                    <span className={styles.logoL}>L</span>
                    <span className={styles.logoU}>U</span>
                    <span className={styles.logoD}>D</span>
                    <span className={styles.logoO}>O</span>
                </h1>
                <p className={styles.subtitle}>MULTIPLAYER</p>
            </div>

            {/* Game Modes */}
            {!showBetSelection ? (
                <div className={styles.gameModes}>
                    <div 
                        className={`${styles.modeCard} ${styles.modeClassic}`}
                        onClick={() => handleModeSelect('1v1')}
                    >
                        <div className={styles.modeIcon}>🎲</div>
                        <div className={styles.modeDice}>
                            <div className={styles.dice}>⚀</div>
                            <div className={styles.dice}>⚁</div>
                        </div>
                        <h2 className={styles.modeTitle}>1 ON 1</h2>
                        <p className={styles.modeDesc}>Quick Match</p>
                    </div>

                    <div 
                        className={`${styles.modeCard} ${styles.modeCustom}`}
                        onClick={() => navigate('/login')}
                    >
                        <div className={styles.modeIcon}>⚔️</div>
                        <h2 className={styles.modeTitle}>CUSTOM</h2>
                        <p className={styles.modeDesc}>Create or Join Room</p>
                    </div>
                </div>
            ) : (
                <div className={styles.betSelection}>
                    <h3 className={styles.betTitle}>Select Bet Amount</h3>
                    <div className={styles.betOptions}>
                        <button 
                            className={styles.betOption}
                            onClick={() => handleQuickPlay(0)}
                        >
                            <span className={styles.betIcon}>🆓</span>
                            <span className={styles.betLabel}>Free</span>
                        </button>
                        <button 
                            className={styles.betOption}
                            onClick={() => handleQuickPlay(1)}
                        >
                            <span className={styles.betIcon}>💰</span>
                            <span className={styles.betLabel}>$1</span>
                        </button>
                        <button 
                            className={styles.betOption}
                            onClick={() => handleQuickPlay(5)}
                        >
                            <span className={styles.betIcon}>💰</span>
                            <span className={styles.betLabel}>$5</span>
                        </button>
                        <button 
                            className={styles.betOption}
                            onClick={() => handleQuickPlay(10)}
                        >
                            <span className={styles.betIcon}>💎</span>
                            <span className={styles.betLabel}>$10</span>
                        </button>
                        <button 
                            className={styles.betOption}
                            onClick={() => handleQuickPlay(20)}
                        >
                            <span className={styles.betIcon}>💎</span>
                            <span className={styles.betLabel}>$20</span>
                        </button>
                        <button 
                            className={styles.betOption}
                            onClick={() => handleQuickPlay(50)}
                        >
                            <span className={styles.betIcon}>👑</span>
                            <span className={styles.betLabel}>$50</span>
                        </button>
                    </div>
                    <button 
                        className={styles.backBtn}
                        onClick={() => setShowBetSelection(false)}
                    >
                        ← Back
                    </button>
                </div>
            )}

            {/* Bottom Navigation */}
            <div className={styles.bottomNav}>
                <button 
                    className={styles.navItem}
                    onClick={() => navigate('/wallet')}
                >
                    <span className={styles.navIcon}>💳</span>
                    <span className={styles.navLabel}>Wallet</span>
                </button>
                <button 
                    className={`${styles.navItem} ${styles.active}`}
                >
                    <span className={styles.navIcon}>🏠</span>
                    <span className={styles.navLabel}>Home</span>
                </button>
                <button 
                    className={styles.navItem}
                    onClick={() => setActiveView('leaderboard')}
                >
                    <span className={styles.navIcon}>🏆</span>
                    <span className={styles.navLabel}>Leaderboard</span>
                </button>
                <button 
                    className={styles.navItem}
                    onClick={logout}
                >
                    <span className={styles.navIcon}>🚪</span>
                    <span className={styles.navLabel}>Logout</span>
                </button>
            </div>

            {/* Matchmaking Screen */}
            {showMatchmaking && (
                <MatchmakingScreen 
                    betAmount={selectedBet}
                    onCancel={handleCancelMatchmaking}
                />
            )}
        </div>
    );
};

export default ModernDashboard;

