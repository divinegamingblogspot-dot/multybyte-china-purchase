/* MULTYBYTE PROCUREMENT HOTFIX — search/edit stability layer; website-only overrides */
(function(){
'use strict';
if(window.__MB_PROC_HOTFIX__)return;
window.__MB_PROC_HOTFIX__=true;
const VKEY='mb_web_vendor_edits_v1', PKEY='mb_web_po_actions_v1';
const $=id=>document.getElementById(id);
const read=k=>{try{return JSON.parse(localStorage.getItem(k)||'{}')}catch(e){return{}}};
const write=(k,v)=>localStorage.setItem(k,JSON.stringify(v||{}));
const esc=x=>String(x??'').replace(/[&<>\"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','\"':'&quot;',"'":'&#39;'}[c]));
const pos=()=>window.__MB_STATE_POS||window.pos||[];
const vendors=()=>window.__MB_STATE_VENDORS||window.vendors||[];
function applyPOEdits(){const e=read(PKEY).poEdits||{};pos().forEach(x=>{const k=String(x.poId||x.id||'');if(e[k])Object.assign(x,e[k])});try{window.eval('pos=window.__MB_STATE_POS')}catch(e){}}
function modal(title,body,buttons){document.getElementById('mbHotModal')?.remove();const d=document.createElement('div');d.id='mbHotModal';d.className='modal';d.innerHTML='<div class="modalBox mbHotBox"><div class="sectionTitle"><div><div class="eyebrow">MULTYBYTE PROCUREMENT</div><h2 style="margin:4px 0">'+esc(title)+'</h2></div><button class="btn" data-x>Close</button></div><div>'+body+'</div><div class="actions mbHotActions">'+buttons+'</div></div>';document.body.appendChild(d);d.onclick=e=>{if(e.target===d||e.target.closest('[data-x]'))d.remove()};return d}
function ensureVendorSearch(){const root=$('adminVendorsSection'),box=$('vendorList');if(!root||!box)return;let tools=root.querySelector('.mbVendorProTools');if(!tools)return;const input=tools.querySelector('#mbVendorSearch');if(input&&!input.dataset.hotBound){input.dataset.hotBound='1';input.placeholder='Search vendor name, ID, supplier…';input.addEventListener('input',()=>{const v=input.value.toLowerCase().trim();box.querySelectorAll('tbody tr').forEach(r=>{r.style.display=!v||r.textContent.toLowerCase().includes(v)?'':'none'})})}}
function vendorEdit(k){const e=read(VKEY), all=vendors();const v=all.find(x=>String(x.id||x.name)===String(k));if(!v)return;const old=String(k),saved=e[old]||{};const d=modal('Edit Vendor','<div class="profileGrid"><div><label class="eyebrow">VENDOR NAME</label><input id="hotVN" class="field" value="'+esc(saved.name||v.name)+'"></div><div><label class="eyebrow">USER ID</label><input id="hotVI" class="field" value="'+esc(saved.id||v.id)+'"></div><div><label class="eyebrow">WEBSITE PASSWORD</label><input id="hotVP" type="password" class="field" placeholder="Leave blank to keep current"></div><div><label class="eyebrow">STATUS</label><select id="hotVE" class="field"><option value="true" '+((saved.enabled??v.enabled)!==false?'selected':'')+'>Active</option><option value="false" '+((saved.enabled??v.enabled)===false?'selected':'')+'>Disabled</option></select></div></div><div class="notice">These edits are stored only in this website/browser. The VENDORS Sheet is not modified.</div>','<button class="btn" data-x>Cancel</button><button class="btn primary" id="hotVSave">Save Changes</button>');d.querySelector('#hotVSave').onclick=()=>{const n=$('hotVN').value.trim(),i=$('hotVI').value.trim(),p=$('hotVP').value,en=$('hotVE').value==='true';if(!n||!i){alert('Vendor name and User ID are required.');return}e[old]=Object.assign({},saved,{name:n,id:i,enabled:en});if(p)e[old].password=p;if(old!==i){e[i]=e[old];delete e[old]}write(VKEY,e);Object.assign(v,e[i]||e[old]);d.remove();if(typeof window.__MB_PROC_RENDER==='function')window.__MB_PROC_RENDER('vendors');else window.showSection?.('vendors')}}
function poEdit(k){applyPOEdits();const x=pos().find(z=>String(z.poId||z.id)===String(k));if(!x)return;const e=read(PKEY),saved=e.poEdits?.[k]||{};const val=(a,b)=>esc(saved[a]!==undefined?saved[a]:x[b]??'');const d=modal('Edit Purchase Order','<div class="profileGrid"><div><label class="eyebrow">PO ID</label><input id="hotPOID" class="field" value="'+esc(k)+'" readonly></div><div><label class="eyebrow">VENDOR</label><input id="hotPOV" class="field" value="'+val('vendorName','vendorName')+'"></div><div><label class="eyebrow">SKU</label><input id="hotPOS" class="field" value="'+val('sku','sku')+'"></div><div><label class="eyebrow">PRODUCT</label><input id="hotPOP" class="field" value="'+val('productName','productName')+'"></div><div><label class="eyebrow">QUANTITY</label><input id="hotPOQ" type="number" min="0" class="field" value="'+val('quantity','quantity')+'"></div><div><label class="eyebrow">PRICE / LANDING COST</label><input id="hotPOC" class="field" value="'+esc(saved.landingCost!==undefined?saved.landingCost:(x.landingCost??x.price??''))+'"></div><div><label class="eyebrow">SUPPLIER</label><input id="hotPOSUP" class="field" value="'+val('supplier','supplier')+'"></div><div><label class="eyebrow">STATUS</label><select id="hotPOST" class="field"><option>Draft</option><option>Cleared</option><option>Completed</option><option>Cancelled</option></select></div><div style="grid-column:1/-1"><label class="eyebrow">REMARKS</label><textarea id="hotPOR" class="field" rows="4">'+val('remarks','remarks')+'</textarea></div></div><div class="notice">PO edits are website-only. The underlying PURCHASE_ORDERS Sheet row is not changed.</div>','<button class="btn" data-x>Cancel</button><button class="btn primary" id="hotPOSave">Save Changes</button>');const st=$('hotPOST');st.value=saved.status!==undefined?saved.status:(x.status||'Draft');d.querySelector('#hotPOSave').onclick=()=>{const patch={vendorName:$('hotPOV').value.trim(),vendor:$('hotPOV').value.trim(),sku:$('hotPOS').value.trim(),productName:$('hotPOP').value.trim(),quantity:$('hotPOQ').value,landingCost:$('hotPOC').value.trim(),price:$('hotPOC').value.trim(),supplier:$('hotPOSUP').value.trim(),status:$('hotPOST').value,remarks:$('hotPOR').value};e.poEdits=e.poEdits||{};e.poEdits[k]=Object.assign({},e.poEdits[k]||{},patch);write(PKEY,e);Object.assign(x,patch);d.remove();window.__MB_PROC_RENDER?.('po')}}
function addPOEditButtons(){const root=$('adminPOSection'),box=$('adminPO');if(!root||!box)return;box.querySelectorAll('tbody tr').forEach(tr=>{if(tr.querySelector('[data-hot-po-edit]'))return;const id=tr.querySelector('td')?.textContent?.trim();if(!id)return;const cell=tr.lastElementChild;if(!cell)return;const b=document.createElement('button');b.className='btn';b.textContent='Edit';b.dataset.hotPoEdit=id;b.onclick=()=>poEdit(id);cell.querySelector('.mbRowActions')?.prepend(b)})}
function addPOSearch(){const root=$('adminPOSection'),box=$('adminPO');if(!root||!box)return;const tools=root.querySelector('.mbPOTools');if(!tools)return;const input=tools.querySelector('#mbPOSearch');if(input&&!input.dataset.hotBound){input.dataset.hotBound='1';input.placeholder='Search PO, vendor, SKU, product, supplier…';}}
function stabilizeNavigation(){const old=window.showSection;if(!old||old.__mbHot)return;let last='';const w=function(n){const same=n===last;last=n;if(same&&n==='po'){const p=window.loadPO;window.loadPO=()=>Promise.resolve();try{return old.apply(this,arguments)}finally{window.loadPO=p}}if(same&&n==='vendors'){const p=window.loadVendors;window.loadVendors=()=>Promise.resolve();try{return old.apply(this,arguments)}finally{window.loadVendors=p}}return old.apply(this,arguments)};w.__mbHot=true;window.showSection=w}
function hookLoaders(){const lp=window.loadPO;if(lp&&!lp.__mbHot){const w=async function(){const r=await lp.apply(this,arguments);applyPOEdits();setTimeout(()=>{addPOSearch();addPOEditButtons()},30);return r};w.__mbHot=true;window.loadPO=w}const lv=window.loadVendors;if(lv&&!lv.__mbHot){const w=async function(){const r=await lv.apply(this,arguments);setTimeout(ensureVendorSearch,30);return r};w.__mbHot=true;window.loadVendors=w}}
window.__MB_PROC_RENDER=mode=>{if(mode==='po'){applyPOEdits();setTimeout(()=>{addPOSearch();addPOEditButtons()},0)}else{ensureVendorSearch()}};
function install(){stabilizeNavigation();hookLoaders();ensureVendorSearch();addPOSearch();applyPOEdits();addPOEditButtons();setTimeout(()=>{hookLoaders();ensureVendorSearch();addPOSearch();addPOEditButtons()},500)}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',()=>setTimeout(install,900));else setTimeout(install,900);
})();
(function(){var l=document.createElement('link');l.rel='stylesheet';l.href='procurement-v2.css?v=20260917';document.head.appendChild(l);var a=document.createElement('script');a.src='procurement-v2.js?v=20260917-v2';a.defer=true;document.head.appendChild(a);var b=document.createElement('script');b.src='procurement-v3.js?v=20260917-v3';b.defer=true;document.head.appendChild(b);})();


(function(){
'use strict';
if(window.__MB_VENDOR_PO_ACTIONS__)return;
window.__MB_VENDOR_PO_ACTIONS__=true;
const $=id=>document.getElementById(id);
const esc=x=>String(x??'').replace(/[&<>\"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','\"':'&quot;',"'":'&#39;'}[c]));
const session=()=>{try{return JSON.parse(localStorage.getItem('mb_vendor_session')||'null')}catch(e){return null}};
const token=()=>session()?.token||'';
const gateway=()=>window.__MB_GATEWAY;
const toast=x=>window.toast?window.toast(x):alert(x);

function vendorEditBackend(id){
  const list=window.__MB_STATE_VENDORS||window.vendors||[];
  const v=list.find(x=>String(x.id||x.name)===String(id));
  if(!v)return;
  const old=document.getElementById('mbBackendVendorModal');if(old)old.remove();
  const d=document.createElement('div');d.id='mbBackendVendorModal';d.className='modal';
  const defaultPw=v.defaultPassword||('MB@'+String(v.id||'vendor').replace(/[^A-Za-z0-9]/g,'').slice(-24)+'#1');
  d.innerHTML='<div class="modalBox"><div class="sectionTitle"><div><div class="eyebrow">VENDOR ACCOUNT</div><h2 style="margin:4px 0">Edit Vendor</h2></div><button class="btn" data-close>Close</button></div>'+
    '<div class="profileGrid">'+
    '<div><label class="eyebrow">VENDOR NAME</label><input id="beVN" class="field" value="'+esc(v.name)+'"></div>'+
    '<div><label class="eyebrow">LOGIN ID</label><input id="beVI" class="field" value="'+esc(v.id)+'"></div>'+
    '<div><label class="eyebrow">NEW PASSWORD</label><input id="beVP" type="password" class="field" placeholder="Leave blank to keep current"></div>'+
    '<div><label class="eyebrow">STATUS</label><select id="beVE" class="field"><option value="true" '+(v.enabled!==false?'selected':'')+'>Active</option><option value="false" '+(v.enabled===false?'selected':'')+'>Disabled</option></select></div></div>'+
    '<div class="notice">This account is stored in VENDORS. Website Listing is not changed. Auto-created listing vendors start with an initial password; use NEW PASSWORD to set your own password.</div>'+
    '<div class="actions" style="justify-content:flex-end"><button class="btn" data-close>Cancel</button><button class="btn primary" id="beSave">Save Vendor</button></div></div>';
  document.body.appendChild(d);
  d.onclick=e=>{if(e.target===d||e.target.closest('[data-close]'))d.remove()};
  d.querySelector('#beSave').onclick=async()=>{
    const name=$('beVN').value.trim(),newId=$('beVI').value.trim(),password=$('beVP').value,enabled=$('beVE').value==='true';
    if(!name||!newId)return toast('Vendor name and Login ID are required.');
    const b=$('beSave');b.disabled=true;b.textContent='Saving…';
    try{
      const r=await gateway()({action:'saveVendor',token:token(),id:newId,name,password,enabled,oldId:String(v.id||''),oldName:String(v.name||'')});
      if(!r?.success)throw Error(r?.message||'Vendor save failed');
      d.remove();toast(r.message||'Vendor saved successfully.');
      if(typeof window.loadVendors==='function')await window.loadVendors();
      window.__MB_PROC_RENDER?.('vendors');
    }catch(e){toast(e.message||'Vendor save failed')}finally{b.disabled=false;b.textContent='Save Vendor'}
  };
}
function bindVendorEdits(){
  document.querySelectorAll('#adminVendorsSection [data-edit]').forEach(b=>{
    if(b.dataset.backendEdit)return;
    b.dataset.backendEdit='1';
    b.addEventListener('click',e=>{e.preventDefault();e.stopImmediatePropagation();vendorEditBackend(b.dataset.edit)},true);
  });
}
async function deletePOBackend(poId){
  if(!poId)return;
  if(!confirm('Delete PO '+poId+'?\n\nThis will remove all rows belonging to this PO from the Purchase Orders sheet and its vendor sheet.'))return;
  try{
    const r=await gateway()({action:'savePurchaseOrder',token:token(),deletePO:'true',poId});
    if(!r?.success)throw Error(r?.message||'PO deletion failed');
    const p=JSON.parse(localStorage.getItem('mb_web_po_actions_v1')||'{}');p.hiddenPOs=(p.hiddenPOs||[]).filter(x=>String(x)!==String(poId));localStorage.setItem('mb_web_po_actions_v1',JSON.stringify(p));
    toast(r.message||'PO deleted successfully.');
    if(typeof window.loadPO==='function')await window.loadPO();
  }catch(e){toast(e.message||'PO deletion failed')}
}
function bindPODeletes(){
  const box=$('adminPO');if(!box)return;
  box.querySelectorAll('tbody tr').forEach(tr=>{
    if(tr.querySelector('[data-backend-po-delete]'))return;
    const id=tr.querySelector('td')?.textContent?.trim();if(!id)return;
    const cell=tr.lastElementChild;if(!cell)return;
    const b=document.createElement('button');b.className='btn';b.textContent='Delete';b.dataset.backendPoDelete='1';
    b.onclick=e=>{e.preventDefault();e.stopPropagation();deletePOBackend(id)};
    cell.querySelector('.mbRowActions')?.appendChild(b);
  });
}
const oldRender=window.__MB_PROC_RENDER;
window.__MB_PROC_RENDER=function(mode){
  if(typeof oldRender==='function')oldRender(mode);
  setTimeout(()=>{bindVendorEdits();bindPODeletes()},50);
};
setInterval(()=>{bindVendorEdits();bindPODeletes()},1200);
})();
