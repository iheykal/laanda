import React, { useState, useEffect } from 'react';
import { transactionAPI } from '../../utils/api';
import styles from './Wallet.module.css';

const TransactionHistory = () => {
    const [transactions, setTransactions] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [filter, setFilter] = useState('all'); // all, deposit, withdrawal, pending, approved, rejected

    useEffect(() => {
        loadTransactions();
    }, []);

    const loadTransactions = async () => {
        setLoading(true);
        setError('');
        try {
            const data = await transactionAPI.getMyTransactions();
            if (data.error) {
                setError(data.error);
            } else {
                setTransactions(data);
            }
        } catch (err) {
            setError('Failed to load transactions');
        } finally {
            setLoading(false);
        }
    };

    const getStatusIcon = (status) => {
        switch (status) {
            case 'approved':
                return '✅';
            case 'pending':
                return '⏳';
            case 'rejected':
                return '❌';
            default:
                return '📄';
        }
    };

    const getTypeIcon = (type) => {
        return type === 'deposit' ? '💰' : '💸';
    };

    const formatDate = (dateString) => {
        const date = new Date(dateString);
        const now = new Date();
        const diffTime = Math.abs(now - date);
        const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));
        
        if (diffDays === 0) {
            return 'Today, ' + date.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
        } else if (diffDays === 1) {
            return 'Yesterday, ' + date.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
        } else if (diffDays < 7) {
            return diffDays + ' days ago';
        } else {
            return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
        }
    };

    const getFilteredTransactions = () => {
        if (filter === 'all') return transactions;
        if (filter === 'deposit' || filter === 'withdrawal') {
            return transactions.filter(t => t.type === filter);
        }
        return transactions.filter(t => t.status === filter);
    };

    const filteredTransactions = getFilteredTransactions();

    const getStats = () => {
        const total = transactions.reduce((sum, t) => {
            if (t.status === 'approved') {
                return sum + (t.type === 'deposit' ? t.amount : -t.amount);
            }
            return sum;
        }, 0);
        
        const deposits = transactions.filter(t => t.type === 'deposit' && t.status === 'approved')
            .reduce((sum, t) => sum + t.amount, 0);
        
        const withdrawals = transactions.filter(t => t.type === 'withdrawal' && t.status === 'approved')
            .reduce((sum, t) => sum + t.amount, 0);
        
        const pending = transactions.filter(t => t.status === 'pending').length;
        
        return { total, deposits, withdrawals, pending };
    };

    const stats = getStats();

    if (loading) {
        return (
            <div className={styles.loadingContainer}>
                <div className={styles.spinner}></div>
                <p>Loading your transactions...</p>
            </div>
        );
    }

    if (error) {
        return (
            <div className={styles.errorContainer}>
                <span className={styles.errorIcon}>⚠️</span>
                <p>{error}</p>
                <button onClick={loadTransactions} className={styles.retryButton}>
                    Try Again
                </button>
            </div>
        );
    }

    if (transactions.length === 0) {
        return (
            <div className={styles.emptyStateModern}>
                <div className={styles.emptyIcon}>📊</div>
                <h3>No Transactions Yet</h3>
                <p>Your transaction history will appear here</p>
                <div className={styles.emptyActions}>
                    <span>💡 Make your first deposit to get started!</span>
                </div>
            </div>
        );
    }

    return (
        <div className={styles.historyContainerModern}>
            <div className={styles.historyHeader}>
                <h3>Transaction History</h3>
                <button onClick={loadTransactions} className={styles.refreshButton} title="Refresh">
                    🔄
                </button>
            </div>

            {/* Stats Cards */}
            <div className={styles.statsCards}>
                <div className={styles.statCard}>
                    <div className={styles.statIcon}>💵</div>
                    <div className={styles.statInfo}>
                        <span className={styles.statLabel}>Total Deposited</span>
                        <span className={styles.statValue}>${stats.deposits.toFixed(2)}</span>
                    </div>
                </div>
                <div className={styles.statCard}>
                    <div className={styles.statIcon}>💸</div>
                    <div className={styles.statInfo}>
                        <span className={styles.statLabel}>Total Withdrawn</span>
                        <span className={styles.statValue}>${stats.withdrawals.toFixed(2)}</span>
                    </div>
                </div>
                <div className={styles.statCard}>
                    <div className={styles.statIcon}>⏳</div>
                    <div className={styles.statInfo}>
                        <span className={styles.statLabel}>Pending</span>
                        <span className={styles.statValue}>{stats.pending}</span>
                    </div>
                </div>
            </div>

            {/* Filter Buttons */}
            <div className={styles.filterButtons}>
                <button 
                    className={filter === 'all' ? styles.filterActive : styles.filterBtn}
                    onClick={() => setFilter('all')}
                >
                    All
                </button>
                <button 
                    className={filter === 'deposit' ? styles.filterActive : styles.filterBtn}
                    onClick={() => setFilter('deposit')}
                >
                    💰 Deposits
                </button>
                <button 
                    className={filter === 'withdrawal' ? styles.filterActive : styles.filterBtn}
                    onClick={() => setFilter('withdrawal')}
                >
                    💸 Withdrawals
                </button>
                <button 
                    className={filter === 'pending' ? styles.filterActive : styles.filterBtn}
                    onClick={() => setFilter('pending')}
                >
                    ⏳ Pending
                </button>
            </div>

            {/* Transaction List */}
            <div className={styles.transactionListModern}>
                {filteredTransactions.map((transaction, index) => (
                    <div 
                        key={transaction._id} 
                        className={styles.transactionCardModern}
                        style={{ animationDelay: `${index * 0.05}s` }}
                    >
                        <div className={styles.transactionLeft}>
                            <div className={`${styles.transactionIconBox} ${styles[transaction.type]}`}>
                                {getTypeIcon(transaction.type)}
                            </div>
                            <div className={styles.transactionInfo}>
                                <h4 className={styles.transactionTitle}>
                                    {transaction.type === 'deposit' ? 'Deposit' : 'Withdrawal'}
                                </h4>
                                <p className={styles.transactionDate}>{formatDate(transaction.createdAt)}</p>
                                {transaction.phoneNumber && (
                                    <p className={styles.transactionPhone}>📱 {transaction.phoneNumber}</p>
                                )}
                                {(transaction.senderName || transaction.recipientName) && (
                                    <p className={styles.transactionName}>
                                        👤 {transaction.senderName || transaction.recipientName}
                                    </p>
                                )}
                            </div>
                        </div>
                        <div className={styles.transactionRight}>
                            <div className={styles.transactionAmount}>
                                <span className={transaction.type === 'deposit' ? styles.amountPositive : styles.amountNegative}>
                                    {transaction.type === 'deposit' ? '+' : '-'}${transaction.amount.toFixed(2)}
                                </span>
                            </div>
                            <div className={`${styles.statusBadge} ${styles[transaction.status]}`}>
                                <span>{getStatusIcon(transaction.status)}</span>
                                <span>{transaction.status}</span>
                            </div>
                        </div>
                        {transaction.adminNotes && (
                            <div className={styles.adminNotesBox}>
                                <span className={styles.adminNotesLabel}>💬 Admin:</span>
                                <span className={styles.adminNotesText}>{transaction.adminNotes}</span>
                            </div>
                        )}
                    </div>
                ))}
            </div>

            {filteredTransactions.length === 0 && (
                <div className={styles.noResults}>
                    <p>No transactions found for this filter</p>
                </div>
            )}
        </div>
    );
};

export default TransactionHistory;

