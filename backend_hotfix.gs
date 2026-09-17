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
  // Rich-text hyperlink is the reliable source when Website Listing uses linked display text.
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
