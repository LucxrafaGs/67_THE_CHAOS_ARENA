// ===== Sala de jogo: um Durable Object por código de sala =====
// Roda a partida (a mesma simulação do jogo) e conversa com os jogadores por WebSocket.
import {DurableObject} from 'cloudflare:workers';
import {createSim} from './sim.gen.js';

const TICK_MS=25;            // 40 passos de simulação por segundo (snapshots a cada 50 ms)
const GHOST_MS=20000;        // quem cai da conexão tem 20 s para voltar sem perder o lugar
const LOBBY_EVERY=5000;      // a lista pública é atualizada a cada 5 s
const rid=n=>{const A='abcdefghijkmnpqrstuvwxyz23456789';let s='';const b=crypto.getRandomValues(new Uint8Array(n));for(const x of b)s+=A[x%A.length];return s};
const cleanName=s=>String(s||'').replace(/[<>]/g,'').replace(/\s+/g,' ').trim().slice(0,24);
const cleanPass=s=>String(s||'').slice(0,24);

export class Room extends DurableObject{
  constructor(ctx,env){super(ctx,env);this.reset()}
  reset(){if(this.loop)clearInterval(this.loop);if(this.lobbyLoop)clearInterval(this.lobbyLoop);
    this.sim=null;this.code='';this.info=null;this.pass='';this.owner=null;this.socks=new Map();this.ghosts=new Map();this.order=[];this.loop=null;this.lobbyLoop=null;this.lastLobby='';this.lastLobbyAt=0;this.tokens=new Map()}
  lobby(){return this.env.LOBBY.get(this.env.LOBBY.idFromName('main'))}

  async fetch(req){
    if(req.headers.get('Upgrade')!=='websocket')return new Response('Esperava um WebSocket',{status:426});
    const code=new URL(req.url).searchParams.get('code')||'';
    const [client,server]=Object.values(new WebSocketPair());server.accept();this.attach(server,code);
    return new Response(null,{status:101,webSocket:client})}

  attach(ws,code){let id=null,bucket=0,bucketAt=Date.now();
    ws.addEventListener('message',e=>{
      const now=Date.now();if(now-bucketAt>1000){bucket=0;bucketAt=now}if(++bucket>80)return; // anti-spam
      let d;try{d=JSON.parse(typeof e.data==='string'?e.data:'')}catch(_){return}if(!d||typeof d!=='object')return;
      try{if(!id){id=this.join(ws,d,code);return}this.onMessage(id,ws,d)}catch(err){console.log('erro na sala',String(err&&err.stack||err))}});
    const gone=()=>{if(id){const i=id;id=null;this.disconnect(i,ws)}};
    ws.addEventListener('close',gone);ws.addEventListener('error',gone)}

  tx(ws,obj){try{ws.send(typeof obj==='string'?obj:JSON.stringify(obj))}catch(_){}}
  reject(ws,code,reason){this.tx(ws,{type:'reject',code,reason});try{ws.close(4000,code)}catch(_){}return null}

  join(ws,d,code){
    if(d.type!=='join')return this.reject(ws,'proto','Mensagem inválida.');
    // Primeira pessoa cria a sala
    if(!this.sim){
      if(!d.create||!/^[A-Z0-9]{6}$/.test(code))return this.reject(ws,'notfound','Sala não encontrada. Será que ela foi pegar um lanche?');
      this.code=code;const c=d.create||{};this.pass=cleanPass(c.pass);
      this.info={code,name:cleanName(c.name)||'Sala de '+cleanName(d.name).slice(0,15),vis:c.vis==='private'?'private':'public',locked:!!this.pass};
      this.sim=createSim();this.sim.setOut(s=>{for(const w of this.socks.values())this.tx(w,s)});this.sim.setInfo(this.info);if(c.cfg)this.sim.setCfg(c.cfg);
      this.loop=setInterval(()=>{try{this.sim&&this.sim.tick()}catch(err){console.log('erro no passo',String(err&&err.stack||err))}},TICK_MS);
      this.lobbyLoop=setInterval(()=>this.report(),LOBBY_EVERY)}
    // Voltando depois de cair
    if(d.resume&&d.resume.id&&this.ghosts.has(d.resume.id)){const g=this.ghosts.get(d.resume.id);
      if(g.token===d.resume.token&&this.sim.hasPlayer(d.resume.id)){clearTimeout(g.timer);this.ghosts.delete(d.resume.id);const old=this.socks.get(d.resume.id);if(old&&old!==ws)try{old.close(4001,'replaced')}catch(_){}
        this.socks.set(d.resume.id,ws);this.tx(ws,{type:'welcome',id:d.resume.id,room:this.code,token:g.token,owner:this.owner,info:this.info,resumed:1});this.sim.sync(true);return d.resume.id}}
    if(d.resume)return this.reject(ws,'expired','Sua vaga na sala expirou.');
    if(this.pass&&!d.create&&cleanPass(d.pass)!==this.pass)return this.reject(ws,'pass',d.pass?'Senha errada. Tenta de novo!':'Essa sala tem senha.');
    if(this.sim.humans().length>=this.sim.MAX_PLAYERS)return this.reject(ws,'full','Sala cheia (10/10).');
    const id='u'+rid(8),token=rid(16);this.socks.set(id,ws);this.order.push(id);this.ghosts.delete(id);
    const p=this.sim.addPlayer(id,d.name,d.look);if(!this.owner)this.owner=id;
    this.tokens.set(id,token);this.tx(ws,{type:'welcome',id,room:this.code,token,owner:this.owner,info:this.info});
    this.sim.setOwner(this.owner);for(const [oid,w] of this.socks)if(oid!==id)this.tx(w,{type:'note',kind:'good',msg:p.name+' entrou!',snd:'boing'});
    this.report(true);return id}

  onMessage(id,ws,d){if(this.socks.get(id)!==ws)return;
    if(d.type==='ping'){this.tx(ws,{type:'pong',t:d.t});return}
    if(d.type==='bye'){this.leave(id);try{ws.close(1000,'bye')}catch(_){}return}
    if(d.type==='room'&&id===this.owner){
      if(typeof d.name==='string'&&cleanName(d.name))this.info.name=cleanName(d.name);
      if(d.vis==='public'||d.vis==='private')this.info.vis=d.vis;
      if(typeof d.pass==='string'){this.pass=cleanPass(d.pass);this.info.locked=!!this.pass}
      this.info={...this.info};this.sim.setInfo(this.info);this.report(true);return}
    this.sim.message(id,d,id===this.owner)}

  // Conexão caiu: guarda a vaga por um tempo para a pessoa voltar
  disconnect(id,ws){if(this.socks.get(id)!==ws)return;this.socks.delete(id);if(!this.sim||!this.sim.hasPlayer(id))return;
    this.sim.clearKeys(id);const token=this.tokens.get(id);
    const timer=setTimeout(()=>{this.ghosts.delete(id);this.leave(id)},GHOST_MS);this.ghosts.set(id,{token,timer});this.checkEmpty()}

  leave(id){const g=this.ghosts.get(id);if(g){clearTimeout(g.timer);this.ghosts.delete(id)}const ws=this.socks.get(id);this.socks.delete(id);
    if(!this.sim)return;const name=(this.sim.debug().players[id]||{}).name;this.sim.removePlayer(id);this.order=this.order.filter(x=>x!==id);this.tokens.delete(id);
    if(this.owner===id){this.owner=this.order.find(x=>this.socks.has(x))||this.order[0]||null;this.sim.setOwner(this.owner);
      const nw=this.socks.get(this.owner);if(nw)this.tx(nw,{type:'note',kind:'good',msg:'Você agora é o dono da sala!',snd:'yes'})}
    if(name)for(const w of this.socks.values())this.tx(w,{type:'note',kind:'',msg:name+' saiu da sala'});
    if(!this.checkEmpty())this.report(true)}

  checkEmpty(){if(this.socks.size>0||this.ghosts.size>0)return false;const code=this.code;this.reset();if(code)this.lobby().remove(code).catch(()=>{});return true}

  report(force){if(!this.sim)return;const s=this.sim.summary();const k=JSON.stringify({...s,left:0});const now=Date.now();if(!force&&k===this.lastLobby&&s.state!=='game'&&now-this.lastLobbyAt<15000)return;this.lastLobby=k;this.lastLobbyAt=now;
    this.lobby().update(s).catch(err=>console.log('lobby',String(err)))}
}
