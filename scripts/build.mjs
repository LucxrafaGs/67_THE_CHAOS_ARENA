// Junta src/ em um único HTML: public/index.html (o arquivo publicado no Cloudflare)
import {readFileSync,writeFileSync,readdirSync,mkdirSync} from 'node:fs';
import {join,dirname} from 'node:path';
import {fileURLToPath} from 'node:url';
const root=join(dirname(fileURLToPath(import.meta.url)),'..');
const src=f=>readFileSync(join(root,'src',f),'utf8');
const js=readdirSync(join(root,'src','js')).filter(f=>f.endsWith('.js')).sort().map(f=>src('js/'+f)).join('\n');
const html=`<!doctype html><html lang="pt-BR"><head><meta charset="utf-8">
${src('head.html')}
<meta name="theme-color" content="#1B1033"><title>CapiBoom</title>
<link rel="icon" type="image/svg+xml" href="data:image/svg+xml,%3Csvg xmlns=%27http://www.w3.org/2000/svg%27 viewBox=%270 0 64 64%27%3E%3Cellipse cx=%2718%27 cy=%2716%27 rx=%277%27 ry=%276%27 fill=%27%238E5A33%27 stroke=%27%232A1A12%27 stroke-width=%273%27/%3E%3Cpath d=%27M8 52C3 40 6 22 22 15c12-5 24-3 30 6 5 1 9 6 8 12-1 6-6 9-11 9 0 5-2 9-5 10z%27 fill=%27%23B07A4A%27 stroke=%27%232A1A12%27 stroke-width=%273.5%27 stroke-linejoin=%27round%27/%3E%3Cellipse cx=%2747%27 cy=%2734%27 rx=%2711%27 ry=%278%27 fill=%27%23E3B98A%27/%3E%3Crect x=%2747%27 y=%2725%27 width=%2711%27 height=%277%27 rx=%273.5%27 fill=%27%232A1A12%27/%3E%3Ccircle cx=%2734%27 cy=%2725%27 r=%273.4%27 fill=%27%232A1A12%27/%3E%3Ccircle cx=%2724%27 cy=%2734%27 r=%275%27 fill=%27%23FF8FAB%27 opacity=%27.6%27/%3E%3Ccircle cx=%2730%27 cy=%279%27 r=%277%27 fill=%27%23FF8A1F%27 stroke=%27%232A1A12%27 stroke-width=%273%27/%3E%3Cpath d=%27M31 2c3-2 7-1 8 1-3 2-6 2-8-1z%27 fill=%27%233DBE6C%27/%3E%3C/svg%3E">
<link rel="preconnect" href="https://fonts.googleapis.com"><link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Baloo+2:wght@500;600;700;800&family=Lilita+One&display=swap" rel="stylesheet">
<script src="https://unpkg.com/peerjs@1.5.5/dist/peerjs.min.js"></script>
<style>
${src('style.css')}</style></head><body class="menu">
${src('body.html')}
<script>
(()=>{'use strict';
${js}
})();
</script></body></html>`;
try{new Function(js)}catch(e){console.error('Erro de sintaxe no JS:',e.message);process.exit(1)}
// Servidor: a MESMA simulação do jogo, embrulhada para rodar uma cópia isolada por sala (Durable Object)
const simJs=['00_util.js','02_data.js','04_game.js'].map(f=>src('js/'+f)).join('\n');
const glue=readFileSync(join(root,'server','sim_glue.js'),'utf8');
const sim=`// GERADO por scripts/build.mjs a partir de src/js/ (00_util, 02_data, 04_game) + server/sim_glue.js. Não edite à mão.
export function createSim(){'use strict';
const TAU=Math.PI*2;
${simJs}
${glue}
}
`;
try{new Function(sim.replace(/^export /m,''))}catch(e){console.error('Erro de sintaxe no servidor:',e.message);process.exit(1)}
writeFileSync(join(root,'server','sim.gen.js'),sim);
mkdirSync(join(root,'public'),{recursive:true});
writeFileSync(join(root,'public','index.html'),html);
console.log(`public/index.html gerado (${(html.length/1024).toFixed(0)} KB) + server/sim.gen.js`);
