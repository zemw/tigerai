import { readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { generatePrompts } from './prompt-config.mjs';
import { validateConstants } from '../src/core/constants-config.js';
export async function generateConfig(root = process.cwd()) {
  const constants = validateConstants(JSON.parse(await readFile(path.join(root, 'config/constants.json'), 'utf8')));
  await generatePrompts(root);
  await writeFile(path.join(root, 'src/core/constants.generated.js'),
    `// Generated from config/constants.json. Do not edit.\nexport const constants = ${JSON.stringify(constants)};\n`);
}
