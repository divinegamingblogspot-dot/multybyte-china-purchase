const AUTH_API_URL = 'https://script.google.com/macros/s/AKfycbwDHq7TB9vSxTlSeG9i55HyuhPzAP8oryRWdLsKhPZVHQubgdIAs8CJ7sknQTJLmabj/exec';
const PREVIEW_MODE = new URLSearchParams(location.search).get('preview') === '1';
const AUTO_REFRESH_MS = 15000;
let allProducts = [], lastUpdated = '', loading = false, requestTimer = null, loginMode = 'vendor';
const $ = id => document.getElementById(id);
const hide = id => $(id).classList.add('hidden');
const show = id => $(id).classList.remove('hidden');

function jsonp(params) {
  return new Promise((resolve, reject) => {
    const cb = '__mb_cb_' + Date.now() + '_' + Math.random().toString(36).slice(2);
    const script = document.createElement('script');
    const query = new URLSearchParams({...params, callback: cb, _: Date.now()});
    const timer = setTimeout(() => { cleanup(); reject(new Error('Server timeout.')); }, 20000);
    function cleanup(){ clearTimeout(timer); delete window[cb]; script.remove(); }
    window[cb] = data => { cleanup(); resolve(data); };
    script.onerror = () => { cleanup(); reject(new Error('Could not connect to server.')); };
    script.src = AUTH_API_URL + '?' + query.toString();
    document.body.appendChild(script);
  });
}
function setLoginMode(mode){
  loginMode = mode;
  $('loginTitle').textContent = mode === 'admin' ? 'Admin sign in' : 'Vendor sign in';
  $('loginSubtitle').textContent = mode === 'admin' ? 'Manage vendors and access.' : 'Sign in to access your assigned products.';
  $('loginId').placeholder = mode === 'admin' ? 'Admin ID' : 'Vendor ID';
  $('adminModeBtn').textContent = mode === 'admin' ? 'Vendor login' : 'Admin login';
  $('loginError').classList.add('hidden');
}
function showLogin(){ hide('adminView'); hide('portalView'); show('loginView'); hide('refreshBtn'); hide('logoutBtn'); hide('vendorBadge'); }
function showPortal(name){ hide('loginView'); hide('adminView'); show('portalView'); show('refreshBtn'); show('logoutBtn'); show('vendorBadge'); $('vendorBadge').textContent = name; loadVendorData(); }
function showAdmin(){ hide('loginView'); hide('portalView'); show('adminView'); show('logoutBtn'); hide('refreshBtn'); show('vendorBadge'); $('vendorBadge').textContent = 'ADMIN'; loadVendors(); }
function saveSession(session){ localStorage.setItem('mb_vendor_session', JSON.stringify(session)); }
function getSession(){ try{return JSON.parse(localStorage.getItem('mb_vendor_session')||'null')}catch(e){return null} }
function clearSession(){ localStorage.removeItem('mb_vendor_session'); allProducts=[]; lastUpdated=''; $('products').replaceChildren(); }

async function login(e){
  e.preventDefault();
  const id=$('loginId').value.trim(), password=$('loginPassword').value, err=$('loginError');
  err.classList.add('hidden'); if(!id||!password)return;
  try{
    const r=await jsonp({action:'login',role:loginMode,id,password});
    if(!r.success) throw new Error(r.message||'Invalid ID or password.');
    saveSession({token:r.token,role:r.role,id:r.id,name:r.name});
    $('loginPassword').value='';
    loginMode==='admin'?showAdmin():showPortal(r.name||r.id);
  }catch(x){err.textContent=x.message;err.classList.remove('hidden');}
}
async function loadVendorData(){
  const s=getSession(); if(!s||s.role!=='vendor'){showLogin();return;}
  if(loading)return; loading=true; show('loading'); hide('error');
  try{
    const r=await jsonp({action:'vendorData',token:s.token});
    if(!r.success) throw new Error(r.message||'Session expired.');
    const changed=r.updated!==lastUpdated||allProducts.length===0;
    if(changed){allProducts=(r.data||[]).filter(p=>p&&p.sku).map(normalizeProduct);lastUpdated=r.updated||'';render();}
    $('countBadge').textContent=`${allProducts.length} item${allProducts.length===1?'':'s'}`;
    $('statusText').textContent=r.updated?`Updated ${new Date(r.updated).toLocaleString()}`:'Data synced';
    hide('loading'); hide('error');
  }catch(e){ if(e.message.includes('Session')){clearSession();showLogin();} else showError(e.message); }
  loading=false;
}
function normalizeProduct(p){return {...p,image:p.image||'',productLink:normalizeUrl(p.productLink)};}
function normalizeUrl(v){if(!v)return'';let u=String(v).trim().replace(/\\u0026/g,'&').replace(/&amp;/g,'&');return /^https?:\/\//i.test(u)?u:'';}
function normalizeImage(v){if(!v)return'';let u=String(v).trim();if(/^https?:\/\//i.test(u))return u;return u;}
function showError(m){hide('loading');show('error');$('error').textContent=m||'Connection problem';}
function render(){
  const q=$('searchInput').value.trim().toLowerCase();
  const list=allProducts.filter(p=>![p.sku,p.productName,p.supplier,p.quantity,p.price,p.remarks].join(' ').toLowerCase().includes(q)?false:true);
  $('products').replaceChildren(); list.length?hide('empty'):show('empty');
  const t=$('productTemplate');
  list.forEach(p=>{const n=t.content.cloneNode(true), wrap=n.querySelector('.image-wrap'),img=n.querySelector('.product-image');
    n.querySelector('.sku').textContent=p.sku||'NO SKU';n.querySelector('.product-name').textContent=p.productName||'Product';n.querySelector('.quantity').textContent=p.quantity||'—';n.querySelector('.supplier').textContent=p.supplier||'—';n.querySelector('.price').textContent=p.price??'—';n.querySelector('.remarks').textContent=p.remarks??'—';
    if(p.image){img.src=p.image+(p.image.includes('?')?'&':'?')+'v='+encodeURIComponent(p.sku||'1');img.onerror=()=>{img.removeAttribute('src');wrap.classList.add('no-photo')}}else wrap.classList.add('no-photo');
    const a=n.querySelector('.product-link');if(p.productLink)a.href=p.productLink;else{a.removeAttribute('href');a.textContent='No product link';a.style.opacity='.5'}$('products').appendChild(n);
  });
}
async function loadVendors(){
  const s=getSession();if(!s||s.role!=='admin'){showLogin();return;}
  const box=$('vendorList');box.innerHTML='<div class="state">Loading vendors…</div>';
  try{const r=await jsonp({action:'adminVendors',token:s.token});if(!r.success)throw new Error(r.message||'Unable to load vendors.');box.replaceChildren();(r.vendors||[]).forEach(v=>{const d=document.createElement('div');d.className='vendor-row';d.innerHTML=`<div><strong>${esc(v.name)}</strong><small>${esc(v.id)} · ${esc(v.sheetName)}</small></div><span class="status ${v.enabled?'on':'off'}">${v.enabled?'Enabled':'Disabled'}</span><button class="mini-btn">Edit</button>`;d.querySelector('button').onclick=()=>editVendor(v);box.appendChild(d)});if(!r.vendors?.length)box.innerHTML='<div class="state">No vendors yet.</div>';}catch(e){box.innerHTML=`<div class="state error">${esc(e.message)}</div>`}
}
function esc(s){return String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));}
function editVendor(v){$('vendorEditId').value=v.id;$('vendorIdInput').value=v.id;$('vendorIdInput').disabled=true;$('vendorNameInput').value=v.name;$('vendorPasswordInput').value='';$('vendorSheetInput').value=v.sheetName;$('vendorEnabledInput').checked=!!v.enabled;show('vendorCancelBtn');}
async function saveVendor(e){
 e.preventDefault();const s=getSession();const edit=$('vendorEditId').value;const payload={action:'saveVendor',token:s.token,id:$('vendorIdInput').value.trim(),name:$('vendorNameInput').value.trim(),password:$('vendorPasswordInput').value,sheetName:$('vendorSheetInput').value.trim(),enabled:$('vendorEnabledInput').checked};
 const msg=$('vendorFormMsg');msg.textContent='Saving…';try{const r=await jsonp(payload);if(!r.success)throw new Error(r.message||'Save failed.');msg.textContent='Saved successfully.';resetVendorForm();loadVendors();}catch(x){msg.textContent=x.message;}
}
function resetVendorForm(){ $('vendorForm').reset();$('vendorEditId').value='';$('vendorIdInput').disabled=false;$('vendorEnabledInput').checked=true;hide('vendorCancelBtn'); }
function logout(){clearSession();$('loginId').value='';$('loginPassword').value='';showLogin();}
$('loginForm').addEventListener('submit',login);$('adminModeBtn').onclick=()=>setLoginMode(loginMode==='admin'?'vendor':'admin');$('logoutBtn').onclick=logout;$('adminLogoutBtn').onclick=logout;$('refreshBtn').onclick=loadVendorData;$('adminRefreshBtn').onclick=loadVendors;$('vendorForm').addEventListener('submit',saveVendor);$('vendorCancelBtn').onclick=resetVendorForm;
$('searchInput').addEventListener('input',()=>{clearTimeout(requestTimer);requestTimer=setTimeout(render,60)});$('clearBtn').onclick=()=>{$('searchInput').value='';render();$('searchInput').focus()};
setInterval(()=>{if(!$('portalView').classList.contains('hidden'))loadVendorData()},AUTO_REFRESH_MS);
if(PREVIEW_MODE){saveSession({role:'vendor',id:'preview',name:'Preview Mode',token:'preview'});showPortal('Preview Mode');}else{const s=getSession();if(s?.role==='admin')showAdmin();else if(s?.role==='vendor')showPortal(s.name);else showLogin();}
