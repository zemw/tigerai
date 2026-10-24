// Presentation pacing only: no prompts, DOM, provider, or storage dependencies.
// API time counts toward the target; a slow request adds no artificial wait.
import { timingConfig } from './timing.generated.js';
import { validateTiming } from './timing-config.js';
export const DEFAULT_TIMING = Object.freeze(validateTiming(timingConfig));
export class ReplyTiming {
  constructor(options = {}) {
    this.options = validateTiming({...DEFAULT_TIMING, ...options});
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
