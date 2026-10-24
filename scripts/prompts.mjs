import { readFile, writeFile } from 'node:fs/promises';
import { loadPrompts, validatePrompts, generatePrompts } from './prompt-config.mjs';
const [action, file] = process.argv.slice(2);
if (action === 'export' && file) await writeFile(file, JSON.stringify(await loadPrompts(),null,2)+'\n');
else if (action === 'import' && file) {
 const prompts=validatePrompts(JSON.parse(await readFile(file,'utf8')));
 await writeFile('config/prompts.json',JSON.stringify(prompts,null,2)+'\n');
 await generatePrompts();
} else { console.error('Usage: node scripts/prompts.mjs export|import /tmp/prompts.json'); process.exitCode=1; }
