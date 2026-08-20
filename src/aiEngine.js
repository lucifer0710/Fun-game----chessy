/**
 * AIEngine - Minimax algorithm with Alpha-Beta pruning and Piece-Square Tables.
 * Provides 3 difficulty settings: Easy (Depth 1/Random), Medium (Depth 2), Hard (Depth 3+).
 */

import { PIECE_VALUES } from './chessEngine.js';

// Piece Square Tables for White (Flip rows for Black)
const PAWN_PST = [
  [ 0,  0,  0,  0,  0,  0,  0,  0],
  [50, 50, 50, 50, 50, 50, 50, 50],
  [10, 10, 20, 30, 30, 20, 10, 10],
  [ 5,  5, 10, 25, 25, 10,  5,  5],
  [ 0,  0,  0, 20, 20,  0,  0,  0],
  [ 5, -5,-10,  0,  0,-10, -5,  5],
  [ 5, 10, 10,-20,-20, 10, 10,  5],
  [ 0,  0,  0,  0,  0,  0,  0,  0]
];

const KNIGHT_PST = [
  [-50,-40,-30,-30,-30,-30,-40,-50],
  [-40,-20,  0,  0,  0,  0,-20,-40],
  [-30,  0, 10, 15, 15, 10,  0,-30],
  [-30,  5, 15, 20, 20, 15,  5,-30],
  [-30,  0, 15, 20, 20, 15,  0,-30],
  [-30,  5, 10, 15, 15, 10,  5,-30],
  [-40,-20,  0,  5,  5,  0,-20,-40],
  [-50,-40,-30,-30,-30,-30,-40,-50]
];

const BISHOP_PST = [
  [-20,-10,-10,-10,-10,-10,-10,-20],
  [-10,  0,  0,  0,  0,  0,  0,-10],
  [-10,  0,  5, 10, 10,  5,  0,-10],
  [-10,  5,  5, 10, 10,  5,  5,-10],
  [-10,  0, 10, 10, 10, 10,  0,-10],
  [-10, 10, 10, 10, 10, 10, 10,-10],
  [-10,  5,  0,  0,  0,  0,  5,-10],
  [-20,-10,-10,-10,-10,-10,-10,-20]
];

const ROOK_PST = [
  [ 0,  0,  0,  0,  0,  0,  0,  0],
  [ 5, 10, 10, 10, 10, 10, 10,  5],
  [-5,  0,  0,  0,  0,  0,  0, -5],
  [-5,  0,  0,  0,  0,  0,  0, -5],
  [-5,  0,  0,  0,  0,  0,  0, -5],
  [-5,  0,  0,  0,  0,  0,  0, -5],
  [-5,  0,  0,  0,  0,  0,  0, -5],
  [ 0,  0,  0,  5,  5,  0,  0,  0]
];

const QUEEN_PST = [
  [-20,-10,-10, -5, -5,-10,-10,-20],
  [-10,  0,  0,  0,  0,  0,  0,-10],
  [-10,  0,  5,  5,  5,  5,  0,-10],
  [ -5,  0,  5,  5,  5,  5,  0, -5],
  [  0,  0,  5,  5,  5,  5,  0, -5],
  [-10,  5,  5,  5,  5,  5,  0,-10],
  [-10,  0,  5,  0,  0,  0,  0,-10],
  [-20,-10,-10, -5, -5,-10,-10,-20]
];

const KING_PST = [
  [-30,-40,-40,-50,-50,-40,-40,-30],
  [-30,-40,-40,-50,-50,-40,-40,-30],
  [-30,-40,-40,-50,-50,-40,-40,-30],
  [-30,-40,-40,-50,-50,-40,-40,-30],
  [-20,-30,-30,-40,-40,-30,-30,-20],
  [-10,-20,-20,-20,-20,-20,-20,-10],
  [ 20, 20,  0,  0,  0,  0, 20, 20],
  [ 20, 30, 10,  0,  0, 10, 30, 20]
];

const PST_MAP = {
  P: PAWN_PST,
  N: KNIGHT_PST,
  B: BISHOP_PST,
  R: ROOK_PST,
  Q: QUEEN_PST,
  K: KING_PST
};

export class AIEngine {
  constructor(difficulty = 'medium') {
    this.setDifficulty(difficulty);
  }

  setDifficulty(difficulty) {
    this.difficulty = difficulty;
    if (difficulty === 'easy') this.depth = 1;
    else if (difficulty === 'medium') this.depth = 2;
    else if (difficulty === 'hard') this.depth = 3;
    else this.depth = 2;
  }

  evaluateBoard(engine) {
    let score = 0;
    const board = engine.board;

    for (let r = 0; r < 8; r++) {
      for (let c = 0; c < 8; c++) {
        const piece = board[r][c];
        if (piece) {
          const color = piece[0];
          const type = piece[1];
          const baseValue = PIECE_VALUES[type];

          // PST Lookup
          const pst = PST_MAP[type];
          const pstRow = color === 'w' ? r : 7 - r; // Flip PST row for Black
          const pstValue = pst ? pst[pstRow][c] : 0;

          const totalPieceScore = baseValue + pstValue;

          if (color === 'w') {
            score += totalPieceScore;
          } else {
            score -= totalPieceScore;
          }
        }
      }
    }

    return score;
  }

  getBestMove(engine) {
    const aiColor = engine.turn;
    const legalMoves = engine.getAllLegalMoves(aiColor);

    if (legalMoves.length === 0) return null;

    if (this.difficulty === 'easy') {
      // 30% chance of random move, else depth 1 best move
      if (Math.random() < 0.3) {
        return legalMoves[Math.floor(Math.random() * legalMoves.length)];
      }
    }

    // Sort moves for better alpha-beta pruning (captures first)
    legalMoves.sort((a, b) => {
      const valA = a.captured ? PIECE_VALUES[a.captured[1]] : 0;
      const valB = b.captured ? PIECE_VALUES[b.captured[1]] : 0;
      return valB - valA;
    });

    let bestMove = null;
    let bestScore = aiColor === 'w' ? -Infinity : Infinity;
    let alpha = -Infinity;
    let beta = Infinity;

    for (const move of legalMoves) {
      engine.makeMove(move.from, move.to, move.flags.promoPiece ? move.flags.promoPiece[1] : 'Q');
      
      const score = this.minimax(engine, this.depth - 1, alpha, beta, aiColor !== 'w');

      engine.undoMove();

      if (aiColor === 'w') {
        if (score > bestScore) {
          bestScore = score;
          bestMove = move;
        }
        alpha = Math.max(alpha, bestScore);
      } else {
        if (score < bestScore) {
          bestScore = score;
          bestMove = move;
        }
        beta = Math.min(beta, bestScore);
      }

      if (beta <= alpha) break;
    }

    return bestMove || legalMoves[0];
  }

  minimax(engine, depth, alpha, beta, isMaximizing) {
    if (depth === 0 || engine.gameStatus.isCheckmate || engine.gameStatus.isDraw) {
      return this.evaluateBoard(engine);
    }

    const currentTurn = isMaximizing ? 'w' : 'b';
    const legalMoves = engine.getAllLegalMoves(currentTurn);

    if (legalMoves.length === 0) {
      return this.evaluateBoard(engine);
    }

    // Sort captures
    legalMoves.sort((a, b) => {
      const valA = a.captured ? PIECE_VALUES[a.captured[1]] : 0;
      const valB = b.captured ? PIECE_VALUES[b.captured[1]] : 0;
      return valB - valA;
    });

    if (isMaximizing) {
      let maxEval = -Infinity;
      for (const move of legalMoves) {
        engine.makeMove(move.from, move.to, move.flags.promoPiece ? move.flags.promoPiece[1] : 'Q');
        const evaluation = this.minimax(engine, depth - 1, alpha, beta, false);
        engine.undoMove();

        maxEval = Math.max(maxEval, evaluation);
        alpha = Math.max(alpha, evaluation);
        if (beta <= alpha) break;
      }
      return maxEval;
    } else {
      let minEval = Infinity;
      for (const move of legalMoves) {
        engine.makeMove(move.from, move.to, move.flags.promoPiece ? move.flags.promoPiece[1] : 'Q');
        const evaluation = this.minimax(engine, depth - 1, alpha, beta, true);
        engine.undoMove();

        minEval = Math.min(minEval, evaluation);
        beta = Math.min(beta, evaluation);
        if (beta <= alpha) break;
      }
      return minEval;
    }
  }
}
