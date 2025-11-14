import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { leaderboardAPI } from '../../utils/api';
import styles from './Leaderboard.module.css';

const Leaderboard = () => {
    const { user } = useAuth();
    const [leaderboard, setLeaderboard] = useState([]);
    const [myStats, setMyStats] = useState(null);
    const [loading, setLoading] = useState(true);
    const [sortBy, setSortBy] = useState('wins');
    const [error, setError] = useState('');

    useEffect(() => {
        fetchLeaderboard();
        fetchMyStats();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [sortBy]);

    const fetchLeaderboard = async () => {
        try {
            setLoading(true);
            const data = await leaderboardAPI.getLeaderboard(sortBy, 50);
            if (data.error) {
                setError(data.error);
            } else {
                setLeaderboard(data.leaderboard || []);
            }
        } catch (error) {
            console.error('Error fetching leaderboard:', error);
            setError('Failed to load leaderboard');
        } finally {
            setLoading(false);
        }
    };

    const fetchMyStats = async () => {
        try {
            const data = await leaderboardAPI.getMyStats();
            if (!data.error) {
                setMyStats(data);
            }
        } catch (error) {
            console.error('Error fetching user stats:', error);
        }
    };

    const getRankColor = (rank) => {
        if (rank === 1) return styles.gold;
        if (rank === 2) return styles.silver;
        if (rank === 3) return styles.bronze;
        return '';
    };

    const getRankIcon = (rank) => {
        if (rank === 1) return '🏆';
        if (rank === 2) return '🥈';
        if (rank === 3) return '🥉';
        return `#${rank}`;
    };

    const handleSortChange = (newSort) => {
        setSortBy(newSort);
    };

    if (loading) {
        return (
            <div className={styles.leaderboardContainer}>
                <div className={styles.loading}>
                    <div className={styles.spinner}></div>
                    <p>Loading leaderboard...</p>
                </div>
            </div>
        );
    }

    return (
        <div className={styles.leaderboardContainer}>
            <div className={styles.header}>
                <h1 className={styles.title}>🏆 Leaderboard</h1>
                <p className={styles.subtitle}>Top Players</p>
            </div>

            {/* User's Own Stats Card */}
            {myStats && (
                <div className={styles.myStatsCard}>
                    <div className={styles.myStatsHeader}>
                        <span className={styles.myRank}>{getRankIcon(myStats.rank)}</span>
                        <div className={styles.myInfo}>
                            <span className={styles.myUsername}>{myStats.username} (You)</span>
                            <span className={styles.myRankText}>Rank #{myStats.rank}</span>
                        </div>
                    </div>
                    <div className={styles.myStatsGrid}>
                        <div className={styles.statItem}>
                            <span className={styles.statValue}>{myStats.totalGames}</span>
                            <span className={styles.statLabel}>Games</span>
                        </div>
                        <div className={styles.statItem}>
                            <span className={styles.statValue}>{myStats.wins}</span>
                            <span className={styles.statLabel}>Wins</span>
                        </div>
                        <div className={styles.statItem}>
                            <span className={styles.statValue}>{myStats.winRate}%</span>
                            <span className={styles.statLabel}>Win Rate</span>
                        </div>
                        <div className={styles.statItem}>
                            <span className={styles.statValue}>${myStats.totalEarnings.toFixed(0)}</span>
                            <span className={styles.statLabel}>Earnings</span>
                        </div>
                    </div>
                </div>
            )}

            {/* Sort Tabs */}
            <div className={styles.sortTabs}>
                <button 
                    className={sortBy === 'wins' ? styles.activeTab : styles.tab}
                    onClick={() => handleSortChange('wins')}
                >
                    Most Wins
                </button>
                <button 
                    className={sortBy === 'earnings' ? styles.activeTab : styles.tab}
                    onClick={() => handleSortChange('earnings')}
                >
                    Top Earnings
                </button>
                <button 
                    className={sortBy === 'winRate' ? styles.activeTab : styles.tab}
                    onClick={() => handleSortChange('winRate')}
                >
                    Win Rate
                </button>
                <button 
                    className={sortBy === 'streak' ? styles.activeTab : styles.tab}
                    onClick={() => handleSortChange('streak')}
                >
                    Best Streak
                </button>
            </div>

            {/* Error Message */}
            {error && (
                <div className={styles.error}>{error}</div>
            )}

            {/* Leaderboard List */}
            <div className={styles.leaderboardList}>
                {leaderboard.length === 0 ? (
                    <div className={styles.emptyState}>
                        <p className={styles.emptyIcon}>🎮</p>
                        <p className={styles.emptyText}>No players yet</p>
                        <p className={styles.emptySubtext}>Be the first to play!</p>
                    </div>
                ) : (
                    leaderboard.map((player, index) => {
                        const isCurrentUser = user && player.username === user.username;
                        return (
                            <div 
                                key={index} 
                                className={`${styles.playerCard} ${getRankColor(player.rank)} ${isCurrentUser ? styles.currentUser : ''}`}
                            >
                                <div className={styles.rankSection}>
                                    <span className={styles.rankBadge}>
                                        {getRankIcon(player.rank)}
                                    </span>
                                </div>
                                
                                <div className={styles.playerInfo}>
                                    <div className={styles.playerName}>
                                        {player.username}
                                        {isCurrentUser && <span className={styles.youBadge}>YOU</span>}
                                    </div>
                                    <div className={styles.playerStats}>
                                        <span className={styles.statBadge}>
                                            🎮 {player.totalGames}
                                        </span>
                                        <span className={styles.statBadge}>
                                            ✅ {player.wins}W
                                        </span>
                                        <span className={styles.statBadge}>
                                            ❌ {player.losses}L
                                        </span>
                                    </div>
                                </div>

                                <div className={styles.playerMainStat}>
                                    {sortBy === 'wins' && (
                                        <>
                                            <div className={styles.mainStatValue}>{player.wins}</div>
                                            <div className={styles.mainStatLabel}>Wins</div>
                                        </>
                                    )}
                                    {sortBy === 'earnings' && (
                                        <>
                                            <div className={styles.mainStatValue}>${player.totalEarnings.toFixed(0)}</div>
                                            <div className={styles.mainStatLabel}>Earned</div>
                                        </>
                                    )}
                                    {sortBy === 'winRate' && (
                                        <>
                                            <div className={styles.mainStatValue}>{player.winRate}%</div>
                                            <div className={styles.mainStatLabel}>Win Rate</div>
                                        </>
                                    )}
                                    {sortBy === 'streak' && (
                                        <>
                                            <div className={styles.mainStatValue}>{player.bestStreak}</div>
                                            <div className={styles.mainStatLabel}>Streak</div>
                                        </>
                                    )}
                                </div>
                            </div>
                        );
                    })
                )}
            </div>
        </div>
    );
};

export default Leaderboard;




