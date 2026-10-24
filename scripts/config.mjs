import { readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { generatePrompts } from './prompt-config.mjs';
import { validateTiming } from '../src/core/timing-config.js';
export async function generateConfig(root = process.cwd()) {
  const timing = validateTiming(JSON.parse(await readFile(path.join(root, 'config/timing.json'), 'utf8')));
  await generatePrompts(root);
  await writeFile(path.join(root, 'src/core/timing.generated.js'),
    `// Generated from config/timing.json. Do not edit.\nexport const timingConfig = ${JSON.stringify(timing)};\n`);
}
