(()=>{
'use strict';
const OLD_API='https://script.google.com/macros/s/AKfycbwDHq7TB9vSxTlSeG9i55HyuhPzAP8oryRWdLsKhPZVHQubgdIAs8CJ7sknQTJLmabj/exec';
const NEW_API='https://script.google.com/macros/s/AKfycbxc49T5iqv7V5XvZZciOyaW6a4_CGhjy6hjuxVwHehE8bOX8SGlTL-RJnbC4xpafWWx/exec';
const oldCreate=document.createElement.bind(document);
document.createElement=function(tag){
  const el=oldCreate(tag);
  if(String(tag).toLowerCase()==='script'){
    const proto=Object.getPrototypeOf(el);
    const desc=Object.getOwnPropertyDescriptor(proto,'src');
    if(desc&&desc.set&&desc.get){
      Object.defineProperty(el,'src',{
        configurable:true,
        enumerable:true,
        get(){return desc.get.call(this)},
        set(v){
          try{
            const u=new URL(String(v),location.href);
            if(u.href.startsWith(OLD_API)){
              const n=new URL(NEW_API);
              n.search=u.search;
              v=n.href;
            }
          }catch(e){}
          desc.set.call(this,v);
        }
      });
    }
  }
  return el;
};
window.MB_API_URL=NEW_API;
})();
