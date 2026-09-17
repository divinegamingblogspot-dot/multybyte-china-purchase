/* MULTYBYTE GATEWAY GUARD
 * Loaded BEFORE app.js. Keeps the existing JSONP API contract but makes the
 * Apps Script gateway tolerant of slow redirects / transient script errors.
 */
(function(){
  'use strict';
  if(window.__MB_GATEWAY_GUARD__)return;
  window.__MB_GATEWAY_GUARD__=true;

  const originalAppend=Node.prototype.appendChild;
  const originalRemove=Node.prototype.removeChild;
  const isGatewayScript=s=>{
    try{
      const u=String(s&&s.src||'');
      return u.indexOf('script.google.com/macros/')>=0 && /[?&]callback=/.test(u);
    }catch(e){return false}
  };

  Node.prototype.appendChild=function(node){
    if(node && node.tagName==='SCRIPT' && isGatewayScript(node)){
      const originalOnload=node.onload;
      const originalOnerror=node.onerror;
      let attempts=0;
      let settled=false;
      const base=node.src;

      const retry=()=>{
        if(settled)return;
        attempts++;
        if(attempts>=4){
          settled=true;
          if(typeof originalOnerror==='function')originalOnerror.call(node,new Event('error'));
          return;
        }
        const sep=base.indexOf('?')>=0?'&':'?';
        node.src=base+sep+'_gw_retry='+attempts+'_'+Date.now();
        originalAppend.call(node.parentNode||document.head,node);
      };

      // Apps Script can redirect and execute the JSONP callback after the
      // script load event. The old client treated 800ms as failure. Do not.
      node.onload=function(){
        if(settled)return;
        // Give the JSONP callback time to arrive; the app's own 20s watchdog
        // remains responsible for a genuinely dead gateway.
        setTimeout(()=>{if(!settled){}},12000);
      };
      node.onerror=function(){
        if(settled)return;
        retry();
      };

      // Observe the callback parameter and mark the request successful as
      // soon as the application's JSONP callback actually fires.
      try{
        const cb=new URL(base,location.href).searchParams.get('callback');
        if(cb && typeof window[cb]==='function'){
          const old=window[cb];
          window[cb]=function(v){settled=true;window[cb]=old;return old.apply(this,arguments)};
        }
      }catch(e){}
    }
    return originalAppend.call(this,node);
  };
})();
