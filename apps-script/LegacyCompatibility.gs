// Compatibility layer: keeps the existing Multybyte image-sync / formatting / PDF menu functions working after the Listing Master migration.
function MULTYBYTE_ON_EDIT(e){
  try{
    const sh=e&&e.range?e.range.getSheet():null;
    if(!sh||sh.getName()===MB_PORTAL.VENDOR_SHEET||sh.getName()===MB_PORTAL.MASTER_SHEET)return;
    const r=e.range, row=r.getRow(), col=r.getColumn();
    if(row<2)return;
    if(col===5 || (col<=5 && col+r.getNumColumns()-1>=5)) updateVendorImage_(sh,row);
  }catch(err){}
}
function updateVendorImage_(sh,row){
  const link=String(sh.getRange(row,5).getDisplayValue()||'').trim();
  const cell=sh.getRange(row,6);
  if(!link){cell.clearContent();return;}
  const image=findImage_(link);
  if(image)cell.setFormula('=IMAGE("'+image.replace(/"/g,'""')+'",4,140,140)');
}
function getUrl_(v){return String(v||'').trim()}
function cleanUrl_(v){return String(v||'').trim()}
function HARD_SYNC_MULTYBYTE_IMAGES(){
  const ss=SpreadsheetApp.openById(MB_PORTAL.SPREADSHEET_ID);
  ss.getSheets().forEach(sh=>{if(sh.getName()===MB_PORTAL.VENDOR_SHEET||sh.getName()===MB_PORTAL.MASTER_SHEET)return;const last=sh.getLastRow();if(last<2)return;for(let r=2;r<=last;r++)updateVendorImage_(sh,r)});
  return 'Vendor image sync completed.';
}
function MULTYBYTE_BACKUP_IMAGE_SYNC(){return HARD_SYNC_MULTYBYTE_IMAGES()}
function RESIZE_MULTYBYTE_IMAGES(){
  const ss=SpreadsheetApp.openById(MB_PORTAL.SPREADSHEET_ID);
  ss.getSheets().forEach(sh=>{if(sh.getName()===MB_PORTAL.VENDOR_SHEET||sh.getName()===MB_PORTAL.MASTER_SHEET)return;if(sh.getMaxColumns()>=6)sh.setColumnWidth(6,150);if(sh.getLastRow()>1)sh.setRowHeights(2,sh.getLastRow()-1,150)});
  return 'Vendor image sizing refreshed.';
}
function FORMAT_VENDOR_SHEETS(){
  const ss=SpreadsheetApp.openById(MB_PORTAL.SPREADSHEET_ID);
  ss.getSheets().forEach(sh=>{if(sh.getName()===MB_PORTAL.VENDOR_SHEET||sh.getName()===MB_PORTAL.MASTER_SHEET)return;if(sh.getLastRow()===0)return;sh.setFrozenRows(1);sh.getRange(1,1,1,8).setFontWeight('bold');sh.autoResizeColumns(1,5);sh.setColumnWidth(6,150);sh.setColumnWidth(7,120);sh.setColumnWidth(8,220)});
  return 'Vendor formatting refreshed.';
}
function REFRESH_VENDOR_FORMAT(){return FORMAT_VENDOR_SHEETS()}
function SETUP_MULTYBYTE_ALL_SYNC(){
  const ss=SpreadsheetApp.openById(MB_PORTAL.SPREADSHEET_ID);
  ScriptApp.getProjectTriggers().forEach(t=>{if(t.getHandlerFunction()==='MULTYBYTE_ON_EDIT'||t.getHandlerFunction()==='MULTYBYTE_BACKUP_IMAGE_SYNC')ScriptApp.deleteTrigger(t)});
  ScriptApp.newTrigger('MULTYBYTE_ON_EDIT').forSpreadsheet(ss).onEdit().create();
  ScriptApp.newTrigger('MULTYBYTE_BACKUP_IMAGE_SYNC').timeBased().everyMinutes(15).create();
  return 'Multybyte vendor sync triggers installed.';
}
function REFRESH_ALL_MULTYBYTE_IMAGES(){return HARD_SYNC_MULTYBYTE_IMAGES()}
function EXPORT_CURRENT_SHEET_TO_PDF(){
  const sh=SpreadsheetApp.getActiveSheet(),ss=sh.getParent();
  const url='https://docs.google.com/spreadsheets/d/'+ss.getId()+'/export?format=pdf&gid='+sh.getSheetId()+'&size=A4&portrait=false&fitw=true&sheetnames=false&printtitle=false&pagenumbers=true&gridlines=false&fzr=true';
  const blob=UrlFetchApp.fetch(url,{headers:{Authorization:'Bearer '+ScriptApp.getOAuthToken()}}).getBlob().setName(sh.getName()+'_'+Utilities.formatDate(new Date(),Session.getScriptTimeZone(),'yyyyMMdd_HHmm')+'.pdf');
  const file=DriveApp.createFile(blob);return file.getUrl();
}
function MULTYBYTE_FIRST_TIME_SETUP(){setupVendorPortal();FORMAT_VENDOR_SHEETS();SETUP_MULTYBYTE_ALL_SYNC();return 'Listing Master portal setup completed.'}
