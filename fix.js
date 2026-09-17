/* MULTYBYTE WEBSITE PORTAL GATEWAY FIX */
(function(){
  'use strict';
  const API='https://script.google.com/macros/s/AKfycbwCGKZiV57bzmspcr5W2aVF5R7SpbwEqCs911boTjJbkPYvFEZJ-QNL0iD42qrxXfT9/exec';
  window.__MB_API=API;
  window.api=function(params,timeout){
    timeout=Math.max(30000,timeout||30000);
    return new Promise(function(resolve,reject){
      const cb='mb_gateway_'+Date.now()+'_'+Math.random().toString(36).slice(2);
      const s=document.createElement('script');
      let done=false;
      const timer=setTimeout(function(){fail('Gateway timeout');},timeout);
      function clean(){clearTimeout(timer);try{delete window[cb]}catch(e){}if(s.parentNode)s.parentNode.removeChild(s)}
      function fail(m){if(done)return;done=true;clean();reject(new Error(m))}
      window[cb]=function(r){if(done)return;done=true;clean();resolve(r)};
      const q=new URLSearchParams();
      Object.keys(params||{}).forEach(function(k){if(params[k]!==undefined&&params[k]!==null)q.set(k,String(params[k]))});
      q.set('callback',cb);q.set('_mb_ts',Date.now());
      s.async=true;s.referrerPolicy='no-referrer';
      s.onerror=function(){fail('Gateway unavailable')};
      s.onload=function(){setTimeout(function(){if(!done)fail('Gateway returned no callback')},1500)};
      s.src=API+'?'+q.toString();
      document.head.appendChild(s);
    });
  };
})();
