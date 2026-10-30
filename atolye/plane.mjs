import {FRAMES} from './data.mjs';
// Parametrik, yaklaşık eğitim modeli. Uçuşa uygunluk veya gerçek ürün hesabı değildir.
export const ARCHITECTURES=[
 {id:'tractor',name:'Önden çekiş',short:'1 seyir motoru',main:1,lift:0,extraMass:0,drag:.038,pros:'Basit güç sistemi; pervane burunda, motor bağlantısı ve soğutması kolay izlenir.',cons:'Burun kamera alanı ve pervane boşluğu birlikte planlanır. Pervane akımı gövdeyi etkiler.'},
 {id:'pusher',name:'Arkadan itiş',short:'1 seyir motoru',main:1,lift:0,extraMass:65,drag:.042,pros:'Burun kamera ve faydalı yük için açılır. Görüş alanı ön pervaneden ayrılır.',cons:'Arka pervane için kuyruk/boom açıklığı gerekir; soğutma ve ağırlık merkezi dikkat ister.'},
 {id:'twin',name:'Çift motor',short:'2 seyir motoru',main:2,lift:0,extraMass:90,drag:.043,pros:'İtki iki kanat istasyonuna dağılır, burun yerleşim için açık kalır.',cons:'İki motor, ESC ve bağlantı gerekir. Asimetrik itki yaw momenti oluşturur; iki motor otomatik arıza güvenliği değildir.'},
 {id:'liftcruise',name:'Lift + cruise VTOL',short:'4 kaldırma + 1 seyir motoru',main:1,lift:4,extraMass:250,drag:.059,pros:'Dikey kaldırma ve ileri uçuş ayrı motorlarla anlaşılır. Kalkış için pist ihtiyacı azalır.',cons:'Beş motor/ESC ve ek boom kütlesi taşınır. Kaldırma donanımı seyirde de sürükleme yaratır; geçiş kontrolü gerekir.'},
 {id:'tilttri',name:'Tiltrotor VTOL · 3 motor',short:'2 tilt + 1 sabit dikey motor',main:2,lift:1,tilt:true,extraMass:220,drag:.049,pros:'Kanatlardaki iki motor dikey kaldırma ile ileri itki arasında döner. Kuyruk borusundaki üçüncü motor dikey kaldırmaya katılır.',cons:'Arka motor bu örnekte ileri uçuşta durur. Hover triminde kütle dağılımı ve yaw kontrolü ayrıca gerekir; burada gerçek kontrolcü hesabı yapılmaz.'},
];
export const TAILS=[
 {id:'conventional',name:'Klasik kuyruk',mass:0,pros:'Elevator ve rudder görevleri ayrı, hareketlerin okunması kolay.',cons:'Yatay ve dikey yüzeyler için ayrı alan ve bağlantılar gerekir.'},
 {id:'v',name:'V kuyruk',mass:-12,pros:'İki eğik yüzey pitch ve yaw görevlerini paylaşır; bazı yerleşimlerde yüzey sayısı azalır.',cons:'Ruddervator karışımı gerekir. İki servo yönü birlikte kontrol edilmelidir; otomatik verim üstünlüğü yoktur.'},
 {id:'inverted-v',name:'Ters V / A kuyruk · çift boom',mass:0,pros:'Bu örnekte alt uçlar iki kuyruk borusuna bağlanır; iki eğik yüzey üstte birleşir. Ortadaki arka itiş bölgesini açık bırakır.',cons:'H kuyrukla aynı yüzey geometrisi değildir. Ruddervator karışımı, boom/yüzey bağlantıları ve pervane açıklığı birlikte değerlendirilir.'},
 {id:'t',name:'T kuyruk',mass:25,pros:'Yatay kuyruk dikey yüzeyin üstüne taşınır; gövde arkasındaki yerleşime alan açar.',cons:'Dikey yüzey yatay kuyruğun yükünü de taşır. Yapısal takviye ve yüksek hücum açısı davranışı değerlendirilir.'},
 {id:'twin-fin',name:'Çift dikey / H kuyruk',mass:35,pros:'İki dikey yüzey ve yatay bağlantı; çift boom ve arkadan itişle birlikte incelenebilir.',cons:'İki fin ve bağlantı daha fazla ıslak alan ve kütle getirebilir. H/U görünümü yüzeyin boomlara göre yüksekliğine bağlıdır.'}
];
export function availableTails(architecture){return TAILS.filter(t=>architecture!=='tilttri'||!['inverted-v','twin-fin'].includes(t.id));}
const limit=(v,a,b,d)=>Number.isFinite(Number(v))?Math.max(a,Math.min(b,Number(v))):d;
export function defaultPlane(span=1.4){return {architecture:'tractor',tail:'conventional',span,chord:.24,taper:.8,dihedral:3,sweep:0,tailArm:.62,tilt:0,cruiseSpeed:18};}
export function cleanPlane(p={},span=1.4){p=p&&typeof p==='object'?{...p}:{};if(p.architecture==='tiltrotor')p.architecture='tilttri';if(p.architecture==='tilttri'&&['inverted-v','twin-fin'].includes(p.tail))p.tail='conventional';const d=defaultPlane(span);return {architecture:ARCHITECTURES.some(x=>x.id===p.architecture)?p.architecture:d.architecture,tail:TAILS.some(x=>x.id===p.tail)?p.tail:d.tail,span:limit(p.span,.8,2.4,d.span),chord:limit(p.chord,.14,.36,d.chord),taper:limit(p.taper,.5,1,d.taper),dihedral:limit(p.dihedral,0,8,d.dihedral),sweep:limit(p.sweep,0,20,d.sweep),tailArm:limit(p.tailArm,.42,.95,d.tailArm),tilt:limit(p.tilt,0,90,d.tilt),cruiseSpeed:limit(p.cruiseSpeed,12,35,d.cruiseSpeed)};}
export function planeDesign(s){const p=cleanPlane(s.plane);const architecture=ARCHITECTURES.find(a=>a.id===p.architecture),tail=TAILS.find(t=>t.id===p.tail),area=p.span*p.chord*(1+p.taper)/2,aspect=p.span*p.span/area,bodyLength=Math.max(.72,Math.min(1.20,p.span*.60));return {...p,architecture,tail,area,aspect,bodyLength,vtol:architecture.lift>0||!!architecture.tilt,bay:{width:s.frame==='p160'?.15:.13,length:bodyLength*.50,front:-bodyLength*.28,back:bodyLength*.22,floor:.040,rim:.125}};}
// Yüzey uçları ile kuyruk boruları aynı bağlantı planını kullanır.
export function tailGeometry(d){const halfSpan=Math.min(.50,d.span*.29)/2,angle=35*Math.PI/180,base=.094,inverted=d.tail.id==='inverted-v',dual=inverted||d.tail.id==='twin-fin'||['pusher','liftcruise'].includes(d.architecture.id);return {halfSpan,halfLength:halfSpan/Math.cos(angle),angle,base,apex:base+(inverted?halfSpan*Math.tan(angle):0),boomXs:dual?[-halfSpan,halfSpan]:[0],boomY:base-.009};}
export function cameraMount(d){const cutZ=-d.bodyLength*.55;return {x:0,y:.105,z:cutZ-.010,cutZ};}
export function hullSections(d,hasCamera=false){const L=d.bodyLength,w=d.bay.width+.018,rear=['pusher','liftcruise'].includes(d.architecture.id);return [...(hasCamera?[[-.55,.038,.050]]:[[-.60,.004,.025],[-.47,w*.45,.055]]),[-.28,w,.096],[.22,w*.93,.096],[rear?.32:.25,rear?.034:.016,.05]].map(([z,width,depth])=>[z*L,width,depth]);}
// Düz montaj tabanı için yuvarlatılmış U kesit. Yarım genişlik, gerçek kabuk profiline bağlıdır.
export const HULL_POWER=.12;
export function hullWidthAt(d,z,y){const rows=hullSections(d),i=rows.findIndex(r=>r[0]>=z);if(i<0||z<rows[0][0])return 0;const a=rows[Math.max(0,i-1)],b=rows[i],t=b[0]===a[0]?0:(z-a[0])/(b[0]-a[0]),width=a[1]+(b[1]-a[1])*t,depth=a[2]+(b[2]-a[2])*t,f=(.125-y)/depth;if(f<0||f>1)return 0;return width*Math.sqrt(Math.max(0,1-f**(2/HULL_POWER)));}
export function derivedPlaneFrame(base,s){if(!base)return;const d=planeDesign(s),mass=base.mass*(d.area/(base.id==='p120'?.24:.36))**.60*(d.span/base.span)**.20+d.architecture.extraMass+d.tail.mass;return {...base,name:base.id==='p120'?'Scout · açık gövde':'Survey · açık gövde',label:base.id==='p120'?'Scout · hafif gövde kiti':'Survey · geniş gövde kiti',span:d.span,area:d.area*100,mass,cruise:0,size:d.span<1.1?7:d.span<1.7?10:12,mounts:[16,19,25],design:d};}
export function motorPlan(s){
 if(s.type!=='plane'){
  const n=FRAMES.find(f=>f.id===s.frame)?.rotors||4;
  if(n===4)return [{x:1,z:-1,direction:-1},{x:-1,z:1,direction:-1},{x:-1,z:-1,direction:1},{x:1,z:1,direction:1}].map((m,i)=>({...m,index:i,group:'main',name:['Sağ ön','Sol arka','Sol ön','Sağ arka'][i],orientation:'vertical'}));
  return Array.from({length:n},(_,i)=>{const a=-Math.PI/2+Math.PI/n+i*Math.PI*2/n;return {x:Math.cos(a)*Math.SQRT2,z:Math.sin(a)*Math.SQRT2,index:i,group:'main',direction:i%2?1:-1,name:'Kol '+(i+1),orientation:'vertical'};});
 }
 const d=planeDesign(s),a=d.architecture.id,L=d.bodyLength,y=.125,cruise=(x,z,i,name,direction=-1,facing='front')=>({index:i,group:'main',name,x,y,z,direction,orientation:'horizontal',facing});
 if(a==='tractor')return [cruise(0,-L*.61,0,'Burun / seyir')];
 if(a==='pusher')return [cruise(0,L*.34,0,'Arka / seyir',-1,'rear')];
 if(a==='twin')return [cruise(-d.span*.26,-d.chord*.40-.06,0,'Sol / seyir'),cruise(d.span*.26,-d.chord*.40-.06,1,'Sağ / seyir',1)].map(r=>({...r,y:.11+Math.tan(d.dihedral*Math.PI/180)*(Math.abs(r.x)-d.bay.width/2)}));
 const locations=[{x:d.span*.24,z:-.20},{x:-d.span*.24,z:.23},{x:-d.span*.24,z:-.20},{x:d.span*.24,z:.23}];
 if(a==='liftcruise')return [cruise(0,L*.34,0,'Arka / seyir',-1,'rear'),...locations.map((p,i)=>({...p,y:y+Math.tan(d.dihedral*Math.PI/180)*(Math.abs(p.x)-d.bay.width/2),index:i+1,group:'lift',name:'Kaldırma '+(i+1),direction:i<2?-1:1,orientation:'vertical'}))];
 if(a==='tilttri')return [...[-1,1].map((side,i)=>({x:side*d.span*.29,y:y+Math.tan(d.dihedral*Math.PI/180)*(d.span*.29-d.bay.width/2),z:-d.chord*.45-.07,index:i,group:'main',name:side<0?'Sol / tilt':'Sağ / tilt',direction:side<0?-1:1,orientation:'tilt'})),{x:0,y:.17,z:d.tailArm*.45,index:2,group:'lift',name:'Kuyruk / dikey',direction:-1,orientation:'vertical'}];
 return [];
}
export function planeAerodynamics(s,mass,avionicPower){const d=planeDesign(s),rho=1.225,g=9.81,CLmax=1.25,V=d.cruiseSpeed,weight=mass/1000*g,stall=Math.sqrt(2*weight/(rho*d.area*CLmax)),q=.5*rho*V*V,CL=weight/(q*d.area),induced=CL*CL/(Math.PI*.8*d.aspect),drag=q*d.area*(d.architecture.drag+induced),power=drag*V/.62+avionicPower;return {stall,cruisePower:power,wingLoading:mass/(d.area*100),design:d};}
