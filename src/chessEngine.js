/**
 * ChessEngine - Complete chess rule engine supporting:
 * - Strict vs Unrestricted Legal Move Guard toggle
 * - King Capture / Death detection with victory popup trigger
 * - En Passant, Castling, Pawn Promotion
 * - Check, Checkmate, and Stalemate detection
 * - FEN Import / Export
 */

export const INITIAL_BOARD = [
  ['bR', 'bN', 'bB', 'bQ', 'bK', 'bB', 'bN', 'bR'],
  ['bP', 'bP', 'bP', 'bP', 'bP', 'bP', 'bP', 'bP'],
  [null, null, null, null, null, null, null, null],
  [null, null, null, null, null, null, null, null],
  [null, null, null, null, null, null, null, null],
  [null, null, null, null, null, null, null, null],
  ['wP', 'wP', 'wP', 'wP', 'wP', 'wP', 'wP', 'wP'],
  ['wR', 'wN', 'wB', 'wQ', 'wK', 'wB', 'wN', 'wR']
];

export const PIECE_VALUES = {
  P: 100,
  N: 320,
  B: 330,
  R: 500,
  Q: 900,
  K: 20000
};

export class ChessEngine {
  constructor() {
    this.strictLegalMoves = true; // Default ON: Enforces King safety
    this.reset();
  }

  reset() {
    this.board = INITIAL_BOARD.map(row => [...row]);
    this.turn = 'w';
    this.castlingRights = {
      w: { k: true, q: true },
      b: { k: true, q: true }
    };
    this.enPassantTarget = null; // { row, col }
    this.halfMoveClock = 0;
    this.fullMoveNumber = 1;
    this.capturedPieces = { w: [], b: [] };
    this.moveHistory = [];
    this.redoStack = [];
    this.gameStatus = {
      inCheck: false,
      isCheckmate: false,
      isStalemate: false,
      isDraw: false,
      isKingCaptured: false,
      winner: null
    };
    this.updateGameStatus();
  }

  toggleStrictLegalMoves() {
    this.strictLegalMoves = !this.strictLegalMoves;
    return this.strictLegalMoves;
  }

  cloneBoard(board = this.board) {
    return board.map(row => [...row]);
  }

  getPieceColor(piece) {
    if (!piece) return null;
    return piece[0];
  }

  getPieceType(piece) {
    if (!piece) return null;
    return piece[1];
  }

  isInBounds(row, col) {
    return row >= 0 && row < 8 && col >= 0 && col < 8;
  }

  findKing(color, board = this.board) {
    const targetKing = color + 'K';
    for (let r = 0; r < 8; r++) {
      for (let c = 0; c < 8; c++) {
        if (board[r][c] === targetKing) {
          return { row: r, col: c };
        }
      }
    }
    return null;
  }

  isSquareAttacked(row, col, attackerColor, board = this.board) {
    // 1. Pawn attacks
    const pawnDir = attackerColor === 'w' ? 1 : -1;
    const pawnRow = row + pawnDir;
    if (pawnRow >= 0 && pawnRow < 8) {
      if (col - 1 >= 0 && board[pawnRow][col - 1] === attackerColor + 'P') return true;
      if (col + 1 < 8 && board[pawnRow][col + 1] === attackerColor + 'P') return true;
    }

    // 2. Knight attacks
    const knightMoves = [
      [-2, -1], [-2, 1], [-1, -2], [-1, 2],
      [1, -2], [1, 2], [2, -1], [2, 1]
    ];
    for (const [dr, dc] of knightMoves) {
      const r = row + dr;
      const c = col + dc;
      if (this.isInBounds(r, c) && board[r][c] === attackerColor + 'N') return true;
    }

    // 3. King attacks
    const kingMoves = [
      [-1, -1], [-1, 0], [-1, 1],
      [0, -1],           [0, 1],
      [1, -1],  [1, 0],  [1, 1]
    ];
    for (const [dr, dc] of kingMoves) {
      const r = row + dr;
      const c = col + dc;
      if (this.isInBounds(r, c) && board[r][c] === attackerColor + 'K') return true;
    }

    // 4. Sliding pieces
    const straightDirs = [[-1, 0], [1, 0], [0, -1], [0, 1]];
    const diagDirs = [[-1, -1], [-1, 1], [1, -1], [1, 1]];

    for (const [dr, dc] of straightDirs) {
      let r = row + dr;
      let c = col + dc;
      while (this.isInBounds(r, c)) {
        const piece = board[r][c];
        if (piece) {
          if (piece === attackerColor + 'R' || piece === attackerColor + 'Q') return true;
          break;
        }
        r += dr;
        c += dc;
      }
    }

    for (const [dr, dc] of diagDirs) {
      let r = row + dr;
      let c = col + dc;
      while (this.isInBounds(r, c)) {
        const piece = board[r][c];
        if (piece) {
          if (piece === attackerColor + 'B' || piece === attackerColor + 'Q') return true;
          break;
        }
        r += dr;
        c += dc;
      }
    }

    return false;
  }

  isKingInCheck(color, board = this.board) {
    const kingPos = this.findKing(color, board);
    if (!kingPos) return false;
    const opponentColor = color === 'w' ? 'b' : 'w';
    return this.isSquareAttacked(kingPos.row, kingPos.col, opponentColor, board);
  }

  getPseudoMoves(row, col, state = this) {
    const { board, turn, castlingRights, enPassantTarget } = state;
    const piece = board[row][col];
    if (!piece || piece[0] !== turn) return [];

    const type = piece[1];
    const moves = [];
    const color = turn;
    const enemyColor = color === 'w' ? 'b' : 'w';
    const forward = color === 'w' ? -1 : 1;
    const startRank = color === 'w' ? 6 : 1;
    const promoRank = color === 'w' ? 0 : 7;

    const addMove = (tRow, tCol, flags = {}) => {
      moves.push({
        from: { row, col },
        to: { row: tRow, col: tCol },
        piece,
        captured: board[tRow][tCol],
        flags
      });
    };

    if (type === 'P') {
      const fRow = row + forward;
      if (this.isInBounds(fRow, col) && !board[fRow][col]) {
        if (fRow === promoRank) {
          ['Q', 'R', 'B', 'N'].forEach(promo => addMove(fRow, col, { isPromotion: true, promoPiece: color + promo }));
        } else {
          addMove(fRow, col);
        }

        const ffRow = row + 2 * forward;
        if (row === startRank && !board[ffRow][col]) {
          addMove(ffRow, col, { isPawnDouble: true });
        }
      }

      for (const dc of [-1, 1]) {
        const cCol = col + dc;
        if (this.isInBounds(fRow, cCol)) {
          const targetPiece = board[fRow][cCol];
          if (targetPiece && targetPiece[0] === enemyColor) {
            if (fRow === promoRank) {
              ['Q', 'R', 'B', 'N'].forEach(promo => addMove(fRow, cCol, { isPromotion: true, promoPiece: color + promo }));
            } else {
              addMove(fRow, cCol);
            }
          } else if (enPassantTarget && enPassantTarget.row === fRow && enPassantTarget.col === cCol) {
            addMove(fRow, cCol, { isEnPassant: true });
          }
        }
      }
    } else if (type === 'N') {
      const knightOffsets = [
        [-2, -1], [-2, 1], [-1, -2], [-1, 2],
        [1, -2], [1, 2], [2, -1], [2, 1]
      ];
      for (const [dr, dc] of knightOffsets) {
        const r = row + dr;
        const c = col + dc;
        if (this.isInBounds(r, c)) {
          const targetPiece = board[r][c];
          if (!targetPiece || targetPiece[0] === enemyColor) {
            addMove(r, c);
          }
        }
      }
    } else if (type === 'K') {
      const kingOffsets = [
        [-1, -1], [-1, 0], [-1, 1],
        [0, -1],           [0, 1],
        [1, -1],  [1, 0],  [1, 1]
      ];
      for (const [dr, dc] of kingOffsets) {
        const r = row + dr;
        const c = col + dc;
        if (this.isInBounds(r, c)) {
          const targetPiece = board[r][c];
          if (!targetPiece || targetPiece[0] === enemyColor) {
            addMove(r, c);
          }
        }
      }

      // Castling
      if (!this.isKingInCheck(color, board)) {
        const rank = color === 'w' ? 7 : 0;
        if (row === rank && col === 4) {
          if (castlingRights[color].k) {
            if (!board[rank][5] && !board[rank][6] && board[rank][7] === color + 'R') {
              if (!this.isSquareAttacked(rank, 5, enemyColor, board) && !this.isSquareAttacked(rank, 6, enemyColor, board)) {
                addMove(rank, 6, { isCastleKingside: true });
              }
            }
          }
          if (castlingRights[color].q) {
            if (!board[rank][1] && !board[rank][2] && !board[rank][3] && board[rank][0] === color + 'R') {
              if (!this.isSquareAttacked(rank, 2, enemyColor, board) && !this.isSquareAttacked(rank, 3, enemyColor, board)) {
                addMove(rank, 2, { isCastleQueenside: true });
              }
            }
          }
        }
      }
    } else {
      const dirs = [];
      if (type === 'B' || type === 'Q') dirs.push([-1, -1], [-1, 1], [1, -1], [1, 1]);
      if (type === 'R' || type === 'Q') dirs.push([-1, 0], [1, 0], [0, -1], [0, 1]);

      for (const [dr, dc] of dirs) {
        let r = row + dr;
        let c = col + dc;
        while (this.isInBounds(r, c)) {
          const targetPiece = board[r][c];
          if (!targetPiece) {
            addMove(r, c);
          } else {
            if (targetPiece[0] === enemyColor) {
              addMove(r, c);
            }
            break;
          }
          r += dr;
          c += dc;
        }
      }
    }

    return moves;
  }

  getLegalMoves(row, col) {
    const pseudoMoves = this.getPseudoMoves(row, col);

    // If Legal Move Guard is OFF, return all pseudo moves directly
    if (!this.strictLegalMoves) {
      return pseudoMoves;
    }

    const legalMoves = [];
    for (const move of pseudoMoves) {
      if (this.isMoveLegal(move)) {
        legalMoves.push(move);
      }
    }
    return legalMoves;
  }

  isMoveLegal(move) {
    const simBoard = this.cloneBoard();
    const color = move.piece[0];

    simBoard[move.from.row][move.from.col] = null;
    let placedPiece = move.flags.isPromotion ? move.flags.promoPiece : move.piece;
    simBoard[move.to.row][move.to.col] = placedPiece;

    if (move.flags.isEnPassant) {
      const pawnRow = color === 'w' ? move.to.row + 1 : move.to.row - 1;
      simBoard[pawnRow][move.to.col] = null;
    }

    if (move.flags.isCastleKingside) {
      const rank = move.from.row;
      simBoard[rank][7] = null;
      simBoard[rank][5] = color + 'R';
    } else if (move.flags.isCastleQueenside) {
      const rank = move.from.row;
      simBoard[rank][0] = null;
      simBoard[rank][3] = color + 'R';
    }

    return !this.isKingInCheck(color, simBoard);
  }

  getAllLegalMoves(color = this.turn) {
    const allMoves = [];
    for (let r = 0; r < 8; r++) {
      for (let c = 0; c < 8; c++) {
        if (this.board[r][c] && this.board[r][c][0] === color) {
          const moves = this.getLegalMoves(r, c);
          allMoves.push(...moves);
        }
      }
    }
    return allMoves;
  }

  makeMove(from, to, promoPiece = null) {
    const piece = this.board[from.row][from.col];
    if (!piece || piece[0] !== this.turn) return false;

    let legalMoves = this.getLegalMoves(from.row, from.col);
    let chosenMove = legalMoves.find(m => m.to.row === to.row && m.to.col === to.col);

    if (!chosenMove) return false;

    if (promoPiece && promoPiece.length === 1) {
      promoPiece = this.turn + promoPiece;
    }

    if (chosenMove.flags.isPromotion && promoPiece) {
      const specificPromoMove = legalMoves.find(
        m => m.to.row === to.row && m.to.col === to.col && m.flags.promoPiece === promoPiece
      );
      if (specificPromoMove) chosenMove = specificPromoMove;
    }

    const moveRecord = {
      from: { ...from },
      to: { ...to },
      piece,
      captured: chosenMove.captured,
      flags: { ...chosenMove.flags },
      castlingRights: JSON.parse(JSON.stringify(this.castlingRights)),
      enPassantTarget: this.enPassantTarget ? { ...this.enPassantTarget } : null,
      halfMoveClock: this.halfMoveClock,
      fullMoveNumber: this.fullMoveNumber,
      san: ''
    };

    this.board[from.row][from.col] = null;
    let finalPiece = piece;

    if (chosenMove.flags.isPromotion) {
      finalPiece = promoPiece || chosenMove.flags.promoPiece || (this.turn + 'Q');
      moveRecord.flags.promoPiece = finalPiece;
    }

    this.board[to.row][to.col] = finalPiece;

    if (chosenMove.flags.isEnPassant) {
      const enemyPawnRow = this.turn === 'w' ? to.row + 1 : to.row - 1;
      moveRecord.captured = this.board[enemyPawnRow][to.col];
      this.board[enemyPawnRow][to.col] = null;
    }

    if (moveRecord.captured) {
      this.capturedPieces[this.turn].push(moveRecord.captured);
    }

    if (chosenMove.flags.isCastleKingside) {
      const rank = from.row;
      this.board[rank][7] = null;
      this.board[rank][5] = this.turn + 'R';
    } else if (chosenMove.flags.isCastleQueenside) {
      const rank = from.row;
      this.board[rank][0] = null;
      this.board[rank][3] = this.turn + 'R';
    }

    if (chosenMove.flags.isPawnDouble) {
      const epRow = this.turn === 'w' ? from.row - 1 : from.row + 1;
      this.enPassantTarget = { row: epRow, col: from.col };
    } else {
      this.enPassantTarget = null;
    }

    if (piece === 'wK') this.castlingRights.w = { k: false, q: false };
    if (piece === 'bK') this.castlingRights.b = { k: false, q: false };
    if (from.row === 7 && from.col === 0) this.castlingRights.w.q = false;
    if (from.row === 7 && from.col === 7) this.castlingRights.w.k = false;
    if (from.row === 0 && from.col === 0) this.castlingRights.b.q = false;
    if (from.row === 0 && from.col === 7) this.castlingRights.b.k = false;

    if (piece[1] === 'P' || moveRecord.captured) {
      this.halfMoveClock = 0;
    } else {
      this.halfMoveClock++;
    }

    if (this.turn === 'b') {
      this.fullMoveNumber++;
    }

    this.turn = this.turn === 'w' ? 'b' : 'w';
    this.updateGameStatus();

    moveRecord.san = this.formatSAN(chosenMove, moveRecord);
    this.moveHistory.push(moveRecord);
    this.redoStack = [];

    return true;
  }

  undoMove() {
    if (this.moveHistory.length === 0) return false;

    const lastMove = this.moveHistory.pop();
    this.redoStack.push(lastMove);

    this.turn = this.turn === 'w' ? 'b' : 'w';

    const { from, to, piece, captured, flags, castlingRights, enPassantTarget, halfMoveClock, fullMoveNumber } = lastMove;

    this.castlingRights = castlingRights;
    this.enPassantTarget = enPassantTarget;
    this.halfMoveClock = halfMoveClock;
    this.fullMoveNumber = fullMoveNumber;

    this.board[to.row][to.col] = null;
    this.board[from.row][from.col] = piece;

    if (captured) {
      this.capturedPieces[this.turn].pop();
      if (flags.isEnPassant) {
        const enemyPawnRow = this.turn === 'w' ? to.row + 1 : to.row - 1;
        this.board[enemyPawnRow][to.col] = captured;
      } else {
        this.board[to.row][to.col] = captured;
      }
    }

    if (flags.isCastleKingside) {
      const rank = from.row;
      this.board[rank][5] = null;
      this.board[rank][7] = this.turn + 'R';
    } else if (flags.isCastleQueenside) {
      const rank = from.row;
      this.board[rank][3] = null;
      this.board[rank][0] = this.turn + 'R';
    }

    this.updateGameStatus();
    return true;
  }

  updateGameStatus() {
    // Check if either King was captured/died
    const whiteKing = this.findKing('w');
    const blackKing = this.findKing('b');

    if (!whiteKing) {
      this.gameStatus = {
        inCheck: false,
        isCheckmate: false,
        isStalemate: false,
        isDraw: false,
        isKingCaptured: true,
        winner: 'b'
      };
      return;
    }

    if (!blackKing) {
      this.gameStatus = {
        inCheck: false,
        isCheckmate: false,
        isStalemate: false,
        isDraw: false,
        isKingCaptured: true,
        winner: 'w'
      };
      return;
    }

    const opponentColor = this.turn;
    const inCheck = this.isKingInCheck(opponentColor);
    const legalMoves = this.getAllLegalMoves(opponentColor);

    this.gameStatus = {
      inCheck,
      isCheckmate: inCheck && legalMoves.length === 0,
      isStalemate: !inCheck && legalMoves.length === 0,
      isDraw: this.halfMoveClock >= 100 || (!inCheck && legalMoves.length === 0),
      isKingCaptured: false,
      winner: null
    };

    if (this.gameStatus.isCheckmate) {
      this.gameStatus.winner = opponentColor === 'w' ? 'b' : 'w';
    }
  }

  formatSAN(move, moveRecord) {
    if (move.flags.isCastleKingside) return 'O-O';
    if (move.flags.isCastleQueenside) return 'O-O-O';

    const colNames = ['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h'];
    const rowNames = ['8', '7', '6', '5', '4', '3', '2', '1'];

    const pieceType = move.piece[1];
    let san = pieceType === 'P' ? '' : pieceType;

    if (pieceType === 'P' && moveRecord.captured) {
      san += colNames[move.from.col];
    }

    if (moveRecord.captured) {
      san += 'x';
    }

    san += colNames[move.to.col] + rowNames[move.to.row];

    if (move.flags.isPromotion) {
      san += '=' + moveRecord.flags.promoPiece[1];
    }

    if (this.gameStatus.isCheckmate) {
      san += '#';
    } else if (this.gameStatus.inCheck) {
      san += '+';
    }

    return san;
  }

  exportFEN() {
    const colNames = ['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h'];
    const rowNames = ['8', '7', '6', '5', '4', '3', '2', '1'];

    let fen = '';
    for (let r = 0; r < 8; r++) {
      let emptyCount = 0;
      for (let c = 0; c < 8; c++) {
        const piece = this.board[r][c];
        if (!piece) {
          emptyCount++;
        } else {
          if (emptyCount > 0) {
            fen += emptyCount;
            emptyCount = 0;
          }
          const color = piece[0];
          const type = piece[1];
          fen += color === 'w' ? type.toUpperCase() : type.toLowerCase();
        }
      }
      if (emptyCount > 0) fen += emptyCount;
      if (r < 7) fen += '/';
    }

    fen += ` ${this.turn} `;

    let castling = '';
    if (this.castlingRights.w.k) castling += 'K';
    if (this.castlingRights.w.q) castling += 'Q';
    if (this.castlingRights.b.k) castling += 'k';
    if (this.castlingRights.b.q) castling += 'q';
    fen += (castling || '-') + ' ';

    if (this.enPassantTarget) {
      fen += colNames[this.enPassantTarget.col] + rowNames[this.enPassantTarget.row] + ' ';
    } else {
      fen += '- ';
    }

    fen += `${this.halfMoveClock} ${this.fullMoveNumber}`;
    return fen;
  }
}
