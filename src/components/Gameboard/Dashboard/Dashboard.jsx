import React, { useContext, useState, useEffect } from 'react';
import { SocketContext, PlayerDataContext } from '../../../App';
import { playDiceRoll } from '../../../utils/soundEffects';
import './Dashboard.css';

const Dashboard = ({ currentTurn, rolledNumber, nowMoving }) => {
    const socket = useContext(SocketContext);
    const context = useContext(PlayerDataContext);
    const [isRolling, setIsRolling] = useState(false);

    const handleClick = (e) => {
        e.preventDefault();
        e.stopPropagation();
        
        // Check if it's the user's turn (either nowMoving is true OR currentTurn matches user's color)
        const isMyTurn = nowMoving || (currentTurn && context.color && currentTurn.toLowerCase() === context.color.toLowerCase());
        
        if (!isMyTurn) {
            console.log('🚫 Not your turn to roll');
            return;
        }
        
        setIsRolling(true);
        socket.emit('game:roll');
        console.log('🎲 Dice rolled!');
        
        // Rolling animation duration - faster
        setTimeout(() => {
            setIsRolling(false);
        }, 600);
    };

    const hasRolledNumber = rolledNumber !== null && rolledNumber !== undefined;
    const canRollAgain = rolledNumber === 6;
    // Allow rolling if: it's your turn AND (no roll yet OR rolled a 6)
    const isMyTurn = nowMoving || (currentTurn && context.color && currentTurn.toLowerCase() === context.color.toLowerCase());
    const canRoll = isMyTurn && (!hasRolledNumber || canRollAgain);

    // Get dice face class based on rolled number
    const getDiceFaceClass = () => {
        if (!hasRolledNumber) return '';
        return `face-${rolledNumber}`;
    };

    // Show rolling animation when dice changes and play sound
    useEffect(() => {
        if (rolledNumber !== null && rolledNumber !== undefined) {
            setIsRolling(false);
            // Play dice roll sound when number is received (works for both user and bot)
            playDiceRoll();
        }
    }, [rolledNumber]);

    // Debug logging
    useEffect(() => {
        console.log('🎲 Dashboard state:', { 
            nowMoving, 
            hasRolledNumber, 
            rolledNumber, 
            canRollAgain, 
            canRoll,
            currentTurn,
            myColor: context.color,
            isMyTurn
        });
    }, [nowMoving, hasRolledNumber, rolledNumber, canRollAgain, canRoll, currentTurn, context.color, isMyTurn]);

    return (
        <div className={`dashboard ${currentTurn || 'blue'}`}>
            <div 
                className={`dice-section ${canRoll ? 'highlight' : ''} ${currentTurn || 'blue'}`} 
                onClick={canRoll ? handleClick : (e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    console.log('🚫 Dice click blocked:', { nowMoving, hasRolledNumber, canRollAgain, canRoll });
                }}
                onTouchEnd={canRoll ? handleClick : (e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    console.log('🚫 Dice touch blocked:', { nowMoving, hasRolledNumber, canRollAgain, canRoll });
                }}
                style={{ 
                    cursor: canRoll ? 'pointer' : 'default',
                    pointerEvents: 'auto',
                    position: 'relative',
                    zIndex: 1000
                }}
            >
                <div className={`dice ${isRolling ? 'rolling' : getDiceFaceClass()}`}></div>
            </div>
        </div>
    );
};

export default Dashboard;

