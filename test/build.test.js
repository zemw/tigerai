import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtemp, mkdir, writeFile, readFile, rm, readdir} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import path from 'node:path';
import {execFileSync} from 'node:child_process';
import {validatePrompts, encodedModule} from '../scripts/prompt-config.mjs';
const script=new URL('../scripts/build.mjs',import.meta.url);
const prompts={character:'UNIQUE_CHARACTER_大學',identity:'UNIQUE_IDENTITY',rules:[{id:'first',enabled:true,text:'UNIQUE_RULE_ONE'},{id:'second',enabled:false,text:'UNIQUE_RULE_TWO'}]};
test('prompt configuration validates IDs, booleans and text; encoded output preserves Unicode and rule order',async()=>{
 const module=encodedModule(prompts);
 assert.ok(!module.includes(prompts.character));assert.ok(!module.includes('UNIQUE_RULE_ONE'));
 const decoded=await import(`data:text/javascript;base64,${Buffer.from(module).toString('base64')}`);
 assert.deepEqual(decoded.prompts,prompts);
 assert.throws(()=>validatePrompts({...prompts,rules:[prompts.rules[0],prompts.rules[0]]}),/duplicate/);
 assert.throws(()=>validatePrompts({...prompts,rules:[{id:'x',enabled:'true',text:'test'}]}),/boolean/);
 assert.throws(()=>validatePrompts({...prompts,character:''}),/nonempty/);
});
test('production bundles, minifies and encodes JSON; asset URLs change with nested code and prompt edits',async()=>{
 const dir=await mkdtemp(path.join(tmpdir(),'tigerai-build-'));
 try{
  await mkdir(path.join(dir,'src/core'),{recursive:true});await mkdir(path.join(dir,'config'));
  await writeFile(path.join(dir,'config/prompts.json'),JSON.stringify(prompts));
  await writeFile(path.join(dir,'index.html'),'<link href="./style.css"><script type="module" src="./src/ui.js"></script>');
  await writeFile(path.join(dir,'style.css'),'body { color: black; }');await writeFile(path.join(dir,'LICENSE'),'test');
  await writeFile(path.join(dir,'src/ui.js'),"import {prompts} from './core/prompts.generated.js'; import {version} from './core/test.js'; globalThis.testResult = {prompts,version};");
  await writeFile(path.join(dir,'src/core/test.js'),'// READABLE_COMMENT\nexport const version = 123456;');
  const build=async()=>{execFileSync(process.execPath,[script.pathname],{cwd:dir,stdio:'pipe'});return readFile(path.join(dir,'dist/index.html'),'utf8');};
  const first=await build();const prefix=first.match(/assets\/[a-f0-9]{16}/)[0];
  assert.ok(first.includes(`href="./${prefix}/style.css"`));assert.ok(first.includes(`src="./${prefix}/app.js"`));
  assert.deepEqual((await readdir(path.join(dir,'dist'))).sort(),['LICENSE','assets','index.html']);
  assert.deepEqual((await readdir(path.join(dir,'dist',prefix))).sort(),['app.js','style.css']);
  const js=await readFile(path.join(dir,'dist',prefix,'app.js'),'utf8');
  for(const text of ['UNIQUE_CHARACTER','UNIQUE_IDENTITY','UNIQUE_RULE_ONE','READABLE_COMMENT','sourceMappingURL'])assert.ok(!js.includes(text));
  assert.ok(js.includes('123456'));assert.ok(js.split('\n').length<=4);
  const vm=await import('node:vm');const sandbox={TextDecoder,Uint8Array,atob};vm.runInNewContext(js,sandbox);
  assert.deepEqual(JSON.parse(JSON.stringify(sandbox.testResult)),{prompts,version:123456});
  assert.equal(await build(),first);
  await writeFile(path.join(dir,'src/core/test.js'),'export const version=654321;');assert.notEqual(await build(),first);
  const before=await build();await writeFile(path.join(dir,'config/prompts.json'),JSON.stringify({...prompts,character:'CHANGED_CHARACTER'}));assert.notEqual(await build(),before);
  await writeFile(path.join(dir,'config/prompts.json'),JSON.stringify({...prompts,identity:null}));
  assert.throws(()=>execFileSync(process.execPath,[script.pathname],{cwd:dir,stdio:'pipe'}));
 }finally{await rm(dir,{recursive:true,force:true});}
});
