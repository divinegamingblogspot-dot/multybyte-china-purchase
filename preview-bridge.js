(()=>{
'use strict';
window.__mbOpenProductPreview=function(p){
 const sku=String(p?.sku||'').trim();
 const rows=[...document.querySelectorAll('.admin-product-row,.card')];
 const row=rows.find(r=>String(r.dataset.sku||r.querySelector('.admin-sku,.sku')?.textContent||'').trim()===sku);
 if(row){row.dispatchEvent(new MouseEvent('dblclick',{bubbles:true,cancelable:true}));return true}
 return false;
};
})();
