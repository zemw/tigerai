// Presentation pacing only: no prompts, DOM, provider, or storage dependencies.
// API time counts toward the target; a slow request adds no artificial wait.
export const DEFAULT_TIMING = Object.freeze({
  minimumMs: 650,
  maximumMs: 2200,
  perCharacterMs: 8,
  variationMs: 180,
  maximumExtraMs: 1600
});
export class ReplyTiming {
  constructor(options = {}) {
    this.options = {...DEFAULT_TIMING, ...options};
    for (const value of Object.values(this.options)) {
      if (!Number.isFinite(value) || value < 0) throw new Error('Timing settings must be finite nonnegative numbers.');
    }
    if (this.options.maximumMs < this.options.minimumMs) throw new Error('Maximum reply timing must be at least the minimum.');
  }
  remainingMs(text, elapsedMs) {
    const {minimumMs, maximumMs, perCharacterMs, variationMs, maximumExtraMs} = this.options;
    const length = Array.from(text.trim()).length;
    const variation = (Math.random() * 2 - 1) * variationMs;
    const target = Math.min(maximumMs, Math.max(minimumMs, minimumMs + length * perCharacterMs + variation));
    return Math.round(Math.min(maximumExtraMs, Math.max(0, target - elapsedMs)));
  }
  async wait(text, startedAt, signal) {
    const stopped = () => new Error('Reply stopped. Your draft is still here.');
    if (signal?.aborted) throw stopped();
    const delay = this.remainingMs(text, Math.max(0, performance.now() - startedAt));
    if (!delay) return;
    await new Promise((resolve, reject) => {
      const cleanup = () => signal?.removeEventListener('abort', abort);
      const abort = () => { clearTimeout(timer); cleanup(); reject(stopped()); };
      const timer = setTimeout(() => { cleanup(); resolve(); }, delay);
      signal?.addEventListener('abort', abort, {once: true});
      // Also covers adapters that abort just before the listener is attached.
      if (signal?.aborted) abort();
    });
    if (signal?.aborted) throw stopped();
  }
}
