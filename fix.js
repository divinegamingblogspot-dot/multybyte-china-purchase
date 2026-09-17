/* MULTYBYTE WEBSITE PORTAL — IMAGE + VENDOR PO + PDF + COMMANDS FIX */
(function(){
  'use strict';
  const API='https://script.google.com/macros/s/AKfycbwCGKZiV57bzmcr5W2aVF5R7SpbwEqCs911boTjJbkPYvFEZJ-QNL0iD42qrxXfT9/exec';
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

  const BOOK='mb_bookmarks_v1', HEART='mb_hearts_v1';
  function readStore(k){try{return JSON.parse(localStorage.getItem(k)||'{}')}catch(e){return{}}}
  function writeStore(k,v){localStorage.setItem(k,JSON.stringify(v))}
  function skuKey(p){return String(p&&p.sku||'').trim()}
  function findProduct(sku){
    const all=(window.products||[]).concat(window.masterProducts||[]);
    return all.find(function(p){return skuKey(p).toLowerCase()===String(sku||'').toLowerCase()})||null;
  }
  function isMarked(k,sku){return !!readStore(k)[String(sku)]}
  function toggleMark(k,sku){
    if(!sku)return false;
    const x=readStore(k);x[sku]=!x[sku];if(!x[sku])delete x[sku];writeStore(k,x);return !!x[sku];
  }
  function toast(m){if(typeof window.toast==='function')window.toast(m);else{const t=document.createElement('div');t.textContent=m;t.style.cssText='position:fixed;right:20px;bottom:20px;z-index:99999;background:#071b1b;color:#fff;border:1px solid #16e0bd;border-radius:10px;padding:12px 15px';document.body.appendChild(t);setTimeout(function(){t.remove()},3000)}}

  async function resolveImage(p,force){
    if(!p || (!force && p.image) || !p.productLink)return p;
    try{
      const r=await window.api({action:'image',url:p.productLink,sku:p.sku},30000);
      if(r&&r.success&&r.image)p.image=r.image;
    }catch(e){}
    return p;
  }

  async function hydrateList(list,force){
    window.__mbProductSnapshot=list||[];
    const arr=window.__mbProductSnapshot;
    const targets=force?arr:arr.filter(function(p){return !p.image});
    await Promise.all(targets.slice(0,150).map(function(p){return resolveImage(p,force)}));
    try{getCardsAndHydrate()}catch(e){}
  }

  function getCardsAndHydrate(){
    const cards=[...document.querySelectorAll('.card')];
    const hydrateCard=function(card){
      const img=card.querySelector('.photo img');
      if(img&&img.getAttribute('src'))return;
      const checkbox=card.querySelector('.selectProduct');
      if(!checkbox)return;
      const sku=String(checkbox.dataset.sku||'');
      const list=window.__mbProductSnapshot||window.products||[];
      const p=list.find(function(x){return String(x.sku||'')===sku})||findProduct(sku);
      if(!p||!p.productLink)return;
      resolveImage(p,false).then(function(x){
        if(!x.image)return;
        const photo=card.querySelector('.photo');
        if(photo)photo.innerHTML='<img loading="lazy" src="'+String(x.image).replace(/"/g,'&quot;')+'" alt="Product image">';
      });
    };
    if('IntersectionObserver' in window){
      const io=new IntersectionObserver(function(entries,obs){entries.forEach(function(entry){if(entry.isIntersecting){hydrateCard(entry.target);obs.unobserve(entry.target)}})},{rootMargin:'500px'});
      cards.forEach(function(card){io.observe(card)});
    }else cards.slice(0,30).forEach(hydrateCard);
  }

  function revealVendorPOOnly(){
    ['vendorProducts','vendorStats','vendorSearch','vendorSort','vendorRefresh','vendorPdf','vendorCsv'].forEach(function(id){const e=document.getElementById(id);if(e)e.classList.add('hidden')});
    const nav=document.getElementById('navProducts');if(nav)nav.classList.add('hidden');
    const vp=document.getElementById('vendorView');if(vp)vp.querySelectorAll('.card').forEach(function(e){e.classList.add('hidden')});
    const po=document.getElementById('vendorPO');if(po)po.classList.remove('hidden');
  }

  /* ---------- PRODUCT PDF ---------- */
  function waitForImage(img){return new Promise(function(resolve){if(!img||img.complete)return resolve();const done=function(){img.removeEventListener('load',done);img.removeEventListener('error',done);resolve()};img.addEventListener('load',done);img.addEventListener('error',done);setTimeout(done,6000)})}
  async function pdfProducts(list,title){
    list=(list||[]).filter(Boolean);
    if(!list.length){toast('Select at least one product first.');return}
    toast('Preparing product PDF…');
    await Promise.all(list.map(function(p){return resolveImage(p,true)}));
    const win=window.open('','_blank','width=1100,height=850');
    if(!win){toast('Allow pop-ups to export PDF.');return}
    const rows=list.map(function(p){
      const image=p.image||'';
      return '<article class="product"><div class="imageBox">'+(image?'<img src="'+escPdf(image)+'" alt="Product image">':'<div class="noImage">IMAGE NOT FOUND</div>')+'</div><div class="details"><div class="productName">'+escPdf(p.productName||'—')+'</div><div>SKU: <b>'+escPdf(p.sku||'—')+'</b></div><div>Quantity: <b>'+escPdf(p.quantity||'—')+'</b></div><div>Supplier / Vendor: <b>'+escPdf(p.supplier||p.vendor||'—')+'</b></div><div>Price: <b>'+escPdf(p.price??p.landingCost??'—')+'</b></div><div>Remarks: <b>'+escPdf(p.remarks||'—')+'</b></div></div></article>';
    }).join('');
    win.document.open();
    win.document.write('<!doctype html><html><head><meta charset="utf-8"><title>'+escPdf(title||'Multybyte Products')+'</title><style>@page{size:A4;margin:14mm}*{box-sizing:border-box}body{font-family:Arial,Helvetica,sans-serif;color:#111;margin:0}.header{display:flex;justify-content:space-between;align-items:center;border-bottom:2px solid #111;padding-bottom:10px;margin-bottom:14px}.brand{font-size:18px;font-weight:800;letter-spacing:2px}.date{font-size:10px;color:#666}.product{display:grid;grid-template-columns:180px 1fr;gap:22px;min-height:185px;padding:18px 0;border-bottom:1px solid #ddd;break-inside:avoid}.imageBox{width:180px;height:155px;border:1px solid #ddd;display:flex;align-items:center;justify-content:center;background:#fff;overflow:hidden}.imageBox img{width:100%;height:100%;object-fit:contain;padding:8px}.noImage{font-size:10px;color:#888}.details{font-size:13px;line-height:1.8;padding-top:2px}.productName{font-size:17px;font-weight:800;line-height:1.3;margin-bottom:8px}.details b{font-weight:700}@media print{.product{break-inside:avoid}}</style></head><body><div class="header"><div class="brand">MULTYBYTE</div><div class="date">'+escPdf(title||'Product Export')+' • '+new Date().toLocaleString()+'</div></div>'+rows+'</body></html>');
    win.document.close();
    const imgs=[...win.document.images];
    await Promise.all(imgs.map(waitForImage));
    setTimeout(function(){win.focus();win.print()},350);
  }
  function escPdf(x){return String(x??'').replace(/[&<>"']/g,function(c){return({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'})[c]})}

  /* Keep the portal's existing pdf buttons, but make their output the new layout. */
  function installPdfOverride(){
    window.pdf=function(list,title){return pdfProducts(list,title)};
    window.pdfPOItems=function(){
      const a=(window.poItems||[]).map(function(x){return normalize(x)});
      return pdfProducts(a,'Purchase Order Products');
    };
  }
  function normalize(x){return x||{}}

  /* ---------- HARD SYNC / BOOKMARK / HEART / COMMANDS ---------- */
  async function hardSync(){
    toast('Hard syncing Website Listing…');
    try{
      const r=await window.api({action:'data',token:typeof window.token==='function'?window.token():''},30000);
      if(!r||!r.success)throw Error(r&&r.message||'Sync failed');
      const list=(r.data||r.products||[]);
      window.masterProducts=list.map(function(x){return typeof window.normalizeProduct==='function'?window.normalizeProduct(x):x});
      window.products=window.masterProducts.slice();
      await hydrateList(window.products,true);
      if(typeof window.drawAdminStats==='function')window.drawAdminStats();
      if(typeof window.drawAdminProducts==='function')window.drawAdminProducts();
      if(typeof window.drawVendor==='function')window.drawVendor();
      if(typeof window.drawDashboard==='function')window.drawDashboard();
      toast('Hard sync complete — Website Listing is current.');
    }catch(e){toast('Hard sync failed: '+e.message)}
  }
  function markedList(k){
    const m=readStore(k);return Object.keys(m).map(findProduct).filter(Boolean);
  }
  function showMarked(k,label){
    const a=markedList(k);if(!a.length){toast('No '+label+' products yet.');return}
    if(typeof window.pdf==='function'&&label==='bookmarked')pdfProducts(a,'Bookmarked Products');
    else if(typeof window.drawAdminProducts==='function'){window.products=a;window.drawAdminProducts();toast(a.length+' '+label+' products loaded.')}else toast(a.length+' '+label+' products.');
  }
  function command(cmd){
    const c=String(cmd||'').trim();if(!c)return;
    const u=c.toUpperCase();
    if(u==='HARD SYNC'||u==='SYNC'||u==='HARD SYNC IMAGES'){hardSync();return}
    if(u==='BOOKMARKS'||u==='BOOKMARK'){showMarked(BOOK,'bookmarked');return}
    if(u==='HEARTS'||u==='HEART'||u==='FAVOURITES'||u==='FAVORITES'){showMarked(HEART,'favourite');return}
    if(u==='PDF'||u==='PDF SELECTED'){const a=typeof window.selectedRows==='function'?window.selectedRows():[];pdfProducts(a,'Selected Products');return}
    const pm=u.match(/^(?:PDF|BOOKMARK|HEART)\s+([A-Z0-9._-]+)$/i);
    if(pm){const p=findProduct(pm[1]);if(!p){toast('SKU not found: '+pm[1]);return}if(u.startsWith('PDF'))pdfProducts([p],'Product '+p.sku);else{const k=u.startsWith('BOOKMARK')?BOOK:HEART;toggleMark(k,p.sku);toast((u.startsWith('BOOKMARK')?'Bookmark':'Heart')+' updated for '+p.sku);refreshCards()};return}
    if(u==='REFRESH'){hardSync();return}
    toast('Unknown command. Try: HARD SYNC, PDF, BOOKMARKS, HEARTS, PDF MB-CCE1');
  }
  function injectCommands(){
    if(document.getElementById('mbCommandBar'))return;
    const head=document.querySelector('.main');if(!head)return;
    const bar=document.createElement('div');bar.id='mbCommandBar';bar.className='panel';bar.innerHTML='<div style="display:flex;gap:8px;align-items:center;flex-wrap:wrap"><b style="font-size:11px;letter-spacing:1px">COMMAND</b><input id="mbCommandInput" class="field dark" style="flex:1;min-width:240px;margin:0" placeholder="HARD SYNC / PDF / BOOKMARK MB-CCE1 / HEART MB-CCE1"><button id="mbCommandRun" class="btn primary">Run</button><button id="mbHardSync" class="btn">Hard Sync</button><button id="mbBookmarks" class="btn">Bookmarks</button><button id="mbHearts" class="btn">♥ Hearts</button></div>';
    head.insertBefore(bar,head.firstChild);
    document.getElementById('mbCommandRun').onclick=function(){command(document.getElementById('mbCommandInput').value)};
    document.getElementById('mbCommandInput').addEventListener('keydown',function(e){if(e.key==='Enter')command(this.value)});
    document.getElementById('mbHardSync').onclick=hardSync;
    document.getElementById('mbBookmarks').onclick=function(){showMarked(BOOK,'bookmarked')};
    document.getElementById('mbHearts').onclick=function(){showMarked(HEART,'favourite')};
  }

  function refreshCards(){
    try{if(typeof window.drawAdminProducts==='function')window.drawAdminProducts();if(typeof window.drawVendor==='function')window.drawVendor()}catch(e){}
  }
  function decorateCards(){
    document.querySelectorAll('.card').forEach(function(card){
      if(card.dataset.mbDecorated)return;
      const cb=card.querySelector('.selectProduct');if(!cb)return;
      const sku=String(cb.dataset.sku||'');card.dataset.mbDecorated='1';
      const actions=card.querySelector('.actions:last-child')||card.querySelector('.actions');if(!actions)return;
      const b=document.createElement('button');b.className='btn mbBookmark';b.type='button';b.textContent=isMarked(BOOK,sku)?'★ Bookmarked':'☆ Bookmark';
      b.onclick=function(e){e.stopPropagation();const on=toggleMark(BOOK,sku);b.textContent=on?'★ Bookmarked':'☆ Bookmark';toast(on?'Bookmarked '+sku:'Removed bookmark '+sku)};
      const h=document.createElement('button');h.className='btn mbHeart';h.type='button';h.textContent=isMarked(HEART,sku)?'♥':'♡';h.onclick=function(e){e.stopPropagation();const on=toggleMark(HEART,sku);h.textContent=on?'♥':'♡';toast(on?'Hearted '+sku:'Removed heart '+sku)};
      actions.appendChild(b);actions.appendChild(h);
    });
  }

  function wrapAdmin(){
    if(typeof window.loadAdmin==='function'&&!window.__mbLoadAdminWrapped){
      const old=window.loadAdmin;window.__mbLoadAdminWrapped=true;
      window.loadAdmin=async function(){
        const r=await old.apply(this,arguments);
        try{const a=await window.api({action:'data'},30000);await hydrateList((a&&a.data)||[],false);getCardsAndHydrate()}catch(e){getCardsAndHydrate()}
        setTimeout(function(){injectCommands();decorateCards()},100);return r;
      };
    }
    if(typeof window.loadPO==='function'&&!window.__mbLoadPOWrapped){
      const oldPO=window.loadPO;window.__mbLoadPOWrapped=true;
      window.loadPO=async function(){const r=await oldPO.apply(this,arguments);try{getCardsAndHydrate()}catch(e){}return r};
    }
  }

  function vendorPOOnly(){
    window.loadVendor=async function(){
      try{
        const s=typeof window.token==='function'?window.token():'';
        const r=await window.api({action:'vendorPurchaseOrders',token:s},30000);
        const list=r&&r.success?(r.purchaseOrders||r.data||[]):[];
        window.__mbVendorPO=list;
        await Promise.all(list.map(function(p){return resolveImage(p,true)}));
        if(typeof window.drawPO==='function')window.drawPO('vendorPO',list);
        if(typeof window.drawDashboard==='function')window.drawDashboard();
        revealVendorPOOnly();
      }catch(e){if(typeof window.toast==='function')window.toast(e.message||'Unable to load Purchase Orders')}
    };
  }

  function start(){
    installPdfOverride();wrapAdmin();vendorPOOnly();injectCommands();decorateCards();getCardsAndHydrate();
    try{const s=typeof window.session==='function'?window.session():null;if(s&&s.role==='vendor')window.loadVendor()}catch(e){}
    const obs=new MutationObserver(function(){injectCommands();decorateCards();getCardsAndHydrate()});
    obs.observe(document.body,{childList:true,subtree:true});
    setInterval(function(){decorateCards()},1500);
  }
  setTimeout(start,0);
})();
