/* MULTYBYTE — PROTECTED GATEWAY CORE
 * SINGLE SOURCE OF TRUTH: one deployed Apps Script endpoint.
 * This file is loaded after app.js, so it also protects legacy transport code.
 * PO vendor rendering is intentionally scoped to the PO modal only.
 */
(function(){'use strict';
const CANONICAL='https://script.google.com/macros/s/AKfycbwCGKZiV57bzmspcr5W2aVF5R7SpbwEqCs911boTjJbkPYvFEZJ-QNL0iD42qrxXfT9/exec';
try{Object.defineProperty(window,'__MB_CANONICAL_API',{value:CANONICAL,writable:false,configurable:false,enumerable:true})}catch(e){window.__MB_CANONICAL_API=CANONICAL}
window.__MB_GATEWAY_VERSION='protected-v11';window.__MB_GATEWAY_URL=CANONICAL;
const nativeAppendChild=Node.prototype.appendChild;
Node.prototype.appendChild=function(node){try{if(node&&node.tagName==='SCRIPT'&&typeof node.src==='string'&&node.src.indexOf('script.google.com/macros/s/')!==-1){const u=new URL(node.src);if(u.pathname.endsWith('/exec')){const target=new URL(CANONICAL);u.searchParams.forEach((v,k)=>target.searchParams.set(k,v));node.src=target.toString()}}}catch(e){}return nativeAppendChild.call(this,node)};
const $=id=>document.getElementById(id);
function session(){try{return JSON.parse(localStorage.getItem('mb_vendor_session')||'null')}catch(e){return null}}
function token(){return session()?.token||''}
function toastSafe(x){if(typeof window.toast==='function')window.toast(x);else console.log(x)}
function normalizeProductSafe(p){p=p||{};return {productName:p.productName||p.name||p['Product Name']||'',sku:String(p.sku??p.SKU??p.SKU_ID??p.sku_id??p['SKU']??p['SKU ID']??'').trim(),productLink:p.productLink||p.productURL||p.link||p['Multybyte Link']||p['Product Link']||'',status:p.status||p.productStatus||p['Admin Panel Status']||'Active',landingCost:p.landingCost??p.price??p['Landing Cost']??'',price:p.price??p.landingCost??p['Price']??'',supplier:p.supplier||p.supplierName||p['Supplier Name']||p['Supplier']||'',vendor:p.vendor||p.vendorName||p['Vendor Name']||p['Vendor']||p['Supplier Name']||'',quantity:p.quantity??p.qty??p['Quantity']??'',remarks:p.remarks||p.remark||p['Remarks']||'',image:p.image||p.imageUrl||p['Image']||'',confirmedQuantity:p.confirmedQuantity||'',productionDays:p.productionDays||'',vendorRemarks:p.vendorRemarks||''}}
function normalizeVendorSafe(v){v=v||{};return {id:String(v.id||v.userId||v.userID||v.vendorId||v.vendorID||''),name:String(v.name||v.vendorName||v.vendor||v.userName||v['Vendor Name']||v['Supplier Name']||'').trim(),enabled:v.enabled!==false&&v.status!=='Disabled',masterOnly:!!v.masterOnly}}
function syncAppState(p,v,m,o){window.__MB_STATE_PRODUCTS=Array.isArray(p)?p:[];window.__MB_STATE_VENDORS=Array.isArray(v)?v:[];window.__MB_STATE_MASTER=Array.isArray(m)?m:[];window.__MB_STATE_POS=Array.isArray(o)?o:[];try{window.eval('products=window.__MB_STATE_PRODUCTS; vendors=window.__MB_STATE_VENDORS; masterProducts=window.__MB_STATE_MASTER; pos=window.__MB_STATE_POS;')}catch(e){}}
function gateway(params,timeout){timeout=timeout||25000;return new Promise((resolve,reject)=>{let attempt=0,finished=false,script,timer;const run=()=>{attempt++;const cb='mb_gateway_'+Date.now()+'_'+Math.random().toString(36).slice(2);const q=new URLSearchParams({...params,callback:cb,_mbts:Date.now(),_attempt:attempt});const cleanup=()=>{clearTimeout(timer);try{delete window[cb]}catch(e){}if(script)script.remove()};const fail=msg=>{cleanup();if(attempt<4&&!finished){setTimeout(run,Math.min(1500,300*attempt));return}finished=true;reject(new Error(msg))};window[cb]=data=>{if(finished)return;finished=true;cleanup();resolve(data)};script=document.createElement('script');script.async=true;script.src=CANONICAL+'?'+q.toString();script.onerror=()=>fail('Gateway unavailable');document.head.appendChild(script);timer=setTimeout(()=>fail('Gateway timeout'),timeout)};run()})}
window.__MB_GATEWAY=gateway;
async function saveVendorFixed(){
  const id=$('newVendorId')?.value.trim()||'';
  const name=$('newVendorName')?.value.trim()||'';
  const password=$('newVendorPassword')?.value||'';
  if(!id||!name){toastSafe('Vendor User ID and Vendor Name are required.');return false}
  const b=$('saveVendor');if(b)b.disabled=true;
  try{
    const r=await gateway({action:'saveVendor',token:token(),id,name,password,enabled:'true'});
    if(!r?.success)throw Error(r?.message||'Vendor could not be saved.');
    if($('newVendorPassword'))$('newVendorPassword').value='';
    toastSafe(r.message||'Vendor created successfully.');
    if(typeof window.loadVendors==='function')await window.loadVendors();
    if(typeof window.loadAdminFixed==='function')await window.loadAdminFixed();
    return true;
  }catch(e){toastSafe(e.message||'Vendor save failed.');return false}
  finally{if(b)b.disabled=false}
}
async function loginSafe(){const id=$('loginId')?.value.trim(),password=$('loginPassword')?.value;if(!id||!password){if($('loginMsg'))$('loginMsg').textContent='Enter ID and password.';return}const b=$('loginBtn');if(b)b.disabled=true;if($('loginMsg'))$('loginMsg').textContent='Connecting…';try{const r=await gateway({action:'login',role:window.__mbLoginRole||'vendor',id,password});if(!r?.success)throw Error(r?.message||'Login failed');localStorage.setItem('mb_vendor_session',JSON.stringify(r));if(typeof window.openPortal==='function')window.openPortal(r)}catch(e){if($('loginMsg'))$('loginMsg').textContent=e.message||'Gateway unavailable'}finally{if(b)b.disabled=false}}
function arr(r,keys){for(const k of keys){if(Array.isArray(r?.[k]))return r[k]}return []}
async function loadAdminFixed(){try{const[a,v,m]=await Promise.all([gateway({action:'adminProducts',token:token()}),gateway({action:'adminVendors',token:token()}),gateway({action:'data',token:token()})]);if(a?.success===false)throw Error(a.message||'Products request failed');if(v?.success===false)throw Error(v.message||'Vendors request failed');const productsData=arr(a,['products','data']).map(normalizeProductSafe),vendorsData=arr(v,['vendors','data','users']).map(normalizeVendorSafe),masterData=arr(m,['products','data']).map(normalizeProductSafe);syncAppState(productsData,vendorsData,masterData,[]);if(typeof window.mergeMasterVendors==='function')window.mergeMasterVendors({success:true,data:masterData,products:masterData});if(typeof drawAdminStats==='function')drawAdminStats();if(typeof drawAdminProducts==='function')drawAdminProducts();if(typeof drawDashboard==='function')drawDashboard();await loadPOFixed()}catch(e){toastSafe('Admin data failed: '+e.message)}}
async function loadVendorFixed(){try{const[r,p]=await Promise.all([gateway({action:'vendorData',token:token()}),gateway({action:'vendorPurchaseOrders',token:token()})]);if(r?.success===false)throw Error(r.message||'Vendor products request failed');if(p?.success===false)throw Error(p.message||'Vendor PO request failed');syncAppState(arr(r,['products','data']).map(normalizeProductSafe),[],[],arr(p,['purchaseOrders','data']));if(typeof drawVendor==='function')drawVendor();if(typeof drawPO==='function')drawPO('vendorPO',arr(p,['purchaseOrders','data']));if(typeof drawDashboard==='function')drawDashboard()}catch(e){toastSafe('Vendor data failed: '+e.message)}}
async function loadPOFixed(){try{const r=await gateway({action:'purchaseOrders',token:token()});if(!r?.success)throw Error(r?.message||'Purchase orders failed');const data=arr(r,['purchaseOrders','data']);window.__MB_STATE_POS=data;try{window.eval('pos=window.__MB_STATE_POS;')}catch(e){}if(typeof drawPO==='function')drawPO('adminPO',data);if(typeof drawDashboard==='function')drawDashboard();return r}catch(e){toastSafe('Purchase orders failed: '+e.message)}}
function vendorListForPO(){let list=Array.isArray(window.__MB_STATE_VENDORS)?window.__MB_STATE_VENDORS.slice():[];if(typeof window.deriveVendors==='function'){try{list=window.deriveVendors(window.__MB_STATE_MASTER||[],list)||list}catch(e){}}const seen=new Set(list.map(v=>String(v.name||'').trim().toLowerCase()).filter(Boolean));(window.__MB_STATE_MASTER||[]).forEach(p=>{const n=String(p.vendor||p.vendorName||p.supplier||p.supplierName||'').trim();if(n&&!seen.has(n.toLowerCase())){list.push({id:'vendor-'+n.toLowerCase().replace(/[^a-z0-9]+/g,'-').replace(/^-|-$/g,''),name:n,enabled:true,masterOnly:true});seen.add(n.toLowerCase())}});return list.filter(v=>v&&v.name&&v.enabled!==false)}
function vendorBox(){return $('poVendors')||$('vendorList')||document.querySelector('#poModal .multiVendor')||document.querySelector('.modal .multiVendor')}
function esc(x){return String(x??'').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/\"/g,'&quot;')}
function renderPOVendorsFixed(){const box=vendorBox();if(!box)return;const list=vendorListForPO();window.__MB_STATE_VENDORS=list;try{window.eval('vendors=window.__MB_STATE_VENDORS;')}catch(e){}if(!list.length){box.innerHTML='<div class="state" style="padding:18px">No vendors available.</div>';return}box.innerHTML=list.map(v=>'<label style="display:flex;align-items:center;gap:9px;padding:8px 0;cursor:pointer"><input class="poVendorCheck" type="checkbox" value="'+esc(v.id)+'" data-name="'+esc(v.name)+'"><span><b>'+esc(v.name)+'</b>'+(v.masterOnly?' <small style="color:var(--muted)">(Listing vendor)</small>':'')+'</span></label>').join('')}
async function loadVendorsFixed(){try{const r=await gateway({action:'adminVendors',token:token()});const accounts=arr(r,['vendors','data','users']).map(normalizeVendorSafe);const master=await gateway({action:'data',token:token()});const masterData=arr(master,['data','products']).map(normalizeProductSafe);window.__MB_STATE_VENDORS=accounts;window.__MB_STATE_MASTER=masterData;try{if(typeof window.mergeMasterVendors==='function')window.mergeMasterVendors({success:true,data:masterData,products:masterData})}catch(e){}renderPOVendorsFixed();if(typeof drawDashboard==='function')drawDashboard();return r}catch(e){toastSafe('Vendors failed: '+e.message);renderPOVendorsFixed()}}
async function addSkuFixed(){const sku=$('poSku')?.value.trim();if(!sku)return;try{let r=await gateway({action:'purchaseLookup',token:token(),sku});let p=r?.success?normalizeProductSafe(r.product||r.data):null;if(!p?.sku){const s=await gateway({action:'searchListing',token:token(),query:sku});const a=arr(s,['data','products','results']);const exact=a.find(x=>String(x?.sku??x?.SKU??x?.SKU_ID??x?.['SKU']??'').trim().toLowerCase()===sku.toLowerCase());if(exact)p=normalizeProductSafe(exact)}if(!p?.sku)throw Error(r?.message||'SKU not found in Website Listing');window.poItems=Array.isArray(window.poItems)?window.poItems:[];if(window.poItems.some(x=>String(x.sku).toLowerCase()===String(p.sku).toLowerCase()))throw Error('SKU already added');window.poItems.push({...p,quantity:1});try{window.eval('poItems=window.poItems;')}catch(e){}$('poSku').value='';if(typeof renderPOItems==='function')renderPOItems();if($('poLookup'))$('poLookup').textContent='Added '+(p.productName||p.sku);const target=String(p.vendor||p.supplier||'').trim().toLowerCase();if(target)document.querySelectorAll('.poVendorCheck').forEach(c=>{if(String(c.dataset.name||'').trim().toLowerCase()===target)c.checked=true})}catch(e){toastSafe(e.message)}}
async function openPOFixed(){
  if(session()?.role!=='admin')return;
  if(window.__MB_PO_OPENING)return;
  window.__MB_PO_OPENING=true;
  try{
    window.poItems=[];
    try{window.eval('poItems=window.poItems')}catch(e){}
    const modal=$('poModal')||document.querySelector('.modal');
    if(modal)modal.classList.remove('hidden');
    renderPOVendorsFixed();
    if(typeof renderPOItems==='function')renderPOItems();
    await loadVendorsFixed();
    renderPOVendorsFixed();
  }finally{window.__MB_PO_OPENING=false}
}
async function ensurePOVendorAccount(v){
  if(!v||!v.name)return v;
  const wanted=String(v.name||'').trim();
  const accounts=Array.isArray(window.__MB_STATE_VENDORS)?window.__MB_STATE_VENDORS:[];
  const existing=accounts.find(x=>String(x?.name||'').trim().toLowerCase()===wanted.toLowerCase());
  if(existing&&existing.id)return {...existing,masterOnly:false};

  const base=wanted.toLowerCase().replace(/[^a-z0-9]+/g,'-').replace(/^-|-$/g,'').slice(0,28)||'vendor';
  let id='vendor-'+base;
  const pw='MB@'+id.replace(/[^A-Za-z0-9]/g,'').slice(-24)+'#1';
  const saved=await gateway({action:'saveVendor',token:token(),id,name:wanted,password:pw,enabled:'true'});
  if(!saved?.success)throw Error(saved?.message||('Could not create vendor account for '+wanted));

  // Never trust the synthetic client-side ID. Re-read the authoritative VENDORS sheet.
  const fresh=await gateway({action:'adminVendors',token:token()});
  const list=arr(fresh,['vendors','data','users']).map(normalizeVendorSafe);
  const real=list.find(x=>String(x?.name||'').trim().toLowerCase()===wanted.toLowerCase());
  if(!real?.id)throw Error('Vendor account was created but could not be reloaded from VENDORS.');
  window.__MB_STATE_VENDORS=list;
  return {...real,masterOnly:false};
}
async function createPOFixed(){
  let vs=typeof selectedPOVendors==='function'?selectedPOVendors():[];
  if(!vs.length)return toastSafe('Select at least one vendor.');
  if(!(window.poItems||[]).length)return toastSafe('Add at least one SKU.');
  const b=$('poCreate');if(b)b.disabled=true;
  try{
    const accounts=Array.isArray(window.__MB_STATE_VENDORS)?window.__MB_STATE_VENDORS:[];
    for(const raw of vs){
      const name=String(raw.name||raw.id||'').trim();
      let v=accounts.find(x=>String(x?.name||'').trim().toLowerCase()===name.toLowerCase())
        ||accounts.find(x=>String(x?.id||'').trim().toLowerCase()===String(raw.id||'').trim().toLowerCase())
        ||raw;
      if(!v?.id||v.masterOnly)v=await ensurePOVendorAccount(v);
      if(!v?.id||!v?.name)throw Error('Vendor not available. Please refresh the vendor list and select the vendor again.');

      const r=await gateway({
        action:'savePurchaseOrder',
        token:token(),
        vendorId:v.id,
        vendorName:v.name,
        items:JSON.stringify((window.poItems||[]).map(p=>({
          sku:p.sku,productName:p.productName,supplier:p.supplier,
          landingCost:p.landingCost??p.price,price:p.price??p.landingCost,
          quantity:p.quantity,remarks:p.remarks||'',
          productLink:p.productLink,image:p.image||''
        })))
      });
      if(!r?.success)throw Error(r?.message||'Purchase order failed');
    }
    toastSafe('Purchase order created and saved successfully.');
    if(typeof closePO==='function')closePO();
    await loadPOFixed();
  }catch(e){toastSafe(e.message)}finally{if(b)b.disabled=false}
}
async function openPortalFixed(r){
  $('loginScreen')?.classList.add('hidden');$('portal')?.classList.remove('hidden');
  const admin=r?.role==='admin';
  if($('welcome'))$('welcome').textContent=admin?'Administrator Dashboard':'Welcome, '+(r?.name||r?.id||'Vendor');
  if($('vendorIdentity'))$('vendorIdentity').textContent=admin?'MASTER ACCESS • PRODUCTS • VENDORS • PURCHASE ORDERS':'VENDOR ACCOUNT • '+(r?.id||'');
  if($('connection'))$('connection').innerHTML='<i></i>LIVE';
  document.querySelectorAll('.adminOnly').forEach(x=>x.classList.toggle('hidden',!admin));
  if(admin)await loadAdminFixed();else await loadVendorFixed();
  if(typeof window.__MB_ENHANCE?.hydrateImages==='function'){
    try{
      if(admin)await window.__MB_ENHANCE.hydrateImages(window.__MB_STATE_PRODUCTS||[]);
      else await window.__MB_ENHANCE.hydrateImages(window.__MB_STATE_PRODUCTS||[]);
      if(typeof drawAdminProducts==='function'&&admin)drawAdminProducts();
      if(typeof drawVendor==='function'&&!admin)drawVendor();
    }catch(e){}
  }
  if(typeof showSection==='function')showSection('dashboard');
}
function mbRemoveLifecycleUI(){
  const root=document.getElementById('adminPOSection'); if(!root)return;
  root.querySelectorAll('*').forEach(el=>{
    const t=(el.textContent||'').replace(/\\s+/g,' ').trim().toLowerCase();
    if(!t)return;
    if((t.includes('workflow control')&&t.includes('po lifecycle'))||t.includes('po lifecycle')){
      if(el!==root && el.parentElement)el.remove();
    }
  });
}
function mbInstallTheme(){
  const key='mb_portal_theme_v1';
  const themes={
    dark:{bg:'#071b1b',bg2:'#0b2524',panel:'#102d2d',panel2:'#123535',white:'#f7fffc',muted:'#91aaa5',line:'#244846',lime:'#b7f34a',teal:'#16e0bd'},
    light:{bg:'#f4f8f7',bg2:'#eaf1ef',panel:'#ffffff',panel2:'#f3f8f6',white:'#102321',muted:'#58716c',line:'#cbd9d5',lime:'#6a9f16',teal:'#087f70'},
    midnight:{bg:'#090d1a',bg2:'#11172a',panel:'#151c32',panel2:'#1b2440',white:'#f5f7ff',muted:'#9ba7c2',line:'#303a59',lime:'#9be564',teal:'#65d8ff'},
    emerald:{bg:'#061914',bg2:'#0a241d',panel:'#0d2b22',panel2:'#12382c',white:'#f3fff9',muted:'#91b5a7',line:'#245444',lime:'#c5f36a',teal:'#35e6ae'}
  };
  const apply=name=>{const th=themes[name]||themes.dark;Object.entries(th).forEach(([k,v])=>document.documentElement.style.setProperty('--'+k,v));document.body.dataset.theme=name;document.querySelectorAll('[data-theme-choice]').forEach(b=>{b.classList.toggle('primary',b.dataset.themeChoice===name)});try{localStorage.setItem(key,name)}catch(e){}};
  let saved='dark';try{saved=localStorage.getItem(key)||'dark'}catch(e){};apply(saved);
  document.querySelectorAll('[data-theme-choice]').forEach(b=>{if(b.dataset.mbThemeBound)return;b.dataset.mbThemeBound='1';b.addEventListener('click',()=>apply(b.dataset.themeChoice))});
}
function mbKeepSession(){
  try{
    const raw=localStorage.getItem('mb_vendor_session');
    if(raw){const s=JSON.parse(raw);if(s&&s.token){localStorage.setItem('mb_vendor_session',JSON.stringify(s))}}
  }catch(e){}
}
function mbWatchPOForLifecycle(){
  mbRemoveLifecycleUI();
  if(window.__MB_PO_CLEANUP_OBSERVER)return;
  const root=document.getElementById('adminPOSection');if(!root)return;
  const ob=new MutationObserver(()=>mbRemoveLifecycleUI());ob.observe(root,{childList:true,subtree:true});window.__MB_PO_CLEANUP_OBSERVER=ob;
}
function bindLogin(){const old=$('loginBtn');if(!old)return;const b=old.cloneNode(true);old.replaceWith(b);b.addEventListener('click',loginSafe);b.addEventListener('keydown',e=>e.key==='Enter'&&loginSafe);const vr=$('vendorRole'),ar=$('adminRole');if(vr){const n=vr.cloneNode(true);vr.replaceWith(n);n.addEventListener('click',()=>{window.__mbLoginRole='vendor';n.classList.add('active');$('adminRole')?.classList.remove('active')})}if(ar){const n=ar.cloneNode(true);ar.replaceWith(n);n.addEventListener('click',()=>{window.__mbLoginRole='admin';n.classList.add('active');$('vendorRole')?.classList.remove('active')})}window.__mbLoginRole='vendor'}
function openVendorEditorFixed(index){
  const list=Array.isArray(window.__MB_STATE_VENDORS)?window.__MB_STATE_VENDORS:[];
  const v=list[Number(index)];
  if(!v)return;
  document.getElementById('mbBackendVendorModal')?.remove();
  const d=document.createElement('div');d.id='mbBackendVendorModal';d.className='modal';
  const escV=x=>String(x??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  d.innerHTML='<div class="modalBox"><div class="sectionTitle"><div><div class="eyebrow">VENDOR ACCOUNT</div><h2 style="margin:4px 0">Edit Vendor</h2></div><button class="btn" data-close>Close</button></div>'+
  '<div class="profileGrid"><div><label class="eyebrow">VENDOR NAME</label><input id="beVN" class="field" value="'+escV(v.name)+'"></div>'+
  '<div><label class="eyebrow">LOGIN ID</label><input id="beVI" class="field" value="'+escV(v.id)+'"></div>'+
  '<div><label class="eyebrow">NEW PASSWORD</label><input id="beVP" type="password" class="field" placeholder="Leave blank to keep current"></div>'+
  '<div><label class="eyebrow">STATUS</label><select id="beVE" class="field"><option value="true" '+(v.enabled!==false?'selected':'')+'>Active</option><option value="false" '+(v.enabled===false?'selected':'')+'>Disabled</option></select></div></div>'+
  '<div class="notice">Changes are saved to the VENDORS account system. Website Listing products are not changed.</div>'+
  '<div class="actions" style="justify-content:flex-end"><button class="btn" data-close>Cancel</button><button class="btn primary" id="beSave">Save Vendor</button></div></div>';
  document.body.appendChild(d);
  d.onclick=e=>{if(e.target===d||e.target.closest('[data-close]'))d.remove()};
  d.querySelector('#beSave').onclick=async()=>{
    const name=document.getElementById('beVN').value.trim(),id=document.getElementById('beVI').value.trim(),password=document.getElementById('beVP').value,enabled=document.getElementById('beVE').value==='true';
    if(!name||!id)return toastSafe('Vendor name and Login ID are required.');
    const b=document.getElementById('beSave');b.disabled=true;b.textContent='Saving…';
    try{
      const r=await gateway({action:'saveVendor',token:token(),id,name,password,enabled,oldId:String(v.id||''),oldName:String(v.name||'')});
      if(!r?.success)throw Error(r?.message||'Vendor save failed.');
      d.remove();toastSafe(r.message||'Vendor saved successfully.');await loadVendorsFixed();
    }catch(e){toastSafe(e.message||'Vendor save failed.')}finally{b.disabled=false;b.textContent='Save Vendor'}
  };
}
function bindVendorSave(){
  window.saveVendor=saveVendorFixed;
  const b=$('saveVendor');
  if(!b||b.dataset.mbVendorSaveBound)return;
  b.dataset.mbVendorSaveBound='1';
  b.addEventListener('click',e=>{e.preventDefault();e.stopImmediatePropagation();saveVendorFixed()},true);
}
function install(){mbInstallTheme();mbKeepSession();mbWatchPOForLifecycle();window.loadAdminFixed=loadAdminFixed;window.loadVendorFixed=loadVendorFixed;window.loadPOFixed=loadPOFixed;window.loadAdmin=loadAdminFixed;window.loadVendor=loadVendorFixed;window.loadPO=loadPOFixed;window.loadVendors=loadVendorsFixed;window.addPOSku=addSkuFixed;window.createPO=createPOFixed;window.openPO=openPOFixed;window.openPortal=openPortalFixed;window.saveVendor=saveVendorFixed;window.openVendorEditor=openVendorEditorFixed;bindLogin();bindVendorSave();setTimeout(bindVendorSave,300);setTimeout(bindVendorSave,1000);const poRefresh=$('adminPORefresh');if(poRefresh){const n=poRefresh.cloneNode(true);poRefresh.replaceWith(n);n.addEventListener('click',loadPOFixed)}const poAdd=$('poAdd');if(poAdd){const n=poAdd.cloneNode(true);poAdd.replaceWith(n);n.addEventListener('click',addSkuFixed)}const poCreate=$('poCreate');if(poCreate){const n=poCreate.cloneNode(true);poCreate.replaceWith(n);n.addEventListener('click',createPOFixed)}const sku=$('poSku');if(sku)sku.addEventListener('keydown',e=>{if(e.key==='Enter'){e.preventDefault();addSkuFixed()}});const quick=$('quickCreatePO');if(quick){const n=quick.cloneNode(true);quick.replaceWith(n);n.addEventListener('click',openPOFixed)}const createButtons=document.querySelectorAll('[data-action="create-po"]');createButtons.forEach(b=>{if(b.dataset.mbPoBound)return;b.dataset.mbPoBound='1';b.addEventListener('click',openPOFixed)});document.addEventListener('click',e=>{const b=e.target.closest('button');if(!b)return;const text=(b.textContent||'').trim().toLowerCase();if(text.includes('create purchase order')||text==='+ create po'){if(!b.dataset.mbPoBound){b.dataset.mbPoBound='1';e.preventDefault();e.stopImmediatePropagation();openPOFixed()}}},true)}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',install);else install();
})();
