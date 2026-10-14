// ===== Arte desenhada do zero: capivaras, armas, projéteis, itens, mapas =====
const TAU=Math.PI*2;
function shade(hex,amt){let n=parseInt(hex.slice(1),16),r=n>>16,g=n>>8&255,b=n&255;const f=amt<0?0:255,p=Math.abs(amt);r=Math.round((f-r)*p+r);g=Math.round((f-g)*p+g);b=Math.round((f-b)*p+b);return '#'+((1<<24)+(r<<16)+(g<<8)+b).toString(16).slice(1)}
function rr(c,x,y,w,h,r){r=Math.min(r,w/2,h/2);c.beginPath();c.moveTo(x+r,y);c.arcTo(x+w,y,x+w,y+h,r);c.arcTo(x+w,y+h,x,y+h,r);c.arcTo(x,y+h,x,y,r);c.arcTo(x,y,x+w,y,r);c.closePath()}
function star(c,x,y,R,r,n=5,rot=-Math.PI/2){c.beginPath();for(let i=0;i<n*2;i++){const a=rot+i*Math.PI/n,rad=i%2?r:R;c.lineTo(x+Math.cos(a)*rad,y+Math.sin(a)*rad)}c.closePath()}
function hexgon(c,x,y,r){c.beginPath();for(let i=0;i<6;i++){const a=Math.PI/6+i*Math.PI/3;c.lineTo(x+Math.cos(a)*r,y+Math.sin(a)*r)}c.closePath()}
// primitivas com contorno
let LW=2.2;
const K=(c,f)=>{c.fillStyle=f;c.fill();c.strokeStyle=INK;c.lineWidth=LW;c.stroke()};
const R=(c,x,y,w,h,r,f)=>{rr(c,x,y,w,h,r);K(c,f)};
const C=(c,x,y,r,f)=>{c.beginPath();c.arc(x,y,r,0,TAU);K(c,f)};
const E=(c,x,y,rx,ry,a,f)=>{c.beginPath();c.ellipse(x,y,rx,ry,a,0,TAU);K(c,f)};
const PL=(c,pts,f)=>{c.beginPath();pts.forEach(([x,y],i)=>i?c.lineTo(x,y):c.moveTo(x,y));c.closePath();K(c,f)};
const HL=(c,x,y,w,h)=>{c.save();c.globalAlpha=.38;c.fillStyle='#fff';rr(c,x,y,w,h,h/2);c.fill();c.restore()};
const LN=(c,pts,col,w)=>{c.beginPath();pts.forEach(([x,y],i)=>i?c.lineTo(x,y):c.moveTo(x,y));c.strokeStyle=col;c.lineWidth=w;c.stroke()};
function mulberry2(a){return mulberry(a)}

// Textura recortada
function texture(c,tex,col,x,y,w,h,seed=1){if(!tex||tex==='none')return;c.save();const Rn=mulberry(seed*97+tex.length);
  if(tex==='spots'){c.fillStyle=shade(col,-.35);for(let i=0;i<14;i++){const px=x+Rn()*w,py=y+Rn()*h,s=1.4+Rn()*2.4;c.beginPath();c.ellipse(px,py,s*1.2,s,Rn()*3,0,TAU);c.fill()}}
  else if(tex==='stripes'){c.strokeStyle=shade(col,-.28);c.lineWidth=3;for(let i=-h;i<w+h;i+=8){c.beginPath();c.moveTo(x+i,y);c.lineTo(x+i-h*.6,y+h);c.stroke()}}
  else if(tex==='dots'){c.fillStyle='#ffffffbb';for(let i=0;i<w;i+=7)for(let j=0;j<h;j+=7){c.beginPath();c.arc(x+i+(j/7%2)*3.5,y+j,1.4,0,TAU);c.fill()}}
  else if(tex==='check'){c.fillStyle=shade(col,-.22);for(let i=0;i<w;i+=6)for(let j=0;j<h;j+=6)if((i+j)/6%2===0)c.fillRect(x+i,y+j,6,6)}
  else if(tex==='sparkle'){c.fillStyle='#fffbe0';for(let i=0;i<9;i++){star(c,x+Rn()*w,y+Rn()*h,2.6,.8,4);c.fill()}}
  c.restore()}

// ---------- CAPIVARA ----------
function capyPath(c){c.beginPath();c.moveTo(-10,20);c.bezierCurveTo(-18,18,-20,2,-17,-10);c.bezierCurveTo(-15,-24,-7,-30,2,-30);c.bezierCurveTo(10,-30,15,-27,17,-22);
  c.bezierCurveTo(22,-21,25,-15,24,-10);c.bezierCurveTo(23,-5,19,-4,15,-4);c.bezierCurveTo(17,4,17,14,12,20);c.closePath()}
// o: {face, aim, t, mv, gun, hurt, dead, bot, shout, noGun, swing, frozen}
function drawChar(c,L,o={}){
  const t=o.t||0,face=o.face||1,mv=o.mv?1:0,bot=!!o.bot;
  LW=L.line==='thin'?1.6:2.4;const lw=LW;
  const body=bot?'#C9A46A':L.body,belly=bot?'#EBD3A0':L.belly,dark=shade(body,-.25);
  const bob=mv?-Math.abs(Math.sin(t/75))*2.6:Math.sin(t/420)*.7,step=mv?Math.sin(t/75):0;
  c.save();c.scale(face,1);c.lineJoin='round';c.lineCap='round';
  let la=o.aim==null?0:(face===1?o.aim:Math.PI-o.aim);la=Math.atan2(Math.sin(la),Math.cos(la));la=clamp(la,-1.6,1.6);
  c.fillStyle='#0003';c.beginPath();c.ellipse(1,22,18,5,0,0,TAU);c.fill();
  c.translate(0,bob);
  // costas: capa, foguete
  if(!bot&&L.out==='cape'){const fl=Math.sin(t/120)*3+(mv?7:0);c.beginPath();c.moveTo(-10,-8);c.quadraticCurveTo(-24-fl,6,-20-fl,22);c.lineTo(-4,18);c.lineTo(0,-6);c.closePath();K(c,L.ocol)}
  if(!bot&&L.acc==='jetpack'){R(c,-24,-8,9,20,3,'#8A93A6');R(c,-19,-10,9,20,3,'#B4BCC8');if(mv){c.fillStyle=o.dash?'#45D4FF':'#FF7A1A';c.beginPath();c.moveTo(-22,12);c.lineTo(-18,20+Math.random()*7);c.lineTo(-14,12);c.fill()}}
  if(!bot&&L.out==='hoodie'){E(c,-10,-16,9,11,-.4,L.ocol)}
  // orelha de trás
  E(c,-8,-27,4,3.4,-.3,dark);
  // braço de trás
  E(c,-15,5,4,6,.5,dark);
  // pernas
  for(const [lx,ph] of [[-9,1],[5,-1]]){const lift=mv?Math.max(0,step*ph)*3.4:0,sx=mv?step*ph*3:0;R(c,lx+sx,13-lift,9,10,4,lx<0?dark:shade(body,-.12))}
  // corpo
  c.save();capyPath(c);c.fillStyle=body;c.fill();c.clip();
  if(!bot)texture(c,L.btex,body,-20,-32,46,54,L.sp+3);
  c.fillStyle=belly;c.beginPath();c.ellipse(4,9,10,11,0,0,TAU);c.fill();
  c.fillStyle=shade(belly,.25);c.beginPath();c.ellipse(16,-12,9,7.5,-.15,0,TAU);c.fill();
  if(!bot&&L.out!=='none'&&L.out!=='cape'){c.fillStyle=L.ocol;
    if(L.out==='jacket'||L.out==='hoodie'){c.fillRect(-22,-4,44,30);c.fillStyle=belly;c.beginPath();c.moveTo(3,-4);c.lineTo(10,-4);c.lineTo(6,8);c.closePath();c.fill()}
    if(L.out==='vest'){c.fillRect(-22,-4,44,28);c.fillStyle=shade(L.ocol,-.25);c.fillRect(-12,4,8,7);c.fillRect(4,4,8,7);c.fillRect(-12,13,8,6);c.fillRect(4,13,8,6)}
    texture(c,L.otex,L.ocol,-22,-6,44,30,L.sp+11);
    if(L.out==='jacket'){c.strokeStyle='#0006';c.lineWidth=1.3;c.beginPath();c.moveTo(6,8);c.lineTo(6,22);c.stroke()}
    if(L.out==='hoodie'){c.fillStyle=shade(L.ocol,-.18);rr(c,-2,10,13,7,3);c.fill()}}
  if(bot){c.strokeStyle='#7a5a2a';c.lineWidth=1.2;for(let i=-10;i<12;i+=4){c.beginPath();c.moveTo(i,-2);c.lineTo(i+2,2);c.moveTo(i+2,-2);c.lineTo(i,2);c.stroke()}
    c.strokeStyle='#E8443A';c.lineWidth=2;c.beginPath();c.arc(3,11,5.5,0,TAU);c.stroke();c.beginPath();c.arc(3,11,1.8,0,TAU);c.stroke()}
  c.restore();capyPath(c);c.strokeStyle=INK;c.lineWidth=lw;c.stroke();
  // cachecol
  if(!bot&&L.acc==='scarf'){const fl=Math.sin(t/110)*3,ex2=mv?7:0;c.beginPath();c.moveTo(-15,-5);c.quadraticCurveTo(-27,-5+fl,-36-ex2,fl);c.lineTo(-34-ex2,9+fl);c.quadraticCurveTo(-24,5,-14,3);c.closePath();K(c,L.ocol);R(c,-21,-9,42,10,5,L.ocol);c.strokeStyle=shade(L.ocol,-.25);c.lineWidth=1.6;for(const x of [-12,-4,4,12]){c.beginPath();c.moveTo(x,-8);c.lineTo(x,0);c.stroke()}}
  // focinho: nariz e boca
  c.fillStyle=INK;rr(c,15.5,-17.5,7.5,5,2.4);c.fill();c.fillStyle='#ffffff66';c.beginPath();c.arc(18,-16.6,1,0,TAU);c.fill();
  const ex=o.dead?'dizzy':o.shout?'shout':bot?'smile':L.expr;
  c.strokeStyle=INK;c.lineWidth=1.7;const mx=18,my=-9;
  c.beginPath();c.moveTo(mx,-12.5);c.lineTo(mx,my-1);c.stroke();
  if(ex==='smile'){c.beginPath();c.moveTo(mx-4,my-1.5);c.quadraticCurveTo(mx-2,my+1.5,mx,my-1);c.quadraticCurveTo(mx+2,my+1.5,mx+4,my-1.5);c.stroke()}
  else if(ex==='smirk'){c.beginPath();c.moveTo(mx-4,my);c.quadraticCurveTo(mx,my+1,mx+4,my-3);c.stroke()}
  else if(ex==='angry'){c.beginPath();c.moveTo(mx-4,my+1);c.quadraticCurveTo(mx,my-3,mx+4,my+1);c.stroke()}
  else if(ex==='dizzy'){c.beginPath();c.moveTo(mx-4,my);for(let i=0;i<4;i++)c.quadraticCurveTo(mx-3+i*2,my+(i%2?2:-2),mx-2+i*2,my);c.stroke()}
  else if(ex==='shout'){c.fillStyle='#5A1030';c.beginPath();c.ellipse(mx,my+1,3,3.6,0,0,TAU);c.fill();c.stroke();c.fillStyle='#FF8FAB';c.beginPath();c.ellipse(mx,my+3,2,1.3,0,0,TAU);c.fill()}
  else if(ex==='tongue'){c.beginPath();c.moveTo(mx-4,my-1.5);c.quadraticCurveTo(mx-2,my+1.5,mx,my-1);c.quadraticCurveTo(mx+2,my+1.5,mx+4,my-1.5);c.stroke();c.fillStyle='#FF8FAB';c.beginPath();c.ellipse(mx+1.5,my+2,2,3,-.2,0,TAU);c.fill();c.stroke()}
  // bochecha
  if(L.cheek&&!bot){c.fillStyle='#FF8FAB77';c.beginPath();c.ellipse(-1,-12,4,2.6,0,0,TAU);c.fill()}
  // olho
  const es=[.8,1,1.3][L.esize]||1,ex0=6,ey0=-20;
  if(o.dead){c.strokeStyle=INK;c.lineWidth=2.2;c.beginPath();c.moveTo(ex0-3,ey0-3);c.lineTo(ex0+3,ey0+3);c.moveTo(ex0+3,ey0-3);c.lineTo(ex0-3,ey0+3);c.stroke()}
  else if(o.hurt){c.strokeStyle=INK;c.lineWidth=2.2;c.beginPath();c.moveTo(ex0-3,ey0-3);c.lineTo(ex0+2,ey0);c.lineTo(ex0-3,ey0+3);c.stroke()}
  else if(bot){C(c,ex0,ey0,3.6,'#E8443A');c.fillStyle=INK;for(const [a,b] of [[-1.2,-1.2],[1.2,-1.2],[-1.2,1.2],[1.2,1.2]]){c.beginPath();c.arc(ex0+a,ey0+b,.7,0,TAU);c.fill()}}
  else if(L.eye==='sleepy'){c.strokeStyle=INK;c.lineWidth=2.2;c.beginPath();c.arc(ex0,ey0-1,3.2*es,.2,Math.PI-.2);c.stroke()}
  else if(L.eye==='star'){c.fillStyle=L.ecol==='#2A1A12'?'#FFC531':L.ecol;star(c,ex0,ey0,4.4*es,1.9*es,5);c.fill();c.strokeStyle=INK;c.lineWidth=1.3;c.stroke()}
  else if(L.eye==='big'){c.fillStyle='#fff';c.beginPath();c.ellipse(ex0,ey0,4.4*es,5.2*es,0,0,TAU);c.fill();c.strokeStyle=INK;c.lineWidth=1.4;c.stroke();const lx=ex0+Math.cos(la)*1.2*es,ly=ey0+Math.sin(la)*1.2*es+.6;c.fillStyle=L.ecol;c.beginPath();c.arc(lx,ly,3*es,0,TAU);c.fill();c.fillStyle='#fff';c.beginPath();c.arc(lx-1.1*es,ly-1.3*es,1.2*es,0,TAU);c.fill()}
  else{c.fillStyle=L.ecol;c.beginPath();c.arc(ex0,ey0,2.9*es,0,TAU);c.fill();c.fillStyle='#fff';c.beginPath();c.arc(ex0-.9*es,ey0-1.1*es,1.05*es,0,TAU);c.fill()}
  if(!bot&&!o.dead&&(L.eye==='angry'||L.expr==='angry')){c.strokeStyle=INK;c.lineWidth=2.4;c.beginPath();c.moveTo(ex0-5,ey0-7);c.lineTo(ex0+4,ey0-4.5);c.stroke()}
  // óculos escuros
  // orelha da frente
  E(c,7,-29,4,3.4,.3,dark);c.fillStyle='#E7A08A';c.beginPath();c.ellipse(7,-29,2,1.6,.3,0,TAU);c.fill();
  // chapéus
  if(!bot){const hc=L.hcol;
    if(L.hat==='tangerina'){c.save();c.translate(1,-35);C(c,0,0,7,'#FF8A1F');c.fillStyle='#FFC07A';c.beginPath();c.arc(-2.4,-2.4,2,0,TAU);c.fill();c.strokeStyle='#6B4129';c.lineWidth=1.8;c.beginPath();c.moveTo(0,-7);c.lineTo(1,-10);c.stroke();E(c,4,-9,4.4,2,-.5,'#3DBE6C');c.restore()}
    if(L.hat==='topete'){c.beginPath();c.moveTo(-6,-28);c.lineTo(-7,-37);c.lineTo(-2,-31);c.lineTo(1,-40);c.lineTo(4,-31);c.lineTo(9,-36);c.lineTo(8,-27);c.closePath();K(c,hc)}
    if(L.hat==='bone'){c.beginPath();c.moveTo(-14,-24);c.bezierCurveTo(-12,-38,10,-38,13,-25);c.closePath();K(c,hc);c.beginPath();c.moveTo(10,-27);c.quadraticCurveTo(22,-29,26,-24);c.lineTo(12,-23);c.closePath();K(c,shade(hc,-.15));c.fillStyle='#fff';c.font='900 7px sans-serif';c.textAlign='center';c.fillText('CAPY',-1,-29)}
    if(L.hat==='capacete'){c.beginPath();c.moveTo(-16,-22);c.bezierCurveTo(-15,-40,13,-40,15,-22);c.closePath();K(c,hc);R(c,-17,-24,34,4,2,shade(hc,-.2));c.fillStyle='#ffffff40';c.beginPath();c.ellipse(-5,-32,5,2.4,-.4,0,TAU);c.fill()}
    if(L.hat==='bandana'){R(c,-15,-26,30,6,3,hc);const fl=Math.sin(t/100)*2;PL(c,[[-14,-24],[-24-(mv?5:0),-28+fl],[-22-(mv?5:0),-20+fl]],hc)}
    if(L.hat==='coroa'){PL(c,[[-9,-27],[-11,-39],[-5,-33],[0,-41],[5,-33],[11,-39],[9,-27]],'#FFC531');c.fillStyle='#FF3B47';c.beginPath();c.arc(0,-31,1.8,0,TAU);c.fill()}
    if(L.hat==='cartola'){R(c,-13,-30,26,4,2,'#2A2440');R(c,-9,-48,18,19,2,'#2A2440');c.fillStyle=hc;c.fillRect(-9,-34,18,4)}
    if(L.hat==='flor'){c.save();c.translate(11,-31);for(let i=0;i<5;i++){const a=i/5*TAU;C(c,Math.cos(a)*3.6,Math.sin(a)*3.6,2.8,hc)}C(c,0,0,2.4,'#FFC531');c.restore()}}
  if(!bot&&L.acc==='goggles'){LN(c,[[-16,-26],[-2,-29]],INK,2.2);c.fillStyle='#45D4FFdd';c.beginPath();c.ellipse(2,-30,4.2,3.4,-.15,0,TAU);K(c,'#45D4FFdd');c.beginPath();c.ellipse(10.5,-29,4,3.4,-.1,0,TAU);K(c,'#45D4FFdd')}
  if(!bot&&L.acc==='phones'){c.strokeStyle=INK;c.lineWidth=3;c.beginPath();c.arc(-1,-22,13,-2.9,-.4);c.stroke();R(c,-16,-24,7,11,3,L.ocol)}
  if(!bot&&L.acc==='glasses'){c.strokeStyle=INK;c.lineWidth=1.8;c.beginPath();c.moveTo(0,-20.5);c.lineTo(-15,-22);c.stroke();c.fillStyle='#14101F';rr(c,-.5,-24.5,14,8.5,3.8);c.fill();c.lineWidth=1.6;c.stroke();c.fillStyle='#6B7BFF55';c.fillRect(1.5,-23,10,2.4);c.fillStyle='#ffffffaa';c.fillRect(2.5,-22.6,3.4,1.6)}
  // braço da frente + arma
  if(!o.dead){c.save();c.translate(4,2);c.rotate(la);
    if(!o.noGun&&o.gun!=null&&o.gun>=0&&GUNS[o.gun]){const g=GUNS[o.gun];c.save();if(g.melee)c.rotate(-.9+(o.swing||0)*2.2);c.translate(6,0);c.scale(.3,.3);LW=6.4;drawModel(c,g,t);LW=lw;c.restore()}
    E(c,6,0,4.6,4,0,body);c.restore()}
  c.restore()}

// ---------- ITENS (usados em projéteis e ícones) — centrados, ~raio 10 ----------
function drawItem(c,k,t=0,g){switch(k){
  case 'bubble':c.globalAlpha=.85;C(c,0,0,10,'#FF7FC0aa');c.globalAlpha=1;c.fillStyle='#fffc';c.beginPath();c.arc(-3.5,-3.5,3,0,TAU);c.fill();break;
  case 'soap':{c.save();c.globalAlpha=.55;const gr=c.createRadialGradient(-3,-3,1,0,0,10);gr.addColorStop(0,'#fff');gr.addColorStop(.6,'#C9F0FF');gr.addColorStop(1,'#FF9BD5');c.fillStyle=gr;c.beginPath();c.arc(0,0,10,0,TAU);c.fill();c.globalAlpha=.8;c.strokeStyle='#ffffff';c.lineWidth=1.5;c.stroke();c.restore();c.fillStyle='#fff';c.beginPath();c.arc(-4,-4,2,0,TAU);c.fill();break}
  case 'cork':R(c,-9,-6,15,12,4,'#E8C07A');c.strokeStyle='#B8904A';c.lineWidth=1;for(let i=-6;i<5;i+=4){c.beginPath();c.moveTo(i,-4);c.lineTo(i,4);c.stroke()}break;
  case 'seed':E(c,0,0,6,5,0,'#5A2E1A');c.fillStyle='#ffffff55';c.beginPath();c.arc(-2,-2,1.6,0,TAU);c.fill();break;
  case 'ice':PL(c,[[-10,0],[-2,-6],[10,0],[-2,6]],'#BFF1FF');LN(c,[[-6,0],[8,0]],'#ffffff',1.5);break;
  case 'spark':star(c,0,0,10,3,4,t/100);K(c,'#FFFBE0');break;
  case 'popcorn':for(const [x,y] of [[0,0],[5,-3],[-4,4],[4,4]])C(c,x,y,4.4,'#FFF8DC');c.fillStyle='#FFC531';c.beginPath();c.arc(1,1,1.6,0,TAU);c.fill();break;
  case 'staple':c.strokeStyle='#CFE3F5';c.lineWidth=3;c.beginPath();c.moveTo(-6,5);c.lineTo(-6,-5);c.lineTo(7,-5);c.lineTo(7,5);c.stroke();c.strokeStyle=INK;c.lineWidth=1;c.stroke();break;
  case 'bee':{const w=Math.sin(t/30)*.4;c.globalAlpha=.8;E(c,-1,-7,4,6,-.5+w,'#E9F6FF');E(c,3,-7,4,6,.5-w,'#E9F6FF');c.globalAlpha=1;E(c,0,0,9,6.5,0,'#FFC531');c.fillStyle=INK;c.fillRect(-3,-6,2.6,12);c.fillRect(2,-6,2.6,12);c.beginPath();c.arc(7,-1.5,1.2,0,TAU);c.fill();break}
  case 'honey':c.beginPath();c.moveTo(0,-10);c.bezierCurveTo(8,-2,8,8,0,9);c.bezierCurveTo(-8,8,-8,-2,0,-10);K(c,'#F5B014');c.fillStyle='#fff8';c.beginPath();c.arc(-2,1,2,0,TAU);c.fill();break;
  case 'carrot':PL(c,[[12,0],[-8,-5],[-8,5]],'#FF8A1F');for(const a of [-.5,0,.5])E(c,-11,a*6,5,2,a,'#3DBE6C');LN(c,[[2,-2],[0,0]],INK,1);break;
  case 'plunger':LN(c,[[-14,0],[4,0]],'#C49A6C',4);c.beginPath();c.arc(8,0,7,-Math.PI/2,Math.PI/2);c.closePath();K(c,'#E25A5A');break;
  case 'melon':C(c,0,0,10,'#3DBE6C');c.strokeStyle='#1F7A3C';c.lineWidth=2;for(const a of [-.6,0,.6]){c.beginPath();c.ellipse(0,0,10*Math.cos(a)*.6+2,10,0,-1.4,1.4);c.stroke()}c.strokeStyle=INK;c.lineWidth=LW;c.beginPath();c.arc(0,0,10,0,TAU);c.stroke();break;
  case 'pumpkin':for(const x of [-5,5])E(c,x,1,6,9,0,'#FF8A1F');E(c,0,1,6,9.5,0,'#FF9D3D');R(c,-1.5,-12,3,5,1,'#3E5C3A');c.fillStyle=INK;PL(c,[[-5,-1],[-2,-1],[-3.5,-4]],INK);PL(c,[[2,-1],[5,-1],[3.5,-4]],INK);break;
  case 'anvil':PL(c,[[-14,-8],[14,-8],[8,0],[6,7],[10,11],[-10,11],[-6,7],[-8,0]],'#6B7385');HL(c,-10,-7,16,2.4);break;
  case 'fork':R(c,-12,-1.6,16,3.2,1.5,'#DDE7F2');R(c,3,-4,4,8,1,'#DDE7F2');for(const y of [-3.5,-1.2,1.2,3.5])LN(c,[[7,y],[12,y]],'#DDE7F2',1.6);break;
  case 'pizza':PL(c,[[0,-11],[10,8],[-10,8]],'#FFD166');R(c,-11,6,22,5,2.5,'#D9813B');for(const [x,y] of [[0,-2],[-3,4],[4,3]])C(c,x,y,2.2,'#E8443A');break;
  case 'banana':c.beginPath();c.moveTo(-11,-4);c.quadraticCurveTo(0,10,12,-5);c.quadraticCurveTo(0,4,-11,-4);K(c,'#FFE14D');R(c,-13,-6,4,3,1,'#6B4129');break;
  case 'pick':LN(c,[[0,-1],[0,12]],INK,5.4);LN(c,[[0,-1],[0,12]],'#9B6B3E',3);c.beginPath();c.moveTo(-12,0);c.quadraticCurveTo(0,-10,12,0);c.quadraticCurveTo(0,-5,-12,0);K(c,'#9FB4C7');break;
  case 'slipper':E(c,0,0,11,5.6,0,'#3DA5FF');E(c,0,0,8.4,3.6,0,'#9FD8FF');LN(c,[[3,0],[-4,-4]],'#FFF4E0',2.4);LN(c,[[3,0],[-4,4]],'#FFF4E0',2.4);break;
  case 'snowball':C(c,0,0,9,'#FFFFFF');c.fillStyle='#C9E8F5';c.beginPath();c.arc(2,3,6,0,Math.PI);c.fill();c.fillStyle='#fff';c.beginPath();c.arc(-3,-3,2.4,0,TAU);c.fill();break;
  case 'duck':E(c,0,3,10,7,0,'#FFD93D');C(c,5,-5,5.4,'#FFD93D');PL(c,[[9,-5],[14,-3],[9,-2]],'#FF8A1F');c.fillStyle=INK;c.beginPath();c.arc(6,-6.5,1.1,0,TAU);c.fill();c.beginPath();c.moveTo(-4,2);c.quadraticCurveTo(-1,6,3,3);c.strokeStyle=INK;c.lineWidth=1.2;c.stroke();break;
  case 'egg':E(c,0,0,7.4,9.6,0,'#9CF581');LN(c,[[-7,0],[-3,-3],[0,0],[3,-3],[7,0]],'#FF4F9A',2);break;
  case 'clock':PL(c,[[-9,-3],[0,-12],[9,-3]],'#8B5A2B');R(c,-8,-3,16,15,2,'#C98B4E');C(c,0,4,4.6,'#FFF4E0');LN(c,[[0,4],[0,1.4]],INK,1.4);LN(c,[[0,4],[2.2,4]],INK,1.4);break;
  case 'coconut':C(c,0,0,9.5,'#8B5A2B');c.fillStyle='#5A3A1A';for(const [x,y] of [[-2,-3],[2,-3],[0,1]]){c.beginPath();c.arc(x,y,1.3,0,TAU);c.fill()}break;
  case 'candy':PL(c,[[-6,0],[-12,-6],[-12,6]],'#FFC531');PL(c,[[6,0],[12,-6],[12,6]],'#FFC531');C(c,0,0,7,'#FF4F9A');LN(c,[[-4,-4],[2,5]],'#fff',1.6);break;
  case 'corn':E(c,0,0,6,10,0,'#FFE066');c.fillStyle='#E8B820';for(let y=-7;y<8;y+=3.4)for(const x of [-2.4,0,2.4]){c.beginPath();c.arc(x,y,1,0,TAU);c.fill()}c.beginPath();c.moveTo(0,10);c.quadraticCurveTo(-9,4,-7,-6);c.quadraticCurveTo(-4,5,0,10);K(c,'#3DBE6C');break;
  case 'mine':for(let i=0;i<8;i++){const a=i/8*TAU;LN(c,[[Math.cos(a)*7,Math.sin(a)*7],[Math.cos(a)*12,Math.sin(a)*12]],INK,2.4)}C(c,0,0,9,'#FF8A1F');E(c,3,-8,3.6,1.8,-.4,'#3DBE6C');c.fillStyle=(Math.floor(t/300)%2)?'#FF3B47':'#7a1a1a';c.beginPath();c.arc(0,0,2.4,0,TAU);c.fill();break;
  case 'megabomb':C(c,0,1,11,'#2A2440');HL(c,-6,-6,6,3);R(c,-3,-13,6,4,1,'#8A93A6');LN(c,[[0,-13],[4,-17]],'#C9A06A',2);c.fillStyle='#FFC531';star(c,5,-18,3.6,1.4,6,t/60);c.fill();c.fillStyle='#FFC531';c.font='900 8px "Lilita One",sans-serif';c.textAlign='center';c.textBaseline='middle';c.fillText('67',0,2);break;
  case 'chicken':E(c,-1,2,9,7.4,0,'#FFFFFF');C(c,6,-5,5,'#FFFFFF');PL(c,[[10,-5],[14,-4],[10,-3]],'#FFC531');PL(c,[[4,-10],[6,-13],[8,-10]],'#E8443A');c.fillStyle=INK;c.beginPath();c.arc(7,-6,1,0,TAU);c.fill();LN(c,[[-2,9],[-2,12]],'#FF8A1F',2);LN(c,[[2,9],[2,12]],'#FF8A1F',2);break;
  case 'door':R(c,-8,-11,16,22,2,'#9B6B3E');R(c,-5,-8,10,7,1,'#B98454');R(c,-5,1,10,7,1,'#B98454');c.fillStyle='#FFC531';c.beginPath();c.arc(4,1,1.4,0,TAU);c.fill();break;
  case 'box':R(c,-10,-10,20,20,2,'#C9A06A');R(c,-2.6,-10,5.2,20,0,'#E8D3A8');LN(c,[[-10,-3],[10,-3]],'#8B5A2B',1);break;
  case 'timeorb':{c.save();c.globalAlpha=.4;C(c,0,0,13,'#9FD8FF');c.restore();C(c,0,0,9,'#E9F6FF');c.save();c.rotate(t/200);LN(c,[[0,0],[0,-6]],INK,1.8);c.restore();c.save();c.rotate(t/1200);LN(c,[[0,0],[4,0]],INK,1.8);c.restore();break}
  case 'holeorb':{c.save();c.rotate(t/120);c.strokeStyle='#C38BFF';c.lineWidth=2.4;c.beginPath();c.ellipse(0,0,14,5,0,0,TAU);c.stroke();c.restore();C(c,0,0,8,'#0B0716');c.fillStyle='#8E5BFF55';c.beginPath();c.arc(0,0,11,0,TAU);c.fill();break}
  case 'rocket':R(c,-11,-5,19,10,4,'#E8443A');PL(c,[[8,-5],[15,0],[8,5]],'#FFC531');PL(c,[[-11,-5],[-15,-9],[-8,-5]],'#FFC531');PL(c,[[-11,5],[-15,9],[-8,5]],'#FFC531');break;
  case 'bigrocket':R(c,-14,-7,24,14,6,'#3E5C3A');PL(c,[[10,-7],[20,0],[10,7]],'#FF3B47');for(const s of [-1,1])PL(c,[[-14,s*7],[-19,s*13],[-8,s*7]],'#FF3B47');c.fillStyle='#FFC531';c.fillRect(-4,-7,3,14);break;
  case 'rpg':R(c,-12,-3.4,18,6.8,3,'#6B7A5A');c.beginPath();c.moveTo(6,-6);c.quadraticCurveTo(18,0,6,6);c.closePath();K(c,'#FF7A1A');for(const s of [-1,1])PL(c,[[-12,s*3],[-16,s*8],[-8,s*3]],'#4A5A3A');break;
  case 'meteor':C(c,0,0,10,'#8E5A3A');c.fillStyle='#5A3520';for(const [x,y,r] of [[-3,-2,2.4],[3,3,1.8],[4,-4,1.4]]){c.beginPath();c.arc(x,y,r,0,TAU);c.fill()}break;
  default:C(c,0,0,8,(g&&g.col)||'#fff')}}

// ---------- MODELOS DE ARMA (cabo em 0,0; cano para +x) ----------
function grip(c,col){c.save();c.rotate(.22);R(c,-5,-1,10,19,3.5,col);c.restore()}
const MLEN={pistol:44,finger:34,revolver:44,slingshot:24,camera:40,smg:62,stapler:56,hive:44,minigun:66,hose:44,rifle:76,sniper:94,bow:40,crossbow:56,partycannon:44,accordion:52,shotgun:62,blunderbuss:62,
  cannon:52,bazooka:72,megabazooka:96,rpg:72,laser:54,tesla:48,baguette:64,hammer:54,glove:50,dryer:44,squeegee:56,fish:72,pizzasaw:52,forks:30,pizza:24,banana:28,pick:28,slipper:28,snowball:20,
  duck:26,eggs:34,cuckoo:24,launcher:60,corn:24,mine:24,megabomb:28,megaphone:44,door:26,portalgun:52,horn:48,chickengun:62,calc:28,stopwatch:36,blackhole:34,remote:30,stamp:30,wand:44,trowel:44,box:26,shieldgen:36,turret:44};
function drawModel(c,g,t=0){const m=g.m,c1=g.c1||g.col||'#888',c2=g.c2||'#fff';c.lineJoin='round';c.lineCap='round';const item=(k,x,y,s,rot=0)=>{c.save();c.translate(x,y);c.rotate(rot);c.scale(s,s);drawItem(c,k,t,g);c.restore()};
  switch(m){
  case 'pistol':grip(c,shade(c1,-.3));R(c,-6,-11,34,14,6,c1);R(c,26,-9,10,10,3,c2);R(c,16,-15,6,5,1.5,c2);HL(c,-2,-9,24,3);c.beginPath();c.arc(6,6,5,0,Math.PI);c.strokeStyle=INK;c.lineWidth=LW;c.stroke();
    if(g.x==='bubbles'){for(const [x,y,r] of [[42,-10,5],[48,-1,3.4],[38,-18,3]]){c.globalAlpha=.8;C(c,x,y,r,'#FF7FC0aa');c.globalAlpha=1}}
    if(g.x==='crystal'){PL(c,[[2,-11],[6,-22],[10,-11]],'#BFF1FF');PL(c,[[10,-11],[15,-19],[18,-11]],'#BFF1FF')}break;
  case 'finger':E(c,4,2,11,9,0,c1);R(c,8,-7,26,7,3.5,c1);R(c,0,-17,7,12,3.5,c1);c.fillStyle='#FF8FAB';c.beginPath();c.ellipse(4,4,4,3,0,0,TAU);c.fill();for(const y of [-14,-10])LN(c,[[40,y-2],[48,y-5]],c2,2.6);break;
  case 'revolver':grip(c,'#8B5A2B');R(c,-4,-10,16,13,5,c1);C(c,10,-4,8,shade(c1,.15));for(let i=0;i<5;i++){const a=i/5*TAU;c.fillStyle=INK;c.beginPath();c.arc(10+Math.cos(a)*4,-4+Math.sin(a)*4,1.3,0,TAU);c.fill()}R(c,16,-9,28,7,3,c1);item('cork',48,-5,.6);break;
  case 'slingshot':LN(c,[[0,16],[0,2],[-7,-14]],INK,7.6);LN(c,[[0,2],[9,-14]],INK,7.6);LN(c,[[0,16],[0,2],[-7,-14]],c1,4.6);LN(c,[[0,2],[9,-14]],c1,4.6);LN(c,[[-7,-14],[16,-4],[9,-14]],c2,2);item('seed',16,-4,.6);break;
  case 'camera':R(c,-8,-15,38,26,6,c1);R(c,20,-21,9,7,2,c2);C(c,10,-2,10,'#3A3A46');C(c,10,-2,6,'#6FC3FF');c.fillStyle='#fff';c.beginPath();c.arc(8,-4,2,0,TAU);c.fill();R(c,-4,-20,8,5,2,'#E8443A');break;
  case 'smg':grip(c,shade(c1,-.3));R(c,8,0,8,18,2,'#4A4F5C');R(c,-18,-8,14,11,4,shade(c1,-.2));R(c,-8,-11,46,15,6,c1);R(c,36,-7,16,8,3,'#4A4F5C');HL(c,-4,-9,36,3);
    if(g.x==='popcorn'){PL(c,[[2,-12],[22,-12],[19,-24],[5,-24]],'#FFF4E0');for(const x of [8,14])c.fillRect(x,-24,3,12);for(const [x,y] of [[6,-26],[12,-28],[18,-26]])C(c,x,y,3.6,'#FFF8DC')}break;
  case 'stapler':R(c,-12,0,58,9,3,c1);R(c,-12,-14,58,12,5,shade(c1,.2));C(c,-8,-3,4,'#8A93A6');for(const y of [-10,-6])LN(c,[[46,y],[56,y]],c2,2.6);HL(c,-6,-12,42,3);break;
  case 'hive':grip(c,'#8B5A2B');E(c,16,-8,20,14,0,c1);c.strokeStyle=c2;c.lineWidth=2;for(const y of [-14,-8,-2]){c.beginPath();c.moveTo(-2,y);c.lineTo(34,y);c.stroke()}c.strokeStyle=INK;c.lineWidth=LW;c.beginPath();c.ellipse(16,-8,20,14,0,0,TAU);c.stroke();C(c,34,-6,3.4,INK);item('bee',42,-18,.5);break;
  case 'minigun':R(c,-14,-14,30,26,7,c1);for(const y of [-12,-6,0])R(c,14,y,36,6,3,'#9AA3B3');R(c,46,-15,6,22,2,c1);R(c,40,-15,4,22,1,shade(c1,.3));c.strokeStyle=INK;c.lineWidth=LW;c.beginPath();c.arc(0,-14,9,Math.PI,TAU);c.stroke();
    c.fillStyle=c2;for(let i=0;i<5;i++)c.fillRect(-12+i*5,12+Math.sin(i)*2,3,7);HL(c,-10,-12,22,3);break;
  case 'hose':c.strokeStyle=INK;c.lineWidth=8;c.beginPath();c.arc(-6,8,10,0,TAU*.8);c.stroke();c.strokeStyle=c1;c.lineWidth=5;c.stroke();grip(c,'#4A4F5C');R(c,-4,-8,30,11,4,'#8A93A6');R(c,24,-10,14,15,4,c1);c.fillStyle=c2;c.beginPath();c.ellipse(42,-2,3,5,0,0,TAU);c.fill();break;
  case 'rifle':PL(c,[[-22,-6],[-6,-8],[-6,4],[-22,8]],shade(c1,-.25));grip(c,shade(c1,-.3));R(c,-8,-9,64,11,4,c1);R(c,54,-7,18,6,2,c2);if(g.x==='bamboo'){c.strokeStyle=c2;c.lineWidth=2;for(let x=6;x<56;x+=13){c.beginPath();c.moveTo(x,-9);c.lineTo(x,2);c.stroke()}}HL(c,-4,-7,50,2.6);break;
  case 'sniper':PL(c,[[-24,-6],[-6,-8],[-6,4],[-24,10]],shade(c1,.15));grip(c,shade(c1,-.2));R(c,-8,-9,52,12,4,c1);R(c,40,-7,44,6,2,'#4A4F5C');R(c,82,-9,8,10,2,c1);R(c,6,-22,30,9,4,'#3A3A46');C(c,38,-17.5,4.6,c2);LN(c,[[60,3],[56,16]],INK,2);LN(c,[[64,3],[68,16]],INK,2);break;
  case 'bow':c.strokeStyle=INK;c.lineWidth=7;c.beginPath();c.moveTo(0,-26);c.quadraticCurveTo(22,0,0,26);c.stroke();c.strokeStyle=c1;c.lineWidth=4;c.stroke();LN(c,[[0,-26],[-6,0],[0,26]],'#fff',1.4);item('plunger',22,0,.9);break;
  case 'crossbow':R(c,-16,-5,56,10,4,c1);c.strokeStyle=INK;c.lineWidth=7;c.beginPath();c.moveTo(24,-24);c.quadraticCurveTo(36,0,24,24);c.stroke();c.strokeStyle='#5A3A1A';c.lineWidth=4;c.stroke();LN(c,[[24,-24],[8,0],[24,24]],'#fff',1.4);item('carrot',36,0,.9);grip(c,shade(c1,-.2));break;
  case 'partycannon':grip(c,shade(c1,-.3));PL(c,[[-6,-8],[32,-18],[32,12],[-6,4]],c1);c.save();c.beginPath();c.moveTo(-6,-8);c.lineTo(32,-18);c.lineTo(32,12);c.lineTo(-6,4);c.closePath();c.clip();c.fillStyle=c2;for(let x=-6;x<34;x+=10)c.fillRect(x,-20,4,34);c.restore();E(c,32,-3,4,15,0,'#FFF4E0');for(const [x,y,col] of [[40,-14,'#45D4FF'],[44,-2,'#6CF06A'],[40,8,'#FF4F9A']]){c.fillStyle=col;c.fillRect(x,y,5,3)}break;
  case 'accordion':R(c,-12,-15,11,26,3,c1);R(c,32,-15,11,26,3,c1);c.beginPath();c.moveTo(-1,-13);for(let i=0;i<6;i++){c.lineTo(2+i*5.5,i%2?-15:-11)}c.lineTo(32,-13);c.lineTo(32,9);for(let i=5;i>=0;i--){c.lineTo(2+i*5.5,i%2?11:7)}c.lineTo(-1,9);c.closePath();K(c,c2);for(let i=0;i<4;i++)R(c,-10,-12+i*5.6,6,3.6,1,'#fff');break;
  case 'shotgun':PL(c,[[-26,-4],[-6,-8],[-6,4],[-26,10]],'#8B5A2B');grip(c,'#6E4A2E');R(c,-8,-11,18,13,4,c1);R(c,8,-12,52,6,3,c2);R(c,8,-6,52,6,3,c2);R(c,20,0,16,7,3,c1);break;
  case 'blunderbuss':PL(c,[[-24,-4],[-6,-8],[-6,4],[-24,10]],c1);grip(c,shade(c1,-.2));R(c,-8,-9,40,10,4,c2);PL(c,[[30,-8],[52,-18],[52,10],[30,0]],c2);E(c,52,-4,4,14,0,shade(c2,-.4));break;
  case 'cannon':R(c,-8,-12,50,20,9,c1);R(c,40,-14,8,24,3,shade(c1,.2));c.fillStyle=c2;c.fillRect(6,-12,6,20);LN(c,[[-8,-6],[-14,-14]],'#C9A06A',2.4);C(c,4,10,10,'#8B5A2B');for(let i=0;i<4;i++){const a=i*Math.PI/4;LN(c,[[4-Math.cos(a)*7,10-Math.sin(a)*7],[4+Math.cos(a)*7,10+Math.sin(a)*7]],INK,1.6)}HL(c,-2,-10,36,3);break;
  case 'bazooka':grip(c,'#3A3A46');R(c,-18,-10,68,17,8,c1);c.fillStyle=c2;for(const x of [-6,10,28])c.fillRect(x,-10,5,17);R(c,48,-12,7,21,3,shade(c1,-.2));PL(c,[[-18,-10],[-26,-14],[-26,11],[-18,7]],shade(c1,-.25));R(c,4,-18,10,7,2,'#3A3A46');HL(c,-14,-8,58,3);
    if(g.x==='anvil')item('anvil',62,-2,.6);break;
  case 'megabazooka':grip(c,'#3A3A46');R(c,-26,-15,92,25,11,c1);c.save();rr(c,-26,-15,92,25,11);c.clip();c.fillStyle='#FFC531';for(let x=-24;x<70;x+=16){c.beginPath();c.moveTo(x,10);c.lineTo(x+8,10);c.lineTo(x+18,-15);c.lineTo(x+10,-15);c.fill()}c.restore();rr(c,-26,-15,92,25,11);c.strokeStyle=INK;c.lineWidth=LW;c.stroke();
    c.beginPath();c.moveTo(66,-15);c.quadraticCurveTo(90,-2,66,10);c.closePath();K(c,c2);R(c,8,-25,16,10,3,'#3A3A46');break;
  case 'rpg':grip(c,'#3A3A46');R(c,-18,-7,60,13,6,c1);item('rpg',56,0,1.2);R(c,8,-15,10,6,2,'#3A3A46');HL(c,-14,-5,50,2.4);break;
  case 'laser':grip(c,shade(c1,-.3));c.beginPath();c.moveTo(-8,-12);c.lineTo(34,-10);c.quadraticCurveTo(44,-4,34,3);c.lineTo(-8,4);c.closePath();K(c,c1);for(const x of [12,19,26])R(c,x,-14,4,20,2,c2);C(c,44,-4,5,c2);c.fillStyle='#fff';c.beginPath();c.arc(43,-5,2,0,TAU);c.fill();
    if(g.x==='catears'){PL(c,[[-4,-12],[0,-22],[6,-12]],c1);PL(c,[[8,-12],[12,-22],[17,-12]],c1)}
    if(g.x==='jar'){R(c,-4,-26,22,14,3,'#E9F6FFcc');c.fillStyle=c2;rr(c,-2,-20,18,7,2);c.fill()}
    if(g.x==='disco'){C(c,50,-4,8,'#C9CED8');c.strokeStyle=INK;c.lineWidth=1;for(const d of [-3,0,3]){c.beginPath();c.moveTo(42,-4+d*2);c.lineTo(58,-4+d*2);c.moveTo(50+d*2,-12);c.lineTo(50+d*2,4);c.stroke()}}
    if(g.x==='crystal'){PL(c,[[46,-4],[54,-12],[60,-4],[54,4]],'#BFF1FF')}HL(c,-4,-10,32,2.6);break;
  case 'tesla':grip(c,'#3A3A46');R(c,-8,-10,36,14,5,c1);for(let i=0;i<5;i++)E(c,30,-14-i*4,8-i*.8,2.4,0,'#C98B4E');C(c,30,-36,7,c2);c.strokeStyle=c2;c.lineWidth=2;c.beginPath();c.moveTo(36,-40);c.lineTo(42,-44);c.lineTo(40,-38);c.lineTo(48,-40);c.stroke();break;
  case 'baguette':R(c,-6,-7,68,14,7,'#E8B26A');c.strokeStyle='#B87A3A';c.lineWidth=2;for(let x=6;x<58;x+=12){c.beginPath();c.moveTo(x,-5);c.lineTo(x+7,5);c.stroke()}HL(c,0,-5,54,3);R(c,-10,-4,8,8,2,'#FFF4E0');break;
  case 'hammer':R(c,-4,-3.5,42,7,3,'#8B5A2B');R(c,36,-16,20,32,7,c1);R(c,34,-16,6,32,3,c2);R(c,52,-16,6,32,3,c2);HL(c,40,-14,10,3);break;
  case 'glove':c.strokeStyle=INK;c.lineWidth=3.6;c.beginPath();c.moveTo(-2,0);for(let i=0;i<7;i++)c.lineTo(3+i*4,i%2?-6:6);c.lineTo(28,0);c.stroke();c.strokeStyle='#C9CED8';c.lineWidth=2;c.stroke();R(c,26,-9,8,18,3,'#FFF4E0');E(c,40,0,12,11,0,'#FF3B47');E(c,36,-10,5,4,-.4,'#FF3B47');HL(c,34,-7,10,3);break;
  case 'dryer':R(c,-4,0,10,20,4,c1);C(c,8,-6,12,c1);R(c,14,-12,26,12,4,shade(c1,-.12));c.fillStyle=INK;for(const a of [0,1,2]){c.beginPath();c.arc(8+Math.cos(a*2.1)*5,-6+Math.sin(a*2.1)*5,1.3,0,TAU);c.fill()}c.fillStyle=c2;c.beginPath();c.moveTo(40,-12);c.quadraticCurveTo(52,-6,40,0);c.fill();break;
  case 'squeegee':R(c,-6,-2.5,56,5,2,'#C9CED8');R(c,48,-20,9,40,3,'#45D4FF');R(c,55,-20,4,40,2,'#2A2440');for(const [x,y] of [[64,-10],[62,4],[66,12]]){c.fillStyle='#45D4FF';c.beginPath();c.arc(x,y,2,0,TAU);c.fill()}break;
  case 'fish':PL(c,[[-6,-11],[6,0],[-6,11]],'#5E9BC2');E(c,24,0,22,10,0,'#7FB7D9');LN(c,[[45,-2],[72,-1]],INK,4.4);LN(c,[[45,-2],[72,-1]],'#C9E2F0',2.4);C(c,36,-3,2.6,'#fff');c.fillStyle=INK;c.beginPath();c.arc(36.6,-3,1.2,0,TAU);c.fill();PL(c,[[20,-9],[26,-18],[30,-9]],'#5E9BC2');break;
  case 'pizzasaw':R(c,-6,-4,32,8,3,'#E8443A');C(c,38,0,14,'#C9CED8');for(let i=0;i<4;i++){const a=i/4*TAU+t/80;LN(c,[[38,0],[38+Math.cos(a)*11,Math.sin(a)*11]],INK,1.4)}C(c,38,0,3,'#E8443A');break;
  case 'forks':for(const [a,k] of [[-.35,'fork'],[0,'fork'],[.35,'fork']])item(k,12+Math.cos(a)*6,Math.sin(a)*14,1.3,a);break;
  case 'pizza':item('pizza',12,0,1.3,-.3);break;
  case 'banana':item('banana',12,0,1.3,-.2);break;
  case 'pick':item('pick',12,0,1.3,.6);break;
  case 'slipper':item('slipper',12,0,1.3,-.3);break;
  case 'snowball':item('snowball',10,0,1.2);break;
  case 'duck':item('duck',12,0,1.3);break;
  case 'eggs':item('egg',4,4,1.1,-.3);item('egg',16,-2,1.1);item('egg',28,4,1.1,.3);break;
  case 'cuckoo':item('clock',12,0,1.3);break;
  case 'launcher':grip(c,'#3A3A46');R(c,-14,-11,60,18,8,c1);C(c,4,9,10,c2);for(let i=0;i<6;i++){const a=i/6*TAU;c.fillStyle=INK;c.beginPath();c.arc(4+Math.cos(a)*5.6,9+Math.sin(a)*5.6,1.6,0,TAU);c.fill()}R(c,44,-13,6,22,2,shade(c1,-.2));HL(c,-10,-9,50,3);
    item(g.p==='coconut'?'coconut':'candy',58,-2,.7);break;
  case 'corn':item('corn',12,0,1.3,.3);break;
  case 'mine':item('mine',12,0,1.2);break;
  case 'megabomb':item('megabomb',12,2,1.4);break;
  case 'megaphone':grip(c,shade(c1,-.3));R(c,-8,-8,14,12,4,c1);PL(c,[[4,-8],[36,-20],[36,16],[4,4]],c1);E(c,36,-2,5,18,0,c2);break;
  case 'door':item('door',12,0,1.4);for(const [x,y] of [[26,-14],[28,10],[-2,-16]]){c.fillStyle='#FFFBE0';star(c,x,y,3.6,1.3,4);c.fill()}break;
  case 'portalgun':grip(c,'#3A3A46');R(c,-8,-11,38,15,6,'#E9EEF5');R(c,2,-14,14,4,2,c1);E(c,40,-4,6,13,0,c1);E(c,40,-4,3,8,0,c2);HL(c,-4,-9,26,3);break;
  case 'horn':C(c,-4,0,10,'#2A2440');PL(c,[[4,-4],[32,-4],[48,-16],[48,16],[32,4],[4,4]],'#E8B820');E(c,48,0,4,16,0,'#C9961A');break;
  case 'chickengun':grip(c,'#3A3A46');R(c,-14,-10,54,17,7,c1);c.fillStyle='#fff';c.fillRect(6,-10,6,17);item('chicken',50,-6,.9);break;
  case 'calc':R(c,-12,-16,30,36,6,'#FFC531');R(c,-7,-11,20,10,2,'#BFF2C0');c.fillStyle=INK;c.font='9px "Lilita One",sans-serif';c.textAlign='center';c.textBaseline='middle';c.fillText('67',3,-6);for(let i=0;i<3;i++)for(let j=0;j<2;j++)R(c,-8+i*7,3+j*7,5,5,1,'#fff');break;
  case 'stopwatch':R(c,6,-24,8,6,2,'#8A93A6');C(c,10,-2,17,'#E9EEF5');C(c,10,-2,13,'#fff');c.save();c.translate(10,-2);for(let i=0;i<12;i++){const a=i/12*TAU;LN(c,[[Math.cos(a)*10,Math.sin(a)*10],[Math.cos(a)*12,Math.sin(a)*12]],INK,1.2)}c.rotate(t/400);LN(c,[[0,0],[0,-10]],'#E8443A',2);c.restore();c.globalAlpha=.4;c.strokeStyle='#9FD8FF';c.lineWidth=4;c.beginPath();c.arc(10,-2,21,0,TAU);c.stroke();c.globalAlpha=1;break;
  case 'blackhole':for(const s of [-1,1])LN(c,[[-4,s*4],[8,s*14]],INK,3.4);R(c,-10,-5,12,10,3,'#5B6B80');item('holeorb',18,0,1.5);break;
  case 'remote':R(c,-6,-18,22,36,5,c1);for(let i=0;i<2;i++)for(let j=0;j<3;j++)C(c,0+i*10,-6+j*8,2.6,j===0&&i===0?c2:'#C9CED8');LN(c,[[10,-18],[22,-32]],INK,2);C(c,22,-32,3.4,c2);item('meteor',30,-12,.7);break;
  case 'stamp':C(c,6,-22,7,'#8B5A2B');R(c,3,-16,6,12,2,'#8B5A2B');R(c,-12,-5,36,12,3,c1);R(c,-14,7,40,4,1,'#2A2440');break;
  case 'wand':R(c,-6,-2,30,4,2,'#FF8FAB');c.globalAlpha=.6;c.strokeStyle='#fff';c.lineWidth=5;c.beginPath();c.arc(34,0,10,0,TAU);c.stroke();c.globalAlpha=1;c.strokeStyle=INK;c.lineWidth=LW;c.beginPath();c.arc(34,0,10,0,TAU);c.stroke();item('soap',50,-12,.6);item('soap',54,6,.4);break;
  case 'trowel':R(c,-6,-4,22,8,3,'#8B5A2B');R(c,14,-2,8,4,1,'#8A93A6');PL(c,[[20,0],[34,-14],[48,0],[34,14]],'#C9CED8');R(c,-4,14,16,8,1,'#D2603F');R(c,12,14,16,8,1,'#D2603F');break;
  case 'boxgun':case 'box':item('box',12,0,1.4,-.1);break;
  case 'shieldgen':R(c,-6,6,32,8,3,'#5B6B80');c.globalAlpha=.5;c.beginPath();c.arc(10,6,20,Math.PI,TAU);K(c,c1);c.globalAlpha=1;c.beginPath();c.arc(10,6,20,Math.PI,TAU);c.strokeStyle=INK;c.lineWidth=LW;c.stroke();C(c,10,2,4,c2);break;
  case 'turret':LN(c,[[10,4],[0,20]],INK,3);LN(c,[[10,4],[20,20]],INK,3);LN(c,[[10,4],[10,20]],INK,3);R(c,0,-10,22,16,6,c1);R(c,18,-6,24,6,3,'#3A3A46');C(c,8,-2,3,c2);break;
  default:grip(c,shade(c1,-.3));R(c,-6,-10,40,14,6,c1)}}

// ---------- Ícone de arma (DOM) ----------
const iconCache=new Map();
function drawWeaponIcon(cv,gi,bg=true){const c=cv.getContext('2d'),W0=cv.width,H0=cv.height,g=GUNS[gi];if(!g)return;c.setTransform(1,0,0,1,0,0);c.clearRect(0,0,W0,H0);
  const tc=TIERS[g.tier][1];
  if(bg){const gr=c.createRadialGradient(W0/2,H0*.6,4,W0/2,H0/2,W0*.65);gr.addColorStop(0,shade(tc,-.45));gr.addColorStop(1,'#241339');c.fillStyle=gr;c.fillRect(0,0,W0,H0);
    c.strokeStyle='#ffffff10';c.lineWidth=W0/40;for(let i=-H0;i<W0;i+=W0/8){c.beginPath();c.moveTo(i,H0);c.lineTo(i+H0,0);c.stroke()}}
  const len=MLEN[g.m]||50,s=Math.min(W0*.78/(len+16),H0*.8/48);c.save();c.translate(W0/2-(len/2-4)*s,H0/2+3*s);c.rotate(-.12);c.scale(s,s);LW=2.6;
  c.fillStyle='#0003';c.beginPath();c.ellipse(len/2,26,len/2+4,5,0,0,TAU);c.fill();drawModel(c,g,0);
  if(g.txt==='NÃO'||g.txt==='SIM'){c.font='900 16px "Lilita One",sans-serif';c.textAlign='center';c.textBaseline='middle';c.lineWidth=5;c.strokeStyle=INK;c.strokeText(g.txt,len-2,-22);c.fillStyle=g.col;c.fillText(g.txt,len-2,-22)}
  c.restore();LW=2.2}
function iconURL(gi,w=132,h=84){const k=gi+'_'+w;if(iconCache.has(k))return iconCache.get(k);const cv=document.createElement('canvas');cv.width=w;cv.height=h;drawWeaponIcon(cv,gi,false);const u=cv.toDataURL();iconCache.set(k,u);return u}

// ---------- Projéteis ----------
function drawProj(c,b,t){const g=GUNS[b.g]||GUNS[0],a=Math.atan2(b.vy,b.vx);c.save();c.translate(b.x,b.y);c.lineJoin='round';c.lineCap='round';LW=2.2;
  const T=(txt,size,col)=>{c.font=`900 ${size}px "Lilita One",sans-serif`;c.textAlign='center';c.textBaseline='middle';c.lineWidth=5;c.strokeStyle=INK;c.strokeText(txt,0,0);c.fillStyle=col;c.fillText(txt,0,0)};
  const s=b.r/9,spin=g.spin?t/70+b.id:0;
  switch(g.p){
    case 'text':{let txt=g.txt;if(g.calc)txt=b.six?'6':'7';c.rotate(Math.sin(t/60+b.id)*.15);T(txt,g.calc?26:g.txt==='PEW'?16:30,g.col);break}
    case 'bullet':c.rotate(a);c.globalCompositeOperation='lighter';c.strokeStyle=g.col+'88';c.lineWidth=b.r*1.4;c.beginPath();c.moveTo(-18,0);c.lineTo(0,0);c.stroke();c.globalCompositeOperation='source-over';R(c,-5,-b.r*.6,10,b.r*1.2,b.r*.6,g.col);break;
    case 'pellet':C(c,0,0,b.r*.9,g.col);break;
    case 'tracer':{c.rotate(a);c.globalCompositeOperation='lighter';c.strokeStyle=g.col;c.lineWidth=7;c.globalAlpha=.35;c.beginPath();c.moveTo(-90,0);c.lineTo(6,0);c.stroke();c.globalAlpha=1;c.lineWidth=3;c.stroke();c.strokeStyle='#fff';c.lineWidth=1.4;c.stroke();break}
    case 'beam':{c.rotate(a);const len=46,col=g.rainbow?`hsl(${(t/3+b.id*40)%360} 100% 65%)`:g.col;c.globalCompositeOperation='lighter';c.strokeStyle=col;c.lineWidth=12;c.globalAlpha=.35;c.beginPath();c.moveTo(-len,0);c.lineTo(4,0);c.stroke();c.globalAlpha=1;c.lineWidth=5;c.stroke();c.strokeStyle='#fff';c.lineWidth=2;c.stroke();break}
    case 'bolt':{c.rotate(a);c.globalCompositeOperation='lighter';c.strokeStyle='#FFF066';c.lineWidth=3;c.beginPath();c.moveTo(-26,0);for(let i=1;i<6;i++)c.lineTo(-26+i*6,(i%2?-1:1)*Math.random()*7);c.stroke();c.fillStyle='#FFFBE0';c.beginPath();c.arc(4,0,5,0,TAU);c.fill();break}
    case 'flame':{const k=b.life/(g.life||.42);c.globalCompositeOperation='lighter';c.fillStyle=k>.6?'#FFE066':k>.3?'#FF922E':'#FF4F2E';c.globalAlpha=.85;c.beginPath();c.arc(0,0,b.r*(1.3-k*.6),0,TAU);c.fill();break}
    case 'confetti':c.rotate(t/80+b.id);c.fillStyle=['#FFC531','#FF4F9A','#45D4FF','#6CF06A'][b.id%4];c.fillRect(-5,-3,10,6);c.strokeStyle=INK;c.lineWidth=1.5;c.strokeRect(-5,-3,10,6);break;
    case 'note':c.fillStyle=g.col;c.font='900 18px sans-serif';c.textAlign='center';c.textBaseline='middle';c.lineWidth=3;c.strokeStyle=INK;c.strokeText(b.id%2?'♪':'♫',0,0);c.fillText(b.id%2?'♪':'♫',0,0);break;
    case 'jelly':{const w=Math.sin(t/50)*2.5;c.beginPath();c.ellipse(0,0,b.r+w,b.r-w,0,0,TAU);K(c,'#B777FFcc');c.fillStyle='#fff8';c.beginPath();c.ellipse(-6,-6,5,3,-.6,0,TAU);c.fill();break}
    case 'portal':c.rotate(t/90);c.strokeStyle='#A16CFF';c.lineWidth=4;c.beginPath();for(let i=0;i<30;i++){const r=i*.45,an=i*.5;c.lineTo(Math.cos(an)*r,Math.sin(an)*r)}c.stroke();break;
    case 'wave':{c.rotate(a);const k=1-b.life/.35;c.strokeStyle='#45D4FF';c.lineWidth=3.4;c.globalAlpha=1-k*.6;c.beginPath();c.arc(-6,0,8+k*12,-.9,.9);c.stroke();break}
    case 'spark':c.globalCompositeOperation='lighter';c.fillStyle='#FFFBE0';star(c,0,0,9,3,4,t/60);c.fill();break;
    case 'rocket':case 'rpg':case 'bigrocket':c.rotate(a);c.scale(s*.9,s*.9);drawItem(c,g.p,t,g);break;
    case 'chicken':c.scale(b.vx<0?-s:s,s);c.translate(0,-Math.abs(Math.sin(t/60))*3);drawItem(c,'chicken',t,g);break;
    case 'carrot':case 'plunger':case 'ice':case 'cork':case 'staple':case 'bee':c.rotate(a);c.scale(s*.9,s*.9);drawItem(c,g.p,t,g);break;
    default:c.rotate(spin);c.scale(s,s);drawItem(c,g.p,t,g);
      if(g.fuse&&b.life<.5&&Math.floor(t/70)%2){c.fillStyle='#FF3B4766';c.beginPath();c.arc(0,0,14,0,TAU);c.fill()}}
  c.restore()}

// ---------- Coletáveis e objetos ----------
function drawOrange(c,x,y,t){const bob=Math.sin(t/380+x*.01)*3;c.save();c.translate(x,y+bob);LW=2.2;
  c.globalCompositeOperation='lighter';const gl=c.createRadialGradient(0,0,2,0,0,22);gl.addColorStop(0,'#FF8A1F66');gl.addColorStop(1,'#FF8A1F00');c.fillStyle=gl;c.beginPath();c.arc(0,0,22,0,TAU);c.fill();c.globalCompositeOperation='source-over';
  c.fillStyle='#0003';c.beginPath();c.ellipse(0,15-bob,8,3,0,0,TAU);c.fill();
  C(c,0,0,9,'#FF8A1F');c.fillStyle='#FFB25E';c.beginPath();c.arc(-3,-3,3,0,TAU);c.fill();c.fillStyle='#E8700A';for(const [a,b] of [[3,2],[-1,4],[4,-2]]){c.beginPath();c.arc(a,b,.8,0,TAU);c.fill()}
  LN(c,[[0,-9],[1,-12]],'#6B4129',1.8);E(c,4,-12,4,1.8,-.5,'#3DBE6C');c.restore()}
function drawMedkit(c,x,y,t){const bob=Math.sin(t/300+x)*2;c.save();c.translate(x,y+bob);LW=2.4;c.fillStyle='#0003';c.beginPath();c.ellipse(0,16-bob,14,4,0,0,TAU);c.fill();
  const p=(Math.sin(t/250)+1)/2;c.globalAlpha=.25+p*.25;c.fillStyle='#6CF06A';c.beginPath();c.arc(0,0,22,0,TAU);c.fill();c.globalAlpha=1;
  R(c,-6,-15,12,6,3,'#C9CED8');R(c,-14,-11,28,22,5,'#FFFFFF');R(c,-3.4,-8,6.8,16,1.4,'#FF3B47');R(c,-8,-3.4,16,6.8,1.4,'#FF3B47');HL(c,-11,-9,14,3);c.restore()}
function drawCrate(c,x,y,t){const bob=Math.sin(t/340+y)*2;c.save();c.translate(x,y+bob);LW=2.4;c.fillStyle='#0003';c.beginPath();c.ellipse(0,18-bob,16,4,0,0,TAU);c.fill();
  c.globalCompositeOperation='lighter';c.fillStyle=`rgba(255,197,49,${.18+Math.sin(t/200)*.1})`;c.beginPath();c.arc(0,0,26,0,TAU);c.fill();c.globalCompositeOperation='source-over';
  R(c,-15,-15,30,30,3,'#C98B4E');c.strokeStyle='#8B5A2B';c.lineWidth=2;c.beginPath();c.moveTo(-13,-13);c.lineTo(13,13);c.moveTo(13,-13);c.lineTo(-13,13);c.stroke();R(c,-15,-15,30,30,3,'#00000000');
  c.font='18px "Lilita One",sans-serif';c.textAlign='center';c.textBaseline='middle';c.lineWidth=4;c.strokeStyle=INK;c.strokeText('?',0,1);c.fillStyle='#FFC531';c.fillText('?',0,1);c.restore()}
function drawFlag(c,x,y,col,t,carried){c.save();c.translate(x,y);LW=2.4;if(!carried){c.fillStyle='#0003';c.beginPath();c.ellipse(0,24,12,4,0,0,TAU);c.fill();c.globalCompositeOperation='lighter';c.fillStyle=col+'44';c.beginPath();c.arc(0,4,30+Math.sin(t/200)*3,0,TAU);c.fill();c.globalCompositeOperation='source-over'}
  R(c,-2,-34,4,58,2,'#8A93A6');const w=Math.sin(t/120);c.beginPath();c.moveTo(2,-34);c.quadraticCurveTo(14,-38+w*3,28,-32+w*2);c.lineTo(28,-14+w*2);c.quadraticCurveTo(14,-20+w*3,2,-16);c.closePath();K(c,col);
  // silhueta de capivara no pano
  c.fillStyle='#ffffffcc';c.beginPath();c.ellipse(14,-24+w*2,6,4.4,0,0,TAU);c.fill();c.beginPath();c.ellipse(19,-25+w*2,3,2.4,0,0,TAU);c.fill();C(c,0,-36,3.4,'#FFC531');c.restore()}
function drawZone(c,z,t,col){c.save();c.translate(z.x,z.y);const r=z.r;const gr=c.createRadialGradient(0,0,r*.2,0,0,r);gr.addColorStop(0,'#4FC3E888');gr.addColorStop(1,'#2E8FBF55');c.fillStyle=gr;c.beginPath();c.ellipse(0,0,r,r*.92,0,0,TAU);c.fill();
  c.strokeStyle=col||'#FFF4E0';c.lineWidth=6;c.setLineDash([24,14]);c.lineDashOffset=-t/30;c.stroke();c.setLineDash([]);c.strokeStyle='#ffffff55';c.lineWidth=2;for(let i=0;i<3;i++){const k=((t/1400+i/3)%1);c.globalAlpha=1-k;c.beginPath();c.ellipse(0,0,r*k,r*k*.92,0,0,TAU);c.stroke()}c.globalAlpha=1;
  for(const [x,y] of [[-r*.7,-r*.4],[r*.6,r*.5],[-r*.3,r*.6]]){c.fillStyle='#3DBE6C';c.beginPath();c.ellipse(x,y,10,6,.4,0,TAU);c.fill()}c.restore()}
function drawBuild(c,b,t,owned){c.save();LW=2.4;const k=b.hp/b.max;
  if(b.k==='wall'){c.translate(b.x,b.y);const w=b.w,h=b.h;R(c,-w/2,-h/2+6,w,h,3,'#8E3520');R(c,-w/2,-h/2,w,h,3,'#D2603F');c.strokeStyle='#F2E6D4aa';c.lineWidth=1.4;const vert=h>w;
    for(let i=1;i<(vert?h:w)/14;i++){c.beginPath();if(vert){c.moveTo(-w/2,-h/2+i*14);c.lineTo(w/2,-h/2+i*14)}else{c.moveTo(-w/2+i*14,-h/2);c.lineTo(-w/2+i*14,h/2)}c.stroke()}}
  else if(b.k==='box'){c.translate(b.x,b.y);R(c,-b.w/2,-b.h/2+5,b.w,b.h,3,'#8B5A2B');R(c,-b.w/2,-b.h/2,b.w,b.h,3,'#C9A06A');R(c,-5,-b.h/2,10,b.h,0,'#E8D3A8');c.strokeStyle=INK;c.lineWidth=2;c.strokeRect(-b.w/2,-b.h/2,b.w,b.h)}
  else if(b.k==='bubble'){c.translate(b.x,b.y);c.globalAlpha=.28+.1*Math.sin(t/200);const gr=c.createRadialGradient(-20,-20,5,0,0,b.r);gr.addColorStop(0,'#fff');gr.addColorStop(1,b.col||'#45D4FF');c.fillStyle=gr;c.beginPath();c.arc(0,0,b.r,0,TAU);c.fill();c.globalAlpha=.9;c.strokeStyle=b.col||'#45D4FF';c.lineWidth=3;c.stroke();c.globalAlpha=1}
  else if(b.k==='turret'){c.translate(b.x,b.y);LN(c,[[0,4],[-12,18]],INK,3.4);LN(c,[[0,4],[12,18]],INK,3.4);c.rotate(b.aim||0);R(c,-11,-9,22,18,6,'#5B6B80');R(c,8,-4,22,8,3,'#3A3A46');C(c,-2,0,3.4,b.col||'#FF8A1F')}
  c.restore();if(k<1&&b.k!=='bubble'){c.save();c.fillStyle='#12082b';rr(c,b.x-18,b.y-(b.h||30)/2-14,36,5,2);c.fill();c.fillStyle='#FFC531';rr(c,b.x-18,b.y-(b.h||30)/2-14,36*k,5,2);c.fill();c.restore()}}
function drawField(c,f,t,ht){c.save();c.translate(f.x,f.y);const age=(ht-f.start)/1000;
  if(f.k==='time'){c.globalAlpha=.32;const gr=c.createRadialGradient(0,0,10,0,0,f.r);gr.addColorStop(0,'#E9F6FF');gr.addColorStop(1,'#6FA8FF');c.fillStyle=gr;c.beginPath();c.arc(0,0,f.r,0,TAU);c.fill();c.globalAlpha=1;
    c.strokeStyle='#C9E8FF';c.lineWidth=3;c.setLineDash([10,8]);c.beginPath();c.arc(0,0,f.r,0,TAU);c.stroke();c.setLineDash([]);c.save();c.globalAlpha=.6;for(let i=0;i<12;i++){const a=i/12*TAU;LN(c,[[Math.cos(a)*(f.r-14),Math.sin(a)*(f.r-14)],[Math.cos(a)*(f.r-4),Math.sin(a)*(f.r-4)]],'#fff',3)}
    c.rotate(age*.6);LN(c,[[0,0],[0,-f.r*.6]],'#ffffffaa',5);c.restore()}
  if(f.k==='hole'){c.rotate(age*4);for(let i=0;i<3;i++){c.strokeStyle=['#8E5BFF','#C38BFF','#45D4FF'][i];c.globalAlpha=.5;c.lineWidth=4;c.beginPath();c.ellipse(0,0,f.r*(.3+i*.2),f.r*(.12+i*.07),i,0,TAU);c.stroke()}c.globalAlpha=1;C(c,0,0,20+Math.sin(t/60)*3,'#05030C')}
  if(f.k==='meteor'||f.k==='stamp'){const k=clamp(age*1000/f.delay,0,1);c.strokeStyle='#FF3B47';c.lineWidth=4;c.setLineDash([12,10]);c.lineDashOffset=-t/20;c.beginPath();c.arc(0,0,f.r,0,TAU);c.stroke();c.setLineDash([]);c.fillStyle=`rgba(255,59,71,${.12+k*.25})`;c.beginPath();c.arc(0,0,f.r*k,0,TAU);c.fill();
    if(f.k==='meteor'){c.save();c.translate(-160*(1-k),-420*(1-k));c.scale(2.4,2.4);drawItem(c,'meteor',t);c.restore()}else{c.save();c.translate(0,-300*(1-k));c.scale(3,3);LW=2;R(c,-14,-5,28,10,3,'#E8443A');R(c,-3,-16,6,11,2,'#8B5A2B');C(c,0,-20,5,'#8B5A2B');c.restore()}}
  c.restore()}

// ---------- Arena por mapa ----------
let floorPattern=null,floorFor='';
function buildTile(M){const tile=document.createElement('canvas');tile.width=tile.height=128;const x=tile.getContext('2d'),p=M.pal;x.fillStyle=p.a;x.fillRect(0,0,128,128);
  if(M.style==='grass'){x.fillStyle=p.b;x.fillRect(0,0,64,64);x.fillRect(64,64,64,64);x.strokeStyle=p.line;x.lineWidth=2;for(let i=0;i<14;i++){const a=(i*37)%128,b=(i*71)%128;x.beginPath();x.moveTo(a,b);x.lineTo(a+2,b-6);x.moveTo(a+4,b);x.lineTo(a+5,b-5);x.stroke()}}
  else if(M.style==='brick'){x.fillStyle=p.b;for(let j=0;j<4;j++)for(let i=0;i<3;i++){rr(x,(i*48+(j%2)*24)%128-4,j*32+3,44,26,4);x.fill()}}
  else if(M.style==='neon'){x.strokeStyle=p.line;x.lineWidth=2;x.strokeRect(1,1,126,126);x.strokeStyle='#ffffff08';x.beginPath();x.moveTo(64,0);x.lineTo(64,128);x.moveTo(0,64);x.lineTo(128,64);x.stroke()}
  else if(M.style==='night'){x.fillStyle=p.b;x.fillRect(0,0,64,64);x.fillRect(64,64,64,64);x.fillStyle='#ffffff08';for(let i=0;i<10;i++){x.beginPath();x.arc((i*53)%128,(i*29)%128,1.4,0,TAU);x.fill()}}
  else if(M.style==='sand'||M.style==='beach'){x.fillStyle=p.b;for(let i=0;i<40;i++){x.beginPath();x.arc((i*53)%128,(i*97)%128,1.6,0,TAU);x.fill()}x.strokeStyle=p.line;x.lineWidth=2;x.beginPath();x.moveTo(0,40);x.quadraticCurveTo(32,30,64,40);x.quadraticCurveTo(96,50,128,40);x.stroke()}
  return tile}
const DECALS=[];
function prepMap(M){floorPattern=null;floorFor=M.id+'?';DECALS.length=0;const Rn=mulberry(M.id.length*67+M.id.charCodeAt(0));for(let i=0;i<60;i++){const x=Rn()*W,y=Rn()*H;if(M.walls.some(([wx,wy,ww,wh])=>x>wx-30&&x<wx+ww+30&&y>wy-30&&y<wy+wh+30))continue;DECALS.push({x,y,k:Math.floor(Rn()*4),r:8+Rn()*14,rot:Rn()*6,c:pick2(M.pal.deco,Rn)})}}
const pick2=(a,Rn)=>a[Math.floor(Rn()*a.length)];
function drawArena(c,cam,VW,VH,M,t){if(floorFor!==M.id){if(floorFor!==M.id+'?')prepMap(M);floorPattern=c.createPattern(buildTile(M),'repeat');floorFor=M.id}const p=M.pal;
  c.fillStyle=p.bg;c.fillRect(cam.x-40,cam.y-40,VW+80,VH+80);
  if(M.style==='beach'){c.fillStyle='#ffffff30';for(let i=0;i<6;i++){const y=((t/40+i*80)%480)-240;c.fillRect(cam.x-40,cam.y+VH/2+y*2,VW+80,3)}}
  c.fillStyle=floorPattern;c.fillRect(Math.max(0,cam.x-2),Math.max(0,cam.y-2),Math.min(W,cam.x+VW+4)-Math.max(0,cam.x-2),Math.min(H,cam.y+VH+4)-Math.max(0,cam.y-2));
  // marca central
  c.save();c.translate(W/2,H/2);c.globalAlpha=M.theme==='dark'?.18:.22;c.strokeStyle=M.theme==='dark'?'#FFFFFF':'#FFFFFF';c.lineWidth=8;c.setLineDash([30,22]);c.beginPath();c.arc(0,0,300,0,TAU);c.stroke();c.setLineDash([]);
  c.font='300px "Lilita One",sans-serif';c.textAlign='center';c.textBaseline='middle';c.fillStyle=M.theme==='dark'?'#ffffff':'#ffffff';c.globalAlpha=.12;c.fillText('CAPY',0,0);c.restore();
  for(const d of DECALS){if(d.x<cam.x-60||d.x>cam.x+VW+60||d.y<cam.y-60||d.y>cam.y+VH+60)continue;c.save();c.translate(d.x,d.y);c.rotate(d.rot);c.globalAlpha=M.theme==='dark'?.5:.6;c.fillStyle=d.c;
    if(d.k===0){for(let i=0;i<5;i++){const a=i/5*TAU;c.beginPath();c.arc(Math.cos(a)*d.r*.4,Math.sin(a)*d.r*.4,d.r*.35,0,TAU);c.fill()}c.fillStyle='#FFC531';c.beginPath();c.arc(0,0,d.r*.2,0,TAU);c.fill()}
    else if(d.k===1){c.fillStyle=M.theme==='dark'?'#2E5A3A':'#5E9A3E';for(let i=0;i<3;i++){c.beginPath();c.ellipse(i*5-5,0,3,d.r*.7,(i-1)*.3,0,TAU);c.fill()}}
    else if(d.k===2){c.globalAlpha=.3;c.beginPath();c.ellipse(0,0,d.r*1.4,d.r*.8,0,0,TAU);c.fill()}
    else{c.globalAlpha=.25;star(c,0,0,d.r,d.r*.45,5);c.fill()}c.restore()}
  // borda
  c.save();c.lineWidth=28;const edge=M.theme==='dark'?(p.glow||'#45D4FF'):'#FFF4E0',edge2=M.theme==='dark'?'#0A0718':'#D2603F';
  const side=(x1,y1,x2,y2)=>{c.strokeStyle=edge2;c.setLineDash([]);c.beginPath();c.moveTo(x1,y1);c.lineTo(x2,y2);c.stroke();c.strokeStyle=edge;c.setLineDash([26,26]);c.stroke();c.setLineDash([])};
  side(-14,-14,W+14,-14);side(W+14,-14,W+14,H+14);side(W+14,H+14,-14,H+14);side(-14,H+14,-14,-14);c.strokeStyle=INK;c.lineWidth=4;c.strokeRect(-28,-28,W+56,H+56);c.strokeRect(0,0,W,H);c.restore()}
function drawWalls(c,M,cam,VW,VH,t){const p=M.pal;for(const [x,y,w,h] of M.walls){if(x>cam.x+VW+20||x+w<cam.x-20||y>cam.y+VH+30||y+h<cam.y-30)continue;LW=3;
  if(M.style==='neon'){c.save();c.shadowColor=p.glow;c.shadowBlur=18;c.fillStyle=p.wallTop;rr(c,x,y,w,h,8);c.fill();c.strokeStyle=(x<W/2)?p.glow:p.glow2;c.lineWidth=3;c.stroke();c.restore();c.strokeStyle='#ffffff22';c.lineWidth=1.5;c.strokeRect(x+8,y+8,w-16,h-16);continue}
  R(c,x,y+10,w,h,8,p.wallSide);R(c,x,y,w,h,8,p.wallTop);
  c.save();rr(c,x,y,w,h,8);c.clip();
  if(M.style==='brick'){c.strokeStyle='#F2E6D466';c.lineWidth=1.6;for(let j=0;j<h/14;j++){c.beginPath();c.moveTo(x,y+j*14);c.lineTo(x+w,y+j*14);c.stroke();for(let i=0;i<w/28;i++){const xx=x+i*28+(j%2)*14;c.beginPath();c.moveTo(xx,y+j*14);c.lineTo(xx,y+j*14+14);c.stroke()}}}
  else if(M.style==='grass'){c.fillStyle='#5E9A3E';rr(c,x+5,y+5,w-10,h-10,6);c.fill();c.fillStyle='#FF8FAB';for(let i=0;i<(w*h)/1800;i++){const Rn=mulberry(x*7+y+i);c.beginPath();c.arc(x+10+Rn()*(w-20),y+10+Rn()*(h-20),3,0,TAU);c.fill()}}
  else if(M.style==='night'){c.fillStyle='#2E4A2A';for(let i=0;i<w;i+=10){c.beginPath();c.ellipse(x+i+5,y+h*.5,4,h*.45,0,0,TAU);c.fill()}}
  else{c.fillStyle='#ffffff22';c.fillRect(x,y,w,5)}
  c.restore()}}
// Escuridão para mapas escuros
let darkCv=null;
function drawDarkness(c,M,cam,VW,VH,lights,k){if(M.theme!=='dark')return;if(!darkCv)darkCv=document.createElement('canvas');const w=Math.ceil(VW/2),h=Math.ceil(VH/2);if(darkCv.width!==w||darkCv.height!==h){darkCv.width=w;darkCv.height=h}
  const d=darkCv.getContext('2d');d.globalCompositeOperation='source-over';d.clearRect(0,0,w,h);d.fillStyle=M.id==='neon'?'rgba(8,4,20,.5)':'rgba(4,6,18,.68)';d.fillRect(0,0,w,h);d.globalCompositeOperation='destination-out';
  for(const [x,y,r] of lights){const sx=(x-cam.x)/2,sy=(y-cam.y)/2,rr2=r/2;if(sx<-rr2||sy<-rr2||sx>w+rr2||sy>h+rr2)continue;const g=d.createRadialGradient(sx,sy,0,sx,sy,rr2);g.addColorStop(0,'rgba(0,0,0,1)');g.addColorStop(.6,'rgba(0,0,0,.7)');g.addColorStop(1,'rgba(0,0,0,0)');d.fillStyle=g;d.beginPath();d.arc(sx,sy,rr2,0,TAU);d.fill()}
  c.drawImage(darkCv,cam.x,cam.y,VW,VH)}
function drawMapThumb(cv,M){const c=cv.getContext('2d'),w=cv.width,h=cv.height,sx=w/W,sy=h/H;c.setTransform(1,0,0,1,0,0);c.fillStyle=M.pal.a;c.fillRect(0,0,w,h);c.fillStyle=M.pal.b;for(let i=0;i<w;i+=16)for(let j=0;j<h;j+=16)if((i+j)/16%2===0)c.fillRect(i,j,16,16);
  c.fillStyle=M.style==='neon'?M.pal.glow:M.pal.wallTop;c.strokeStyle=INK;c.lineWidth=1.5;for(const [x,y,ww,hh] of M.walls){c.fillRect(x*sx,y*sy,ww*sx,hh*sy);c.strokeRect(x*sx,y*sy,ww*sx,hh*sy)}
  for(const [i,[x,y]] of M.bases.entries()){c.fillStyle=TEAM[i].c;c.beginPath();c.arc(x*sx,y*sy,5,0,TAU);c.fill();c.stroke()}if(M.theme==='dark'){c.fillStyle='#0006';c.fillRect(0,0,w,h)}}
