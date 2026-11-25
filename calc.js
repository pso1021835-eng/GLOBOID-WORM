import {blankDimensions} from './shape.js?v=hindley-relief-3';
export const defaults = Object.freeze({
  reliefRun:3, reliefDepth:.15, wormAngle:37.5, shank:12, journal:10, bore:12, gearFlat:.7, gearBevel:.8, gearAngle:32.5, backlash:0,
  center:50, teeth:30, starts:1, pressure:20, rpm:1000,
  efficiency:75, service:1, tilt:0, arm:35, pivot:'parallel', material:'std'
});
const rad = Math.PI/180;

// Linear interpolation between selected engineering reference points.
// The display distinguishes this estimate from a full table-based rating.
const references = {
  pressure:[[50,.0816],[65,.1661],[75,.2446],[90,.4794],[100,.603],[150,1.617],[200,3.478],[300,10.439],[450,31.894],[650,85.776],[1000,275.075]],
  material:[[50,.6157],[65,.6925],[75,.7383],[90,.8012],[100,.8399],[150,1.007],[200,1.103],[300,1.242],[450,1.322],[650,1.410],[1000,1.475]],
  ratio:[[3,.38],[4,.49],[6,.604],[8,.665],[10,.690],[15,.723],[20,.737],[30,.746],[50,.750],[74,.753]],
  speed:[[0,.75],[.1,.701],[.3,.632],[.5,.589],[1,.530],[1.3,.497],[2,.424],[3,.352],[4,.307],[5,.274],[10,.177],[15,.1355],[20,.1078],[25,.0905],[30,.0785]]
};
function interpolate(x, values) {
  const i = values.findIndex(([limit]) => x<=limit);
  if (i<0 || x<values[0][0]) return NaN;
  if (i===0) return values[0][1];
  const [left,lo]=values[i-1], [right,hi]=values[i];
  return lo+(hi-lo)*(x-left)/(right-left);
}
export function calculate(s) {
  const u=s.teeth/s.starts, dw1=s.center**.875/1.47, dw2=2*s.center-dw1;
  const ma=dw2/s.teeth, lead=Math.atan(dw2/(dw1*u)), mn=ma*Math.cos(lead);
  const depth=Math.PI*mn/2, add=.45*depth, ded=depth-add;
  const da1=dw1+2*add, df1=dw1-2*ded, rootMin=s.center**.875/2;
  const alphaX=Math.atan(Math.tan(s.pressure*rad)/Math.cos(lead));
  const width=df1, base=dw2*Math.sin(alphaX+.55*Math.PI/s.teeth);
  const length=base-.02*s.center;
  const speed=s.rpm*da1/(19098*Math.cos(lead)), outRpm=s.rpm/u;
  const theta=s.tilt*rad;
  const py=s.pivot==='oblique'?Math.SQRT1_2:0, pz=Math.sqrt(1-py*py);
  const dx=Math.cos(theta),dy=pz*Math.sin(theta),dz=-py*Math.sin(theta);
  // Worm line passes through fixed pivot (-arm,center,0); wheel axis is Z.
  const actualCenter=Math.abs(dx*s.center+dy*s.arm)/Math.hypot(dx,dy);
  const shaftAngle=Math.acos(Math.max(-1,Math.min(1,dz)))/rad;
  const issues=[];
  if(s.center<50||s.center>1000) issues.push('중심거리 계수 범위 50–1,000 mm 밖');
  if(u<3||u>74) issues.push('감속비 자동 산정 범위 3–74 밖');
  if(speed>30) issues.push('미끄럼속도 30 m/s 초과');
  if(Math.abs(s.tilt)>1e-8) issues.push('틸트 상태에서 접촉반점 검토 필요');
  if(s.material!=='std') issues.push('표준 재료 조합에 대한 계수 필요');
  if(df1<rootMin) issues.push('웜 골지름이 권장 최솟값 미달');
  if(s.rpm<=100) issues.push('100 rpm 이하 저속 운전 별도 검토');
  const blank=blankDimensions(s,{dw1,dw2,da1,df1,length,width,depth,add,ded,ma,base});
  issues.push(...blank.errors);
  const factors=[interpolate(s.center,references.pressure),interpolate(u,references.ratio),interpolate(s.center,references.material),interpolate(speed,references.speed)];
  const power=issues.length?null:.746*outRpm*factors.reduce((a,b)=>a*b,1);
  const torque=power===null?null:9550*power*(s.efficiency/100)/(outRpm*s.service);
  return {blank,base,u,dw1,dw2,ma,mn,lead:lead/rad,alphaX:alphaX/rad,da1,df1,rootMin,width,length,depth,add,ded,speed,outRpm,actualCenter,shaftAngle,factors,power,torque,issues};
}