/*
 * MULTYBYTE VENDOR/PO COMPATIBILITY PATCH
 *
 * Purpose:
 * 1) Vendor edits keep the original vendor User ID + vendor sheet binding even
 *    when the vendor name is changed.
 * 2) PO creation accepts either Vendor ID, User ID, vendor name, or sheet name.
 * 3) Matching is trimmed and case-insensitive so a saved vendor cannot become
 *    "not found" merely because of casing/spacing.
 *
 * IMPORTANT: Merge these helper functions into Code.gs rather than deleting
 * or replacing existing portal logic. In Code.gs:
 *   - replace saveVendor_ with the patched version below;
 *   - replace findVendor_ with the patched version below;
 *   - in savePurchaseOrder_, replace:
 *       const vendor=findVendor_(p.vendorId||p.id);
 *     with:
 *       const vendor=findVendorFlexible_(p.vendorId||p.vendorName||p.name||p.id||p.sheetName);
 */

function mbNormVendorKey_(v){
  return String(v==null?'':v).trim().replace(/\s+/g,' ').toLowerCase();
}

function findVendorFlexible_(value){
  const key=mbNormVendorKey_(value);
  if(!key)return null;
  const sh=SpreadsheetApp.openById(MB_PORTAL.SPREADSHEET_ID).getSheetByName(MB_PORTAL.VENDOR_SHEET);
  if(!sh||sh.getLastRow()<2)return null;
  const rows=sh.getRange(2,1,sh.getLastRow()-1,5).getValues();
  for(const r of rows){
    const id=String(r[0]??'').trim();
    const name=String(r[1]??'').trim();
    const sheetName=String(r[2]??'').trim();
    if([id,name,sheetName].some(x=>mbNormVendorKey_(x)===key)){
      return {id,name,sheetName,enabled:r[3]===true||String(r[3]).toLowerCase()==='true',passwordHash:String(r[4]||'')};
    }
  }
  return null;
}

function saveVendorPatched_(p){
  if(!getSession_(p.token,'admin'))return{success:false,message:'Admin session expired.',code:'ADMIN_SESSION'};

  const id=String(p.id||p.userId||p.userID||'').trim();
  const oldId=String(p.oldId||p.originalId||p.existingId||'').trim();
  const name=String(p.name||p.vendorName||p.vendor||'').trim();
  const pw=String(p.password||'');
  const enabled=p.enabled===undefined?true:String(p.enabled).toLowerCase()==='true';
  if(!id||!name)return{success:false,message:'User ID and vendor name are required.'};

  const ss=SpreadsheetApp.openById(MB_PORTAL.SPREADSHEET_ID);
  const sh=ensureSheet_(ss,MB_PORTAL.VENDOR_SHEET,MB_PORTAL.VENDOR_HEADERS);
  const rows=sh.getLastRow()>1?sh.getRange(2,1,sh.getLastRow()-1,5).getValues():[];

  let row=0,oldHash='',oldSheet='',matchedBy='';
  rows.forEach((r,i)=>{
    const rid=String(r[0]??'').trim();
    const rname=String(r[1]??'').trim();
    if((oldId&&mbNormVendorKey_(rid)===mbNormVendorKey_(oldId)) ||
       (!oldId&&mbNormVendorKey_(rid)===mbNormVendorKey_(id)) ||
       (!oldId&&mbNormVendorKey_(rname)===mbNormVendorKey_(name))){
      row=i+2;oldHash=String(r[4]||'');oldSheet=String(r[2]||'');matchedBy=rid;
    }
  });

  const sheetName=oldSheet||uniqueVendorSheetName_(ss,name,id);
  ensureVendorSheet_(ss,sheetName);

  if(!row){
    if(!pw)return{success:false,message:'Password is required for a new vendor.'};
    sh.appendRow([id,name,sheetName,enabled,hash_(pw)]);
  }else{
    if(pw)oldHash=hash_(pw);
    sh.getRange(row,1,1,5).setValues([[id,name,sheetName,enabled,oldHash]]);
  }

  return{success:true,message:row?'Vendor updated.':'Vendor created.',vendor:{id,name,sheetName,enabled},matchedExisting:!!row,matchedBy};
}

function findVendorPatched_(id){
  return findVendorFlexible_(id);
}
