import React, { useState, useContext } from 'react';
import Switch from '@mui/material/Switch';
import { SocketContext } from '../../../App';
import WindowLayout from '../WindowLayout/WindowLayout';
import useInput from '../../../hooks/useInput';
import styles from './AddServer.module.css';

const AddServer = () => {
    const socket = useContext(SocketContext);
    const [isPrivate, setIsPrivate] = useState(false);
    const [isIncorrect, setIsIncorrect] = useState(false);
    const [betAmount, setBetAmount] = useState(0);
    const serverName = useInput('');
    const password = useInput('');

    const handleButtonClick = e => {
        e.preventDefault();
        if (!serverName.value) setIsIncorrect(true);
        else
            socket.emit('room:create', {
                name: serverName.value,
                password: password.value,
                private: isPrivate,
                betAmount: Number(betAmount),
                requiresBet: betAmount > 0,
            });
    };

    return (
        <WindowLayout
            title='Host A Server'
            content={
                <form className={styles.formContainer}>
                    <input
                        type='text'
                        placeholder='Server Name'
                        {...serverName}
                        style={{
                            border: isIncorrect ? '1px solid red' : '1px solid white',
                        }}
                    />
                    <div className={styles.privateContainer}>
                        <label>Private</label>
                        <Switch checked={isPrivate} color='primary' onChange={() => setIsPrivate(!isPrivate)} />
                    </div>
                    <input type='text' placeholder='password' disabled={!isPrivate} {...password} />
                    
                    {/* NEW: Bet Amount Selection */}
                    <div className={styles.betContainer}>
                        <label>Bet Amount (per player)</label>
                        <select 
                            value={betAmount} 
                            onChange={(e) => setBetAmount(e.target.value)}
                            className={styles.betSelect}
                        >
                            <option value={0}>🆓 Free Game (No Bet)</option>
                            <option value={1}>💰 $1 per player</option>
                            <option value={5}>💰 $5 per player</option>
                            <option value={10}>💰 $10 per player</option>
                            <option value={20}>💰 $20 per player</option>
                            <option value={50}>💰 $50 per player</option>
                            <option value={100}>💰 $100 per player</option>
                        </select>
                        {betAmount > 0 && (
                            <div className={styles.betWarning}>
                                ⚠️ Players need ${betAmount} balance to join. Winner gets 90%, platform keeps 10%.
                            </div>
                        )}
                    </div>
                    
                    <button onClick={handleButtonClick}>Host</button>
                </form>
            }
        />
    );
};

export default AddServer;
