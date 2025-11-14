import React, { useState, useContext, useEffect } from 'react';
import { SocketContext } from '../../../App';
import useInput from '../../../hooks/useInput';
import useKeyPress from '../../../hooks/useKeyPress';
import styles from './NameInput.module.css';

const NameInput = ({ isRoomPrivate, roomId }) => {
    const socket = useContext(SocketContext);
    const nickname = useInput('');
    const password = useInput('');
    const [isPasswordWrong, setIsPasswordWrong] = useState(false);
    const [error, setError] = useState(null);

    const handleButtonClick = () => {
        setError(null); // Clear previous errors
        socket.emit('player:login', { name: nickname.value, password: password.value, roomId: roomId });
    };

    useKeyPress('Enter', handleButtonClick);

    useEffect(() => {
        socket.on('error:wrongPassword', () => {
            setIsPasswordWrong(true);
            setError('Wrong password!');
        });
        
        // NEW: Handle betting-related errors
        socket.on('error:insufficientBalance', (data) => {
            setError(`Insufficient balance! You need $${data.required} but have $${data.current.toFixed(2)}. Please deposit money in your wallet.`);
        });
        
        socket.on('error:notAuthenticated', (data) => {
            setError('Please login through the wallet system first to play betting games.');
        });
        
        socket.on('error:userNotFound', (data) => {
            setError('User account not found. Please login again through the wallet.');
        });
        
        // Cleanup listeners
        return () => {
            socket.off('error:wrongPassword');
            socket.off('error:insufficientBalance');
            socket.off('error:notAuthenticated');
            socket.off('error:userNotFound');
        };
    }, [socket]);

    return (
        <div className={styles.container} style={{ height: error ? (isRoomPrivate ? '150px' : '120px') : (isRoomPrivate ? '100px' : '50px') }}>
            <input placeholder='Nickname' type='text' {...nickname} />
            {isRoomPrivate ? (
                <input
                    placeholder='Room password'
                    type='text'
                    {...password}
                    style={{ backgroundColor: isPasswordWrong ? 'red' : null }}
                />
            ) : null}
            {error && (
                <div className={styles.errorMessage}>
                    ⚠️ {error}
                </div>
            )}
            <button onClick={handleButtonClick}>JOIN</button>
        </div>
    );
};

export default NameInput;
