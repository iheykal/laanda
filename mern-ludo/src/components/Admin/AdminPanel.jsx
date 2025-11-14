import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { adminAPI } from '../../utils/api';
import styles from './Admin.module.css';

// TEST MODE - Set to true to skip admin authentication
const TEST_MODE = false;

const AdminPanel = () => {
    const { user, isAdmin } = useAuth();
    const navigate = useNavigate();
    const [activeTab, setActiveTab] = useState('pending');
    const [pendingTransactions, setPendingTransactions] = useState([]);
    const [allTransactions, setAllTransactions] = useState([]);
    const [users, setUsers] = useState([]);
    const [gameStats, setGameStats] = useState(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [revenueFilter, setRevenueFilter] = useState('today'); // today, 7days, 15days, 30days
    const [matchRevenueFilter, setMatchRevenueFilter] = useState('all'); // all, today, 7days, 15days, 30days
    const [matchRevenueData, setMatchRevenueData] = useState(null);
    const [matchRevenueWithdrawals, setMatchRevenueWithdrawals] = useState([]);
    const [showWithdrawalForm, setShowWithdrawalForm] = useState(false);
    const [ledgerData, setLedgerData] = useState(null);
    const [withdrawalFormData, setWithdrawalFormData] = useState({
        amount: '',
        phoneNumber: '',
        recipientName: '',
        notes: ''
    });
    const [selectedUser, setSelectedUser] = useState(null);
    const [userStats, setUserStats] = useState(null);
    const [showSuccessModal, setShowSuccessModal] = useState(false);

    useEffect(() => {
        if (!TEST_MODE && !isAdmin) {
            navigate('/wallet');
            return;
        }
        loadPendingTransactions();
    }, [isAdmin, navigate]);

    useEffect(() => {
        if (activeTab === 'matchRevenue') {
            loadMatchRevenue();
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [matchRevenueFilter, activeTab]);

    const loadPendingTransactions = async () => {
        setLoading(true);
        setError('');
        try {
            const data = await adminAPI.getPendingTransactions();
            if (data.error) {
                setError(data.error);
            } else {
                setPendingTransactions(data);
            }
        } catch (err) {
            setError('Failed to load pending transactions');
        } finally {
            setLoading(false);
        }
    };

    const loadAllTransactions = async () => {
        setLoading(true);
        setError('');
        try {
            const data = await adminAPI.getAllTransactions({ limit: 100 });
            if (data.error) {
                setError(data.error);
            } else {
                setAllTransactions(data);
            }
        } catch (err) {
            setError('Failed to load transactions');
        } finally {
            setLoading(false);
        }
    };

    const loadUsers = async () => {
        setLoading(true);
        setError('');
        try {
            const data = await adminAPI.getAllUsers();
            if (data.error) {
                setError(data.error);
            } else {
                setUsers(data);
            }
        } catch (err) {
            setError('Failed to load users');
        } finally {
            setLoading(false);
        }
    };

    const loadGameStats = async () => {
        setLoading(true);
        setError('');
        try {
            const data = await adminAPI.getGameStats();
            if (data.error) {
                setError(data.error);
            } else {
                setGameStats(data);
            }
        } catch (err) {
            setError('Failed to load game stats');
        } finally {
            setLoading(false);
        }
    };

    const loadMatchRevenue = async () => {
        setLoading(true);
        setError('');
        try {
            const data = await adminAPI.getMatchRevenue(matchRevenueFilter);
            if (data.error) {
                setError(data.error);
            } else {
                setMatchRevenueData(data);
            }
        } catch (err) {
            setError('Failed to load match revenue');
        } finally {
            setLoading(false);
        }
    };

    const loadMatchRevenueWithdrawals = async () => {
        try {
            const data = await adminAPI.getMatchRevenueWithdrawals();
            if (data.error) {
                console.error('Withdrawal history error:', data.error);
                setMatchRevenueWithdrawals([]); // Set empty array on error
            } else {
                setMatchRevenueWithdrawals(Array.isArray(data) ? data : []);
            }
        } catch (err) {
            console.error('Failed to load withdrawal history:', err);
            setMatchRevenueWithdrawals([]); // Set empty array on error
        }
    };

    const loadLedger = async () => {
        setLoading(true);
        setError('');
        try {
            const data = await adminAPI.getMatchRevenueLedger();
            if (data.error) {
                setError(data.error);
            } else {
                setLedgerData(data);
            }
        } catch (err) {
            setError('Failed to load accounting ledger');
        } finally {
            setLoading(false);
        }
    };

    const handleWithdrawMatchRevenue = async (e) => {
        e.preventDefault();
        setError('');
        
        const amount = parseFloat(withdrawalFormData.amount);
        if (!amount || amount <= 0) {
            setError('Please enter a valid amount');
            return;
        }

        if (!withdrawalFormData.phoneNumber) {
            setError('Phone number is required');
            return;
        }

        if (!withdrawalFormData.recipientName) {
            setError('Recipient name is required');
            return;
        }

        if (matchRevenueData && amount > matchRevenueData.availableBalance) {
            setError(`Insufficient balance. Available: $${matchRevenueData.availableBalance.toFixed(2)}`);
            return;
        }

        setLoading(true);
        try {
            const result = await adminAPI.withdrawMatchRevenue(withdrawalFormData);
            if (result.error) {
                setError(result.error);
            } else {
                alert('Withdrawal recorded successfully!');
                setWithdrawalFormData({
                    amount: '',
                    phoneNumber: '',
                    recipientName: '',
                    notes: ''
                });
                setShowWithdrawalForm(false);
                loadMatchRevenue();
                loadMatchRevenueWithdrawals();
            }
        } catch (err) {
            setError('Failed to process withdrawal');
        } finally {
            setLoading(false);
        }
    };

    const loadUserStats = async (userId) => {
        setLoading(true);
        setError('');
        try {
            const data = await adminAPI.getUserStats(userId);
            if (data.error) {
                setError(data.error);
            } else {
                setUserStats(data);
            }
        } catch (err) {
            setError('Failed to load user stats');
        } finally {
            setLoading(false);
        }
    };

    const handleUserClick = (user) => {
        setSelectedUser(user);
        loadUserStats(user._id);
    };

    const handleApprove = async (transactionId) => {
        setLoading(true);
        try {
            const result = await adminAPI.approveTransaction(transactionId, '');
            if (result.error) {
                alert('Error: ' + result.error);
            } else {
                setShowSuccessModal(true);
                loadPendingTransactions();
                // Auto-hide after 2 seconds
                setTimeout(() => {
                    setShowSuccessModal(false);
                }, 2000);
            }
        } catch (err) {
            alert('Failed to approve transaction');
        } finally {
            setLoading(false);
        }
    };

    const handleReject = async (transactionId) => {
        const adminNotes = prompt('Enter reason for rejection:');
        if (!adminNotes) {
            alert('Please provide a reason for rejection');
            return;
        }
        setLoading(true);
        try {
            const result = await adminAPI.rejectTransaction(transactionId, adminNotes);
            if (result.error) {
                alert('Error: ' + result.error);
            } else {
                alert('Transaction rejected');
                loadPendingTransactions();
            }
        } catch (err) {
            alert('Failed to reject transaction');
        } finally {
            setLoading(false);
        }
    };

    const handleTabChange = (tab) => {
        setActiveTab(tab);
        if (tab === 'pending') {
            loadPendingTransactions();
        } else if (tab === 'all') {
            loadAllTransactions();
        } else if (tab === 'users') {
            loadUsers();
        } else if (tab === 'stats') {
            loadGameStats();
        } else if (tab === 'matchRevenue') {
            loadMatchRevenue();
            // Load withdrawal history in background, don't block on errors
            loadMatchRevenueWithdrawals().catch(err => {
                console.error('Failed to load withdrawal history:', err);
            });
        } else if (tab === 'accounting') {
            loadLedger();
        }
    };

    const formatDate = (dateString) => {
        const date = new Date(dateString);
        return date.toLocaleDateString() + ' ' + date.toLocaleTimeString();
    };

    const getStatusClass = (status) => {
        switch (status) {
            case 'approved':
                return styles.statusApproved;
            case 'pending':
                return styles.statusPending;
            case 'rejected':
                return styles.statusRejected;
            default:
                return '';
        }
    };

    // Calculate revenue (10% of approved withdrawals)
    const calculateRevenue = (filter) => {
        const now = new Date();
        const startDate = new Date();
        
        switch(filter) {
            case 'today':
                startDate.setHours(0, 0, 0, 0);
                break;
            case '7days':
                startDate.setDate(now.getDate() - 7);
                break;
            case '15days':
                startDate.setDate(now.getDate() - 15);
                break;
            case '30days':
                startDate.setDate(now.getDate() - 30);
                break;
            default:
                startDate.setHours(0, 0, 0, 0);
        }

        const filteredWithdrawals = allTransactions.filter(t => {
            const transactionDate = new Date(t.processedAt || t.createdAt);
            return t.type === 'withdrawal' && 
                   t.status === 'approved' && 
                   transactionDate >= startDate && 
                   transactionDate <= now;
        });

        const totalWithdrawals = filteredWithdrawals.reduce((sum, t) => sum + t.amount, 0);
        const platformFee = totalWithdrawals * 0.10; // 10% fee
        const userReceives = totalWithdrawals * 0.90; // 90% to user

        return {
            totalWithdrawals,
            platformFee,
            userReceives,
            count: filteredWithdrawals.length,
            withdrawals: filteredWithdrawals
        };
    };

    const revenueData = calculateRevenue(revenueFilter);

    const getFilterLabel = (filter) => {
        switch(filter) {
            case 'today': return 'Today';
            case '7days': return 'Last 7 Days';
            case '15days': return 'Last 15 Days';
            case '30days': return 'Last 30 Days';
            default: return 'Today';
        }
    };

    return (
        <div className={styles.adminContainer}>
            <div className={styles.adminCard}>
                <div className={styles.header}>
                    <div>
                        <h1>Admin Panel</h1>
                        <p>Welcome, {user?.username}</p>
                    </div>
                    <button 
                        onClick={() => navigate('/wallet')}
                        className={styles.backButton}
                    >
                        Back to Wallet
                    </button>
                </div>

                <div className={styles.tabs}>
                    <button 
                        className={activeTab === 'pending' ? styles.activeTab : ''}
                        onClick={() => handleTabChange('pending')}
                    >
                        Pending ({pendingTransactions.length})
                    </button>
                    <button 
                        className={activeTab === 'all' ? styles.activeTab : ''}
                        onClick={() => handleTabChange('all')}
                    >
                        All Transactions
                    </button>
                    <button 
                        className={activeTab === 'users' ? styles.activeTab : ''}
                        onClick={() => handleTabChange('users')}
                    >
                        Users
                    </button>
                    <button 
                        className={activeTab === 'stats' ? styles.activeTab : ''}
                        onClick={() => handleTabChange('stats')}
                    >
                        Statistics
                    </button>
                    <button 
                        className={activeTab === 'revenue' ? styles.activeTab : ''}
                        onClick={() => handleTabChange('revenue')}
                    >
                        💰 Revenue
                    </button>
                    <button 
                        className={activeTab === 'matchRevenue' ? styles.activeTab : ''}
                        onClick={() => handleTabChange('matchRevenue')}
                    >
                        🎮 Match Revenue
                    </button>
                    <button 
                        className={activeTab === 'accounting' ? styles.activeTab : ''}
                        onClick={() => handleTabChange('accounting')}
                    >
                        📊 Accounting Ledger
                    </button>
                </div>

                {error && <div className={styles.error}>{error}</div>}
                {loading && <div className={styles.loading}>Loading...</div>}

                <div className={styles.tabContent}>
                    {activeTab === 'pending' && (
                        <div className={styles.transactionsList}>
                            <h2>Pending Transactions</h2>
                            {pendingTransactions.length === 0 ? (
                                <p className={styles.emptyState}>No pending transactions</p>
                            ) : (
                                pendingTransactions.map((transaction) => (
                                    <div key={transaction._id} className={styles.transactionCard}>
                                        <div className={styles.transactionInfo}>
                                            <div className={styles.transactionHeader}>
                                                <span className={styles.type}>
                                                    {transaction.type === 'deposit' ? '💰 Deposit' : '💸 Withdrawal'}
                                                </span>
                                                <span className={styles.amount}>
                                                    ${transaction.amount.toFixed(2)}
                                                </span>
                                            </div>
                                            <div className={styles.userDetails}>
                                                <p><strong>User:</strong> {transaction.userId?.username} (📱 {transaction.userId?.phone})</p>
                                                <p><strong>Payment Phone:</strong> {transaction.phoneNumber}</p>
                                                {transaction.senderName && (
                                                    <p><strong>Sender Name:</strong> {transaction.senderName}</p>
                                                )}
                                                {transaction.recipientName && (
                                                    <p><strong>Recipient Name:</strong> {transaction.recipientName}</p>
                                                )}
                                                <p><strong>Current Balance:</strong> ${transaction.userId?.balance?.toFixed(2) || '0.00'}</p>
                                                <p><strong>Date:</strong> {formatDate(transaction.createdAt)}</p>
                                            </div>
                                        </div>
                                        <div className={styles.transactionActions}>
                                            <button 
                                                onClick={() => handleApprove(transaction._id)}
                                                className={styles.approveButton}
                                                disabled={loading}
                                            >
                                                ✓ Approve
                                            </button>
                                            <button 
                                                onClick={() => handleReject(transaction._id)}
                                                className={styles.rejectButton}
                                                disabled={loading}
                                            >
                                                ✗ Reject
                                            </button>
                                        </div>
                                    </div>
                                ))
                            )}
                        </div>
                    )}

                    {activeTab === 'all' && (
                        <div className={styles.transactionsList}>
                            <h2>All Transactions</h2>
                            {allTransactions.length === 0 ? (
                                <p className={styles.emptyState}>No transactions</p>
                            ) : (
                                allTransactions.map((transaction) => (
                                    <div key={transaction._id} className={styles.transactionCard}>
                                        <div className={styles.transactionInfo}>
                                            <div className={styles.transactionHeader}>
                                                <span className={styles.type}>
                                                    {transaction.type === 'deposit' ? '💰 Deposit' : '💸 Withdrawal'}
                                                </span>
                                                <span className={`${styles.status} ${getStatusClass(transaction.status)}`}>
                                                    {transaction.status.toUpperCase()}
                                                </span>
                                            </div>
                                            <div className={styles.userDetails}>
                                                <p className={styles.amount}>${transaction.amount.toFixed(2)}</p>
                                                <p><strong>User:</strong> {transaction.userId?.username} (📱 {transaction.userId?.phone})</p>
                                                <p><strong>Date:</strong> {formatDate(transaction.createdAt)}</p>
                                                {transaction.processedAt && (
                                                    <p><strong>Processed:</strong> {formatDate(transaction.processedAt)}</p>
                                                )}
                                                {transaction.adminNotes && (
                                                    <p><strong>Admin Notes:</strong> {transaction.adminNotes}</p>
                                                )}
                                            </div>
                                        </div>
                                    </div>
                                ))
                            )}
                        </div>
                    )}

                    {activeTab === 'users' && (
                        <div className={styles.usersList}>
                            <h2>All Users</h2>
                            {users.length === 0 ? (
                                <p className={styles.emptyState}>No users</p>
                            ) : (
                                <div className={styles.usersGrid}>
                                    {users.map((user) => (
                                        <div 
                                            key={user._id} 
                                            className={styles.userCard}
                                            onClick={() => handleUserClick(user)}
                                            style={{ cursor: 'pointer' }}
                                        >
                                            <h3>{user.username}</h3>
                                            <p>📱 {user.phone}</p>
                                            <p className={styles.balance}>
                                                Balance: ${user.balance?.toFixed(2) || '0.00'}
                                            </p>
                                            <p className={styles.date}>
                                                Joined: {formatDate(user.createdAt)}
                                            </p>
                                            <p className={user.isActive ? styles.active : styles.inactive}>
                                                {user.isActive ? '✓ Active' : '✗ Inactive'}
                                            </p>
                                            {user.isSuperAdmin && (
                                                <p style={{color: '#ff9800', fontWeight: 'bold', marginTop: '5px'}}>
                                                    👑 Super Admin
                                                </p>
                                            )}
                                            {user.isAdmin && !user.isSuperAdmin && (
                                                <p style={{color: '#2196f3', fontWeight: 'bold', marginTop: '5px'}}>
                                                    ⭐ Admin
                                                </p>
                                            )}
                                            <p style={{color: '#888', fontSize: '12px', marginTop: '10px'}}>
                                                👆 Click to view stats
                                            </p>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    )}

                    {activeTab === 'stats' && (
                        <div className={styles.statsContainer}>
                            <h2>Game Statistics</h2>
                            {gameStats && (
                                <div className={styles.statsGrid}>
                                    <div className={styles.statCard}>
                                        <h3>Total Games</h3>
                                        <p className={styles.statValue}>{gameStats.totalGames}</p>
                                    </div>
                                    <div className={styles.statCard}>
                                        <h3>Total Revenue</h3>
                                        <p className={styles.statValue}>
                                            ${gameStats.totalRevenue?.toFixed(2) || '0.00'}
                                        </p>
                                    </div>
                                    <div className={styles.statCard}>
                                        <h3>Total Users</h3>
                                        <p className={styles.statValue}>{users.length}</p>
                                    </div>
                                </div>
                            )}
                        </div>
                    )}

                    {activeTab === 'revenue' && (
                        <div className={styles.revenueContainer}>
                            <div className={styles.revenueHeader}>
                                <h2>Platform Revenue (10% Withdrawal Fee)</h2>
                                <div className={styles.revenueFilters}>
                                    <button 
                                        className={revenueFilter === 'today' ? styles.revenueFilterActive : styles.revenueFilterBtn}
                                        onClick={() => setRevenueFilter('today')}
                                    >
                                        Today
                                    </button>
                                    <button 
                                        className={revenueFilter === '7days' ? styles.revenueFilterActive : styles.revenueFilterBtn}
                                        onClick={() => setRevenueFilter('7days')}
                                    >
                                        7 Days
                                    </button>
                                    <button 
                                        className={revenueFilter === '15days' ? styles.revenueFilterActive : styles.revenueFilterBtn}
                                        onClick={() => setRevenueFilter('15days')}
                                    >
                                        15 Days
                                    </button>
                                    <button 
                                        className={revenueFilter === '30days' ? styles.revenueFilterActive : styles.revenueFilterBtn}
                                        onClick={() => setRevenueFilter('30days')}
                                    >
                                        30 Days
                                    </button>
                                </div>
                            </div>

                            <div className={styles.revenueStats}>
                                <div className={styles.revenueCard}>
                                    <div className={styles.revenueIcon}>💰</div>
                                    <div className={styles.revenueInfo}>
                                        <h3>Platform Revenue ({getFilterLabel(revenueFilter)})</h3>
                                        <p className={styles.revenueAmount}>${revenueData.platformFee.toFixed(2)}</p>
                                        <span className={styles.revenueLabel}>10% of withdrawals</span>
                                    </div>
                                </div>

                                <div className={styles.revenueCard}>
                                    <div className={styles.revenueIcon}>💸</div>
                                    <div className={styles.revenueInfo}>
                                        <h3>Total Withdrawals</h3>
                                        <p className={styles.revenueAmount}>${revenueData.totalWithdrawals.toFixed(2)}</p>
                                        <span className={styles.revenueLabel}>{revenueData.count} transactions</span>
                                    </div>
                                </div>

                                <div className={styles.revenueCard}>
                                    <div className={styles.revenueIcon}>👥</div>
                                    <div className={styles.revenueInfo}>
                                        <h3>Paid to Users</h3>
                                        <p className={styles.revenueAmount}>${revenueData.userReceives.toFixed(2)}</p>
                                        <span className={styles.revenueLabel}>90% of withdrawals</span>
                                    </div>
                                </div>
                            </div>

                            <div className={styles.revenueBreakdown}>
                                <h3>Withdrawal Breakdown - {getFilterLabel(revenueFilter)}</h3>
                                {revenueData.withdrawals.length === 0 ? (
                                    <p className={styles.emptyState}>No withdrawals in this period</p>
                                ) : (
                                    <div className={styles.revenueTable}>
                                        <div className={styles.revenueTableHeader}>
                                            <span>Date</span>
                                            <span>User</span>
                                            <span>Amount</span>
                                            <span>Platform Fee (10%)</span>
                                            <span>User Receives (90%)</span>
                                        </div>
                                        {revenueData.withdrawals.map((withdrawal) => {
                                            const fee = withdrawal.amount * 0.10;
                                            const userGets = withdrawal.amount * 0.90;
                                            return (
                                                <div key={withdrawal._id} className={styles.revenueTableRow}>
                                                    <span>{formatDate(withdrawal.processedAt || withdrawal.createdAt)}</span>
                                                    <span>{withdrawal.userId?.username || 'N/A'}</span>
                                                    <span className={styles.withdrawalAmount}>${withdrawal.amount.toFixed(2)}</span>
                                                    <span className={styles.platformFeeAmount}>${fee.toFixed(2)}</span>
                                                    <span className={styles.userReceiveAmount}>${userGets.toFixed(2)}</span>
                                                </div>
                                            );
                                        })}
                                    </div>
                                )}
                            </div>
                        </div>
                    )}

                    {activeTab === 'matchRevenue' && (
                        <div className={styles.revenueContainer}>
                            <div className={styles.revenueHeader}>
                                <h2>Match Revenue (10% Commission)</h2>
                                <div className={styles.revenueFilters}>
                                    <button 
                                        className={matchRevenueFilter === 'all' ? styles.revenueFilterActive : styles.revenueFilterBtn}
                                        onClick={() => setMatchRevenueFilter('all')}
                                    >
                                        All Time
                                    </button>
                                    <button 
                                        className={matchRevenueFilter === 'today' ? styles.revenueFilterActive : styles.revenueFilterBtn}
                                        onClick={() => setMatchRevenueFilter('today')}
                                    >
                                        Today
                                    </button>
                                    <button 
                                        className={matchRevenueFilter === '7days' ? styles.revenueFilterActive : styles.revenueFilterBtn}
                                        onClick={() => setMatchRevenueFilter('7days')}
                                    >
                                        7 Days
                                    </button>
                                    <button 
                                        className={matchRevenueFilter === '15days' ? styles.revenueFilterActive : styles.revenueFilterBtn}
                                        onClick={() => setMatchRevenueFilter('15days')}
                                    >
                                        15 Days
                                    </button>
                                    <button 
                                        className={matchRevenueFilter === '30days' ? styles.revenueFilterActive : styles.revenueFilterBtn}
                                        onClick={() => setMatchRevenueFilter('30days')}
                                    >
                                        30 Days
                                    </button>
                                </div>
                            </div>

                            {matchRevenueData && !matchRevenueData.error && (
                                <>
                                    <div className={styles.revenueStats}>
                                        <div className={styles.revenueCard} style={{ backgroundColor: '#4caf50', color: 'white' }}>
                                            <div className={styles.revenueIcon}>💰</div>
                                            <div className={styles.revenueInfo}>
                                                <h3>Available Balance</h3>
                                                <p className={styles.revenueAmount} style={{ fontSize: '2.5em', fontWeight: 'bold' }}>
                                                    ${(() => {
                                                        const balance = matchRevenueData.availableBalance;
                                                        if (balance !== undefined && balance !== null) {
                                                            return balance.toFixed(2);
                                                        }
                                                        // Fallback calculation if availableBalance is missing
                                                        const revenue = matchRevenueData.allTimeRevenue ?? matchRevenueData.totalRevenue ?? 0;
                                                        const withdrawn = matchRevenueData.totalWithdrawn ?? 0;
                                                        return (revenue - withdrawn).toFixed(2);
                                                    })()}
                                                </p>
                                                <span className={styles.revenueLabel}>
                                                    Ready to withdraw
                                                </span>
                                            </div>
                                        </div>

                                        <div className={styles.revenueCard}>
                                            <div className={styles.revenueIcon}>📈</div>
                                            <div className={styles.revenueInfo}>
                                                <h3>Total Earned ({matchRevenueFilter === 'all' ? 'All Time' : 'Filtered'})</h3>
                                                <p className={styles.revenueAmount}>
                                                    ${(matchRevenueData.totalRevenue ?? 0).toFixed(2)}
                                                </p>
                                                <span className={styles.revenueLabel}>
                                                    {matchRevenueData.totalMatches ?? 0} matches
                                                </span>
                                                {matchRevenueData.allTimeRevenue !== undefined && matchRevenueFilter !== 'all' && (
                                                    <span className={styles.revenueLabel} style={{ fontSize: '0.85em', marginTop: '5px', display: 'block' }}>
                                                        All Time: ${(matchRevenueData.allTimeRevenue ?? 0).toFixed(2)}
                                                    </span>
                                                )}
                                            </div>
                                        </div>

                                        <div className={styles.revenueCard}>
                                            <div className={styles.revenueIcon}>💸</div>
                                            <div className={styles.revenueInfo}>
                                                <h3>Total Withdrawn</h3>
                                                <p className={styles.revenueAmount}>
                                                    ${(matchRevenueData.totalWithdrawn ?? 0).toFixed(2)}
                                                </p>
                                                <span className={styles.revenueLabel}>
                                                    Amount withdrawn
                                                </span>
                                            </div>
                                        </div>

                                        <div className={styles.revenueCard}>
                                            <div className={styles.revenueIcon}>🎮</div>
                                            <div className={styles.revenueInfo}>
                                                <h3>Total Matches</h3>
                                                <p className={styles.revenueAmount}>
                                                    {matchRevenueData.totalMatches ?? 0}
                                                </p>
                                                <span className={styles.revenueLabel}>
                                                    Games completed
                                                </span>
                                            </div>
                                        </div>
                                    </div>

                                    <div style={{ margin: '20px 0', textAlign: 'center' }}>
                                        <button
                                            onClick={() => setShowWithdrawalForm(!showWithdrawalForm)}
                                            className={styles.approveButton}
                                            style={{ padding: '12px 24px', fontSize: '16px' }}
                                        >
                                            {showWithdrawalForm ? '✕ Cancel Withdrawal' : '💸 Withdraw from Match Revenue'}
                                        </button>
                                    </div>

                                    {showWithdrawalForm && (
                                        <div className={styles.revenueContainer} style={{ marginTop: '20px', padding: '20px', border: '2px solid #4caf50', borderRadius: '8px' }}>
                                            <h3>Withdraw from Match Revenue</h3>
                                            <form onSubmit={handleWithdrawMatchRevenue}>
                                                <div style={{ marginBottom: '15px' }}>
                                                    <label style={{ display: 'block', marginBottom: '5px', fontWeight: 'bold' }}>
                                                        Amount ($)
                                                    </label>
                                                    <input
                                                        type="number"
                                                        value={withdrawalFormData.amount}
                                                        onChange={(e) => setWithdrawalFormData({...withdrawalFormData, amount: e.target.value})}
                                                        placeholder="Enter amount"
                                                        min="0.01"
                                                        max={matchRevenueData?.availableBalance || 0}
                                                        step="0.01"
                                                        required
                                                        style={{ width: '100%', padding: '10px', fontSize: '16px', borderRadius: '4px', border: '1px solid #ddd' }}
                                                    />
                                                    <small style={{ color: '#666' }}>
                                                        Available: ${(matchRevenueData?.availableBalance ?? 0).toFixed(2)}
                                                    </small>
                                                </div>

                                                <div style={{ marginBottom: '15px' }}>
                                                    <label style={{ display: 'block', marginBottom: '5px', fontWeight: 'bold' }}>
                                                        Phone Number
                                                    </label>
                                                    <input
                                                        type="tel"
                                                        value={withdrawalFormData.phoneNumber}
                                                        onChange={(e) => setWithdrawalFormData({...withdrawalFormData, phoneNumber: e.target.value})}
                                                        placeholder="+252612345678"
                                                        required
                                                        style={{ width: '100%', padding: '10px', fontSize: '16px', borderRadius: '4px', border: '1px solid #ddd' }}
                                                    />
                                                </div>

                                                <div style={{ marginBottom: '15px' }}>
                                                    <label style={{ display: 'block', marginBottom: '5px', fontWeight: 'bold' }}>
                                                        Recipient Name
                                                    </label>
                                                    <input
                                                        type="text"
                                                        value={withdrawalFormData.recipientName}
                                                        onChange={(e) => setWithdrawalFormData({...withdrawalFormData, recipientName: e.target.value})}
                                                        placeholder="Enter recipient name"
                                                        required
                                                        style={{ width: '100%', padding: '10px', fontSize: '16px', borderRadius: '4px', border: '1px solid #ddd' }}
                                                    />
                                                </div>

                                                <div style={{ marginBottom: '15px' }}>
                                                    <label style={{ display: 'block', marginBottom: '5px', fontWeight: 'bold' }}>
                                                        Notes (Optional)
                                                    </label>
                                                    <textarea
                                                        value={withdrawalFormData.notes}
                                                        onChange={(e) => setWithdrawalFormData({...withdrawalFormData, notes: e.target.value})}
                                                        placeholder="Add any notes..."
                                                        rows="3"
                                                        style={{ width: '100%', padding: '10px', fontSize: '16px', borderRadius: '4px', border: '1px solid #ddd' }}
                                                    />
                                                </div>

                                                <button
                                                    type="submit"
                                                    className={styles.approveButton}
                                                    disabled={loading || !matchRevenueData?.availableBalance || matchRevenueData.availableBalance <= 0}
                                                    style={{ width: '100%', padding: '12px', fontSize: '16px' }}
                                                >
                                                    {loading ? 'Processing...' : 'Record Withdrawal'}
                                                </button>
                                            </form>
                                        </div>
                                    )}

                                    {matchRevenueWithdrawals.length > 0 && (
                                        <div className={styles.revenueBreakdown} style={{ marginTop: '30px' }}>
                                            <h3>Withdrawal History</h3>
                                            <div className={styles.revenueTable}>
                                                <div className={styles.revenueTableHeader}>
                                                    <span>Date</span>
                                                    <span>Amount</span>
                                                    <span>Phone Number</span>
                                                    <span>Recipient</span>
                                                    <span>Processed By</span>
                                                </div>
                                                {matchRevenueWithdrawals.map((withdrawal) => (
                                                    <div key={withdrawal._id} className={styles.revenueTableRow}>
                                                        <span>{withdrawal.createdAt ? formatDate(withdrawal.createdAt) : 'N/A'}</span>
                                                        <span className={styles.withdrawalAmount}>${(withdrawal.amount ?? 0).toFixed(2)}</span>
                                                        <span>{withdrawal.phoneNumber || 'N/A'}</span>
                                                        <span>{withdrawal.recipientName || 'N/A'}</span>
                                                        <span>{withdrawal.processedBy?.username || 'N/A'}</span>
                                                    </div>
                                                ))}
                                            </div>
                                        </div>
                                    )}

                                    <div className={styles.revenueBreakdown}>
                                        <h3>Match Breakdown</h3>
                                        {!matchRevenueData.matches || matchRevenueData.matches.length === 0 ? (
                                            <p className={styles.emptyState}>No matches in this period</p>
                                        ) : (
                                            <div className={styles.revenueTable}>
                                                <div className={styles.revenueTableHeader}>
                                                    <span>Date</span>
                                                    <span>Bet Amount</span>
                                                    <span>Total Pot</span>
                                                    <span>Platform Fee (10%)</span>
                                                    <span>Winner</span>
                                                </div>
                                                {matchRevenueData.matches.map((match) => (
                                                    <div key={match._id} className={styles.revenueTableRow}>
                                                        <span>{match.completedAt ? formatDate(match.completedAt) : 'N/A'}</span>
                                                        <span>${(match.betAmount ?? 0).toFixed(2)}</span>
                                                        <span>${(match.totalPot ?? 0).toFixed(2)}</span>
                                                        <span className={styles.platformFeeAmount}>
                                                            ${(match.platformFee ?? 0).toFixed(2)}
                                                        </span>
                                                        <span>{match.winner || 'N/A'}</span>
                                                    </div>
                                                ))}
                                            </div>
                                        )}
                                    </div>
                                </>
                            )}
                        </div>
                    )}

                    {activeTab === 'accounting' && (
                        <div className={styles.revenueContainer}>
                            <div className={styles.revenueHeader}>
                                <h2>📊 Match Revenue Accounting Ledger</h2>
                            </div>

                            {ledgerData && !ledgerData.error && (
                                <>
                                    {/* Summary Cards */}
                                    <div className={styles.revenueStats} style={{ marginBottom: '30px' }}>
                                        <div className={styles.revenueCard} style={{ backgroundColor: '#4caf50', color: 'white' }}>
                                            <div className={styles.revenueIcon}>💰</div>
                                            <div className={styles.revenueInfo}>
                                                <h3>Total Revenue</h3>
                                                <p className={styles.revenueAmount}>
                                                    ${(ledgerData.totalRevenue ?? 0).toFixed(2)}
                                                </p>
                                                <span className={styles.revenueLabel}>
                                                    {ledgerData.summary?.revenueCount ?? 0} matches
                                                </span>
                                            </div>
                                        </div>

                                        <div className={styles.revenueCard} style={{ backgroundColor: '#f44336', color: 'white' }}>
                                            <div className={styles.revenueIcon}>💸</div>
                                            <div className={styles.revenueInfo}>
                                                <h3>Total Expenses</h3>
                                                <p className={styles.revenueAmount}>
                                                    ${(ledgerData.totalExpenses ?? 0).toFixed(2)}
                                                </p>
                                                <span className={styles.revenueLabel}>
                                                    {ledgerData.summary?.expenseCount ?? 0} withdrawals
                                                </span>
                                            </div>
                                        </div>

                                        <div className={styles.revenueCard} style={{ backgroundColor: '#2196f3', color: 'white' }}>
                                            <div className={styles.revenueIcon}>📊</div>
                                            <div className={styles.revenueInfo}>
                                                <h3>Net Balance</h3>
                                                <p className={styles.revenueAmount} style={{ fontSize: '2em' }}>
                                                    ${(ledgerData.netBalance ?? 0).toFixed(2)}
                                                </p>
                                                <span className={styles.revenueLabel}>
                                                    Available Balance
                                                </span>
                                            </div>
                                        </div>
                                    </div>

                                    {/* Accounting Ledger Table - QuickBooks Style */}
                                    <div className={styles.revenueBreakdown}>
                                        <h3>Ledger Entries (All Transactions)</h3>
                                        {!ledgerData.ledgerEntries || ledgerData.ledgerEntries.length === 0 ? (
                                            <p className={styles.emptyState}>No transactions recorded</p>
                                        ) : (
                                            <div className={styles.ledgerTable}>
                                                <div className={styles.ledgerTableHeader}>
                                                    <span style={{ width: '15%' }}>DATE</span>
                                                    <span style={{ width: '10%' }}>TYPE</span>
                                                    <span style={{ width: '25%' }}>DESCRIPTION</span>
                                                    <span style={{ width: '15%' }}>CATEGORY</span>
                                                    <span style={{ width: '11%', textAlign: 'right' }}>DEBIT</span>
                                                    <span style={{ width: '11%', textAlign: 'right' }}>CREDIT</span>
                                                    <span style={{ width: '13%', textAlign: 'right' }}>BALANCE</span>
                                                </div>
                                                
                                                {/* Beginning Balance Row */}
                                                <div 
                                                    className={styles.ledgerTableRow}
                                                    style={{
                                                        backgroundColor: '#f5f5f5',
                                                        borderTop: '2px solid #666',
                                                        borderBottom: '2px solid #666',
                                                        fontWeight: 'bold'
                                                    }}
                                                >
                                                    <span style={{ width: '15%' }}>Beginning Balance</span>
                                                    <span style={{ width: '10%' }}>-</span>
                                                    <span style={{ width: '25%' }}>Opening Balance</span>
                                                    <span style={{ width: '15%' }}>-</span>
                                                    <span style={{ width: '11%', textAlign: 'right' }}>-</span>
                                                    <span style={{ width: '11%', textAlign: 'right' }}>-</span>
                                                    <span style={{ width: '13%', textAlign: 'right', color: '#2196f3' }}>
                                                        $0.00
                                                    </span>
                                                </div>

                                                {(() => {
                                                    // Reverse entries to show oldest first (proper accounting order)
                                                    const reversedEntries = [...ledgerData.ledgerEntries].reverse();
                                                    let runningBalance = 0;

                                                    return reversedEntries.map((entry, index) => {
                                                        // Update running balance
                                                        if (entry.type === 'revenue') {
                                                            runningBalance += (entry.amount || 0);
                                                        } else {
                                                            runningBalance -= (entry.amount || 0);
                                                        }

                                                        return (
                                                            <div 
                                                                key={entry.reference} 
                                                                className={styles.ledgerTableRow}
                                                                style={{
                                                                    backgroundColor: index % 2 === 0 ? '#ffffff' : '#fafafa',
                                                                    borderLeft: `4px solid ${entry.type === 'revenue' ? '#4caf50' : '#f44336'}`
                                                                }}
                                                            >
                                                                <span style={{ width: '15%', fontSize: '13px' }}>
                                                                    {entry.date ? formatDate(entry.date) : 'N/A'}
                                                                </span>
                                                                <span style={{ width: '10%' }}>
                                                                    <span style={{
                                                                        padding: '3px 6px',
                                                                        borderRadius: '3px',
                                                                        fontSize: '11px',
                                                                        fontWeight: 'bold',
                                                                        backgroundColor: entry.type === 'revenue' ? '#4caf50' : '#f44336',
                                                                        color: 'white',
                                                                        display: 'inline-block'
                                                                    }}>
                                                                        {entry.type === 'revenue' ? 'REVENUE' : 'EXPENSE'}
                                                                    </span>
                                                                </span>
                                                                <span style={{ width: '25%', fontSize: '13px' }}>
                                                                    {entry.description || 'N/A'}
                                                                </span>
                                                                <span style={{ width: '15%', fontSize: '13px' }}>
                                                                    {entry.category || 'N/A'}
                                                                </span>
                                                                <span style={{ 
                                                                    width: '11%', 
                                                                    textAlign: 'right', 
                                                                    color: '#4caf50', 
                                                                    fontWeight: 'bold',
                                                                    fontSize: '14px'
                                                                }}>
                                                                    {entry.type === 'revenue' ? `$${(entry.amount || 0).toFixed(2)}` : '-'}
                                                                </span>
                                                                <span style={{ 
                                                                    width: '11%', 
                                                                    textAlign: 'right', 
                                                                    color: '#f44336', 
                                                                    fontWeight: 'bold',
                                                                    fontSize: '14px'
                                                                }}>
                                                                    {entry.type === 'expense' ? `$${(entry.amount || 0).toFixed(2)}` : '-'}
                                                                </span>
                                                                <span style={{ 
                                                                    width: '13%', 
                                                                    textAlign: 'right', 
                                                                    fontWeight: 'bold', 
                                                                    color: runningBalance >= 0 ? '#2196f3' : '#f44336',
                                                                    fontSize: '14px',
                                                                    backgroundColor: runningBalance >= 0 ? '#e3f2fd' : '#ffebee',
                                                                    padding: '4px 8px',
                                                                    borderRadius: '4px'
                                                                }}>
                                                                    ${runningBalance.toFixed(2)}
                                                                </span>
                                                            </div>
                                                        );
                                                    });
                                                })()}

                                                {/* Ending Balance Row */}
                                                <div 
                                                    className={styles.ledgerTableRow}
                                                    style={{
                                                        backgroundColor: '#e3f2fd',
                                                        borderTop: '2px solid #2196f3',
                                                        borderBottom: '3px double #2196f3',
                                                        fontWeight: 'bold',
                                                        fontSize: '15px'
                                                    }}
                                                >
                                                    <span style={{ width: '15%' }}>Ending Balance</span>
                                                    <span style={{ width: '10%' }}>-</span>
                                                    <span style={{ width: '25%' }}>Current Balance</span>
                                                    <span style={{ width: '15%' }}>-</span>
                                                    <span style={{ width: '11%', textAlign: 'right', color: '#4caf50' }}>
                                                        ${(ledgerData.totalRevenue ?? 0).toFixed(2)}
                                                    </span>
                                                    <span style={{ width: '11%', textAlign: 'right', color: '#f44336' }}>
                                                        ${(ledgerData.totalExpenses ?? 0).toFixed(2)}
                                                    </span>
                                                    <span style={{ 
                                                        width: '13%', 
                                                        textAlign: 'right',
                                                        color: '#2196f3',
                                                        fontSize: '16px'
                                                    }}>
                                                        ${(ledgerData.netBalance ?? 0).toFixed(2)}
                                                    </span>
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                </>
                            )}
                        </div>
                    )}
                </div>
            </div>

            {/* Success Verification Modal */}
            {showSuccessModal && (
                <div className={styles.successModal} onClick={() => setShowSuccessModal(false)}>
                    <div className={styles.successContent} onClick={(e) => e.stopPropagation()}>
                        <div className={styles.successIconContainer}>
                            <div className={styles.successCheckmark}>
                                <svg className={styles.checkmarkSvg} viewBox="0 0 52 52">
                                    <circle className={styles.checkmarkCircle} cx="26" cy="26" r="25" fill="none"/>
                                    <path className={styles.checkmarkCheck} fill="none" d="M14.1 27.2l7.1 7.2 16.7-16.8"/>
                                </svg>
                            </div>
                        </div>
                        <h2 className={styles.successTitle}>Transaction Approved</h2>
                        <p className={styles.successMessage}>Successfully verified!</p>
                    </div>
                </div>
            )}

            {/* User Stats Modal */}
            {selectedUser && userStats && (
                <div className={styles.userStatsModal} onClick={() => setSelectedUser(null)}>
                    <div className={styles.userStatsContent} onClick={(e) => e.stopPropagation()}>
                        <div className={styles.modalHeader}>
                            <h2>📊 {selectedUser.username}'s Statistics</h2>
                            <button className={styles.closeBtn} onClick={() => setSelectedUser(null)}>✕</button>
                        </div>
                        
                        <div className={styles.userStatsGrid}>
                            <div className={styles.statCard}>
                                <div className={styles.statIcon}>🎮</div>
                                <div className={styles.statInfo}>
                                    <h3>Games Played</h3>
                                    <p className={styles.statValue}>{userStats.totalGames}</p>
                                </div>
                            </div>
                            <div className={styles.statCard}>
                                <div className={styles.statIcon}>🏆</div>
                                <div className={styles.statInfo}>
                                    <h3>Wins</h3>
                                    <p className={styles.statValue}>{userStats.wins}</p>
                                </div>
                            </div>
                            <div className={styles.statCard}>
                                <div className={styles.statIcon}>❌</div>
                                <div className={styles.statInfo}>
                                    <h3>Losses</h3>
                                    <p className={styles.statValue}>{userStats.losses}</p>
                                </div>
                            </div>
                            <div className={styles.statCard}>
                                <div className={styles.statIcon}>📈</div>
                                <div className={styles.statInfo}>
                                    <h3>Win Rate</h3>
                                    <p className={styles.statValue}>{userStats.winRate}%</p>
                                </div>
                            </div>
                            <div className={styles.statCard}>
                                <div className={styles.statIcon}>💰</div>
                                <div className={styles.statInfo}>
                                    <h3>Total Winnings</h3>
                                    <p className={styles.statValue}>${userStats.totalWinnings.toFixed(2)}</p>
                                </div>
                            </div>
                            <div className={styles.statCard}>
                                <div className={styles.statIcon}>💸</div>
                                <div className={styles.statInfo}>
                                    <h3>Total Losses</h3>
                                    <p className={styles.statValue}>${userStats.totalLosses.toFixed(2)}</p>
                                </div>
                            </div>
                            <div className={`${styles.statCard} ${userStats.netProfit >= 0 ? styles.netProfitPositive : styles.netProfitNegative}`}>
                                <div className={styles.statIcon}>💵</div>
                                <div className={styles.statInfo}>
                                    <h3>Net Profit/Loss</h3>
                                    <p className={styles.statValue}>
                                        {userStats.netProfit >= 0 ? '+' : ''}${userStats.netProfit.toFixed(2)}
                                    </p>
                                </div>
                            </div>
                        </div>

                        {userStats.recentGames.length > 0 && (
                            <div className={styles.recentGamesSection}>
                                <h3>Recent Games</h3>
                                <div className={styles.recentGamesList}>
                                    {userStats.recentGames.map((game, idx) => (
                                        <div key={game._id || idx} className={styles.gameItem}>
                                            <div className={styles.gameDate}>
                                                {new Date(game.completedAt).toLocaleDateString()} {new Date(game.completedAt).toLocaleTimeString()}
                                            </div>
                                            <div className={styles.gameBet}>
                                                Bet: ${game.betAmount?.toFixed(2) || '0.00'}
                                            </div>
                                            <div className={game.isWinner ? styles.gameWon : styles.gameLost}>
                                                {game.isWinner ? '🏆 WON' : '❌ LOST'}
                                            </div>
                                            <div className={styles.gameWinner}>
                                                Winner: {game.winnerName}
                                            </div>
                                            {game.opponents && game.opponents.length > 0 && (
                                                <div className={styles.gameOpponents}>
                                                    {game.isWinner ? '😢 Losers: ' : '👥 Played with: '}
                                                    {game.opponents.join(', ')}
                                                </div>
                                            )}
                                            {game.isWinner && game.payout > 0 && (
                                                <div className={styles.gamePayout}>
                                                    Payout: ${game.payout.toFixed(2)}
                                                </div>
                                            )}
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}

                        {userStats.totalGames === 0 && (
                            <div className={styles.noGamesMessage}>
                                <p>This user hasn't played any games yet.</p>
                            </div>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
};

export default AdminPanel;


