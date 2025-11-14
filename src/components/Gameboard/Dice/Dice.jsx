import React, { useContext, useState, useEffect } from 'react';
import { SocketContext } from '../../../App';
import './Dice.css';

const Dice = ({ rolledNumber, nowMoving, playerColor, movingPlayer }) => {
    const socket = useContext(SocketContext);
    const [isRolling, setIsRolling] = useState(false);

    const handleClick = () => {
        if (!nowMoving) return;
        
        setIsRolling(true);
        socket.emit('game:roll');
        
        // Rolling animation duration
        setTimeout(() => {
            setIsRolling(false);
        }, 1200);
    };

    const isCurrentPlayer = movingPlayer === playerColor;
    const hasRolledNumber = rolledNumber !== null && rolledNumber !== undefined;
    const canRollAgain = rolledNumber === 6;
    const canRoll = isCurrentPlayer && nowMoving && (!hasRolledNumber || canRollAgain);

    // Get dice face class based on rolled number
    const getDiceFaceClass = () => {
        if (!hasRolledNumber) return '';
        return `face-${rolledNumber}`;
    };

    return (
        <div className={`dice-section ${canRoll ? 'highlight' : ''} ${playerColor}`} onClick={canRoll ? handleClick : undefined} style={{ cursor: canRoll ? 'pointer' : 'default' }}>
            <div className={`dice ${isRolling ? 'rolling' : getDiceFaceClass()}`}></div>
        </div>
    );
};

export default Dice;

