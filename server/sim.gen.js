// GERADO por scripts/build.mjs a partir de src/js/ (00_util, 02_data, 04_game) + server/sim_glue.js. Não edite à mão.
export function createSim(){'use strict';
const TAU=Math.PI*2;
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

// ===== Dados: capivaras, modos, mapas e arsenal =====
const INK='#2A1A12';
const TEAM=[{n:'Laranja',c:'#FF8A1F',d:'#C2560A'},{n:'Azul',c:'#3DA5FF',d:'#1C6FB8'}];
// Modelos de capivara (presets)
const PRESETS=[
  {n:'Clássica',body:'#B07A4A',belly:'#E3B98A',hat:'none',acc:'none',out:'none'},
  {n:'Tangerina',body:'#A86F3F',belly:'#E8C190',hat:'tangerina',acc:'none',out:'none'},
  {n:'Ninja',body:'#5E4A3E',belly:'#B79C82',hat:'bandana',acc:'none',out:'jacket',ocol:'#2A2440'},
  {n:'Rosinha',body:'#E09AA8',belly:'#FBD7DD',hat:'flor',acc:'none',out:'none'},
  {n:'Albina',body:'#F2E6D4',belly:'#FFFFFF',hat:'none',acc:'glasses',out:'none'},
  {n:'Chocolate',body:'#6B4129',belly:'#B9805A',hat:'bone',acc:'none',out:'hoodie',ocol:'#3DA5FF'},
];
const OPT={
  btex:[['none','Liso'],['spots','Manchas'],['stripes','Listras'],['dots','Bolinhas'],['check','Xadrez'],['sparkle','Brilho']],
  eye:[['round','Bolinha'],['sleepy','Sonolento'],['star','Estrela'],['big','Fofo'],['angry','Bravo']],
  esize:[[0,'Pequeno'],[1,'Médio'],[2,'Grande']],
  expr:[['smile','Sorriso'],['smirk','Deboche'],['angry','Bravo'],['dizzy','Tonto'],['shout','Grito'],['tongue','Língua']],
  hat:[['none','Nada'],['tangerina','Tangerina'],['topete','Topete'],['bone','Boné'],['capacete','Capacete'],['bandana','Bandana'],['coroa','Coroa'],['cartola','Cartola'],['flor','Flor']],
  out:[['none','Nada'],['jacket','Jaqueta'],['cape','Capa'],['hoodie','Moletom'],['vest','Colete']],
  acc:[['none','Nada'],['goggles','Óculos de corrida'],['glasses','Óculos escuros'],['phones','Fone'],['scarf','Cachecol'],['jetpack','Foguete']],
  line:[['thick','Grosso'],['thin','Fino']],
};
const PALETTE=['#B07A4A','#6B4129','#F2E6D4','#E09AA8','#FF8A1F','#FFC531','#6CF06A','#19E39A','#45D4FF','#3D6BFF','#8E5BFF','#FF4F9A','#FF3B47','#8A93A6','#2A2440','#FFF4E0'];
const TRAILS=['#45D4FF','#FFC531','#FF4F9A','#6CF06A','#8E5BFF','#FF8A1F'];
function defaultLook(sp=0){const s=PRESETS[sp]||PRESETS[0];return{sp,body:s.body,belly:s.belly,btex:'none',eye:'round',esize:1,ecol:'#2A1A12',expr:'smile',hat:s.hat,hcol:'#FF8A1F',
  out:s.out,ocol:s.ocol||['#45D4FF','#FFC531','#2A2440','#FF4F9A','#3D6BFF','#3DA5FF'][sp],otex:'none',acc:s.acc,trail:TRAILS[sp%TRAILS.length],line:'thick',cheek:true}}
function randomLook(){const sp=Math.floor(Math.random()*PRESETS.length),L=defaultLook(sp);const o=k=>pick(OPT[k])[0];
  Object.assign(L,{btex:Math.random()<.65?'none':o('btex'),eye:o('eye'),esize:o('esize'),ecol:pick(['#2A1A12','#2A1A12','#3D6BFF','#6CF06A','#8E5BFF']),expr:o('expr'),hat:Math.random()<.25?'none':o('hat'),hcol:pick(PALETTE),out:o('out'),ocol:pick(PALETTE),otex:Math.random()<.7?'none':o('btex'),acc:Math.random()<.4?'none':o('acc'),trail:pick(TRAILS),cheek:Math.random()<.8});return L}
const HEX=/^#[0-9a-f]{6}$/i;
function cleanLook(o){o=o&&typeof o==='object'?o:{};const sp=clamp(Math.floor(+o.sp)||0,0,PRESETS.length-1),d=defaultLook(sp),L={sp};
  for(const k of ['body','belly','ecol','hcol','ocol','trail'])L[k]=HEX.test(o[k])?o[k]:d[k];
  for(const k of ['btex','eye','expr','hat','out','acc','line'])L[k]=OPT[k].some(x=>x[0]===o[k])?o[k]:d[k];
  L.otex=OPT.btex.some(x=>x[0]===o.otex)?o.otex:'none';L.esize=[0,1,2].includes(+o.esize)?+o.esize:1;L.cheek=o.cheek!==false;return L}

// ---------- Modos ----------
const MODES=[
  {id:'tdm',n:'Times',ic:'teams',d:'Metade contra metade. O time com mais eliminações vence.',teams:1,score:'kills',unit:'eliminações'},
  {id:'ffa',n:'Mata-mata',ic:'skull',d:'Todos contra todos. Quem eliminar mais vence.',score:'kills',unit:'eliminações'},
  {id:'onehit',n:'Um Tapa',ic:'slap',d:'Qualquer dano mata na hora. Sem kits médicos.',score:'kills',unit:'eliminações',onehit:1},
  {id:'hold',n:'Pega-Bandeira',ic:'flag',d:'Uma bandeira no mapa. Quem segurar por mais tempo vence (60 s ganha na hora).',score:'hold',unit:'segundos',target:60},
  {id:'ctf',n:'Rouba-Bandeira',ic:'flags',d:'Dois times. Roube a bandeira inimiga e leve até a sua base. 3 capturas vencem.',teams:1,score:'caps',unit:'capturas',target:3},
  {id:'koth',n:'Rei da Lagoa',ic:'pond',d:'Fique sozinho dentro da lagoa para pontuar. Ela muda de lugar!',score:'zone',unit:'pontos',target:60},
  {id:'gun',n:'Arsenal',ic:'cycle',d:'Cada eliminação troca sua arma. Quem passar pelas 12 armas primeiro vence.',score:'gun',unit:'armas',target:12},
  {id:'race',n:'Corrida 67',ic:'orange',d:'Primeiro a juntar 67 laranjinhas vence. Sem subir de nível.',score:'gems',unit:'laranjinhas',target:67},
];
const modeById=id=>MODES.find(m=>m.id===id)||MODES[0];

// ---------- Mapas (definidos pela metade esquerda e espelhados) ----------
const W=2400,H=1600;
const MAPS=[
  {id:'praca',n:'Praça Capy',theme:'light',style:'grass',d:'Gramado aberto com canteiros.',
    pal:{bg:'#7FB85A',a:'#8CC463',b:'#83BC5C',line:'#76AD52',wallTop:'#C98B5A',wallSide:'#8E5A33',deco:['#FFD166','#FF8FAB','#FFFFFF']},
    walls:[[420,300,200,56],[420,1244,200,56],[860,640,64,320],[1140,300,120,60],[1140,1240,120,60],[250,760,120,80]],bases:[[180,800]],zones:[[1200,800],[640,520],[640,1080]]},
  {id:'lagoa',n:'Lagoa da Noite',theme:'dark',style:'night',d:'Escuro, iluminado só pelas capivaras.',
    pal:{bg:'#14213D',a:'#1B2A4A',b:'#182644',line:'#22345A',wallTop:'#3E5C3A',wallSide:'#22361F',deco:['#7DF9FF','#C3A6FF','#FFF3B0']},
    walls:[[560,200,70,380],[560,1020,70,380],[900,720,180,70],[320,700,70,200],[1160,420,80,80],[1160,1100,80,80]],bases:[[170,800]],zones:[[1200,800],[760,320],[760,1280]]},
  {id:'labirinto',n:'Labirinto de Tijolo',theme:'light',style:'brick',d:'Corredores apertados. Cuidado nas esquinas.',
    pal:{bg:'#E9D8B8',a:'#EFE0C2',b:'#E5D2AE',line:'#D9C29A',wallTop:'#D2603F',wallSide:'#8E3520',deco:['#7FB85A','#FFFFFF','#FFC531']},
    walls:[[300,250,500,50],[300,250,50,400],[300,1300,500,50],[300,950,50,400],[600,550,50,500],[850,250,50,350],[850,1000,50,350],[1000,760,400,80],[1050,450,150,50],[1050,1100,150,50]],bases:[[150,800]],zones:[[1200,800],[470,800],[1200,350]]},
  {id:'neon',n:'Capy Neon',theme:'dark',style:'neon',d:'Blocos brilhantes na cidade à noite.',
    pal:{bg:'#0E0A1F',a:'#140F2B',b:'#110C25',line:'#2A1F55',wallTop:'#1E1440',wallSide:'#0A0718',glow:'#FF4F9A',glow2:'#45D4FF',deco:['#FF4F9A','#45D4FF','#FFC531']},
    walls:[[400,400,140,140],[400,1060,140,140],[760,760,100,80],[1000,200,90,260],[1000,1140,90,260],[1150,700,100,200]],bases:[[170,800]],zones:[[1200,800],[470,800],[1200,280]]},
  {id:'fortaleza',n:'Fortaleza',theme:'light',style:'sand',d:'Duas bases muradas. Perfeito para roubar bandeira.',
    pal:{bg:'#E8C98A',a:'#EDD198',b:'#E3C281',line:'#D8B26C',wallTop:'#A88A6A',wallSide:'#6E5640',deco:['#7FB85A','#D9813B','#FFFFFF']},
    walls:[[120,560,260,50],[120,990,260,50],[380,560,50,150],[380,890,50,150],[700,350,60,260],[700,990,60,260],[1000,720,120,160],[1150,300,100,60],[1150,1240,100,60]],bases:[[220,800]],zones:[[1200,800],[730,800],[1200,170]]},
  {id:'ilha',n:'Ilha Laranja',theme:'light',style:'beach',d:'Areia e água rasa. Quase nada para se esconder.',
    pal:{bg:'#7FD3E8',a:'#F3DCA2',b:'#EFD597',line:'#E6C985',wallTop:'#9B9B8A',wallSide:'#5F5F52',deco:['#FF8A1F','#3DBE6C','#FFFFFF']},
    walls:[[700,500,90,70],[700,1030,90,70],[1150,770,100,60]],bases:[[200,800]],zones:[[1200,800],[600,800],[1200,300]]},
];
// espelha paredes/bases/zonas
for(const m of MAPS){const seen=new Set(),all=[];for(const [x,y,w,h] of m.walls){for(const r of [[x,y,w,h],[W-x-w,y,w,h]]){const k=r.join(',');if(!seen.has(k)){seen.add(k);all.push(r)}}}m.walls=all;
  m.bases=[m.bases[0],[W-m.bases[0][0],m.bases[0][1]]];const zs=[];for(const z of m.zones){zs.push(z);if(Math.abs(z[0]-W/2)>5)zs.push([W-z[0],z[1]])}m.zones=zs}
const mapById=id=>MAPS.find(m=>m.id===id)||MAPS[0];

// ---------- Arsenal (67 armas) ----------
const CATS={pistol:['Pistola','#45D4FF'],smg:['Metralhadora','#6CF06A'],rifle:['Rifle','#B98CFF'],shotgun:['Escopeta','#FFC531'],heavy:['Pesada','#FF7A1A'],laser:['Energia','#FF4F9A'],
  melee:['Corpo a corpo','#FFF4E0'],throw:['Arremesso','#2EE6D6'],explosive:['Explosivo','#9CCB4A'],special:['Especial','#C38BFF'],builder:['Construção','#D9A066']};
const TIERS={inutil:['Inútil','#8A93A6',1.0],mediana:['Mediana','#45D4FF',1.2],boa:['Boa','#6CF06A',1.0],apelona:['Apelona','#FF4F9A',.32],lendaria:['Lendária','#FFC531',.06]};
// m=modelo do desenho, c1/c2=cores, p=projétil
const GUNS=[
 // PISTOLAS
 {n:'Blaster Chiclete',cat:'pistol',tier:'mediana',cd:230,sp:560,r:6,dmg:14,p:'bubble',col:'#FF7FC0',m:'pistol',c1:'#FF7FC0',c2:'#FFE0F0',x:'bubbles',sfx:'pop',d:'Pistola de água rosa que atira bolhas de chiclete.',q:'estourou sua bolha de chiclete.'},
 {n:'Pew Pew',cat:'pistol',tier:'mediana',cd:150,sp:620,r:7,dmg:8,p:'text',txt:'PEW',col:'#45D4FF',m:'finger',c1:'#B07A4A',c2:'#45D4FF',sfx:'pew',d:'A capivara faz arminha com a pata. Funciona, acredite.',q:'fez PEW PEW. Literalmente.'},
 {n:'Revólver de Rolha',cat:'pistol',tier:'boa',cd:600,sp:650,r:7,dmg:30,knock:380,p:'cork',col:'#E8C07A',m:'revolver',c1:'#3D6B4F',c2:'#E8C07A',sfx:'pop',d:'PLOC! Dano alto e empurra quem leva.',q:'abriu um espumante na sua cara.'},
 {n:'Estilingue de Caroço',cat:'pistol',tier:'inutil',cd:420,sp:420,r:4,dmg:6,p:'seed',col:'#8B5A2B',m:'slingshot',c1:'#9B6B3E',c2:'#FF4F9A',sfx:'throw',d:'Atira caroço de jabuticaba. Faz cócegas.',q:'te acertou com um caroço. Que vergonha.'},
 {n:'Pistola de Gelo',cat:'pistol',tier:'boa',cd:520,sp:700,r:6,dmg:12,freeze:900,p:'ice',col:'#A8EBFF',m:'pistol',c1:'#7FD8FF',c2:'#FFFFFF',x:'crystal',sfx:'freeze',d:'Cada acerto congela o alvo por quase 1 segundo.',q:'te transformou em picolé.'},
 {n:'Câmera Flash',cat:'pistol',tier:'mediana',cd:900,sp:900,r:7,dmg:5,n2:3,spr:.35,life:.35,flash:1600,p:'spark',col:'#FFFBE0',m:'camera',c1:'#2A2440',c2:'#FFFBE0',sfx:'flash',d:'Clique! Deixa o alvo cego por 1,6 s. Alcance curto.',q:'tirou uma foto sua. Com flash.'},
 // METRALHADORAS
 {n:'Metralhadora de Pipoca',cat:'smg',tier:'mediana',cd:90,sp:580,r:4.5,dmg:6,spr:.12,p:'popcorn',col:'#FFF4B0',m:'smg',c1:'#E8443A',c2:'#FFF4B0',x:'popcorn',sfx:'pop',d:'Cinema em alta velocidade.',q:'te serviu pipoca. Quente.'},
 {n:'Gatling Grampeadora',cat:'smg',tier:'mediana',cd:70,sp:640,r:3.5,dmg:4.5,spr:.28,p:'staple',col:'#CFE3F5',m:'stapler',c1:'#5B6B80',c2:'#CFE3F5',sfx:'pew',d:'Grampeia tudo. TUDO.',q:'te grampeou no relatório.'},
 {n:'Colmeia Furiosa',cat:'smg',tier:'boa',cd:160,sp:360,r:6,dmg:8,spr:.35,homing:2.6,life:1.8,p:'bee',col:'#FFC531',m:'hive',c1:'#FFC531',c2:'#8B5A2B',sfx:'pew',d:'Abelhas que perseguem o inimigo mais perto.',q:'soltou as abelhas. Elas ganharam.'},
 {n:'Minigun Capivara',cat:'smg',tier:'apelona',cd:45,sp:760,r:4,dmg:7,spr:.2,p:'bullet',col:'#FFE066',m:'minigun',c1:'#4A4F5C',c2:'#FF8A1F',sfx:'pew',d:'Seis canos girando. Ninguém para isso.',q:'derreteu você com a minigun.'},
 {n:'Mangueira de Mel',cat:'smg',tier:'mediana',cd:110,sp:420,r:7,dmg:3,slow:1300,spr:.15,life:.9,p:'honey',col:'#F5B014',m:'hose',c1:'#3DBE6C',c2:'#F5B014',sfx:'pop',d:'Melado: deixa os inimigos lentos.',q:'te deixou grudado no mel.'},
 // RIFLES
 {n:'Rifle de Bambu',cat:'rifle',tier:'boa',cd:430,sp:1150,r:5,dmg:28,p:'bullet',col:'#C8F08F',m:'rifle',c1:'#9CCB4A',c2:'#5E8A2A',x:'bamboo',sfx:'pew',d:'Preciso e rápido. Feito de bambu orgânico.',q:'te acertou com bambu sustentável.'},
 {n:'Sniper Capi-67',cat:'rifle',tier:'apelona',cd:1500,sp:2600,r:5,dmg:95,p:'tracer',col:'#FFC531',m:'sniper',c1:'#2A2440',c2:'#FFC531',sfx:'laser',d:'Um tiro, quase sempre um fim. Atravessa o mapa.',q:'te achou da outra ponta do mapa.'},
 {n:'Arco Desentupidor',cat:'rifle',tier:'mediana',cd:580,sp:850,r:5,dmg:31,p:'plunger',col:'#E25A5A',m:'bow',c1:'#9B6B3E',c2:'#E25A5A',sfx:'throw',d:'PLUNK. Flecha rápida que gruda.',q:'te desentupiu da arena.'},
 {n:'Besta de Cenoura',cat:'rifle',tier:'boa',cd:700,sp:950,r:6,dmg:34,pierce:1,p:'carrot',col:'#FF8A1F',m:'crossbow',c1:'#8B5A2B',c2:'#FF8A1F',sfx:'throw',d:'A cenoura atravessa todo mundo na linha.',q:'te espetou com uma cenoura.'},
 // ESCOPETAS
 {n:'Escopeta de Confete',cat:'shotgun',tier:'boa',cd:650,sp:450,r:5,dmg:9,n2:6,spr:.55,life:.8,p:'confetti',col:'#FFC531',m:'partycannon',c1:'#FF4F9A',c2:'#FFC531',sfx:'heavy',d:'Festa forte de perto.',q:'te convidou pra festa à força.'},
 {n:'Sanfona Sonora',cat:'shotgun',tier:'mediana',cd:780,sp:420,r:5,dmg:7,n2:9,spr:.8,life:.45,recoil:320,p:'note',col:'#B98CFF',m:'accordion',c1:'#E8443A',c2:'#FFF4E0',sfx:'honk',d:'Notas desafinadas em leque. Coice forte.',q:'tocou forró no último volume.'},
 {n:'Escopeta de Sal Grosso',cat:'shotgun',tier:'boa',cd:820,sp:520,r:4,dmg:11,n2:8,spr:.42,life:.55,p:'pellet',col:'#FFFFFF',m:'shotgun',c1:'#6E4A2E',c2:'#C9CED8',sfx:'heavy',d:'Clássica de dois canos. Arde.',q:'temperou você com sal grosso.'},
 {n:'Bacamarte do Vovô',cat:'shotgun',tier:'boa',cd:1250,sp:480,r:5,dmg:9,n2:12,spr:.9,life:.6,knock:260,p:'pellet',col:'#D9A066',m:'blunderbuss',c1:'#8B5A2B',c2:'#C9A227',sfx:'heavy',d:'Boca de sino, doze chumbinhos, zero mira.',q:'disparou o bacamarte do vovô.'},
 // PESADAS
 {n:'Canhão de Melancia',cat:'heavy',tier:'boa',cd:860,sp:330,r:14,dmg:35,boom:70,p:'melon',col:'#FF5D7A',m:'cannon',c1:'#3D3D46',c2:'#3DBE6C',sfx:'heavy',d:'Splash de fruta. Sementes inclusas.',q:'te acertou com uma melancia inteira.'},
 {n:'Rojão de São João',cat:'heavy',tier:'boa',cd:880,sp:480,r:9,dmg:40,boom:100,p:'rocket',col:'#FF7A1A',m:'bazooka',c1:'#E8443A',c2:'#FFC531',sfx:'heavy',d:'Arraiá explosivo.',q:'soltou um rojão no seu arraiá.'},
 {n:'Bazuca de Bigorna',cat:'heavy',tier:'boa',cd:1500,sp:260,r:16,dmg:60,stun:1000,knock:300,p:'anvil',col:'#8A93A6',m:'bazooka',c1:'#5B6B80',c2:'#8A93A6',x:'anvil',sfx:'heavy',d:'CLANG. Atordoa por 1 segundo.',q:'derrubou uma bigorna. Clássico.'},
 {n:'Bazuca Mãe de Todas',cat:'heavy',tier:'apelona',cd:2600,sp:300,r:22,dmg:110,boom:220,p:'bigrocket',col:'#FF3B47',m:'megabazooka',c1:'#3E5C3A',c2:'#FF3B47',sfx:'boom',d:'Gigante. Explosão enorme. Treme a tela de todo mundo.',q:'usou a Mãe de Todas. Sobrou nada.'},
 {n:'RPG Teleguiado',cat:'heavy',tier:'apelona',cd:1800,sp:420,r:10,dmg:70,boom:120,homing:3.2,life:2.6,p:'rpg',col:'#FF7A1A',m:'rpg',c1:'#4A5A3A',c2:'#FF7A1A',sfx:'heavy',d:'Míssil que persegue o inimigo mais perto.',q:'mandou um míssil com seu nome.'},
 {n:'Canhão de Abóbora',cat:'heavy',tier:'mediana',cd:1000,sp:420,r:13,dmg:38,boom:90,bounce:2,fuse:1.6,p:'pumpkin',col:'#FF8A1F',m:'cannon',c1:'#5B3A8A',c2:'#FF8A1F',sfx:'heavy',d:'Abóbora que quica duas vezes antes de explodir.',q:'explodiu uma abóbora de Halloween em você.'},
 // ENERGIA
 {n:'Laser de Gato',cat:'laser',tier:'boa',cd:900,sp:1250,r:6,dmg:34,p:'beam',col:'#FF3B47',m:'laser',c1:'#FF4F9A',c2:'#FF3B47',x:'catears',sfx:'laser',d:'Feixe quase instantâneo. Miau.',q:'apontou o laser. Você correu atrás.'},
 {n:'Canhão de Gelatina',cat:'laser',tier:'boa',cd:1150,sp:330,r:20,dmg:46,p:'jelly',col:'#B777FF',m:'laser',c1:'#8E5BFF',c2:'#B777FF',x:'jar',sfx:'heavy',d:'Bola de plasma que treme.',q:'te enterrou em gelatina de uva.'},
 {n:'Raio Disco',cat:'laser',tier:'boa',cd:800,sp:1000,r:6,dmg:22,bounce:2,life:1.4,p:'beam',rainbow:1,col:'#45D4FF',m:'laser',c1:'#2A2440',c2:'#45D4FF',x:'disco',sfx:'laser',d:'Ricocheteia duas vezes nas paredes.',q:'te fez dançar até cair.'},
 {n:'Raio Congelante',cat:'laser',tier:'boa',cd:950,sp:1100,r:6,dmg:14,freeze:1300,p:'beam',col:'#A8EBFF',m:'laser',c1:'#7FD8FF',c2:'#FFFFFF',x:'crystal',sfx:'freeze',d:'Feixe gelado: congela por 1,3 s.',q:'te deixou no freezer.'},
 {n:'Tesla de Capivara',cat:'laser',tier:'apelona',cd:850,sp:900,r:7,dmg:30,chain:2,p:'bolt',col:'#FFF066',m:'tesla',c1:'#5B6B80',c2:'#FFF066',sfx:'zap',d:'O raio pula para mais 2 inimigos próximos.',q:'te eletrocutou em cadeia.'},
 // CORPO A CORPO
 {n:'Katana de Baguete',cat:'melee',tier:'boa',cd:420,range:72,dmg:32,arc:.28,col:'#F2C27A',m:'baguette',sfx:'melee',d:'Corte rápido. Crocante.',q:'te fatiou com pão francês.'},
 {n:'Martelo de Apito',cat:'melee',tier:'boa',cd:800,range:84,dmg:48,arc:.2,knock:520,col:'#FF7A1A',m:'hammer',c1:'#FF4F9A',c2:'#FFC531',sfx:'boing',d:'SQUEAK! Joga longe.',q:'deu uma martelada que fez SQUEAK.'},
 {n:'Luva de Mola',cat:'melee',tier:'mediana',cd:650,range:125,dmg:26,arc:.75,knock:650,col:'#FF3B47',m:'glove',sfx:'boing',d:'Soco que estica. BOING.',q:'te nocauteou com uma mola.'},
 {n:'Secador do Caos',cat:'melee',tier:'mediana',cd:90,sp:380,r:11,dmg:7,n2:3,spr:.55,life:.55,burn:1800,p:'flame',col:'#FF922E',m:'dryer',c1:'#FF4F9A',c2:'#FF922E',sfx:'melee',d:'Jato de fogo que deixa queimando.',q:'secou seu cabelo. E você junto.'},
 {n:'Rodo Molhado',cat:'melee',tier:'inutil',cd:500,range:80,dmg:4,arc:.4,knock:820,col:'#45D4FF',m:'squeegee',sfx:'slap',d:'Quase não machuca. Mas empurra MUITO.',q:'te puxou com o rodo. Humilhante.'},
 {n:'Peixe Espada',cat:'melee',tier:'mediana',cd:520,range:80,dmg:30,arc:.3,col:'#7FB7D9',m:'fish',sfx:'slap',d:'Uma bofetada com peixe. SLAP.',q:'te deu uma peixada.'},
 {n:'Serra de Pizza',cat:'melee',tier:'boa',cd:130,range:62,dmg:9,arc:.35,col:'#FFB547',m:'pizzasaw',sfx:'melee',d:'Cortador de pizza turbo. Muitos golpes rápidos.',q:'te cortou em oito fatias.'},
 // ARREMESSO
 {n:'Talheres Voadores',cat:'throw',tier:'mediana',cd:290,sp:680,r:5,dmg:17,n2:3,spr:.24,p:'fork',spin:1,col:'#DDE7F2',m:'forks',sfx:'throw',d:'Garfo, faca e colher. TING.',q:'te serviu de jantar.'},
 {n:'Shuriken de Pizza',cat:'throw',tier:'mediana',cd:390,sp:680,r:8,dmg:20,n2:2,spr:.21,p:'pizza',spin:1,col:'#FFB547',m:'pizza',sfx:'throw',d:'Fatias giratórias de queijo.',q:'mandou uma pizza sem pedir.'},
 {n:'Bumerangue de Banana',cat:'throw',tier:'boa',cd:750,sp:440,r:13,dmg:26,boomer:1,life:1.6,p:'banana',spin:1,col:'#FFE14D',m:'banana',sfx:'throw',d:'Vai e volta. Sempre volta.',q:'escorregou você na banana.'},
 {n:'Picareta Pula-Pula',cat:'throw',tier:'mediana',cd:520,sp:380,r:11,dmg:28,bounce:1,p:'pick',spin:1,col:'#9FB4C7',m:'pick',sfx:'throw',d:'Quica nas paredes.',q:'minerou você. Diamante?'},
 {n:'Chinelo Teleguiado',cat:'throw',tier:'boa',cd:800,sp:520,r:10,dmg:30,stun:400,homing:2.2,life:1.6,p:'slipper',spin:1,col:'#3DA5FF',m:'slipper',sfx:'slap',d:'Toda mãe tem. Persegue e atordoa.',q:'acertou a CHINELADA perfeita.'},
 {n:'Bola de Neve',cat:'throw',tier:'mediana',cd:450,sp:560,r:9,dmg:12,freeze:600,p:'snowball',col:'#FFFFFF',m:'snowball',sfx:'throw',d:'Gelada. Congela por um instante.',q:'te acertou uma bola de neve no meio do verão.'},
 // EXPLOSIVOS
 {n:'Patinho Bomba',cat:'explosive',tier:'boa',cd:1100,sp:300,r:12,dmg:38,boom:100,fuse:1,fric:1,p:'duck',col:'#FFD93D',m:'duck',sfx:'quack',d:'QUACK... e KABUM.',q:'mandou um patinho. Não era fofo.'},
 {n:'Trigêmeas',cat:'explosive',tier:'boa',cd:1400,sp:380,r:10,dmg:30,boom:85,n2:3,spr:.46,fuse:1.1,fric:1,p:'egg',col:'#9CF581',m:'eggs',sfx:'throw',d:'Três ovos. Três explosões.',q:'te acertou com ovos de Páscoa.'},
 {n:'Cuco-Bomba',cat:'explosive',tier:'boa',cd:1700,sp:420,r:10,dmg:55,boom:110,fuse:3,sticky:1,fric:1,p:'clock',col:'#C98B4E',m:'cuckoo',sfx:'throw',d:'Gruda e explode em 3 segundos.',q:'grudou um relógio cuco em você. CUCO!'},
 {n:'Coqueiro de Bolso',cat:'explosive',tier:'mediana',cd:720,sp:470,r:11,dmg:32,boom:90,fuse:.9,fric:.6,p:'coconut',spin:1,col:'#8B5A2B',m:'launcher',c1:'#3DBE6C',c2:'#8B5A2B',sfx:'heavy',d:'Cocos que rolam e explodem.',q:'derrubou um coco na sua cabeça.'},
 {n:'Chuva de Pinhatas',cat:'explosive',tier:'boa',cd:1800,sp:360,r:13,dmg:40,boom:90,n2:5,spr:.7,fuse:1,fric:.6,p:'candy',spin:1,col:'#FF4F9A',m:'launcher',c1:'#FF4F9A',c2:'#45D4FF',sfx:'heavy',d:'Cinco bombas de doce em leque.',q:'quebrou a pinhata. Você era a pinhata.'},
 {n:'Flashbang de Milho',cat:'explosive',tier:'boa',cd:1500,sp:380,r:10,dmg:14,boom:0,flashR:220,fuse:1.1,fric:1,p:'corn',col:'#FFE066',m:'corn',sfx:'throw',d:'Estoura em pipoca e cega todo mundo por perto.',q:'estourou um milho na sua frente.'},
 {n:'Mina de Tangerina',cat:'explosive',tier:'mediana',cd:900,sp:240,r:10,dmg:70,boom:100,mine:1,fric:3,life:22,p:'mine',col:'#FF8A1F',m:'mine',sfx:'throw',d:'Deixa uma mina escondida. Explode quando alguém chega perto.',q:'pisou na tangerina errada.'},
 {n:'Megabomba 67',cat:'explosive',tier:'apelona',cd:3000,sp:260,r:18,dmg:130,boom:260,fuse:2.4,fric:1.2,p:'megabomb',col:'#2A2440',m:'megabomb',sfx:'throw',d:'Pavio de 2,4 s. Explosão gigantesca.',q:'detonou a Megabomba 67.'},
 // ESPECIAIS
 {n:'NÃO',cat:'special',tier:'apelona',cd:2200,sp:600,r:22,dmg:999,p:'text',txt:'NÃO',col:'#FF4F9A',m:'megaphone',c1:'#FF3B47',c2:'#FFF4E0',sfx:'no',d:'Mata com um acerto. Recarga longa.',q:'disse NÃO. E foi um não bem firme.'},
 {n:'SIM',cat:'special',tier:'mediana',cd:680,sp:640,r:18,dmg:0,heal:38,p:'text',txt:'SIM',col:'#6CF06A',m:'megaphone',c1:'#3DBE6C',c2:'#FFF4E0',sfx:'yes',d:'Cura quem for atingido (aliados também).',q:'disse SIM... e mesmo assim.'},
 {n:'Porta de Bolso',cat:'special',tier:'mediana',cd:1700,sp:820,r:12,dmg:0,tele:1,life:.72,p:'door',col:'#45D4FF',m:'door',sfx:'warp',d:'Te teletransporta até onde o tiro cair.',q:'abriu uma porta. Você ficou do lado errado.'},
 {n:'Lançador de Portais',cat:'special',tier:'boa',cd:650,sp:400,r:10,dmg:22,portal:1,p:'portal',col:'#A16CFF',m:'portalgun',c1:'#A16CFF',c2:'#45D4FF',sfx:'warp',d:'O tiro some e reaparece atrás do alvo.',q:'te acertou pelas costas via portal.'},
 {n:'Buzina do Caos',cat:'special',tier:'mediana',cd:1100,sp:520,r:16,dmg:4,n2:5,spr:.9,life:.35,knock:420,confuse:1000,p:'wave',col:'#45D4FF',m:'horn',sfx:'honk',d:'FOM-FOM! Inverte os controles por 1 s.',q:'buzinou tão alto que você esqueceu de andar.'},
 {n:'Galinha Teleguiada',cat:'special',tier:'boa',cd:1300,sp:300,r:12,dmg:45,boom:90,homing:3.5,life:3,p:'chicken',col:'#FFFFFF',m:'chickengun',c1:'#E8443A',c2:'#FFFFFF',sfx:'quack',d:'Corre até o inimigo e explode.',q:'soltou a galinha. Ela te achou.'},
 {n:'A Calculadora 67',cat:'special',tier:'lendaria',cd:380,sp:620,r:9,dmg:16,calc:1,p:'text',col:'#FFC531',m:'calc',sfx:'pew',d:'Acerte um 6 e depois um 7 no mesmo alvo: explosão dourada.',q:'fez as contas: deu 67.'},
 {n:'Pausa Dramática',cat:'special',tier:'apelona',cd:2400,sp:520,r:12,dmg:10,timestop:{r:190,dur:3000},life:.9,p:'timeorb',col:'#9FD8FF',m:'stopwatch',sfx:'timestop',d:'Para o tempo numa área: congela capivaras e projéteis por 3 s e distorce a tela.',q:'parou o tempo. Você nem viu.'},
 {n:'Buraco Negro de Bolso',cat:'special',tier:'apelona',cd:2800,sp:380,r:12,dmg:0,hole:{r:280,dur:1600,dmg:90},life:.9,p:'holeorb',col:'#8E5BFF',m:'blackhole',sfx:'hole',d:'Puxa todo mundo por perto e implode.',q:'te sugou para outra dimensão.'},
 {n:'Chamar Meteoro',cat:'special',tier:'apelona',cd:3200,dmg:150,meteor:{r:170,delay:1400},range2:620,m:'remote',c1:'#3D3D46',c2:'#FF3B47',sfx:'meteor',d:'Marca o chão onde você mira. 1,4 s depois cai um meteoro.',q:'chamou um meteoro. Mira perfeita.'},
 {n:'Carimbo Gigante',cat:'special',tier:'apelona',cd:3000,dmg:999,stamp:{r:72,delay:700},range2:520,m:'stamp',c1:'#E8443A',c2:'#8B5A2B',sfx:'slap',d:'Um carimbo enorme cai do céu: elimina quem estiver embaixo.',q:'te carimbou: VETADO.'},
 {n:'Bolha de Sabão',cat:'special',tier:'inutil',cd:250,sp:120,r:12,dmg:1,life:2.4,spr:.6,p:'soap',col:'#C9F0FF',m:'wand',sfx:'pop',d:'Bolhas lentas que quase não machucam. Pelo menos é bonito.',q:'te venceu com bolhas de sabão. Como?'},
 // CONSTRUÇÃO
 {n:'Pá de Pedreiro',cat:'builder',tier:'boa',cd:1100,build:{k:'wall',hp:160,dur:16000,dist:70},m:'trowel',sfx:'build',d:'Levanta uma parede de tijolo na sua frente que bloqueia tiros.',q:'te emparedou.'},
 {n:'Caixa de Papelão',cat:'builder',tier:'mediana',cd:850,sp:380,r:14,dmg:15,knock:300,box:1,fuse:.6,fric:3,p:'box',m:'boxgun',c1:'#C9A06A',c2:'#8B5A2B',sfx:'throw',d:'Arremessa uma caixa que vira cobertura onde cair.',q:'te escondeu numa caixa. Pra sempre.'},
 {n:'Bolha Escudo',cat:'builder',tier:'boa',cd:2000,build:{k:'bubble',hp:240,dur:8000,dist:60},m:'shieldgen',c1:'#45D4FF',c2:'#FFFFFF',sfx:'build',d:'Cria uma cúpula que bloqueia os tiros inimigos por 8 s.',q:'nem a bolha te salvou.'},
 {n:'Capi-Torreta',cat:'builder',tier:'boa',cd:2600,build:{k:'turret',hp:120,dur:10000,dist:50},m:'turret',c1:'#5B6B80',c2:'#FF8A1F',sfx:'build',d:'Monta uma torreta que atira sozinha por 10 s.',q:'foi pego pela torreta automática.'},
];
GUNS.forEach((g,i)=>{g.id=i;g.n2=g.n2||1;g.spr=g.spr||0;g.life=g.life||(g.fuse||1.6);if(g.range&&!g.sp)g.melee=1;g.instant=!!(g.meteor||g.stamp||g.build)});
const GUN_SEQ=['Rifle de Bambu','Escopeta de Confete','Metralhadora de Pipoca','Bazuca de Bigorna','Laser de Gato','Colmeia Furiosa','Revólver de Rolha','Shuriken de Pizza','Chinelo Teleguiado','Pew Pew','Estilingue de Caroço','Rodo Molhado'].map(n=>GUNS.findIndex(g=>g.n===n));
function gunTags(g){const t=[];if(g.dmg>=900||g.stamp)t.push('Hit kill');if(g.freeze||g.timestop)t.push('Congela');if(g.flash||g.flashR)t.push('Clarão');if(g.homing)t.push('Teleguiado');if(g.boom||g.meteor)t.push('Explosivo');if(g.heal)t.push('Cura');if(g.build||g.box)t.push('Constrói');
  if(g.burn)t.push('Queima');if(g.slow)t.push('Deixa lento');if(g.stun)t.push('Atordoa');if(g.confuse)t.push('Confunde');if(g.knock)t.push('Empurra');if(g.bounce)t.push('Ricocheteia');if(g.pierce)t.push('Atravessa');if(g.chain)t.push('Corrente');if(g.tele||g.portal)t.push('Teletransporte');if(g.hole)t.push('Puxa');if(g.mine)t.push('Mina');return t}
function gunStats(g){const dps=g.heal?0:(g.dmg*g.n2)/(g.cd/1000);const range=g.melee?g.range:g.instant?(g.range2||300):g.sp*g.life;return{dano:clamp((g.dmg>=900?100:g.dmg*g.n2+(g.boom?25:0))/.9,4,100),cad:clamp(100-g.cd/26,4,100),alc:clamp(range/14,4,100),dps}}
function randomGun(except,level=1,excl2=-1){let pool=GUNS.filter(g=>g.id!==except&&g.id!==excl2&&g.tier!=='lendaria');if(level>=3&&Math.random()<.03)return GUNS.findIndex(g=>g.tier==='lendaria');
  const tot=pool.reduce((s,g)=>s+TIERS[g.tier][2],0);let r=Math.random()*tot;for(const g of pool){r-=TIERS[g.tier][2];if(r<=0)return g.id}return pool[0].id}

const DEATH_TITLES=['VOCÊ VIROU PAÇOCA!','CAPIVAROU!','F NO CHAT','DEU RUIM!','PLAFT!','KABUM EM VOCÊ!','VOLTA PRA LAGOA!'];
const TAGLINES=['A capivara mais calma do mundo. Até agora.','Contém galinhas teleguiadas','67 armas. Zero paciência.','Paz, amor e bazucas','Proibido para quem odeia confete','Agora com bandeiras para roubar'];
const BOT_NAMES=['Turbo','Byte','Pixel','Glitch','Bugado','Lag','Ping','Crash','Capitão','Lontra'];
const NICKS=['Capivara Turbinada','Capi Veloz','Tangerina Furiosa','Capi 67','Paçoca','Zé Dash','Capivarístico','Rei da Lagoa','Mestre SIM','Dona NÃO'];

// ---------- Power-ups (cartas) ----------
const KILLS_PER_CARD=3,FRUITS_PER_CARD=20;
const RARITY={comum:['Comum','#45D4FF',1],raro:['Rara','#6CF06A',.7],epico:['Épica','#FF4F9A',.4],lendario:['Lendária','#FFC531',.16]};
const PERKS=[
 {id:'vida',n:'Vida Extra',d:'+25 de vida máxima e cura total na hora.',ic:'heart',r:'comum'},
 {id:'forca',n:'Força Capivara',d:'+15% de dano em todas as armas.',ic:'sword',r:'raro'},
 {id:'gatilho',n:'Gatilho Rápido',d:'Todas as armas recarregam 15% mais rápido.',ic:'target',r:'raro'},
 {id:'patas',n:'Patas Ligeiras',d:'+12% de velocidade de movimento.',ic:'feather',r:'comum'},
 {id:'dashcd',n:'Dash Turbo',d:'O dash recarrega 35% mais rápido.',ic:'wind',r:'comum'},
 {id:'superdash',n:'Super Dash',d:'O dash vai 40% mais longe.',ic:'arrow',r:'comum'},
 {id:'regen',n:'Soneca na Lagoa',d:'Regenera 2 de vida por segundo, sempre.',ic:'medkit',r:'raro'},
 {id:'vampiro',n:'Capivara Vampira',d:'15% de todo dano que você causa vira vida.',ic:'fang',r:'epico'},
 {id:'casca',n:'Casca Grossa',d:'Você recebe 15% menos dano.',ic:'shield',r:'raro'},
 {id:'balas',n:'Balas Apressadas',d:'Seus projéteis voam 25% mais rápido.',ic:'bolt',r:'comum'},
 {id:'alcance',n:'Braço Comprido',d:'+25% de alcance em todas as armas.',ic:'ruler',r:'comum'},
 {id:'duplo',n:'Tiro Extra',d:'Cada disparo solta +1 projétil.',ic:'gun',r:'epico'},
 {id:'explosao',n:'Pólvora Dobrada',d:'Suas explosões ficam 35% maiores.',ic:'bomb',r:'raro'},
 {id:'lendario',n:'Arsenal Apelão',d:'Daqui pra frente você só recebe armas apelonas e lendárias.',ic:'crown',r:'lendario',u:1},
 {id:'presente',n:'Presente Surpresa',d:'Ganhe agora mesmo uma arma apelona na mão.',ic:'gift',r:'raro'},
 {id:'bolha',n:'Bolha Protetora',d:'Bloqueia um golpe a cada 12 segundos.',ic:'bubble',r:'epico',u:1},
 {id:'espinhos',n:'Pelo de Espinho',d:'Devolve 25% do dano para quem te acertou.',ic:'thorn',r:'raro'},
 {id:'chumbo',n:'Pés de Chumbo',d:'Imune a empurrões. Atordoar e congelar duram metade.',ic:'anvil',r:'comum',u:1},
 {id:'ima',n:'Ímã de Laranjas',d:'Suga as laranjinhas por perto direto para você (e pega kits e caixas de mais longe).',ic:'magnet',r:'comum'},
 {id:'banquete',n:'Banquete',d:'+30 de vida a cada eliminação.',ic:'orange',r:'raro'},
 {id:'enfermeira',n:'Enfermeira Capi',d:'Kits médicos curam a vida inteira.',ic:'plus',r:'comum',u:1},
 {id:'volta',n:'Volta Rápida',d:'Você renasce na metade do tempo.',ic:'refresh',r:'comum',u:1},
 {id:'sorte',n:'Trevo da Sorte',d:'15% de chance de causar dano dobrado.',ic:'clover',r:'raro'},
 {id:'fogo',n:'Toque Flamejante',d:'Seus acertos deixam o alvo queimando.',ic:'flame',r:'epico',u:1},
 {id:'gelo',n:'Toque Gelado',d:'12% de chance de congelar quem você acertar.',ic:'snow',r:'epico'},
 {id:'mira',n:'Mira Assistida',d:'Seus projéteis fazem curva até o inimigo.',ic:'eye',r:'epico',u:1},
 {id:'ricochete',n:'Ricochete',d:'Seus projéteis quicam uma vez a mais nas paredes.',ic:'bounce',r:'raro'},
 {id:'adrenalina',n:'Adrenalina',d:'Com menos de 35% de vida: +30% de dano e velocidade.',ic:'sparkle',r:'raro',u:1},
 {id:'kamikaze',n:'Saída Triunfal',d:'Quando você é eliminado, explode levando gente junto.',ic:'skull',r:'raro',u:1},
 {id:'atropelo',n:'Dash Atropelador',d:'Seu dash causa 30 de dano em quem você atravessar.',ic:'slap',r:'raro',u:1},
];
const perkById=id=>PERKS.find(p=>p.id===id);
function defaultMods(){return{dmg:1,cd:1,spd:1,dashcd:1,dashlen:1,regen:0,ls:0,armor:0,bspd:1,range:1,extra:0,boom:1,legend:0,bubble:0,thorns:0,heavy:0,magnet:0,feast:0,nurse:0,quick:0,crit:0,fire:0,ice:0,aim:0,bounce:0,adren:0,kami:0,ram:0}}
function randomGunTop(except){const pool=GUNS.filter(g=>(g.tier==='apelona'||g.tier==='lendaria')&&g.id!==except);return pick(pool).id}

// ===== Simulação (autoridade do anfitrião) e rede =====
const MAX_PLAYERS=10,PEER_PREFIX='chaos67-',SWAP_CD=250;
let peer=null,conn=null,clients={},host=false,solo=false,demo=false,room='',self='';
let players={},bullets=[],gems=[],meds=[],crates=[],builds=[],fields=[],effects=[],started=false,over=false,paused=false,matchEnd=0,gid=1,eid=1,clockOff=0;
let cfg=Object.assign({mode:'ffa',map:'praca',bots:5,time:180,diff:'normal'},store.get('cfg',{}));
let ms={teamScore:[0,0],flags:[],zone:null,zoneNext:0,winner:null},votes={};
let M=mapById(cfg.map),MODE=modeById(cfg.mode);
const keys={up:false,down:false,left:false,right:false,fire:false,dash:false,respawn:false,swap:false};
const KEYLIST=Object.keys(keys);
let localAim=0,localAimDist=300;
const hostNow=()=>host||demo?time():time()+clockOff;
const dist=(a,b,x,y)=>Math.hypot(a-x,b-y);
const hitCapy=(p,x,y,r)=>{const dx=(x-p.x)/(19+r),dy=(y-(p.y-5))/(28+r);return dx*dx+dy*dy<1};

function newPlayer(pid,name,look,bot=false){return{id:pid,name:safe(name),look:cleanLook(look),bot,team:-1,x:W/2,y:H/2,hp:100,alive:true,respawnAt:0,canRespawnAt:0,
  level:1,energy:0,kills:0,deaths:0,gemsTotal:0,heals:0,noKills:0,streak:0,best:0,hold:0,caps:0,zone:0,gunLvl:0,carry:-1,guns:[randomGun(-1),-1],slot:0,gun:0,aim:0,ad:300,face:1,mv:0,
  shotAt:0,dashAt:0,dashTime:0,dx:0,dy:0,kx:0,ky:0,stunUntil:0,confuseUntil:0,shieldUntil:0,frozenUntil:0,flashUntil:0,burnUntil:0,burnBy:'',burnG:0,burnAcc:0,slowUntil:0,hurtAt:0,swapAt:0,swapPrev:false,
  keys:{},killer:null,calcFlip:true,mark6:null,maxHp:100,mods:defaultMods(),perks:{},kc:0,fc:0,pending:0,picking:false,offer:null,pickUntil:0,bubbleAt:-1e9,dashHit:null}}
function fx(kind,o,dur=900){const e=Object.assign({id:eid++,kind,end:time()+dur},o);effects.push(e);return e}
const isTeams=()=>!!MODE.teams;
const sameTeam=(a,b)=>a&&b&&isTeams()&&a.team>=0&&a.team===b.team;
const enemiesOf=p=>Object.values(players).filter(q=>q.alive&&!q.picking&&q.id!==p.id&&!sameTeam(p,q));
function nearestEnemy(p,x,y,maxD=1e9){let best=null,bd=maxD;for(const q of enemiesOf(p)){const d=dist(q.x,q.y,x,y);if(d<bd){bd=d;best=q}}return best}

// ---------- Paredes e colisão ----------
function blockRects(){const r=M.walls.slice();for(const b of builds)if(b.k!=='bubble')r.push([b.x-b.w/2,b.y-b.h/2,b.w,b.h,b]);return r}
function inWall(x,y,pad=0,rects=M.walls){for(const [wx,wy,ww,wh] of rects)if(x>wx-pad&&x<wx+ww+pad&&y>wy-pad&&y<wy+wh+pad)return true;return false}
function pushOut(p,r=17){for(const [wx,wy,ww,wh] of blockRects()){const nx=clamp(p.x,wx,wx+ww),ny=clamp(p.y,wy,wy+wh);let dx=p.x-nx,dy=p.y-ny,d=Math.hypot(dx,dy);
  if(d<r){if(d>.01){p.x+=dx/d*(r-d);p.y+=dy/d*(r-d)}else{const l=p.x-wx,rt=wx+ww-p.x,tp=p.y-wy,bt=wy+wh-p.y,m=Math.min(l,rt,tp,bt);if(m===l)p.x=wx-r;else if(m===rt)p.x=wx+ww+r;else if(m===tp)p.y=wy-r;else p.y=wy+wh+r}}}
  p.x=clamp(p.x,20,W-20);p.y=clamp(p.y,20,H-20)}
function lineClear(x1,y1,x2,y2){const d=dist(x1,y1,x2,y2),n=Math.ceil(d/24);for(let i=1;i<n;i++){const k=i/n;if(inWall(x1+(x2-x1)*k,y1+(y2-y1)*k,0))return false}return true}
function freeSpot(team=-1,pad=34){for(let i=0;i<60;i++){let x,y;if(team===0){x=rand(80,W*.26);y=rand(80,H-80)}else if(team===1){x=rand(W*.74,W-80);y=rand(80,H-80)}else{x=rand(60,W-60);y=rand(60,H-60)}
  if(!inWall(x,y,pad,blockRects()))return[x,y]}return[W/2,H/2-200]}
function nudgeFree(x,y){if(!inWall(x,y,20,blockRects()))return[x,y];for(let r=30;r<400;r+=30)for(let a=0;a<TAU;a+=.6){const nx=x+Math.cos(a)*r,ny=y+Math.sin(a)*r;if(nx>30&&nx<W-30&&ny>30&&ny<H-30&&!inWall(nx,ny,20,blockRects()))return[nx,ny]}return freeSpot()}

// ---------- Coletáveis ----------
function spawnPickups(){const ng=MODE.id==='race'?90:60;while(gems.length<ng){const [x,y]=freeSpot(-1,24);gems.push({id:gid++,x:Math.round(x),y:Math.round(y)})}
  const nm=MODE.onehit?0:5;while(meds.length<nm){const [x,y]=freeSpot(-1,30);meds.push({id:gid++,x:Math.round(x),y:Math.round(y),at:0})}
  const nc=MODE.id==='gun'?0:4;while(crates.length<nc){const [x,y]=freeSpot(-1,30);crates.push({id:gid++,x:Math.round(x),y:Math.round(y),at:0})}}

// ---------- Dano e estados ----------
function harm(p,dmg,owner,gi,t,src){if(!p||!p.alive||p.picking||t<p.shieldUntil||dmg<=0)return false;const k=players[owner];if(k&&k.id!==p.id&&sameTeam(k,p))return false;
  if(dmg<900&&k&&k!==p&&k.mods){dmg*=k.mods.dmg;if(k.mods.adren&&k.hp<k.maxHp*.35)dmg*=1.3;if(k.mods.crit&&Math.random()<k.mods.crit){dmg*=2;fx('hit',{x:p.x,y:p.y-44,w:'CRÍTICO!',c:'#FFC531'},500)}}
  if(dmg<900&&p.mods)dmg*=1-Math.min(.6,p.mods.armor);
  if(p.mods&&p.mods.bubble&&k&&k!==p&&t-p.bubbleAt>12000){p.bubbleAt=t;fx('block',{x:p.x,y:p.y},600);return false}
  if(MODE.onehit)dmg=999;p.hp-=dmg;
  if(k&&k!==p&&k.mods&&k.mods.ls&&k.alive)k.hp=Math.min(k.maxHp,k.hp+Math.min(dmg,100)*k.mods.ls);
  if(src!=='thorn'&&k&&k!==p&&p.mods&&p.mods.thorns&&k.alive)harm(k,Math.min(dmg,100)*p.mods.thorns,p.id,gi,t,'thorn');p.hurtAt=t;fx('dmg',{x:p.x,y:p.y-30,v:Math.round(Math.min(dmg,999)),pid:p.id},700);
  if(p.hp<=0){p.hp=0;p.alive=false;p.deaths++;p.streak=0;p.respawnAt=t+3000*(p.mods.quick?.5:1);p.canRespawnAt=t+1500;p.frozenUntil=p.flashUntil=p.burnUntil=0;
    p.killer={id:owner,name:k?k.name:'o caos',gun:gi};dropFlag(p,t);
    if(p.mods.kami){p.mods.kami=0;explode(p.x,p.y,150,65,p.id,gi,t);p.mods.kami=1}
    if(k&&k.id!==p.id){k.kills++;k.streak++;if(k.mods.feast)k.hp=Math.min(k.maxHp,k.hp+30*k.mods.feast);k.kc++;if(k.kc>=KILLS_PER_CARD){k.kc-=KILLS_PER_CARD;grantCard(k,t)}k.best=Math.max(k.best,k.streak);if(GUNS[gi]&&GUNS[gi].txt==='NÃO')k.noKills++;
      if(MODE.id==='tdm'&&k.team>=0)ms.teamScore[k.team]++;
      if(MODE.id==='gun'){k.gunLvl++;if(k.gunLvl>=GUN_SEQ.length){ms.winner=k.id;endMatch()}else{k.guns=[GUN_SEQ[k.gunLvl],-1];k.slot=0;fx('crate',{x:k.x,y:k.y,pid:k.id,g:k.guns[0],lvl:1},900)}}}
    fx('ko',{x:p.x,y:p.y,c:p.look.body,pid:p.id},900);fx('kill',{k:k?k.name:'?',ki:owner,v:p.name,vi:p.id,g:gi,kt:k?k.team:-1,vt:p.team},4000)}
  return true}
function push(p,ang,force){if(p.frozenUntil>time()||(p.mods&&p.mods.heavy))return;p.kx+=Math.cos(ang)*force;p.ky+=Math.sin(ang)*force}
function applyHit(p,g,owner,ang,t){if(!p.alive)return;const o=players[owner];if(sameTeam(o,p))return;const hv=p.mods&&p.mods.heavy?.5:1;if(g.knock)push(p,ang,g.knock);if(g.stun)p.stunUntil=t+g.stun*hv;if(g.confuse)p.confuseUntil=t+g.confuse;
  if(o&&o!==p&&o.mods){if(o.mods.fire){p.burnUntil=t+1500;p.burnBy=owner;p.burnG=g.id}if(o.mods.ice&&Math.random()<.12*o.mods.ice){p.frozenUntil=Math.max(p.frozenUntil,t+800*hv);fx('freeze',{x:p.x,y:p.y},500)}}
  if(g.freeze){p.frozenUntil=Math.max(p.frozenUntil,t+g.freeze*hv);fx('freeze',{x:p.x,y:p.y},500)}if(g.flash)p.flashUntil=t+g.flash;if(g.burn){p.burnUntil=t+g.burn;p.burnBy=owner;p.burnG=g.id}if(g.slow)p.slowUntil=t+g.slow}
function damageBuilds(x,y,R,dmg,owner){for(let i=builds.length-1;i>=0;i--){const b=builds[i];if(dist(b.x,b.y,x,y)<R+Math.max(b.w||b.r||20,b.h||0)/2){b.hp-=dmg;if(b.hp<=0){fx('debris',{x:b.x,y:b.y,k:b.k},600);builds.splice(i,1)}}}}
function explode(x,y,R,dmg,owner,gi,t,gold=false){const o=players[owner];if(o&&o.mods)R*=o.mods.boom;for(const p of Object.values(players)){if(!p.alive||p.picking||p.id===owner||sameTeam(o,p))continue;const d=dist(p.x,p.y,x,y);if(d<R+16){harm(p,dmg*(1-d/(R+16)*.45),owner,gi,t);push(p,Math.atan2(p.y-y,p.x-x),420)}}
  damageBuilds(x,y,R*.8,dmg,owner);fx('boom',{x,y,r:R,gold},700)}
function teleport(p,x,y,t){if(!p||!p.alive)return;fx('warp',{x:p.x,y:p.y},600);[x,y]=nudgeFree(clamp(x,25,W-25),clamp(y,25,H-25));p.x=x;p.y=y;fx('warp',{x:p.x,y:p.y,pid:p.id},600)}

// ---------- Disparo ----------
function curGun(p){return GUNS[p.guns[p.slot]]||GUNS[p.guns[0]]||GUNS[0]}
function addBuild(p,g,x,y,k,t=time()){const mine=builds.filter(b=>b.o===p.id);if(mine.length>=4){builds.splice(builds.indexOf(mine[0]),1)}
  const ang=p.aim,vert=Math.abs(Math.cos(ang))>=Math.abs(Math.sin(ang)),bd=g.build||{k:'box',hp:90,dur:14000};
  const b={id:gid++,k,x:Math.round(x),y:Math.round(y),hp:bd.hp,max:bd.hp,end:t+bd.dur,o:p.id,team:p.team,col:p.team>=0?TEAM[p.team].c:p.look.trail};
  if(k==='wall'){b.w=vert?24:112;b.h=vert?112:24}else if(k==='box'){b.w=b.h=46;b.hp=b.max=90;b.end=t+15000}else if(k==='turret'){b.w=b.h=30;b.aim=ang;b.fireAt=0}else if(k==='bubble'){b.r=78;b.w=b.h=156}
  builds.push(b);fx('build',{x:b.x,y:b.y,k},600)}
function fire(p,t){if(!p.alive||p.picking||t<p.stunUntil||t<p.frozenUntil)return;const g=curGun(p),md=p.mods;if(t-p.shotAt<g.cd*md.cd)return;p.shotAt=t;
  if(g.melee){for(const q of enemiesOf(p)){const dx=q.x-p.x,dy=q.y-p.y,d=Math.hypot(dx,dy);if(d<g.range*md.range+18&&Math.cos(Math.atan2(dy,dx)-p.aim)>g.arc-.05){if(harm(q,g.dmg,p.id,g.id,t)){applyHit(q,g,p.id,Math.atan2(dy,dx),t);fx('hit',{x:q.x,y:q.y,w:g.m==='fish'||g.m==='squeegee'?'SLAP':'WHAM',c:g.col},450)}}}damageBuilds(p.x+Math.cos(p.aim)*40,p.y+Math.sin(p.aim)*40,20,g.dmg,p.id);return}
  if(g.meteor||g.stamp){const f=g.meteor||g.stamp,d=clamp(p.ad||300,80,g.range2*md.range);let x=clamp(p.x+Math.cos(p.aim)*d,30,W-30),y=clamp(p.y+Math.sin(p.aim)*d,30,H-30);fields.push({id:gid++,k:g.meteor?'meteor':'stamp',x,y,r:f.r,start:t,delay:f.delay,end:t+f.delay,o:p.id,g:g.id,dmg:g.dmg});return}
  if(g.build){const d=g.build.dist+20;let x=p.x+Math.cos(p.aim)*d,y=p.y+Math.sin(p.aim)*d;if(g.build.k==='bubble'){x=p.x;y=p.y}addBuild(p,g,clamp(x,30,W-30),clamp(y,30,H-30),g.build.k,t);return}
  if(bullets.length>280)return;
  if(g.mine){const mine=bullets.filter(b=>b.o===p.id&&GUNS[b.g].mine);if(mine.length>=3)bullets.splice(bullets.indexOf(mine[0]),1)}
  const n=g.n2+(g.mine||g.box||g.sticky||g.timestop||g.hole||g.tele?0:md.extra),spr=g.spr||(n>1?.18:0);
  for(let i=0;i<n;i++){const a=p.aim+(n>1&&!g.spr?(i-(n-1)/2)*.12:(Math.random()-.5)*spr),sp=g.sp*md.bspd*(g.fuse?rand(.9,1.05):1);
    const b={id:gid++,o:p.id,g:g.id,x:p.x+Math.cos(a)*12,y:p.y+Math.sin(a)*12+2,vx:Math.cos(a)*sp,vy:Math.sin(a)*sp,r:g.r,life:g.life*md.range/md.bspd,bn:(g.bounce||0)+md.bounce,age:0};if(md.aim&&!g.homing)b.hm=1.6;
    if(g.calc){b.six=p.calcFlip;p.calcFlip=!p.calcFlip}bullets.push(b)}
  if(g.recoil)push(p,p.aim+Math.PI,g.recoil)}

function respawn(p,t){const [x,y]=MODE.id==='ctf'?freeSpot(p.team):freeSpot(isTeams()?p.team:-1);p.x=x;p.y=y;p.hp=p.maxHp;p.alive=true;
  if(MODE.id==='gun'){p.guns=[GUN_SEQ[p.gunLvl],-1]}else if(p.mods.legend){const a=randomGunTop(-1);p.guns=[a,randomGunTop(a)]}else{const a=randomGun(-1,p.level);p.guns=[a,randomGun(a,p.level)]}p.slot=0;
  p.gun=p.guns[0];p.dashAt=0;p.shotAt=t;p.shieldUntil=t+1500;p.kx=p.ky=0;p.stunUntil=p.confuseUntil=p.frozenUntil=p.flashUntil=p.burnUntil=p.slowUntil=0;p.mark6=null;
  fx('spawn',{x:p.x,y:p.y,pid:p.id,g:p.guns[0],g2:p.guns[1]},1300)}

function updateP(p,dt,t){
  if(!p.alive){if(t>=p.respawnAt||(p.keys.respawn&&t>=p.canRespawnAt))respawn(p,t);return}
  if(p.picking){if(t>p.pickUntil&&p.offer)choosePerk(p,pick(p.offer),t);return}
  const md=p.mods;if(md.regen&&p.hp<p.maxHp)p.hp=Math.min(p.maxHp,p.hp+2*md.regen*dt);
  const k=p.keys||{},conf=t<p.confuseUntil?-1:1,frozen=t<p.frozenUntil,stun=t<p.stunUntil||frozen;
  if(((k.swap&&!p.swapPrev)||p.swapReq)&&p.guns[1]>=0&&t-p.swapAt>SWAP_CD&&!frozen){p.slot=1-p.slot;p.swapAt=t;p.shotAt=Math.max(p.shotAt,t-curGun(p).cd+180)}p.swapPrev=!!k.swap;p.swapReq=0;p.gun=p.guns[p.slot];
  let dx=((+!!k.right)-(+!!k.left))*conf,dy=((+!!k.down)-(+!!k.up))*conf;if(stun)dx=dy=0;const len=Math.hypot(dx,dy)||1;dx/=len;dy/=len;
  if(k.dash&&!stun&&t-p.dashAt>2800*md.dashcd){p.dashAt=t;p.dashTime=.19*md.dashlen;p.dashHit={};p.dx=dx||Math.cos(p.aim);p.dy=dy||Math.sin(p.aim)}
  const dashing=p.dashTime>0&&!frozen;p.dashTime=Math.max(0,p.dashTime-dt);
  let sp=dashing?900:215*md.spd*(md.adren&&p.hp<p.maxHp*.35?1.3:1);if(t<p.slowUntil)sp*=.5;if(p.carry>=0)sp*=.88;
  if(!frozen){p.x+=(dashing?p.dx:dx)*sp*dt+p.kx*dt;p.y+=(dashing?p.dy:dy)*sp*dt+p.ky*dt}
  const dec=Math.exp(-6*dt);p.kx*=dec;p.ky*=dec;pushOut(p);
  p.mv=(!frozen&&(dx||dy||dashing))?1:0;p.face=Math.cos(p.aim)>=0?1:-1;
  if(dashing&&md.ram)for(const q of enemiesOf(p)){if(!p.dashHit[q.id]&&dist(q.x,q.y,p.x,p.y)<34){p.dashHit[q.id]=1;harm(q,30*md.ram,p.id,p.gun,t);fx('hit',{x:q.x,y:q.y,w:'ATROPELOU!',c:'#45D4FF'},500)}}
  if(t<p.burnUntil){p.burnAcc+=9*dt;if(p.burnAcc>=4){p.burnAcc=0;harm(p,4,p.burnBy,p.burnG,t)}if(!p.alive)return}
  if(k.fire)fire(p,t);const pr2=26+md.magnet*20;
  if(md.magnet){const R2=200+md.magnet*90;for(const g of gems){const d=dist(g.x,g.y,p.x,p.y);if(d<R2&&d>4){const sp2=(260+md.magnet*120)*dt*(1.4-d/R2);g.x+=(p.x-g.x)/d*Math.min(sp2,d);g.y+=(p.y-g.y)/d*Math.min(sp2,d)}}}
  for(let i=gems.length-1;i>=0;i--){const g=gems[i];if(Math.abs(g.x-p.x)<pr2&&Math.abs(g.y-p.y)<pr2){gems.splice(i,1);p.energy++;p.gemsTotal++;fx('gem',{x:g.x,y:g.y,pid:p.id,n:p.energy},500);
    if(MODE.id==='race'){if(p.energy>=67){ms.winner=p.id;endMatch();return}}
    else if(p.energy>=67){p.energy-=67;p.level++;p.hp=p.maxHp;fx('67',{x:p.x,y:p.y,pid:p.id,lv:p.level},1800)}}}
  for(let i=meds.length-1;i>=0;i--){const m=meds[i];if(p.hp<p.maxHp&&dist(m.x,m.y,p.x,p.y)<30+md.magnet*50){meds.splice(i,1);p.hp=Math.min(p.maxHp,p.hp+(md.nurse?p.maxHp:50));fx('med',{x:m.x,y:m.y,pid:p.id},700)}}
  for(let i=crates.length-1;i>=0;i--){const c=crates[i];if(dist(c.x,c.y,p.x,p.y)<32+md.magnet*50){crates.splice(i,1);const ng=md.legend?randomGunTop(p.guns[p.slot]):randomGun(p.guns[p.slot],p.level,p.guns[1-p.slot]);if(p.guns[1]<0)p.guns[1]=ng;else p.guns[p.slot]=ng;fx('crate',{x:c.x,y:c.y,pid:p.id,g:ng},800)}}}

// ---------- Bandeiras e zona ----------
function dropFlag(p,t){if(p.carry<0)return;const f=ms.flags[p.carry];if(f){f.carrier=null;f.x=p.x;f.y=p.y;f.dropT=t;f.home=false}p.carry=-1}
function returnFlag(f){f.carrier=null;f.x=f.hx;f.y=f.hy;f.home=true;f.dropT=0}
function modeStep(dt,t){const list=Object.values(players);
  if(MODE.id==='hold'||MODE.id==='ctf'){for(const [fi,f] of ms.flags.entries()){
    if(f.carrier){const c=players[f.carrier];if(!c||!c.alive||c.picking){if(c)dropFlag(c,t);else returnFlag(f)}else{f.x=c.x;f.y=c.y;if(MODE.id==='hold'){c.hold+=dt;if(c.hold>=MODE.target){ms.winner=c.id;endMatch();return}}
      if(MODE.id==='ctf'){const base=M.bases[c.team],own=ms.flags[c.team];if(own&&own.home&&dist(c.x,c.y,base[0],base[1])<80){ms.teamScore[c.team]++;c.caps++;returnFlag(f);c.carry=-1;fx('capture',{team:c.team,name:c.name,x:c.x,y:c.y},2500);if(ms.teamScore[c.team]>=MODE.target){ms.winner='t'+c.team;endMatch();return}}}}continue}
    if(!f.home&&f.dropT&&t-f.dropT>(MODE.id==='ctf'?15000:12000)){returnFlag(f);fx('flagret',{x:f.x,y:f.y,team:f.team},900)}
    for(const p of list){if(!p.alive||p.picking||p.carry>=0||dist(p.x,p.y,f.x,f.y)>34)continue;
      if(MODE.id==='ctf'&&p.team===f.team){if(!f.home){returnFlag(f);fx('flagret',{x:f.x,y:f.y,team:f.team,name:p.name},1200)}continue}
      f.carrier=p.id;f.home=false;p.carry=fi;fx('flagtake',{x:f.x,y:f.y,pid:p.id,name:p.name,team:f.team},1500);break}}}
  if(MODE.id==='koth'&&ms.zone){const z=ms.zone,ins=list.filter(p=>p.alive&&!p.picking&&dist(p.x,p.y,z.x,z.y)<z.r);z.owner=ins.length===1?ins[0].id:null;z.contested=ins.length>1;
    if(z.owner){const p=players[z.owner];p.zone+=dt;if(p.zone>=MODE.target){ms.winner=p.id;endMatch();return}}
    if(t>ms.zoneNext){const opts=M.zones.filter(q=>q[0]!==z.x||q[1]!==z.y);const n=pick(opts);z.x=n[0];z.y=n[1];ms.zoneNext=t+40000;fx('zonemove',{x:z.x,y:z.y},1500)}}}

// ---------- Construções, campos e projéteis ----------
function stepBuilds(dt,t){for(let i=builds.length-1;i>=0;i--){const b=builds[i];if(t>b.end){fx('debris',{x:b.x,y:b.y,k:b.k},500);builds.splice(i,1);continue}
  if(b.k==='turret'){const o=players[b.o]||{id:b.o,team:b.team};let best=null,bd=470;for(const q of enemiesOf(o)){const d=dist(q.x,q.y,b.x,b.y);if(d<bd&&lineClear(b.x,b.y,q.x,q.y)){bd=d;best=q}}
    if(best){b.aim=Math.atan2(best.y-b.y,best.x-b.x);if(t-b.fireAt>380){b.fireAt=t;const a=b.aim+(Math.random()-.5)*.08;bullets.push({id:gid++,o:b.o,g:GUNS.findIndex(g=>g.m==='turret'),x:b.x+Math.cos(a)*24,y:b.y+Math.sin(a)*24,vx:Math.cos(a)*800,vy:Math.sin(a)*800,r:4,life:.9,bn:0,age:0,dm:8,tur:1})}}}}}
function stepFields(dt,t){for(let i=fields.length-1;i>=0;i--){const f=fields[i],o=players[f.o]||{id:f.o,team:-1};
  if(f.k==='time'){for(const p of Object.values(players)){if(!p.alive||p.picking||p.id===f.o||sameTeam(o,p))continue;if(dist(p.x,p.y,f.x,f.y)<f.r){p.frozenUntil=Math.max(p.frozenUntil,t+150)}}
    for(const b of bullets){if(b.o!==f.o&&dist(b.x,b.y,f.x,f.y)<f.r){b.frozen=1;b.life+=dt}}}
  if(f.k==='hole'){for(const p of Object.values(players)){if(!p.alive||p.picking||p.id===f.o||sameTeam(o,p))continue;const d=dist(p.x,p.y,f.x,f.y);if(d<f.r&&d>8){const a=Math.atan2(f.y-p.y,f.x-p.x),pull=(1-d/f.r)*420+90;p.x+=Math.cos(a)*pull*dt;p.y+=Math.sin(a)*pull*dt;pushOut(p)}}
    for(const b of bullets){if(b.o!==f.o){const d=dist(b.x,b.y,f.x,f.y);if(d<f.r){b.vx+=(f.x-b.x)*3*dt;b.vy+=(f.y-b.y)*3*dt}}}}
  if(t>=f.end){fields.splice(i,1);
    if(f.k==='hole'){explode(f.x,f.y,130,f.dmg||90,f.o,f.g,t);fx('implode',{x:f.x,y:f.y},800)}
    if(f.k==='meteor'){explode(f.x,f.y,f.r,f.dmg,f.o,f.g,t);fx('meteor',{x:f.x,y:f.y,r:f.r},1000)}
    if(f.k==='stamp'){for(const p of Object.values(players))if(p.alive&&p.id!==f.o&&!sameTeam(o,p)&&dist(p.x,p.y,f.x,f.y)<f.r+16)harm(p,999,f.o,f.g,t);damageBuilds(f.x,f.y,f.r,999,f.o);fx('stamp',{x:f.x,y:f.y,r:f.r},1400)}}}}
function bulletEnd(b,g,t){if(b.done)return;b.done=1;
  if(g.box){addBuild(players[b.o]||{id:b.o,aim:0,team:-1,look:{trail:'#fff'}},g,b.x,b.y,'box',t);return}
  if(g.timestop){fields.push({id:gid++,k:'time',x:b.x,y:b.y,r:g.timestop.r,start:t,end:t+g.timestop.dur,o:b.o,g:g.id});fx('timestop',{x:b.x,y:b.y,r:g.timestop.r},800);return}
  if(g.hole){fields.push({id:gid++,k:'hole',x:b.x,y:b.y,r:g.hole.r,start:t,end:t+g.hole.dur,o:b.o,g:g.id,dmg:g.hole.dmg});return}
  if(g.flashR){const o=players[b.o];for(const p of Object.values(players)){if(!p.alive||p.id===b.o||sameTeam(o,p))continue;const d=dist(p.x,p.y,b.x,b.y);if(d<g.flashR){p.flashUntil=Math.max(p.flashUntil,t+2800*(1-d/g.flashR*.5));if(d<g.flashR*.55&&!b.hitDone)harm(p,g.dmg,b.o,g.id,t)}}fx('flashboom',{x:b.x,y:b.y,r:g.flashR},700);return}
  if(g.boom)explode(b.x,b.y,g.boom,g.dmg,b.o,g.id,t);if(g.tele)teleport(players[b.o],b.x-b.vx*.02,b.y-b.vy*.02,t)}
function hitPlayer(b,g,p,t){const a=Math.atan2(b.vy,b.vx),o=players[b.o];
  if(g.heal){p.hp=Math.min(p.maxHp||100,p.hp+g.heal);if(o)o.heals++;fx('heal',{x:p.x,y:p.y,v:g.heal,pid:p.id},800);return true}
  if(sameTeam(o,p))return false;
  if(g.tele){teleport(o,b.x,b.y,t);b.done=1;return true}
  if(g.sticky){b.stick=p.id;b.vx=b.vy=0;fx('hit',{x:b.x,y:b.y,w:'CUCO!',c:g.col},600);return 'stick'}
  if(g.boom||g.box||g.timestop||g.hole||g.flashR){if(!g.boom&&g.dmg>0){harm(p,g.dmg,b.o,g.id,t);applyHit(p,g,b.o,a,t)}bulletEnd(b,g,t);return true}
  if(g.calc){if(b.six){p.mark6={by:b.o,until:t+2500};harm(p,g.dmg,b.o,g.id,t);fx('hit',{x:b.x,y:b.y,w:'6',c:'#FFC531'},500)}
    else if(p.mark6&&p.mark6.by===b.o&&t<p.mark6.until){p.mark6=null;harm(p,g.dmg,b.o,g.id,t);explode(p.x,p.y,120,70,b.o,g.id,t,true);fx('hit',{x:p.x,y:p.y-30,w:'67!',c:'#FFC531'},900)}
    else{harm(p,g.dmg,b.o,g.id,t);fx('hit',{x:b.x,y:b.y,w:'7',c:'#FFC531'},500)}return true}
  const dmg=b.dm||g.dmg;harm(p,dmg,b.o,g.id,t);applyHit(p,g,b.o,a,t);
  if(g.chain){const hitIds=[p.id],pts=[[p.x,p.y]];let cur=p;for(let i=0;i<g.chain;i++){let nx=null,nd=210;for(const q of enemiesOf(o||{id:b.o,team:-1})){if(hitIds.includes(q.id))continue;const d=dist(q.x,q.y,cur.x,cur.y);if(d<nd){nd=d;nx=q}}if(!nx)break;hitIds.push(nx.id);pts.push([nx.x,nx.y]);harm(nx,dmg*.6,b.o,g.id,t);cur=nx}if(pts.length>1)fx('chain',{pts},400)}
  const w=g.txt==='NÃO'?'NÃO!':(dmg>=15||Math.random()<.25)?({pistol:'POW',smg:'TAC',rifle:'PÁ',shotgun:'BLAM',heavy:'KABUM',laser:'ZAP',throw:'TING',explosive:'BUM',special:'BOING',melee:'WHAM'}[g.cat]||'POW'):'';
  if(!b.tur)fx('hit',{x:b.x,y:b.y,w,c:g.col,s:dmg>=30?1:0},420);return true}
function stepBullets(dt,t){const rects=blockRects();for(let i=bullets.length-1;i>=0;i--){const b=bullets[i],g=GUNS[b.g]||GUNS[0];if(b.frozen){b.frozen=0;continue}b.age+=dt;b.life-=dt;let dead=false;
  if(b.stick){const sp=players[b.stick];if(sp&&sp.alive){b.x=sp.x;b.y=sp.y-4}else b.stick=null}
  const hm=g.homing||b.hm;if(hm&&b.age>.12&&!b.stick){const q=nearestEnemy(players[b.o]||{id:b.o,team:-1},b.x,b.y,560);if(q){const cur=Math.atan2(b.vy,b.vx),want=Math.atan2(q.y-b.y,q.x-b.x);let d=Math.atan2(Math.sin(want-cur),Math.cos(want-cur));const na=cur+clamp(d,-hm*dt,hm*dt),sp=Math.hypot(b.vx,b.vy);b.vx=Math.cos(na)*sp;b.vy=Math.sin(na)*sp}}
  if(g.boomer&&b.age>g.life*.45){const o=players[b.o];if(o){const a=Math.atan2(o.y-b.y,o.x-b.x),sp=Math.hypot(b.vx,b.vy);b.vx=lerp(b.vx,Math.cos(a)*sp,.12);b.vy=lerp(b.vy,Math.sin(a)*sp,.12);if(dist(o.x,o.y,b.x,b.y)<22&&b.age>g.life*.55)dead=true}}
  if(g.portal&&!b.warped&&b.age>.16){const o=players[b.o],q=o&&nearestEnemy(o,b.x,b.y,900);if(q){const a=Math.atan2(q.y-o.y,q.x-o.x);fx('warp',{x:b.x,y:b.y},500);const [nx,ny]=nudgeFree(q.x+Math.cos(a)*85,q.y+Math.sin(a)*85);b.x=nx;b.y=ny;const sp=Math.hypot(b.vx,b.vy),a2=Math.atan2(q.y-ny,q.x-nx);b.vx=Math.cos(a2)*sp;b.vy=Math.sin(a2)*sp;b.warped=1;fx('warp',{x:b.x,y:b.y},500)}}
  if(g.fric&&!b.stick){const d=Math.exp(-g.fric*1.6*dt);b.vx*=d;b.vy*=d}
  if(g.mine&&b.age>.6){const o=players[b.o]||{id:b.o,team:-1};if(nearestEnemy(o,b.x,b.y,42)){bulletEnd(b,g,t);bullets.splice(i,1);continue}}
  const sp=Math.hypot(b.vx,b.vy),steps=b.stick?1:Math.max(1,Math.ceil(sp*dt/14));
  for(let s=0;s<steps&&!dead;s++){if(!b.stick){b.x+=b.vx*dt/steps;b.y+=b.vy*dt/steps}
    // paredes / bordas
    let wall=null;if(b.x<0||b.x>W||b.y<0||b.y>H)wall='edge';else if(!g.tele)for(const r of rects){if(b.x>r[0]&&b.x<r[0]+r[2]&&b.y>r[1]&&b.y<r[1]+r[3]){wall=r;break}}
    if(wall){if(wall!=='edge'&&wall[4]){const bb=wall[4];if(!(bb.o===b.o&&bb.k==='turret')){bb.hp-=(b.dm||g.dmg||5);if(bb.hp<=0){fx('debris',{x:bb.x,y:bb.y,k:bb.k},600);builds.splice(builds.indexOf(bb),1)}}}
      if(b.bn>0||g.fuse||g.mine){const px=b.x-b.vx*dt/steps,py=b.y-b.vy*dt/steps;const inX=wall==='edge'?(b.x<0||b.x>W):!(px>wall[0]&&px<wall[0]+wall[2]);if(inX)b.vx*=-1;else b.vy*=-1;b.x=clamp(px,1,W-1);b.y=clamp(py,1,H-1);if(!g.fuse&&!g.mine)b.bn--;if(g.fuse&&g.bounce){b.bn--;if(b.bn<0)dead=true}}
      else{b.x-=b.vx*dt/steps*.5;b.y-=b.vy*dt/steps*.5;dead=true;if(!g.boom&&!g.box&&!g.timestop&&!g.hole&&!g.tele)fx('spark',{x:b.x,y:b.y,c:g.col},250)}break}
    // bolhas escudo
    for(const bb of builds){if(bb.k!=='bubble'||bb.o===b.o||(isTeams()&&players[b.o]&&bb.team===players[b.o].team))continue;if(dist(b.x,b.y,bb.x,bb.y)<bb.r){bb.hp-=(b.dm||g.dmg||5);fx('spark',{x:b.x,y:b.y,c:'#45D4FF'},250);if(bb.hp<=0){fx('debris',{x:bb.x,y:bb.y,k:'bubble'},600);builds.splice(builds.indexOf(bb),1)}dead=true;break}}
    if(dead||b.stick||g.mine)break;
    for(const p of Object.values(players)){if(p.id===b.o||!p.alive||p.picking||Math.abs(p.x-b.x)>60||Math.abs(p.y-b.y)>70||!hitCapy(p,b.x,b.y,b.r))continue;
      if(g.boomer||g.pierce){b.hits=b.hits||{};if(b.hits[p.id]&&t-b.hits[p.id]<400)continue;b.hits[p.id]=t;if(sameTeam(players[b.o],p))continue;harm(p,g.dmg,b.o,g.id,t);applyHit(p,g,b.o,Math.atan2(b.vy,b.vx),t);fx('hit',{x:b.x,y:b.y,w:g.pierce?'PÁ':'TING',c:g.col},400);continue}
      const r=hitPlayer(b,g,p,t);if(r==='stick')break;if(r){dead=true;b.done=b.done||(!g.boom&&!g.box&&!g.timestop&&!g.hole&&!g.flashR);break}}}
  if(!dead&&b.life<=0)dead=true;
  if(dead){bulletEnd(b,g,t);bullets.splice(i,1)}}}

// ---------- Bots ----------
const BOTCFG={easy:{jit:.8,range:230,dash:.002,react:.6,fire:.55,spd:.82,dmg:.75},normal:{jit:.2,range:380,dash:.008,react:.22},chaos:{jit:.06,range:480,dash:.02,react:.08}};
function bots(dt,t){const cfgB=BOTCFG[cfg.diff]||BOTCFG.normal;for(const p of Object.values(players)){if(!p.bot)continue;const k=p.keys;
  if(!p.alive){k.respawn=true;continue}k.respawn=false;k.swap=false;p._think=(p._think||0)-dt;const g=curGun(p);
  const foe=nearestEnemy(p,p.x,p.y,1000),fd=foe?dist(foe.x,foe.y,p.x,p.y):1e9,see=foe&&fd<900&&lineClear(p.x,p.y,foe.x,foe.y);
  if(p._think<=0){p._think=cfgB.react*rand(.7,1.3);p._fireRoll=Math.random()<(cfgB.fire||1);
    let tx=null,ty=null;const near=(arr)=>{let b=null,bd=1e9;for(const o of arr){const d=dist(o.x,o.y,p.x,p.y);if(d<bd&&!inWall(o.x,o.y,0)){bd=d;b=o}}return b};
    const gm=near(gems);if(gm){tx=gm.x;ty=gm.y}
    if(p.hp<55){const md=near(meds);if(md){tx=md.x;ty=md.y}}
    const cr=near(crates);if(cr&&dist(cr.x,cr.y,p.x,p.y)<300){tx=cr.x;ty=cr.y}
    if(foe&&fd<1000&&fd>240&&p.hp>40&&(MODE.id==='tdm'||((MODE.id==='ffa'||MODE.id==='onehit'||MODE.id==='gun')&&(p._agg??(p._agg=Math.random()<.6))))){tx=foe.x;ty=foe.y}
    if(MODE.id==='hold'&&ms.flags[0]){const f=ms.flags[0];if(f.carrier===p.id){if(foe){tx=p.x-(foe.x-p.x);ty=p.y-(foe.y-p.y)}}else{tx=f.x;ty=f.y}}
    if(MODE.id==='ctf'&&p.team>=0){const enemyF=ms.flags[1-p.team],own=ms.flags[p.team],base=M.bases[p.team],defender=(p.id.charCodeAt(p.id.length-1)%3)===0;
      if(p.carry>=0){tx=base[0];ty=base[1]}else if(own&&!own.home){tx=own.x;ty=own.y}else if(defender){tx=base[0]+rand(-120,120);ty=base[1]+rand(-120,120)}else if(enemyF){tx=enemyF.x;ty=enemyF.y}}
    if(MODE.id==='koth'&&ms.zone){tx=ms.zone.x+rand(-60,60);ty=ms.zone.y+rand(-60,60)}
    if(foe&&see){if(g.melee&&fd<520){tx=foe.x;ty=foe.y}else if(fd<170&&!g.melee&&MODE.id!=='hold'&&MODE.id!=='koth'){tx=p.x-(foe.x-p.x);ty=p.y-(foe.y-p.y)}
      p._aim=Math.atan2(foe.y-p.y,foe.x-p.x)+(Math.random()-.5)*cfgB.jit*2;p.ad=fd}
    // preso numa parede? desvia
    if(p._lx!=null&&dist(p._lx,p._ly,p.x,p.y)<6&&p.mv)p._detour=t+700;p._lx=p.x;p._ly=p.y;
    if(tx!=null){let a=Math.atan2(ty-p.y,tx-p.x);if(t<(p._detour||0))a+=(p.id.length%2?1:-1)*Math.PI/2;const d=dist(tx,ty,p.x,p.y);if(d>14){k.left=Math.cos(a)<-.38;k.right=Math.cos(a)>.38;k.up=Math.sin(a)<-.38;k.down=Math.sin(a)>.38}else k.left=k.right=k.up=k.down=false}
    const other=GUNS[p.guns[1-p.slot]];if(other&&(g.heal||g.tele||(g.build&&Math.random()<.5))&&!other.heal)k.swap=true;
    if(foe&&see&&other&&!g.melee&&fd<120&&other.melee)k.swap=true}
  if(p._aim!=null)p.aim=p._aim;
  const range=g.melee?g.range+30:g.instant?(g.range2||300):cfgB.range;
  k.fire=!!foe&&see&&fd<range&&!g.heal&&!g.tele&&p._fireRoll!==false;if(g.build&&!(foe&&fd<380))k.fire=false;if(g.tele&&Math.random()<.004)k.fire=true;
  k.dash=Math.random()<cfgB.dash}}

function step(dt,t){bots(dt,t);for(const p of Object.values(players))updateP(p,dt,t);if(over&&!demo)return;stepBuilds(dt,t);stepFields(dt,t);stepBullets(dt,t);if(!demo)modeStep(dt,t);
  for(const arr of [meds,crates])for(const o of arr)if(o.at&&t>o.at)o.at=0;spawnPickups();effects=effects.filter(e=>e.end>t);
  if(host&&started&&!over&&t>=matchEnd)endMatch()}

// ---------- Partida ----------
function setupMode(){MODE=modeById(cfg.mode);M=mapById(cfg.map);store.set('cfg',cfg)}
function fillBots(){for(const k of Object.keys(players))if(players[k].bot)delete players[k];const humans=Object.keys(players).length,n=clamp(cfg.bots,0,MAX_PLAYERS-humans);
  const bc=BOTCFG[cfg.diff]||BOTCFG.normal;for(let i=0;i<n;i++){const b=players['bot'+i]=newPlayer('bot'+i,BOT_NAMES[i],randomLook(),true);b.baseSpd=bc.spd||1;b.baseDmg=bc.dmg||1}}
function startMatch(){if(!host)return;setupMode();fillBots();started=true;over=false;paused=false;votes={};const t=time();matchEnd=t+cfg.time*1000;bullets=[];effects=[];gems=[];meds=[];crates=[];builds=[];fields=[];
  ms={teamScore:[0,0],flags:[],zone:null,zoneNext:t+40000,winner:null};
  const ids=Object.keys(players).sort(()=>Math.random()-.5);ids.forEach((id,i)=>{const p=players[id];resetStats(p);p.team=isTeams()?i%2:-1});
  if(MODE.id==='hold')ms.flags=[{team:-1,x:W/2,y:H/2,hx:W/2,hy:H/2,carrier:null,home:true,dropT:0}];
  if(MODE.id==='ctf')ms.flags=M.bases.map(([x,y],i)=>({team:i,x,y,hx:x,hy:y,carrier:null,home:true,dropT:0}));
  if(MODE.id==='koth'){const z=M.zones[0];ms.zone={x:z[0],y:z[1],r:160,owner:null}}
  for(const p of Object.values(players)){respawn(p,t);effects.pop();p.shieldUntil=t+1500;fx('spawn',{x:p.x,y:p.y,pid:p.id,g:p.guns[0],g2:p.guns[1],first:1},1300)}
  spawnPickups();sync(true);onMatchStart()}
function resetStats(p){const md0=defaultMods();if(p.baseSpd){md0.spd=p.baseSpd;md0.dmg=p.baseDmg}Object.assign(p,{maxHp:100,mods:md0,perks:{},kc:0,fc:0,pending:0,picking:false,offer:null,pickUntil:0,bubbleAt:-1e9,hp:100,alive:true,level:1,energy:0,kills:0,deaths:0,gemsTotal:0,heals:0,noKills:0,streak:0,best:0,hold:0,caps:0,zone:0,gunLvl:0,carry:-1,killer:null,kx:0,ky:0,dashAt:0,shotAt:0})}
function scoreOf(p){switch(MODE.score){case 'hold':return p.hold;case 'caps':return p.caps*1000+p.kills;case 'zone':return p.zone;case 'gun':return p.gunLvl*1000+p.kills;case 'gems':return p.energy;default:return p.kills*1000+p.level*67+p.energy}}
const rank=()=>Object.values(players).sort((a,b)=>scoreOf(b)-scoreOf(a)||b.kills-a.kills||a.deaths-b.deaths);
function teamWinner(){if(!isTeams())return -1;if(typeof ms.winner==='string'&&ms.winner[0]==='t')return +ms.winner[1];const [a,b]=ms.teamScore;return a>b?0:b>a?1:-2}
function endMatch(){if(over)return;over=true;votes={};sync(true);onMatchEnd()}
function nextMatch(mode,map){cfg.mode=mode||cfg.mode;cfg.map=map||cfg.map;startMatch()}
function backToLobby(){started=false;over=false;bullets=[];effects=[];builds=[];fields=[];for(const k of Object.keys(players))if(players[k].bot)delete players[k];sync(true)}
function topVote(){const c={};for(const v of Object.values(votes))c[v]=(c[v]||0)+1;let best=null,bn=0;for(const [m,n] of Object.entries(c))if(n>bn){bn=n;best=m}return best}
function startBots(){leaveNet();demo=false;host=true;solo=true;room='OFFLINE';self='me';players={};players[self]=newPlayer(self,store.get('nick','')||'Você',myLook);startMatch()}
function startDemo(){if(host||conn)return;demo=true;solo=false;self='';MODE=modeById('ffa');M=MAPS[Math.floor(Math.random()*MAPS.length)];players={};bullets=[];effects=[];gems=[];meds=[];crates=[];builds=[];fields=[];
  for(let i=0;i<6;i++){const p=players['d'+i]=newPlayer('d'+i,BOT_NAMES[i],randomLook(),true);const [x,y]=freeSpot();p.x=x;p.y=y;p.guns=[randomGun(-1),randomGun(-1)]}spawnPickups();started=false}
function stopDemo(){demo=false;players={};bullets=[];effects=[];gems=[];meds=[];crates=[];builds=[];fields=[]}

// ---------- Estado serializado (enviado aos jogadores) ----------
const packP=p=>({id:p.id,name:p.name,look:p.look,bot:p.bot,team:p.team,x:Math.round(p.x),y:Math.round(p.y),hp:Math.round(p.hp),alive:p.alive,respawnAt:p.respawnAt,canRespawnAt:p.canRespawnAt,level:p.level,energy:p.energy,kills:p.kills,deaths:p.deaths,gemsTotal:p.gemsTotal,heals:p.heals,noKills:p.noKills,best:p.best,
  hold:+p.hold.toFixed(1),caps:p.caps,zone:+p.zone.toFixed(1),gunLvl:p.gunLvl,carry:p.carry,guns:p.guns,slot:p.slot,aim:+p.aim.toFixed(2),face:p.face,mv:p.mv,shotAt:p.shotAt,dashAt:p.dashAt,dashTime:p.dashTime,dx:+p.dx.toFixed(2),dy:+p.dy.toFixed(2),
  stunUntil:p.stunUntil,confuseUntil:p.confuseUntil,shieldUntil:p.shieldUntil,frozenUntil:p.frozenUntil,flashUntil:p.flashUntil,maxHp:p.maxHp,mods:p.mods,perks:p.perks,kc:p.kc,fc:p.fc,picking:p.picking,offer:p.offer,pickUntil:p.pickUntil,bubbleAt:p.bubbleAt,burnUntil:p.burnUntil,slowUntil:p.slowUntil,hurtAt:p.hurtAt,killer:p.killer});
function snapshot(){const P={};for(const k in players)P[k]=packP(players[k]);return{type:'s',ht:time(),P,B:bullets.map(b=>({id:b.id,g:b.g,x:Math.round(b.x),y:Math.round(b.y),vx:Math.round(b.vx),vy:Math.round(b.vy),r:b.r,life:+b.life.toFixed(2),six:b.six,stick:b.stick})),
  G:gems,MD:meds,CR:crates,BU:builds,FI:fields,E:effects,st:started,ov:over,me:matchEnd,cfg,ms,votes}}
function filterKeys(k){const o={};for(const s of KEYLIST)o[s]=!!(k&&k[s]===true);return o}

// ---------- Cartas de power-up ----------
function pickPerks(p,n=3){let pool=PERKS.filter(k=>!(k.u&&p.perks[k.id]));const out=[];while(out.length<n&&pool.length){const tot=pool.reduce((s,k)=>s+RARITY[k.r][2],0);let r=Math.random()*tot;let ch=pool[pool.length-1];for(const k of pool){r-=RARITY[k.r][2];if(r<=0){ch=k;break}}out.push(ch.id);pool=pool.filter(k=>k!==ch)}return out}
function grantCard(p,t){if(over)return;p.pending++;if(!p.picking)offerCard(p,t)}
function offerCard(p,t){p.offer=pickPerks(p,3);if(p.bot||demo){applyPerk(p,pick(p.offer),t);p.offer=null;p.pending=Math.max(0,p.pending-1);if(p.pending>0)offerCard(p,t);return}
  p.picking=true;p.pickUntil=t+12000;p.keys={};dropFlag(p,t);fx('vanish',{x:p.x,y:p.y,pid:p.id},700)}
function choosePerk(p,id,t){if(!p||!p.picking||!p.offer||!p.offer.includes(id))return;applyPerk(p,id,t);p.picking=false;p.offer=null;p.pending=Math.max(0,p.pending-1);p.shieldUntil=Math.max(p.shieldUntil,t+1200);
  pushOut(p);fx('reappear',{x:p.x,y:p.y,pid:p.id,perk:id},900);if(p.pending>0)offerCard(p,t)}
function applyPerk(p,id,t){p.perks[id]=(p.perks[id]||0)+1;const m=p.mods;switch(id){
  case 'vida':p.maxHp+=25;p.hp=p.maxHp;break;case 'forca':m.dmg*=1.15;break;case 'gatilho':m.cd*=.85;break;case 'patas':m.spd*=1.12;break;case 'dashcd':m.dashcd*=.65;break;case 'superdash':m.dashlen*=1.4;break;
  case 'regen':m.regen++;break;case 'vampiro':m.ls+=.15;break;case 'casca':m.armor+=.15;break;case 'balas':m.bspd*=1.25;break;case 'alcance':m.range*=1.25;break;case 'duplo':m.extra++;break;case 'explosao':m.boom*=1.35;break;
  case 'lendario':m.legend=1;break;case 'presente':if(MODE.id!=='gun'){p.guns[p.slot]=randomGunTop(p.guns[p.slot]);p.gun=p.guns[p.slot]}break;case 'bolha':m.bubble=1;break;case 'espinhos':m.thorns+=.25;break;case 'chumbo':m.heavy=1;break;
  case 'ima':m.magnet++;break;case 'banquete':m.feast++;break;case 'enfermeira':m.nurse=1;break;case 'volta':m.quick=1;break;case 'sorte':m.crit+=.15;break;case 'fogo':m.fire=1;break;case 'gelo':m.ice++;break;
  case 'mira':m.aim=1;break;case 'ricochete':m.bounce++;break;case 'adrenalina':m.adren=1;break;case 'kamikaze':m.kami=1;break;case 'atropelo':m.ram=1;break}}

// ===== Cola do servidor: roda DENTRO de createSim(), junto com a simulação original =====
// Cada sala ganha sua própria cópia de todas as variáveis do jogo (players, bullets, cfg...).
host=true;solo=false;demo=false;self='';
let netAt=0,out=()=>{},ownerId=null,info={code:'',name:'',vis:'public',locked:false};
const SNAP_MS=50;
// Snapshot enxuto: dados que quase não mudam (visual, poderes, frutas) só vão quando mudam ou num "quadro-chave";
// efeitos vão só os novos. O WebSocket é confiável e ordenado, então o cliente sempre consegue remontar o estado completo.
const STATIC=['name','look','bot','mods','perks','maxHp','offer','killer'];
let snapN=0,lastSE=0,sentStatic={},sentG='',sentMD='',sentCR='';
const rnd=(k,v)=>typeof v==='number'&&!Number.isInteger(v)?(Math.abs(v)>=1000?Math.round(v):Math.round(v*100)/100):v;
function sync(force){const t=time();if(!force&&t-netAt<SNAP_MS)return;netAt=t;const s=snapshot();s.owner=ownerId;s.info=info;
  const key=force||++snapN%40===0;s.k=key?1:0;
  for(const id in s.P){const p=s.P[id],st=JSON.stringify(STATIC.map(f=>p[f]));if(!key&&sentStatic[id]===st)for(const f of STATIC)delete p[f];sentStatic[id]=st}
  for(const id in sentStatic)if(!s.P[id])delete sentStatic[id];
  const g=JSON.stringify(s.G),m=JSON.stringify(s.MD),c=JSON.stringify(s.CR);
  if(!key&&g===sentG)delete s.G;if(!key&&m===sentMD)delete s.MD;if(!key&&c===sentCR)delete s.CR;sentG=g;sentMD=m;sentCR=c;
  s.E=s.E.filter(e=>e.id>lastSE);if(s.E.length)lastSE=Math.max(...s.E.map(e=>e.id));
  out(JSON.stringify(s,rnd))}
function onMatchStart(){}
function onMatchEnd(){}
const TIMES=[120,180,300];
function cleanCfg(c){const o={};if(!c||typeof c!=='object')return o;
  if(MODES.some(m=>m.id===c.mode))o.mode=c.mode;if(MAPS.some(m=>m.id===c.map))o.map=c.map;
  if(Number.isFinite(c.bots))o.bots=clamp(Math.round(c.bots),0,MAX_PLAYERS-1);if(TIMES.includes(c.time))o.time=c.time;if(BOTCFG[c.diff])o.diff=c.diff;return o}
function humansList(){return Object.values(players).filter(p=>!p.bot)}
function addPlayer(id,name,look){const p=newPlayer(id,name,look);players[id]=p;
  if(started){const all=Object.values(players);if(all.length>MAX_PLAYERS){const b=all.find(q=>q.bot);if(b){dropFlag(b,time());delete players[b.id]}}
    resetStats(p);if(isTeams()){const c=[0,0];for(const q of Object.values(players))if(q!==p&&q.team>=0)c[q.team]++;p.team=c[0]<=c[1]?0:1}
    if(!over)respawn(p,time());else{p.alive=false;p.respawnAt=Infinity}}
  sync(true);return p}
function removePlayer(id){const p=players[id];if(!p)return;dropFlag(p,time());delete players[id];delete votes[id];
  if(started&&ms.zone&&ms.zone.owner===id)ms.zone.owner=null;sync(true)}
function message(id,d,isOwner){const p=players[id];if(!p||!d||typeof d!=='object')return;
  switch(d.type){
    case 'i':p.keys=filterKeys(d.k);if(Number.isFinite(d.a))p.aim=d.a;if(Number.isFinite(d.d))p.ad=clamp(d.d,0,3000);break;
    case 'swap':p.swapReq=1;break;
    case 'perk':choosePerk(p,d.id,time());break;
    case 'look':if(!started||over){p.look=cleanLook(d.look);sync(true)}break;
    case 'vote':if(over&&MODES.some(m=>m.id===d.mode)){votes[id]=d.mode;sync(true)}break;
    case 'cfg':if(isOwner&&(!started||over)){Object.assign(cfg,cleanCfg(d.cfg));MODE=modeById(cfg.mode);M=mapById(cfg.map);sync(true)}break;
    case 'start':if(isOwner&&!started)startMatch();break;
    case 'next':if(isOwner&&started&&over){const c=cleanCfg({mode:d.mode,map:d.map});nextMatch(c.mode,c.map)}break;
    case 'lobby':if(isOwner&&started&&over)backToLobby();break;
    case 'end':if(isOwner&&started&&!over)endMatch();break}}
let lastTick=0;
function tick(){const t=time();if(!lastTick)lastTick=t;let dt=(t-lastTick)/1000;lastTick=t;if(!started)return;
  dt=Math.min(dt,.25);while(dt>0){const s=Math.min(dt,.05);step(s,time());dt-=s}sync()}
function summary(){const hs=humansList(),o=players[ownerId];
  return{code:info.code,name:info.name,vis:info.vis,locked:info.locked,owner:o?o.name:'',mode:cfg.mode,map:cfg.map,humans:hs.length,bots:started?Object.values(players).length-hs.length:cfg.bots,max:MAX_PLAYERS,
    state:started?(over?'result':'game'):'lobby',left:started&&!over?Math.max(0,Math.round((matchEnd-time())/1000)):0}}
return{
  setOut(f){out=f},setInfo(o){info=o;sync(true)},setOwner(id){ownerId=id;sync(true)},setCfg(c){Object.assign(cfg,cleanCfg(c));MODE=modeById(cfg.mode);M=mapById(cfg.map)},
  get started(){return started},get over(){return over},humans:humansList,hasPlayer:id=>!!players[id],
  addPlayer,removePlayer,message,tick,summary,sync,MAX_PLAYERS,
  clearKeys(id){const p=players[id];if(p)p.keys={}},
  debug(){return{players,bullets,cfg,ms,get started(){return started},get over(){return over}}}};

}
