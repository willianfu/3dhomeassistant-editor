export class FpsMeter {
  private frameCount = 0;
  private lastReportTime: number | null = null;

  sample(now: number) {
    if (this.lastReportTime === null) {
      this.lastReportTime = now;
    }
    this.frameCount += 1;
    const elapsed = now - this.lastReportTime;
    if (elapsed < 500) {
      return null;
    }
    const fps = Math.round((this.frameCount * 1000) / elapsed);
    this.frameCount = 0;
    this.lastReportTime = now;
    return fps;
  }
}
