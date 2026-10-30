import {WorkshopAccess} from './access.mjs';

const access=new WorkshopAccess(),$=s=>document.querySelector(s);
let opened=false,checking=false,lastCheck=0,identity=access.cloud.fingerprint();
function gate(state){
  $('#access-gate').hidden=false;
  $('#access-title').textContent=state.mod==='public'&&!state.hata?'Atölyeye giriş yap.':'Çok yakında.';
  $('#access-description').textContent=state.hata?'Atölyenin demo erişimi şu anda doğrulanamadı. Daha sonra tekrar deneyebilirsin; yöneticiler akademi hesabıyla giriş yapabilir.':state.mod==='public'?'Online Atölye’yi kullanmak ve düzenini saklamak için akademi hesabınla giriş yap.':'Online Atölye şu anda yöneticilerin denemesi için açık. Parça seçimi, bağlantılar ve sanal motor testleri yakında burada.';
  $('#access-login').textContent=state.mod==='public'?'Akademi hesabıyla giriş yap ↗':'Giriş yap ↗';
  $('#access-retry').hidden=false;
}
async function check(){
  if(checking)return;checking=true;lastCheck=Date.now();
  const state=await access.check();checking=false;
  if(opened){if(!state.izinli)location.reload();return;}
  if(!state.izinli){gate(state);return;}
  $('#access-gate').hidden=true;$('#workshop-main').hidden=false;
  for(const el of document.querySelectorAll('[data-workshop-action]'))el.hidden=false;
  const label=state.yerel?'YEREL ÖNİZLEME':state.yonetici?'YÖNETİCİ DEMOSU':'DEMO';
  $('#demo-mode').textContent=label;$('#demo-mode').title=state.kurulum?'Yayın tercihi henüz sunucuda kurulmadı. Yönetici erişimin doğrulandı.':state.yerel?'Bu önizleme cihazında çalışır.':state.mod==='admins'?'Şu anda yalnız yöneticilere açık.':'Akademi hesabıyla herkese açık.';
  opened=true;
  try{await import('./app.mjs');}catch(error){$('#workshop-main').hidden=true;gate({hata:true});$('#access-description').textContent='Atölye başlatılamadı. Sayfayı yenileyerek tekrar deneyebilirsin.';console.error(error);}
}
$('#access-retry').addEventListener('click',()=>check());
window.addEventListener('storage',e=>{if(e.key==='skyvius-oturum'&&access.cloud.fingerprint()!==identity)location.reload();});
// Her karede/polling ile sunucuya gidilmez. Uzun aradan sonra sekmeye dönüşte izin tekrar kontrol edilir.
window.addEventListener('focus',()=>{if(!access.cloud.localPreview&&Date.now()-lastCheck>15000)check();});
check();
