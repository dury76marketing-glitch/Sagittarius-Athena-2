// Explicit operator command. No automatic restore or deletion of financial data.
import {spawn} from 'node:child_process';
import {createReadStream} from 'node:fs';
import {mkdir,writeFile,chmod} from 'node:fs/promises';
import {resolve,join} from 'node:path';
import {createHash} from 'node:crypto';
import {BUILD_INFO} from '../src/authority.mjs';
const output=process.argv[2];
if(!output||!process.env.DATABASE_URL)throw new Error('Usage: DATABASE_URL=<secret> node scripts/ops-backup.mjs <private-backup-directory>');
process.umask(0o077);
await mkdir(resolve(output),{recursive:true,mode:0o700});
const file=join(resolve(output),'sagittarius-'+new Date().toISOString().replace(/[:.]/g,'-')+'.dump');
function command(binary,args){return new Promise((ok,fail)=>{
  const child=spawn(binary,args,{env:{...process.env,PGDATABASE:process.env.DATABASE_URL},stdio:['ignore','ignore','ignore']});
  child.on('error',()=>fail(new Error(binary+'_unavailable')));
  child.on('exit',code=>code===0?ok():fail(new Error(binary+'_failed_'+code)));
});}
await command('pg_dump',['--format=custom','--no-owner','--file',file]);
await chmod(file,0o600);await command('pg_restore',['--list',file]);
const h=createHash('sha256');for await(const chunk of createReadStream(file))h.update(chunk);
const manifest={file,sha256:h.digest('hex'),createdAt:new Date().toISOString(),source:BUILD_INFO.sourceSha256,
  archiveReadable:true,restoreRehearsalPerformed:false,remoteBackupVerified:false};
await writeFile(file+'.manifest.json',JSON.stringify(manifest,null,2),{mode:0o600});
console.log(JSON.stringify(manifest));
