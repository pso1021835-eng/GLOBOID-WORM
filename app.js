import { calculate,defaults } from './calc.js';
import { drawSection } from './section.js';
const $=id=>document.getElementById(id);
const configs=[
  ['inputs','center','중심거리 a (mm)',20,1000,.1],['inputs','teeth','휠 잇수',12,180,1],
  ['inputs','starts','웜 줄 수',1,10,1],['inputs','pressure','치직각 압력각 (°)',20,25,.1],
  ['operating','rpm','입력 회전수 (rpm)',1,20000,1],['operating','efficiency','가정 효율 (%)',1,100,.1],
  ['operating','service','서비스계수',1,5,.05],['tiltInputs','tilt','틸트 각도 (°)',-10,10,.01],['tiltInputs','arm','피벗 거리 (mm)',1,1000,.1]];
let s={...defaults},g,view,section=false,playing=!matchMedia('(prefers-reduced-motion: reduce)').matches,unavailable=false;
try{const saved=JSON.parse(localStorage.getItem('globoid.design.1')||'{}');for(const [,k,,lo,hi,step] of configs){if(Number.isFinite(saved[k])&&saved[k]>=lo&&saved[k]<=hi&&Math.abs((saved[k]-lo)/step-Math.round((saved[k]-lo)/step))<.00001)s[k]=saved[k]}if(['parallel','oblique'].includes(saved.pivot))s.pivot=saved.pivot;if(['std','other'].includes(saved.material))s.material=saved.material}catch{}
for(const [id,key,label,min,max,step] of configs){
  const field=document.createElement('label');field.className='field';field.textContent=label;
  const input=document.createElement('input');input.type='number';input.id=key;input.min=min;input.max=max;input.step=step;input.value=s[key];input.required=true;field.append(input);$(id).append(field);
}
$('operating').insertAdjacentHTML('beforeend','<label class="field wide">재료 조합<select id="material"><option value="std">강재 웜 · 주석청동 휠</option><option value="other">사용자 재료</option></select></label>');
$('material').value=s.material;$('pivot').value=s.pivot;
const num=(v,n=2)=>Number.isFinite(v)?v.toLocaleString('ko-KR',{minimumFractionDigits:n,maximumFractionDigits:n}):'—';
function pair(title,value){return '<div class="pair"><span>'+title+'</span><b>'+value+'</b></div>'}
function setMode(v){
  section=v||unavailable;$('scene').hidden=section;$('drawing').hidden=!section;
  $('section').setAttribute('aria-pressed',String(section));$('iso').setAttribute('aria-pressed',String(!section));
  $('play').disabled=section;$('home').disabled=section;$('playSpeed').disabled=section;
  $('modelHint').textContent=section?(unavailable?'중앙면 투영 · 3D 그래픽 사용 불가':'중앙면 투영 · 점선은 피치선'):'형상 근사 모델';
  view?.visible(!section&&!$('assemblyPanel').hidden);if(section&&g)drawSection($('drawing'),s,g);
}
function render(){
  const problem=configs.find(([,k])=>!$(k).validity.valid);
  if(problem){
    $('status').textContent=problem[2]+' 입력 범위를 확인하세요. 계산을 보류합니다.';
    for(const k of ['ratio','output','torque','geoRows','ratingRows','mount'])$(k).textContent=k==='geoRows'?'':'—';
    $('stage').style.visibility='hidden';view?.visible(false);return;
  }
  $('stage').style.visibility='';
  for(const [,k] of configs)s[k]=Number($(k).value);
  s.material=$('material').value;s.pivot=$('pivot').value;g=calculate(s);
  try{localStorage.setItem('globoid.design.1',JSON.stringify(s))}catch{}
  $('ratio').innerHTML=num(g.u,g.u%1?2:0)+' <small>: 1</small>';
  $('output').innerHTML=num(g.outRpm,2)+' <small>rpm</small>';
  $('torque').innerHTML=num(g.torque,1)+' <small>N·m</small>';
  $('status').textContent=g.issues.length?'정격 산정 보류 · '+g.issues.join(' / '):'서비스계수 '+num(s.service,2)+' · 효율 '+num(s.efficiency,0)+'% 가정 · 치면 내구성 기준 추정'+(g.speed>10?' · 고속 윤활 검토 필요':'');
  const geo=[['웜 피치지름','dʷ₁',g.dw1],['휠 피치지름','dʷ₂',g.dw2],['웜 목지름','dₐ₁',g.da1],['웜 골지름','dꜰ₁',g.df1],['권장 최소 골지름','dꜰ₁,min',g.rootMin],['휠 치폭','b₂',g.width],['웜 유효 나사 길이','b₁,eff',g.length],['축방향 모듈','mₐ',g.ma],['치직각 모듈','mₙ',g.mn],['피치점 리드각','δₘ₁',g.lead],['축방향 압력각','αₓ',g.alphaX]];
  $('geoRows').innerHTML=geo.map(([a,b,v],i)=>'<tr><td>'+a+'</td><td>'+b+'</td><td>'+num(v,3)+(i>=9?' °':' mm')+'</td></tr>').join('');
  $('ratingRows').innerHTML=pair('미끄럼속도',num(g.speed,3)+' m/s')+['기본 압력계수 Zw','감속비 보정계수 Zu','치폭·재료계수 Zm','속도계수 Zv'].map((t,i)=>pair(t,num(g.factors[i],4))).join('')+pair('치면 기준 입력 정격동력',num(g.power,3)+' kW')+pair('서비스계수 반영 출력토크',num(g.torque,1)+' N·m');
  $('mount').innerHTML=pair('작동 중심거리',num(g.actualCenter,3)+' mm')+pair('축각',num(g.shaftAngle,3)+' °');
  view?.set(s,g);setMode(section);
}
function route(){const key=['assembly','geometry','rating'].includes(location.hash.slice(1))?location.hash.slice(1):'assembly';
  for(const [id,v] of [['assemblyPanel','assembly'],['geoPanel','geometry'],['ratingPanel','rating']])$(id).hidden=v!==key;
  for(const a of document.querySelectorAll('nav a')){if(a.hash==='#'+key){a.setAttribute('aria-current','page');$('pageTitle').textContent=a.textContent}else a.removeAttribute('aria-current')}
  render();
}
document.querySelector('.fields').addEventListener('input',render);
$('reset').onclick=()=>{for(const key of Object.keys(defaults))$(key).value=defaults[key];render();view?.home()};
$('iso').onclick=()=>setMode(false);$('section').onclick=()=>setMode(true);
$('home').onclick=()=>view?.home();
function playback(){$('play').textContent=playing?'일시정지':'재생';view?.play(playing)}
$('play').onclick=()=>{playing=!playing;playback()};$('playSpeed').onchange=()=>view?.speed(Number($('playSpeed').value));
new ResizeObserver(()=>{if(section&&g)drawSection($('drawing'),s,g)}).observe($('stage'));
window.addEventListener('hashchange',route);route();playback();
try{const {makeViewer}=await import('./viewer.js');view=makeViewer($('scene'));render();playback()}catch(error){console.warn('3D 초기화',error);unavailable=true;$('iso').disabled=true;setMode(true)}
