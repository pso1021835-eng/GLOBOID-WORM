export function drawSection(canvas,s,g) {
  const ctx=canvas.getContext('2d'),w=canvas.clientWidth,h=canvas.clientHeight;
  if(!ctx||!w||!h)return;
  const dpr=Math.min(devicePixelRatio,2);canvas.width=w*dpr;canvas.height=h*dpr;ctx.scale(dpr,dpr);
  const a=s.center,R=g.dw2/2,r=g.dw1/2,hx=g.length/2;
  const k=Math.min((w-35)/(2.8*R),(h-65)/(R+a+1.8*r));
  const cx=w*.48,cy=(h-20+ k*(a+1.5*r-R))/2;
  const X=x=>cx+x*k,Y=y=>cy-y*k;
  ctx.clearRect(0,0,w,h);ctx.lineWidth=1;
  function line(x1,y1,x2,y2,color,dash=[]){ctx.setLineDash(dash);ctx.strokeStyle=color;ctx.beginPath();ctx.moveTo(X(x1),Y(y1));ctx.lineTo(X(x2),Y(y2));ctx.stroke();ctx.setLineDash([])}
  function circle(x,y,rad,color,dash=[]){ctx.setLineDash(dash);ctx.strokeStyle=color;ctx.beginPath();ctx.arc(X(x),Y(y),k*rad,0,Math.PI*2);ctx.stroke();ctx.setLineDash([])}
  function label(msg,x,y,color){ctx.fillStyle=color;ctx.font='12px system-ui';ctx.fillText(msg,X(x),Y(y))}
  const bronze='#d7a569',blue='#96b7ce',muted='#8b7c6b';
  ctx.fillStyle='rgba(218,164,86,.14)';ctx.beginPath();ctx.arc(cx,cy,k*(R+g.add),0,2*Math.PI);ctx.fill();
  circle(0,0,R+g.add,bronze);circle(0,0,R-g.ded,'#786246');circle(0,0,R,bronze,[6,4]);circle(0,0,R*.17,bronze);
  line(-R*1.18,0,R*1.22,0,muted,[9,3,2,3]);line(0,-R*1.1,0,a+2*r,muted,[9,3,2,3]);
  const py=s.pivot==='parallel'?0:Math.SQRT1_2,pz=Math.sqrt(1-py*py),t=s.tilt*Math.PI/180;
  const dx=Math.cos(t),dy=pz*Math.sin(t);
  function transform(x,y){return [-s.arm+(x+s.arm)*dx-y*dy,a+(x+s.arm)*dy+y*(py*py+(1-py*py)*dx)]}
  function outline(add,color,dash=[]){
    ctx.setLineDash(dash);ctx.beginPath();
    for(const side of [1,-1])for(let j=0;j<=70;j++){
      const x=side*(2*j/70-1)*hx,rad=a-Math.sqrt(Math.max(R*R-x*x,.08*R*R))+add;
      const [xx,yy]=transform(x,side*rad);
      if(side===1&&j===0)ctx.moveTo(X(xx),Y(yy));else ctx.lineTo(X(xx),Y(yy));
    }
    ctx.closePath();ctx.strokeStyle=color;ctx.stroke();ctx.setLineDash([]);
  }
  outline(g.add,'#dadbdb');outline(-g.ded,'#827f78');outline(0,blue,[5,4]);
  const l=transform(-hx*1.5,0),rr=transform(hx*1.5,0);line(...l,...rr,blue,[9,3,2,3]);
  label('휠 PCD  '+g.dw2.toFixed(2)+' mm',-.77*R,-.58*R,bronze);
  label('웜 목지름  '+g.da1.toFixed(2)+' mm',-.9*R,a+1.63*r,'#d6dedf');
  label('a  '+g.actualCenter.toFixed(2)+' mm',.45*R,.52*a,blue);
}