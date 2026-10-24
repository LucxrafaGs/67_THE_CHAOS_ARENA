// ===== Render, partículas, efeitos e laço principal =====
const canvas=$('game'),ctx=canvas.getContext('2d');
// SQ: achatamento vertical do chão pela câmera inclinada (fixo, estilo Brawl Stars); CAP3: modelo da capivara 3D já carregado
let VW=960,VH=540,zoom=1,pr=1,resScale=1,SQ=Map3D.SQ,CAP3=false;
const acts3=[];const cam={x:W/2-480,y:H/2-270};let shakeA=0;
// Atrás dos menus a arena é só decoração: meia resolução e 30 fps (bem mais leve em telas retina)
const menuBg=()=>document.body.classList.contains('menu')&&!started;
function resize(){const q=S.quality,dpr=window.devicePixelRatio||1;pr=Math.min(dpr,q==='low'?.8:q==='high'?2:q==='chaos'?2.5:1.25)*(menuBg()?.5:resScale);pr=Math.min(pr,Math.sqrt(4.2e6/(innerWidth*innerHeight)));if(isTouch)pr=Math.min(pr,1.1); // celular: o canvas de cima só tem textos e efeitos 2D, não precisa de resolução alta // teto de pixels: telas retina grandes não sobrecarregam a placa
  canvas.width=Math.round(innerWidth*pr);canvas.height=Math.round(innerHeight*pr);zoom=clamp(Math.min(innerWidth,innerHeight)/(isTouch?470:560),.6,1.4);VW=innerWidth/zoom;VH=innerHeight/zoom/SQ}
addEventListener('resize',resize);resize();

// ---------- Partículas ----------
let parts=[];
const partMax=()=>S.particles==='low'?120:S.particles==='mid'?300:600;
// só os textos (BUM!, -20, KO!) ficam no canvas; o resto (faíscas, fumaça, fogo, anéis…) vira 3D em 03_fx3d.js
function addP(o){if(o.type!=='word'){FX3D.from2D(o);return}if(parts.length>=partMax())return;parts.push(Object.assign({vx:0,vy:0,g:0,life:.6,size:6,rot:0,vr:0,type:'dot',col:'#fff',drag:0},o,{max:o.life||.6}))}
function burst(x,y,n,col,type='star',spd=180,size=6,life=.55){if(S.particles==='low')n=Math.ceil(n/3);for(let i=0;i<n;i++){const a=Math.random()*TAU,s=spd*rand(.4,1);addP({x,y,vx:Math.cos(a)*s,vy:Math.sin(a)*s,type,col:Array.isArray(col)?pick(col):col,size:size*rand(.6,1.2),life:life*rand(.7,1.2),vr:rand(-8,8),drag:3})}}
function word(x,y,txt,col,size=26){addP({x,y,vy:-60,type:'word',txt,col,size,life:.7,rot:rand(-.25,.25),drag:2})}
function updateParts(dt){for(let i=parts.length-1;i>=0;i--){const p=parts[i];p.life-=dt;if(p.life<=0){parts.splice(i,1);continue}const d=Math.exp(-p.drag*dt);p.vx*=d;p.vy=p.vy*d+p.g*dt;p.x+=p.vx*dt;p.y+=p.vy*dt;p.rot+=p.vr*dt}}
function drawParts(c){for(const p of parts){const k=p.life/p.max;c.save();c.translate(p.x,p.y);if(SQ!==1&&p.type!=='ring'&&p.type!=='line'&&p.type!=='bolt')c.scale(1,1/SQ);c.rotate(p.rot);c.globalAlpha=Math.min(1,k*2);c.fillStyle=p.col;c.strokeStyle=INK;
  switch(p.type){
    case 'star':star(c,0,0,p.size,p.size*.45,5);c.fill();c.lineWidth=1.5;c.stroke();break;
    case 'dot':c.beginPath();c.arc(0,0,p.size*k,0,TAU);c.fill();break;
    case 'smoke':c.globalAlpha=k*.75;c.beginPath();c.arc(0,0,p.size*(1.6-k*.6),0,TAU);c.fill();c.lineWidth=2;c.globalAlpha=k*.4;c.stroke();break;
    case 'ring':c.globalAlpha=k;c.lineWidth=6*k+1;c.strokeStyle=p.col;c.beginPath();c.arc(0,0,p.size*(1.15-k),0,TAU);c.stroke();break;
    case 'shard':c.beginPath();c.moveTo(-p.size,0);c.lineTo(0,-p.size*.4);c.lineTo(p.size,0);c.lineTo(0,p.size*.4);c.closePath();c.fill();c.lineWidth=1;c.stroke();break;
    case 'brick':c.fillRect(-p.size/2,-p.size/3,p.size,p.size/1.5);c.lineWidth=1.2;c.strokeRect(-p.size/2,-p.size/3,p.size,p.size/1.5);break;
    case 'heart':{c.beginPath();if(p.txt==='+'){c.rect(-p.size*.25,-p.size*.8,p.size*.5,p.size*1.6);c.rect(-p.size*.8,-p.size*.25,p.size*1.6,p.size*.5)}else{const s=p.size*.6;c.moveTo(0,s);c.bezierCurveTo(-s*2,-s*.6,-s*.8,-s*2,0,-s*.8);c.bezierCurveTo(s*.8,-s*2,s*2,-s*.6,0,s)}c.fill();c.lineWidth=1.2;c.stroke();break}
    case 'word':{const sc=k>.8?1+(k-.8)*3:1;c.scale(sc,sc);c.font=`${p.size}px "Lilita One",sans-serif`;c.textAlign='center';c.textBaseline='middle';c.lineJoin='round';c.lineWidth=p.size/4.5;c.strokeText(p.txt,0,0);c.fillText(p.txt,0,0);break}
    case 'line':c.globalAlpha=k*.7;c.strokeStyle=p.col;c.lineWidth=p.size;c.lineCap='round';c.beginPath();c.moveTo(0,0);c.lineTo(-p.vx*.06,-p.vy*.06);c.stroke();break;
    case 'boom':{const r=p.size*(1-k*k*.6);c.globalAlpha=Math.min(1,k*1.6);c.beginPath();for(let i=0;i<12;i++){const a=i/12*TAU,rr2=r*(i%2?.72:1);c.lineTo(Math.cos(a)*rr2,Math.sin(a)*rr2)}c.closePath();c.fill();c.lineWidth=3;c.stroke();c.fillStyle='#FFE066';c.beginPath();c.arc(0,0,r*.5,0,TAU);c.fill();break}
    case 'spiral':c.strokeStyle=p.col;c.lineWidth=3;c.beginPath();for(let i=0;i<24;i++){const r=i*p.size/24*(1.2-k*.5),a=i*.6+p.rot*3;c.lineTo(Math.cos(a)*r,Math.sin(a)*r)}c.stroke();break;
    case 'flash':c.globalCompositeOperation='lighter';c.beginPath();c.arc(0,0,p.size*k,0,TAU);c.fill();break;
    case 'bolt':{c.globalCompositeOperation='lighter';c.strokeStyle=p.col;c.lineWidth=3*k+1;c.beginPath();const pts=p.pts;c.moveTo(pts[0][0]-p.x,pts[0][1]-p.y);for(let i=1;i<pts.length;i++){const [ax,ay]=pts[i-1],[bx,by]=pts[i];for(let j=1;j<=5;j++){const q=j/5;c.lineTo(ax+(bx-ax)*q-p.x+(j<5?rand(-9,9):0),ay+(by-ay)*q-p.y+(j<5?rand(-9,9):0))}}c.stroke();break}
  }c.restore()}}

// ---------- Rastreamento por jogador (lado do cliente) ----------
let mouseSX=-1,mouseSY=-1,mouseOn=false;
const aimStick={on:false,a:0,mag:0};
const track={};let demoFocus='d0',demoSwap=0,hurtFlash=0,distortT=0;
function nearCam(x,y,m=200){return x>cam.x-m&&x<cam.x+VW+m&&y>cam.y-m&&y<cam.y+VH+m}
function onShot(p,tr){const g=GUNS[p.gun];if(!g)return;const me=p.id===self;if(me&&!demo)tk('shots');
  if(g.melee){tr.swing=1}else if(!g.instant){tr.recoil=1;const mx=p.x+Math.cos(p.aim)*34,my=p.y+Math.sin(p.aim)*34+8;FX3D.flash(mx,my,FX3D.FLY,g.cat==='heavy'?16:9,g.col||'#fff',.09);if(g.cat==='heavy'&&S.particles!=='low')FX3D.smoke(mx,my,FX3D.FLY,5,2,'#E9E2F7',.5,20)}
  if(me||(!demo&&nearCam(p.x,p.y,-40)&&Math.random()<.5))Sound.play(g.sfx||'pew');if(me&&(g.cat==='heavy'||g.txt==='NÃO')){vibe(25);shakeA=Math.max(shakeA,g.m==='megabazooka'?9:3)}}
const seenFx=new Map();
function processEffects(t){const now=time();for(const e of effects){if(seenFx.has(e.id))continue;seenFx.set(e.id,now);onEffect(e)}if(seenFx.size>1500)for(const [k,v] of seenFx)if(now-v>12000)seenFx.delete(k)}
function camShake(x,y,a){if(!S.shake)return;const d=Math.hypot(x-(cam.x+VW/2),y-(cam.y+VH/2));shakeA=Math.max(shakeA,clamp(a-d/90,0,a))}
function onEffect(e){const near=nearCam(e.x||0,e.y||0),snd=!demo&&near,mine=e.pid===self&&!demo;
  switch(e.kind){
    case 'hit':if(!near)break;FX3D.burst(e.x,e.y,FX3D.FLY,5,[e.c||'#fff','#fff'],'star',200,5);FX3D.flash(e.x,e.y,FX3D.FLY,8,e.c||'#fff',.08);if(e.w)word(e.x+rand(-10,10),e.y-14,e.w,e.c==='#FFFFFF'?'#FFC531':e.c,e.s?32:24);if(snd)Sound.play('hit');break;
    case 'spark':if(near)FX3D.burst(e.x,e.y,FX3D.FLY,3,[e.c||'#fff','#fff'],'dot',140,3,.25);break;
    case 'dmg':if(near)addP({x:e.x+rand(-8,8),y:e.y,vy:-90,type:'word',txt:'-'+e.v,col:e.v>=40?'#FF3B47':'#FFF4E0',size:e.v>=40?24:17,life:.7,drag:2});
      if(mine){Sound.play('hurt');hurtFlash=1;vibe(30);if(S.shake)shakeA=Math.max(shakeA,4)}break;
    case 'boom':if(!near)break;FX3D.boom(e.x,e.y,e.r,e.gold);word(e.x,e.y-e.r*.6,e.gold?'67!':e.r>150?'KA-BUUUM':'KABUM',e.gold?'#FFC531':'#FF7A1A',e.r>150?48:36);
      if(snd){Sound.play('boom');camShake(e.x,e.y,e.r>150?14:9)}break;
    case 'meteor':if(!near)break;addP({x:e.x,y:e.y,type:'boom',col:'#FF3B47',size:e.r*1.1,life:.5});for(let i=0;i<10;i++)addP({x:e.x+rand(-40,40),y:e.y+rand(-40,40),vx:rand(-200,200),vy:rand(-200,200),type:'brick',col:'#8E5A3A',size:rand(6,12),life:.8,vr:rand(-9,9),drag:2});camShake(e.x,e.y,16);if(snd)Sound.play('boom');break;
    case 'stamp':if(!near)break;addP({x:e.x,y:e.y,type:'ring',col:'#E8443A',size:e.r*1.6,life:.5});word(e.x,e.y,'VETADO!','#E8443A',44);camShake(e.x,e.y,10);if(snd)Sound.play('slap');break;
    case 'heal':if(!near)break;for(let i=0;i<7;i++)addP({x:e.x+rand(-18,18),y:e.y+rand(-10,14),vy:-rand(50,110),type:'heart',txt:i%2?'+':'',col:'#6CF06A',size:rand(6,9),life:.9,drag:1});word(e.x,e.y-36,'+'+e.v,'#6CF06A',22);if(snd)Sound.play('heal');break;
    case 'med':if(near){for(let i=0;i<8;i++)addP({x:e.x+rand(-16,16),y:e.y,vy:-rand(60,120),type:'heart',txt:'+',col:'#6CF06A',size:7,life:.9,drag:1});word(e.x,e.y-30,'+50','#6CF06A',24)}if(mine)tk('meds');if(mine)Sound.play('med');break;
    case 'crate':if(near){burst(e.x,e.y,10,['#FFC531','#C98B4E'],'star',220,7);const g=GUNS[e.g];if(g)word(e.x,e.y-34,e.lvl?'PRÓXIMA ARMA!':g.n,'#FFC531',e.lvl?22:18)}if(mine){tk('crates');Sound.play('pickup');showRespawnCard(e.g,e.lvl?'ARSENAL':'NOVA ARMA')}break;
    case 'warp':if(!near)break;addP({x:e.x,y:e.y,type:'spiral',col:'#45D4FF',size:36,life:.5,vr:6});burst(e.x,e.y,6,'#45D4FF','dot',150,5);if(snd)Sound.play('warp');break;
    case 'freeze':if(!near)break;burst(e.x,e.y,8,['#BFF1FF','#FFFFFF'],'shard',200,8,.6);if(snd)Sound.play('freeze');break;
    case 'timestop':if(!near)break;addP({x:e.x,y:e.y,type:'ring',col:'#C9E8FF',size:e.r*1.3,life:.6});word(e.x,e.y-20,'PAUSA!','#9FD8FF',38);if(snd)Sound.play('timestop');break;
    case 'flashboom':if(!near)break;addP({x:e.x,y:e.y,type:'flash',col:'#FFFFFF',size:e.r,life:.3});burst(e.x,e.y,14,['#FFF8DC','#FFE066'],'dot',300,5);word(e.x,e.y-20,'PLOC!','#FFE066',30);if(snd)Sound.play('flash');break;
    case 'implode':if(!near)break;addP({x:e.x,y:e.y,type:'ring',col:'#C38BFF',size:200,life:.5});burst(e.x,e.y,16,['#8E5BFF','#45D4FF'],'star',320,8);camShake(e.x,e.y,10);if(snd)Sound.play('boom');break;
    case 'chain':addP({x:e.pts[0][0],y:e.pts[0][1],type:'bolt',pts:e.pts,col:'#FFF066',life:.3});if(!demo)Sound.play('zap');break;
    case 'build':if(near){for(let i=0;i<6;i++)addP({x:e.x+rand(-30,30),y:e.y+rand(-10,20),vy:-40,type:'smoke',col:'#E9E2F7',size:12,life:.6,drag:2});if(snd)Sound.play('build')}break;
    case 'debris':if(near){for(let i=0;i<8;i++)addP({x:e.x+rand(-20,20),y:e.y+rand(-20,20),vx:rand(-160,160),vy:rand(-160,60),g:300,type:e.k==='bubble'?'dot':'brick',col:e.k==='box'?'#C9A06A':e.k==='bubble'?'#45D4FF':'#D2603F',size:rand(5,10),life:.7,vr:rand(-8,8)})}break;
    case 'spawn':if(near){addP({x:e.x,y:e.y,type:'ring',col:'#FFC531',size:60,life:.5});for(let i=0;i<6;i++){const a=i/6*TAU;addP({x:e.x,y:e.y+10,vx:Math.cos(a)*90,vy:Math.sin(a)*40,type:'smoke',col:'#E9E2F7',size:12,life:.7,drag:2})}word(e.x,e.y-46,'DE VOLTA!','#FFC531',20)}
      if(mine){Sound.play('spawn');if(!e.first)showRespawnCard(e.g,'NOVAS ARMAS',e.g2)}break;
    case 'ko':if(!near)break;burst(e.x,e.y,12,[e.c,'#FFF4E0','#FFC531'],'star',260,8,.8);for(let i=0;i<5;i++)addP({x:e.x+rand(-10,10),y:e.y+rand(-10,10),vy:-40,type:'smoke',col:'#cfc6e6',size:14,life:.8,drag:1});word(e.x,e.y-20,'KO!','#FF4F9A',34);if(snd)Sound.play('ko');break;
    case '67':if(mine){stamp67(e.lv);Sound.play('level');vibe([40,40,80]);celebrate(80)}else if(near){word(e.x,e.y-50,'67!','#FFC531',40);burst(e.x,e.y,14,'#FFC531','star',260,8)}break;
    case 'kill':addFeed(e);if(e.ki===self&&e.vi!==self&&!demo){killPop(e.v);tk('kills');const kg=GUNS[e.g];if(kg)tk('k_'+kg.cat)}break;
    case 'gem':if(near&&S.particles!=='low')burst(e.x,e.y,4,['#FF8A1F','#FFC07A','#fff'],'star',120,4,.4);if(mine){Sound.play('gem',(e.n%8));flyGem(e.x,e.y);const tg=store.get('totalGems',0)+1;store.set('totalGems',tg);$('totalGems').textContent=wallet();bump('gems')}break;
    case 'flagtake':if(!demo){toast(e.name+' pegou a bandeira!',e.pid===self?'good':'');Sound.play('pickup')}break;
    case 'flagret':if(!demo&&MODE.id==='ctf')toast('Bandeira '+(TEAM[e.team]?TEAM[e.team].n:'')+' voltou pra base');break;
    case 'capture':if(!demo){bigBanner('CAPTURA!',`${e.name} pontuou para o time ${TEAM[e.team].n}`,TEAM[e.team].c);Sound.play('capture');celebrate(60)}break;
    case 'vanish':if(near){addP({x:e.x,y:e.y,type:'spiral',col:'#FFC531',size:40,life:.5,vr:7});for(let i=0;i<8;i++)addP({x:e.x+rand(-14,14),y:e.y+rand(-20,14),vy:-30,type:'smoke',col:'#E9E2F7',size:12,life:.6,drag:2});word(e.x,e.y-40,'CARTA!','#FFC531',26)}if(mine)Sound.play('warp');break;
    case 'reappear':if(near){addP({x:e.x,y:e.y,type:'ring',col:'#FFC531',size:70,life:.5});burst(e.x,e.y,12,['#FFC531','#FF4F9A','#45D4FF'],'star',260,7);const pk=perkById(e.perk);if(pk)word(e.x,e.y-48,pk.n,RARITY[pk.r][1],20)}if(mine)Sound.play('spawn');break;
    case 'block':if(near){addP({x:e.x,y:e.y-4,type:'ring',col:'#45D4FF',size:44,life:.4});word(e.x,e.y-44,'BLOQUEADO!','#45D4FF',20)}if(!demo)Sound.play('pop');break;
    case 'zonemove':if(!demo){toast('A lagoa mudou de lugar!');Sound.play('warp')}break;
  }}

// ---------- Desenho do mundo ----------
function worldToScreen(x,y){return[(x-cam.x)*zoom,(y-cam.y)*zoom*SQ]}
function drawNameTag(c,p,x,y){if(!S.names&&p.id!==self)return;c.save();c.translate(x,y-(Map3D.NAMEOFF-Map3D.FEET));c.scale(1,1/SQ);c.font='800 12px "Baloo 2",sans-serif';c.textAlign='center';c.textBaseline='middle';
  const w=Math.max(44,c.measureText(p.name).width+30),tc=p.team>=0?TEAM[p.team].c:null;c.fillStyle=p.id===self?'#FFC531':tc?shade(tc,-.35):'#12082bcc';rr(c,-w/2,-9,w,18,9);c.fill();c.strokeStyle=INK;c.lineWidth=2;c.stroke();
  hexgon(c,-w/2+2,0,10);c.fillStyle=tc||'#FFC531';c.fill();c.stroke();c.fillStyle=INK;c.font='13px "Lilita One",sans-serif';c.fillText(MODE.id==='gun'?p.gunLvl+1:p.level,-w/2+2,1);
  c.fillStyle=p.id===self?INK:'#FFF4E0';c.font='800 12px "Baloo 2",sans-serif';c.fillText(p.name,7,1);
  c.fillStyle='#12082b';rr(c,-20,11,40,6,3);c.fill();c.fillStyle=p.hp>40?'#6CF06A':'#FF3B47';rr(c,-20,11,40*clamp(p.hp/100,0,1),6,3);c.fill();c.lineWidth=1.5;rr(c,-20,11,40,6,3);c.stroke();c.restore()}
function drawStatus(c,p,ht,t){
  if(ht<p.frozenUntil){c.save();c.globalAlpha=.55;const gr=c.createLinearGradient(-22,-40,22,26);gr.addColorStop(0,'#E9F9FF');gr.addColorStop(1,'#7FD8FF');c.fillStyle=gr;rr(c,-24,-40,48,66,10);c.fill();c.globalAlpha=1;c.strokeStyle='#BFF1FF';c.lineWidth=2.5;c.stroke();
    c.strokeStyle='#ffffffcc';c.lineWidth=3;c.beginPath();c.moveTo(-14,-30);c.lineTo(-6,-36);c.moveTo(-16,-20);c.lineTo(-8,-26);c.stroke();c.restore()}
  // fogo: partículas 3D (FX3D.burning, em drawPlayer)
  if(ht<p.slowUntil){c.fillStyle='#F5B014aa';for(const x of [-12,4,14]){c.beginPath();c.ellipse(x,20,6,3,0,0,TAU);c.fill()}}
  if(ht<p.stunUntil&&ht>=p.frozenUntil){for(let i=0;i<3;i++){const a=t/200+i*2.1;c.fillStyle='#FFC531';star(c,Math.cos(a)*16,-40+Math.sin(a)*4,6,2.6,5);c.fill();c.strokeStyle=INK;c.lineWidth=1.2;c.stroke()}}
  if(ht<p.confuseUntil){c.font='22px "Lilita One"';c.fillStyle='#45D4FF';c.strokeStyle=INK;c.lineWidth=4;c.textAlign='center';c.strokeText('?!',0,-42);c.fillText('?!',0,-42)}
  if(ht<p.flashUntil){c.globalCompositeOperation='lighter';c.fillStyle='#FFFFFF66';c.beginPath();c.arc(0,-6,30,0,TAU);c.fill();c.globalCompositeOperation='source-over'}}
function drawWorld(dt,t){const ht=hostNow();
  ctx.setTransform(1,0,0,1,0,0);
  const k=canvas.width/VW;let sx=0,sy=0;if(shakeA>.1&&S.shake){sx=rand(-shakeA,shakeA);sy=rand(-shakeA,shakeA)}shakeA*=Math.exp(-10*dt);
  // O jogo é 3D (03_map3d.js): cenário, capivaras e armas vão para o WebGL; este canvas transparente fica só com tiros, efeitos e textos
  ctx.clearRect(0,0,canvas.width,canvas.height);const g3=Map3D.on(M);CAP3=g3&&Map3D.capysOn(M);acts3.length=0;
  ctx.setTransform(k,0,0,k*SQ,(-cam.x+sx)*k,(-cam.y+sy)*k*SQ);
  if(MODE.id==='koth'&&ms.zone&&!demo){const z=ms.zone,o=players[z.owner];drawZone(ctx,z,t,z.contested?'#FF3B47':o?(o.id===self?'#FFC531':'#FF4F9A'):'#FFF4E0')}
  if(MODE.id==='ctf'&&!demo)for(const [i,[bx,by]] of M.bases.entries()){ctx.save();ctx.strokeStyle=TEAM[i].c;ctx.lineWidth=6;ctx.setLineDash([16,12]);ctx.beginPath();ctx.arc(bx,by,80,0,TAU);ctx.stroke();ctx.setLineDash([]);ctx.fillStyle=TEAM[i].c+'22';ctx.fill();ctx.restore()}
  for(const f of fields)if(f.k==='time'||f.k==='hole')drawField(ctx,f,t,ht);
  // laranjinhas, kits e caixas: 3D (03_fx3d.js)
  const fancy=S.particles!=='low';
  // tiros: desenhados em 3D (03_fx3d.js); aqui só os rastros de fumaça/brilho
  for(const b of bullets){if(!nearCam(b.x,b.y,80))continue;const g=GUNS[b.g];if(fancy&&g&&(g.p==='rocket'||g.p==='rpg'||g.p==='bigrocket'||g.p==='chicken')&&Math.random()<.5)addP({x:b.x,y:b.y,h:FX3D.FLY,type:'smoke',col:'#E9E2F7',size:g.p==='bigrocket'?12:6,life:.5,drag:2});
    else if(fancy&&g&&g.cat!=='laser'&&g.p!=='flame'&&g.p!=='tracer'&&g.p!=='text'&&Math.random()<.3)addP({x:b.x,y:b.y,h:FX3D.FLY,type:'dot',col:g.col||'#fff',size:3,life:.18})}
  // paredes + construções + capivaras ordenadas por y
  const draws=[];for(const b of builds)if(nearCam(b.x,b.y,120))draws.push([b.y+(b.h||0)/2,()=>drawBuild(ctx,b,t)]);
  for(const p of Object.values(players)){const tr=track[p.id];if(!p.alive||p.picking||!tr)continue;if(!nearCam(p.rx,p.ry,90))continue;draws.push([p.ry+20,()=>drawPlayer(p,tr,t,ht,fancy)])}
  draws.sort((a,b)=>a[0]-b[0]);
  for(const [,f] of draws)f();
  for(const f of ms.flags||[]){if(!nearCam(f.x,f.y,60))continue;const col=f.team>=0?TEAM[f.team].c:'#FFC531';if(f.carrier){const c=players[f.carrier];if(c&&c.alive){drawFlag(ctx,c.rx+14,c.ry-22,col,t,true);continue}}drawFlag(ctx,f.x,f.y,col,t,false)}
  for(const f of fields)if(f.k==='meteor'||f.k==='stamp')drawField(ctx,f,t,ht);
  updateParts(dt);drawParts(ctx);
  let L=null;if(M.theme==='dark'){L=[];for(const p of Object.values(players))if(p.alive)L.push([p.rx,p.ry,p.id===self?420:260]);for(const b of bullets)L.push([b.x,b.y,70]);for(const g of gems)L.push([g.x,g.y,50]);for(const m of meds)L.push([m.x,m.y,70]);for(const f of ms.flags||[])L.push([f.x,f.y,140]);if(ms.zone)L.push([ms.zone.x,ms.zone.y,340]);for(const p of parts)if(p.type==='boom'||p.type==='flash')L.push([p.x,p.y,p.size*3]);drawDarkness(ctx,M,cam,VW,VH,L)}
  drawCrosshair(t); // calcula a mira ANTES do 3D: as marcas no chão saem no mesmo quadro (sem atraso)
  if(g3){try{Map3D.render(M,cam.x-sx,cam.y-sy,VW,VH,t,L,CAP3?acts3:null)}catch(e){Map3D.fail(e)}} // um erro num quadro só é registrado; o próximo quadro tenta de novo
  drawReticle(t);
  // setas de borda
  ctx.setTransform(pr,0,0,pr,0,0);const me=players[self];
  if(me&&me.alive&&started&&!demo){const arrows=[];
    if(isTouch)gems.filter(g=>!nearCam(g.x,g.y,-20)).map(g=>[g,Math.hypot(g.x-me.rx,g.y-me.ry)]).sort((a,b)=>a[1]-b[1]).slice(0,2).forEach(([g])=>arrows.push([g.x,g.y,'#FF8A1F']));
    for(const f of ms.flags||[])if(!nearCam(f.x,f.y,-30))arrows.push([f.x,f.y,f.team>=0?TEAM[f.team].c:'#FFC531',1]);
    if(ms.zone&&!nearCam(ms.zone.x,ms.zone.y,-60))arrows.push([ms.zone.x,ms.zone.y,'#4FC3E8',1]);
    for(const [x,y,col,big] of arrows){const [gx,gy]=worldToScreen(x,y),cx=innerWidth/2,cy=innerHeight/2,a=Math.atan2(gy-cy,gx-cx),m=34;const ex=clamp(cx+Math.cos(a)*innerWidth,m,innerWidth-m),ey=clamp(cy+Math.sin(a)*innerHeight,m+70,innerHeight-m);
      ctx.save();ctx.translate(ex,ey);ctx.rotate(a);const s=big?1.4:1;ctx.scale(s,s);ctx.fillStyle=col;ctx.strokeStyle=INK;ctx.lineWidth=3;ctx.beginPath();ctx.moveTo(12,0);ctx.lineTo(-8,-10);ctx.lineTo(-4,0);ctx.lineTo(-8,10);ctx.closePath();ctx.fill();ctx.stroke();ctx.restore()}}
  // distorção do tempo parado
  if(me&&!demo){const inField=fields.some(f=>f.k==='time'&&Math.hypot(me.rx-f.x,me.ry-f.y)<f.r+80);distortT=lerp(distortT,(ht<me.frozenUntil||inField)?1:0,Math.min(1,dt*6))}else distortT=0;
  if(distortT>.03)applyDistortion(t)}
function drawPlayer(p,tr,t,ht,fancy){const x=p.rx,y=p.ry;
  // a capivara e a arma são 3D (03_capy3d.js / 03_guns3d.js): aqui só mandamos o estado; o desenho acontece no WebGL.
  // Os anéis do time e o seu anel tracejado também são 3D, no chão embaixo dela.
  if(p.dashTime>0&&fancy)addP({x:x+rand(-6,6),y:y+rand(-14,14),h:rand(6,30),vx:-Math.cos(p.aim)*10,type:'dot',col:p.look.trail,size:9,life:.25});
  if(ht<p.burnUntil)FX3D.burning(x,y+8,1/60);
  const hurt=ht-p.hurtAt<140,frozen=ht<p.frozenUntil,g=GUNS[p.gun],me=players[self];
  acts3.push({id:p.id,x,y,aim:p.aim,bot:p.bot,look:p.look,gun:p.gun,melee:!!(g&&g.melee),swing:tr.swing||0,recoil:t-tr.shotT<90?1:0,hurt:hurt?1-(ht-p.hurtAt)/140:0,
    frozen,dash:p.dashTime>0,shield:ht<p.shieldUntil,self:p.id===self,ring:p.team>=0&&isTeams()?TEAM[p.team].c:null,xc:p.id===self?'#FFC531':(p.team>=0&&isTeams())?TEAM[p.team].c:(me&&sameTeam(me,p)?'#6CF06A':'#FF4F9A')});
  if(!CAP3)return;
  ctx.save();ctx.translate(x,y);ctx.translate(0,Map3D.FEET-Map3D.K*30);ctx.scale(1,1/SQ);
  ctx.globalAlpha=1;
  if(p.mods&&p.mods.bubble&&ht-p.bubbleAt>12000){ctx.strokeStyle='#9FD8FF88';ctx.lineWidth=2;ctx.setLineDash([6,5]);ctx.beginPath();ctx.arc(0,-4,30,0,TAU);ctx.stroke();ctx.setLineDash([])}
  if(ht<p.shieldUntil){ctx.strokeStyle='#45D4FFaa';ctx.lineWidth=3;ctx.beginPath();ctx.arc(0,-4,34,0,TAU);ctx.stroke();ctx.fillStyle='#45D4FF22';ctx.fill()}
  drawStatus(ctx,p,ht,t);ctx.restore();drawNameTag(ctx,p,x,y)}
let distCv=null;
function applyDistortion(t){if(!distCv)distCv=document.createElement('canvas');if(distCv.width!==canvas.width||distCv.height!==canvas.height){distCv.width=canvas.width;distCv.height=canvas.height}
  const d=distCv.getContext('2d');d.setTransform(1,0,0,1,0,0);d.clearRect(0,0,distCv.width,distCv.height);d.drawImage(canvas,0,0);
  ctx.setTransform(1,0,0,1,0,0);const h=canvas.height,w=canvas.width,band=Math.max(6,Math.round(h/70)),amp=distortT*18*pr;
  for(let y=0;y<h;y+=band){const off=Math.sin(y/(h/9)+t/140)*amp+Math.sin(y/23+t/60)*amp*.25;ctx.drawImage(distCv,0,y,w,band,off,y,w,band)}
  ctx.globalCompositeOperation='screen';ctx.globalAlpha=distortT*.35;ctx.drawImage(distCv,6*pr*distortT,0);ctx.globalAlpha=1;ctx.globalCompositeOperation='source-over';
  ctx.fillStyle=`rgba(120,170,255,${distortT*.22})`;ctx.fillRect(0,0,w,h)}

// ---------- Previsão local (modo servidor) ----------
// Sua capivara anda na hora no seu aparelho; quando o estado do servidor chega, comparamos com onde
// você estava há "ping" milissegundos e corrigimos aos poucos. Erros grandes (teleporte, respawn) encaixam direto.
const pred={on:false,x:0,y:0,hist:[],dashT:0,dashAt:-1e9,dx:0,dy:0,snap:null,lt:0};
function predictSelf(p){const t=time(),ht=hostNow(),dt=pred.on?clamp((t-pred.lt)/1000,0,.25):0;pred.lt=t;
  if(!p.alive||p.picking||over||view!=='game'){pred.on=false;return false}
  if(!pred.on){pred.on=true;pred.x=p.x;pred.y=p.y;pred.hist=[];pred.dashT=0;pred.snap=lastState}
  const md=p.mods||defaultMods(),frozen=ht<p.frozenUntil,stun=ht<p.stunUntil||frozen,conf=ht<p.confuseUntil?-1:1;
  let dx=((+!!keys.right)-(+!!keys.left))*conf,dy=((+!!keys.down)-(+!!keys.up))*conf;if(stun)dx=dy=0;const l=Math.hypot(dx,dy)||1;dx/=l;dy/=l;
  if(keys.dash&&!stun&&pred.dashT<=0&&ht-Math.max(p.dashAt||0,pred.dashAt)>2800*md.dashcd){pred.dashAt=ht;pred.dashT=.19*md.dashlen;pred.dx=dx||Math.cos(localAim);pred.dy=dy||Math.sin(localAim)}
  const dashing=pred.dashT>0&&!frozen;pred.dashT=Math.max(0,pred.dashT-dt);
  let sp=dashing?900:215*md.spd*(md.adren&&p.hp<p.maxHp*.35?1.3:1);if(ht<p.slowUntil)sp*=.5;if(p.carry>=0)sp*=.88;
  if(!frozen){const o={x:pred.x,y:pred.y},n=Math.max(1,Math.ceil(dt/.04));for(let i=0;i<n;i++){o.x+=(dashing?pred.dx:dx)*sp*dt/n;o.y+=(dashing?pred.dy:dy)*sp*dt/n;pushOut(o)}pred.x=o.x;pred.y=o.y}
  pred.hist.push({t,x:pred.x,y:pred.y});while(pred.hist.length>2&&t-pred.hist[0].t>1500)pred.hist.shift();
  if(lastState!==pred.snap){pred.snap=lastState;const back=t-(rtt||90)-12;let h=pred.hist[0];for(const q of pred.hist){if(q.t<=back)h=q;else break}
    const ex=p.x-h.x,ey=p.y-h.y,e=Math.hypot(ex,ey);
    if(e>140){pred.x=p.x;pred.y=p.y;pred.hist=[]}else if(e>3){const k=.3;pred.x+=ex*k;pred.y+=ey*k;for(const q of pred.hist){q.x+=ex*k;q.y+=ey*k}}}
  p.rx=pred.x;p.ry=pred.y;return true}

// ---------- Laço ----------
let lastFrame=0,hudAt=0,mmAt=0,slowT=0,wasMenuBg=null;
function frame(t){requestAnimationFrame(frame);
  const mb=menuBg();if(mb!==wasMenuBg){wasMenuBg=mb;resize()}
  const minDt=1000/(mb?Math.min(30,S.fps):S.fps)-1.5;if(t-lastFrame<minDt)return;let dt=Math.min(.05,(t-lastFrame)/1000);
  if(S.dynres&&!mb&&view==='game'&&dt>.026){slowT+=dt;if(slowT>2&&resScale>.55){resScale*=.85;resize();slowT=0}}else slowT=Math.max(0,slowT-dt*.5);
  lastFrame=t;
  const active=demo||started;
  if(demo)step(dt,time());
  else if(host&&started&&!(paused&&solo)){pushInputs();step(dt,time());sync()}
  else if(!host&&started){pushInputs()}
  if(started&&!isTouch&&mouseOn&&view==='game'&&players[self])aimAt(mouseSX,mouseSY);
  if(started&&isTouch&&aimStick.on&&view==='game'&&players[self]){const me=players[self],g=GUNS[me.gun],R=g?Math.max(90,gunReach(g,me.mods||defaultMods())):300,d=g&&g.instant?R*.8:R*.92;mouseSX=((me.rx??me.x)+Math.cos(aimStick.a)*d-cam.x)*zoom;mouseSY=((me.ry??me.y)+Math.sin(aimStick.a)*d-cam.y)*zoom*SQ;aimAt(mouseSX,mouseSY)}
  // menus: a capivara 3D no deque da lagoa (03_map3d.js > menu)
  if(!active){ctx.setTransform(1,0,0,1,0,0);let ok3=false;try{ok3=Map3D.menu(t,{view:menuView(),fur:menuFur(),drag:menuDrag,gun:menuGun(),bg:menuBgKey(),hat:menuHat()})}catch(e){Map3D.fail(e)}
    if(ok3){ctx.clearRect(0,0,canvas.width,canvas.height);if(Map3D.prewarm(isTouch?3:5))iconPrewarm()}else{Map3D.idle();ctx.fillStyle='#2A1366';ctx.fillRect(0,0,canvas.width,canvas.height)}return}
  // câmera inclinada só quando o 3D está ligado neste mapa (senão fica a visão de cima do 2D)
  processEffects(t);
  const sm=Math.min(1,dt*14);
  for(const p of Object.values(players)){let tr=track[p.id];if(!tr){tr=track[p.id]={shot:p.shotAt,dash:p.dashAt,slot:p.slot,shotT:-1e9,swing:0,recoil:0,alive:p.alive}}
    if(host||demo){p.rx=p.x;p.ry=p.y}else if(p.id===self&&srvMode()&&predictSelf(p)){}else{if(Math.hypot(p.x-p.rx,p.y-p.ry)>300||!tr.alive){p.rx=p.x;p.ry=p.y}else{p.rx+=(p.x-p.rx)*sm;p.ry+=(p.y-p.ry)*sm}}
    if(p.shotAt!==tr.shot){tr.shot=p.shotAt;tr.shotT=t;onShot(p,tr)}
    if(p.slot!==tr.slot){tr.slot=p.slot;if(p.id===self){Sound.play('swap');hudGun=-1}}
    if(p.dashAt!==tr.dash){tr.dash=p.dashAt;if(p.id===self&&!demo&&p.dashAt>0)tk('dashes');if(p.dashAt>0&&nearCam(p.x,p.y)){if(p.id===self||!demo)Sound.play('dash');for(let i=0;i<8;i++)addP({x:p.x+rand(-10,10),y:p.y+rand(-12,18),vx:-(p.dx||0)*rand(200,420),vy:-(p.dy||0)*rand(200,420),type:'line',col:p.look.trail,size:4,life:.3,drag:4})}}
    tr.swing=Math.max(0,tr.swing-dt*5);tr.alive=p.alive}
  if(!host&&!demo)for(const b of bullets){if(!b.stick){b.x+=b.vx*dt;b.y+=b.vy*dt}}
  const me=players[self];let fx2,fy2;
  if(demo){demoSwap-=dt;if(demoSwap<=0||!players[demoFocus]){demoFocus=pick(Object.keys(players));demoSwap=7}const f=players[demoFocus];fx2=f.x;fy2=f.y}else if(me){fx2=me.rx+Math.cos(localAim)*30;fy2=me.ry+Math.sin(localAim)*30}
  if(fx2!=null){const tx=fx2-VW/2,ty=fy2-VH/2,ck=Math.min(1,dt*(demo?1.2:7));cam.x+=(tx-cam.x)*ck;cam.y+=(ty-cam.y)*ck;
    cam.x=VW>=W+120?W/2-VW/2:clamp(cam.x,-60,W-VW+60);cam.y=VH>=H+120?H/2-VH/2:clamp(cam.y,-60,H-VH+60)}
  drawWorld(dt,t);
  if(started&&!demo){if(t-hudAt>90){updateHUD(t);hudAt=t}if(!isTouch&&t-mmAt>150){drawMinimap();mmAt=t}}
  hurtFlash=Math.max(0,hurtFlash-dt*2.5);const hv=$('hurtVignette');if(hv)hv.style.opacity=Math.max(hurtFlash*.8,me&&me.alive&&me.hp<25?.35+Math.sin(t/150)*.15:0);
  const fl=$('flashOv');if(fl){const ht=hostNow(),left=me&&!demo?me.flashUntil-ht:0;fl.style.opacity=left>0?clamp(left/900,0,1):0}}
function drawMinimap(){const c=$('minimap').getContext('2d'),w=340,h=226,sx=w/W,sy=h/H;c.clearRect(0,0,w,h);c.fillStyle='#ffffff30';for(const [x,y,ww,hh] of M.walls)c.fillRect(x*sx,y*sy,ww*sx,hh*sy);
  c.fillStyle='#FF8A1F';for(const g of gems)c.fillRect(g.x*sx-1.5,g.y*sy-1.5,3,3);c.fillStyle='#6CF06A';for(const m of meds)c.fillRect(m.x*sx-3,m.y*sy-3,6,6);c.fillStyle='#FFC531';for(const m of crates)c.fillRect(m.x*sx-3,m.y*sy-3,6,6);
  if(ms.zone){c.strokeStyle='#4FC3E8';c.lineWidth=2;c.beginPath();c.arc(ms.zone.x*sx,ms.zone.y*sy,ms.zone.r*sx,0,TAU);c.stroke()}
  for(const f of ms.flags||[]){c.fillStyle=f.team>=0?TEAM[f.team].c:'#FFC531';c.fillRect(f.x*sx-4,f.y*sy-8,3,10);c.fillRect(f.x*sx-1,f.y*sy-8,7,5)}
  c.strokeStyle='#FFF4E088';c.lineWidth=2;c.strokeRect(cam.x*sx,cam.y*sy,VW*sx,VH*sy);const me=players[self];
  for(const p of Object.values(players)){if(!p.alive||p.picking)continue;const isMe=p.id===self;c.fillStyle=isMe?'#FFC531':p.team>=0?TEAM[p.team].c:(me&&sameTeam(me,p)?'#6CF06A':'#FF4F9A');c.strokeStyle=INK;c.lineWidth=2;c.beginPath();c.arc(p.x*sx,p.y*sy,isMe?7:5,0,TAU);c.fill();c.stroke()}}

// ---------- Mira personalizada (PC) ----------
function gunReach(g,md){if(g.melee)return g.range*md.range;if(g.instant)return (g.range2||g.build&&g.build.dist||300)*md.range;const L=g.life*md.range/md.bspd,v=g.sp*md.bspd;if(g.fric){const k=g.fric*1.6;return v/k*(1-Math.exp(-k*L))}return v*L}
// mira: só calcula o estado; o desenho é 3D, no chão (Map3D.setAim → aimTick em 03_map3d.js)
function drawCrosshair(t){const me=players[self];if((isTouch?!aimStick.on:!mouseOn)||!me||!me.alive||me.picking||demo||!started||over){Map3D.setAim(null);return}const g=GUNS[me.gun];if(!g){Map3D.setAim(null);return}const md=me.mods||defaultMods();
  const px=me.rx,py=me.ry+Map3D.FEET,a=localAim,wx=mouseSX/zoom+cam.x,wy=mouseSY/(zoom*SQ)+cam.y,d=Math.hypot(wx-me.rx,wy-me.ry);
  const col=CATS[g.cat][1],reach=gunReach(g,md),ht=hostNow(),cdp=clamp((ht-me.shotAt)/(g.cd*md.cd),0,1),ca=Math.cos(a),sa=Math.sin(a);
  const st={px,py,a,reach,col,cd:cdp,cx:wx,cy:wy,inRange:true};
  if(g.melee){st.kind='melee';st.half=Math.acos(clamp(g.arc-.05,-1,1));st.inRange=d<=reach+18;st.cx=null}
  else if(g.build){const bd=g.build;st.kind='build';st.cx=null;st.bk=bd.k;if(bd.k==='wall'){const vert=Math.abs(ca)>=Math.abs(sa);st.bw=vert?24:112;st.bh=vert?112:24;st.bx=px+ca*(bd.dist+20);st.by=py+sa*(bd.dist+20)}
    else if(bd.k==='bubble'){st.bx=px;st.by=py;st.br=78}else{st.bx=px+ca*(bd.dist+20);st.by=py+sa*(bd.dist+20);st.br=18}}
  else if(g.instant){const td=clamp(d,80,reach);st.kind='instant';st.rx=px+ca*td;st.ry=py+sa*td;st.blast=(g.meteor||g.stamp).r;st.inRange=d<=reach;st.cx=st.rx;st.cy=st.ry}
  else{st.kind='shot';st.inRange=d<=reach;st.len=Math.min(d,reach);st.w=Math.max(10,(g.r||8)*2.2);st.spr=Math.max(g.spr,(g.n2+md.extra>1&&!g.spr)?.12*(g.n2+md.extra-1):0);
    const blast=g.boom?g.boom*md.boom:g.timestop?g.timestop.r:g.hole?g.hole.r:g.flashR||0;
    if(blast){const atC=!g.fuse&&!g.fric;st.blast=blast;st.zx=atC&&st.inRange?wx:px+ca*reach;st.zy=atC&&st.inRange?wy:py+sa*reach;st.zcol=g.flashR?'#FFF4B0':g.timestop?'#9FD8FF':g.hole?'#C38BFF':'#FF7A1A'}
    if(g.heal)st.col='#6CF06A'}
  if(st.cx!=null&&st.kind==='shot'){st.cy=wy}
  Map3D.setAim(st);retS=st}
// retículo do mouse: desenhado no canvas por cima, exatamente onde o mouse está (resposta imediata, como antes)
let retS=null;
function drawReticle(t){const s=retS;retS=null;if(!s||isTouch)return;const me=players[self];if(!me)return;ctx.setTransform(pr,0,0,pr,0,0);const c=ctx,x=mouseSX,y=mouseSY;
  const col=s.inRange?(s.col||'#FFF4E0'):'#9AA3B3',R0=13,sp=t/900;c.save();c.translate(x,y);c.lineCap='round';
  c.globalAlpha=.9;c.strokeStyle='#1B1033';c.lineWidth=5.5;for(let i=0;i<3;i++){const q=sp+i*TAU/3;c.beginPath();c.arc(0,0,R0,q,q+1.35);c.stroke()}
  c.strokeStyle=col;c.lineWidth=2.8;for(let i=0;i<3;i++){const q=sp+i*TAU/3;c.beginPath();c.arc(0,0,R0,q,q+1.35);c.stroke()}
  c.globalAlpha=1;c.fillStyle=col;c.strokeStyle='#1B1033';c.lineWidth=1.6;c.beginPath();c.arc(0,0,3,0,TAU);c.fill();c.stroke();
  if(s.cd<1){c.strokeStyle='#1B103399';c.lineWidth=4;c.beginPath();c.arc(0,0,R0+6,0,TAU);c.stroke();c.strokeStyle='#FFC531';c.lineWidth=3;c.beginPath();c.arc(0,0,R0+6,-Math.PI/2,-Math.PI/2+s.cd*TAU);c.stroke()}
  c.restore()}
