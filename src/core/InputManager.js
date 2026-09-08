/**
 * InputManager - Centralised keyboard & mouse state.
 * Poll keys via .isDown('KeyW'), mouse via .mouseX/Y, .mouseButtons.
 *
 * Mouse look supports two modes:
 *  1. Pointer lock (preferred, standard FPS behaviour)
 *  2. Fallback "free look" when pointer lock is unavailable
 *     (e.g. inside an iframe without pointer-lock permission).
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
    this._fallbackLook = false; // free-look mode when pointer lock fails
    this.sensitivity = 0.002;

    window.addEventListener('keydown', (e) => {
      this.keys[e.code] = true;
    });
    window.addEventListener('keyup', (e) => {
      this.keys[e.code] = false;
    });

    window.addEventListener('mousemove', (e) => {
      // Track deltas whenever look is active (pointer locked OR fallback mode)
      if (this._pointerLocked || this._fallbackLook) {
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
      if (this._pointerLocked) this._fallbackLook = false;
    });

    // Pointer lock failed (iframe restrictions, user gesture rules, etc.)
    document.addEventListener('pointerlockerror', () => {
      this._fallbackLook = true;
    });
  }

  /** True when the camera should follow the mouse (either mode). */
  get lookActive() {
    return this._pointerLocked || this._fallbackLook;
  }

  get pointerLocked() {
    return this._pointerLocked;
  }

  get fallbackLook() {
    return this._fallbackLook;
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

  requestPointerLock(element) {
    try {
      const result = element.requestPointerLock();
      // Modern browsers return a Promise that rejects on failure
      if (result && typeof result.catch === 'function') {
        result.catch(() => {
          this._fallbackLook = true;
        });
      }
      // If the lock doesn't engage shortly, assume it failed (older browsers
      // throw synchronously or silently fail inside restricted iframes)
      setTimeout(() => {
        if (!this._pointerLocked) this._fallbackLook = true;
      }, 300);
    } catch (err) {
      this._fallbackLook = true;
    }
  }

  /** Turn off free-look (used when leaving gameplay, e.g. pause/menu). */
  disableLook() {
    this._fallbackLook = false;
    this.flushMouseDelta();
  }
}
