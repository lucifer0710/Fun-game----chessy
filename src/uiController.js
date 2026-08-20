/**
 * UIController - Handles DOM rendering, board grid updates, drag-and-drop,
 * view transitions, player names, Guard mode slide switch, King capture popup, mobile drawer, and modals.
 */

import { getPieceDataUrl } from './pieceSvg.js';
import { PIECE_VALUES } from './chessEngine.js';

export class UIController {
  constructor(engine, ai, sound) {
    this.engine = engine;
    this.ai = ai;
    this.sound = sound;

    this.isFlipped = false;
    this.selectedSquare = null; // { row, col }
    this.legalMovesForSelected = [];

    // Custom configuration
    this.gameMode = 'ai';
    this.whiteName = 'Player 1';
    this.blackName = 'AI Opponent';
    this.timerInitial = 600;
    this.timeWhite = 600;
    this.timeBlack = 600;
    this.timerInterval = null;
    this.pendingPromotionMove = null;
    this.confettiAnimId = null;
    this.confettiParticles = [];

    this.bindDOM();
  }

  bindDOM() {
    // Views
    this.viewLanding = document.getElementById('view-landing');
    this.viewGame = document.getElementById('view-game');

    // Buttons
    this.btnStartPlay = document.getElementById('btn-start-play');
    this.btnSound = document.getElementById('btn-sound');
    this.btnFlip = document.getElementById('btn-flip');
    this.btnOpenSetup = document.getElementById('btn-open-setup');
    this.btnNewGame = document.getElementById('btn-new-game');
    this.btnUndo = document.getElementById('btn-undo');
    this.btnMobileUndo = document.getElementById('btn-mobile-undo');
    this.btnCopyFEN = document.getElementById('btn-copy-fen');
    this.btnCopyHistory = document.getElementById('btn-copy-history');
    this.btnRestart = document.getElementById('btn-restart');
    this.btnBackMenu = document.getElementById('btn-back-menu');
    this.btnCancelSetup = document.getElementById('btn-cancel-setup');

    // Slide Switches
    this.toggleGuardInput = document.getElementById('toggle-guard');
    this.drawerToggleGuardInput = document.getElementById('drawer-toggle-guard');

    // Mobile Hamburger & Slide Drawer DOM
    this.btnHamburger = document.getElementById('btn-hamburger');
    this.btnCloseDrawer = document.getElementById('btn-close-drawer');
    this.mobileDrawer = document.getElementById('mobile-drawer');
    this.drawerBackdrop = document.getElementById('drawer-backdrop');

    // Drawer Items
    this.drawerBtnSound = document.getElementById('drawer-btn-sound');
    this.drawerBtnFlip = document.getElementById('drawer-btn-flip');
    this.drawerBtnSetup = document.getElementById('drawer-btn-setup');
    this.drawerBtnReset = document.getElementById('drawer-btn-reset');
    this.drawerBtnMenu = document.getElementById('drawer-btn-menu');

    // Setup Form & Inputs
    this.modalSetup = document.getElementById('modal-setup');
    this.formSetup = document.getElementById('form-setup');
    this.selectMode = document.getElementById('select-mode');
    this.inputWhiteName = document.getElementById('input-white-name');
    this.inputBlackName = document.getElementById('input-black-name');
    this.selectDiff = document.getElementById('select-diff');
    this.selectTime = document.getElementById('select-time');
    this.selectTheme = document.getElementById('select-theme');
    this.groupAIDiff = document.getElementById('group-ai-diff');

    // Board & Player Display
    this.boardEl = document.getElementById('board');
    this.cardWhite = document.getElementById('card-white');
    this.cardBlack = document.getElementById('card-black');
    this.nameWhiteEl = document.getElementById('name-white');
    this.nameBlackEl = document.getElementById('name-black');
    this.avatarWhiteEl = document.getElementById('avatar-white');
    this.avatarBlackEl = document.getElementById('avatar-black');
    this.timerWhiteEl = document.getElementById('timer-white');
    this.timerBlackEl = document.getElementById('timer-black');
    this.capturedWhiteEl = document.getElementById('captured-white');
    this.capturedBlackEl = document.getElementById('captured-black');
    this.historyListEl = document.getElementById('history-list');

    // Modals
    this.modalPromo = document.getElementById('modal-promotion');
    this.promoOptionsEl = document.getElementById('promo-options');
    this.modalGameOver = document.getElementById('modal-gameover');
    this.gameoverTitle = document.getElementById('gameover-title');
    this.gameoverDesc = document.getElementById('gameover-desc');

    // Confetti Canvas
    this.confettiCanvas = document.getElementById('confetti-canvas');

    this.attachEventListeners();
  }

  attachEventListeners() {
    // Landing Page -> Open Setup Popup
    if (this.btnStartPlay) {
      this.btnStartPlay.addEventListener('click', () => {
        this.openModal(this.modalSetup);
      });
    }

    // Cancel Setup Popup
    if (this.btnCancelSetup) {
      this.btnCancelSetup.addEventListener('click', () => {
        this.closeModal(this.modalSetup);
      });
    }

    // Setup Form Submission
    if (this.formSetup) {
      this.formSetup.addEventListener('submit', (e) => {
        e.preventDefault();
        this.applySetup();
      });
    }

    // Mode Toggle in Setup Form
    if (this.selectMode) {
      this.selectMode.addEventListener('change', (e) => {
        if (e.target.value === 'pvp') {
          if (this.groupAIDiff) this.groupAIDiff.style.display = 'none';
          if (this.inputBlackName) this.inputBlackName.value = 'Player 2';
        } else {
          if (this.groupAIDiff) this.groupAIDiff.style.display = 'flex';
          if (this.inputBlackName) this.inputBlackName.value = 'AI Opponent';
        }
      });
    }

    // Header / Nav Controls
    if (this.btnSound) this.btnSound.addEventListener('click', () => this.toggleSoundState());
    if (this.btnFlip) this.btnFlip.addEventListener('click', () => this.toggleFlipState());

    // Slide Switch Guard Mode Event Bindings
    if (this.toggleGuardInput) {
      this.toggleGuardInput.addEventListener('change', (e) => this.setGuardState(e.target.checked));
    }
    if (this.drawerToggleGuardInput) {
      this.drawerToggleGuardInput.addEventListener('change', (e) => this.setGuardState(e.target.checked));
    }

    if (this.btnOpenSetup) this.btnOpenSetup.addEventListener('click', () => this.openModal(this.modalSetup));
    if (this.btnNewGame) this.btnNewGame.addEventListener('click', () => this.startNewGame());

    // Mobile Hamburger Slide Drawer Events
    if (this.btnHamburger) this.btnHamburger.addEventListener('click', () => this.openDrawer());
    if (this.btnCloseDrawer) this.btnCloseDrawer.addEventListener('click', () => this.closeDrawer());
    if (this.drawerBackdrop) this.drawerBackdrop.addEventListener('click', () => this.closeDrawer());

    // Drawer Item Events
    if (this.drawerBtnSound) {
      this.drawerBtnSound.addEventListener('click', () => {
        this.toggleSoundState();
        this.closeDrawer();
      });
    }

    if (this.drawerBtnFlip) {
      this.drawerBtnFlip.addEventListener('click', () => {
        this.toggleFlipState();
        this.closeDrawer();
      });
    }

    if (this.drawerBtnSetup) {
      this.drawerBtnSetup.addEventListener('click', () => {
        this.closeDrawer();
        this.openModal(this.modalSetup);
      });
    }

    if (this.drawerBtnReset) {
      this.drawerBtnReset.addEventListener('click', () => {
        this.closeDrawer();
        this.startNewGame();
      });
    }

    if (this.drawerBtnMenu) {
      this.drawerBtnMenu.addEventListener('click', () => {
        this.closeDrawer();
        this.showLandingView();
      });
    }

    if (this.btnRestart) {
      this.btnRestart.addEventListener('click', () => {
        this.closeModal(this.modalGameOver);
        this.startNewGame();
      });
    }

    if (this.btnBackMenu) {
      this.btnBackMenu.addEventListener('click', () => {
        this.closeModal(this.modalGameOver);
        this.showLandingView();
      });
    }

    if (this.btnUndo) this.btnUndo.addEventListener('click', () => this.triggerUndo());
    if (this.btnMobileUndo) this.btnMobileUndo.addEventListener('click', () => this.triggerUndo());
    if (this.btnCopyFEN) this.btnCopyFEN.addEventListener('click', () => this.copyFEN());
    if (this.btnCopyHistory) this.btnCopyHistory.addEventListener('click', () => this.copyHistory());
  }

  openDrawer() {
    this.mobileDrawer.classList.add('open');
    this.drawerBackdrop.classList.add('active');
  }

  closeDrawer() {
    this.mobileDrawer.classList.remove('open');
    this.drawerBackdrop.classList.remove('active');
  }

  toggleSoundState() {
    const enabled = this.sound.toggleSound();
    const label = enabled ? '🔊<span class="btn-label"> Sound</span>' : '🔇<span class="btn-label"> Muted</span>';
    if (this.btnSound) this.btnSound.innerHTML = label;
    if (this.drawerBtnSound) this.drawerBtnSound.textContent = enabled ? '🔊 Toggle Sound (ON)' : '🔇 Toggle Sound (OFF)';
  }

  toggleFlipState() {
    this.isFlipped = !this.isFlipped;
    this.renderBoard();
  }

  setGuardState(isStrict) {
    this.engine.strictLegalMoves = isStrict;
    if (this.toggleGuardInput) this.toggleGuardInput.checked = isStrict;
    if (this.drawerToggleGuardInput) this.drawerToggleGuardInput.checked = isStrict;

    if (this.selectedSquare) {
      this.legalMovesForSelected = this.engine.getLegalMoves(this.selectedSquare.row, this.selectedSquare.col);
    }
    this.renderBoard();
  }

  triggerUndo() {
    // Don't allow undo if game is over — restart instead
    if (this.isGameOver()) return;
    if (this.gameMode === 'ai') {
      this.engine.undoMove();
      this.engine.undoMove();
    } else {
      this.engine.undoMove();
    }
    this.selectedSquare = null;
    this.legalMovesForSelected = [];
    this.updateAll();
    this.sound.playMove();
  }

  copyFEN() {
    const fen = this.engine.exportFEN();
    navigator.clipboard.writeText(fen).then(() => {
      alert('FEN copied to clipboard:\n' + fen);
    });
  }

  copyHistory() {
    const moves = this.engine.moveHistory;
    if (moves.length === 0) {
      alert('No moves to copy yet.');
      return;
    }
    let text = `Match History — ${this.whiteName} vs ${this.blackName}\n`;
    text += '─'.repeat(40) + '\n';
    for (let i = 0; i < moves.length; i += 2) {
      const moveNum = Math.floor(i / 2) + 1;
      const white = moves[i].san;
      const black = moves[i + 1] ? moves[i + 1].san : '';
      text += `${moveNum}. ${white}${black ? '  ' + black : ''}\n`;
    }
    navigator.clipboard.writeText(text).then(() => {
      alert('Match history copied to clipboard!');
    });
  }

  showLandingView() {
    this.viewLanding.style.display = 'flex';
    this.viewGame.style.display = 'none';
    this.stopTimer();
  }

  showGameView() {
    this.viewLanding.style.display = 'none';
    this.viewGame.style.display = 'flex';
  }

  applySetup() {
    this.gameMode = this.selectMode.value;
    this.whiteName = this.inputWhiteName.value.trim() || 'Player 1';
    this.blackName = this.inputBlackName.value.trim() || (this.gameMode === 'ai' ? 'AI Opponent' : 'Player 2');
    this.ai.setDifficulty(this.selectDiff.value);
    this.timerInitial = parseInt(this.selectTime.value, 10);

    const theme = this.selectTheme.value;
    document.body.setAttribute('data-theme', theme);

    this.nameWhiteEl.textContent = this.whiteName;
    if (this.gameMode === 'ai') {
      this.nameBlackEl.textContent = `${this.blackName} (${this.ai.difficulty.toUpperCase()})`;
      this.avatarBlackEl.textContent = '🤖';
    } else {
      this.nameBlackEl.textContent = this.blackName;
      this.avatarBlackEl.textContent = '👤';
    }

    this.closeModal(this.modalSetup);
    this.showGameView();
    this.startNewGame();
  }

  startNewGame() {
    this.engine.reset();
    this.selectedSquare = null;
    this.legalMovesForSelected = [];
    this.stopConfetti();

    this.timeWhite = this.timerInitial;
    this.timeBlack = this.timerInitial;
    this.stopTimer();
    if (this.timerInitial > 0) {
      this.startTimer();
    }

    this.updateAll();
    this.sound.playMove();
  }

  startTimer() {
    this.stopTimer();
    this.timerInterval = setInterval(() => {
      if (this.engine.gameStatus.isCheckmate || this.engine.gameStatus.isDraw || this.engine.gameStatus.isKingCaptured) {
        this.stopTimer();
        return;
      }

      if (this.engine.turn === 'w') {
        this.timeWhite--;
        if (this.timeWhite <= 0) {
          this.timeWhite = 0;
          this.handleTimeOut('w');
        }
      } else {
        this.timeBlack--;
        if (this.timeBlack <= 0) {
          this.timeBlack = 0;
          this.handleTimeOut('b');
        }
      }
      this.renderTimers();
    }, 1000);
  }

  stopTimer() {
    if (this.timerInterval) {
      clearInterval(this.timerInterval);
      this.timerInterval = null;
    }
  }

  handleTimeOut(colorLoss) {
    this.stopTimer();
    const winnerName = colorLoss === 'w' ? this.blackName : this.whiteName;

    if (this.gameMode === 'ai') {
      if (colorLoss === 'w') {
        // Player (white) ran out of time
        this.sound.playLoss();
        this.showGameOverModal('⏰ Time Out — You Lost!', `Your clock ran out. The AI wins on time!`, 'loss');
      } else {
        this.sound.playVictory();
        this.launchConfetti();
        this.showGameOverModal('🎉 You Won!', `${this.whiteName} wins — the AI ran out of time!`, 'win');
      }
    } else {
      this.sound.playVictory();
      this.launchConfetti();
      this.showGameOverModal('⏰ Time Out!', `${winnerName} wins on time expiration.`, 'win');
    }
  }

  formatTime(seconds) {
    if (seconds <= 0) return '00:00';
    const m = Math.floor(seconds / 60).toString().padStart(2, '0');
    const s = (seconds % 60).toString().padStart(2, '0');
    return `${m}:${s}`;
  }

  renderTimers() {
    if (this.timerInitial === 0) {
      this.timerWhiteEl.textContent = '∞';
      this.timerBlackEl.textContent = '∞';
      return;
    }
    this.timerWhiteEl.textContent = this.formatTime(this.timeWhite);
    this.timerBlackEl.textContent = this.formatTime(this.timeBlack);
  }

  isGameOver() {
    const s = this.engine.gameStatus;
    return s.isCheckmate || s.isStalemate || s.isDraw || s.isKingCaptured;
  }

  updateAll() {
    this.renderBoard();
    this.renderTimers();
    this.updateCapturedTray();
    this.updateMoveLog();
    this.updateTurnCards();

    const s = this.engine.gameStatus;

    // Check King Capture / Death first
    if (s.isKingCaptured) {
      this.stopTimer();
      const winnerName = s.winner === 'w' ? this.whiteName : this.blackName;

      if (this.gameMode === 'ai') {
        if (s.winner === 'w') {
          this.sound.playVictory();
          this.launchConfetti();
          this.showGameOverModal('🎉 You Won!', `You captured the enemy King and won the match!`, 'win');
        } else {
          this.sound.playLoss();
          this.showGameOverModal('💀 You Lost!', `The AI captured your King. Better luck next time!`, 'loss');
        }
      } else {
        // PvP — show the actual player name
        this.sound.playVictory();
        this.launchConfetti();
        this.showGameOverModal(`🎉 ${winnerName} Won!`, `${winnerName} captured the enemy King and won the match!`, 'win');
      }
    } else if (s.isCheckmate) {
      this.stopTimer();
      const winnerName = s.winner === 'w' ? this.whiteName : this.blackName;

      if (this.gameMode === 'ai') {
        if (s.winner === 'w') {
          // Player (white) won
          this.sound.playVictory();
          this.launchConfetti();
          this.showGameOverModal('🎉 You Won!', `Checkmate! ${this.whiteName} delivered a brilliant checkmate!`, 'win');
        } else {
          // AI won — player lost
          this.sound.playLoss();
          this.showGameOverModal('💀 Checkmate<br>You Lost!', `The AI checkmated your King. No legal moves remain. Better luck next time!`, 'loss');
        }
      } else {
        // PvP — show the actual winning player's name
        this.sound.playVictory();
        this.launchConfetti();
        this.showGameOverModal(`🎉 ${winnerName} Won!`, `Checkmate! ${winnerName} wins the game!`, 'win');
      }
    } else if (s.isStalemate) {
      this.stopTimer();
      this.sound.playMove();
      this.showGameOverModal('🤝 Stalemate!', 'Draw!! No legal moves available.', 'draw');
    } else if (s.isDraw) {
      this.stopTimer();
      this.sound.playMove();
      this.showGameOverModal('🤝 Draw!', 'Game ended in a draw!', 'draw');
    }
  }

  updateTurnCards() {
    if (this.engine.turn === 'w') {
      this.cardWhite.classList.add('active-turn');
      this.cardBlack.classList.remove('active-turn');
    } else {
      this.cardBlack.classList.add('active-turn');
      this.cardWhite.classList.remove('active-turn');
    }
  }

  renderBoard() {
    this.boardEl.innerHTML = '';

    const colNames = ['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h'];
    const rowNames = ['8', '7', '6', '5', '4', '3', '2', '1'];

    const lastMove = this.engine.moveHistory.length > 0 ? this.engine.moveHistory[this.engine.moveHistory.length - 1] : null;
    const kingInCheckPos = this.engine.gameStatus.inCheck ? this.engine.findKing(this.engine.turn) : null;
    const enemyColor = this.engine.turn === 'w' ? 'b' : 'w';

    for (let r = 0; r < 8; r++) {
      for (let c = 0; c < 8; c++) {
        const row = this.isFlipped ? 7 - r : r;
        const col = this.isFlipped ? 7 - c : c;

        const squareEl = document.createElement('div');
        const isDark = (row + col) % 2 === 1;
        squareEl.className = `square ${isDark ? 'dark' : 'light'}`;
        squareEl.dataset.row = row;
        squareEl.dataset.col = col;

        const piece = this.engine.board[row][col];
        if (piece) {
          squareEl.classList.add('has-piece');
          const pieceEl = document.createElement('div');
          pieceEl.className = 'piece';
          pieceEl.style.backgroundImage = `url("${getPieceDataUrl(piece)}")`;
          pieceEl.draggable = true;

          pieceEl.addEventListener('dragstart', (e) => this.handleDragStart(e, row, col));
          squareEl.appendChild(pieceEl);
        }

        if (this.selectedSquare && this.selectedSquare.row === row && this.selectedSquare.col === col) {
          squareEl.classList.add('selected');
        }

        if (lastMove && ((lastMove.from.row === row && lastMove.from.col === col) || (lastMove.to.row === row && lastMove.to.col === col))) {
          squareEl.classList.add('last-move');
        }

        if (kingInCheckPos && kingInCheckPos.row === row && kingInCheckPos.col === col) {
          squareEl.classList.add('in-check');
        }

        const isLegalTarget = this.legalMovesForSelected.some(m => m.to.row === row && m.to.col === col);
        if (isLegalTarget) {
          const selectedPiece = this.selectedSquare ? this.engine.board[this.selectedSquare.row][this.selectedSquare.col] : null;
          const isAttacked = this.engine.isSquareAttacked(row, col, enemyColor);

          // Red danger dot ONLY when Guard Mode is OFF (strictLegalMoves is false)
          if (!this.engine.strictLegalMoves && isAttacked && selectedPiece && selectedPiece[1] === 'K') {
            squareEl.classList.add('danger-square');
          }

          const hintEl = document.createElement('div');
          hintEl.className = 'move-hint';
          squareEl.appendChild(hintEl);
        }

        // Corner Coordinates
        if (c === 0) {
          const rankLabel = document.createElement('span');
          rankLabel.className = 'coord-label coord-rank';
          rankLabel.textContent = rowNames[row];
          squareEl.appendChild(rankLabel);
        }
        if (r === 7) {
          const fileLabel = document.createElement('span');
          fileLabel.className = 'coord-label coord-file';
          fileLabel.textContent = colNames[col];
          squareEl.appendChild(fileLabel);
        }

        squareEl.addEventListener('click', () => this.handleSquareClick(row, col));
        squareEl.addEventListener('dragover', (e) => e.preventDefault());
        squareEl.addEventListener('drop', (e) => this.handleDrop(e, row, col));

        this.boardEl.appendChild(squareEl);
      }
    }
  }

  handleSquareClick(row, col) {
    // Block all input when game is over
    if (this.isGameOver()) return;
    if (this.gameMode === 'ai' && this.engine.turn === 'b') return;

    const pieceOnSquare = this.engine.board[row][col];

    if (pieceOnSquare && pieceOnSquare[0] === this.engine.turn) {
      this.selectedSquare = { row, col };
      this.legalMovesForSelected = this.engine.getLegalMoves(row, col);
      this.renderBoard();
      return;
    }

    if (this.selectedSquare) {
      const chosenMove = this.legalMovesForSelected.find(m => m.to.row === row && m.to.col === col);
      if (chosenMove) {
        this.attemptMove(this.selectedSquare, { row, col }, chosenMove);
      } else {
        this.selectedSquare = null;
        this.legalMovesForSelected = [];
        this.renderBoard();
      }
    }
  }

  handleDragStart(e, row, col) {
    // Block drag when game is over
    if (this.isGameOver()) return;
    if (this.gameMode === 'ai' && this.engine.turn === 'b') return;
    const piece = this.engine.board[row][col];
    if (piece && piece[0] === this.engine.turn) {
      this.selectedSquare = { row, col };
      this.legalMovesForSelected = this.engine.getLegalMoves(row, col);
      this.renderBoard();
      e.dataTransfer.setData('text/plain', JSON.stringify({ row, col }));
    }
  }

  handleDrop(e, row, col) {
    e.preventDefault();
    const data = e.dataTransfer.getData('text/plain');
    if (!data) return;
    const from = JSON.parse(data);
    const chosenMove = this.legalMovesForSelected.find(m => m.to.row === row && m.to.col === col);
    if (chosenMove) {
      this.attemptMove(from, { row, col }, chosenMove);
    }
  }

  attemptMove(from, to, moveDetails) {
    if (moveDetails.flags.isPromotion) {
      this.pendingPromotionMove = { from, to };
      this.showPromotionModal(this.engine.turn);
      return;
    }

    this.executePlayerMove(from, to);
  }

  executePlayerMove(from, to, promoPiece = null) {
    const success = this.engine.makeMove(from, to, promoPiece);
    if (!success) {
      this.sound.playError();
      return;
    }

    this.selectedSquare = null;
    this.legalMovesForSelected = [];

    // After makeMove() the turn has already flipped, so the piece that just
    // moved belongs to the opposite color.
    const movedColor = this.engine.turn === 'w' ? 'b' : 'w';

    if (this.engine.gameStatus.isCheckmate || this.engine.gameStatus.isKingCaptured) {
      this.sound.playVictory();
    } else if (this.engine.gameStatus.inCheck) {
      this.sound.playCheck();
    } else if (this.engine.moveHistory[this.engine.moveHistory.length - 1].captured) {
      this.sound.playCapture();
    } else if (this.engine.moveHistory[this.engine.moveHistory.length - 1].flags.isCastleKingside ||
      this.engine.moveHistory[this.engine.moveHistory.length - 1].flags.isCastleQueenside) {
      this.sound.playCastle();
    } else {
      this.sound.playMoveForColor(movedColor);
    }

    this.updateAll();

    if (this.gameMode === 'ai' && this.engine.turn === 'b' && !this.engine.gameStatus.isCheckmate && !this.engine.gameStatus.isDraw && !this.engine.gameStatus.isKingCaptured) {
      setTimeout(() => this.makeAIMove(), 350);
    }
  }

  makeAIMove() {
    const bestMove = this.ai.getBestMove(this.engine);
    if (bestMove) {
      const promoChoice = bestMove.flags.promoPiece ? bestMove.flags.promoPiece[1] : 'Q';
      this.engine.makeMove(bestMove.from, bestMove.to, promoChoice);

      if (this.engine.gameStatus.isCheckmate || this.engine.gameStatus.isKingCaptured) {
        this.sound.playVictory();
      } else if (this.engine.gameStatus.inCheck) {
        this.sound.playCheck();
      } else if (this.engine.moveHistory[this.engine.moveHistory.length - 1].captured) {
        this.sound.playCapture();
      } else {
        // AI always plays black — after its move, engine.turn has flipped to 'w'
        this.sound.playMoveForColor('b');
      }

      this.updateAll();
    }
  }

  updateCapturedTray() {
    this.capturedWhiteEl.innerHTML = '';
    this.capturedBlackEl.innerHTML = '';

    let scoreW = 0;
    let scoreB = 0;

    this.engine.capturedPieces.w.forEach(p => {
      scoreB += PIECE_VALUES[p[1]] || 0;
      const img = document.createElement('img');
      img.src = getPieceDataUrl(p);
      img.className = 'captured-piece-img';
      this.capturedBlackEl.appendChild(img);
    });

    this.engine.capturedPieces.b.forEach(p => {
      scoreW += PIECE_VALUES[p[1]] || 0;
      const img = document.createElement('img');
      img.src = getPieceDataUrl(p);
      img.className = 'captured-piece-img';
      this.capturedWhiteEl.appendChild(img);
    });

    const diffW = (scoreW - scoreB) / 100;
    const diffB = (scoreB - scoreW) / 100;

    if (diffW > 0) {
      const tag = document.createElement('span');
      tag.className = 'score-diff';
      tag.textContent = `+${diffW}`;
      this.capturedWhiteEl.appendChild(tag);
    } else if (diffB > 0) {
      const tag = document.createElement('span');
      tag.className = 'score-diff';
      tag.textContent = `+${diffB}`;
      this.capturedBlackEl.appendChild(tag);
    }
  }

  updateMoveLog() {
    this.historyListEl.innerHTML = '';
    const moves = this.engine.moveHistory;

    for (let i = 0; i < moves.length; i += 2) {
      const rowEl = document.createElement('div');
      rowEl.className = 'history-row';

      const numEl = document.createElement('span');
      numEl.className = 'history-move-num';
      numEl.textContent = `${Math.floor(i / 2) + 1}.`;

      const wSan = document.createElement('span');
      wSan.className = 'history-move-san';
      wSan.textContent = moves[i].san;

      const bSan = document.createElement('span');
      bSan.className = 'history-move-san';
      bSan.textContent = moves[i + 1] ? moves[i + 1].san : '';

      rowEl.appendChild(numEl);
      rowEl.appendChild(wSan);
      rowEl.appendChild(bSan);

      this.historyListEl.appendChild(rowEl);
    }

    this.historyListEl.scrollTop = this.historyListEl.scrollHeight;
  }

  showPromotionModal(color) {
    this.promoOptionsEl.innerHTML = '';
    const choices = ['Q', 'R', 'B', 'N'];

    choices.forEach(type => {
      const pieceKey = color + type;
      const btn = document.createElement('button');
      btn.className = 'promo-btn';
      const img = document.createElement('img');
      img.src = getPieceDataUrl(pieceKey);
      img.className = 'promo-piece-img';
      btn.appendChild(img);

      btn.addEventListener('click', () => {
        this.closeModal(this.modalPromo);
        if (this.pendingPromotionMove) {
          const { from, to } = this.pendingPromotionMove;
          this.pendingPromotionMove = null;
          this.executePlayerMove(from, to, type);
        }
      });

      this.promoOptionsEl.appendChild(btn);
    });

    this.openModal(this.modalPromo);
  }

  showGameOverModal(title, desc, type = 'win') {
    this.gameoverTitle.innerHTML = title;
    this.gameoverDesc.textContent = desc;
    // Apply type styling
    const card = this.modalGameOver.querySelector('.gameover-card');
    if (card) {
      card.dataset.result = type; // 'win', 'loss', 'draw'
    }
    this.openModal(this.modalGameOver);
  }

  openModal(modalEl) {
    modalEl.classList.add('active');
  }

  closeModal(modalEl) {
    modalEl.classList.remove('active');
  }

  // ─── Confetti ─────────────────────────────────────────────────────────────

  launchConfetti() {
    if (!this.confettiCanvas) return;
    this.stopConfetti();

    const canvas = this.confettiCanvas;
    const ctx = canvas.getContext('2d');
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
    canvas.style.display = 'block';

    const colors = [
      '#FFD700', '#FF6B6B', '#4ECDC4', '#45B7D1',
      '#96CEB4', '#FFEAA7', '#DDA0DD', '#98D8C8',
      '#F7DC6F', '#BB8FCE', '#85C1E9', '#82E0AA'
    ];

    this.confettiParticles = [];
    for (let i = 0; i < 180; i++) {
      this.confettiParticles.push({
        x: Math.random() * canvas.width,
        y: Math.random() * canvas.height - canvas.height,
        w: Math.random() * 12 + 5,
        h: Math.random() * 6 + 3,
        color: colors[Math.floor(Math.random() * colors.length)],
        rotation: Math.random() * Math.PI * 2,
        rotationSpeed: (Math.random() - 0.5) * 0.15,
        vx: (Math.random() - 0.5) * 3,
        vy: Math.random() * 4 + 2,
        opacity: 1,
        shape: Math.random() > 0.5 ? 'rect' : 'circle'
      });
    }

    const animate = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      let alive = false;

      this.confettiParticles.forEach(p => {
        if (p.y < canvas.height + 20) alive = true;
        p.x += p.vx;
        p.y += p.vy;
        p.rotation += p.rotationSpeed;
        p.vy += 0.06; // gravity
        p.vx *= 0.99; // air friction

        ctx.save();
        ctx.globalAlpha = Math.max(0, p.opacity);
        ctx.fillStyle = p.color;
        ctx.translate(p.x, p.y);
        ctx.rotate(p.rotation);

        if (p.shape === 'circle') {
          ctx.beginPath();
          ctx.arc(0, 0, p.w / 2, 0, Math.PI * 2);
          ctx.fill();
        } else {
          ctx.fillRect(-p.w / 2, -p.h / 2, p.w, p.h);
        }

        ctx.restore();
      });

      if (alive) {
        this.confettiAnimId = requestAnimationFrame(animate);
      } else {
        this.stopConfetti();
      }
    };

    this.confettiAnimId = requestAnimationFrame(animate);
  }

  stopConfetti() {
    if (this.confettiAnimId) {
      cancelAnimationFrame(this.confettiAnimId);
      this.confettiAnimId = null;
    }
    if (this.confettiCanvas) {
      const ctx = this.confettiCanvas.getContext('2d');
      ctx.clearRect(0, 0, this.confettiCanvas.width, this.confettiCanvas.height);
      this.confettiCanvas.style.display = 'none';
    }
    this.confettiParticles = [];
  }
}
