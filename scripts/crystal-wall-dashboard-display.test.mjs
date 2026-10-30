#!/usr/bin/env node
/** Display-only CW1 regression checks. No broker or database writes. */
import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const app=readFileSync(new URL('../public/app.js',import.meta.url),'utf8');
const html=readFileSync(new URL('../public/index.html',import.meta.url),'utf8');
const css=readFileSync(new URL('../public/styles.css',import.meta.url),'utf8');
const cwSettingKeys=[
 'crystalWallRecoveryStakeCents','crystalWallRecoveryMinEntryCents',
 'crystalWallRecoveryMaxEntryCents','crystalWallRecoveryMaxSpreadCents',
 'crystalWallRecoveryMinCrashCents','crystalWallRecoveryMinReboundCents',
 'crystalWallRecoveryMinUpwardTicks','crystalWallRecoveryObservationMinutes',
 'crystalWallRecoveryParentEntryRiseCents',
 'crystalWallRecoveryMinProfitNetPerOriginalContractCents',
 'crystalWallRecoveryAuroraDamageControlPercent','crystalWallRecoveryMultiply',
 'crystalWallRecoveryAthenaX1Enabled','crystalWallRecoveryLinkEnabled',
 'crystalWallRecoveryEnabled'];
test('CW1 and historical Recovery Hunter retain distinct internal identities',()=>{
 assert.match(app,/legacy:'Recovery Hunter',name:'Recovery Hunter \(legacy CI1\)'/);
 assert.match(app,/legacy:'Crystal Wall Recovery',name:'Crystal Wall — GH recovery'/);
 assert.match(app,/key:'recoveryHunterEnabled'/);
 assert.match(app,/key:'crystalWallRecoveryEnabled'/);
 assert.match(html,/NOT historical Recovery Hunter \(legacy CI1\)/);
});
test('New CW1 card keeps every cloned independent Great Horn operator setting',()=>{
 for(const key of cwSettingKeys)assert.ok(app.includes(key),key);
 assert.match(app,/data-model-key="crystalWallRecoveryLinkEnabled"/);
 assert.match(app,/data-model-key="\$\{esc\(a\.x1\)\}"/);
 assert.match(app,/data-model-save="\$\{esc\(a\.legacy\)\}"/);
 assert.match(app,/id="crystalWallRecoverySettings"/);
});
test('CW1 performance is a visible horizontal table, with exact audited-only cells',()=>{
 assert.match(html,/class="table-wrap cw-results-table"/);
 for(const id of ['cwTableAvg','cwTableEntries','cwTableOpen','cwTableClosed',
  'cwTableWinsLosses','cwTableRate','cwTablePending','cwTableRealized','cwTableUnrealized'])
  assert.match(html,new RegExp('id="'+id+'"'));
 assert.match(app,/const rowMetrics=attackDisplayMetrics\(s,\{legacy:'Crystal Wall Recovery'\}\)/);
 assert.match(app,/setFinancialPnl\('cwTableUnrealized'/);
});
test('CW1 independent results update while operator is editing',()=>{
 assert.match(app,/renderCrystalWallFinancialDetail\(s\)/);
 assert.match(app,/renderAttackMetrics\(s\)/);
 assert.match(app,/const editing=!!document.activeElement\?\.matches\('\[data-setting-key\]'\)/);
 assert.match(app,/Financial statistics must never share the editing lifecycle/);
});
test('CW1 accounting remains read-only, separately scoped and excludes legacy',()=>{
 assert.match(app,/verifiedCrystalWallRecoveryPerformance\(s\)/);
 assert.match(app,/financialScopeMatches\(a.scope,settings\)/);
 assert.match(app,/s\?\.crystalWallRecoveryPerformance/);
 assert.match(app,/isCapitalCrystalWallRecovery/);
 assert.match(app,/Matching Lightning Plasma, Great Horn and Crystal Wall capital reports/);
});
test('Settings jump points to CW1, not legacy CI1, and remains visible if CW1 OFF',()=>{
 assert.match(html,/href="#crystalWallRecoverySettings"/);
 assert.match(css,/#crystalWallRecoverySettings\.model-disabled td:not\(:nth-child\(3\)\)\{opacity:1\}/);
 assert.match(css,/#crystalWallRecoverySettings:target/);
});
test('No password, login, user-account or trading-doctrine change in UI patch',()=>{
 assert.doesNotMatch(html,/type="password"/);
 assert.doesNotMatch(app,/fetch\('\/api\/login'\)/);
 assert.match(app,/const operatorFetch=\(url,options=\{\}\)=>fetch\(url,options\)/);
});
