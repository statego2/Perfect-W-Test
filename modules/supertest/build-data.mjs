import {readFileSync,writeFileSync} from 'node:fs';
const rows=readFileSync(new URL('./data/questions.tsv',import.meta.url),'utf8').trim().split('\n');
const names={VIS:'Εμφάνιση και αισθητική',CHEM:'Έλξη, φλερτ και χημεία',EMO:'Συναισθηματική σύνδεση',PER:'Προσωπικότητα και χαρακτήρας',INT:'Νόηση και ενδιαφέροντα',FAI:'Πίστη και ηθικές αξίες',COM:'Επικοινωνία και διαφωνίες',LIF:'Καθημερινότητα και τρόπος ζωής',SOC:'Κοινωνικότητα, φίλοι και συγγενείς',AUT:'Αυτονομία, στόχοι και χρήματα',SEX:'Σεξουαλικότητα και οικειότητα ενηλίκων',FAM:'Γάμος, παιδιά και κοινό μέλλον'};
const questions=rows.map((row,index)=>{
 const c=row.split('\t');if(c.length!==5)throw Error(`Malformed row ${index+1}: ${c.length}`);
 const [id,domain,prompt,A,B]=c;
 return {id,domain,prompt,A,B,phase:id.startsWith('G-')?1:id.startsWith('D-')?2:3,kind:id.startsWith('G-')?'broad':id.startsWith('D-')?'detail':'tradeoff',visual_required:id==='G-VIS'};
});
if(questions.length!==135 || new Set(questions.map(q=>q.id)).size!==135)throw Error('question inventory not complete/unique');
if(questions.filter(q=>q.phase===1).length!==12||questions.filter(q=>q.phase===2).length!==105||questions.filter(q=>q.phase===3).length!==18)throw Error('phase totals mismatch');
const data={version:'2.0',language:'el',title:'Ideal Partner Preference Lab',domains:Object.entries(names).map(([code,name])=>({code,name})),questions};
writeFileSync(new URL('./data/questions.json',import.meta.url),JSON.stringify(data,null,2)+'\n');
console.log(`Verified ${questions.length} imported questions across ${data.domains.length} domains`);
