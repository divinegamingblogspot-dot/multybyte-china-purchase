const MB_PORTAL = {
  SPREADSHEET_ID: '1kMUUpS6sRUTvmb5lR0Lav2AGHLlaeETy-H0Jisx7Sn4',
  VENDOR_SHEET: 'VENDORS',
  SESSION_TTL: 21600,
  ADMIN_PROPERTY: 'MB_ADMIN_HASH'
};

function doGet(e) {
  try {
    const p = e && e.parameter ? e.parameter : {};
    const action = String(p.action || 'data').trim();
    let result;
    switch (action) {
      case 'data': result = publicSyncData_(); break;
      case 'login': result = login_(p); break;
      case 'vendorData': result = vendorData_(p); break;
      case 'adminVendors': result = adminVendors_(p); break;
      case 'saveVendor': result = saveVendor_(p); break;
      case 'logout': result = logout_(p); break;
      default: result = {success:false, message:'Unknown action.'};
    }
    return output_(result, p.callback);
  } catch (err) {
    return output_({success:false, message:String(err && err.message || err)}, e && e.parameter && e.parameter.callback);
  }
}

function setupVendorPortal() {
  const ss = SpreadsheetApp.openById(MB_PORTAL.SPREADSHEET_ID);
  let sh = ss.getSheetByName(MB_PORTAL.VENDOR_SHEET);
  if (!sh) sh = ss.insertSheet(MB_PORTAL.VENDOR_SHEET);
  if (sh.getLastRow() === 0) sh.getRange(1,1,1,5).setValues([['Vendor ID','Vendor Name','Sheet Name','Enabled','Password Hash']]);
  sh.setFrozenRows(1);
  sh.getRange(1,1,1,5).setFontWeight('bold');
  if (!PropertiesService.getScriptProperties().getProperty(MB_PORTAL.ADMIN_PROPERTY)) setAdminPassword_();
  return 'Vendor portal setup complete.';
}

function setAdminPassword_() {
  const ui = SpreadsheetApp.getUi();
  const id = ui.prompt('Admin ID', 'Enter the admin login ID:', ui.ButtonSet.OK_CANCEL);
  if (id.getSelectedButton() !== ui.Button.OK) return;
  const pw = ui.prompt('Admin Password', 'Enter the admin password:', ui.ButtonSet.OK_CANCEL);
  if (pw.getSelectedButton() !== ui.Button.OK || !pw.getResponseText()) throw new Error('Admin password was not set.');
  PropertiesService.getScriptProperties().setProperty(MB_PORTAL.ADMIN_PROPERTY, hash_(pw.getResponseText()));
  PropertiesService.getScriptProperties().setProperty('MB_ADMIN_ID', id.getResponseText().trim() || 'admin');
}
function resetAdminPassword() { setAdminPassword_(); }

function login_(p) {
  const role = String(p.role || 'vendor').toLowerCase();
  const id = String(p.id || '').trim();
  const password = String(p.password || '');
  if (!id || !password) return {success:false, message:'ID and password are required.'};
  if (role === 'admin') {
    const adminId = PropertiesService.getScriptProperties().getProperty('MB_ADMIN_ID') || 'admin';
    const adminHash = PropertiesService.getScriptProperties().getProperty(MB_PORTAL.ADMIN_PROPERTY);
    if (!adminHash) return {success:false, message:'Admin account is not configured.'};
    if (id !== adminId || hash_(password) !== adminHash) return {success:false, message:'Invalid admin ID or password.'};
    return {success:true, role:'admin', id:adminId, name:'Administrator', token:createSession_({role:'admin',id:adminId,name:'Administrator'})};
  }
  const vendor = findVendor_(id);
  if (!vendor || !vendor.enabled) return {success:false, message:'Vendor account is disabled or not found.'};
  if (hash_(password) !== vendor.passwordHash) return {success:false, message:'Invalid vendor ID or password.'};
  return {success:true, role:'vendor', id:vendor.id, name:vendor.name, token:createSession_({role:'vendor',id:vendor.id,name:vendor.name,sheetName:vendor.sheetName})};
}

function vendorData_(p) {
  const session = getSession_(p.token, 'vendor');
  if (!session) return {success:false, message:'Session expired. Please sign in again.'};
  const sh = SpreadsheetApp.openById(MB_PORTAL.SPREADSHEET_ID).getSheetByName(session.sheetName);
  if (!sh) return {success:false, message:'Assigned vendor sheet no longer exists.'};
  const data = readVendorSheet_(sh);
  touchSession_(p.token, session);
  return {success:true,vendorId:session.id,vendorName:session.name,sheetName:session.sheetName,updated:new Date().toISOString(),data:data};
}

function adminVendors_(p) {
  if (!getSession_(p.token, 'admin')) return {success:false,message:'Admin session expired.'};
  const sh=SpreadsheetApp.openById(MB_PORTAL.SPREADSHEET_ID).getSheetByName(MB_PORTAL.VENDOR_SHEET);
  if(!sh)return {success:true,vendors:[]};
  const rows=sh.getLastRow()>1?sh.getRange(2,1,sh.getLastRow()-1,5).getDisplayValues():[];
  return {success:true,vendors:rows.filter(r=>r[0]).map(r=>({id:r[0],name:r[1],sheetName:r[2],enabled:String(r[3]).toLowerCase()==='true'}))};
}

function saveVendor_(p) {
  if (!getSession_(p.token, 'admin')) return {success:false,message:'Admin session expired.'};
  const id=String(p.id||'').trim(),name=String(p.name||'').trim(),sheetName=String(p.sheetName||'').trim(),password=String(p.password||''),enabled=String(p.enabled)==='true';
  if(!id||!name||!sheetName)return {success:false,message:'Vendor ID, name and sheet name are required.'};
  const ss=SpreadsheetApp.openById(MB_PORTAL.SPREADSHEET_ID);
  if(!ss.getSheetByName(sheetName))return {success:false,message:'That Google Sheet tab does not exist.'};
  let sh=ss.getSheetByName(MB_PORTAL.VENDOR_SHEET);if(!sh){setupVendorPortal();sh=ss.getSheetByName(MB_PORTAL.VENDOR_SHEET)}
  const last=sh.getLastRow(),rows=last>1?sh.getRange(2,1,last-1,5).getValues():[];let row=0,oldHash='';
  for(let i=0;i<rows.length;i++)if(String(rows[i][0]).trim()===id){row=i+2;oldHash=String(rows[i][4]||'');break}
  if(!row){if(!password)return {success:false,message:'Password is required for a new vendor.'};sh.appendRow([id,name,sheetName,enabled,hash_(password)])}
  else{if(password)oldHash=hash_(password);sh.getRange(row,1,1,5).setValues([[id,name,sheetName,enabled,oldHash]])}
  return {success:true,message:'Vendor saved.'};
}

function logout_(p){if(p.token)CacheService.getScriptCache().remove('MBSESSION_'+p.token);return {success:true}}
function findVendor_(id){const sh=SpreadsheetApp.openById(MB_PORTAL.SPREADSHEET_ID).getSheetByName(MB_PORTAL.VENDOR_SHEET);if(!sh||sh.getLastRow()<2)return null;const rows=sh.getRange(2,1,sh.getLastRow()-1,5).getValues();for(const r of rows)if(String(r[0]).trim()===id)return{id:String(r[0]).trim(),name:String(r[1]),sheetName:String(r[2]),enabled:r[3]===true||String(r[3]).toLowerCase()==='true',passwordHash:String(r[4]||'')};return null}
function readVendorSheet_(sh){const last=sh.getLastRow();if(last<2)return[];const v=sh.getRange(2,1,last-1,8).getDisplayValues(),f=sh.getRange(2,1,last-1,8).getFormulas(),r=sh.getRange(2,1,last-1,8).getRichTextValues();return v.map((x,i)=>({sku:x[0],productName:x[1],quantity:x[2],supplier:x[3],productLink:cellUrl_(x[4],f[i][4],r[i][4]),image:imageFormulaUrl_(f[i][5],x[5]),price:x[6],remarks:x[7]})).filter(p=>p.sku||p.productName||p.productLink)}
function cellUrl_(display,formula,rich){try{if(rich&&rich.getLinkUrl())return rich.getLinkUrl()}catch(e){}const m=String(formula||'').match(/HYPERLINK\(\s*["']([^"']+)["']/i);if(m)return m[1];const d=String(display||'').trim();return/^https?:\/\//i.test(d)?d:''}
function imageFormulaUrl_(formula,display){const m=String(formula||'').match(/IMAGE\(\s*["']([^"']+)["']/i);return m?m[1]:String(display||'').trim()}

function publicSyncData_(){const ss=SpreadsheetApp.openById(MB_PORTAL.SPREADSHEET_ID),sh=ss.getSheetByName('MASTER');if(!sh)return{success:false,message:'MASTER sheet not found.'};const last=sh.getLastRow();if(last<2)return{success:true,updated:new Date().toISOString(),data:[]};const v=sh.getRange(2,1,last-1,8).getDisplayValues(),f=sh.getRange(2,1,last-1,8).getFormulas(),r=sh.getRange(2,1,last-1,8).getRichTextValues();const data=v.map((x,i)=>({sku:x[0],productName:x[1],quantity:x[2],supplier:x[3],productLink:cellUrl_(x[4],f[i][4],r[i][4]),image:imageFormulaUrl_(f[i][5],x[5]),price:x[6],remarks:x[7]})).filter(p=>p.sku||p.productName||p.productLink);return{success:true,updated:new Date().toISOString(),data:data}}
function output_(obj,callback){const json=JSON.stringify(obj);if(callback&&/^[A-Za-z_$][\w$\.]*$/.test(callback))return ContentService.createTextOutput(callback+'('+json+');').setMimeType(ContentService.MimeType.JAVASCRIPT);return ContentService.createTextOutput(json).setMimeType(ContentService.MimeType.JSON)}
function hash_(s){const b=Utilities.computeDigest(Utilities.DigestAlgorithm.SHA_256,String(s),Utilities.Charset.UTF_8);return b.map(x=>(x<0?x+256:x).toString(16).padStart(2,'0')).join('')}
function createSession_(d){const t=Utilities.getUuid().replace(/-/g,'')+Utilities.getUuid().replace(/-/g,'');CacheService.getScriptCache().put('MBSESSION_'+t,JSON.stringify(d),MB_PORTAL.SESSION_TTL);return t}
function getSession_(t,role){if(!t)return null;const raw=CacheService.getScriptCache().get('MBSESSION_'+t);if(!raw)return null;try{const s=JSON.parse(raw);return s.role===role?s:null}catch(e){return null}}
function touchSession_(t,s){CacheService.getScriptCache().put('MBSESSION_'+t,JSON.stringify(s),MB_PORTAL.SESSION_TTL)}
