// ===== Mapas 3D low poly (Three.js): chão, paredes, decoração, luz e sombras =====
// O jogo é 3D: cenário, capivaras, armas, construções e poeira em WebGL. O canvas #game por cima só desenha tiros, efeitos e HUD.
// Cada parede 3D ocupa EXATAMENTE o retângulo de colisão de M.walls: a física (04_game.js e o servidor) não muda.
// Câmera 3/4 oblíqua: o chão (altura 0) cai no mesmo pixel do 2D; cada unidade de altura sobe K na tela.
// Camadas, de baixo pra cima:
//   .g3d-b  (2D)    cópia do render 3D completo (chão, paredes, sombras)
//   #game   (2D)    o jogo de sempre (fundo transparente quando o 3D está ligado)
//   .g3d-f  (WebGL) só as partes altas que ficam NA FRENTE de quem está atrás delas, meio transparentes
// Se o WebGL não existir, aparece um aviso (não existe mais versão 2D).
const Map3D=(()=>{
// câmera inclinada estilo Brawl Stars: inclinação de 44° -> o chão aparece achatado em SQ3 = sen 44° e a altura sobe K = cot 44° (em unidades do chão)
const TILT=44*Math.PI/180,SQ3=Math.sin(TILT),K=Math.cos(TILT)/Math.sin(TILT),CH=4000,NL=24,TV='0.159.0',PI=Math.PI;
let T=null,st='idle',R=null,glCv=null,bCv=null,bctx=null,camera=null,cur=null,curKey='',lost=false,U=null,GE=null,SH=null,fontsOk=false;

// ---------- Carregar o Three.js ----------
function load(){if(st!=='idle')return;if(window.THREE){T=window.THREE;st='ready';return}st='loading';
  const urls=['vendor/three.min.js']; // cópia local (r159) dentro de public/vendor: o jogo não depende da internet
  let i=0;
  const next=()=>{if(i>=urls.length){st='failed';noGL('Não achei o arquivo vendor/three.min.js.');return}const s=document.createElement('script');s.src=urls[i++];s.async=true;
    s.onload=()=>{if(window.THREE){T=window.THREE;st='ready'}else next()};s.onerror=()=>{s.remove();next()};document.head.appendChild(s)};next()}
load();
if(document.fonts)document.fonts.ready.then(()=>{fontsOk=true;if(cur&&cur.repaint)cur.repaint()});

// ---------- Qualidade (segue Configurações > Gráficos) ----------
function Q(){const q=S.quality;return{key:q,sh:q==='low'?0:q==='medium'?(isTouch?1024:2048):q==='high'?2048:4096,tex:q==='low'?1024:q==='medium'?(isTouch?1536:2048):q==='high'?3072:4096,
  den:q==='low'?.35:q==='medium'?.7:q==='high'?1:1.3,lam:q==='low',pl:q==='low'?0:q==='medium'?(isTouch?1:2):isTouch?2:4,aa:!isTouch&&q!=='low'}}

// ---------- Ruído e aleatório determinísticos ----------
function hrand(x,y,z,s){return mulberry(Math.imul(x|0,73856093)^Math.imul(y|0,19349663)^Math.imul(z|0,83492791)^Math.imul(s|0,40503))}
function vnoise(seed){const h=(x,z)=>{let n=Math.imul(x,374761393)+Math.imul(z,668265263)+Math.imul(seed,1442695041)|0;n=Math.imul(n^n>>>13,1274126177);return((n^n>>>16)>>>0)/4294967296};
  const sm=t=>t*t*(3-2*t);return(x,z)=>{const xi=Math.floor(x),zi=Math.floor(z),xf=sm(x-xi),zf=sm(z-zi),a=h(xi,zi),b=h(xi+1,zi),c=h(xi,zi+1),d=h(xi+1,zi+1);return a+(b-a)*xf+(c-a)*zf+(a-b-c+d)*xf*zf}}
function fbm(n,x,z,o=3){let s=0,a=.5,f=1,t=0;for(let i=0;i<o;i++){s+=a*n(x*f,z*f);t+=a;f*=2.03;a*=.5}return s/t}
const smooth=(a,b,x)=>{const t=clamp((x-a)/(b-a),0,1);return t*t*(3-2*t)};
const outD=(x,z)=>{const dx=Math.max(-x,0,x-W),dz=Math.max(-z,0,z-H);return Math.hypot(dx,dz)}; // distância até a arena (0 dentro)
const insideA=(x,z,m=0)=>x>-m&&x<W+m&&z>-m&&z<H+m;
const hitWall=(M,x,z,m=0)=>M.walls.some(([wx,wy,ww,wh])=>x>wx-m&&x<wx+ww+m&&z>wy-m&&z<wy+wh+m);

// ---------- Geometrias low poly ----------
function jitter(g,a,s=1,ay){const p=g.attributes.position.array;for(let i=0;i<p.length;i+=3){const r=hrand(Math.round(p[i]*64),Math.round(p[i+1]*64),Math.round(p[i+2]*64),s);
  p[i]+=(r()-.5)*2*a;p[i+1]+=(r()-.5)*2*(ay==null?a:ay);p[i+2]+=(r()-.5)*2*a}return g}
function lib(){if(GE)return GE;GE={
  box:(w,h,d,sx=1,sy=1,sz=1)=>new T.BoxGeometry(w,h,d,sx,sy,sz).translate(0,h/2,0),
  // caixa com quinas chanfradas (cara de low poly bem acabado)
  cbox:(w,h,d,c=3)=>{c=Math.max(.3,Math.min(c,w/2-.3,d/2-.3,h/2-.3));const s=new T.Shape();s.moveTo(-w/2+c,-d/2+c);s.lineTo(w/2-c,-d/2+c);s.lineTo(w/2-c,d/2-c);s.lineTo(-w/2+c,d/2-c);s.closePath();
    const g=new T.ExtrudeGeometry(s,{depth:h-2*c,bevelEnabled:true,bevelThickness:c,bevelSize:c,bevelSegments:1,steps:1,curveSegments:1});g.rotateX(-PI/2);g.translate(0,c,0);return g},
  cyl:(rt,rb,h,n=8,hs=1)=>new T.CylinderGeometry(rt,rb,h,n,hs).translate(0,h/2,0),
  cone:(r,h,n=7)=>new T.ConeGeometry(r,h,n,1).translate(0,h/2,0),
  ico:(r,d=0)=>new T.IcosahedronGeometry(r,d),
  dode:r=>new T.DodecahedronGeometry(r,0),
  plane:(w,d,sx=1,sz=1)=>new T.PlaneGeometry(w,d,sx,sz).rotateX(-PI/2),
  vplane:(w,h)=>new T.PlaneGeometry(w,h).translate(0,h/2,0),
  // pedra: icosaedro amassado, apoiado no chão
  rock:(w,h,d,s,a=.22,det=1)=>{const g=jitter(new T.IcosahedronGeometry(1,det),a,s);g.scale(w/2,h/2,d/2);g.translate(0,h*.42,0);const p=g.attributes.position.array;for(let i=1;i<p.length;i+=3)if(p[i]<0)p[i]=0;return g},
  // bloco de rocha que cobre um retângulo inteiro (para paredes de pedra)
  slab:(w,h,d,s,a=3,ay=4)=>{const g=new T.BoxGeometry(w,h,d,Math.max(1,Math.round(w/26)),2,Math.max(1,Math.round(d/26)));jitter(g,a,s,ay);g.translate(0,h/2,0);const p=g.attributes.position.array;
    for(let i=0;i<p.length;i+=3){if(p[i+1]<1)p[i+1]=0;p[i]=clamp(p[i],-w/2-a*.6,w/2+a*.6);p[i+2]=clamp(p[i+2],-d/2-a*.6,d/2+a*.6)}return g},
  // folha de palmeira / samambaia: tira dobrada que cai na ponta
  leaf:(len,wid,droop,seg=5)=>{const P=[];const pt=i=>{const t=i/seg;return[t*len,-droop*t*t*len,Math.sin(PI*Math.min(1,t*1.15))*wid]};
    for(let i=0;i<seg;i++){const a=pt(i),b=pt(i+1),ra=[a[0],a[1]+wid*.25,0],rb=[b[0],b[1]+wid*.25,0];
      for(const s of [1,-1]){const ea=[a[0],a[1],a[2]*s],eb=[b[0],b[1],b[2]*s];P.push(...ra,...ea,...eb,...ra,...eb,...rb)}}
    const g=new T.BufferGeometry();g.setAttribute('position',new T.Float32BufferAttribute(P,3));return g},
  // cumeeira de telhado (prisma triangular ao longo de z), "steps" divide em fileiras de telha
  ridge:(len,wid,h,steps=1)=>{const s=new T.Shape();s.moveTo(-wid/2,0);s.lineTo(wid/2,0);s.lineTo(0,h);s.closePath();const g=new T.ExtrudeGeometry(s,{depth:len,bevelEnabled:false,steps});g.translate(0,0,-len/2);return g},
  // estrela achatada (estrela-do-mar, decoração)
  star:(r,h)=>{const P=[];for(let i=0;i<10;i++){const a0=i/10*TAU,a1=(i+1)/10*TAU,r0=i%2?r*.42:r,r1=i%2?r:r*.42;P.push(0,h,0,Math.cos(a1)*r1,0,Math.sin(a1)*r1,Math.cos(a0)*r0,0,Math.sin(a0)*r0)}
    const g=new T.BufferGeometry();g.setAttribute('position',new T.Float32BufferAttribute(P,3));return g},
};return GE}

// ---------- Construtor: junta tudo em poucas malhas (uma por material) com cor por face ----------
function makeBuilder(seed){const rnd=mulberry(seed),G=new Map();
  const m4=new T.Matrix4(),q=new T.Quaternion(),eu=new T.Euler(),pv=new T.Vector3(),sv=new T.Vector3(),col=new T.Color(),hsl={h:0,s:0,l:0},A=new T.Vector3(),Bv=new T.Vector3(),Cv=new T.Vector3(),N=new T.Vector3();
  function add(geo,o={}){const g=geo.index?geo.toNonIndexed():geo;
    const p=o.p||[0,0,0],r=o.r||[0,0,0],s=o.s==null?[1,1,1]:typeof o.s==='number'?[o.s,o.s,o.s]:o.s;
    m4.compose(pv.set(p[0],p[1],p[2]),q.setFromEuler(eu.set(r[0],r[1],r[2],'YXZ')),sv.set(s[0],s[1],s[2]));
    const key=(o.m||'std')+(o.occ!=null?'|o':'')+(o.cast===false?'|n':'')+'|'+Math.floor((p[0]+2400)/700)+'_'+Math.floor((p[2]+2400)/700);let gr=G.get(key); // agrupa em pedaços de 700: o que está fora da tela nem é desenhado
    if(!gr){gr={pos:[],col:[],clip:[],sw:[],ph:[],uv:[],m:o.m||'std',occ:o.occ!=null,cast:o.cast!==false};G.set(key,gr)}
    const src=g.attributes.position.array,n=src.length/3,jit=o.jit==null?.05:o.jit,aoY=o.aoY==null?p[1]:o.aoY,aoH=o.aoH||14,aoK=o.ao==null?.32:o.ao,uvs=o.uv||0;
    const swY=o.swY==null?p[1]:o.swY,swH=o.swH||60,V=[A,Bv,Cv],suv=g.attributes.uv?g.attributes.uv.array:null;
    for(let i=0;i<n;i+=3){
      for(let j=0;j<3;j++){const k=(i+j)*3;V[j].set(src[k],src[k+1],src[k+2]).applyMatrix4(m4)}
      const c=typeof o.c==='function'?o.c(rnd,A,Bv,Cv):o.c||'#ffffff';col.set(c);if(jit){col.getHSL(hsl);col.setHSL(hsl.h,hsl.s,clamp(hsl.l*(1+(rnd()-.5)*2*jit),0,1))}
      if(uvs)N.subVectors(Cv,Bv).cross(pv.subVectors(A,Bv)).normalize();
      for(let j=0;j<3;j++){const v=V[j];gr.pos.push(v.x,v.y,v.z);const a=aoK?1-aoK*(1-clamp((v.y-aoY)/aoH,0,1)):1;gr.col.push(col.r*a,col.g*a,col.b*a);
        gr.clip.push(o.occ||0);gr.sw.push(o.swF?o.swF(v):o.sw?o.sw*clamp((v.y-swY)/swH,0,1.4):0);gr.ph.push(o.ph||0);
        if(uvs){const ax=Math.abs(N.x),ay=Math.abs(N.y),az=Math.abs(N.z);if(ay>=ax&&ay>=az)gr.uv.push(v.x/uvs,-v.z/uvs);else if(az>=ax)gr.uv.push(v.x/uvs,v.y/uvs);else gr.uv.push(v.z/uvs,v.y/uvs)}else if(suv)gr.uv.push(suv[(i+j)*2],suv[(i+j)*2+1]);else gr.uv.push(0,0)}}
    if(g!==geo)g.dispose();geo.dispose()}
  function build(mats,parent){for(const gr of G.values()){if(!gr.pos.length)continue;const geo=new T.BufferGeometry();
      geo.setAttribute('position',new T.Float32BufferAttribute(gr.pos,3));geo.setAttribute('color',new T.Float32BufferAttribute(gr.col,3));geo.setAttribute('uv',new T.Float32BufferAttribute(gr.uv,2));
      geo.setAttribute('aClip',new T.Float32BufferAttribute(gr.clip,1));geo.setAttribute('aSw',new T.Float32BufferAttribute(gr.sw,1));geo.setAttribute('aPh',new T.Float32BufferAttribute(gr.ph,1));geo.computeVertexNormals();
      const mt=mats[gr.m]||mats.std,mesh=new T.Mesh(geo,mt);mesh.castShadow=gr.cast&&!mt.userData.nocast;mesh.receiveShadow=!mt.userData.norecv;if(mt.userData.order)mesh.renderOrder=mt.userData.order;
      if(gr.occ)mesh.layers.enable(1);parent.add(mesh)}G.clear()}
  return{add,build,rnd}}

// ---------- Materiais: todos ganham o "patch" de escuridão + recorte da camada da frente ----------
const DARK=`if(uDark>0.0){float da=uDark*uDM;vec2 sp=vec2(vWP.x,vWP.z-${K.toFixed(3)}*vWP.y);for(int i=0;i<${NL};i++){if(i>=uNL)break;vec4 L=uL[i];float d=length(sp-L.xy)/L.z;
  float g=d<.6?1.-.5*d:(d<1.?.7*(1.-d)/.4:0.);da*=1.-g;}gl_FragColor.rgb=mix(gl_FragColor.rgb,uDarkCol,da);}`;
function patch(m,o={}){m.userData.dm=o.dm==null?1:o.dm;m.onBeforeCompile=s=>{
    Object.assign(s.uniforms,{uTime:U.uTime,uClipOn:U.uClipOn,uDark:U.uDark,uDarkCol:U.uDarkCol,uNL:U.uNL,uL:U.uL,uDM:{value:m.userData.dm}});
    if(o.uni)Object.assign(s.uniforms,o.uni(m));
    s.vertexShader='attribute float aClip;attribute float aSw;attribute float aPh;uniform float uTime;varying vec3 vWP;varying float vClip;varying float vPh;varying float vH;\n'+(o.vd||'')+s.vertexShader
      .replace('#include <begin_vertex>','#include <begin_vertex>\nvH=0.0;vPh=aPh;\n'+(o.v||''))
      .replace('#include <project_vertex>','vec4 wp0=vec4(transformed,1.0);\n#ifdef USE_INSTANCING\nwp0=instanceMatrix*wp0;\n#endif\nwp0=modelMatrix*wp0;vWP=wp0.xyz;vClip=aClip;\n#include <project_vertex>');
    s.fragmentShader=`uniform float uClipOn;uniform float uDark;uniform float uDM;uniform float uTime;uniform vec3 uDarkCol;uniform int uNL;uniform vec4 uL[${NL}];varying vec3 vWP;varying float vClip;varying float vPh;varying float vH;\n`+s.fragmentShader
      .replace('void main() {',`void main() {\nif(uClipOn>.5&&vWP.z-${K.toFixed(3)}*vWP.y>=vClip)discard;`)
      .replace('#include <dithering_fragment>','#include <dithering_fragment>\n'+(o.f||'')+'\n'+DARK);
    if(o.fd)s.fragmentShader=o.fd+'\n'+s.fragmentShader;if(o.fr)for(const [a,b] of o.fr)s.fragmentShader=s.fragmentShader.replace(a,b)};
  m.customProgramCacheKey=()=>'m3d'+(o.key||'')+(m.userData.dm);return m}
function stdMat(q,o={},p={}){const base={vertexColors:true,flatShading:p.flat!==false};
  const m=q.lam?new T.MeshLambertMaterial(Object.assign(base,o.lam||{},o.both||{})):new T.MeshStandardMaterial(Object.assign(base,{roughness:.92,metalness:0},o.std||{},o.both||{}));return patch(m,p)}
function basicMat(o={},p={}){return patch(new T.MeshBasicMaterial(Object.assign({vertexColors:true},o)),p)}
const SWAY='transformed.x+=sin(uTime*1.7+position.x*.021+position.z*.013)*aSw;transformed.z+=cos(uTime*1.3+position.x*.017)*aSw*.5;';
const CLOTH='transformed.z+=sin(uTime*5.0+position.x*.09+position.y*.05+aPh)*aSw;transformed.x+=cos(uTime*3.1+position.y*.07+aPh)*aSw*.25;';
const FLICK='gl_FragColor.rgb*=.88+.12*sin(uTime*6.0+vPh*6.283)-(fract(sin(floor(uTime*11.0+vPh*97.0))*43758.5453)>.985?.5:0.);';
let glowTex=null;
function getGlow(){if(glowTex)return glowTex;const cv=document.createElement('canvas');cv.width=cv.height=64;const c=cv.getContext('2d'),g=c.createRadialGradient(32,32,0,32,32,32);
  g.addColorStop(0,'rgba(255,255,255,1)');g.addColorStop(.25,'rgba(255,255,255,.55)');g.addColorStop(.6,'rgba(255,255,255,.14)');g.addColorStop(1,'rgba(255,255,255,0)');c.fillStyle=g;c.fillRect(0,0,64,64);
  glowTex=new T.CanvasTexture(cv);glowTex.colorSpace=T.SRGBColorSpace;return glowTex}
function baseMats(q){const ud=(m,o)=>{Object.assign(m.userData,o);return m};return{
  std:stdMat(q),
  shiny:stdMat(q,{std:{roughness:.45,metalness:.15}}),
  sway:stdMat(q,{},{v:SWAY,key:'sway'}),
  cloth:stdMat(q,{both:{side:T.DoubleSide}},{v:CLOTH,key:'cloth'}),
  emit:ud(basicMat({},{dm:.12}),{nocast:true}),
  neon:ud(basicMat({},{dm:.12,f:FLICK,key:'flick'}),{nocast:true}),
  glow:ud(basicMat({map:getGlow(),transparent:true,depthWrite:false,blending:T.AdditiveBlending},{dm:0,key:'glow'}),{nocast:true,norecv:true,order:5}),
}}

// ---------- Peças de cenário reutilizáveis ----------
function P(B,ctx){const G=lib(),r=B.rnd;const o={
  glow(x,y,z,s,c,occ){B.add(G.plane(s,s),{p:[x,y,z],c,m:'glow',jit:0,ao:0,occ})},
  bush(x,z,rad,c,y=0,occ,sw=1.2){B.add(jitter(G.ico(rad,1),rad*.16,Math.floor(r()*1e6)),{p:[x,y+rad*.62,z],s:[1,.78,1],c,m:'sway',sw,swY:y,swH:rad*2,occ,jit:.07,aoY:y,aoH:rad})},
  tree(x,z,s=1,occ,cols=['#4F9A3A','#5DAE45','#438A33']){const tr=s*(4+r()*2),h=s*(30+r()*12);B.add(G.cyl(tr*.7,tr,h,6),{p:[x,0,z],c:'#7A4E2D',occ});
    const n=2+Math.floor(r()*2);for(let i=0;i<n;i++){const rad=s*(22+r()*10);B.add(jitter(G.ico(rad,1),rad*.15,Math.floor(r()*1e6)),{p:[x+(r()-.5)*s*22,h+rad*.55+i*s*9,z+(r()-.5)*s*14],s:[1,.85,1],c:pick2(cols,r),m:'sway',sw:1.6,swY:h-10,swH:60,occ,jit:.08,aoY:h-6,aoH:30})}},
  pine(x,z,s=1,occ,cols=['#2F6B3A','#3A7A42','#285E33']){const h=s*(12+r()*6);B.add(G.cyl(s*3,s*4.5,h,5),{p:[x,0,z],c:'#5E3B22',occ});let y=h*.8,rad=s*(26+r()*6);const c=pick2(cols,r);
    for(let i=0;i<3;i++){const ch=rad*1.25;B.add(G.cone(rad,ch,7),{p:[x,y,z],r:[0,r()*PI,0],c,m:'sway',sw:1.1,swY:h,swH:120,occ,aoY:y,aoH:ch*.6,ao:.25});y+=ch*.48;rad*=.72}},
  cypress(x,z,s=1,occ){B.add(G.cyl(s*2.5,s*3.5,s*10,5),{p:[x,0,z],c:'#5E3B22',occ});B.add(jitter(G.ico(1,1),.12,Math.floor(r()*1e6)),{p:[x,s*10+s*34,z],s:[s*13,s*40,s*13],c:pick2(['#3E6B3A','#355F33','#47783F'],r),m:'sway',sw:.9,swY:s*10,swH:90,occ,aoY:s*8,aoH:30})},
  palm(x,z,s=1,occ,lean){const seg=6,h=s*(70+r()*25);lean=lean==null?(r()-.5)*.6:lean;const dir=r()*TAU;let px=x,pz=z,py=0;
    for(let i=0;i<seg;i++){const sh=h/seg,t=i/seg,ang=lean*(.3+t),dx=Math.cos(dir)*Math.sin(ang)*sh,dz=Math.sin(dir)*Math.sin(ang)*sh;
      B.add(G.cyl(s*(5.4-t*1.8),s*(6.2-t*1.8),sh*1.05,6),{p:[px,py,pz],c:i%2?'#9A7148':'#8A6340',occ,ao:i?0:.3,jit:.04});px+=dx;pz+=dz;py+=sh*Math.cos(ang)}
    const nl=7+Math.floor(r()*3);for(let i=0;i<nl;i++){const a=i/nl*TAU+r()*.4;B.add(G.leaf(s*(46+r()*14),s*(7+r()*2),.55+r()*.25),{p:[px,py+s*2,pz],r:[0,-a,(r()-.2)*.35],c:pick2(['#3DBE6C','#34A85E','#46C978'],r),m:'sway',sw:2.2,swY:py-20,swH:40,occ,ao:0,jit:.06})}
    for(let i=0;i<3;i++)B.add(G.ico(s*3.4,0),{p:[px+(r()-.5)*s*7,py-s*2,pz+(r()-.5)*s*7],c:'#6B4A2A',occ,ao:0})},
  rocks(x,z,s,c,occ,n=3){for(let i=0;i<n;i++){const w=s*(.6+r()*.6);B.add(G.rock(w,w*(.5+r()*.4),w*(.7+r()*.4),Math.floor(r()*1e6)),{p:[x+(r()-.5)*s*.9,0,z+(r()-.5)*s*.6],r:[0,r()*PI,0],c,occ,jit:.07})}},
  lamp(x,z,h,pole,bulb,glowC,occ){B.add(G.cyl(2.6,3.4,h,6),{p:[x,0,z],c:pole,occ});B.add(G.cbox(14,5,14,1.5),{p:[x,h,z],c:pole,occ});B.add(G.cbox(10,9,10,1.5),{p:[x,h-9,z],c:bulb,m:'emit',jit:0,ao:0,occ});
    B.add(G.cone(9,7,4),{p:[x,h+5,z],r:[0,PI/4,0],c:pole,occ});if(glowC)o.glow(x,h-4,z,90,glowC)},
  fence(x0,z0,x1,z1,h,c,occ,step=20){const L=Math.hypot(x1-x0,z1-z0),n=Math.max(1,Math.round(L/step)),a=Math.atan2(z1-z0,x1-x0);
    for(let i=0;i<=n;i++){const t=i/n;B.add(G.cbox(5,h,5,1.2),{p:[x0+(x1-x0)*t,0,z0+(z1-z0)*t],r:[0,-a,0],c,occ,jit:.03});B.add(G.cone(3.6,5,4),{p:[x0+(x1-x0)*t,h,z0+(z1-z0)*t],r:[0,PI/4-a,0],c,occ})}
    for(const y of [h*.35,h*.75])B.add(G.box(L,3.4,2.4),{p:[(x0+x1)/2,y,(z0+z1)/2],r:[0,-a,0],c,occ,ao:0,jit:.02})},
  crate(x,z,s,y=0,occ,ry=0){B.add(G.cbox(s,s,s,1.4),{p:[x,y,z],r:[0,ry,0],c:'#B98A52',occ,aoY:y});for(const k of [-1,1]){B.add(G.box(s+.8,s*.16,s+.8),{p:[x,y+(k>0?s*.8:s*.04),z],r:[0,ry,0],c:'#7A5432',occ,ao:0})}},
  barrel(x,z,rd,h,y=0,occ){B.add(G.cyl(rd*.92,rd*.92,h,9),{p:[x,y,z],c:'#8E5A33',occ,aoY:y});for(const t of [.15,.82])B.add(G.cyl(rd,rd,h*.08,9),{p:[x,y+h*t,z],c:'#5B5F6B',occ,ao:0})},
  grass(n,ok,cols,hmin=6,hmax=12){for(let i=0;i<n;i++){const x=r()*W,z=r()*H;if(!ok(x,z))continue;const c=pick2(cols,r),k=2+Math.floor(r()*2);
    for(let j=0;j<k;j++){const h=hmin+r()*(hmax-hmin);B.add(G.cone(1.6,h,3),{p:[x+(r()-.5)*8,0,z+(r()-.5)*8],r:[(r()-.5)*.6,r()*PI,(r()-.5)*.6],c,m:'sway',sw:1.2,swY:0,swH:h,ao:.4,aoH:h,cast:false})}}},
  flowers(n,ok,cols){for(let i=0;i<n;i++){const x=r()*W,z=r()*H;if(!ok(x,z))continue;const h=4+r()*5;B.add(G.cyl(.6,.6,h,3),{p:[x,0,z],c:'#4E8A36',ao:0,cast:false});B.add(G.ico(2.2+r()*1.2,0),{p:[x,h+1,z],c:pick2(cols,r),jit:.04,ao:0,cast:false})}},
};return o}
const pick2=(a,Rn)=>a[Math.floor(Rn()*a.length)];

// ---------- Pintura do chão (textura em canvas, coordenadas do mundo) ----------
function paintCommon(c){return{
  checker(a,b,sz){c.fillStyle=a;c.fillRect(0,0,W,H);c.fillStyle=b;for(let i=0;i<W;i+=sz)for(let j=0;j<H;j+=sz)if(((i+j)/sz)%2===0)c.fillRect(i,j,sz,sz)},
  speck(n,cols,r0,r1,rnd,alpha=1){c.save();c.globalAlpha=alpha;for(let i=0;i<n;i++){c.fillStyle=pick2(cols,rnd);c.beginPath();c.ellipse(rnd()*W,rnd()*H,r0+rnd()*(r1-r0),(r0+rnd()*(r1-r0))*.8,rnd()*3,0,TAU);c.fill()}c.restore()},
  strokes(n,cols,len,w,rnd,alpha=.5){c.save();c.globalAlpha=alpha;c.lineCap='round';c.lineWidth=w;for(let i=0;i<n;i++){const x=rnd()*W,y=rnd()*H,a=-PI/2+(rnd()-.5)*.9;c.strokeStyle=pick2(cols,rnd);c.beginPath();c.moveTo(x,y);c.lineTo(x+Math.cos(a)*len,y+Math.sin(a)*len);c.stroke()}c.restore()},
  center(col,a1,a2){c.save();c.translate(W/2,H/2);c.globalAlpha=a1;c.strokeStyle=col;c.lineWidth=8;c.setLineDash([30,22]);c.beginPath();c.arc(0,0,300,0,TAU);c.stroke();c.setLineDash([]);
    c.font='300px "Lilita One",sans-serif';c.textAlign='center';c.textBaseline='middle';c.fillStyle=col;c.globalAlpha=a2;c.fillText('CAPY',0,0);c.restore()},
  ao(M,a=.32,blur=26){c.save();c.shadowColor=`rgba(20,12,4,${a})`;c.shadowBlur=blur*c.getTransform().a;c.fillStyle=`rgba(20,12,4,${a})`;for(const [x,y,w,h] of M.walls){c.fillRect(x+4,y+4,w-8,h-8)}c.restore()},
  blob(x,y,rx,ry,col,a=1){c.save();c.globalAlpha=a;c.fillStyle=col;c.beginPath();c.ellipse(x,y,rx,ry,0,0,TAU);c.fill();c.restore()},
  path(pts,w,col,edge){c.save();c.lineCap='round';c.lineJoin='round';if(edge){c.strokeStyle=edge;c.lineWidth=w+10;c.beginPath();pts.forEach(([x,y],i)=>i?c.lineTo(x,y):c.moveTo(x,y));c.stroke()}
    c.strokeStyle=col;c.lineWidth=w;c.beginPath();pts.forEach(([x,y],i)=>i?c.lineTo(x,y):c.moveTo(x,y));c.stroke();c.restore()},
}}

// =====================================================================
// MAPAS
// =====================================================================
// Cada mapa: luz (sol/lua, céu), chão pintado, terreno de fora, paredes (exatamente nos retângulos), borda e decoração.
const DEFS={
// ---------------------------------------------------------------- Praça Capy
praca:{dust:'#F7F3E2',bg:'#5E9A45',sun:{c:'#FFF1D2',i:2.5,d:[-.5,1,-.62]},hemi:['#D8F1FF','#5E8C3A',1.15],fill:['#FFE7C4',.35],
  paint(c,M,rnd){const p=paintCommon(c),pal=M.pal;c.fillStyle=pal.a;c.fillRect(0,0,W,H);
    c.fillStyle=pal.b;for(let i=0;i<W;i+=120)if((i/120)%2)c.fillRect(i,0,120,H); // faixas de grama cortada
    p.speck(900,['#7DB556','#95CC6A','#78AE50'],8,26,rnd,.35);p.strokes(5000,['#6FA84B','#9CD36F','#679E44'],7,2,rnd,.55);
    // caminhos de cascalho: bases -> praça central
    const gv='#E8D6A8',ge='#CDB585';p.path([[M.bases[0][0],800],[900,800]],96,gv,ge);p.path([[1500,800],[M.bases[1][0],800]],96,gv,ge);
    p.path([[1200,330],[1200,520]],80,gv,ge);p.path([[1200,1080],[1200,1270]],80,gv,ge);
    c.fillStyle=ge;c.beginPath();c.arc(W/2,H/2,346,0,TAU);c.fill();c.fillStyle=gv;c.beginPath();c.arc(W/2,H/2,338,0,TAU);c.fill();
    c.fillStyle=ge;c.beginPath();c.arc(W/2,H/2,262,0,TAU);c.fill();c.fillStyle=pal.b;c.beginPath();c.arc(W/2,H/2,254,0,TAU);c.fill();
    c.save();c.beginPath();c.arc(W/2,H/2,254,0,TAU);c.clip();p.strokes(1400,['#6FA84B','#9CD36F','#679E44'],7,2,rnd,.55);for(let k=0;k<12;k++){const a=k/12*TAU;p.blob(W/2+Math.cos(a)*210,H/2+Math.sin(a)*210,12,12,pick2(M.pal.deco,rnd),.7)}c.restore();
    for(const b of M.bases){c.fillStyle=ge;c.beginPath();c.arc(b[0],b[1],92,0,TAU);c.fill();c.fillStyle=gv;c.beginPath();c.arc(b[0],b[1],84,0,TAU);c.fill()}
    c.save();c.globalAlpha=.75;for(let i=0;i<5000;i++){const x=rnd()*W,y=rnd()*H;const rc=Math.hypot(x-W/2,y-H/2),onPath=(rc<336&&rc>264)||(Math.abs(y-800)<44&&(x<900||x>1500))||(Math.abs(x-1200)<36&&(y<520||y>1080));
      if(!onPath)continue;c.fillStyle=pick2(['#CFB988','#F8EDCF','#B89F70','#E0CB98'],rnd);c.beginPath();c.arc(x,y,1.2+rnd()*2.4,0,TAU);c.fill()}c.restore();
    // canteirinhos de flor e trevos pintados
    for(let i=0;i<70;i++){const x=rnd()*W,y=rnd()*H;if(Math.hypot(x-W/2,y-H/2)<360||Math.abs(y-800)<60)continue;c.save();c.translate(x,y);c.globalAlpha=.55;
      if(i%3===0){c.fillStyle='#5E9A3E';for(let k=0;k<6;k++){c.beginPath();c.arc(Math.cos(k)*7,Math.sin(k*1.7)*6,6,0,TAU);c.fill()}}
      else{c.fillStyle=pick2(M.pal.deco,rnd);for(let k=0;k<5;k++){const a=k/5*TAU;c.beginPath();c.arc(Math.cos(a)*4,Math.sin(a)*4,3.4,0,TAU);c.fill()}c.fillStyle='#FFC531';c.beginPath();c.arc(0,0,2,0,TAU);c.fill()}c.restore()}
    p.center('#FFFFFF',.32,.16);p.ao(M,.3,22)},
  terr:{h(x,z,d,n){return d<70?0:fbm(n,x/260,z/260)*90*smooth(120,520,d)*(z>H?.12:1)},c(x,z,h,d,n,r){if(d<70)return'#5E9A45';return h>40?pick2(['#5E9A45','#68A64B'],r):pick2(['#62A048','#6FAE4F','#5A9442'],r)}},
  wall(B,w,X){const G=lib(),o=X.o,r=B.rnd,{x,y,cx,cz,occ}=w,ww=w.w,hh=w.h;
    if(ww===64){ // cerca viva comprida
      B.add(G.cbox(ww,10,hh,3),{p:[cx,0,cz],c:'#D3C6A8',occ});B.add(jitter(G.box(ww-8,50,hh-60,2,3,12),2.4,w.i*31),{p:[cx,10,cz],c:()=>pick2(['#4F8F3A','#579A40','#478434'],r),occ,jit:.06,aoY:10,aoH:30,ao:.4});
      for(let k=0;k<7;k++)o.bush(cx+(r()-.5)*24,y+44+k*(hh-88)/6,15,'#58A040',58,occ,.8);
      for(const zz of [y+24,y+hh-24]){B.add(G.cyl(9,11,22,6),{p:[cx,10,zz],c:'#D3C6A8',occ});o.bush(cx,zz,21,'#4C9238',30,occ,.9)}}
    else if(ww===120&&hh===80){ // chafariz com estátua de capivara
      B.add(G.cbox(ww,26,hh,5),{p:[cx,0,cz],c:'#DCCFB2',occ,jit:.03});B.add(G.box(ww-14,2,hh-14),{p:[cx,18,cz],c:'#4E7F9A',occ,ao:0});
      B.add(G.plane(ww-14,hh-14,8,6),{p:[cx,21,cz],c:'#68C6E6',m:'pond',jit:.02,ao:0,occ});
      B.add(G.cyl(11,15,28,8),{p:[cx,18,cz],c:'#DCCFB2',occ});const sy=46,sc='#C9C2B2';
      B.add(G.cbox(32,17,17,4),{p:[cx-2,sy,cz],c:sc,occ});B.add(G.cbox(15,14,13,3.5),{p:[cx+15,sy+9,cz],c:sc,occ});B.add(G.box(7,6,8),{p:[cx+22,sy+10,cz],c:'#B9B2A2',occ});
      for(const s of [-1,1]){B.add(G.box(4,4,3),{p:[cx+10,sy+23,cz+s*4],c:sc,occ});B.add(G.box(5,5,5),{p:[cx-12,sy-3,cz+s*5],c:sc,occ});B.add(G.box(5,5,5),{p:[cx+8,sy-3,cz+s*5],c:sc,occ})}
      B.add(G.ico(4,0),{p:[cx+1,sy+28,cz],c:'#FF8A1F',occ,ao:0}); // tangerina na cabeça
      for(const [dx,dz] of [[-44,-24],[44,-24],[-44,24],[44,24]])B.add(G.cone(3,9,5),{p:[cx+dx*.82,20,cz+dz*.7],c:'#BFEFFF',m:'emit',occ,jit:0,ao:0})}
    else if(ww===120){ // vaso quadrado com laranjeira
      B.add(G.cbox(ww,24,hh,4),{p:[cx,0,cz],c:'#D9A26B',occ});B.add(G.box(ww-12,2,hh-12),{p:[cx,22,cz],c:'#6B4129',occ,ao:0});
      for(const s of [-1,1])o.bush(cx+s*40,cz,13,'#5DA845',24,occ,.8);
      B.add(G.cyl(4,6,34,6),{p:[cx,24,cz],c:'#7A4E2D',occ});const cr=27;B.add(jitter(G.ico(cr,1),4,w.i*7),{p:[cx,24+34+cr*.5,cz],s:[1.15,.82,.95],c:()=>pick2(['#3F9440','#4BA34A','#378A3A'],r),m:'sway',sw:1.2,swY:50,swH:40,occ});
      for(let k=0;k<9;k++){const a=r()*TAU,e=r()*.9;B.add(G.ico(3.6,0),{p:[cx+Math.cos(a)*cr*1.1*Math.cos(e),58+cr*.5+Math.sin(e)*cr*.75,cz+Math.sin(a)*cr*.9*Math.cos(e)],c:'#FF8A1F',m:'sway',sw:1.2,swY:50,swH:40,occ,ao:0,jit:.04})}}
    else{ // canteiro de flores
      B.add(G.cbox(ww,22,hh,4),{p:[cx,0,cz],c:'#DCCFB2',occ});B.add(G.box(ww-12,2,hh-12),{p:[cx,20,cz],c:'#5E3A22',occ,ao:0});
      const n=Math.round(ww/30);for(let k=0;k<n;k++){const bx=x+16+k*(ww-32)/(n-1);o.bush(bx+(r()-.5)*6,cz+(r()-.5)*6,10+r()*6,pick2(['#4E9A3A','#5DAE45','#3F8A33'],r),22,occ,.9);
        for(let f=0;f<5;f++){const fx=bx+(r()-.5)*22,fz=cz+(r()-.5)*(hh-20);B.add(G.ico(2.8,0),{p:[fx,24+r()*16,fz],c:pick2(['#FFD166','#FF8FAB','#FFFFFF','#FF6B6B','#C38BFF'],r),m:'sway',sw:.8,swY:20,swH:20,occ,ao:0,jit:.04})}}}},
  border(B,X){const G=lib(),o=X.o,r=B.rnd;
    // meio-fio de pedra + cerquinha branca (norte/leste/oeste) + cerca viva baixa (sul)
    for(const [x0,z0,w,d] of [[-26,-26,W+52,26],[-26,H,W+52,26],[-26,0,26,H],[W,0,26,H]])B.add(G.cbox(w,6,d,2),{p:[x0+w/2,0,z0+d/2],c:'#D8CDB4',jit:.03});
    o.fence(-40,-40,W+40,-40,30,'#FFFDF6');o.fence(-40,-40,-40,H+40,30,'#FFFDF6');o.fence(W+40,-40,W+40,H+40,30,'#FFFDF6');
    for(let x=-30;x<W+40;x+=46)o.bush(x,H+44,13,pick2(['#4E9A3A','#5DAE45'],r),0,undefined,.6);
    for(const [x,z] of [[-70,-70],[W+70,-70],[-70,H/2],[W+70,H/2],[600,-70],[1200,-70],[1800,-70],[-70,400],[W+70,400],[-70,1200],[W+70,1200]])o.lamp(x,z,96,'#2F4A3A','#FFF3C4');},
  decor(B,X,M){const o=X.o,r=B.rnd,G=lib();const ok=(x,z,m=14)=>!hitWall(M,x,z,m)&&Math.abs(Math.hypot(x-W/2,z-H/2)-300)>50&&Math.abs(z-800)>56&&!M.bases.some(b=>Math.hypot(x-b[0],z-b[1])<100);
    o.grass(Math.round(1400*X.q.den),ok,['#6FAE45','#5E9A3E','#86C45C','#79B850']);o.flowers(Math.round(260*X.q.den),ok,['#FFD166','#FF8FAB','#FFFFFF','#FF6B6B','#C38BFF']);
    // árvores e bancos fora da arena
    for(let i=0;i<120;i++){const x=-700+r()*(W+1400),z=-700+r()*(H+900);const d=outD(x,z);if(d<95||z>H+60)continue;(r()<.7?o.tree:o.pine)(x,z,.9+r()*.6)}
    for(let i=0;i<40;i++){const x=-500+r()*(W+1000),z=H+90+r()*400;o.bush(x,z,10+r()*8,pick2(['#4E9A3A','#5DAE45','#3F8A33'],r),0,undefined,.6)}
    for(const [x,z] of [[300,-90],[900,-90],[1500,-90],[2100,-90]]){B.add(G.cbox(70,5,16,1.5),{p:[x,12,z],c:'#B5773E'});B.add(G.cbox(70,14,4,1.5),{p:[x,15,z-8],c:'#B5773E'});for(const s of [-1,1])B.add(G.box(4,12,14),{p:[x+s*30,0,z],c:'#3A3A46'})}},
  mats(q){return{pond:stdMat(q,{std:{roughness:.18,metalness:.1}},{v:'transformed.y+=sin(uTime*3.0+position.x*.25)*cos(uTime*2.3+position.z*.3)*.8;',f:'gl_FragColor.rgb+=vec3(.08,.12,.14)*(.5+.5*sin(uTime*2.0+vWP.x*.3+vWP.z*.2));',key:'pond'})}}},

// ---------------------------------------------------------------- Lagoa da Noite
lagoa:{dust:'#9DB2D8',bg:'#07101F',sun:{c:'#A8C2FF',i:1.75,d:[-.55,1,-.45]},hemi:['#5A7AC0','#14203A',1.05],fill:['#6A80C8',.35],dark:[[4,6,18],.68],plC:'#FFD39A',
  paint(c,M,rnd){const p=paintCommon(c),pal=M.pal;p.checker(pal.a,pal.b,64);p.speck(1400,['#1E3050','#152440','#22385E','#1A2C4E'],10,40,rnd,.45);
    p.strokes(3000,['#2A4A5A','#1F3A4A','#2E5A55'],6,2,rnd,.5);
    // musgo e poças
    for(let i=0;i<40;i++){const x=rnd()*W,y=rnd()*H;if(hitWall(M,x,y,30))continue;p.blob(x,y,30+rnd()*50,18+rnd()*30,'#24414A',.45)}
    for(let i=0;i<14;i++){const x=rnd()*W,y=rnd()*H;if(hitWall(M,x,y,50))continue;const rx=26+rnd()*30;p.blob(x,y,rx,rx*.6,'#0B1A33',.9);p.blob(x-rx*.25,y-rx*.15,rx*.5,rx*.22,'#3F6FA8',.25)}
    // trilha de pedras chatas
    for(let i=0;i<46;i++){const t=i/45,x=M.bases[0][0]+(M.bases[1][0]-M.bases[0][0])*t,y=800+Math.sin(t*PI*3)*140;if(Math.hypot(x-W/2,y-H/2)<330)continue;
      c.save();c.translate(x+(rnd()-.5)*20,y+(rnd()-.5)*20);c.rotate(rnd()*3);c.fillStyle='#0A1428';c.beginPath();c.ellipse(2,3,22,15,0,0,TAU);c.fill();c.fillStyle=pick2(['#3A4A63','#445570','#33425A'],rnd);c.beginPath();c.ellipse(0,0,21,14,0,0,TAU);c.fill();c.restore()}
    for(let i=0;i<260;i++){c.fillStyle=pick2(['#7DF9FF','#C3A6FF','#FFF3B0'],rnd);c.globalAlpha=.35;c.beginPath();c.arc(rnd()*W,rnd()*H,1.6,0,TAU);c.fill()}c.globalAlpha=1;
    p.center('#BFD6FF',.2,.1);p.ao(M,.45,28)},
  terr:{wl:-6,h(x,z,d,n){if(z<0)return smooth(40,260,d)*(40+fbm(n,x/200,z/200)*80)-4*smooth(0,40,d);return -Math.min(d,90)*.32-fbm(n,x/150,z/150)*6*smooth(20,80,d)},
    c(x,z,h,d,n,r){return h>-3?pick2(['#1C3A2A','#22432F','#18321F'],r):h>-8?'#2A3A3A':'#16202E'}},
  wall(B,w,X){const G=lib(),o=X.o,r=B.rnd,{x,y,cx,cz,occ}=w,ww=w.w,hh=w.h,rockC=()=>pick2(['#4A5566','#535F72','#434D5D'],r),moss=()=>pick2(['#3E5C3A','#4C7040','#365234'],r);
    const shroom=(sx,sz,sy,s,col)=>{B.add(G.cyl(s*.35,s*.45,s*1.2,5),{p:[sx,sy,sz],c:'#D8D2C2',occ,ao:0});B.add(G.cone(s,s*.8,6),{p:[sx,sy+s*1.1,sz],c:col,m:'emit',occ,jit:0,ao:0});o.glow(sx,sy+s,sz,s*9,col)};
    if(ww===180){ // tronco caído e oco
      B.add(G.slab(ww,8,hh,w.i,2,2),{p:[cx,0,cz],c:'#2B2620',occ});B.add(jitter(new T.CylinderGeometry(31,33,ww-6,9,4),1.6,w.i).rotateZ(PI/2),{p:[cx,34,cz],c:()=>pick2(['#5A3E2B','#4E3424','#664631'],r),occ,aoY:4,aoH:40});
      for(const s of [-1,1])B.add(new T.CylinderGeometry(27,27,3,9).rotateZ(PI/2),{p:[cx+s*(ww/2-2),34,cz],c:'#A8865E',occ,ao:0});
      for(let k=0;k<6;k++)B.add(jitter(G.ico(12,1),2,k+w.i),{p:[x+20+r()*(ww-40),58,cz+(r()-.5)*24],s:[1.4,.45,1],c:moss,occ,ao:0});
      for(let k=0;k<5;k++)shroom(x+15+r()*(ww-30),y+hh-6,4+r()*40,4+r()*3,pick2(['#7DF9FF','#C3A6FF'],r))}
    else if(ww===80){ // lanterna de pedra (tōrō)
      const st='#6E7A86',sd='#59636E';B.add(G.cbox(80,12,80,3),{p:[cx,0,cz],c:st,occ});B.add(G.cbox(52,8,52,2),{p:[cx,12,cz],c:st,occ});B.add(G.cyl(11,13,30,6),{p:[cx,20,cz],c:st,occ});
      B.add(G.cbox(40,6,40,2),{p:[cx,50,cz],c:st,occ});B.add(G.cbox(28,26,28,1),{p:[cx,56,cz],c:'#FFD98A',m:'emit',occ,jit:0,ao:0});for(const [dx,dz] of [[-15,-15],[15,-15],[-15,15],[15,15]])B.add(G.box(5,26,5),{p:[cx+dx,56,cz+dz],c:sd,occ});
      B.add(G.box(30,4,30),{p:[cx,82,cz],c:sd,occ});B.add(G.cone(24,16,4),{p:[cx,86,cz],r:[0,PI/4,0],c:sd,occ});B.add(G.ico(4,0),{p:[cx,103,cz],c:sd,occ});
      B.add(G.box(16,10,1),{p:[cx,64,cz+15],c:'#FFF2C8',m:'emit',occ,jit:0,ao:0,cast:false});o.glow(cx,110,cz+10,190,'#FFB45A');o.glow(cx,110,cz+10,80,'#FFE2A8');o.glow(cx,1,cz+30,200,'#FFB45A');
      for(let k=0;k<4;k++)o.bush(x+8+r()*(ww-16),y+hh-8,7,moss(),0,occ,.6)}
    else{ // muralha de pedras com musgo, samambaias e cogumelos que brilham
      const hgt=ww===70&&hh===200?36:44;B.add(G.slab(ww,hgt,hh,w.i*13,3.5,5),{p:[cx,0,cz],c:rockC,occ,jit:.08,ao:.38,aoH:20});B.add(G.slab(ww-10,6,hh-10,w.i*7,3,2),{p:[cx,hgt-2,cz],c:moss,occ,ao:0});
      const n=Math.round(hh/70);for(let k=0;k<n;k++){const s=26+r()*14;B.add(G.rock(s*1.1,s,s,w.i*100+k),{p:[cx+(r()-.5)*(ww-s),hgt-6,y+s/2+4+k*(hh-s-8)/Math.max(1,n-1)],r:[0,r()*PI,0],c:rockC,occ,aoY:hgt})}
      if(ww===70&&hh===200){for(let k=0;k<7;k++){const tx=cx+(r()-.5)*40,tz=y+20+r()*(hh-40),th=56+r()*30;B.add(G.cyl(1.4,1.8,th,4),{p:[tx,hgt,tz],c:'#4F6B3A',m:'sway',sw:2,swY:hgt,swH:th,occ,ao:0});
        B.add(G.cyl(3.2,3.2,12,6),{p:[tx,hgt+th-14,tz],c:'#6B4A2E',m:'sway',sw:2,swY:hgt,swH:th,occ,ao:0})}}
      for(let k=0;k<Math.round(hh/45);k++){const fx=x+6+r()*(ww-12);B.add(G.leaf(18,4,.6),{p:[fx,hgt+2,y+r()*hh],r:[0,r()*TAU,0],c:'#3F7A4A',m:'sway',sw:1.5,swY:hgt,swH:20,occ,ao:0})}
      for(let k=0;k<Math.round(hh/60);k++)shroom(x+6+r()*(ww-12),y+hh-5,1+r()*8,3+r()*3,pick2(['#7DF9FF','#C3A6FF','#9CFFB0'],r))}},
  border(B,X,M){const o=X.o,r=B.rnd,G=lib();
    for(let x=-30;x<W+40;x+=26){B.add(G.rock(22+r()*14,10+r()*8,18+r()*8,Math.floor(r()*1e6)),{p:[x,-6,-14-r()*10],c:pick2(['#3A4556','#434F62'],r)});B.add(G.rock(20+r()*12,8+r()*6,16+r()*8,Math.floor(r()*1e6)),{p:[x,-6,H+14+r()*8],c:pick2(['#3A4556','#434F62'],r)})}
    for(let z=-10;z<H+20;z+=26)for(const xx of [-14-r()*8,W+14+r()*8])B.add(G.rock(18+r()*12,9+r()*7,22+r()*10,Math.floor(r()*1e6)),{p:[xx,-6,z],c:pick2(['#3A4556','#434F62'],r)});
    // juncos na margem
    for(let i=0;i<260;i++){const t=r();let x,z;const s=Math.floor(r()*3);if(s===0){x=t*W;z=H+30+r()*40}else if(s===1){x=-30-r()*50;z=t*H}else{x=W+30+r()*50;z=t*H}
      const th=22+r()*34;B.add(G.cyl(1.1,1.5,th,4),{p:[x,-6,z],c:pick2(['#4F6B3A','#5E7A44'],r),m:'sway',sw:2,swY:-6,swH:th,ao:0,cast:false});if(r()<.4)B.add(G.cyl(2.6,2.6,8,5),{p:[x,th-14,z],c:'#5A3E28',m:'sway',sw:2,swY:-6,swH:th,ao:0,cast:false})}
    // vitórias-régias e flores que brilham
    for(let i=0;i<120;i++){const x=-500+r()*(W+1000),z=-200+r()*(H+700);const d=outD(x,z);if(d<60||(z<0&&d>30))continue;const rd=9+r()*10;B.add(new T.CircleGeometry(rd,7,.4,TAU-.5).rotateX(-PI/2),{p:[x,-5.4,z],r:[0,r()*TAU,0],c:pick2(['#2E6B3E','#357A45','#28603A'],r),ao:0,cast:false});
      if(r()<.3){const c=pick2(['#FF9BD5','#C3A6FF','#FFF3B0'],r);B.add(G.cone(3.4,4,6),{p:[x,-4.5,z],c,m:'emit',ao:0,jit:0});o.glow(x,-3,z,36,c)}}
    // pinheiros no barranco do norte
    for(let i=0;i<110;i++){const x=-700+r()*(W+1400),z=-80-r()*650;if(outD(x,z)<70)continue;o.pine(x,z,1+r()*.7,undefined,['#183528','#1F4030','#14301F'])}
    for(const [x,z] of [[400,-60],[1200,-60],[2000,-60]]){o.lamp(x,z,70,'#2A2A33','#FFD98A','#FFB45A')}},
  decor(B,X,M){const o=X.o,r=B.rnd,G=lib(),ok=(x,z)=>!hitWall(M,x,z,12);o.grass(Math.round(900*X.q.den),ok,['#24474A','#2C5A4E','#1E3E40'],6,13);
    for(let i=0;i<Math.round(60*X.q.den);i++){const x=r()*W,z=r()*H;if(!ok(x,z))continue;const c=pick2(['#7DF9FF','#C3A6FF','#9CFFB0'],r),s=1.6+r()*1.4;B.add(G.cyl(s*.3,s*.4,s,4),{p:[x,0,z],c:'#D8D2C2',ao:0,cast:false});B.add(G.cone(s,s*.7,5),{p:[x,s,z],c,m:'emit',ao:0,jit:0});o.glow(x,s,z,s*12,c)}},
  extra(grp,X){grp.add(fireflies(X,260,['#E8FF8A','#B8FFF0','#FFF3B0']))},
  mats(q){return{water:stdMat(q,{std:{roughness:.12,metalness:.25},lam:{}},{v:'float wv=sin(position.x*.02+uTime*.9)*cos(position.z*.024+uTime*.7)*aSw+sin((position.x-position.z)*.05+uTime*1.6)*aSw*.4;transformed.y+=wv;vH=wv;',
    f:'gl_FragColor.rgb+=vec3(.25,.35,.55)*smoothstep(1.2,2.4,vH)*.5;',key:'lake'})}}},

// ---------------------------------------------------------------- Labirinto de Tijolo
labirinto:{dust:'#FFF8EC',bg:'#A89167',sun:{c:'#FFE4BC',i:2.6,d:[-.6,1,-.5]},hemi:['#FFF2DC','#B48A5C',1.0],fill:['#FFD9B0',.35],
  paint(c,M,rnd){const p=paintCommon(c),pal=M.pal;c.fillStyle='#CDB48A';c.fillRect(0,0,W,H);
    // lajotas grandes, fileiras desencontradas
    const s=80;for(let j=0;j<H/s+1;j++)for(let i=-1;i<W/s+1;i++){const x=i*s+(j%2)*s/2,y=j*s;c.fillStyle=pick2([pal.a,pal.b,'#EADAB8','#E2CDA6','#F1E3C6'],rnd);rr(c,x+3,y+3,s-6,s-6,6);c.fill();
      c.fillStyle='rgba(255,255,255,.18)';c.fillRect(x+6,y+5,s-12,3);c.fillStyle='rgba(120,90,50,.12)';c.fillRect(x+6,y+s-8,s-12,3);
      if(rnd()<.12){c.strokeStyle='rgba(110,80,45,.35)';c.lineWidth=1.6;c.beginPath();let cx=x+10+rnd()*(s-20),cy=y+8;c.moveTo(cx,cy);for(let k=0;k<4;k++){cx+=(rnd()-.5)*24;cy+=12+rnd()*8;c.lineTo(cx,cy)}c.stroke()}
      if(rnd()<.18){c.fillStyle='rgba(110,150,70,.55)';c.fillRect(x+rnd()*s,y-2,10+rnd()*20,4)}}
    // mosaico do centro
    c.save();c.translate(W/2,H/2);for(const [r0,col] of [[330,'#B8573A'],[318,'#F1E3C6'],[300,'#D2603F'],[288,'#EFE0C2']]){c.fillStyle=col;c.beginPath();c.arc(0,0,r0,0,TAU);c.fill()}
    for(let k=0;k<24;k++){c.rotate(TAU/24);c.fillStyle=k%2?'#E5D2AE':'#EADAB8';c.beginPath();c.moveTo(0,0);c.arc(0,0,288,0,TAU/24);c.fill()}c.restore();
    for(let i=0;i<300;i++){const x=rnd()*W,y=rnd()*H;c.save();c.translate(x,y);c.rotate(rnd()*6);c.fillStyle=pick2(['#9C7A3A','#B58B3E','#7FA04A'],rnd);c.globalAlpha=.5;c.beginPath();c.ellipse(0,0,5,2.6,0,0,TAU);c.fill();c.restore()}
    p.center('#FFFFFF',.35,.2);p.ao(M,.4,24)},
  terr:{h(x,z,d,n){return d<110?0:fbm(n,x/240,z/240)*80*smooth(150,500,d)*(z>H?.1:1)},c(x,z,h,d,n,r){return d<110?pick2(['#CDB48A','#C4A97C'],r):pick2(['#8FAE5A','#9DB86A','#86A353'],r)}},
  wall(B,w,X){const G=lib(),o=X.o,r=B.rnd,{x,y,cx,cz,occ}=w,ww=w.w,hh=w.h,H0=70;
    const vert=hh>ww,L=vert?hh:ww,th=vert?ww:hh,tile=()=>pick2(['#C4532F','#B84A2A','#CF6038','#BC5030'],r);
    B.add(G.box(ww,H0,hh,Math.max(1,Math.round(ww/56)),2,Math.max(1,Math.round(hh/56))),{p:[cx,0,cz],c:'#F2E2D6',m:'brick',uv:112,occ,jit:.02,ao:.35,aoH:24});
    // faixa de pedra + telhado de telhas em duas águas
    B.add(G.cbox(ww+6,5,hh+6,1.5),{p:[cx,H0,cz],c:'#E9D7B5',occ,jit:.03,ao:0});
    B.add(G.ridge(L+4,th+10,Math.min(20,th*.32),Math.max(1,Math.round(L/16))),{p:[cx,H0+5,cz],r:[0,vert?0:PI/2,0],c:tile,occ,jit:.08,ao:0});
    // pilares de tijolo nas pontas (e a cada ~220 nos muros longos), com chapéu de pedra
    const n=Math.max(1,Math.round(L/220));
    for(let k=0;k<=n;k++){const t=k/n,ps=Math.min(th,70)+10,px=vert?cx:x+Math.min(Math.max(t*ww,ps/2-5),ww-ps/2+5),pz=vert?y+Math.min(Math.max(t*hh,ps/2-5),hh-ps/2+5):cz;
      B.add(G.box(ps,H0+16,ps),{p:[px,0,pz],c:'#F2E2D6',m:'brick',uv:112,occ,jit:.02,ao:.35,aoH:24});B.add(G.cbox(ps+8,7,ps+8,2.5),{p:[px,H0+16,pz],c:'#E9D7B5',occ});
      if(r()<.55)B.add(G.cone(ps*.42,ps*.4,4),{p:[px,H0+23,pz],r:[0,PI/4,0],c:'#D9C29A',occ});
      else{B.add(G.cyl(9,7,13,7),{p:[px,H0+23,pz],c:'#C96A3E',occ});o.bush(px,pz,10,'#5E9A3E',H0+34,occ,.7);for(let f=0;f<3;f++)B.add(G.ico(2.6,0),{p:[px+(r()-.5)*12,H0+44+r()*4,pz+(r()-.5)*10],c:pick2(['#FF6B6B','#FFD166','#FF8FAB','#FFFFFF'],r),occ,ao:0})}}
    // hera escorrendo pela frente e por cima
    const nv=Math.round(L/80);for(let k=0;k<nv;k++){if(vert&&r()<.6)continue;const vx=vert?cx+(r()-.5)*ww*.5:x+20+r()*(ww-40),vz=y+hh+1.5,vh=24+r()*44;
      for(let j=0;j<6;j++)B.add(G.ico(5+r()*4,0),{p:[vx+(r()-.5)*16,H0+2-j*vh/6,vz+r()*2],s:[1,1,.45],c:pick2(['#5E9A3E','#4C8A36','#6FAE45','#3F7A30'],r),m:'sway',sw:.6,swY:0,swH:80,occ,ao:0,jit:.08})}},
  border(B,X){const G=lib(),o=X.o,r=B.rnd;
    const wall=(x0,z0,w,d,h)=>{B.add(G.box(w,h,d,Math.max(1,Math.round(w/56)),2,Math.max(1,Math.round(d/56))),{p:[x0+w/2,0,z0+d/2],c:'#F2E2D6',m:'brick',uv:112,jit:.02,ao:.35,aoH:24});B.add(G.cbox(w+6,5,d+6,1.5),{p:[x0+w/2,h,z0+d/2],c:'#E9D7B5',ao:0});
      const vt=d>w;B.add(G.ridge((vt?d:w)+4,(vt?w:d)+10,14,Math.round((vt?d:w)/16)),{p:[x0+w/2,h+5,z0+d/2],r:[0,vt?0:PI/2,0],c:()=>pick2(['#C4532F','#B84A2A','#CF6038'],r),jit:.08,ao:0})};
    wall(-40,-44,W+80,44,96);wall(-44,-40,44,H+80,84);wall(W,-40,44,H+80,84);wall(-40,H+4,W+80,36,18);
    for(let x=0;x<=W;x+=300){B.add(G.box(60,124,56),{p:[x,0,-24],c:'#F2E2D6',m:'brick',uv:112});B.add(G.cbox(68,8,64,2.5),{p:[x,124,-24],c:'#E9D7B5'});B.add(G.cone(30,26,4),{p:[x,132,-24],r:[0,PI/4,0],c:'#C4532F'});o.lamp(x+30,-60,110,'#3A2E2A','#FFE9B0')}
    for(let i=0;i<70;i++){const x=-600+r()*(W+1200),z=-120-r()*560;o.cypress(x,z,.9+r()*.5)}
    for(let i=0;i<50;i++){const x=r()<.5?-110-r()*500:W+110+r()*500,z=-100+r()*(H+150);(r()<.5?o.cypress:o.tree)(x,z,.9+r()*.4)}
    for(let i=0;i<30;i++)o.bush(-500+r()*(W+1000),H+70+r()*300,12+r()*8,pick2(['#6FAE45','#5E9A3E'],r),0,undefined,.6)},
  decor(B,X,M){const o=X.o,r=B.rnd,G=lib();const ok=(x,z)=>!hitWall(M,x,z,14)&&Math.hypot(x-W/2,z-H/2)>340;
    o.grass(Math.round(260*X.q.den),ok,['#8FB85A','#7FA04A','#9DC46A'],4,9);
    for(let i=0;i<Math.round(40*X.q.den);i++){const x=r()*W,z=r()*H;if(!ok(x,z))continue;B.add(G.rock(5+r()*5,3+r()*3,5+r()*4,i),{p:[x,0,z],c:pick2(['#D9C29A','#C4A97C','#E5D2AE'],r),cast:false})}},
  mats(q,X){const tex=brickTex();X.texs.push(tex);return{brick:stdMat(q,{both:{map:tex}},{key:'brick'})}}},

// ---------------------------------------------------------------- Capy Neon
neon:{dust:'#A796E0',bg:'#07040F',sun:{c:'#9C8CFF',i:.75,d:[-.4,1,-.55]},hemi:['#4A3790','#0A0718',.7],fill:['#FF4F9A',.18],dark:[[8,4,20],.5],plC:'#FFC2E8',
  paint(c,M,rnd){const p=paintCommon(c),pal=M.pal;c.fillStyle='#120D24';c.fillRect(0,0,W,H);p.speck(9000,['#1A1430','#0E0A1E','#1F1838'],1,3,rnd,.8);
    // calçadas ao redor dos prédios
    c.fillStyle='#211A3E';for(const [x,y,w,h] of M.walls){rr(c,x-26,y-26,w+52,h+52,12);c.fill()}c.strokeStyle='#352B5E';c.lineWidth=3;for(const [x,y,w,h] of M.walls){rr(c,x-26,y-26,w+52,h+52,12);c.stroke()}
    c.strokeStyle=pal.line;c.lineWidth=2;for(let i=0;i<=W;i+=128){c.beginPath();c.moveTo(i,0);c.lineTo(i,H);c.stroke()}for(let j=0;j<=H;j+=128){c.beginPath();c.moveTo(0,j);c.lineTo(W,j);c.stroke()}
    // faixas de pedestre e bueiros
    c.fillStyle='rgba(230,220,255,.16)';for(const [x0,y0,vert] of [[1150,560,0],[1150,1000,0],[680,700,1],[1660,700,1]])for(let k=0;k<6;k++){if(vert)c.fillRect(x0,y0+k*34,60,18);else c.fillRect(x0+k*18*1.9,y0,18,40)}
    for(let i=0;i<10;i++){const x=rnd()*W,y=rnd()*H;if(hitWall(M,x,y,40))continue;p.blob(x,y,16,16,'#2A2448');c.strokeStyle='#3A3260';c.lineWidth=2;for(let k=-8;k<=8;k+=5){c.beginPath();c.moveTo(x-12,y+k);c.lineTo(x+12,y+k);c.stroke()}}
    for(let i=0;i<22;i++){const x=rnd()*W,y=rnd()*H;if(hitWall(M,x,y,30))continue;const rx=30+rnd()*50;p.blob(x,y,rx,rx*.55,'#0A0716',.9)}
    p.ao(M,.5,30)},
  paintEm(c,M,rnd){c.fillStyle='#000';c.fillRect(0,0,W,H);const pal=M.pal;c.save();c.globalCompositeOperation='lighter';
    for(const [x,y,w,h] of M.walls){const col=x<W/2?pal.glow:pal.glow2,g=c.createRadialGradient(x+w/2,y+h/2,0,x+w/2,y+h/2,Math.max(w,h)*.9+90);g.addColorStop(0,col+'66');g.addColorStop(1,col+'00');c.fillStyle=g;c.fillRect(x-200,y-200,w+400,h+400)}
    c.strokeStyle='#4A3A9A';c.lineWidth=2.4;c.globalAlpha=.55;for(let i=0;i<=W;i+=128){c.beginPath();c.moveTo(i,0);c.lineTo(i,H);c.stroke()}for(let j=0;j<=H;j+=128){c.beginPath();c.moveTo(0,j);c.lineTo(W,j);c.stroke()}c.globalAlpha=1;
    // poças refletindo neon
    for(let i=0;i<26;i++){const x=rnd()*W,y=rnd()*H;if(hitWall(M,x,y,30))continue;const rx=30+rnd()*50,col=pick2([pal.glow,pal.glow2,'#FFC531'],rnd),g=c.createRadialGradient(x,y,0,x,y,rx);g.addColorStop(0,col+'55');g.addColorStop(1,col+'00');c.fillStyle=g;c.beginPath();c.ellipse(x,y,rx,rx*.55,0,0,TAU);c.fill()}
    c.translate(W/2,H/2);c.strokeStyle=pal.glow;c.lineWidth=7;c.setLineDash([30,22]);c.globalAlpha=.6;c.beginPath();c.arc(0,0,300,0,TAU);c.stroke();c.setLineDash([]);
    c.font='300px "Lilita One",sans-serif';c.textAlign='center';c.textBaseline='middle';c.globalAlpha=.16;c.fillStyle=pal.glow2;c.fillText('CAPY',0,0);c.restore()},
  terr:{h(){return 0},c(x,z,h,d,n,r){return d<60?'#1A1430':((Math.floor(x/160)+Math.floor(z/160))%5===0?'#221A3C':pick2(['#141026','#17122C'],r))}},
  wall(B,w,X){const G=lib(),o=X.o,r=B.rnd,{x,y,cx,cz,occ}=w,ww=w.w,hh=w.h,M=X.M,glow=x<W/2?M.pal.glow:M.pal.glow2,glow2=x<W/2?M.pal.glow2:M.pal.glow;
    const bh=ww===140?124:ww===90?150:ww===100&&hh===200?92:58;const body=pick2(['#251B4C','#2B2056','#211846'],r);
    const windows=(h0,h1)=>{const cols=Math.max(2,Math.floor((ww-16)/18)),rows=Math.floor((h1-h0)/20);for(let i=0;i<cols;i++)for(let j=0;j<rows;j++){const lit=r()<.62,c=lit?pick2(['#FFD58A','#7FE9FF','#FF9BD5','#FFF3D6'],r):'#30285A';
        B.add(G.box(10,11,1.4),{p:[x+12+i*(ww-24)/(cols-1),h0+6+j*20,y+hh+.7],c,m:lit?'neon':'std',ph:r(),jit:lit?0:.05,ao:0,occ,cast:false})}};
    if(hh!==200&&bh>=120){ // prédio
      B.add(G.cbox(ww,bh,hh,3),{p:[cx,0,cz],c:body,occ,jit:.04,ao:.3,aoH:30});B.add(G.box(ww+4,4,hh+4),{p:[cx,bh*.33,cz],c:'#1A1238',occ,ao:0});
      windows(14,bh-24);B.add(G.cbox(ww+6,6,hh+6,2),{p:[cx,bh,cz],c:'#3A2E6A',occ});
      // neon no contorno do telhado
      for(const [px,pz,sw,sd] of [[cx,y-1,ww+6,3],[cx,y+hh+1,ww+6,3],[x-1,cz,3,hh+6],[x+ww+1,cz,3,hh+6]])B.add(G.box(sw,3,sd),{p:[px,bh+6,pz],c:glow,m:'neon',ph:w.i*.37,occ,jit:0,ao:0});
      o.glow(cx,bh+8,cz,Math.max(ww,hh)*1.8,glow);
      // telhado: ar-condicionado, caixa d'água, antena
      for(let k=0;k<3;k++)B.add(G.cbox(18+r()*10,10,14+r()*8,2),{p:[x+20+r()*(ww-40),bh+6,y+20+r()*(hh-40)],c:'#4A4466',occ});
      B.add(G.cyl(12,12,18,8),{p:[x+ww-24,bh+6,y+24],c:'#5A5480',occ});B.add(G.cone(13,8,8),{p:[x+ww-24,bh+24,y+24],c:'#3A3460',occ});
      B.add(G.cyl(1.4,1.8,40,4),{p:[x+22,bh+6,y+hh-26],c:'#8A93A6',occ});B.add(G.ico(3.4,0),{p:[x+22,bh+48,y+hh-26],c:'#FF3B47',m:'neon',ph:.3,occ,jit:0,ao:0});o.glow(x+22,bh+48,y+hh-26,40,'#FF3B47');
      // letreiro no telhado (vira de frente para a câmera)
      X.sign(cx,bh+10,y+hh*.55,Math.min(ww-10,120),34,pick2(['67','CAPY','BOOM','PEW!','LOJA'],r),glow,occ)}
    else if(hh===200){ // centro: base + capivara holográfica
      B.add(G.cbox(ww,bh,hh,4),{p:[cx,0,cz],c:body,occ,jit:.04,ao:.3,aoH:30});windows(12,bh-18);B.add(G.cbox(ww+8,8,hh+8,2),{p:[cx,bh,cz],c:'#3A2E6A',occ});
      for(const [px,pz,sw,sd] of [[cx,y-1,ww+8,3],[cx,y+hh+1,ww+8,3],[x-1,cz,3,hh+8],[x+ww+1,cz,3,hh+8]])B.add(G.box(sw,3,sd),{p:[px,bh+8,pz],c:'#FFC531',m:'neon',ph:.1,occ,jit:0,ao:0});
      B.add(G.cyl(34,40,8,10),{p:[cx,bh+8,cz],c:'#45D4FF',m:'neon',ph:.6,occ,jit:0,ao:0});o.glow(cx,bh+16,cz,260,'#45D4FF');X.holo(cx,bh+16,cz,occ)}
    else{ // quiosque de lanche com toldo listrado
      B.add(G.cbox(ww,bh,hh,3),{p:[cx,0,cz],c:'#2E2458',occ});B.add(G.box(ww-16,24,1.6),{p:[cx,14,y+hh+.8],c:'#FFD58A',m:'neon',ph:.2,occ,jit:0,ao:0,cast:false});
      for(let k=0;k<6;k++)B.add(G.box(ww/6+.5,3,hh*.62),{p:[x+ww/12+k*ww/6,bh+2,y+hh*.69],r:[-.32,0,0],c:k%2?glow:'#FFF4E0',m:k%2?'neon':'std',ph:.4,occ,jit:0,ao:0});
      X.sign(cx,bh+6,y+hh*.25,ww-6,26,'LANCHE',glow2,occ);o.glow(cx,bh,cz+30,160,glow)}},
  border(B,X){const G=lib(),o=X.o,r=B.rnd,pal=X.M.pal;
    for(const [x0,z0,w,d,c] of [[-30,-30,W+60,22,pal.glow],[-30,H+8,W+60,22,pal.glow2],[-30,-8,22,H+16,pal.glow],[W+8,-8,22,H+16,pal.glow2]]){B.add(G.cbox(w,26,d,4),{p:[x0+w/2,0,z0+d/2],c:'#2A2448'});B.add(G.box(w>d?w:4,4,w>d?4:d),{p:[x0+w/2,26,z0+d/2],c,m:'neon',ph:.5,jit:0,ao:0})}
    // cidade em volta
    const city=(x,z,w,d,h)=>{B.add(G.cbox(w,h,d,3),{p:[x,0,z],c:pick2(['#1E163E','#241A4A','#1A1236'],r),jit:.04});const cols=Math.floor(w/22),rows=Math.floor(h/24);for(let i=0;i<cols;i++)for(let j=0;j<rows;j++){if(r()<.45)continue;
        B.add(G.box(11,12,1.4),{p:[x-w/2+14+i*(w-28)/Math.max(1,cols-1),10+j*24,z+d/2+.7],c:pick2(['#FFD58A','#7FE9FF','#FF9BD5','#B99BFF'],r),m:'neon',ph:r(),jit:0,ao:0,cast:false})}
      B.add(G.box(w*.7,4,4),{p:[x,h+2,z+d/2-3],c:pick2([pal.glow,pal.glow2,'#FFC531'],r),m:'neon',ph:r(),jit:0,ao:0})};
    for(let x=-500;x<W+500;x+=150+r()*60)city(x,-150-r()*80,110+r()*50,90+r()*40,180+r()*320);
    for(let x=-500;x<W+500;x+=170+r()*80)city(x,-430-r()*80,120+r()*60,100,300+r()*420);
    for(let z=60;z<H;z+=190+r()*60){city(-160-r()*60,z,100+r()*40,110+r()*40,120+r()*200);city(W+160+r()*60,z,100+r()*40,110+r()*40,120+r()*200)}
    for(let x=0;x<=W;x+=240){o.lamp(x,-50,90,'#2A2448','#FFE6F5','#FF4F9A');o.lamp(x+120,H+55,24,'#2A2448','#BFF6FF','#45D4FF')}},
  decor(B,X,M){},
  extra(grp,X){},
  mats(q){return{}}},

// ---------------------------------------------------------------- Fortaleza
fortaleza:{dust:'#FFF8E8',bg:'#D9B271',sun:{c:'#FFEBC8',i:2.8,d:[-.42,1,-.6]},hemi:['#FFF3D9','#D9A66B',1.0],fill:['#FFD7A0',.35],
  paint(c,M,rnd){const p=paintCommon(c),pal=M.pal;c.fillStyle=pal.a;c.fillRect(0,0,W,H);p.speck(700,['#E3C281','#F2DCA8','#E8C98A'],20,70,rnd,.45);
    c.save();c.strokeStyle=pal.line;c.globalAlpha=.45;c.lineWidth=3;for(let j=-40;j<H+40;j+=26){c.beginPath();for(let x=0;x<=W;x+=20)c.lineTo(x,j+Math.sin(x/90+j*.7)*8+Math.sin(x/37)*2);c.stroke()}c.restore();
    p.speck(2600,['#C9A56B','#B8915A','#F7E6BC'],1,3,rnd,.7);
    // pátios de pedra dentro das fortalezas
    for(const s of [0,1]){const x0=s?W-430:120,x1=s?W-120:430;c.save();c.beginPath();c.rect(x0+10,560+10,x1-x0-20,480);c.clip();for(let j=560;j<1040;j+=44)for(let i=x0;i<x1;i+=60){c.fillStyle=pick2(['#CDB088','#D9BE96','#C2A27A','#E0C8A2'],rnd);rr(c,i+(j/44%2)*30+2,j+2,56,40,5);c.fill()}c.restore()}
    for(const b of M.bases){c.strokeStyle='#A88A6A';c.lineWidth=6;c.beginPath();c.arc(b[0],b[1],70,0,TAU);c.stroke()}
    for(let i=0;i<30;i++){const x=rnd()*W,y=rnd()*H;p.blob(x,y,40+rnd()*60,20+rnd()*30,'#C9A56B',.25)}
    p.center('#FFFFFF',.3,.15);p.ao(M,.35,24)},
  terr:{h(x,z,d,n){const r=1-Math.abs(fbm(n,x/320,z/320)*2-1);return d<70?0:(r*r*130+fbm(n,x/90,z/90)*20)*smooth(90,520,d)*(z>H?.08:1)},c(x,z,h,d,n,r){return h>60?pick2(['#E8C98A','#F0D49A'],r):pick2(['#DDBB7A','#E3C281','#D6B272'],r)}},
  wall(B,w,X){const G=lib(),o=X.o,r=B.rnd,{x,y,cx,cz,occ}=w,ww=w.w,hh=w.h,sand=()=>pick2(['#C9A577','#D2AE80','#BF9B6C'],r),H0=64;
    const merlons=(x0,z0,len,vert,top)=>{const n=Math.floor(len/26);for(let k=0;k<n;k++){const t=(k+.5)/n*len;if(r()<.08)continue;B.add(G.cbox(14,14,14,2),{p:[vert?x0:x0+t,top,vert?z0+t:z0],c:sand,occ,ao:0})}};
    if((ww===260||ww===50)&&(hh===50||hh===150)){ // muralha da fortaleza
      B.add(G.box(ww,H0,hh,Math.max(1,Math.round(ww/60)),2,Math.max(1,Math.round(hh/60))),{p:[cx,0,cz],c:'#F2E6D6',m:'stone',uv:120,occ,jit:.03,ao:.3,aoH:20});
      B.add(G.cbox(ww+6,6,hh+6,2),{p:[cx,H0,cz],c:'#D9BD92',occ});const vert=hh>ww;
      if(vert){merlons(x+7,y,hh,1,H0+6);merlons(x+ww-7,y,hh,1,H0+6)}else{merlons(x,y+7,ww,0,H0+6);merlons(x,y+hh-7,ww,0,H0+6)}
      // fendas de flecha na face da frente
      if(!vert)for(let k=0;k<Math.floor(ww/60);k++)B.add(G.box(5,16,1.4),{p:[x+30+k*60,24,y+hh+.6],c:'#3A2A1A',occ,ao:0,cast:false})}
    else if(ww===60){ // muro em ruínas com estandarte
      B.add(G.box(ww,H0+6,hh,1,2,Math.round(hh/60)),{p:[cx,0,cz],c:'#F2E6D6',m:'stone',uv:120,occ,jit:.03,ao:.3,aoH:20});B.add(G.cbox(ww+6,6,hh+6,2),{p:[cx,H0+6,cz],c:'#D9BD92',occ});
      merlons(x+8,y,hh,1,H0+12);merlons(x+ww-8,y,hh,1,H0+12);for(let k=0;k<5;k++)B.add(G.cbox(12+r()*10,8+r()*6,12+r()*8,2),{p:[x+8+r()*(ww-16),0,y+hh-8-r()*30],r:[0,r(),0],c:sand,occ});
      const tc=x<W/2?TEAM[0].c:TEAM[1].c;B.add(G.cyl(2,2,60,5),{p:[cx,H0+12,y+hh-12],c:'#6B4A2A',occ});B.add(G.box(34,22,1).translate(17,0,0),{p:[cx+2,H0+52,y+hh-12],c:tc,m:'cloth',swF:v=>clamp((v.x-cx-2)/34,0,1)*5,ph:w.i,occ,ao:0,jit:.04});
      B.add(G.box(30,44,1.2).translate(0,-44,0),{p:[cx,H0+4,y+hh+1.4],c:tc,m:'cloth',swF:v=>clamp((H0+4-v.y)/44,0,1)*3,ph:w.i+1,occ,ao:0,jit:.04});B.add(G.ico(4,0),{p:[cx,H0-46,y+hh+2],c:'#FFC531',occ,ao:0})}
    else if(ww===120){ // pilha de suprimentos
      B.add(G.cbox(ww,6,hh,2),{p:[cx,0,cz],c:'#6E4A2A',occ});for(let i=0;i<3;i++)for(let j=0;j<4;j++){const px=x+20+i*40,pz=y+20+j*40;if((i+j)%3===0)o.barrel(px,pz,16,40,6,occ);else{o.crate(px,pz,36,6,occ,(r()-.5)*.3);if(r()<.45)o.crate(px+(r()-.5)*6,pz+(r()-.5)*6,26,42,occ,(r()-.5)*.6)}}
      for(let k=0;k<4;k++)B.add(jitter(G.ico(11,0),2,k),{p:[x+15+r()*(ww-30),46,y+15+r()*(hh-30)],s:[1.2,.7,1],c:'#D9C49A',occ})}
    else{ // poço de pedra com telhadinho
      B.add(G.cbox(ww,10,hh,3),{p:[cx,0,cz],c:'#CDB088',occ});B.add(G.cyl(27,29,26,10),{p:[cx,10,cz],c:'#B8946A',occ});B.add(G.cyl(21,21,2,10),{p:[cx,34,cz],c:'#2A4A5A',occ,ao:0});
      for(const s of [-1,1])B.add(G.cbox(5,52,5,1),{p:[cx+s*30,10,cz],c:'#6B4A2A',occ});B.add(new T.CylinderGeometry(2,2,64,6).rotateZ(PI/2),{p:[cx,52,cz],c:'#6B4A2A',occ});
      B.add(G.cbox(84,4,56,1.5),{p:[cx,62,cz-2],r:[.18,0,0],c:'#A0522D',occ});B.add(G.cbox(84,4,56,1.5),{p:[cx,62,cz+2],r:[-.18,0,0],c:'#B5633A',occ});
      B.add(G.cyl(5,5,8,6),{p:[cx+12,38,cz+8],c:'#8E5A33',occ})}},
  towers(B,X){const G=lib(),o=X.o,r=B.rnd,sand=()=>pick2(['#C9A577','#D2AE80','#BF9B6C'],r);
    for(const [tx,tz] of [[145,585],[405,585],[145,1015],[405,1015]])for(const xx of [tx,W-tx]){const occ=tz-30+6,s=60,h=104,tc=xx<W/2?TEAM[0].c:TEAM[1].c;
      B.add(G.box(s,h,s,1,3,1),{p:[xx,0,tz],c:'#F2E6D6',m:'stone',uv:120,occ,jit:.03,ao:.3,aoH:22});B.add(G.cbox(s+10,8,s+10,2.5),{p:[xx,h,tz],c:'#D9BD92',occ});
      for(const [dx,dz] of [[-1,-1],[1,-1],[-1,1],[1,1]])B.add(G.cbox(16,16,16,2),{p:[xx+dx*(s/2-3),h+8,tz+dz*(s/2-3)],c:sand,occ,ao:0});
      for(const [dx,dz] of [[0,-1],[0,1],[-1,0],[1,0]])B.add(G.cbox(14,13,14,2),{p:[xx+dx*(s/2-3),h+8,tz+dz*(s/2-3)],c:sand,occ,ao:0});
      B.add(G.box(6,18,1.4),{p:[xx,50,tz+s/2+.7],c:'#3A2A1A',occ,ao:0,cast:false});
      B.add(G.cyl(1.8,1.8,62,5),{p:[xx,h+8,tz],c:'#6B4A2A',occ});B.add(G.box(40,24,1).translate(20,0,0),{p:[xx+2,h+56,tz],c:tc,m:'cloth',swF:v=>clamp((v.x-xx-2)/40,0,1)*5,ph:xx*.01+tz*.02,occ,ao:0,jit:.04})}},
  border(B,X){const G=lib(),o=X.o,r=B.rnd;
    for(const [x0,z0,w,d,h] of [[-34,-34,W+68,30,40],[-34,H+4,W+68,30,16],[-34,-4,30,H+8,34],[W+4,-4,30,H+8,34]]){B.add(G.box(w,h,d,Math.max(1,Math.round(w/60)),1,Math.max(1,Math.round(d/60))),{p:[x0+w/2,0,z0+d/2],c:'#F2E6D6',m:'stone',uv:120,jit:.03});B.add(G.cbox(w+4,5,d+4,1.5),{p:[x0+w/2,h,z0+d/2],c:'#D9BD92'})}
    const cactus=(x,z,s)=>{B.add(G.cyl(5*s,6*s,40*s,7),{p:[x,0,z],c:'#5E9A4A'});for(const sd of [-1,1])if(r()<.7){const ah=14*s+r()*10*s;B.add(G.cyl(3.4*s,3.4*s,10*s,6).rotateZ(PI/2),{p:[x+sd*8*s,ah,z],c:'#5E9A4A'});B.add(G.cyl(3.4*s,3.6*s,14*s,6),{p:[x+sd*13*s,ah-2*s,z],c:'#68A852'})}};
    for(let i=0;i<70;i++){const x=-600+r()*(W+1200),z=-650+r()*(H+700);const d=outD(x,z);if(d<80||z>H+50)continue;r()<.55?cactus(x,z,.8+r()*.8):o.rocks(x,z,30+r()*30,pick2(['#B88A5A','#A87A4A','#C99A66'],r),undefined,3)}
    for(let i=0;i<16;i++){const x=200+r()*(W-400),z=-220-r()*300;o.palm(x,z,1+r()*.3)}
    for(let i=0;i<8;i++)o.rocks(-400+r()*(W+800),H+90+r()*200,20+r()*15,'#B88A5A',undefined,2)},
  decor(B,X,M){const o=X.o,r=B.rnd,G=lib();const ok=(x,z)=>!hitWall(M,x,z,14)&&!(x>110&&x<440&&z>550&&z<1050)&&!(x>W-440&&x<W-110&&z>550&&z<1050);
    o.grass(Math.round(220*X.q.den),ok,['#B9A35A','#A8914A','#C8B26A'],5,11);
    for(let i=0;i<Math.round(80*X.q.den);i++){const x=r()*W,z=r()*H;if(!ok(x,z))continue;B.add(G.rock(4+r()*7,3+r()*4,4+r()*6,i),{p:[x,0,z],c:pick2(['#B88A5A','#C99A66','#A87A4A'],r),cast:false})}},
  mats(q,X){const tex=stoneTex();X.texs.push(tex);return{stone:stdMat(q,{both:{map:tex}},{key:'stone'})}}},

// ---------------------------------------------------------------- Ilha Laranja
ilha:{dust:'#FFFBEF',bg:'#1F8DB8',sun:{c:'#FFF6E0',i:2.7,d:[-.5,1,-.55]},hemi:['#C6F1FF','#E9D3A0',1.1],fill:['#FFE9C8',.3],
  paint(c,M,rnd){const p=paintCommon(c),pal=M.pal;c.fillStyle=pal.a;c.fillRect(0,0,W,H);p.speck(900,[pal.b,'#F7E4B2','#EBD08E'],20,60,rnd,.5);p.speck(4000,['#E0C47E','#FFF2CF','#D9BC78'],1,2.6,rnd,.75);
    // areia molhada nas bordas + linhas de maré
    for(const [x,y,w,h,gx,gy] of [[0,0,W,90,0,1],[0,H-90,W,90,0,-1],[0,0,90,H,1,0],[W-90,0,90,H,-1,0]]){const g=c.createLinearGradient(gx>0?0:gx<0?W:0,gy>0?0:gy<0?H:0,gx>0?90:gx<0?W-90:0,gy>0?90:gy<0?H-90:0);g.addColorStop(0,'rgba(190,150,90,.45)');g.addColorStop(1,'rgba(190,150,90,0)');c.fillStyle=g;c.fillRect(x,y,w,h)}
    c.save();c.strokeStyle=pal.line;c.globalAlpha=.6;c.lineWidth=3;for(let j=60;j<H;j+=140){c.beginPath();for(let x=0;x<=W;x+=24)c.lineTo(x,j+Math.sin(x/120+j)*10);c.stroke()}c.restore();
    // piscinas de maré (água rasa)
    for(const [x,y,rx,ry] of X_POOLS){c.fillStyle='#E6CB8C';c.beginPath();c.ellipse(x,y,rx+10,ry+10,0,0,TAU);c.fill();c.fillStyle='#8FDFF0';c.beginPath();c.ellipse(x,y,rx,ry,0,0,TAU);c.fill();c.fillStyle='#6FD0E6';c.beginPath();c.ellipse(x,y+ry*.15,rx*.7,ry*.6,0,0,TAU);c.fill()}
    for(let i=0;i<60;i++){const x=rnd()*W,y=rnd()*H;c.save();c.translate(x,y);c.rotate(rnd()*6);c.fillStyle=pick2(['#FFF4E0','#FFD1B8','#F7C59F'],rnd);c.beginPath();c.moveTo(0,-5);c.quadraticCurveTo(6,0,0,5);c.quadraticCurveTo(-6,0,0,-5);c.fill();c.restore()}
    // pegadas de capivara
    for(let k=0;k<3;k++){let x=200+rnd()*2000,y=200+rnd()*1200,a=rnd()*6;for(let i=0;i<14;i++){a+=(rnd()-.5)*.4;x+=Math.cos(a)*24;y+=Math.sin(a)*24;p.blob(x+Math.cos(a+1.57)*(i%2?6:-6),y+Math.sin(a+1.57)*(i%2?6:-6),4,3,'#D9BC78',.7)}}
    p.center('#FFFFFF',.38,.18);p.ao(M,.3,22)},
  terr:{wl:-5,h(x,z,d,n){const ext=z<0?240:60;return d<ext?-d*(4/ext):-4-(d-ext)*.28-fbm(n,x/200,z/200)*8},c(x,z,h,d,n,r){return h>-2.5?pick2(['#F3DCA2','#EFD597','#F7E2AE'],r):h>-6?'#E0C384':'#7CC9C9'}},
  wall(B,w,X){const G=lib(),o=X.o,r=B.rnd,{x,y,cx,cz,occ}=w,ww=w.w,hh=w.h,rc=()=>pick2(['#A39E8C','#B5AE98','#948E7C','#BDB6A0','#8A8574'],r);
    B.add(G.slab(ww,22,hh,w.i*17,3,4),{p:[cx,0,cz],c:rc,occ,jit:.08,ao:.4});B.add(G.slab(ww+8,3,hh+8,w.i*3,4,1),{p:[cx,0,cz],c:'#6E8C6A',occ,ao:0,cast:false});
    const n=ww>=100?3:3;for(let k=0;k<n;k++){const s=30+r()*20;B.add(G.rock(s*1.25,s*1.15,s,w.i*50+k),{p:[x+s*.45+k*(ww-s*.9)/Math.max(1,n-1),12,cz+(r()-.5)*(hh-s*.8)],r:[0,r()*PI,0],c:rc,occ,aoY:12})}
    B.add(G.rock(26,30,22,w.i*9),{p:[cx+(r()-.5)*20,30,cz+(r()-.5)*10],r:[0,r()*PI,0],c:rc,occ,aoY:30});
    for(let k=0;k<10;k++)B.add(G.ico(1.4+r()*1.2,0),{p:[x+r()*ww,18+r()*24,y+hh*(.5+r()*.5)],c:'#F4EFE2',occ,ao:0,jit:.02});
    for(let k=0;k<5;k++)B.add(G.leaf(16+r()*8,3,.9),{p:[x+r()*ww,20,y+hh-2],r:[0,-PI/2+(r()-.5)*1.2,0],c:pick2(['#3DBE6C','#2E9A52','#6B8A3A'],r),m:'sway',sw:1.2,swY:0,swH:20,occ,ao:0});
    B.add(G.cbox(9,4,6,1.5),{p:[x+ww*.7,40,cz],c:'#FF5A36',occ,ao:0});for(const s2 of [-1,1])B.add(G.box(2,2,6),{p:[x+ww*.7+s2*5,41,cz+3],r:[0,s2*.5,0],c:'#FF5A36',occ,ao:0});
    B.add(G.star(8,3),{p:[x+ww*.3,1,y+hh+2],r:[0,r()*2,0],c:'#FF8A1F',ao:0,cast:false});
    if(ww===100){o.palm(cx,cz,1.15,occ,.35);for(let k=0;k<3;k++)B.add(G.ico(4.4,0),{p:[x+20+r()*60,4,y+hh+6+r()*6],c:'#6B4A2A',ao:0})}},
  border(B,X){const G=lib(),o=X.o,r=B.rnd;
    // praia do norte: palmeiras, guarda-sóis, toalhas e a torre do salva-vidas
    for(let i=0;i<26;i++){const x=-100+r()*(W+200),z=-60-r()*150;o.palm(x,z,.9+r()*.45)}
    for(let i=0;i<10;i++){const x=100+r()*(W-200),z=-40-r()*120,c=pick2(['#FF8A1F','#FF4F9A','#45D4FF','#FFC531'],r);B.add(G.cyl(1.2,1.2,46,4),{p:[x,0,z],c:'#FFFFFF'});
      B.add(new T.ConeGeometry(30,12,8,1,true).translate(0,6,0),{p:[x,40,z],c:(R0)=>R0()<.5?c:'#FFFFFF',jit:0,ao:0});B.add(G.box(24,1,40),{p:[x+30,0,z+12],r:[0,r(),0],c:pick2(['#FF8FAB','#45D4FF','#FFD166'],r),ao:0,cast:false})}
    const lx=W/2,lz=-110;for(const [dx,dz] of [[-18,-14],[18,-14],[-18,14],[18,14]])B.add(G.cyl(2.4,2.8,70,5),{p:[lx+dx,0,lz+dz],c:'#E9D7B5'});B.add(G.cbox(48,6,40,2),{p:[lx,70,lz],c:'#E9D7B5'});
    B.add(G.cbox(40,30,32,2),{p:[lx,76,lz],c:'#FF3B47'});B.add(G.cone(34,16,4),{p:[lx,106,lz],r:[0,PI/4,0],c:'#FFF4E0'});B.add(G.box(44,4,2),{p:[lx,46,lz+20],c:'#FFF4E0'});
    for(let i=0;i<14;i++){const x=r()<.5?-140-r()*420:W+140+r()*420,z=-200+r()*(H+150);o.rocks(x,z,40+r()*40,pick2(['#9B9B8A','#8C8C7C'],r),undefined,3)}
    // barquinho
    const bx=W+260,bz=420;B.add(G.cbox(90,16,32,6),{p:[bx,-6,bz],c:'#FF8A1F'});B.add(G.cbox(80,3,26,2),{p:[bx,10,bz],c:'#E9D7B5'});B.add(G.cyl(1.6,1.6,70,4),{p:[bx,10,bz],c:'#6B4A2A'});B.add(new T.BufferGeometry().setAttribute('position',new T.Float32BufferAttribute([0,78,0,0,22,0,38,22,0],3)),{p:[bx+2,0,bz],c:'#FFFFFF',m:'cloth',swF:v=>clamp((v.x-bx-2)/38,0,1)*3,jit:0,ao:0})},
  decor(B,X,M){const o=X.o,r=B.rnd,G=lib();for(let i=0;i<Math.round(70*X.q.den);i++){const x=r()*W,z=r()*H;if(hitWall(M,x,z,12))continue;B.add(G.cone(3+r()*2,2.4,5),{p:[x,0,z],r:[0,r()*TAU,0],c:pick2(['#FFF4E0','#FFD1B8','#F7C59F'],r),ao:0,cast:false})}
    for(let i=0;i<Math.round(14*X.q.den);i++){const x=r()*W,z=r()*H;if(hitWall(M,x,z,12))continue;B.add(G.star(5+r()*3,2),{p:[x,0,z],r:[0,r()*2,0],c:pick2(['#FF8A1F','#FF6B6B','#FFC531'],r),ao:0,cast:false})}
    for(const [x,z,rx,rz] of X_POOLS)B.add(new T.CircleGeometry(1,20).rotateX(-PI/2),{p:[x,.6,z],s:[rx,1,rz],c:'#7FE0F0',m:'shallow',jit:0,ao:0,cast:false})},
  mats(q){return{shallow:patch(new T.MeshBasicMaterial({vertexColors:true,transparent:true,opacity:.55,depthWrite:false}),{f:'float cs=sin(vWP.x*.09+uTime*1.7)*sin(vWP.z*.11-uTime*1.3)+sin((vWP.x+vWP.z)*.05+uTime);gl_FragColor.rgb+=vec3(.35,.4,.4)*smoothstep(.6,1.6,cs);',key:'shallow'})}}},
};
const X_POOLS=[[560,300,70,40],[W-560,300,70,40],[560,1300,70,40],[W-560,1300,70,40],[980,1180,54,30],[W-980,420,54,30]];
// texturas de tijolo e de pedra (repetidas por coordenada do mundo)
function brickTex(){const s=512,cv=document.createElement('canvas');cv.width=cv.height=s;const c=cv.getContext('2d'),k=s/112,Rn=mulberry(7);c.fillStyle='#E6D2BC';c.fillRect(0,0,s,s);
  for(let j=0;j<8;j++)for(let i=-1;i<5;i++){const x=(i*28+(j%2)*14)*k,y=j*14*k;c.fillStyle=pick2(['#C9563A','#D2603F','#BF4E33','#D86A48','#B8492F'],Rn);c.fillRect(x+1.2*k,y+1.2*k,25.6*k,11.6*k);
    c.fillStyle='rgba(255,220,190,.22)';c.fillRect(x+1.2*k,y+1.2*k,25.6*k,2*k);c.fillStyle='rgba(60,20,10,.22)';c.fillRect(x+1.2*k,y+10.8*k,25.6*k,2*k)}
  const t=new T.CanvasTexture(cv);t.wrapS=t.wrapT=T.RepeatWrapping;t.colorSpace=T.SRGBColorSpace;t.anisotropy=8;return t}
function stoneTex(){const s=512,cv=document.createElement('canvas');cv.width=cv.height=s;const c=cv.getContext('2d'),k=s/120,Rn=mulberry(11);c.fillStyle='#A8865E';c.fillRect(0,0,s,s);
  for(let j=0;j<5;j++)for(let i=-1;i<4;i++){const x=(i*40+(j%2)*20)*k,y=j*24*k;c.fillStyle=pick2(['#D2AE80','#C9A577','#DDBA8A','#C29E70','#D8B486'],Rn);rr(c,x+1.5*k,y+1.5*k,37*k,21*k,2*k);c.fill();
    c.fillStyle='rgba(255,240,210,.25)';c.fillRect(x+2*k,y+2*k,36*k,2.4*k);c.fillStyle='rgba(90,60,30,.2)';c.fillRect(x+2*k,y+19*k,36*k,2.4*k)}
  const t=new T.CanvasTexture(cv);t.wrapS=t.wrapT=T.RepeatWrapping;t.colorSpace=T.SRGBColorSpace;t.anisotropy=8;return t}

// ---------- Vaga-lumes (pontos que piscam e flutuam) ----------
function fireflies(X,n,cols){const r=X.B.rnd,pos=[],ph=[],col=[],c=new T.Color();for(let i=0;i<n;i++){pos.push(-300+r()*(W+600),12+r()*60,-300+r()*(H+500));ph.push(r()*100);c.set(pick2(cols,r));col.push(c.r,c.g,c.b)}
  const g=new T.BufferGeometry();g.setAttribute('position',new T.Float32BufferAttribute(pos,3));g.setAttribute('aPh',new T.Float32BufferAttribute(ph,1));g.setAttribute('color',new T.Float32BufferAttribute(col,3));
  const m=new T.ShaderMaterial({uniforms:{uTime:U.uTime,uPx:X.uPx},vertexColors:true,transparent:true,depthWrite:false,blending:T.AdditiveBlending,
    vertexShader:'attribute float aPh;uniform float uTime;uniform float uPx;varying vec3 vC;varying float vA;void main(){vec3 p=position;p.x+=sin(uTime*.5+aPh)*30.;p.z+=cos(uTime*.4+aPh*1.3)*24.;p.y+=sin(uTime*1.3+aPh*2.)*8.;vC=color;vA=pow(max(0.,sin(uTime*1.7+aPh*3.)),2.);gl_Position=projectionMatrix*modelViewMatrix*vec4(p,1.);gl_PointSize=uPx*(5.+vA*6.);}',
    fragmentShader:'varying vec3 vC;varying float vA;void main(){float d=length(gl_PointCoord-.5)*2.;float a=smoothstep(1.,0.,d);gl_FragColor=vec4(vC*a*(.25+vA*1.1),a);}'});
  const pts=new T.Points(g,m);pts.frustumCulled=false;pts.renderOrder=6;return pts}

// ---------- Monta a cena de um mapa ----------
function buildMap(M,q,rr){lib();const def=DEFS[M.id]||DEFS.praca,seed=[...M.id].reduce((a,ch)=>a*31+ch.charCodeAt(0)|0,7),noise=vnoise(seed),grp=new T.Group(),texs=[];
  const B=makeBuilder(seed),X={M,q,B,texs,o:null,uPx:{value:1}};X.o=P(B,X);
  const mats=Object.assign(baseMats(q),def.mats?def.mats(q,X):{});
  // ----- chão da arena (textura pintada + leve mosaico de triângulos)
  const maxT=Math.min(q.tex,rr.capabilities.maxTextureSize||4096),tw=maxT,th=Math.round(tw*H/W);
  const gcv=document.createElement('canvas');gcv.width=tw;gcv.height=th;let ecv=null;
  const paint=()=>{const c=gcv.getContext('2d');c.setTransform(tw/W,0,0,th/H,0,0);def.paint(c,M,mulberry(seed+1),X);
    if(def.paintEm){if(!ecv){ecv=document.createElement('canvas');ecv.width=tw>>1;ecv.height=th>>1}const e=ecv.getContext('2d');e.setTransform(ecv.width/W,0,0,ecv.height/H,0,0);def.paintEm(e,M,mulberry(seed+2))}};
  paint();const gtex=new T.CanvasTexture(gcv);gtex.colorSpace=T.SRGBColorSpace;gtex.anisotropy=Math.min(8,rr.capabilities.getMaxAnisotropy());texs.push(gtex);
  let etex=null;if(ecv){etex=new T.CanvasTexture(ecv);etex.colorSpace=T.SRGBColorSpace;texs.push(etex)}
  const gm=stdMat(q,{both:Object.assign({map:gtex},etex?{emissiveMap:etex,emissive:new T.Color(1,1,1)}:{})},{key:'ground'+(etex?'e':''),dm:etex?.85:1});
  {const cs=40,nx=W/cs,nz=H/cs,Rn=mulberry(seed+3),vx=[],pos=[],uv=[],col=[];
    for(let j=0;j<=nz;j++)for(let i=0;i<=nx;i++){const ed=i===0||j===0||i===nx||j===nz;vx.push([i*cs+(ed?0:(Rn()-.5)*cs*.55),j*cs+(ed?0:(Rn()-.5)*cs*.55)])}
    const V=(i,j)=>vx[j*(nx+1)+i];const tri=(a,b,c)=>{const k=.97+Rn()*.06;for(const v of [a,b,c]){pos.push(v[0],0,v[1]);uv.push(v[0]/W,1-v[1]/H);col.push(k,k,k)}};
    for(let j=0;j<nz;j++)for(let i=0;i<nx;i++){const a=V(i,j),b=V(i+1,j),c=V(i,j+1),d=V(i+1,j+1);if((i+j)%2){tri(a,c,b);tri(b,c,d)}else{tri(a,c,d);tri(a,d,b)}}
    const g=new T.BufferGeometry();g.setAttribute('position',new T.Float32BufferAttribute(pos,3));g.setAttribute('uv',new T.Float32BufferAttribute(uv,2));g.setAttribute('color',new T.Float32BufferAttribute(col,3));g.computeVertexNormals();
    const gmesh=new T.Mesh(g,gm);gmesh.receiveShadow=true;grp.add(gmesh)}
  // ----- terreno fora da arena (e água, se o mapa tiver)
  const tr=def.terr,E=1200,cs=80,Rt=mulberry(seed+4);{const nx=(W+2*E)/cs,nz=(H+2*E)/cs,hv=[];const vtx=(i,j)=>{const x=-E+i*cs,z=-E+j*cs,d=outD(x,z),jj=d>2?(Rt()-.5)*cs*.5:0,jz=d>2?(Rt()-.5)*cs*.5:0;
      let xx=x+jj,zz=z+jz;if(d>0&&outD(xx,zz)<1){xx=x;zz=z}const dd=outD(xx,zz);return[xx,dd<1?0:tr.h(xx,zz,dd,noise),zz,dd]};
    for(let j=0;j<=nz;j++)for(let i=0;i<=nx;i++)hv.push(vtx(i,j));const V=(i,j)=>hv[j*(nx+1)+i];const pos=[];const cols=[];const Rc=mulberry(seed+5),cc=new T.Color();
    for(let j=0;j<nz;j++)for(let i=0;i<nx;i++){const x=-E+(i+.5)*cs,z=-E+(j+.5)*cs;if(insideA(x,z))continue;const a=V(i,j),b=V(i+1,j),c=V(i,j+1),d=V(i+1,j+1);
      for(const t of (i+j)%2?[[a,c,b],[b,c,d]]:[[a,c,d],[a,d,b]]){const mh=(t[0][1]+t[1][1]+t[2][1])/3,md=(t[0][3]+t[1][3]+t[2][3])/3;cc.set(tr.c((t[0][0]+t[1][0]+t[2][0])/3,(t[0][2]+t[1][2]+t[2][2])/3,mh,md,noise,Rc));
        const hs={h:0,s:0,l:0};cc.getHSL(hs);cc.setHSL(hs.h,hs.s,hs.l*(1+(Rc()-.5)*.08));for(const v of t){pos.push(v[0],v[1]-.4,v[2]);cols.push(cc.r,cc.g,cc.b)}}}
    const g=new T.BufferGeometry();g.setAttribute('position',new T.Float32BufferAttribute(pos,3));g.setAttribute('color',new T.Float32BufferAttribute(cols,3));g.computeVertexNormals();
    const m=new T.Mesh(g,mats.std);m.receiveShadow=true;m.castShadow=!!q.sh;grp.add(m);
    if(tr.wl!=null){const wl=tr.wl,ws=60,wx=(W+2*E)/ws,wz=(H+2*E)/ws,wp=[],wc=[],wa=[],wph=[],c1=new T.Color(M.id==='lagoa'?'#1B3A5E':'#5ED6E0'),c2=new T.Color(M.id==='lagoa'?'#0A1830':'#1E7FB0'),c3=new T.Color();
      const WV=(i,j)=>{const x=-E+i*ws,z=-E+j*ws,d=outD(x,z),gh=d<1?0:tr.h(x,z,d,noise),dep=Math.max(0,wl-gh);return[x,z,dep]};
      for(let j=0;j<wz;j++)for(let i=0;i<wx;i++){const x=-E+(i+.5)*ws,z=-E+(j+.5)*ws;if(insideA(x,z,-4))continue;const a=WV(i,j),b=WV(i+1,j),c=WV(i,j+1),d=WV(i+1,j+1);if(Math.max(a[2],b[2],c[2],d[2])<=0)continue;
        for(const t of (i+j)%2?[[a,c,b],[b,c,d]]:[[a,c,d],[a,d,b]]){const dep=(t[0][2]+t[1][2]+t[2][2])/3;c3.copy(c1).lerp(c2,clamp(dep/40,0,1));for(const v of t){wp.push(v[0],wl,v[1]);wc.push(c3.r,c3.g,c3.b);wa.push(clamp(v[2]/14,0,1)*(M.id==='lagoa'?2.4:5));wph.push(v[2])}}}
      const g2=new T.BufferGeometry();g2.setAttribute('position',new T.Float32BufferAttribute(wp,3));g2.setAttribute('color',new T.Float32BufferAttribute(wc,3));g2.setAttribute('aSw',new T.Float32BufferAttribute(wa,1));g2.setAttribute('aPh',new T.Float32BufferAttribute(wph,1));g2.computeVertexNormals();
      const wm=mats.water||(mats.water=stdMat(q,{std:{roughness:.2,metalness:.05}},{v:'float wv=sin(position.x*.015+uTime*1.2)*cos(position.z*.018+uTime*.9)*aSw+sin((position.x+position.z)*.04+uTime*2.1)*aSw*.35;transformed.y+=wv;vH=wv;',
        f:'float fo=1.-smoothstep(0.,4.5,vPh+sin(uTime*1.8+vWP.x*.04+vWP.z*.03)*1.6);gl_FragColor.rgb=mix(gl_FragColor.rgb,vec3(.96,.99,1.),fo*.85+smoothstep(3.6,5.2,vH)*.5);',key:'ocean'}));
      const wmesh=new T.Mesh(g2,wm);wmesh.receiveShadow=true;grp.add(wmesh)}}
  // ----- paredes: exatamente nos retângulos de colisão
  X.sign=(x,y,z,w,h,txt,col,occ)=>{const cv=document.createElement('canvas');cv.width=256;cv.height=Math.round(256*h/w);const c=cv.getContext('2d');c.fillStyle='rgba(10,6,24,.85)';rr2(c,4,4,cv.width-8,cv.height-8,10);c.fill();
    c.strokeStyle=col;c.lineWidth=5;c.shadowColor=col;c.shadowBlur=14;rr2(c,8,8,cv.width-16,cv.height-16,8);c.stroke();c.font=`${Math.round(cv.height*.62)}px "Lilita One",sans-serif`;c.textAlign='center';c.textBaseline='middle';c.fillStyle='#FFFFFF';c.fillText(txt,cv.width/2,cv.height/2+2);c.fillStyle=col;c.globalAlpha=.6;c.fillText(txt,cv.width/2,cv.height/2+2);
    const t=new T.CanvasTexture(cv);t.colorSpace=T.SRGBColorSpace;texs.push(t);const m=patch(new T.MeshBasicMaterial({map:t,transparent:true,side:T.DoubleSide}),{dm:.08,f:FLICK,key:'sign'});const g=new T.PlaneGeometry(w,h).translate(0,h/2,0);
    const a=new Float32Array(g.attributes.position.count).fill(occ||0);g.setAttribute('aClip',new T.BufferAttribute(a,1));g.setAttribute('aPh',new T.BufferAttribute(new Float32Array(g.attributes.position.count).fill(Math.random()),1));
    const mesh=new T.Mesh(g,m);mesh.position.set(x,y,z);if(occ)mesh.layers.enable(1);grp.add(mesh);X.o.glow(x,y+h*.4,z+6,w*1.6,col)};
  X.holo=(x,y,z,occ)=>{const cv=document.createElement('canvas');cv.width=cv.height=256;const c=cv.getContext('2d');c.save();c.translate(128,150);c.scale(3.6,3.6);try{drawChar(c,defaultLook(0),{face:1,t:0,aim:0})}catch(e){}c.restore();c.globalCompositeOperation='source-atop';c.fillStyle='rgba(150,240,255,.72)';c.fillRect(0,0,256,256);
    const t=new T.CanvasTexture(cv);t.colorSpace=T.SRGBColorSpace;texs.push(t);const m=patch(new T.MeshBasicMaterial({map:t,transparent:true,depthWrite:false,blending:T.AdditiveBlending,color:new T.Color(1.5,1.8,2),side:T.DoubleSide}),
      {dm:0,f:'gl_FragColor.rgb*=.7+.3*sin(vWP.y*1.4-uTime*7.);gl_FragColor.rgb*=.85+.15*sin(uTime*13.);',key:'holo'});const g=new T.PlaneGeometry(120,120).translate(0,60,0);
    g.setAttribute('aClip',new T.BufferAttribute(new Float32Array(g.attributes.position.count).fill(occ||0),1));const mesh=new T.Mesh(g,m);mesh.position.set(x,y,z);mesh.renderOrder=4;mesh.onBeforeRender=()=>{mesh.rotation.y=Math.sin(U.uTime.value*.8)*.5};if(occ)mesh.layers.enable(1);grp.add(mesh)};
  M.walls.forEach(([x,y,w,h],i)=>def.wall(B,{x,y,w,h,cx:x+w/2,cz:y+h/2,occ:y+6,i},X));
  if(def.towers)def.towers(B,X);
  if(def.border)def.border(B,X,M);if(def.decor)def.decor(B,X,M);if(def.extra)def.extra(grp,X);
  B.build(mats,grp);
  return{grp,def,mats,texs,uPx:X.uPx,repaint(){paint();gtex.needsUpdate=true;if(etex)etex.needsUpdate=true}}}
function rr2(c,x,y,w,h,r){c.beginPath();c.moveTo(x+r,y);c.arcTo(x+w,y,x+w,y+h,r);c.arcTo(x+w,y+h,x,y+h,r);c.arcTo(x,y+h,x,y,r);c.arcTo(x,y,x+w,y,r);c.closePath()}

// ---------- Cena (luzes) ----------
function makeScene(M,q,rr){const b=buildMap(M,q,rr),def=b.def,scene=new T.Scene();scene.add(b.grp);
  const hemi=new T.HemisphereLight(def.hemi[0],def.hemi[1],def.hemi[2]);scene.add(hemi);
  const sun=new T.DirectionalLight(def.sun.c,def.sun.i);const dir=new T.Vector3(...def.sun.d).normalize();scene.add(sun,sun.target);
  if(q.sh){sun.castShadow=true;sun.shadow.mapSize.set(q.sh,q.sh);sun.shadow.bias=-.0006;sun.shadow.normalBias=1.2;sun.shadow.camera.near=10;sun.shadow.camera.far=4000;sun.shadow.radius=3}
  const fill=new T.DirectionalLight(def.fill[0],def.fill[1]);fill.position.set(.2,1,1.2);scene.add(fill);
  const pls=[];if(def.dark&&q.pl)for(let i=0;i<q.pl;i++){const l=new T.PointLight(def.plC||'#FFD8A0',0,360,1.1);l.position.set(0,-999,0);scene.add(l);pls.push(l)}
  scene.traverse(o=>{if(o.isLight)o.layers.enableAll()});
  return Object.assign(b,{scene,sun,dir,pls,shSize:0,bg:new T.Color(def.bg)})}
function disposeScene(s){if(!s)return;s.scene.traverse(o=>{if(o.geometry)o.geometry.dispose();if(o.material){o.material.dispose()}});for(const t of s.texs)t.dispose();if(s.mats)for(const m of Object.values(s.mats))m.dispose()}

// ---------- Renderizador da partida ----------
// O jogo agora é só 3D (não existe mais mapa 2D): se o WebGL não existir, aparece um aviso.
function noGL(msg){let el=$('no3d');if(!el){el=document.createElement('div');el.id='no3d';document.body.appendChild(el)}el.innerHTML='<b>Não deu para ligar o 3D</b><span>'+msg+'</span>'}
function initR(){try{const game=$('game');bCv=document.createElement('canvas');bCv.className='g3d g3d-b';glCv=document.createElement('canvas');glCv.className='g3d g3d-f';
    game.parentNode.insertBefore(bCv,game);game.parentNode.insertBefore(glCv,game.nextSibling);bctx=bCv.getContext('2d');
    R=new T.WebGLRenderer({canvas:glCv,antialias:Q().aa,alpha:true,powerPreference:'high-performance',stencil:false});R.setPixelRatio(1);R.shadowMap.enabled=true;R.shadowMap.type=T.PCFShadowMap;R.shadowMap.autoUpdate=false;
    R.outputColorSpace=T.SRGBColorSpace;R.debug.checkShaderErrors=false; // não força o navegador a esperar a compilação dos shaders
    R.toneMapping=T.NoToneMapping;R.info.autoReset=false;
    glCv.addEventListener('webglcontextlost',e=>{e.preventDefault();lost=true;noGL('A placa de vídeo reiniciou. Espere um instante…')});
    glCv.addEventListener('webglcontextrestored',()=>{lost=false;const n=$('no3d');if(n)n.remove();if(actG){for(const id of [...actors.keys()])dropActor(id)}disposeScene(cur);cur=null;curKey='';capyWarm=0;iconCache.clear();iconBig.clear();pwJ=0;MN=null;ICN=null;capyIcons.clear()});
    if(!U)U={uTime:{value:0},uClipOn:{value:0},uDark:{value:0},uDarkCol:{value:new T.Vector3()},uNL:{value:0},uL:{value:Array.from({length:NL},()=>new T.Vector4(0,0,1,0))}};
    SH=new T.Matrix4().set(1,0,0,0, 0,1,K,K*CH, 0,0,1,0, 0,0,0,1);camera=new T.OrthographicCamera(-1,1,1,-1,1,CH*2);camera.up.set(0,0,-1);return true}
  catch(e){console.error('WebGL indisponível:',e);st='failed';if(bCv)bCv.remove();if(glCv)glCv.remove();R=null;noGL('Seu navegador não liberou o WebGL. Ative a aceleração de hardware nas configurações do navegador e recarregue.');return false}}
function setCam(c,cx,cz,vw,vh){c.position.set(cx,CH,cz);c.lookAt(cx,0,cz);c.updateMatrixWorld(true);c.projectionMatrix.makeOrthographic(-vw/2,vw/2,vh/2,-vh/2,1,CH*2).multiply(SH);c.projectionMatrixInverse.copy(c.projectionMatrix).invert()}
// Compilar os shaders trava a página no Mac (o Chrome traduz cada um para Metal). Então: compila em paralelo (compileAsync,
// sem travar), mostrando "Carregando", e só depois desenha. Peças que aparecem depois (capivaras, armas, poeira, construções)
// entram juntas na compilação, para nada compilar no meio da partida.
let buildMs=0,compiling=false;
function loading(on){document.body.classList.toggle('g3load',!!on)}
function warmCompile(c){compiling=true;loading(true);const warm=new T.Group();warm.position.set(-9999,0,-9999);
  try{if(capyReady()){const m=sharedCapyMats(),A=CapyRig.make({body:capyBodyMat({}),outline:m.out,xray:xray('#FFC531'),hat:hatMat(),shine:m.shine,lid:m.lid,blush:m.blush},CAPY_H/CapyRig.MH);warm.add(A.g)}
    for(let i=0;i<GUNS.length;i++){const g=Guns3D.instance(i);if(g)warm.add(g)}const fw=FX3D.warm();if(fw)warm.add(fw);warm.add(gfxMesh({}));if(!dust)dustInit();warm.add(dust.im);if(!bldMat)syncBuilds();const bm=new T.Mesh(new T.BoxGeometry(1,1,1),bldMat.wall);warm.add(bm)}catch(e){console.warn('aquecimento',e)}
  c.scene.add(warm);setCam(camera,W/2,H/2,1200,800);camera.layers.enableAll();
  const done=()=>{if(dust&&dust.im.parent===warm)warm.remove(dust.im);c.scene.remove(warm);compiling=false;loading(false);c.warm=1;capyWarm=capyReady()?1:capyWarm};
  (R.compileAsync&&R.extensions.has('KHR_parallel_shader_compile')?R.compileAsync(c.scene,camera):new Promise(r=>setTimeout(()=>{R.compile(c.scene,camera);r()},30))).then(done,e=>{console.warn('compileAsync',e);done()})}
let capyWarm=0;
function ensure(M){if(st==='idle')load();if(st!=='ready'||lost)return false;if(!R&&!initR())return false;const q=Q(),key=M.id+'|'+q.key;
  if(curKey!==key){if(cur){if(actG)cur.scene.remove(actG);if(bldG)cur.scene.remove(bldG)}disposeScene(cur);cur=null;curKey='';
    try{const t0=performance.now();cur=makeScene(M,q,R);curKey=key;cur.q=q;buildMs=Math.round(performance.now()-t0);warmCompile(cur)}catch(e){console.error('Falha ao montar o mapa 3D:',e);cur=null;return false}}
  // o modelo da capivara chegou depois do mapa: compila os materiais dela também (uma vez)
  if(cur&&cur.warm&&!compiling&&!capyWarm&&capyReady())warmCompile(cur);
  return true}
const on=M=>ensure(M);
let gameCv=null;
let lastT=0;
// ---------- Proteção de desempenho ----------
// O 3D é desenhado num tamanho limitado de pixels (o navegador estica na tela) e, se o jogo ficar lento, a resolução
// cai sozinha e as sombras passam a atualizar menos vezes (sem recompilar nada).
// no celular o 3D desenha bem menos pixels (o navegador estica) e as sombras atualizam a cada 2 quadros
const PXB=isTouch?{low:.4e6,medium:.7e6,high:1e6,chaos:1.3e6}:{low:.6e6,medium:1.15e6,high:1.9e6,chaos:3e6};let autoS=1,slowFor=0,fastFor=0,emaDt=16,shadowEvery=isTouch?2:1,frameN=0,skipNext=true;
document.addEventListener('visibilitychange',()=>{skipNext=true});
function watch(rawDt){if(skipNext){skipNext=false;return}emaDt+=(Math.min(rawDt,250)-emaDt)*.08;
  if(emaDt>36){slowFor+=rawDt;fastFor=0;if(slowFor>1500){slowFor=0;if(autoS>.45)autoS=Math.max(.45,autoS*.8);else shadowEvery=Math.min(4,shadowEvery+1)}}
  else if(emaDt<20){fastFor+=rawDt;slowFor=Math.max(0,slowFor-rawDt);if(fastFor>6000){fastFor=0;if(shadowEvery>1)shadowEvery--;else if(autoS<1)autoS=Math.min(1,autoS*1.12)}}else{slowFor=Math.max(0,slowFor-rawDt*.5)}}
let failN=0;function fail(e){if(failN++<3)console.error('Erro no 3D:',e)}
// libera a placa de vídeo na hora ao recarregar/fechar (o Live Server recarrega a página a cada arquivo salvo)
function freeGPU(){try{if(R){R.dispose();R.forceContextLoss()}}catch(e){}}
addEventListener('pagehide',freeGPU);
function render(M,camX,camY,VW,VH,t,lights,acts){if(!ensure(M))return false;const c=cur;const rawDt=lastT?t-lastT:16;const dt=clamp(rawDt/1000,0,.1);lastT=t;
  if(compiling){skipNext=true;return false}watch(rawDt);
  gameCv=gameCv||$('game');const W0=gameCv.width,H0=gameCv.height,sc=Math.min(1,Math.sqrt((PXB[c.q.key]||1.2e6)*autoS/(W0*H0))),w=Math.max(2,Math.round(W0*sc)),h=Math.max(2,Math.round(H0*sc));
  // modo "duas camadas" (paredes altas meio transparentes por cima dos textos 2D) só no PC em Alta/Caótica; no resto, uma camada só (bem mais leve)
  const split=false; // camada única sempre: copiar o WebGL para um canvas 2D a cada quadro custava caro (era a causa de engasgos no Mac)
  document.body.classList.toggle('g3single',!split);const gm=gameCv;if(split?glCv.nextSibling===gm:glCv.nextSibling!==gm)gm.parentNode.insertBefore(glCv,split?gm.nextSibling:gm);
  if(glCv.width!==w||glCv.height!==h){R.setSize(w,h,false);if(split){bCv.width=w;bCv.height=h}}
  if(split&&bCv.width!==w){bCv.width=w;bCv.height=h}
  sharedCapyMats();OU.uRes.value.set(w,h);OU.uOW.value=Math.max(1.2,h*.0026);
  const shOn=!!c.q.sh&&(++frameN%shadowEvery===0);
  document.body.classList.add('g3don');document.body.classList.remove('g3menu');
  R.info.reset();U.uTime.value=t/1000;c.uPx.value=w/VW;
  // escuridão dos mapas noturnos (feita por pixel; os objetos 2D por cima são escurecidos pelo canvas)
  const dk=c.def.dark;if(dk&&lights){U.uDark.value=dk[1];U.uDarkCol.value.set(dk[0][0]/255,dk[0][1]/255,dk[0][2]/255);const vx=camX+VW/2,vz=camY+VH/2;
    const vis=lights.filter(([x,y,r])=>x>camX-r&&x<camX+VW+r&&y>camY-r&&y<camY+VH+r).sort((a,b)=>Math.hypot(a[0]-vx,a[1]-vz)-Math.hypot(b[0]-vx,b[1]-vz)).slice(0,NL);
    vis.forEach(([x,y,r],i)=>U.uL.value[i].set(x,y,r,0));U.uNL.value=vis.length;
    const big=vis.filter(l=>l[2]>=250);c.pls.forEach((l,i)=>{const b=big[i];if(b){l.position.set(b[0],46,b[1]);l.intensity=b[2]>=400?1300:800}else l.intensity=0})}
  else{U.uDark.value=0;U.uNL.value=0}
  // sol segue a câmera (sombras só onde importa)
  const cx=camX+VW/2,cz=camY+VH/2;if(c.q.sh){const sz=Math.max(VW,VH)*.62+260;if(Math.abs(sz-c.shSize)>30){const sc=c.sun.shadow.camera;sc.left=-sz;sc.right=sz;sc.top=sz;sc.bottom=-sz;sc.updateProjectionMatrix();c.shSize=sz}
    const tx=Math.round(cx/8)*8,tz=Math.round((cz+60)/8)*8;c.sun.target.position.set(tx,0,tz);c.sun.position.set(tx+c.dir.x*1600,c.dir.y*1600,tz+c.dir.z*1600);c.sun.target.updateMatrixWorld()}
  setCam(camera,cx,cz,VW,VH);
  // capivaras 3D e construções dos jogadores
  if(capyReady()&&capyWarm&&acts){if(!actG){actG=new T.Group();actG.name='capivaras'}if(actG.parent!==c.scene)c.scene.add(actG);try{syncActors(acts,t,dt)}catch(e){fail(e)}}
  else if(actG)for(const A of actors.values()){A.g.visible=false;if(A.gun)A.gun.visible=false;A.rings.g.visible=false}
  dustTick(dt,c.def.dust);
  FX3D.frame(c.scene,dt,t);aimTick(c,t);
  if(!bldG){bldG=new T.Group();bldG.name='construcoes'}if(bldG.parent!==c.scene)c.scene.add(bldG);syncBuilds();
  // 1) cena completa -> copiada para a camada de baixo
  camera.layers.set(0);U.uClipOn.value=0;R.setClearColor(c.bg,1);R.shadowMap.needsUpdate=shOn;R.render(c.scene,camera);
  if(split){bctx.drawImage(glCv,0,0);
  // 2) só o que fica na frente de quem está atrás (camada de cima, levemente transparente)
    camera.layers.set(1);U.uClipOn.value=1;R.setClearColor(0x000000,0);R.render(c.scene,camera)}
  // 3) silhueta de quem está escondido atrás de parede (estilo Brawl Stars): só onde a parede da frente cobre
  //    (o buffer de profundidade é refeito só com as paredes: assim a capivara não fica com "manchas" quando um pedaço dela tapa outro)
  if(actG&&actG.parent&&c.q.key!=='low'){R.autoClear=false;R.clearDepth();camera.layers.set(1);U.uClipOn.value=0;if(!depthOnly)depthOnly=new T.MeshBasicMaterial({colorWrite:false});
    c.scene.overrideMaterial=depthOnly;R.render(c.scene,camera);c.scene.overrideMaterial=null;camera.layers.set(2);R.render(c.scene,camera);R.autoClear=true}
  U.uClipOn.value=0;return true}
function idle(){document.body.classList.remove('g3don','g3menu')}

// ---------- Ícones 3D das armas (Arsenal, HUD, cartas): renderizados uma vez e guardados ----------
const iconCache=new Map();let iconRT=null,iconScene=null,iconCam=null;
// cada arma é renderizada UMA vez em tamanho grande (GI_W x GI_H); os outros tamanhos são só cópias reduzidas (barato).
// Isso tira do meio da partida o render + leitura de pixels que travava um quadro ao trocar de arma.
const GI_W=440,GI_H=280,iconBig=new Map();
function gunIcon(gi,w,h){const key=gi+'_'+w+'x'+h;if(iconCache.has(key))return iconCache.get(key);const big=gunIconBig(gi);if(!big)return null;
  const cv=document.createElement('canvas');cv.width=w;cv.height=h;const s=Math.min(w/GI_W,h/GI_H),dw=GI_W*s,dh=GI_H*s;const x=cv.getContext('2d');x.imageSmoothingQuality='high';x.drawImage(big,(w-dw)/2,(h-dh)/2,dw,dh);iconCache.set(key,cv);return cv}
function gunIconBig(gi){if(iconBig.has(gi))return iconBig.get(gi);const cv=gunIconRender(gi,GI_W,GI_H);if(cv)iconBig.set(gi,cv);return cv}
function gunIconRender(gi,w,h){if(st==='idle')load();if(st!=='ready')return null;if(!R&&!initR())return null;
  const src=Guns3D.instance(gi);if(!src)return null;
  if(!iconScene){iconScene=new T.Scene();iconScene.add(new T.HemisphereLight('#FFFFFF','#6A5A9A',1.35));const d=new T.DirectionalLight('#FFFFFF',2.3);d.position.set(.35,1,.9);iconScene.add(d);const f=new T.DirectionalLight('#C9D8FF',.6);f.position.set(-1,.2,-.4);iconScene.add(f);
    iconCam=new T.OrthographicCamera(-1,1,1,-1,-1000,1000)}
  const S2=1,W2=w*S2,H2=h*S2;if(!iconRT||iconRT.width!==W2||iconRT.height!==H2){if(iconRT)iconRT.dispose();iconRT=new T.WebGLRenderTarget(W2,H2,{samples:4})}
  const holder=new T.Group();holder.add(src);holder.rotation.set(.18,-.42,0);iconScene.add(holder);holder.updateMatrixWorld(true);
  const bb=new T.Box3().setFromObject(holder),c=bb.getCenter(new T.Vector3()),sz=bb.getSize(new T.Vector3()),asp=w/h,m=Math.max(sz.x/asp,sz.y)*.58;
  iconCam.left=-m*asp;iconCam.right=m*asp;iconCam.top=m;iconCam.bottom=-m;iconCam.position.set(c.x,c.y,c.z+500);iconCam.lookAt(c);iconCam.updateProjectionMatrix();
  const keep=[U.uClipOn.value,U.uDark.value];U.uClipOn.value=0;U.uDark.value=0;const oc=new T.Color();R.getClearColor(oc);const oa=R.getClearAlpha(),ort=R.getRenderTarget();
  R.setRenderTarget(iconRT);R.setClearColor(0x000000,0);R.clear();R.render(iconScene,iconCam);
  const out=readRT(iconRT,W2,H2);
  R.setRenderTarget(ort);R.setClearColor(oc,oa);[U.uClipOn.value,U.uDark.value]=keep;iconScene.remove(holder);
  return out}
let LUT=null;
function readRT(rt,w,h){const px=new Uint8Array(w*h*4);R.readRenderTargetPixels(rt,0,0,w,h,px);const cv=document.createElement('canvas');cv.width=w;cv.height=h;const c=cv.getContext('2d'),im=c.createImageData(w,h);
  for(let y=0;y<h;y++){const src=(h-1-y)*w*4;for(let x=0;x<w*4;x++){im.data[y*w*4+x]=px[src+x]}}
  // o render sai linear e com a borda misturada ao fundo transparente: desfaz o alfa e converte para sRGB
  if(!LUT){LUT=new Uint8Array(256*16);for(let i=0;i<LUT.length;i++){const v=i/(LUT.length-1);LUT[i]=Math.round(255*(v<=.0031308?v*12.92:1.055*Math.pow(v,1/2.4)-.055))}}
  const d=im.data,n=LUT.length-1;for(let i=0;i<d.length;i+=4){const a=d[i+3];if(!a)continue;const k=255/a/255;for(let j=0;j<3;j++)d[i+j]=LUT[Math.round(Math.min(1,d[i+j]*k)*n)]}
  c.putImageData(im,0,0);return cv}

// =====================================================================
// CAPIVARAS 3D na arena (modelo em 03_capy3d.js) + paredes e caixas construídas pelos jogadores
// =====================================================================
const CAPY_H=62,FEET=8; // altura da capivara e quanto os pés ficam abaixo do centro da simulação (unidades do mundo)
let actG=null,bldG=null,capyM=null;const OU={uOW:{value:2},uRes:{value:null}};const actors=new Map(),xrayC={},blds=new Map();
function capyReady(){if(st!=='ready'||!R||lost)return false;if(CapyRig.state==='idle')CapyRig.load(T,'models/capivara.glb');return CapyRig.ready}
const DEFBODY=new Map();
function capyTint(L,bot){const c=new (T.Color)(bot?'#E2C48C':(L&&L.body)||'#B07A4A'),d=new T.Color('#B07A4A');return new T.Color(clamp(c.r/d.r,.3,1.8),clamp(c.g/d.g,.3,1.8),clamp(c.b/d.b,.3,1.8))}
function sharedCapyMats(){if(capyM)return capyM;if(!OU.uRes.value)OU.uRes.value=new T.Vector2(1,1);
  const out=new T.MeshBasicMaterial({color:'#2A1A12',side:T.BackSide});
  // contorno de tinta com largura constante na tela (em pixels): não engrossa de perto, não some de longe e não "vaza" em partes finas
  out.onBeforeCompile=s=>{s.uniforms.uOW=OU.uOW;s.uniforms.uRes=OU.uRes;
    s.vertexShader='attribute vec3 outN;uniform float uOW;uniform vec2 uRes;\n'+s.vertexShader.replace('#include <skinning_vertex>','#include <skinning_vertex>\nvec3 sN=normalize((bindMatrixInverse*(skinWeight.x*boneMatX+skinWeight.y*boneMatY+skinWeight.z*boneMatZ+skinWeight.w*boneMatW)*bindMatrix*vec4(outN,0.)).xyz);')
      .replace('#include <project_vertex>','#include <project_vertex>\n{vec3 vn=normalize(normalMatrix*sN);vec2 d=(projectionMatrix*vec4(vn,0.)).xy*uRes;float l=length(d);if(l>1e-6)gl_Position.xy+=d/l*uOW*2.*gl_Position.w/uRes;gl_Position.z+=.002*gl_Position.w;}')};
  out.customProgramCacheKey=()=>'capyOutline';
  // contorno neon (efeito da loja): mesmo shader, outra cor
  const outNeon=new T.MeshBasicMaterial({color:'#45F0FF',side:T.BackSide});outNeon.onBeforeCompile=out.onBeforeCompile;outNeon.customProgramCacheKey=()=>'capyOutline';
  const cv=document.createElement('canvas');cv.width=cv.height=64;const g=cv.getContext('2d'),gr=g.createRadialGradient(32,32,0,32,32,32);gr.addColorStop(0,'rgba(0,0,0,.55)');gr.addColorStop(.6,'rgba(0,0,0,.28)');gr.addColorStop(1,'rgba(0,0,0,0)');g.fillStyle=gr;g.fillRect(0,0,64,64);
  const bt=new T.CanvasTexture(cv);
  capyM={out,outNeon,shine:new T.MeshBasicMaterial({color:'#FFFFFF'}),lid:patch(new T.MeshStandardMaterial({color:'#A86B40',roughness:.85,emissive:new T.Color('#3A2010')}),{key:'lid'}),
    blush:new T.MeshBasicMaterial({color:'#FF7FA0',transparent:true,opacity:.6,depthWrite:false}),blob:new T.MeshBasicMaterial({map:bt,transparent:true,depthWrite:false}),dashR:new T.MeshBasicMaterial({color:'#FFC531',depthWrite:false,transparent:true}),
    target:new T.MeshBasicMaterial({color:'#E8443A'}),targetW:new T.MeshBasicMaterial({color:'#FFF4E0'})};return capyM}
const xray=c=>xrayC[c]||(xrayC[c]=new T.MeshBasicMaterial({color:c,transparent:true,opacity:.6,depthFunc:T.GreaterDepth,depthWrite:false}));
// cor do pelo: o shader troca a cor da textura (que é marrom) pela cor escolhida, mantendo os detalhes; o chapéu (acima de y=.865 no modelo) fica como é
const FUR0=[0xB0,0x7A,0x4A].map(v=>Math.pow(v/255,2.2));
function furVec(hex,out){const c=new T.Color(hex);out=out||new T.Vector3();return out.set(c.r/FUR0[0],c.g/FUR0[1],c.b/FUR0[2])} // Color já é linear
// chapéu de palha: peça separada do modelo; aparece a não ser que o visual diga "sem nada na cabeça" (bots sempre usam)
const hatOn=(L,bot)=>!!bot||!L||L.hat!=='none';
let hatM=null;function hatMat(){if(!hatM&&CapyRig.map)hatM=patch(new T.MeshStandardMaterial({map:CapyRig.map,normalMap:CapyRig.nrm,normalScale:new T.Vector2(.8,.8),roughness:.8,metalness:0,emissiveMap:CapyRig.map,emissive:new T.Color(.5,.5,.5)}),{key:'capyHat'});return hatM}
const capyFurHex=(L,bot)=>bot?'#E2C48C':(L&&L.body)||'#B07A4A';
const FURF=['#include <map_fragment>','#include <map_fragment>\ndiffuseColor.rgb=furC(diffuseColor.rgb);'],FURE=['#include <emissivemap_fragment>','vec4 emissiveColor=texture2D(emissiveMap,vEmissiveMapUv);totalEmissiveRadiance*=furC(emissiveColor.rgb);'];
function capyBodyMat(a,hex){const m=new T.MeshStandardMaterial({map:CapyRig.map,normalMap:CapyRig.nrm,normalScale:new T.Vector2(.8,.8),roughness:.78,metalness:0,emissiveMap:CapyRig.map,emissive:new T.Color(.5,.5,.5)});
  m.userData.fur={value:furVec(hex||capyFurHex(a.look,a.bot))};
  if(!FLATC){const fa=(CapyRig.extras&&CapyRig.extras.furAvg)||'#c3835c';FLATC={value:new T.Color(fa)}}
  m.userData.sty={uPat:{value:0},uPatC:{value:new T.Color('#2A1A12')},uOut:{value:0},uOutC:{value:new T.Color('#FF4F9A')}};
  return patch(m,{key:'capy',uni:mm=>Object.assign({uFur:mm.userData.fur,uFlat:FLATC},mm.userData.sty),vd:'attribute float aFlat;varying float vFlat;varying vec3 vOP;\n',v:'vFlat=aFlat;vOP=position;',
    fd:'uniform vec3 uFur;uniform vec3 uFlat;varying float vFlat;varying vec3 vOP;uniform float uPat,uOut;uniform vec3 uPatC,uOutC;\n'+CAPY_STYLE+'\nvec3 furC(vec3 t){return capyStyle(mix(t,uFlat,clamp(vFlat,0.,1.))*(1.-.68*clamp(vFlat-1.,0.,1.))*uFur);}',fr:[FURF,FURE]})}
// pelagens (padrões no pelo) e roupas pintadas no corpo — tudo no shader, pela posição no modelo (acompanha a animação)
const CAPY_STYLE=`
float h3(vec3 p){return fract(sin(dot(p,vec3(127.1,311.7,74.7)))*43758.5453);}
float vn(vec3 p){vec3 i=floor(p),f=fract(p);f=f*f*(3.-2.*f);
  return mix(mix(mix(h3(i),h3(i+vec3(1,0,0)),f.x),mix(h3(i+vec3(0,1,0)),h3(i+vec3(1,1,0)),f.x),f.y),mix(mix(h3(i+vec3(0,0,1)),h3(i+vec3(1,0,1)),f.x),mix(h3(i+vec3(0,1,1)),h3(i+vec3(1,1,1)),f.x),f.y),f.z);}
vec3 capyStyle(vec3 c){vec3 p=vOP;float lum=dot(c,vec3(.3,.59,.11));
  if(uPat>.5){
    if(uPat<1.5){float s=sin(p.y*58.+sin(p.x*16.)*2.2+vn(p*9.)*3.);c=mix(c,c*.22,smoothstep(.45,.75,s)*step(p.y,.86));}            // tigre
    else if(uPat<2.5){float n=vn(p*26.);c=mix(c,c*.42,smoothstep(.62,.7,n));}                                                        // pintinhas
    else if(uPat<3.5){float n=vn(p*60.);c=mix(c,vec3(1.,.95,.6)*1.1,smoothstep(.83,.86,n));}                                          // estrelinhas
    else if(uPat<4.5){float n=vn(p*11.),n2=vn(p*17.+7.);vec3 cm=mix(vec3(.25,.3,.12),vec3(.45,.5,.25),step(.5,n));c=mix(cm,vec3(.12,.12,.06),step(.62,n2))*(.7+lum);} // camuflagem
    else if(uPat<5.5){c=mix(c*1.12,vec3(1.,.9,.8),.18+.14*smoothstep(.0,.25,p.z));}                                                  // pelúcia macia
    else{float n=vn(p*7.+vec3(0,0,0)),st=smoothstep(.86,.9,vn(p*70.));vec3 g=mix(vec3(.12,.05,.3),vec3(.5,.15,.6),n);g=mix(g,vec3(.15,.6,.9),smoothstep(.6,.8,vn(p*5.+3.)));c=mix(g,vec3(1.),st)*(.6+lum*.8);} // galáxia
  }
  if(uOut>.5){float ax=abs(p.x);float arm=smoothstep(.2,.24,ax)*step(.22,p.y);
    float torso=smoothstep(.26,.3,p.y)*(1.-smoothstep(.58,.62,p.y))*(1.-arm);
    float sleeve=arm*smoothstep(.36,.4,p.y);
    float m=0.;vec3 oc=uOutC;
    if(uOut<1.5){m=max(torso,sleeve);oc=mix(oc,vec3(1.),step(.5,fract(p.y*14.)));}                       // camiseta listrada
    else if(uOut<2.5){m=max(torso,arm*smoothstep(.24,.28,p.y));oc*=1.-.18*smoothstep(.36,.34,p.y)*step(.0,p.z);} // moletom (bolso)
    else if(uOut<3.5){m=max(torso,arm*smoothstep(.24,.28,p.y));oc=mix(oc,vec3(.85,.85,.8),(1.-smoothstep(.006,.012,ax))*step(.05,p.z));}   // jaqueta (zíper)
    else if(uOut<4.5){m=torso*(1.-smoothstep(.15,.2,ax)*smoothstep(.5,.54,p.y));}                       // regata
    else if(uOut<5.5){m=max(torso,arm*smoothstep(.24,.28,p.y));float v=(1.-smoothstep(.0,.01,ax-(.6-p.y)*.35))*step(.05,p.z)*step(.38,p.y);oc=mix(oc,vec3(.97),v);oc=mix(oc,vec3(.8,.1,.15),(1.-smoothstep(.008,.014,ax))*step(.05,p.z)*step(.38,p.y)*step(p.y,.58));} // terno
    else{m=smoothstep(.1,.13,p.y)*(1.-smoothstep(.5,.53,p.y))*(1.-arm);float strap=(1.-smoothstep(.02,.03,abs(ax-.1)))*step(.5,p.y)*(1.-smoothstep(.6,.62,p.y));m=max(m,strap);} // macacão
    c=mix(c,oc*(.75+lum*.55),m);}
  return c;}`;
let FLATC=null,depthOnly=null;
function newActor(a){const m=sharedCapyMats(),body=capyBodyMat(a);
  const q=Q(),A=CapyRig.make({body,outline:q.key==='low'?null:m.out,xray:q.key==='low'?null:xray(a.xc),hat:hatMat(),shine:m.shine,lid:m.lid,blush:m.blush},CAPY_H/CapyRig.MH);
  A.body.castShadow=q.key==='high'||q.key==='chaos'||(!isTouch&&q.key==='medium'); A.bot=a.bot;A.lookKey=a.bot?'bot':(a.look&&a.look.body);A.xc=a.xc;A.mat=body; // no celular em Média a sombra 3D da capivara sai (fica a sombrinha redonda)
  const blob=new T.Mesh(new T.PlaneGeometry(52,40).rotateX(-PI/2),m.blob);blob.position.y=.6;blob.renderOrder=3;A.g.add(blob);
  // anéis no chão: cor do time e o seu anel tracejado girando
  // anel do time (fino) e o SEU anel: círculo inteiro, translúcido, com brilho suave que pulsa — fica no chão, embaixo da capivara
  const ring=gfxMesh({fill:.05,inn:.8,edge:.1,a:.9});ring.scale.set(58,1,58);ring.position.y=.9;ring.visible=false;
  const dash=gfxMesh({fill:.14,inn:.72,edge:.14,glow:.55,a:.85});dash.scale.set(70,1,70);dash.position.y=1;dash.material.uniforms.uCol.value.set('#FFC531');dash.visible=false;
  const rg=new T.Group();rg.add(ring,dash);rg.position.z=-FEET*0;A.rings={g:rg,ring,dash};actG.add(rg);
  if(a.bot){const ch=A.B.chest;const r1=new T.Mesh(new T.RingGeometry(.03,.046,18),m.target),r2=new T.Mesh(new T.CircleGeometry(.03,18),m.targetW),r3=new T.Mesh(new T.CircleGeometry(.013,12),m.target);
    for(const [mm,z] of [[r1,.272],[r2,.27],[r3,.274]]){mm.position.set(0,-.07,z);mm.rotation.x=-.12;ch.add(mm)}}
  A.gun=null;A.gunId=-2;
  actG.add(A.g);return A}
function dropActor(id){const A=actors.get(id);if(!A)return;actG.remove(A.g);if(A.gun)actG.remove(A.gun);actG.remove(A.rings.g);A.rings.ring.material.dispose();if(A.mat)A.mat.dispose();actors.delete(id)}
// arma = modelo 3D low poly (03_guns3d.js) preso na mão direita, apontando para a mira
function setGun(A,gi){if(A.gun){actG.remove(A.gun);A.gun=null}A.gunId=gi;if(gi==null||gi<0)return;const g=Guns3D.instance(gi);if(!g)return;
  g.matrixAutoUpdate=false;g.traverse(o=>{if(o.isMesh){o.frustumCulled=false;o.castShadow=!o.material.userData.nocast&&!!(cur&&cur.q.sh)}});actG.add(g);A.gun=g}
let _v,_A,_N,_Y,_V,_m;
function syncActors(list,t,dt){if(!_v){_v=new T.Vector3();_A=new T.Vector3();_N=new T.Vector3();_Y=new T.Vector3();_V=new T.Vector3();_m=new T.Matrix4()}const seen=new Set();_V.set(0,1,K).normalize();
  for(const a of list){let A=actors.get(a.id);const lk=a.bot?'bot':(a.look&&a.look.body);
    if(A&&(A.lookKey!==lk||A.bot!==a.bot)){dropActor(a.id);A=null}if(!A){A=newActor(a);actors.set(a.id,A)}seen.add(a.id);A.hid=0;A.g.visible=true;
    if(A.xray&&A.xc!==a.xc){A.xray.material=xray(a.xc);if(A.hat[2])A.hat[2].material=A.xray.material;A.xc=a.xc}A.setHat(hatOn(a.look,a.bot));applySty(A,!!a.self);
    CapyRig.animate(A,{dt,t:t/1000,x:a.x,y:a.y,aim:a.aim,frozen:a.frozen,recoil:a.recoil,swing:a.swing,hurt:a.hurt,dashing:a.dash,melee:a.melee});
    A.g.position.set(a.x,0,a.y+FEET);A.g.updateMatrixWorld(true);
    dustFrom(A,a,dt);
    const R_=A.rings;R_.g.visible=true;R_.g.position.set(a.x,0,a.y+FEET);R_.ring.visible=!!a.ring&&!a.self;if(a.ring)R_.ring.material.uniforms.uCol.value.set(a.ring);R_.dash.visible=!!a.self;if(a.self){const au=STY.fx==='aura',pu=(au?1.12:1)+Math.sin(t/260)*.035;R_.dash.scale.set(70*pu,1,70*pu);R_.dash.material.uniforms.uGlow.value=au?1.3:.55;R_.dash.material.uniforms.uA.value=.75+.15*Math.sin(t/260);if(a.ring)R_.dash.material.uniforms.uCol.value.set(a.ring)}
    // piscar vermelho ao levar dano, azul com escudo
    const e=A.mat.emissive;if(a.hurt>0)e.setRGB(.4+a.hurt*.9,.4-a.hurt*.2,.4-a.hurt*.2);else if(a.shield)e.setRGB(.35,.55+Math.sin(t/90)*.2,.75);else e.setRGB(.5,.5,.5);
    // arma na mão
    const gi=(a.gun==null||a.noGun)?-1:a.gun;if(A.gunId!==gi)setGun(A,gi);const gun=A.gun;
    if(gun){A.B.handR.getWorldPosition(_v);const ang=a.aim+(a.melee?(-1+2*(a.swing||0))*1.1:0),cs=Math.cos(ang),sn=Math.sin(ang);
      _A.set(cs,0,sn);_Y.set(0,1,0);_N.set(-sn,0,cs);const rc=(a.recoil||0)*5,S=GUN3_SCALE;
      _m.makeBasis(_A.clone().multiplyScalar(S),_Y.clone().multiplyScalar(S),_N.clone().multiplyScalar(S));_m.setPosition(_v.x+cs*(2-rc),_v.y+1,_v.z+sn*(2-rc));gun.matrix.copy(_m);gun.matrixWorldNeedsUpdate=true;gun.visible=true}}
  for(const [id,A] of actors)if(!seen.has(id)){A.g.visible=false;if(A.gun)A.gun.visible=false;A.rings.g.visible=false;A.hid=(A.hid||0)+dt;if(A.hid>15)dropActor(id)}}
// paredes (Pá de Pedreiro) e caixas (Caixa de Papelão) construídas na partida: 3D e com colisão igual (o retângulo da simulação)
let bldMat=null;
function syncBuilds(){if(!bldMat){bldMat={wall:patch(new T.MeshStandardMaterial({vertexColors:true,flatShading:true,roughness:.9}),{key:'bw'}),box:patch(new T.MeshStandardMaterial({vertexColors:true,flatShading:true,roughness:.95}),{key:'bb'})}}
  const seen=new Set(),list=typeof builds!=='undefined'?builds:[];
  for(const b of list){if(b.k!=='wall'&&b.k!=='box')continue;seen.add(b.id);let e=blds.get(b.id);
    if(!e){const Bd=makeBuilder(b.id*7+3),G=lib(),occ=b.y-b.h/2+6;
      if(b.k==='wall'){const vert=b.h>b.w;Bd.add(G.cbox(b.w,40,b.h,3),{p:[0,0,0],c:()=>pick(['#D2603F','#C9563A','#BF4E33']),jit:.06,occ});Bd.add(G.cbox(b.w+4,5,b.h+4,1.5),{p:[0,40,0],c:'#E9D7B5',occ,ao:0});
        const n=Math.max(1,Math.floor((vert?b.h:b.w)/28));for(let i=0;i<n;i++)Bd.add(G.box(vert?b.w+.6:1.2,40,vert?1.2:b.w+.6).translate(0,0,0),{p:vert?[0,0,-b.h/2+(i+.5)*b.h/n]:[-b.w/2+(i+.5)*b.w/n,0,0],c:'#E8D5C0',ao:0,jit:0,occ})}
      else{const h=Math.min(b.w,b.h)*.85;Bd.add(G.cbox(b.w,h,b.h,2),{p:[0,0,0],c:'#C9A06A',occ,jit:.04});Bd.add(G.box(b.w*.22,h+.8,b.h+.8),{p:[0,0,0],c:'#E8D3A8',occ,ao:0,jit:0});Bd.add(G.box(b.w+.8,1,b.h+.8),{p:[0,h*.5,0],c:'#8B5A2B',occ,ao:0,jit:0})}
      const grp=new T.Group();Bd.build({std:bldMat[b.k]},grp);grp.position.set(b.x,0,b.y);bldG.add(grp);e={grp,t0:performance.now()};blds.set(b.id,e)}
    const k=clamp((performance.now()-e.t0)/220,0,1);e.grp.scale.set(1,.2+.8*k*(2-k),1)}
  for(const [id,e] of blds)if(!seen.has(id)){bldG.remove(e.grp);e.grp.traverse(o=>{if(o.geometry)o.geometry.dispose()});blds.delete(id)}}
let capyBad=false;
const capysOn=M=>!capyBad&&ensure(M)&&capyReady();
// ---------- Poeirinha no chão (passos, dash, pulinhos): bolinhas low poly que estufam e somem ----------
const DN=220;let dust=null,dustMax=0;
function dustInit(){const m=patch(new T.MeshStandardMaterial({flatShading:true,roughness:1,metalness:0,color:'#ffffff'}),{key:'dust'});
  const im=new T.InstancedMesh(new T.IcosahedronGeometry(1,0),m,DN);im.instanceMatrix.setUsage(T.DynamicDrawUsage);im.instanceColor=new T.InstancedBufferAttribute(new Float32Array(DN*3),3);
  im.count=0;im.frustumCulled=false;im.renderOrder=1;dust={im,list:[],m4:new T.Matrix4(),q:new T.Quaternion(),e:new T.Euler(),v:new T.Vector3(),s:new T.Vector3(),c:new T.Color(),hs:{h:0,s:0,l:0}}}
function puff(x,z,n,f,spread,dirx,dirz){if(!dust)return;const L=dust.list;for(let i=0;i<n&&L.length<DN;i++){const a=Math.random()*TAU,sp=(20+Math.random()*45)*f*spread;
  L.push({x:x+Math.cos(a)*4,y:1.5,z:z+Math.sin(a)*3,vx:Math.cos(a)*sp+(dirx||0)*(30+Math.random()*40),vy:18+Math.random()*30*f,vz:Math.sin(a)*sp*.8+(dirz||0)*(30+Math.random()*40),
    s:(5.5+Math.random()*5)*(.75+f*.45),age:0,life:.38+Math.random()*.32,rx:Math.random()*3,ry:Math.random()*3,l:(Math.random()-.5)*.12})}}
function dustFrom(A,a,dt){if(!dust){dustInit();actG.add(dust.im)}if(dust.im.parent!==actG)actG.add(dust.im);
  const fx=a.self?STY.fx:'',v=dust.v;
  for(const e of A.ev){if(e.k==='step'){const b=e.foot==='L'?A.B.footL:A.B.footR;if(!b)continue;b.getWorldPosition(v);puff(v.x,v.z+4,3,e.f,1);
      if(fx==='hearts')FX3D.part({k:'heart',x:v.x,y:v.z+4,h:3,vh:40,drag:1.5,size:4.5,life:.9,col:'#FF4F9A',rx:0,ry:Math.random()*6,vry:2});
      if(fx==='bubbles')FX3D.part({k:'glow',x:v.x+(Math.random()-.5)*8,y:v.z+4,h:4,vh:45,drag:1,size:3+Math.random()*2.5,life:.9,col:'#BFF1FF'})}
    else if(e.k==='land')puff(a.x,a.y+FEET,9,1.2,1.6);
    else if(e.k==='dash'){const dx=-Math.cos(a.aim),dz=-Math.sin(a.aim);puff(a.x,a.y+FEET,10,1.3,1.3,dx,dz)}}A.ev.length=0;
  if(a.dash){A.dustT=(A.dustT||0)-dt;if(A.dustT<=0){A.dustT=.045;puff(a.x,a.y+FEET,2,.9,.6);
    if(fx==='rainbow')for(let i=0;i<2;i++)FX3D.part({k:'glow',x:a.x+(Math.random()-.5)*14,y:a.y+FEET+(Math.random()-.5)*10,h:8+Math.random()*20,drag:2,size:5,life:.5,col:'hsl('+((performance.now()/4+i*60)%360|0)+',100%,62%)'});
    if(fx==='sparks')FX3D.burst(a.x,a.y+FEET,14,2,['#FFF066','#FFC531'],'star',160,3.5,.4)}}}
function dustTick(dt,col){if(!dust)return;const D=dust,L=D.list;D.c.set(col||'#F1E6CF');D.c.getHSL(D.hs);let n=0;
  for(let i=L.length-1;i>=0;i--){const p=L[i];p.age+=dt;if(p.age>=p.life){L.splice(i,1);continue}const k=p.age/p.life,dr=Math.exp(-5*dt);p.vx*=dr;p.vz*=dr;p.vy*=Math.exp(-3*dt);
    p.x+=p.vx*dt;p.y+=p.vy*dt;p.z+=p.vz*dt;const sc=p.s*Math.pow(Math.sin(Math.PI*Math.min(1,k*1.15+.05)),.55)*(1+k*.6);
    D.m4.compose(D.v.set(p.x,p.y,p.z),D.q.setFromEuler(D.e.set(p.rx+k*2,p.ry,0)),D.s.set(sc,sc*.85,sc));D.im.setMatrixAt(n,D.m4);D.c.setHSL(D.hs.h,D.hs.s,clamp(D.hs.l+p.l,0,1));D.im.setColorAt(n,D.c);n++}
  D.im.count=n;if(n>dustMax)dustMax=n;D.im.instanceMatrix.needsUpdate=true;if(D.im.instanceColor)D.im.instanceColor.needsUpdate=true}


// =====================================================================
// MENU 3D: a capivara num deque de madeira sobre a lagoa roxa (tela inicial, visual e montar partida)
// =====================================================================
let MN=null;const DOCKS=.74,CAPYS=1.28,DOCKY=13.6*DOCKS;
// fundos do menu: lagoas de várias cores (só a roxa tem vitórias-régias) e quadros (imagem atrás, só o deque e a capivara)
const MBG={lagoa:['#6A3BC0','#3A1C80','#B59AF0','#2A1366',1],azul:['#2F7FD0','#123A80','#9AD8FF','#0B2050'],rosa:['#D35FA6','#7A2A78','#FFC2E4','#4A1650'],esmeralda:['#2FA88A','#0E5A52','#A8F0D8','#06302E'],
  noite:['#2A2F6A','#0E1030','#7F8BDA','#05061A'],sol:['#F08A4A','#9A3A5A','#FFD7A0','#4A1A3A']};
function menuBuild(){const sc=new T.Scene(),q={lam:false},G=lib();let B=makeBuilder(4242),r=B.rnd;
  // deque de tábuas
  const planks=['#C99A5E','#BF8E52','#D2A468','#B98A50','#C79458'];
  for(let i=0;i<7;i++){const x=-66+i*22;B.add(G.cbox(20.4,6,128+(r()-.5)*6,1.6),{p:[x,7+(r()-.5)*.8,(r()-.5)*3],r:[(r()-.5)*.02,(r()-.5)*.03,(r()-.5)*.025],c:pick2(planks,r),jit:.06,ao:0});
    for(const z of [-46,46])for(const dx of [-5,5])B.add(G.cyl(.9,.9,.6,5),{p:[x+dx,13.2,z],c:'#5E4A38',ao:0,jit:0})}
  for(const z of [-46,46])B.add(G.box(152,6,10),{p:[0,1,z],c:'#7E5430',jit:.04,ao:0});
  for(const [x,z] of [[-75,-58],[75,-58],[-75,58],[75,58]]){B.add(G.cyl(8.5,9.5,52,8),{p:[x,-28,z],c:'#9A6A3A',jit:.06,ao:0});B.add(G.cyl(9.8,8.8,3.4,8),{p:[x,24,z],c:'#B5844E',ao:0,jit:.04});
    for(const y of [11,16.5])B.add(new T.TorusGeometry(9.9,1.7,5,12).rotateX(PI/2),{p:[x,y,z],c:'#E2C48C',ao:0,jit:.05})}
  const rope=(a,b)=>{const v=new T.Vector3(b[0]-a[0],b[1]-a[1],b[2]-a[2]),L=v.length(),g=new T.CylinderGeometry(1.6,1.6,L,5).translate(0,L/2,0);g.applyQuaternion(new T.Quaternion().setFromUnitVectors(new T.Vector3(0,1,0),v.normalize()));B.add(g,{p:a,c:'#D9B77E',ao:0,jit:.05})};
  rope([-75,20,58],[-75,4,-58]);rope([-75,4,58],[-75,20,-58]);rope([75,20,58],[75,4,-58]);rope([75,4,58],[75,20,-58]);
  // vitórias-régias e flores de lótus
  const pad=(x,z,R,a,fl)=>{B.add(new T.CylinderGeometry(R,R,1.4,24,1,false,a+.2,PI*2-.4).translate(0,.7,0),{p:[x,.4,z],c:'#CEDC5C',jit:.04,ao:0});
    B.add(new T.CylinderGeometry(R*1.02,R*.98,1,24,1,false,a+.2,PI*2-.4),{p:[x,-.2,z],c:'#8FA23A',jit:.02,ao:0});
    for(let i=0;i<7;i++){const b=a+.5+i/7*(PI*2-1);B.add(G.box(R*.9,.4,.9).translate(R*.45,0,0),{p:[x,1.15,z],r:[0,-b,0],c:'#B9C94C',ao:0,jit:.02})}
    if(fl)for(const [fx,fz,fs] of fl){const cx=x+fx,cz=z+fz;B.add(new T.IcosahedronGeometry(2.6*fs,0),{p:[cx,4*fs,cz],c:'#FFD23A',ao:0});
      for(let i=0;i<8;i++){const b=i/8*PI*2;B.add(new T.ConeGeometry(2.6*fs,9*fs,4).translate(0,4.5*fs,0),{p:[cx+Math.cos(b)*2.4*fs,1.5,cz+Math.sin(b)*2.4*fs],r:[.75,-b+PI/2,0],c:i%2?'#FFFFFF':'#FFE8F2',ao:0,jit:.02})}}};
  const mm=stdMat(q,{std:{roughness:.85}},{key:'menu'}),dockG=new T.Group();B.build({std:mm},dockG);dockG.scale.setScalar(DOCKS);sc.add(dockG);B=makeBuilder(99);r=B.rnd;
  pad(-150,-30,34,.6,[[10,-6,1]]);pad(150,20,46,2.4,[[-14,-8,1.2],[8,10,1],[20,-14,.9]]);pad(118,-90,22,4);pad(-120,90,26,1.3);pad(-230,-120,30,3.2,[[0,0,1]]);pad(250,-170,28,.2);pad(40,150,18,5.1);pad(-60,-150,20,2.2);
  const padG=new T.Group();B.build({std:mm},padG);sc.add(padG);
  // água
  const water=new T.Mesh(new T.PlaneGeometry(6000,6000,1,1).rotateX(-PI/2),new T.ShaderMaterial({uniforms:{uT:{value:0},cA:{value:new T.Color('#6A3BC0')},cB:{value:new T.Color('#3A1C80')},cL:{value:new T.Color('#B59AF0')},cBg:{value:new T.Color('#2A1366')}},
    vertexShader:'varying vec3 vP;void main(){vP=(modelMatrix*vec4(position,1.)).xyz;gl_Position=projectionMatrix*viewMatrix*vec4(vP,1.);}',
    fragmentShader:`uniform float uT;uniform vec3 cA,cB,cL,cBg;varying vec3 vP;
      void main(){vec2 p=vP.xz;float d=length(p*vec2(1.,1.25));
        vec3 col=mix(cA,cB,smoothstep(80.,900.,d));
        float w=sin(p.x*.02+uT*.55)+sin(p.y*.026-uT*.45+sin(p.x*.008))+sin((p.x+p.y)*.013+uT*.35);
        float ln=1.-smoothstep(.0,.06,abs(fract(w*.32)-.5)-.40);col=mix(col,cL,ln*.20*(1.-smoothstep(300.,1100.,d)));
        float rg=1.-abs(fract(d/210.-uT*.025)-.5)*2.;col=mix(col,cL,pow(rg,18.)*.16);
        vec2 q=abs(p)-vec2(78.,62.);float dock=1.-smoothstep(0.,26.,max(q.x,q.y));col*=1.-dock*.35;
        col=mix(col,cBg,smoothstep(700.,2200.,d));gl_FragColor=vec4(col,1.);
        #include <colorspace_fragment>
      }`}));
  water.position.y=-2;sc.add(water);
  // brilhinhos flutuando
  const spN=40,sp=new T.InstancedMesh(new T.IcosahedronGeometry(1,0),new T.MeshBasicMaterial({color:'#E9DCFF',transparent:true,blending:T.AdditiveBlending,depthWrite:false}),spN);sp.frustumCulled=false;sc.add(sp);
  const spD=Array.from({length:spN},()=>({x:(Math.random()-.5)*900,z:-Math.random()*500+80,h:Math.random()*160,s:.5+Math.random()*1.1,ph:Math.random()*6}));
  // luzes
  sc.add(new T.HemisphereLight('#D6C8FF','#3A1F6A',1.25));
  const sun=new T.DirectionalLight('#FFE9D0',2.1);sun.position.set(-120,260,200);sun.castShadow=true;sun.shadow.mapSize.set(1024,1024);const sc0=sun.shadow.camera;sc0.left=-170;sc0.right=170;sc0.top=170;sc0.bottom=-170;sc0.near=10;sc0.far=900;sun.shadow.bias=-.0008;sun.shadow.normalBias=.6;sc.add(sun);
  const rim=new T.DirectionalLight('#B38CFF',1.3);rim.position.set(160,120,-220);sc.add(rim);
  const cam=new T.PerspectiveCamera(30,1,10,6000);
  return{sc,water,sp,spD,cam,padG,dockG,bg:'',gun:null,gunId:-2,A:null,mat:null,warm:0,v:{tx:0,ty:30,d:440,el:.5,off:0},spin:0,spinV:0}}
const MVIEW={home:{ty:76,d:360,el:.4,off:0},side:{ty:36,d:340,el:.36,off:.24},wide:{ty:36,d:380,el:.38,off:.3}};
function menuCapy(){const m=sharedCapyMats(),mat=capyBodyMat({},'#B07A4A');const A=CapyRig.make({body:mat,outline:m.out,xray:null,hat:hatMat(),shine:m.shine,lid:m.lid,blush:m.blush},CAPY_H/CapyRig.MH);A.mat=mat;return A}
let menuT=0,menuOk=false;
function menu(t,o){if(st==='idle')load();if(st!=='ready'||lost)return false;if(!R&&!initR())return false;
  if(!MN){try{MN=menuBuild()}catch(e){console.error('menu 3D',e);return false}}
  if(!MN.A&&capyReady()){MN.A=menuCapy();MN.A.g.scale.setScalar(CAPYS);MN.A.g.position.set(0,DOCKY,0);MN.sc.add(MN.A.g);MN.warm=0}
  if(!MN.warm&&!compiling){MN.warm=-1;compiling=true;loading(true);MN.cam.aspect=innerWidth/innerHeight;MN.cam.updateProjectionMatrix();
    const done=()=>{compiling=false;loading(false);MN.warm=1};(R.compileAsync&&R.extensions.has('KHR_parallel_shader_compile')?R.compileAsync(MN.sc,MN.cam):new Promise(r=>setTimeout(()=>{R.compile(MN.sc,MN.cam);r()},30))).then(done,done)}
  if(MN.warm!==1)return false;
  const dt=clamp((t-(menuT||t))/1000,0,.1);menuT=t;
  const dpr=Math.min(window.devicePixelRatio||1,isTouch?1.25:1.5),bud=(isTouch?(S.quality==='low'?.4e6:.7e6):(S.quality==='low'?.9e6:2.2e6))*autoS;let w=innerWidth*dpr,h=innerHeight*dpr;const sc=Math.min(1,Math.sqrt(bud/(w*h)));w=Math.max(2,Math.round(w*sc));h=Math.max(2,Math.round(h*sc));
  if(glCv.width!==w||glCv.height!==h){R.setSize(w,h,false)}
  document.body.classList.add('g3don','g3menu');sharedCapyMats();OU.uRes.value.set(w,h);OU.uOW.value=Math.max(1.8,h*.0052);
  const V=MVIEW[o.view]||MVIEW.home,v=MN.v,k=Math.min(1,dt*5);for(const key of ['ty','d','el','off'])v[key]+=(V[key]-v[key])*k;
  const cam=MN.cam,asp=w/h;cam.aspect=asp;const nar=asp<1.1;cam.fov=nar?42:30;
  const D=v.d*(nar?1.25:1);cam.position.set(0,v.ty+Math.sin(v.el)*D,Math.cos(v.el)*D);cam.lookAt(0,v.ty,0);cam.updateMatrixWorld();
  cam.filmOffset=nar?0:v.off*cam.getFilmWidth();if(nar&&o.view!=='home')cam.setViewOffset(w,h,0,h*.24,w,h);else cam.clearViewOffset();cam.updateProjectionMatrix();
  // capivara: parada, fofinha; arrastar gira, clique faz gracinha
  if(!o.drag)MN.spin*=Math.exp(-dt*1.6);
  // fundo
  const bgk=o.bg||'lagoa';if(MN.bg!==bgk){MN.bg=bgk;const c=MBG[bgk];MN.water.visible=!!c;MN.padG.visible=!!(c&&c[4]);MN.sp.visible=!!c||false;
    if(c){const u=MN.water.material.uniforms;u.cA.value.set(c[0]);u.cB.value.set(c[1]);u.cL.value.set(c[2]);u.cBg.value.set(c[3]);MN.clear=c[3]}else MN.clear=null}
  // arma na mão (Arsenal): a capivara segura a arma escolhida, virada de lado
  const gi=o.gun==null?-1:o.gun;if(MN.gunId!==gi){if(MN.gun){MN.sc.remove(MN.gun);MN.gun=null}MN.gunId=gi;if(gi>=0){const g=Guns3D.instance(gi);if(g){g.matrixAutoUpdate=false;g.traverse(x=>{if(x.isMesh){x.castShadow=true;x.frustumCulled=false}});MN.sc.add(g);MN.gun=g;if(MN.A)CapyRig.poke(MN.A)}}}
  if(MN.A){const A=MN.A,aim=gi>=0?PI/2-1.05+MN.spin:PI/2+MN.spin;furVec(o.fur||'#B07A4A',A.mat.userData.fur.value);A.setHat(o.hat!==false);applySty(A,true);CapyRig.animate(A,{dt,t:t/1000,x:0,y:0,aim,relax:gi<0,calm:true});A.g.position.set(0,DOCKY,0);A.g.updateMatrixWorld(true);
    if(MN.gun){const v=new T.Vector3();A.B.handR.getWorldPosition(v);const cs=Math.cos(aim),sn=Math.sin(aim),S=GUN3_SCALE*CAPYS,m=new T.Matrix4().makeBasis(new T.Vector3(cs,0,sn).multiplyScalar(S),new T.Vector3(0,S,0),new T.Vector3(-sn,0,cs).multiplyScalar(S));
      m.setPosition(v.x+cs*2*CAPYS,v.y+1,v.z+sn*2*CAPYS);MN.gun.matrix.copy(m);MN.gun.matrixWorldNeedsUpdate=true}}
  const ts=t/1000;MN.water.material.uniforms.uT.value=ts;U.uTime.value=ts;U.uDark.value=0;U.uNL.value=0;U.uClipOn.value=0;
  const m4=new T.Matrix4();MN.spD.forEach((p,i)=>{const hh=(p.h+ts*12)%170;m4.makeScale(p.s*(.6+.4*Math.sin(ts*2+p.ph)),p.s,p.s).setPosition(p.x+Math.sin(ts*.5+p.ph)*20,hh,p.z);MN.sp.setMatrixAt(i,m4)});MN.sp.instanceMatrix.needsUpdate=true;
  camera&&camera.layers.set(0);cam.layers.set(0);if(MN.clear)R.setClearColor(MN.clear,1);else R.setClearColor(0x000000,0);R.shadowMap.needsUpdate=!isTouch||(++frameN%3===0);R.render(MN.sc,cam);menuOk=true;return true}
function preload(M){try{return ensure(M)&&!compiling&&!!(cur&&cur.warm)&&(!capyReady()||capyWarm)}catch(e){return false}}
// aquecimento em segundo plano (menus e tela de carregamento): monta as 67 armas e os ícones aos poucos, sem travar
let pwI=0,pwJ=0;
function prewarm(ms){if(st!=='ready'||!R||lost||compiling)return true;const t0=performance.now();
  while(performance.now()-t0<ms){if(pwI<GUNS.length){Guns3D.build(pwI++);continue}if(pwJ<GUNS.length){gunIconBig(pwJ++);continue}return true}return false}
// visual equipado (só para a SUA capivara): pelagem, roupa e efeito
let STY={pat:0,patC:'#2A1A12',out:0,outC:'#FF4F9A',fx:''};
function setStyle(o){STY=Object.assign({pat:0,patC:'#2A1A12',out:0,outC:'#FF4F9A',fx:''},o||{})}
function applySty(A,on){const u=A.mat&&A.mat.userData.sty;if(!u)return;const s=on?STY:null;u.uPat.value=s?s.pat:0;u.uPatC.value.set(s?s.patC:'#2A1A12');u.uOut.value=s?s.out:0;u.uOutC.value.set(s?s.outC:'#FF4F9A');
  const m=sharedCapyMats(),ol=on&&STY.fx==='neon'?m.outNeon:m.out;if(A.outline&&A.outline.material!==ol){A.outline.material=ol;if(A.hat[1])A.hat[1].material=ol}}
const styKey=(o=STY)=>o.pat+'|'+o.out+'|'+o.outC+'|'+o.fx;
function menuSpin(dx){if(MN)MN.spin+=dx*.012}
function menuPoke(){if(MN&&MN.A)CapyRig.poke(MN.A)}
// retrato 3D da capivara (cabeça ou corpo todo), guardado por cor e tamanho — usado no HUD, nos menus e no pódio
const capyIcons=new Map();let ICN=null;
function capyIcon(hex,w,h,mode='head',hat=true,sty=false){const so=sty&&typeof sty==='object'?Object.assign({pat:0,patC:'#2A1A12',out:0,outC:'#FF4F9A',fx:''},sty):sty?STY:null;const key=hex+'|'+w+'x'+h+'|'+mode+'|'+(hat?1:0)+'|'+(so?styKey(so):'');if(capyIcons.has(key))return capyIcons.get(key);if(st==='idle')load();if(st!=='ready'||lost)return null;if(!R&&!initR())return null;if(!capyReady())return null;
  if(!ICN){const sc=new T.Scene();sc.add(new T.HemisphereLight('#E8DEFF','#4A2F8A',1.4));const d=new T.DirectionalLight('#FFF1DC',2.2);d.position.set(-.6,1,1.2);sc.add(d);const f=new T.DirectionalLight('#B38CFF',1.1);f.position.set(1,.4,-1);sc.add(f);
    const A=menuCapy();sc.add(A.g);for(let i=0;i<40;i++)CapyRig.animate(A,{dt:.05,t:i*.05,x:0,y:0,aim:PI/2-.42,relax:true});ICN={sc,A,cam:new T.PerspectiveCamera(24,1,1,2000)}}
  furVec(hex,ICN.A.mat.userData.fur.value);ICN.A.setHat(hat);{const keep=STY;if(so)STY=so;applySty(ICN.A,!!so);STY=keep}const cam=ICN.cam;cam.aspect=w/h;
  if(mode==='full'){cam.position.set(0,52,250);cam.lookAt(0,31,0)}else{cam.position.set(0,58,118);cam.lookAt(0,46,0)}cam.updateProjectionMatrix();
  const out=snap(ICN.sc,cam,w,h);if(out)capyIcons.set(key,out);return out}
function snap(scene,cam,w,h){const S2=2,W2=w*S2,H2=h*S2;if(!iconRT||iconRT.width!==W2||iconRT.height!==H2){if(iconRT)iconRT.dispose();iconRT=new T.WebGLRenderTarget(W2,H2,{samples:4})}
  const keep=[U.uClipOn.value,U.uDark.value];U.uClipOn.value=0;U.uDark.value=0;const oc=new T.Color();R.getClearColor(oc);const oa=R.getClearAlpha(),ort=R.getRenderTarget();
  if(OU.uRes.value){OU.uRes.value.set(W2,H2);OU.uOW.value=Math.max(2,H2*.012)}
  R.setRenderTarget(iconRT);R.setClearColor(0x000000,0);R.clear();R.render(scene,cam);const out=readRT(iconRT,W2,H2);R.setRenderTarget(ort);R.setClearColor(oc,oa);[U.uClipOn.value,U.uDark.value]=keep;
  const cv=document.createElement('canvas');cv.width=w;cv.height=h;cv.getContext('2d').drawImage(out,0,0,w,h);return cv}

// =====================================================================
// MARCAS NO CHÃO (mira, alcance, área de explosão, anel do jogador): formas desenhadas por shader direto no chão 3D.
// Ficam no chão de verdade: a capivara passa por cima delas (e na frente delas quando está à frente).
// =====================================================================
const GFX_VS='varying vec2 vUv;void main(){vUv=uv;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);}';
const GFX_FS=`uniform vec3 uCol;uniform float uA,uMode,uHalf,uIn,uEdge,uFill,uDash,uProg,uT,uGlow;varying vec2 vUv;
void main(){float a=0.;
  if(uMode<.5){vec2 p=vUv*2.-1.;float r=length(p);if(r>1.||r<uIn)discard;float ang=atan(p.y,p.x);if(abs(ang)>uHalf)discard;
    float e=uEdge;float rim=smoothstep(1.-e*1.8,1.-e*.8,r)*(1.-smoothstep(1.-e*.35,1.,r));
    float inn=uIn>0.?smoothstep(uIn+e*.9,uIn+e*.2,r)*smoothstep(uIn-.001,uIn+e*.1,r):0.;
    float side=uHalf<3.1?(1.-smoothstep(.006,.016,(uHalf-abs(ang))*max(r,.15)))*step(.08,r)*.75:0.;
    float edge=max(max(rim,inn),side);
    if(uDash>0.){float q=fract((ang+3.14159)/6.28318*uDash+uT*.06);edge*=smoothstep(.0,.06,q)*smoothstep(.62,.56,q);}
    if(uProg<1.){float q=fract((-ang+1.5708)/6.28318);edge*=step(q,uProg);}
    float fill=uFill*(.45+.55*r)*(1.-smoothstep(.97,1.,r));
    float glow=uGlow*exp(-pow((1.-r)/.12,2.));
    a=max(max(edge,fill),glow);
  }else{float x=vUv.x,y=abs(vUv.y-.5)*2.;
    float fill=uFill*(1.-x*.55)*(1.-smoothstep(.75,1.,y));float side=smoothstep(1.-uEdge*2.2,1.-uEdge*.9,y)*(1.-smoothstep(1.-uEdge*.3,1.,y))*.6;
    float d=fract(x*uDash-uT*1.4);float dots=(1.-smoothstep(.12,.22,y))*smoothstep(.0,.1,d)*smoothstep(.55,.45,d)*smoothstep(0.,.08,x);
    a=max(max(fill,side),dots*.95)*(1.-smoothstep(.93,1.,x));}
  gl_FragColor=vec4(uCol,a*uA);
  #include <colorspace_fragment>
}`;
let gfxGeo=null,gfxLane=null;
function gfxMat(o={}){const u={uCol:{value:new T.Color(o.col||'#ffffff')},uA:{value:o.a??1},uMode:{value:o.mode||0},uHalf:{value:o.half??PI+.1},uIn:{value:o.inn||0},uEdge:{value:o.edge??.08},uFill:{value:o.fill??.12},
    uDash:{value:o.dash||0},uProg:{value:o.prog??1},uT:U.uTime,uGlow:{value:o.glow||0}};
  const m=new T.ShaderMaterial({uniforms:u,vertexShader:GFX_VS,fragmentShader:GFX_FS,transparent:true,depthWrite:false,side:T.DoubleSide});return m}
function gfxMesh(o={},lane){if(!gfxGeo){gfxGeo=new T.PlaneGeometry(1,1).rotateX(-PI/2);gfxLane=new T.PlaneGeometry(1,1).rotateX(-PI/2).translate(.5,0,0)}
  const m=new T.Mesh(lane?gfxLane:gfxGeo,gfxMat(o));m.renderOrder=2;m.frustumCulled=false;return m}
// mira 3D (05_render.js manda o estado em Map3D.setAim)
let aimS=null,aimG=null;const AM={};
function setAim(a){aimS=a}
function aimTick(c,t){if(!aimG){aimG=new T.Group();aimG.name='mira';
    AM.lane=gfxMesh({mode:1,fill:.24,edge:.14,dash:.06},true);AM.sector=gfxMesh({fill:.1,edge:.02});AM.range=gfxMesh({fill:0,edge:.012,dash:90,a:.55});
    AM.zone=gfxMesh({fill:.16,edge:.06,dash:16});AM.zone2=gfxMesh({fill:.08,edge:.03,a:.5});AM.ret=gfxMesh({fill:0,inn:.62,edge:.16,dash:4});AM.dot=gfxMesh({fill:.9,edge:.5});AM.cd=gfxMesh({fill:0,inn:.84,edge:.2});
    AM.tip=gfxMesh({fill:0,edge:.25,half:.5,a:.95});AM.box=gfxMesh({mode:1,fill:.25,edge:.2,dash:0},false);
    for(const k in AM)aimG.add(AM[k])}
  if(aimG.parent!==c.scene)c.scene.add(aimG);for(const k in AM)AM[k].visible=false;const s=aimS;if(!s){return}
  const Y=.7,set=(m,x,z,r,col,o={})=>{m.visible=true;m.position.set(x,o.y??Y,z);m.scale.set(r*2,1,r*2);m.rotation.y=o.rot??0;const u=m.material.uniforms;u.uCol.value.set(col);if(o.half!=null)u.uHalf.value=o.half;if(o.a!=null)u.uA.value=o.a;if(o.prog!=null)u.uProg.value=o.prog};
  const ca=Math.cos(s.a),sa=Math.sin(s.a),rot=-s.a,pulse=.85+.15*Math.sin(t/180);
  if(s.kind==='melee')set(AM.sector,s.px,s.py,s.reach,s.col,{rot,half:s.half,a:.95});
  else if(s.kind==='build'){if(s.bk==='wall'){const m=AM.box;m.visible=true;m.position.set(s.bx-(s.bw/2),Y,s.by);m.rotation.y=0;m.scale.set(s.bw,1,s.bh);m.material.uniforms.uCol.value.set(s.col)}else set(AM.zone,s.bx,s.by,s.br,s.col,{a:.9})}
  else if(s.kind==='instant'){set(AM.range,s.px,s.py,s.reach,'#ffffff',{a:.45});set(AM.zone,s.rx,s.ry,s.blast,'#FF3B47',{a:.95*pulse});}
  else{const L=Math.max(30,s.len);const m=AM.lane;m.visible=true;m.position.set(s.px+ca*22,Y,s.py+sa*22);m.rotation.y=rot;m.scale.set(Math.max(1,L-22),1,s.w);m.material.uniforms.uCol.value.set(s.col);m.material.uniforms.uDash.value=Math.max(2,L/26);
    if(s.spr>.2)set(AM.sector,s.px,s.py,s.reach,s.col,{rot,half:s.spr/2,a:.7});
    set(AM.tip,s.px+ca*s.reach,s.py+sa*s.reach,16,s.col,{rot});
    if(s.blast)set(AM.zone,s.zx,s.zy,s.blast,s.zcol,{a:.9*pulse})}
  // retículo no chão onde o mouse aponta + anel de recarga
  // marca suave no chão sob o mouse (o retículo nítido é desenhado por cima, no canvas, sem atraso)
  if(s.cx!=null&&!isTouch){const col=s.inRange?s.col:'#9AA3B3';set(AM.ret,s.cx,s.cy,15,col,{a:.55,y:Y+.2});AM.ret.rotation.y=-t/1400}}

// ---------- Kit para outros módulos (armas 3D) ----------
let gunMats=null;
function kit(){if(!T)T=window.THREE;if(!U)U={uTime:{value:0},uClipOn:{value:0},uDark:{value:0},uDarkCol:{value:new T.Vector3()},uNL:{value:0},uL:{value:Array.from({length:NL},()=>new T.Vector4(0,0,1,0))}};
  return{makeBuilder,lib,patch,U,mats(){if(!gunMats){const q={lam:false};gunMats={std:stdMat(q,{std:{roughness:.55,metalness:.12}},{key:'gun'}),emit:basicMat({},{dm:.1,key:'gunE'}),
    glass:stdMat(q,{std:{roughness:.15,metalness:.1,transparent:true,opacity:.7}},{key:'gunG'})};gunMats.emit.userData.nocast=true;gunMats.glass.userData.nocast=true}return gunMats}}}
function stats(){if(!R||!cur)return null;let tris=0,meshes=0;cur.scene.traverse(o=>{if(o.isMesh){meshes++;const g=o.geometry;tris+=(g.index?g.index.count:g.attributes.position.count)/3}});
  return{progs:(R.info.programs||[]).map(p=>p.name+':'+p.cacheKey.slice(0,40)),map:curKey,buildMs,meshes,tris:Math.round(tris),calls:R.info.render.calls,frameTris:R.info.render.triangles,textures:R.info.memory.textures,geometries:R.info.memory.geometries,dust:dust?dust.list.length:0,dustMax:dustMax}}
return{on,render,idle,stats,capysOn,fail,kit,gunIcon,prewarm,setAim,setStyle,get fx(){return STY.fx},menu,menuSpin,menuPoke,capyIcon,preload,FUR0,MBG,get menuOk(){return menuOk},get perf(){return{autoS,shadowEvery,emaDt:Math.round(emaDt)}},get compiling(){return compiling},get ok(){return st==='ready'&&!lost},K,SQ:SQ3,FEET,NAMEOFF:K*CAPY_H+22}})();
