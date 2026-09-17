/* MULTYBYTE GATEWAY GUARD — PROTECTED CORE
 * Loaded before app.js. There is ONE allowed Apps Script Web App endpoint.
 * Feature files may not change or introduce another /exec URL.
 */
(function(){
  'use strict';
  if(window.__MB_GATEWAY_GUARD__)return;
  window.__MB_GATEWAY_GUARD__=true;

  const CANONICAL='https://script.google.com/macros/s/AKfycbwCGKZiV57bzmspcr5W2aVF5R7SpbwEqCs911boTjJbkPYvFEZJ-QNL0iD42qrxXfT9/exec';
  try{
    Object.defineProperty(window,'__MB_CANONICAL_API',{value:CANONICAL,writable:false,configurable:false,enumerable:true});
  }catch(e){window.__MB_CANONICAL_API=CANONICAL}
  window.__MB_GATEWAY_URL=CANONICAL;
  window.__MB_GATEWAY_VERSION='protected-v3';

  const originalAppend=Node.prototype.appendChild;
  const isGatewayScript=s=>{
    try{
      const u=String(s&&s.src||'');
      return u.indexOf('script.google.com/macros/')>=0 && /[?&]callback=/.test(u);
    }catch(e){return false}
  };

  Node.prototype.appendChild=function(node){
    if(node && node.tagName==='SCRIPT' && isGatewayScript(node)){
      try{
        /* Rewrite ANY Apps Script JSONP /exec request to the protected URL,
         * while preserving its action, token, callback and other parameters. */
        const incoming=new URL(node.src,location.href);
        const target=new URL(CANONICAL);
        incoming.searchParams.forEach((v,k)=>target.searchParams.set(k,v));
        node.src=target.toString();
      }catch(e){}

      const originalOnerror=node.onerror;
      let attempts=0;
      let settled=false;
      const retry=()=>{
        if(settled)return;
        attempts++;
        if(attempts>=4){
          settled=true;
          if(typeof originalOnerror==='function')originalOnerror.call(node,new Event('error'));
          return;
        }
        try{
          const u=new URL(node.src,location.href);
          u.searchParams.set('_gw_retry',String(attempts)+'_'+Date.now());
          node.src=u.toString();
        }catch(e){}
        originalAppend.call(node.parentNode||document.head,node);
      };

      /* Apps Script may fire onload before the JSONP callback. Never treat
       * the load event itself as failure; the app watchdog handles timeout. */
      node.onload=function(){};
      node.onerror=function(){
        if(settled)return;
        retry();
      };

      try{
        const cb=new URL(node.src,location.href).searchParams.get('callback');
        if(cb && typeof window[cb]==='function'){
          const old=window[cb];
          window[cb]=function(v){settled=true;window[cb]=old;return old.apply(this,arguments)};
        }
      }catch(e){}
    }
    return originalAppend.call(this,node);
  };
})();
