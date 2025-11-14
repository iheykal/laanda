import React, { useEffect, useState, createContext } from 'react';
import { io } from 'socket.io-client';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import ReactLoading from 'react-loading';
import Gameboard from './components/Gameboard/Gameboard';
import LoginPage from './components/LoginPage/LoginPage';
import Register from './components/Auth/Register';
import Login from './components/Auth/Login';
import WalletDashboard from './components/Wallet/WalletDashboard';
import AdminPanel from './components/Admin/AdminPanel';
import ModernDashboard from './components/ModernDashboard/ModernDashboard';
import { AuthProvider, useAuth } from './context/AuthContext';

export const PlayerDataContext = createContext();
export const SocketContext = createContext();

// GameRoute component that handles playerData loading
const GameRoute = ({ playerData, playerSocket, setPlayerData }) => {
    const [localPlayerData, setLocalPlayerData] = useState(playerData);
    const [loading, setLoading] = useState(!playerData);
    const [maxAttempts] = useState(4);
    const attemptsRef = React.useRef(0);
    
    // Update local playerData when prop changes
    useEffect(() => {
        if (playerData) {
            setLocalPlayerData(playerData);
            setLoading(false);
        }
    }, [playerData]);
    
    useEffect(() => {
        // If we already have playerData, we're good
        if (localPlayerData || playerData) {
            setLoading(false);
            return;
        }
        
        // If we don't have playerData, request it from the server
        if (!playerSocket) {
            console.log('⚠️ GameRoute: No socket available');
            return;
        }
        
        console.log('🔄 GameRoute: No playerData, requesting from server...');
        
        // Request room data - backend will send player:data if session has roomId
        playerSocket.emit('room:data');
        
        // Store interval ref in a way that can be accessed by handlePlayerData
        const intervalRef = { current: null };
        
        // Set up listener for player:data
        const handlePlayerData = (data) => {
            try {
                const parsedData = JSON.parse(data);
                console.log('📥 GameRoute received player:data:', parsedData);
                // Update both App.js state and local state
                setPlayerData(parsedData);
                setLocalPlayerData(parsedData);
                setLoading(false);
                attemptsRef.current = 0; // Reset attempts on success
                // Clear retry interval since we got playerData
                if (intervalRef.current) {
                    clearInterval(intervalRef.current);
                    intervalRef.current = null;
                }
            } catch (error) {
                console.error('Error parsing player:data in GameRoute:', error);
            }
        };
        
        playerSocket.on('player:data', handlePlayerData);
        
        // Retry mechanism - try up to maxAttempts times, checking every 2 seconds
        intervalRef.current = setInterval(() => {
            attemptsRef.current += 1;
            // Check current state before retrying
            if (attemptsRef.current < maxAttempts) {
                console.log(`⏰ GameRoute: Retrying... (attempt ${attemptsRef.current}/${maxAttempts})`);
                playerSocket.emit('room:data');
            } else {
                console.error('❌ GameRoute: Failed to get playerData after', maxAttempts, 'attempts');
                setLoading(false);
                if (intervalRef.current) {
                    clearInterval(intervalRef.current);
                    intervalRef.current = null;
                }
            }
        }, 2000); // Check every 2 seconds - reduced frequency to reduce server load
        
        return () => {
            if (intervalRef.current) {
                clearInterval(intervalRef.current);
                intervalRef.current = null;
            }
            playerSocket.off('player:data', handlePlayerData);
        };
    }, [playerSocket, setPlayerData, maxAttempts, localPlayerData, playerData]); // Include all dependencies
    
    // Show loading while waiting for playerData
    if (loading && !localPlayerData && !playerData) {
        return <ReactLoading type='spinningBubbles' color='white' height={667} width={375} />;
    }
    
    // Use localPlayerData or playerData prop
    const finalPlayerData = localPlayerData || playerData;
    
    // If we have playerData, render game
    if (finalPlayerData) {
        return (
            <PlayerDataContext.Provider value={finalPlayerData}>
                <Gameboard />
            </PlayerDataContext.Provider>
        );
    }
    
    // If no playerData after retries, redirect to login
    return <Navigate to='/login' />;
};

function AppContent() {
    const [playerData, setPlayerData] = useState();
    const [playerSocket, setPlayerSocket] = useState();
    const [redirect, setRedirect] = useState();
    const { isAuthenticated, loading } = useAuth();

    useEffect(() => {
        // Use same protocol as the page (HTTPS in production) and same origin
        const socketUrl = `${window.location.protocol}//${window.location.host}`;
        const socket = io(socketUrl, { withCredentials: true });
        
        socket.on('player:data', data => {
            try {
                data = JSON.parse(data);
                console.log('📥 App.js received player:data:', data);
                setPlayerData(data);
                if (data.roomId != null) {
                    setRedirect(true);
                    console.log('✅ App.js: playerData set, roomId:', data.roomId);
                }
            } catch (error) {
                console.error('Error parsing player:data in App.js:', error);
            }
        });
        
        // Also listen for connection to request player data if we have a session
        socket.on('connect', () => {
            console.log('🔌 Socket connected in App.js');
            // Request player data if we have a session (might happen on reconnect)
            socket.emit('room:data');
        });
        
        setPlayerSocket(socket);
        
        return () => {
            socket.off('player:data');
            socket.off('connect');
        };
    }, []);

    if (loading) {
        return <ReactLoading type='spinningBubbles' color='white' height={667} width={375} />;
    }

    return (
        <SocketContext.Provider value={playerSocket}>
            <Router>
                <Routes>
                    {/* Auth Routes */}
                    <Route
                        path='/auth/register'
                        element={isAuthenticated ? <Navigate to='/dashboard' /> : <Register />}
                    />
                    <Route
                        path='/auth/login'
                        element={isAuthenticated ? <Navigate to='/dashboard' /> : <Login />}
                    />

                    {/* Modern Dashboard Route */}
                    <Route
                        path='/dashboard'
                        element={isAuthenticated ? <ModernDashboard /> : <Navigate to='/auth/login' />}
                    />

                    {/* Wallet Route */}
                    <Route
                        path='/wallet'
                        element={isAuthenticated ? <WalletDashboard /> : <Navigate to='/auth/login' />}
                    />

                    {/* Admin Route - TEST MODE allows direct access */}
                    <Route
                        path='/admin'
                        element={<AdminPanel />}
                    />

                    {/* Original Game Routes */}
                    <Route
                        exact
                        path='/'
                        element={
                            isAuthenticated ? (
                                <Navigate to='/dashboard' />
                            ) : (
                                <Navigate to='/auth/login' />
                            )
                        }
                    />
                    <Route
                        path='/login'
                        element={
                            redirect ? (
                                <Navigate to='/game' />
                            ) : playerSocket ? (
                                <LoginPage />
                            ) : (
                                <ReactLoading type='spinningBubbles' color='white' height={667} width={375} />
                            )
                            }
                    />
                    <Route
                        path='/game'
                        element={
                            <GameRoute 
                                playerData={playerData} 
                                playerSocket={playerSocket}
                                setPlayerData={setPlayerData}
                            />
                        }
                    />
                </Routes>
            </Router>
        </SocketContext.Provider>
    );
}

function App() {
    return (
        <AuthProvider>
            <AppContent />
        </AuthProvider>
    );
}

export default App;
