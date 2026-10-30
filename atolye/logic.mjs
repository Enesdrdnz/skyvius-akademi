import {FRAMES,MOTORS,ESCS,PROPS,MATERIALS,BATTERIES,CONTROLLERS,COMPUTERS,EXTRAS,MOTOR_LAYOUT,FACES} from './data.mjs';
import {defaultPlane,cleanPlane,derivedPlaneFrame,planeDesign,motorPlan,planeAerodynamics} from './plane.mjs';
import {assemblyLayout} from './assembly.mjs';
export const clamp=(v,min,max)=>Math.min(max,Math.max(min,v));
export function defaults(type='quad') {return {version:2,type,frame:'none',motor:'none',esc:'none',prop:'none',material:'none',battery:'none',fc:'none',computer:'none',liftMotor:'none',liftEsc:'none',liftProp:'none',plane:defaultPlane(),extras:[],payload:0,batteryPosition:0,reserve:20,wiring:[0,0,0,0,0,0,0,0],ground:[false,false,false,false,false,false,false,false],directions:[-1,-1,1,1,-1,1,-1,1],servoReverse:[false,false,false],links:{gps:false,computer:false},accel:false,compass:false};}
export function exampleBuild(type='quad'){return {...defaults(type),frame:type==='quad'?'q7':'p120',motor:type==='quad'?'m2806':'m2814',esc:'e45',prop:type==='quad'?'p74':'p1045',material:'pc',battery:type==='quad'?'b6s40':'b4s22',fc:'pix',extras:['gps','telemetry'],wiring:[1,2,3,4,0,0,0,0],ground:[true,true,true,true,false,false,false,false],links:{gps:true,computer:false}};}
export function cleanSaved(value){
  if(!value||![1,2].includes(value.version)||!['quad','plane'].includes(value.type)) return null;
  const s=defaults(value.type);
  for(const [key,list] of Object.entries({frame:FRAMES.filter(f=>f.type===s.type),motor:s.type==='plane'?MOTORS:MOTORS.filter(m=>m.types.includes(s.type)),esc:ESCS,prop:PROPS,material:MATERIALS,battery:BATTERIES,fc:CONTROLLERS,computer:COMPUTERS,liftMotor:MOTORS,liftEsc:ESCS,liftProp:PROPS}))if(value[key]==='none'||list.some(x=>x.id===value[key]))s[key]=value[key];
  s.extras=EXTRAS.filter(x=>Array.isArray(value.extras)&&value.extras.includes(x.id)).map(x=>x.id);
  for(const [k,lo,hi] of [['payload',0,600],['batteryPosition',-100,100],['reserve',10,40]])if(Number.isFinite(value[k]))s[k]=clamp(value[k],lo,hi);
  for(let i=0;i<8;i++){if(Number.isInteger(value.wiring?.[i])&&value.wiring[i]>=0&&value.wiring[i]<=8)s.wiring[i]=value.wiring[i];if(typeof value.ground?.[i]==='boolean')s.ground[i]=value.ground[i];if([-1,1].includes(value.directions?.[i]))s.directions[i]=value.directions[i];}
  s.plane=cleanPlane(value.plane,FRAMES.find(f=>f.id===s.frame)?.span||1.4);if(value.plane?.architecture==='tiltrotor'){s.wiring=Array(8).fill(0);s.ground=Array(8).fill(false);s.directions=Array.from({length:8},(_,i)=>motorPlan(s)[i]?.direction||1);}
  if(value.version===1&&value.extras?.includes('computer'))s.computer='nano';
  s.links={gps:value.links?.gps===true||(value.version===1&&s.extras.includes('gps')),computer:value.links?.computer===true};
  s.servoReverse=s.servoReverse.map((_,i)=>value.servoReverse?.[i]===true);
  // Kalibrasyon, açılan sanal oturumda tekrar yapılır.
  return s;
}
export function selected(s){const base=FRAMES.find(x=>x.id===s.frame);return {frame:s.type==='plane'?derivedPlaneFrame(base,s):base,motor:MOTORS.find(x=>x.id===s.motor),esc:ESCS.find(x=>x.id===s.esc),prop:PROPS.find(x=>x.id===s.prop),material:MATERIALS.find(x=>x.id===s.material),battery:BATTERIES.find(x=>x.id===s.battery),fc:CONTROLLERS.find(x=>x.id===s.fc),computer:COMPUTERS.find(x=>x.id===s.computer),liftMotor:MOTORS.find(x=>x.id===s.liftMotor),liftEsc:ESCS.find(x=>x.id===s.liftEsc),liftProp:PROPS.find(x=>x.id===s.liftProp)};}
export function curve(s,group='main'){
 const p=selected(s),m=group==='lift'?p.liftMotor:p.motor,prop=group==='lift'?p.liftProp:p.prop,b=p.battery;
 if(!m||!prop||!b||b.s<m.minS||b.s>m.maxS||prop.diameter<m.minProp||prop.diameter>m.maxProp)return null;
 const voltage=b.s/m.nominal,diam=prop.diameter/m.refProp,blade=prop.blades===3?1.12:1,pitch=prop.pitch/(prop.diameter*.55),thrust=m.thrust*voltage**2*diam**3.2*blade*pitch**.15,power=m.power*voltage**3*diam**4*blade**1.5*pitch**.4;
 return {thrust,power,rpm:m.rpm*voltage,rows:[.25,.5,.75,1].map(t=>({throttle:t*100,thrust:thrust*t**2,power:power*t**3,amps:power*t**3/(b.s*3.7),rpm:m.rpm*voltage*t}))};
}
export function calculate(s){
 const p=selected(s),roles=motorPlan(s),mainCount=roles.filter(x=>x.group==='main').length,liftCount=roles.filter(x=>x.group==='lift').length,n=roles.length;
 const addons=EXTRAS.filter(x=>s.extras.includes(x.id));
 const mass=(p.frame?.mass||0)+((p.motor?.mass||0)+(p.esc?.mass||0)+(p.prop?.mass||0)*(p.material?.mass||1))*mainCount+((p.liftMotor?.mass||0)+(p.liftEsc?.mass||0)+(p.liftProp?.mass||0)*(p.material?.mass||1))*liftCount+(p.battery?.mass||0)+(p.fc?.mass||0)+(p.computer?.mass||0)+addons.reduce((a,b)=>a+b.mass,0)+s.payload+(s.type==='plane'&&p.frame?45:0);
 const avionicPower=(p.fc?.power||0)+(p.computer?.power||0)+addons.reduce((a,b)=>a+b.power,0)+(s.type==='plane'&&p.frame?3+(planeDesign(s).architecture.tilt?6:0):0);
 const c=curve(s),lc=liftCount?curve(s,'lift'):null,energy=p.battery?p.battery.s*3.7*p.battery.ah:0,usable=energy*(1-s.reserve/100),layout=assemblyLayout(p,s.type,s.batteryPosition);
 let power=null,hoverThrottle=null,duration=null,hoverPower=null,aero=null,vtolEnergy=0;
 const vtol=s.type==='plane'&&planeDesign(s).vtol,verticalMain=roles.filter(r=>r.group==='main'&&r.orientation!=='horizontal').length,verticalLift=roles.filter(r=>r.group==='lift'&&r.orientation!=='horizontal').length;
 const verticalReady=(!verticalMain||!!c)&&(!verticalLift||!!lc&&!!p.liftEsc),verticalThrust=verticalReady?verticalMain*(c?.thrust||0)+verticalLift*(lc?.thrust||0):null,verticalPower=verticalMain*(c?.power||0)+verticalLift*(lc?.power||0);
 if(c&&p.frame&&p.motor&&p.esc&&p.fc&&p.material&&mass>0){
   if((s.type==='quad'||vtol)&&verticalThrust){const f=mass/verticalThrust;hoverThrottle=Math.sqrt(f);if(f<=1)hoverPower=verticalPower*f**1.5+avionicPower;}
   if(s.type==='quad')power=hoverPower;
   else{aero=planeAerodynamics(s,mass,avionicPower);power=aero.cruisePower;}
   if(s.type==='quad')duration=power?60*usable/power:null;
   else if(vtol){vtolEnergy=hoverPower?hoverPower*1.5/60:0;if(hoverPower&&usable>vtolEnergy)duration=1.5+60*(usable-vtolEnergy)/power;}
   else duration=power?60*usable/power:null;
 }
 const twr=mass?(s.type==='quad'||vtol?verticalThrust?verticalThrust/mass:null:c?mainCount*c.thrust/mass:null):null;
 const cg=s.type==='plane'&&p.battery&&layout.mounts.battery?-(layout.mounts.battery.z+planeDesign(s).bodyLength*.16)*1000*p.battery.mass/Math.max(mass,1):(p.battery?.mass||0)/Math.max(mass,1)*s.batteryPosition*.7;
 const current=power&&p.battery?power/(p.battery.s*3.7):null,maxCurrent=c&&p.battery?c.power/(p.battery.s*3.7):null,liftMaxCurrent=lc&&p.battery?lc.power/(p.battery.s*3.7):null;
 return {...p,n,roles,mainCount,liftCount,verticalThrust,mass,avionicPower,curve:c,liftCurve:lc,energy,usable,power,duration,twr,hoverThrottle,hoverPower,vtol,vtolEnergy,aero,cg,current,maxCurrent,liftMaxCurrent,layout,efficiency:s.type==='quad'&&power?mass/power:null,wingLoading:s.type==='plane'&&p.frame?mass/p.frame.area:null};
}
export function checks(s){
  const c=calculate(s),r=[];
  const add=(id,title,detail,level='ok')=>r.push({id,title,detail,level});
  if(!c.frame)return [];
  const missing=['motor','esc','prop','material','battery','fc'].filter(k=>!c[k]);
  if(missing.length)add('parts','Temel parçalar eksik',missing.map(k=>({motor:'Motor',esc:'ESC',prop:'Pervane',material:'Pervane malzemesi',battery:'Batarya',fc:'Uçuş kontrolcüsü'}[k])).join(', '),'bad');
  else add('parts','Temel parçalar yerinde',`${c.n} motor · ${c.n} ESC · ${c.battery.s}S batarya`);
  if(c.battery&&c.esc){const ok=c.battery.s>=c.esc.minS&&c.battery.s<=c.esc.maxS;add('voltage',ok?'ESC gerilimi uygun':'Batarya–ESC gerilimi uyumsuz',`${c.battery.s}S (${(c.battery.s*4.2).toFixed(1).replace('.',',')} V tam dolu) · ESC ${c.esc.minS}–${c.esc.maxS}S`,ok?'ok':'bad');}
  if(c.battery&&c.motor){const ok=c.battery.s>=c.motor.minS&&c.battery.s<=c.motor.maxS;add('motorVoltage',ok?'Motor gerilim aralığında':'Motor gerilim sınırı dışında',`Motor ${c.motor.minS}–${c.motor.maxS}S · örnek referans ${c.motor.nominal}S`,ok?'ok':'bad');}
  if(c.motor&&c.frame){const ok=c.frame.mounts.includes(c.motor.mount);add('mount',ok?'Motor montajı eşleşiyor':'Montaj delikleri eşleşmiyor',`Motor ${c.motor.mount} mm · gövde ${c.frame.mounts.join(' / ')} mm`,ok?'ok':'bad');}
  if(c.prop&&c.frame){const fit=c.prop.diameter<=c.frame.size&&(!c.motor||(c.prop.diameter>=c.motor.minProp&&c.prop.diameter<=c.motor.maxProp));add('prop',fit?'Pervane çapı uygun':'Pervane seçimini kontrol et',`Pervane ${c.prop.diameter}″ · gövde en fazla ${c.frame.size}″${c.motor?' · motor '+c.motor.minProp+'–'+c.motor.maxProp+'″':''}`,fit?'ok':'bad');}
  if(c.material?.id==='abs')add('material','ABS yalnız prototip seçeneği','Yüksek devir dayanımı doğrulanmadı; sanal uçuş kapalı.','bad');
  if(c.maxCurrent&&c.esc){const margin=c.esc.amps/c.maxCurrent;add('current',margin>=1.2?'ESC akım payı var':margin<1?'ESC akım sınırı aşılıyor':'ESC akım payı dar',`Motor başına yaklaşık ${c.maxCurrent.toFixed(1)} A maks. · ESC ${c.esc.amps} A`,margin<1?'bad':margin<1.2?'warn':'ok');}
  if(c.battery&&c.maxCurrent){const max=c.maxCurrent*c.mainCount+(c.liftMaxCurrent||0)*c.liftCount+c.avionicPower/(c.battery.s*3.7),cap=c.battery.ah*c.battery.c;add('batteryCurrent',cap>=max*1.15?'Batarya akım payı yeterli':'Batarya akım payını kontrol et',`Teorik ${Math.round(cap)} A · tam güç isteği ~${Math.round(max)} A`,cap<max?'bad':cap<max*1.15?'warn':'ok');}
  if(!c.computer&&c.layout.problems.length)add('layout','İç yerleşimi kontrol et',c.layout.problems.join('. '),'bad');
  if(c.computer) add('layout',c.layout.problems.length?'Jetson yerleşimi uygun değil':'Jetson taşıyıcısı sığıyor',c.layout.problems.join('. ')||`${c.computer.width} × ${c.computer.length} mm · ayrı montaj alanı`,c.layout.problems.length?'bad':'ok');
  if(c.liftCount){
    const missing=['liftMotor','liftEsc','liftProp'].filter(k=>!c[k]);if(missing.length)add('liftParts','Kaldırma güç grubu eksik','VTOL için ayrı kaldırma motoru, ESC ve pervane seç.','bad');
    if(c.liftMotor&&c.battery){const ok=c.battery.s>=c.liftMotor.minS&&c.battery.s<=c.liftMotor.maxS;add('liftVoltage',ok?'Kaldırma motoru gerilimi uygun':'Kaldırma motoru gerilimi uyumsuz',`${c.liftMotor.minS}–${c.liftMotor.maxS}S`,ok?'ok':'bad');}
    if(c.liftEsc&&c.battery){const ok=c.battery.s>=c.liftEsc.minS&&c.battery.s<=c.liftEsc.maxS;add('liftEscVoltage',ok?'Kaldırma ESC gerilimi uygun':'Kaldırma ESC gerilimi uyumsuz',`${c.liftEsc.minS}–${c.liftEsc.maxS}S`,ok?'ok':'bad');}
    if(c.liftMaxCurrent&&c.liftEsc)add('liftCurrent',c.liftMaxCurrent<=c.liftEsc.amps?'Kaldırma ESC akımı uygun':'Kaldırma ESC akımı aşılıyor',`Motor başına ~${c.liftMaxCurrent.toFixed(1)} A`,c.liftMaxCurrent>c.liftEsc.amps?'bad':'ok');
    if(c.liftProp&&c.liftMotor){const ok=c.liftProp.diameter<=c.frame.size&&c.liftProp.diameter>=c.liftMotor.minProp&&c.liftProp.diameter<=c.liftMotor.maxProp;add('liftProp',ok?'Kaldırma pervanesi uygun':'Kaldırma pervanesini kontrol et','Çap, motor yükü ve gövde açıklığı.',ok?'ok':'bad');}
  }
  if(s.type==='plane'&&s.plane.architecture==='tilttri'&&c.liftProp){const d=planeDesign(s),rear=c.roles.find(r=>r.group==='lift'),gap=d.tailArm-Math.min(.17,d.chord*.58)/2-rear.z-c.liftProp.diameter*.0254/2;add('clearance',gap>=.01?'Kuyruk rotorunun boyuna açıklığı var':'Kuyruk rotoru–yüzey açıklığı dar',`Bu basit boyuna kontrol ~${Math.round(gap*1000)} mm boşluk gösteriyor. Tam çarpışma/rijitlik hesabı değildir; gerekirse kuyruk kolunu uzat veya pervaneyi küçült.`,gap<.01?'bad':'ok');}
  if(c.vtol&&c.hoverPower===null&&c.curve&&(c.liftCount?c.liftCurve:true))add('hover','Dikey kaldırma itkisi yetersiz','Toplam kütleye göre kaldırma gücünü değiştir.','bad');
  if(c.aero){const safe=c.aero.design.cruiseSpeed>=c.aero.stall*1.3;add('airspeed',safe?'Seyir hızı payı var':'Seyir hızı düşük',`Yaklaşık stall ${c.aero.stall.toFixed(1)} m/s · seyir ${c.aero.design.cruiseSpeed} m/s`,safe?'ok':'warn');}
  const expected=c.roles.map(m=>m.direction);
  const wired=s.wiring.slice(0,c.n).every((v,i)=>v===i+1&&s.ground[i]);
  if(c.fc&&c.esc&&c.motor)add('wiring',wired?'PWM ve GND eşleşiyor':'PWM / GND bağlantısını kontrol et',wired?'Seçili atölye çıkış atamasıyla eşleşiyor.':'Motor testinde hangi motorun döndüğünü gözlemle. Eksik GND de motoru durdurur.',wired?'ok':'bad');
  const spin=expected.every((v,i)=>s.directions[i]===v);if(c.motor)add('spin',spin?'Motor yönleri eşleşiyor':'Motor yönü ters',spin?'Bu gövdenin örnek dönüş düzeni.':'İlgili motorda iki fazı değiştir; PWM kanalı yönü değiştirmez.',spin?'ok':'bad');
  if(c.twr!==null&&c.hoverThrottle!==null&&(s.type==='quad'||c.vtol))add('thrust',c.twr>=1.7?'İtki rezervi var':c.twr>1?'İtki rezervi düşük':'İtki ağırlığa yetmiyor',`${c.twr.toFixed(2)} : 1 · ${c.hoverThrottle!==null?'havada kalma ~%'+Math.round(c.hoverThrottle*100):''}`,c.twr<=1?'bad':c.twr<1.7?'warn':'ok');
  if(c.battery)add('cg',Math.abs(c.cg)>(s.type==='quad'?12:3)?'Ağırlık merkezi kayıyor':'Ağırlık merkezi yakın',`${c.cg>=0?'Öne':'Arkaya'} ${Math.abs(c.cg).toFixed(1)} mm · batarya konumu etkisi`,Math.abs(c.cg)>(s.type==='quad'?12:3)?'warn':'ok');
  return r;
}
export function electricalReady(s){const p=selected(s);if(!p.frame||!p.motor||!p.esc||!p.battery||!p.fc)return false;if(motorPlan(s).some(r=>r.group==='lift')&&(!p.liftMotor||!p.liftEsc))return false;return !checks(s).some(c=>['voltage','motorVoltage','current','liftVoltage','liftEscVoltage','liftCurrent'].includes(c.id)&&c.level==='bad');}
export function spinningMotors(s,output){if(!electricalReady(s))return [];return s.wiring.slice(0,motorPlan(s).length).flatMap((v,i)=>v===output&&s.ground[i]?[i]:[]);}
export function flightProblems(s,propsRemoved=false){const bad=checks(s).filter(x=>x.level==='bad').map(x=>x.title);if(!selected(s).frame)bad.push('Önce gövde ekle');if(!s.accel)bad.push('İvmeölçer kalibrasyonu eksik');if(s.extras.includes('gps')&&!s.links?.gps)bad.push('GPS bağlantısı eksik');if(s.computer!=='none'&&!s.links?.computer)bad.push('Jetson iletişim bağlantısı eksik');if(s.extras.includes('gps')&&!s.compass)bad.push('Pusula kalibrasyonu eksik');if(propsRemoved)bad.push('Pervaneler çıkarılmış');if(s.type==='plane'&&s.servoReverse.some(Boolean))bad.push('Kontrol yüzeyi yönlerini düzelt');return bad;}
// Aracın dünya yukarısını kendi yerel eksenlerinde ifade eden vektörü.
export function faceForVector(v){return FACES.find(f=>f.axis[0]*v[0]+f.axis[1]*v[1]+f.axis[2]*v[2]>.94)?.id||null;}
