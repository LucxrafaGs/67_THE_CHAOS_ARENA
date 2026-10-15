// ===== CapyAmigos: contas, amigos por código, presença e mensagens =====
// Um Durable Object único com SQLite. Usa WebSockets "hibernáveis": quem está só com o jogo aberto
// não gasta a cota grátis de duração; o objeto só acorda quando chega uma mensagem.
import {DurableObject} from 'cloudflare:workers';

const A='ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
const rand=(n,abc='abcdefghijkmnpqrstuvwxyz23456789')=>{let s='';for(const x of crypto.getRandomValues(new Uint8Array(n)))s+=abc[x%abc.length];return s};
const cleanName=s=>String(s||'').replace(/[<>]/g,'').replace(/\s+/g,' ').trim().slice(0,15)||'Capivara';
const cleanTxt=s=>String(s||'').replace(/[\u0000-\u001f]/g,' ').trim().slice(0,200);
const cleanLook=l=>{try{const j=JSON.stringify(l||{});return j.length<1500?j:'{}'}catch(e){return '{}'}};
const ALIVE_MS=75000; // sem "ping" há mais que isso = conexão morta

export class Social extends DurableObject{
  constructor(ctx,env){super(ctx,env);this.sql=ctx.storage.sql;
    this.sql.exec(`CREATE TABLE IF NOT EXISTS users(id TEXT PRIMARY KEY,secret TEXT,code TEXT UNIQUE,name TEXT,look TEXT,seen INTEGER,st TEXT)`);
    this.sql.exec(`CREATE TABLE IF NOT EXISTS friends(a TEXT,b TEXT,t INTEGER,PRIMARY KEY(a,b))`);
    this.sql.exec(`CREATE TABLE IF NOT EXISTS msgs(id INTEGER PRIMARY KEY AUTOINCREMENT,a TEXT,b TEXT,t INTEGER,txt TEXT)`);
    this.sql.exec(`CREATE INDEX IF NOT EXISTS msgs_pair ON msgs(a,b,id)`);
    ctx.setWebSocketAutoResponse(new WebSocketRequestResponsePair('ping','pong'))}

  q(sql,...b){return this.sql.exec(sql,...b).toArray()}
  user(id){return this.q('SELECT * FROM users WHERE id=?',id)[0]}

  // Conta nova (chamada pelo Worker via RPC)
  async register(name,look){for(let i=0;i<50;i++){const code=rand(6,A);if(this.q('SELECT 1 FROM users WHERE code=?',code).length)continue;
      const id='c'+rand(12),secret=rand(24),now=Date.now();
      this.sql.exec('INSERT INTO users(id,secret,code,name,look,seen,st) VALUES(?,?,?,?,?,?,?)',id,secret,code,cleanName(name),cleanLook(look),now,'{}');
      return{id,secret,code}}throw new Error('sem códigos')}

  async fetch(req){const u=new URL(req.url),id=u.searchParams.get('id')||'',s=u.searchParams.get('s')||'';
    if(req.headers.get('Upgrade')!=='websocket')return new Response('ws',{status:426});
    const me=this.user(id);if(!me||me.secret!==s)return new Response('conta inválida',{status:403});
    const [client,server]=Object.values(new WebSocketPair());
    this.ctx.acceptWebSocket(server,[id]);server.serializeAttachment({id,st:{w:'menu'},at:Date.now(),n:0,nt:0});
    const was=this.isOnline(id,server);this.sql.exec('UPDATE users SET seen=? WHERE id=?',Date.now(),id);
    this.tx(server,{type:'state',me:{id,code:me.code,name:me.name},friends:this.friendList(id)});
    if(!was)this.presence(id);
    return new Response(null,{status:101,webSocket:client})}

  socks(id,except){return this.ctx.getWebSockets(id).filter(w=>w!==except&&w.readyState===1&&this.alive(w))}
  alive(w){const a=w.deserializeAttachment()||{},ping=this.ctx.getWebSocketAutoResponseTimestamp(w);const last=Math.max(a.at||0,ping?ping.getTime():0);return Date.now()-last<ALIVE_MS}
  isOnline(id,except){return this.socks(id,except).length>0}
  stOf(id){const ss=this.socks(id);if(!ss.length)return null;let best=null;for(const w of ss){const a=w.deserializeAttachment()||{};if(!best||(a.st&&a.st.w!=='menu'))best=a.st}return best||{w:'menu'}}
  tx(w,o){try{w.send(JSON.stringify(o))}catch(e){}}
  toUser(id,o,except){for(const w of this.socks(id,except))this.tx(w,o)}
  friendIds(id){return this.q('SELECT b FROM friends WHERE a=?',id).map(r=>r.b)}
  lastAct(id){let t=0;for(const w of this.ctx.getWebSockets(id)){const a=w.deserializeAttachment()||{},p=this.ctx.getWebSocketAutoResponseTimestamp(w);t=Math.max(t,a.at||0,p?p.getTime():0)}return t}
  card(u,viewer){const on=this.isOnline(u.id);let look={};try{look=JSON.parse(u.look||'{}')}catch(e){}
    const last=viewer?this.q('SELECT max(t) AS t FROM msgs WHERE a=? AND b=?',u.id,viewer)[0]:null;
    return{id:u.id,name:u.name,code:u.code,look,online:on,seen:Math.max(u.seen||0,this.lastAct(u.id)),st:on?this.stOf(u.id):null,lastIn:last&&last.t||0}}
  friendList(id){return this.q('SELECT u.* FROM friends f JOIN users u ON u.id=f.b WHERE f.a=? ORDER BY u.name',id).map(u=>this.card(u,id))}
  presence(id){const u=this.user(id);if(!u)return;const c=this.card(u);for(const f of this.friendIds(id))this.toUser(f,{type:'presence',id,online:c.online,seen:c.seen,st:c.st,name:u.name,look:c.look})}

  async webSocketMessage(ws,raw){if(typeof raw!=='string'||raw==='ping')return;let d;try{d=JSON.parse(raw)}catch(e){return}if(!d||typeof d!=='object')return;
    const a=ws.deserializeAttachment()||{};const id=a.id;if(!id)return;const now=Date.now();
    if(now-(a.nt||0)>10000){a.nt=now;a.n=0}if(++a.n>40){ws.serializeAttachment(a);return}a.at=now;ws.serializeAttachment(a);
    switch(d.type){
      case 'hb':return; // só marca que a conexão está viva
      case 'list':return this.tx(ws,{type:'list',friends:this.friendList(id)});
      case 'st':{const st={w:['menu','lobby','game','bots','result'].includes(d.w)?d.w:'menu',room:/^[A-Z0-9]{6}$/.test(d.room||'')?d.room:'',rn:cleanTxt(d.rn).slice(0,24),mode:cleanTxt(d.mode).slice(0,12)};
        a.st=st;ws.serializeAttachment(a);this.sql.exec('UPDATE users SET seen=? WHERE id=?',now,id);this.presence(id);return}
      case 'profile':{this.sql.exec('UPDATE users SET name=?,look=? WHERE id=?',cleanName(d.name),cleanLook(d.look),id);this.presence(id);return}
      case 'add':{const code=String(d.code||'').toUpperCase().replace(/[^A-Z0-9]/g,'');const f=this.q('SELECT * FROM users WHERE code=?',code)[0];
        if(!f)return this.tx(ws,{type:'err',msg:'Código não encontrado.'});if(f.id===id)return this.tx(ws,{type:'err',msg:'Esse é o seu próprio código!'});
        if(this.q('SELECT 1 FROM friends WHERE a=? AND b=?',id,f.id).length)return this.tx(ws,{type:'err',msg:f.name+' já é seu CapyAmigo.'});
        if(this.friendIds(id).length>=100)return this.tx(ws,{type:'err',msg:'Limite de 100 amigos.'});
        this.sql.exec('INSERT OR IGNORE INTO friends(a,b,t) VALUES(?,?,?)',id,f.id,now);this.sql.exec('INSERT OR IGNORE INTO friends(a,b,t) VALUES(?,?,?)',f.id,id,now);
        const me=this.user(id);this.toUser(id,{type:'friend',f:this.card(f,id),added:1});this.toUser(f.id,{type:'friend',f:this.card(me,f.id),by:1});return}
      case 'del':{const fid=String(d.id||'');this.sql.exec('DELETE FROM friends WHERE (a=? AND b=?) OR (a=? AND b=?)',id,fid,fid,id);
        this.toUser(id,{type:'unfriend',id:fid});this.toUser(fid,{type:'unfriend',id});return}
      case 'msg':{const to=String(d.to||''),txt=cleanTxt(d.txt);if(!txt)return;
        if(!this.q('SELECT 1 FROM friends WHERE a=? AND b=?',id,to).length)return this.tx(ws,{type:'err',msg:'Vocês não são amigos.'});
        const r=this.q('INSERT INTO msgs(a,b,t,txt) VALUES(?,?,?,?) RETURNING id',id,to,now,txt)[0];const m={id:r.id,a:id,b:to,t:now,txt,k:d.k};
        this.toUser(to,{type:'msg',m});this.toUser(id,{type:'msg',m});
        if(r.id%50===0)this.sql.exec('DELETE FROM msgs WHERE t<?',now-30*864e5); // guarda 30 dias
        return}
      case 'hist':{const w=String(d.with||'');const rows=this.q('SELECT id,a,b,t,txt FROM msgs WHERE (a=? AND b=?) OR (a=? AND b=?) ORDER BY id DESC LIMIT 60',id,w,w,id).reverse();
        this.tx(ws,{type:'hist',with:w,msgs:rows});return}}}

  async webSocketClose(ws){this.gone(ws)}
  async webSocketError(ws){this.gone(ws)}
  gone(ws){const a=ws.deserializeAttachment()||{};if(!a.id)return;try{ws.close(1000,'bye')}catch(e){}
    this.sql.exec('UPDATE users SET seen=? WHERE id=?',Date.now(),a.id);if(!this.isOnline(a.id,ws))this.presence(a.id)}
}
