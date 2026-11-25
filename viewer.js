import * as T from './vendor/three.js';
import { OrbitControls } from './vendor/orbit.js';
import { RoomEnvironment } from './vendor/room.js';

const tau=2*Math.PI;
import {wormRadius,wheelProfile} from './shape.js';
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
  const relief=material(0xc78665,.32);
  const steel=material(0xc6ccd2,.24),edge=material(0x949fa7,.21),gold=material(0xdca357,.30), brass=material(0xbd853c,.34);
  let pivot,worm,wheel,geometryKey='',last=0,angle=0,params,ratio=30,playing=!matchMedia('(prefers-reduced-motion: reduce)').matches,speed=.03,visible=true;
  function home(){controls.target.set(0,.22,0);cam.position.set(1.55,1.67,3.95);controls.update()}
  function detail(){controls.target.set(0,1,0);cam.position.set(.60,1.64,1.95);controls.update()}
  function set(s,g,highlight=true){
    params=s;ratio=g.u; const key=[s.center,s.teeth,s.starts,s.pressure,s.backlash,s.reliefRun,s.reliefDepth,s.shank,s.journal,s.wormAngle,s.bore,s.gearFlat,s.gearBevel,s.gearAngle].join('/');
    if(key!==geometryKey){
      stage.traverse(o=>o.geometry?.dispose());stage.clear();geometryKey=key;
      wheel=new T.Group();stage.add(wheel);pivot=new T.Group();stage.add(pivot);worm=new T.Group();pivot.add(worm);
      const a=s.center,b=g.blank;
      const stops=[-b.totalHalf,-b.bevelEnd,-b.flatEnd,-b.arcEnd,-b.half,b.half,b.arcEnd,b.flatEnd,b.bevelEnd,b.totalHalf];
      const rows=Math.max(96,s.starts*30);
      for(let j=1;j<stops.length;j++){
        const left=stops[j-1],right=stops[j],middle=Math.abs((left+right)/2);
        const relieved=middle>b.half && middle<b.bevelEnd;
        const cols=middle>=b.bevelEnd?1:Math.max(6,Math.ceil((right-left)/b.pitch*42));
        const shell=surface(worm,relieved?relief:steel,rows,cols,(u,v)=>{
          const x=left+u*(right-left),theta=v*tau,r=wormRadius(x,theta,s,g);
          return [x/a,r*Math.cos(theta)/a,r*Math.sin(theta)/a];
        });
        shell.userData.relief=relieved;
      }
      for(const sign of [-1,1]){
        const cap=new T.CircleGeometry(s.shank/(2*a),rows);
        cap.rotateY(sign*Math.PI/2);cap.translate(sign*b.totalHalf/a,0,0);
        worm.add(new T.Mesh(cap,edge));
      }
      const {zs,bands,perTooth}=wheelProfile(s,g),n=s.teeth*perTooth;
      const point=(i,j,radius)=>{
        const t=tau*i/n+Math.PI/2,r=radius/a;
        return [r*Math.cos(t),r*Math.sin(t),zs[j]/a];
      };
      surface(wheel,gold,zs.length-1,n,(u,v)=>{
        const i=Math.round(u*n),j=Math.round(v*(zs.length-1));
        return point(i,j,bands[j][i%perTooth]);
      });
      for(const j of [0,zs.length-1]){
        surface(wheel,brass,1,n,(u,v)=>{
          const i=Math.round(u*n),outer=bands[j][i%perTooth];
          return point(i,j,outer+(s.bore/2-outer)*v);
        });
      }
      if(s.bore>0)surface(wheel,brass,1,96,(u,v)=>[s.bore/(2*a)*Math.cos(u*tau),s.bore/(2*a)*Math.sin(u*tau),(2*v-1)*b.wheelHalf/a]);
    }
    for(const mesh of worm.children)if(mesh.userData.relief)mesh.material=highlight?relief:steel;
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
  return {set,home,detail,play(v){playing=v},speed(v){speed=v},visible(v){visible=v;if(v)resize()}};
}