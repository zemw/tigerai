export function validateTiming(value) {
  const durations = ['minimumMs', 'beforeTypingMinimumMs', 'beforeTypingMaximumMs'];
  const fields = [...durations, 'charactersPerMinute', 'speedVariationFraction'];
  if (!value || typeof value !== 'object' || Array.isArray(value)) throw new Error('Timing configuration must be an object.');
  for (const field of durations) {
    if (!Number.isFinite(value[field]) || value[field] < 0 || value[field] > 2147483647) throw new Error(`Timing setting ${field} must be a nonnegative number within the browser timer range.`);
  }
  if (!Number.isFinite(value.charactersPerMinute) || value.charactersPerMinute <= 0) throw new Error('Typing speed must be a positive finite number.');
  if (!Number.isFinite(value.speedVariationFraction) || value.speedVariationFraction < 0 || value.speedVariationFraction >= 1) throw new Error('Typing speed variation must be at least 0 and less than 1.');
  for (const field of Object.keys(value)) if (!fields.includes(field)) throw new Error(`Unknown timing setting: ${field}`);
  if (value.beforeTypingMaximumMs < value.beforeTypingMinimumMs) throw new Error('Maximum pre-typing pause must be at least the minimum.');
  return value;
}
