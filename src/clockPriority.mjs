// Scope of this signal is scheduling only: never grants trading permission.
export class ClockPriority {
  constructor(entry=false){this.entry=entry===true;this.listeners=new Set();}
  promote(){if(this.entry)return;this.entry=true;const callbacks=[...this.listeners];this.listeners.clear();for(const cb of callbacks)cb();}
  subscribe(cb){if(this.entry){cb();return ()=>{};}this.listeners.add(cb);return ()=>this.listeners.delete(cb);}
}
export function inheritClockPriority(source,target){
  if(!source||source===target)return ()=>{};
  return source.subscribe(()=>target.promote());
}
export function joinClockWork(promise,source,entry=false){
  const target=promise.clockPriority;
  if(!target)return promise;
  if(entry||source?.entry===true)target.promote();
  if(!source||source.entry||target.entry)return promise;
  const detach=inheritClockPriority(source,target);return promise.finally(detach);
}
