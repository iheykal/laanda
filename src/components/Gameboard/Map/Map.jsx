import React, { useEffect, useRef, useState, useContext } from 'react';
import { PlayerDataContext, SocketContext } from '../../../App';

import mapImage from '../../../images/map.jpg';
import positionMapCoords from '../positions';
import pawnImages from '../../../constants/pawnImages';
import canPawnMove from './canPawnMove';
import getPositionAfterMove from './getPositionAfterMove';

const Map = ({ pawns, nowMoving, rolledNumber, selectedRoll, movingPlayer }) => {
    const player = useContext(PlayerDataContext);
    const socket = useContext(SocketContext);
    const canvasRef = useRef(null);
    const animationFrameRef = useRef(null);
    const animationStartTime = useRef(Date.now());
    const prevMovingPlayerRef = useRef(null);

    const [hintPawn, setHintPawn] = useState();
    const [hoveredPawn, setHoveredPawn] = useState(null);
    const [pressedPawn, setPressedPawn] = useState(null);
    const [clickAnimation, setClickAnimation] = useState(null);

    const getCoordinatesFromEvent = (event) => {
        const canvas = canvasRef.current;
        const rect = canvas.getBoundingClientRect();
        const scaleX = canvas.width / rect.width;
        const scaleY = canvas.height / rect.height;
        
        let clientX, clientY;
        if (event.touches && event.touches.length > 0) {
            clientX = event.touches[0].clientX;
            clientY = event.touches[0].clientY;
        } else if (event.changedTouches && event.changedTouches.length > 0) {
            clientX = event.changedTouches[0].clientX;
            clientY = event.changedTouches[0].clientY;
        } else {
            clientX = event.clientX;
            clientY = event.clientY;
        }
        
        return {
            x: (clientX - rect.left) * scaleX,
            y: (clientY - rect.top) * scaleY
        };
    };

    const handleCanvasClick = event => {
        const canvas = canvasRef.current;
        const ctx = canvas.getContext('2d');
        const { x: cursorX, y: cursorY } = getCoordinatesFromEvent(event);
        
        for (const pawn of pawns) {
            if (pawn.touchableArea && ctx.isPointInPath(pawn.touchableArea, cursorX, cursorY)) {
                const rollToUse = selectedRoll || rolledNumber;
                if (canPawnMove(pawn, rollToUse)) {
                    // Visual feedback: click animation
                    setClickAnimation({ pawnId: pawn._id, timestamp: Date.now() });
                    
                    // Send pawnId and selected roll number
                    socket.emit('game:move', {
                        pawnId: pawn._id,
                        rollNumber: rollToUse
                    });
                    
                    // Clear animation after short delay
                    setTimeout(() => setClickAnimation(null), 200);
                }
            }
        }
        setHintPawn(null);
        setPressedPawn(null);
    };

    const handleMouseMove = event => {
        const rollToUse = selectedRoll || rolledNumber;
        if (!nowMoving || !rollToUse) {
            setHoveredPawn(null);
            return;
        }
        const canvas = canvasRef.current;
        const ctx = canvas.getContext('2d');
        const { x, y } = getCoordinatesFromEvent(event);
        
        canvas.style.cursor = 'default';
        let foundHover = false;
        
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
                    if (hintPawn && hintPawn.id === pawn._id && hoveredPawn === pawn._id) return;
                    setHoveredPawn(pawn._id);
                    setHintPawn({ id: pawn._id, position: pawnPosition, color: 'grey' });
                    foundHover = true;
                    break;
                }
            }
        }
        
        if (!foundHover) {
            setHoveredPawn(null);
            setHintPawn(null);
        }
    };

    useEffect(() => {
        const canvas = canvasRef.current;
        if (!canvas) return;
        
        const ctx = canvas.getContext('2d');
        const mapImg = new Image();
        const pawnImgs = {};
        
        // Preload all pawn images
        const loadPawnImages = () => {
            return Promise.all(
                Object.entries(pawnImages).map(([color, src]) => {
                    return new Promise((resolve) => {
                        const img = new Image();
                        img.src = src;
                        img.onload = () => {
                            pawnImgs[color] = img;
                            resolve();
                        };
                        img.onerror = resolve; // Continue even if image fails
                    });
                })
            );
        };
        
        let animationRunning = true;
        
        // Reset animation when moving player changes
        if (prevMovingPlayerRef.current !== movingPlayer) {
            animationStartTime.current = Date.now();
            prevMovingPlayerRef.current = movingPlayer;
        }
        
        // Calculate movable pawns for the current player
        const calculateMovablePawns = () => {
            if (!movingPlayer) return [];
            const rollToUse = selectedRoll || rolledNumber;
            if (!rollToUse) return [];
            
            return pawns.filter(pawn => 
                pawn.color === movingPlayer && canPawnMove(pawn, rollToUse)
            );
        };
        
        const render = () => {
            if (!animationRunning || !canvas) return;
            
            // Calculate animation states
            const clickAnimTime = clickAnimation ? (Date.now() - clickAnimation.timestamp) : 0;
            const clickAnimProgress = Math.min(clickAnimTime / 200, 1);
            const clickScale = clickAnimProgress > 0 ? 1 + (0.2 * (1 - clickAnimProgress)) : 1;
            
            // Calculate ring animation (pulsing effect)
            const currentTime = Date.now();
            const ringAnimationTime = (currentTime - animationStartTime.current) % 2000; // 2 second cycle
            const ringPulse = Math.sin((ringAnimationTime / 2000) * Math.PI * 2) * 0.3 + 0.7; // 0.4 to 1.0
            
            // Get movable pawns for current player
            const movablePawns = calculateMovablePawns();
            const movableCount = movablePawns.length;
            
            // Clear canvas
            ctx.clearRect(0, 0, canvas.width, canvas.height);
            
            // Draw map
            if (mapImg.complete) {
                ctx.drawImage(mapImg, 0, 0);
            }
            
            // Draw animated ring around movable pawns if it's someone's turn and there's a roll
            if (movingPlayer && (selectedRoll || rolledNumber) && movableCount > 0) {
                movablePawns.forEach(pawn => {
                    const { x, y } = positionMapCoords[pawn.position];
                    
                    // Draw pulsing ring
                    ctx.save();
                    const ringRadius = 30 + (ringPulse * 10); // 30-40px radius
                    const ringOpacity = 0.4 + (ringPulse * 0.3); // 0.4-0.7 opacity
                    
                    // Create gradient for the ring
                    const gradient = ctx.createRadialGradient(x, y, 25, x, y, ringRadius);
                    const colorMap = {
                        'red': 'rgba(255, 0, 0, ',
                        'blue': 'rgba(0, 0, 255, ',
                        'green': 'rgba(0, 255, 0, ',
                        'yellow': 'rgba(255, 255, 0, '
                    };
                    const baseColor = colorMap[movingPlayer] || 'rgba(255, 255, 255, ';
                    
                    gradient.addColorStop(0, baseColor + (ringOpacity * 0.8) + ')');
                    gradient.addColorStop(0.5, baseColor + ringOpacity + ')');
                    gradient.addColorStop(1, baseColor + '0)');
                    
                    ctx.strokeStyle = baseColor + ringOpacity + ')';
                    ctx.lineWidth = 3;
                    ctx.beginPath();
                    ctx.arc(x, y, ringRadius, 0, 2 * Math.PI);
                    ctx.stroke();
                    
                    // Draw inner glow
                    ctx.fillStyle = gradient;
                    ctx.beginPath();
                    ctx.arc(x, y, ringRadius, 0, 2 * Math.PI);
                    ctx.fill();
                    ctx.restore();
                });
                
                // Draw count indicator on the first movable pawn
                if (movablePawns.length > 0) {
                    const firstPawn = movablePawns[0];
                    const { x, y } = positionMapCoords[firstPawn.position];
                    
                    ctx.save();
                    // Draw background circle for count
                    ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
                    ctx.beginPath();
                    ctx.arc(x, y - 45, 18, 0, 2 * Math.PI);
                    ctx.fill();
                    
                    // Draw count text
                    ctx.fillStyle = '#FFFFFF';
                    ctx.font = 'bold 16px Arial';
                    ctx.textAlign = 'center';
                    ctx.textBaseline = 'middle';
                    ctx.fillText(movableCount.toString(), x, y - 45);
                    ctx.restore();
                }
            }
            
            // Draw all pawns
            pawns.forEach((pawn, index) => {
                const isHovered = hoveredPawn === pawn._id;
                const isPressed = pressedPawn === pawn._id;
                const isClickAnim = clickAnimation && clickAnimation.pawnId === pawn._id;
                
                let scale = 1;
                let glow = false;
                
                if (isClickAnim) {
                    scale = clickScale;
                    glow = true;
                } else if (isPressed) {
                    scale = 0.9;
                    glow = true;
                } else if (isHovered) {
                    scale = 1.1;
                    glow = true;
                }
                
                const { x, y } = positionMapCoords[pawn.position];
                const touchableArea = new Path2D();
                touchableArea.arc(x, y, 22, 0, 2 * Math.PI);
                pawns[index].touchableArea = touchableArea;
                
                const size = 35 * scale;
                const offsetX = x - (size / 2);
                const offsetY = y - (30 * scale / 2);
                
                // Draw glow effect
                if (glow) {
                    ctx.save();
                    const gradient = ctx.createRadialGradient(x, y, 0, x, y, 30);
                    gradient.addColorStop(0, `rgba(255, 255, 255, 0.6)`);
                    gradient.addColorStop(0.5, `rgba(255, 255, 255, 0.3)`);
                    gradient.addColorStop(1, `rgba(255, 255, 255, 0)`);
                    ctx.fillStyle = gradient;
                    ctx.beginPath();
                    ctx.arc(x, y, 30, 0, 2 * Math.PI);
                    ctx.fill();
                    ctx.restore();
                }
                
                // Draw pawn with shadow
                ctx.save();
                ctx.shadowColor = 'rgba(0, 0, 0, 0.3)';
                ctx.shadowBlur = glow ? 12 : 6;
                ctx.shadowOffsetX = 2;
                ctx.shadowOffsetY = 2;
                
                const pawnImg = pawnImgs[pawn.color];
                if (pawnImg && pawnImg.complete) {
                    ctx.drawImage(pawnImg, offsetX, offsetY, size, 30 * scale);
                }
                ctx.restore();
            });
            
            // Draw hint pawn
            if (hintPawn) {
                const { x, y } = positionMapCoords[hintPawn.position];
                const hintImg = pawnImgs[hintPawn.color];
                if (hintImg && hintImg.complete) {
                    ctx.save();
                    ctx.globalAlpha = 0.5;
                    ctx.drawImage(hintImg, x - 17, y - 15, 35, 30);
                    ctx.restore();
                }
            }
            
            // Continue animation loop if needed
            if (clickAnimation || hoveredPawn || pressedPawn) {
                animationFrameRef.current = requestAnimationFrame(render);
            }
        };
        
        // Load images and start rendering
        mapImg.src = mapImage;
        mapImg.onload = () => {
            loadPawnImages().then(() => {
                render();
            });
        };
        
        // Initial render
        render();
        
        // Continue animation loop for smooth interactions
        const animate = () => {
            if (animationRunning) {
                render();
                animationFrameRef.current = requestAnimationFrame(animate);
            }
        };
        animationFrameRef.current = requestAnimationFrame(animate);
        
        return () => {
            animationRunning = false;
            if (animationFrameRef.current) {
                cancelAnimationFrame(animationFrameRef.current);
            }
        };
    }, [hintPawn, pawns, hoveredPawn, pressedPawn, clickAnimation, movingPlayer, rolledNumber, selectedRoll]);

    const handleTouchStart = (event) => {
        // Prevent default behavior and scrolling
        event.preventDefault();
        event.stopPropagation();
        
        const canvas = canvasRef.current;
        const ctx = canvas.getContext('2d');
        const { x, y } = getCoordinatesFromEvent(event);
        
        // Find which pawn is being touched for visual feedback
        for (const pawn of pawns) {
            if (pawn.touchableArea && ctx.isPointInPath(pawn.touchableArea, x, y)) {
                const rollToUse = selectedRoll || rolledNumber;
                if (canPawnMove(pawn, rollToUse)) {
                    setPressedPawn(pawn._id);
                    return;
                }
            }
        }
    };

    const handleTouchEnd = (event) => {
        // Prevent default behavior
        event.preventDefault();
        event.stopPropagation();
        
        // If we had a pressed pawn, trigger the click
        if (pressedPawn) {
            const canvas = canvasRef.current;
            const ctx = canvas.getContext('2d');
            const { x, y } = getCoordinatesFromEvent(event);
            
            for (const pawn of pawns) {
                if (pawn._id === pressedPawn && pawn.touchableArea && ctx.isPointInPath(pawn.touchableArea, x, y)) {
                    const rollToUse = selectedRoll || rolledNumber;
                    if (canPawnMove(pawn, rollToUse)) {
                        // Visual feedback: click animation
                        setClickAnimation({ pawnId: pawn._id, timestamp: Date.now() });
                        
                        // Send move
                        socket.emit('game:move', {
                            pawnId: pawn._id,
                            rollNumber: rollToUse
                        });
                        
                        // Clear animation after short delay
                        setTimeout(() => setClickAnimation(null), 200);
                    }
                    break;
                }
            }
        }
        
        setPressedPawn(null);
    };

    const handleTouchCancel = (event) => {
        event.preventDefault();
        setPressedPawn(null);
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
            onTouchCancel={handleTouchCancel}
            onMouseMove={handleMouseMove}
            onMouseLeave={() => {
                setHoveredPawn(null);
                setPressedPawn(null);
            }}
            style={{ 
                touchAction: 'none', 
                userSelect: 'none',
                WebkitTapHighlightColor: 'transparent',
                cursor: hoveredPawn ? 'pointer' : 'default',
                transition: 'cursor 0.1s ease'
            }}
        />
    );
};
export default Map;
