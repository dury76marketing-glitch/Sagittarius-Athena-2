// MBR1 - bounded, priority-aware admission for NON-AUTHORITATIVE background
// REST orderbook recovery only. Explicit executable quote verification and
// capital protection are deliberately outside this scheduler. No result of
// this queue can confer order, fill, or settlement authority.
export const BACKGROUND_BOOK_RECOVERY = Object.freeze({
  version:'MBR1-BOUNDED-REST-RECOVERY',
  maxConcurrent:2,
  maxResearchConcurrent:1,
  maxProtectedPending:64,
  maxResearchPending:256,
  maxResearchWaitMs:20_000,
  maxProtectedWaitMs:20_000,
});

export class BackgroundBookRecovery {
  constructor(config=BACKGROUND_BOOK_RECOVERY){
    this.config=config;
    this.pending=[];
    this.active=0;
    this.activeResearch=0;
    this.closed=false;
    this.dispatched=0;
    this.completed=0;
    this.shedResearch=0;
    this.shedProtected=0;
    this.skippedObsolete=0;
    this.skippedExpired=0;
    this.maximumWaitMs=0;
    this.totalWaitMs=0;
    this.maximumPending=0;
    this.maximumActive=0;
  }
  // Priority is queried at DISPATCH as a durable watch/open owner can appear
  // after an unprotected market was originally queued.
  classOf(job){
    const n=Number(job?.priority?.());
    return Number.isInteger(n)&&n>=0&&n<=2?n:2;
  }
  submit({ticker,priority,needed,work}){
    if(this.closed||typeof ticker!=='string'||!ticker||typeof work!=='function')return Promise.resolve(null);
    if(typeof needed==='function'&&!needed()){this.skippedObsolete++;return Promise.resolve(null);}
    const candidate={ticker,priority,needed,work};
    const kind=this.classOf(candidate);
    const pending=this.pending.reduce((count,j)=>count+(kind===2
      ?this.classOf(j)===2:this.classOf(j)!==2?1:0),0);
    if(pending>=(kind===2?this.config.maxResearchPending:this.config.maxProtectedPending)){
      if(kind===2)this.shedResearch++;else this.shedProtected++;
      return Promise.resolve(null);
    }
    return new Promise((resolve,reject)=>{
      this.pending.push({...candidate,resolve,reject,queuedAtMs:Date.now()});
      this.maximumPending=Math.max(this.maximumPending,this.pending.length);
      this.pump();
    });
  }
  pump(){
    while(!this.closed&&this.active<this.config.maxConcurrent&&this.pending.length){
      let index=-1,tier=Infinity;
      for(let i=0;i<this.pending.length;i++){
        const job=this.pending[i];
        if(typeof job.needed==='function'&&!job.needed()){
          this.pending.splice(i,1);i--;
          this.skippedObsolete++;job.resolve(null);continue;
        }
        const kind=this.classOf(job);
        const maxWait=kind===2?this.config.maxResearchWaitMs:this.config.maxProtectedWaitMs;
        if(Date.now()-job.queuedAtMs>maxWait){
          this.pending.splice(i,1);i--;
          this.skippedExpired++;job.resolve(null);continue;
        }
        if(kind===2&&this.activeResearch>=this.config.maxResearchConcurrent)continue;
        if(kind<tier){tier=kind;index=i;if(tier===0)break;}
      }
      if(index<0)break;
      const [job]=this.pending.splice(index,1);
      const wait=Math.max(0,Date.now()-job.queuedAtMs);
      this.maximumWaitMs=Math.max(this.maximumWaitMs,wait);
      this.totalWaitMs+=wait;
      const research=tier===2;
      this.active++;if(research)this.activeResearch++;
      this.maximumActive=Math.max(this.maximumActive,this.active);
      this.dispatched++;
      // Do not treat broker failures as success; the caller's existing
      // fail-closed catch and freshness/sequence logic still control results.
      void Promise.resolve().then(job.work).then(job.resolve,job.reject).finally(()=>{
        this.active--;if(research)this.activeResearch--;
        this.completed++;this.pump();
      });
    }
  }
  dropUnwanted(keep){
    for(let i=this.pending.length-1;i>=0;i--){
      const job=this.pending[i];
      if(keep.has(job.ticker))continue;
      this.pending.splice(i,1);this.skippedObsolete++;job.resolve(null);
    }
  }
  close(){
    this.closed=true;
    for(const job of this.pending)job.resolve(null);
    this.skippedObsolete+=this.pending.length;
    this.pending.length=0;
  }
  snapshot(){return{
    version:this.config.version,active:this.active,activeResearch:this.activeResearch,
    pending:this.pending.length,pendingProtected:this.pending.filter(j=>this.classOf(j)!==2).length,
    pendingResearch:this.pending.filter(j=>this.classOf(j)===2).length,
    maximumPending:this.maximumPending,maximumActive:this.maximumActive,
    dispatched:this.dispatched,completed:this.completed,shedResearch:this.shedResearch,
    shedProtected:this.shedProtected,skippedObsolete:this.skippedObsolete,
    skippedExpired:this.skippedExpired,maximumWaitMs:this.maximumWaitMs,
    averageWaitMs:this.dispatched?Math.round(this.totalWaitMs/this.dispatched):0,
    closed:this.closed,
  };}
}
