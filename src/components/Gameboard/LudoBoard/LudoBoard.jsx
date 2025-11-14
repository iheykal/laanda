import React from 'react';
import pawnImages from '../../../constants/pawnImages';
import starIcon from '../../../images/star.png';
import Dice from '../Dice/Dice';
import { mapPositionToCellId, getHomeIndex } from './positionMapper';
import './LudoBoard.css';

/**
 * Ludo Board Component - Direct copy from Ludo-mg structure
 */
const LudoBoard = ({ pawns = [], onPawnClick, highlightedPawns = [], currentTurn, rolledNumber, nowMoving }) => {
  
  // Render pawn elements  
  const renderPawns = (cellId) => {
    const cellPawns = pawns.filter(pawn => {
      const pawnCellId = mapPositionToCellId(pawn);
      
      // Handle home cells specially
      if (pawnCellId.endsWith('-home')) {
        const homeIndex = getHomeIndex(pawns, pawn);
        return `${pawn.color}-home-${homeIndex}` === cellId;
      }
      
      return pawnCellId === cellId;
    });
    
    return cellPawns.map((pawn, index) => {
      // Generate pawn name: use _id as string representation
      const pawnName = `${pawn.color}-${pawn._id}`;
      const isHighlighted = highlightedPawns.includes(pawnName);
      
      return (
        <div
          key={pawn._id || index}
          className={`pawn ${isHighlighted ? 'highlight' : ''}`}
          onClick={() => isHighlighted && onPawnClick && onPawnClick(pawn)}
        >
          <img src={pawnImages[pawn.color]} alt={pawnName} />
        </div>
      );
    });
  };

  return (
    <div className="board">
      {/* Section 1 */}
      <div className="section section-1">
        <div className="private red">
          <div className="cells">
            <div className="cell red-private-1 red">{renderPawns('red-private-1')}</div>
            <div className="cell red-private-2 red">{renderPawns('red-private-2')}</div>
            <div className="cell red-private-3 red">{renderPawns('red-private-3')}</div>
            <div className="cell red-private-4 red">{renderPawns('red-private-4')}</div>
          </div>
        </div>

        <div className="cells">
          <div className="cell out-24">{renderPawns('out-24')}</div>
          <div className="cell out-25">{renderPawns('out-25')}</div>
          <div className="cell out-26">{renderPawns('out-26')}</div>

          <div className="cell out-23">{renderPawns('out-23')}</div>
          <div className="cell green-last-line-1 green">{renderPawns('green-last-line-1')}</div>
          <div className="cell out-27 green">{renderPawns('out-27')}</div>

          <div className="cell out-22 star">{renderPawns('out-22')}</div>
          <div className="cell green-last-line-2 green">{renderPawns('green-last-line-2')}</div>
          <div className="cell out-28">{renderPawns('out-28')}</div>

          <div className="cell out-21">{renderPawns('out-21')}</div>
          <div className="cell green-last-line-3 green">{renderPawns('green-last-line-3')}</div>
          <div className="cell out-29">{renderPawns('out-29')}</div>

          <div className="cell out-20">{renderPawns('out-20')}</div>
          <div className="cell green-last-line-4 green">{renderPawns('green-last-line-4')}</div>
          <div className="cell out-30">{renderPawns('out-30')}</div>

          <div className="cell out-19">{renderPawns('out-19')}</div>
          <div className="cell green-last-line-5 green">{renderPawns('green-last-line-5')}</div>
          <div className="cell out-31">{renderPawns('out-31')}</div>
        </div>

        <div className="private green">
          <div className="cells">
            <div className="cell green-private-1 green">{renderPawns('green-private-1')}</div>
            <div className="cell green-private-2 green">{renderPawns('green-private-2')}</div>
            <div className="cell green-private-3 green">{renderPawns('green-private-3')}</div>
            <div className="cell green-private-4 green">{renderPawns('green-private-4')}</div>
          </div>
        </div>
      </div>

      {/* Section 2 */}
      <div className="section section-2">
        <div className="cells">
          <div className="cell out-13">{renderPawns('out-13')}</div>
          <div className="cell out-14 red">{renderPawns('out-14')}</div>
          <div className="cell out-15">{renderPawns('out-15')}</div>
          <div className="cell out-16">{renderPawns('out-16')}</div>
          <div className="cell out-17">{renderPawns('out-17')}</div>
          <div className="cell out-18">{renderPawns('out-18')}</div>

          <div className="cell out-12">{renderPawns('out-12')}</div>
          <div className="cell red-last-line-1 red">{renderPawns('red-last-line-1')}</div>
          <div className="cell red-last-line-2 red">{renderPawns('red-last-line-2')}</div>
          <div className="cell red-last-line-3 red">{renderPawns('red-last-line-3')}</div>
          <div className="cell red-last-line-4 red">{renderPawns('red-last-line-4')}</div>
          <div className="cell red-last-line-5 red">{renderPawns('red-last-line-5')}</div>

          <div className="cell out-11">{renderPawns('out-11')}</div>
          <div className="cell out-10">{renderPawns('out-10')}</div>
          <div className="cell out-9 star">{renderPawns('out-9')}</div>
          <div className="cell out-8">{renderPawns('out-8')}</div>
          <div className="cell out-7">{renderPawns('out-7')}</div>
          <div className="cell out-6">{renderPawns('out-6')}</div>
        </div>

        <div className="homes">
          <div className="home green">
            <div className="cells">
              <div className="cell green-home-1 green">{renderPawns('green-home-1')}</div>
              <div className="cell green-home-2 green">{renderPawns('green-home-2')}</div>
              <div className="cell green-home-3 green">{renderPawns('green-home-3')}</div>
              <div className="cell green-home-4 green">{renderPawns('green-home-4')}</div>
            </div>
          </div>
          <div className="home yellow">
            <div className="cells">
              <div className="cell yellow-home-1 yellow">{renderPawns('yellow-home-1')}</div>
              <div className="cell yellow-home-2 yellow">{renderPawns('yellow-home-2')}</div>
              <div className="cell yellow-home-3 yellow">{renderPawns('yellow-home-3')}</div>
              <div className="cell yellow-home-4 yellow">{renderPawns('yellow-home-4')}</div>
            </div>
          </div>
          <div className="home blue">
            <div className="cells">
              <div className="cell blue-home-1 blue">{renderPawns('blue-home-1')}</div>
              <div className="cell blue-home-2 blue">{renderPawns('blue-home-2')}</div>
              <div className="cell blue-home-3 blue">{renderPawns('blue-home-3')}</div>
              <div className="cell blue-home-4 blue">{renderPawns('blue-home-4')}</div>
            </div>
          </div>
          <div className="home red">
            <div className="cells">
              <div className="cell red-home-1 red">{renderPawns('red-home-1')}</div>
              <div className="cell red-home-2 red">{renderPawns('red-home-2')}</div>
              <div className="cell red-home-3 red">{renderPawns('red-home-3')}</div>
              <div className="cell red-home-4 red">{renderPawns('red-home-4')}</div>
            </div>
          </div>
        </div>

        <div className="cells">
          <div className="cell out-32">{renderPawns('out-32')}</div>
          <div className="cell out-33">{renderPawns('out-33')}</div>
          <div className="cell out-34">{renderPawns('out-34')}</div>
          <div className="cell out-35 star">{renderPawns('out-35')}</div>
          <div className="cell out-36">{renderPawns('out-36')}</div>
          <div className="cell out-37">{renderPawns('out-37')}</div>

          <div className="cell yellow-last-line-5 yellow">{renderPawns('yellow-last-line-5')}</div>
          <div className="cell yellow-last-line-4 yellow">{renderPawns('yellow-last-line-4')}</div>
          <div className="cell yellow-last-line-3 yellow">{renderPawns('yellow-last-line-3')}</div>
          <div className="cell yellow-last-line-2 yellow">{renderPawns('yellow-last-line-2')}</div>
          <div className="cell yellow-last-line-1 yellow">{renderPawns('yellow-last-line-1')}</div>
          <div className="cell out-38">{renderPawns('out-38')}</div>

          <div className="cell out-44">{renderPawns('out-44')}</div>
          <div className="cell out-43">{renderPawns('out-43')}</div>
          <div className="cell out-42">{renderPawns('out-42')}</div>
          <div className="cell out-41">{renderPawns('out-41')}</div>
          <div className="cell out-40 yellow">{renderPawns('out-40')}</div>
          <div className="cell out-39">{renderPawns('out-39')}</div>
        </div>
      </div>

      {/* Section 3 */}
      <div className="section section-3">
        <div className="private blue">
          <div className="cells">
            <div className="cell blue-private-1 blue">{renderPawns('blue-private-1')}</div>
            <div className="cell blue-private-2 blue">{renderPawns('blue-private-2')}</div>
            <div className="cell blue-private-3 blue">{renderPawns('blue-private-3')}</div>
            <div className="cell blue-private-4 blue">{renderPawns('blue-private-4')}</div>
          </div>
        </div>

        <div className="cells">
          <div className="cell out-5">{renderPawns('out-5')}</div>
          <div className="cell blue-last-line-5 blue">{renderPawns('blue-last-line-5')}</div>
          <div className="cell out-45">{renderPawns('out-45')}</div>

          <div className="cell out-4">{renderPawns('out-4')}</div>
          <div className="cell blue-last-line-4 blue">{renderPawns('blue-last-line-4')}</div>
          <div className="cell out-46">{renderPawns('out-46')}</div>

          <div className="cell out-3">{renderPawns('out-3')}</div>
          <div className="cell blue-last-line-3 blue">{renderPawns('blue-last-line-3')}</div>
          <div className="cell out-47">{renderPawns('out-47')}</div>

          <div className="cell out-2">{renderPawns('out-2')}</div>
          <div className="cell blue-last-line-2 blue">{renderPawns('blue-last-line-2')}</div>
          <div className="cell out-48 star">{renderPawns('out-48')}</div>

          <div className="cell out-1 blue">{renderPawns('out-1')}</div>
          <div className="cell blue-last-line-1 blue">{renderPawns('blue-last-line-1')}</div>
          <div className="cell out-49">{renderPawns('out-49')}</div>

          <div className="cell out-52">{renderPawns('out-52')}</div>
          <div className="cell out-51">{renderPawns('out-51')}</div>
          <div className="cell out-50">{renderPawns('out-50')}</div>
        </div>

        <div className="private yellow">
          <div className="cells">
            <div className="cell yellow-private-1 yellow">{renderPawns('yellow-private-1')}</div>
            <div className="cell yellow-private-2 yellow">{renderPawns('yellow-private-2')}</div>
            <div className="cell yellow-private-3 yellow">{renderPawns('yellow-private-3')}</div>
            <div className="cell yellow-private-4 yellow">{renderPawns('yellow-private-4')}</div>
          </div>
        </div>
      </div>

      {/* Dashboard with Dice */}
      <div className={`dashboard ${currentTurn || 'blue'}`}>
        <div className="player-name">
          <span>{currentTurn ? `${currentTurn.charAt(0).toUpperCase() + currentTurn.slice(1)}'s turn` : "Waiting..."}</span>
        </div>
        <Dice 
          rolledNumber={rolledNumber}
          nowMoving={nowMoving}
          playerColor={currentTurn}
          movingPlayer={currentTurn}
        />
        <div className="dice-value">
          <span>{rolledNumber || '-'}</span>
        </div>
      </div>
    </div>
  );
};

export default LudoBoard;
