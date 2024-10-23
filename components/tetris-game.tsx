'use client'

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"

const CELL_SIZE = 30;
const COLS = 10;
const ROWS = 20;

type Grid = (string | null)[][];
type Piece = {
  shape: number[][];
  color: string;
};

const PIECES: Piece[] = [
  { shape: [[1, 1, 1, 1]], color: 'cyan' },    // I
  { shape: [[1, 1], [1, 1]], color: 'yellow' }, // O
  { shape: [[0, 1, 0], [1, 1, 1]], color: 'purple' }, // T
  { shape: [[0, 1, 1], [1, 1, 0]], color: 'green' }, // S
  { shape: [[1, 1, 0], [0, 1, 1]], color: 'red' }, // Z
  { shape: [[1, 0, 0], [1, 1, 1]], color: 'blue' }, // J
  { shape: [[0, 0, 1], [1, 1, 1]], color: 'orange' } // L
];

export function TetrisGameComponent() {
  const [gameState, setGameState] = useState('title'); // 'title', 'playing', 'gameover', 'settings'
  const [grid, setGrid] = useState<Grid>(() => Array(ROWS).fill(null).map(() => Array(COLS).fill(null)));
  const [currentPiece, setCurrentPiece] = useState<Piece | null>(null);
  const [currentPosition, setCurrentPosition] = useState({ x: 0, y: 0 });
  const [nextPieces, setNextPieces] = useState<Piece[]>([]);
  const [heldPiece, setHeldPiece] = useState<Piece | null>(null);
  const [score, setScore] = useState(0);
  const [level, setLevel] = useState(1);
  const [gameOver, setGameOver] = useState(false);
  const [nextPiecesCount, setNextPiecesCount] = useState(5);
  const [keyBindings, setKeyBindings] = useState({
    moveLeft: 'ArrowLeft',
    moveRight: 'ArrowRight',
    softDrop: 'ArrowDown',
    hardDrop: 'ArrowUp',
    rotateLeft: 'a',
    rotateRight: 'f',
    hold: ' '
  });

  const canvasRef = useRef<HTMLCanvasElement>(null);
  const nextPiecesCanvasRef = useRef<HTMLCanvasElement>(null);
  const heldPieceCanvasRef = useRef<HTMLCanvasElement>(null);
  const backgroundImageRef = useRef<HTMLImageElement | null>(null);

  const createNewPiece = useCallback(() => {
    return PIECES[Math.floor(Math.random() * PIECES.length)];
  }, []);

  const initializeGame = useCallback(() => {
    setGrid(Array(ROWS).fill(null).map(() => Array(COLS).fill(null)));
    setCurrentPiece(createNewPiece());
    setCurrentPosition({ x: Math.floor(COLS / 2) - 1, y: 0 });
    setNextPieces(Array(nextPiecesCount).fill(null).map(() => createNewPiece()));
    setHeldPiece(null);
    setScore(0);
    setLevel(1);
    setGameOver(false);
  }, [createNewPiece, nextPiecesCount]);

  const checkCollision = useCallback((piece: Piece, position: { x: number, y: number }) => {
    for (let y = 0; y < piece.shape.length; y++) {
      for (let x = 0; x < piece.shape[y].length; x++) {
        if (piece.shape[y][x]) {
          const newX = position.x + x;
          const newY = position.y + y;
          if (newX < 0 || newX >= COLS || newY >= ROWS || (newY >= 0 && grid[newY][newX])) {
            return true;
          }
        }
      }
    }
    return false;
  }, [grid]);

  const placePiece = useCallback(() => {
    if (!currentPiece) return;

    const newGrid = [...grid];
    for (let y = 0; y < currentPiece.shape.length; y++) {
      for (let x = 0; x < currentPiece.shape[y].length; x++) {
        if (currentPiece.shape[y][x]) {
          newGrid[currentPosition.y + y][currentPosition.x + x] = currentPiece.color;
        }
      }
    }

    setGrid(newGrid);
    setCurrentPiece(nextPieces[0]);
    setNextPieces([...nextPieces.slice(1), createNewPiece()]);
    setCurrentPosition({ x: Math.floor(COLS / 2) - 1, y: 0 });

    // Check for game over
    if (checkCollision(nextPieces[0], { x: Math.floor(COLS / 2) - 1, y: 0 })) {
      setGameOver(true);
    }

    // Check for completed lines
    const completedLines = newGrid.reduce((acc, row, index) => {
      if (row.every(cell => cell !== null)) {
        acc.push(index);
      }
      return acc;
    }, [] as number[]);

    if (completedLines.length > 0) {
      const newScore = score + [100, 300, 500, 800][completedLines.length - 1];
      setScore(newScore);
      setLevel(Math.floor(newScore / 1000) + 1);

      const updatedGrid = newGrid.filter((_, index) => !completedLines.includes(index));
      const newLines = Array(completedLines.length).fill(null).map(() => Array(COLS).fill(null));
      setGrid([...newLines, ...updatedGrid]);

      // Animate line clear
      animateLineClear(completedLines);
    }
  }, [currentPiece, grid, nextPieces, currentPosition, checkCollision, createNewPiece, score]);

  const moveLeft = useCallback(() => {
    if (currentPiece && !checkCollision(currentPiece, { x: currentPosition.x - 1, y: currentPosition.y })) {
      setCurrentPosition(prev => ({ ...prev, x: prev.x - 1 }));
    }
  }, [currentPiece, currentPosition, checkCollision]);

  const moveRight = useCallback(() => {
    if (currentPiece && !checkCollision(currentPiece, { x: currentPosition.x + 1, y: currentPosition.y })) {
      setCurrentPosition(prev => ({ ...prev, x: prev.x + 1 }));
    }
  }, [currentPiece, currentPosition, checkCollision]);

  const rotateLeft = useCallback(() => {
    if (!currentPiece) return;

    const rotatedPiece: Piece = {
      ...currentPiece,
      shape: currentPiece.shape[0].map((_, index) =>
        currentPiece.shape.map(row => row[row.length - 1 - index])
      )
    };

    if (!checkCollision(rotatedPiece, currentPosition)) {
      setCurrentPiece(rotatedPiece);
    }
  }, [currentPiece, currentPosition, checkCollision]);

  const rotateRight = useCallback(() => {
    if (!currentPiece) return;

    const rotatedPiece: Piece = {
      ...currentPiece,
      shape: currentPiece.shape[0].map((_, index) =>
        currentPiece.shape.map(row => row[index]).reverse()
      )
    };

    if (!checkCollision(rotatedPiece, currentPosition)) {
      setCurrentPiece(rotatedPiece);
    }
  }, [currentPiece, currentPosition, checkCollision]);

  const softDrop = useCallback(() => {
    if (currentPiece && !checkCollision(currentPiece, { x: currentPosition.x, y: currentPosition.y + 1 })) {
      setCurrentPosition(prev => ({ ...prev, y: prev.y + 1 }));
    } else {
      placePiece();
    }
  }, [currentPiece, currentPosition, checkCollision, placePiece]);

  const hardDrop = useCallback(() => {
    if (!currentPiece) return;
    let newY = currentPosition.y;
    while (!checkCollision(currentPiece, { x: currentPosition.x, y: newY + 1 })) {
      newY++;
    }
    setCurrentPosition(prev => ({ ...prev, y: newY }));
    placePiece();
  }, [currentPiece, currentPosition, checkCollision, placePiece]);

  const hold = useCallback(() => {
    if (!currentPiece) return;

    if (heldPiece) {
      setCurrentPiece(heldPiece);
      setHeldPiece(currentPiece);
    } else {
      setHeldPiece(currentPiece);
      setCurrentPiece(nextPieces[0]);
      setNextPieces([...nextPieces.slice(1), createNewPiece()]);
    }
    setCurrentPosition({ x: Math.floor(COLS / 2) - 1, y: 0 });
  }, [currentPiece, heldPiece, nextPieces, createNewPiece]);

  const animateLineClear = useCallback((lines: number[]) => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let alpha = 1;
    const animate = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      drawGrid(ctx);

      ctx.fillStyle = `rgba(255, 255, 255, ${alpha})`;
      lines.forEach(line => {
        ctx.fillRect(0, line * CELL_SIZE, canvas.width, CELL_SIZE);
      });

      alpha -= 0.1;
      if (alpha > 0) {
        requestAnimationFrame(animate);
      }
    };

    animate();
  }, []);

  useEffect(() => {
    if (gameOver) return;

    const gameLoop = setInterval(() => {
      softDrop();
    }, 1000 - (level - 1) * 100);

    return () => clearInterval(gameLoop);
  }, [softDrop, level, gameOver]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (gameState !== 'playing') return;
      switch (e.key) {
        case keyBindings.moveLeft:
          moveLeft();
          break;
        case keyBindings.moveRight:
          moveRight();
          break;
        case keyBindings.softDrop:
          softDrop();
          break;
        case keyBindings.hardDrop:
          hardDrop();
          break;
        case keyBindings.rotateLeft:
          rotateLeft();
          break;
        case keyBindings.rotateRight:
          rotateRight();
          break;
        case keyBindings.hold:
          hold();
          break;
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [gameState, moveLeft, moveRight, softDrop, hardDrop, rotateLeft, rotateRight, hold, keyBindings]);

  useEffect(() => {
    const canvas = canvasRef.current;
    const nextPiecesCanvas = nextPiecesCanvasRef.current;
    const heldPieceCanvas = heldPieceCanvasRef.current;
    if (!canvas || !nextPiecesCanvas || !heldPieceCanvas) return;

    const ctx = canvas.getContext('2d');
    const nextPiecesCtx = nextPiecesCanvas.getContext('2d');
    const heldPieceCtx = heldPieceCanvas.getContext('2d');
    if (!ctx || !nextPiecesCtx || !heldPieceCtx) return;

    // Load background image
    if (!backgroundImageRef.current) {
      const img = new Image();
      img.src = '/placeholder.svg?height=600&width=300';
      img.onload = () => {
        backgroundImageRef.current = img;
        redrawCanvas();
      };
    } else {
      redrawCanvas();
    }
    
    function redrawCanvas() {
      if (!canvas || !ctx || !nextPiecesCtx || !heldPieceCtx || !nextPiecesCanvas || !heldPieceCanvas) return;
    
      // キャンバスをクリア
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      nextPiecesCtx.clearRect(0, 0, nextPiecesCanvas.width, nextPiecesCanvas.height);
      heldPieceCtx.clearRect(0, 0, heldPieceCanvas.width, heldPieceCanvas.height);
    
      // 背景を描画
      if (backgroundImageRef.current) {
        ctx.globalAlpha = 0.3;
        ctx.drawImage(backgroundImageRef.current, 0, 0, canvas.width, canvas.height);
        ctx.globalAlpha = 1;
      }
  
      // メイングリッドを描画
      drawGrid(ctx);
  
      // 次のピースを描画
      nextPieces.forEach((piece, index) => {
        drawPiece(nextPiecesCtx, piece, { x: 0, y: index * 4 });
      });
  
      // ホールドされたピースを描画
      if (heldPiece) {
        drawPiece(heldPieceCtx, heldPiece, { x: 0, y: 0 });
      }
  
      // 現在のピースを描画
      if (currentPiece) {
        drawPiece(ctx, currentPiece, currentPosition);
      }
    }
  
    redrawCanvas();
  }, [grid, currentPiece, currentPosition, nextPieces, heldPiece]);

  const drawGrid = (ctx: CanvasRenderingContext2D) => {
    grid.forEach((row, y) => {
      row.forEach((cell, x) => {
        
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.2)';
        ctx.strokeRect(x * CELL_SIZE, y * CELL_SIZE, CELL_SIZE, CELL_SIZE);
        if (cell) {
          ctx.fillStyle = cell;
          ctx.fillRect(x * CELL_SIZE, y * CELL_SIZE, CELL_SIZE, CELL_SIZE);
          ctx.strokeStyle = 'rgba(0, 0, 0, 0.3)';
          ctx.strokeRect(x * CELL_SIZE, y * CELL_SIZE, CELL_SIZE, CELL_SIZE);
        }
      });
    });
  };

  const drawPiece = (ctx: CanvasRenderingContext2D, piece: Piece, position: { x: number, y: number }) => {
    ctx.fillStyle = piece.color;
    piece.shape.forEach((row, y) => {
      row.forEach((cell, x) => {
        if (cell) {
          ctx.fillRect((position.x + x) * CELL_SIZE, (position.y + y) * CELL_SIZE, CELL_SIZE, CELL_SIZE);
          ctx.strokeStyle = 'rgba(0, 0, 0, 0.3)';
          ctx.strokeRect((position.x + x) * CELL_SIZE, (position.y + y) * CELL_SIZE, CELL_SIZE, CELL_SIZE);
        }
      });
    });
  };

  const renderTitleScreen = () => (
    <div className="flex flex-col items-center justify-center h-full">
      <h1 className="text-4xl font-bold mb-8">Tetris Game</h1>
      <Button onClick={() => { initializeGame(); setGameState('playing'); }}>Start Game</Button>
      <Button onClick={() => setGameState('settings')} className="mt-4">Settings</Button>
    </div>
  );

  const renderGameScreen = () => (
    <div className="flex items-start justify-center">
      <div className="mr-8">
        <canvas
          ref={canvasRef}
          width={COLS * CELL_SIZE}
          height={ROWS * CELL_SIZE}
          className="border-2 border-gray-400"
        />
      </div>
      <div>
        <div className="mb-4">
          <h2 className="text-xl font-bold mb-2">Next Pieces</h2>
          <canvas
            ref={nextPiecesCanvasRef}
            width={4 * CELL_SIZE}
            height={nextPiecesCount * 4 * CELL_SIZE}
            className="border-2 border-gray-400"
          />
        </div>
        <div className="mb-4">
          <h2 className="text-xl font-bold mb-2">Hold</h2>
          <canvas
            ref={heldPieceCanvasRef}
            width={4 * CELL_SIZE}
            height={4 * CELL_SIZE}
            className="border-2 border-gray-400"
          />
        </div>
        <div>
          <h2 className="text-xl font-bold">Score: {score}</h2>
          <h2 className="text-xl font-bold">Level: {level}</h2>
        </div>
      </div>
    </div>
  );

  const renderGameOverScreen = () => (
    <div className="flex flex-col items-center justify-center h-full">
      <h1 className="text-4xl font-bold mb-8">Game Over</h1>
      <h2 className="text-2xl mb-4">Score: {score}</h2>
      <Button onClick={() => { initializeGame(); setGameState('playing'); }}>Play Again</Button>
      <Button onClick={() => setGameState('title')} className="mt-4">Back to Title</Button>
    </div>
  );

  const renderSettingsScreen = () => (
    <div className="flex flex-col items-center justify-center h-full">
      <h1 className="text-4xl font-bold mb-8">Settings</h1>
      <div className="w-64 mb-4">
        <Label htmlFor="nextPiecesCount">Next Pieces Count</Label>
        <Select
          value={nextPiecesCount.toString()}
          onValueChange={(value) => setNextPiecesCount(parseInt(value))}
        >
          <SelectTrigger id="nextPiecesCount">
            <SelectValue placeholder="Select next pieces count" />
          </SelectTrigger>
          <SelectContent>
            {[1, 2, 3, 4, 5].map((count) => (
              <SelectItem key={count} value={count.toString()}>
                {count}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      {Object.entries(keyBindings).map(([action, key]) => (
        <div key={action} className="mb-4">
          <Label htmlFor={action}>{action}</Label>
          <Input
            id={action}
            type="text"
            value={key}
            onChange={(e) => setKeyBindings(prev => ({ ...prev, [action]: e.target.value }))}
          />
        </div>
      ))}
      <Button onClick={() => setGameState('title')} className="mt-4">Back to Title</Button>
    </div>
  );

  return (
    <div className="h-screen flex items-center justify-center bg-gray-100">
      {gameState === 'title' && renderTitleScreen()}
      {gameState === 'playing' && renderGameScreen()}
      {gameState === 'gameover' && renderGameOverScreen()}
      {gameState === 'settings' && renderSettingsScreen()}
    </div>
  );
}
