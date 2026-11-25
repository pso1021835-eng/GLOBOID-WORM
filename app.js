import { calculate,defaults } from './calc.js?v=hindley-relief-2';
import { drawSection } from './section.js?v=hindley-relief-2';
const $=id=>document.getElementById(id);
const configs=[
  ['reliefFields','reliefRun','한쪽 전이 길이 (mm)',.01,100,.01],['reliefFields','reliefDepth','단부 반경 제거량 (mm)',.001,20,.001],
  ['blankFields','wormAngle','웜 면각 (°)',30,45,.1],['blankFields','shank','웜 축지름 (mm)',.1,500,.1],
  ['blankFields','journal','한쪽 축 돌출 (mm)',.1,1000,.1],['blankFields','backlash','축방향 백래시 (mm)',0,5,.001],
  ['blankFields','bore','휠 보어 (mm)',0,1000,.1],['blankFields','gearAngle','휠 면각 (°)',30,35,.1],
  ['blankFields','gearFlat','휠 외경 평탄 폭 (mm)',.01,50,.01],['blankFields','gearBevel','휠 면취 축방향 폭 (mm)',.01,50,.01],
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
  $('modelHint').textContent=section?(unavailable?'중앙면 투영 · 3D 그래픽 사용 불가':'중앙면 투영 · 점선은 피치선'):'Hindley 직선 생성선 · 휠 치면 수치 포락';
  $('detailView').disabled=section;
  const valid=g&&!g.blank.errors.length&&!$('stage').style.visibility;
  view?.visible(valid&&!section&&!$('assemblyPanel').hidden);if(valid&&section)drawSection($('drawing'),s,g,$('reliefColor').checked);
}
function render(){
  const problem=configs.find(([,k])=>!$(k).validity.valid);
  if(problem){
    $('status').textContent=problem[2]+' 입력 범위를 확인하세요. 계산을 보류합니다.';
    for(const k of ['ratio','output','torque','geoRows','ratingRows','mount','reliefSummary'])$(k).textContent=k==='geoRows'?'':'—';
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
  const b=g.blank;
  const geo=[
    ['웜 피치지름','dw1',g.dw1,'식 (2) 초기값'],['휠 피치지름','dw2',g.dw2,'식 (4)'],['원주피치','pt2',b.pitch,'식 (5)'],
    ['축방향 모듈','ma',g.ma,'식 (6)'],['리드각','δm1',g.lead,'식 (7)','°'],['치직각 모듈','mn',g.mn,'식 (9)'],
    ['전체 이높이','h',g.depth,'식 (10) 초기값'],['작용 이높이','hw',2*g.add,'식 (11)'],['이끝높이','ha',g.add,'식 (12)'],['이끝틈새','c',b.clear,'식 (13·14)'],['이뿌리높이','hf',g.ded,'식 (15·16)'],
    ['웜 목지름','da1',g.da1,'식 (17)'],['웜 골지름','df1',g.df1,'식 (18)'],['권장 최소 골지름','df1,min',g.rootMin,'식 (3)'],['축방향 압력각','αx',g.alphaX,'식 (19)','°'],
    ['웜 피치 이두께','smx1',.45*b.pitch-s.backlash,'§4.20 · 0.45pt2 − jx'],['휠 피치 이두께','smx2',.55*b.pitch,'§4.20 · 0.55pt2'],
    ['Hindley 기초원 지름','db',g.base,'식 (20)'],['웜 유효 나사 길이','b1eff',g.length,'식 (21) · db − 0.02a'],
    ['릴리프 시작 |x|','',b.half,'b1eff / 2'],['한쪽 릴리프 전이 길이','L',s.reliefRun,'도면 입력'],['단부 반경 제거량','Δr',s.reliefDepth,'도면 입력 · 곡선 Δr(3t²−2t³)'],
    ['웜 외경 평탄 폭','bf1',b.bf1,'식 (22·23) · pt2 / 5.5'],['웜 목부 곡률반경','rg1',b.rg1,'식 (25) 근사'],
    ['릴리프 전 블랭크 외경','',2*b.blankR,'§4.24 · 목부 원호와 입력 L로 작도'],['릴리프 후 평탄부 지름','',2*b.cutR,'블랭크 외경 − 2Δr'],['웜 치폭','b1',2*b.flatEnd,'그림 2 · 2(시작 위치 + L + bf1)'],
    ['웜 면각','',s.wormAngle,'§4.29 · 30~45° 중 선택','°'],['축 지름 / 단면 기준','',s.shank,'도면 입력'],['한쪽 축 돌출','',s.journal,'도면 입력'],['축 전체 길이','',2*b.totalHalf,'그림 2 블랭크 작도 + 양끝 축 돌출'],
    ['휠 치폭','b2',g.width,'§4.26 · df1 선택'],['휠 이뿌리 곡률반경','rf2',b.rf2,'식 (24)'],['휠 목부 곡률반경','rg2',b.rg2,'식 (26)'],
    ['휠 보어','',s.bore,'도면 입력'],['휠 외경 평탄 폭','',s.gearFlat,'그림 4 · 도면 입력'],['휠 면취 축방향 폭','',s.gearBevel,'그림 4 · 도면 입력'],['휠 면각','',s.gearAngle,'§4.28 · 30~35° 중 선택','°'],['휠 블랭크 외경','de2',b.gearOD,'그림 4 · rg2 원호와 입력 폭으로 작도']
  ];
  $('geoRows').innerHTML=geo.map(([name,sym,val,source,unit])=>'<tr><td>'+name+'</td><td>'+sym+'</td><td>'+num(val,3)+' '+(unit||'mm')+'</td><td>'+source+'</td></tr>').join('');
  $('reliefSummary').innerHTML=pair('시작 위치 (중앙면 기준)','±'+num(b.half,3)+' mm')+pair('한쪽 외경 평탄 폭',num(b.bf1,3)+' mm');
  $('ratingRows').innerHTML=pair('미끄럼속도',num(g.speed,3)+' m/s')+['기본 압력계수 Zw','감속비 보정계수 Zu','치폭·재료계수 Zm','속도계수 Zv'].map((t,i)=>pair(t,num(g.factors[i],4))).join('')+pair('치면 기준 입력 정격동력',num(g.power,3)+' kW')+pair('서비스계수 반영 출력토크',num(g.torque,1)+' N·m');
  $('mount').innerHTML=pair('작동 중심거리',num(g.actualCenter,3)+' mm')+pair('축각',num(g.shaftAngle,3)+' °');
  if(b.errors.length){$('stage').style.visibility='hidden';view?.visible(false)}else view?.set(s,g,$('reliefColor').checked);
  setMode(section);
}
function route(){const key=['assembly','geometry','rating'].includes(location.hash.slice(1))?location.hash.slice(1):'assembly';
  for(const [id,v] of [['assemblyPanel','assembly'],['geoPanel','geometry'],['ratingPanel','rating']])$(id).hidden=v!==key;
  for(const a of document.querySelectorAll('nav a')){if(a.hash==='#'+key){a.setAttribute('aria-current','page');$('pageTitle').textContent=a.textContent}else a.removeAttribute('aria-current')}
  render();
}
document.querySelector('.fields').addEventListener('input',render);
$('reset').onclick=()=>{for(const key of Object.keys(defaults))$(key).value=defaults[key];render();view?.home()};
$('iso').onclick=()=>setMode(false);$('section').onclick=()=>setMode(true);
$('detailView').onclick=()=>view?.detail();$('reliefColor').onchange=render;
$('home').onclick=()=>view?.home();
function playback(){$('play').textContent=playing?'일시정지':'재생';view?.play(playing)}
$('play').onclick=()=>{playing=!playing;playback()};$('playSpeed').onchange=()=>view?.speed(Number($('playSpeed').value));
new ResizeObserver(()=>{if(section&&g&&!g.blank.errors.length)drawSection($('drawing'),s,g)}).observe($('stage'));
window.addEventListener('hashchange',route);route();playback();
try{const {makeViewer}=await import('./viewer.js?v=hindley-relief-2');view=makeViewer($('scene'));render();playback()}catch(error){console.warn('3D 초기화',error);unavailable=true;$('iso').disabled=true;setMode(true)}
