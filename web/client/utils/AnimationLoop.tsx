
export default class AnimationLoop {
  private paused = true;
  constructor(private frameFn: () => Promise<void>) {}

  async frame() {
    if (this.paused) {
      return;
    }
    await this.frameFn();
    if (!this.paused) {
      requestAnimationFrame(this.frame.bind(this))
    }
  }

  start() {
    this.paused = false;
    requestAnimationFrame(this.frame.bind(this));
  }

  pause() {
    this.paused = true;
  }
}
