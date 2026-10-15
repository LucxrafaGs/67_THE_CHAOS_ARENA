// ===== Saguão: um único Durable Object que guarda a lista de salas abertas =====
// Fica só na memória: cada sala se reapresenta a cada poucos segundos, então a lista se refaz sozinha.
import {DurableObject} from 'cloudflare:workers';

const TTL=30000;
const newCode=()=>{const A='ABCDEFGHJKLMNPQRSTUVWXYZ23456789';let s='';const b=crypto.getRandomValues(new Uint8Array(6));for(const x of b)s+=A[x%A.length];return s};

export class Lobby extends DurableObject{
  constructor(ctx,env){super(ctx,env);this.rooms=new Map()}
  prune(){const now=Date.now();for(const [k,r] of this.rooms)if(now-r.at>(r.pending?60000:TTL))this.rooms.delete(k)}
  async reserve(){this.prune();for(let i=0;i<100;i++){const c=newCode();if(!this.rooms.has(c)){this.rooms.set(c,{code:c,pending:true,at:Date.now()});return c}}throw new Error('sem códigos livres')}
  async update(s){if(!s||!s.code)return;this.rooms.set(s.code,{...s,at:Date.now()})}
  async remove(code){this.rooms.delete(code)}
  async list(){this.prune();return[...this.rooms.values()].filter(r=>!r.pending&&r.vis==='public'&&r.humans>0)
    .sort((a,b)=>(a.state==='lobby'?0:1)-(b.state==='lobby'?0:1)||b.humans-a.humans).slice(0,40)
    .map(({at,pending,...r})=>r)}
}
