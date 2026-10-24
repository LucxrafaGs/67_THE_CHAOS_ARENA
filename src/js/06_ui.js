// ===== Interface: telas, personalização, HUD, overlays e controles =====
const I=(n,c='')=>`<svg class="i ${c}"><use href="#i-${n}"/></svg>`;
let myLook=cleanLook(store.get('look',defaultLook(1)));
const myNick=()=>safe($('nick').value||store.get('nick','')||pick(NICKS));
let view='home',hudGun=-1;
const SCREENS=['home','custom','fundo','play','setup','online','lobby','arsenal','bye','result'];
// abas do menu (todas são "dentro" da tela inicial: a capivara desliza para o lado e o painel entra pela direita)
const NAVV=['home','custom','arsenal','fundo'],MENUV=['home','custom','arsenal','fundo','setup','online'];
function go(v){const prev=view;view=v;for(const s of SCREENS)$(s).classList.toggle('hidden',s!==v);
  const inGame=v==='game';$('hud').classList.toggle('hidden',!inGame);$('touch').classList.toggle('hidden',!inGame);document.body.classList.toggle('menu',!inGame);
  const inMenu=MENUV.includes(v);$('mnav').classList.toggle('hidden',!inMenu);$('mtop').classList.toggle('hidden',!inMenu);$('mnav').querySelectorAll('[data-nav]').forEach(b=>b.classList.toggle('on',b.dataset.nav===v));
  document.body.classList.toggle('mclear',inMenu);document.body.classList.toggle('mpanel',inMenu&&v!=='home');
  if(!inGame){$('death').classList.add('hidden');$('pause').classList.add('hidden');$('scoreOv').classList.add('hidden');$('perkOv').classList.add('hidden')}
  if(inMenu)renderTop();
  if(v==='home')renderHome();if(v==='play')drawPlayArt();if(v==='custom')openCustom();if(v==='fundo')renderBgs();if(v==='lobby'){lobbyKey='';renderLobby();lobbyAnim()}if(v==='setup'){renderSetup($('setupPanel'),true);setupSub()}if(v==='arsenal')renderArsenal();
  if(v==='online'){$('nick').value=store.get('nick','');enterOnline();if(OFFLINE)setTimeout(()=>setNet('O online está desligado por enquanto (modo local). Por enquanto, jogue contra os bots!','err'),60)}
  Sound.music(true,inGame?140:100)}
function goHome(){leaveNet();players={};bullets=[];effects=[];started=false;over=false;paused=false;stopDemo();FX3D.clear();$('result').classList.add('hidden');go('home')}
// o que o menu 3D precisa saber (05_render.js > frame)
let menuDrag=false,arsSel=0;
const menuView=()=>view==='home'?'home':(view==='setup'||view==='online')?'wide':'side';
const menuFur=()=>view==='custom'&&draftFur?draftFur:myLook.body;
const menuGun=()=>view==='arsenal'?arsSel:-1;
let curBg=store.get('menubg','lagoa');const menuBgKey=()=>curBg;

// ---------- Retratos: a própria capivara 3D (cabeça ou corpo todo) ----------
function drawPortrait(cv,L,o={}){const c=cv.getContext('2d'),w=cv.width,h=cv.height;c.setTransform(1,0,0,1,0,0);c.clearRect(0,0,w,h);
  if(o.bg!==false){const g=c.createRadialGradient(w/2,h*.7,4,w/2,h/2,w*.7);g.addColorStop(0,'#8A62D8');g.addColorStop(1,'#2B1B5A');c.fillStyle=g;c.fillRect(0,0,w,h)}
  const hex=o.bot?'#E2C48C':(L&&L.body)||'#B07A4A',im=Map3D.capyIcon(hex,w,h,o.full?'full':'head');
  if(im){c.drawImage(im,0,0,w,h);return}
  if(!cv._pw){cv._pw=1;setTimeout(()=>{cv._pw=0;drawPortrait(cv,L,o)},300)}}
function drawSpheres(){document.querySelectorAll('.sphere canvas').forEach(cv=>drawPortrait(cv,myLook,{bg:false}));const a=$('avaCv');if(a)drawPortrait(a,myLook,{bg:false});const k=$('knobFace');if(k)drawPortrait(k,myLook,{bg:false})}

// ---------- Progresso: XP, temporada, desafios do dia (tudo guardado no navegador) ----------
const dayKey=()=>{const d=new Date();return d.getFullYear()+'-'+(d.getMonth()+1)+'-'+d.getDate()};
function daily(){let d=store.get('daily',null);if(!d||d.d!==dayKey())d={d:dayKey(),gems:0,kills:0,games:0,wins:0};return d}
function bump(k,n=1){const d=daily();d[k]=(d[k]||0)+n;store.set('daily',d);const st=store.get('stats',{kills:0,games:0,wins:0});if(k!=='gems'){st[k]=(st[k]||0)+n;store.set('stats',st)}}
function xpInfo(){const st=store.get('stats',{kills:0,games:0,wins:0}),xp=store.get('totalGems',0)+st.kills*10+st.games*25+st.wins*60;let lv=1,need=100,acc=0;while(xp>=acc+need){acc+=need;lv++;need=Math.round(need*1.18)}return{xp,lv,cur:xp-acc,need,st}}
const SEASON=['Capivara Novata','Capivara Curiosa','Capivara Valente','Capivara Caótica','Capivara Lendária','Capivara 67'];
const CHAL=[['orange','Junte 67 laranjinhas','gems',67,40],['skull','Elimine 10 capivaras','kills',10,50],['play','Jogue 3 partidas','games',3,60]];
function renderTop(){drawSpheres();const x=xpInfo();
  $('homeNick').textContent=store.get('nick','')||'Capivara';$('avaLv').textContent=x.lv;$('xpFill').style.width=(x.cur/x.need*100)+'%';$('xpTxt').textContent=`${x.cur} / ${x.need} XP`;
  $('totalGems').textContent=store.get('totalGems',0);$('totWins').textContent=x.st.wins||0}
function renderHome(){const x=xpInfo(),d=daily();
  const sl=Math.floor((x.lv-1)/3);$('seaLv').textContent=x.lv;$('seaName').textContent=SEASON[Math.min(SEASON.length-1,sl)];$('seaFill').style.width=(((x.lv-1)%3)+x.cur/x.need)/3*100+'%';
  $('chalList').innerHTML=CHAL.map(([ic,n,k,goal,xp])=>{const v=Math.min(goal,d[k]||0),done=v>=goal;return `<div class="m-ch${done?' done':''}"><span class="m-chic">${I(done?'check':ic)}</span><div class="m-chtx"><b>${n}</b><div class="m-bar"><i style="width:${v/goal*100}%"></i></div></div><span class="m-chv">${v}/${goal}</span><span class="m-chxp">+${xp}<small>XP</small></span></div>`}).join('');
  const now=new Date(),mid=new Date(now);mid.setHours(24,0,0,0);const hh=Math.floor((mid-now)/36e5),mm=Math.floor((mid-now)%36e5/6e4);$('chalReset').textContent=`renova em ${hh}h ${mm}min`;
  const md=modeById(cfg.mode),mp=mapById(cfg.map);$('mcMode').textContent=md.n;$('mcMap').textContent=mp.n+' • '+cfg.bots+' bots';drawMapThumb($('mcThumb'),mp)}
function setupSub(){const md=modeById(cfg.mode),mp=mapById(cfg.map);$('setupSub').textContent=`${md.n} • ${mp.n}`}

// ---------- HOME ----------
let customFrom='home';
const playNow=()=>{Sound.play('boing');matchLoad('bots')};
$('btnPlay').onclick=()=>{Sound.play('click');go('online')};
$('btnSelector').onclick=()=>{Sound.play('click');go('setup')};
$('mapCard').onclick=()=>{Sound.play('click');go('setup')};
$('avaBtn').onclick=()=>{Sound.play('boing');go('custom')};
$('btnSettings').onclick=()=>{Sound.play('click');openSettings()};
$('btnQuit').onclick=async()=>{if(await confirmBox('Sair do Capy Boom?','Tem certeza? As capivaras vão sentir sua falta.','SAIR','FICAR')){try{window.close()}catch(e){}setTimeout(()=>go('bye'),150)}};
$('btnBack67').onclick=()=>go('home');
$('mnav').querySelectorAll('[data-nav]').forEach(b=>{if(b.dataset.nav!=='friends')b.onclick=()=>{if(view===b.dataset.nav)return;Sound.play('click');go(b.dataset.nav)}});
document.querySelectorAll('[data-back]').forEach(b=>b.onclick=()=>{Sound.play('click');if(view==='online'){go('home');return}go('home')});
// arrastar gira a capivara; um clique sem arrastar faz ela fazer uma gracinha
for(const id of ['home','custom','arsenal','fundo'])(()=>{const el=$(id);let x0=null,moved=0;
  el.addEventListener('pointerdown',e=>{if(e.target.closest('button,.m-panel,.m-season,.m-nav,input'))return;x0=e.clientX;moved=0;menuDrag=true;try{el.setPointerCapture(e.pointerId)}catch(_){}});
  el.addEventListener('pointermove',e=>{if(x0==null)return;const dx=e.clientX-x0;x0=e.clientX;moved+=Math.abs(dx);Map3D.menuSpin(dx)});
  const up=e=>{if(x0==null)return;x0=null;menuDrag=false;if(moved<6&&Math.abs(e.clientX-innerWidth*(id==='home'?.5:.3))<innerWidth*.16){Map3D.menuPoke();Sound.play('boing')}};
  el.addEventListener('pointerup',up);el.addEventListener('pointercancel',()=>{x0=null;menuDrag=false})})();
// atalhos do menu: Q/E trocam de aba, Enter joga, Tab monta a partida, G abre amigos
addEventListener('keydown',e=>{if(!MENUV.includes(view)||!$('mload').classList.contains('hidden')||bootOn)return;const tag=document.activeElement&&document.activeElement.tagName;if(tag==='INPUT'||tag==='TEXTAREA')return;
  if(!$('settings').classList.contains('hidden')||!$('modal').classList.contains('hidden')||(typeof socIsOpen==='function'&&socIsOpen()))return;const k=(e.key||'').toLowerCase();
  if(k==='q'||k==='e'){const i=Math.max(0,NAVV.indexOf(view)),n=NAVV[(i+(k==='e'?1:NAVV.length-1))%NAVV.length];Sound.play('click');go(n);return}
  if(k==='enter'){e.preventDefault();if(view==='setup')playNow();else if(view==='home')go('online');else go('home');return}
  if(k==='tab'&&view==='home'){e.preventDefault();go('setup');return}
  if(k==='escape'&&view==='home'){openSettings();return}if(k==='escape'){go('home');return}
  if(k==='g'&&document.body.classList.contains('social')){socOpen&&socOpen()}});

// ---------- VISUAL: cor da capivara ----------
const FURS=[['#B07A4A','Clássica'],['#C98B4E','Caramelo'],['#6B4129','Chocolate'],['#8E5A33','Canela'],['#D9B38C','Areia'],['#EDE6DC','Neve'],['#8A8790','Fumaça'],['#45404A','Carvão'],
  ['#E7A1B5','Algodão-doce'],['#A992D8','Lavanda'],['#8FD3B6','Menta'],['#8CC3EE','Céu'],['#D8E070','Limão'],['#FF9A3C','Tangerina'],['#D9485F','Cereja'],['#E8B84A','Ouro']];
let draftFur=null;
const furName=h=>(FURS.find(f=>f[0].toLowerCase()===String(h).toLowerCase())||[0,'Personalizada'])[1];
function openCustom(){draftFur=myLook.body;renderFurs()}
function renderFurs(){const g=$('furGrid');g.innerHTML=FURS.map(([h,n])=>`<button class="m-fur${h.toLowerCase()===String(draftFur).toLowerCase()?' on':''}" data-fur="${h}" title="${n}"><canvas width="112" height="112"></canvas><span style="--fc:${h}"></span><b>${n}</b></button>`).join('');
  g.querySelectorAll('[data-fur]').forEach(b=>{drawPortrait(b.querySelector('canvas'),{body:b.dataset.fur},{bg:false});b.onclick=()=>setFur(b.dataset.fur)});$('furName').textContent=furName(draftFur)}
function setFur(h){draftFur=h;myLook=cleanLook(Object.assign({},myLook,{body:h}));store.set('look',myLook);Sound.play('pop');Map3D.menuPoke();
  $('furGrid').querySelectorAll('[data-fur]').forEach(b=>b.classList.toggle('on',b.dataset.fur===h));$('furName').textContent=furName(h);drawSpheres();
  if(players[self]&&!started){players[self].look=myLook;if(host)sync(true);else if(conn)send(conn,{type:'look',look:myLook})}}
$('btnRandom').onclick=()=>{let h;do{h=pick(FURS)[0]}while(h===draftFur);setFur(h)};
$('btnSaveLook').onclick=()=>{Sound.play('level');toast('Visual salvo: '+furName(myLook.body)+'!','good');celebrate(40);go('home')};

// ---------- FUNDO do menu ----------
const BGS=[['lagoa','Lagoa Roxa','water'],['azul','Lagoa Azul','water'],['rosa','Lagoa Rosa','water'],['esmeralda','Lagoa Esmeralda','water'],['noite','Lagoa da Noite','water'],['sol','Pôr do Sol','water'],
  ['vangogh','A Capivara Estrelada','img'],['criacao','A Criação da Capivara','img'],['perola','Capivara com Brinco de Pérola','img'],['monalisa','Mona Capy','img']];
const ART={vangogh:'A Capivara Estrelada',criacao:'A Criação da Capivara',perola:'Capivara com Brinco de Pérola',monalisa:'Mona Capy'};
function applyMenuBg(){const k=menuBgKey(),b=BGS.find(x=>x[0]===k);const el=$('menuBg');if(b&&b[2]==='img'){el.style.backgroundImage=`url(loading/${k}.jpg)`;el.classList.add('on')}else{el.classList.remove('on')}}
function renderBgs(){const k=menuBgKey(),g=$('bgGrid');g.innerHTML=BGS.map(([id,n,t])=>{const c=Map3D.MBG[id];const st=t==='img'?`background-image:url(loading/${id}_p.jpg)`:`background:radial-gradient(ellipse at 50% 60%,${c[0]},${c[1]} 70%,${c[3]})`;
    return `<button class="m-bg${id===k?' on':''}" data-bg="${id}"><span class="m-bgpv" style="${st}">${t==='water'?'<i></i>':''}</span><b>${n}</b><small>${t==='img'?'Quadro':id==='lagoa'?'Com vitórias-régias':'Água'}</small></button>`}).join('');
  g.querySelectorAll('[data-bg]').forEach(b=>b.onclick=()=>{curBg=b.dataset.bg;store.set('menubg',curBg);Sound.play('pop');applyMenuBg();renderBgs();Map3D.menuPoke()});$('bgName').textContent=(BGS.find(x=>x[0]===k)||BGS[0])[1]}
applyMenuBg();

// ---------- ARSENAL (dentro do menu: a capivara segura a arma escolhida) ----------
let arsCat='all',arsTier='all';
function renderArsenal(){const f=$('arsFilters');f.innerHTML=`<div class="m-chips">${[['all','Todas'],...Object.entries(CATS).map(([k,v])=>[k,v[0]])].map(([k,n])=>`<button class="m-chip${arsCat===k?' on':''}" data-cat="${k}">${n}</button>`).join('')}</div>
  <div class="m-chips">${[['all','Todos os níveis'],...Object.entries(TIERS).map(([k,v])=>[k,v[0]])].map(([k,n])=>`<button class="m-chip tier${arsTier===k?' on':''}" data-tier="${k}" style="${k!=='all'?'--tc:'+TIERS[k][1]:''}">${n}</button>`).join('')}</div>`;
  f.querySelectorAll('[data-cat]').forEach(b=>b.onclick=()=>{arsCat=b.dataset.cat;Sound.play('click');renderArsenal()});f.querySelectorAll('[data-tier]').forEach(b=>b.onclick=()=>{arsTier=b.dataset.tier;Sound.play('click');renderArsenal()});
  const list=GUNS.filter(g=>(arsCat==='all'||g.cat===arsCat)&&(arsTier==='all'||g.tier===arsTier));$('arsCount').textContent=list.length===GUNS.length?GUNS.length+' armas':`${list.length}/${GUNS.length}`;
  if(list.length&&!list.some(g=>g.id===arsSel))arsSel=list[0].id;
  $('arsGrid').innerHTML=list.map(g=>`<button class="m-wpn${g.id===arsSel?' on':''}" data-g="${g.id}" style="--tc:${TIERS[g.tier][1]}" title="${escapeHtml(g.n)}"><canvas width="150" height="96"></canvas><b>${escapeHtml(g.n)}</b></button>`).join('');
  $('arsGrid').querySelectorAll('[data-g]').forEach(b=>{drawWeaponIcon(b.querySelector('canvas'),+b.dataset.g,false);b.onclick=()=>{arsSel=+b.dataset.g;Sound.play('pop');$('arsGrid').querySelectorAll('[data-g]').forEach(x=>x.classList.toggle('on',+x.dataset.g===arsSel));renderArsDetail()}});
  renderArsDetail()}
function renderArsDetail(){const g=GUNS[arsSel];if(!g){$('arsDetail').innerHTML='';return}const st=gunStats(g),[tn,tc]=TIERS[g.tier],[cn,cc]=CATS[g.cat];
  const bar=(l,v,c)=>`<div class="m-sb"><span>${l}</span><i><b style="width:${Math.round(v)}%;background:${c}"></b></i></div>`;
  $('arsDetail').innerHTML=`<div class="m-adhead"><div><small style="color:${cc}">${cn}</small><b>${escapeHtml(g.n)}</b></div><span class="m-tier" style="--tc:${tc}">${tn}</span></div><p>${escapeHtml(g.d)}</p>
    <div class="m-sbs">${g.heal?bar('Cura',g.heal*2,'#6CF06A'):bar('Dano',st.dano,'#FF4F9A')}${bar('Cadência',st.cad,'#45D4FF')}${bar('Alcance',st.alc,'#FFC531')}</div><div class="m-tags">${gunTags(g).map(t=>`<span>${t}</span>`).join('')}</div>`}

// ---------- JOGAR ----------
function drawPlayArt(){const a=$('artBots'),c=a.getContext('2d');c.setTransform(1,0,0,1,0,0);c.fillStyle='#8CC463';c.fillRect(0,0,640,400);c.fillStyle='#83BC5C';for(let i=0;i<8;i++)c.fillRect(i*80,0,40,400);
  const t=time();[[170,260,1],[330,240,-1],[480,270,-1]].forEach(([x,y,f],i)=>{c.save();c.translate(x,y);c.scale(3.8,3.8);drawChar(c,defaultLook(i),{face:f,bot:true,t:t+i*300,noGun:true});c.restore()});
  c.save();c.translate(320,80);c.font='60px "Lilita One"';c.textAlign='center';c.strokeStyle=INK;c.lineWidth=10;c.fillStyle='#FFC531';c.strokeText('TREINO',0,0);c.fillText('TREINO',0,0);c.restore();
  const b=$('artOnline'),d=b.getContext('2d');d.setTransform(1,0,0,1,0,0);d.fillStyle='#2B1B5A';d.fillRect(0,0,640,400);for(let i=0;i<40;i++){d.fillStyle='#fff8';d.fillRect((i*137)%640,(i*71)%200,3,3)}
  d.fillStyle='#45D4FF';d.strokeStyle=INK;d.lineWidth=8;d.beginPath();d.arc(320,540,310,0,TAU);d.fill();d.stroke();d.fillStyle='#6CF06A';for(const [x,y,r] of [[200,300,60],[420,280,50],[320,370,70]]){d.beginPath();d.arc(x,y,r,0,TAU);d.fill()}
  [[130,262,.3,0],[260,228,-.1,1],[390,226,.2,3],[520,262,-.3,5]].forEach(([x,y,r,s],i)=>{d.save();d.translate(x,y);d.rotate(r);d.scale(3.4,3.4);drawChar(d,defaultLook(s),{face:i<2?1:-1,t:t+i*200,noGun:true,shout:i%2});d.restore()});LW=2.2}
$('btnGoSetup').onclick=e=>{e.stopPropagation();Sound.play('click');go('setup')};
$('cardBots').onclick=()=>{Sound.play('click');go('setup')};
// modo local (04_net.js: OFFLINE): o online fica desligado por enquanto
const offlineMsg=()=>{Sound.play('no');toast('Modo online desligado por enquanto. Jogue contra os bots!','bad')};
if(OFFLINE)setTimeout(()=>{for(const id of ['btnQuick','btnHost','btnJoin'])$(id).onclick=offlineMsg},0);
$('btnGoOnline').onclick=e=>{e.stopPropagation();if(OFFLINE)return offlineMsg();Sound.play('click');go('online')};
$('cardOnline').onclick=()=>{if(OFFLINE)return offlineMsg();Sound.play('click');go('online')};
$('btnStartBots').onclick=playNow;

// ---------- Painel de configuração da partida (bots, lobby, resultado) ----------
function renderSetup(el,editable,compact){const humans=Object.values(players).filter(p=>!p.bot).length||1,maxBots=MAX_PLAYERS-humans;cfg.bots=clamp(cfg.bots,0,maxBots);
  const mode=modeById(cfg.mode),map=mapById(cfg.map);
  el.innerHTML=`<h3>${I('flag')} MODO DE JOGO</h3><div class="modegrid">${MODES.map(m=>`<button class="modecard${m.id===cfg.mode?' on':''}" data-mode="${m.id}" ${editable?'':'disabled'}>${I(m.ic,'mi')}<b>${m.n}</b><small>${m.d}</small>${m.teams?'<em>TIMES</em>':''}</button>`).join('')}</div>
    <h3>${I('map')} MAPA</h3><div class="maprow">${MAPS.map(m=>`<button class="mapcard${m.id===cfg.map?' on':''}" data-map="${m.id}" ${editable?'':'disabled'}><canvas width="200" height="134"></canvas><b>${m.n}</b><small>${m.theme==='dark'?'escuro':'claro'} • ${m.d}</small></button>`).join('')}</div>
    <div class="cfgrow">
      <div><h3>${I('bot')} BOTS</h3><div class="stepper"><button data-bots="-1" ${editable?'':'disabled'}>−</button><b>${cfg.bots}</b><button data-bots="1" ${editable?'':'disabled'}>+</button></div><small class="hintline">total ${humans+cfg.bots}/${MAX_PLAYERS} capivaras</small></div>
      <div><h3>${I('skull')} DIFICULDADE</h3><div class="seg">${[['easy','Fácil'],['normal','Normal'],['chaos','Caótico']].map(([v,l])=>`<button data-diff="${v}" class="${cfg.diff===v?'on':''}" ${editable?'':'disabled'}>${l}</button>`).join('')}</div></div>
      <div><h3>${I('timer')} TEMPO</h3><div class="seg">${[[120,'2 min'],[180,'3 min'],[300,'5 min']].map(([v,l])=>`<button data-time="${v}" class="${cfg.time===v?'on':''}" ${editable?'':'disabled'}>${l}</button>`).join('')}</div></div>
    </div>`;
  el.querySelectorAll('.mapcard canvas').forEach((cv,i)=>drawMapThumb(cv,MAPS[i]));
  if(!editable)return;const changed=()=>{store.set('cfg',cfg);Sound.play('click');if(host&&!solo)sync(true);else if(srvMode())ownerSend({type:'cfg',cfg:{mode:cfg.mode,map:cfg.map,bots:cfg.bots,time:cfg.time,diff:cfg.diff}});renderSetup(el,editable,compact);if(view==='setup')setupSub()};
  el.querySelectorAll('[data-mode]').forEach(b=>b.onclick=()=>{cfg.mode=b.dataset.mode;changed()});
  el.querySelectorAll('[data-map]').forEach(b=>b.onclick=()=>{cfg.map=b.dataset.map;changed()});
  el.querySelectorAll('[data-bots]').forEach(b=>b.onclick=()=>{cfg.bots=clamp(cfg.bots+ +b.dataset.bots,0,maxBots);changed()});
  el.querySelectorAll('[data-diff]').forEach(b=>b.onclick=()=>{cfg.diff=b.dataset.diff;changed()});
  el.querySelectorAll('[data-time]').forEach(b=>b.onclick=()=>{cfg.time=+b.dataset.time;changed()})}

// ---------- ONLINE ----------
(()=>{const box=$('pins');for(let i=0;i<6;i++){const inp=document.createElement('input');inp.className='field pin';inp.maxLength=1;inp.autocomplete='off';box.appendChild(inp)}
  const pins=[...box.children];pins.forEach((p,i)=>{p.addEventListener('input',()=>{p.value=p.value.toUpperCase().replace(/[^A-Z0-9]/g,'');if(p.value&&i<5)pins[i+1].focus()});
    p.addEventListener('keydown',e=>{if(e.key==='Backspace'&&!p.value&&i>0)pins[i-1].focus();if(e.key==='Enter')$('btnJoin').click()});
    p.addEventListener('paste',e=>{e.preventDefault();const s=(e.clipboardData.getData('text')||'').toUpperCase().replace(/[^A-Z0-9]/g,'').slice(0,6);s.split('').forEach((ch,j)=>{if(pins[j])pins[j].value=ch});if(pins[Math.min(5,s.length)])pins[Math.min(5,s.length)].focus()})})})();
$('nick').addEventListener('input',()=>store.set('nick',safe($('nick').value)));
$('btnDiceName').onclick=()=>{$('nick').value=pick(NICKS);store.set('nick',$('nick').value);Sound.play('boing')};
const nickReady=()=>{store.set('nick',myNick());if(!$('nick').value)$('nick').value=myNick()};
$('btnHost').onclick=async()=>{nickReady();Sound.play('click');if(await serverReady())openRoomDialog();else hostRoom()};
$('btnJoin').onclick=async()=>{nickReady();Sound.play('click');const code=[...$('pins').children].map(p=>p.value).join('');if(await serverReady())srvJoin(code);else joinRoom(code)};

// ---------- Salas no servidor: lista, criar, senha ----------
let roomTimer=null,roomListKey='';
async function enterOnline(){$('onlGrid').classList.add('p2p');$('onlGrid').classList.remove('srv');roomListKey='';
  $('roomList').innerHTML=`<div class="rlempty">Conectando ao servidor<span class="dots"></span></div>`;
  if(HOSTED){$('onlGrid').classList.add('srv');$('onlGrid').classList.remove('p2p')}
  const up=await checkServer();if(view!=='online')return;const srv=up||HOSTED;
  $('onlGrid').classList.toggle('srv',srv);$('onlGrid').classList.toggle('p2p',!srv);
  $('hostHint').textContent=srv?'pública ou privada, com ou sem senha':'você vira o anfitrião (modo direto)';
  if(srv){setNet(up?'Servidor online. Escolha uma sala ou crie a sua!':'O servidor não respondeu. Tentando de novo…',up?'ok':'err');refreshRooms();clearInterval(roomTimer);
    roomTimer=setInterval(async()=>{if(view!=='online'){clearInterval(roomTimer);roomTimer=null;return}if(!srvUp&&await checkServer())setNet('Servidor online. Escolha uma sala ou crie a sua!','ok');refreshRooms()},4000)}
  else setNet('Pronto para o caos.','')}
function fmtLeft(s){return Math.floor(s/60)+':'+String(s%60).padStart(2,'0')}
async function refreshRooms(){let rooms;try{rooms=(await api('/api/rooms')).rooms||[]}catch(e){$('roomList').innerHTML=`<div class="rlempty">Não deu para buscar as salas agora.</div>`;return}
  if(view!=='online')return;const key=JSON.stringify(rooms);if(key===roomListKey)return;roomListKey=key;
  $('roomCount').textContent=rooms.length?rooms.length+(rooms.length>1?' salas':' sala'):'';
  if(!rooms.length){$('roomList').innerHTML=`<div class="rlempty">${I('capy')}<b>Nenhuma sala aberta agora.</b><span>Crie a sua ou use o Jogar rápido!</span></div>`;return}
  $('roomList').innerHTML=rooms.map(r=>{const md=modeById(r.mode),mp=mapById(r.map),full=r.humans>=r.max;
    const st=r.state==='lobby'?`<em class="st lobby">NO SAGUÃO</em>`:r.state==='game'?`<em class="st game">EM JOGO ${fmtLeft(r.left||0)}</em>`:`<em class="st res">RESULTADO</em>`;
    return`<button class="ritem${full?' full':''}" data-code="${r.code}" data-locked="${r.locked?1:0}" ${full?'disabled':''}><span class="rmi">${I(md.ic)}</span>
      <span class="rmain"><b>${r.locked?I('lock','lk'):''}${escapeHtml(r.name)}</b><small>${escapeHtml(md.n)} • ${escapeHtml(mp.n)} • dono: ${escapeHtml(r.owner)}</small></span>
      <span class="rside">${st}<b class="rn">${I('users')}${r.humans}/${r.max}</b></span></button>`}).join('');
  $('roomList').querySelectorAll('.ritem').forEach(b=>b.onclick=async()=>{nickReady();Sound.play('click');const code=b.dataset.code;
    if(b.dataset.locked==='1'){askRoomPass(code)}else srvJoin(code)})}
$('btnRefresh').onclick=()=>{Sound.play('click');roomListKey='';refreshRooms()};
$('btnQuick').onclick=async()=>{nickReady();Sound.play('boing');setNet('Procurando uma sala boa…','busy');let rooms=[];try{rooms=(await api('/api/rooms')).rooms||[]}catch(e){}
  const ok=rooms.filter(r=>!r.locked&&r.humans<r.max).sort((a,b)=>(a.state==='lobby'?0:1)-(b.state==='lobby'?0:1)||b.humans-a.humans);
  if(ok.length)srvJoin(ok[0].code);else srvCreate({name:'Sala de '+myNick(),vis:'public',pass:''})};
async function askRoomPass(code,msg){const v=await promptBox('SALA COM SENHA',msg||'Digite a senha da sala '+code+':','senha','ENTRAR','CANCELAR');if(v)srvJoin(code,v)}
function promptBox(title,text,ph='',yes='OK',no='CANCELAR'){return new Promise(res=>{const inp=$('mInput');inp.value='';inp.placeholder=ph;inp.classList.remove('hidden');
  $('mTitle').textContent=title;$('mText').textContent=text;$('mYes').textContent=yes;$('mNo').textContent=no;$('mYes').className='btn gold';$('modal').classList.remove('hidden');setTimeout(()=>inp.focus(),60);
  const done=v=>{$('modal').classList.add('hidden');inp.classList.add('hidden');$('mYes').className='btn danger';$('mYes').onclick=$('mNo').onclick=inp.onkeydown=null;Sound.play('click');res(v)};
  $('mYes').onclick=()=>done(inp.value.trim()||null);$('mNo').onclick=()=>done(null);inp.onkeydown=e=>{if(e.key==='Enter')done(inp.value.trim()||null);if(e.key==='Escape')done(null)}})}
// Diálogo de criar/editar sala
let crVis='public',crEdit=false;
function setCrVis(v){crVis=v;$('crVis').querySelectorAll('button').forEach(b=>b.classList.toggle('on',b.dataset.vis===v));$('crVisHint').textContent=v==='public'?'aparece na lista de salas abertas':'não aparece na lista: só entra quem tiver o código'}
function setCrLock(on){$('crLock').classList.toggle('on',on);$('crLock').setAttribute('aria-checked',on);$('crPass').disabled=!on;$('crPass').placeholder=on?'digite a senha':'sem senha';if(on)setTimeout(()=>$('crPass').focus(),30)}
function openRoomDialog(edit){crEdit=!!edit;const inf=edit&&srvInfo||{};$('crTitle').textContent=edit?'CONFIGURAR SALA':'CRIAR SALA';
  $('crYes').innerHTML=edit?`${I('check','ic')}SALVAR`:`${I('plus','ic')}CRIAR SALA`;$('crName').value=edit?inf.name||'':'Sala de '+myNick();
  setCrVis(edit?inf.vis||'public':'public');$('crPass').value='';setCrLock(edit?!!inf.locked:false);if(edit&&inf.locked)$('crPass').placeholder='mantém a senha atual';
  $('createOv').classList.remove('hidden')}
$('crVis').querySelectorAll('button').forEach(b=>b.onclick=()=>{Sound.play('click');setCrVis(b.dataset.vis)});
$('crLock').onclick=()=>{Sound.play('click');setCrLock(!$('crLock').classList.contains('on'))};
$('crNo').onclick=()=>{Sound.play('click');$('createOv').classList.add('hidden')};
$('crYes').onclick=()=>{const name=$('crName').value.trim()||'Sala de '+myNick(),lock=$('crLock').classList.contains('on'),pw=$('crPass').value.trim();
  if(lock&&!pw&&!(crEdit&&srvInfo&&srvInfo.locked)){toast('Digite uma senha (ou desligue a senha).','bad');$('crPass').focus();return}
  Sound.play('boing');$('createOv').classList.add('hidden');
  if(crEdit){const d={type:'room',name,vis:crVis};if(!lock)d.pass='';else if(pw)d.pass=pw;ownerSend(d);toast('Sala atualizada!','good')}
  else srvCreate({name,vis:crVis,pass:lock?pw:''})};
$('crName').onkeydown=$('crPass').onkeydown=e=>{if(e.key==='Enter')$('crYes').click()};
$('roomInfo').onclick=()=>{if(isOwner()&&srvMode()){Sound.play('click');openRoomDialog(true)}};

// ---------- LOBBY ----------
let lobbyKey='';
function renderLobby(force){if(view!=='lobby')return;const lk=JSON.stringify([room,host,srvOwner,srvInfo,cfg,Object.values(players).filter(p=>!p.bot).map(p=>[p.id,p.name,p.look])]);if(!force&&lk===lobbyKey)return;lobbyKey=lk;$('roomCode').textContent=room;const list=Object.values(players).filter(p=>!p.bot),el=$('roster');el.innerHTML='';
  for(let i=0;i<MAX_PLAYERS;i++){const p=list[i],d=document.createElement('div');d.className='slot'+(p?'':' empty');d.style.animationDelay=(i*.04)+'s';const cv=document.createElement('canvas');cv.width=200;cv.height=230;d.appendChild(cv);
    const isHost=p&&(p.id===(host?self:srvMode()?srvOwner:PEER_PREFIX+room));
    if(!p&&i>=list.length+cfg.bots){d.classList.add('ghost')}
    d.insertAdjacentHTML('beforeend',`<div class="nm">${p?escapeHtml(p.name)+(p.id===self?' (você)':''):i<list.length+cfg.bots?'bot':'vaga'}</div><div class="tag ${isHost?'host':''}">${p?(isHost?I('crown')+(srvMode()?' DONO':' ANFITRIÃO'):I('check')+' PRONTO'):i<list.length+cfg.bots?I('bot'):''}</div>`);
    el.appendChild(d)}
  const own=isOwner();$('lobbyWait').firstChild.textContent=srvMode()?'Aguardando o dono da sala':'Aguardando o anfitrião';renderSetup($('lobbyCfg'),own);$('btnStart').classList.toggle('hidden',!own);$('lobbyWait').classList.toggle('hidden',own);
  const ri=$('roomInfo');ri.classList.toggle('hidden',!(srvMode()&&srvInfo));if(srvMode()&&srvInfo){ri.classList.toggle('own',own);
    ri.innerHTML=`<b>${escapeHtml(srvInfo.name)}</b><span>${srvInfo.vis==='public'?I('globe')+'Pública':I('eye')+'Privada'}${srvInfo.locked?' • '+I('lock')+'senha':''}</span>${own?I('gear','cog'):''}`}}
function escapeHtml(s){return String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]))}
const ghostBots=[];
function lobbyAnim(){if(view!=='lobby')return;requestAnimationFrame(lobbyAnim);const t=time(),list=Object.values(players).filter(p=>!p.bot);document.querySelectorAll('#roster .slot canvas').forEach((cv,i)=>{const c=cv.getContext('2d');c.setTransform(1,0,0,1,0,0);c.clearRect(0,0,cv.width,cv.height);const p=list[i];
  c.translate(100,170);c.scale(3.1,3.1);if(p)drawChar(c,p.look,{face:i%2?-1:1,t:t+i*333,noGun:true,shout:Math.sin(t/700+i)>.85});else if(i<list.length+cfg.bots){c.globalAlpha=.7;if(!ghostBots[i])ghostBots[i]=randomLook();drawChar(c,ghostBots[i],{face:i%2?-1:1,t:t+i*333,noGun:true,bot:true})}
  else{c.globalAlpha=.5;c.setLineDash([3,3]);c.strokeStyle='#fff';c.lineWidth=1.2;capyPath(c);c.stroke()}LW=2.2})}
$('btnCopy').onclick=()=>{const done=()=>{toast('Copiado! Manda pros amigos.','good');Sound.play('yes');celebrate(25)};try{navigator.clipboard.writeText(room).then(done,()=>toast('Código: '+room))}catch(e){toast('Código: '+room)}};
$('btnStart').onclick=()=>{if(host){Sound.play('boing');startMatch()}else if(isOwner()){Sound.play('boing');ownerSend({type:'start'})}};
$('btnLeaveLobby').onclick=async()=>{if(await confirmBox('Sair da sala?',host?'Você é o anfitrião: a sala fecha para todos.':isOwner()?'A sala continua: outro jogador vira o dono.':'Você vai sair desta sala.','SAIR','FICAR'))goHome()};

// ---------- CONFIGURAÇÕES ----------
const SETS={audio:['Áudio',[['master','range','Volume geral',0,100],['sfx','range','Efeitos',0,100],['music','range','Música',0,100],['sound','toggle','Sons ligados']]],
  graf:['Gráficos',[['quality','seg','Qualidade',[['low','Baixa'],['medium','Média'],['high','Alta'],['chaos','Caótica']]],['names','toggle','Mostrar nomes dos jogadores'],['shake','toggle','Tremor de tela']]],
  ctrl:['Controles',[['deadzone','range','Sensibilidade do toque',5,45,'zona morta do joystick (menor = mais sensível)'],['joySize','range','Tamanho do joystick',96,170],['joyOpacity','range','Opacidade do joystick',30,100],['vibrate','toggle','Vibração no celular']]],
  perf:['Desempenho',[['fps','seg','Limite de FPS',[[30,'30'],[60,'60']]],['particles','seg','Partículas',[['low','Poucas'],['mid','Médias'],['full','Todas']]],['dynres','toggle','Resolução dinâmica','baixa a resolução se o jogo travar']]]};
let stab='audio';
function openSettings(){$('settings').classList.remove('hidden');renderSettings()}
function renderSettings(){const tr=$('stabs');tr.innerHTML='';for(const k in SETS){const b=document.createElement('button');b.className='tab'+(k===stab?' on':'');b.textContent=SETS[k][0];b.onclick=()=>{stab=k;Sound.play('click');renderSettings()};tr.appendChild(b)}
  const body=$('sbody');body.innerHTML='';for(const [key,type,label,a,b,help] of SETS[stab][1]){const row=document.createElement('div');row.className='setrow';const l=document.createElement('label');l.innerHTML=escapeHtml(label)+(help||(type==='toggle'&&a)?`<small>${escapeHtml(help||a)}</small>`:'');row.appendChild(l);
    if(type==='range'){const wrap=document.createElement('div');wrap.style.cssText='display:flex;align-items:center;gap:10px';const r=document.createElement('input');r.type='range';r.min=a;r.max=b;r.value=S[key];const v=document.createElement('span');v.className='val';v.textContent=S[key];
      r.oninput=()=>{S[key]=+r.value;v.textContent=r.value;applySettings(key)};r.onchange=()=>{saveSettings();if(key!=='music')Sound.play('pop')};wrap.append(r,v);row.appendChild(wrap)}
    if(type==='toggle'){const t=document.createElement('button');t.className='toggle'+(S[key]?' on':'');t.setAttribute('aria-label',label);t.onclick=()=>{S[key]=!S[key];t.classList.toggle('on',S[key]);saveSettings();applySettings(key);Sound.play('boing')};row.appendChild(t)}
    if(type==='seg'){const s=document.createElement('div');s.className='seg';for(const [v,lb] of a){const bt=document.createElement('button');bt.textContent=lb;if(S[key]===v)bt.className='on';bt.onclick=()=>{S[key]=v;saveSettings();applySettings(key);Sound.play('click');renderSettings()};s.appendChild(bt)}row.appendChild(s)}
    body.appendChild(row)}}
function applySettings(key){Sound.apply();if(key==='quality'||key==='dynres'){resScale=1;resize()}if(key==='fullscreen')setFullscreen(S.fullscreen);applyJoy()}
function toggleFullscreen(){Sound.play('click');const d=document,el=d.documentElement;try{if(!d.fullscreenElement&&!d.webkitFullscreenElement){(el.requestFullscreen||el.webkitRequestFullscreen).call(el)}else{(d.exitFullscreen||d.webkitExitFullscreen).call(d)}}catch(e){toast('Tela cheia indisponível neste navegador')}}
function syncFsIcon(){const on=!!(document.fullscreenElement||document.webkitFullscreenElement);const u=$('btnFs').querySelector('use');u.setAttribute('href',on?'#i-shrink':'#i-expand');$('btnFs').title=on?'Sair da tela cheia':'Tela cheia'}
$('btnFs').onclick=toggleFullscreen;document.addEventListener('fullscreenchange',syncFsIcon);document.addEventListener('webkitfullscreenchange',syncFsIcon);
function setFullscreen(on){try{if(on&&!document.fullscreenElement)document.documentElement.requestFullscreen().catch(()=>{S.fullscreen=false});else if(!on&&document.fullscreenElement)document.exitFullscreen()}catch(e){}}
$('btnSetDone').onclick=()=>{$('settings').classList.add('hidden');saveSettings();Sound.play('click')};

// ---------- HUD ----------
let hudK=-1,hudG=-1,hudG2=-2,dashReady=true,deathShown=false;
function onMatchStart(){if(!solo&&!mlBusy){showLoad('online');setTimeout(hideLoad,5000)}parts=[];FX3D.clear();perkKey='';offerKey='';$('perkOv').classList.add('hidden');for(const k in track)delete track[k];$('feed').innerHTML='';hudGun=-1;hudG2=-2;deathShown=false;$('result').classList.add('hidden');go('game');const me=players[self];if(me)drawPortrait($('portrait'),me.look,{bg:false});
  $('hudName').textContent=me?me.name:'';$('lvl'+'Num');document.querySelector('.lvbadge small').textContent=MODE.id==='gun'?'ARMA':'NÍVEL';
  bigBanner(MODE.n.toUpperCase(),MODE.d+(isTeams()&&me&&me.team>=0?` Você é do time ${TEAM[me.team].n}!`:''),isTeams()&&me&&me.team>=0?TEAM[me.team].c:'#FFC531');
  if(isTouch&&innerHeight>innerWidth)toast('Gire o celular para jogar melhor')}
function bigBanner(title,sub,col){const b=$('banner');b.innerHTML=`<div class="bn" style="--bc:${col}"><b>${escapeHtml(title)}</b><span>${escapeHtml(sub||'')}</span></div>`;clearTimeout(b._t);b._t=setTimeout(()=>b.innerHTML='',3200)}
const fmtT=s=>{s=Math.max(0,Math.floor(s));return Math.floor(s/60)+':'+String(s%60).padStart(2,'0')};
function modeHudHTML(me){const L=rank(),lead=L[0];const ts=ms.teamScore||[0,0];
  const teamLine=(u)=>`<span class="tsc" style="--c:${TEAM[0].c}">${ts[0]}</span><span class="vs">${u}</span><span class="tsc" style="--c:${TEAM[1].c}">${ts[1]}</span>`;
  switch(MODE.id){
    case 'tdm':return teamLine('eliminações');
    case 'ctf':return teamLine('capturas • 3 vence');
    case 'hold':{const f=ms.flags&&ms.flags[0],c=f&&f.carrier&&players[f.carrier];return `${I('flag')} ${c?(c.id===self?'<b>VOCÊ</b> está com a bandeira!':escapeHtml(c.name)+' está com ela'):'Bandeira livre!'} • você ${Math.floor(me.hold)}s / 60`}
    case 'koth':{const z=ms.zone,o=z&&players[z.owner];return `${I('pond')} ${z&&z.contested?'Lagoa disputada!':o?(o.id===self?'<b>A lagoa é sua!</b>':escapeHtml(o.name)+' na lagoa'):'Lagoa vazia'} • você ${Math.floor(me.zone)}/60`}
    case 'gun':return `${I('cycle')} Arma ${me.gunLvl+1}/12 • líder: ${escapeHtml(lead?lead.name:'')} (${lead?lead.gunLvl+1:0})`;
    case 'race':return `${I('orange')} Corrida: líder ${escapeHtml(lead?lead.name:'')} com ${lead?lead.energy:0}`;
    default:return `${I('skull')} Você ${me.kills} • líder ${escapeHtml(lead?lead.name:'')} ${lead?lead.kills:0}`}}
function updateHUD(t){const me=players[self];if(!me)return;const ht=hostNow();
  const mh=me.maxHp||100,hpp=clamp(me.hp/mh*100,0,100);$('hpFill').style.width=hpp+'%';$('hpGhost').style.width=hpp+'%';$('hpNum').textContent=Math.ceil(me.hp);$('hpBar').classList.toggle('low',hpp<25);
  updatePerkHUD(me,ht);
  $('lvNum').textContent=MODE.id==='gun'?me.gunLvl+1:me.level;
  if(MODE.id==='gun'){$('fill67').style.width=(me.gunLvl/12*100)+'%';$('txt67').textContent=`ARMA ${me.gunLvl+1}/12`;$('bar67').classList.remove('hot')}
  else{$('fill67').style.width=(me.energy/67*100)+'%';$('txt67').textContent=MODE.id==='race'?`${me.energy}/67 PARA VENCER`:me.energy+'/67';$('bar67').classList.toggle('hot',me.energy>=60)}
  $('modeHud').innerHTML=modeHudHTML(me);
  const rem=Math.max(0,matchEnd-ht);$('timer').textContent=fmtT(rem/1000);$('timer').classList.toggle('end',rem<30000);
  if(me.kills!==hudK){hudK=me.kills;pop($('kNum'),me.kills)}if(me.gemsTotal!==hudG){hudG=me.gemsTotal;pop($('gNum'),me.gemsTotal)}
  const gi=me.guns[me.slot],g2=me.guns[1-me.slot];
  if(gi!==hudGun){hudGun=gi;const g=GUNS[gi];drawWeaponIcon($('weaponIcon'),gi);$('wName').textContent=g.n;$('wCat').innerHTML=`${CATS[g.cat][0]} • <span style="color:${TIERS[g.tier][1]}">${TIERS[g.tier][0]}</span>`;$('wCat').style.color=CATS[g.cat][1];$('weaponCard').style.borderColor=g.tier==='lendaria'||g.tier==='apelona'?TIERS[g.tier][1]:''}
  if(g2!==hudG2){hudG2=g2;$('weapon2').classList.toggle('hidden',!(g2>=0));$('swapBtn').classList.toggle('hidden',!(g2>=0));if(g2>=0){$('w2img').src=iconURL(g2);$('weapon2').title='Trocar para '+GUNS[g2].n}}
  const g=GUNS[gi],cdp=clamp((ht-me.shotAt)/g.cd,0,1);$('wCd').style.width=(cdp*100)+'%';$('ringFire').style.setProperty('--p',1-cdp);
  const dp=1-clamp((ht-me.dashAt)/2800,0,1);$('ringDash').style.setProperty('--p',dp);$('dashBtn').style.setProperty('--p',dp);
  if(dp===0&&!dashReady){dashReady=true;$('ringDash').classList.remove('ready');void $('ringDash').offsetWidth;$('ringDash').classList.add('ready');if(me.alive)Sound.play('tick')}if(dp>0)dashReady=false;
  if(!me.alive&&!over&&!me.picking){if(!deathShown){deathShown=true;showDeath(me)}const left=Math.max(0,me.respawnAt-ht);$('deathCount').textContent=Math.ceil(left/1000);$('btnRespawn').disabled=ht<me.canRespawnAt}
  else if(deathShown){deathShown=false;$('death').classList.add('hidden')}}
function pop(el,v){el.textContent=v;el.parentElement.classList.remove('pop');void el.parentElement.offsetWidth;el.parentElement.classList.add('pop')}
// sem 'mirando' na hora (o cursor volta a aparecer para clicar em Renascer / escolher o poder)
function showCursor(){document.body.classList.remove('aiming');const g=$('game');g.style.cursor='default';requestAnimationFrame(()=>{g.style.cursor=''})}
function showDeath(me){showCursor();const k=me.killer||{},kp=players[k.id],g=GUNS[k.gun];$('death').classList.remove('hidden');$('deathTitle').textContent=pick(DEATH_TITLES);
  $('killerName').textContent=k.name||'o caos';$('killerGun').textContent=g?'com '+g.n:'';$('killerGunImg').src=g?iconURL(g.id):'';$('killerGunImg').style.display=g?'':'none';$('deathQuip').textContent=`“${k.name||'O caos'} ${g?g.q:'venceu desta vez.'}”`;
  drawPortrait($('killerFace'),kp?kp.look:defaultLook(0),{bg:true,bot:kp&&kp.bot,shout:true});keys.fire=false;pushInputs(true)}
$('btnRespawn').onclick=()=>{keys.respawn=true;pushInputs(true);Sound.play('click');setTimeout(()=>{keys.respawn=false;pushInputs(true)},350)};
function showRespawnCard(gi,label='NOVA ARMA',g2){const g=GUNS[gi],card=$('respawnCard');if(!g)return;drawWeaponIcon($('rcIcon'),gi);$('rcName').textContent=g.n;$('rcCat').innerHTML=`${label} • ${CATS[g.cat][0]} • <span style="color:${TIERS[g.tier][1]}">${TIERS[g.tier][0]}</span>`;$('rcCat').style.color=CATS[g.cat][1];$('rcDesc').textContent=g.d;
  $('rc2').innerHTML=g2>=0&&GUNS[g2]?`<img src="${iconURL(g2)}" alt=""> + ${escapeHtml(GUNS[g2].n)}`:'';
  card.style.borderColor=TIERS[g.tier][1];card.classList.remove('hidden','go');void card.offsetWidth;card.classList.add('go');clearTimeout(card._t);card._t=setTimeout(()=>card.classList.add('hidden'),1300)}
function stamp67(lv){const c=$('center67');c.innerHTML=`<div class="stamp">67<small>NÍVEL ${lv}!</small></div>`;clearTimeout(c._t);c._t=setTimeout(()=>c.innerHTML='',1700);shakeA=8}
function addFeed(e){const f=$('feed'),d=document.createElement('div');const g=GUNS[e.g];d.className='fe'+(e.ki===self||e.vi===self?' me':'');
  const nm=(n,t)=>`<span style="${t>=0&&isTeams()?'color:'+TEAM[t].c:''}">${escapeHtml(n)}</span>`;d.innerHTML=`${nm(e.k,e.kt)}${g?`<img src="${iconURL(g.id)}" alt="${escapeHtml(g.n)}">`:' ✕ '}${nm(e.v,e.vt)}`;f.prepend(d);while(f.children.length>4)f.lastChild.remove();setTimeout(()=>d.remove(),4300)}
function flyGem(x,y){if(document.querySelectorAll('.flyer').length>6)return;const [sx,sy]=worldToScreen(x,y),r=$('bar67').getBoundingClientRect(),d=document.createElement('div');d.className='flyer';d.style.left=sx+'px';d.style.top=sy+'px';document.body.appendChild(d);
  requestAnimationFrame(()=>requestAnimationFrame(()=>{d.style.left=(r.left+r.width*clamp((players[self]?.energy||0)/67,.05,.95))+'px';d.style.top=(r.top+r.height/2-9)+'px';d.style.transform='scale(.6) rotate(180deg)'}));setTimeout(()=>{d.remove();const b=$('bar67');b.classList.remove('pop');void b.offsetWidth;b.classList.add('pop')},560)}

// ---------- Pause / placar ----------
function openPause(){showCursor();if(view!=='game'||over)return;$('pause').classList.remove('hidden');if(solo)paused=true;$('pauseNote').textContent=solo?'Os bots estão congelados esperando você.':'A partida continua sem você!'+(srvMode()&&rtt?` (ping ${Math.round(rtt)} ms)`:'');
  $('btnRestart').classList.toggle('hidden',!solo);$('pauseTip').textContent='Dica: '+pick(['o dash atravessa a confusão: use para fugir de granadas.','kits médicos recuperam metade da vida.','caixas com "?" trocam sua arma atual.','aperte Q (ou o botão de troca) para alternar entre as duas armas.','a Pausa Dramática congela até os tiros dentro dela.','paredes da Pá de Pedreiro bloqueiam tiros por 16 segundos.']);
  for(const k of KEYLIST)keys[k]=false;pushInputs(true);Sound.play('click')}
function closePause(){$('pause').classList.add('hidden');paused=false;lastFrame=performance.now();Sound.play('click')}
$('btnPause').onclick=openPause;$('btnResume').onclick=closePause;$('btnPauseSettings').onclick=openSettings;
$('btnRestart').onclick=()=>{closePause();startBots()};
$('btnQuitMatch').onclick=async()=>{if(await confirmBox('Sair da partida?',solo?'Seu progresso nesta partida será perdido.':host?'Você é o anfitrião: a partida acaba para todos.':isOwner()?'A partida continua: outro jogador vira o dono da sala.':'Você vai sair da sala.','SAIR','FICAR'))goHome()};
function scoreLabel(p){switch(MODE.score){case 'hold':return Math.floor(p.hold)+'s';case 'caps':return p.caps;case 'zone':return Math.floor(p.zone);case 'gun':return (p.gunLvl+1)+'/12';case 'gems':return p.energy;default:return p.kills}}
function renderScore(){const list=rank();$('scoreTable').innerHTML=`<tr><th>#</th><th>Capivara</th><th>${MODE.unit}</th><th>Elim.</th><th>Mortes</th><th>Nível</th></tr>`+list.map((p,i)=>`<tr class="${p.id===self?'me':''}"><td>${i+1}</td><td><span class="dotc" style="background:${p.team>=0&&isTeams()?TEAM[p.team].c:'transparent'}"></span>${escapeHtml(p.name)}${p.bot?' '+I('bot'):''}</td><td>${scoreLabel(p)}</td><td>${p.kills}</td><td>${p.deaths}</td><td>${p.level}</td></tr>`).join('')}
function toggleScore(on){if(view!=='game')return;$('scoreOv').classList.toggle('hidden',!on);if(on)renderScore()}
$('statKills').onclick=$('statGems').onclick=()=>toggleScore(true);$('btnCloseScore').onclick=()=>toggleScore(false);

// ---------- Resultado + votação ----------
let myVote=null;
function onMatchEnd(){$('death').classList.add('hidden');$('pause').classList.add('hidden');$('scoreOv').classList.add('hidden');for(const k of KEYLIST)keys[k]=false;pushInputs(true);myVote=null;
  const list=rank(),me=players[self],place=list.findIndex(p=>p.id===self)+1;$('totalGems').textContent=store.get('totalGems',0);
  const tw=teamWinner();$('teamWin').classList.toggle('hidden',tw===-1);
  if(tw>=0){$('teamWin').innerHTML=`<b style="--c:${TEAM[tw].c}">TIME ${TEAM[tw].n.toUpperCase()} VENCEU!</b><span>${ms.teamScore[0]} × ${ms.teamScore[1]}</span>`}else if(tw===-2){$('teamWin').innerHTML=`<b style="--c:#FFC531">EMPATE!</b><span>${ms.teamScore[0]} × ${ms.teamScore[1]}</span>`}
  const won=tw>=0?(me&&me.team===tw):place===1;bump('games');if(won)bump('wins');$('resTitle').textContent=won?'VITÓRIA CAPIVARA!':'FIM DE PARTIDA';
  const pod=$('podium');pod.innerHTML='';[[1,'p2'],[0,'p1'],[2,'p3']].forEach(([i,cls])=>{const p=list[i];if(!p)return;const d=document.createElement('div');d.className='pod '+cls;const cv=document.createElement('canvas');cv.width=220;cv.height=242;d.appendChild(cv);
    d.insertAdjacentHTML('beforeend',`<div class="nm">${i===0?I('crown')+' ':''}${escapeHtml(p.name)}</div><div class="blk">${i+1}º<small>${scoreLabel(p)}</small></div>`);pod.appendChild(d);drawPortrait(cv,p.look,{bg:false,full:true,bot:p.bot})});
  const nums=[[place,'Colocação','º'],[me?me.kills:0,'Eliminações'],[me?me.deaths:0,'Mortes'],[me?Math.floor(MODE.score==='hold'?me.hold:MODE.score==='zone'?me.zone:MODE.score==='caps'?me.caps:MODE.score==='gun'?me.gunLvl+1:me.gemsTotal):0,MODE.score==='kills'?'Laranjinhas':MODE.unit],[me?me.level:1,'Nível']];
  $('nums').innerHTML=nums.map(([v,l,s])=>`<div class="num sticker"><b data-v="${v}" data-s="${s||''}">0</b><span>${l}</span></div>`).join('');
  document.querySelectorAll('#nums b').forEach(b=>{const tgt=+b.dataset.v,suf=b.dataset.s,t0=time();const tick=()=>{const k=Math.min(1,(time()-t0)/900);b.textContent=Math.round(tgt*k)+suf;if(k<1)requestAnimationFrame(tick)};tick()});
  const md=[],top=f=>list.slice().sort((a,b)=>f(b)-f(a))[0];
  const k1=top(p=>p.kills);if(k1&&k1.kills>0)md.push(['trophy',`Mais caos: ${k1.name} (${k1.kills})`]);
  const g1=top(p=>p.gemsTotal);if(g1&&g1.gemsTotal>0)md.push(['orange',`Colecionador: ${g1.name} (${g1.gemsTotal})`]);
  const n1=top(p=>p.noKills);if(n1&&n1.noKills>0)md.push(['nope',`${n1.name} disse NÃO ${n1.noKills}x`]);
  const h1=top(p=>p.heals);if(h1&&h1.heals>0)md.push(['heart',`Diplomata: ${h1.name} (${h1.heals} curas)`]);
  const s1=top(p=>p.best);if(s1&&s1.best>=3)md.push(['flame',`Sequência de ${s1.best}: ${s1.name}`]);
  const d1=top(p=>p.deaths);if(d1&&d1.deaths>0)md.push(['magnet',`Ímã de bala: ${d1.name}`]);
  if(me&&me.kills===0)md.push(['peace','Pacifista: você não eliminou ninguém']);
  $('medals').innerHTML=md.slice(0,6).map(([i,t])=>`<div class="medal">${I(i)}${escapeHtml(t)}</div>`).join('');
  $('btnAgain').classList.toggle('hidden',!isOwner());$('btnResLobby').classList.toggle('hidden',!(isOwner()&&!solo));
  $('hud').classList.add('hidden');$('touch').classList.add('hidden');$('result').classList.remove('hidden');view='result';document.body.classList.add('menu');voteKey='';renderVotes();
  if(won){Sound.play('win');celebrate(160)}else{Sound.play('level');celebrate(50)}}
let voteKey='';
function renderVotes(force){if(view!=='result')return;const own=isOwner();const vk=JSON.stringify([votes,myVote,cfg.map,host,own]);if(!force&&vk===voteKey)return;voteKey=vk;$('btnAgain').classList.toggle('hidden',!own);$('btnResLobby').classList.toggle('hidden',!(own&&!solo));const count={};for(const v of Object.values(votes))count[v]=(count[v]||0)+1;const sel=myVote||(own?(topVote()||cfg.mode):null);
  $('voteGrid').innerHTML=MODES.map(m=>`<button class="modecard small${m.id===sel?' on':''}" data-vote="${m.id}">${I(m.ic,'mi')}<b>${m.n}</b>${count[m.id]?`<span class="vc">${count[m.id]} ${I('thumb')}</span>`:''}</button>`).join('');
  $('voteGrid').querySelectorAll('[data-vote]').forEach(b=>b.onclick=()=>{myVote=b.dataset.vote;Sound.play('click');if(host)votes[self]=myVote;else if(conn)send(conn,{type:'vote',mode:myVote});renderVotes();if(host)sync(true)});
  const mr=$('resMaps');if(own){mr.innerHTML=`<span class="lbl2">${I('map')} Mapa:</span>`+MAPS.map(m=>`<button class="chip${m.id===cfg.map?' on':''}" data-rmap="${m.id}">${m.n}</button>`).join('')+`<button class="chip" data-rmap="random">${I('dice')} Sortear</button>`;
    mr.querySelectorAll('[data-rmap]').forEach(b=>b.onclick=()=>{cfg.map=b.dataset.rmap==='random'?pick(MAPS.filter(m=>m.id!==cfg.map)).id:b.dataset.rmap;Sound.play('click');if(srvMode())ownerSend({type:'cfg',cfg:{map:cfg.map}});renderVotes()})}
  else mr.innerHTML=`<span class="lbl2">${myVote?'Voto enviado! ':''}Aguardando ${srvMode()?'o dono da sala':'o anfitrião'} começar a próxima<span class="dots"></span></span>`;
  $('btnAgain').innerHTML=`${I('play','ic')}PRÓXIMA: ${escapeHtml(modeById(sel||cfg.mode).n.toUpperCase())}`}
$('btnAgain').onclick=()=>{if(!isOwner())return;Sound.play('boing');const md=myVote||topVote()||cfg.mode;if(host){$('result').classList.add('hidden');nextMatch(md,cfg.map)}else ownerSend({type:'next',mode:md,map:cfg.map})};
$('btnResLobby').onclick=()=>{Sound.play('click');if(host){$('result').classList.add('hidden');backToLobby();go('lobby')}else ownerSend({type:'lobby'})};
$('btnResMenu').onclick=()=>{Sound.play('click');goHome()};

// ---------- Confete (tela) ----------
const conf=$('confetti'),cfx=conf.getContext('2d');let confs=[],confRun=false;
function celebrate(n){conf.width=innerWidth;conf.height=innerHeight;for(let i=0;i<n;i++)confs.push({x:rand(0,innerWidth),y:rand(-innerHeight*.5,-10),vx:rand(-60,60),vy:rand(120,320),r:rand(0,6),vr:rand(-8,8),s:rand(6,12),c:pick(['#FFC531','#FF4F9A','#45D4FF','#6CF06A','#FF8A1F','#FFF4E0'])});if(!confRun){confRun=true;let last=time();const tick=()=>{const t=time(),dt=Math.min(.05,(t-last)/1000);last=t;cfx.clearRect(0,0,conf.width,conf.height);
  for(let i=confs.length-1;i>=0;i--){const p=confs[i];p.x+=p.vx*dt+Math.sin(t/300+i)*.6;p.y+=p.vy*dt;p.r+=p.vr*dt;if(p.y>innerHeight+20){confs.splice(i,1);continue}cfx.save();cfx.translate(p.x,p.y);cfx.rotate(p.r);cfx.fillStyle=p.c;cfx.fillRect(-p.s/2,-p.s/4,p.s,p.s/2);cfx.restore()}
  if(confs.length)requestAnimationFrame(tick);else{confRun=false;cfx.clearRect(0,0,conf.width,conf.height)}};tick()}}

// ---------- Controles ----------
const KM={w:'up',arrowup:'up',s:'down',arrowdown:'down',a:'left',arrowleft:'left',d:'right',arrowright:'right',' ':'dash',shift:'dash'};
const playing=()=>view==='game'&&$('pause').classList.contains('hidden')&&$('settings').classList.contains('hidden');
addEventListener('keydown',e=>{const tag=document.activeElement&&document.activeElement.tagName;if(tag==='INPUT'||tag==='SELECT')return;const k=(e.key||'').toLowerCase();
  if(k==='escape'){if(!$('settings').classList.contains('hidden')){$('settings').classList.add('hidden');return}if(!$('modal').classList.contains('hidden'))return;if(view==='game'){$('pause').classList.contains('hidden')?openPause():closePause()}return}
  if(k==='tab'&&view==='game'){e.preventDefault();toggleScore(true);return}
  if(!playing())return;if(((k==='1'||k==='2')&&players[self]&&players[self].slot!==+k-1)||k==='q'||k==='e'){if(!e.repeat)tapSwap();return}const m=KM[k];if(m){e.preventDefault();keys[m]=true;pushInputs(true)}});
addEventListener('keyup',e=>{const k=(e.key||'').toLowerCase();if(k==='tab'){toggleScore(false);return}const m=KM[k];if(m){keys[m]=false;pushInputs(true)}});
addEventListener('blur',()=>{for(const k of KEYLIST)keys[k]=false;pushInputs(true)});
function tapSwap(){if(!playing())return;const me=players[self];if(host){if(me)me.swapReq=1}else if(conn)send(conn,{type:'swap'})}
addEventListener('wheel',e=>{if(view==='game'&&Math.abs(e.deltaY)>4)tapSwap()},{passive:true});
$('weapon2').onclick=tapSwap;$('swapBtn').addEventListener('pointerdown',e=>{e.preventDefault();tapSwap()});
function aimAt(cx,cy){const me=players[self];if(!me)return;const wx=cx/zoom+cam.x,wy=cy/(zoom*SQ)+cam.y,mx=me.rx??me.x,my=me.ry??me.y;localAim=Math.atan2(wy-my,wx-mx);localAimDist=Math.hypot(wx-mx,wy-my);pushInputs()}
let shootId=null;const ret=$('reticle');
canvas.addEventListener('pointermove',e=>{if(!playing())return;if(e.pointerType==='mouse'||e.pointerId===shootId){aimAt(e.clientX,e.clientY);if(e.pointerId===shootId&&e.pointerType!=='mouse'){ret.style.left=e.clientX+'px';ret.style.top=e.clientY+'px'}}});
canvas.addEventListener('pointerdown',e=>{if(!playing()||shootId!==null)return;e.preventDefault();shootId=e.pointerId;try{canvas.setPointerCapture(e.pointerId)}catch(_){}aimAt(e.clientX,e.clientY);keys.fire=true;pushInputs(true);
  if(e.pointerType!=='mouse'){ret.style.left=e.clientX+'px';ret.style.top=e.clientY+'px';ret.style.opacity=1}});
function stopShoot(e){if(e.pointerId!==shootId)return;shootId=null;keys.fire=false;pushInputs(true);ret.style.opacity=0}
canvas.addEventListener('pointerup',stopShoot);canvas.addEventListener('pointercancel',stopShoot);
canvas.addEventListener('contextmenu',e=>e.preventDefault());
let applyJoy=()=>{};
(()=>{const zone=$('joyZone'),joy=$('joy'),knob=$('knob');let id=null,cx=0,cy=0;
  const home=()=>{const s=S.joySize/(+getComputedStyle(document.documentElement).getPropertyValue('--uis')||1);joy.style.left=(s*.5+30)+'px';joy.style.top=(innerHeight-s*.5-34)+'px'};
  function setVec(px,py){const R0=S.joySize/(+getComputedStyle(document.documentElement).getPropertyValue('--uis')||1)*.36;let dx=px-cx,dy=py-cy;const l=Math.hypot(dx,dy);if(l>R0){dx=dx/l*R0;dy=dy/l*R0}knob.style.transform=`translate(${dx}px,${dy}px)`;
    const x=dx/R0,y=dy/R0,dz=S.deadzone/100,mag=Math.hypot(x,y);if(mag<dz){keys.left=keys.right=keys.up=keys.down=false}else{const a=Math.atan2(y,x);keys.right=Math.cos(a)>.38;keys.left=Math.cos(a)<-.38;keys.down=Math.sin(a)>.38;keys.up=Math.sin(a)<-.38}pushInputs()}
  zone.addEventListener('pointerdown',e=>{if(id!==null||!playing())return;e.preventDefault();id=e.pointerId;zone.setPointerCapture(id);const r=zone.getBoundingClientRect(),m=S.joySize*.5;cx=clamp(e.clientX,r.left+m*.6,r.right-m*.6);cy=clamp(e.clientY,r.top+m,innerHeight-m*.8);
    joy.style.left=cx+'px';joy.style.top=cy+'px';joy.classList.remove('idle');setVec(e.clientX,e.clientY)});
  zone.addEventListener('pointermove',e=>{if(e.pointerId===id){e.preventDefault();setVec(e.clientX,e.clientY)}});
  const end=e=>{if(e.pointerId!==id)return;id=null;knob.style.transform='';joy.classList.add('idle');keys.left=keys.right=keys.up=keys.down=false;pushInputs(true);home()};
  zone.addEventListener('pointerup',end);zone.addEventListener('pointercancel',end);zone.addEventListener('lostpointercapture',end);
  applyJoy=()=>{const js=S.joySize/(+getComputedStyle(document.documentElement).getPropertyValue('--uis')||1);joy.style.width=joy.style.height=js+'px';joy.style.margin=`-${js/2}px 0 0 -${js/2}px`;joy.style.opacity=S.joyOpacity/100;document.documentElement.style.setProperty('--js',js+'px');home()};addEventListener('resize',()=>applyJoy())})();
(()=>{const base=$('aimStick'),knob=$('aimKnob');let id=null;
  function upd(e){const r=base.getBoundingClientRect(),cx=r.left+r.width/2,cy=r.top+r.height/2,R0=r.width*.36;let dx=e.clientX-cx,dy=e.clientY-cy;const l=Math.hypot(dx,dy);if(l>R0){dx=dx/l*R0;dy=dy/l*R0}
    knob.style.transform=`translate(${dx}px,${dy}px)`;const mag=Math.min(1,l/R0);aimStick.mag=mag;if(mag>.12){aimStick.a=Math.atan2(dy,dx);aimStick.on=true}
    const fire=mag>=.55;if(fire!==keys.fire){keys.fire=fire;base.classList.toggle('firing',fire);if(fire)vibe(8);pushInputs(true)}}
  base.addEventListener('pointerdown',e=>{if(id!==null||!playing())return;e.preventDefault();id=e.pointerId;try{base.setPointerCapture(id)}catch(_){}base.classList.add('on');upd(e)});
  base.addEventListener('pointermove',e=>{if(e.pointerId===id){e.preventDefault();upd(e)}});
  const end=e=>{if(e.pointerId!==id)return;id=null;knob.style.transform='';base.classList.remove('on','firing');aimStick.on=false;aimStick.mag=0;if(shootId===null){keys.fire=false;pushInputs(true)}};
  base.addEventListener('pointerup',end);base.addEventListener('pointercancel',end);base.addEventListener('lostpointercapture',end)})();
(()=>{const b=$('dashBtn');b.addEventListener('pointerdown',e=>{e.preventDefault();try{b.setPointerCapture(e.pointerId)}catch(_){}keys.dash=true;pushInputs(true)});const up=()=>{keys.dash=false;pushInputs(true)};b.addEventListener('pointerup',up);b.addEventListener('pointercancel',up)})();
document.addEventListener('pointerenter',e=>{if(e.target.classList&&e.target.classList.contains('btn')&&!isTouch)Sound.play('hover')},true);

// ---------- Início ----------
$('totalGems').textContent=store.get('totalGems',0);$('nick').value=store.get('nick','');
applyJoy();drawSpheres();go('home');requestAnimationFrame(frame);
document.fonts&&document.fonts.ready.then(()=>{drawSpheres();if(view==='play')drawPlayArt()});
if(location.hash==='#debug')window.__67={get players(){return players},get self(){return self},get ms(){return ms},endMatch,cfg,MODES,
  harmMe:d=>harm(players[self],d,Object.keys(players).find(k=>k!==self),Math.floor(Math.random()*GUNS.length),time()),level:()=>{players[self].energy=66},view:()=>view,
  setGun:g=>{players[self].guns[players[self].slot]=g;players[self].gun=g},tpGem:()=>{const p=players[self],g=gems[0];p.x=g.x;p.y=g.y},god:()=>{players[self].shieldUntil=1e12},card:g=>showRespawnCard(g),
  freezeMe:()=>{players[self].frozenUntil=time()+3000},grant:()=>grantCard(players[self],time()),me:()=>players[self],flashMe:()=>{players[self].flashUntil=time()+2500},bullets:()=>bullets.length,gi:n=>GUNS.findIndex(g=>g.n===n),builds:()=>builds.length,fields:()=>fields.length,
  portrait:(cv,o)=>drawPortrait(cv,myLook,o||{bg:false}),
  get room(){return room},rtt:()=>rtt,isOwner:()=>isOwner(),goHome:()=>goHome(),ownerEnd:()=>ownerSend({type:'end'}),dropWs:()=>{try{conn.ws.close()}catch(e){}}};
if(location.hash==='#debug')window.__67.sweep=()=>{const out=[];const saveP=players,saveCfg={...cfg};cfg.mode='ffa';cfg.map='ilha';setupMode();host=true;solo=true;
  for(const g of GUNS){players={};bullets=[];builds=[];fields=[];effects=[];gems=[];meds=[];crates=[];
    const me=newPlayer('me','Eu',defaultLook(0));const dum=newPlayer('dum','Alvo',defaultLook(1));players={me,dum};self='me';
    const d=g.melee?Math.max(30,g.range-10):g.instant?260:g.mine?60:g.box?120:200;me.x=500;me.y=260;dum.x=500+d;dum.y=260;me.guns=[g.id,-1];me.gun=g.id;me.aim=0;me.ad=d;dum.shieldUntil=0;me.shieldUntil=0;
    let dealt=0,t0=time()+100000;for(let i=0;i<240;i++){const t=t0+i*1000/60;me.keys={fire:true};me.aim=Math.atan2(dum.y-me.y,dum.x-me.x);me.ad=Math.hypot(dum.x-me.x,dum.y-me.y);dum.keys={};const hp=dum.hp;
      step(1/60,t);if(dum.hp<hp)dealt+=hp-dum.hp;if(!dum.alive){dealt+=0;dum.alive=true;dum.hp=100}dum.hp=Math.max(dum.hp,1)>0?dum.hp:100;if(dum.hp<30)dum.hp=100;dum.x=500+d;dum.y=260;dum.frozenUntil=0;dum.kx=dum.ky=0;me.x=500;me.y=260;me.kx=me.ky=0;me.frozenUntil=0;me.hp=100;me.alive=true}
    out.push([g.n,Math.round(dealt),g.dmg])}
  players=saveP;Object.assign(cfg,saveCfg);setupMode();return out};

// ---------- Cartas de power-up (HUD) ----------
let perkKey='',offerKey='';
function updatePerkHUD(me,ht){document.body.classList.toggle('aiming',!!(me.alive&&!me.picking&&!over&&$('pause').classList.contains('hidden')&&$('settings').classList.contains('hidden')));
  const pk=JSON.stringify(me.perks||{});if(pk!==perkKey){perkKey=pk;$('perkRow').innerHTML=Object.entries(me.perks||{}).map(([id,n])=>{const p=perkById(id);return p?`<span class="pk" style="--rc:${RARITY[p.r][1]}" title="${escapeHtml(p.n)}: ${escapeHtml(p.d)}">${I(p.ic)}${n>1?`<b>${n}</b>`:''}</span>`:''}).join('')}
  const ov=$('perkOv');if(me.picking&&me.offer){const ok=me.offer.join(',');if(ov.classList.contains('hidden')||ok!==offerKey){offerKey=ok;showPerkCards(me)}$('pkTime').style.width=clamp((me.pickUntil-ht)/12000*100,0,100)+'%'}
  else if(!ov.classList.contains('hidden'))ov.classList.add('hidden')}
function showPerkCards(me){showCursor();const ov=$('perkOv');ov.classList.remove('hidden');$('death').classList.add('hidden');Sound.play('level');keys.fire=false;
  $('pkCards').innerHTML=me.offer.map((id,i)=>{const p=perkById(id),[rn,rc]=RARITY[p.r],have=(me.perks||{})[id]||0;return `<button class="pkcard" data-perk="${id}" style="--rc:${rc};animation-delay:${i*.12}s"><span class="pkr">${rn}</span><span class="pkic">${I(p.ic)}</span><b>${escapeHtml(p.n)}</b><small>${escapeHtml(p.d)}</small>${have?`<em>Você tem ${have}× — acumula!</em>`:''}<span class="pkkey">${i+1}</span></button>`}).join('');
  $('pkCards').querySelectorAll('[data-perk]').forEach(b=>b.onclick=()=>pickPerkUI(b.dataset.perk))}
function pickPerkUI(id){const me=players[self];if(!me||!me.picking)return;Sound.play('capture');celebrate(30);$('perkOv').classList.add('hidden');offerKey='';
  if(host)choosePerk(me,id,time());else if(conn)send(conn,{type:'perk',id})}
addEventListener('keydown',e=>{const me=players[self];if(view!=='game'||!me||!me.picking||!me.offer)return;const n=+e.key;if(n>=1&&n<=3&&me.offer[n-1]){e.stopImmediatePropagation();pickPerkUI(me.offer[n-1])}},true);
addEventListener('pointermove',e=>{if(e.pointerType==='mouse'){mouseSX=e.clientX;mouseSY=e.clientY;mouseOn=true}},{passive:true});
document.addEventListener('mouseleave',()=>{mouseOn=false});
if(location.hash==='#debug')window.__67.offTest=(names,offs)=>{const out=[];cfg.mode='ffa';cfg.map='ilha';setupMode();host=true;solo=true;
  for(const n of names){const g=GUNS.find(x=>x.n===n);const row=[n];for(const off of offs){players={};bullets=[];builds=[];fields=[];effects=[];gems=[];meds=[];crates=[];
    const me=newPlayer('me','Eu',defaultLook(0)),dum=newPlayer('dum','Alvo',defaultLook(1));players={me,dum};self='me';me.x=400;me.y=260;dum.x=700;dum.y=260+off;me.guns=[g.id,-1];me.gun=g.id;dum.shieldUntil=0;
    let hits=0,t0=time()+100000;for(let i=0;i<180;i++){const t=t0+i*1000/60;me.keys={fire:true};me.aim=0;me.ad=900;const hp=dum.hp;step(1/60,t);if(dum.hp<hp)hits++;dum.hp=100;dum.alive=true;dum.x=700;dum.y=260+off;dum.kx=dum.ky=0;dum.frozenUntil=0;me.x=400;me.y=260;me.hp=100}
    row.push(hits)}out.push(row)}return out};
if(location.hash==='#debug')window.__67.teleTest=()=>{cfg.mode='ffa';cfg.map='labirinto';setupMode();host=true;solo=true;players={};bullets=[];builds=[];fields=[];effects=[];
  const me=newPlayer('me','Eu',defaultLook(0));players={me};self='me';const g=GUNS.find(x=>x.n==='Porta de Bolso');me.guns=[g.id,-1];me.gun=g.id;me.x=300;me.y=400;me.aim=Math.PI/2;const y0=me.y;let t0=time()+200000;
  for(let i=0;i<90;i++){const t=t0+i*1000/60;me.keys={fire:i<3};step(1/60,t)}return {from:[300,y0],to:[Math.round(me.x),Math.round(me.y)],inWall:inWall(me.x,me.y,0)}};

// ---------- Abertura (Entre Mundos Studio) e tela de carregamento da partida ----------
const TIPS=['O dash atravessa a confusão: use para fugir de granadas.','Kits médicos recuperam metade da vida.','Caixas com "?" trocam sua arma atual.','Aperte Q (ou o botão de troca) para alternar entre as duas armas.',
  'A Pausa Dramática congela até os tiros dentro dela.','Paredes da Pá de Pedreiro bloqueiam tiros por 16 segundos.','Junte 67 laranjinhas para subir de nível e escolher um poder.','Quem está atrás de parede aparece como silhueta colorida.',
  'Na Lagoa da Noite, as laranjinhas e os tiros iluminam o caminho.','A Calculadora 67: acerte um 6 e depois um 7 no mesmo alvo.','Capivara parada também é capivara feliz. Mas capivara que desvia vive mais.',
  'No Rei da Lagoa, fique sozinho dentro da água para pontuar.','Explosões empurram: cuidado perto das bordas do mapa.','Clique na sua capivara no menu para ver uma gracinha.','Troque a cor da sua capivara na aba Visual (o cabide).'];
const LOADART=['vangogh','criacao','perola','monalisa'];
let mlBusy=false,mlIdx=-1,mlFront=0,mlTimer=0,mlTipT=0;
function mlNextImg(){let i;do{i=Math.floor(Math.random()*LOADART.length)}while(i===mlIdx&&LOADART.length>1);mlIdx=i;const k=LOADART[i],a=$('mlA'),b=$('mlB'),on=mlFront?a:b,off=mlFront?b:a;mlFront^=1;
  on.onload=()=>{on.classList.remove('on');void on.offsetWidth;on.classList.add('on');off.classList.remove('on')};const url=`loading/${k}.jpg`;if(on.getAttribute('src')===url&&on.complete)on.onload();else on.src=url;$('mlArt').textContent=ART[k]}
function mlTip(){const p=$('mlTip');p.classList.remove('in');void p.offsetWidth;p.textContent=pick(TIPS);p.classList.add('in')}
function setLoadPct(p){p=clamp(p,0,1);$('mlPct').textContent=Math.round(p*100)+'%';$('mlFillRect').setAttribute('y',String(100-100*p))}
function showLoad(kind){const md=modeById(cfg.mode),mp=mapById(cfg.map);$('mlKind').textContent=kind==='online'?'ONLINE':'CONTRA BOTS';$('mlTitle').textContent=md.n.toUpperCase();$('mlMap').textContent=mp.n+(kind==='online'?'':' • '+cfg.bots+' bots');
  setLoadPct(0);mlNextImg();mlTip();const el=$('mload');el.classList.remove('hidden','out');document.body.classList.add('bootact');clearInterval(mlTimer);clearInterval(mlTipT);mlTimer=setInterval(mlNextImg,1800);mlTipT=setInterval(mlTip,3200);
  if(kind==='online'){const t0=performance.now();const f=()=>{const k=(performance.now()-t0)/5000;setLoadPct(k);if(k<1&&!el.classList.contains('hidden'))requestAnimationFrame(f)};f()}}
function hideLoad(){const el=$('mload');if(el.classList.contains('hidden'))return;setLoadPct(1);el.classList.add('out');clearInterval(mlTimer);clearInterval(mlTipT);setTimeout(()=>{el.classList.add('hidden');el.classList.remove('out');if(!bootOn)document.body.classList.remove('bootact')},450)}
// partida contra bots: pelo menos 5 s de carregamento; o mapa 3D é montado e os shaders compilados por trás
function matchLoad(kind){if(mlBusy)return;mlBusy=true;showLoad(kind);const t0=performance.now(),M0=mapById(cfg.map);let started0=false;
  const step=()=>{const el=performance.now()-t0;let ready=false;try{ready=Map3D.preload(M0)}catch(e){}setLoadPct(Math.min(el/5000,ready?1:.95));
    if(!started0&&((el>=5000&&ready)||el>25000)){started0=true;stopDemo();startBots();setTimeout(()=>{hideLoad();mlBusy=false},500);return}
    requestAnimationFrame(step)};requestAnimationFrame(step)}
// abertura: tela roxa, logo do estúdio com animação cômica e o jogo carregando por trás
let bootOn=true;
(()=>{const b=$('boot');document.body.classList.add('bootact');const t0=performance.now();
  const tick=()=>{const el=performance.now()-t0,ok=Map3D.menuOk;$('bootFill').style.width=Math.min(100,(Math.min(1,el/4300)*.75+(ok?.25:0))*100)+'%';
    if((el>4300&&ok)||el>15000){b.classList.add('out');setTimeout(()=>{b.remove();bootOn=false;if($('mload').classList.contains('hidden'))document.body.classList.remove('bootact')},700);return}requestAnimationFrame(tick)};requestAnimationFrame(tick)})();
