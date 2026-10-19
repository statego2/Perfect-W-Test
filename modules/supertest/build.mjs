import {readFileSync,writeFileSync,mkdirSync} from 'node:fs';
import {createHash} from 'node:crypto';
const read=s=>readFileSync(new URL(s,import.meta.url),'utf8');
const bank=JSON.parse(read('./data/questions.json'));const modules=JSON.parse(read('./data/modules.json'));
const core=read('./src/core.mjs').replace(/^export /gm,'');
const app=read('./src/app.mjs');
const data=`const BANK=${JSON.stringify(bank).replace(/</g,'\\u003c')};\nconst MODULES=${JSON.stringify(modules).replace(/</g,'\\u003c')};\n`;
const bplData=read('../beauty/data.mjs').replace(/^export /gm,'');
const bplEngine=read('../beauty/engine.mjs').replace(/^import .*?;\s*$/gm,'').replace(/^export /gm,'');
const bplSource='const BPL=(()=>{\n'+bplData+'\n'+bplEngine+'\nreturn {VERSION,BANK_ID,FACE_IDS,AXES,VALUE_QUESTIONS,PAIR_QUESTIONS,newSession,validSession,summary};\n})();\n';
const faceManifest=JSON.parse(read('../beauty/assets/manifest.json'));
if(faceManifest.count!==12||faceManifest.images.length!==12)throw Error('Beauty asset inventory mismatch');
const imgs={};
for(const asset of faceManifest.images){
 const id=asset.id;
 if(!/^F(0[1-9]|1[0-2])$/.test(id)||imgs[id])throw Error('Invalid/duplicate Beauty asset ID');
 const bytes=readFileSync(new URL('../beauty/'+asset.file,import.meta.url));
 if(createHash('sha256').update(bytes).digest('hex')!==asset.sha256)throw Error('Beauty asset SHA mismatch: '+id);
 imgs[id]='data:image/webp;base64,'+bytes.toString('base64');
}
const faceData='const BPL_ASSET_IMAGES='+JSON.stringify(imgs)+';\n';
const bridge=read('./src/beauty-bridge.mjs');
const script=(data+core+bplSource+faceData+bridge+app).replace(/<\/script/gi,'<\\/script');
const html=read('./src/template.html').replace('/* CSS_INSERT */',read('./src/style.css')).replace('/* CODE_INSERT */',script);
if(html.includes('/* CODE_INSERT */')||html.includes('/* CSS_INSERT */'))throw Error('Unfilled template tokens');
mkdirSync(new URL('./dist/',import.meta.url),{recursive:true});
writeFileSync(new URL('./dist/index.html',import.meta.url),html);
writeFileSync(new URL('./index.html',import.meta.url),html);
console.log(`Built standalone supertest: ${bank.questions.length} questions, ${Math.round(Buffer.byteLength(html)/1024)} KB`);
