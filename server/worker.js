// ===== Worker do CapiBoom =====
// Serve o jogo (public/) e a API online:
//   GET  /api/health          -> o servidor está no ar?
//   GET  /api/rooms           -> salas públicas abertas
//   POST /api/rooms           -> reserva um código novo de sala
//   GET  /api/rooms/CODE/ws   -> WebSocket da sala (Durable Object "Room")
//   POST /api/social/register -> cria conta de CapyAmigos (código de amigo)
//   GET  /api/social/ws       -> WebSocket de amigos/mensagens (Durable Object "Social")
export {Room} from './room.js';
export {Lobby} from './lobby.js';
export {Social} from './social.js';

const json=(o,st=200)=>new Response(JSON.stringify(o),{status:st,headers:{'content-type':'application/json; charset=utf-8','cache-control':'no-store'}});
const lobby=env=>env.LOBBY.get(env.LOBBY.idFromName('main'));
const social=env=>env.SOCIAL.get(env.SOCIAL.idFromName('main'),{locationHint:'sam'});

export default{
  async fetch(req,env){
    const url=new URL(req.url),path=url.pathname;
    if(!path.startsWith('/api/'))return env.ASSETS.fetch(req);
    try{
      if(path==='/api/health')return json({ok:true,v:1});
      if(path==='/api/rooms'&&req.method==='GET')return json({rooms:await lobby(env).list()});
      if(path==='/api/rooms'&&req.method==='POST')return json({code:await lobby(env).reserve()});
      // CapyAmigos
      if(path==='/api/social/register'&&req.method==='POST'){let b={};try{b=await req.json()}catch(e){}return json(await social(env).register(b.name,b.look))}
      if(path==='/api/social/ws'){if(req.headers.get('Upgrade')!=='websocket')return json({error:'websocket'},426);return social(env).fetch(req)}
      const m=path.match(/^\/api\/rooms\/([A-Z0-9]{6})\/ws$/);
      if(m){if(req.headers.get('Upgrade')!=='websocket')return json({error:'websocket'},426);
        // Salas nascem na América do Sul (mais perto de quem joga no Brasil)
        const stub=env.ROOM.get(env.ROOM.idFromName(m[1]),{locationHint:'sam'});
        const u=new URL(req.url);u.searchParams.set('code',m[1]);return stub.fetch(new Request(u,req))}
      return json({error:'não encontrado'},404)
    }catch(err){console.log('api',String(err&&err.stack||err));return json({error:'erro no servidor'},500)}
  }
};
