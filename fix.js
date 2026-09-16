/* MULTYBYTE GATEWAY FIX - loaded AFTER app.js */
(function(){
  'use strict';

  const STABLE='https://script.google.com/macros/s/AKfycbwCGKZiV57bzmcr5W2aVF5R7SpbwEqCs911boTjJbkPYvFEZJ-QNL0iD42qrxXfT9/exec';
  const GOOGLEUSER='https://script.googleusercontent.com/a/macros/multybyte.com/echo?user_content_key=AUkAhnSs6EU6NuyAkMrkmbUGKApbBQSes58LtJOlTXZyKo_ecgi2bFkc31umMbhk3TFm16HgE1l5JPYJXfkGwSTc7iPeTLlXHpp3D-utxGF-yzZTy7PsbWjEku0mmI6ArULkdOTW9TbEl2VSdGbnn47cCAuFYrK8i-q4UA55ZEAmTVxU0CuPfw0UY5uCJXYm0J9ag4izEZNn-pLSiT2cs55W4JOwckx1yiEQTvMl-zadgSBo91uxvIbU_NMc9q39UOoUxuosjeWKtT2FEOnkltB26iOogP2TdeRisUBiOxHx1JtJRLKpU8&lib=MEfmAo0m0Y1CC85Zg2IB7BWdJHcgl-QcZ';
  const APIS=[window.__MB_API||STABLE, GOOGLEUSER].filter((v,i,a)=>v&&a.indexOf(v)===i);
  let chain=Promise.resolve();

  function log(level,action,message,meta){
    try{
      if(typeof window.activity==='function') window.activity(level,action,message,meta||{});
    }catch(e){}
  }

  function raw(base,p,timeout){
    return new Promise(function(resolve,reject){
      const cb='mb_gateway_'+Date.now()+'_'+Math.random().toString(36).slice(2);
      const script=document.createElement('script');
      let finished=false;
      let timer=0;

      function cleanup(){
        clearTimeout(timer);
        try{delete window[cb]}catch(e){window[cb]=undefined}
        if(script.parentNode)script.parentNode.removeChild(script);
      }
      function fail(message){
        if(finished)return;
        finished=true;
        cleanup();
        reject(new Error(message));
      }

      window[cb]=function(data){
        if(finished)return;
        finished=true;
        cleanup();
        resolve(data);
      };

      const q=new URLSearchParams();
      Object.keys(p||{}).forEach(function(k){
        if(p[k]!==undefined&&p[k]!==null)q.set(k,String(p[k]));
      });
      q.set('callback',cb);
      q.set('_mb_ts',String(Date.now()));

      script.async=true;
      script.referrerPolicy='no-referrer';
      script.onerror=function(){fail('Gateway unavailable');};
      script.onload=function(){
        setTimeout(function(){
          if(!finished)fail('Gateway returned no JSONP callback');
        },1500);
      };
      script.src=base+(base.indexOf('?')>=0?'&':'?')+q.toString();
      timer=setTimeout(function(){fail('Gateway timeout');},Math.max(30000,timeout||30000));
      document.head.appendChild(script);
    });
  }

  window.api=function(params,timeout){
    const run=chain.then(async function(){
      let last=null;
      for(const base of APIS){
        for(let attempt=1;attempt<=2;attempt++){
          try{
            const result=await raw(base,params,timeout);
            if(!result)throw new Error('Empty gateway response');
            if(result.success===false && result.code==='SERVER_ERROR'){
              throw new Error(result.message||'Apps Script server error');
            }
            log('INFO',params&&params.action||'API','API success',{endpoint:base});
            return result;
          }catch(err){
            last=err;
            log('ERROR',params&&params.action||'API',String(err&&err.message||err),{endpoint:base,attempt:attempt});
            await new Promise(function(r){setTimeout(r,700*attempt);});
          }
        }
      }
      throw last||new Error('Gateway unavailable');
    });
    chain=run.catch(function(){});
    return run;
  };
})();
