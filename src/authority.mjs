import { createHash } from 'node:crypto';
import { readFileSync, readdirSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { join } from 'node:path';

export function canonicalJson(value){
  if(value===null||value===undefined)return JSON.stringify(value??null);
  if(Array.isArray(value))return`[${value.map(canonicalJson).join(',')}]`;
  if(typeof value==='object')return`{${Object.keys(value).sort().map(k=>`${JSON.stringify(k)}:${canonicalJson(value[k])}`).join(',')}}`;
  return JSON.stringify(value);
}
export function authorityHash(value){return createHash('sha256').update(canonicalJson(value)).digest('hex');}
export function sealAthenaFireCommand(core={}){const clean=structuredClone(core);delete clean.commandHash;return Object.freeze({...clean,commandHash:authorityHash(clean)});}
export function verifyAthenaFireCommandHash(command={}){if(!command||typeof command!=='object'||!command.commandHash)return false;const clean=structuredClone(command);const provided=String(clean.commandHash);delete clean.commandHash;return authorityHash(clean)===provided;}

// CQ3: observation identity belongs to the market adapter, not processing time.
export function observationOrder(prior, incoming, priorTime=0, incomingTime=0) {
  if (prior?.epoch && incoming?.epoch === prior.epoch) {
    return Math.sign(Number(incoming.revision || 0)-Number(prior.revision || 0));
  }
  const delta=Number(incomingTime||0)-Number(priorTime||0);
  if(delta)return Math.sign(delta);
  // A new adapter lifetime has its own revision space. Never compare sequence
  // counters across connections/processes. The adapter has already ordered it.
  return incoming?.epoch && incoming?.revision>0 ? 1 : 0;
}

export function quoteObservedAt(q) {
  return Number(q?.quoteAtMs || q?.updatedAtMs || q?.observedAtMs || 0);
}


const root=fileURLToPath(new URL('../',import.meta.url));
const files=[];
function collect(dir){for(const item of readdirSync(join(root,dir),{withFileTypes:true}).sort((a,b)=>a.name.localeCompare(b.name))){const name=`${dir}/${item.name}`;if(item.isDirectory())collect(name);else if(item.isFile())files.push(name);}}
collect('src');collect('public');
files.push('package.json','package-lock.json','railway.json');
const hash=createHash('sha256');
for(const file of files.sort()){hash.update(file);hash.update('\0');hash.update(readFileSync(join(root,file)));hash.update('\0');}
export const BUILD_INFO=Object.freeze({id:'SAGITTARIUS-AU2-SA1-R3-RAILWAY-BUILD-2026-10-13',sourceSha256:hash.digest('hex'),railwayCommit:process.env.RAILWAY_GIT_COMMIT_SHA||null});
