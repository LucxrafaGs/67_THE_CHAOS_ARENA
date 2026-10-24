// ===== Capivara 3D (public/models/capivara.glb): carregamento, instâncias e animação procedural =====
// O modelo (capivara de chapéu) veio do Tripo com o esqueleto quebrado (ossos girados 90° e quase tudo preso no quadril)
// e um rabo de ornitorrinco; ele foi RE-RIGADO (scripts/rig_capivara.py) sem o rabo, com 18 ossos próprios e pesos novos. Todos os ossos têm rotação zero no repouso, então
// os eixos locais = eixos do modelo: x = esquerda da capivara, y = cima, z = frente (focinho).
// Animar é só girar cada osso em x/y/z. Nenhuma animação vem do arquivo: tudo é calculado aqui, por quadro.
const CapyRig=(()=>{
let T=null,data=null,st='idle';
const MH=.976; // altura do modelo no arquivo
function load(THREE,url){if(st!=='idle')return;T=THREE;st='loading';
  fetch(url).then(r=>{if(!r.ok)throw new Error('HTTP '+r.status);return r.arrayBuffer()}).then(parse).then(d=>{data=d;st='ready'}).catch(e=>{console.warn('Capivara 3D desligada:',e);st='failed'})}
async function parse(buf){const dv=new DataView(buf),jl=dv.getUint32(12,true),json=JSON.parse(new TextDecoder().decode(new Uint8Array(buf,20,jl))),bin=20+jl+8;
  const view=i=>{const v=json.bufferViews[i];return buf.slice(bin+(v.byteOffset||0),bin+(v.byteOffset||0)+v.byteLength)};
  const acc=i=>{const a=json.accessors[i],n={SCALAR:1,VEC2:2,VEC3:3,VEC4:4,MAT4:16}[a.type],C={5126:Float32Array,5125:Uint32Array,5123:Uint16Array,5121:Uint8Array}[a.componentType];return new C(view(a.bufferView),a.byteOffset||0,a.count*n)};
  const tex=async i=>{const im=json.images[json.textures[i].source],url=URL.createObjectURL(new Blob([view(im.bufferView)],{type:im.mimeType})),img=new Image();img.src=url;await img.decode();URL.revokeObjectURL(url);
    const t=new T.Texture(img);t.flipY=false;t.needsUpdate=true;t.anisotropy=4;return t};
  const pr=json.meshes[0].primitives[0],A=pr.attributes,g=new T.BufferGeometry(),pos=acc(A.POSITION),nor=acc(A.NORMAL);
  g.setAttribute('position',new T.BufferAttribute(pos,3));g.setAttribute('normal',new T.BufferAttribute(nor,3));g.setAttribute('uv',new T.BufferAttribute(acc(A.TEXCOORD_0),2));
  g.setAttribute('skinIndex',new T.BufferAttribute(new Uint16Array(acc(A.JOINTS_0)),4));g.setAttribute('skinWeight',new T.BufferAttribute(acc(A.WEIGHTS_0),4));g.setIndex(new T.BufferAttribute(acc(pr.indices),1));
  // normais suavizadas (soldando vértices na mesma posição) para o contorno de tinta não rachar nas costuras
  const n=pos.length/3,key=new Map(),sum=[],idx=new Int32Array(n);for(let i=0;i<n;i++){const k=Math.round(pos[i*3]*4000)+'_'+Math.round(pos[i*3+1]*4000)+'_'+Math.round(pos[i*3+2]*4000);let s=key.get(k);
    if(s===undefined){s=sum.length/3;key.set(k,s);sum.push(0,0,0)}idx[i]=s;sum[s*3]+=nor[i*3];sum[s*3+1]+=nor[i*3+1];sum[s*3+2]+=nor[i*3+2]}
  const on=new Float32Array(n*3);for(let i=0;i<n;i++){const s=idx[i],x=sum[s*3],y=sum[s*3+1],z=sum[s*3+2],l=Math.hypot(x,y,z)||1;on[i*3]=x/l;on[i*3+1]=y/l;on[i*3+2]=z/l}
  g.setAttribute('outN',new T.BufferAttribute(on,3));g.computeBoundingSphere();
  if(A._FLAT!=null)g.setAttribute('aFlat',new T.BufferAttribute(acc(A._FLAT),1)); // 1 = "pelo liso" (alto da cabeça e bumbum, sem textura)
  // chapéu: segunda parte do arquivo (mesmos vértices, outros triângulos) — peça equipável
  let hat=null;const hp=json.meshes[0].primitives[1];if(hp){hat=new T.BufferGeometry();for(const k of ['position','normal','uv','skinIndex','skinWeight','outN','aFlat'])if(g.getAttribute(k))hat.setAttribute(k,g.getAttribute(k));hat.setIndex(new T.BufferAttribute(acc(hp.indices),1));hat.computeBoundingSphere()}
  const sk=json.skins[0],ibm=acc(sk.inverseBindMatrices),par={};json.nodes.forEach((nd,i)=>(nd.children||[]).forEach(c=>par[c]=i));
  const bones=sk.joints.map((j,k)=>({name:json.nodes[j].name,t:json.nodes[j].translation||[0,0,0],p:sk.joints.indexOf(par[j]),ibm:new T.Matrix4().fromArray(ibm,k*16)}));
  const mi=json.materials[0],map=await tex(mi.pbrMetallicRoughness.baseColorTexture.index);map.colorSpace=T.SRGBColorSpace;const nrm=await tex(mi.normalTexture.index);
  return{geo:g,hat,bones,map,nrm,extras:(json.asset&&json.asset.extras)||{}}}

// ---------- Instância: grupo (posição/rotação no mundo) + esqueleto próprio + malhas que compartilham a geometria ----------
// mats = {body, outline, xray} (materiais já prontos, um por capivara para dar para tingir)
function make(mats,scale){const d=data,g=new T.Group(),bs=d.bones.map(b=>{const o=new T.Bone();o.name=b.name;o.position.fromArray(b.t);return o});
  d.bones.forEach((b,i)=>{if(b.p>=0)bs[b.p].add(bs[i])});const skel=new T.Skeleton(bs,d.bones.map(b=>b.ibm.clone())),B={};bs.forEach(b=>{B[b.name]=b;b.userData.rest=b.position.clone()});
  const inner=new T.Group();inner.scale.setScalar(scale);inner.add(bs[0]);g.add(inner);const I=new T.Matrix4();
  const body=new T.SkinnedMesh(d.geo,mats.body);body.castShadow=true;body.receiveShadow=true;body.frustumCulled=false;inner.add(body);body.bind(skel,I);
  let outline=null,xray=null;
  if(mats.outline){outline=new T.SkinnedMesh(d.geo,mats.outline);outline.frustumCulled=false;inner.add(outline);outline.bind(skel,I)}
  if(mats.xray){xray=new T.SkinnedMesh(d.geo,mats.xray);xray.frustumCulled=false;xray.layers.set(2);inner.add(xray);xray.bind(skel,I)}
  // chapéu separado (equipável): malha + contorno próprios, presos aos mesmos ossos
  const hat=[];if(d.hat&&mats.hat){const hm=new T.SkinnedMesh(d.hat,mats.hat);hm.castShadow=true;hm.frustumCulled=false;inner.add(hm);hm.bind(skel,I);hat.push(hm);
    if(mats.outline){const ho=new T.SkinnedMesh(d.hat,mats.outline);ho.frustumCulled=false;inner.add(ho);ho.bind(skel,I);hat.push(ho)}
    if(mats.xray){const hx=new T.SkinnedMesh(d.hat,mats.xray);hx.frustumCulled=false;hx.layers.set(2);inner.add(hx);hx.bind(skel,I);hat.push(hx)}}
  // olhinhos com brilho/piscada e bochechas: só no modelo antigo (o de chapéu já tem olhinhos fechados e felizes desenhados)
  const eyes=[],lids=[];if(d.extras.eyes!==false&&B.head&&mats.shine){const head=B.head;for(const s of [1,-1]){const e=new T.Vector3(s*.121,.218,.128);
    const sh=new T.Mesh(new T.SphereGeometry(.011,8,6),mats.shine);sh.position.set(e.x+s*.004,e.y+.012,e.z+.02);head.add(sh);eyes.push(sh);
    const lid=new T.Mesh(new T.SphereGeometry(.03,10,8),mats.lid);lid.position.set(e.x+s*.004,e.y+.004,e.z+.008);lid.visible=false;head.add(lid);lids.push(lid);
    const ck=new T.Mesh(new T.CircleGeometry(.03,12),mats.blush);ck.position.set(s*.135,.125,.175);ck.rotation.set(-.1,s*.7,0);head.add(ck)}}
  // olhos 3D (modelo de chapéu): por cima dos olhinhos fechados pintados na textura. Abrem, piscam, mudam de expressão e podem ser personalizados.
  let E3=null;if(d.extras.eyes===false&&B.head&&mats.eye)E3=makeEyes(B.head,mats.eye,mats.brow);
  return{sc:scale,g,inner,B,skel,body,outline,xray,hat,setHat(on){for(const m of hat)m.visible=!!on},eyes,lids,E3,ev:[],st:{ph:0,mv:0,dash:0,yaw:0,look:0,lookT:0,lookAt:0,tilt:0,gag:0,gagK:'',gagT:1.5+Math.random()*2.5,blink:3,bl:0,rec:0,hurt:0,lx:null,ly:null,idle:0,spd:0,lean:0,lastS:0,hatLag:0,hatV:0,wasDash:0,air:0}}}

// ---------- Olhos 3D ----------
// cada olho = meia-esfera achatada encaixada na cabeça; o shader (03_map3d.js, eyeMat) desenha esclera, íris, pupila, brilhos, pálpebras e contorno.
// Sistema local do olho: x = para a frente (focinho), y = para cima, z = para fora da cabeça. O olho direito é espelhado (scale.x = -1), então x é "frente" nos dois.
const EYEPOS=[[.136,.784,.212,.8,.36,.4],[-.138,.785,.214,-.8,.36,.4]],HEAD0=[0,.53,.06],ER=[.05,.041,.028];
// tipos: [escala, íris, pupila, abertura base, nome]
const EYET=[[1,.6,.55,1,'Redondo'],[1.22,.62,.5,1,'Grandão'],[1,.6,.55,.55,'Sonolento'],[1.1,.78,.42,1,'Brilhante'],[.62,.9,0,1,'Pontinho'],[1.05,.72,.9,1,'Gatinho']];
const BROWT=['Nenhuma','Fina','Grossa','Arqueada','Brava'];
// expressões: [abre, pálpebra de baixo, inclinação (raiva+ / triste-), sorriso, pupila, escala, sobrancelha sobe, sobrancelha gira, olhar p/ baixo, tonto, tremor]
const EXPR={normal:[1,0,0,0,1,1,0,0,0,0,0],feliz:[.9,.15,0,.85,1,1,.12,.14,0,0,0],raiva:[.72,.18,.9,0,.8,1,-.16,-.5,0,0,0],medo:[1.15,0,-.45,0,.55,1.12,.3,.42,0,0,1],
  surpreso:[1.2,0,0,0,.6,1.16,.4,0,0,0,0],triste:[.72,0,-.75,0,1,1,.05,.5,-.3,0,0],dor:[.1,.55,.6,0,1,.95,-.1,-.35,0,0,0],tonto:[1,0,0,0,1,1.05,.18,0,0,1,0],sono:[.28,0,0,0,1,1,-.04,0,-.2,0,0]};
let BROWG=null,EYEG=null;
function browGeos(){if(BROWG)return BROWG;const cap=(r,l)=>new T.CapsuleGeometry(r,l,3,8).rotateZ(Math.PI/2);
  const arc=1.15,tor=new T.TorusGeometry(.05,.0055,5,14,arc).rotateZ(Math.PI/2-arc/2).translate(0,-.05,0);
  return BROWG=[null,cap(.0042,.042),cap(.0085,.04),tor,cap(.008,.044)]}
function makeEyes(head,mat,bmat){const up=new T.Vector3(0,1,0),fw=new T.Vector3(0,0,1),out=[];
  for(const e of EYEPOS){const n=new T.Vector3(e[3],e[4],e[5]).normalize().add(new T.Vector3(0,.1,.45)).normalize();
    const Y=up.clone().sub(n.clone().multiplyScalar(up.dot(n))).normalize(),X=new T.Vector3().crossVectors(Y,n);
    const g=new T.Group();g.quaternion.setFromRotationMatrix(new T.Matrix4().makeBasis(X,Y,n));if(X.dot(fw)<0)g.scale.x=-1;
    g.position.set(e[0]-HEAD0[0],e[1]-HEAD0[1],e[2]-HEAD0[2]).addScaledVector(n,-ER[2]*.3);
    const eye=new T.Mesh(EYEG||(EYEG=new T.SphereGeometry(1,20,12)),mat);eye.scale.set(ER[0],ER[1],ER[2]);g.add(eye);
    const brow=new T.Mesh(browGeos()[1],bmat);brow.position.set(0,ER[1]*1.45,ER[2]*.05);brow.rotation.x=-.35;g.add(brow);
    head.add(g);out.push({g,eye,brow})}
  return{list:out,mat,cfg:null,ex:EXPR.normal.slice(),exK:'',exT:0,blink:2,bl:0,gx:0,gy:0,gT:0,gtx:0,gty:0,fireT:9}}
// personalização: {t: tipo, b: sobrancelha, c: cor da íris}
function setEyes(A,cfg){const E=A.E3;if(!E)return;cfg=cfg||{};const k=(cfg.t|0)+'|'+(cfg.b==null?1:cfg.b)+'|'+(cfg.c||'#6B3A1E');if(E.key===k)return;E.key=k;E.cfg=cfg;
  const ty=EYET[cfg.t|0]||EYET[0],u=E.mat.userData.eu,bi=cfg.b==null?1:cfg.b;u.uE2.value.set(ty[1],ty[2],cfg.t|0,0);u.uIrisC.value.set(cfg.c||'#6B3A1E');
  for(const o of E.list){o.eye.scale.set(ER[0]*ty[0],ER[1]*ty[0],ER[2]*ty[0]);const gg=browGeos()[bi];o.brow.visible=!!gg;if(gg)o.brow.geometry=gg;o.brow.userData.base=bi===4?-.4:0;o.brow.userData.lift=ER[1]*ty[0]*1.45}}
function expr(A,k,dur){const E=A.E3;if(!E||!EXPR[k])return;E.exK=k;E.exT=dur||1.4}
function eyesTick(A,s,dt,t){const E=A.E3,S=A.st;if(!E)return;const ty=EYET[(E.cfg&&E.cfg.t)|0]||EYET[0];
  if(s.recoil)E.fireT=0;else E.fireT+=dt;
  let k='normal';
  if(s.icon){k=E.exT>0?E.exK:'normal'}
  else if(E.exT>0){E.exT-=dt;k=E.exK}
  else if(S.hurt>.25)k='dor';else if(s.frozen||s.dashing)k='surpreso';else if(s.kill)k='feliz';else if(s.low)k='medo';else if(E.fireT<.7&&!s.calm)k='raiva';
  else if(S.gagK==='dance'||S.gagK==='hop')k='feliz';else if(S.gagK==='double')k='surpreso';else if(S.gagK==='stretch')k='sono';else if(S.gagK==='spin')k='tonto';
  const tg=EXPR[k],ex=E.ex,kk=s.icon?1:Math.min(1,dt*14);for(let i=0;i<ex.length;i++)ex[i]+=(tg[i]-ex[i])*kk;
  // piscar (também em dobro, de vez em quando) — não pisca de olho fechado
  if(s.icon){E.bl=0;E.gtx=E.gty=0;E.gT=9}else if(!s.frozen){E.blink-=dt;if(E.blink<=0){E.bl=.15;E.blink=2.2+Math.random()*3.2;if(Math.random()<.18)E.blink=.22}}E.bl=Math.max(0,E.bl-dt);const bl=E.bl>0?Math.sin(E.bl/.15*Math.PI):0;
  // olhar: acompanha a cabeça e dá umas olhadinhas rápidas para os lados
  E.gT-=dt;if(E.gT<=0){E.gT=.6+Math.random()*1.8;E.gtx=(Math.random()-.5)*.5;E.gty=(Math.random()-.5)*.3}
  const gx=E.gtx+(s.icon?0:S.lookAt*.35),gy=E.gty*.6+ex[8];const gk=s.icon?1:Math.min(1,dt*18);E.gx+=(gx-E.gx)*gk;E.gy+=(gy-E.gy)*gk;
  const sh=ex[10]*Math.sin(t*70)*.035,u=E.mat.userData.eu;
  u.uE1.value.set(Math.max(0,ex[0]*ty[3]+(ty[3]<1?Math.max(0,ex[0]-1)*.6:0))*(1-bl),ex[1],ex[2],ex[3]);
  u.uE2.value.y=ty[2]*ex[4];u.uE2.value.w=ex[9];u.uGaze.value.set(E.gx*.5+sh,E.gy*.45);
  for(const o of E.list){const sc=ex[5]*ty[0];o.eye.scale.set(ER[0]*sc,ER[1]*sc,ER[2]*sc);
    o.brow.position.y=(o.brow.userData.lift||ER[1]*1.45)*(ex[5]>1?ex[5]:1)+ex[6]*.025+bl*-.004+(ex[9]?Math.sin(t*6)*.006:0);o.brow.rotation.z=(o.brow.userData.base||0)+ex[7]+(ex[9]?Math.sin(t*6)*.25:0)}}

// ---------- Animação ----------
// s: {dt,t, x,y (mundo), aim, frozen, recoil(0..1), swing(0..1), hurt(0..1), dashing, melee}
// A.ev recebe eventos para a poeira no chão: {k:'step'|'land'|'dash', foot:'L'|'R'|null, f:força}
let EU=null;
function rot(b,x,y,z){if(!b)return;if(!EU)EU=new T.Euler();b.quaternion.setFromEuler(EU.set(x,y,z,'YXZ'))}
const dampA=(a,b,k)=>{let d=b-a;d=Math.atan2(Math.sin(d),Math.cos(d));return a+d*k};
const GAGS=['hop','dance','double','stretch','spin','wiggle'],GAGL={hop:.9,dance:1.7,double:1.1,stretch:1.4,spin:.9,wiggle:1.2};
function animate(A,s){const S=A.st,B=A.B,dt=Math.min(s.dt,.05),t=s.t;
  // velocidade real (mais confiável que a tecla apertada)
  if(S.lx==null){S.lx=s.x;S.ly=s.y}const v=Math.hypot(s.x-S.lx,s.y-S.ly)/Math.max(dt,1e-3);S.lx=s.x;S.ly=s.y;S.spd+=(Math.min(v,1200)-S.spd)*Math.min(1,dt*12);
  const fz=s.frozen?0:1,moving=S.spd>40&&fz,dashing=s.dashing&&fz;
  S.mv+=((moving?1:0)-S.mv)*Math.min(1,dt*(moving?10:6));S.dash+=((dashing?1:0)-S.dash)*Math.min(1,dt*14);
  if(dashing&&!S.wasDash)A.ev.push({k:'dash',f:1});S.wasDash=dashing;
  // vira para onde está mirando (rápido, com um pouquinho de atraso fofo)
  const want=Math.atan2(Math.cos(s.aim),Math.sin(s.aim));S.yaw=dampA(S.yaw,want,Math.min(1,dt*(fz?16:0)));A.g.rotation.y=S.yaw;
  eyesTick(A,s,dt,t);
  if(!fz)return;
  const mv=S.mv,ds=S.dash,id=1-mv;
  // passada: cada passo é um pulinho (o corpo sobe entre os passos e amassa quando o pé bate no chão)
  S.ph+=dt*(10.5+S.spd*.011)*(1+ds*.8)*(mv>.05?1:0);const ph=S.ph,sn=Math.sin(ph),cs=Math.cos(ph),as=Math.abs(sn);
  const sg=sn>=0?1:-1;if(mv>.45&&sg!==S.lastS){A.ev.push({k:'step',foot:sg>0?'R':'L',f:.6+ds*.8})}S.lastS=sg;
  S.rec=Math.max(0,S.rec-dt*7);if(s.recoil>S.rec)S.rec=s.recoil;S.hurt=Math.max(0,S.hurt-dt*4);if(s.hurt>S.hurt)S.hurt=s.hurt;
  // ---- olhar em volta / gracinhas quando está parada
  S.idle=mv<.2?S.idle+dt:0;
  if(s.calm){// menu: só respira; de vez em quando (~30 s) olha para um lado e para o outro
    if(S.calmT==null)S.calmT=12;S.calmT-=dt;if(S.calmT<=0){S.calmK=0;S.calmT=28+Math.random()*6}
    if(S.calmK!=null){S.calmK+=dt;const k=S.calmK;S.lookAt=k<1.3?.75:k<2.9?-.75:0;if(k>3.6)S.calmK=null}else S.lookAt=0;S.tilt=0;S.gagK='';S.gagT=99}
  else{S.lookT-=dt;if(S.lookT<=0){S.lookAt=(Math.random()-.5)*1.5;S.tilt=(Math.random()-.5)*.5;S.lookT=1.1+Math.random()*1.8}}
  S.look+=(S.lookAt*id-S.look)*Math.min(1,dt*6);
  S.gagT-=dt;if(S.gagT<=0&&S.idle>1.2&&!S.gagK){S.gagK=pick(GAGS);S.gag=0;S.gagT=3+Math.random()*4}
  let gHop=0,gDance=0,gDouble=0,gStretch=0,gSpin=0,gWig=0;if(S.gagK){S.gag+=dt;const k=S.gag,L=GAGL[S.gagK];
    if(S.idle<.05||k>L){if(S.gagK==='hop'||S.gagK==='spin')A.ev.push({k:'land',f:.8});S.gagK=''}else{const e=Math.sin(Math.PI*k/L);
      if(S.gagK==='hop')gHop=k;else if(S.gagK==='dance')gDance=e;else if(S.gagK==='double')gDouble=k;else if(S.gagK==='stretch')gStretch=e;else if(S.gagK==='spin')gSpin=k/L;else gWig=e}}
  // piscar (só se o modelo tiver olhinhos 3D)
  if(A.lids.length){S.blink-=dt;if(S.blink<=0){S.bl=.16;S.blink=2+Math.random()*3.5;if(Math.random()<.2)S.blink=.25}S.bl=Math.max(0,S.bl-dt);const lid=S.bl>0?Math.sin(S.bl/.16*Math.PI):0;
    for(const l of A.lids){l.visible=lid>.05;l.scale.set(1.1*lid,lid,.7*lid)}}
  // ---- corpo: pulinhos + rebolado bem exagerado (e o dash ainda mais)
  const hopA=(.05+ds*.035)*mv,bob=Math.pow(as,.7)*hopA,breathe=Math.sin(t*2.4)*.035*id;
  const hopY=gHop?Math.max(0,Math.sin(gHop/.9*Math.PI*2))*.09:gSpin?Math.sin(gSpin*Math.PI)*.07:0;
  B.root.position.set(B.root.userData.rest.x+sn*.016*mv,B.root.userData.rest.y+bob+hopY,B.root.userData.rest.z);
  const lean=.14*mv+.36*ds-S.rec*.1;S.lean+=(lean-S.lean)*Math.min(1,dt*10);
  const wad=sn*(.22+ds*.08)*mv,dance=Math.sin(t*9)*gDance,wig=Math.sin(t*16)*gWig;
  rot(B.hips,S.lean*.5,cs*.18*mv+dance*.18+wig*.25,wad*.7+dance*.16);
  rot(B.spine,S.lean*.5+breathe,-cs*.1*mv,-wad*.45-dance*.1-wig*.15);
  rot(B.chest,breathe*.6-gStretch*.18,-cs*.06*mv,-wad*.25);
  // cabeça: olha em volta parada, chacoalha andando, "olhada dupla" cômica
  let hy=S.look*.85,hx=-S.lean*.6+Math.sin(t*1.7)*.03*id-Math.cos(ph*2)*.06*mv,hz=S.tilt*id+wad*.6;
  if(gDouble){const k=gDouble;hy=k<.25?k*4*.9:k<.45?.9-(k-.25)*5*1.8:k<.7?-.9:(-.9+(k-.7)/.4*.9);hz=Math.sin(k*18)*.08}
  if(gDance)hz+=Math.sin(t*9)*.22;if(gStretch)hx-=gStretch*.35;if(gWig)hz+=wig*.2;
  hx-=S.hurt*.3;rot(B.neck,0,hy*.3,0);rot(B.head,hx,hy*.7,hz);
  // orelhas/rabo (se o modelo tiver esses ossos)
  if(B.earL){rot(B.earL,Math.sin(ph+1)*.12*mv,0,-.05);rot(B.earR,Math.sin(ph+1)*.12*mv,0,.05)}if(B.tail)rot(B.tail,.2,Math.sin(t*3)*.15+sn*.3*mv,0);
  // ---- pernas: passo alto e engraçadinho (joelho sobe bastante)
  const amp=.58*mv*(1+ds*.35);
  for(const [sd,T_,S_,F_] of [[1,B.thighL,B.shinL,B.footL],[-1,B.thighR,B.shinR,B.footR]]){const p=sd>0?sn:-sn,lift=Math.max(0,sd>0?cs:-cs);
    const tap=gDance?Math.max(0,Math.sin(t*9+(sd>0?0:Math.PI)))*.5:0;
    rot(T_,-p*amp-lift*.55*mv-tap*.6-S.lean*.4,0,sd*(-.06*mv-wad*.3));rot(S_,lift*1.15*mv+tap*1.1,0,0);rot(F_,p*amp*.5-lift*.5*mv+S.lean*.3,0,0)}
  // ---- braços: segurando a arma com as duas mãos, levantadinhos, chacoalhando no ritmo dos passos
  const sway=Math.sin(t*2.4)*.04*id+Math.cos(ph*2)*.1*mv,kick=S.rec;
  if(s.melee){const sw=s.swing,arc=Math.sin(sw*Math.PI);rot(B.armR,-1.35-arc*.5,-.6+sw*1.6,.35);rot(B.foreR,-.35,0,.15);rot(B.handR,0,0,0);
    rot(B.armL,-.9+sway,0,-.45);rot(B.foreL,-.8,0,-.2);rot(B.handL,0,0,0)}
  // parada no menu: bracinhos soltos, só balançam um pouco para o lado (levantar os braços deformava a mão e "esticava" o dedinho)
  else if(s.relax){const br=Math.sin(t*2.4),dz=gDance*Math.sin(t*9)*.12;rot(B.armR,.06+sway*.3,0,.14+br*.03+gWig*.12+gStretch*.12+dz);rot(B.foreR,-.18,0,.04);rot(B.handR,0,0,0);
    rot(B.armL,.06+sway*.3,0,-.14-br*.03-gWig*.12-gStretch*.12+dz);rot(B.foreL,-.18,0,-.04);rot(B.handL,0,0,0)}
  else{rot(B.armR,-1.05+sway-kick*.4-gStretch*.25,-.1,.38+gStretch*.15);rot(B.foreR,-.25+kick*.2,.05,.12);rot(B.handR,.2,0,0);
    rot(B.armL,-.95+sway*.8-kick*.3-gStretch*.25,.25,-.55-gStretch*.15);rot(B.foreL,-.55+kick*.2,-.2,-.25);rot(B.handL,.1,0,0)}
  // ---- squash & stretch: amassa no passo, estica no ar; dash estica; dano amassa; pulinho e giro
  const contact=mv*(1-Math.pow(as,.5)),air=mv*as;
  let sy=1-contact*.1+air*.05-S.hurt*.14+(gHop?Math.sin(gHop/.9*Math.PI*2)*.07:0),sxz=1+contact*.07-air*.03+S.hurt*.08,st=1+ds*.08;
  A.inner.scale.set(A.sc*sxz/Math.sqrt(st),A.sc*sy,A.sc*sxz*st);
  A.inner.rotation.set(0,gSpin?gSpin*Math.PI*2:0,wad*.12)}
const POKEX=['feliz','surpreso','raiva','medo','tonto','triste'];let pokeI=0;
function poke(A){const S=A.st;expr(A,POKEX[pokeI++%POKEX.length],1.8);if(S.calmT!=null){if(S.calmK==null)S.calmK=0;return}S.idle=Math.max(S.idle,2);S.gagK='';S.gagT=0}
return{load,make,animate,poke,setEyes,expr,EYET,BROWT,EXPR,get ready(){return st==='ready'},get state(){return st},get map(){return data&&data.map},get extras(){return data&&data.extras},get nrm(){return data&&data.nrm},MH}})();
