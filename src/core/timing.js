// Presentation pacing is independent of the UI and API transport.
import { constants } from './constants.generated.js';
import { validateTiming } from './timing-config.js';
export const DEFAULT_TIMING = Object.freeze(validateTiming(constants.timing));
const stopped = () => new Error('Reply stopped. Your draft is still here.');
async function pause(delay, signal) {
  if (signal?.aborted) throw stopped();
  if (!delay) return;
  await new Promise((resolve, reject) => {
    const cleanup = () => signal?.removeEventListener('abort', abort);
    const abort = () => { clearTimeout(timer); cleanup(); reject(stopped()); };
    const timer = setTimeout(() => { cleanup(); resolve(); }, delay);
    signal?.addEventListener('abort', abort, {once:true});
    if (signal?.aborted) abort();
  });
  if (signal?.aborted) throw stopped();
}
export class ReplyTiming {
  constructor(options = {}) { this.options = validateTiming({...DEFAULT_TIMING, ...options}); }
  beforeTyping(signal) {
    const {beforeTypingMinimumMs, beforeTypingMaximumMs} = this.options;
    return pause(Math.round(beforeTypingMinimumMs + Math.random() * (beforeTypingMaximumMs - beforeTypingMinimumMs)), signal);
  }
  remainingMs(text, elapsedMs) {
    const {minimumMs, charactersPerMinute, speedVariationFraction} = this.options;
    const speed = charactersPerMinute * (1 + (Math.random() * 2 - 1) * speedVariationFraction);
    const target = Math.max(minimumMs, Array.from(text.trim()).length / speed * 60000);
    return Math.round(Math.max(0, target - elapsedMs));
  }
  wait(text, startedAt, signal) { return pause(this.remainingMs(text, Math.max(0, performance.now()-startedAt)), signal); }
}
