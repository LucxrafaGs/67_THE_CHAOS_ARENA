// Servidor local simples (sem Cloudflare): serve a pasta public/ em http://localhost:8080
import {createServer} from 'node:http';
import {readFile,stat} from 'node:fs/promises';
import {join,extname,dirname,normalize} from 'node:path';
import {fileURLToPath} from 'node:url';
const root=join(dirname(fileURLToPath(import.meta.url)),'..','public'),port=+process.env.PORT||8080;
const MIME={'.html':'text/html; charset=utf-8','.js':'text/javascript','.css':'text/css','.json':'application/json','.webmanifest':'application/manifest+json','.png':'image/png','.jpg':'image/jpeg','.svg':'image/svg+xml','.woff2':'font/woff2','.glb':'model/gltf-binary','.txt':'text/plain; charset=utf-8'};
createServer(async(req,res)=>{try{let p=normalize(decodeURIComponent(new URL(req.url,'http://x').pathname)).replace(/^([.][.][/\\])+/,'');let f=join(root,p);
  if(!f.startsWith(root))throw 0;if((await stat(f).catch(()=>null))?.isDirectory())f=join(f,'index.html');
  const data=await readFile(f);res.writeHead(200,{'content-type':MIME[extname(f)]||'application/octet-stream','cache-control':'no-cache'});res.end(data)}
  catch(e){res.writeHead(404,{'content-type':'text/plain; charset=utf-8'});res.end('não encontrado')}}).listen(port,()=>console.log(`CapyBoom local: http://localhost:${port}  (Ctrl+C para parar)`));
