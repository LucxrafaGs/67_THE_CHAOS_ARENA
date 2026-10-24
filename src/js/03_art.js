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
    E(c,6,0,4.6,4,0,body);c.restore()}
  c.restore()}

// ---------- Ícone de arma (DOM): o próprio modelo 3D low poly da arma (03_guns3d.js), renderizado uma vez ----------
const iconCache=new Map();
function drawWeaponIcon(cv,gi,bg=true){const c=cv.getContext('2d'),W0=cv.width,H0=cv.height,g=GUNS[gi];if(!g)return;c.setTransform(1,0,0,1,0,0);c.clearRect(0,0,W0,H0);
  const tc=TIERS[g.tier][1];
  if(bg){const gr=c.createRadialGradient(W0/2,H0*.6,4,W0/2,H0/2,W0*.65);gr.addColorStop(0,shade(tc,-.45));gr.addColorStop(1,'#241339');c.fillStyle=gr;c.fillRect(0,0,W0,H0);
    c.strokeStyle='#ffffff10';c.lineWidth=W0/40;for(let i=-H0;i<W0;i+=W0/8){c.beginPath();c.moveTo(i,H0);c.lineTo(i+H0,0);c.stroke()}}
  c.fillStyle='#0004';c.beginPath();c.ellipse(W0/2,H0*.84,W0*.34,H0*.06,0,0,TAU);c.fill();
  const im=Map3D.gunIcon(gi,W0,H0);if(im)c.drawImage(im,0,0,W0,H0);else if(!cv._iconWait){cv._iconWait=1;setTimeout(()=>{cv._iconWait=0;drawWeaponIcon(cv,gi,bg)},120)}}
function iconURL(gi,w=132,h=84){const k=gi+'_'+w;if(iconCache.has(k))return iconCache.get(k);const im=Map3D.gunIcon(gi,w,h);if(!im)return'';const u=im.toDataURL();iconCache.set(k,u);return u}

// ---------- Objetos do chão (bandeira, zona) — tiros, itens e coletáveis agora são 3D (03_fx3d.js) ----------
function drawFlag(c,x,y,col,t,carried){c.save();c.translate(x,y);if(SQ!==1)c.scale(1,1/SQ);LW=2.4;if(!carried){c.fillStyle='#0003';c.beginPath();c.ellipse(0,24,12,4,0,0,TAU);c.fill();c.globalCompositeOperation='lighter';c.fillStyle=col+'44';c.beginPath();c.arc(0,4,30+Math.sin(t/200)*3,0,TAU);c.fill();c.globalCompositeOperation='source-over'}
  R(c,-2,-34,4,58,2,'#8A93A6');const w=Math.sin(t/120);c.beginPath();c.moveTo(2,-34);c.quadraticCurveTo(14,-38+w*3,28,-32+w*2);c.lineTo(28,-14+w*2);c.quadraticCurveTo(14,-20+w*3,2,-16);c.closePath();K(c,col);
  // silhueta de capivara no pano
  c.fillStyle='#ffffffcc';c.beginPath();c.ellipse(14,-24+w*2,6,4.4,0,0,TAU);c.fill();c.beginPath();c.ellipse(19,-25+w*2,3,2.4,0,0,TAU);c.fill();C(c,0,-36,3.4,'#FFC531');c.restore()}
function drawZone(c,z,t,col){c.save();c.translate(z.x,z.y);const r=z.r;const gr=c.createRadialGradient(0,0,r*.2,0,0,r);gr.addColorStop(0,'#4FC3E888');gr.addColorStop(1,'#2E8FBF55');c.fillStyle=gr;c.beginPath();c.ellipse(0,0,r,r*.92,0,0,TAU);c.fill();
  c.strokeStyle=col||'#FFF4E0';c.lineWidth=6;c.setLineDash([24,14]);c.lineDashOffset=-t/30;c.stroke();c.setLineDash([]);c.strokeStyle='#ffffff55';c.lineWidth=2;for(let i=0;i<3;i++){const k=((t/1400+i/3)%1);c.globalAlpha=1-k;c.beginPath();c.ellipse(0,0,r*k,r*k*.92,0,0,TAU);c.stroke()}c.globalAlpha=1;
  for(const [x,y] of [[-r*.7,-r*.4],[r*.6,r*.5],[-r*.3,r*.6]]){c.fillStyle='#3DBE6C';c.beginPath();c.ellipse(x,y,10,6,.4,0,TAU);c.fill()}c.restore()}
function drawBuild(c,b,t,owned){c.save();LW=2.4;const k=b.hp/b.max;
  if(b.k==='wall'||b.k==='box'){} // parede e caixa são blocos 3D (03_map3d.js); aqui fica só a barra de vida
  else if(b.k==='bubble'){c.translate(b.x,b.y);c.globalAlpha=.28+.1*Math.sin(t/200);const gr=c.createRadialGradient(-20,-20,5,0,0,b.r);gr.addColorStop(0,'#fff');gr.addColorStop(1,b.col||'#45D4FF');c.fillStyle=gr;c.beginPath();c.arc(0,0,b.r,0,TAU);c.fill();c.globalAlpha=.9;c.strokeStyle=b.col||'#45D4FF';c.lineWidth=3;c.stroke();c.globalAlpha=1}
  else if(b.k==='turret'){c.translate(b.x,b.y);if(SQ!==1)c.scale(1,1/SQ);LN(c,[[0,4],[-12,18]],INK,3.4);LN(c,[[0,4],[12,18]],INK,3.4);c.rotate(b.aim||0);R(c,-11,-9,22,18,6,'#5B6B80');R(c,8,-4,22,8,3,'#3A3A46');C(c,-2,0,3.4,b.col||'#FF8A1F')}
  c.restore();if(k<1&&b.k!=='bubble'){c.save();c.fillStyle='#12082b';rr(c,b.x-18,b.y-(b.h||30)/2-14,36,5,2);c.fill();c.fillStyle='#FFC531';rr(c,b.x-18,b.y-(b.h||30)/2-14,36*k,5,2);c.fill();c.restore()}}
function drawField(c,f,t,ht){c.save();c.translate(f.x,f.y);const age=(ht-f.start)/1000;
  if(f.k==='time'){c.globalAlpha=.32;const gr=c.createRadialGradient(0,0,10,0,0,f.r);gr.addColorStop(0,'#E9F6FF');gr.addColorStop(1,'#6FA8FF');c.fillStyle=gr;c.beginPath();c.arc(0,0,f.r,0,TAU);c.fill();c.globalAlpha=1;
    c.strokeStyle='#C9E8FF';c.lineWidth=3;c.setLineDash([10,8]);c.beginPath();c.arc(0,0,f.r,0,TAU);c.stroke();c.setLineDash([]);c.save();c.globalAlpha=.6;for(let i=0;i<12;i++){const a=i/12*TAU;LN(c,[[Math.cos(a)*(f.r-14),Math.sin(a)*(f.r-14)],[Math.cos(a)*(f.r-4),Math.sin(a)*(f.r-4)]],'#fff',3)}
    c.rotate(age*.6);LN(c,[[0,0],[0,-f.r*.6]],'#ffffffaa',5);c.restore()}
  if(f.k==='hole'){c.rotate(age*4);for(let i=0;i<3;i++){c.strokeStyle=['#8E5BFF','#C38BFF','#45D4FF'][i];c.globalAlpha=.5;c.lineWidth=4;c.beginPath();c.ellipse(0,0,f.r*(.3+i*.2),f.r*(.12+i*.07),i,0,TAU);c.stroke()}c.globalAlpha=1}
  if(f.k==='meteor'||f.k==='stamp'){const k=clamp(age*1000/f.delay,0,1);c.strokeStyle='#FF3B47';c.lineWidth=4;c.setLineDash([12,10]);c.lineDashOffset=-t/20;c.beginPath();c.arc(0,0,f.r,0,TAU);c.stroke();c.setLineDash([]);c.fillStyle=`rgba(255,59,71,${.12+k*.25})`;c.beginPath();c.arc(0,0,f.r*k,0,TAU);c.fill();
    } // o meteoro e o carimbo caindo são 3D (03_fx3d.js)
  c.restore()}

// Escuridão para mapas escuros
let darkCv=null;
// escurece só o que foi desenhado no canvas por cima (tiros, efeitos); o cenário 3D se escurece sozinho no shader
function drawDarkness(c,M,cam,VW,VH,lights){if(M.theme!=='dark')return;if(!darkCv)darkCv=document.createElement('canvas');const w=Math.ceil(VW/2),h=Math.ceil(VH/2);if(darkCv.width!==w||darkCv.height!==h){darkCv.width=w;darkCv.height=h}
  const d=darkCv.getContext('2d');d.globalCompositeOperation='source-over';d.clearRect(0,0,w,h);d.fillStyle=M.id==='neon'?'rgba(8,4,20,.5)':'rgba(4,6,18,.68)';d.fillRect(0,0,w,h);d.globalCompositeOperation='destination-out';
  for(const [x,y,r] of lights){const sx=(x-cam.x)/2,sy=(y-cam.y)/2,rr2=r/2;if(sx<-rr2||sy<-rr2||sx>w+rr2||sy>h+rr2)continue;const g=d.createRadialGradient(sx,sy,0,sx,sy,rr2);g.addColorStop(0,'rgba(0,0,0,1)');g.addColorStop(.6,'rgba(0,0,0,.7)');g.addColorStop(1,'rgba(0,0,0,0)');d.fillStyle=g;d.beginPath();d.arc(sx,sy,rr2,0,TAU);d.fill()}
  c.save();c.globalCompositeOperation='source-atop';c.drawImage(darkCv,cam.x,cam.y,VW,VH);c.restore()}
// miniatura do mapa = foto do mapa 3D (public/thumbs/<id>.jpg) + as bases dos times
const thumbImg={};
function drawMapThumb(cv,M){const c=cv.getContext('2d'),w=cv.width,h=cv.height;c.setTransform(1,0,0,1,0,0);let im=thumbImg[M.id];
  if(!im){im=thumbImg[M.id]=new Image();im.src='thumbs/'+M.id+'.jpg'}
  if(!im.complete||!im.naturalWidth){c.fillStyle=M.pal.a;c.fillRect(0,0,w,h);im.addEventListener('load',()=>drawMapThumb(cv,M),{once:true});return}
  const s=Math.max(w/im.naturalWidth,h/im.naturalHeight),dw=im.naturalWidth*s,dh=im.naturalHeight*s;c.drawImage(im,(w-dw)/2,(h-dh)/2,dw,dh)}
