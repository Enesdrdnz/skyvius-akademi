import {WorkshopCloud,CloudError} from './cloud.mjs';

// Buradaki rol/izin sonucu yalnız sunucudan gelir. Yerel profil, URL veya düğme yetki vermez.
export class WorkshopAccess {
  constructor(options={}){this.cloud=new WorkshopCloud(options);}
  async rpc(name){
    const c=this.cloud;
    if(c.readSession())return c.request('/rest/v1/rpc/'+name,{method:'POST',body:{}});
    const controller=new AbortController(),timer=setTimeout(()=>controller.abort(),10000);
    try{
      const r=await c.fetcher(c.config.url+'/rest/v1/rpc/'+name,{method:'POST',headers:{apikey:c.config.key,'Content-Type':'application/json'},body:'{}',signal:controller.signal,cache:'no-store'});
      const data=await r.json();
      if(!r.ok)throw new CloudError(['PGRST202','PGRST205','42883'].includes(data?.code)?'SCHEMA':'SERVER','Erişim durumu alınamadı.');
      return data;
    }catch(e){if(e instanceof CloudError)throw e;throw new CloudError('NETWORK','Erişim durumu alınamadı.');}finally{clearTimeout(timer);}
  }
  async check(){
    if(this.cloud.localPreview)return {izinli:true,yonetici:false,yerel:true,mod:'admins'};
    try{
      const s=await this.rpc('atolye_erisim');
      if(!s||!['public','admins'].includes(s.mod)||typeof s.izinli!=='boolean'||typeof s.yonetici!=='boolean'||typeof s.girisli!=='boolean')throw new CloudError('SERVER','Erişim yanıtı doğrulanamadı.');
      // Yönetici her iki yayın tercihinde de erişir.
      return {...s,izinli:s.yonetici||s.izinli};
    }catch(e){
      // Yayın tablosu henüz kurulmadığında bile doğrulanmış yönetici denemeye devam eder.
      if(e.code==='SCHEMA'&&this.cloud.readSession()){
        try{if(await this.rpc('rolum')==='admin')return {izinli:true,yonetici:true,mod:'admins',kurulum:true};}catch{}
      }
      return {izinli:false,yonetici:false,mod:'admins',girisli:!!this.cloud.readSession(),hata:e.code||'NETWORK'};
    }
  }
}
