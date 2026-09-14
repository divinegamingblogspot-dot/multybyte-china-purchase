(()=>{
'use strict';
const $=id=>document.getElementById(id);
const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const num=v=>parseFloat(String(v??'').replace(/,/g,''))||0;
const isAdmin=()=>{const v=$('adminView');return !!v&&!v.classList.contains('hidden')};
function ensure(){
 if($('mbExecutiveDashboard')||!isAdmin())return;
 const host=$('adminView');
 const box=document.createElement('section');box.id='mbExecutiveDashboard';box.className='mb-exec';
 box.innerHTML=`<div class="mb-exec-head"><div><span class="panel-kicker">EXECUTIVE // PROCUREMENT INTELLIGENCE</span><h2>Executive Dashboard</h2><p>Live operational view of the MASTER purchasing layer.</p></div><div class="mb-exec-live"><i></i> LIVE DATA</div></div>
 <div class="mb-exec-kpis">
  <div class="mb-exec-kpi"><span>PRODUCTS</span><strong id="execProducts">0</strong><small>MASTER catalog</small></div>
  <div class="mb-exec-kpi"><span>SUPPLIERS</span><strong id="execSuppliers">0</strong><small>Distinct sources</small></div>
  <div class="mb-exec-kpi"><span>STOCK UNITS</span><strong id="execStock">0</strong><small>Total quantity</small></div>
  <div class="mb-exec-kpi warning"><span>LOW STOCK</span><strong id="execLow">0</strong><small>10 units or less</small></div>
  <div class="mb-exec-kpi danger"><span>OUT OF STOCK</span><strong id="execZero">0</strong><small>Requires attention</small></div>
  <div class="mb-exec-kpi"><span>DATA HEALTH</span><strong id="execHealth">0%</strong><small id="execHealthSub">Complete records</small></div>
 </div>
 <div class="mb-exec-grid">
  <div class="mb-exec-panel"><div class="mb-exec-panel-head"><div><span>STOCK DISTRIBUTION</span><b>Inventory health</b></div><button data-exec="low">View low stock</button></div><div class="mb-bars" id="execStockBars"></div><div class="mb-exec-legend"><span><i></i> Healthy</span><span><i></i> Low stock</span><span><i></i> Out of stock</span></div></div>
  <div class="mb-exec-panel"><div class="mb-exec-panel-head"><div><span>SUPPLIER MIX</span><b>Catalog by source</b></div><button data-exec="supplier">Top supplier</button></div><div id="execSuppliersList" class="mb-supplier-list"></div></div>
  <div class="mb-exec-panel wide"><div class="mb-exec-panel-head"><div><span>DATA HEALTH</span><b>What needs attention</b></div><button data-exec="health">Review issues</button></div><div class="mb-health-grid" id="execHealthGrid"></div></div>
 </div>`;
 const tabs=host.querySelector('.admin-tabs');host.insertBefore(box,tabs||host.firstChild);box.addEventListener('click',e=>{const b=e.target.closest('[data-exec]');if(!b)return;const a=b.dataset.exec;if(a==='low')focusAdmin('low');if(a==='health')focusAdmin('health');if(a==='supplier')focusAdmin('supplier')});
}
function data(){return Array.isArray(window.adminProductsData)?window.adminProductsData:[]}
function render(){if(!isAdmin())return;ensure();const a=data();if(!$('mbExecutiveDashboard'))return;
 const suppliers={};let stock=0,low=0,zero=0,missingImage=0,missingLink=0,missingSupplier=0,missingPrice=0;
 a.forEach(p=>{const q=num(p.quantity);stock+=q;if(q===0)zero++;else if(q<=10)low++;const s=String(p.supplier||'').trim();if(s)suppliers[s]=(suppliers[s]||0)+1;else missingSupplier++;if(!String(p.image||'').trim())missingImage++;if(!String(p.productLink||'').trim())missingLink++;if(p.price===''||p.price==null)missingPrice++});
 const totalIssues=missingImage+missingLink+missingSupplier+missingPrice;const health=a.length?Math.max(0,Math.round((1-totalIssues/(a.length*4))*100)):0;
 $('execProducts').textContent=a.length.toLocaleString();$('execSuppliers').textContent=Object.keys(suppliers).length.toLocaleString();$('execStock').textContent=stock.toLocaleString();$('execLow').textContent=low.toLocaleString();$('execZero').textContent=zero.toLocaleString();$('execHealth').textContent=health+'%';$('execHealthSub').textContent=totalIssues?`${totalIssues.toLocaleString()} data gaps detected`:'Catalog looks complete';
 const healthy=Math.max(0,a.length-low-zero), max=Math.max(1,healthy,low,zero);$('execStockBars').innerHTML=[['Healthy',healthy,'healthy'],['Low stock',low,'low'],['Out of stock',zero,'zero']].map(x=>`<div class="mb-bar-row"><span>${x[0]}</span><div><i class="${x[2]}" style="width:${Math.max(x[1]?4:0,Math.round(x[1]/max*100))}%"></i></div><b>${x[1].toLocaleString()}</b></div>`).join('');
 const top=Object.entries(suppliers).sort((x,y)=>y[1]-x[1]).slice(0,6);const maxS=Math.max(1,...top.map(x=>x[1]));$('execSuppliersList').innerHTML=top.length?top.map(([s,n])=>`<div class="mb-supplier-row"><span title="${esc(s)}">${esc(s)}</span><div><i style="width:${Math.max(5,Math.round(n/maxS*100))}%"></i></div><b>${n}</b></div>`).join(''):'<div class="mb-exec-empty">No supplier data available.</div>';
 const issues=[['Missing images',missingImage,'images'],['Missing product links',missingLink,'links'],['Missing suppliers',missingSupplier,'supplier'],['Missing prices',missingPrice,'price']];$('execHealthGrid').innerHTML=issues.map(x=>`<button class="mb-health-item ${x[1]?'has-issue':''}" data-health="${x[2]}"><span>${x[0]}</span><strong>${x[1]}</strong><small>${x[1]?'Needs review':'All clear'}</small></button>`).join('');
 document.querySelectorAll('[data-health]').forEach(b=>b.onclick=()=>focusAdmin('health'));
}
function focusAdmin(type){const search=$('adminProductSearch');if(search){if(type==='low')search.value='';if(type==='supplier'){const top=Object.entries(data().reduce((o,p)=>{const s=String(p.supplier||'').trim();if(s)o[s]=(o[s]||0)+1;return o},{})).sort((a,b)=>b[1]-a[1])[0]?.[0];if(top)search.value=top}search.dispatchEvent(new Event('input',{bubbles:true}));}document.getElementById('productsTabBtn')?.click();window.scrollTo({top:0,behavior:'smooth'});}
function boot(){if(!isAdmin())return;render();[300,900,1800,3500].forEach(ms=>setTimeout(render,ms))}
window.addEventListener('DOMContentLoaded',boot);window.addEventListener('load',boot);window.addEventListener('mb-admin-enh-ready',()=>setTimeout(render,150));setInterval(()=>{if(isAdmin())render()},5000);
})();
