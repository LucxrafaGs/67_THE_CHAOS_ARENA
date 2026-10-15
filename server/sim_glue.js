// ===== Cola do servidor: roda DENTRO de createSim(), junto com a simulação original =====
// Cada sala ganha sua própria cópia de todas as variáveis do jogo (players, bullets, cfg...).
host=true;solo=false;demo=false;self='';
let netAt=0,out=()=>{},ownerId=null,info={code:'',name:'',vis:'public',locked:false};
const SNAP_MS=50;
// Snapshot enxuto: dados que quase não mudam (visual, poderes, frutas) só vão quando mudam ou num "quadro-chave";
// efeitos vão só os novos. O WebSocket é confiável e ordenado, então o cliente sempre consegue remontar o estado completo.
const STATIC=['name','look','bot','mods','perks','maxHp','offer','killer'];
let snapN=0,lastSE=0,sentStatic={},sentG='',sentMD='',sentCR='';
const rnd=(k,v)=>typeof v==='number'&&!Number.isInteger(v)?(Math.abs(v)>=1000?Math.round(v):Math.round(v*100)/100):v;
function sync(force){const t=time();if(!force&&t-netAt<SNAP_MS)return;netAt=t;const s=snapshot();s.owner=ownerId;s.info=info;
  const key=force||++snapN%40===0;s.k=key?1:0;
  for(const id in s.P){const p=s.P[id],st=JSON.stringify(STATIC.map(f=>p[f]));if(!key&&sentStatic[id]===st)for(const f of STATIC)delete p[f];sentStatic[id]=st}
  for(const id in sentStatic)if(!s.P[id])delete sentStatic[id];
  const g=JSON.stringify(s.G),m=JSON.stringify(s.MD),c=JSON.stringify(s.CR);
  if(!key&&g===sentG)delete s.G;if(!key&&m===sentMD)delete s.MD;if(!key&&c===sentCR)delete s.CR;sentG=g;sentMD=m;sentCR=c;
  s.E=s.E.filter(e=>e.id>lastSE);if(s.E.length)lastSE=Math.max(...s.E.map(e=>e.id));
  out(JSON.stringify(s,rnd))}
function onMatchStart(){}
function onMatchEnd(){}
const TIMES=[120,180,300];
function cleanCfg(c){const o={};if(!c||typeof c!=='object')return o;
  if(MODES.some(m=>m.id===c.mode))o.mode=c.mode;if(MAPS.some(m=>m.id===c.map))o.map=c.map;
  if(Number.isFinite(c.bots))o.bots=clamp(Math.round(c.bots),0,MAX_PLAYERS-1);if(TIMES.includes(c.time))o.time=c.time;if(BOTCFG[c.diff])o.diff=c.diff;return o}
function humansList(){return Object.values(players).filter(p=>!p.bot)}
function addPlayer(id,name,look){const p=newPlayer(id,name,look);players[id]=p;
  if(started){const all=Object.values(players);if(all.length>MAX_PLAYERS){const b=all.find(q=>q.bot);if(b){dropFlag(b,time());delete players[b.id]}}
    resetStats(p);if(isTeams()){const c=[0,0];for(const q of Object.values(players))if(q!==p&&q.team>=0)c[q.team]++;p.team=c[0]<=c[1]?0:1}
    if(!over)respawn(p,time());else{p.alive=false;p.respawnAt=Infinity}}
  sync(true);return p}
function removePlayer(id){const p=players[id];if(!p)return;dropFlag(p,time());delete players[id];delete votes[id];
  if(started&&ms.zone&&ms.zone.owner===id)ms.zone.owner=null;sync(true)}
function message(id,d,isOwner){const p=players[id];if(!p||!d||typeof d!=='object')return;
  switch(d.type){
    case 'i':p.keys=filterKeys(d.k);if(Number.isFinite(d.a))p.aim=d.a;if(Number.isFinite(d.d))p.ad=clamp(d.d,0,3000);break;
    case 'swap':p.swapReq=1;break;
    case 'perk':choosePerk(p,d.id,time());break;
    case 'look':if(!started||over){p.look=cleanLook(d.look);sync(true)}break;
    case 'vote':if(over&&MODES.some(m=>m.id===d.mode)){votes[id]=d.mode;sync(true)}break;
    case 'cfg':if(isOwner&&(!started||over)){Object.assign(cfg,cleanCfg(d.cfg));MODE=modeById(cfg.mode);M=mapById(cfg.map);sync(true)}break;
    case 'start':if(isOwner&&!started)startMatch();break;
    case 'next':if(isOwner&&started&&over){const c=cleanCfg({mode:d.mode,map:d.map});nextMatch(c.mode,c.map)}break;
    case 'lobby':if(isOwner&&started&&over)backToLobby();break;
    case 'end':if(isOwner&&started&&!over)endMatch();break}}
let lastTick=0;
function tick(){const t=time();if(!lastTick)lastTick=t;let dt=(t-lastTick)/1000;lastTick=t;if(!started)return;
  dt=Math.min(dt,.25);while(dt>0){const s=Math.min(dt,.05);step(s,time());dt-=s}sync()}
function summary(){const hs=humansList(),o=players[ownerId];
  return{code:info.code,name:info.name,vis:info.vis,locked:info.locked,owner:o?o.name:'',mode:cfg.mode,map:cfg.map,humans:hs.length,bots:started?Object.values(players).length-hs.length:cfg.bots,max:MAX_PLAYERS,
    state:started?(over?'result':'game'):'lobby',left:started&&!over?Math.max(0,Math.round((matchEnd-time())/1000)):0}}
return{
  setOut(f){out=f},setInfo(o){info=o;sync(true)},setOwner(id){ownerId=id;sync(true)},setCfg(c){Object.assign(cfg,cleanCfg(c));MODE=modeById(cfg.mode);M=mapById(cfg.map)},
  get started(){return started},get over(){return over},humans:humansList,hasPlayer:id=>!!players[id],
  addPlayer,removePlayer,message,tick,summary,sync,MAX_PLAYERS,
  clearKeys(id){const p=players[id];if(p)p.keys={}},
  debug(){return{players,bullets,cfg,ms,get started(){return started},get over(){return over}}}};
