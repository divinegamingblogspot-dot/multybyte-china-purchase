const MB_PORTAL = {
  SPREADSHEET_ID: '1VsuPiZuuNucfhMidXUgIxHVBYMoTCL6urMOJkLK5_hU',
  MASTER_SHEET: 'Website Listing',
  VENDOR_SHEET: 'VENDORS',
  SESSION_TTL: 21600,
  DATA_CACHE_TTL: 10,
  ADMIN_PROPERTY: 'MB_ADMIN_HASH',
  DEFAULT_ADMIN_ID: 'admin',
  DEFAULT_ADMIN_HASH: '240be518fabd2724ddb6f04eeb1da5967448d7e831c08c8fa822809f74c720a9',
  VENDOR_HEADERS: ['SKU','Product Name','Quantity','Vendor','Product Link','Image','Landing Cost','Remarks']
};

const MB_MASTER_FIELDS = {
  name: 'Product Name',
  sku: 'SKU_ID',
  link: 'Multybyte Link',
  price: 'Landing Cost',
  supplier: 'Supplier Name',
  vendor: 'Vendor Name'
};

function doGet(e) {
  try {
    const p = e && e.parameter ? e.parameter : {};
    const a = String(p.action || 'data').trim();
    let r;
    switch (a) {
      case 'data': r = publicSyncData_(); break;
      case 'login': r = login_(p); break;
      case 'vendorData': r = vendorData_(p); break;
      case 'adminVendors': r = adminVendors_(p); break;
      case 'saveVendor': r = saveVendor_(p); break;
      case 'adminProducts':
      case 'adminProductMatrix':
      case 'masterProducts': r = adminProducts_(p); break;
      case 'saveProduct':
      case 'adminSaveProduct': r = saveProduct_(p); break;
      case 'deleteProduct':
      case 'adminDeleteProduct': r = deleteProduct_(p); break;
      case 'purchaseLookup': r = purchaseLookup_(p); break;
      case 'savePurchaseOrder': r = savePurchaseOrder_(p); break;
      case 'clearVendorPurchase': r = clearVendorPurchase_(p); break;
      case 'logout': r = logout_(p); break;
      default: r = { success: false, message: 'Unknown action: ' + a, code: 'UNKNOWN_ACTION' };
    }
    return output_(r, p.callback);
  } catch (err) {
    return output_({ success: false, message: String(err && err.message || err), code: 'SERVER_ERROR' }, e && e.parameter && e.parameter.callback);
  }
}

function setupVendorPortal() {
  const ss = SpreadsheetApp.openById(MB_PORTAL.SPREADSHEET_ID);
  const master = ss.getSheetByName(MB_PORTAL.MASTER_SHEET);
  if (!master) throw new Error('Website Listing sheet not found.');
  let sh = ss.getSheetByName(MB_PORTAL.VENDOR_SHEET);
  if (!sh) sh = ss.insertSheet(MB_PORTAL.VENDOR_SHEET);
  if (sh.getLastRow() === 0) sh.getRange(1, 1, 1, 5).setValues([['User ID','User Name','Sheet Name','Enabled','Password Hash']]);
  sh.setFrozenRows(1);
  sh.getRange(1, 1, 1, 5).setFontWeight('bold');
  ensureAdmin_();
  return 'Portal setup complete.';
}

function ensureAdmin_() {
  const props = PropertiesService.getScriptProperties();
  if (!props.getProperty(MB_PORTAL.ADMIN_PROPERTY)) props.setProperty(MB_PORTAL.ADMIN_PROPERTY, MB_PORTAL.DEFAULT_ADMIN_HASH);
  if (!props.getProperty('MB_ADMIN_ID')) props.setProperty('MB_ADMIN_ID', MB_PORTAL.DEFAULT_ADMIN_ID);
}

function setAdminPassword_() {
  const ui = SpreadsheetApp.getUi();
  const id = ui.prompt('Admin ID', 'Enter the admin login ID:', ui.ButtonSet.OK_CANCEL);
  if (id.getSelectedButton() !== ui.Button.OK) return;
  const pw = ui.prompt('Admin Password', 'Enter the admin password:', ui.ButtonSet.OK_CANCEL);
  if (pw.getSelectedButton() !== ui.Button.OK || !pw.getResponseText()) throw new Error('Admin password was not set.');
  PropertiesService.getScriptProperties().setProperty(MB_PORTAL.ADMIN_PROPERTY, hash_(pw.getResponseText()));
  PropertiesService.getScriptProperties().setProperty('MB_ADMIN_ID', id.getResponseText().trim() || MB_PORTAL.DEFAULT_ADMIN_ID);
}
function resetAdminPassword() { setAdminPassword_(); }

function login_(p) {
  const role = String(p.role || 'vendor').toLowerCase();
  const id = String(p.id || '').trim();
  const password = String(p.password || '');
  if (!id || !password) return { success: false, message: 'ID and password are required.' };
  if (role === 'admin') {
    ensureAdmin_();
    const ai = PropertiesService.getScriptProperties().getProperty('MB_ADMIN_ID') || MB_PORTAL.DEFAULT_ADMIN_ID;
    const ah = PropertiesService.getScriptProperties().getProperty(MB_PORTAL.ADMIN_PROPERTY);
    if (!ah) return { success: false, message: 'Admin account is not configured.' };
    if (id !== ai || hash_(password) !== ah) return { success: false, message: 'Invalid admin ID or password.' };
    return { success: true, role: 'admin', id: ai, name: 'Administrator', token: createSession_({ role: 'admin', id: ai, name: 'Administrator' }) };
  }
  const v = findVendor_(id);
  if (!v || !v.enabled) return { success: false, message: 'User account is disabled or not found.' };
  if (hash_(password) !== v.passwordHash) return { success: false, message: 'Invalid user ID or password.' };
  return { success: true, role: 'vendor', id: v.id, name: v.name, token: createSession_({ role: 'vendor', id: v.id, name: v.name, sheetName: v.sheetName }) };
}

function vendorData_(p) {
  const s = getSession_(p.token, 'vendor');
  if (!s) return { success: false, message: 'Session expired. Please sign in again.' };
  const sh = SpreadsheetApp.openById(MB_PORTAL.SPREADSHEET_ID).getSheetByName(s.sheetName);
  if (!sh) return { success: false, message: 'Assigned vendor sheet no longer exists.' };
  const data = readVendorSheet_(sh);
  touchSession_(p.token, s);
  return { success: true, vendorId: s.id, vendorName: s.name, sheetName: s.sheetName, updated: new Date().toISOString(), data: data };
}

function adminVendors_(p) {
  if (!getSession_(p.token, 'admin')) return { success: false, message: 'Admin session expired.', code: 'ADMIN_SESSION' };
  const sh = SpreadsheetApp.openById(MB_PORTAL.SPREADSHEET_ID).getSheetByName(MB_PORTAL.VENDOR_SHEET);
  if (!sh || sh.getLastRow() < 2) return { success: true, vendors: [] };
  const rows = sh.getRange(2, 1, sh.getLastRow() - 1, 5).getDisplayValues();
  return {
    success: true,
    vendors: rows.filter(r => r[0]).map(r => ({ id: r[0], name: r[1], sheetName: r[2], enabled: String(r[3]).toLowerCase() === 'true' }))
  };
}

function saveVendor_(p) {
  if (!getSession_(p.token, 'admin')) return { success: false, message: 'Admin session expired.', code: 'ADMIN_SESSION' };
  const id = String(p.id || '').trim();
  const name = String(p.name || '').trim();
  const password = String(p.password || '');
  const enabled = String(p.enabled) === 'true';
  if (!id || !name) return { success: false, message: 'User ID and vendor name are required.' };
  const ss = SpreadsheetApp.openById(MB_PORTAL.SPREADSHEET_ID);
  let sh = ss.getSheetByName(MB_PORTAL.VENDOR_SHEET);
  if (!sh) { setupVendorPortal(); sh = ss.getSheetByName(MB_PORTAL.VENDOR_SHEET); }

  const safeSheet = uniqueVendorSheetName_(ss, name, id);
  const last = sh.getLastRow();
  const rows = last > 1 ? sh.getRange(2, 1, last - 1, 5).getValues() : [];
  let row = 0, oldHash = '', oldSheet = '';
  for (let i = 0; i < rows.length; i++) {
    if (String(rows[i][0]).trim() === id) {
      row = i + 2;
      oldHash = String(rows[i][4] || '');
      oldSheet = String(rows[i][2] || '');
      break;
    }
  }
  const sheetName = row && oldSheet ? oldSheet : safeSheet;
  ensureVendorSheet_(ss, sheetName);
  if (!row) {
    if (!password) return { success: false, message: 'Password is required for a new vendor.' };
    sh.appendRow([id, name, sheetName, enabled, hash_(password)]);
  } else {
    if (password) oldHash = hash_(password);
    sh.getRange(row, 1, 1, 5).setValues([[id, name, sheetName, enabled, oldHash]]);
  }
  return { success: true, message: row ? 'Vendor updated.' : 'Vendor created.', vendor: { id: id, name: name, sheetName: sheetName, enabled: enabled } };
}

function uniqueVendorSheetName_(ss, name, id) {
  const base = sanitizeSheetName_(name || id || 'Vendor');
  let candidate = base || 'Vendor';
  let n = 2;
  while (ss.getSheetByName(candidate) && ss.getSheetByName(candidate).getName() !== name) candidate = (base || 'Vendor').slice(0, 90) + ' ' + n++;
  return candidate.slice(0, 100);
}
function sanitizeSheetName_(s) { return String(s).replace(/[\\/?*\[\]:]/g, ' ').replace(/^'+|'+$/g, '').trim().slice(0, 100); }
function ensureVendorSheet_(ss, sheetName) {
  let sh = ss.getSheetByName(sheetName);
  if (!sh) sh = ss.insertSheet(sheetName);
  if (sh.getLastRow() === 0) sh.getRange(1, 1, 1, MB_PORTAL.VENDOR_HEADERS.length).setValues([MB_PORTAL.VENDOR_HEADERS]);
  sh.setFrozenRows(1);
  sh.getRange(1, 1, 1, MB_PORTAL.VENDOR_HEADERS.length).setFontWeight('bold');
  sh.setColumnWidths(1, 8, 140);
  return sh;
}

function getMasterContext_() {
  const ss = SpreadsheetApp.openById(MB_PORTAL.SPREADSHEET_ID);
  const sh = ss.getSheetByName(MB_PORTAL.MASTER_SHEET);
  if (!sh) throw new Error('Website Listing sheet not found.');
  const lastCol = sh.getLastColumn();
  if (lastCol < 2) throw new Error('Website Listing has no header row.');
  const headers = sh.getRange(1, 1, 1, lastCol).getDisplayValues()[0].map(String);
  const idx = {};
  headers.forEach((h, i) => { if (h.trim()) idx[h.trim().toLowerCase()] = i; });
  const required = Object.values(MB_MASTER_FIELDS);
  const missing = required.filter(h => idx[h.toLowerCase()] === undefined);
  if (missing.length) throw new Error('Website Listing is missing required column(s): ' + missing.join(', '));
  return { ss: ss, sh: sh, headers: headers, idx: idx, lastCol: lastCol };
}
function masterCol_(ctx, name) { return ctx.idx[String(name).toLowerCase()]; }
function getCell_(row, ctx, name) { const i = masterCol_(ctx, name); return i == null ? '' : row[i]; }
function setCell_(values, ctx, name, value) { const i = masterCol_(ctx, name); if (i != null) values[i] = value; }

function readMasterRows_(ctx) {
  const sh = ctx.sh;
  const lastRow = sh.getLastRow();
  if (lastRow < 2) return [];
  return sh.getRange(2, 1, lastRow - 1, ctx.lastCol).getDisplayValues();
}
function normalizeMasterProduct_(row, rowNumber, ctx) {
  return {
    row: rowNumber,
    sku: String(getCell_(row, ctx, MB_MASTER_FIELDS.sku) || '').trim(),
    productName: String(getCell_(row, ctx, MB_MASTER_FIELDS.name) || '').trim(),
    productLink: String(getCell_(row, ctx, MB_MASTER_FIELDS.link) || '').trim(),
    price: String(getCell_(row, ctx, MB_MASTER_FIELDS.price) || '').trim(),
    supplier: String(getCell_(row, ctx, MB_MASTER_FIELDS.supplier) || '').trim(),
    vendor: String(getCell_(row, ctx, MB_MASTER_FIELDS.vendor) || '').trim(),
    image: '',
    quantity: '',
    remarks: ''
  };
}
function adminProducts_(p) {
  const s = getSession_(p.token, 'admin');
  if (!s) return { success: false, message: 'Admin session expired.', code: 'ADMIN_SESSION' };
  const ctx = getMasterContext_();
  const rows = readMasterRows_(ctx);
  const data = rows.map((r, i) => normalizeMasterProduct_(r, i + 2, ctx)).filter(x => x.sku || x.productName);
  touchSession_(p.token, s);
  return { success: true, updated: new Date().toISOString(), total: data.length, data: data, headers: ctx.headers };
}

function saveProduct_(p) {
  if (!getSession_(p.token, 'admin')) return { success: false, message: 'Admin session expired.', code: 'ADMIN_SESSION' };
  const ctx = getMasterContext_();
  const rowNumber = Number(p.row || 0);
  if (rowNumber < 2 || rowNumber > ctx.sh.getLastRow()) return { success: false, message: 'A valid Listing Master row is required.' };
  const values = ctx.sh.getRange(rowNumber, 1, 1, ctx.lastCol).getValues()[0];
  const updates = {
    sku: String(p.sku || '').trim(),
    productName: String(p.productName || '').trim(),
    productLink: String(p.productLink || '').trim(),
    price: String(p.price || ''),
    vendor: String(p.vendor || p.supplier || '')
  };
  if (!updates.sku && !updates.productName) return { success: false, message: 'SKU or product name is required.' };
  setCell_(values, ctx, MB_MASTER_FIELDS.sku, updates.sku);
  setCell_(values, ctx, MB_MASTER_FIELDS.name, updates.productName);
  setCell_(values, ctx, MB_MASTER_FIELDS.link, updates.productLink);
  setCell_(values, ctx, MB_MASTER_FIELDS.price, updates.price);
  setCell_(values, ctx, MB_MASTER_FIELDS.vendor, updates.vendor);
  ctx.sh.getRange(rowNumber, 1, 1, ctx.lastCol).setValues([values]);
  return { success: true, message: 'Listing Master product updated.', product: normalizeMasterProduct_(ctx.sh.getRange(rowNumber, 1, 1, ctx.lastCol).getDisplayValues()[0], rowNumber, ctx) };
}

function deleteProduct_(p) {
  if (!getSession_(p.token, 'admin')) return { success: false, message: 'Admin session expired.', code: 'ADMIN_SESSION' };
  const ctx = getMasterContext_();
  const row = Number(p.row || 0);
  if (row < 2 || row > ctx.sh.getLastRow()) return { success: false, message: 'Invalid product row.' };
  ctx.sh.deleteRow(row);
  return { success: true, message: 'Listing Master product removed.' };
}

function purchaseLookup_(p) {
  if (!getSession_(p.token, 'admin')) return { success: false, message: 'Admin session expired.', code: 'ADMIN_SESSION' };
  const sku = String(p.sku || '').trim();
  if (!sku) return { success: false, message: 'Enter a SKU.' };
  const ctx = getMasterContext_();
  const rows = readMasterRows_(ctx);
  for (let i = 0; i < rows.length; i++) {
    const product = normalizeMasterProduct_(rows[i], i + 2, ctx);
    if (product.sku.toLowerCase() === sku.toLowerCase()) {
      product.image = findImage_(product.productLink) || '';
      return { success: true, product: product };
    }
  }
  return { success: false, message: 'SKU not found in Website Listing.', code: 'SKU_NOT_FOUND' };
}

function savePurchaseOrder_(p) {
  if (!getSession_(p.token, 'admin')) return { success: false, message: 'Admin session expired.', code: 'ADMIN_SESSION' };
  const vendorId = String(p.vendorId || '').trim();
  const items = JSON.parse(String(p.items || '[]'));
  if (!vendorId || !Array.isArray(items) || !items.length) return { success: false, message: 'Select a vendor and at least one SKU.' };
  const vendor = findVendor_(vendorId);
  if (!vendor) return { success: false, message: 'Vendor account not found.' };
  const ctx = getMasterContext_();
  const masterRows = readMasterRows_(ctx);
  const skuMap = {};
  masterRows.forEach((r, i) => {
    const sku = String(getCell_(r, ctx, MB_MASTER_FIELDS.sku) || '').trim().toLowerCase();
    if (sku) skuMap[sku] = { row: r, rowNumber: i + 2 };
  });
  const ss = ctx.ss;
  const vsh = ensureVendorSheet_(ss, vendor.sheetName);
  const out = [];
  const now = new Date();
  items.forEach(item => {
    const sku = String(item.sku || '').trim();
    if (!sku) return;
    const hit = skuMap[sku.toLowerCase()];
    if (!hit) throw new Error('SKU not found in Website Listing: ' + sku);
    const masterValues = ctx.sh.getRange(hit.rowNumber, 1, 1, ctx.lastCol).getValues()[0];
    // These are the editable fields that are allowed to flow back into Listing Master.
    setCell_(masterValues, ctx, MB_MASTER_FIELDS.name, String(item.productName ?? getCell_(hit.row, ctx, MB_MASTER_FIELDS.name) ?? ''));
    setCell_(masterValues, ctx, MB_MASTER_FIELDS.link, String(item.productLink ?? getCell_(hit.row, ctx, MB_MASTER_FIELDS.link) ?? ''));
    setCell_(masterValues, ctx, MB_MASTER_FIELDS.vendor, String(item.vendor ?? vendor.name));
    setCell_(masterValues, ctx, MB_MASTER_FIELDS.price, String(item.price ?? getCell_(hit.row, ctx, MB_MASTER_FIELDS.price) ?? ''));
    ctx.sh.getRange(hit.rowNumber, 1, 1, ctx.lastCol).setValues([masterValues]);
    const image = String(item.image || findImage_(String(item.productLink || getCell_(hit.row, ctx, MB_MASTER_FIELDS.link) || '')) || '');
    out.push([sku, String(item.productName || getCell_(masterValues, ctx, MB_MASTER_FIELDS.name) || ''), String(item.quantity || ''), String(item.vendor || vendor.name), String(item.productLink || getCell_(masterValues, ctx, MB_MASTER_FIELDS.link) || ''), image, String(item.price || getCell_(masterValues, ctx, MB_MASTER_FIELDS.price) || ''), String(item.remarks || '')]);
  });
  if (out.length) {
    vsh.getRange(vsh.getLastRow() + 1, 1, out.length, 8).setValues(out);
    vsh.getRange(vsh.getLastRow() - out.length + 1, 1, out.length, 8).setVerticalAlignment('middle');
  }
  return { success: true, message: out.length + ' purchase item' + (out.length === 1 ? '' : 's') + ' saved.', vendor: vendor, items: out.map(r => ({ sku:r[0], productName:r[1], quantity:r[2], supplier:r[3], productLink:r[4], image:r[5], price:r[6], remarks:r[7] })), savedAt: now.toISOString() };
}

function clearVendorPurchase_(p) {
  if (!getSession_(p.token, 'admin')) return { success: false, message: 'Admin session expired.', code: 'ADMIN_SESSION' };
  const vendorId = String(p.vendorId || '').trim();
  const vendor = findVendor_(vendorId);
  if (!vendor) return { success: false, message: 'Vendor account not found.' };
  const sh = SpreadsheetApp.openById(MB_PORTAL.SPREADSHEET_ID).getSheetByName(vendor.sheetName);
  if (sh && sh.getLastRow() > 1) sh.getRange(2, 1, sh.getLastRow() - 1, 8).clearContent();
  return { success: true, message: 'Vendor purchase list cleared.' };
}

function findVendor_(id) {
  const sh = SpreadsheetApp.openById(MB_PORTAL.SPREADSHEET_ID).getSheetByName(MB_PORTAL.VENDOR_SHEET);
  if (!sh || sh.getLastRow() < 2) return null;
  const rows = sh.getRange(2, 1, sh.getLastRow() - 1, 5).getValues();
  for (const r of rows) if (String(r[0]).trim() === id) return { id:String(r[0]).trim(), name:String(r[1]), sheetName:String(r[2]), enabled:r[3] === true || String(r[3]).toLowerCase() === 'true', passwordHash:String(r[4] || '') };
  return null;
}
function readVendorSheet_(sh) {
  const last = sh.getLastRow();
  if (last < 2) return [];
  const v = sh.getRange(2, 1, last - 1, 8).getDisplayValues();
  return v.map(x => ({ sku:x[0], productName:x[1], quantity:x[2], supplier:x[3], productLink:x[4], image:x[5], price:x[6], remarks:x[7] })).filter(p => p.sku || p.productName || p.productLink);
}
function publicSyncData_() {
  const ctx = getMasterContext_();
  const data = readMasterRows_(ctx).map((r,i) => normalizeMasterProduct_(r,i+2,ctx)).filter(p => p.sku || p.productName);
  return { success:true, updated:new Date().toISOString(), data:data };
}

function findImage_(url) {
  if (!/^https?:\/\//i.test(String(url || ''))) return '';
  try {
    const res = UrlFetchApp.fetch(url, { muteHttpExceptions:true, followRedirects:true, timeout:10000, headers:{'User-Agent':'Mozilla/5.0'} });
    if (res.getResponseCode() >= 400) return '';
    const html = res.getContentText();
    const patterns = [
      /<meta[^>]+property=["']og:image["'][^>]+content=["']([^"']+)["']/i,
      /<meta[^>]+name=["']twitter:image["'][^>]+content=["']([^"']+)["']/i,
      /<meta[^>]+content=["']([^"']+)["'][^>]+property=["']og:image["']/i
    ];
    for (const re of patterns) { const m = html.match(re); if (m && /^https?:\/\//i.test(m[1])) return m[1]; }
  } catch (e) {}
  return '';
}

function logout_(p) { if (p && p.token) CacheService.getScriptCache().remove('MBSESSION_' + p.token); return { success:true, message:'Session terminated.' }; }
function output_(obj, callback) { const json = JSON.stringify(obj); if (callback && /^[A-Za-z_$][\w$\.]*$/.test(callback)) return ContentService.createTextOutput(callback+'('+json+');').setMimeType(ContentService.MimeType.JAVASCRIPT); return ContentService.createTextOutput(json).setMimeType(ContentService.MimeType.JSON); }
function hash_(s) { const b=Utilities.computeDigest(Utilities.DigestAlgorithm.SHA_256,String(s),Utilities.Charset.UTF_8); return b.map(x=>(x<0?x+256:x).toString(16).padStart(2,'0')).join(''); }
function createSession_(d) { const t=Utilities.getUuid().replace(/-/g,'')+Utilities.getUuid().replace(/-/g,''); CacheService.getScriptCache().put('MBSESSION_'+t,JSON.stringify(d),MB_PORTAL.SESSION_TTL); return t; }
function getSession_(t,role) { if(!t)return null; const raw=CacheService.getScriptCache().get('MBSESSION_'+t); if(!raw)return null; try{const s=JSON.parse(raw); return s.role===role?s:null;}catch(e){return null;} }
function touchSession_(t,s) { CacheService.getScriptCache().put('MBSESSION_'+t,JSON.stringify(s),MB_PORTAL.SESSION_TTL); }

function onOpen() {
  SpreadsheetApp.getUi().createMenu('MULTYBYTE PORTAL')
    .addItem('Setup / Repair Vendor Portal','setupVendorPortal')
    .addItem('Reset Admin Password','resetAdminPassword')
    .addToUi();
}
