// ===== Utilidades puras (usadas também pelo servidor) =====
const $=id=>document.getElementById(id);
const rand=(a,b)=>a+Math.random()*(b-a),clamp=(x,a,b)=>Math.max(a,Math.min(b,x)),lerp=(a,b,t)=>a+(b-a)*t;
const time=()=>performance.now();
const pick=a=>a[Math.floor(Math.random()*a.length)];
const safe=s=>String(s||'Jogador').replace(/[<>]/g,'').trim().slice(0,15)||'Jogador';
const roomId=()=>{const A='ABCDEFGHJKLMNPQRSTUVWXYZ23456789';let s='';for(let i=0;i<6;i++)s+=A[Math.floor(Math.random()*A.length)];return s};
const store={get(k,d){try{const v=localStorage.getItem('67x_'+k);return v===null?d:JSON.parse(v)}catch(e){return d}},set(k,v){try{localStorage.setItem('67x_'+k,JSON.stringify(v))}catch(e){}}};
// Gerador determinístico
function mulberry(a){return function(){a|=0;a=a+0x6D2B79F5|0;let t=Math.imul(a^a>>>15,1|a);t=t+Math.imul(t^t>>>7,61|t)^t;return((t^t>>>14)>>>0)/4294967296}}
