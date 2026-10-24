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
  const sk=json.skins[0],ibm=acc(sk.inverseBindMatrices),par={};json.nodes.forEach((nd,i)=>(nd.children||[]).forEach(c=>par[c]=i));
  const bones=sk.joints.map((j,k)=>({name:json.nodes[j].name,t:json.nodes[j].translation||[0,0,0],p:sk.joints.indexOf(par[j]),ibm:new T.Matrix4().fromArray(ibm,k*16)}));
  const mi=json.materials[0],map=await tex(mi.pbrMetallicRoughness.baseColorTexture.index);map.colorSpace=T.SRGBColorSpace;const nrm=await tex(mi.normalTexture.index);
  return{geo:g,bones,map,nrm,extras:(json.asset&&json.asset.extras)||{}}}

// ---------- Instância: grupo (posição/rotação no mundo) + esqueleto próprio + malhas que compartilham a geometria ----------
// mats = {body, outline, xray} (materiais já prontos, um por capivara para dar para tingir)
function make(mats,scale){const d=data,g=new T.Group(),bs=d.bones.map(b=>{const o=new T.Bone();o.name=b.name;o.position.fromArray(b.t);return o});
  d.bones.forEach((b,i)=>{if(b.p>=0)bs[b.p].add(bs[i])});const skel=new T.Skeleton(bs,d.bones.map(b=>b.ibm.clone())),B={};bs.forEach(b=>{B[b.name]=b;b.userData.rest=b.position.clone()});
  const inner=new T.Group();inner.scale.setScalar(scale);inner.add(bs[0]);g.add(inner);const I=new T.Matrix4();
  const body=new T.SkinnedMesh(d.geo,mats.body);body.castShadow=true;body.receiveShadow=true;body.frustumCulled=false;inner.add(body);body.bind(skel,I);
  let outline=null,xray=null;
  if(mats.outline){outline=new T.SkinnedMesh(d.geo,mats.outline);outline.frustumCulled=false;inner.add(outline);outline.bind(skel,I)}
  if(mats.xray){xray=new T.SkinnedMesh(d.geo,mats.xray);xray.frustumCulled=false;xray.layers.set(2);inner.add(xray);xray.bind(skel,I)}
  // olhinhos com brilho/piscada e bochechas: só no modelo antigo (o de chapéu já tem olhinhos fechados e felizes desenhados)
  const eyes=[],lids=[];if(d.extras.eyes!==false&&B.head&&mats.shine){const head=B.head;for(const s of [1,-1]){const e=new T.Vector3(s*.121,.218,.128);
    const sh=new T.Mesh(new T.SphereGeometry(.011,8,6),mats.shine);sh.position.set(e.x+s*.004,e.y+.012,e.z+.02);head.add(sh);eyes.push(sh);
    const lid=new T.Mesh(new T.SphereGeometry(.03,10,8),mats.lid);lid.position.set(e.x+s*.004,e.y+.004,e.z+.008);lid.visible=false;head.add(lid);lids.push(lid);
    const ck=new T.Mesh(new T.CircleGeometry(.03,12),mats.blush);ck.position.set(s*.135,.125,.175);ck.rotation.set(-.1,s*.7,0);head.add(ck)}}
  return{sc:scale,g,inner,B,skel,body,outline,xray,eyes,lids,ev:[],st:{ph:0,mv:0,dash:0,yaw:0,look:0,lookT:0,lookAt:0,tilt:0,gag:0,gagK:'',gagT:1.5+Math.random()*2.5,blink:3,bl:0,rec:0,hurt:0,lx:null,ly:null,idle:0,spd:0,lean:0,lastS:0,hatLag:0,hatV:0,wasDash:0,air:0}}}

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
  if(!fz)return;
  const mv=S.mv,ds=S.dash,id=1-mv;
  // passada: cada passo é um pulinho (o corpo sobe entre os passos e amassa quando o pé bate no chão)
  S.ph+=dt*(10.5+S.spd*.011)*(1+ds*.8)*(mv>.05?1:0);const ph=S.ph,sn=Math.sin(ph),cs=Math.cos(ph),as=Math.abs(sn);
  const sg=sn>=0?1:-1;if(mv>.45&&sg!==S.lastS){A.ev.push({k:'step',foot:sg>0?'R':'L',f:.6+ds*.8})}S.lastS=sg;
  S.rec=Math.max(0,S.rec-dt*7);if(s.recoil>S.rec)S.rec=s.recoil;S.hurt=Math.max(0,S.hurt-dt*4);if(s.hurt>S.hurt)S.hurt=s.hurt;
  // ---- olhar em volta / gracinhas quando está parada
  S.idle=mv<.2?S.idle+dt:0;S.lookT-=dt;if(S.lookT<=0){S.lookAt=(Math.random()-.5)*1.5;S.tilt=(Math.random()-.5)*.5;S.lookT=1.1+Math.random()*1.8}
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
function poke(A){const S=A.st;S.idle=Math.max(S.idle,2);S.gagK='';S.gagT=0}
return{load,make,animate,poke,get ready(){return st==='ready'},get state(){return st},get map(){return data&&data.map},get nrm(){return data&&data.nrm},MH}})();
