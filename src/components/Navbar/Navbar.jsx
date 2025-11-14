import React from 'react';
import NameContainer from './NameContainer/NameContainer';
import ReadyButton from './ReadyButton/ReadyButton';
import DiceHistory from './DiceHistory/DiceHistory';
import { PLAYER_COLORS } from '../../constants/colors';
import { useContext } from 'react';
import { PlayerDataContext } from '../../App';
import styles from './Navbar.module.css';

const Navbar = ({ players, started, time, isReady, rolledNumber, rollHistory, selectedRoll, onSelectRoll, nowMoving, movingPlayer, ended }) => {
    const context = useContext(PlayerDataContext);

    return (
        <>
            {players.map((player, index) => (
                <div className={`${styles.playerContainer} ${styles[PLAYER_COLORS[index]]}`} key={index}>
                    <NameContainer player={player} time={time} />
                    {context.color === player.color && !started ? <ReadyButton isReady={isReady} /> : null}
                    {/* Show dice history only when player has rolled at least one 6 */}
                    {started && !ended && 
                     nowMoving && 
                     context.color === player.color && 
                     rollHistory && 
                     rollHistory.includes(6) ? (
                        <DiceHistory 
                            rollHistory={rollHistory} 
                            onSelectRoll={onSelectRoll}
                            selectedRoll={selectedRoll}
                        />
                    ) : null}
                </div>
            ))}
        </>
    );
};

export default Navbar;
