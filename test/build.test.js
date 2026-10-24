import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtemp, mkdir, writeFile, readFile, rm, access} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import path from 'node:path';
import {execFileSync} from 'node:child_process';
const script=new URL('../scripts/build.mjs',import.meta.url);
test('build versions the entire module graph and updates URLs when an imported module changes',async()=>{
 const dir=await mkdtemp(path.join(tmpdir(),'tigerai-build-'));
 try{
  await mkdir(path.join(dir,'src/core'),{recursive:true});
  await writeFile(path.join(dir,'index.html'),'<link href="./style.css"><script type="module" src="./src/ui.js"></script>');
  await writeFile(path.join(dir,'style.css'),'body{}');await writeFile(path.join(dir,'LICENSE'),'test');
  await writeFile(path.join(dir,'src/ui.js'),"import './core/test.js';");await writeFile(path.join(dir,'src/core/test.js'),'export const version=1;');
  const build=async()=>{execFileSync(process.execPath,[script.pathname],{cwd:dir});return readFile(path.join(dir,'dist/index.html'),'utf8');};
  const first=await build();const prefix=first.match(/assets\/[a-f0-9]{16}/)[0];
  assert.ok(first.includes(`href="./${prefix}/style.css"`));assert.ok(first.includes(`src="./${prefix}/src/ui.js"`));
  await access(path.join(dir,'dist',prefix,'src/core/test.js'));
  assert.equal(await build(),first);
  await writeFile(path.join(dir,'src/core/test.js'),'export const version=2;');
  const second=await build();assert.notEqual(second,first);
  assert.equal(await readFile(path.join(dir,'dist',second.match(/assets\/[a-f0-9]{16}/)[0],'src/core/test.js'),'utf8'),'export const version=2;');
 }finally{await rm(dir,{recursive:true,force:true});}
});
