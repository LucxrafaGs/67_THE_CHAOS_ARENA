// ===== Armas 3D low poly (as 67): modelo na mão das capivaras e ícones do Arsenal/HUD =====
// Cada arma é montada com peças simples (caixas chanfradas, tubos, esferas, cones, anéis), juntadas numa malha só
// com cor por face (flat shading). Eixos do modelo: x = cano (para frente), y = cima, z = lado. O cabo fica na origem.
// Unidades iguais às do antigo desenho 2D (uma pistola tem ~44 de comprimento); na mão: GUN3_SCALE unidades do mundo.
const GUN3_SCALE=.42;
const Guns3D=(()=>{
let K=null,T=null;const cache=new Map();
const DK='#3A3A46',MT='#9AA3B3',MT2='#C9CED8',WD='#8B5A2B',WD2='#B98454',WH='#FFF4E0',RD='#E8443A',YL='#FFC531';
// construtor de uma arma: peças com posição de centro (x,y,z)
function kit(B){const G=K.lib(),P=Math.PI;
  const at=(geo,x,y,z,c,o={})=>B.add(geo,Object.assign({p:[x,y,z],c,ao:0,jit:o.jit==null?.035:o.jit},o));
  const box=(x,y,z,w,h,d,c,o={})=>at(G.cbox(w,h,d,o.ch==null?Math.min(1.6,w/4,h/4,d/4):o.ch),x,y-h/2,z,c,o);       // centro em (x,y,z)
  const blk=(x,y,z,w,h,d,c,o={})=>at(G.box(w,h,d),x,y-h/2,z,c,o);
  const tube=(x0,x1,y,z,r,c,o={})=>at(G.cyl(o.r2==null?r:o.r2,r,x1-x0,o.n||8),x0,y,z,c,Object.assign({r:[0,0,-P/2]},o)); // ao longo de +x
  const tubeY=(x,y0,y1,z,r,c,o={})=>at(G.cyl(o.r2==null?r:o.r2,r,y1-y0,o.n||8),x,y0,z,c,o);
  const tubeZ=(x,y,z0,z1,r,c,o={})=>at(G.cyl(r,r,z1-z0,o.n||8),x,y,z0,c,Object.assign({r:[P/2,0,0]},o));
  const ball=(x,y,z,r,c,o={})=>at(new T.IcosahedronGeometry(r,o.det==null?1:o.det),x,y,z,c,o);
  const cone=(x,y,z,r,h,c,o={})=>at(G.cone(r,h,o.n||8),x,y,z,c,Object.assign({r:[0,0,-P/2]},o)); // ponta para +x
  const ring=(x,y,z,R,r,c,o={})=>at(new T.TorusGeometry(R,r,6,o.n||14),x,y,z,c,o);
  const grip=(c,x=0,len=17)=>{at(G.cbox(9,len,8,2),x-1,-len,0,c,{r:[0,0,-.22]})};                                       // cabo inclinado
  const trig=(x=6)=>{ring(x,-3,0,4,1,DK,{r:[0,0,0],n:10})};
  const emit=(geo,x,y,z,c,o={})=>at(geo,x,y,z,c,Object.assign({m:'emit',jit:0},o));
  return{G,P,at,box,blk,tube,tubeY,tubeZ,ball,cone,ring,grip,trig,emit}}
// ---------- modelos (um por tipo "m" do Arsenal) ----------
const MODELS={
  pistol(k,g){const {box,tube,grip,trig,ball,at,G,emit}=k;grip(shade(g.c1,-.3));box(11,4,0,34,13,10,g.c1);box(31,1,0,10,9,8,g.c2);box(19,10,0,7,5,6,g.c2);trig();
    tube(36,40,2,0,2.2,DK);if(g.x==='bubbles')for(const [x,y,r] of [[44,6,4],[50,10,2.6],[41,13,2.2]])ball(x,y,0,r,'#FF9FD0',{m:'glass'});
    if(g.x==='crystal'){at(G.cone(3.2,10,5),4,9,0,'#BFF1FF',{m:'emit',jit:0});at(G.cone(2.6,8,5),12,9,0,'#BFF1FF',{m:'emit',jit:0})}},
  finger(k,g){const {box,ball,tube}=k;ball(4,0,0,8,g.c1);tube(8,32,4,0,3.4,g.c1,{n:7});box(2,11,0,6,10,6,g.c1);ball(33,4,0,3.4,'#FF8FAB',{det:0});ball(3,-2,5,4.2,'#FF8FAB',{det:0});
    for(const y of [10,14])tube(40,46,y,0,.9,g.c2,{m:'emit'})},
  revolver(k,g){const {box,tube,grip,trig,tubeZ,ball}=k;grip(WD);box(4,3,0,16,12,10,g.c1);tubeZ(10,3,-6,6,7.5,shade(g.c1,.15),{n:10});for(let i=0;i<5;i++){const a=i/5*TAU;tubeZ(10+Math.cos(a)*4.4,3+Math.sin(a)*4.4,6,6.6,1.3,DK,{n:6})}
    tube(16,44,5,0,3,g.c1);tube(44,47,5,0,3.6,DK);trig();ball(49,5,0,3,g.c2,{det:0})},
  slingshot(k,g){const {tubeY,at,G,ball,tube,P}=k;tubeY(0,-14,0,0,2.6,g.c1);at(G.cyl(2.2,2.2,17,6),0,0,0,g.c1,{r:[0,0,.55]});at(G.cyl(2.2,2.2,17,6),0,0,0,g.c1,{r:[0,0,-.55]});
    tube(-7,16,14,4,.7,g.c2,{r:[0,.3,-P/2]});tube(-7,16,14,-4,.7,g.c2,{r:[0,-.3,-P/2]});ball(16,14,0,3,WD,{det:0})},
  camera(k,g){const {box,tubeY,tube,ball,emit,G}=k;box(11,2,0,38,26,16,g.c1);tube(22,30,2,0,9,'#3A3A46',{n:12});tube(30,31,2,0,7,'#6FC3FF',{m:'emit'});box(24,19,0,9,6,8,g.c2);box(-2,18,0,8,5,8,RD)},
  smg(k,g){const {box,tube,grip,trig,blk}=k;grip(shade(g.c1,-.3));box(-12,4,0,14,11,9,shade(g.c1,-.2));box(15,4,0,46,15,11,g.c1);blk(10,-6,0,8,18,6,DK);tube(38,52,4,0,3,DK);trig(4);
    if(g.x==='popcorn'){box(12,18,0,20,12,12,WH);for(const [x,y] of [[6,26],[12,28],[18,26],[10,23],[16,23]])k.ball(x,y,0,3.6,'#FFF8DC',{det:0})}},
  stapler(k,g){const {box,tube,ball}=k;box(18,-3,0,58,8,12,g.c1);box(18,8,0,58,11,12,shade(g.c1,.2));ball(-9,4,0,4,MT,{det:0});for(const y of [5,9])tube(46,56,y,0,.9,g.c2)},
  hive(k,g){const {grip,ball,ring,tube,at,G}=k;grip(WD);at(new T.SphereGeometry(16,8,6),16,8,0,g.c1,{s:[1.25,.9,.9]});for(const x of [6,14,22])ring(x,8,0,12.5,1.3,g.c2,{r:[0,Math.PI/2,0]});
    tube(34,38,8,0,3.4,DK);ball(42,18,0,3.4,YL,{det:0})},
  minigun(k,g){const {box,tube,at,G,tubeZ}=k;box(1,0,0,30,26,18,g.c1);for(let i=0;i<6;i++){const a=i/6*TAU;tube(14,52,2+Math.cos(a)*5,Math.sin(a)*5,1.8,'#9AA3B3',{n:6})}
    tube(14,16,2,0,8.5,DK,{n:10});tube(44,46,2,0,8,g.c1,{n:10});box(-2,-15,0,12,8,10,g.c2);at(G.cbox(8,18,8,2),-8,-24,0,shade(g.c1,-.3),{r:[0,0,-.2]})},
  hose(k,g){const {grip,tube,ring,box}=k;ring(-6,-8,0,10,3,g.c1,{r:[0,0,0]});grip(DK);box(10,3,0,30,11,10,MT);box(31,3,0,14,15,12,g.c1);tube(38,44,3,0,4,g.c2,{m:'emit'})},
  rifle(k,g){const {box,tube,grip,trig,blk}=k;box(-14,1,0,18,12,8,shade(g.c1,-.25));grip(shade(g.c1,-.3));box(24,4,0,64,11,10,g.c1);tube(56,74,5,0,2.6,g.c2);trig();
    if(g.x==='bamboo')for(let x=6;x<58;x+=13)k.ring(x,4,0,6,1.1,g.c2,{r:[0,Math.PI/2,0]})},
  sniper(k,g){const {box,tube,grip,trig,tubeY}=k;box(-15,0,0,20,12,8,shade(g.c1,.15));grip(shade(g.c1,-.2));box(18,4,0,52,12,10,g.c1);tube(40,88,5,0,2.4,DK);box(86,5,0,8,8,6,g.c1);
    tube(8,36,17,0,4.4,DK);tube(36,38,17,0,4.8,g.c2,{m:'emit'});tubeY(22,10,14,0,1.6,DK);trig();k.at(k.G.cyl(1,1,14,4),60,-1,0,DK,{r:[0,0,.3]});k.at(k.G.cyl(1,1,14,4),64,-1,0,DK,{r:[0,0,-.3]})},
  bow(k,g){const {at,G,tube,ball,cone}=k;at(new T.TorusGeometry(26,1.8,5,16,Math.PI*.9),-4,0,0,g.c1,{r:[0,0,-Math.PI*.45]});k.tubeY(-6,-24,24,0,.5,WH);
    tube(-6,26,0,0,1.2,'#C49A6C');at(new T.SphereGeometry(6,8,5,0,TAU,0,Math.PI/2),27,0,0,g.c2,{r:[0,0,-Math.PI/2]})},
  crossbow(k,g){const {box,at,G,grip,tube,cone}=k;box(14,3,0,56,9,9,g.c1);at(new T.TorusGeometry(22,1.8,5,14,Math.PI*.8),26,3,0,'#5A3A1A',{r:[Math.PI/2,0,Math.PI*.6]});grip(shade(g.c1,-.2));
    tube(14,40,8,0,2,g.c2);cone(40,8,0,3.4,9,g.c2);for(const z of [-2,0,2])k.cone(10,8,z,1.6,4,'#3DBE6C',{r:[0,0,Math.PI/2]})},
  partycannon(k,g){const {grip,tube,at,G,ball}=k;grip(shade(g.c1,-.3));tube(-6,32,2,0,6,g.c1,{r2:13,n:10});for(let x=0;x<30;x+=8)k.ring(x+2,2,0,6.4+x*.2,1,g.c2,{r:[0,Math.PI/2,0]});
    for(const [y,z,c] of [[10,4,'#45D4FF'],[0,-6,'#6CF06A'],[-6,6,'#FF4F9A'],[6,-3,YL]])k.blk(36+Math.random()*4,y,z,4,3,1,c,{m:'emit'})},
  accordion(k,g){const {box}=k;box(-6,2,0,11,26,14,g.c1);box(37,2,0,11,26,14,g.c1);for(let i=0;i<7;i++)box(3+i*4.4,2,0,3.6,24-(i%2)*3,13-(i%2)*2,i%2?shade(g.c2,-.15):g.c2,{ch:.6});
    for(let i=0;i<4;i++)k.ball(-6,9-i*5,7.5,1.4,WH,{det:0})},
  shotgun(k,g){const {box,tube,grip,trig}=k;box(-16,0,0,20,11,8,WD);grip('#6E4A2E');box(1,3,0,18,13,10,g.c1);tube(8,62,7,-2.6,3,g.c2);tube(8,62,7,2.6,3,g.c2);box(28,0,0,16,7,9,g.c1);trig(4)},
  blunderbuss(k,g){const {box,tube,grip,trig}=k;box(-15,0,0,20,11,8,g.c1);grip(shade(g.c1,-.2));tube(-6,32,4,0,4.4,g.c2);tube(32,54,4,0,4.4,g.c2,{r2:11,n:10});tube(53,55,4,0,11.5,shade(g.c2,-.4),{n:10});trig()},
  cannon(k,g){const {tube,ring,ball,at,G,tubeZ}=k;tube(-10,42,4,0,9.5,g.c1,{r2:8.5,n:10});tube(40,48,4,0,11,shade(g.c1,.2),{n:10});ring(10,4,0,10,1.6,g.c2,{r:[0,Math.PI/2,0]});
    ball(-11,4,0,5,g.c1,{det:0});tubeZ(4,-7,-6,6,8,WD,{n:10});k.tube(-14,-10,8,0,1,'#C9A06A',{r:[0,0,-2.4]})},
  bazooka(k,g){const {tube,box,ring,grip}=k;grip(DK);tube(-24,52,4,0,8.5,g.c1,{n:10});for(const x of [-6,10,28])ring(x,4,0,8.8,1.4,g.c2,{r:[0,Math.PI/2,0]});tube(48,54,4,0,10,shade(g.c1,-.2),{n:10});
    tube(-28,-24,4,0,10.5,shade(g.c1,-.25),{r2:8.5,n:10});box(8,16,0,10,7,8,DK);if(g.x==='anvil')k.box(62,4,0,16,10,10,'#6B7385')},
  megabazooka(k,g){const {tube,ring,box,grip,cone}=k;grip(DK);tube(-26,66,6,0,12.5,g.c1,{n:12});for(let x=-20;x<64;x+=14)ring(x,6,0,12.8,1.6,YL,{r:[0,Math.PI/2,0]});cone(66,6,0,12,22,g.c2,{n:12});box(16,22,0,16,10,10,DK)},
  rpg(k,g){const {tube,box,grip,cone}=k;grip(DK);tube(-18,42,4,0,6.5,g.c1,{n:10});tube(42,56,4,0,4.4,'#6B7A5A');cone(56,4,0,7,12,'#FF7A1A');box(12,14,0,10,6,7,DK);
    for(const s of [-1,1])k.blk(-16,4+s*6,0,6,5,1,'#4A5A3A')},
  laser(k,g){const {box,tube,grip,ball,at,G,emit}=k;grip(shade(g.c1,-.3));box(13,4,0,42,14,11,g.c1);for(const x of [12,19,26])box(x,4,0,4,18,13,g.c2);tube(34,42,4,0,5,g.c1,{n:10});
    emit(new T.IcosahedronGeometry(4.6,1),44,4,0,g.c2);
    if(g.x==='catears')for(const x of [-2,10])at(G.cone(4,10,4),x,11,0,g.c1);if(g.x==='jar'){at(G.cyl(7,7,13,10),5,11,0,'#E9F6FF',{m:'glass'});emit(new T.IcosahedronGeometry(4,1),5,17,0,g.c2)}
    if(g.x==='disco')ball(52,4,0,7,MT2,{det:1});if(g.x==='crystal')emit(G.cone(4,12,5),48,4,0,'#BFF1FF',{r:[0,0,-Math.PI/2]})},
  tesla(k,g){const {box,grip,tubeY,ring,emit}=k;grip(DK);box(10,3,0,36,14,11,g.c1);tubeY(30,8,30,0,2,MT);for(let i=0;i<4;i++)ring(30,12+i*4.5,0,6.5-i*.9,1.4,'#C98B4E',{r:[Math.PI/2,0,0]});emit(new T.IcosahedronGeometry(6.5,1),30,36,0,g.c2)},
  baguette(k,g){const {tube,ball,ring}=k;tube(-6,60,0,0,6.2,'#E8B26A',{n:8});ball(60,0,0,6,'#E8B26A',{det:0});for(let x=6;x<56;x+=12)k.blk(x,6,0,6,1.6,5,'#B87A3A',{r:[0,0,.5]});tube(-12,-4,0,0,4.6,WH)},
  hammer(k,g){const {tube,box}=k;tube(-4,40,0,0,3,WD);box(44,0,0,20,30,22,g.c1);box(35,0,0,4,32,24,g.c2);box(53,0,0,4,32,24,g.c2)},
  glove(k,g){const {tube,ball,box,ring}=k;for(let i=0;i<6;i++)ring(2+i*4.2,0,0,4,.9,MT2,{r:[0,Math.PI/2,0]});box(28,0,0,8,16,14,WH);ball(40,0,0,11,'#FF3B47');ball(36,9,-4,5,'#FF3B47')},
  dryer(k,g){const {tube,tubeZ,box,cone,grip,emit}=k;grip(g.c1,0,20);tubeZ(8,6,-7,7,11,g.c1,{n:12});tube(14,40,6,0,6.5,shade(g.c1,-.12),{r2:5});cone(40,6,0,6.5,5,g.c2,{m:'emit'})},
  squeegee(k,g){const {tube,box}=k;tube(-6,50,0,0,2.4,MT2);box(52,0,0,8,40,10,'#45D4FF');box(57,0,0,3,40,11,'#2A2440')},
  fish(k,g){const {at,G,tube,ball,cone}=k;at(new T.SphereGeometry(10,9,6),24,0,0,'#7FB7D9',{s:[2.2,1,.6]});at(G.cone(9,11,4),-4,0,0,'#5E9BC2',{r:[0,0,Math.PI/2],s:[1,1,.3]});
    tube(45,72,0,0,1.8,'#C9E2F0');ball(36,3,5.4,2.4,WH,{det:0});ball(37,3,6.6,1.1,DK,{det:0});at(G.cone(5,9,3),24,8,0,'#5E9BC2',{s:[1,1,.3]})},
  pizzasaw(k,g){const {tube,tubeZ,ring}=k;tube(-6,26,0,0,3.4,RD);tubeZ(38,0,-1.5,1.5,14,MT2,{n:16});tubeZ(38,0,-2.2,2.2,3,RD,{n:8});for(let i=0;i<4;i++){const a=i/4*TAU;k.blk(38+Math.cos(a)*7,Math.sin(a)*7,0,1,7,3.2,DK,{r:[0,0,a]})}},
  forks(k,g){const {box,tube}=k;for(const [a,z] of [[-.35,-4],[0,0],[.35,4]]){tube(0,22,0,z,1.4,'#DDE7F2',{r:[0,-a*.6,-Math.PI/2]});for(const zz of [-1.6,0,1.6])tube(22,30,0,z+zz-a*10,.6,'#DDE7F2',{r:[0,-a*.6,-Math.PI/2]})}},
  pizza(k,g){const {at,G,ball,tube}=k;const s=new T.Shape();s.moveTo(0,0);s.lineTo(26,-11);s.lineTo(26,11);s.closePath();at(new T.ExtrudeGeometry(s,{depth:3,bevelEnabled:false}),2,0,0,'#FFD166',{r:[Math.PI/2,0,0]});
    tube(26,29,0,0,11,'#D9813B',{s:[1,1,.3]});for(const [x,z] of [[14,0],[20,4],[20,-5]])ball(x,1.2,z,2.4,RD,{det:0,s:[1,.4,1]})},
  banana(k,g){const {at,G,ball}=k;at(new T.TorusGeometry(16,4,6,12,Math.PI*.7),12,-12,0,'#FFE14D',{r:[0,0,.6]});ball(-1,3,0,2.6,'#6B4129',{det:0})},
  pick(k,g){const {tube,at,G}=k;tube(-4,28,0,0,2.2,'#9B6B3E');at(new T.TorusGeometry(14,2.6,5,10,Math.PI*.9),28,-6,0,'#9FB4C7',{r:[0,0,Math.PI*.05]})},
  slipper(k,g){const {at,G,box}=k;at(G.cbox(30,4,13,2),14,-2,0,'#3DA5FF');at(G.cbox(26,2,10,1),14,2,0,'#9FD8FF');for(const z of [-3,3])k.tube(10,20,3,z,1.2,WH,{r:[0,z>0?-.8:.8,-Math.PI/2]})},
  snowball(k,g){const {ball}=k;ball(10,0,0,9,'#FFFFFF',{det:1});ball(10,-3,3,5,'#C9E8F5',{det:0})},
  duck(k,g){const {ball,cone}=k;ball(10,0,0,9,'#FFD93D',{s:[1.2,.8,1]});ball(16,8,0,5.6,'#FFD93D');cone(20,8,0,2.4,6,'#FF8A1F');for(const z of [-2.6,2.6])ball(18.5,10,z,1,DK,{det:0})},
  eggs(k,g){const {ball}=k;for(const [x,z,c] of [[4,-6,'#9CF581'],[16,0,'#FF9BD5'],[28,6,'#9FD8FF']]){ball(x,0,z,7,c,{s:[1.1,.85,.85]});k.ring(x,0,z,6.6,.8,'#FF4F9A',{r:[0,Math.PI/2,0]})}},
  cuckoo(k,g){const {box,at,G,tubeZ,ball}=k;box(10,0,0,18,18,12,'#C98B4E');at(G.cone(14,8,4),10,9,0,'#8B5A2B',{r:[0,Math.PI/4,0]});tubeZ(10,2,6,7,5,'#FFF4E0',{n:12});ball(10,-10,0,2,YL,{det:0})},
  launcher(k,g){const {tube,box,grip,tubeZ,ball}=k;grip(DK);tube(-14,48,4,0,9,g.c1,{n:10});tubeZ(4,-6,-6,6,10,g.c2,{n:6});tube(44,50,4,0,10,shade(g.c1,-.2),{n:10});
    if(g.p==='coconut')ball(56,4,0,7,'#8B5A2B',{det:0});else{ball(56,4,0,6,'#FF4F9A');k.cone(62,4,0,3,6,YL);k.cone(50,4,0,3,6,YL,{r:[0,0,Math.PI/2]})}},
  corn(k,g){const {at,G,ball}=k;at(new T.SphereGeometry(7,8,6),14,0,0,'#FFE066',{s:[1.7,1,1]});for(let i=0;i<10;i++)ball(4+i*2.2,(i%2?3:-3),(i%3-1)*3,1.6,'#E8B820',{det:0});at(G.cone(5,14,4),2,0,0,'#3DBE6C',{r:[0,0,Math.PI/2]})},
  mine(k,g){const {ball,cone,emit}=k;ball(10,0,0,9,'#FF8A1F');for(let i=0;i<8;i++){const a=i/8*TAU;k.cone(10+Math.cos(a)*8,Math.sin(a)*8,0,1.8,5,DK,{r:[0,0,a-Math.PI/2]})}emit(new T.IcosahedronGeometry(2.6,0),10,0,8.4,'#FF3B47');k.at(G_leaf(),10,9,0,'#3DBE6C')},
  megabomb(k,g){const {ball,tube,tubeY,emit}=k;ball(12,0,0,11,'#2A2440');tubeY(12,10,15,0,3.2,'#8A93A6');tube(12,16,17,0,1,'#C9A06A',{r:[0,0,-.6]});emit(new T.IcosahedronGeometry(3,0),17,20,0,YL)},
  megaphone(k,g){const {grip,box,tube,ring}=k;grip(shade(g.c1,-.3));box(0,4,0,14,12,10,g.c1);tube(6,36,4,0,6,g.c1,{r2:17,n:12});ring(36,4,0,17,1.6,g.c2,{r:[0,Math.PI/2,0],n:16})},
  door(k,g){const {box,ball}=k;box(10,0,0,16,24,4,'#9B6B3E');box(10,4,2.4,10,7,1,'#B98454');box(10,-5,2.4,10,7,1,'#B98454');ball(15,-1,3,1.5,YL,{det:0});for(const [x,y] of [[26,14],[28,-10],[-2,16]])k.emit(new T.OctahedronGeometry(2.4),x,y,0,'#FFFBE0')},
  portalgun(k,g){const {grip,box,tube,emit,ring}=k;grip(DK);box(10,3,0,38,15,12,'#E9EEF5');box(9,12,0,14,4,10,g.c1);ring(40,3,0,7,2.2,g.c1,{r:[0,Math.PI/2,0]});emit(new T.CircleGeometry(5.4,14),41,3,0,g.c2,{r:[0,Math.PI/2,0]})},
  horn(k,g){const {ball,tube,ring}=k;ball(-4,0,0,9,'#2A2440');tube(4,32,0,0,4,'#E8B820',{n:8});tube(32,48,0,0,4,'#E8B820',{r2:15,n:12});ring(48,0,0,15,1.4,'#C9961A',{r:[0,Math.PI/2,0],n:16})},
  chickengun(k,g){const {grip,tube,ring,ball,cone}=k;grip(DK);tube(-14,40,3,0,8.5,g.c1,{n:10});ring(9,3,0,8.8,2,WH,{r:[0,Math.PI/2,0]});ball(48,6,0,6,'#FFFFFF');ball(53,11,0,4,'#FFFFFF');cone(56,11,0,1.8,4,YL);k.at(k.G.cone(2.4,4,4),53,15,0,RD)},
  calc(k,g){const {box,emit}=k;box(3,0,0,30,36,8,'#FFC531');emit(new k.T_Plane(20,10),3,11,4.2,'#BFF2C0');for(let i=0;i<3;i++)for(let j=0;j<3;j++)box(-6+i*9,-1-j*7,4.6,6,5,2,j===2&&i===2?'#FF4F9A':'#FFFFFF',{ch:.6})},
  stopwatch(k,g){const {tubeZ,box,emit,ring}=k;tubeZ(10,0,-4,4,16,'#E9EEF5',{n:16});tubeZ(10,0,4,4.6,13,'#FFFFFF',{n:16});box(10,20,0,8,6,6,'#8A93A6');k.blk(10,5,5,1.4,10,1,RD);ring(10,0,0,20,1.2,'#9FD8FF',{m:'emit'})},
  blackhole(k,g){const {box,tube,ball,ring,emit}=k;box(-4,0,0,12,10,10,'#5B6B80');for(const s of [-1,1])tube(-4,8,s*4,0,1.6,DK,{r:[0,0,-Math.PI/2+s*.6]});ball(18,0,0,9,'#05030C');ring(18,0,0,14,1.4,'#C38BFF',{m:'emit',r:[1.2,0,.3],n:20})},
  remote(k,g){const {box,ball,tubeY,emit}=k;box(5,0,0,22,36,8,g.c1);for(let i=0;i<2;i++)for(let j=0;j<3;j++)ball(0+i*10,6-j*8,4.6,2.6,j===0&&i===0?g.c2:MT2,{det:0,s:[1,1,.5]});tubeY(10,18,32,0,1,DK);emit(new T.IcosahedronGeometry(3.4,0),10,33,0,g.c2)},
  stamp(k,g){const {box,tubeY,ball}=k;ball(6,24,0,7,'#8B5A2B');tubeY(6,8,18,0,3,'#8B5A2B');box(6,4,0,36,12,16,g.c1);box(6,-4,0,40,4,18,'#2A2440')},
  wand(k,g){const {tube,ring,ball}=k;tube(-6,24,0,0,2,'#FF8FAB');ring(34,0,0,10,1.6,'#FFFFFF',{r:[0,Math.PI/2,0]});ball(50,10,0,5,'#C9F0FF',{m:'glass'});ball(54,-6,0,3.4,'#C9F0FF',{m:'glass'})},
  trowel(k,g){const {tube,at,G,box}=k;tube(-6,16,0,0,3,'#8B5A2B');tube(14,22,0,0,1.6,MT);const s=new T.Shape();s.moveTo(0,0);s.lineTo(14,-14);s.lineTo(28,0);s.lineTo(14,14);s.closePath();
    at(new T.ExtrudeGeometry(s,{depth:1.4,bevelEnabled:false}),20,0,0,MT2,{r:[Math.PI/2,0,0]});box(4,-18,0,16,8,10,'#D2603F');box(20,-18,0,16,8,10,'#C9563A')},
  boxgun(k,g){const {box}=k;box(12,0,0,20,20,20,'#C9A06A');box(12,0,0,5.2,20.4,20.4,'#E8D3A8',{ch:.4});box(12,4,0,20.4,1,20.4,'#8B5A2B',{ch:.3})},
  shieldgen(k,g){const {box,at,ball,emit}=k;box(10,-8,0,32,8,14,'#5B6B80');at(new T.SphereGeometry(20,12,6,0,TAU,0,Math.PI/2),10,-4,0,'#45D4FF',{m:'glass'});emit(new T.IcosahedronGeometry(4,1),10,-2,0,g.c2)},
  turret(k,g){const {box,tube,at,G,ball,emit}=k;for(const a of [-.5,0,.5])at(G.cyl(1.4,1.4,20,4),10,-20,0,DK,{r:[0,0,a]});box(11,4,0,22,16,16,g.c1);tube(20,44,4,0,3.2,DK);emit(new T.IcosahedronGeometry(3,0),8,4,8.4,g.c2)},
};
function G_leaf(){return new T.SphereGeometry(4,6,4).scale(1,.4,.5)}
// Arma de reserva para qualquer tipo sem modelo
function generic(k,g){const {box,grip,tube}=k;grip(shade(g.c1||'#888',-.3));box(14,4,0,40,14,10,g.c1||g.col||'#888');tube(34,42,4,0,2.6,DK)}
function build(gi){if(cache.has(gi))return cache.get(gi);const g=GUNS[gi];if(!g)return null;T=window.THREE;K=Map3D.kit();
  const B=K.makeBuilder(gi*131+7),k=kit(B);k.T_Plane=function(w,h){return new T.PlaneGeometry(w,h)};
  const g2=Object.assign({c1:g.c1||g.col||'#8A93A6',c2:g.c2||'#FFF4E0'},g);
  try{(MODELS[g.m]||generic)(k,g2)}catch(e){console.warn('arma 3D',g.n,e);generic(k,g2)}
  // texto das armas "NÃO" e "SIM": letreiro de verdade saindo do megafone
  const grp=new T.Group();B.build(K.mats(),grp);
  if(g.txt==='NÃO'||g.txt==='SIM'){const cv=document.createElement('canvas');cv.width=128;cv.height=64;const c=cv.getContext('2d');c.font='900 44px "Lilita One",sans-serif';c.textAlign='center';c.textBaseline='middle';
    c.lineWidth=9;c.strokeStyle=INK;c.strokeText(g.txt,64,34);c.fillStyle=g.col;c.fillText(g.txt,64,34);const t=new T.CanvasTexture(cv);t.colorSpace=T.SRGBColorSpace;
    const m=new T.Mesh(new T.PlaneGeometry(26,13),new T.MeshBasicMaterial({map:t,transparent:true,side:T.DoubleSide,depthWrite:false}));m.position.set(34,24,0);grp.add(m)}
  grp.traverse(o=>{if(o.isMesh){o.castShadow=true;o.frustumCulled=false}});
  // caixa: para centralizar no ícone
  const bb=new T.Box3().setFromObject(grp);grp.userData.bb=bb;cache.set(gi,grp);return grp}
// cópia leve (compartilha geometria e material)
function instance(gi){const src=build(gi);if(!src)return null;const c=src.clone(true);c.userData.bb=src.userData.bb;return c}
return{build,instance,kit(B){T=window.THREE;K=Map3D.kit();return kit(B)},get count(){return GUNS.length}}})();
