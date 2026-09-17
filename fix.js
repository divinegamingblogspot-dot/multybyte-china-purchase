/* MULTYBYTE WEBSITE PORTAL — IMAGE + VENDOR PO FIX */
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
      s.async=true;s.referrerPolicy='no-referrer';s.onerror=function(){fail('Gateway unavailable')};
      s.onload=function(){setTimeout(function(){if(!done)fail('Gateway returned no callback')},1500)};
      s.src=API+'?'+q.toString();document.head.appendChild(s);
    });
  };

  async function resolveImage(p){
    if(!p || p.image || !p.productLink) return p;
    try{
      // Current backend exposes the image resolver as action=image.
      const r=await window.api({action:'image',url:p.productLink,sku:p.sku},30000);
      if(r && r.success && r.image) p.image=r.image;
    }catch(e){}
    return p;
  }

  function getCardsAndHydrate(){
    document.querySelectorAll('.card').forEach(function(card){
      const img=card.querySelector('.photo img');
      if(img && img.getAttribute('src')) return;
      const checkbox=card.querySelector('.selectProduct');
      if(!checkbox) return;
      const sku=String(checkbox.dataset.sku||'');
      const list=window.__mbProductSnapshot||[];
      const p=list.find(function(x){return String(x.sku||'')===sku});
      if(!p || p.image || !p.productLink) return;
      resolveImage(p).then(function(x){
        if(!x.image)return;
        const photo=card.querySelector('.photo');
        if(photo)photo.innerHTML='<img loading="lazy" src="'+String(x.image).replace(/"/g,'&quot;')+'" alt="Product image">';
      });
    });
  }

  async function hydrateList(list){
    window.__mbProductSnapshot=list||[];
    const a=(list||[]).filter(function(p){return p && !p.image && p.productLink});
    let i=0;
    async function worker(){while(i<a.length){await resolveImage(a[i++])}}
    await Promise.all(Array.from({length:Math.min(5,a.length)},worker));
    getCardsAndHydrate();
  }

  function revealVendorPOOnly(){
    ['vendorProducts','vendorStats','vendorSearch','vendorSort','vendorRefresh','vendorPdf','vendorCsv'].forEach(function(id){const e=document.getElementById(id);if(e)e.classList.add('hidden')});
    const nav=document.getElementById('navProducts');if(nav)nav.classList.add('hidden');
    const vp=document.getElementById('vendorView');if(vp)vp.querySelectorAll('.card').forEach(function(e){e.classList.add('hidden')});
    const po=document.getElementById('vendorPO');if(po)po.classList.remove('hidden');
  }

  function wrapAdmin(){
    if(typeof window.loadAdmin==='function' && !window.__mbLoadAdminWrapped){
      const old=window.loadAdmin;window.__mbLoadAdminWrapped=true;
      window.loadAdmin=async function(){
        const r=await old.apply(this,arguments);
        try{
          const a=await window.api({action:'data'},30000);
          await hydrateList((a&&a.data)||[]);
          getCardsAndHydrate();
        }catch(e){getCardsAndHydrate()}
        return r;
      };
    }
    if(typeof window.loadPO==='function' && !window.__mbLoadPOWrapped){
      const oldPO=window.loadPO;window.__mbLoadPOWrapped=true;
      window.loadPO=async function(){
        const r=await oldPO.apply(this,arguments);
        try{getCardsAndHydrate()}catch(e){}
        return r;
      };
    }
  }

  function vendorPOOnly(){
    window.loadVendor=async function(){
      try{
        const s=typeof window.token==='function'?window.token():'';
        const r=await window.api({action:'vendorPurchaseOrders',token:s},30000);
        const list=r&&r.success?(r.purchaseOrders||r.data||[]):[];
        window.__mbVendorPO=list;
        await Promise.all(list.map(resolveImage));
        if(typeof window.drawPO==='function') window.drawPO('vendorPO',list);
        if(typeof window.drawDashboard==='function') window.drawDashboard();
        revealVendorPOOnly();
      }catch(e){if(typeof window.toast==='function')window.toast(e.message||'Unable to load Purchase Orders')}
    };
  }

  setTimeout(function(){
    wrapAdmin();
    vendorPOOnly();
    try{const s=typeof window.session==='function'?window.session():null;if(s&&s.role==='vendor')window.loadVendor()}catch(e){}
  },0);
})();
