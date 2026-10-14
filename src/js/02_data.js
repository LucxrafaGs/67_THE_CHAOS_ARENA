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
