/* MULTYBYTE — STABLE GATEWAY SHIELD
 * Transport is a protected core. All future portal features must call __MB_GATEWAY
 * or the app.js api() wrapper; never introduce another Apps Script URL.
 */
(function(){'use strict';
const API=window.__MB_CANONICAL_API||'https://script.google.com/macros/s/AKfycbwCGKZiV57bzmcrW5aVF5R7SpbwEqCs911boTjJbkPYvFEZJ-QNL0iD42qrxXfT9/exec';
window.__MB_CANONICAL_API=API;
window.__MB_GATEWAY_VERSION='stable-v2';
const $=id=>document.getElementById(id);
function session(){try{return JSON.parse(localStorage.getItem('mb_vendor_session')||'null')}catch(e){return null}}
function token(){return session()?.token||''}
function toastSafe(x){if(typeof window.toast==='function')window.toast(x);else console.log(x)}
function gateway(params,timeout){
 timeout=timeout||25000;
 return new Promise((resolve,reject)=>{
  let attempt=0,finished=false,script,timer;
  const run=()=>{
   attempt++;
   const cb='mb_gateway_'+Date.now()+'_'+Math.random().toString(36).slice(2);
   const q=new URLSearchParams({...params,callback:cb,_mbts:Date.now(),_attempt:attempt});
   const cleanup=()=>{clearTimeout(timer);try{delete window[cb]}catch(e){}if(script)script.remove()};
   const fail=msg=>{cleanup();if(attempt<4&&!finished){setTimeout(run,Math.min(1500,300*attempt));return}finished=true;reject(new Error(msg))};
   window[cb]=data=>{if(finished)return;finished=true;cleanup();resolve(data)};
   script=document.createElement('script');script.async=true;script.src=API+'?'+q.toString();
   script.onerror=()=>fail('Gateway unavailable');
   document.head.appendChild(script);
   timer=setTimeout(()=>fail('Gateway timeout'),timeout);
  };
  run();
 });
}
window.__MB_GATEWAY=gateway;
async function loginSafe(){
 const id=$('loginId')?.value.trim(),password=$('loginPassword')?.value;
 if(!id||!password){if($('loginMsg'))$('loginMsg').textContent='Enter ID and password.';return}
 const b=$('loginBtn');if(b)b.disabled=true;if($('loginMsg'))$('loginMsg').textContent='Connecting…';
 try{
  const r=await gateway({action:'login',role:window.__mbLoginRole||'vendor',id,password});
  if(!r?.success)throw Error(r?.message||'Login failed');
  localStorage.setItem('mb_vendor_session',JSON.stringify(r));
  if(typeof window.openPortal==='function')window.openPortal(r);
 }catch(e){if($('loginMsg'))$('loginMsg').textContent=e.message||'Gateway unavailable'}
 finally{if(b)b.disabled=false}
}
function bindLogin(){
 const old=$('loginBtn');if(!old)return;
 const b=old.cloneNode(true);old.replaceWith(b);b.addEventListener('click',loginSafe);b.addEventListener('keydown',e=>e.key==='Enter'&&loginSafe());
 const vr=$('vendorRole'),ar=$('adminRole');
 if(vr){const n=vr.cloneNode(true);vr.replaceWith(n);n.addEventListener('click',()=>{window.__mbLoginRole='vendor';n.classList.add('active');$('adminRole')?.classList.remove('active')})}
 if(ar){const n=ar.cloneNode(true);ar.replaceWith(n);n.addEventListener('click',()=>{window.__mbLoginRole='admin';n.classList.add('active');$('vendorRole')?.classList.remove('active')})}
 window.__mbLoginRole='vendor';
}
async function loadAdminFixed(){try{const [a,v,m]=await Promise.all([gateway({action:'adminProducts',token:token()}),gateway({action:'adminVendors',token:token()}),gateway({action:'data',token:token()})]);window.products=a?.products||[];window.masterProducts=m?.products||m?.data||[];window.vendors=v?.vendors||[];if(typeof drawAdminStats==='function')drawAdminStats();if(typeof drawAdminProducts==='function')drawAdminProducts();if(typeof drawDashboard==='function')drawDashboard();await loadPOFixed()}catch(e){toastSafe('Admin gateway failed: '+e.message)}}
async function loadVendorFixed(){try{const r=await gateway({action:'vendorData',token:token()});window.products=r?.products||[];if(typeof drawVendor==='function')drawVendor();if(typeof drawDashboard==='function')drawDashboard()}catch(e){toastSafe('Vendor gateway failed: '+e.message)}}
async function loadPOFixed(){try{const r=await gateway({action:'purchaseOrders',token:token()});if(!r?.success)throw Error(r?.message||'Purchase orders failed');window.pos=r.purchaseOrders||r.data||[];if(typeof drawPO==='function')drawPO('adminPO',window.pos);if(typeof drawDashboard==='function')drawDashboard();return r}catch(e){toastSafe('Purchase orders failed: '+e.message)}}
async function loadVendorsFixed(){try{return await gateway({action:'adminVendors',token:token()})}catch(e){toastSafe('Vendors failed: '+e.message)}}
async function addSkuFixed(){const sku=$('poSku')?.value.trim();if(!sku)return;try{const r=await gateway({action:'purchaseLookup',token:token(),sku});if(!r?.success)throw Error(r?.message||'SKU lookup failed');const p=r.product||r.data;if(!p?.sku)throw Error('SKU not found in Website Listing');window.poItems=window.poItems||[];if(window.poItems.some(x=>String(x.sku).toLowerCase()===String(p.sku).toLowerCase()))throw Error('SKU already added');window.poItems.push({...p,quantity:1});$('poSku').value='';if(typeof renderPOItems==='function')renderPOItems();if($('poLookup'))$('poLookup').textContent='Added '+(p.productName||p.name||p.sku)}catch(e){toastSafe(e.message)}}
async function createPOFixed(){const vs=typeof selectedPOVendors==='function'?selectedPOVendors():[];if(!vs.length)return toastSafe('Select at least one vendor.');if(!(window.poItems||[]).length)return toastSafe('Add at least one SKU.');const b=$('poCreate');if(b)b.disabled=true;try{for(const v of vs){const r=await gateway({action:'savePurchaseOrder',token:token(),vendorId:v.id,vendorName:v.name,items:JSON.stringify(window.poItems.map(p=>({sku:p.sku,quantity:p.quantity,remarks:p.remarks||''})))});if(!r?.success)throw Error(r?.message||'Purchase order failed')}toastSafe('Purchase order created successfully.');if(typeof closePO==='function')closePO();await loadPOFixed()}catch(e){toastSafe(e.message)}finally{if(b)b.disabled=false}}
function install(){
 window.loadAdminFixed=loadAdminFixed;window.loadVendorFixed=loadVendorFixed;window.loadPOFixed=loadPOFixed;window.loadAdmin=loadAdminFixed;window.loadPO=loadPOFixed;window.loadVendors=loadVendorsFixed;window.addPOSku=addSkuFixed;window.createPO=createPOFixed;
 bindLogin();
 const poRefresh=$('adminPORefresh');if(poRefresh){const n=poRefresh.cloneNode(true);poRefresh.replaceWith(n);n.addEventListener('click',loadPOFixed)}
 const poAdd=$('poAdd');if(poAdd){const n=poAdd.cloneNode(true);poAdd.replaceWith(n);n.addEventListener('click',addSkuFixed)}
 const poCreate=$('poCreate');if(poCreate){const n=poCreate.cloneNode(true);poCreate.replaceWith(n);n.addEventListener('click',createPOFixed)}
}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',install);else install();
})();
