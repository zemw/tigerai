import { mkdir, cp, rm, readFile, writeFile, readdir } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import path from 'node:path';
async function files(directory) {
  const entries=await readdir(directory,{withFileTypes:true});
  const nested=await Promise.all(entries.map(entry=>{
    const file=path.join(directory,entry.name);
    return entry.isDirectory()?files(file):[file];
  }));
  return nested.flat().sort();
}
// A changed page, stylesheet, or module gets a new asset directory. Relative
// module imports then stay inside the same release, even in a long-lived tab.
const hash=createHash('sha256');
for(const file of ['index.html','style.css',...await files('src')]) {
  hash.update(file);hash.update('\0');hash.update(await readFile(file));hash.update('\0');
}
const assets=`assets/${hash.digest('hex').slice(0,16)}`;
await rm('dist', {recursive:true,force:true});
await mkdir(`dist/${assets}`,{recursive:true});
await cp('src',`dist/${assets}/src`,{recursive:true});
await cp('style.css',`dist/${assets}/style.css`);
const html=(await readFile('index.html','utf8'))
  .replace('href="./style.css"',`href="./${assets}/style.css"`)
  .replace('src="./src/ui.js"',`src="./${assets}/src/ui.js"`);
await writeFile('dist/index.html',html);
await cp('LICENSE','dist/LICENSE');
