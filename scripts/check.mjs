#!/usr/bin/env node
// Syntax-only verification, deliberately not a substitute for the release gate.
import { readdirSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawnSync } from 'node:child_process';
const root=dirname(dirname(fileURLToPath(import.meta.url)));
const files=[];
function collect(dir){
  for(const item of readdirSync(dir,{withFileTypes:true}).sort((a,b)=>a.name.localeCompare(b.name))){
    const path=join(dir,item.name);
    if(item.isDirectory())collect(path);
    else if(/\.(mjs|cjs|js)$/.test(item.name))files.push(path);
  }
}
for(const dir of ['src','public','scripts'])collect(join(root,dir));
for(const file of files){
  const result=spawnSync(process.execPath,['--check',file],{cwd:root,encoding:'utf8'});
  if(result.status!==0){
    process.stderr.write(result.stderr||`Could not check ${file}\n`);
    process.exit(result.status||1);
  }
}
console.log(`Syntax validation passed: ${files.length} JavaScript modules. No runtime/integration claim.`);
