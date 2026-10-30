import * as T from './vendor/three.module.min.js';
import {planeDesign,motorPlan,tailGeometry,hullSections,hullWidthAt,HULL_POWER} from './plane.mjs';
const rad=v=>v*Math.PI/180;

// Hafif, şekillendirilmiş bir kanat kesiti; üst kapak ayrı bir mesh olarak hiç üretilmez.
function wingGeometry(d,side,rootX){
  const positions=[],indices=[],N=20;
  for(let station=0;station<2;station++)for(let surf=0;surf<2;surf++)for(let i=0;i<=N;i++){
    const u=(1-Math.cos(Math.PI*i/N))/2,x=station?d.span/2:rootX,c=d.chord*(station?d.taper:1),sweep=station?Math.tan(rad(d.sweep))*(d.span/2-rootX)+(d.chord-c)*.25:0;
    const thickness=5*.12*(.2969*Math.sqrt(u)-.126*u-.3516*u*u+.2843*u**3-.1036*u**4)*c;
    positions.push(side*x,.084+Math.tan(rad(d.dihedral))*(x-rootX)+(surf? -1:1)*thickness,-d.chord*.25+sweep+u*c);
  }
  const stride=N+1;
  for(let surf=0;surf<2;surf++)for(let i=0;i<N;i++){const a=surf*stride+i,b=2*stride+surf*stride+i;indices.push(a,b,a+1,a+1,b,b+1);}
  for(let station=0;station<2;station++)for(let i=0;i<N;i++){const a=station*2*stride+i,b=a+stride;indices.push(a,a+1,b,a+1,b+1,b);}
  const g=new T.BufferGeometry();g.setAttribute('position',new T.Float32BufferAttribute(positions,3));g.setIndex(indices);g.computeVertexNormals();return g;
}
function hull(b,d){
  const hasCamera=b.state.extras.includes('camera'),hasRearProp=motorPlan(b.state).some(r=>r.facing==='rear'),stations=hullSections(d,hasCamera),points=[],ids=[],segments=24;
  for(const [z,width,depth]of stations)for(let i=0;i<=segments;i++){const t=i/segments*Math.PI;points.push(-Math.cos(t)*width/2,.125-Math.sin(t)**HULL_POWER*depth,z);}
  for(let j=0;j<stations.length-1;j++)for(let i=0;i<segments;i++){const a=j*(segments+1)+i,c=a+segments+1;ids.push(a,c,a+1,a+1,c,c+1);}
  const g=new T.BufferGeometry();g.setAttribute('position',new T.Float32BufferAttribute(points,3));g.setIndex(ids);g.computeVertexNormals();const material=b.material(0xe3e5d9,.02,.62);material.side=T.DoubleSide;const shell=b.mesh(g,material,b.model,'frame');shell.userData.hull=true;
  // Yalnız arka itiş düzeninde motor ağzı açık kalır. Üst elektronik kapağı bundan bağımsızdır.
  if(!hasRearProp){
    const [z,width,depth]=stations.at(-1),shape=new T.Shape();
    for(let i=0;i<=segments;i++){const t=i/segments*Math.PI,x=-Math.cos(t)*width/2,y=.125-Math.sin(t)**HULL_POWER*depth;if(i===0)shape.moveTo(x,y);else shape.lineTo(x,y);}shape.closePath();
    const cap=b.mesh(new T.ShapeGeometry(shape),material,b.model,'frame');cap.position.z=z;cap.userData.aftClosure=true;
  }
  // Üst dudağın iki kenarı ve iç zemin, açık elektronik bölmesini tanımlar.
  for(const side of[-1,1])b.wire(stations.map(([z,width])=>[side*width/2,.125,z]),0x677b71,.002,b.model,'frame');
  const floor=new T.Shape(),edge=[];for(let i=0;i<=8;i++){const z=d.bay.front+(d.bay.back-d.bay.front)*i/8,width=Math.max(0,Math.min(d.bay.width,hullWidthAt(d,z,d.bay.floor-.004)-.006));edge.push({z,width});}
  const outline=[...edge.map(p=>[-p.width/2,-p.z]),...edge.slice().reverse().map(p=>[p.width/2,-p.z])];outline.forEach(([x,y],i)=>i?floor.lineTo(x,y):floor.moveTo(x,y));floor.closePath();
  const trayGeo=new T.ExtrudeGeometry(floor,{depth:.004,bevelEnabled:false});trayGeo.rotateX(-Math.PI/2);const tray=b.mesh(trayGeo,b.material(0x82958a),b.model,'frame');tray.position.y=d.bay.floor-.004;tray.userData.tray=true;
  for(const z of[d.bay.front+.02,-.045,d.bay.back-.02]){const width=Math.max(.01,hullWidthAt(d,z,d.bay.floor-.007)-.008);b.box(width,.004,.009,0xa7b6a1,0,d.bay.floor-.005,z,b.model,'frame');}
  if(hasCamera){const c=b.layout.mounts.camera;for(const x of[-.0155,.0155])b.box(.004,.031,.006,0x687b70,x,c.y,c.cutZ,b.model,'frame');for(const y of[c.y-.0155,c.y+.0155])b.box(.035,.004,.006,0x687b70,0,y,c.cutZ,b.model,'frame');}
  b.box(.021,.002,.057,0xd98454,0,.124,-d.bodyLength*.39,b.model,'frame');
}
function makeSurface(b,name,x,y,z,width,chord,parent=b.model){const pivot=new T.Group();pivot.position.set(x,y,z);parent.add(pivot);b.box(width,.007,chord,0x477d70,0,0,chord/2,pivot,'frame');b.controlSurfaces.push({pivot,name});return pivot;}
function tail(b,d){
  const z=d.tailArm,t=tailGeometry(d),tailSpan=t.halfSpan*2,c=Math.min(.17,d.chord*.58),base=t.base,dual=t.boomXs.length===2;
  b.tailMounts=t;
  for(const x of t.boomXs){
    b.box(.016,.016,z-.06,0x4b655b,x,t.boomY,(z+.06)/2,b.model,'frame');
    b.box(.024,.020,.034,0x5d7b6a,x,base-.005,z,b.model,'frame');
  }
  if(dual&&d.tail.id!=='inverted-v')b.box(tailSpan+.018,.014,.025,0x5d7b6a,0,base-.006,z,b.model,'frame');
  if(d.tail.id==='v'||d.tail.id==='inverted-v'){
    for(const sign of[-1,1]){const g=new T.Group();g.position.set(0,t.apex,z);g.rotation.z=sign*(d.tail.id==='v'?1:-1)*t.angle;b.model.add(g);b.box(t.halfLength,.010,c*.72,0xc2cfb8,sign*t.halfLength/2,0,0,g,'frame');makeSurface(b,sign<0?'v-left':'v-right',sign*t.halfLength/2,0,c*.36,t.halfLength,c*.27,g);}
    b.box(.020,.018,.030,0x5d7b6a,0,t.apex,z,b.model,'frame');
  }else{
    const isT=d.tail.id==='t',isH=d.tail.id==='twin-fin',y=isT?base+.14:base;
    b.box(tailSpan,.010,c*.75,0xc5d1bc,0,y,z,b.model,'frame');makeSurface(b,'elevator',0,y,z+c*.375,tailSpan*.92,c*.28);
    for(const x of isH?t.boomXs:[0]){const h=isT?.14:isH?.14:.12,cy=isH?base+.02:base+h/2;b.box(.009,h,c*.75,0x9cb49c,x,cy,z-.007,b.model,'frame');const rud=makeSurface(b,'rudder',x,cy,z+c*.35,.007,c*.25);rud.children[0].scale.y=h/.007;}
  }
}
export function createPlane(b,p){
  const d=planeDesign(b.state),roles=motorPlan(b.state),rootX=d.bay.width/2+.006;
  b.controlSurfaces=[];b.motorMounts=[];b.escMounts=[];b.planeScale=d.bodyLength/.84;b.planeDesign=d;b.tiltCurrent=d.tilt;
  hull(b,d);
  for(const side of[-1,1]){
    const skin=b.material(0xe0e6d5,.05,.6);skin.side=T.DoubleSide;
    b.mesh(wingGeometry(d,side,rootX),skin,b.model,'frame');
    const x=side*d.span*.34,y=.088+Math.tan(rad(d.dihedral))*(Math.abs(x)-rootX),z=d.chord*.53+Math.tan(rad(d.sweep))*(Math.abs(x)-rootX);
    const a=makeSurface(b,side<0?'aileron-left':'aileron-right',x,y,z,d.span*.26,d.chord*.18);a.rotation.z=side*rad(d.dihedral);
    const tip=b.box(.035,.003,d.chord*d.taper*.70,0xd68c59,side*(d.span/2-.025),.087+Math.tan(rad(d.dihedral))*(d.span/2-rootX),Math.tan(rad(d.sweep))*(d.span/2-rootX)+d.chord*.12,b.model,'frame');tip.rotation.z=side*rad(d.dihedral);
  }
  tail(b,d);
  // Kapağı olmayan bölmenin içinde, aynı montaj planına bağlı parçalar.
  if(p.fc)b.controller(p);if(p.battery)b.battery(p);b.extraParts(p);
  if(d.architecture.id==='liftcruise')for(const x of[-d.span*.24,d.span*.24])b.box(.016,.016,.52,0x3e5b57,x,.105+Math.tan(rad(d.dihedral))*(Math.abs(x)-rootX),.015,b.model,'frame');
  for(const role of roles){
    const m=role.group==='lift'?p.liftMotor:p.motor,e=role.group==='lift'?p.liftEsc:p.esc,prop=role.group==='lift'?p.liftProp:p.prop;
    // Destek kanada veya gövdeye bağlıdır; motor/nacelle bağımsız havada durmaz.
    const root=new T.Group();root.position.set(role.x,role.y,role.z);b.model.add(root);
    if(role.orientation==='horizontal')root.rotation.x=role.facing==='rear'?Math.PI/2:-Math.PI/2;
    if(role.orientation==='tilt')root.rotation.x=-rad(d.tilt);
    b.box(.034,.024,.058,0x687f70,role.x,role.y-.012,role.z+.012,b.model,'frame');
    if(d.architecture.id==='twin'||(d.architecture.id==='tilttri'&&role.group==='main')){b.box(.023,.016,.18,0x5e796a,role.x,role.y-.02,-d.chord*.18,b.model,'frame');}
    if(d.architecture.id==='tilttri'&&role.group==='lift'){b.box(.018,.018,Math.max(.03,role.z-.10),0x4b655b,0,.085,(role.z+.10)/2,b.model,'frame');b.box(.018,role.y-.085,.022,0x687f70,0,(role.y+.085)/2,role.z,b.model,'frame');}
    if(role.orientation==='tilt'){const hinge=b.cyl(.008,.008,.054,0xb9a87b,role.x,role.y-.004,role.z,b.model,'frame');hinge.rotation.z=Math.PI/2;}
    if(m){const mp={...p,motor:m,prop,material:p.material},g=b.motor(mp,0,0,0,role.index);b.model.remove(g);root.add(g);if(prop)b.propeller(mp,g,0,m.height/1000+.008,0,role.index);b.motorMounts.push({root,role});b.addMotorLabel(role.index,role.x,role.y+.06,role.z,role.name);}
    if(e){
      const rear=role.facing==='rear',z=rear?-d.bodyLength*.14:role.z+(role.orientation==='horizontal'?.07:0),x=rear?(d.bay.width-e.width/1000)/2-.004:role.x+(Math.abs(role.x)<.01?.025:0),ey=rear?d.bay.floor+.010:role.y-.025;
      const esc={x,y:ey,z,width:e.width/1000,length:e.length/1000};b.escMounts[role.index]=esc;
      b.box(esc.width+.004,.004,esc.length+.004,0x536e60,x,ey-.006,z,b.model,'frame');
      b.box(esc.width,.008,esc.length,0x32675f,x,ey,z,b.model,'esc');b.box(esc.width*.7,.001,esc.length*.6,0x233f3b,x,ey+.0045,z,b.model,'esc');
      if(m)for(let k=0;k<3;k++)b.wire([[x+(k-1)*.003,ey+.004,z],[x+(k-1)*.003,rear?.108:role.y+.010,rear?role.z-.025:(z+role.z)/2],[role.x+(k-1)*.003,role.y,role.z]],k===0?0xc98450:0x426759,.0011,b.wireGroup,'esc',`plane-phase-${role.index}-${k}`);
      if(p.fc&&b.state.wiring[role.index]){const f=b.layout.mounts.fc,o=b.state.wiring[role.index];b.wire([[x,ey+.004,z],[x*.5,.115,z*.5],[f.x+f.width/2,f.y,f.z+(o-4.5)*.005]],0xe58b48,.0011,b.wireGroup,'esc',`signal-${role.index}-${o}`);if(b.state.ground[role.index])b.wire([[x+.004,ey+.002,z],[x*.5+.006,.109,z*.5],[f.x+f.width/2,f.y-.003,f.z+(o-4.5)*.005]],0x2d4449,.001,b.wireGroup,'esc',`gnd-${role.index}-${o}`);}

    }
  }
  landingGear(b,d);

}
function rod(b,start,end,r=.003){const a=new T.Vector3(...start),z=new T.Vector3(...end),v=z.sub(a),m=b.cyl(r,r,v.length(),0x5a6d60,...a.clone().addScaledVector(v,.5).toArray(),b.model,'frame',10);m.quaternion.setFromUnitVectors(new T.Vector3(0,1,0),v.normalize());return m;}
function landingGear(b,d){
  b.landingGear=[];rod(b,[-.04,.032,0],[.04,.032,0],.005);
  const add=(mount,axle,radius,kind)=>{const strut=rod(b,mount,axle);const wheel=b.cyl(radius,radius,.010,0x263d36,...axle,b.model,'frame');wheel.rotation.z=Math.PI/2;b.landingGear.push({mount,axle,radius,kind,strut,wheel});};
  for(const sign of[-1,1]){b.box(.017,.014,.018,0x6b7d6d,sign*.04,.032,0,b.model,'frame');add([sign*.04,.032,0],[sign*.10,-.055,0],.030,'main');}
  for(const x of b.tailMounts.boomXs){const z=d.tailArm-.045;add([x,b.tailMounts.boomY,z],[x,-.063,z],.022,'tail');b.box(.020,.015,.022,0x5d7b6a,x,b.tailMounts.boomY,z,b.model,'frame');}
}
export function updatePlaneControls(b){
  const a=(b.servos[0]||0)*.012,e=(b.servos[1]||0)*.012,r=(b.servos[2]||0)*.012*(b.planeDesign?.tail.id==='inverted-v'?-1:1);
  for(const s of b.controlSurfaces||[]){if(s.name==='rudder')s.pivot.rotation.y=r;else s.pivot.rotation.x=s.name==='aileron-left'?a:s.name==='aileron-right'?-a:s.name==='v-left'?e+r:s.name==='v-right'?e-r:e;}
  const target=b.flight?b.flightPhase==='cruise'?90:0:(b.state.plane?.tilt||0);b.tiltCurrent??=target;b.tiltCurrent+=(target-b.tiltCurrent)*.16;if(Math.abs(target-b.tiltCurrent)<.1)b.tiltCurrent=target;
  for(const m of b.motorMounts||[])if(m.role.orientation==='tilt')m.root.rotation.x=-rad(b.tiltCurrent);
  return Math.abs(target-b.tiltCurrent)>.1;
}
export function activePlaneMotors(b){const d=planeDesign(b.state),roles=motorPlan(b.state);if(!d.vtol)return roles.map(r=>r.index);return roles.filter(r=>b.flightPhase==='cruise'?r.orientation!=='vertical':r.orientation!=='horizontal').map(r=>r.index);}
