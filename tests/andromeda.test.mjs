import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { originalSettings, sanitizeRuntimeSettings, CANONICAL_BOOLEAN_SETTINGS } from '../src/config.mjs';
import { StrategyEngine } from '../src/strategy.mjs';
import {
  MARKET_FAMILY_EXECUTION_EXCLUSION,
  ANDROMEDA_THUNDER_WAVE,
  executionMarketFamilyExclusion,
  resolveAndromedaThunderWave,
} from '../src/doctrine.mjs';

const q=(ticker,bid=70,ask=71)=>({ticker,eventTicker:ticker,title:ticker,sport:'Test',yesBid:bid,yesAsk:ask,volume24h:10000,status:'active',result:'',updatedAtMs:Date.now(),closeTimeMs:Date.now()+60*60_000});
const settings=(overrides={})=>({...originalSettings(),systemName:'SAGITTARIUS',ownerId:'andromeda-test',mode:'SIMULATION',liveArmed:false,engineActive:true,athenaExclamationEnabled:true,scarletNeedleEnabled:true,justiceArrowEnabled:true,momentumHunterEnabled:true,waveSurferEnabled:true,crashRecoveryHunterEnabled:true,lightningPlasmaEnabled:true,athenaExclamationFollowUpAttacks:6,maxEntriesPerTrade:20,...overrides});
function memoryDb(){
  const rows=new Map(),audits=[];
  return {rows,audits,
    async audit(level,event,data){audits.push({level,event,data});},
    async entriesByConceptTicker(){return [];},
    async entriesByConcept(){return [];},
    async entryById(){return null;},
    async insertEntry(e){rows.set(String(e.id),structuredClone(e));return e;},
    async entries(){return [...rows.values()].map(x=>structuredClone(x));},
    async updateEntry(){},
    async openEntries(){return [];},
    async openEntriesByTicker(){return [];},
    async openHunterEntriesByTicker(){return [];},
    async acquireHunterTickerLock(){return async()=>{};},
  };
}

const HIGH=['KXWTACHALLENGERMATCH-26SEP16-A','KXATPCHALLENGERMATCH-26SEP16-B','KXITFWMATCH-26SEP16-C','KXT20MATCH-26SEP16-D','KXUAEPLGAME-26SEP16-E','KXNPBGAME-26SEP16-F','KXMLBGAME-26SEP16ALLOW-TIE'];
const MID=['KXITFMATCH-26SEP16-H','KXCS2GAME-26SEP16-J','KXDIMAYORGAME-26SEP16-E','KXBUNDESLIGA2GAME-26SEP16-F'];
const LOW=['KXMLBGAME-26SEP16ALLOW-ONE','KXWTAMATCH-26SEP16-B','KXVALORANTGAME-26SEP16-C'];

test('Andromeda doctrine: OFF and HIGH keep the full MFE1 ban including Mid families',()=>{
  assert.equal(ANDROMEDA_THUNDER_WAVE.version,'ANDROMEDA-THUNDER-WAVE-A1');
  assert.deepEqual([...ANDROMEDA_THUNDER_WAVE.levels],['HIGH','MID','LOW']);
  for(const s of [undefined, settings(), settings({andromedaThunderWaveEnabled:false,andromedaThunderWaveLevel:'MID'}), settings({andromedaThunderWaveEnabled:true,andromedaThunderWaveLevel:'HIGH'})]){
    for(const ticker of [...HIGH,...MID]){
      const out=executionMarketFamilyExclusion(ticker,s);
      assert.equal(out.blocked,true,`${ticker} must stay banned at HIGH/OFF`);
    }
    for(const ticker of LOW.filter((t)=>!t.endsWith('-TIE'))){
      assert.equal(executionMarketFamilyExclusion(ticker,s).blocked,false,ticker);
    }
  }
});

test('Andromeda MID and LOW unlock only the Mid list; HIGH families and -TIE stay banned',()=>{
  for(const level of ['MID','LOW']){
    const s=settings({andromedaThunderWaveEnabled:true,andromedaThunderWaveLevel:level});
    assert.equal(resolveAndromedaThunderWave(s).level,level);
    for(const ticker of MID){
      const out=executionMarketFamilyExclusion(ticker,s);
      assert.equal(out.blocked,false,`${level} must unlock ${ticker}`);
    }
    for(const ticker of HIGH){
      const out=executionMarketFamilyExclusion(ticker,s);
      assert.equal(out.blocked,true,`${level} must still ban ${ticker}`);
    }
  }
});

test('Andromeda hydrate clamps junk levels and forces HIGH when the wave is off',()=>{
  const off=sanitizeRuntimeSettings({andromedaThunderWaveEnabled:false,andromedaThunderWaveLevel:'MID'});
  assert.equal(off.andromedaThunderWaveEnabled,false);
  assert.equal(off.andromedaThunderWaveLevel,'HIGH');
  const mid=sanitizeRuntimeSettings({andromedaThunderWaveEnabled:true,andromedaThunderWaveLevel:'medium'});
  assert.equal(mid.andromedaThunderWaveEnabled,true);
  assert.equal(mid.andromedaThunderWaveLevel,'MID');
  const junk=sanitizeRuntimeSettings({andromedaThunderWaveEnabled:true,andromedaThunderWaveLevel:'PLANET'});
  assert.equal(junk.andromedaThunderWaveLevel,'HIGH');
  assert.ok(CANONICAL_BOOLEAN_SETTINGS.includes('andromedaThunderWaveEnabled'));
});

test('Andromeda virtual SIM: HIGH createHunter dies on MFE; MID ITF/CS2 pass MFE and fail later Mega Wave doctrine',async()=>{
  const high=settings({andromedaThunderWaveEnabled:true,andromedaThunderWaveLevel:'HIGH'});
  const mid=settings({andromedaThunderWaveEnabled:true,andromedaThunderWaveLevel:'MID'});
  const highDb=memoryDb(), midDb=memoryDb();
  const highSt=new StrategyEngine({db:highDb,kalshi:{},market:{async refreshTicker(){throw new Error('refresh_forbidden');}},learning:{},getSettings:()=>high,getLiveReady:()=>false,random:()=>0});
  const midSt=new StrategyEngine({db:midDb,kalshi:{},market:{async refreshTicker(){throw new Error('refresh_forbidden');}},learning:{},getSettings:()=>mid,getLiveReady:()=>false,random:()=>0});
  for(const ticker of ['KXITFMATCH-26SEP16-H','KXCS2GAME-26SEP16-J']){
    assert.equal(await highSt.createHunter('Athena Exclamation',q(ticker),100,0,{legacyCompatibility:false}),null);
    assert.equal(await midSt.createHunter('Athena Exclamation',q(ticker),100,0,{legacyCompatibility:false}),null);
  }
  const highReasons=highSt.entryPipelineSummary().byReason||{};
  const midReasons=midSt.entryPipelineSummary().byReason||{};
  assert.ok((highReasons[MARKET_FAMILY_EXECUTION_EXCLUSION.reasonCode]||0)>=2,JSON.stringify(highReasons));
  assert.equal(midReasons[MARKET_FAMILY_EXECUTION_EXCLUSION.reasonCode]||0,0,JSON.stringify(midReasons));
  assert.ok((midReasons.triple_crystal_athena_authority_required||midReasons.profitable_athena_parent_authority_required||0)>=1,JSON.stringify(midReasons));
  assert.equal(highDb.rows.size,0);
  assert.equal(midDb.rows.size,0);
});

test('Andromeda virtual SIM: twelve rooms can hold different intensities on the same ticker',()=>{
  const rooms=[
    ['ARIES','HIGH'],['TAURUS','HIGH'],['GEMINI','MID'],['CANCER','MID'],
    ['LEO','LOW'],['VIRGO','LOW'],['LIBRA','HIGH'],['SCORPIO','MID'],
    ['SAGITTARIUS','HIGH'],['CAPRICORN','LOW'],['AQUARIUS','MID'],['PISCES','HIGH'],
  ];
  const ticker='KXITFMATCH-26SEP16NAWHAS-HAS';
  const opened=[];
  for(const [id,level] of rooms){
    const s=settings({systemName:id,andromedaThunderWaveEnabled:true,andromedaThunderWaveLevel:level});
    const blocked=executionMarketFamilyExclusion(ticker,s).blocked;
    if(!blocked) opened.push(id);
    if(level==='HIGH') assert.equal(blocked,true,id);
    else assert.equal(blocked,false,id);
  }
  assert.deepEqual(opened,['GEMINI','CANCER','LEO','VIRGO','SCORPIO','CAPRICORN','AQUARIUS']);
  assert.equal(executionMarketFamilyExclusion('KXWTACHALLENGERMATCH-26SEP16-A',settings({andromedaThunderWaveEnabled:true,andromedaThunderWaveLevel:'LOW'})).blocked,true);
});

test('Andromeda homepage card sits under Athena/Saint subset and writes the subset keys',async()=>{
  const html=await readFile(new URL('../public/index.html',import.meta.url),'utf8');
  const app=await readFile(new URL('../public/app.js',import.meta.url),'utf8');
  const saintAt=html.indexOf('id="saintSubsetFold"');
  const andromedaAt=html.indexOf('id="andromedaSubsetFold"');
  const atomicAt=html.indexOf('id="atomicThunderBoltSection"');
  assert.ok(saintAt>0&&andromedaAt>saintAt&&atomicAt>andromedaAt,'Andromeda fold must sit under saints and above Atomic Thunder');
  assert.ok(app.includes('andromedaThunderWaveEnabled'));
  assert.ok(app.includes('andromedaThunderWaveLevel'));
  assert.ok(app.includes('andromedaThunderWaveToggle'));
});



test('Andromeda ON/OFF toggle saves the fleet without Crystal Wall ticks', async () => {
  const app=await readFile(new URL('../public/app.js',import.meta.url),'utf8');
  const html=await readFile(new URL('../public/index.html',import.meta.url),'utf8');
  const engine=await readFile(new URL('../src/engine.mjs',import.meta.url),'utf8');
  assert.ok(html.includes('id="andromedaThunderWaveToggle"'));
  assert.equal(html.includes('subsetAndromedaEnabled'), false);
  assert.equal(html.includes('subsetAndromedaApplyBtn'), false);
  assert.ok(app.includes('saveAndromedaFleet'));
  assert.ok(app.includes("post('/api/cosmos/subset',{ids:[],patch})"));
  assert.ok(engine.includes('andromedaPatch?[...COSMOS_IDS]:selected'));
  assert.ok(engine.includes('broadcastHost'));
});

test('Crystal Wall subset still requires ticks and Andromeda toggle ignores those ticks', async () => {
  const app=await readFile(new URL('../public/app.js',import.meta.url),'utf8');
  const engine=await readFile(new URL('../src/engine.mjs',import.meta.url),'utf8');
  const cw=app.slice(app.indexOf('subsetApplyBtn'), app.indexOf('subsetSaintApplyBtn'));
  assert.ok(cw.includes("if(!ids.length)return msg('Select at least one cosmos.',true);"));
  assert.equal(cw.includes('andromedaThunderWaveEnabled'), false);
  assert.ok(app.includes('andromedaThunderWaveToggle'));
  assert.ok(engine.includes('andromedaPatch?[...COSMOS_IDS]:selected'));
});

test('syncCosmosWindowsFromSettings keeps Andromeda on the room cache after a host save', async () => {
  const engine=await readFile(new URL('../src/engine.mjs',import.meta.url),'utf8');
  const app=await readFile(new URL('../public/app.js',import.meta.url),'utf8');
  const html=await readFile(new URL('../public/index.html',import.meta.url),'utf8');
  assert.ok(engine.includes('andromedaSnapshotFromSettings'));
  assert.ok(engine.includes('...andromeda'));
  assert.ok(app.includes('andromedaStatus'));
  assert.ok(html.includes('id="andromedaStatus"'));
  assert.ok(app.includes("hostOn?'ON':'OFF'"));
});

test('Athena Exclamation event insert stringifies JSON columns', async () => {
  const db=await readFile(new URL('../src/db.mjs',import.meta.url),'utf8');
  assert.ok(db.includes('JSON.stringify(e.saints||[])'));
  assert.ok(db.includes('JSON.stringify(e.combination||[])'));
});
