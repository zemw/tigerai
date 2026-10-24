import { mkdir, cp, rm, readFile, writeFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import { build, transform } from 'esbuild';
import { generatePrompts } from './prompt-config.mjs';
await generatePrompts();
// Build in memory first: invalid configuration or bundling failures leave the
// previous output intact. Only generated Base64 prompt configuration is bundled.
const result=await build({
  entryPoints:['src/ui.js'],bundle:true,minify:true,write:false,
  format:'esm',platform:'browser',target:['es2022','safari15.4'],
  sourcemap:false,legalComments:'none',
  banner:{js:'/*! TigerAI | Noncommercial Source-Sharing License 1.1 | See /tigerai/LICENSE and https://github.com/zemw/tigerai */'}
});
const js=result.outputFiles[0].contents;
const css=(await transform(await readFile('style.css','utf8'),{loader:'css',minify:true,target:'safari15.4'})).code;
const template=await readFile('index.html','utf8');
// Version the finished assets, preserving the Safari cache consistency fix.
const hash=createHash('sha256').update(template).update('\0').update(js).update('\0').update(css).digest('hex').slice(0,16);
const assets=`assets/${hash}`;
await rm('dist',{recursive:true,force:true});
await mkdir(`dist/${assets}`,{recursive:true});
await writeFile(`dist/${assets}/app.js`,js);
await writeFile(`dist/${assets}/style.css`,css);
await writeFile('dist/index.html',template
  .replace('href="./style.css"',`href="./${assets}/style.css"`)
  .replace('src="./src/ui.js"',`src="./${assets}/app.js"`));
await cp('LICENSE','dist/LICENSE');
console.log(`Built ${assets}/app.js (${js.byteLength.toLocaleString()} bytes); editable source and JSON excluded from dist.`);
