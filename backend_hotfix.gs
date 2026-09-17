/** MULTYBYTE BACKEND HOTFIX — Website Listing fixed-column vendor + hyperlink support.
 * Safe/additive: existing routes continue calling the same function names.
 * Load this file in the Apps Script project AFTER Code.gs.
 */

function masterHeaders_(){
  const s=getMasterSheet_();
  const h=s.getRange(1,1,1,s.getLastColumn()).getDisplayValues()[0];
  const ix={};
  h.forEach((x,i)=>{const k=String(x).trim().toLowerCase();if(k)ix[k]=i});
  const pick=(names,fallback)=>{for(const n of names){if(ix[n]!==undefined)return ix[n]}return fallback};
  return {
    headers:h,
    name:pick(['product name','productname','name'],0),
    sku:pick(['sku','sku id','sku_id','skuid'],1),
    link:pick(['multybyte link','product link','productlink','link','url'],8),
    price:pick(['landing cost','landingcost','landing_cost','price','rmb'],26),
    supplier:pick(['supplier name','supplier','suppliername'],-1),
    vendor:pick(['vendor name','vendor','vendorname'],73),
    status:pick(['admin panel status','status','product status','productstatus'],-1),
    image:pick(['image','image url','imageurl','product image'],-1),
    quantity:pick(['quantity','qty'],-1),
    remarks:pick(['remarks','remark'],-1)
  };
}

function readMasterRows_(){
  const sh=getMasterSheet_(),m=masterHeaders_(),last=sh.getLastRow(),width=sh.getLastColumn();
  if(last<2)return{sh,m,rows:[]};
  const rows=sh.getRange(2,1,last-1,width).getDisplayValues();
  try{
    const rich=sh.getRange(2,m.link+1,last-1,1).getRichTextValues();
    rows.forEach((r,i)=>{
      try{
        const rt=rich[i][0],u=rt&&rt.getLinkUrl?rt.getLinkUrl():'';
        if(u)r.__multybyteLinkUrl=u;
      }catch(e){}
    });
  }catch(e){}
  return{sh,m,rows};
}

function cell_(r,i){return i>=0?String(r[i]||'').trim():''}

function normalizeMasterProduct_(r,n,m){
  m=m||masterHeaders_();
  const link=r&&r.__multybyteLinkUrl?String(r.__multybyteLinkUrl).trim():cell_(r,m.link);
  return {
    row:n,
    sku:cell_(r,m.sku),
    productName:cell_(r,m.name),
    productLink:link,
    price:cell_(r,m.price),
    landingCost:cell_(r,m.price),
    supplier:cell_(r,m.supplier),
    vendor:cell_(r,m.vendor),
    status:cell_(r,m.status),
    image:cell_(r,m.image),
    quantity:cell_(r,m.quantity),
    remarks:cell_(r,m.remarks),
    source:'Website Listing'
  };
}

/* ================= VENDOR WEBSITE EDITING =================
 * Vendor records are edited from the website and stored only in VENDORS.
 * Website Listing is NOT modified when a vendor is added/edited.
 * Existing vendor sheet names and password hashes are preserved.
 */
function mbVendorKey_(v){
  return String(v==null?'':v).trim().replace(/\s+/g,' ').toLowerCase();
}

function findVendorFlexible_(value){
  const sh=SpreadsheetApp.openById(MB_PORTAL.SPREADSHEET_ID).getSheetByName(MB_PORTAL.VENDOR_SHEET);
  if(!sh||sh.getLastRow()<2)return null;
  const key=mbVendorKey_(value);
  if(!key)return null;
  const rows=sh.getRange(2,1,sh.getLastRow()-1,5).getValues();
  /* Prefer User ID, then User Name, then Sheet Name. */
  for(const r of rows){
    if(mbVendorKey_(r[0])===key)return mbVendorRecord_(r);
  }
  for(const r of rows){
    if(mbVendorKey_(r[1])===key)return mbVendorRecord_(r);
  }
  for(const r of rows){
    if(mbVendorKey_(r[2])===key)return mbVendorRecord_(r);
  }
  return null;
}

function mbVendorRecord_(r){
  return {
    id:String(r[0]||'').trim(),
    name:String(r[1]||'').trim(),
    sheetName:String(r[2]||'').trim(),
    enabled:r[3]===true||String(r[3]).toLowerCase()==='true',
    passwordHash:String(r[4]||'')
  };
}

/* Override the original saveVendor_ without touching Website Listing. */
function saveVendor_(p){
  if(!getSession_(p.token,'admin'))return{success:false,message:'Admin session expired.',code:'ADMIN_SESSION'};

  const id=String(p.id||p.userId||p.userID||'').trim();
  const oldId=String(p.oldId||p.originalId||p.existingId||'').trim();
  const name=String(p.name||p.vendorName||p.vendor||p.userName||'').trim();
  const pw=String(p.password||'');
  const enabled=p.enabled===undefined?true:String(p.enabled).toLowerCase()==='true';

  if(!id||!name)return{success:false,message:'User ID and vendor name are required.'};

  const ss=SpreadsheetApp.openById(MB_PORTAL.SPREADSHEET_ID);
  const sh=ensureSheet_(ss,MB_PORTAL.VENDOR_SHEET,MB_PORTAL.VENDOR_HEADERS);
  const rows=sh.getLastRow()>1?sh.getRange(2,1,sh.getLastRow()-1,5).getValues():[];

  let row=0,oldHash='',oldSheet='',existing=null;
  const candidates=[oldId,id,name].filter(Boolean).map(mbVendorKey_);

  /* Match by original ID, current ID, or current name so website edits update the
     existing record instead of creating a duplicate. */
  for(let i=0;i<rows.length;i++){
    const r=rows[i];
    const keys=[r[0],r[1],r[2]].map(mbVendorKey_);
    if(candidates.some(c=>c&&keys.includes(c))){
      row=i+2;
      existing=r;
      oldHash=String(r[4]||'');
      oldSheet=String(r[2]||'').trim();
      break;
    }
  }

  /* A vendor edit must keep the existing workspace. A new vendor gets a new sheet. */
  const sheetName=oldSheet||uniqueVendorSheetName_(ss,name,id);
  ensureVendorSheet_(ss,sheetName);

  if(!row){
    if(!pw)return{success:false,message:'Password is required for a new vendor.'};
    sh.appendRow([id,name,sheetName,enabled,hash_(pw)]);
  }else{
    if(pw)oldHash=hash_(pw);
    sh.getRange(row,1,1,5).setValues([[id,name,sheetName,enabled,oldHash]]);
  }

  return {
    success:true,
    message:row?'Vendor updated.':'Vendor created.',
    vendor:{id,name,sheetName,enabled}
  };
}

/* Flexible vendor lookup keeps Add PO working after a website edit. */
function findVendor_(value){
  return findVendorFlexible_(value);
}

/* Override PO save only at the vendor-resolution point. Product source remains
 * Website Listing and all existing PO write logic stays unchanged. */
function savePurchaseOrder_(p){
  const s=getSession_(p.token,'admin');
  if(!s)return{success:false,message:'Admin session expired.',code:'ADMIN_SESSION'};

  let items=[];
  try{items=p.items?JSON.parse(String(p.items)):null}catch(e){return{success:false,message:'Invalid PO items.'}}
  if(!Array.isArray(items)||!items.length){
    if(String(p.sku||'').trim())items=[{sku:p.sku,productName:p.productName,supplier:p.supplier,landingCost:p.landingCost||p.price,quantity:p.quantity,remarks:p.remarks,productLink:p.productLink,image:p.image}];
    else return{success:false,message:'At least one SKU is required.'};
  }

  const vendor=findVendorFlexible_(p.vendorId||p.vendorName||p.name||p.id||p.sheetName);
  if(!vendor||!items.length)return{success:false,message:'Select a valid vendor and at least one SKU.'};

  const x=readMasterRows_(),map={};
  x.rows.forEach((r,i)=>{
    const z=normalizeMasterProduct_(r,i+2,x.m);
    if(z.sku)map[z.sku.toLowerCase()]=z;
  });

  const ss=SpreadsheetApp.openById(MB_PORTAL.SPREADSHEET_ID);
  const vsh=ensureVendorSheet_(ss,vendor.sheetName);
  const psh=ensureSheet_(ss,MB_PORTAL.PO_SHEET,MB_PORTAL.PO_HEADERS);
  const now=new Date();
  const poId='PO-'+Utilities.formatDate(now,Session.getScriptTimeZone(),'yyyyMMdd-HHmmss')+'-'+Utilities.getUuid().slice(0,6).toUpperCase();
  const vr=[],pr=[];

  items.forEach(it=>{
    const z=map[String(it.sku||'').trim().toLowerCase()];
    if(!z)throw Error('SKU not found in Website Listing: '+it.sku);
    const img=String(it.image||z.image||findImage_(z.productLink)||'');
    const qty=String(it.quantity||'').trim();
    const rem=String(it.remarks||'').trim();
    vr.push([z.sku,z.productName,qty,z.supplier,z.productLink,img,z.landingCost,rem,poId,now,'CREATED']);
    pr.push([poId,now,s.id,vendor.id,vendor.name,z.sku,z.productName,z.supplier,z.landingCost,qty,rem,z.productLink,img,'CREATED']);
  });

  vsh.getRange(vsh.getLastRow()+1,1,vr.length,MB_PORTAL.VENDOR_PRODUCT_HEADERS.length).setValues(vr);
  psh.getRange(psh.getLastRow()+1,1,pr.length,14).setValues(pr);
  return{
    success:true,
    message:vr.length+' purchase item'+(vr.length===1?'':'s')+' saved.',
    poId,
    vendor,
    items:vr.map(r=>({sku:r[0],productName:r[1],quantity:r[2],supplier:r[3],productLink:r[4],image:r[5],price:r[6],landingCost:r[6],remarks:r[7]})),
    savedAt:now.toISOString()
  };
}
