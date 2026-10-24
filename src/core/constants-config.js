import { validateTiming } from './timing-config.js';
export function validateConstants(value) {
  const object = (input, fields, name) => {
    if (!input || typeof input !== 'object' || Array.isArray(input)) throw new Error(`${name} must be an object.`);
    if (Object.keys(input).some(key => !fields.includes(key) && !(name === 'constants' && key === '_comments'))) throw new Error(`Unknown setting in ${name}.`);
    for (const field of fields) if (!(field in input)) throw new Error(`Missing ${name}.${field}.`);
  };
  object(value, ['timing','chat','debug'], 'constants');
  validateTiming(value.timing);
  for (const [name, fields] of Object.entries({
    chat: ['maximumMessageCharacters','roomTitleCharacters'],
    debug: ['maximumBytes','maximumEntries','maximumAgeMs','exportUrlLifetimeMs']
  })) {
    object(value[name], fields, name);
    for (const field of fields) {
      if (!Number.isSafeInteger(value[name][field]) || value[name][field] <= 0) throw new Error(`${name}.${field} must be a positive safe integer.`);
    }
  }
  if (value.debug.exportUrlLifetimeMs > 2147483647) throw new Error('Export URL lifetime exceeds the browser timer range.');
  const {_comments, ...runtimeConstants} = value;
  return runtimeConstants;
}
