import React, { createContext, useState, useEffect, useContext } from 'react';
import { authAPI } from '../utils/api';

export const AuthContext = createContext();

export const useAuth = () => {
    const context = useContext(AuthContext);
    if (!context) {
        throw new Error('useAuth must be used within AuthProvider');
    }
    return context;
};

export const AuthProvider = ({ children }) => {
    const [user, setUser] = useState(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        // Check if user is logged in on mount
        const token = localStorage.getItem('token');
        if (token) {
            loadUser();
        } else {
            setLoading(false);
        }
    }, []);

    const loadUser = async () => {
        try {
            const userData = await authAPI.getProfile();
            if (!userData.error) {
                setUser(userData);
            } else {
                localStorage.removeItem('token');
            }
        } catch (error) {
            console.error('Error loading user:', error);
            localStorage.removeItem('token');
        } finally {
            setLoading(false);
        }
    };

    const register = async (userData) => {
        try {
            const response = await authAPI.register(userData);
            if (response.error) {
                return { error: response.error };
            }
            localStorage.setItem('token', response.token);
            setUser(response.user);
            return { success: true };
        } catch (error) {
            return { error: 'Registration failed' };
        }
    };

    const login = async (credentials) => {
        try {
            const response = await authAPI.login(credentials);
            if (response.error) {
                return { error: response.error };
            }
            localStorage.setItem('token', response.token);
            setUser(response.user);
            return { success: true };
        } catch (error) {
            return { error: 'Login failed' };
        }
    };

    const logout = () => {
        localStorage.removeItem('token');
        setUser(null);
    };

    const updateBalance = async () => {
        try {
            const response = await authAPI.getBalance();
            if (!response.error) {
                setUser(prev => ({ ...prev, balance: response.balance }));
            }
        } catch (error) {
            console.error('Error updating balance:', error);
        }
    };

    // Update balance directly (called from socket events)
    const setBalance = (newBalance) => {
        setUser(prev => ({ ...prev, balance: newBalance }));
    };

    const value = {
        user,
        loading,
        register,
        login,
        logout,
        updateBalance,
        setBalance,
        isAuthenticated: !!user,
        isAdmin: user?.isAdmin || user?.isSuperAdmin || false,
        isSuperAdmin: user?.isSuperAdmin || false
    };

    return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

