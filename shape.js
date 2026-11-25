// Distances in mm, angles in radians unless a UI field explicitly uses degrees.
const TAU=2*Math.PI, DEG=Math.PI/180;
function sag(radius,offset){return offset*offset/(radius+Math.sqrt(radius*radius-offset*offset))}
export function blankDimensions(s,g){
  const R=g.dw2/2, pitch=Math.PI*g.ma, clear=g.depth-2*g.add;
  const rg1=1.06*(s.center-g.da1/2), rf2=g.da1/2+2*clear, rg2=rf2-g.depth;
  const bf1=pitch/5.5, half=g.length/2, arcEnd=half+s.reliefRun, flatEnd=arcEnd+bf1;
  const rootArc=R+g.ded, wheelHalf=g.width/2, gearArcEnd=wheelHalf-s.gearBevel-s.gearFlat;
  const errors=[];
  if(g.df1<=0 || g.length<=0 || g.width<=0) errors.push('기본 제원에서 양의 골지름과 유효 길이를 확보하세요.');
  if(arcEnd>=Math.min(rg1,rootArc)) errors.push('릴리프 길이가 목부 원호의 작도 범위를 벗어납니다.');
  if(s.shank>=g.df1) errors.push('축 지름은 웜 중앙 골지름보다 작게 입력하세요.');
  if(s.bore>=g.dw2-2*g.ded) errors.push('휠 보어가 골지름 이상입니다.');
  if(gearArcEnd<=0 || gearArcEnd>=rg2 || wheelHalf>=rf2) errors.push('휠 평탄부·면취 폭 또는 치폭이 목부 작도 범위를 벗어납니다.');
  if(s.backlash>=.45*pitch) errors.push('백래시가 웜 피치 이두께 이상입니다.');
  const blankR=g.da1/2+sag(rg1,arcEnd), cutR=blankR-s.reliefDepth;
  if(cutR<=s.shank/2 || cutR<=s.center-Math.sqrt(rootArc**2-arcEnd**2)) errors.push('단부 제거량이 가용 이높이를 초과합니다.');
  const bevelEnd=flatEnd+(cutR-s.shank/2)*Math.tan(s.wormAngle*DEG);
  const gearOD=2*(R+g.add+sag(rg2,gearArcEnd));
  if(gearOD/2-s.gearBevel/Math.tan(s.gearAngle*DEG)<=s.bore/2) errors.push('휠 단부 면취가 보어에 도달합니다.');
  const beta=Math.asin(g.base/g.dw2), pitchAngle=TAU/s.teeth;
  return {pitch,clear,rg1,rf2,rg2,bf1,half,arcEnd,flatEnd,bevelEnd,blankR,cutR,rootArc,wheelHalf,gearArcEnd,gearOD,errors,
    pitchAngle,beta,halfTooth:(.45*pitch-s.backlash)/(2*R),totalHalf:bevelEnd+s.journal};
}
export function wormLimits(x,s,g){
  const t=Math.abs(x),b=g.blank, shaft=s.shank/2;
  if(t>=b.bevelEnd)return [shaft,shaft];
  const q=Math.min(t,b.arcEnd),v=Math.max(0,Math.min(1,(t-b.half)/s.reliefRun));
  const loss=s.reliefDepth*v*v*(3-2*v);
  const crest=g.da1/2+sag(b.rg1,q)-loss;
  const outer=t<=b.flatEnd?crest:b.cutR-(t-b.flatEnd)/Math.tan(s.wormAngle*DEG);
  const floor=s.center-Math.sqrt(b.rootArc*b.rootArc-q*q);
  return [Math.min(floor,outer),outer];
}
export function wheelLimits(z,s,g){
  const b=g.blank,t=Math.abs(z),R=g.dw2/2;
  const floor=R-g.ded+sag(b.rf2,t);
  let tip=R+g.add+sag(b.rg2,Math.min(t,b.gearArcEnd));
  if(t>b.wheelHalf-s.gearBevel)tip-=(t-b.wheelHalf+s.gearBevel)/Math.tan(s.gearAngle*DEG);
  // A face chamfer can truncate an entire tooth on fine-pitch wheels.
  return [Math.min(floor,tip),tip];
}
// Rotating a pair of straight generators tangent to the common base circle:
// their angular intersections at radius rho differ by asin(rb/rho).
function insideFlanks(x,rhoWorm,roll,s,g){
  const b=g.blank,y=s.center-rhoWorm,rho=Math.hypot(x,y);
  if(rho<=g.base/2)return false;
  const width=b.halfTooth+b.beta-Math.asin(g.base/(2*rho));
  const phase=(Math.atan2(x,y)-roll)/b.pitchAngle;
  return Math.abs(phase-Math.round(phase))*b.pitchAngle<=width;
}
export function wormRadius(x,theta,s,g){
  let [lo,hi]=wormLimits(x,s,g);
  if(hi<=lo)return lo;
  const roll=(theta-Math.PI)/g.u;
  if(insideFlanks(x,hi,roll,s,g))return hi;
  if(!insideFlanks(x,lo,roll,s,g))return lo;
  for(let i=0;i<12;i++){const r=(lo+hi)/2;if(insideFlanks(x,r,roll,s,g))lo=r;else hi=r}
  return (lo+hi)/2;
}
// Sample a virtual hob oriented on the worm axis. The nominal cutter restores
// assembly backlash, and its crest extends by the radial tip clearance.
export function wheelProfile(s,g,across=20,perTooth=40){
  const b=g.blank,R=g.dw2/2, span=Math.asin(Math.min(1,b.half/(R-g.ded)));
  const samples=Array.from({length:65},(_,i)=>{const q=span*(2*i/64-1);return [q,Math.sin(q),Math.cos(q)]});
  function cut(radius,z,phase){
    for(const [q,sin,cos] of samples){
      const x=radius*sin;if(Math.abs(x)>b.half)continue;
      const y=radius*cos-s.center,rw=Math.hypot(y,z);
      if(rw>g.da1/2+sag(b.rg1,x)+b.clear)continue;
      const theta=Math.atan2(z,y);
      const roll=(theta-Math.PI)/g.u-phase+q;
      const cy=s.center-rw,rho=Math.hypot(x,cy);
      if(rho<=g.base/2)continue;
      const width=.45*b.pitchAngle/2+b.beta-Math.asin(g.base/(2*rho));
      const f=(Math.atan2(x,cy)-roll)/b.pitchAngle;
      if(Math.abs(f-Math.round(f))*b.pitchAngle<=width)return true;
    }
    return false;
  }
  const stations=[...Array.from({length:across+1},(_,i)=>b.wheelHalf*(2*i/across-1)),-b.gearArcEnd,b.gearArcEnd,-(b.wheelHalf-s.gearBevel),b.wheelHalf-s.gearBevel];
  const zs=[...new Set(stations)].sort((a,b)=>a-b);
  const bands=zs.map(z=>{
    const [root,tip]=wheelLimits(z,s,g);
    return Array.from({length:perTooth},(_,i)=>{
      const phase=-b.pitchAngle*i/perTooth;
      if(!cut(tip,z,phase))return tip;
      if(cut(root,z,phase))return root;
      let lo=root,hi=tip;
      for(let n=0;n<11;n++){const r=(lo+hi)/2;if(cut(r,z,phase))hi=r;else lo=r}
      return (lo+hi)/2;
    });
  });
  return {zs,bands,perTooth};
}