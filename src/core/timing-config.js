export function validateTiming(value) {
  const fields = ['minimumMs', 'maximumMs', 'perCharacterMs', 'variationMs', 'maximumExtraMs'];
  if (!value || typeof value !== 'object' || Array.isArray(value)) throw new Error('Timing configuration must be an object.');
  for (const field of fields) {
    if (!Number.isFinite(value[field]) || value[field] < 0 || value[field] > 2147483647) {
      throw new Error(`Timing setting ${field} must be a nonnegative number within the browser timer range.`);
    }
  }
  for (const field of Object.keys(value)) {
    if (!fields.includes(field)) throw new Error(`Unknown timing setting: ${field}`);
  }
  if (value.maximumMs < value.minimumMs) throw new Error('Maximum reply timing must be at least the minimum.');
  return value;
}
