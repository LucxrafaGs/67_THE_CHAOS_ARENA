// ===== Efeitos 3D: projéteis, explosões, fogo, partículas e itens do chão (laranjinhas, kits, caixas) =====
// Tudo é desenhado com InstancedMesh (um "molde" por tipo, centenas de cópias por quadro numa chamada só).
// Coordenadas: x = x da simulação, z = y da simulação (chão), y = altura. Nada daqui mexe na física.
const FX3D=(()=>{
let T=null,K=null,ok=false,grp=null,M=null;const protos=new Map();
const FLY=26,P=Math.PI;                                   // altura em que os tiros voam (altura da arma na mão)
let _m,_q,_e,_p,_s,_c,_c2,_W;
function init(){if(ok)return true;T=window.THREE;if(!T||!Map3D.ok)return false;K=Map3D.kit();const pt=K.patch;
  _m=new T.Matrix4();_q=new T.Quaternion();_e=new T.Euler();_p=new T.Vector3();_s=new T.Vector3();_c=new T.Color();_c2=new T.Color();_W=new T.Color(1,1,1);
  M={lit:pt(new T.MeshStandardMaterial({vertexColors:true,flatShading:true,roughness:.55,metalness:.05}),{key:'fxL',dm:.75}),
    flat:pt(new T.MeshBasicMaterial({vertexColors:true}),{key:'fxB',dm:.1}),
    add:pt(new T.MeshBasicMaterial({vertexColors:true,transparent:true,blending:T.AdditiveBlending,depthWrite:false}),{key:'fxA',dm:0}),
    glass:pt(new T.MeshStandardMaterial({vertexColors:true,flatShading:true,transparent:true,opacity:.6,roughness:.08,metalness:.1,depthWrite:false}),{key:'fxG',dm:.5}),
    shadow:pt(new T.MeshBasicMaterial({color:'#1B1033',transparent:true,opacity:.28,depthWrite:false}),{key:'fxS',dm:0}),
    fire:pt(new T.MeshStandardMaterial({vertexColors:true,flatShading:true,roughness:.9}),{key:'fxF',dm:.1,f:'gl_FragColor.rgb=mix(gl_FragColor.rgb,vColor.rgb,.6);'}),
    smoke:pt(new T.MeshStandardMaterial({vertexColors:true,flatShading:true,roughness:1}),{key:'fxK',dm:.6,f:'gl_FragColor.rgb=mix(gl_FragColor.rgb,vColor.rgb,.35);'})};
  M.add.userData.order=5;M.glass.userData.order=4;
  grp=new T.Group();grp.name='efeitos';ok=true;return true}

// ---------- moldes ----------
// geometria simples, branca (a cor vem por cópia)
function white(g){g=g.index?g.toNonIndexed():g;const n=g.attributes.position.count;g.setAttribute('color',new T.Float32BufferAttribute(new Float32Array(n*3).fill(1),3));g.computeVertexNormals();return g}
function starGeo(){const s=new T.Shape();for(let i=0;i<10;i++){const a=i/10*P*2-P/2,r=i%2?.45:1;i?s.lineTo(Math.cos(a)*r,Math.sin(a)*r):s.moveTo(Math.cos(a)*r,Math.sin(a)*r)}
  return new T.ExtrudeGeometry(s,{depth:.45,bevelEnabled:true,bevelThickness:.12,bevelSize:.1,bevelSegments:1}).translate(0,0,-.22)}
function heartGeo(){const s=new T.Shape();s.moveTo(0,-.9);s.bezierCurveTo(-1.6,.1,-.9,1.2,0,.45);s.bezierCurveTo(.9,1.2,1.6,.1,0,-.9);return new T.ExtrudeGeometry(s,{depth:.4,bevelEnabled:true,bevelThickness:.1,bevelSize:.08,bevelSegments:1,curveSegments:5}).translate(0,0,-.2)}
function plusGeo(){const s=new T.Shape(),a=.32,b=1;s.moveTo(-a,-b);s.lineTo(a,-b);s.lineTo(a,-a);s.lineTo(b,-a);s.lineTo(b,a);s.lineTo(a,a);s.lineTo(a,b);s.lineTo(-a,b);s.lineTo(-a,a);s.lineTo(-b,a);s.lineTo(-b,-a);s.lineTo(-a,-a);s.closePath();
  return new T.ExtrudeGeometry(s,{depth:.45,bevelEnabled:true,bevelThickness:.1,bevelSize:.08,bevelSegments:1}).translate(0,0,-.22)}
const SIMPLE={
  star:()=>[starGeo(),'lit'],heart:()=>[heartGeo(),'lit'],plus:()=>[plusGeo(),'lit'],
  smoke:()=>[new T.IcosahedronGeometry(1,1),'smoke'],fire:()=>[new T.IcosahedronGeometry(1,0),'fire'],debris:()=>[new T.DodecahedronGeometry(1,0),'lit'],
  dot:()=>[new T.IcosahedronGeometry(1,0),'add'],glow:()=>[new T.IcosahedronGeometry(1,1),'add'],core:()=>[new T.IcosahedronGeometry(1,1),'flat'],
  ring:()=>[new T.TorusGeometry(1,.025,4,32).rotateX(P/2),'add'],disc:()=>[new T.CircleGeometry(1,24).rotateX(-P/2),'add'],
  shard:()=>[new T.OctahedronGeometry(1,0).scale(.32,1,.32),'lit'],brick:()=>[new T.BoxGeometry(1,.6,.55),'lit'],
  streak:()=>[new T.BoxGeometry(1,.16,.16).translate(-.5,0,0),'add'],seg:()=>[new T.BoxGeometry(1,1,1).translate(.5,0,0),'add'],
  cube:()=>[new T.BoxGeometry(1,1,1),'lit'],
  shadow:()=>[new T.CircleGeometry(1,16).rotateX(-P/2),'shadow']};
// modelos low poly dos projéteis e itens (feitos com o mesmo kit das armas). Tamanho ~ raio 10 (igual ao desenho antigo).
const WH='#FFFFFF',DK='#2A2440',MT='#9AA3B3',RD='#E8443A',OR='#FF8A1F',YL='#FFC531',GR='#3DBE6C',WD='#8B5A2B';
const MODELS={
  bullet(k){k.tube(-6,3,0,0,2.3,WH,{n:7});k.cone(3,0,0,2.3,4.5,WH,{n:7})},
  pellet(k){k.ball(0,0,0,3.6,WH,{det:0})},
  spark(k){k.at(starGeo().scale(6,6,6),0,0,0,WH,{r:[-P/2,0,0]})},
  rocket(k){k.tube(-12,6,0,0,4.2,'#F2F2F2',{n:8});k.cone(6,0,0,4.2,8,RD,{n:8});for(const a of [0,P/2,P,P*1.5])k.blk(-10,Math.cos(a)*5,Math.sin(a)*5,6,Math.abs(Math.cos(a))*4+1,Math.abs(Math.sin(a))*4+1,RD);
    k.at(new T.ConeGeometry(3.4,8,7).translate(0,4,0),-12,0,0,'#FFC531',{m:'emit',r:[0,0,P/2]})},
  rpg(k){k.tube(-12,4,0,0,3.2,'#6B7A5A',{n:8});k.at(new T.SphereGeometry(5,8,6).scale(1.5,1,1),7,0,0,'#FF7A1A');k.cone(13,0,0,2.5,4,'#3A3A46',{n:6});
    for(const a of [0,P/2,P,P*1.5])k.blk(-11,Math.cos(a)*4.4,Math.sin(a)*4.4,5,Math.abs(Math.cos(a))*3.4+1,Math.abs(Math.sin(a))*3.4+1,'#3A3A46');k.at(new T.ConeGeometry(2.8,7,7).translate(0,3.5,0),-12,0,0,'#FFC531',{m:'emit',r:[0,0,P/2]})},
  bigrocket(k){k.tube(-16,8,0,0,6.5,YL,{n:10});for(const x of [-12,-4,4])k.ring(x,0,0,6.6,1.2,DK,{r:[0,P/2,0],n:12});k.cone(8,0,0,6.5,11,RD,{n:10});
    for(const a of [0,P/2,P,P*1.5])k.blk(-13,Math.cos(a)*7.5,Math.sin(a)*7.5,8,Math.abs(Math.cos(a))*6+1,Math.abs(Math.sin(a))*6+1,DK);k.at(new T.ConeGeometry(5,11,8).translate(0,5.5,0),-16,0,0,'#FFE066',{m:'emit',r:[0,0,P/2]})},
  chicken(k){k.ball(0,0,0,7.5,WH,{s:[1.25,1,1]});k.ball(6,6,0,4.4,WH);k.cone(9.6,6,0,1.6,3.4,'#FFB020',{n:5});k.blk(5.6,10.6,0,3.4,3,1.4,RD);k.blk(9.2,3.6,0,1.4,2.6,1.2,RD);
    for(const s of [1,-1]){k.box(-1,1.5,s*7,9,5,2,'#F0EEEA',{r:[s*.3,0,0]});k.ball(7.6,7.4,s*2.6,.9,DK,{det:0});k.tubeY(-1,-9,-5,s*3,.8,'#FFB020')}},
  carrot(k){k.cone(-10,0,0,4.2,20,OR,{n:7});for(const z of [-1.6,1.6])k.at(new T.ConeGeometry(2.2,8,5).translate(0,4,0),-10,0,z,GR,{r:[0,z*.3,P/2+z*.2]})},
  plunger(k){k.tube(-14,4,0,0,1.3,'#B98454',{n:6});k.at(new T.ConeGeometry(6,7,10).translate(0,3.5,0),11,0,0,RD,{r:[0,0,P/2]})},
  ice(k){k.at(new T.OctahedronGeometry(6,0),0,0,0,'#BFF1FF',{m:'glass',s:[2.1,.8,.8]});k.at(new T.OctahedronGeometry(2.4,0),0,0,0,'#FFFFFF',{m:'emit',s:[2,1,1]})},
  cork(k){k.tube(-5,5,0,0,3.6,'#E8C07A',{r2:4.4,n:9});k.ring(-1,0,0,4,.5,'#B8904A',{r:[0,P/2,0],n:10})},
  staple(k){for(const z of [-4,4])k.blk(0,1,z,12,1.8,1.8,MT);k.blk(-6,1,0,1.8,1.8,9.8,MT)},
  bee(k){k.ball(0,0,0,5.6,YL,{s:[1.4,1,1]});for(const x of [-2.5,2])k.ring(x,0,0,5.3,1.2,DK,{r:[0,P/2,0],n:10});k.cone(-7.5,0,0,1.6,-3.5,DK,{n:5});k.ball(6.5,1,0,3.4,DK);
    for(const s of [1,-1])k.box(0,6.4,s*3.6,6,.9,5,'#FFFFFF',{m:'glass',r:[s*.5,0,0]})},
  bubble(k){k.ball(0,0,0,9,'#FF9FD5',{m:'glass',det:2});k.ball(-3,3.5,3,2.2,WH,{m:'emit',det:0})},
  soap(k){k.ball(0,0,0,10,'#C9F0FF',{m:'glass',det:2});k.ring(0,0,0,10,.35,'#FF9BD5',{m:'emit',r:[P/2,0,.4],n:20});k.ball(-3.5,4,3.5,2.4,WH,{m:'emit',det:0})},
  seed(k){k.ball(0,0,0,3.6,'#3A2414',{s:[1.5,1,1],det:0})},
  popcorn(k){k.ball(0,0,0,4,'#FFF4D6',{det:0});k.ball(3,2,2,3.4,'#FFF0C8',{det:0});k.ball(-2.4,3,-2,3.2,'#FFF4D6',{det:0});k.ball(1,-2,-3,3,'#FFE7A8',{det:0})},
  honey(k){k.ball(0,0,0,7,'#F5B014',{s:[1.1,.95,1]});k.at(new T.ConeGeometry(2.6,6,6).translate(0,-3,0).rotateX(P),0,-5,0,'#F5B014',{});k.ball(-2.4,3,3,1.6,'#FFF0A0',{m:'emit',det:0})},
  melon(k){k.ball(0,0,0,10,'#3D9A3A',{s:[1.25,1,1],det:1});for(const a of [0,P/3,P*2/3])k.ring(0,0,0,10.05,1.1,'#1F5E2A',{r:[a,0,0],s:[1.25,1,1],n:18})},
  pumpkin(k){k.ball(0,0,0,9.4,'#FF8A1F',{s:[1,.8,1],det:1});for(const a of [0,P/3,P*2/3])k.ring(0,0,0,9.5,1,'#D9661A',{r:[0,a,0],s:[1,.8,1],n:18});k.tubeY(0,6,11,0,1.6,'#5E7A2E');
    k.ball(-3,1,8,1.4,DK,{det:0});k.ball(3,1,8,1.4,DK,{det:0})},
  anvil(k){k.box(0,-4,0,18,6,10,'#4A4F5C');k.box(0,2,0,8,6,7,'#3E434F');k.box(2,8,0,24,6,10,'#5B6170');k.cone(14,8,0,3,8,'#5B6170',{n:6})},
  fork(k){k.box(-8,0,0,15,1.8,3,MT);k.box(1,0,0,4,1.8,8,MT);for(const z of [-3,-1,1,3])k.blk(7,1,z,10,1.4,1.2,'#C9CED8')},
  pizza(k){k.at(new T.CylinderGeometry(13,13,2.4,8,1,false,P/2-P/6,P/3),-6,0,0,'#D9963A');k.at(new T.CylinderGeometry(12,12,1,8,1,false,P/2-P/6,P/3),-6,1.6,0,'#FFC94A');
    for(const [x,z] of [[0,-1.5],[3,1.8],[-2,2]])k.at(new T.CylinderGeometry(1.7,1.7,.8,8),x,2.3,z,'#D9483F')},
  banana(k){k.at(new T.TorusGeometry(9,2.6,5,10,P*.75),0,-4,0,'#FFE066',{r:[0,0,P*.125]});k.ball(-8.4,-.8,0,1.4,'#5E3B22',{det:0});k.ball(8.4,-.8,0,1.4,'#5E3B22',{det:0})},
  pick(k){k.box(-3,0,0,18,2.4,2.4,WD);k.at(new T.TorusGeometry(7,1.4,4,10,P*.9),6,-6,0,'#8A93A6',{r:[0,0,P*.05]})},
  slipper(k){k.box(0,0,0,20,3,9,'#45D4FF',{ch:1.2});k.box(4,3,0,4,2.6,10,'#FF4F9A',{ch:.8});k.box(-1,-1,0,20.4,1.2,9.4,'#2E8FBF',{ch:.4})},
  snowball(k){k.ball(0,0,0,8.5,'#FFFFFF',{det:1});k.ball(4,3,3,3,'#EAF6FF',{det:0});k.ball(-3,-2,4,2.6,'#EAF6FF',{det:0})},
  duck(k){k.ball(0,0,0,7,'#FFE066',{s:[1.3,.9,1]});k.ball(5.4,6,0,4.6,'#FFE066');k.box(9.8,5.6,0,3.6,1.8,3.4,OR,{ch:.5});k.box(-8,2.5,0,4,3,4,'#FFE066',{r:[0,0,.6]});
    for(const s of [1,-1])k.ball(7,7.6,s*2.8,.9,DK,{det:0})},
  egg(k){k.ball(0,0,0,6,'#FFF4E0',{s:[1,1.3,1],det:1});k.ball(-2,3,3,1.4,'#FFFFFF',{m:'emit',det:0})},
  clock(k){k.tubeZ(0,0,-3,3,8.5,RD,{n:14});k.at(new T.CircleGeometry(7,14),0,0,3.05,'#FFF4E0',{m:'emit'});k.blk(0,3.5,3.3,1,5,.4,DK);k.blk(1.6,.6,3.3,3.6,1,.4,DK);
    for(const s of [1,-1]){k.ball(s*5.5,8.5,0,3,YL);k.tubeY(s*5,-11,-7,0,.8,DK)}},
  coconut(k){k.ball(0,0,0,8,'#6B4129',{det:0});for(const [y,z] of [[2,6.6],[2,-6.6]])k.ball(3,y,z*.3,1.3,'#2A1A12',{det:0});k.ball(4.4,-1,0,1.3,'#2A1A12',{det:0})},
  candy(k){k.ball(0,0,0,6,'#FF4F9A',{det:1});k.ring(0,0,0,6.05,1.2,'#FFFFFF',{r:[0,P/2,.6],n:14});k.at(new T.ConeGeometry(4,5,6).translate(0,2.5,0),11,0,0,'#FFB3D9',{r:[0,0,P/2]});k.at(new T.ConeGeometry(4,5,6).translate(0,2.5,0),-11,0,0,'#FFB3D9',{r:[0,0,-P/2]})},
  corn(k){k.ball(0,0,0,5,'#FFD23A',{s:[2,1,1],det:1});for(const z of [-2.6,2.6])k.at(new T.ConeGeometry(3,12,5).translate(0,6,0),-9,0,z,'#7FB24A',{r:[0,0,-P/2-.15],s:[1,1,.5]})},
  mine(k){k.ball(0,0,0,8,OR,{s:[1,.8,1],det:1});for(let i=0;i<6;i++){const a=i/6*P*2;k.at(new T.ConeGeometry(1.6,4,5).translate(0,2,0),Math.cos(a)*7.6,0,Math.sin(a)*7.6,'#5E3B22',{r:[0,-a,-P/2]})}
    k.ball(0,6.4,0,2.2,'#FF3B47',{m:'emit',det:0});k.at(new T.SphereGeometry(3,6,4).scale(1,.35,.6),2,7,0,GR)},
  megabomb(k){k.ball(0,0,0,11,'#2A2440',{det:1});k.ball(-4,5,6,2.4,'#5A5470',{det:0});k.tubeY(0,9,15,0,2.4,'#5B6170');k.tubeY(0,14,19,0,.9,'#C9A06A');k.at(starGeo().scale(3,3,3),0,20,0,'#FFE066',{m:'emit'});
    k.at(new T.CircleGeometry(4,12),0,0,11.05,YL,{m:'emit'})},
  door(k){k.box(0,0,0,12,20,2,'#B5703A',{ch:.6});k.box(0,4,1.2,8,6,.6,'#9A5C2E',{ch:.2});k.box(0,-4,1.2,8,6,.6,'#9A5C2E',{ch:.2});k.ball(4,0,1.6,1.1,YL,{det:0})},
  box(k){k.box(0,0,0,15,12,15,'#C9A06A',{ch:.8});k.blk(0,0,0,3.4,12.3,15.3,'#E8D3A8');k.blk(0,6.1,0,15.3,.4,3.4,'#E8D3A8')},
  timeorb(k){k.ball(0,0,0,11,'#C9E8FF',{m:'glass',det:2});k.blk(0,2.5,0,1,6,1,'#FFFFFF',{m:'emit'});k.blk(1.6,0,0,3.6,1,1,'#FFFFFF',{m:'emit'});k.ring(0,0,0,11,.4,'#FFFFFF',{m:'emit',r:[P/2,0,0],n:22})},
  jelly(k){k.ball(0,0,0,10,'#B777FF',{m:'glass',det:1});k.ball(0,-1,0,5,'#E2C9FF',{det:0});k.ball(-3.5,4,4,2,'#FFFFFF',{m:'emit',det:0})},
  portal(k){k.ring(0,0,0,9,2.4,'#A16CFF',{m:'emit',r:[P/2,0,0],n:18});k.at(new T.CircleGeometry(8,16).rotateX(-P/2),0,.2,0,'#E3D2FF',{m:'add'});k.ring(0,0,0,5,1,'#45D4FF',{m:'emit',r:[P/2,0,0],n:14})},
  wave(k){k.at(new T.TorusGeometry(10,1.8,4,16,1.9),-6,0,0,'#45D4FF',{m:'emit',r:[P/2,0,-.95]})},
  holeorb(k){k.ball(0,0,0,9,'#05030C',{det:1});k.ring(0,0,0,12,1.2,'#8E5BFF',{m:'emit',r:[P/2-.35,0,0],n:22})},
  // itens do chão e coisas grandes
  orange(k){k.ball(0,0,0,9,OR,{s:[1,.92,1],det:1});k.ball(-3,3,5,2.4,'#FFC07A',{det:0});k.tubeY(0,7.6,10,0,.9,'#5E3B22');k.at(new T.SphereGeometry(3.6,6,4).scale(1.3,.3,.7),3,10,0,GR,{r:[0,.4,.3]})},
  medkit(k){k.box(0,0,0,24,15,17,'#FFFFFF',{ch:2.4});k.box(0,7.6,0,13,1.2,4,RD,{ch:.3});k.box(0,7.6,0,4,1.2,13,RD,{ch:.3});k.box(0,0,8.6,4,9,1,RD,{ch:.3});k.box(0,0,8.6,9,4,1,RD,{ch:.3});
    k.box(0,10,0,9,3,3,'#D9D2E6',{ch:.6})},
  crate(k){k.box(0,0,0,24,20,24,'#C98B4E',{ch:1.4});for(const [x,z,w,d] of [[0,12,25,2],[0,-12,25,2],[12,0,2,25],[-12,0,2,25]])k.blk(x,10.2,z,w,1.6,d,'#8B5A2B');
    for(const y of [-8,8])for(const [x,z,w,d] of [[0,12.2,25,1.6],[12.2,0,1.6,25]])k.blk(x,y+.8,z,w,1.6,d,'#8B5A2B');k.at(new T.CircleGeometry(5,4),0,0,12.3,YL,{m:'emit',r:[0,0,P/4]})},
  meteor(k){k.at(new T.DodecahedronGeometry(14,0),0,0,0,'#7A4A2E',{jit:.12});for(let i=0;i<5;i++){const a=i*1.3;k.ball(Math.cos(a)*11,Math.sin(a*1.7)*8,Math.sin(a)*11,3,'#FF7A1A',{m:'emit',det:0})}},
  stamp(k){k.box(0,0,0,30,9,18,RD,{ch:2});k.box(0,-5,0,32,2,20,'#B8342C',{ch:.6});k.tubeY(0,4,18,0,3,WD);k.ball(0,21,0,5.4,WD)},
  generic(k){k.ball(0,0,0,7,WH,{det:1})}};
// tipos cujo modelo tem cor própria (os outros são brancos e ganham a cor da arma)
const TINT={bullet:1,pellet:1,spark:1,generic:1};
function mk(key){let P0;
  if(SIMPLE[key]){const [g,m]=SIMPLE[key]();P0={parts:[{geo:white(g),mat:M[m]}],tint:true}}
  else if(key.startsWith('txt:'))P0=textProto(key.slice(4));
  else{const fn=MODELS[key];if(!fn)return null;const B=K.makeBuilder(key.length*977+13),k=Guns3D.kit(B),tmp=new T.Group();
    try{fn(k)}catch(e){console.warn('modelo 3D',key,e)}
    B.build({std:M.lit,emit:M.flat,glass:M.glass,add:M.add},tmp);const parts=[];
    tmp.children.forEach(o=>{o.updateMatrix();o.geometry.applyMatrix4(o.matrix);parts.push({geo:o.geometry,mat:o.material})});P0={parts,tint:!!TINT[key]}}
  const cap=key==='shadow'?600:SIMPLE[key]?500:220;P0.cap=cap;P0.n=0;
  P0.im=P0.parts.map(({geo,mat})=>{const im=new T.InstancedMesh(geo,mat,cap);im.instanceMatrix.setUsage(T.DynamicDrawUsage);
    if(P0.tint){im.instanceColor=new T.InstancedBufferAttribute(new Float32Array(cap*3),3);im.instanceColor.setUsage(T.DynamicDrawUsage)}
    im.count=0;im.frustumCulled=false;if(mat.userData.order)im.renderOrder=mat.userData.order;if(mat===M.shadow)im.renderOrder=1;grp.add(im);return im});
  protos.set(key,P0);return P0}
// letreiro dos tiros de texto (NÃO, SIM, PEW, 6, 7): plaquinha em pé virada para a câmera
function textProto(txt){const cv=document.createElement('canvas');cv.width=160;cv.height=96;const c=cv.getContext('2d'),g=GUNS.find(x=>x.txt===txt||(x.calc&&(txt==='6'||txt==='7')));
  c.font=`900 ${txt.length>2?52:70}px "Lilita One",sans-serif`;c.textAlign='center';c.textBaseline='middle';c.lineJoin='round';c.lineWidth=14;c.strokeStyle=INK;c.strokeText(txt,80,52);c.fillStyle=(g&&g.col)||'#FFC531';c.fillText(txt,80,52);
  const t=new T.CanvasTexture(cv);t.colorSpace=T.SRGBColorSpace;const mat=K.patch(new T.MeshBasicMaterial({map:t,transparent:true,alphaTest:.3,side:T.DoubleSide}),{key:'fxT',dm:.2});
  return{parts:[{geo:new T.PlaneGeometry(32,19.2),mat}],tint:false}}
function put(key,x,h,z,ry,rx,rz,sx,sy,sz,col){const P0=protos.get(key)||mk(key);if(!P0||P0.n>=P0.cap)return;
  if(sx==null)sx=1; // sem escala a matriz vira NaN e o modelo some (a sombra, desenhada à parte, continua)
  _e.set(rx||0,ry||0,rz||0,'YXZ');_q.setFromEuler(_e);_m.compose(_p.set(x,h,z),_q,_s.set(sx,sy==null?sx:sy,sz==null?sx:sz));
  for(const im of P0.im){im.setMatrixAt(P0.n,_m);if(P0.tint)im.setColorAt(P0.n,col||_W)}P0.n++}
function begin(){for(const P0 of protos.values())P0.n=0}
function end(){for(const P0 of protos.values())for(const im of P0.im){im.count=P0.n;if(P0.n){im.instanceMatrix.needsUpdate=true;if(im.instanceColor)im.instanceColor.needsUpdate=true}}}

// ---------- partículas ----------
const parts=[];const cap=()=>(S.particles==='low'?220:S.particles==='mid'?500:900)*(isTouch?.5:1);
const FIRE=['#FFF7C2','#FFD23A','#FF8A1F','#E8443A','#9A8CA8','#C9C0D6'].map(h=>[parseInt(h.slice(1,3),16)/255,parseInt(h.slice(3,5),16)/255,parseInt(h.slice(5,7),16)/255]);
function part(o){if(parts.length>=cap())return null;const p=Object.assign({k:'star',x:0,y:0,h:12,vx:0,vy:0,vh:0,g:0,drag:2,life:.6,size:6,bounce:0,rx:Math.random()*6,ry:Math.random()*6,rz:0,vrx:0,vry:0,vrz:0,col:'#ffffff',grow:0},o);
  p.max=p.life;p.c=colOf(p.col);parts.push(p);return p}
// cores reaproveitadas (sem criar um objeto novo por partícula: menos coleta de lixo = menos engasgos)
const colC=new Map();function colOf(h){let c=colC.get(h);if(!c){c=new (T||window.THREE).Color(h);if(colC.size<400)colC.set(h,c)}return c}
const rnd=(a,b)=>a+Math.random()*(b-a);
// estrelinhas/bolinhas que pulam do chão e quicam
function burst(x,y,h,n,cols,k='star',spd=180,size=6,life=.6){if(S.particles==='low')n=Math.ceil(n/3);for(let i=0;i<n;i++){const a=Math.random()*P*2,s=spd*rnd(.4,1);
  part({k,x,y,h,vx:Math.cos(a)*s,vy:Math.sin(a)*s*.8,vh:rnd(.5,1.2)*spd*.8,g:k==='dot'?260:620,bounce:k==='dot'?0:.45,drag:2.4,size:size*rnd(.6,1.2),life:life*rnd(.8,1.3),col:Array.isArray(cols)?pick(cols):cols,vrx:rnd(-9,9),vry:rnd(-9,9)})}}
function flash(x,y,h,size,col,life=.1){part({k:'glow',x,y,h,size,col,life,drag:0})}
function ring(x,y,r,col,life=.4,h=2){part({k:'ring',x,y,h,size:r,col,life,drag:0,rx:0,ry:0})}
function smoke(x,y,h,size,n=1,col='#E9E2F7',life=.9,up=30){for(let i=0;i<n;i++)part({k:'smoke',x:x+rnd(-6,6),y:y+rnd(-6,6),h,vx:rnd(-25,25),vy:rnd(-25,25),vh:up*rnd(.6,1.4),drag:1.8,size:size*rnd(.75,1.25),life:life*rnd(.8,1.25),col,vrx:rnd(-2,2),vry:rnd(-2,2)})}
function fire(x,y,h,size,vh=60,life=.55){return part({k:'fire',x:x+rnd(-3,3),y:y+rnd(-3,3),h,vx:rnd(-14,14),vy:rnd(-14,14),vh:vh*rnd(.7,1.3),drag:2,size:size*rnd(.8,1.2),life:life*rnd(.8,1.2),ramp:1,vrx:rnd(-4,4),vry:rnd(-4,4)})}
// explosão de desenho animado: clarão, bolas de fogo low poly que sobem e viram fumaça, onda de choque no chão e pedacinhos voando
function boom(x,y,r,gold){const lo=S.particles==='low',big=r>150;
  flash(x,y,18,r*.75,gold?'#FFE9A0':'#FFF3C4',.16);part({k:'core',x,y,h:14,size:r*.38,life:.14,drag:0,col:'#FFFBEA'});
  ring(x,y,r*1.2,gold?'#B88A10':'#A08060',.42);ring(x,y,r*.75,'#8A4A10',.3,4);
  const nf=lo?5:big?16:10;for(let i=0;i<nf;i++){const a=Math.random()*P*2,d=Math.random()*r*.42;
    part({k:'fire',x:x+Math.cos(a)*d,y:y+Math.sin(a)*d,h:rnd(6,r*.25),vx:Math.cos(a)*rnd(20,90),vy:Math.sin(a)*rnd(20,90),vh:rnd(40,150),drag:2.6,size:r*rnd(.16,.26),life:rnd(.45,.85),ramp:1,col:gold?'#FFE066':'#FFFFFF',vrx:rnd(-3,3),vry:rnd(-3,3),grow:1})}
  smoke(x,y,r*.2,r*.15,lo?2:big?9:6,'#E4DCF2',1.2,70);
  if(!lo)for(let i=0;i<(big?12:7);i++){const a=Math.random()*P*2,s=rnd(120,320)*(big?1.4:1);part({k:'debris',x,y,h:10,vx:Math.cos(a)*s,vy:Math.sin(a)*s,vh:rnd(120,300),g:700,bounce:.35,drag:1.4,size:rnd(2.4,4.4)*(big?1.5:1),life:rnd(.8,1.3),col:pick(['#3A3048','#5A4A60','#2A2440']),vrx:rnd(-12,12),vry:rnd(-12,12)})}
  burst(x,y,14,8,gold?['#FFC531','#FFE066','#FFFFFF']:['#FFC531','#FF7A1A','#FF4F9A'],'star',300,6.5,.8)}
// raio em zigue-zague entre pontos (Tesla)
const bolts=[];function bolt(pts,col='#FFF066',life=.3){bolts.push({pts,col:new T.Color(col),life,max:life})}
// converte as partículas antigas (2D) para 3D: mesmas chamadas, agora no chão de verdade
function from2D(o){if(!init())return;const t=o.type,h=o.h;
  switch(t){
    case 'star':case 'shard':return part({k:t,x:o.x,y:o.y,h:h??14,vx:o.vx,vy:o.vy*.8,vh:Math.hypot(o.vx,o.vy)*rnd(.5,1)+60,g:620,bounce:.4,drag:o.drag||2,size:o.size,life:o.life*1.2,col:o.col,vrx:rnd(-9,9),vry:rnd(-9,9)});
    case 'dot':return part({k:'dot',x:o.x,y:o.y,h:h??14,vx:o.vx,vy:o.vy,vh:rnd(10,60),g:120,drag:o.drag||2,size:o.size*.6,life:o.life,col:o.col});
    case 'smoke':return part({k:'smoke',x:o.x,y:o.y,h:h??8,vx:o.vx,vy:o.vy>0?o.vy:0,vh:o.vy<0?-o.vy+10:22,drag:o.drag||1.5,size:o.size*.7,life:o.life,col:o.col,vrx:rnd(-2,2),vry:rnd(-2,2)});
    case 'ring':return ring(o.x,o.y,o.size,o.col,o.life,h??2);
    case 'flash':return flash(o.x,o.y,h??FLY,o.size*.75,o.col,o.life);
    case 'brick':return part({k:'brick',x:o.x,y:o.y,h:h??10,vx:o.vx,vy:o.vy>0?o.vy:o.vy*.3,vh:o.vy<0?-o.vy+80:rnd(80,200),g:700,bounce:.35,drag:o.drag||1,size:o.size*.9,life:o.life*1.3,col:o.col,vrx:rnd(-9,9),vry:rnd(-9,9)});
    case 'heart':return part({k:o.txt==='+'?'plus':'heart',x:o.x,y:o.y,h:h??16,vh:-(o.vy||-80),drag:o.drag||1,size:o.size*.9,life:o.life,col:o.col,rx:0,ry:0,vry:rnd(-3,3)});
    case 'line':return part({k:'streak',x:o.x,y:o.y,h:h??10,vx:o.vx,vy:o.vy,drag:o.drag||3,size:o.size,life:o.life,col:o.col,line:1});
    case 'boom':return boom(o.x,o.y,o.size/.9,o.col==='#FFC531');
    case 'spiral':return part({k:'ring',x:o.x,y:o.y,h:4,vh:70,drag:0,size:o.size*.8,life:o.life,col:o.col,spiral:1});
    case 'bolt':return bolt(o.pts,o.col,o.life)}}
function clear(){parts.length=0;bolts.length=0}

// ---------- quadro ----------
function tickParts(dt){for(let i=parts.length-1;i>=0;i--){const p=parts[i];p.life-=dt;if(p.life<=0){parts.splice(i,1);continue}
  const d=Math.exp(-p.drag*dt);p.vx*=d;p.vy*=d;if(!p.g)p.vh*=d;p.vh-=p.g*dt;p.x+=p.vx*dt;p.y+=p.vy*dt;p.h+=p.vh*dt;
  if(p.h<0){if(p.bounce&&p.vh<-40){p.h=0;p.vh=-p.vh*p.bounce;p.vx*=.6;p.vy*=.6;p.vrx*=.6;p.vry*=.6}else{p.h=0;p.vh=0;p.vrx*=.9;p.vry*=.9}}
  p.rx+=p.vrx*dt;p.ry+=p.vry*dt;p.rz+=p.vrz*dt}}
function drawParts(){for(const p of parts){const k=p.life/p.max,a=1-k;let s=p.size,col=_c.copy(p.c);
  switch(p.k){
    case 'star':case 'shard':case 'heart':case 'plus':case 'brick':case 'debris':s*=Math.min(1,a*10)*Math.min(1,k*4);break;
    case 'smoke':s*=(.55+a*.9)*Math.min(1,k*2.6);break;
    case 'fire':{s*=(p.grow?.55+a*1.1:.6+a*.6)*Math.min(1,k*2.2);const f=Math.min(.999,a*1.15)*(FIRE.length-1),i=Math.floor(f),q=f-i,A0=FIRE[i],B0=FIRE[i+1];
      col.setRGB(A0[0]+(B0[0]-A0[0])*q,A0[1]+(B0[1]-A0[1])*q,A0[2]+(B0[2]-A0[2])*q).multiply(p.c);break}
    case 'glow':s*=Math.sqrt(k)*1.1;col.multiplyScalar(Math.min(1,k*1.6));break;
    case 'core':s*=.6+a*.8;break;
    case 'dot':s*=k;col.multiplyScalar(Math.min(1,k*2));break;
    case 'ring':s*=p.spiral?(.4+a*.5):(.15+a*.95);col.multiplyScalar(k);break}
  if(p.k==='streak'){const sp=Math.hypot(p.vx,p.vy);if(sp<1)continue;put('streak',p.x,p.h,p.y,-Math.atan2(p.vy,p.vx),0,0,Math.max(4,sp*.07),p.size*.5,p.size*.5,col.multiplyScalar(Math.min(1,k*1.5)));continue}
  if(p.k==='ring')put('ring',p.x,p.h,p.y,p.spiral?p.ry*3:0,0,0,s,p.spiral?3:1,s,col);
  else if(p.k==='heart'||p.k==='plus')put(p.k,p.x,p.h,p.y,p.ry,0,0,s,s/.643,s,col);
  else put(p.k,p.x,p.h,p.y,p.ry,p.rx,p.rz,s,s,s,col)}
  for(let i=bolts.length-1;i>=0;i--){const b=bolts[i];b.life-=1/60;if(b.life<=0){bolts.splice(i,1);continue}const k=b.life/b.max;const c=_c.copy(b.col).multiplyScalar(k);let px=null;
    for(let j=1;j<b.pts.length;j++){const [ax,ay]=b.pts[j-1],[bx,by]=b.pts[j];for(let q=0;q<=5;q++){const f=q/5,x=ax+(bx-ax)*f+(q&&q<5?rnd(-16,16):0),y=ay+(by-ay)*f+(q&&q<5?rnd(-16,16):0),h=FLY+(q&&q<5?rnd(-10,10):0);
      if(px){const dx=x-px[0],dy=y-px[1],dh=h-px[2],L=Math.hypot(dx,dy,dh);put('seg',px[0],px[2],px[1],-Math.atan2(dy,dx),0,Math.atan2(dh,Math.hypot(dx,dy)),L,1.6+2*k,1.6+2*k,c)}px=[x,y,h]}}}}
// projéteis
const ORIENT={bullet:1,tracer:1,beam:1,bolt:1,wave:1,rocket:1,rpg:1,bigrocket:1,carrot:1,plunger:1,ice:1,cork:1,staple:1,bee:1,seed:1,corn:1,fork:1,chicken:1,pick:1,banana:1};
const hsl=new Map();
function drawBullets(list,t){const ts=t/1000;
  for(const b of list){const g=GUNS[b.g]||GUNS[0],sp=Math.hypot(b.vx,b.vy),yaw=-Math.atan2(b.vy,b.vx),s=Math.max(.6,b.r/9)*1.12;
    const fly=!b.stick&&!g.mine&&sp>20,h=g.mine?b.r*.55:fly?FLY:b.stick?FLY*.7:b.r*.7;let pk=g.p;
    const col=g.rainbow?_c2.setHSL(((t/3+b.id*40)%360)/360,1,.62):_c2.set(g.col||'#FFFFFF');
    if(fly)put('shadow',b.x,.5,b.y,0,0,0,Math.max(4,b.r*.85));
    switch(pk){
      case 'text':{let txt=g.txt;if(g.calc)txt=b.six?'6':'7';const w=1+Math.sin(t/60+b.id)*.08;put('txt:'+txt,b.x,h+4,b.y,0,0,Math.sin(t/60+b.id)*.15,(g.calc?.85:txt==='PEW'?.6:1)*w,(g.calc?.85:txt==='PEW'?.6:1)*w/.643,1);continue}
      case 'tracer':put('streak',b.x,h,b.y,yaw,0,0,90,7,7,col);put('streak',b.x,h,b.y,yaw,0,0,70,3,3,_c.set(1,1,1));put('glow',b.x,h,b.y,0,0,0,5,5,5,col);continue;
      case 'beam':put('streak',b.x,h,b.y,yaw,0,0,50,12,12,_c.copy(col).multiplyScalar(.55));put('streak',b.x,h,b.y,yaw,0,0,46,4.5,4.5,_c.copy(col).lerp(_c2.set(1,1,1),.5));put('glow',b.x,h,b.y,0,0,0,7,7,7,col);continue;
      case 'bolt':put('glow',b.x,h,b.y,0,0,0,7,7,7,_c.set('#FFF066'));for(let i=0;i<3;i++)put('streak',b.x,h+rnd(-3,3),b.y,yaw+rnd(-.5,.5),0,0,rnd(14,26),2.4,2.4,_c.set('#FFF066'));continue;
      case 'flame':{const k=b.life/(g.life||.42);put('fire',b.x,h-4+(1-k)*8,b.y,ts*3+b.id,ts*2,0,b.r*(1.25-k*.55)*.85,null,null,_c.setRGB(1,k>.6?.9:k>.3?.55:.3,k>.6?.4:.12));
        if(Math.random()<.25)fire(b.x,b.y,h,b.r*.5,40,.35);continue}
      case 'confetti':put('cube',b.x,h,b.y,ts*8+b.id,ts*11+b.id,0,9,1.4,6,_c.set(['#FFC531','#FF4F9A','#45D4FF','#6CF06A'][b.id%4]));continue;
      case 'note':put('dot',b.x,h,b.y,0,0,0,6,6,6,col);put('star',b.x,h+Math.sin(t/90+b.id)*3,b.y,ts*4,0,0,4.5,4.5,4.5,col);continue;
      case 'portal':put('portal',b.x,h,b.y,ts*9,0,0,s);continue;
      case 'wave':{const k=1-b.life/.35;put('wave',b.x,h,b.y,yaw,0,0,s*(1+k*1.5));continue}
      case 'spark':put('glow',b.x,h,b.y,0,0,0,8,8,8,col);put('spark',b.x,h,b.y,ts*9,0,0,s,s,s,_c.set('#FFFBE0'));continue;
      case 'bullet':put('bullet',b.x,h,b.y,yaw,0,0,s*1.15,s,s,col);put('streak',b.x,h,b.y,yaw,0,0,22,b.r*1.2,b.r*1.2,_c.copy(col).multiplyScalar(.6));continue;
      case 'pellet':put('pellet',b.x,h,b.y,0,0,0,b.r/4,b.r/4,b.r/4,col);continue;
      case 'jelly':{const w=Math.sin(t/50)*.12;put('jelly',b.x,h,b.y,0,0,0,s*(1+w),s*(1-w),s*(1+w));continue}}
    if(!MODELS[pk])pk='generic';
    let ry=ORIENT[pk]?yaw:0,rz=0,rx=0,hh=h;
    if(g.spin){ry=yaw+ts*14+b.id;rz=.3}
    else if(!ORIENT[pk]&&fly){rz=-ts*9-b.id;ry=yaw}
    if(pk==='chicken')hh+=Math.abs(Math.sin(t/60))*3;
    if(pk==='clock'||pk==='timeorb'||pk==='holeorb'){ry=ts*2;rz=0}
    if(pk==='portal'||pk==='mine'){ry=ts*(pk==='mine'?1:9);rz=0}
    put(pk,b.x,hh,b.y,ry,rx,rz,s,s,s,pk==='generic'?col:null);
    if(pk==='rocket'||pk==='rpg'||pk==='bigrocket'){const bx=b.x-Math.cos(-yaw)*14*s,by=b.y+Math.sin(yaw)*14*s;if(Math.random()<.7)fire(bx,by,h,3.5*s,8,.25)}
    if(g.fuse&&b.life<.5&&Math.floor(t/70)%2)put('glow',b.x,hh,b.y,0,0,0,14,14,14,_c.set('#FF3B47'))}}
function drawItems(t){const ts=t/1000;
  for(const g of gems){const bob=Math.sin(t/380+g.x*.01)*3;put('shadow',g.x,.5,g.y,0,0,0,8);put('orange',g.x,11+bob,g.y,ts*1.6+g.x,0,.15,1)}
  for(const m of meds){const bob=Math.sin(t/300+m.x)*2;put('shadow',m.x,.5,m.y,0,0,0,13);put('medkit',m.x,11+bob,m.y,Math.sin(ts+m.x)*.4,0,0,.9)}
  for(const c of crates){const bob=Math.sin(t/340+c.y)*2;put('shadow',c.x,.5,c.y,0,0,0,15);put('crate',c.x,13+bob,c.y,Math.sin(ts*.8+c.y)*.5,0,0,.9)}
  const ht=hostNow();for(const f of fields){const age=(ht-f.start)/1000;
    if(f.k==='meteor'||f.k==='stamp'){const k=clamp(age*1000/f.delay,0,1);if(k>=1)continue;
      if(f.k==='meteor'){const x=f.x-160*(1-k),z=f.y-120*(1-k),h=20+520*(1-k)*(1-k);put('meteor',x,h,z,ts*3,ts*2,0,2.2);put('shadow',f.x,.5,f.y,0,0,0,f.r*.35*(.3+k*.7));if(Math.random()<.8)fire(x,z,h,14,30,.4)}
      else{const h=8+300*(1-k)*(1-k);put('stamp',f.x,h,f.y,0,0,0,2.4);put('shadow',f.x,.5,f.y,0,0,0,f.r*.5*(.3+k*.7))}}
    if(f.k==='hole'){put('holeorb',f.x,30,f.y,ts*4,.4,0,2.6+Math.sin(t/60)*.1);if(Math.random()<.5){const a=Math.random()*P*2,r=f.r*rnd(.5,1);part({k:'dot',x:f.x+Math.cos(a)*r,y:f.y+Math.sin(a)*r,h:rnd(4,50),vx:-Math.cos(a)*r*2,vy:-Math.sin(a)*r*2,vh:0,drag:0,size:3,life:.5,col:pick(['#8E5BFF','#45D4FF','#C38BFF'])})}}}}
// fogo em quem está pegando fogo
function burning(x,y,dt){if(Math.random()<dt*28)fire(x,y,rnd(14,40),rnd(4,7),70,.45)}
// chamado pelo Map3D a cada quadro, com a cena atual
function frame(scene,dt,t){if(!init())return;if(grp.parent!==scene)scene.add(grp);tickParts(dt);begin();
  try{drawItems(t);drawBullets(bullets,t);drawParts()}catch(e){console.warn('efeitos 3D',e)}end()}
// para compilar os shaders antes da partida: uma cópia de cada tipo de material
function warm(){if(!init())return null;const g=new T.Group();const keys=[...Object.keys(SIMPLE),...Object.keys(MODELS),'txt:NÃO','txt:SIM','txt:PEW','txt:6','txt:7'];
  for(const k of keys){const P0=protos.get(k)||mk(k);if(!P0)continue;for(const im of P0.im){const c=new T.InstancedMesh(im.geometry,im.material,1);if(im.instanceColor)c.instanceColor=new T.InstancedBufferAttribute(new Float32Array(3).fill(1),3);c.frustumCulled=false;g.add(c)}}return g}
return{frame,part,burst,boom,ring,flash,smoke,fire,bolt,from2D,clear,burning,warm,FLY,get ok(){return ok}}})();
