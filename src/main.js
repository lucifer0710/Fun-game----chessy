import { ChessEngine } from './chessEngine.js';
import { AIEngine } from './aiEngine.js';
import { SoundManager } from './audio.js';
import { UIController } from './uiController.js';

document.addEventListener('DOMContentLoaded', () => {
  const engine = new ChessEngine();
  const ai = new AIEngine('medium');
  const sound = new SoundManager();
  const ui = new UIController(engine, ai, sound);

  ui.showLandingView();
});
