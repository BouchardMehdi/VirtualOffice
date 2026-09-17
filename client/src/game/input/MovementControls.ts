const directionKeys = new Set(['z', 'q', 's', 'd', 'arrowup', 'arrowleft', 'arrowdown', 'arrowright']);

export class MovementControls {
  private readonly pressed = new Set<string>();

  constructor(private readonly canvas: HTMLCanvasElement) {
    canvas.addEventListener('pointerdown', this.focus);
    canvas.addEventListener('keydown', this.keyDown);
    canvas.addEventListener('keyup', this.keyUp);
    canvas.addEventListener('blur', this.clear);
    window.addEventListener('blur', this.clear);
    document.addEventListener('visibilitychange', this.clear);
    document.addEventListener('fullscreenchange', this.clear);
  }

  private keyDown = (event: KeyboardEvent) => {
    if (event.ctrlKey || event.altKey || event.metaKey) { this.clear(); return; }
    const key = event.key.toLowerCase();
    if (!directionKeys.has(key)) return;
    event.preventDefault();
    this.pressed.add(key);
  };

  private keyUp = (event: KeyboardEvent) => {
    const key = event.key.toLowerCase();
    if (!directionKeys.has(key)) return;
    event.preventDefault();
    this.pressed.delete(key);
  };

  private clear = () => { this.pressed.clear(); };

  private focus = () => { this.canvas.focus({ preventScroll: true }); };

  getDirection() {
    if (document.activeElement !== this.canvas) return { x: 0, y: 0 };
    const down = (...keys: string[]) => keys.some((key) => this.pressed.has(key)) ? 1 : 0;
    return {
      x: down('d', 'arrowright') - down('q', 'arrowleft'),
      y: down('s', 'arrowdown') - down('z', 'arrowup'),
    };
  }

  destroy() {
    this.clear();
    this.canvas.removeEventListener('pointerdown', this.focus);
    this.canvas.removeEventListener('keydown', this.keyDown);
    this.canvas.removeEventListener('keyup', this.keyUp);
    this.canvas.removeEventListener('blur', this.clear);
    window.removeEventListener('blur', this.clear);
    document.removeEventListener('visibilitychange', this.clear);
    document.removeEventListener('fullscreenchange', this.clear);
  }
}
