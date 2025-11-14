import React, { useEffect, useRef, useState, useContext } from 'react';
import { PlayerDataContext, SocketContext } from '../../../App';

import mapImage from '../../../images/map.jpg';
import positionMapCoords from '../positions';
import pawnImages from '../../../constants/pawnImages';
import canPawnMove from './canPawnMove';
import getPositionAfterMove from './getPositionAfterMove';

const Map = ({ pawns, nowMoving, rolledNumber, selectedRoll }) => {
    const player = useContext(PlayerDataContext);
    const socket = useContext(SocketContext);
    const canvasRef = useRef(null);

    const [hintPawn, setHintPawn] = useState();

    const paintPawn = (context, pawn) => {
        const { x, y } = positionMapCoords[pawn.position];
        const touchableArea = new Path2D();
        // Larger touch area for better mobile responsiveness (18 instead of 12)
        touchableArea.arc(x, y, 18, 0, 2 * Math.PI);
        const image = new Image();
        image.src = pawnImages[pawn.color];
        image.onload = function () {
            context.drawImage(image, x - 17, y - 15, 35, 30);
        };
        return touchableArea;
    };

    const handleCanvasClick = event => {
        const canvas = canvasRef.current;
        const ctx = canvas.getContext('2d');
        const rect = canvas.getBoundingClientRect();
        
        // Calculate scale factor for mobile
        const scaleX = canvas.width / rect.width;
        const scaleY = canvas.height / rect.height;
        
        // Scale touch coordinates to match canvas coordinate space
        const cursorX = (event.clientX - rect.left) * scaleX;
        const cursorY = (event.clientY - rect.top) * scaleY;
        
        for (const pawn of pawns) {
            if (pawn.touchableArea && ctx.isPointInPath(pawn.touchableArea, cursorX, cursorY)) {
                const rollToUse = selectedRoll || rolledNumber;
                if (canPawnMove(pawn, rollToUse)) {
                    // Send pawnId and selected roll number - validate with same roll being sent
                    socket.emit('game:move', {
                        pawnId: pawn._id,
                        rollNumber: rollToUse
                    });
                }
            }
        }
        setHintPawn(null);
    };

    const handleMouseMove = event => {
        const rollToUse = selectedRoll || rolledNumber;
        if (!nowMoving || !rollToUse) return;
        const canvas = canvasRef.current;
        const ctx = canvas.getContext('2d');
        const rect = canvas.getBoundingClientRect();
        
        // Calculate scale factor
        const scaleX = canvas.width / rect.width;
        const scaleY = canvas.height / rect.height;
        
        const x = (event.clientX - rect.left) * scaleX;
        const y = (event.clientY - rect.top) * scaleY;
        
        canvas.style.cursor = 'default';
        for (const pawn of pawns) {
            if (
                pawn.touchableArea &&
                ctx.isPointInPath(pawn.touchableArea, x, y) &&
                player.color === pawn.color &&
                canPawnMove(pawn, rollToUse)
            ) {
                const pawnPosition = getPositionAfterMove(pawn, rollToUse);
                if (pawnPosition) {
                    canvas.style.cursor = 'pointer';
                    if (hintPawn && hintPawn.id === pawn._id) return;
                    setHintPawn({ id: pawn._id, position: pawnPosition, color: 'grey' });
                    return;
                }
            }
        }
        setHintPawn(null);
    };

    useEffect(() => {
        const rerenderCanvas = () => {
            const canvas = canvasRef.current;
            const ctx = canvas.getContext('2d');
            const image = new Image();
            image.src = mapImage;
            image.onload = function () {
                ctx.drawImage(image, 0, 0);
                pawns.forEach((pawn, index) => {
                    pawns[index].touchableArea = paintPawn(ctx, pawn);
                });
                if (hintPawn) {
                    paintPawn(ctx, hintPawn);
                }
            };
        };
        rerenderCanvas();
    }, [hintPawn, pawns]);

    const handleTouchStart = (event) => {
        // Prevent default behavior and scrolling
        event.preventDefault();
        event.stopPropagation();
        
        // Handle touch immediately for better responsiveness
        const touches = event.touches || event.changedTouches;
        if (touches && touches.length > 0) {
            const touch = touches[0];
            const syntheticEvent = {
                clientX: touch.clientX,
                clientY: touch.clientY
            };
            handleCanvasClick(syntheticEvent);
        }
    };

    const handleTouchEnd = (event) => {
        // Prevent default behavior
        event.preventDefault();
        event.stopPropagation();
    };

    return (
        <canvas
            className='canvas-container'
            width={460}
            height={460}
            ref={canvasRef}
            onClick={handleCanvasClick}
            onTouchStart={handleTouchStart}
            onTouchEnd={handleTouchEnd}
            onMouseMove={handleMouseMove}
            style={{ 
                touchAction: 'none', 
                userSelect: 'none',
                WebkitTapHighlightColor: 'transparent'
            }}
        />
    );
};
export default Map;
