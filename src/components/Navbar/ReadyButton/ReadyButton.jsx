import React, { useState, useContext } from 'react';
import { SocketContext } from '../../../App';
import Switch from '@mui/material/Switch';
import styles from './ReadyButton.module.css';

const ReadyButton = ({ isReady }) => {
    const socket = useContext(SocketContext);
    const [checked, setChecked] = useState(isReady);

    const handleCheckboxChange = () => {
        socket.emit('player:ready');
        setChecked(!checked);
    };
    
    const handleBackToLobby = () => {
        if (window.confirm('Are you sure you want to leave this room?')) {
            socket.emit('player:exit');
        }
    };
    
    return (
        <div className={styles.container}>
            <div className={styles.readySection}>
                <Switch onChange={handleCheckboxChange} checked={checked || false} />
                <label>{checked ? 'I want to play' : 'Im waiting'}</label>
            </div>
            <button 
                className={styles.backButton}
                onClick={handleBackToLobby}
                title="Leave room and go back to lobby"
            >
                ← Back to Lobby
            </button>
        </div>
    );
};

export default ReadyButton;
