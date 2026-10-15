// ===== CapyAmigos: amigos por código, quem está online, mensagens =====
// Conta guardada no navegador (67x_social). O servidor é o Durable Object "Social".
const SOC={me:null,friends:{},ws:null,open:false,sel:null,hist:{},fails:0,ping:null,lastSt:'',lastProf:'',narrowChat:false};
let socReads=store.get('socReads',{});
const socOn=()=>!!API_BASE;
function socAgo(t){if(!t)return'há muito tempo';const m=Math.floor((Date.now()-t)/60000);if(m<2)return'agora há pouco';if(m<60)return`há ${m} min`;const h=Math.floor(m/60);if(h<24)return`há ${h} h`;const d=Math.floor(h/24);return d===1?'ontem':`há ${d} dias`}
function socWhere(f){if(!f.online)return'visto '+socAgo(f.seen);const st=f.st||{};
  return st.w==='game'?'em partida'+(st.rn?' • '+st.rn:''):st.w==='lobby'?'no saguão'+(st.rn?' • '+st.rn:''):st.w==='result'?'vendo o resultado':st.w==='bots'?'treinando com bots':'online no menu'}
const socUnread=f=>f.lastIn>(socReads[f.id]||0);
function socMarkRead(id){const f=SOC.friends[id];if(!f)return;socReads[id]=Math.max(f.lastIn||0,Date.now());store.set('socReads',socReads);socBadges()}

async function socInit(){if(!socOn())return;document.body.classList.add('social');let acc=store.get('social',null);
  if(!acc||!acc.id){try{const r=await fetch(API_BASE+'/api/social/register',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({name:myNick(),look:myLook})});
      if(!r.ok)throw new Error('http '+r.status);acc=await r.json();store.set('social',acc)}catch(e){setTimeout(socInit,20000);return}}
  socConnect()}
function socConnect(){const acc=store.get('social',null);if(!acc)return;
  let ws;try{ws=new WebSocket((location.protocol==='https:'?'wss://':'ws://')+location.host+'/api/social/ws?id='+encodeURIComponent(acc.id)+'&s='+encodeURIComponent(acc.secret))}catch(e){return}
  SOC.ws=ws;let opened=false;
  ws.onopen=()=>{opened=true;SOC.open=true;SOC.fails=0;SOC.lastSt='';SOC.lastProf='';socTick();clearInterval(SOC.ping);SOC.ping=setInterval(()=>{if(ws.readyState===1)ws.send('ping')},25000)};
  ws.onmessage=e=>{if(e.data==='pong')return;let d;try{d=JSON.parse(e.data)}catch(_){return}socMsg(d)};
  ws.onclose=()=>{SOC.open=false;clearInterval(SOC.ping);if(SOC.ws!==ws)return;SOC.ws=null;
    if(!opened&&++SOC.fails>=4){SOC.fails=0;store.set('social',null);setTimeout(socInit,3000);return} // conta sumiu do servidor: cria outra
    setTimeout(socConnect,Math.min(30000,2000*(1+SOC.fails)))}}
function socSend(d){if(SOC.ws&&SOC.ws.readyState===1)SOC.ws.send(JSON.stringify(d))}

function socMsg(d){switch(d.type){
  case 'state':SOC.me=d.me;SOC.friends={};for(const f of d.friends)SOC.friends[f.id]=f;$('frMyCode').textContent=d.me.code;socRender();break;
  case 'list':for(const f of d.friends)SOC.friends[f.id]=Object.assign(SOC.friends[f.id]||{},f);socRender();break;
  case 'presence':{const f=SOC.friends[d.id];if(!f)break;const was=f.online;Object.assign(f,{online:d.online,seen:d.seen,st:d.st,name:d.name,look:d.look});
    if(d.online&&!was&&view!=='game')toast(f.name+' ficou online','good');socRender();break}
  case 'friend':{const f=d.f;SOC.friends[f.id]=f;if(d.by){toast(f.name+' te adicionou como CapyAmigo!','good');Sound.play('yes')}if(d.added){toast(f.name+' agora é seu CapyAmigo!','good');Sound.play('yes');$('frCode').value='';socSelect(f.id)}socRender();break}
  case 'unfriend':delete SOC.friends[d.id];if(SOC.sel===d.id){SOC.sel=null;SOC.narrowChat=false}socRender();break;
  case 'msg':{const m=d.m,mine=m.a===(SOC.me&&SOC.me.id),other=mine?m.b:m.a,f=SOC.friends[other];if(!f)break;
    (SOC.hist[other]=SOC.hist[other]||[]).push(m);if(!mine){f.lastIn=m.t;const reading=socIsOpen()&&SOC.sel===other;
      if(reading)socMarkRead(other);else{toast(f.name+': '+m.txt);Sound.play('pop')}}
    socRender();break}
  case 'hist':SOC.hist[d.with]=d.msgs;if(d.with===SOC.sel)socRenderChat(true);break;
  case 'err':toast(d.msg,'bad');Sound.play('no');break}}

// Onde estou (para os amigos verem e poderem entrar na sala)
function socTick(){if(!SOC.open)return;const inRoom=srvMode()&&!!self&&!!room&&room!=='OFFLINE';
  const w=started&&solo?'bots':inRoom?(started?(over?'result':'game'):'lobby'):'menu';
  const st={w,room:inRoom?room:'',rn:inRoom&&srvInfo?srvInfo.name:'',mode:started?MODE.n:''};const k=JSON.stringify(st);if(k!==SOC.lastSt){SOC.lastSt=k;socSend(Object.assign({type:'st'},st))}
  const prof=JSON.stringify([myNick(),myLook]);if(prof!==SOC.lastProf){SOC.lastProf=prof;socSend({type:'profile',name:myNick(),look:myLook})}}
setInterval(socTick,2000);

// ---------- Painel ----------
const socIsOpen=()=>!$('friendsOv').classList.contains('hidden');
function socOpen(){if(!socOn())return;Sound.play('click');$('friendsOv').classList.remove('hidden');
  if(view==='game'){for(const k of KEYLIST)keys[k]=false;pushInputs(true)}
  $('frPanel').classList.toggle('one',innerWidth<760);socSend({type:'list'});if(SOC.sel){socSend({type:'hist',with:SOC.sel});socMarkRead(SOC.sel)}socRender();
  if(!SOC.open)$('frList').innerHTML=`<div class="rlempty">Conectando aos CapyAmigos<span class="dots"></span></div>`}
function socClose(){$('friendsOv').classList.add('hidden');document.activeElement&&document.activeElement.blur&&document.activeElement.blur()}
function socSelect(id){SOC.sel=id;SOC.narrowChat=true;socMarkRead(id);socSend({type:'hist',with:id});socRender()}
function socBadges(){const fs=Object.values(SOC.friends),unread=fs.filter(socUnread).length,online=fs.filter(f=>f.online).length;
  document.querySelectorAll('[data-friends] .frbadge').forEach(b=>{b.classList.toggle('hidden',!unread&&!online);b.classList.toggle('red',!!unread);b.textContent=unread||online})}
function socRender(){socBadges();if(!socIsOpen())return;const fs=Object.values(SOC.friends).sort((a,b)=>(b.online-a.online)||(socUnread(b)-socUnread(a))||a.name.localeCompare(b.name));
  $('frBody').classList.toggle('chatting',SOC.narrowChat&&!!SOC.sel);
  if(!SOC.open&&!fs.length)return;
  $('frList').innerHTML=fs.length?fs.map(f=>`<button class="fritem${f.id===SOC.sel?' on':''}" data-fid="${f.id}"><canvas width="80" height="80"></canvas><span class="frmain"><b>${escapeHtml(f.name)}</b><small class="${f.online?'on':''}"><i class="dot"></i>${escapeHtml(socWhere(f))}</small></span>${socUnread(f)?'<em class="unread"></em>':''}</button>`).join('')
    :`<div class="rlempty">${I('users')}<b>Nenhum CapyAmigo ainda.</b><span>Mande seu código para os amigos ou digite o código deles acima.</span></div>`;
  $('frList').querySelectorAll('.fritem').forEach((b,i)=>{drawPortrait(b.querySelector('canvas'),cleanLook(fs[i].look),{bg:true});b.onclick=()=>{Sound.play('click');socSelect(b.dataset.fid)}});
  socRenderChat()}
function socRenderChat(scroll){const f=SOC.friends[SOC.sel];const head=$('frCHead');
  if(!f){head.innerHTML='';$('frMsgs').innerHTML=`<div class="rlempty">${I('chat')}<b>Escolha um amigo para conversar.</b></div>`;$('frTxt').disabled=true;$('frSendBtn').disabled=true;return}
  $('frTxt').disabled=false;$('frSendBtn').disabled=false;
  const canJoin=f.online&&f.st&&f.st.room&&!(srvMode()&&room===f.st.room&&self);
  head.innerHTML=`<button class="btn round small frback" aria-label="Voltar">${I('back')}</button><canvas width="80" height="80"></canvas><span class="frmain"><b>${escapeHtml(f.name)}</b><small class="${f.online?'on':''}"><i class="dot"></i>${escapeHtml(socWhere(f))}</small></span>
    ${canJoin?`<button class="btn small gold frjoin">${I('arrow','ic')}ENTRAR NA SALA</button>`:''}<button class="btn round small danger frdel" aria-label="Remover amigo" title="Remover amigo">${I('trash')}</button>`;
  drawPortrait(head.querySelector('canvas'),cleanLook(f.look),{bg:true});
  head.querySelector('.frback').onclick=()=>{Sound.play('click');SOC.narrowChat=false;socRender()};
  head.querySelector('.frdel').onclick=async()=>{if(await confirmBox('Remover amigo?',`${f.name} vai sair da sua lista de CapyAmigos.`,'REMOVER','CANCELAR'))socSend({type:'del',id:f.id})};
  const j=head.querySelector('.frjoin');if(j)j.onclick=async()=>{const busy=started||(conn&&self);if(busy&&!await confirmBox('Entrar na sala de '+f.name+'?','Você vai sair da partida atual.','ENTRAR','FICAR'))return;socClose();nickReady&&nickReady();srvJoin(f.st.room)};
  const box=$('frMsgs'),atEnd=box.scrollHeight-box.scrollTop-box.clientHeight<40,ms=SOC.hist[f.id];
  if(!ms){box.innerHTML=`<div class="rlempty">Carregando conversa<span class="dots"></span></div>`;return}
  const me=SOC.me&&SOC.me.id;let lastDay='';
  box.innerHTML=ms.length?ms.map(m=>{const d=new Date(m.t),day=d.toLocaleDateString('pt-BR'),hm=d.toLocaleTimeString('pt-BR',{hour:'2-digit',minute:'2-digit'});const sep=day!==lastDay?`<div class="frday">${day===new Date().toLocaleDateString('pt-BR')?'hoje':day}</div>`:'';lastDay=day;
    return sep+`<div class="bub ${m.a===me?'me':'them'}"><span>${escapeHtml(m.txt)}</span><small>${hm}</small></div>`}).join(''):`<div class="rlempty"><b>Diga oi para ${escapeHtml(f.name)}!</b></div>`;
  if(scroll||atEnd)box.scrollTop=box.scrollHeight}
function socSendMsg(){const t=$('frTxt').value.trim();if(!t||!SOC.sel)return;if(!SOC.open){toast('Sem conexão com os CapyAmigos agora.','bad');return}socSend({type:'msg',to:SOC.sel,txt:t});$('frTxt').value='';Sound.play('pop')}
document.querySelectorAll('[data-friends]').forEach(b=>b.addEventListener('click',e=>{e.stopPropagation();socOpen()}));
$('frClose').onclick=()=>{Sound.play('click');socClose()};
$('friendsOv').addEventListener('pointerdown',e=>{if(e.target.id==='friendsOv')socClose()});
$('frCopy').onclick=()=>{const c=SOC.me&&SOC.me.code;if(!c)return;const done=()=>{toast('Código copiado! Manda pros amigos.','good');Sound.play('yes')};try{navigator.clipboard.writeText(c).then(done,()=>toast('Seu código: '+c))}catch(e){toast('Seu código: '+c)}};
$('frAdd').onclick=()=>{const c=$('frCode').value.toUpperCase().replace(/[^A-Z0-9]/g,'');if(c.length!==6){toast('O código tem 6 letras ou números.','bad');return}if(!SOC.open){toast('Sem conexão com os CapyAmigos agora.','bad');return}Sound.play('click');socSend({type:'add',code:c})};
$('frCode').addEventListener('input',()=>{$('frCode').value=$('frCode').value.toUpperCase().replace(/[^A-Z0-9]/g,'')});
$('frCode').onkeydown=e=>{if(e.key==='Enter')$('frAdd').click();if(e.key==='Escape')socClose()};
$('frTxt').onkeydown=e=>{if(e.key==='Enter')socSendMsg();if(e.key==='Escape')socClose()};
$('frSendBtn').onclick=socSendMsg;
addEventListener('keydown',e=>{if(e.key==='Escape'&&socIsOpen()){e.stopImmediatePropagation();socClose()}},true);
addEventListener('resize',()=>{if(socIsOpen()){$('frPanel').classList.toggle('one',innerWidth<760);socRender()}});
setInterval(()=>{if(socIsOpen()){socSend({type:'list'});socRender()}else socBadges()},30000);
socInit();
