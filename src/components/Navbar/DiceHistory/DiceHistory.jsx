import React from 'react';
import styles from './DiceHistory.module.css';

const DiceHistory = ({ rollHistory, onSelectRoll, selectedRoll }) => {
    if (!rollHistory || rollHistory.length === 0) return null;

    return (
        <div className={styles.container}>
            <div className={styles.label}>Choose Roll:</div>
            <div className={styles.diceList}>
                {rollHistory.map((roll, index) => (
                    <div
                        key={index}
                        className={`${styles.diceItem} ${selectedRoll === roll ? styles.selected : ''}`}
                        onClick={() => onSelectRoll(roll)}
                        title={`Use roll: ${roll}`}
                    >
                        <div className={styles.diceNumber}>{roll}</div>
                    </div>
                ))}
            </div>
        </div>
    );
};

export default DiceHistory;

