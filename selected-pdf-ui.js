(()=>{
'use strict';
const $=id=>document.getElementById(id);
const visible=el=>!!el&&getComputedStyle(el).display!=='none'&&getComputedStyle(el).visibility!=='hidden';
function activeAdmin(){const s=$('productsAdminSection');return !!s&&visible(s)&&!s.classList.contains('hidden')}
function checkedCount(){return activeAdmin()?document.querySelectorAll('#adminProductsList .mb-select-product:checked').length:document.querySelectorAll('#products .mb-select-product:checked,#favoritesProducts .mb-select-product:checked,#recentProducts .mb-select-product:checked').length}
function addButton(host){if(!host||host.querySelector('#mbHeaderSelectedPdf'))return;const b=document.createElement('button');b.id='mbHeaderSelectedPdf';b.type='button';b.className='secondary-btn';b.title='Export only the products you selected';b.textContent='▣ Export Selected PDF';b.disabled=true;b.addEventListener('click',()=>{$('mbSelectedPdf')?.click()});host.appendChild(b)}
function sync(){
 const admin=activeAdmin();
 addButton(admin?document.querySelector('#productsAdminSection .admin-product-actions'):document.querySelector('#portalView .hero-actions'));
 const b=$('mbHeaderSelectedPdf');if(b){const n=checkedCount();b.disabled=n===0;b.textContent=n?`▣ Export Selected PDF (${n})`:'▣ Export Selected PDF';b.title=n?`Export only these ${n} selected product${n===1?'':'s'} as PDF`:'Select one or more products first';}
 const selected=$('mbSelectedPdf');if(selected){const n=checkedCount();selected.textContent=n?`▣ Export Selected PDF (${n})`:'▣ Export Selected PDF';selected.title='Exports ONLY the currently selected products';selected.disabled=n===0;}
}
function boot(){sync();setTimeout(sync,250);setTimeout(sync,1000)}
window.addEventListener('DOMContentLoaded',boot);window.addEventListener('load',boot);setInterval(sync,500);
})();
