import React, { useContext } from 'react';
import { SocketContext } from '../../../App';
import images from '../../../constants/diceImages';
import styles from './Dice.module.css';

const Dice = ({ rolledNumber, nowMoving, playerColor, movingPlayer, rollHistory }) => {
    const socket = useContext(SocketContext);

    const handleClick = (e) => {
        e.preventDefault();
        e.stopPropagation();
        socket.emit('game:roll');
        console.log('🎲 Dice clicked!');
    };

    const isCurrentPlayer = movingPlayer === playerColor;
    const hasRolledNumber = rolledNumber !== null && rolledNumber !== undefined;
    const canRollAgain = rolledNumber === 6;

    return (
        <div className={styles.container}>
            {isCurrentPlayer ? (
                hasRolledNumber ? (
                    // Show the rolled number (clickable if it's a 6)
                    <img 
                        src={images[rolledNumber - 1]} 
                        alt={rolledNumber}
                        onClick={canRollAgain && nowMoving ? handleClick : undefined}
                        onTouchEnd={canRollAgain && nowMoving ? handleClick : undefined}
                        className={`${styles.dice} ${canRollAgain && nowMoving ? styles.roll : ''}`}
                        style={{ cursor: canRollAgain && nowMoving ? 'pointer' : 'default' }}
                    />
                ) : nowMoving ? (
                    // Show roll button only if no number rolled yet
                    <img 
                        src={images[6]} 
                        className={`${styles.dice} ${styles.roll}`}
                        alt='roll' 
                        onClick={handleClick}
                        onTouchEnd={handleClick}
                    />
                ) : null
            ) : null}
        </div>
    );
};

export default Dice;

