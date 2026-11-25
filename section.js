import {wormLimits,wormRadius} from './shape.js';
export function drawSection(canvas,s,g,highlight=true) {
  const ctx=canvas.getContext('2d'),w=canvas.clientWidth,h=canvas.clientHeight;
  if(!ctx||!w||!h)return;
  const dpr=Math.min(devicePixelRatio,2);canvas.width=w*dpr;canvas.height=h*dpr;ctx.scale(dpr,dpr);
  const a=s.center,R=g.dw2/2,r=g.dw1/2,b=g.blank,hx=b.totalHalf;
  const k=Math.min((w-35)/(2.35*Math.max(R,hx)),(h-65)/(R+a+1.8*r));
  const cx=w*.48,cy=(h-20+ k*(a+1.5*r-R))/2;
  const X=x=>cx+x*k,Y=y=>cy-y*k;
  ctx.clearRect(0,0,w,h);ctx.lineWidth=1;
  function line(x1,y1,x2,y2,color,dash=[]){ctx.setLineDash(dash);ctx.strokeStyle=color;ctx.beginPath();ctx.moveTo(X(x1),Y(y1));ctx.lineTo(X(x2),Y(y2));ctx.stroke();ctx.setLineDash([])}
  function circle(x,y,rad,color,dash=[]){ctx.setLineDash(dash);ctx.strokeStyle=color;ctx.beginPath();ctx.arc(X(x),Y(y),k*rad,0,Math.PI*2);ctx.stroke();ctx.setLineDash([])}
  function label(msg,x,y,color){ctx.fillStyle=color;ctx.font='12px system-ui';ctx.fillText(msg,X(x),Y(y))}
  const bronze='#d7a569',blue='#96b7ce',muted='#8b7c6b';
  ctx.fillStyle='rgba(218,164,86,.14)';ctx.beginPath();ctx.arc(cx,cy,k*(R+g.add),0,2*Math.PI);ctx.fill();
  circle(0,0,R+g.add,bronze);circle(0,0,R-g.ded,'#786246');circle(0,0,R,bronze,[6,4]);if(s.bore>0)circle(0,0,s.bore/2,bronze);
  circle(0,0,g.base/2,muted,[2,5]);
  line(-R*1.18,0,R*1.22,0,muted,[9,3,2,3]);line(0,-R*1.1,0,a+2*r,muted,[9,3,2,3]);
  const py=s.pivot==='parallel'?0:Math.SQRT1_2,pz=Math.sqrt(1-py*py),t=s.tilt*Math.PI/180;
  const dx=Math.cos(t),dy=pz*Math.sin(t);
  function transform(x,y){return [-s.arm+(x+s.arm)*dx-y*dy,a+(x+s.arm)*dy+y*(py*py+(1-py*py)*dx)]}
  const stops=[-b.totalHalf,-b.bevelEnd,-b.flatEnd,-b.arcEnd,-b.half,b.half,b.arcEnd,b.flatEnd,b.bevelEnd,b.totalHalf];
  for(let i=1;i<stops.length;i++){
    const left=stops[i-1],right=stops[i],mid=Math.abs((left+right)/2),isRelief=mid>b.half&&mid<b.bevelEnd;
    ctx.setLineDash([]);ctx.fillStyle=isRelief&&highlight?'#754c33':'#4a4a46';ctx.strokeStyle=isRelief&&highlight?'#f1ac7b':'#d0d1c8';
    ctx.beginPath();
    const count=Math.max(12,Math.ceil((right-left)/b.pitch*60));
    for(const side of [1,-1])for(let n=0;n<=count;n++){
      const x=side===1?left+(right-left)*n/count:right-(right-left)*n/count;
      const radial=wormRadius(x,side===1?0:Math.PI,s,g);
      const [xx,yy]=transform(x,side*radial);
      if(side===1&&n===0)ctx.moveTo(X(xx),Y(yy));else ctx.lineTo(X(xx),Y(yy));
    }
    ctx.closePath();ctx.fill();ctx.stroke();
  }
  for(const sign of [-1,1]){
    const x=sign*b.half,top=wormLimits(x,s,g)[1];
    line(...transform(x,-top),...transform(x,top*1.16),'#dc9870',[3,3]);
  }
  const l=transform(-hx,0),rr=transform(hx,0);line(...l,...rr,blue,[9,3,2,3]);
  label('휠 PCD  '+g.dw2.toFixed(2)+' mm',-.77*R,-.58*R,bronze);
  label('릴리프 시작  ±'+b.half.toFixed(2)+' mm',-.85*R,a+1.7*r,'#efba92');
  label('a  '+g.actualCenter.toFixed(2)+' mm',.45*R,.52*a,blue);
}
