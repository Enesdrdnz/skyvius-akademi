/* Ders içi sayısal örnekler. Uçuş kontrolcüsü veya eğitilmiş model çalıştırmaz. */
(function(root){
  const M={};
  M.pid=function(kp,ki,kd){
    const dt=.05,target=20,wind=-.6,points=[[0,0]];
    let x=0,v=0,integral=0,previous=target;
    for(let i=0;i<600;i++){
      const e=target-x;integral=Math.max(-5,Math.min(5,integral+e*dt));
      const derivative=(e-previous)/dt;previous=e;
      const command=Math.max(-5,Math.min(5,kp*e+ki*integral+kd*derivative));
      v+=(command-v)*.15;x+=(v+wind)*dt;points.push([(i+1)*dt,x]);
    }
    const max=Math.max(...points.map(p=>p[1]));
    let lastOutside=-1;points.forEach((p,i)=>{if(Math.abs(target-p[1])>.02*target)lastOutside=i;});
    return {points,error:target-x,overshoot:Math.max(0,(max-target)/target*100),settle:lastOutside<points.length-1?points[lastOutside+1][0]:null};
  };
  M.hsv=function(r,g,b){
    r/=255;g/=255;b/=255;const max=Math.max(r,g,b),min=Math.min(r,g,b),delta=max-min;
    let h=0;if(delta){if(max===r)h=((g-b)/delta)%6;else if(max===g)h=(b-r)/delta+2;else h=(r-g)/delta+4;h*=60;if(h<0)h+=360;}
    return [h/2,max===0?0:delta/max*255,max*255];
  };
  M.yolo=function(x,y,w,h,width=640,height=480){return [(x+w/2)/width,(y+h/2)/height,w/width,h/height];};
  M.iou=function(a,b){
    const area=(r)=>Math.max(0,r[2]-r[0])*Math.max(0,r[3]-r[1]);
    const intersection=area([Math.max(a[0],b[0]),Math.max(a[1],b[1]),Math.min(a[2],b[2]),Math.min(a[3],b[3])]);
    const union=area(a)+area(b)-intersection;return union>0?intersection/union:0;
  };
  M.evaluate=function(labels,predictions,confidence=.25,threshold=.5){
    const used=new Set(),active=predictions.filter(p=>p.score>=confidence).sort((a,b)=>b.score-a.score),matches=[];
    for(const p of active){let best=-1,overlap=threshold;labels.forEach((g,i)=>{const value=M.iou(g.box,p.box);if(!used.has(i)&&g.cls===p.cls&&value>=overlap){best=i;overlap=value;}});if(best>=0)used.add(best);matches.push({prediction:p,truth:best,iou:best>=0?overlap:0});}
    const tp=used.size,fp=active.length-tp,fn=labels.length-tp;
    return {tp,fp,fn,precision:tp+fp?tp/(tp+fp):null,recall:labels.length?tp/labels.length:null,matches};
  };
  if(typeof module==='object'&&module.exports)module.exports=M;else root.AkademiModel=M;
})(typeof window==='object'?window:this);
