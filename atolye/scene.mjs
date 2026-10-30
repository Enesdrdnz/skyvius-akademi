import * as T from './vendor/three.module.min.js';
import {selected,calculate,clamp} from './logic.mjs';
import {assemblyLayout,labelPresentation} from './assembly.mjs';
import {createPlane,updatePlaneControls,activePlaneMotors} from './plane-scene.mjs';
import {planeDesign,motorPlan} from './plane.mjs';

export class Workbench {
  constructor(host,callbacks={}){
    this.host=host;this.callbacks=callbacks;this.cameraYaw=.62;this.cameraPitch=.78;this.zoom=1;this.test=[];this.speed=20;this.showWires=true;this.showLabels=true;this.knownWires=new Set();this.wireAnimations=[];this.exploded=false;this.calibrating=false;this.axis='x';this.targetAltitude=0;this.altitude=0;this.flight=false;this.servos=[0,0,0];this.dirty=true;this.last=0;this.activeTime=0;this.motorMeshes=[];this.labels=[];this.pickables=[];this.quat=new T.Quaternion();
    this.scene=new T.Scene();this.scene.background=new T.Color(0xcbd3cf);
    this.camera=new T.PerspectiveCamera(35,1,.003,60);
    this.renderer=new T.WebGLRenderer({antialias:true,alpha:false,powerPreference:'low-power'});this.renderer.setPixelRatio(Math.min(window.devicePixelRatio||1,1.5));this.renderer.outputColorSpace=T.SRGBColorSpace;this.renderer.setClearColor(0xcbd3cf);host.replaceChildren(this.renderer.domElement);
    this.scene.add(new T.HemisphereLight(0xffffff,0x697157,1.8));const light=new T.DirectionalLight(0xfff8e9,2.3);light.position.set(2,4,1);this.scene.add(light);const fill=new T.DirectionalLight(0xd9e8ee,.8);fill.position.set(-2,1,-2);this.scene.add(fill);
    const floor=new T.Mesh(new T.PlaneGeometry(20,20),new T.MeshLambertMaterial({color:0xcbd3cf}));floor.rotation.x=-Math.PI/2;floor.position.y=0;this.scene.add(floor);this.floor=floor;
    const grid=new T.GridHelper(4,40,0xc9cfbf,0xdde0d1);grid.position.y=.0005;grid.material.transparent=true;grid.material.opacity=.7;this.scene.add(grid);this.grid=grid;
    const ring=new T.Mesh(new T.RingGeometry(.32,.325,80),new T.MeshBasicMaterial({color:0xbdc9ae,side:T.DoubleSide,transparent:true,opacity:.6}));ring.rotation.x=-Math.PI/2;ring.position.y=.001;this.scene.add(ring);this.ring=ring;
    const c=document.createElement('canvas');c.width=c.height=128;const cx=c.getContext('2d');const grad=cx.createRadialGradient(64,64,2,64,64,61);grad.addColorStop(0,'rgba(50,58,38,.27)');grad.addColorStop(1,'rgba(50,58,38,0)');cx.fillStyle=grad;cx.fillRect(0,0,128,128);const shadowTexture=new T.CanvasTexture(c);this.shadow=new T.Mesh(new T.PlaneGeometry(1,1),new T.MeshBasicMaterial({map:shadowTexture,transparent:true,depthWrite:false}));this.shadow.rotation.x=-Math.PI/2;this.shadow.position.y=.0015;this.scene.add(this.shadow);
    this.vehicle=new T.Group();this.vehicle.position.y=.045;this.scene.add(this.vehicle);this.cgMarker=new T.Mesh(new T.SphereGeometry(.009,10,8),new T.MeshBasicMaterial({color:0xde683a}));this.vehicle.add(this.cgMarker);
    this.ray=new T.Raycaster();this.pointer=new T.Vector2();this.up=new T.Vector3();this.inv=new T.Quaternion();
    this.resizeObserver=new ResizeObserver(()=>this.resize());this.resizeObserver.observe(host);this.intersect=new IntersectionObserver(entries=>{this.visible=entries[0].isIntersecting;if(this.visible)this.invalidate();});this.intersect.observe(host);this.visible=true;
    host.addEventListener('pointerdown',e=>this.pointerDown(e));host.addEventListener('pointermove',e=>this.pointerMove(e));host.addEventListener('pointerup',e=>this.pointerUp(e));host.addEventListener('pointercancel',()=>{this.drag=null;});host.addEventListener('wheel',e=>{e.preventDefault();this.zoom=clamp(this.zoom+e.deltaY*.001,.12,3.2);this.invalidate();},{passive:false});
    host.addEventListener('keydown',e=>{if(!this.calibrating||!['ArrowLeft','ArrowRight','ArrowUp','ArrowDown'].includes(e.key))return;e.preventDefault();const angle=e.key==='ArrowLeft'||e.key==='ArrowDown'?-.14:.14;this.rotateVehicle(this.axis,angle);});
    document.addEventListener('visibilitychange',()=>{this.last=0;if(document.hidden){this.callbacks.onPause?.();this.test=[];this.flight=false;this.altitude=0;this.targetAltitude=0;this.flightDistance=0;this.vehicle.position.set(0,this.baseY||.115,0);this.callbacks.onAltitude?.(0);}else this.invalidate();});
    this.animate=now=>{this.scheduled=false;this.tick(now);};this.resize();
  }
  material(color,metalness=0,roughness=.7){return new T.MeshStandardMaterial({color,metalness,roughness});}
  mesh(geometry,material,parent=this.model,key='frame'){const m=new T.Mesh(geometry,material);m.userData.part=key;parent.add(m);this.pickables.push(m);return m;}
  box(w,h,d,color,x=0,y=0,z=0,parent=this.model,key='frame'){const m=this.mesh(new T.BoxGeometry(w,h,d),this.material(color),parent,key);m.position.set(x,y,z);return m;}
  cyl(rt,rb,h,color,x=0,y=0,z=0,parent=this.model,key='motor',segments=20){const m=this.mesh(new T.CylinderGeometry(rt,rb,h,segments),this.material(color,.35,.42),parent,key);m.position.set(x,y,z);return m;}
  wire(points,color,radius=.0012,parent=this.wireGroup,key='esc',wireId=''){
    const curve=new T.CatmullRomCurve3(points.map(p=>new T.Vector3(...p)));
    const mesh=this.mesh(new T.TubeGeometry(curve,26,radius,5,false),this.material(color),parent,key);
    mesh.userData.wireId=wireId;
    if(wireId){this.nextWires.add(wireId);if(!this.knownWires.has(wireId)){
      const marker=this.mesh(new T.SphereGeometry(radius*2.8,8,6),new T.MeshBasicMaterial({color}),parent,key);
      marker.position.copy(curve.getPoint(0));mesh.geometry.setDrawRange(0,0);
      this.wireAnimations.push({mesh,curve,marker,start:performance.now()+this.wireAnimations.length*45,duration:650});
    }}return mesh;
  }
  label(text,x,y,z,scale=.035){const canvas=document.createElement('canvas');canvas.width=256;canvas.height=64;const ctx=canvas.getContext('2d');ctx.fillStyle='#e8eee4';ctx.textAlign='center';ctx.font='bold 30px Arial';ctx.fillText(text,128,43);const material=new T.SpriteMaterial({map:new T.CanvasTexture(canvas),depthTest:true});const m=new T.Sprite(material);m.scale.set(scale*4,scale,1);m.position.set(x,y,z);this.model.add(m);return m;}
  clearModel(){if(!this.model)return;const geometries=new Set(),materials=new Set(),textures=new Set();this.model.traverse(o=>{if(o.geometry)geometries.add(o.geometry);if(o.material){for(const m of(Array.isArray(o.material)?o.material:[o.material])){materials.add(m);if(m.map)textures.add(m.map);}}});geometries.forEach(g=>g.dispose());materials.forEach(m=>m.dispose());textures.forEach(t=>t.dispose());this.vehicle.remove(this.model);this.labels.forEach(l=>l.el.remove());this.labels=[];this.pickables=[];this.motorMeshes=[];}
  rebuild(state,propsRemoved=false){
    this.state=state;this.propsRemoved=propsRemoved;this.wireAnimations=[];this.nextWires=new Set();this.clearModel();this.model=new T.Group();this.vehicle.add(this.model);
    const p=selected(state);this.parts={};this.layout=assemblyLayout(p,state.type,state.batteryPosition);this.wireGroup=new T.Group();this.model.add(this.wireGroup);this.propMeshes=[];this.escMeshes=[];this.servoMeshes=[];this.controlSurfaces=[];this.motorMounts=[];
    this.empty=this.layout.empty;this.baseY=this.layout.rootY;this.vehicle.position.y=this.baseY+this.altitude*.12;
    if(!this.empty){if(state.type==='quad')this.buildQuad(p);else this.buildPlane(p);}
    this.knownWires=this.nextWires;this.wireGroup.visible=this.showWires;
    this.propMeshes.forEach(x=>x.visible=!propsRemoved);this.baseSpan=p.frame?(state.type==='quad'?p.frame.span:.72*p.frame.span):.36;
    this.ring.visible=!this.empty;this.shadow.visible=!this.empty;this.cgMarker.visible=!!p.battery;
    this.ring.scale.setScalar(state.type==='quad'?(p.frame?.span||.34)/.34:1.9);
    this.shadow.scale.setScalar(p.frame?(state.type==='quad'?p.frame.span*1.9:p.frame.span*1.25):1);
    this.cgMarker.position.set(0,this.layout.deck?.y+.007||0,-calculate(state).cg/1000);
    if(this.calibrating)this.addGizmo();this.invalidate();
  }
  buildQuad(p){
    const span=p.frame.span/Math.SQRT2/2,d=this.layout.deck,frameColor=0x303b3e,roles=motorPlan(this.state);
    for(const m of roles){const a=new T.Vector3(m.x*span,0,m.z*span);const arm=this.box(.023,.012,a.length(),frameColor);arm.position.copy(a.clone().multiplyScalar(.5));arm.quaternion.setFromUnitVectors(new T.Vector3(0,0,1),a.clone().normalize());this.box(.036,.005,.041,0x3b494a,a.x,.008,a.z);}
    this.box(d.width,.007,d.length,frameColor,0,0,0);this.box(d.width-.012,.005,d.length-.014,0x52605c,0,d.y-.0025,0);
    for(const x of[-d.width/2+.011,d.width/2-.011])for(const z of[-d.length/2+.013,d.length/2-.013])this.cyl(.003,.003,d.y-.003,0xb78d4b,x,d.y/2,z,this.model,'frame',8);
    // Ortadaki montaj delikleri ve ön yön işareti üst tablaya bağlıdır.
    for(const x of[-.032,.032])for(const z of[-.05,.05])this.cyl(.002,.002,.001,0x202e30,x,d.y+.001,z,this.model,'frame',8);
    this.box(.016,.001,.014,0xe48250,0,d.y+.001,-d.length/2+.013);
    for(const x of[-d.width/2+.012,d.width/2-.012])for(const z of[-d.length/2+.02,d.length/2-.02]){
      this.cyl(.003,.004,this.baseY-.005,0x68766c,x,-(this.baseY-.005)/2,z,this.model,'frame',8);
      this.box(.021,.005,.028,0x273739,x,-this.baseY+.0025,z);
    }
    if(p.fc)this.controller(p);if(p.battery)this.battery(p);
    for(let i=0;i<roles.length;i++){
      const m=roles[i],x=m.x*span,z=m.z*span;
      const motor=p.motor?this.motor(p,x,.011,z,i):null;
      if(p.esc){const g=new T.Group();g.position.set(x*.58,.014,z*.58);g.rotation.y=Math.atan2(x,z);this.model.add(g);this.escMeshes.push(g);
        this.box(p.esc.width/1000,.008,p.esc.length/1000,0x335d5b,0,0,0,g,'esc');this.box(p.esc.width/1100,.003,p.esc.length/1100,0x243438,0,.005,0,g,'esc');
        if(p.motor)for(let k=0;k<3;k++)this.wire([[x*.72+(k-1)*.003,.018,z*.72],[x*.87+(k-1)*.003,.021,z*.87],[x,.016,z]],k===0?0xce6d38:0x3e514b,.0012,this.wireGroup,'esc',`phase-${i}-${k}`);
        if(p.fc&&this.state.wiring[i]){const out=this.state.wiring[i],fc=this.layout.mounts.fc,ex=fc.x+fc.width/2+.002,ez=fc.z+(out-4.5)*.005;
          this.wire([[x*.43,.022,z*.43],[x*.3,d.y+.015,z*.3],[ex,fc.y,ez]],0xea8543,.0012,this.wireGroup,'esc',`signal-${i}-${out}`);
          if(this.state.ground[i])this.wire([[x*.43+.004,.022,z*.43],[x*.3+.005,d.y+.012,z*.3],[ex,fc.y-.003,ez]],0x263e43,.0011,this.wireGroup,'esc',`gnd-${i}-${out}`);
        }
      }
      if(p.prop&&motor)this.propeller(p,motor,0,p.motor.height/1000+.008,0,i);
      if(p.motor)this.addMotorLabel(i,x,p.motor.height/1000+.035,z,m.name);
    }
    this.extraParts(p);
  }
  standOffs(m,base,key){for(const x of[-m.width/2+.004,m.width/2-.004])for(const z of[-m.length/2+.004,m.length/2-.004])this.cyl(.0025,.0025,m.bottom-base,0xbca15e,m.x+x,(m.bottom+base)/2,m.z+z,this.model,key,8);}
  controller(p){const m=this.layout.mounts.fc,g=new T.Group();g.position.set(m.x,m.y,m.z);this.model.add(g);this.parts.fc=g;this.standOffs(m,this.layout.deck.y,'fc');
    this.box(m.width,m.height,m.length,0x26383c,0,0,0,g,'fc');this.box(m.width*.7,.001,m.length*.6,0x3f6664,0,m.height/2+.001,0,g,'fc');
    for(let i=0;i<8;i++)this.box(.004,.006,.003,0xc8a24e,m.width/2+.001,0,(i-3.5)*.005,g,'fc');
    this.box(.005,.001,.01,0xea7147,0,m.height/2+.002,-m.length*.2,g,'fc');
    this.label('PIXHAWK',m.x,m.y+m.height/2+.007,m.z,.007);
  }
  battery(p){const m=this.layout.mounts.battery,b=p.battery,g=new T.Group();g.position.set(m.x,m.y,m.z);this.model.add(g);this.parts.battery=g;
    const trayY=this.state.type==='plane'?m.bottom-.002:m.top+.003;this.box(m.width+.012,.004,m.length+.012,0x3f5150,0,trayY,m.z,this.model,'battery');
    if(this.state.type==='quad')for(const x of[-m.width/2-.004,m.width/2+.004])this.box(.004,Math.abs(trayY)+.004,m.length*.8,0x4d5e57,x,trayY/2,m.z,this.model,'battery');
    this.box(m.width,m.height,m.length,0x70877c,0,0,0,g,'battery');
    for(const z of[-m.length*.27,m.length*.27])this.box(m.width+.003,m.height+.008,.011,0x2b3d3d,0,0,z,g,'battery');
    this.box(m.width*.75,.001,.03,0xe5d8b2,0,m.height/2+.001,0,g,'battery');
    this.wire([[.009,m.y,m.z-m.length/2],[.032,m.y+.012,m.z-m.length/2-.01],[.028,.008,0]],0xc26244,.002,this.wireGroup,'battery','battery-positive');
    this.wire([[.015,m.y,m.z-m.length/2],[.039,m.y+.01,m.z-m.length/2-.01],[.034,.008,0]],0x263b40,.002,this.wireGroup,'battery','battery-negative');
  }
  motor(p,x,y,z,i){const m=p.motor,group=new T.Group();group.position.set(x,y,z);this.model.add(group);const r=m.diameter/2000,h=m.height/1000;this.cyl(r*.85,r*.9,.005,0x2c3430,0,0,0,group);const rotor=new T.Group();group.add(rotor);this.cyl(r,r,h*.78,m.color,0,h*.5,0,rotor);this.cyl(r*.96,r*.98,.003,0x333e35,0,h*.9,0,rotor);this.cyl(.003,.003,.013,0xbac5b5,0,h+.004,0,rotor);for(let k=0;k<10;k++){const a=k*Math.PI/5;this.box(.003,h*.5,.001,0x26332d,Math.cos(a)*(r+.0002),h*.5,Math.sin(a)*(r+.0002),rotor,'motor');}this.motorMeshes[i]={group,rotor,prop:null};return group;}
  propeller(p,parent,x,y,z,i){const prop=p.prop,group=new T.Group();group.position.set(x,y,z);parent.add(group);const r=prop.diameter*.0254/2;this.cyl(.006,.006,.004,(p.material?.color??0xa7b4ac),0,0,0,group,'prop',12);for(let j=0;j<prop.blades;j++){const shape=new T.Shape();shape.moveTo(.004,-.003);shape.bezierCurveTo(r*.35,-r*.15,r*.8,-r*.12,r,-.006);shape.quadraticCurveTo(r*1.03,.002,r*.86,.008);shape.bezierCurveTo(r*.5,r*.16,r*.22,r*.12,.004,.003);shape.closePath();const g=new T.ExtrudeGeometry(shape,{depth:.0015,bevelEnabled:false,curveSegments:6});g.rotateX(-Math.PI/2);const blade=this.mesh(g,this.material((p.material?.color??0xa7b4ac),.08,.5),group,'prop');blade.rotation.y=j*Math.PI*2/prop.blades;blade.rotation.z=this.state.directions[i]*.05;}this.propMeshes.push(group);if(this.motorMeshes[i])this.motorMeshes[i].prop=group;}
  extraParts(p){
    const {mounts:m,deck:d}=this.layout;
    if(this.state.extras.includes('gps')){const g=m.gps;this.box(.022,.004,.024,0x344c48,g.x,g.baseY+.002,g.z,this.model,'extras');this.cyl(.0024,.0024,g.height,0x637e70,g.x,g.baseY+g.height/2,g.z,this.model,'extras',8);this.cyl(.017,.017,.007,0xe2e3c8,g.x,g.y,g.z,this.model,'extras');this.cyl(.009,.009,.001,0xb6c7a6,g.x,g.y+.004,g.z,this.model,'extras');
      if(p.fc&&this.state.links?.gps){const f=m.fc;this.wire([[g.x,g.y-.004,g.z],[g.x+.005,d.y+.009,g.z],[f.x-f.width/2,f.y,f.z-.015]],0x459b70,.0011,this.wireGroup,'extras','gps-link');}}
    if(this.state.extras.includes('telemetry')){const t=m.telemetry;this.box(.026,.004,.038,0x465c50,t.x,t.baseY-.002,t.z,this.model,'extras');this.box(.016,.007,.029,0x537c62,t.x,t.y,t.z,this.model,'extras');this.cyl(.0013,.0013,.075,0x263837,t.x,t.y+.04,t.z+.009,this.model,'extras',6);}
    if(this.state.extras.includes('camera')){const c=m.camera,cy=c.y+(this.state.type==='plane'?0:.006);if(this.state.type!=='plane')this.box(.025,.016,.016,0x536b5b,0,c.y,c.z+.015,this.model,'extras');const housing=this.box(.027,.023,.024,0x304c4c,c.x,cy,c.z,this.model,'extras');housing.userData.cameraHousing=true;const lens=this.cyl(.008,.008,.012,0x203139,c.x,cy,c.z-.017,this.model,'extras');lens.rotation.x=Math.PI/2;lens.userData.cameraLens=true;}
    if(p.computer&&!this.layout.problems.length){const c=p.computer,slot=m.computer,g=new T.Group();g.position.set(slot.x,slot.y,slot.z);this.model.add(g);this.parts.computer=g;this.standOffs(slot,d.y,'computer');
      this.box(slot.width,.004,slot.length,c.color,0,-slot.height/2+.002,0,g,'computer');this.box(slot.width*.65,.008,slot.length*.7,0x2d4548,0,-slot.height/2+.009,0,g,'computer');
      for(let i=0;i<7;i++)this.box(slot.width*.65,slot.height-.013,.0028,0x586e6e,0,.004,-slot.length*.3+i*slot.length*.1,g,'computer');
      this.box(.015,.012,.013,0xb8c4b9,slot.width/2-.008,-slot.height/2+.01,-slot.length*.22,g,'computer');
      const r=m.regulator;this.box(.017,.006,.022,0xa7874e,r.x,r.y,r.z,this.model,'computer');
      if(this.state.links?.computer&&p.fc){const f=m.fc;for(const [i,color]of [[0,0x43a9c0],[1,0x647ec2],[2,0x34444b]])this.wire([[slot.x-slot.width/2,slot.y-slot.height/2+.007,slot.z+(i-1)*.004],[-d.width/2-.008,d.y+.013,(slot.z+f.z)/2],[f.x-f.width/2,f.y,f.z+(i-1)*.004]],color,.001,this.wireGroup,'computer','jetson-uart-'+i);this.wire([[r.x,r.y,r.z],[r.x,d.y+.014,r.z-.015],[slot.x+slot.width/2,slot.y-slot.height/2+.008,slot.z+.012]],0xc26b49,.0013,this.wireGroup,'computer','jetson-regulated-power');}
      this.label('JETSON',slot.x,slot.y+slot.height/2+.008,slot.z,.007);
    }
    if(this.state.payload>0){const w=.025+Math.cbrt(this.state.payload)*.004;this.box(w,.023,w,0xb78f60,0,-.035,0,this.model,'extras');}
  }
  buildPlane(p){createPlane(this,p);}
  addMotorLabel(i,x,y,z,name){const el=document.createElement('div');el.className='motor-label';el.innerHTML=`<b>M${i+1}</b><span></span>`;el.title=`M${i+1} · ${name}`;this.host.append(el);this.labels.push({el,pos:new T.Vector3(x,y,z),index:i});}
  setTest(indices,speed){this.test=indices;this.speed=speed;this.invalidate();}
  setProps(removed){this.propsRemoved=removed;this.propMeshes.forEach(p=>p.visible=!removed);this.invalidate();}
  setWires(show){this.showWires=show;if(this.wireGroup)this.wireGroup.visible=show;this.invalidate();}
  explode(){/* Parçalar artık fiziksel montaj yerlerinden ayrılmaz. */}
  setLabels(show){this.showLabels=show;this.invalidate();}
  removeGizmo(){if(!this.gizmo)return;this.vehicle.remove(this.gizmo);this.gizmo.traverse(o=>{o.geometry?.dispose();o.material?.dispose();});this.gizmo=null;this.gizmoMeshes=[];}
  setCalibration(active){
    this.calibrating=active;if(active){this.focusMode='whole';this.zoom=1;}
    // Serbest inceleme alanı: zemin modeli kesmesin; burada çarpışma fiziği yoktur.
    if(this.floor)this.floor.visible=!active;if(this.grid)this.grid.visible=!active;
    if(this.shadow)this.shadow.visible=!active&&!this.empty;if(this.ring)this.ring.visible=!active&&!this.empty;
    if(active)this.addGizmo();else this.removeGizmo();this.invalidate();
  }
  addGizmo(){
    this.removeGizmo();this.calibrating=true;this.gizmo=new T.Group();this.gizmoMeshes=[];
    const radius=this.state.type==='quad'?(this.baseSpan||.34)*.58:.34;
    for(const [axis,color]of [['x',0xe65353],['y',0x45a570],['z',0x4586df]]){
      const ring=new T.Mesh(new T.TorusGeometry(radius,.0025,8,80),new T.MeshBasicMaterial({color,transparent:true,opacity:.9,depthTest:false}));
      if(axis==='x')ring.rotation.y=Math.PI/2;if(axis==='y')ring.rotation.x=Math.PI/2;ring.userData.axis=axis;ring.renderOrder=15;this.gizmo.add(ring);
      const hit=new T.Mesh(new T.TorusGeometry(radius,.010,6,64),new T.MeshBasicMaterial({transparent:true,opacity:0,depthWrite:false,colorWrite:false}));hit.rotation.copy(ring.rotation);hit.visible=false;hit.userData.axis=axis;this.gizmo.add(hit);this.gizmoMeshes.push(hit);
    }this.vehicle.add(this.gizmo);
  }
  pointerRay(e){const r=this.host.getBoundingClientRect();this.pointer.set((e.clientX-r.left)/r.width*2-1,-(e.clientY-r.top)/r.height*2+1);this.ray.setFromCamera(this.pointer,this.camera);}
  focusInterior(){if(this.state.type!=='plane'||this.empty)return;this.focusMode='bay';this.cameraYaw=.52;this.cameraPitch=.96;this.zoom=1;this.invalidate();}
  changeZoom(factor){this.zoom=clamp(this.zoom*factor,.12,3.2);this.invalidate();}
  setView(view){this.focusMode='whole';this.cameraYaw=view==='side'?Math.PI/2:view==='top'?0:.62;this.cameraPitch=view==='top'?1.56:view==='side'?.08:.78;this.zoom=1;this.invalidate();}
  resetOrientation(){this.quat.identity();this.vehicle.quaternion.identity();this.callbacks.onRotation?.(this.orientation(),true);this.invalidate();}
  rotateVehicle(axis,angle){const q=new T.Quaternion().setFromAxisAngle(new T.Vector3(axis==='x'?1:0,axis==='y'?1:0,axis==='z'?1:0),angle);this.quat.multiply(q).normalize();this.vehicle.quaternion.copy(this.quat);this.callbacks.onRotation?.(this.orientation(),false,axis,angle);this.invalidate();}
  orientation(){this.inv.copy(this.quat).invert();return this.up.set(0,1,0).applyQuaternion(this.inv).toArray();}
  arcballVector(e){
    const r=this.host.getBoundingClientRect(),center=this.vehicle.getWorldPosition(new T.Vector3()).project(this.camera),radius=Math.min(r.width,r.height)*.38;
    let x=(e.clientX-r.left-(center.x*.5+.5)*r.width)/radius,y=-(e.clientY-r.top-(-center.y*.5+.5)*r.height)/radius;
    const len=x*x+y*y;return len<=1?new T.Vector3(x,y,Math.sqrt(1-len)):new T.Vector3(x,y,0).normalize();
  }
  pointerDown(e){if(e.button!==0)return;this.drag={x:e.clientX,y:e.clientY,startX:e.clientX,startY:e.clientY,moved:false};this.host.setPointerCapture(e.pointerId);this.host.focus({preventScroll:true});
    if(this.calibrating&&this.gizmo){
      this.pointerRay(e);const hit=this.ray.intersectObjects(this.gizmoMeshes,false)[0];
      if(!hit){this.drag.free=true;this.drag.ball=this.arcballVector(e);return;}
      this.axis=hit.object.userData.axis;this.callbacks.onAxis?.(this.axis);
      const normal=new T.Vector3(this.axis==='x'?1:0,this.axis==='y'?1:0,this.axis==='z'?1:0).applyQuaternion(this.quat),center=this.vehicle.getWorldPosition(new T.Vector3());
      const radial=hit.point.clone().sub(center),tangent=normal.clone().cross(radial).normalize(),project=p=>{const v=p.clone().project(this.camera);return new T.Vector2(v.x*this.host.clientWidth/2,-v.y*this.host.clientHeight/2);};
      const screenTangent=project(hit.point.clone().addScaledVector(tangent,radial.length())).sub(project(hit.point));
      this.drag.tangent=screenTangent.length()>3?screenTangent.normalize():new T.Vector2(1,0);this.drag.pixelsPerRadian=Math.max(45,project(hit.point.clone().addScaledVector(tangent,radial.length())).sub(project(hit.point)).length());
      // Kenardan görülen halka düzlemindeki kesişim kararsızdır; ekran teğeti kullanılır.
      if(Math.abs(this.ray.ray.direction.dot(normal))>.22){const plane=new T.Plane().setFromNormalAndCoplanarPoint(normal,center),point=this.ray.ray.intersectPlane(plane,new T.Vector3());if(point){this.drag.plane=plane;this.drag.center=center;this.drag.normal=normal;this.drag.previous=point.sub(center).normalize();}}
    }
  }
  pointerMove(e){if(!this.drag)return;const dx=e.clientX-this.drag.x,dy=e.clientY-this.drag.y;if(Math.abs(e.clientX-this.drag.startX)+Math.abs(e.clientY-this.drag.startY)>4)this.drag.moved=true;this.drag.x=e.clientX;this.drag.y=e.clientY;
    if(this.calibrating){
      if(this.drag.free){
        const v=this.arcballVector(e),qCamera=new T.Quaternion().setFromUnitVectors(this.drag.ball,v),cameraQ=this.camera.quaternion,qWorld=cameraQ.clone().multiply(qCamera).multiply(cameraQ.clone().invert()),before=this.quat.clone();
        this.quat.premultiply(qWorld).normalize();this.vehicle.quaternion.copy(this.quat);this.drag.ball=v;
        const localDelta=before.invert().multiply(this.quat),angles=new T.Euler().setFromQuaternion(localDelta,'XYZ');
        for(const axis of['x','y','z'])if(Math.abs(angles[axis])>1e-6)this.callbacks.onRotation?.(this.orientation(),false,axis,angles[axis]);
        this.invalidate();return;
      }
      let angle=(dx*(this.drag.tangent?.x||0)+dy*(this.drag.tangent?.y||0))/(this.drag.pixelsPerRadian||100);
      if(this.drag.plane){this.pointerRay(e);const p=this.ray.ray.intersectPlane(this.drag.plane,new T.Vector3());if(!p)return;const raw=p.sub(this.drag.center);if(raw.length()<(this.baseSpan||.34)*.08)return;const v=raw.normalize(),prev=this.drag.previous;angle=Math.atan2(this.drag.normal.dot(prev.clone().cross(v)),clamp(prev.dot(v),-1,1));this.drag.previous=v;}
      this.rotateVehicle(this.axis,clamp(angle,-.6,.6));
    }else{this.cameraYaw-=dx*.008;this.cameraPitch=clamp(this.cameraPitch+dy*.006,.05,1.56);this.invalidate();}
  }
  pointerUp(e){if(!this.drag)return;if(!this.drag.moved&&!this.calibrating){const rect=this.host.getBoundingClientRect();this.pointer.set((e.clientX-rect.left)/rect.width*2-1,-(e.clientY-rect.top)/rect.height*2+1);this.ray.setFromCamera(this.pointer,this.camera);const hit=this.ray.intersectObjects(this.pickables,false)[0];if(hit)this.callbacks.onSelect?.(hit.object.userData.part);}this.drag=null;}
  resize(){const w=this.host.clientWidth,h=this.host.clientHeight;if(!w||!h)return;this.camera.aspect=w/h;this.camera.updateProjectionMatrix();this.renderer.setSize(w,h,false);this.invalidate();}
  highlight(key){this.model?.traverse(o=>{if(o.material?.emissive){o.material.emissive.setHex(o.userData.part===key?0x4a2208:0x000000);o.material.emissiveIntensity=.22;}});this.invalidate();}
  schedule(){if(!this.scheduled&&this.animate){this.scheduled=true;requestAnimationFrame(this.animate);}}
  invalidate(){this.dirty=true;this.schedule();}
  tick(now){
    if(document.hidden||!this.visible){this.last=0;return;}
    const tiltTarget=this.flight?(this.flightPhase==='cruise'?90:0):(this.state?.plane?.tilt||0),tilting=this.state?.type==='plane'&&this.motorMounts.some(m=>m.role.orientation==='tilt')&&Math.abs((this.tiltCurrent??tiltTarget)-tiltTarget)>.1;
    const moving=tilting||this.wireAnimations.length||this.test.length||this.flight||Math.abs(this.altitude-this.targetAltitude)>.001;
    const interval=1000/30,elapsed=now-(this.lastFrame??now-interval);
    if(moving||this.calibrating){this.schedule();if(elapsed<interval-.5)return;}
    const dt=this.last?Math.min((now-this.last)/1000,.06):0;this.last=now;
    // Çizim maliyetinin sonraki kareye eklenip 30 FPS sınırını 20 FPS'e düşürmesini önler.
    this.lastFrame=(moving||this.calibrating)?now-elapsed+Math.max(1,Math.floor((elapsed+.5)/interval))*interval:now;
    if(moving){this.activeTime+=dt;this.test.forEach(i=>{const m=this.motorMeshes[i];if(!m)return;m.rotor.rotation.y+=this.state.directions[i]*(.8+this.speed/18);if(m.prop)m.prop.rotation.y+=this.state.directions[i]*(.8+this.speed/18);});if(this.flight){this.motorMeshes.forEach((m,i)=>{if(this.state.type==='plane'&&!activePlaneMotors(this).includes(i))return;if(m){m.rotor.rotation.y+=this.state.directions[i]*1.1;if(m.prop)m.prop.rotation.y+=this.state.directions[i]*1.1;}});if(this.state.type==='plane'&&(!this.planeDesign?.vtol||this.flightPhase==='cruise')){this.flightDistance=Math.min((this.flightDistance||0)+dt*.12,.30);this.vehicle.position.z=this.targetAltitude? -this.flightDistance:this.vehicle.position.z*.96;}}
      this.altitude+=(this.targetAltitude-this.altitude)*.035;if(Math.abs(this.targetAltitude-this.altitude)<.005)this.altitude=this.targetAltitude;this.vehicle.position.y=(this.baseY||.115)+this.altitude*.12;this.shadow.material.opacity=1/(1+this.altitude*.65);this.callbacks.onAltitude?.(this.altitude);this.dirty=true;}
    this.wireAnimations=this.wireAnimations.filter(a=>{const t=clamp((now-a.start)/a.duration,0,1);a.mesh.geometry.setDrawRange(0,Math.floor(a.mesh.geometry.index.count*t/3)*3);a.marker.position.copy(a.curve.getPoint(t));a.marker.visible=t>0&&t<1;if(t>=1){a.marker.parent?.remove(a.marker);a.marker.geometry.dispose();a.marker.material.dispose();return false;}return true;});
    this.callbacks.onTick?.(now,dt);
    if(!this.dirty)return;this.dirty=false;
    const bay=this.state?.type==='plane'?this.layout.bay:null,close=this.focusMode==='bay'&&bay,distance=(close?bay.length*2.6:(this.baseSpan||.34)*(bay?2.9:3.5))*this.zoom,lookY=(this.baseY||.115)+(bay?bay.floor+.04:.01)+this.altitude*.07,lookZ=close?(bay.front+bay.back)/2:0;this.camera.position.set(Math.sin(this.cameraYaw)*Math.cos(this.cameraPitch)*distance,lookY+Math.sin(this.cameraPitch)*distance,lookZ+Math.cos(this.cameraYaw)*Math.cos(this.cameraPitch)*distance);this.camera.lookAt(0,lookY,lookZ);
    this.camera.updateMatrixWorld(true);
    if(this.state.type==='plane')updatePlaneControls(this);
    for(let i=0;i<this.servoMeshes.length;i++){const angle=(this.servos[i<2?0:i-1]||0)*.012;if(i<3)this.servoMeshes[i].rotation.x=i===1?-angle:angle;else this.servoMeshes[i].rotation.y=angle;}
    this.vehicle.updateMatrixWorld(true);
    const occupied=[],projectedSpan=this.baseSpan/(distance*Math.tan(T.MathUtils.degToRad(17.5)))*this.host.clientHeight/2;
    for(const l of [...this.labels].sort((a,b)=>Number(this.test.includes(b.index))-Number(this.test.includes(a.index)))){
      const v=l.pos.clone();this.vehicle.localToWorld(v);v.project(this.camera);const running=this.test.includes(l.index)||this.flight,ui=labelPresentation(this.zoom,projectedSpan,running),x=(v.x*.5+.5)*this.host.clientWidth,y=(-v.y*.5+.5)*this.host.clientHeight;
      const rect={x:x-30*ui.scale,y:y-9*ui.scale,w:60*ui.scale,h:18*ui.scale};const overlap=occupied.some(r=>rect.x<r.x+r.w&&rect.x+rect.w>r.x&&rect.y<r.y+r.h&&rect.y+rect.h>r.y);
      l.el.style.left=x+'px';l.el.style.top=y+'px';l.el.style.transform=`translate(-50%,-50%) scale(${ui.scale})`;l.el.hidden=!this.showLabels||!ui.visible||Math.abs(v.x)>1||Math.abs(v.y)>1||v.z>1||overlap;
      if(!l.el.hidden)occupied.push(rect);l.el.classList.toggle('running',running);l.el.querySelector('span').textContent=this.state.directions[l.index]===1?' ↻':' ↺';
    }
    this.renderer.render(this.scene,this.camera);
  }
}
