(function(){
  const REAL_API=window.__MB_API||'https://script.google.com/macros/s/AKfycbwCGKZiV57bzmcr5W2aVF5R7SpbwEqCs911boTjJbkPYvFEZJ-QNL0iD42qrxXfT9/exec';
  let queue=Promise.resolve();
  function raw(p,timeout){
    return new Promise((resolve,reject)=>{
      const cb='mbx_'+Date.now()+'_'+Math.random().toString(36).slice(2);
      const s=document.createElement('script');
      let done=false;
      const cleanup=()=>{clearTimeout(timer);try{delete window[cb]}catch(e){};s.remove()};
      const fail=e=>{if(done)return;done=true;cleanup();reject(e)};
      const timer=setTimeout(()=>fail(new Error('Gateway timeout')),timeout);
      window[cb]=v=>{if(done)return;done=true;cleanup();resolve(v)};
      s.async=true;
      s.referrerPolicy='no-referrer-when-downgrade';
      s.onerror=()=>fail(new Error('Gateway unavailable'));
      const q=new URLSearchParams();
      Object.keys(p||{}).forEach(k=>{if(p[k]!==undefined&&p[k]!==null)q.set(k,String(p[k]))});
      q.set('callback',cb);q.set('_mb',String(Date.now())+'_'+Math.random());
      s.src=REAL_API+'?'+q.toString();
      document.head.appendChild(s);
    });
  }
  window.api=function(p,timeout){
    const run=queue.then(async()=>{
      let last;
      for(let i=0;i<3;i++){
        try{
          const r=await raw(p,Math.max(30000,timeout||30000));
          if(r&&r.success===false&&r.code==='SERVER_ERROR') throw new Error(r.message||'Server error');
          return r;
        }catch(e){
          last=e;
          await new Promise(r=>setTimeout(r,700*(i+1)));
        }
      }
      throw last||new Error('Gateway unavailable');
    });
    queue=run.catch(()=>{});
    return run;
  };
})();
