/**
 * Maze Zombies - Entry Point
 *
 * A Minecraft-style zombie shooter set in a maze.
 * Find the janitor zombie, kill it for the key, and escape!
 *
 * Controls:
 *   WASD   - Move
 *   Mouse  - Look / Aim
 *   Click  - Shoot
 *   Shift  - Sprint
 *   Space  - Dodge Roll
 *   C      - Toggle Camera (1st / 3rd person)
 *   R      - Restart Level
 *   Esc    - Pause
 */

import { Game } from './core/Game.js';

window.addEventListener('DOMContentLoaded', () => {
  const container = document.getElementById('game-container');
  const game = new Game(container);
  window.__game = game;
});
