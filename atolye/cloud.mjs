import {PUBLIC_CONFIG} from './config.mjs';

export class CloudError extends Error {constructor(code,message){super(message);this.code=code;}}
function safeStorage(){try{return globalThis.localStorage;}catch{return {getItem:()=>null,setItem:()=>{throw new Error('Depolama kapalı.');}};}}
// Akademinin aynı origin'deki mevcut PKCE oturumu kullanılır. URL'den token okunmaz.
export class WorkshopCloud {
  constructor({fetcher=globalThis.fetch?.bind(globalThis),storage,protocol=globalThis.location?.protocol,hostname=globalThis.location?.hostname,config=PUBLIC_CONFIG,now=()=>Date.now()}={}){Object.assign(this,{fetcher,storage:storage||safeStorage(),protocol,config,now});this.userId=null;this.epoch=0;this.localPreview=!['http:','https:'].includes(protocol)||['localhost','127.0.0.1','[::1]'].includes(hostname);}
  readSession(){try{const s=JSON.parse(this.storage.getItem('skyvius-oturum')||'null');return s?.access_token&&s?.refresh_token?s:null;}catch{return null;}}
  fingerprint(){return this.readSession()?.kisi||this.readSession()?.access_token||'guest';}
  reset(){this.epoch++;this.userId=null;}
  async request(path,{method='GET',body,headers={}}={}){
    const epoch=this.epoch,s=await this.session();if(epoch!==this.epoch)throw new CloudError('STALE','Oturum değişti.');
    const controller=new AbortController(),timer=setTimeout(()=>controller.abort(),10000);
    let r,j;try{r=await this.fetcher(this.config.url+path,{method,headers:{apikey:this.config.key,Authorization:'Bearer '+s.access_token,'Content-Type':'application/json',...headers},body:body===undefined?undefined:JSON.stringify(body),signal:controller.signal});j=await r.json();}catch(e){if(e instanceof CloudError)throw e;throw new CloudError('NETWORK','Sunucuya ulaşılamadı.');}finally{clearTimeout(timer);}
    if(epoch!==this.epoch)throw new CloudError('STALE','Oturum değişti.');
    if(!r.ok)throw new CloudError(['PGRST202','PGRST205','42P01','42883'].includes(j?.code)?'SCHEMA':r.status===401?'AUTH':'SERVER',r.status===401?'Akademide yeniden giriş yap.':'Sunucu kaydı tamamlanamadı.');
    return j;
  }
  async session(){
    if(this.localPreview)throw new CloudError('OFFLINE','Hesap kaydı için akademide aç.');
    let s=this.readSession();if(!s)throw new CloudError('AUTH','Akademide giriş yap.');
    if(s.bitis-60>this.now()/1000)return s;
    const epoch=this.epoch,token=s.refresh_token;
    const controller=new AbortController(),timer=setTimeout(()=>controller.abort(),10000);
    let r,j;try{r=await this.fetcher(this.config.url+'/auth/v1/token?grant_type=refresh_token',{method:'POST',headers:{apikey:this.config.key,'Content-Type':'application/json'},body:JSON.stringify({refresh_token:token}),signal:controller.signal});j=await r.json();}catch{throw new CloudError('NETWORK','Oturum yenilenemedi.');}finally{clearTimeout(timer);}
    if(epoch!==this.epoch||this.readSession()?.refresh_token!==token)throw new CloudError('STALE','Oturum değişti.');
    if(!r.ok||!j.access_token||!j.refresh_token)throw new CloudError('AUTH','Akademide yeniden giriş yap.');
    s={access_token:j.access_token,refresh_token:j.refresh_token,bitis:Number(j.expires_at)||Math.floor(this.now()/1000)+Number(j.expires_in||3600),kisi:j.user?.id||s.kisi};
    this.storage.setItem('skyvius-oturum',JSON.stringify(s));return s;
  }
  async connect(){this.reset();if(this.localPreview||!this.readSession())return null;const user=await this.request('/auth/v1/user');if(!user?.id)throw new CloudError('AUTH','Oturum doğrulanamadı.');this.userId=user.id;return user.id;}
  async load(){if(!this.userId)throw new CloudError('AUTH','Akademide giriş yap.');return this.request('/rest/v1/atolye_duzenleri?select=arac,duzen,guncellendi&order=arac');}
  async save(builds){if(!this.userId)throw new CloudError('AUTH','Akademide giriş yap.');const id=this.userId;const rows=['quad','plane'].map(arac=>({kullanici_id:id,arac,duzen:builds[arac]}));return this.request('/rest/v1/atolye_duzenleri?on_conflict=kullanici_id,arac',{method:'POST',body:rows,headers:{Prefer:'resolution=merge-duplicates,return=representation'}});}
}
