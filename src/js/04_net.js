// ---------- Rede (PeerJS, anfitrião autoritativo) ----------
let netAt=0;
function send(c,d){try{if(c&&c.open)c.send(d)}catch(e){}}
function sync(force){if(!host||solo)return;const t=time();if(!force&&t-netAt<66)return;netAt=t;const s=snapshot();for(const c of Object.values(clients))send(c,s)}
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
let lastSig='';
function pushInputs(force){const me=players[self];if(host||demo){if(me){me.keys=filterKeys(keys);me.aim=localAim;me.ad=localAimDist}}
  else if(conn&&netMode==='srv'){const k=filterKeys(keys),a=+localAim.toFixed(2),d=Math.round(localAimDist/10)*10,sig=KEYLIST.map(x=>+k[x]).join('')+a+'|'+d,t=time();
    if(force||(sig!==lastSig&&t-lastInput>40)||t-lastInput>500){send(conn,{type:'i',k,a,d});lastInput=t;lastSig=sig}}
  else if(conn&&(force||time()-lastInput>45)){send(conn,{type:'i',k:filterKeys(keys),a:+localAim.toFixed(3),d:Math.round(localAimDist)});lastInput=time()}}
function leaveNet(keepStatus){srvSession++;stopPing();srvOwner=null;srvInfo=null;wsTok='';try{if(conn){const c=conn;conn=null;c.close()}}catch(e){}try{if(peer){peer.destroy()}}catch(e){}peer=null;conn=null;clients={};lastState=null;
  if(!keepStatus){host=false;solo=false;started=false;over=false;paused=false}}


// ---------- Servidor online (Cloudflare: Worker + Durable Objects) ----------
// O navegador vira um "convidado" do servidor: as mensagens são as mesmas do modo P2P,
// só que a partida roda numa sala na nuvem. O P2P continua aqui como reserva.
let netMode='p2p',srvOwner=null,srvInfo=null,wsTok='',rtt=0,pingTimer=null,srvUp=null,reconnectTry=0,srvSession=0;
let srvCache={st:{},G:[],MD:[],CR:[],E:[]};
const API_BASE=/^https?:$/.test(location.protocol)?location.origin:'';
const SRV_STATIC=['name','look','bot','mods','perks','maxHp','offer','killer'];
const srvMode=()=>netMode==='srv';
const isOwner=()=>host||(srvMode()&&!!self&&srvOwner===self);
function ownerSend(d){if(srvMode()&&conn)send(conn,d)}
async function api(path,opt){const r=await fetch(API_BASE+path,Object.assign({cache:'no-store'},opt||{}));if(!r.ok)throw new Error('http '+r.status);return r.json()}
let srvCheckP=null;
// No site publicado o jogo sempre usa o servidor; o P2P só existe quando o jogo é aberto como arquivo.
const HOSTED=!!API_BASE&&!/^(localhost|127\.|0\.0\.0\.0)/.test(location.hostname)||/[?&]srv=1/.test(location.search);
function checkServer(){if(!API_BASE)return Promise.resolve(srvUp=false);if(srvCheckP)return srvCheckP;return srvCheckP=(async()=>{
  for(let i=0;i<3;i++){try{const d=await Promise.race([api('/api/health'),new Promise((_,j)=>setTimeout(()=>j(new Error('tempo')),6000))]);if(d&&d.ok){srvUp=true;break}}catch(e){}srvUp=false;if(i<2)await new Promise(r=>setTimeout(r,700))}
  srvCheckP=null;return srvUp})()}
const serverReady=()=>srvUp?Promise.resolve(true):checkServer().then(up=>up||HOSTED);
function stopPing(){if(pingTimer){clearInterval(pingTimer);pingTimer=null}}
function startPing(){stopPing();const ping=()=>send(conn,{type:'ping',t:time()});ping();pingTimer=setInterval(ping,2000)}
function wsOpen(code,join){const ws=new WebSocket((location.protocol==='https:'?'wss://':'ws://')+location.host+'/api/rooms/'+code+'/ws');
  const c={ws,open:false,send(d){if(ws.readyState===1)ws.send(JSON.stringify(d))},close(){try{if(ws.readyState===1)ws.send('{"type":"bye"}')}catch(e){}try{ws.close(1000)}catch(e){}}};
  ws.onopen=()=>{c.open=true;c.send(join)};
  ws.onmessage=e=>{if(conn!==c)return;let d;try{d=JSON.parse(e.data)}catch(_){return}srvMessage(d)};
  ws.onclose=()=>{c.open=false;if(conn===c)srvLost()};
  return c}
function srvBegin(code,extra){stopDemo();leaveNet();netMode='srv';host=false;solo=false;room=code;self='';reconnectTry=0;srvCache={st:{},G:[],MD:[],CR:[],E:[]};
  conn=wsOpen(code,Object.assign({type:'join',name:myNick(),look:myLook},extra));const c=conn,ses=srvSession;
  setTimeout(()=>{if(conn===c&&ses===srvSession&&!self){setNet('O servidor não respondeu. Tente de novo.','err');leaveNet(true)}},10000)}
async function srvCreate(o){setNet('Criando sala no servidor…','busy');
  try{const {code}=await api('/api/rooms',{method:'POST'});
    srvBegin(code,{create:{name:o.name,vis:o.vis,pass:o.pass||'',cfg:{mode:cfg.mode,map:cfg.map,bots:cfg.bots,time:cfg.time,diff:cfg.diff}}})}
  catch(e){setNet('O servidor não respondeu. Tente de novo.','err')}}
function srvJoin(code,pass){code=(code||'').toUpperCase().replace(/[^A-Z0-9]/g,'');if(code.length!==6){setNet('O código tem 6 letras ou números.','err');return}
  setNet('Entrando na sala '+code+'…','busy');srvBegin(code,pass?{pass}:{})}
function srvMerge(d){const st=srvCache.st;
  for(const id in d.P){const p=d.P[id];if('look' in p){const o={};for(const f of SRV_STATIC)o[f]=p[f];st[id]=o}
    else{const o=st[id];if(o)for(const f of SRV_STATIC)p[f]=o[f];else{p.name=p.name||'...';p.look=defaultLook(0);p.mods=defaultMods();p.perks={};p.maxHp=100;p.offer=null;p.killer=null}}}
  for(const id in st)if(!d.P[id])delete st[id];
  for(const k of ['G','MD','CR']){if(d[k])srvCache[k]=d[k];else d[k]=srvCache[k]}
  srvCache.E=srvCache.E.filter(e=>e.end>d.ht).concat(d.E||[]);d.E=srvCache.E}
function srvMessage(d){if(!d||typeof d!=='object')return;
  switch(d.type){
    case 's':srvMerge(d);srvOwner=d.owner||null;srvInfo=d.info||srvInfo;clientMessage(d);return;
    case 'welcome':wsTok=d.token;srvOwner=d.owner;srvInfo=d.info;reconnectTry=0;startPing();
      if(d.resumed){self=d.id;toast('Reconectado!','good');return}clientMessage(d);return;
    case 'reject':{const was=self;if(d.code==='pass'){const code=room;leaveNet(true);askRoomPass(code,d.reason);return}
      setNet(d.reason||'Não deu para entrar.','err');leaveNet(true);if(was||view!=='online'){toast(d.reason||'A sala foi encerrada.','bad');goHome()}return}
    case 'pong':{const r=time()-d.t;rtt=rtt?lerp(rtt,r,.3):r;return}
    case 'note':toast(d.msg,d.kind||'');if(d.snd)Sound.play(d.snd);return}}
function srvLost(){stopPing();const ses=srvSession;
  if(!self){setNet('Não deu para conectar ao servidor.','err');conn=null;return}
  if(reconnectTry===0)toast('A conexão caiu… reconectando','bad');
  if(reconnectTry++>=12){toast('Sem conexão com o servidor.','bad');leaveNet();goHome();return}
  setTimeout(()=>{if(ses!==srvSession||!srvMode()||!self)return;conn=wsOpen(room,{type:'join',name:myNick(),look:myLook,resume:{id:self,token:wsTok}})},Math.min(2500,400+reconnectTry*300))}
