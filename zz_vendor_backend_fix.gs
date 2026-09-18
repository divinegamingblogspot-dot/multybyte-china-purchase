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
function mbEnsurePOVendorRemarkColumn_(sh){
  const headers=['PO ID','Created At','Created By','Vendor ID','Vendor Name','SKU','Product Name','Supplier','Landing Cost','Quantity','Remarks','Product Link','Image','Status','Vendor Remark'];
  if(sh.getLastRow()===0){sh.getRange(1,1,1,headers.length).setValues([headers]);return 15}
  const h=sh.getRange(1,1,1,Math.max(15,sh.getLastColumn())).getDisplayValues()[0];
  let idx=h.findIndex(x=>String(x||'').trim().toLowerCase()==='vendor remark');
  if(idx<0){sh.getRange(1,15).setValue('Vendor Remark');idx=14}
  return idx+1;
}
function savePurchaseOrder_(p){
  if(String(p.deletePO||'').toLowerCase()==='true'||String(p.action||'').toLowerCase()==='deletepo'){
    if(!getSession_(p.token,'admin'))return{success:false,message:'Admin session expired.',code:'ADMIN_SESSION'};
    return mbDeletePurchaseOrder_(p);
  }
  const s=getSession_(p.token,'admin');
  if(!s)return{success:false,message:'Admin session expired.',code:'ADMIN_SESSION'};
  let items=[];try{items=p.items?JSON.parse(String(p.items)):null}catch(e){return{success:false,message:'Invalid PO items.'}}
  if(!Array.isArray(items)||!items.length){
    if(String(p.sku||'').trim())items=[{sku:p.sku,productName:p.productName,supplier:p.supplier,landingCost:p.landingCost||p.price,price:p.price,quantity:p.quantity,remarks:p.remarks,productLink:p.productLink,image:p.image}];
    else return{success:false,message:'At least one SKU is required.'}
  }
  const vendor=findVendor_(p.vendorId||p.vendorName||p.name||p.id||p.sheetName,p.vendorName||p.name);
  if(!vendor)return{success:false,message:'Select a valid vendor and at least one SKU.'};
  const x=readMasterRows_(),map={};
  x.rows.forEach((r,i)=>{const z=normalizeMasterProduct_(r,i+2,x.m);if(z.sku)map[z.sku.toLowerCase()]=z});
  const ss=SpreadsheetApp.openById(MB_PORTAL.SPREADSHEET_ID);
  const vsh=ensureVendorSheet_(ss,vendor.sheetName);
  const psh=ensureSheet_(ss,MB_PORTAL.PO_SHEET,MB_PORTAL.PO_HEADERS);
  mbEnsurePOVendorRemarkColumn_(psh);
  const now=new Date(),poId='PO-'+Utilities.formatDate(now,Session.getScriptTimeZone(),'yyyyMMdd-HHmmss')+'-'+Utilities.getUuid().slice(0,6).toUpperCase(),vr=[],pr=[];
  items.forEach(it=>{
    const z=map[String(it.sku||'').trim().toLowerCase()];
    if(!z)throw Error('SKU not found in Website Listing: '+it.sku);
    const name=it.productName===undefined?z.productName:String(it.productName||'').trim();
    const supplier=it.supplier===undefined?z.supplier:String(it.supplier||'').trim();
    const link=it.productLink===undefined?z.productLink:String(it.productLink||'').trim();
    let img=it.image!==undefined?String(it.image||'').trim():String(z.image||'').trim();
    if(!img&&link)img=String(findImage_(link,true)||'').trim();
    const price=it.landingCost!==undefined?it.landingCost:(it.price!==undefined?it.price:z.landingCost);
    const qty=String(it.quantity||'').trim(),rem=String(it.remarks||'').trim();
    vr.push([z.sku,name,qty,supplier,link,img,price,rem,poId,now,'CREATED']);
    pr.push([poId,now,s.id,vendor.id,vendor.name,z.sku,name,supplier,price,qty,rem,link,img,'CREATED','']);
  });
  vsh.getRange(vsh.getLastRow()+1,1,vr.length,MB_PORTAL.VENDOR_PRODUCT_HEADERS.length).setValues(vr);
  psh.getRange(psh.getLastRow()+1,1,pr.length,15).setValues(pr);
  return{success:true,message:vr.length+' purchase item'+(vr.length===1?'':'s')+' saved.',poId,vendor,items:vr.map(r=>({sku:r[0],productName:r[1],quantity:r[2],supplier:r[3],productLink:r[4],image:r[5],price:r[6],landingCost:r[6],remarks:r[7]})),savedAt:now.toISOString()};
}
function mbDefaultVendorId_(name){
  const base=mbVendorNorm_(name).replace(/[^a-z0-9]+/g,'-').replace(/^-|-$/g,'').slice(0,28)||'vendor';
  return 'vendor-'+base;
}
function mbDefaultVendorPassword_(id){
  return 'MB@'+String(id||'vendor').replace(/[^A-Za-z0-9]/g,'').slice(-24)+'#1';
}
function mbListingVendorNames_(){
  const x=readMasterRows_(), out=[], seen={};
  x.rows.forEach((r,i)=>{
    const z=normalizeMasterProduct_(r,i+2,x.m);
    const n=String(z.vendor||z.vendorName||z.supplier||z.supplierName||'').trim();
    const k=mbVendorNorm_(n);
    if(n&&k&&!seen[k]){seen[k]=1;out.push(n)}
  });
  return out;
}
function mbEnsureListingVendorAccounts_(){
  const ss=SpreadsheetApp.openById(MB_PORTAL.SPREADSHEET_ID);
  const sh=ensureSheet_(ss,MB_PORTAL.VENDOR_SHEET,MB_PORTAL.VENDOR_HEADERS);
  const rows=sh.getLastRow()>1?sh.getRange(2,1,sh.getLastRow()-1,5).getValues():[];
  const existing={};
  rows.forEach(r=>[r[0],r[1],r[2]].forEach(v=>{const k=mbVendorNorm_(v);if(k)existing[k]=1}));
  const created=[];
  mbListingVendorNames_().forEach(name=>{
    const nk=mbVendorNorm_(name);
    if(existing[nk])return;
    let id=mbDefaultVendorId_(name), n=2;
    while(existing[mbVendorNorm_(id)])id=mbDefaultVendorId_(name)+'-'+n++;
    const password=mbDefaultVendorPassword_(id);
    const sheetName=uniqueVendorSheetName_(ss,name,id);
    ensureVendorSheet_(ss,sheetName);
    sh.appendRow([id,name,sheetName,true,hash_(password)]);
    existing[nk]=1; existing[mbVendorNorm_(id)]=1; existing[mbVendorNorm_(sheetName)]=1;
    created.push({id,name,sheetName,enabled:true,autoCreated:true,defaultPassword:password});
  });
  return created;
}
function adminVendors_(){
  if(!getSession_(arguments[0]?.token,'admin')&&arguments[0])return{success:false,message:'Admin session expired.'};
  const p=arguments[0]||{};
  mbEnsureListingVendorAccounts_();
  const ss=SpreadsheetApp.openById(MB_PORTAL.SPREADSHEET_ID),sh=ss.getSheetByName(MB_PORTAL.VENDOR_SHEET);
  if(!sh||sh.getLastRow()<2)return{success:true,vendors:[],created:[]};
  const rows=sh.getRange(2,1,sh.getLastRow()-1,5).getValues();
  return{success:true,vendors:rows.map(r=>{const v=mbVendorRecord_(r);v.defaultPassword=mbDefaultVendorPassword_(v.id);return v}),created:[]};
}
function setVendorPORemark_(p){
  const s=getSession_(p.token,'vendor');
  if(!s)return{success:false,message:'Vendor session expired.'};
  const poId=String(p.poId||'').trim(),remark=String(p.remark||'').trim();
  if(!poId)return{success:false,message:'PO ID is required.'};
  const ss=SpreadsheetApp.openById(MB_PORTAL.SPREADSHEET_ID),sh=ss.getSheetByName(MB_PORTAL.PO_SHEET);
  if(!sh||sh.getLastRow()<2)return{success:false,message:'Purchase order not found.'};
  mbEnsurePOVendorRemarkColumn_(sh);
  const rows=sh.getRange(2,1,sh.getLastRow()-1,Math.max(15,sh.getLastColumn())).getValues();
  let found=false;
  for(let i=0;i<rows.length;i++){
    if(String(rows[i][0]||'').trim()===poId&&String(rows[i][3]||'').trim().toLowerCase()===String(s.id||'').trim().toLowerCase()){
      rows[i][14]=remark;found=true;
    }
  }
  if(!found)return{success:false,message:'PO not found in your vendor account.'};
  sh.getRange(2,1,rows.length,Math.max(15,sh.getLastColumn())).setValues(rows);
  return{success:true,message:'PO remark saved.'};
}
function mbDeletePurchaseOrder_(p){
  const poId=String(p.poId||p.id||'').trim();
  if(!poId)return{success:false,message:'PO ID is required.'};
  const ss=SpreadsheetApp.openById(MB_PORTAL.SPREADSHEET_ID);
  const psh=ss.getSheetByName(MB_PORTAL.PO_SHEET);
  let removed=0;
  if(psh&&psh.getLastRow()>1){
    const rows=psh.getRange(2,1,psh.getLastRow()-1,Math.max(14,psh.getLastColumn())).getValues();
    for(let i=rows.length-1;i>=0;i--)if(String(rows[i][0]||'').trim()===poId){psh.deleteRow(i+2);removed++}
  }
  const sheets=ss.getSheets();
  sheets.forEach(sh=>{
    if(sh.getName()===MB_PORTAL.PO_SHEET||sh.getName()===MB_PORTAL.VENDOR_SHEET||sh.getName()===MB_PORTAL.MASTER_SHEET)return;
    const lr=sh.getLastRow(),lc=sh.getLastColumn();if(lr<2||!lc)return;
    const vals=sh.getRange(2,1,lr-1,Math.max(11,lc)).getValues();
    for(let i=vals.length-1;i>=0;i--){
      if(String(vals[i][8]||'').trim()===poId){sh.deleteRow(i+2);removed++}
    }
  });
  return{success:true,message:removed+' PO record row'+(removed===1?'':'s')+' deleted.',poId};
}
