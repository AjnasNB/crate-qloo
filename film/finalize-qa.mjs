// Freeze portable evidence after the encoded file and its local reports are checked.
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {createHash} from 'node:crypto';
const read=path=>JSON.parse(fs.readFileSync(path,'utf8').replace(/^\uFEFF/,''));
const write=(path,value)=>fs.writeFileSync(path,JSON.stringify(value,null,2)+'\n');
const encoded=read('qa/encoded-check.json');
const gates=read('renders/look-final/gates.json');
assert.ok(gates.gates.every(gate=>gate.status==='PASS'));
write('qa/encoded-gates.json',{sha256:encoded.sha256,...gates});
const raw=fs.readFileSync('renders/check-final.json','utf8').replaceAll('\r\n','\n');
const offset=raw.indexOf('\n{\n  "ok":');
assert.ok(offset>=0,'Expected the official framework JSON report');
const framework=JSON.parse(raw.slice(offset+1));
const summary={version:'0.8.185',ok:framework.ok,browserSkipped:framework.browserSkipped};
for(const key of ['lint','runtime','layout','motion','contrast','craft']){
  const section=framework[key];if(!section)continue;
  summary[key]={};
  for(const name of ['ok','errorCount','warningCount','infoCount','checked','passed','samples']){
    if(section[name]!==undefined)summary[key][name]=section[name];
  }
  summary[key].findings=(section.findings??[]).map(f=>({code:f.code,severity:f.severity,message:f.message}));
}
summary.limits='DOM motion/contrast findings do not measure the WebGL canvas or captured screenshot text; decoded images were reviewed separately.';
write('qa/framework-check.json',summary);
const lint=read('qa/motion-lint.json');lint.file='index.html';write('qa/motion-lint.json',lint);
assert.equal(lint.gate,'PASS');
write('qa/audio-transcription.json',{
  sourceSha256:encoded.sha256,engine:'Local Parakeet TDT 0.6B v3 via HyperFrames; no model/runtime install',
  interpretation:'Encoded speech content checked against narration.json. Proper-name spelling is uncertain; not an auditory or word-level alignment certification.',
  spellingDifferences:['Qloo transcribed as Culu','Ajnas N B transcribed as Ajna\'s NB','programme transcribed as program'],
  words:read('renders/transcript.json')
});
const paths=['renders/crate-live-demo.mp4','renders/crate-live-demo-poster.jpg','assets/crate-live-demo.vtt'];
write('qa/delivery-assets.json',paths.map(path=>({path,bytes:fs.statSync(path).size,sha256:createHash('sha256').update(fs.readFileSync(path)).digest('hex')})));
write('qa/independent-review.json',{
  sha256:encoded.sha256,status:'No P0/P1 found in sampled visual inspection',
  exactSecondSamples:Array.from({length:34},(_,i)=>i),
  fullFrameSeconds:[6.2,9.4,11.4,18,22.2,25.6,30.5,31.5,32.5,33],
  checked:['Actual programme before live Qloo ranks','Copy clear of book/crate edges','Seven retained title/stall placements','Protected crate unchanged','Moving logo and exact sole credit within frame'],
  limits:'Sampled visual inspection, not perceptual review of all 995 frames. Audio checked through timing, levels, provenance and transcription; not perceptually heard.'
});
console.log('Portable encoded, framework, audio, asset and independent review evidence written.');
