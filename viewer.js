import * as T from './vendor/three.js';
import { OrbitControls } from './vendor/orbit.js';
import { RoomEnvironment } from './vendor/room.js';

const tau=2*Math.PI;
const clamp=(n,a,b)=>Math.max(a,Math.min(b,n));
function surface(parent,mat,rows,cols,point){
  const vertices=[],indices=[];
  for(let j=0;j<=rows;j++) for(let i=0;i<=cols;i++) vertices.push(...point(i/cols,j/rows));
  for(let j=0;j<rows;j++) for(let i=0;i<cols;i++){
    const a=j*(cols+1)+i,b=a+cols+1;
    indices.push(a,b,a+1,b,b+1,a+1);
  }
  const g=new T.BufferGeometry();
  g.setAttribute('position',new T.Float32BufferAttribute(vertices,3));
  g.setIndex(indices);g.computeVertexNormals();
  const mesh=new T.Mesh(g,mat); parent.add(mesh); return mesh;
}
function cylinder(parent,mat,r,len,axis,at){
  const geo=new T.CylinderGeometry(r,r,len,64);
  if(axis==='x')geo.rotateZ(Math.PI/2);else geo.rotateX(Math.PI/2);
  const m=new T.Mesh(geo,mat);m.position[axis]=at;parent.add(m);
}
function annulus(parent,mat,outer,inner,z1,z2){
  const c=Math.min((z2-z1)*.2,(outer-inner)*.12);
  const edge=[[inner+c,z1],[outer-c,z1],[outer,z1+c],[outer,z2-c],[outer-c,z2],[inner+c,z2],[inner,z2-c],[inner,z1+c],[inner+c,z1]];
  const geo=new T.LatheGeometry(edge.map(([r,z])=>new T.Vector2(r,z)),96);
  geo.rotateX(Math.PI/2);parent.add(new T.Mesh(geo,mat));
}
function material(color,roughness){
  return new T.MeshStandardMaterial({color,metalness:.89,roughness,side:T.DoubleSide});
}
export function makeViewer(canvas){
  const renderer=new T.WebGLRenderer({canvas,alpha:true,antialias:true});
  renderer.setPixelRatio(Math.min(devicePixelRatio,2));
  renderer.toneMapping=T.ACESFilmicToneMapping;renderer.toneMappingExposure=1.26;
  const scene=new T.Scene(),cam=new T.PerspectiveCamera(32,1,.01,50);
  const pm=new T.PMREMGenerator(renderer),room=new RoomEnvironment(renderer);
  scene.environment=pm.fromScene(room,.04).texture;room.dispose();pm.dispose();
  const hemi=new T.HemisphereLight(0xffe5bf,0x524132,1.7);scene.add(hemi);
  const light=new T.DirectionalLight(0xffead2,3.5);light.position.set(-2,5,4);scene.add(light);
  const stage=new T.Group();scene.add(stage);
  const controls=new OrbitControls(cam,canvas);controls.enablePan=false;controls.minDistance=1.5;controls.maxDistance=8;
  const steel=material(0xc6ccd2,.24),edge=material(0x949fa7,.21),gold=material(0xdca357,.30), brass=material(0xbd853c,.34);
  let pivot,worm,wheel,geometryKey='',last=0,angle=0,params,ratio=30,playing=!matchMedia('(prefers-reduced-motion: reduce)').matches,speed=.03,visible=true;
  function home(){controls.target.set(0,.22,0);cam.position.set(1.55,1.67,3.95);controls.update()}
  function set(s,g){
    params=s;ratio=g.u; const key=[s.center,s.teeth,s.starts,s.pressure].join('/');
    if(key!==geometryKey){
      stage.traverse(o=>o.geometry?.dispose());stage.clear();geometryKey=key;
      wheel=new T.Group();stage.add(wheel);pivot=new T.Group();stage.add(pivot);worm=new T.Group();pivot.add(worm);
      const a=s.center,R=g.dw2/2,r=g.dw1/2,half=g.length/2,face=g.width/2;
      const body=(x)=>a-Math.sqrt(Math.max(R*R-x*x,R*R*.08));
      const flank=clamp(.45*Math.tan(g.alphaX*Math.PI/180),.08,.32);
      const tooth=(phase)=>clamp((.34-Math.abs((phase-Math.floor(phase+.5))))/flank,0,1);
      surface(worm,steel,Math.max(64,s.starts*20),Math.max(120,Math.ceil(g.length/(Math.PI*g.ma)*30)),(tx,tr)=>{
        const x=(tx*2-1)*half,t=tr*tau;
        const phase=s.teeth*Math.asin(clamp(x/R,-.99,.99))/tau-s.starts*(t-Math.PI)/tau;
        const rad=body(x)-g.ded+g.depth*tooth(phase);
        return [x/a,rad*Math.cos(t)/a,rad*Math.sin(t)/a];
      });
      const journal=g.df1*.35/a, ext=R*.48;
      for(const sign of [-1,1]){
        surface(worm,steel,1,Math.max(96,s.starts*24),(tr,blend)=>{
          const x=sign*half,t=tr*tau;
          const phase=s.teeth*Math.asin(clamp(x/R,-.99,.99))/tau-s.starts*(t-Math.PI)/tau;
          const outer=(body(x)-g.ded+g.depth*tooth(phase))/a;
          const rad=outer+(journal-outer)*blend;
          return [x/a,rad*Math.cos(t),rad*Math.sin(t)];
        });
        cylinder(worm,edge,journal,(ext+half*.15)/a,'x',sign*(half+ext*.46)/a);
        cylinder(worm,steel,journal*1.24,half*.13/a,'x',sign*half*.97/a);
      }
      const wheelPoint=(t,z)=>{
        const rad=R+(r-Math.sqrt(Math.max(.09*r*r,r*r-z*z)))-g.ded+g.depth*tooth(s.teeth*(t-Math.PI/2)/tau+.5-z*Math.tan(g.lead*Math.PI/180)/(Math.PI*g.ma));
        return [rad*Math.cos(t)/a,rad*Math.sin(t)/a,z/a];
      };
      const rim=.81*R/a;
      surface(wheel,gold,18,s.teeth*14,(tx,ty)=>wheelPoint(tx*tau,(ty*2-1)*face));
      for(const sign of [-1,1]){
        surface(wheel,gold,1,s.teeth*14,(tx,ty)=>{
          const t=tx*tau,[x,y,z]=wheelPoint(t,sign*face),rr=rim;
          return [(1-ty)*x+ty*rr*Math.cos(t),(1-ty)*y+ty*rr*Math.sin(t),z];
        });
      }
      annulus(wheel,brass,rim*1.003,.72*R/a,-face/a,face/a);
      // Web and lightening bores are visual details of the illustrative blank.
      const web=new T.Shape(),webR=.736*R/a;web.absarc(0,0,webR,0,tau,false);
      for(let h=0;h<6;h++){const ph=tau*h/6,cut=new T.Path();cut.absarc(.48*R/a*Math.cos(ph),.48*R/a*Math.sin(ph),.115*R/a,0,tau,true);web.holes.push(cut)}
      const centerHole=new T.Path();centerHole.absarc(0,0,.17*R/a,0,tau,true);web.holes.push(centerHole);
      const plate=new T.ExtrudeGeometry(web,{depth:1.35*face/a,bevelEnabled:false,curveSegments:30});plate.translate(0,0,-.675*face/a);wheel.add(new T.Mesh(plate,brass));
      annulus(wheel,gold,.285*R/a,.17*R/a,-1.4*face/a,1.4*face/a);
      annulus(wheel,edge,.175*R/a,.125*R/a,-1.48*face/a,1.48*face/a);
    }
    const p=s.arm/s.center;
    pivot.position.set(-p,1,0);worm.position.set(p,0,0);
    const axis=s.pivot==='oblique'?new T.Vector3(0,1,1).normalize():new T.Vector3(0,0,1);
    pivot.quaternion.setFromAxisAngle(axis,s.tilt*Math.PI/180);
  }
  home();
  function resize(){const w=canvas.clientWidth,h=canvas.clientHeight;if(w&&h){renderer.setSize(w,h,false);cam.aspect=w/h;cam.updateProjectionMatrix()}}
  new ResizeObserver(resize).observe(canvas);resize();
  renderer.setAnimationLoop((now)=>{
    const dt=last?Math.min((now-last)/1000,.08):0;last=now;if(!params||!visible||document.hidden)return;
    if(playing)angle+=dt*params.rpm*tau*speed/60;
    worm.rotation.x=angle;wheel.rotation.z=angle/ratio;renderer.render(scene,cam);
  });
  return {set,home,play(v){playing=v},speed(v){speed=v},visible(v){visible=v;if(v)resize()}};
}