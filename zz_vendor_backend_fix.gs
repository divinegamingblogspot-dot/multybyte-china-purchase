/** MULTYBYTE VENDOR BACKEND FIX
 * Website vendor management is independent from Website Listing.
 * Safe additive override: VENDORS is the vendor-account source of truth.
 */
function mbVendorNorm_(v){return String(v==null?'':v).trim().replace(/\s+/g,' ').toLowerCase()}
function mbVendorRecord_(r){return{id:String(r[0]||'').trim(),name:String(r[1]||'').trim(),sheetName:String(r[2]||'').trim(),enabled:r[3]===true||String(r[3]).toLowerCase()==='true',passwordHash:String(r[4]||'')}}
function findVendor_(id){
  const sh=SpreadsheetApp.openById(MB_PORTAL.SPREADSHEET_ID).getSheetByName(MB_PORTAL.VENDOR_SHEET);
  if(!sh||sh.getLastRow()<2)return null;
  const q=mbVendorNorm_(id);
  if(!q)return null;
  const rows=sh.getRange(2,1,sh.getLastRow()-1,5).getValues();
  for(const r of rows)if(mbVendorNorm_(r[0])===q)return mbVendorRecord_(r);
  for(const r of rows)if(mbVendorNorm_(r[1])===q)return mbVendorRecord_(r);
  for(const r of rows)if(mbVendorNorm_(r[2])===q)return mbVendorRecord_(r);
  return null;
}
function saveVendor_(p){
  if(!getSession_(p.token,'admin'))return{success:false,message:'Admin session expired.',code:'ADMIN_SESSION'};
  const ss=SpreadsheetApp.openById(MB_PORTAL.SPREADSHEET_ID);
  const sh=ensureSheet_(ss,MB_PORTAL.VENDOR_SHEET,MB_PORTAL.VENDOR_HEADERS);
  const id=String(p.id||p.userId||p.userID||'').trim();
  const name=String(p.name||p.vendorName||p.vendor||'').trim();
  const oldId=String(p.oldId||p.originalId||p.existingId||'').trim();
  const oldName=String(p.oldName||p.originalName||'').trim();
  const pw=String(p.password||'');
  const enabled=p.enabled===undefined?true:(String(p.enabled).toLowerCase()==='true'||p.enabled===true);
  if(!id||!name)return{success:false,message:'Login ID and vendor name are required.'};
  const rows=sh.getLastRow()>1?sh.getRange(2,1,sh.getLastRow()-1,5).getValues():[];
  let row=0,oldHash='',oldSheet='';
  const keys=[mbVendorNorm_(oldId),mbVendorNorm_(id),mbVendorNorm_(oldName),mbVendorNorm_(name)].filter(Boolean);
  for(let i=0;i<rows.length;i++){
    const rk=[mbVendorNorm_(rows[i][0]),mbVendorNorm_(rows[i][1]),mbVendorNorm_(rows[i][2])];
    if(keys.some(k=>rk.includes(k))){row=i+2;oldHash=String(rows[i][4]||'');oldSheet=String(rows[i][2]||'');break;}
  }
  const sheetName=oldSheet||uniqueVendorSheetName_(ss,name,id);
  ensureVendorSheet_(ss,sheetName);
  if(!row){
    if(!pw)return{success:false,message:'Password is required when creating a new vendor.'};
    sh.appendRow([id,name,sheetName,enabled,hash_(pw)]);
  }else{
    if(pw)oldHash=hash_(pw);
    sh.getRange(row,1,1,5).setValues([[id,name,sheetName,enabled,oldHash]]);
  }
  return{success:true,message:row?'Vendor updated successfully.':'Vendor created successfully.',vendor:{id,name,sheetName,enabled}};
}
function savePurchaseOrder_(p){
  const s=getSession_(p.token,'admin');
  if(!s)return{success:false,message:'Admin session expired.',code:'ADMIN_SESSION'};
  let items=[];try{items=p.items?JSON.parse(String(p.items)):null}catch(e){return{success:false,message:'Invalid PO items.'}}
  if(!Array.isArray(items)||!items.length){if(String(p.sku||'').trim())items=[{sku:p.sku,productName:p.productName,supplier:p.supplier,landingCost:p.landingCost||p.price,quantity:p.quantity,remarks:p.remarks,productLink:p.productLink,image:p.image}];else return{success:false,message:'At least one SKU is required.'}}
  const vendor=findVendor_(p.vendorId||p.vendorName||p.name||p.id||p.sheetName);
  if(!vendor)return{success:false,message:'Select a valid vendor and at least one SKU.'};
  const x=readMasterRows_(),map={};x.rows.forEach((r,i)=>{const z=normalizeMasterProduct_(r,i+2,x.m);if(z.sku)map[z.sku.toLowerCase()]=z});
  const ss=SpreadsheetApp.openById(MB_PORTAL.SPREADSHEET_ID),vsh=ensureVendorSheet_(ss,vendor.sheetName),psh=ensureSheet_(ss,MB_PORTAL.PO_SHEET,MB_PORTAL.PO_HEADERS),now=new Date(),poId='PO-'+Utilities.formatDate(now,Session.getScriptTimeZone(),'yyyyMMdd-HHmmss')+'-'+Utilities.getUuid().slice(0,6).toUpperCase(),vr=[],pr=[];
  items.forEach(it=>{const z=map[String(it.sku||'').trim().toLowerCase()];if(!z)throw Error('SKU not found in Website Listing: '+it.sku);const img=String(it.image||z.image||findImage_(z.productLink)||''),qty=String(it.quantity||'').trim(),rem=String(it.remarks||'').trim();vr.push([z.sku,z.productName,qty,z.supplier,z.productLink,img,z.landingCost,rem,poId,now,'CREATED']);pr.push([poId,now,s.id,vendor.id,vendor.name,z.sku,z.productName,z.supplier,z.landingCost,qty,rem,z.productLink,img,'CREATED'])});
  vsh.getRange(vsh.getLastRow()+1,1,vr.length,MB_PORTAL.VENDOR_PRODUCT_HEADERS.length).setValues(vr);psh.getRange(psh.getLastRow()+1,1,pr.length,14).setValues(pr);
  return{success:true,message:vr.length+' purchase item'+(vr.length===1?'':'s')+' saved.',poId,vendor,items:vr.map(r=>({sku:r[0],productName:r[1],quantity:r[2],supplier:r[3],productLink:r[4],image:r[5],price:r[6],landingCost:r[6],remarks:r[7]})),savedAt:now.toISOString()};
}
