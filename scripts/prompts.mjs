import { readFile, writeFile } from 'node:fs/promises';
import { prompts } from '../src/core/prompts.js';
const [action, path] = process.argv.slice(2);
if (action === 'export' && path) await writeFile(path, JSON.stringify(prompts,null,2)+'\n');
else if (action === 'import' && path) {
 const p = JSON.parse(await readFile(path,'utf8'));
 if (typeof p.character !== 'string' || typeof p.identity !== 'string' || !Array.isArray(p.rules) || p.rules.some(r=>typeof r.id !== 'string' || typeof r.enabled !== 'boolean' || typeof r.text !== 'string')) throw new Error('Invalid prompt configuration');
 const encoded = Buffer.from(JSON.stringify(p)).toString('base64');
 await writeFile('src/core/prompts.js', `// Base64 is obfuscation, not encryption. Edit with scripts/prompts.mjs.\nexport const prompts = JSON.parse(new TextDecoder().decode(Uint8Array.from(atob("${encoded}"), c => c.charCodeAt(0))));\n`);
} else { console.error('Usage: node scripts/prompts.mjs export|import /tmp/prompts.json'); process.exitCode=1; }
