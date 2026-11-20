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
// Factory Reset release gate: every Railway build must contain the exact
// operator-selected 20 November 2026 diagnostic profile. Without this check,
// a partial GitHub upload can successfully deploy the old config.mjs while
// the dashboard's Reset button returns HTTP 200 for the WRONG factory card.
// This contract is deterministic, broker-free and uses no production database.
const {freshInstallSettings,factoryOperatorSettingsPatch,sanitizeRuntimeSettings,
  LEDGER_FACTORY_OVERRIDES_20261120_144232,EDITABLE_NUMERIC_SETTINGS,
  EDITABLE_BOOLEAN_SETTINGS,SETTINGS_MIGRATION_FLAGS}=await import('../src/config.mjs');
const expectedFactory=freshInstallSettings(),resetPatch=factoryOperatorSettingsPatch();
let factoryChecks=0;
for(const [key,value] of Object.entries(LEDGER_FACTORY_OVERRIDES_20261120_144232)){
  if(expectedFactory[key]!==value||resetPatch[key]!==value)
    throw new Error(`railway_factory_profile_mismatch:${key}`);
  factoryChecks++;
}
for(const key of [...EDITABLE_NUMERIC_SETTINGS,...EDITABLE_BOOLEAN_SETTINGS]){
  if(SETTINGS_MIGRATION_FLAGS.includes(key)||key==='ci1WallCloneApplied')continue;
  if(!Object.hasOwn(resetPatch,key)||resetPatch[key]!==expectedFactory[key])
    throw new Error(`railway_factory_reset_incomplete:${key}`);
  factoryChecks++;
}
for(const key of ['mode','liveArmed','liveOwnerAuthorized','engineActive','ownerId',
  'systemName','resetTimestampMs','liveDashboardStartMs','simulationDashboardStartMs'])
  if(Object.hasOwn(resetPatch,key))throw new Error(`railway_factory_reset_unsafe_runtime_key:${key}`);
if(expectedFactory.starlightExtinctionRealTradeEnabled!==true)
  throw new Error('railway_starlight_capital_factory_mismatch');
const roundTrip=sanitizeRuntimeSettings({...expectedFactory,...resetPatch});
for(const [key,value] of Object.entries(resetPatch))
  if(roundTrip[key]!==value)throw new Error(`railway_factory_reset_not_persistent:${key}`);
console.log(`Factory Reset selected-ledger profile and ${factoryChecks} operator contract checks: PASS.`);

// Railway factory-settings certification (diagnostic 2026-11-20T15:13:12Z).
// Assert all 215 user-editable values, not only the changed keys. A partial
// GitHub upload retaining an older profile must fail at build time instead of
// returning HTTP 200 from Reset with the wrong operator-selected card.
const {LEDGER_FACTORY_OVERRIDES_20261120_151312}=await import('../src/config.mjs');
for(const [key,value] of Object.entries(LEDGER_FACTORY_OVERRIDES_20261120_151312)){
  if(expectedFactory[key]!==value||resetPatch[key]!==value)
    throw new Error(`railway_151312_factory_default_mismatch:${key}`);
}
if(Object.keys(resetPatch).length!==215)
  throw new Error('railway_151312_factory_field_count_mismatch');
const {createHash}=await import('node:crypto');
const factorySignature=createHash('sha256').update(JSON.stringify(
  Object.entries(resetPatch).sort(([a],[b])=>a.localeCompare(b)))).digest('hex');
if(factorySignature!=='93c7cb6ebaca3362ea3e90494028c3dc082dcbd25a7dca28dc3f22bebf680f80')
  throw new Error('railway_151312_full_factory_settings_signature_mismatch');
console.log('Factory Reset 2026-11-20T15:13:12 diagnostic profile, all 215 editable fields: PASS.');

// Railway release gate: syntax checking does not detect missing named ESM exports.
// Link the production engine/import graph without executing src/index.mjs,
// which starts the HTTP server and trading lifecycle. Any missing local export,
// missing installed dependency, or broken module link fails the BUILD, not boot.
const probe=String.raw`
  const [broker,engine,server,watchdog]=await Promise.all([
    import('./src/kalshi.mjs'),import('./src/engine.mjs'),
    import('./src/server.mjs'),import('./src/operationalWatchdog.mjs')
  ]);
  if(typeof broker.KalshiClient!=='function'||typeof engine.SagittariusEngine!=='function'
    ||typeof server.startServer!=='function'||typeof watchdog.ProcessSentinel!=='function')
    throw new Error('railway_runtime_entrypoint_export_missing');
`;
const linked=spawnSync(process.execPath,['--input-type=module','--eval',probe],
  {cwd:root,encoding:'utf8',timeout:30_000});
if(linked.status!==0){
  process.stderr.write(`Railway production module-link check failed\n${linked.stderr||linked.error||'unknown error'}\n`);
  process.exit(linked.status||1);
}
console.log(`Syntax validation passed: ${files.length} JavaScript modules.`);
console.log('Railway production module graph and entrypoint exports: PASS (no engine boot or broker order).');
