// ===== Render, partículas, efeitos e laço principal =====
const canvas=$('game'),ctx=canvas.getContext('2d');
let VW=960,VH=540,zoom=1,pr=1,resScale=1;const cam={x:W/2-480,y:H/2-270};let shakeA=0;
function resize(){const q=S.quality,dpr=window.devicePixelRatio||1;pr=Math.min(dpr,q==='low'?.8:q==='high'?2:q==='chaos'?2.5:1.25)*resScale;
  canvas.width=Math.round(innerWidth*pr);canvas.height=Math.round(innerHeight*pr);zoom=clamp(Math.min(innerWidth,innerHeight)/(isTouch?470:560),.6,1.4);VW=innerWidth/zoom;VH=innerHeight/zoom;floorFor=''}
addEventListener('resize',resize);resize();

// ---------- Partículas ----------
let parts=[];
const partMax=()=>S.particles==='low'?120:S.particles==='mid'?300:600;
function addP(o){if(parts.length>=partMax())return;parts.push(Object.assign({vx:0,vy:0,g:0,life:.6,size:6,rot:0,vr:0,type:'dot',col:'#fff',drag:0},o,{max:o.life||.6}))}
function burst(x,y,n,col,type='star',spd=180,size=6,life=.55){if(S.particles==='low')n=Math.ceil(n/3);for(let i=0;i<n;i++){const a=Math.random()*TAU,s=spd*rand(.4,1);addP({x,y,vx:Math.cos(a)*s,vy:Math.sin(a)*s,type,col:Array.isArray(col)?pick(col):col,size:size*rand(.6,1.2),life:life*rand(.7,1.2),vr:rand(-8,8),drag:3})}}
function word(x,y,txt,col,size=26){addP({x,y,vy:-60,type:'word',txt,col,size,life:.7,rot:rand(-.25,.25),drag:2})}
function updateParts(dt){for(let i=parts.length-1;i>=0;i--){const p=parts[i];p.life-=dt;if(p.life<=0){parts.splice(i,1);continue}const d=Math.exp(-p.drag*dt);p.vx*=d;p.vy=p.vy*d+p.g*dt;p.x+=p.vx*dt;p.y+=p.vy*dt;p.rot+=p.vr*dt}}
function drawParts(c){for(const p of parts){const k=p.life/p.max;c.save();c.translate(p.x,p.y);c.rotate(p.rot);c.globalAlpha=Math.min(1,k*2);c.fillStyle=p.col;c.strokeStyle=INK;
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
function onShot(p,tr){const g=GUNS[p.gun];if(!g)return;const me=p.id===self;
  if(g.melee){tr.swing=1}else if(!g.instant){tr.recoil=1;addP({x:p.x+Math.cos(p.aim)*30,y:p.y+5+Math.sin(p.aim)*30,type:'flash',col:g.col||'#fff',size:g.cat==='heavy'?24:12,life:.09})}
  if(me||(!demo&&nearCam(p.x,p.y,-40)&&Math.random()<.5))Sound.play(g.sfx||'pew');if(me&&(g.cat==='heavy'||g.txt==='NÃO')){vibe(25);shakeA=Math.max(shakeA,g.m==='megabazooka'?9:3)}}
const seenFx=new Map();
function processEffects(t){const now=time();for(const e of effects){if(seenFx.has(e.id))continue;seenFx.set(e.id,now);onEffect(e)}if(seenFx.size>1500)for(const [k,v] of seenFx)if(now-v>12000)seenFx.delete(k)}
function camShake(x,y,a){if(!S.shake)return;const d=Math.hypot(x-(cam.x+VW/2),y-(cam.y+VH/2));shakeA=Math.max(shakeA,clamp(a-d/90,0,a))}
function onEffect(e){const near=nearCam(e.x||0,e.y||0),snd=!demo&&near,mine=e.pid===self&&!demo;
  switch(e.kind){
    case 'hit':if(!near)break;burst(e.x,e.y,5,[e.c||'#fff','#fff'],'star',200,6);if(e.w)word(e.x+rand(-10,10),e.y-14,e.w,e.c==='#FFFFFF'?'#FFC531':e.c,e.s?32:24);if(snd)Sound.play('hit');break;
    case 'spark':if(near)burst(e.x,e.y,3,[e.c||'#fff','#fff'],'dot',140,3,.25);break;
    case 'dmg':if(near)addP({x:e.x+rand(-8,8),y:e.y,vy:-90,type:'word',txt:'-'+e.v,col:e.v>=40?'#FF3B47':'#FFF4E0',size:e.v>=40?24:17,life:.7,drag:2});
      if(mine){Sound.play('hurt');hurtFlash=1;vibe(30);if(S.shake)shakeA=Math.max(shakeA,4)}break;
    case 'boom':if(!near)break;addP({x:e.x,y:e.y,type:'boom',col:e.gold?'#FFC531':'#FF7A1A',size:e.r*.9,life:.38});addP({x:e.x,y:e.y,type:'ring',col:'#fff',size:e.r*1.3,life:.4});
      for(let i=0;i<(S.particles==='low'?3:8);i++){const a=Math.random()*TAU;addP({x:e.x+Math.cos(a)*e.r*.4,y:e.y+Math.sin(a)*e.r*.4,vx:Math.cos(a)*60,vy:Math.sin(a)*60-30,type:'smoke',col:'#E9E2F7',size:rand(10,18)*(e.r>150?2:1),life:rand(.6,1),drag:1.5})}
      burst(e.x,e.y,8,['#FFC531','#FF7A1A','#FF4F9A'],'star',320,7);word(e.x,e.y-e.r*.6,e.gold?'67!':e.r>150?'KA-BUUUM':'KABUM',e.gold?'#FFC531':'#FF7A1A',e.r>150?48:36);
      if(snd){Sound.play('boom');camShake(e.x,e.y,e.r>150?14:9)}break;
    case 'meteor':if(!near)break;addP({x:e.x,y:e.y,type:'boom',col:'#FF3B47',size:e.r*1.1,life:.5});for(let i=0;i<10;i++)addP({x:e.x+rand(-40,40),y:e.y+rand(-40,40),vx:rand(-200,200),vy:rand(-200,200),type:'brick',col:'#8E5A3A',size:rand(6,12),life:.8,vr:rand(-9,9),drag:2});camShake(e.x,e.y,16);if(snd)Sound.play('boom');break;
    case 'stamp':if(!near)break;addP({x:e.x,y:e.y,type:'ring',col:'#E8443A',size:e.r*1.6,life:.5});word(e.x,e.y,'VETADO!','#E8443A',44);camShake(e.x,e.y,10);if(snd)Sound.play('slap');break;
    case 'heal':if(!near)break;for(let i=0;i<7;i++)addP({x:e.x+rand(-18,18),y:e.y+rand(-10,14),vy:-rand(50,110),type:'heart',txt:i%2?'+':'',col:'#6CF06A',size:rand(6,9),life:.9,drag:1});word(e.x,e.y-36,'+'+e.v,'#6CF06A',22);if(snd)Sound.play('heal');break;
    case 'med':if(near){for(let i=0;i<8;i++)addP({x:e.x+rand(-16,16),y:e.y,vy:-rand(60,120),type:'heart',txt:'+',col:'#6CF06A',size:7,life:.9,drag:1});word(e.x,e.y-30,'+50','#6CF06A',24)}if(mine)Sound.play('med');break;
    case 'crate':if(near){burst(e.x,e.y,10,['#FFC531','#C98B4E'],'star',220,7);const g=GUNS[e.g];if(g)word(e.x,e.y-34,e.lvl?'PRÓXIMA ARMA!':g.n,'#FFC531',e.lvl?22:18)}if(mine){Sound.play('pickup');showRespawnCard(e.g,e.lvl?'ARSENAL':'NOVA ARMA')}break;
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
    case 'kill':addFeed(e);if(e.ki===self&&e.vi!==self&&!demo)toast('Você eliminou '+e.v+'!','good');break;
    case 'gem':if(near&&S.particles!=='low')burst(e.x,e.y,4,['#FF8A1F','#FFC07A','#fff'],'star',120,4,.4);if(mine){Sound.play('gem',(e.n%8));flyGem(e.x,e.y);const tg=store.get('totalGems',0)+1;store.set('totalGems',tg);$('totalGems').textContent=tg}break;
    case 'flagtake':if(!demo){toast(e.name+' pegou a bandeira!',e.pid===self?'good':'');Sound.play('pickup')}break;
    case 'flagret':if(!demo&&MODE.id==='ctf')toast('Bandeira '+(TEAM[e.team]?TEAM[e.team].n:'')+' voltou pra base');break;
    case 'capture':if(!demo){bigBanner('CAPTURA!',`${e.name} pontuou para o time ${TEAM[e.team].n}`,TEAM[e.team].c);Sound.play('capture');celebrate(60)}break;
    case 'vanish':if(near){addP({x:e.x,y:e.y,type:'spiral',col:'#FFC531',size:40,life:.5,vr:7});for(let i=0;i<8;i++)addP({x:e.x+rand(-14,14),y:e.y+rand(-20,14),vy:-30,type:'smoke',col:'#E9E2F7',size:12,life:.6,drag:2});word(e.x,e.y-40,'CARTA!','#FFC531',26)}if(mine)Sound.play('warp');break;
    case 'reappear':if(near){addP({x:e.x,y:e.y,type:'ring',col:'#FFC531',size:70,life:.5});burst(e.x,e.y,12,['#FFC531','#FF4F9A','#45D4FF'],'star',260,7);const pk=perkById(e.perk);if(pk)word(e.x,e.y-48,pk.n,RARITY[pk.r][1],20)}if(mine)Sound.play('spawn');break;
    case 'block':if(near){addP({x:e.x,y:e.y-4,type:'ring',col:'#45D4FF',size:44,life:.4});word(e.x,e.y-44,'BLOQUEADO!','#45D4FF',20)}if(!demo)Sound.play('pop');break;
    case 'zonemove':if(!demo){toast('A lagoa mudou de lugar!');Sound.play('warp')}break;
  }}

// ---------- Desenho do mundo ----------
function worldToScreen(x,y){return[(x-cam.x)*zoom,(y-cam.y)*zoom]}
function drawNameTag(c,p,x,y){if(!S.names&&p.id!==self)return;c.save();c.translate(x,y-52);c.font='800 12px "Baloo 2",sans-serif';c.textAlign='center';c.textBaseline='middle';
  const w=Math.max(44,c.measureText(p.name).width+30),tc=p.team>=0?TEAM[p.team].c:null;c.fillStyle=p.id===self?'#FFC531':tc?shade(tc,-.35):'#12082bcc';rr(c,-w/2,-9,w,18,9);c.fill();c.strokeStyle=INK;c.lineWidth=2;c.stroke();
  hexgon(c,-w/2+2,0,10);c.fillStyle=tc||'#FFC531';c.fill();c.stroke();c.fillStyle=INK;c.font='13px "Lilita One",sans-serif';c.fillText(MODE.id==='gun'?p.gunLvl+1:p.level,-w/2+2,1);
  c.fillStyle=p.id===self?INK:'#FFF4E0';c.font='800 12px "Baloo 2",sans-serif';c.fillText(p.name,7,1);
  c.fillStyle='#12082b';rr(c,-20,11,40,6,3);c.fill();c.fillStyle=p.hp>40?'#6CF06A':'#FF3B47';rr(c,-20,11,40*clamp(p.hp/100,0,1),6,3);c.fill();c.lineWidth=1.5;rr(c,-20,11,40,6,3);c.stroke();c.restore()}
function drawStatus(c,p,ht,t){
  if(ht<p.frozenUntil){c.save();c.globalAlpha=.55;const gr=c.createLinearGradient(-22,-40,22,26);gr.addColorStop(0,'#E9F9FF');gr.addColorStop(1,'#7FD8FF');c.fillStyle=gr;rr(c,-24,-40,48,66,10);c.fill();c.globalAlpha=1;c.strokeStyle='#BFF1FF';c.lineWidth=2.5;c.stroke();
    c.strokeStyle='#ffffffcc';c.lineWidth=3;c.beginPath();c.moveTo(-14,-30);c.lineTo(-6,-36);c.moveTo(-16,-20);c.lineTo(-8,-26);c.stroke();c.restore()}
  if(ht<p.burnUntil){c.save();c.globalCompositeOperation='lighter';for(let i=0;i<3;i++){const fx2=Math.sin(t/90+i*2)*10,fy=-Math.abs(Math.sin(t/120+i))*16;c.fillStyle=i%2?'#FF922E':'#FFE066';c.globalAlpha=.8;c.beginPath();c.ellipse(fx2,-10+fy,5,9,0,0,TAU);c.fill()}c.restore()}
  if(ht<p.slowUntil){c.fillStyle='#F5B014aa';for(const x of [-12,4,14]){c.beginPath();c.ellipse(x,20,6,3,0,0,TAU);c.fill()}}
  if(ht<p.stunUntil&&ht>=p.frozenUntil){for(let i=0;i<3;i++){const a=t/200+i*2.1;c.fillStyle='#FFC531';star(c,Math.cos(a)*16,-40+Math.sin(a)*4,6,2.6,5);c.fill();c.strokeStyle=INK;c.lineWidth=1.2;c.stroke()}}
  if(ht<p.confuseUntil){c.font='22px "Lilita One"';c.fillStyle='#45D4FF';c.strokeStyle=INK;c.lineWidth=4;c.textAlign='center';c.strokeText('?!',0,-42);c.fillText('?!',0,-42)}
  if(ht<p.flashUntil){c.globalCompositeOperation='lighter';c.fillStyle='#FFFFFF66';c.beginPath();c.arc(0,-6,30,0,TAU);c.fill();c.globalCompositeOperation='source-over'}}
function drawWorld(dt,t){const ht=hostNow();
  ctx.setTransform(1,0,0,1,0,0);
  const k=canvas.width/VW;let sx=0,sy=0;if(shakeA>.1&&S.shake){sx=rand(-shakeA,shakeA);sy=rand(-shakeA,shakeA)}shakeA*=Math.exp(-10*dt);
  ctx.setTransform(k,0,0,k,(-cam.x+sx)*k,(-cam.y+sy)*k);
  drawArena(ctx,cam,VW,VH,M,t);
  if(MODE.id==='koth'&&ms.zone&&!demo){const z=ms.zone,o=players[z.owner];drawZone(ctx,z,t,z.contested?'#FF3B47':o?(o.id===self?'#FFC531':'#FF4F9A'):'#FFF4E0')}
  if(MODE.id==='ctf'&&!demo)for(const [i,[bx,by]] of M.bases.entries()){ctx.save();ctx.strokeStyle=TEAM[i].c;ctx.lineWidth=6;ctx.setLineDash([16,12]);ctx.beginPath();ctx.arc(bx,by,80,0,TAU);ctx.stroke();ctx.setLineDash([]);ctx.fillStyle=TEAM[i].c+'22';ctx.fill();ctx.restore()}
  for(const f of fields)if(f.k==='time'||f.k==='hole')drawField(ctx,f,t,ht);
  for(const g of gems)if(nearCam(g.x,g.y,30))drawOrange(ctx,g.x,g.y,t);
  for(const m of meds)if(nearCam(m.x,m.y,30))drawMedkit(ctx,m.x,m.y,t);
  for(const c of crates)if(nearCam(c.x,c.y,30))drawCrate(ctx,c.x,c.y,t);
  const fancy=S.particles!=='low';
  for(const b of bullets){if(!nearCam(b.x,b.y,80))continue;const g=GUNS[b.g];if(fancy&&g&&(g.p==='rocket'||g.p==='rpg'||g.p==='bigrocket'||g.p==='chicken')&&Math.random()<.5)addP({x:b.x,y:b.y,type:'smoke',col:'#E9E2F7',size:g.p==='bigrocket'?12:6,life:.4,drag:2});
    else if(fancy&&g&&g.cat!=='laser'&&g.p!=='flame'&&g.p!=='tracer'&&Math.random()<.3)addP({x:b.x,y:b.y,type:'dot',col:g.col||'#fff',size:3,life:.18});drawProj(ctx,b,t)}
  // paredes + construções + capivaras ordenadas por y
  const draws=[];for(const b of builds)if(nearCam(b.x,b.y,120))draws.push([b.y+(b.h||0)/2,()=>drawBuild(ctx,b,t)]);
  for(const p of Object.values(players)){const tr=track[p.id];if(!p.alive||p.picking||!tr)continue;if(!nearCam(p.rx,p.ry,90))continue;draws.push([p.ry+20,()=>drawPlayer(p,tr,t,ht,fancy)])}
  draws.sort((a,b)=>a[0]-b[0]);
  drawWalls(ctx,M,cam,VW,VH,t);
  for(const [,f] of draws)f();
  for(const f of ms.flags||[]){if(!nearCam(f.x,f.y,60))continue;const col=f.team>=0?TEAM[f.team].c:'#FFC531';if(f.carrier){const c=players[f.carrier];if(c&&c.alive){drawFlag(ctx,c.rx+14,c.ry-22,col,t,true);continue}}drawFlag(ctx,f.x,f.y,col,t,false)}
  for(const f of fields)if(f.k==='meteor'||f.k==='stamp')drawField(ctx,f,t,ht);
  updateParts(dt);drawParts(ctx);
  if(M.theme==='dark'){const L=[];for(const p of Object.values(players))if(p.alive)L.push([p.rx,p.ry,p.id===self?420:260]);for(const b of bullets)L.push([b.x,b.y,70]);for(const g of gems)L.push([g.x,g.y,50]);for(const m of meds)L.push([m.x,m.y,70]);for(const f of ms.flags||[])L.push([f.x,f.y,140]);if(ms.zone)L.push([ms.zone.x,ms.zone.y,340]);for(const p of parts)if(p.type==='boom'||p.type==='flash')L.push([p.x,p.y,p.size*3]);drawDarkness(ctx,M,cam,VW,VH,L)}
  drawCrosshair(t);
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
  if(p.team>=0&&isTeams()){ctx.save();ctx.strokeStyle=TEAM[p.team].c;ctx.lineWidth=4;ctx.beginPath();ctx.ellipse(x,y+22,22,7,0,0,TAU);ctx.stroke();ctx.restore()}
  if(p.id===self){ctx.save();ctx.strokeStyle='#FFC531';ctx.lineWidth=3;ctx.setLineDash([8,6]);ctx.lineDashOffset=-t/40;ctx.beginPath();ctx.ellipse(x,y+22,27,9,0,0,TAU);ctx.stroke();ctx.restore()}
  if(p.dashTime>0&&fancy)addP({x:x+rand(-6,6),y:y+rand(-14,14),vx:-Math.cos(p.aim)*10,type:'dot',col:p.look.trail,size:9,life:.25});
  ctx.save();ctx.translate(x,y);const hurt=ht-p.hurtAt<140,frozen=ht<p.frozenUntil;if(hurt&&!frozen)ctx.translate(rand(-2,2),0);
  if(ht<p.shieldUntil&&Math.floor(t/90)%2)ctx.globalAlpha=.55;
  drawChar(ctx,p.look,{face:p.face,aim:p.aim,t:frozen?0:t+(p.id.charCodeAt(0)||0)*97,mv:frozen?0:p.mv,gun:p.gun,hurt,bot:p.bot,shout:t-tr.shotT<160,swing:tr.swing||0});
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

// ---------- Laço ----------
let lastFrame=0,hudAt=0,mmAt=0,slowT=0;
function frame(t){requestAnimationFrame(frame);
  const minDt=1000/S.fps-1.5;if(t-lastFrame<minDt)return;let dt=Math.min(.05,(t-lastFrame)/1000);
  if(S.dynres&&dt>.026){slowT+=dt;if(slowT>2&&resScale>.55){resScale*=.85;resize();slowT=0}}else slowT=Math.max(0,slowT-dt*.5);
  lastFrame=t;
  const active=demo||started;
  if(demo)step(dt,time());
  else if(host&&started&&!(paused&&solo)){pushInputs();step(dt,time());sync()}
  else if(!host&&started){pushInputs()}
  if(started&&!isTouch&&mouseOn&&view==='game'&&players[self])aimAt(mouseSX,mouseSY);
  if(started&&isTouch&&aimStick.on&&view==='game'&&players[self]){const me=players[self],g=GUNS[me.gun],R=g?Math.max(90,gunReach(g,me.mods||defaultMods())):300,d=g&&g.instant?R*.8:R*.92;mouseSX=((me.rx??me.x)+Math.cos(aimStick.a)*d-cam.x)*zoom;mouseSY=((me.ry??me.y)+Math.sin(aimStick.a)*d-cam.y)*zoom;aimAt(mouseSX,mouseSY)}
  if(!active){ctx.setTransform(1,0,0,1,0,0);ctx.fillStyle='#20164a';ctx.fillRect(0,0,canvas.width,canvas.height);return}
  processEffects(t);
  const sm=Math.min(1,dt*14);
  for(const p of Object.values(players)){let tr=track[p.id];if(!tr){tr=track[p.id]={shot:p.shotAt,dash:p.dashAt,slot:p.slot,shotT:-1e9,swing:0,recoil:0,alive:p.alive}}
    if(host||demo){p.rx=p.x;p.ry=p.y}else{if(Math.hypot(p.x-p.rx,p.y-p.ry)>300||!tr.alive){p.rx=p.x;p.ry=p.y}else{p.rx+=(p.x-p.rx)*sm;p.ry+=(p.y-p.ry)*sm}}
    if(p.shotAt!==tr.shot){tr.shot=p.shotAt;tr.shotT=t;onShot(p,tr)}
    if(p.slot!==tr.slot){tr.slot=p.slot;if(p.id===self){Sound.play('swap');hudGun=-1}}
    if(p.dashAt!==tr.dash){tr.dash=p.dashAt;if(p.dashAt>0&&nearCam(p.x,p.y)){if(p.id===self||!demo)Sound.play('dash');for(let i=0;i<8;i++)addP({x:p.x+rand(-10,10),y:p.y+rand(-12,18),vx:-(p.dx||0)*rand(200,420),vy:-(p.dy||0)*rand(200,420),type:'line',col:p.look.trail,size:4,life:.3,drag:4})}}
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
function drawCrosshair(t){const me=players[self];if((isTouch?!aimStick.on:!mouseOn)||!me||!me.alive||me.picking||demo||!started||over)return;const g=GUNS[me.gun];if(!g)return;const md=me.mods||defaultMods();
  const k=canvas.width/VW;ctx.setTransform(k,0,0,k,-cam.x*k,-cam.y*k);const c=ctx;const px=me.rx,py=me.ry,a=localAim,wx=mouseSX/zoom+cam.x,wy=mouseSY/zoom+cam.y,d=Math.hypot(wx-px,wy-py);
  const col=CATS[g.cat][1],reach=gunReach(g,md),ht=hostNow(),cdp=clamp((ht-me.shotAt)/(g.cd*md.cd),0,1);const ca=Math.cos(a),sa=Math.sin(a);
  c.save();c.lineCap='round';c.lineJoin='round';
  const zone=(x,y,r,cc,dash)=>{c.fillStyle=cc+'22';c.strokeStyle=cc;c.lineWidth=3;if(dash)c.setLineDash([10,8]);c.beginPath();c.arc(x,y,r,0,TAU);c.fill();c.stroke();c.setLineDash([])};
  let rx=wx,ry=wy,inRange=true;
  if(g.melee){const half=Math.acos(clamp(g.arc-.05,-1,1));c.fillStyle=col+'26';c.strokeStyle=col;c.lineWidth=3;c.beginPath();c.moveTo(px,py);c.arc(px,py,reach,a-half,a+half);c.closePath();c.fill();c.stroke();inRange=d<=reach+18}
  else if(g.build){const bd=g.build;let bx=px+ca*(bd.dist+20),by=py+sa*(bd.dist+20);c.setLineDash([8,6]);c.strokeStyle=col;c.lineWidth=3;c.fillStyle=col+'30';
    if(bd.k==='wall'){const vert=Math.abs(ca)>=Math.abs(sa),w=vert?24:112,h=vert?112:24;c.fillRect(bx-w/2,by-h/2,w,h);c.strokeRect(bx-w/2,by-h/2,w,h)}else if(bd.k==='bubble'){c.beginPath();c.arc(px,py,78,0,TAU);c.fill();c.stroke()}else{c.beginPath();c.arc(bx,by,18,0,TAU);c.fill();c.stroke();c.beginPath();c.arc(bx,by,470,0,TAU);c.globalAlpha=.35;c.stroke();c.globalAlpha=1}c.setLineDash([])}
  else if(g.instant){const R2=reach,td=clamp(d,80,R2);rx=px+ca*td;ry=py+sa*td;inRange=d<=R2;c.globalAlpha=.4;c.strokeStyle='#ffffff';c.lineWidth=2;c.setLineDash([4,10]);c.beginPath();c.arc(px,py,R2,0,TAU);c.stroke();c.globalAlpha=1;
    c.beginPath();c.moveTo(px+ca*26,py+sa*26);c.lineTo(rx,ry);c.strokeStyle='#FF3B47aa';c.stroke();c.setLineDash([]);zone(rx,ry,(g.meteor||g.stamp).r,'#FF3B47',true);c.strokeStyle='#FF3B47';c.lineWidth=4;c.beginPath();c.moveTo(rx-10,ry-10);c.lineTo(rx+10,ry+10);c.moveTo(rx+10,ry-10);c.lineTo(rx-10,ry+10);c.stroke()}
  else{const L=Math.min(d,reach),ex=px+ca*reach,ey=py+sa*reach;inRange=d<=reach;
    c.globalAlpha=.55;c.strokeStyle='#ffffff';c.lineWidth=2;c.setLineDash([3,9]);c.beginPath();c.moveTo(px+ca*28,py+sa*28);c.lineTo(px+ca*L,py+sa*L);c.stroke();c.setLineDash([]);c.globalAlpha=1;
    const spr=Math.max(g.spr,(g.n2+md.extra>1&&!g.spr)?.12*(g.n2+md.extra-1):0);
    if(spr>.2){c.fillStyle=col+'1c';c.strokeStyle=col+'aa';c.lineWidth=2;c.beginPath();c.moveTo(px,py);c.arc(px,py,reach,a-spr/2,a+spr/2);c.closePath();c.fill();c.stroke()}
    c.strokeStyle=col;c.lineWidth=4;c.beginPath();c.moveTo(ex-sa*12,ey+ca*12);c.lineTo(ex+sa*12,ey-ca*12);c.stroke();
    const blast=g.boom?g.boom*md.boom:g.timestop?g.timestop.r:g.hole?g.hole.r:g.flashR||0;
    if(blast){const atCursor=!g.fuse&&!g.fric;const bx=atCursor&&inRange?wx:ex,by=atCursor&&inRange?wy:ey;zone(bx,by,blast,g.flashR?'#FFF4B0':g.timestop?'#9FD8FF':g.hole?'#C38BFF':'#FF7A1A',true)}
    if(g.heal){c.strokeStyle='#6CF06A';c.lineWidth=5;c.beginPath();c.moveTo(wx-9,wy);c.lineTo(wx+9,wy);c.moveTo(wx,wy-9);c.lineTo(wx,wy+9);c.stroke()}}
  // retículo
  c.translate(wx,wy);const cc2=inRange?'#FFF4E0':'#8A93A6',R0=15;c.strokeStyle=INK;c.lineWidth=6;for(let i=0;i<4;i++){const q=i*Math.PI/2+Math.PI/4;c.beginPath();c.arc(0,0,R0,q-.45,q+.45);c.stroke()}
  c.strokeStyle=cc2;c.lineWidth=3;for(let i=0;i<4;i++){const q=i*Math.PI/2+Math.PI/4;c.beginPath();c.arc(0,0,R0,q-.45,q+.45);c.stroke()}
  for(let i=0;i<4;i++){const q=i*Math.PI/2;c.strokeStyle=INK;c.lineWidth=5;c.beginPath();c.moveTo(Math.cos(q)*6,Math.sin(q)*6);c.lineTo(Math.cos(q)*11,Math.sin(q)*11);c.stroke();c.strokeStyle=inRange?col:cc2;c.lineWidth=2.4;c.stroke()}
  c.fillStyle=inRange?col:cc2;c.beginPath();c.arc(0,0,2.6,0,TAU);c.fill();c.strokeStyle=INK;c.lineWidth=1.4;c.stroke();
  if(cdp<1){c.strokeStyle='#FFC531';c.lineWidth=3.4;c.beginPath();c.arc(0,0,R0+6,-Math.PI/2,-Math.PI/2+cdp*TAU);c.stroke()}
  c.restore()}
