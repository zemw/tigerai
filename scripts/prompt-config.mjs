import { readFile, writeFile, mkdir } from 'node:fs/promises';
import path from 'node:path';
export function validatePrompts(value) {
  const fail=message=>{throw new Error(`Invalid prompt configuration: ${message}`);};
  if(!value || typeof value!=='object' || Array.isArray(value))fail('expected an object.');
  for(const name of ['character','identity'])if(typeof value[name]!=='string'||!value[name].trim())fail(`${name} must be a nonempty string.`);
  if(!Array.isArray(value.rules))fail('rules must be an array.');
  const ids=new Set();
  for(const rule of value.rules){
    if(!rule || typeof rule.id!=='string' || !rule.id.trim())fail('each rule needs a nonempty id.');
    if(ids.has(rule.id))fail(`duplicate rule id: ${rule.id}`);
    ids.add(rule.id);
    if(typeof rule.enabled!=='boolean')fail(`rule ${rule.id} needs an enabled boolean.`);
    if(typeof rule.text!=='string'||!rule.text.trim())fail(`rule ${rule.id} needs nonempty text.`);
  }
  return value;
}
export async function loadPrompts(root=process.cwd()) {
  return validatePrompts(JSON.parse(await readFile(path.join(root,'config/prompts.json'),'utf8')));
}
export function encodedModule(prompts) {
  const {_comments, ...runtimePrompts}=validatePrompts(prompts);
  const encoded=Buffer.from(JSON.stringify(runtimePrompts),'utf8').toString('base64');
  return `// Generated from config/prompts.json. Do not edit. Base64 is not encryption.\nexport const prompts = JSON.parse(new TextDecoder().decode(Uint8Array.from(atob("${encoded}"), c => c.charCodeAt(0))));\n`;
}
export async function generatePrompts(root=process.cwd()) {
  const source=encodedModule(await loadPrompts(root));
  await mkdir(path.join(root,'src/core'),{recursive:true});
  await writeFile(path.join(root,'src/core/prompts.generated.js'),source);
}
