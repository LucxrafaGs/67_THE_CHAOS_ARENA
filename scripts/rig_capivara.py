# Re-rig da capivara: lê o GLB original do Tripo (esqueleto quebrado), cria um esqueleto novo de 21 ossos,
# calcula os pesos da pele por região + suavização na malha, reduz as texturas e grava public/models/capivara.glb.
# Uso:  python3 scripts/rig_capivara.py [entrada.glb] [saida.glb]     (precisa de numpy e pillow)
import json,struct,numpy as np,io,sys,os
from PIL import Image
here=os.path.dirname(os.path.abspath(__file__))
src=sys.argv[1] if len(sys.argv)>1 else os.path.join(here,'..','modelos','capivara_chapeu_original.glb')
dst=sys.argv[2] if len(sys.argv)>2 else os.path.join(here,'..','public','models','capivara.glb')
d=open(src,'rb').read();L=struct.unpack('<I',d[12:16])[0];j=json.loads(d[20:20+L]);b0=20+L+8
def acc(i,dt):
  a=j['accessors'][i];v=j['bufferViews'][a['bufferView']];n={'SCALAR':1,'VEC2':2,'VEC3':3,'VEC4':4}[a['type']]
  return np.frombuffer(d[b0+v['byteOffset']+a.get('byteOffset',0):],dtype=dt,count=a['count']*n).reshape(a['count'],n).copy()
P=acc(0,'<f4');N=acc(1,'<f4');UV=acc(2,'<f4');IDX=acc(3,'<u4').reshape(-1)
# o corpo vem deslocado no arquivo: centraliza (quadril em x=0, pés em z≈0)
P=P+np.array([0.044,0,-0.025],np.float32)
# ---------- remove o rabo de ornitorrinco: os vértices dele são recolhidos para dentro do corpo (a malha continua fechada)
from collections import defaultdict
def find_tail(P,I,ymax=.22,zmax=-.135):
  key=np.round(P*3000).astype(np.int64);_,wid=np.unique(key,axis=0,return_inverse=True);wid=wid.reshape(-1);nw=wid.max()+1
  wpos=np.zeros((nw,3));wpos[wid]=P;E=wid[np.concatenate([I[:,[0,1]],I[:,[1,2]],I[:,[2,0]]])];adj=defaultdict(set)
  for a_,b_ in E:adj[a_].add(b_);adj[b_].add(a_)
  allowed=(wpos[:,1]<ymax)&(wpos[:,2]<zmax);tip=np.argmax(np.where(allowed,wpos[:,0]-wpos[:,2],-9));seen={tip};st=[tip]
  while st:
    q=st.pop()
    for r in adj[q]:
      if r not in seen and allowed[r]:seen.add(r);st.append(r)
  tail=np.zeros(nw,bool);tail[list(seen)]=True;ring=[q for q in seen if any(not tail[r] for r in adj[q])]
  return tail[wid],wpos[ring].mean(0)
TAIL,TA=find_tail(P,IDX.reshape(-1,3))
# o rabo sai de verdade (os triângulos dele são apagados) e o chapéu vira uma peça separada (item equipável)
F=IDX.reshape(-1,3);F=F[~TAIL[F].any(1)]
HATY=.855
hatF=F[(P[F][:,:,1]>HATY).all(1)];hatF=hatF[P[hatF][:,:,1].min(1)>.863]   # sem as franjas soltas penduradas embaixo da aba
F=F[~(P[F][:,:,1]>HATY).all(1)]
hv=np.unique(hatF.reshape(-1));remap=np.full(len(P),-1);remap[hv]=np.arange(len(hv))+len(P)
LIFT=float(os.environ.get('LIFT','.012'));CUT=float(os.environ.get('CUT','.83'));BUL=float(os.environ.get('BUL','.62'))
P=np.vstack([P,P[hv]+np.array([0,LIFT,0],np.float32)]);N=np.vstack([N,N[hv]]);UV=np.vstack([UV,UV[hv]]);TAIL=np.append(TAIL,np.zeros(len(hv),bool));hatF=remap[hatF]
print('chapéu separado:',len(hatF),'triângulos')
# o alto da cabeça tinha sido moldado para caber no chapéu (paredes retas): sai tudo acima de y=.80 e entra uma cúpula redonda
F=F[~(P[F][:,:,1]>CUT).all(1)]
def wkey(P):
  k=np.round(P*3000).astype(np.int64);_,w=np.unique(k,axis=0,return_inverse=True);return w.reshape(-1)
# tampa buracos com uma cúpula arredondada (anéis que fecham em direção ao centro, estufando para fora)
CAPS=[]
def cap_loops(F,P,N,UV,want,bulge,uvfix,R=4):
  W_=wkey(P);ec={};
  for f in F:
    for a_,b_ in ((f[0],f[1]),(f[1],f[2]),(f[2],f[0])):
      k=(min(W_[a_],W_[b_]),max(W_[a_],W_[b_]));ec.setdefault(k,[]).append((a_,b_))
  nxt={}
  for k,v in ec.items():
    if len(v)==1:a_,b_=v[0];nxt[W_[a_]]=(W_[b_],a_,b_)
  seen=set();loops=[]
  for s0 in list(nxt):
    if s0 in seen:continue
    loop=[];w=s0
    while w in nxt and w not in seen:seen.add(w);wb,a_,b_=nxt[w];loop.append((a_,b_));w=wb
    if len(loop)>=3:loops.append(loop)
  P=list(P);N=list(N);UV=list(UV);NF=[]
  for loop in loops:
    ring=[a_ for a_,b_ in loop];pts=np.array([P[i] for i in ring]);c=pts.mean(0)
    if not want(c,pts):continue
    nrm=np.mean([N[i] for i in ring],0);nrm/=np.linalg.norm(nrm)+1e-9;rad=np.linalg.norm(pts-c,axis=1).mean()
    # cópias da borda com a UV do pelo (senão a textura "rasga" atravessando o atlas inteiro)
    prev=[]
    for i in ring:prev.append(len(P));P.append(P[i].copy());N.append(N[i].copy());UV.append(uvfix)
    for j in range(1,R+1):
      f=j/(R+1);cur=[]
      for i in ring:
        q=c+(P[i]-c)*np.cos(f*np.pi/2)+nrm*bulge*rad*np.sin(f*np.pi/2);cur.append(len(P));P.append(q.astype(np.float32));N.append(nrm.astype(np.float32));UV.append(uvfix)
      for k in range(len(ring)):
        a0,b0,a1,b1=prev[k],prev[(k+1)%len(ring)],cur[k],cur[(k+1)%len(ring)];NF+=[(b0,a0,a1),(b0,a1,b1)]
      prev=cur
    ap=len(P);P.append((c+nrm*bulge*rad).astype(np.float32));N.append(nrm.astype(np.float32));UV.append(uvfix)
    for k in range(len(ring)):NF.append((prev[(k+1)%len(ring)],prev[k],ap))
    print('buraco tampado:',len(ring),'arestas, centro',np.round(c,3));CAPS.append((c,rad))
  F=np.vstack([F,np.array(NF,dtype=F.dtype)]) if NF else F
  return F,np.array(P,np.float32),np.array(N,np.float32),np.array(UV,np.float32)
# cor de pelo para as tampas: UV de um vértice do alto da nuca (fora do chapéu)
FURUV=UV[np.argmin(np.linalg.norm(P-np.array([0,.6,-.21]),axis=1))].copy()   # meio das costas: pelo liso, longe das bordas da textura
n0=len(P)
F,P,N,UV=cap_loops(F,P,N,UV,lambda c,pts:c[1]<.4,.55,FURUV)                     # bumbum (onde era o rabo): bem redondinho
F,P,N,UV=cap_loops(F,P,N,UV,lambda c,pts:c[1]>.7,BUL,FURUV,R=9)                 # topo da cabeça: cúpula redondinha
# a faixa logo abaixo do corte tinha a sombra da aba pintada na textura: vira pelo liso
bv=np.unique(F.reshape(-1));top=bv[P[bv,1]>CUT-.025];UV[top]=FURUV
topy=P[np.unique(F.reshape(-1)),1].max();TAIL=np.append(TAIL,np.zeros(len(P)-len(TAIL),bool));IDX=F.reshape(-1).astype(np.uint32)
print('topo da cabeça em y=',round(float(topy),3))
capC,capR=CAPS[0] if CAPS else (np.array([0,9,9]),.01)
TAIL=np.append(TAIL,np.zeros(len(P)-len(TAIL),bool))
IDX=F.reshape(-1).astype(np.uint32);HIDX=hatF.reshape(-1).astype(np.uint32)
# deixa a capivara "redondinha": suavização de Taubin (não encolhe) no corpo; o chapéu fica como está
WID=wkey(P);nw=WID.max()+1
Wp=np.zeros((nw,3));np.add.at(Wp,WID,P);Wp/=np.bincount(WID,minlength=nw)[:,None]
T3=WID[F];E=np.concatenate([T3[:,[0,1]],T3[:,[1,2]],T3[:,[2,0]]]);E=np.concatenate([E,E[:,::-1]]);E=np.unique(E,axis=0)
deg=np.bincount(E[:,0],minlength=nw)[:,None].astype(float)
used=np.zeros(nw,bool);used[T3.reshape(-1)]=True;hatw=np.zeros(nw,bool);hatw[WID[hatF.reshape(-1)]]=True
free=(used&~hatw)[:,None]*1.0
for it in range(12):
  for lam in (.5,-.53):
    acc=np.zeros_like(Wp);np.add.at(acc,E[:,0],Wp[E[:,1]]);Wp=Wp+lam*free*(acc/np.maximum(deg,1)-Wp)
# orelhinhas que nascem da própria cabeça (a malha é puxada para fora: o contorno passa por elas) e o popozinho (duas bochechas no bumbum)
def vnorm(Wp):
  a_,b_,c_=Wp[T3[:,0]],Wp[T3[:,1]],Wp[T3[:,2]];fn=np.cross(b_-a_,c_-a_);vn=np.zeros((nw,3))
  for k in range(3):np.add.at(vn,T3[:,k],fn)
  return vn/(np.linalg.norm(vn,axis=1,keepdims=True)+1e-12)
VN=vnorm(Wp);EARW=np.zeros(nw)
body=used&~hatw
for sgn in (1,-1):
  tgt=np.array([sgn*.15,topy,-.035]);cand=np.where(body&(Wp[:,1]>CUT-.02))[0];B0=Wp[cand[np.argmin(np.linalg.norm(Wp[cand]-tgt*np.array([1,1,1])-np.array([0,0,0]),axis=1)+np.abs(Wp[cand,0]-sgn*.15)*2)]]
  D=VN[cand[np.argmin(np.linalg.norm(Wp[cand]-B0,axis=1))]]+np.array([sgn*.35,1.1,-.15]);D/=np.linalg.norm(D)
  dd=np.linalg.norm(Wp-B0,axis=1);r=.046;k=np.clip(1-(dd/r)**2,0,1)*body
  prof=np.sqrt(k);Wp=Wp+(prof*.052)[:,None]*D[None,:];EARW=np.maximum(EARW,prof)
for sgn in (1,-1):
  C=capC+np.array([sgn*.075,-.005,.0]);dd=np.linalg.norm((Wp-C)*np.array([1,.85,1.6]),axis=1);k=np.exp(-(dd/.075)**2)*body*(VN[:,2]<0)
  Wp=Wp+(k*.055)[:,None]*VN
crease=np.exp(-(Wp[:,0]/.012)**2)*np.exp(-((Wp[:,1]-capC[1]+.01)/.06)**2)*body*(VN[:,2]<-.3)
Wp=Wp-(crease*.012)[:,None]*VN
P=Wp[WID].astype(np.float32)
# o chapéu assenta na cabeça: sobe só o necessário para a aba encostar no ombro da cúpula (sem afundar e sem flutuar)
hv=np.unique(hatF.reshape(-1));HP=P[hv];ctr=HP[HP[:,1]>HP[:,1].max()-.02][:,[0,2]].mean(0)
rad=np.linalg.norm(HP[:,[0,2]]-ctr,axis=1);brim=HP[rad>.16]
bw=np.unique(T3.reshape(-1));bw=bw[body[bw]&(Wp[bw,1]>CUT-.05)&(EARW[bw]<.01)];need=0.
for q in brim:
  dxz=np.linalg.norm(Wp[bw][:,[0,2]]-q[[0,2]],axis=1);m=dxz<.012
  if m.any():need=max(need,Wp[bw][m,1].max()+.006-q[1])
P[hv,1]+=need;print('chapéu assentado: +%.3f'%need)
# normais lisas recalculadas no corpo (o chapéu mantém as dele, com as quinas da aba)
a_,b_,c_=Wp[T3[:,0]],Wp[T3[:,1]],Wp[T3[:,2]];fn=np.cross(b_-a_,c_-a_);vn=np.zeros((nw,3))
for k in range(3):np.add.at(vn,T3[:,k],fn)
vn/=np.linalg.norm(vn,axis=1,keepdims=True)+1e-12;isHat=np.zeros(len(P),bool);isHat[HIDX]=True
N=np.where(isHat[:,None],N,vnorm(Wp)[WID]).astype(np.float32)
# "pelo liso" no alto da cabeça e no bumbum (onde não há textura): a cor média do pelo, misturada aos poucos com a textura (sem emenda)
FLAT=np.zeros(len(P),np.float32);FLAT[n0:]=1;FLAT[isHat]=0
def ss_(a,b,v):t=np.clip((v-a)/(b-a),0,1);return t*t*(3-2*t)
band=ss_(CUT-.058,CUT-.03,P[:,1])*(1-((P[:,2]>.1)&(np.abs(P[:,0])>.12)&(np.abs(P[:,0])<.23)&(P[:,1]<CUT-.032)))
tb=np.linalg.norm(P-capC,axis=1);band2=ss_(capR*1.9,capR*1.05,tb)
FLAT[:n0]=np.maximum(band[:n0],band2[:n0])
# parte de dentro da orelha (virada para a frente) mais escurinha: valores acima de 1 escurecem no shader
EV=EARW[WID];inner=ss_(.3,.7,EV)*ss_(-.15,.35,N[:,2]);FLAT=np.where(EV>.02,np.maximum(FLAT,1+inner*.9),FLAT)
print('rabo removido:',int(TAIL.sum()),'vértices')
x,y,z=P[:,0],P[:,1],P[:,2];ax=np.abs(x);sx=np.where(x>=0,1,-1)
def ss(a,b,v):t=np.clip((v-a)/(b-a),0,1);return t*t*(3-2*t)
# ---------- esqueleto (posições no espaço da malha; rotações identidade) ----------
B=[('root',None,(0,0,0)),('hips','root',(0,.17,0)),('spine','hips',(0,.26,.01)),('chest','spine',(0,.37,.027)),('neck','chest',(0,.47,.04)),('head','neck',(0,.53,.06)),
 ('armL','chest',(.245,.47,.03)),('foreL','armL',(.305,.33,.04)),('handL','foreL',(.322,.215,.07)),
 ('armR','chest',(-.245,.47,.03)),('foreR','armR',(-.305,.33,.04)),('handR','foreR',(-.322,.215,.07)),
 ('thighL','hips',(.098,.139,0)),('shinL','thighL',(.099,.078,.004)),('footL','shinL',(.099,.04,0)),
 ('thighR','hips',(-.098,.139,0)),('shinR','thighR',(-.099,.078,.004)),('footR','shinR',(-.099,.04,0))]
names=[b[0] for b in B];bi={n:i for i,n in enumerate(names)};pos={b[0]:np.array(b[2]) for b in B}
Wt=np.zeros((len(P),len(B)))
def segd(p,a,b):
  ab=b-a;t=np.clip(((p-a)@ab)/(ab@ab),0,1);return np.linalg.norm(p-(a+np.outer(t,ab)),axis=1),t
sh=ss(.47,.55,y)
arm=np.zeros(len(P))
for s_,(A_,F_,H_) in [(1,('armL','foreL','handL')),(-1,('armR','foreR','handR'))]:
  a_,f_,h_=pos[A_],pos[F_],pos[H_];e_=h_+np.array([s_*.0,-.07,.045])
  d1,t1=segd(P,a_,f_);d2,t2=segd(P,f_,h_);d3,t3=segd(P,h_,e_);dm=np.minimum(np.minimum(d1,d2),d3)
  am=ss(.1,.072,dm)*ss(.2,.25,ax)*(1-sh*.6)*(sx==s_)*(1-TAIL)
  par=np.where(d1<=np.minimum(d2,d3),t1,np.where(d2<=d3,1+t2,2+t3));wu=1-ss(.8,1.2,par);wh=ss(1.8,2.15,par);wf=1-wu-wh
  Wt[:,bi[A_]]+=am*wu;Wt[:,bi[F_]]+=am*wf;Wt[:,bi[H_]]+=am*wh;arm+=am
leg=ss(.19,.125,y)*ss(.012,.045,ax)*(1-TAIL)
for s_,(T_,S_,F_) in [(1,('thighL','shinL','footL')),(-1,('thighR','shinR','footR'))]:
  m=(sx==s_)*leg*(1-arm);wt=ss(.1,.13,y);wfo=ss(.06,.03,y);wsh=np.clip(1-wt-wfo,0,1)
  Wt[:,bi[T_]]+=m*wt;Wt[:,bi[S_]]+=m*wsh;Wt[:,bi[F_]]+=m*wfo
legm=leg*(1-arm)
rest=np.clip(1-sh-arm-legm,0,1);wh_=1-ss(.2,.27,y);wc=ss(.33,.42,y);wsp=np.clip(1-wh_-wc,0,1)
Wt[:,bi['hips']]+=rest*wh_;Wt[:,bi['spine']]+=rest*wsp;Wt[:,bi['chest']]+=rest*wc
Wt[:,bi['head']]+=sh;nk=ss(.43,.5,y)*(1-ss(.52,.58,y))*(1-arm);Wt[:,bi['neck']]+=nk*.5
Wt[TAIL]=0;Wt[TAIL,bi['hips']]=1
# ---------- suavização pela malha (vértices soldados por posição) ----------
key=np.round(P*2000).astype(np.int64);_,weld=np.unique(key,axis=0,return_inverse=True);weld=weld.reshape(-1);nw=weld.max()+1
Ww=np.zeros((nw,len(B)));np.add.at(Ww,weld,Wt);cnt=np.bincount(weld,minlength=nw)[:,None];Ww/=cnt
tri=weld[IDX].reshape(-1,3);E=np.concatenate([tri[:,[0,1]],tri[:,[1,2]],tri[:,[2,0]]]);E=np.concatenate([E,E[:,::-1]])
deg=np.bincount(E[:,0],minlength=nw)[:,None]
for it in range(6):
  acc_=np.zeros_like(Ww);np.add.at(acc_,E[:,0],Ww[E[:,1]]);Ww=.5*Ww+.5*acc_/np.maximum(deg,1)
Wt=Ww[weld]
Wt=np.maximum(Wt,0);Wt/=Wt.sum(1,keepdims=True)
o=np.argsort(-Wt,axis=1)[:,:4];w4=np.take_along_axis(Wt,o,1);w4[w4<.02]=0;w4/=w4.sum(1,keepdims=True)
J4=o.astype(np.uint8);W4=w4.astype(np.float32)
dom=o[:,0]
for n in names:print(n,int((dom==bi[n]).sum()),end=' | ')
print()
# ---------- texturas otimizadas ----------
def img(k):
  mat=j['materials'][0];ti=mat['pbrMetallicRoughness']['baseColorTexture']['index'] if k=='base' else mat['normalTexture']['index']
  v=j['bufferViews'][j['images'][j['textures'][ti]['source']]['bufferView']];return Image.open(io.BytesIO(d[b0+v.get('byteOffset',0):b0+v.get('byteOffset',0)+v['byteLength']]))
def jpg(im,size,q):
  im=im.convert('RGB').resize((size,size),Image.LANCZOS);b=io.BytesIO();im.save(b,'JPEG',quality=q,optimize=True);return b.getvalue()
_bi=img('base').convert('RGB');_ta=np.asarray(_bi).astype(float)/255;_h,_w=_ta.shape[:2]
_sel=np.where((P[:,1]>.35)&(P[:,1]<.75)&(P[:,2]<-.05)&(FLAT==0))[0];_uv=UV[_sel];_c=_ta[np.clip((_uv[:,1]%1*_h).astype(int),0,_h-1),np.clip((_uv[:,0]%1*_w).astype(int),0,_w-1)]
FURAVG='#%02x%02x%02x'%tuple(int(v*255) for v in np.median(_c,0));print('cor média do pelo',FURAVG)
base=jpg(_bi,1024,86);nrm=jpg(img('normal'),1024,82)
# ---------- escreve GLB ----------
blobs=[];views=[];accs=[]
def add(data,target=None):
  off=sum(len(b) for b in blobs);pad=(-len(data))%4;blobs.append(data+b'\0'*pad);v={'buffer':0,'byteOffset':off,'byteLength':len(data)};
  if target:v['target']=target
  views.append(v);return len(views)-1
def addacc(arr,ctype,typ,target,mm=False):
  v=add(arr.tobytes(),target);a={'bufferView':v,'componentType':ctype,'count':len(arr),'type':typ}
  if mm:a['min']=arr.min(0).tolist();a['max']=arr.max(0).tolist()
  accs.append(a);return len(accs)-1
iv0=add(base);iv1=add(nrm)
aP=addacc(P.astype(np.float32),5126,'VEC3',34962,True);aN=addacc(N.astype(np.float32),5126,'VEC3',34962);aU=addacc(UV.astype(np.float32),5126,'VEC2',34962)
aF=addacc(FLAT.astype(np.float32),5126,'SCALAR',34962);aJ=addacc(J4,5121,'VEC4',34962);aW=addacc(W4,5126,'VEC4',34962);aI=addacc(IDX.astype(np.uint32),5125,'SCALAR',34963);aH=addacc(HIDX.astype(np.uint32),5125,'SCALAR',34963)
ibm=np.zeros((len(B),16),np.float32)
for i,(n,p,ps) in enumerate(B):m=np.eye(4);m[:3,3]=-np.array(ps);ibm[i]=m.T.reshape(-1)
aB=addacc(ibm,5126,'MAT4',None)
nodes=[{'name':'Capivara','children':[1,2]},{'name':'corpo','mesh':0,'skin':0}]
for i,(n,p,ps) in enumerate(B):
  par=pos[p] if p else np.zeros(3);nodes.append({'name':n,'translation':(np.array(ps)-par).tolist()})
for i,(n,p,ps) in enumerate(B):
  if p:nodes[2+bi[p]].setdefault('children',[]).append(2+i)
gl={'asset':{'version':'2.0','generator':'CapyBoom re-rig','extras':{'eyes':False,'model':'capivara-chapeu','hat':'separado','furAvg':FURAVG}},'scene':0,'scenes':[{'nodes':[0]}],'nodes':nodes,
 'meshes':[{'primitives':[{'attributes':{'POSITION':aP,'NORMAL':aN,'TEXCOORD_0':aU,'JOINTS_0':aJ,'WEIGHTS_0':aW,'_FLAT':aF},'indices':aI,'material':0},{'attributes':{'POSITION':aP,'NORMAL':aN,'TEXCOORD_0':aU,'JOINTS_0':aJ,'WEIGHTS_0':aW},'indices':aH,'material':0,'extras':{'part':'chapeu'}}]}],
 'skins':[{'joints':[2+i for i in range(len(B))],'inverseBindMatrices':aB,'skeleton':2}],
 'materials':[{'name':'capivara','pbrMetallicRoughness':{'baseColorTexture':{'index':0},'metallicFactor':0,'roughnessFactor':.8},'normalTexture':{'index':1},'doubleSided':True}],
 'textures':[{'source':0,'sampler':0},{'source':1,'sampler':0}],'samplers':[{'magFilter':9729,'minFilter':9987}],
 'images':[{'bufferView':iv0,'mimeType':'image/jpeg'},{'bufferView':iv1,'mimeType':'image/jpeg'}],
 'accessors':accs,'bufferViews':views,'buffers':[{'byteLength':sum(len(b) for b in blobs)}]}
js=json.dumps(gl,separators=(',',':')).encode();js+=b' '*((-len(js))%4);bin_=b''.join(blobs)
out=b'glTF'+struct.pack('<II',2,12+8+len(js)+8+len(bin_))+struct.pack('<I',len(js))+b'JSON'+js+struct.pack('<I',len(bin_))+b'BIN\0'+bin_
os.makedirs(os.path.dirname(dst),exist_ok=True);open(dst,'wb').write(out);print('GLB',len(out)//1024,'KB')
