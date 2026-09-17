/* MULTYBYTE PORTAL — LIVE ENHANCEMENT LAYER
 * Website Listing is the product source of truth.
 * IMPORTANT: this layer deliberately does NOT replace the core API or vendor loader.
 */
(function(){
  'use strict';

  const BOOK='mb_bookmarks_v2';
  const HEART='mb_hearts_v2';
  const DATA_CACHE='mb_listing_cache_v2';
  const IMAGE_CACHE='mb_image_cache_v2';
  const IMAGE_CONCURRENCY=4;

  function storeRead(k){try{return JSON.parse(localStorage.getItem(k)||'{}')}catch(e){return{}}}
  function storeWrite(k,v){try{localStorage.setItem(k,JSON.stringify(v))}catch(e){}}
  function toast2(m){if(typeof window.toast==='function')return window.toast(m);const t=document.createElement('div');t.textContent=m;t.style.cssText='position:fixed;right:20px;bottom:20px;z-index:99999;background:#071b1b;color:#fff;border:1px solid #16e0bd;border-radius:10px;padding:12px 15px';document.body.appendChild(t);setTimeout(()=>t.remove(),3000)}
  function getAllProducts(){let a=[];try{if(Array.isArray(products))a=a.concat(products)}catch(e){}try{if(Array.isArray(masterProducts))a=a.concat(masterProducts)}catch(e){}const m=new Map();a.forEach(p=>{if(p&&p.sku)m.set(String(p.sku).toLowerCase(),p)});return [...m.values()]}
  function findProduct(sku){const s=String(sku||'').trim().toLowerCase();return getAllProducts().find(p=>String(p.sku||'').trim().toLowerCase()===s)||null}
  function toggle(k,sku){const x=storeRead(k),s=String(sku);x[s]=!x[s];if(!x[s])delete x[s];storeWrite(k,x);return !!x[s]}

  /* ---------- fast local listing cache / stale-while-revalidate ---------- */
  function cacheGet(){try{const x=JSON.parse(localStorage.getItem(DATA_CACHE)||'null');if(x&&Array.isArray(x.data))return x}catch(e){}return null}
  function cachePut(data){try{localStorage.setItem(DATA_CACHE,JSON.stringify({time:Date.now(),data:data||[]}))}catch(e){}}
  function paintMaster(list){const n=(list||[]).map(x=>typeof normalizeProduct==='function'?normalizeProduct(x):x).filter(x=>x&&x.sku);try{masterProducts=n;products=n.slice()}catch(e){}return n}
  async function fastMasterRefresh(force){
    if(!force){const c=cacheGet();if(c&&Date.now()-c.time<120000){paintMaster(c.data);if(typeof drawAdminStats==='function')drawAdminStats();if(typeof drawAdminProducts==='function')drawAdminProducts();setTimeout(()=>fastMasterRefresh(true),50);return c.data}}
    try{
      const r=await api({action:'data'},15000);
      if(r&&r.success){const data=r.data||r.products||[];cachePut(data);return paintMaster(data)}
    }catch(e){/* core app handles gateway errors */}
    return []
  }

  /* ---------- image resolver with browser cache and limited concurrency ---------- */
  function imageCacheRead(){return storeRead(IMAGE_CACHE)}
  function imageCacheWrite(x){storeWrite(IMAGE_CACHE,x)}
  async function resolveImage(p,force){
    if(!p||!p.productLink)return p;
    const sku=String(p.sku||'');
    const cache=imageCacheRead();
    if(!force&&p.image)return p;
    if(!force&&cache[sku]){p.image=cache[sku];return p}
    try{
      const r=await api({action:'image',url:p.productLink,sku:sku},15000);
      if(r&&r.success&&r.image){p.image=r.image;cache[sku]=r.image;imageCacheWrite(cache)}
    }catch(e){}
    return p
  }
  async function mapLimit(list,limit,fn){let i=0;const workers=Array.from({length:Math.min(limit,list.length)},async()=>{while(true){const n=i++;if(n>=list.length)return;await fn(list[n])}});await Promise.all(workers)}
  function lazyImages(){
    const cards=[...document.querySelectorAll('.card')];
    if(!cards.length)return;
    const hydrate=async card=>{
      const cb=card.querySelector('.selectProduct');if(!cb)return;
      const p=findProduct(cb.dataset.sku);if(!p||!p.productLink)return;
      const box=card.querySelector('.photo');if(!box)return;
      if(box.querySelector('img'))return;
      await resolveImage(p,false);
      if(p.image)box.innerHTML='<img loading="lazy" decoding="async" src="'+esc(String(p.image))+'" alt="Product image">';
    };
    if('IntersectionObserver' in window){
      const io=new IntersectionObserver(entries=>{entries.forEach(e=>{if(e.isIntersecting){io.unobserve(e.target);hydrate(e.target)}})},{rootMargin:'500px'});
      cards.forEach(c=>io.observe(c));
    }else mapLimit(cards,IMAGE_CONCURRENCY,hydrate);
  }

  /* ---------- real PDF: image left, details right ---------- */
  function escPdf(x){return String(x??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]))}
  function waitImg(img){return new Promise(resolve=>{if(!img||img.complete)return resolve();let done=false;const end=()=>{if(done)return;done=true;img.removeEventListener('load',end);img.removeEventListener('error',end);resolve()};img.addEventListener('load',end);img.addEventListener('error',end);setTimeout(end,7000)})}
  async function pdfProducts(list,title){
    list=(list||[]).filter(Boolean);if(!list.length){toast2('Select at least one product first.');return}
    toast2('Preparing PDF with current Website Listing data…');
    await mapLimit(list,3,p=>resolveImage(p,true));
    const w=window.open('','_blank','width=1100,height=850');if(!w){toast2('Allow pop-ups for PDF export.');return}
    const rows=list.map(p=>`<article class="product"><div class="imageBox">${p.image?`<img src="${escPdf(p.image)}" alt="Product image">`:'<span>IMAGE NOT FOUND</span>'}</div><div class="details"><div class="productName">${escPdf(p.productName||'—')}</div><div><strong>SKU:</strong> ${escPdf(p.sku||'—')}</div><div><strong>Quantity:</strong> ${escPdf(p.quantity||'—')}</div><div><strong>Supplier / Vendor:</strong> ${escPdf(p.supplier||p.vendor||'—')}</div><div><strong>Price:</strong> ${escPdf(p.price??p.landingCost??'—')}</div><div><strong>Remarks:</strong> ${escPdf(p.remarks||'—')}</div></div></article>`).join('');
    w.document.open();w.document.write(`<!doctype html><html><head><meta charset="utf-8"><title>${escPdf(title||'Multybyte Products')}</title><style>@page{size:A4;margin:12mm}*{box-sizing:border-box}body{font-family:Arial,Helvetica,sans-serif;color:#111;margin:0}.header{display:flex;justify-content:space-between;align-items:center;border-bottom:2px solid #111;padding:0 0 10px;margin-bottom:6px}.brand{font-size:18px;font-weight:800;letter-spacing:2px}.date{font-size:10px;color:#666}.product{display:grid;grid-template-columns:180px 1fr;gap:24px;min-height:185px;padding:18px 0;border-bottom:1px solid #ddd;break-inside:avoid}.imageBox{width:180px;height:155px;border:1px solid #ddd;display:flex;align-items:center;justify-content:center;overflow:hidden}.imageBox img{width:100%;height:100%;object-fit:contain;padding:8px}.imageBox span{font-size:10px;color:#888}.details{font-size:13px;line-height:1.9;padding-top:2px}.productName{font-size:18px;font-weight:800;line-height:1.3;margin-bottom:8px}@media print{.product{break-inside:avoid}}</style></head><body><div class="header"><div class="brand">MULTYBYTE</div><div class="date">${escPdf(title||'Product Export')} • ${escPdf(new Date().toLocaleString())}</div></div>${rows}</body></html>`);w.document.close();await Promise.all([...w.document.images].map(waitImg));setTimeout(()=>{w.focus();w.print()},350)
  }
  function installPdf(){window.pdf=(rows,title)=>pdfProducts(rows,title);window.pdfPOItems=()=>{let a=[];try{a=(typeof poItems!=='undefined'?poItems:[])}catch(e){}return pdfProducts(a,'Purchase Order Products')}}

  /* ---------- editable product editor ---------- */
  function modalStyle(){if(document.getElementById('mbEditStyle'))return;const s=document.createElement('style');s.id='mbEditStyle';s.textContent='.mbEditGrid{display:grid;grid-template-columns:1fr 1fr;gap:10px}.mbEditGrid .full{grid-column:1/-1}.mbLocked{opacity:.65}.mbEditNote{font-size:10px;color:#91aaa5;line-height:1.5}@media(max-width:650px){.mbEditGrid{grid-template-columns:1fr}}';document.head.appendChild(s)}
  function editProduct(sku){
    const p=findProduct(decodeURIComponent(sku));if(!p)return;
    if(session()?.role!=='admin')return;
    modalStyle();
    const old=document.getElementById('mbEditor');if(old)old.remove();
    const m=document.createElement('div');m.id='mbEditor';m.className='modal';
    m.innerHTML=`<div class="modalBox" style="max-width:760px"><div class="sectionTitle"><div><div class="eyebrow">WEBSITE LISTING / EDIT</div><h2 style="margin:4px 0">Edit ${esc(p.sku)}</h2></div><button class="btn" id="mbEditClose">Close</button></div><div class="mbEditNote">Editable fields are written back to the same Website Listing row. SKU, Product Name, Product Link, Supplier and Price are locked here because they remain Listing Master/source fields.</div><div class="mbEditGrid" style="margin-top:14px"><div><small>SKU — LOCKED</small><input class="field mbLocked" value="${esc(p.sku)}" disabled></div><div><small>Product Name — LOCKED</small><input class="field mbLocked" value="${esc(p.productName)}" disabled></div><div><small>Supplier — LOCKED</small><input class="field mbLocked" value="${esc(p.supplier)}" disabled></div><div><small>Price — LOCKED</small><input class="field mbLocked" value="${esc(p.price??p.landingCost??'')}" disabled></div><div><small>Vendor — EDITABLE</small><input id="mbE_vendor" class="field" value="${esc(p.vendor||'')}"></div><div><small>Status — EDITABLE</small><select id="mbE_status" class="field"><option ${String(p.status).toLowerCase()==='active'?'selected':''}>Active</option><option ${String(p.status).toLowerCase()==='inactive'?'selected':''}>Inactive</option><option ${String(p.status).toLowerCase()==='pending'?'selected':''}>Pending</option></select></div><div><small>Quantity — EDITABLE</small><input id="mbE_qty" class="field" value="${esc(p.quantity||'')}" type="number" min="0"></div><div><small>Image URL — EDITABLE</small><input id="mbE_image" class="field" value="${esc(p.image||'')}"></div><div class="full"><small>Remarks — EDITABLE</small><textarea id="mbE_remarks" class="field" rows="4">${esc(p.remarks||'')}</textarea></div></div><div class="actions"><button id="mbE_save" class="btn primary">Save to Website Listing</button></div></div>`;
    document.body.appendChild(m);
    $('mbEditClose').onclick=()=>m.remove();
    $('mbE_save').onclick=async()=>{
      const btn=$('mbE_save');btn.disabled=true;btn.textContent='Saving…';
      try{
        const r=await api({action:'saveProduct',token:token(),row:p.row,sku:p.sku,status:$('mbE_status').value,vendor:$('mbE_vendor').value,quantity:$('mbE_qty').value,remarks:$('mbE_remarks').value,image:$('mbE_image').value},20000);
        if(!r?.success)throw Error(r?.message||'Save failed');
        m.remove();toast2('Saved to Website Listing.');localStorage.removeItem(DATA_CACHE);await loadAdmin();
      }catch(e){toast2(e.message);btn.disabled=false;btn.textContent='Save to Website Listing'}
    };
  }

  /* ---------- vendor editor: writes quantity + remarks back to vendor sheet ---------- */
  function vendorUpdate(sku){
    const p=findProduct(decodeURIComponent(sku));if(!p||session()?.role!=='vendor')return;
    const old=document.getElementById('mbVendorEditor');if(old)old.remove();
    const parsed=String(p.remarks||'');const dm=parsed.match(/Production Days:\s*([^\n]*)/i);const rm=parsed.match(/Vendor Remarks:\s*([\s\S]*)/i);
    const m=document.createElement('div');m.id='mbVendorEditor';m.className='modal';m.innerHTML=`<div class="modalBox" style="max-width:650px"><div class="sectionTitle"><div><div class="eyebrow">VENDOR UPDATE</div><h2 style="margin:4px 0">${esc(p.sku)}</h2></div><button class="btn" id="mbVE_close">Close</button></div><div class="mbEditNote">These editable vendor fields are saved to your assigned vendor sheet. Quantity updates the Quantity column; production days and remarks are stored in Remarks so the update survives refresh.</div><div style="margin-top:14px"><small>Confirmed Quantity</small><input id="mbVE_qty" class="field" type="number" min="0" value="${esc(p.quantity||'')}"><small>Production Days</small><input id="mbVE_days" class="field" type="number" min="0" value="${esc(dm?dm[1].trim():'')}"><small>Vendor Remarks</small><textarea id="mbVE_rem" class="field" rows="4">${esc(rm?rm[1].trim():parsed)}</textarea></div><button id="mbVE_save" class="btn primary">Save Vendor Update</button></div>`;
    document.body.appendChild(m);$('mbVE_close').onclick=()=>m.remove();$('mbVE_save').onclick=async()=>{const b=$('mbVE_save');b.disabled=true;b.textContent='Saving…';try{const remarks='Production Days: '+$('mbVE_days').value+'\nVendor Remarks: '+$('mbVE_rem').value;const r=await api({action:'setVendorUpdate',token:token(),sku:p.sku,quantity:$('mbVE_qty').value,remarks},20000);if(!r?.success)throw Error(r?.message||'Vendor update failed');m.remove();toast2('Vendor sheet updated.');await loadVendor()}catch(e){toast2(e.message);b.disabled=false;b.textContent='Save Vendor Update'}}}

  /* ---------- cards ---------- */
  function decorateCards(){
    document.querySelectorAll('.card').forEach(card=>{
      const cb=card.querySelector('.selectProduct');if(!cb||card.dataset.mbReady)return;card.dataset.mbReady='1';const sku=String(cb.dataset.sku||'');const actions=card.querySelector('.actions:last-child')||card.querySelector('.actions');if(!actions)return;
      const b=document.createElement('button');b.className='btn';b.type='button';b.textContent=storeRead(BOOK)[sku]?'★ Bookmark':'☆ Bookmark';b.onclick=e=>{e.stopPropagation();const on=toggle(BOOK,sku);b.textContent=on?'★ Bookmark':'☆ Bookmark';toast2(on?'Bookmarked '+sku:'Bookmark removed for '+sku)};
      const h=document.createElement('button');h.className='btn';h.type='button';h.textContent=storeRead(HEART)[sku]?'♥':'♡';h.onclick=e=>{e.stopPropagation();const on=toggle(HEART,sku);h.textContent=on?'♥':'♡';toast2(on?'Hearted '+sku:'Heart removed for '+sku)};
      actions.append(b,h);
    });
    lazyImages();
  }

  function installCommands(){
    if(document.getElementById('mbCommandBar'))return;const main=document.querySelector('.main');if(!main)return;const bar=document.createElement('div');bar.id='mbCommandBar';bar.className='panel';bar.innerHTML='<div style="display:flex;gap:8px;align-items:center;flex-wrap:wrap"><b style="font-size:11px;letter-spacing:1px">COMMAND</b><input id="mbCommandInput" class="field dark" style="flex:1;min-width:240px;margin:0" placeholder="HARD SYNC / PDF / BOOKMARK MB-CCE1 / HEART MB-CCE1"><button id="mbCommandRun" class="btn primary">Run</button><button id="mbHardSync" class="btn">Hard Sync</button><button id="mbBookmarks" class="btn">Bookmarks</button><button id="mbHearts" class="btn">♥ Hearts</button></div>';main.insertBefore(bar,main.firstChild);
    $('mbCommandRun').onclick=()=>runCommand($('mbCommandInput').value);$('mbCommandInput').addEventListener('keydown',e=>{if(e.key==='Enter')runCommand(e.target.value)});$('mbHardSync').onclick=()=>fastMasterRefresh(true);$('mbBookmarks').onclick=()=>showMarked(BOOK);$('mbHearts').onclick=()=>showMarked(HEART);
  }
  function showMarked(k){const m=storeRead(k),a=Object.keys(m).map(findProduct).filter(Boolean);if(!a.length)return toast2('No saved products.');products=a;if(typeof drawAdminProducts==='function'&&session()?.role==='admin')drawAdminProducts();if(typeof drawVendor==='function'&&session()?.role==='vendor')drawVendor();toast2(a.length+' saved products loaded.')}
  function runCommand(cmd){const u=String(cmd||'').trim().toUpperCase();if(!u)return;if(['HARD SYNC','SYNC','REFRESH','HARD SYNC IMAGES'].includes(u)){fastMasterRefresh(true);return}if(u==='BOOKMARKS'||u==='BOOKMARK'){showMarked(BOOK);return}if(u==='HEARTS'||u==='HEART'||u==='FAVOURITES'||u==='FAVORITES'){showMarked(HEART);return}if(u==='PDF'||u==='PDF SELECTED'){const a=typeof selectedRows==='function'?selectedRows():[];pdfProducts(a,'Selected Products');return}const m=u.match(/^(PDF|BOOKMARK|HEART)\s+([A-Z0-9._-]+)$/);if(m){const p=findProduct(m[2]);if(!p)return toast2('SKU not found: '+m[2]);if(m[1]==='PDF')pdfProducts([p],'Product '+p.sku);else toast2((m[1]==='BOOKMARK'?'Bookmark':'Heart')+' '+(toggle(m[1]==='BOOKMARK'?BOOK:HEART,p.sku)?'added':'removed')+' for '+p.sku);return}toast2('Try HARD SYNC, PDF, BOOKMARK MB-CCE1 or HEART MB-CCE1')}

  /* Repaint after the original app finishes its normal async loads. */
  function wrapLoaders(){
    if(typeof window.loadAdmin==='function'&&!window.__mbAdminWrapped){const old=window.loadAdmin;window.__mbAdminWrapped=true;window.loadAdmin=async function(){const r=await old.apply(this,arguments);cachePut(Array.isArray(masterProducts)?masterProducts:[]);installCommands();decorateCards();return r}}
    if(typeof window.loadVendor==='function'&&!window.__mbVendorWrapped){const old=window.loadVendor;window.__mbVendorWrapped=true;window.loadVendor=async function(){const r=await old.apply(this,arguments);installCommands();decorateCards();return r}}
  }
  function start(){installPdf();wrapLoaders();installCommands();decorateCards();setTimeout(()=>{wrapLoaders();decorateCards()},800);setTimeout(()=>{if(session()?.role==='admin')fastMasterRefresh(false)},1200);const obs=new MutationObserver(()=>{wrapLoaders();installCommands();decorateCards()});obs.observe(document.body,{childList:true,subtree:true});}
  setTimeout(start,50);
})();
