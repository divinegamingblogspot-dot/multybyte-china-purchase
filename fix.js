(function(){
  const APIS=[
    window.__MB_API||'https://script.googleusercontent.com/a/macros/multybyte.com/echo?user_content_key=AUkAhnSs6EU6NuyAkMrkmbUGKApbBQSes58LtJOlTXZyKo_ecgi2bFkc31umMbhk3TFm16HgE1l5JPYJXfkGwSTc7iPeTLlXHpp3D-utxGF-yzZTy7PsbWjEku0mmI6ArULkdOTW9TbEl2VSdGbnn47cCAuFYrK8i-q4UA55ZEAmTVxU0CuPfw0UY5uCJXYm0J9ag4izEZNn-pLSiT2cs55W4JOwckx1yiEQTvMl-zadgkSBo91uxvIbU_NMc9q39UOoUxuosjeWKtT2FEOnkltB26iOogP2TdeRisUBiOxHx1JtJRLKpU8&lib=MEfmAo0m0Y1CC85Zg2IB7BWdJHcgl-QcZ',
    'https://script.google.com/macros/s/AKfycbwCGKZiV57bzmcr5W2aVF5R7SpbwEqCs911boTjJbkPYvFEZJ-QNL0iD42qrxXfT9/exec'
  ];
  let queue=Promise.resolve();
  function raw(api,p,timeout){
    return new Promise((resolve,reject)=>{
      const cb='mbx_'+Date.now()+'_'+Math.random().toString(36).slice(2);
      const s=document.createElement('script');
      let done=false;
      let timer;
      const cleanup=()=>{clearTimeout(timer);try{delete window[cb]}catch(e){};if(s.parentNode)s.parentNode.removeChild(s)};
      const fail=e=>{if(done)return;done=true;cleanup();reject(e instanceof Error?e:Error(String(e||'Gateway unavailable')))};
      timer=setTimeout(()=>fail(new Error('Gateway timeout')),timeout);
      window[cb]=v=>{if(done)return;done=true;cleanup();resolve(v)};
      s.async=true;
      s.referrerPolicy='no-referrer-when-downgrade';
      s.onerror=()=>fail(new Error('Gateway unavailable'));
      const q=new URLSearchParams();
      Object.keys(p||{}).forEach(k=>{if(p[k]!==undefined&&p[k]!==null)q.set(k,String(p[k]))});
      q.set('callback',cb);
      q.set('_mb',String(Date.now())+'_'+Math.random().toString(36).slice(2));
      s.src=api+(api.includes('?')?'&':'?')+q.toString();
      document.head.appendChild(s);
    });
  }
  window.api=function(p,timeout){
    const run=queue.then(async()=>{
      let last=new Error('Gateway unavailable');
      for(const api of APIS){
        for(let attempt=0;attempt<2;attempt++){
          try{
            const r=await raw(api,p,Math.max(30000,timeout||30000));
            if(r&&r.success===false&&r.code==='SERVER_ERROR')throw new Error(r.message||'Server error');
            return r;
          }catch(e){
            last=e;
            await new Promise(r=>setTimeout(r,500*(attempt+1)));
          }
        }
      }
      throw last;
    });
    queue=run.catch(()=>{});
    return run;
  };
})();
