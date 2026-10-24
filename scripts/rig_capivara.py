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
P[TAIL]=(TA+np.array([0,.01,.05])+(P[TAIL]-TA)*0.02).astype(np.float32)
print('rabo removido:',int(TAIL.sum()),'vértices')
x,y,z=P[:,0],P[:,1],P[:,2];ax=np.abs(x);sx=np.where(x>=0,1,-1)
def ss(a,b,v):t=np.clip((v-a)/(b-a),0,1);return t*t*(3-2*t)
# ---------- esqueleto (posições no espaço da malha; rotações identidade) ----------
B=[('root',None,(0,0,0)),('hips','root',(0,.17,0)),('spine','hips',(0,.26,.01)),('chest','spine',(0,.37,.027)),('neck','chest',(0,.47,.04)),('head','neck',(0,.53,.06)),
 ('armL','chest',(.235,.39,.03)),('foreL','armL',(.283,.262,.03)),('handL','foreL',(.322,.238,.09)),
 ('armR','chest',(-.235,.39,.03)),('foreR','armR',(-.283,.262,.03)),('handR','foreR',(-.322,.238,.09)),
 ('thighL','hips',(.098,.139,0)),('shinL','thighL',(.099,.078,.004)),('footL','shinL',(.099,.04,0)),
 ('thighR','hips',(-.098,.139,0)),('shinR','thighR',(-.099,.078,.004)),('footR','shinR',(-.099,.04,0))]
names=[b[0] for b in B];bi={n:i for i,n in enumerate(names)};pos={b[0]:np.array(b[2]) for b in B}
Wt=np.zeros((len(P),len(B)))
def segd(p,a,b):
  ab=b-a;t=np.clip(((p-a)@ab)/(ab@ab),0,1);return np.linalg.norm(p-(a+np.outer(t,ab)),axis=1),t
sh=ss(.47,.55,y)
arm=np.zeros(len(P))
for s_,(A_,F_,H_) in [(1,('armL','foreL','handL')),(-1,('armR','foreR','handR'))]:
  a_,f_,h_=pos[A_],pos[F_],pos[H_];e_=h_+np.array([s_*.01,-.06,.03])
  d1,t1=segd(P,a_,f_);d2,t2=segd(P,f_,h_);d3,t3=segd(P,h_,e_);dm=np.minimum(np.minimum(d1,d2),d3)
  am=ss(.085,.055,dm)*ss(.19,.235,ax)*(1-sh)*(sx==s_)*(1-TAIL)
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
base=jpg(img('base'),1024,86);nrm=jpg(img('normal'),1024,82)
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
aJ=addacc(J4,5121,'VEC4',34962);aW=addacc(W4,5126,'VEC4',34962);aI=addacc(IDX.astype(np.uint32),5125,'SCALAR',34963)
ibm=np.zeros((len(B),16),np.float32)
for i,(n,p,ps) in enumerate(B):m=np.eye(4);m[:3,3]=-np.array(ps);ibm[i]=m.T.reshape(-1)
aB=addacc(ibm,5126,'MAT4',None)
nodes=[{'name':'Capivara','children':[1,2]},{'name':'corpo','mesh':0,'skin':0}]
for i,(n,p,ps) in enumerate(B):
  par=pos[p] if p else np.zeros(3);nodes.append({'name':n,'translation':(np.array(ps)-par).tolist()})
for i,(n,p,ps) in enumerate(B):
  if p:nodes[2+bi[p]].setdefault('children',[]).append(2+i)
gl={'asset':{'version':'2.0','generator':'CapyBoom re-rig','extras':{'eyes':False,'model':'capivara-chapeu'}},'scene':0,'scenes':[{'nodes':[0]}],'nodes':nodes,
 'meshes':[{'primitives':[{'attributes':{'POSITION':aP,'NORMAL':aN,'TEXCOORD_0':aU,'JOINTS_0':aJ,'WEIGHTS_0':aW},'indices':aI,'material':0}]}],
 'skins':[{'joints':[2+i for i in range(len(B))],'inverseBindMatrices':aB,'skeleton':2}],
 'materials':[{'name':'capivara','pbrMetallicRoughness':{'baseColorTexture':{'index':0},'metallicFactor':0,'roughnessFactor':.8},'normalTexture':{'index':1},'doubleSided':True}],
 'textures':[{'source':0,'sampler':0},{'source':1,'sampler':0}],'samplers':[{'magFilter':9729,'minFilter':9987}],
 'images':[{'bufferView':iv0,'mimeType':'image/jpeg'},{'bufferView':iv1,'mimeType':'image/jpeg'}],
 'accessors':accs,'bufferViews':views,'buffers':[{'byteLength':sum(len(b) for b in blobs)}]}
js=json.dumps(gl,separators=(',',':')).encode();js+=b' '*((-len(js))%4);bin_=b''.join(blobs)
out=b'glTF'+struct.pack('<II',2,12+8+len(js)+8+len(bin_))+struct.pack('<I',len(js))+b'JSON'+js+struct.pack('<I',len(bin_))+b'BIN\0'+bin_
os.makedirs(os.path.dirname(dst),exist_ok=True);open(dst,'wb').write(out);print('GLB',len(out)//1024,'KB')
