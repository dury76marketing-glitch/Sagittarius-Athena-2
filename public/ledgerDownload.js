// R5 verified ledger-download transport. This is dashboard-only and never
// modifies trading state, broker orders, settings, account credentials or DB.
// The backend owns the frozen financial cutoff and resumable cursor.
export async function fetchVerifiedLedger(fetcher, url, {
  maxAttempts=24, pause=ms=>new Promise(resolve=>setTimeout(resolve,ms)),
  onProgress=()=>{},
}={}){
  let exportId=null;
  for(let attempt=0;attempt<maxAttempts;attempt++){
    const response=await fetcher(url,{cache:'no-store'});
    if(response.status===202){
      const result=await response.json();
      if(result?.status!=='collecting'||result?.collectionComplete!==false
        ||result?.financialTotalsComplete!==false||typeof result.exportId!=='string')
        throw new Error('Unverified diagnostic collection response; no archive downloaded.');
      if(exportId!==null&&result.exportId!==exportId)
        throw new Error('Financial export context changed during download; restart the request.');
      exportId=result.exportId;
      const collected=Number(result.collectedRows),expected=Number(result.expectedRows);
      onProgress({collected:Number.isSafeInteger(collected)?collected:null,
        expected:Number.isSafeInteger(expected)?expected:null});
      await pause(Math.max(250,Math.min(2000,Number(result.retryAfterMs)||1000)));
      continue;
    }
    if(!response.ok)throw new Error(`Diagnostic download refused (HTTP ${response.status}); retry without changing trading settings.`);
    if(response.headers?.get('x-financial-collection-complete')!=='true'
      ||!String(response.headers?.get('content-type')||'').includes('application/zip'))
      throw new Error('Incomplete or unidentified export; refusing to download misleading financial totals.');
    const archive=await response.blob();
    if(!archive||archive.size<=0)throw new Error('Diagnostic archive is empty.');
    const disposition=String(response.headers.get('content-disposition')||'');
    const match=/filename="([^"\\/]+\.zip)"/.exec(disposition);
    return {archive,fileName:match?.[1]||'sagittarius-ledger.zip',
      rawEvidenceOmitted:response.headers.get('x-raw-evidence-omitted')==='true',
      exportId,attempts:attempt+1};
  }
  throw new Error('Ledger is still collecting. No partial archive was downloaded. Click again to resume the export.');
}

// Ordinary browser links stay accessible if JavaScript fails; the server
// still responds HTTP 202 rather than issuing an incomplete downloadable ZIP.
if(typeof document!=='undefined')for(const link of document.querySelectorAll('a[data-ledger-download]')){
  link.addEventListener('click',async(event)=>{
    event.preventDefault();
    if(link.dataset.collecting==='true')return;
    link.dataset.collecting='true';
    const original=link.textContent;
    link.setAttribute('aria-busy','true');
    try{
      const result=await fetchVerifiedLedger((url,options)=>fetch(url,options),link.getAttribute('href'),{
        onProgress:({collected,expected})=>{
          link.textContent=`Collecting ledger ${collected??'?'} / ${expected??'?'}...`;
        },
      });
      const blobUrl=URL.createObjectURL(result.archive);
      try{
        const download=document.createElement('a');
        download.href=blobUrl;download.download=result.fileName;
        document.body.appendChild(download);download.click();download.remove();
      }finally{setTimeout(()=>URL.revokeObjectURL(blobUrl),30000);}
      link.textContent=result.rawEvidenceOmitted?'Downloaded (raw history compacted)':'Downloaded';
    }catch(error){
      link.textContent='Retry diagnostics export';
      // Never expose broker bodies/credentials: helper emits bounded local errors.
      const status=document.getElementById('actionMessage');
      if(status){status.textContent=String(error?.message||'Diagnostic export unavailable');status.className='message negative';}
    }finally{
      link.dataset.collecting='false';link.removeAttribute('aria-busy');
      setTimeout(()=>{link.textContent=original;},6000);
    }
  });
}

if(typeof document!=='undefined'){
  const full=document.getElementById('fullTradingDiagnosticBtn');
  if(full)full.addEventListener('click',async(event)=>{
    event.preventDefault();
    if(full.dataset.collecting==='true')return;
    full.dataset.collecting='true';
    const original=full.textContent;
    full.textContent='Collecting full diagnostic...';
    try{
      const response=await fetch(full.getAttribute('href'),{cache:'no-store'});
      if(!response.ok)throw new Error('Full trading diagnostic unavailable');
      const blob=await response.blob();
      if(blob.size>3000000)throw new Error('Full trading diagnostic exceeded 3 MB');
      const url=URL.createObjectURL(blob);
      const a=document.createElement('a');
      a.href=url;a.download=`sagittarius-full-trading-diagnostic-${new Date().toISOString().replace(/[:.]/g,'-')}.zip`;
      document.body.appendChild(a);a.click();a.remove();
      setTimeout(()=>URL.revokeObjectURL(url),30000);
      full.textContent='Downloaded';
    }catch(error){
      full.textContent='Retry full diagnostic';
      const status=document.getElementById('actionMessage');
      if(status){status.textContent=String(error?.message||error).slice(0,180);status.className='message negative';}
    }finally{
      full.dataset.collecting='false';
      setTimeout(()=>{full.textContent=original;},6000);
    }
  });
}
