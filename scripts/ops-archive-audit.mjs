// Read-only audit archive with a bounded server cursor. Does NOT prune the DB.
import pg from 'pg';
import {open,mkdir,writeFile} from 'node:fs/promises';
import {resolve,join} from 'node:path';
import {createHash} from 'node:crypto';
const directory=process.argv[2];if(!directory||!process.env.DATABASE_URL)throw new Error('Usage: DATABASE_URL=<secret> node scripts/ops-archive-audit.mjs <private-directory>');
process.umask(0o077);await mkdir(resolve(directory),{recursive:true,mode:0o700});
const client=new pg.Client({connectionString:process.env.DATABASE_URL,connectionTimeoutMillis:5000,statement_timeout:30000});
const file=join(resolve(directory),'audit-'+Date.now()+'.jsonl'),output=await open(file,'wx',0o600),hash=createHash('sha256');
let count=0,lastId=null;
try{
  await client.connect();await client.query('begin isolation level repeatable read read only');
  await client.query('declare sag_audit_archive no scroll cursor for select id,ts,level,event,data from sag_audit order by id');
  while(true){const r=await client.query('fetch forward 128 from sag_audit_archive');if(!r.rows.length)break;
    for(const row of r.rows){const line=JSON.stringify(row)+'\n';await output.writeFile(line);hash.update(line);count++;lastId=row.id;}}
  await client.query('close sag_audit_archive');await client.query('commit');await output.sync();
  await writeFile(file+'.manifest.json',JSON.stringify({file,count,lastId,sha256:hash.digest('hex'),databaseRowsDeleted:0,remoteArchiveVerified:false},null,2),{mode:0o600});
  console.log(JSON.stringify({file,count,lastId,databaseRowsDeleted:0}));
}catch(error){await client.query('rollback').catch(()=>{});console.error('Audit archive incomplete; no DB records were deleted.');process.exitCode=1;}
finally{await output.close();await client.end().catch(()=>{});}
