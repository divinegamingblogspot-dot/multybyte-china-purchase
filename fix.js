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
async function openPOFixed(){if(session()?.role!=='admin')return;window.poItems=[];try{window.eval('poItems=window.poItems')}catch(e){}const modal=$('poModal')||document.querySelector('.modal');if(modal)modal.classList.remove('hidden');renderPOVendorsFixed();if(typeof renderPOItems==='function')renderPOItems();await loadVendorsFixed();renderPOVendorsFixed()}
async function ensurePOVendorAccount(v){
  if(!v||!v.name)return v;
  if(!v.masterOnly)return v;
  const base=String(v.name).trim().toLowerCase().replace(/[^a-z0-9]+/g,'-').replace(/^-|-$/g,'').slice(0,28)||'vendor';
  let id='vendor-'+base;
  const pw='MB@'+id.replace(/[^A-Za-z0-9]/g,'').slice(-24)+'#1';
  const r=await gateway({action:'saveVendor',token:token(),id,name:v.name,password:pw,enabled:'true'});
  if(!r?.success)throw Error(r?.message||('Could not create vendor account for '+v.name));
  return {...v,id,masterOnly:false};
}
async function createPOFixed(){
  const vs=typeof selectedPOVendors==='function'?selectedPOVendors():[];
  if(!vs.length)return toastSafe('Select at least one vendor.');
  if(!(window.poItems||[]).length)return toastSafe('Add at least one SKU.');
  const b=$('poCreate');if(b)b.disabled=true;
  try{
    for(const raw of vs){
      const v=await ensurePOVendorAccount(raw);
      const r=await gateway({action:'savePurchaseOrder',token:token(),vendorId:v.id,vendorName:v.name,items:JSON.stringify((window.poItems||[]).map(p=>({sku:p.sku,quantity:p.quantity,remarks:p.remarks||''})))});
      if(!r?.success)throw Error(r?.message||'Purchase order failed');
    }
    toastSafe('Purchase order created successfully.');
    if(typeof closePO==='function')closePO();
    await loadPOFixed();
  }catch(e){toastSafe(e.message)}finally{if(b)b.disabled=false}
}
function openPortalFixed(r){$('loginScreen')?.classList.add('hidden');$('portal')?.classList.remove('hidden');const admin=r?.role==='admin';if($('welcome'))$('welcome').textContent=admin?'Administrator Dashboard':'Welcome, '+(r?.name||r?.id||'Vendor');if($('vendorIdentity'))$('vendorIdentity').textContent=admin?'MASTER ACCESS • PRODUCTS • VENDORS • PURCHASE ORDERS':'VENDOR ACCOUNT • '+(r?.id||'');if($('connection'))$('connection').innerHTML='<i></i>LIVE';document.querySelectorAll('.adminOnly').forEach(x=>x.classList.toggle('hidden',!admin));if(admin)loadAdminFixed();else loadVendorFixed();if(typeof showSection==='function')showSection('dashboard')}
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
function install(){window.loadAdminFixed=loadAdminFixed;window.loadVendorFixed=loadVendorFixed;window.loadPOFixed=loadPOFixed;window.loadAdmin=loadAdminFixed;window.loadVendor=loadVendorFixed;window.loadPO=loadPOFixed;window.loadVendors=loadVendorsFixed;window.addPOSku=addSkuFixed;window.createPO=createPOFixed;window.openPO=openPOFixed;window.openPortal=openPortalFixed;window.saveVendor=saveVendorFixed;window.openVendorEditor=openVendorEditorFixed;bindLogin();bindVendorSave();setTimeout(bindVendorSave,300);setTimeout(bindVendorSave,1000);const poRefresh=$('adminPORefresh');if(poRefresh){const n=poRefresh.cloneNode(true);poRefresh.replaceWith(n);n.addEventListener('click',loadPOFixed)}const poAdd=$('poAdd');if(poAdd){const n=poAdd.cloneNode(true);poAdd.replaceWith(n);n.addEventListener('click',addSkuFixed)}const poCreate=$('poCreate');if(poCreate){const n=poCreate.cloneNode(true);poCreate.replaceWith(n);n.addEventListener('click',createPOFixed)}const sku=$('poSku');if(sku)sku.addEventListener('keydown',e=>{if(e.key==='Enter'){e.preventDefault();addSkuFixed()}});const quick=$('quickCreatePO');if(quick){const n=quick.cloneNode(true);quick.replaceWith(n);n.addEventListener('click',openPOFixed)}const createButtons=document.querySelectorAll('[data-action="create-po"]');createButtons.forEach(b=>{if(b.dataset.mbPoBound)return;b.dataset.mbPoBound='1';b.addEventListener('click',openPOFixed)});document.addEventListener('click',e=>{const b=e.target.closest('button');if(!b)return;const text=(b.textContent||'').trim().toLowerCase();if(text.includes('create purchase order')||text==='+ create po'){if(!b.dataset.mbPoBound){b.dataset.mbPoBound='1';e.preventDefault();e.stopImmediatePropagation();openPOFixed()}}},true)}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',install);else install();
})();

(function(){
'use strict';
if(window.__MB_PO_LIFECYCLE_V1)return;window.__MB_PO_LIFECYCLE_V1=1;
const $=id=>document.getElementById(id);
const esc=x=>String(x??'').replace(/[&<>"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));
const stages=['Draft','Sent','Viewed','Accepted','Production','QC','Shipped','Received'];
function lifecycleStage(x){
 const raw=String(x?.status||x?.Status||'Draft').trim();
 const map={cleared:'Accepted',completed:'Received',cancelled:'Draft'};
 return map[raw.toLowerCase()]||raw||'Draft';
}
function lifecycleRender(){
 const box=$('poLifecycleList'),sum=$('poLifecycleSummary');if(!box)return;
 const all=Array.isArray(window.__MB_STATE_POS)?window.__MB_STATE_POS:[];
 const q=($('poLifecycleSearch')?.value||'').trim().toLowerCase(),f=$('poLifecycleFilter')?.value||'';
 const filtered=all.filter(x=>{
   const text=[x.poId,x.id,x.vendorName,x.vendor,x.sku,x.productName].join(' ').toLowerCase();
   return (!q||text.includes(q))&&(!f||lifecycleStage(x).toLowerCase()===f.toLowerCase());
 });
 const counts=stages.map(s=>[s,all.filter(x=>lifecycleStage(x).toLowerCase()===s.toLowerCase()).length]);
 if(sum)sum.innerHTML=counts.map(x=>'<div class="metric"><span>'+esc(x[0].toUpperCase())+'</span><b>'+x[1]+'</b></div>').join('');
 if(!filtered.length){box.innerHTML='<div class="state">No purchase orders found for this lifecycle filter.</div>';return}
 box.innerHTML=filtered.map(x=>{
   const stage=lifecycleStage(x),idx=Math.max(0,stages.findIndex(s=>s.toLowerCase()===stage.toLowerCase()));
   const po=String(x.poId||x.id||'—');
   return '<div class="panel"><div class="sectionTitle"><div><span class="pill ok">'+esc(po)+'</span><h3 style="margin-top:8px">'+esc(x.vendorName||x.vendor||'Vendor')+'</h3></div><span class="pill">'+esc(stage)+'</span></div>'+
   '<div style="color:var(--muted);font-size:11px;margin:8px 0">'+esc(x.productName||'—')+' • SKU '+esc(x.sku||'—')+' • Qty '+esc(x.quantity??'—')+'</div>'+
   '<div class="timeline">'+stages.map((s,i)=>'<div class="step '+(i<idx?'done':i===idx?'on':'')+'">'+esc(s.toUpperCase())+'</div>').join('')+'</div>'+
   '<div class="actions" style="margin-top:12px"><span class="pill">Created: '+esc(x.createdAt||'—')+'</span><span class="pill">Supplier: '+esc(x.supplier||'—')+'</span></div></div>';
 }).join('');
}
function openLifecycle(){if(typeof window.showSection==='function')window.showSection('poLifecycle');else{document.querySelectorAll('main section').forEach(s=>s.classList.add('hidden'));$('poLifecycleSection')?.classList.remove('hidden')}setTimeout(lifecycleRender,100)}
function installLifecycle(){
 const nav=$('navPOLifecycle');
 if(nav&&!nav.dataset.mbLifecycle){nav.dataset.mbLifecycle='1';nav.addEventListener('click',openLifecycle)}
 const refresh=$('poLifecycleRefresh');if(refresh&&!refresh.dataset.mbLifecycle){refresh.dataset.mbLifecycle='1';refresh.onclick=async()=>{if(typeof window.loadPO==='function')await window.loadPO();lifecycleRender()}}
 $('poLifecycleSearch')?.addEventListener('input',lifecycleRender);
 $('poLifecycleFilter')?.addEventListener('change',lifecycleRender);
 const old=window.showSection;
 if(old&&!old.__mbLifecycle){
   const w=function(n){
     const r=old.apply(this,arguments);
     if(n==='poLifecycle'){document.querySelectorAll('main section').forEach(s=>s.classList.add('hidden'));$('poLifecycleSection')?.classList.remove('hidden');setTimeout(lifecycleRender,80)}
     return r;
   };w.__mbLifecycle=true;window.showSection=w;
 }
}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',()=>setTimeout(installLifecycle,900));else setTimeout(installLifecycle,900);
setInterval(()=>{if(!$('poLifecycleSection')?.classList.contains('hidden'))lifecycleRender()},2500);
})();
