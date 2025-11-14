import React, { useState, useEffect, useRef } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useNavigate } from 'react-router-dom';
import DepositForm from './DepositForm';
import WithdrawalForm from './WithdrawalForm';
import TransactionHistory from './TransactionHistory';
import styles from './Wallet.module.css';

const WalletDashboard = () => {
    const { user, logout, updateBalance, isAdmin } = useAuth();
    const navigate = useNavigate();
    const [activeTab, setActiveTab] = useState('balance');
    const [balanceAnimation, setBalanceAnimation] = useState('');
    const prevBalanceRef = useRef(user?.balance);

    useEffect(() => {
        // Refresh balance when component mounts
        updateBalance();
    }, [updateBalance]);

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

    const handlePlayGame = async () => {
        if (user.balance <= 0) {
            // If no balance, switch to deposit tab
            setActiveTab('deposit');
            return;
        }
        
        // Link wallet session to game session
        try {
            const token = localStorage.getItem('token');
            const response = await fetch(`http://${window.location.hostname}:8000/api/game/set-session`, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                },
                credentials: 'include' // Important for session cookies
            });
            
            if (response.ok) {
                const data = await response.json();
                console.log('✅ Session linked to wallet:', data);
                navigate('/login'); // Go to game lobby
            } else {
                console.error('Failed to link session');
                alert('Failed to link your wallet to the game. Please try again.');
            }
        } catch (error) {
            console.error('Error linking session:', error);
            alert('Error connecting to game. Please try again.');
        }
    };

    return (
        <div className={styles.walletContainer}>
            <div className={styles.walletCard}>
                <div className={styles.header}>
                    <div className={styles.userInfo}>
                        <h2>Welcome, {user?.username}!</h2>
                        <p>{user?.email}</p>
                    </div>
                    <div className={styles.headerActions}>
                        {isAdmin && (
                            <button 
                                onClick={() => navigate('/admin')}
                                className={styles.adminButton}
                            >
                                Admin Panel
                            </button>
                        )}
                        <button 
                            onClick={logout}
                            className={styles.logoutButton}
                        >
                            Logout
                        </button>
                    </div>
                </div>

                <div className={styles.balanceCard}>
                    <div className={styles.balanceGlow}></div>
                    <div className={styles.balanceContent}>
                        <div className={styles.balanceHeader}>
                            <div className={styles.balanceIcon}>
                                <svg width="32" height="32" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                                    <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 18c-4.41 0-8-3.59-8-8s3.59-8 8-8 8 3.59 8 8-3.59 8-8 8zm.31-8.86c-1.77-.45-2.34-.94-2.34-1.67 0-.84.79-1.43 2.1-1.43 1.38 0 1.9.66 1.94 1.64h1.71c-.05-1.34-.87-2.57-2.49-2.97V5H10.9v1.69c-1.51.32-2.72 1.3-2.72 2.81 0 1.79 1.49 2.69 3.66 3.21 1.95.46 2.34 1.15 2.34 1.87 0 .53-.39 1.39-2.1 1.39-1.6 0-2.23-.72-2.32-1.64H8.04c.1 1.7 1.36 2.66 2.86 2.97V19h2.34v-1.67c1.52-.29 2.72-1.16 2.73-2.77-.01-2.2-1.9-2.96-3.66-3.42z" fill="currentColor"/>
                                </svg>
                            </div>
                            <div className={styles.balanceInfo}>
                                <p className={styles.balanceLabel}>
                                    <span className={styles.labelIcon}>💰</span>
                                    Total Balance
                                </p>
                                <h1 
                                    className={`${styles.balanceAmount} ${balanceAnimation ? styles[balanceAnimation] : ''}`}
                                    key={user?.balance}
                                >
                                    ${user?.balance?.toFixed(2) || '0.00'}
                                </h1>
                                <div className={styles.balanceSubtext}>
                                    {user?.balance > 0 ? (
                                        <span className={styles.positiveStatus}>
                                            <span className={styles.statusDot}></span>
                                            Ready to Play
                                        </span>
                                    ) : (
                                        <span className={styles.negativeStatus}>
                                            <span className={styles.statusDot}></span>
                                            Deposit Required
                                        </span>
                                    )}
                                </div>
                            </div>
                        </div>
                        <div className={styles.balanceActions}>
                            <button 
                                onClick={handlePlayGame}
                                className={`${styles.playButton} ${user?.balance > 0 ? styles.playButtonActive : styles.playButtonInactive}`}
                            >
                                <span className={styles.buttonIcon}>
                                    {user?.balance > 0 ? '🎮' : '💳'}
                                </span>
                                <span className={styles.buttonText}>
                                    {user?.balance > 0 ? 'Play Game' : 'Deposit to Play'}
                                </span>
                            </button>
                        </div>
                    </div>
                    <div className={styles.balanceDecorations}>
                        <div className={styles.decorationCircle1}></div>
                        <div className={styles.decorationCircle2}></div>
                        <div className={styles.decorationCircle3}></div>
                    </div>
                </div>

                <div className={styles.tabs}>
                    <button 
                        className={activeTab === 'balance' ? styles.activeTab : ''}
                        onClick={() => setActiveTab('balance')}
                    >
                        Balance
                    </button>
                    <button 
                        className={activeTab === 'deposit' ? styles.activeTab : ''}
                        onClick={() => setActiveTab('deposit')}
                    >
                        Deposit
                    </button>
                    <button 
                        className={activeTab === 'withdraw' ? styles.activeTab : ''}
                        onClick={() => setActiveTab('withdraw')}
                    >
                        Withdraw
                    </button>
                    <button 
                        className={activeTab === 'history' ? styles.activeTab : ''}
                        onClick={() => setActiveTab('history')}
                    >
                        History
                    </button>
                </div>

                <div className={styles.tabContent}>
                    {activeTab === 'balance' && (
                        <div className={styles.balanceTab}>
                            <h3>How it works:</h3>
                            <ol className={styles.instructions}>
                                <li>
                                    <strong>Deposit:</strong> Send money via EVC Plus/Zaad to the admin's number, 
                                    then submit a deposit request with transaction proof.
                                </li>
                                <li>
                                    <strong>Wait for Approval:</strong> Admin will verify and approve your deposit 
                                    (usually within 24 hours).
                                </li>
                                <li>
                                    <strong>Play Games:</strong> Once approved, you can bet and play Ludo games.
                                </li>
                                <li>
                                    <strong>Win Money:</strong> Winners receive 90% of the total pot 
                                    (10% platform fee).
                                </li>
                                <li>
                                    <strong>Withdraw:</strong> Request withdrawal anytime. Admin will process 
                                    it manually.
                                </li>
                            </ol>
                        </div>
                    )}
                    
                    {activeTab === 'deposit' && (
                        <DepositForm onSuccess={() => {
                            setActiveTab('history');
                            updateBalance();
                        }} />
                    )}
                    
                    {activeTab === 'withdraw' && (
                        <WithdrawalForm onSuccess={() => {
                            setActiveTab('history');
                            updateBalance();
                        }} />
                    )}
                    
                    {activeTab === 'history' && (
                        <TransactionHistory />
                    )}
                </div>
            </div>
        </div>
    );
};

export default WalletDashboard;

