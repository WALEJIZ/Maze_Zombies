/**
 * InputManager - Centralised keyboard & mouse state.
 * Poll keys via .isDown('KeyW'), mouse via .mouseX/Y, .mouseButtons.
 */
export class InputManager {
  constructor() {
    this.keys = {};
    this.mouseX = 0;
    this.mouseY = 0;
    this.mouseDeltaX = 0;
    this.mouseDeltaY = 0;
    this.mouseButtons = {};
    this._pointerLocked = false;
    this.sensitivity = 0.002;

    window.addEventListener('keydown', (e) => {
      this.keys[e.code] = true;
    });
    window.addEventListener('keyup', (e) => {
      this.keys[e.code] = false;
    });

    window.addEventListener('mousemove', (e) => {
      if (this._pointerLocked) {
        this.mouseDeltaX += e.movementX || 0;
        this.mouseDeltaY += e.movementY || 0;
      }
      this.mouseX = e.clientX;
      this.mouseY = e.clientY;
    });

    window.addEventListener('mousedown', (e) => {
      this.mouseButtons[e.button] = true;
    });
    window.addEventListener('mouseup', (e) => {
      this.mouseButtons[e.button] = false;
    });

    document.addEventListener('pointerlockchange', () => {
      this._pointerLocked = document.pointerLockElement !== null;
    });
  }

  isDown(code) {
    return !!this.keys[code];
  }

  isMouseButtonDown(button = 0) {
    return !!this.mouseButtons[button];
  }

  flushMouseDelta() {
    this.mouseDeltaX = 0;
    this.mouseDeltaY = 0;
  }

  get pointerLocked() {
    return this._pointerLocked;
  }

  requestPointerLock(element) {
    element.requestPointerLock();
  }
}
