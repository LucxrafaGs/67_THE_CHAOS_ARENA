// ===== Simulação (autoridade do anfitrião) e rede =====
const MAX_PLAYERS=10,PEER_PREFIX='chaos67-',SWAP_CD=250;
let peer=null,conn=null,clients={},host=false,solo=false,demo=false,room='',self='';
let players={},bullets=[],gems=[],meds=[],crates=[],builds=[],fields=[],effects=[],started=false,over=false,paused=false,matchEnd=0,gid=1,eid=1,clockOff=0;
let cfg=Object.assign({mode:'ffa',map:'praca',bots:5,time:180,diff:'normal'},store.get('cfg',{}));
let ms={teamScore:[0,0],flags:[],zone:null,zoneNext:0,winner:null},votes={};
let M=mapById(cfg.map),MODE=modeById(cfg.mode);
const keys={up:false,down:false,left:false,right:false,fire:false,dash:false,respawn:false,swap:false};
const KEYLIST=Object.keys(keys);
let localAim=0,localAimDist=300;
const hostNow=()=>host||demo?time():time()+clockOff;
const dist=(a,b,x,y)=>Math.hypot(a-x,b-y);
const hitCapy=(p,x,y,r)=>{const dx=(x-p.x)/(19+r),dy=(y-(p.y-5))/(28+r);return dx*dx+dy*dy<1};

function newPlayer(pid,name,look,bot=false){return{id:pid,name:safe(name),look:cleanLook(look),bot,team:-1,x:W/2,y:H/2,hp:100,alive:true,respawnAt:0,canRespawnAt:0,
  level:1,energy:0,kills:0,deaths:0,gemsTotal:0,heals:0,noKills:0,streak:0,best:0,hold:0,caps:0,zone:0,gunLvl:0,carry:-1,guns:[randomGun(-1),-1],slot:0,gun:0,aim:0,ad:300,face:1,mv:0,
  shotAt:0,dashAt:0,dashTime:0,dx:0,dy:0,kx:0,ky:0,stunUntil:0,confuseUntil:0,shieldUntil:0,frozenUntil:0,flashUntil:0,burnUntil:0,burnBy:'',burnG:0,burnAcc:0,slowUntil:0,hurtAt:0,swapAt:0,swapPrev:false,
  keys:{},killer:null,calcFlip:true,mark6:null,maxHp:100,mods:defaultMods(),perks:{},kc:0,fc:0,pending:0,picking:false,offer:null,pickUntil:0,bubbleAt:-1e9,dashHit:null}}
function fx(kind,o,dur=900){const e=Object.assign({id:eid++,kind,end:time()+dur},o);effects.push(e);return e}
const isTeams=()=>!!MODE.teams;
const sameTeam=(a,b)=>a&&b&&isTeams()&&a.team>=0&&a.team===b.team;
const enemiesOf=p=>Object.values(players).filter(q=>q.alive&&!q.picking&&q.id!==p.id&&!sameTeam(p,q));
function nearestEnemy(p,x,y,maxD=1e9){let best=null,bd=maxD;for(const q of enemiesOf(p)){const d=dist(q.x,q.y,x,y);if(d<bd){bd=d;best=q}}return best}

// ---------- Paredes e colisão ----------
function blockRects(){const r=M.walls.slice();for(const b of builds)if(b.k!=='bubble')r.push([b.x-b.w/2,b.y-b.h/2,b.w,b.h,b]);return r}
function inWall(x,y,pad=0,rects=M.walls){for(const [wx,wy,ww,wh] of rects)if(x>wx-pad&&x<wx+ww+pad&&y>wy-pad&&y<wy+wh+pad)return true;return false}
function pushOut(p,r=17){for(const [wx,wy,ww,wh] of blockRects()){const nx=clamp(p.x,wx,wx+ww),ny=clamp(p.y,wy,wy+wh);let dx=p.x-nx,dy=p.y-ny,d=Math.hypot(dx,dy);
  if(d<r){if(d>.01){p.x+=dx/d*(r-d);p.y+=dy/d*(r-d)}else{const l=p.x-wx,rt=wx+ww-p.x,tp=p.y-wy,bt=wy+wh-p.y,m=Math.min(l,rt,tp,bt);if(m===l)p.x=wx-r;else if(m===rt)p.x=wx+ww+r;else if(m===tp)p.y=wy-r;else p.y=wy+wh+r}}}
  p.x=clamp(p.x,20,W-20);p.y=clamp(p.y,20,H-20)}
function lineClear(x1,y1,x2,y2){const d=dist(x1,y1,x2,y2),n=Math.ceil(d/24);for(let i=1;i<n;i++){const k=i/n;if(inWall(x1+(x2-x1)*k,y1+(y2-y1)*k,0))return false}return true}
function freeSpot(team=-1,pad=34){for(let i=0;i<60;i++){let x,y;if(team===0){x=rand(80,W*.26);y=rand(80,H-80)}else if(team===1){x=rand(W*.74,W-80);y=rand(80,H-80)}else{x=rand(60,W-60);y=rand(60,H-60)}
  if(!inWall(x,y,pad,blockRects()))return[x,y]}return[W/2,H/2-200]}
function nudgeFree(x,y){if(!inWall(x,y,20,blockRects()))return[x,y];for(let r=30;r<400;r+=30)for(let a=0;a<TAU;a+=.6){const nx=x+Math.cos(a)*r,ny=y+Math.sin(a)*r;if(nx>30&&nx<W-30&&ny>30&&ny<H-30&&!inWall(nx,ny,20,blockRects()))return[nx,ny]}return freeSpot()}

// ---------- Coletáveis ----------
function spawnPickups(){const ng=MODE.id==='race'?90:60;while(gems.length<ng){const [x,y]=freeSpot(-1,24);gems.push({id:gid++,x:Math.round(x),y:Math.round(y)})}
  const nm=MODE.onehit?0:5;while(meds.length<nm){const [x,y]=freeSpot(-1,30);meds.push({id:gid++,x:Math.round(x),y:Math.round(y),at:0})}
  const nc=MODE.id==='gun'?0:4;while(crates.length<nc){const [x,y]=freeSpot(-1,30);crates.push({id:gid++,x:Math.round(x),y:Math.round(y),at:0})}}

// ---------- Dano e estados ----------
function harm(p,dmg,owner,gi,t,src){if(!p||!p.alive||p.picking||t<p.shieldUntil||dmg<=0)return false;const k=players[owner];if(k&&k.id!==p.id&&sameTeam(k,p))return false;
  if(dmg<900&&k&&k!==p&&k.mods){dmg*=k.mods.dmg;if(k.mods.adren&&k.hp<k.maxHp*.35)dmg*=1.3;if(k.mods.crit&&Math.random()<k.mods.crit){dmg*=2;fx('hit',{x:p.x,y:p.y-44,w:'CRÍTICO!',c:'#FFC531'},500)}}
  if(dmg<900&&p.mods)dmg*=1-Math.min(.6,p.mods.armor);
  if(p.mods&&p.mods.bubble&&k&&k!==p&&t-p.bubbleAt>12000){p.bubbleAt=t;fx('block',{x:p.x,y:p.y},600);return false}
  if(MODE.onehit)dmg=999;p.hp-=dmg;
  if(k&&k!==p&&k.mods&&k.mods.ls&&k.alive)k.hp=Math.min(k.maxHp,k.hp+Math.min(dmg,100)*k.mods.ls);
  if(src!=='thorn'&&k&&k!==p&&p.mods&&p.mods.thorns&&k.alive)harm(k,Math.min(dmg,100)*p.mods.thorns,p.id,gi,t,'thorn');p.hurtAt=t;fx('dmg',{x:p.x,y:p.y-30,v:Math.round(Math.min(dmg,999)),pid:p.id},700);
  if(p.hp<=0){p.hp=0;p.alive=false;p.deaths++;p.streak=0;p.respawnAt=t+3000*(p.mods.quick?.5:1);p.canRespawnAt=t+1500;p.frozenUntil=p.flashUntil=p.burnUntil=0;
    p.killer={id:owner,name:k?k.name:'o caos',gun:gi};dropFlag(p,t);
    if(p.mods.kami){p.mods.kami=0;explode(p.x,p.y,150,65,p.id,gi,t);p.mods.kami=1}
    if(k&&k.id!==p.id){k.kills++;k.streak++;if(k.mods.feast)k.hp=Math.min(k.maxHp,k.hp+30*k.mods.feast);k.kc++;if(k.kc>=KILLS_PER_CARD){k.kc-=KILLS_PER_CARD;grantCard(k,t)}k.best=Math.max(k.best,k.streak);if(GUNS[gi]&&GUNS[gi].txt==='NÃO')k.noKills++;
      if(MODE.id==='tdm'&&k.team>=0)ms.teamScore[k.team]++;
      if(MODE.id==='gun'){k.gunLvl++;if(k.gunLvl>=GUN_SEQ.length){ms.winner=k.id;endMatch()}else{k.guns=[GUN_SEQ[k.gunLvl],-1];k.slot=0;fx('crate',{x:k.x,y:k.y,pid:k.id,g:k.guns[0],lvl:1},900)}}}
    fx('ko',{x:p.x,y:p.y,c:p.look.body,pid:p.id},900);fx('kill',{k:k?k.name:'?',ki:owner,v:p.name,vi:p.id,g:gi,kt:k?k.team:-1,vt:p.team},4000)}
  return true}
function push(p,ang,force){if(p.frozenUntil>time()||(p.mods&&p.mods.heavy))return;p.kx+=Math.cos(ang)*force;p.ky+=Math.sin(ang)*force}
function applyHit(p,g,owner,ang,t){if(!p.alive)return;const o=players[owner];if(sameTeam(o,p))return;const hv=p.mods&&p.mods.heavy?.5:1;if(g.knock)push(p,ang,g.knock);if(g.stun)p.stunUntil=t+g.stun*hv;if(g.confuse)p.confuseUntil=t+g.confuse;
  if(o&&o!==p&&o.mods){if(o.mods.fire){p.burnUntil=t+1500;p.burnBy=owner;p.burnG=g.id}if(o.mods.ice&&Math.random()<.12*o.mods.ice){p.frozenUntil=Math.max(p.frozenUntil,t+800*hv);fx('freeze',{x:p.x,y:p.y},500)}}
  if(g.freeze){p.frozenUntil=Math.max(p.frozenUntil,t+g.freeze*hv);fx('freeze',{x:p.x,y:p.y},500)}if(g.flash)p.flashUntil=t+g.flash;if(g.burn){p.burnUntil=t+g.burn;p.burnBy=owner;p.burnG=g.id}if(g.slow)p.slowUntil=t+g.slow}
function damageBuilds(x,y,R,dmg,owner){for(let i=builds.length-1;i>=0;i--){const b=builds[i];if(dist(b.x,b.y,x,y)<R+Math.max(b.w||b.r||20,b.h||0)/2){b.hp-=dmg;if(b.hp<=0){fx('debris',{x:b.x,y:b.y,k:b.k},600);builds.splice(i,1)}}}}
function explode(x,y,R,dmg,owner,gi,t,gold=false){const o=players[owner];if(o&&o.mods)R*=o.mods.boom;for(const p of Object.values(players)){if(!p.alive||p.picking||p.id===owner||sameTeam(o,p))continue;const d=dist(p.x,p.y,x,y);if(d<R+16){harm(p,dmg*(1-d/(R+16)*.45),owner,gi,t);push(p,Math.atan2(p.y-y,p.x-x),420)}}
  damageBuilds(x,y,R*.8,dmg,owner);fx('boom',{x,y,r:R,gold},700)}
function teleport(p,x,y,t){if(!p||!p.alive)return;fx('warp',{x:p.x,y:p.y},600);[x,y]=nudgeFree(clamp(x,25,W-25),clamp(y,25,H-25));p.x=x;p.y=y;fx('warp',{x:p.x,y:p.y,pid:p.id},600)}

// ---------- Disparo ----------
function curGun(p){return GUNS[p.guns[p.slot]]||GUNS[p.guns[0]]||GUNS[0]}
function addBuild(p,g,x,y,k,t=time()){const mine=builds.filter(b=>b.o===p.id);if(mine.length>=4){builds.splice(builds.indexOf(mine[0]),1)}
  const ang=p.aim,vert=Math.abs(Math.cos(ang))>=Math.abs(Math.sin(ang)),bd=g.build||{k:'box',hp:90,dur:14000};
  const b={id:gid++,k,x:Math.round(x),y:Math.round(y),hp:bd.hp,max:bd.hp,end:t+bd.dur,o:p.id,team:p.team,col:p.team>=0?TEAM[p.team].c:p.look.trail};
  if(k==='wall'){b.w=vert?24:112;b.h=vert?112:24}else if(k==='box'){b.w=b.h=46;b.hp=b.max=90;b.end=t+15000}else if(k==='turret'){b.w=b.h=30;b.aim=ang;b.fireAt=0}else if(k==='bubble'){b.r=78;b.w=b.h=156}
  builds.push(b);fx('build',{x:b.x,y:b.y,k},600)}
function fire(p,t){if(!p.alive||p.picking||t<p.stunUntil||t<p.frozenUntil)return;const g=curGun(p),md=p.mods;if(t-p.shotAt<g.cd*md.cd)return;p.shotAt=t;
  if(g.melee){for(const q of enemiesOf(p)){const dx=q.x-p.x,dy=q.y-p.y,d=Math.hypot(dx,dy);if(d<g.range*md.range+18&&Math.cos(Math.atan2(dy,dx)-p.aim)>g.arc-.05){if(harm(q,g.dmg,p.id,g.id,t)){applyHit(q,g,p.id,Math.atan2(dy,dx),t);fx('hit',{x:q.x,y:q.y,w:g.m==='fish'||g.m==='squeegee'?'SLAP':'WHAM',c:g.col},450)}}}damageBuilds(p.x+Math.cos(p.aim)*40,p.y+Math.sin(p.aim)*40,20,g.dmg,p.id);return}
  if(g.meteor||g.stamp){const f=g.meteor||g.stamp,d=clamp(p.ad||300,80,g.range2*md.range);let x=clamp(p.x+Math.cos(p.aim)*d,30,W-30),y=clamp(p.y+Math.sin(p.aim)*d,30,H-30);fields.push({id:gid++,k:g.meteor?'meteor':'stamp',x,y,r:f.r,start:t,delay:f.delay,end:t+f.delay,o:p.id,g:g.id,dmg:g.dmg});return}
  if(g.build){const d=g.build.dist+20;let x=p.x+Math.cos(p.aim)*d,y=p.y+Math.sin(p.aim)*d;if(g.build.k==='bubble'){x=p.x;y=p.y}addBuild(p,g,clamp(x,30,W-30),clamp(y,30,H-30),g.build.k,t);return}
  if(bullets.length>280)return;
  if(g.mine){const mine=bullets.filter(b=>b.o===p.id&&GUNS[b.g].mine);if(mine.length>=3)bullets.splice(bullets.indexOf(mine[0]),1)}
  const n=g.n2+(g.mine||g.box||g.sticky||g.timestop||g.hole||g.tele?0:md.extra),spr=g.spr||(n>1?.18:0);
  for(let i=0;i<n;i++){const a=p.aim+(n>1&&!g.spr?(i-(n-1)/2)*.12:(Math.random()-.5)*spr),sp=g.sp*md.bspd*(g.fuse?rand(.9,1.05):1);
    const b={id:gid++,o:p.id,g:g.id,x:p.x+Math.cos(a)*12,y:p.y+Math.sin(a)*12+2,vx:Math.cos(a)*sp,vy:Math.sin(a)*sp,r:g.r,life:g.life*md.range/md.bspd,bn:(g.bounce||0)+md.bounce,age:0};if(md.aim&&!g.homing)b.hm=1.6;
    if(g.calc){b.six=p.calcFlip;p.calcFlip=!p.calcFlip}bullets.push(b)}
  if(g.recoil)push(p,p.aim+Math.PI,g.recoil)}

function respawn(p,t){const [x,y]=MODE.id==='ctf'?freeSpot(p.team):freeSpot(isTeams()?p.team:-1);p.x=x;p.y=y;p.hp=p.maxHp;p.alive=true;
  if(MODE.id==='gun'){p.guns=[GUN_SEQ[p.gunLvl],-1]}else if(p.mods.legend){const a=randomGunTop(-1);p.guns=[a,randomGunTop(a)]}else{const a=randomGun(-1,p.level);p.guns=[a,randomGun(a,p.level)]}p.slot=0;
  p.gun=p.guns[0];p.dashAt=0;p.shotAt=t;p.shieldUntil=t+1500;p.kx=p.ky=0;p.stunUntil=p.confuseUntil=p.frozenUntil=p.flashUntil=p.burnUntil=p.slowUntil=0;p.mark6=null;
  fx('spawn',{x:p.x,y:p.y,pid:p.id,g:p.guns[0],g2:p.guns[1]},1300)}

function updateP(p,dt,t){
  if(!p.alive){if(t>=p.respawnAt||(p.keys.respawn&&t>=p.canRespawnAt))respawn(p,t);return}
  if(p.picking){if(t>p.pickUntil&&p.offer)choosePerk(p,pick(p.offer),t);return}
  const md=p.mods;if(md.regen&&p.hp<p.maxHp)p.hp=Math.min(p.maxHp,p.hp+2*md.regen*dt);
  const k=p.keys||{},conf=t<p.confuseUntil?-1:1,frozen=t<p.frozenUntil,stun=t<p.stunUntil||frozen;
  if(((k.swap&&!p.swapPrev)||p.swapReq)&&p.guns[1]>=0&&t-p.swapAt>SWAP_CD&&!frozen){p.slot=1-p.slot;p.swapAt=t;p.shotAt=Math.max(p.shotAt,t-curGun(p).cd+180)}p.swapPrev=!!k.swap;p.swapReq=0;p.gun=p.guns[p.slot];
  let dx=((+!!k.right)-(+!!k.left))*conf,dy=((+!!k.down)-(+!!k.up))*conf;if(stun)dx=dy=0;const len=Math.hypot(dx,dy)||1;dx/=len;dy/=len;
  if(k.dash&&!stun&&t-p.dashAt>2800*md.dashcd){p.dashAt=t;p.dashTime=.19*md.dashlen;p.dashHit={};p.dx=dx||Math.cos(p.aim);p.dy=dy||Math.sin(p.aim)}
  const dashing=p.dashTime>0&&!frozen;p.dashTime=Math.max(0,p.dashTime-dt);
  let sp=dashing?900:215*md.spd*(md.adren&&p.hp<p.maxHp*.35?1.3:1);if(t<p.slowUntil)sp*=.5;if(p.carry>=0)sp*=.88;
  if(!frozen){p.x+=(dashing?p.dx:dx)*sp*dt+p.kx*dt;p.y+=(dashing?p.dy:dy)*sp*dt+p.ky*dt}
  const dec=Math.exp(-6*dt);p.kx*=dec;p.ky*=dec;pushOut(p);
  p.mv=(!frozen&&(dx||dy||dashing))?1:0;p.face=Math.cos(p.aim)>=0?1:-1;
  if(dashing&&md.ram)for(const q of enemiesOf(p)){if(!p.dashHit[q.id]&&dist(q.x,q.y,p.x,p.y)<34){p.dashHit[q.id]=1;harm(q,30*md.ram,p.id,p.gun,t);fx('hit',{x:q.x,y:q.y,w:'ATROPELOU!',c:'#45D4FF'},500)}}
  if(t<p.burnUntil){p.burnAcc+=9*dt;if(p.burnAcc>=4){p.burnAcc=0;harm(p,4,p.burnBy,p.burnG,t)}if(!p.alive)return}
  if(k.fire)fire(p,t);const pr2=26+md.magnet*20;
  if(md.magnet){const R2=200+md.magnet*90;for(const g of gems){const d=dist(g.x,g.y,p.x,p.y);if(d<R2&&d>4){const sp2=(260+md.magnet*120)*dt*(1.4-d/R2);g.x+=(p.x-g.x)/d*Math.min(sp2,d);g.y+=(p.y-g.y)/d*Math.min(sp2,d)}}}
  for(let i=gems.length-1;i>=0;i--){const g=gems[i];if(Math.abs(g.x-p.x)<pr2&&Math.abs(g.y-p.y)<pr2){gems.splice(i,1);p.energy++;p.gemsTotal++;fx('gem',{x:g.x,y:g.y,pid:p.id,n:p.energy},500);
    if(MODE.id==='race'){if(p.energy>=67){ms.winner=p.id;endMatch();return}}
    else if(p.energy>=67){p.energy-=67;p.level++;p.hp=p.maxHp;fx('67',{x:p.x,y:p.y,pid:p.id,lv:p.level},1800)}}}
  for(let i=meds.length-1;i>=0;i--){const m=meds[i];if(p.hp<p.maxHp&&dist(m.x,m.y,p.x,p.y)<30+md.magnet*50){meds.splice(i,1);p.hp=Math.min(p.maxHp,p.hp+(md.nurse?p.maxHp:50));fx('med',{x:m.x,y:m.y,pid:p.id},700)}}
  for(let i=crates.length-1;i>=0;i--){const c=crates[i];if(dist(c.x,c.y,p.x,p.y)<32+md.magnet*50){crates.splice(i,1);const ng=md.legend?randomGunTop(p.guns[p.slot]):randomGun(p.guns[p.slot],p.level,p.guns[1-p.slot]);if(p.guns[1]<0)p.guns[1]=ng;else p.guns[p.slot]=ng;fx('crate',{x:c.x,y:c.y,pid:p.id,g:ng},800)}}}

// ---------- Bandeiras e zona ----------
function dropFlag(p,t){if(p.carry<0)return;const f=ms.flags[p.carry];if(f){f.carrier=null;f.x=p.x;f.y=p.y;f.dropT=t;f.home=false}p.carry=-1}
function returnFlag(f){f.carrier=null;f.x=f.hx;f.y=f.hy;f.home=true;f.dropT=0}
function modeStep(dt,t){const list=Object.values(players);
  if(MODE.id==='hold'||MODE.id==='ctf'){for(const [fi,f] of ms.flags.entries()){
    if(f.carrier){const c=players[f.carrier];if(!c||!c.alive||c.picking){if(c)dropFlag(c,t);else returnFlag(f)}else{f.x=c.x;f.y=c.y;if(MODE.id==='hold'){c.hold+=dt;if(c.hold>=MODE.target){ms.winner=c.id;endMatch();return}}
      if(MODE.id==='ctf'){const base=M.bases[c.team],own=ms.flags[c.team];if(own&&own.home&&dist(c.x,c.y,base[0],base[1])<80){ms.teamScore[c.team]++;c.caps++;returnFlag(f);c.carry=-1;fx('capture',{team:c.team,name:c.name,x:c.x,y:c.y},2500);if(ms.teamScore[c.team]>=MODE.target){ms.winner='t'+c.team;endMatch();return}}}}continue}
    if(!f.home&&f.dropT&&t-f.dropT>(MODE.id==='ctf'?15000:12000)){returnFlag(f);fx('flagret',{x:f.x,y:f.y,team:f.team},900)}
    for(const p of list){if(!p.alive||p.picking||p.carry>=0||dist(p.x,p.y,f.x,f.y)>34)continue;
      if(MODE.id==='ctf'&&p.team===f.team){if(!f.home){returnFlag(f);fx('flagret',{x:f.x,y:f.y,team:f.team,name:p.name},1200)}continue}
      f.carrier=p.id;f.home=false;p.carry=fi;fx('flagtake',{x:f.x,y:f.y,pid:p.id,name:p.name,team:f.team},1500);break}}}
  if(MODE.id==='koth'&&ms.zone){const z=ms.zone,ins=list.filter(p=>p.alive&&!p.picking&&dist(p.x,p.y,z.x,z.y)<z.r);z.owner=ins.length===1?ins[0].id:null;z.contested=ins.length>1;
    if(z.owner){const p=players[z.owner];p.zone+=dt;if(p.zone>=MODE.target){ms.winner=p.id;endMatch();return}}
    if(t>ms.zoneNext){const opts=M.zones.filter(q=>q[0]!==z.x||q[1]!==z.y);const n=pick(opts);z.x=n[0];z.y=n[1];ms.zoneNext=t+40000;fx('zonemove',{x:z.x,y:z.y},1500)}}}

// ---------- Construções, campos e projéteis ----------
function stepBuilds(dt,t){for(let i=builds.length-1;i>=0;i--){const b=builds[i];if(t>b.end){fx('debris',{x:b.x,y:b.y,k:b.k},500);builds.splice(i,1);continue}
  if(b.k==='turret'){const o=players[b.o]||{id:b.o,team:b.team};let best=null,bd=470;for(const q of enemiesOf(o)){const d=dist(q.x,q.y,b.x,b.y);if(d<bd&&lineClear(b.x,b.y,q.x,q.y)){bd=d;best=q}}
    if(best){b.aim=Math.atan2(best.y-b.y,best.x-b.x);if(t-b.fireAt>380){b.fireAt=t;const a=b.aim+(Math.random()-.5)*.08;bullets.push({id:gid++,o:b.o,g:GUNS.findIndex(g=>g.m==='turret'),x:b.x+Math.cos(a)*24,y:b.y+Math.sin(a)*24,vx:Math.cos(a)*800,vy:Math.sin(a)*800,r:4,life:.9,bn:0,age:0,dm:8,tur:1})}}}}}
function stepFields(dt,t){for(let i=fields.length-1;i>=0;i--){const f=fields[i],o=players[f.o]||{id:f.o,team:-1};
  if(f.k==='time'){for(const p of Object.values(players)){if(!p.alive||p.picking||p.id===f.o||sameTeam(o,p))continue;if(dist(p.x,p.y,f.x,f.y)<f.r){p.frozenUntil=Math.max(p.frozenUntil,t+150)}}
    for(const b of bullets){if(b.o!==f.o&&dist(b.x,b.y,f.x,f.y)<f.r){b.frozen=1;b.life+=dt}}}
  if(f.k==='hole'){for(const p of Object.values(players)){if(!p.alive||p.picking||p.id===f.o||sameTeam(o,p))continue;const d=dist(p.x,p.y,f.x,f.y);if(d<f.r&&d>8){const a=Math.atan2(f.y-p.y,f.x-p.x),pull=(1-d/f.r)*420+90;p.x+=Math.cos(a)*pull*dt;p.y+=Math.sin(a)*pull*dt;pushOut(p)}}
    for(const b of bullets){if(b.o!==f.o){const d=dist(b.x,b.y,f.x,f.y);if(d<f.r){b.vx+=(f.x-b.x)*3*dt;b.vy+=(f.y-b.y)*3*dt}}}}
  if(t>=f.end){fields.splice(i,1);
    if(f.k==='hole'){explode(f.x,f.y,130,f.dmg||90,f.o,f.g,t);fx('implode',{x:f.x,y:f.y},800)}
    if(f.k==='meteor'){explode(f.x,f.y,f.r,f.dmg,f.o,f.g,t);fx('meteor',{x:f.x,y:f.y,r:f.r},1000)}
    if(f.k==='stamp'){for(const p of Object.values(players))if(p.alive&&p.id!==f.o&&!sameTeam(o,p)&&dist(p.x,p.y,f.x,f.y)<f.r+16)harm(p,999,f.o,f.g,t);damageBuilds(f.x,f.y,f.r,999,f.o);fx('stamp',{x:f.x,y:f.y,r:f.r},1400)}}}}
function bulletEnd(b,g,t){if(b.done)return;b.done=1;
  if(g.box){addBuild(players[b.o]||{id:b.o,aim:0,team:-1,look:{trail:'#fff'}},g,b.x,b.y,'box',t);return}
  if(g.timestop){fields.push({id:gid++,k:'time',x:b.x,y:b.y,r:g.timestop.r,start:t,end:t+g.timestop.dur,o:b.o,g:g.id});fx('timestop',{x:b.x,y:b.y,r:g.timestop.r},800);return}
  if(g.hole){fields.push({id:gid++,k:'hole',x:b.x,y:b.y,r:g.hole.r,start:t,end:t+g.hole.dur,o:b.o,g:g.id,dmg:g.hole.dmg});return}
  if(g.flashR){const o=players[b.o];for(const p of Object.values(players)){if(!p.alive||p.id===b.o||sameTeam(o,p))continue;const d=dist(p.x,p.y,b.x,b.y);if(d<g.flashR){p.flashUntil=Math.max(p.flashUntil,t+2800*(1-d/g.flashR*.5));if(d<g.flashR*.55&&!b.hitDone)harm(p,g.dmg,b.o,g.id,t)}}fx('flashboom',{x:b.x,y:b.y,r:g.flashR},700);return}
  if(g.boom)explode(b.x,b.y,g.boom,g.dmg,b.o,g.id,t);if(g.tele)teleport(players[b.o],b.x-b.vx*.02,b.y-b.vy*.02,t)}
function hitPlayer(b,g,p,t){const a=Math.atan2(b.vy,b.vx),o=players[b.o];
  if(g.heal){p.hp=Math.min(p.maxHp||100,p.hp+g.heal);if(o)o.heals++;fx('heal',{x:p.x,y:p.y,v:g.heal,pid:p.id},800);return true}
  if(sameTeam(o,p))return false;
  if(g.tele){teleport(o,b.x,b.y,t);b.done=1;return true}
  if(g.sticky){b.stick=p.id;b.vx=b.vy=0;fx('hit',{x:b.x,y:b.y,w:'CUCO!',c:g.col},600);return 'stick'}
  if(g.boom||g.box||g.timestop||g.hole||g.flashR){if(!g.boom&&g.dmg>0){harm(p,g.dmg,b.o,g.id,t);applyHit(p,g,b.o,a,t)}bulletEnd(b,g,t);return true}
  if(g.calc){if(b.six){p.mark6={by:b.o,until:t+2500};harm(p,g.dmg,b.o,g.id,t);fx('hit',{x:b.x,y:b.y,w:'6',c:'#FFC531'},500)}
    else if(p.mark6&&p.mark6.by===b.o&&t<p.mark6.until){p.mark6=null;harm(p,g.dmg,b.o,g.id,t);explode(p.x,p.y,120,70,b.o,g.id,t,true);fx('hit',{x:p.x,y:p.y-30,w:'67!',c:'#FFC531'},900)}
    else{harm(p,g.dmg,b.o,g.id,t);fx('hit',{x:b.x,y:b.y,w:'7',c:'#FFC531'},500)}return true}
  const dmg=b.dm||g.dmg;harm(p,dmg,b.o,g.id,t);applyHit(p,g,b.o,a,t);
  if(g.chain){const hitIds=[p.id],pts=[[p.x,p.y]];let cur=p;for(let i=0;i<g.chain;i++){let nx=null,nd=210;for(const q of enemiesOf(o||{id:b.o,team:-1})){if(hitIds.includes(q.id))continue;const d=dist(q.x,q.y,cur.x,cur.y);if(d<nd){nd=d;nx=q}}if(!nx)break;hitIds.push(nx.id);pts.push([nx.x,nx.y]);harm(nx,dmg*.6,b.o,g.id,t);cur=nx}if(pts.length>1)fx('chain',{pts},400)}
  const w=g.txt==='NÃO'?'NÃO!':(dmg>=15||Math.random()<.25)?({pistol:'POW',smg:'TAC',rifle:'PÁ',shotgun:'BLAM',heavy:'KABUM',laser:'ZAP',throw:'TING',explosive:'BUM',special:'BOING',melee:'WHAM'}[g.cat]||'POW'):'';
  if(!b.tur)fx('hit',{x:b.x,y:b.y,w,c:g.col,s:dmg>=30?1:0},420);return true}
function stepBullets(dt,t){const rects=blockRects();for(let i=bullets.length-1;i>=0;i--){const b=bullets[i],g=GUNS[b.g]||GUNS[0];if(b.frozen){b.frozen=0;continue}b.age+=dt;b.life-=dt;let dead=false;
  if(b.stick){const sp=players[b.stick];if(sp&&sp.alive){b.x=sp.x;b.y=sp.y-4}else b.stick=null}
  const hm=g.homing||b.hm;if(hm&&b.age>.12&&!b.stick){const q=nearestEnemy(players[b.o]||{id:b.o,team:-1},b.x,b.y,560);if(q){const cur=Math.atan2(b.vy,b.vx),want=Math.atan2(q.y-b.y,q.x-b.x);let d=Math.atan2(Math.sin(want-cur),Math.cos(want-cur));const na=cur+clamp(d,-hm*dt,hm*dt),sp=Math.hypot(b.vx,b.vy);b.vx=Math.cos(na)*sp;b.vy=Math.sin(na)*sp}}
  if(g.boomer&&b.age>g.life*.45){const o=players[b.o];if(o){const a=Math.atan2(o.y-b.y,o.x-b.x),sp=Math.hypot(b.vx,b.vy);b.vx=lerp(b.vx,Math.cos(a)*sp,.12);b.vy=lerp(b.vy,Math.sin(a)*sp,.12);if(dist(o.x,o.y,b.x,b.y)<22&&b.age>g.life*.55)dead=true}}
  if(g.portal&&!b.warped&&b.age>.16){const o=players[b.o],q=o&&nearestEnemy(o,b.x,b.y,900);if(q){const a=Math.atan2(q.y-o.y,q.x-o.x);fx('warp',{x:b.x,y:b.y},500);const [nx,ny]=nudgeFree(q.x+Math.cos(a)*85,q.y+Math.sin(a)*85);b.x=nx;b.y=ny;const sp=Math.hypot(b.vx,b.vy),a2=Math.atan2(q.y-ny,q.x-nx);b.vx=Math.cos(a2)*sp;b.vy=Math.sin(a2)*sp;b.warped=1;fx('warp',{x:b.x,y:b.y},500)}}
  if(g.fric&&!b.stick){const d=Math.exp(-g.fric*1.6*dt);b.vx*=d;b.vy*=d}
  if(g.mine&&b.age>.6){const o=players[b.o]||{id:b.o,team:-1};if(nearestEnemy(o,b.x,b.y,42)){bulletEnd(b,g,t);bullets.splice(i,1);continue}}
  const sp=Math.hypot(b.vx,b.vy),steps=b.stick?1:Math.max(1,Math.ceil(sp*dt/14));
  for(let s=0;s<steps&&!dead;s++){if(!b.stick){b.x+=b.vx*dt/steps;b.y+=b.vy*dt/steps}
    // paredes / bordas
    let wall=null;if(b.x<0||b.x>W||b.y<0||b.y>H)wall='edge';else if(!g.tele)for(const r of rects){if(b.x>r[0]&&b.x<r[0]+r[2]&&b.y>r[1]&&b.y<r[1]+r[3]){wall=r;break}}
    if(wall){if(wall!=='edge'&&wall[4]){const bb=wall[4];if(!(bb.o===b.o&&bb.k==='turret')){bb.hp-=(b.dm||g.dmg||5);if(bb.hp<=0){fx('debris',{x:bb.x,y:bb.y,k:bb.k},600);builds.splice(builds.indexOf(bb),1)}}}
      if(b.bn>0||g.fuse||g.mine){const px=b.x-b.vx*dt/steps,py=b.y-b.vy*dt/steps;const inX=wall==='edge'?(b.x<0||b.x>W):!(px>wall[0]&&px<wall[0]+wall[2]);if(inX)b.vx*=-1;else b.vy*=-1;b.x=clamp(px,1,W-1);b.y=clamp(py,1,H-1);if(!g.fuse&&!g.mine)b.bn--;if(g.fuse&&g.bounce){b.bn--;if(b.bn<0)dead=true}}
      else{b.x-=b.vx*dt/steps*.5;b.y-=b.vy*dt/steps*.5;dead=true;if(!g.boom&&!g.box&&!g.timestop&&!g.hole&&!g.tele)fx('spark',{x:b.x,y:b.y,c:g.col},250)}break}
    // bolhas escudo
    for(const bb of builds){if(bb.k!=='bubble'||bb.o===b.o||(isTeams()&&players[b.o]&&bb.team===players[b.o].team))continue;if(dist(b.x,b.y,bb.x,bb.y)<bb.r){bb.hp-=(b.dm||g.dmg||5);fx('spark',{x:b.x,y:b.y,c:'#45D4FF'},250);if(bb.hp<=0){fx('debris',{x:bb.x,y:bb.y,k:'bubble'},600);builds.splice(builds.indexOf(bb),1)}dead=true;break}}
    if(dead||b.stick||g.mine)break;
    for(const p of Object.values(players)){if(p.id===b.o||!p.alive||p.picking||Math.abs(p.x-b.x)>60||Math.abs(p.y-b.y)>70||!hitCapy(p,b.x,b.y,b.r))continue;
      if(g.boomer||g.pierce){b.hits=b.hits||{};if(b.hits[p.id]&&t-b.hits[p.id]<400)continue;b.hits[p.id]=t;if(sameTeam(players[b.o],p))continue;harm(p,g.dmg,b.o,g.id,t);applyHit(p,g,b.o,Math.atan2(b.vy,b.vx),t);fx('hit',{x:b.x,y:b.y,w:g.pierce?'PÁ':'TING',c:g.col},400);continue}
      const r=hitPlayer(b,g,p,t);if(r==='stick')break;if(r){dead=true;b.done=b.done||(!g.boom&&!g.box&&!g.timestop&&!g.hole&&!g.flashR);break}}}
  if(!dead&&b.life<=0)dead=true;
  if(dead){bulletEnd(b,g,t);bullets.splice(i,1)}}}

// ---------- Bots ----------
const BOTCFG={easy:{jit:.8,range:230,dash:.002,react:.6,fire:.55,spd:.82,dmg:.75},normal:{jit:.2,range:380,dash:.008,react:.22},chaos:{jit:.06,range:480,dash:.02,react:.08}};
function bots(dt,t){const cfgB=BOTCFG[cfg.diff]||BOTCFG.normal;for(const p of Object.values(players)){if(!p.bot)continue;const k=p.keys;
  if(!p.alive){k.respawn=true;continue}k.respawn=false;k.swap=false;p._think=(p._think||0)-dt;const g=curGun(p);
  const foe=nearestEnemy(p,p.x,p.y,1000),fd=foe?dist(foe.x,foe.y,p.x,p.y):1e9,see=foe&&fd<900&&lineClear(p.x,p.y,foe.x,foe.y);
  if(p._think<=0){p._think=cfgB.react*rand(.7,1.3);p._fireRoll=Math.random()<(cfgB.fire||1);
    let tx=null,ty=null;const near=(arr)=>{let b=null,bd=1e9;for(const o of arr){const d=dist(o.x,o.y,p.x,p.y);if(d<bd&&!inWall(o.x,o.y,0)){bd=d;b=o}}return b};
    const gm=near(gems);if(gm){tx=gm.x;ty=gm.y}
    if(p.hp<55){const md=near(meds);if(md){tx=md.x;ty=md.y}}
    const cr=near(crates);if(cr&&dist(cr.x,cr.y,p.x,p.y)<300){tx=cr.x;ty=cr.y}
    if(foe&&fd<1000&&fd>240&&p.hp>40&&(MODE.id==='tdm'||((MODE.id==='ffa'||MODE.id==='onehit'||MODE.id==='gun')&&(p._agg??(p._agg=Math.random()<.6))))){tx=foe.x;ty=foe.y}
    if(MODE.id==='hold'&&ms.flags[0]){const f=ms.flags[0];if(f.carrier===p.id){if(foe){tx=p.x-(foe.x-p.x);ty=p.y-(foe.y-p.y)}}else{tx=f.x;ty=f.y}}
    if(MODE.id==='ctf'&&p.team>=0){const enemyF=ms.flags[1-p.team],own=ms.flags[p.team],base=M.bases[p.team],defender=(p.id.charCodeAt(p.id.length-1)%3)===0;
      if(p.carry>=0){tx=base[0];ty=base[1]}else if(own&&!own.home){tx=own.x;ty=own.y}else if(defender){tx=base[0]+rand(-120,120);ty=base[1]+rand(-120,120)}else if(enemyF){tx=enemyF.x;ty=enemyF.y}}
    if(MODE.id==='koth'&&ms.zone){tx=ms.zone.x+rand(-60,60);ty=ms.zone.y+rand(-60,60)}
    if(foe&&see){if(g.melee&&fd<520){tx=foe.x;ty=foe.y}else if(fd<170&&!g.melee&&MODE.id!=='hold'&&MODE.id!=='koth'){tx=p.x-(foe.x-p.x);ty=p.y-(foe.y-p.y)}
      p._aim=Math.atan2(foe.y-p.y,foe.x-p.x)+(Math.random()-.5)*cfgB.jit*2;p.ad=fd}
    // preso numa parede? desvia
    if(p._lx!=null&&dist(p._lx,p._ly,p.x,p.y)<6&&p.mv)p._detour=t+700;p._lx=p.x;p._ly=p.y;
    if(tx!=null){let a=Math.atan2(ty-p.y,tx-p.x);if(t<(p._detour||0))a+=(p.id.length%2?1:-1)*Math.PI/2;const d=dist(tx,ty,p.x,p.y);if(d>14){k.left=Math.cos(a)<-.38;k.right=Math.cos(a)>.38;k.up=Math.sin(a)<-.38;k.down=Math.sin(a)>.38}else k.left=k.right=k.up=k.down=false}
    const other=GUNS[p.guns[1-p.slot]];if(other&&(g.heal||g.tele||(g.build&&Math.random()<.5))&&!other.heal)k.swap=true;
    if(foe&&see&&other&&!g.melee&&fd<120&&other.melee)k.swap=true}
  if(p._aim!=null)p.aim=p._aim;
  const range=g.melee?g.range+30:g.instant?(g.range2||300):cfgB.range;
  k.fire=!!foe&&see&&fd<range&&!g.heal&&!g.tele&&p._fireRoll!==false;if(g.build&&!(foe&&fd<380))k.fire=false;if(g.tele&&Math.random()<.004)k.fire=true;
  k.dash=Math.random()<cfgB.dash}}

function step(dt,t){bots(dt,t);for(const p of Object.values(players))updateP(p,dt,t);if(over&&!demo)return;stepBuilds(dt,t);stepFields(dt,t);stepBullets(dt,t);if(!demo)modeStep(dt,t);
  for(const arr of [meds,crates])for(const o of arr)if(o.at&&t>o.at)o.at=0;spawnPickups();effects=effects.filter(e=>e.end>t);
  if(host&&started&&!over&&t>=matchEnd)endMatch()}

// ---------- Partida ----------
function setupMode(){MODE=modeById(cfg.mode);M=mapById(cfg.map);store.set('cfg',cfg)}
function fillBots(){for(const k of Object.keys(players))if(players[k].bot)delete players[k];const humans=Object.keys(players).length,n=clamp(cfg.bots,0,MAX_PLAYERS-humans);
  const bc=BOTCFG[cfg.diff]||BOTCFG.normal;for(let i=0;i<n;i++){const b=players['bot'+i]=newPlayer('bot'+i,BOT_NAMES[i],randomLook(),true);b.baseSpd=bc.spd||1;b.baseDmg=bc.dmg||1}}
function startMatch(){if(!host)return;setupMode();fillBots();started=true;over=false;paused=false;votes={};const t=time();matchEnd=t+cfg.time*1000;bullets=[];effects=[];gems=[];meds=[];crates=[];builds=[];fields=[];
  ms={teamScore:[0,0],flags:[],zone:null,zoneNext:t+40000,winner:null};
  const ids=Object.keys(players).sort(()=>Math.random()-.5);ids.forEach((id,i)=>{const p=players[id];resetStats(p);p.team=isTeams()?i%2:-1});
  if(MODE.id==='hold')ms.flags=[{team:-1,x:W/2,y:H/2,hx:W/2,hy:H/2,carrier:null,home:true,dropT:0}];
  if(MODE.id==='ctf')ms.flags=M.bases.map(([x,y],i)=>({team:i,x,y,hx:x,hy:y,carrier:null,home:true,dropT:0}));
  if(MODE.id==='koth'){const z=M.zones[0];ms.zone={x:z[0],y:z[1],r:160,owner:null}}
  for(const p of Object.values(players)){respawn(p,t);effects.pop();p.shieldUntil=t+1500;fx('spawn',{x:p.x,y:p.y,pid:p.id,g:p.guns[0],g2:p.guns[1],first:1},1300)}
  spawnPickups();sync(true);onMatchStart()}
function resetStats(p){const md0=defaultMods();if(p.baseSpd){md0.spd=p.baseSpd;md0.dmg=p.baseDmg}Object.assign(p,{maxHp:100,mods:md0,perks:{},kc:0,fc:0,pending:0,picking:false,offer:null,pickUntil:0,bubbleAt:-1e9,hp:100,alive:true,level:1,energy:0,kills:0,deaths:0,gemsTotal:0,heals:0,noKills:0,streak:0,best:0,hold:0,caps:0,zone:0,gunLvl:0,carry:-1,killer:null,kx:0,ky:0,dashAt:0,shotAt:0})}
function scoreOf(p){switch(MODE.score){case 'hold':return p.hold;case 'caps':return p.caps*1000+p.kills;case 'zone':return p.zone;case 'gun':return p.gunLvl*1000+p.kills;case 'gems':return p.energy;default:return p.kills*1000+p.level*67+p.energy}}
const rank=()=>Object.values(players).sort((a,b)=>scoreOf(b)-scoreOf(a)||b.kills-a.kills||a.deaths-b.deaths);
function teamWinner(){if(!isTeams())return -1;if(typeof ms.winner==='string'&&ms.winner[0]==='t')return +ms.winner[1];const [a,b]=ms.teamScore;return a>b?0:b>a?1:-2}
function endMatch(){if(over)return;over=true;votes={};sync(true);onMatchEnd()}
function nextMatch(mode,map){cfg.mode=mode||cfg.mode;cfg.map=map||cfg.map;startMatch()}
function backToLobby(){started=false;over=false;bullets=[];effects=[];builds=[];fields=[];for(const k of Object.keys(players))if(players[k].bot)delete players[k];sync(true)}
function topVote(){const c={};for(const v of Object.values(votes))c[v]=(c[v]||0)+1;let best=null,bn=0;for(const [m,n] of Object.entries(c))if(n>bn){bn=n;best=m}return best}
function startBots(){leaveNet();demo=false;host=true;solo=true;room='OFFLINE';self='me';players={};players[self]=newPlayer(self,store.get('nick','')||'Você',myLook);startMatch()}
function startDemo(){if(host||conn)return;demo=true;solo=false;self='';MODE=modeById('ffa');M=MAPS[Math.floor(Math.random()*MAPS.length)];players={};bullets=[];effects=[];gems=[];meds=[];crates=[];builds=[];fields=[];
  for(let i=0;i<6;i++){const p=players['d'+i]=newPlayer('d'+i,BOT_NAMES[i],randomLook(),true);const [x,y]=freeSpot();p.x=x;p.y=y;p.guns=[randomGun(-1),randomGun(-1)]}spawnPickups();started=false}
function stopDemo(){demo=false;players={};bullets=[];effects=[];gems=[];meds=[];crates=[];builds=[];fields=[]}

// ---------- Rede (PeerJS, anfitrião autoritativo) ----------
let netAt=0;
const packP=p=>({id:p.id,name:p.name,look:p.look,bot:p.bot,team:p.team,x:Math.round(p.x),y:Math.round(p.y),hp:Math.round(p.hp),alive:p.alive,respawnAt:p.respawnAt,canRespawnAt:p.canRespawnAt,level:p.level,energy:p.energy,kills:p.kills,deaths:p.deaths,gemsTotal:p.gemsTotal,heals:p.heals,noKills:p.noKills,best:p.best,
  hold:+p.hold.toFixed(1),caps:p.caps,zone:+p.zone.toFixed(1),gunLvl:p.gunLvl,carry:p.carry,guns:p.guns,slot:p.slot,aim:+p.aim.toFixed(2),face:p.face,mv:p.mv,shotAt:p.shotAt,dashAt:p.dashAt,dashTime:p.dashTime,dx:+p.dx.toFixed(2),dy:+p.dy.toFixed(2),
  stunUntil:p.stunUntil,confuseUntil:p.confuseUntil,shieldUntil:p.shieldUntil,frozenUntil:p.frozenUntil,flashUntil:p.flashUntil,maxHp:p.maxHp,mods:p.mods,perks:p.perks,kc:p.kc,fc:p.fc,picking:p.picking,offer:p.offer,pickUntil:p.pickUntil,bubbleAt:p.bubbleAt,burnUntil:p.burnUntil,slowUntil:p.slowUntil,hurtAt:p.hurtAt,killer:p.killer});
function snapshot(){const P={};for(const k in players)P[k]=packP(players[k]);return{type:'s',ht:time(),P,B:bullets.map(b=>({id:b.id,g:b.g,x:Math.round(b.x),y:Math.round(b.y),vx:Math.round(b.vx),vy:Math.round(b.vy),r:b.r,life:+b.life.toFixed(2),six:b.six,stick:b.stick})),
  G:gems,MD:meds,CR:crates,BU:builds,FI:fields,E:effects,st:started,ov:over,me:matchEnd,cfg,ms,votes}}
function send(c,d){try{if(c&&c.open)c.send(d)}catch(e){}}
function sync(force){if(!host||solo)return;const t=time();if(!force&&t-netAt<66)return;netAt=t;const s=snapshot();for(const c of Object.values(clients))send(c,s)}
function filterKeys(k){const o={};for(const s of KEYLIST)o[s]=!!(k&&k[s]===true);return o}
function setNet(msg,kind=''){const el=$('netStatus');el.className='statusline '+kind;el.querySelector('.txt').textContent=msg}
function hostRoom(){if(typeof Peer==='undefined'){setNet('Não deu para carregar o módulo online. Verifique a internet.','err');return}
  stopDemo();leaveNet();host=true;solo=false;room=roomId();setNet('Criando sala no servidor do caos…','busy');
  peer=new Peer(PEER_PREFIX+room);
  peer.on('open',()=>{self=peer.id;players={};players[self]=newPlayer(self,myNick(),myLook);started=false;over=false;setNet('Sala criada!','ok');go('lobby');renderLobby()});
  peer.on('connection',c=>{c.on('data',d=>hostMessage(c,d));c.on('close',()=>{delete clients[c.peer];delete votes[c.peer];if(players[c.peer]){toast(players[c.peer].name+' saiu da sala');dropFlag(players[c.peer],time());delete players[c.peer]}sync(true);renderLobby()});c.on('error',()=>{})});
  peer.on('error',e=>{setNet('Erro: '+(e.type||'desconhecido')+'. Tente de novo.','err');if(view==='lobby')toast('Conexão perdida','bad')})}
function joinRoom(code){if(typeof Peer==='undefined'){setNet('Não deu para carregar o módulo online. Verifique a internet.','err');return}
  code=(code||'').toUpperCase().replace(/[^A-Z0-9]/g,'');if(code.length!==6){setNet('O código tem 6 letras ou números.','err');return}
  stopDemo();leaveNet();host=false;solo=false;room=code;setNet('Procurando a sala '+code+'…','busy');
  peer=new Peer();
  peer.on('open',pid=>{self=pid;conn=peer.connect(PEER_PREFIX+code,{reliable:true});const to=setTimeout(()=>{if(!conn||!conn.open){setNet('Sala não encontrada. Será que ela foi pegar um lanche?','err');leaveNet(true)}},9000);
    conn.on('open',()=>{clearTimeout(to);send(conn,{type:'join',name:myNick(),look:myLook})});
    conn.on('data',clientMessage);
    conn.on('close',()=>{if(conn){toast('O anfitrião fechou a sala','bad');leaveNet();goHome()}});conn.on('error',()=>setNet('A conexão falhou.','err'))});
  peer.on('error',e=>{setNet(e.type==='peer-unavailable'?'Sala não encontrada. Será que ela foi pegar um lanche?':'Erro de conexão: '+e.type,'err')})}
function hostMessage(c,d){if(!d||typeof d!=='object')return;
  if(d.type==='join'){const humans=Object.values(players).filter(p=>!p.bot).length;if((started&&!over)||humans>=MAX_PLAYERS){send(c,{type:'reject',reason:started?'A partida já começou. Espere a próxima!':'Sala cheia (10/10).'});return}
    clients[c.peer]=c;players[c.peer]=newPlayer(c.peer,d.name,d.look);send(c,{type:'welcome',id:c.peer,room});toast(players[c.peer].name+' entrou!','good');Sound.play('boing');sync(true);renderLobby()}
  if(d.type==='i'&&players[c.peer]){players[c.peer].keys=filterKeys(d.k);if(Number.isFinite(d.a))players[c.peer].aim=d.a;if(Number.isFinite(d.d))players[c.peer].ad=d.d}
  if(d.type==='swap'&&players[c.peer])players[c.peer].swapReq=1;
  if(d.type==='perk'&&players[c.peer])choosePerk(players[c.peer],d.id,time());
  if(d.type==='look'&&players[c.peer]&&!started){players[c.peer].look=cleanLook(d.look);sync(true);renderLobby()}
  if(d.type==='vote'&&players[c.peer]&&MODES.some(m=>m.id===d.mode)){votes[c.peer]=d.mode;sync(true);if(view==='result')renderVotes()}}
let lastState=null;
function clientMessage(d){if(!d||typeof d!=='object')return;
  if(d.type==='reject'){setNet(d.reason,'err');leaveNet(true);return}
  if(d.type==='welcome'){self=d.id;room=d.room;setNet('Conectado!','ok');go('lobby');return}
  if(d.type==='s'){const off=d.ht-time();clockOff=lastState?lerp(clockOff,off,Math.abs(off-clockOff)>500?1:.1):off;lastState=d;
    const old=players;players={};for(const k in d.P){const n=d.P[k],o=old[k];n.rx=o?o.rx:n.x;n.ry=o?o.ry:n.y;n.keys={};n.gun=n.guns[n.slot];players[k]=n}
    bullets=d.B||[];gems=d.G||[];meds=d.MD||[];crates=d.CR||[];builds=d.BU||[];fields=d.FI||[];effects=d.E||[];matchEnd=d.me;ms=d.ms||ms;votes=d.votes||{};
    if(d.cfg&&(d.cfg.mode!==cfg.mode||d.cfg.map!==cfg.map||!started)){Object.assign(cfg,d.cfg);MODE=modeById(cfg.mode);M=mapById(cfg.map)}else if(d.cfg)Object.assign(cfg,d.cfg);
    const wasStarted=started,wasOver=over;started=!!d.st;over=!!d.ov;
    if(started&&(!wasStarted||(wasOver&&!over)))onMatchStart();if(!started&&wasStarted)go('lobby');if(over&&!wasOver)onMatchEnd();if(view==='lobby')renderLobby();if(view==='result')renderVotes()}}
let lastInput=0;
function pushInputs(force){const me=players[self];if(host||demo){if(me){me.keys=filterKeys(keys);me.aim=localAim;me.ad=localAimDist}}else if(conn&&(force||time()-lastInput>45)){send(conn,{type:'i',k:filterKeys(keys),a:+localAim.toFixed(3),d:Math.round(localAimDist)});lastInput=time()}}
function leaveNet(keepStatus){try{if(conn){const c=conn;conn=null;c.close()}}catch(e){}try{if(peer){peer.destroy()}}catch(e){}peer=null;conn=null;clients={};lastState=null;
  if(!keepStatus){host=false;solo=false;started=false;over=false;paused=false}}

// ---------- Cartas de power-up ----------
function pickPerks(p,n=3){let pool=PERKS.filter(k=>!(k.u&&p.perks[k.id]));const out=[];while(out.length<n&&pool.length){const tot=pool.reduce((s,k)=>s+RARITY[k.r][2],0);let r=Math.random()*tot;let ch=pool[pool.length-1];for(const k of pool){r-=RARITY[k.r][2];if(r<=0){ch=k;break}}out.push(ch.id);pool=pool.filter(k=>k!==ch)}return out}
function grantCard(p,t){if(over)return;p.pending++;if(!p.picking)offerCard(p,t)}
function offerCard(p,t){p.offer=pickPerks(p,3);if(p.bot||demo){applyPerk(p,pick(p.offer),t);p.offer=null;p.pending=Math.max(0,p.pending-1);if(p.pending>0)offerCard(p,t);return}
  p.picking=true;p.pickUntil=t+12000;p.keys={};dropFlag(p,t);fx('vanish',{x:p.x,y:p.y,pid:p.id},700)}
function choosePerk(p,id,t){if(!p||!p.picking||!p.offer||!p.offer.includes(id))return;applyPerk(p,id,t);p.picking=false;p.offer=null;p.pending=Math.max(0,p.pending-1);p.shieldUntil=Math.max(p.shieldUntil,t+1200);
  pushOut(p);fx('reappear',{x:p.x,y:p.y,pid:p.id,perk:id},900);if(p.pending>0)offerCard(p,t)}
function applyPerk(p,id,t){p.perks[id]=(p.perks[id]||0)+1;const m=p.mods;switch(id){
  case 'vida':p.maxHp+=25;p.hp=p.maxHp;break;case 'forca':m.dmg*=1.15;break;case 'gatilho':m.cd*=.85;break;case 'patas':m.spd*=1.12;break;case 'dashcd':m.dashcd*=.65;break;case 'superdash':m.dashlen*=1.4;break;
  case 'regen':m.regen++;break;case 'vampiro':m.ls+=.15;break;case 'casca':m.armor+=.15;break;case 'balas':m.bspd*=1.25;break;case 'alcance':m.range*=1.25;break;case 'duplo':m.extra++;break;case 'explosao':m.boom*=1.35;break;
  case 'lendario':m.legend=1;break;case 'presente':if(MODE.id!=='gun'){p.guns[p.slot]=randomGunTop(p.guns[p.slot]);p.gun=p.guns[p.slot]}break;case 'bolha':m.bubble=1;break;case 'espinhos':m.thorns+=.25;break;case 'chumbo':m.heavy=1;break;
  case 'ima':m.magnet++;break;case 'banquete':m.feast++;break;case 'enfermeira':m.nurse=1;break;case 'volta':m.quick=1;break;case 'sorte':m.crit+=.15;break;case 'fogo':m.fire=1;break;case 'gelo':m.ice++;break;
  case 'mira':m.aim=1;break;case 'ricochete':m.bounce++;break;case 'adrenalina':m.adren=1;break;case 'kamikaze':m.kami=1;break;case 'atropelo':m.ram=1;break}}
