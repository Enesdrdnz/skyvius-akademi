// Ölçüler metre. Bütün bileşenlerin montaj ve kablo uçları aynı yerleşimden gelir.
import {cameraMount} from './plane.mjs';
export function assemblyLayout(parts,type='quad',batteryPosition=0){
  const f=parts.frame;
  if(!f)return {empty:true,rootY:.12,mounts:{},problems:[]};
  if(type==='plane'&&f.design){
    const d=f.design,bay=d.bay,deck={width:bay.width,length:bay.length,y:bay.floor},mounts={},problems=[],L=d.bodyLength;
    if(parts.fc){const c=parts.fc;mounts.fc={x:0,y:bay.floor+.006+c.height/2000,z:.015*L,width:c.width/1000,length:c.length/1000,height:c.height/1000,bottom:bay.floor+.006};}
    if(parts.computer){const c=parts.computer;if(c.width/1000+.012>bay.width)problems.push('Jetson taşıyıcısı iç bölmeye sığmıyor');mounts.computer={x:0,y:bay.floor+.008+c.height/2000,z:.14*L,width:c.width/1000,length:c.length/1000,height:c.height/1000,bottom:bay.floor+.008};}
    if(parts.battery){const c=parts.battery,travel=Math.max(0,(L*.24-c.length/1000)/2-.004),bottom=bay.floor+.004;mounts.battery={x:0,y:bottom+c.height/2000,z:-.16*L-batteryPosition/100*travel,width:c.width/1000,length:c.length/1000,height:c.height/1000,bottom,top:bottom+c.height/1000};if(c.length/1000+.008>L*.24)problems.push('Batarya ön bölmeye uzun geliyor');}
    mounts.gps={x:-bay.width/2+.01,y:bay.rim+.0685,z:bay.back-.017,baseY:bay.rim,height:.065};mounts.telemetry={x:-bay.width/2+.013,y:bay.floor+.006,z:-.035,baseY:bay.floor};mounts.camera=cameraMount(d);mounts.regulator={x:bay.width/2-.014,y:bay.floor+.006,z:-.045*L};
    return {empty:false,deck,mounts,problems,scale:L/.84,rootY:.085,bay};
  }
  const quad=type==='quad',large=f.size>=10,scale=quad?1:f.span/1.2;
  const deck={width:quad?(large?.14:.105):.115*scale,length:quad?(large?.23:.185):.32*scale,y:quad?.026:.086};
  const mounts={},problems=[];
  if(parts.fc){const c=parts.fc;mounts.fc={x:quad?-.008:0,y:deck.y+.005+c.height/2000,z:parts.computer?-.061:0,width:c.width/1000,length:c.length/1000,height:c.height/1000,bottom:deck.y+.005};}
  if(parts.computer){const c=parts.computer;
    if(c.width/1000+.012>deck.width||c.length/1000+.085>deck.length)problems.push('Jetson taşıyıcısı bu gövdenin ayrılmış alanına sığmıyor');
    mounts.computer={x:0,y:deck.y+.008+c.height/2000,z:.03*scale,width:c.width/1000,length:c.length/1000,height:c.height/1000,bottom:deck.y+.008};
  }
  if(parts.battery){const b=parts.battery;const top=quad?-.014:.067;
    mounts.battery={x:0,y:top-b.height/2000,z:quad?-batteryPosition*.0007:-.19*scale-batteryPosition*.0006,width:b.width/1000,length:b.length/1000,height:b.height/1000,top};
  }
  mounts.gps={x:-deck.width/2+.013,y:deck.y+.0685,z:deck.length/2-.012,baseY:deck.y,height:.065};
  mounts.telemetry={x:deck.width/2+.011,y:deck.y+.006,z:-.025,baseY:deck.y};
  mounts.camera={x:0,y:quad?.012:.07,z:quad?-deck.length/2-.018:-.29*scale};
  mounts.regulator={x:deck.width/2-.014,y:deck.y+.006,z:-.045*scale};
  return {empty:false,deck,mounts,problems,scale,rootY:quad?Math.max(.115,(parts.battery?.height||30)/1000+.045):.073};
}
export function boxesOverlap(a,b,pad=0){return !!a&&!!b&&Math.abs(a.x-b.x)<(a.width+b.width)/2+pad&&Math.abs(a.y-b.y)<(a.height+b.height)/2+pad&&Math.abs(a.z-b.z)<(a.length+b.length)/2+pad;}
export function labelPresentation(zoom,projectedSpan,running=false){return {scale:Math.max(.3,Math.min(1,1/zoom)),visible:running||projectedSpan>=105};}
