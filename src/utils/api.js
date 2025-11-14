const API_URL = `http://${window.location.hostname}:8000/api`;

// TEST MODE - Set to true to bypass authentication
const TEST_MODE = false;

// Helper function to get auth header
const getAuthHeader = () => {
    if (TEST_MODE) {
        return { Authorization: 'Bearer test-token' };
    }
    const token = localStorage.getItem('token');
    return token ? { Authorization: `Bearer ${token}` } : {};
};

// Auth API
export const authAPI = {
    register: async (userData) => {
        const response = await fetch(`${API_URL}/auth/register`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(userData)
        });
        return response.json();
    },
    
    login: async (credentials) => {
        console.log('API: Sending login request to:', `${API_URL}/auth/login`);
        console.log('API: Credentials being sent:', credentials);
        
        try {
            const response = await fetch(`${API_URL}/auth/login`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(credentials)
            });
            
            console.log('API: Response status:', response.status);
            const data = await response.json();
            console.log('API: Response data:', JSON.stringify(data, null, 2));
            
            return data;
        } catch (error) {
            console.error('API: Login error:', error);
            return { error: 'Network error. Please check your connection.' };
        }
    },
    
    getProfile: async () => {
        const response = await fetch(`${API_URL}/auth/me`, {
            headers: getAuthHeader()
        });
        return response.json();
    },
    
    getBalance: async () => {
        const response = await fetch(`${API_URL}/auth/balance`, {
            headers: getAuthHeader()
        });
        return response.json();
    }
};

// Transaction API
export const transactionAPI = {
    requestDeposit: async (depositData) => {
        const response = await fetch(`${API_URL}/transactions/deposit`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                ...getAuthHeader()
            },
            body: JSON.stringify(depositData)
        });
        return response.json();
    },
    
    requestWithdrawal: async (withdrawalData) => {
        const response = await fetch(`${API_URL}/transactions/withdrawal`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                ...getAuthHeader()
            },
            body: JSON.stringify(withdrawalData)
        });
        return response.json();
    },
    
    getMyTransactions: async () => {
        const response = await fetch(`${API_URL}/transactions/my-transactions`, {
            headers: getAuthHeader()
        });
        return response.json();
    }
};

// Admin API
export const adminAPI = {
    getPendingTransactions: async () => {
        const response = await fetch(`${API_URL}/admin/transactions/pending`, {
            headers: getAuthHeader()
        });
        return response.json();
    },
    
    getAllTransactions: async (filters = {}) => {
        const queryString = new URLSearchParams(filters).toString();
        const response = await fetch(`${API_URL}/admin/transactions?${queryString}`, {
            headers: getAuthHeader()
        });
        return response.json();
    },
    
    approveTransaction: async (transactionId, adminNotes = '') => {
        const response = await fetch(`${API_URL}/admin/transactions/${transactionId}/approve`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                ...getAuthHeader()
            },
            body: JSON.stringify({ adminNotes })
        });
        return response.json();
    },
    
    rejectTransaction: async (transactionId, adminNotes = '') => {
        const response = await fetch(`${API_URL}/admin/transactions/${transactionId}/reject`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                ...getAuthHeader()
            },
            body: JSON.stringify({ adminNotes })
        });
        return response.json();
    },
    
    getAllUsers: async () => {
        const response = await fetch(`${API_URL}/admin/users`, {
            headers: getAuthHeader()
        });
        return response.json();
    },
    
    getGameStats: async () => {
        const response = await fetch(`${API_URL}/admin/stats/games`, {
            headers: getAuthHeader()
        });
        return response.json();
    },
    
    getGameHistory: async (limit = 50) => {
        const response = await fetch(`${API_URL}/admin/games?limit=${limit}`, {
            headers: getAuthHeader()
        });
        return response.json();
    },
    
    getUserStats: async (userId) => {
        const response = await fetch(`${API_URL}/admin/users/${userId}/stats`, {
            headers: getAuthHeader()
        });
        return response.json();
    },
    
    getMatchRevenue: async (filter = 'all') => {
        const response = await fetch(`${API_URL}/admin/revenue/matches?filter=${filter}`, {
            headers: getAuthHeader()
        });
        return response.json();
    },
    
    getMatchRevenueWithdrawals: async () => {
        const response = await fetch(`${API_URL}/admin/revenue/matches/withdrawals`, {
            headers: getAuthHeader()
        });
        return response.json();
    },
    
    withdrawMatchRevenue: async (withdrawalData) => {
        const response = await fetch(`${API_URL}/admin/revenue/matches/withdraw`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                ...getAuthHeader()
            },
            body: JSON.stringify(withdrawalData)
        });
        return response.json();
    },
    
    getMatchRevenueLedger: async () => {
        const response = await fetch(`${API_URL}/admin/revenue/matches/ledger`, {
            headers: getAuthHeader()
        });
        return response.json();
    }
};

// Leaderboard API
export const leaderboardAPI = {
    getLeaderboard: async (sortBy = 'wins', limit = 50) => {
        const response = await fetch(`${API_URL}/leaderboard?sortBy=${sortBy}&limit=${limit}`, {
            headers: getAuthHeader()
        });
        return response.json();
    },
    
    getMyStats: async () => {
        const response = await fetch(`${API_URL}/leaderboard/me`, {
            headers: getAuthHeader(),
            credentials: 'include'
        });
        return response.json();
    }
};

