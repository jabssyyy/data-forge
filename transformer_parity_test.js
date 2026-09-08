'use strict';
const fs=require('fs');
const assert=require('assert');
const path=require('path');
const vm=require('vm');
const read=file=>fs.readFileSync(path.join(__dirname,file),'utf8');
const {TinyTransformer}=require('./transformer.js');
function compare(out,ref) {
  assert.strictEqual(out.T,ref.sequence.length);
  assert.strictEqual(out.hidden.length,ref.config.n_layer);
  assert.strictEqual(ref.hidden.length,ref.config.n_layer);
  assert.strictEqual(out.activeCounts.length,ref.config.n_layer);
  assert.strictEqual(out.activeFraction.length,ref.config.n_layer);
  assert.strictEqual(out.logits.length,out.T*ref.config.vocab_size);
  assert.strictEqual(ref.logits.flat().length,out.logits.length);
  assert.strictEqual(out.crossEntropyBits.length,out.T-1);
  assert.strictEqual(ref.cross_entropy.series_bits.length,out.T-1);
  let maxDiff=0,scale=0,countMismatch=0,zeroMismatch=0;
  for(let l=0;l<ref.hidden.length;l++) {
    const actual=out.hidden[l],expected=ref.hidden[l].flat();
    assert.strictEqual(actual.length,expected.length);
    assert.strictEqual(actual.length,out.T*1024);
    assert.strictEqual(out.activeCounts[l].length,out.T);
    assert.strictEqual(out.activeFraction[l].length,out.T);
    assert.strictEqual(ref.active_counts[l].length,out.T);
    for(let i=0;i<actual.length;i++) {
      assert(Number.isFinite(actual[i]),'non-finite hidden');
      assert(Number.isFinite(expected[i]),'non-finite reference hidden');
      maxDiff=Math.max(maxDiff,Math.abs(actual[i]-expected[i]));scale=Math.max(scale,Math.abs(expected[i]));
      if((actual[i]===0)!==(expected[i]===0))zeroMismatch++;
    }
    for(let t=0;t<out.T;t++) {
      assert(Number.isInteger(ref.active_counts[l][t]) && ref.active_counts[l][t]>=0 && ref.active_counts[l][t]<=1024);
      if(out.activeCounts[l][t]!==ref.active_counts[l][t])countMismatch++;
      assert.strictEqual(out.activeFraction[l][t],out.activeCounts[l][t]/1024);
      let count=0;for(let j=0;j<1024;j++)if(actual[t*1024+j]>0)count++;
      assert.strictEqual(count,out.activeCounts[l][t],'raw/grid counts');
    }
  }
  const expectedLogits=ref.logits.flat();let logDiff=0,logScale=0,ceDiff=0;
  for(let i=0;i<expectedLogits.length;i++) {
    assert(Number.isFinite(expectedLogits[i]));assert(Number.isFinite(out.logits[i]));logDiff=Math.max(logDiff,Math.abs(out.logits[i]-expectedLogits[i]));logScale=Math.max(logScale,Math.abs(expectedLogits[i]));
  }
  for(let i=0;i<out.crossEntropyBits.length;i++) {
    assert(Number.isFinite(ref.cross_entropy.series_bits[i]));assert(Number.isFinite(out.crossEntropyBits[i]));ceDiff=Math.max(ceDiff,Math.abs(out.crossEntropyBits[i]-ref.cross_entropy.series_bits[i]));
  }
  const report={countMismatch,zeroMismatch,hiddenNormalizedError:maxDiff/Math.max(scale,1e-30),logitsNormalizedError:logDiff/Math.max(logScale,1e-30),ceMaxBitsError:ceDiff};
  assert.strictEqual(countMismatch,0,JSON.stringify(report));assert.strictEqual(zeroMismatch,0,JSON.stringify(report));
  assert(report.hiddenNormalizedError<1e-4,JSON.stringify(report));assert(report.logitsNormalizedError<1e-4,JSON.stringify(report));assert(ceDiff<1e-4,JSON.stringify(report));
  return report;
}
for(const [name,weight,reference] of [['trained','weights_transformer.json','probe/transformer_reference.json'],['untrained','weights_transformer_untrained.json','probe/transformer_untrained_reference.json']]) {
 const model=new TinyTransformer(JSON.parse(read(weight))),ref=JSON.parse(read(reference));
 const start=performance.now(),out=model.forward(ref.sequence,{keepRaw:true});
 console.log(name,JSON.stringify(compare(out,ref)),`${(performance.now()-start).toFixed(1)} ms Node`);
 const future=ref.sequence.slice();future[40]=(future[40]+1)%26;
 const changed=model.forward(future,{keepRaw:true});
 for(let t=0;t<40;t++) for(let l=0;l<4;l++) assert.deepStrictEqual(out.hidden[l].slice(t*1024,(t+1)*1024),changed.hidden[l].slice(t*1024,(t+1)*1024));
 // Isolated negative controls prove each gate rejects corrupted evidence.
 const mutated=()=>({...out,hidden:out.hidden.map(a=>a.slice()),activeCounts:out.activeCounts.map(a=>a.slice()),logits:out.logits.slice(),crossEntropyBits:out.crossEntropyBits.slice()});
 let bad=mutated();bad.hidden[0][0]=NaN;assert.throws(()=>compare(bad,ref));
 bad=mutated();bad.activeCounts[0][0]++;assert.throws(()=>compare(bad,ref));
 bad=mutated();
 const positive=out.hidden[0].subarray(0,1024).findIndex(v=>v>0),zero=out.hidden[0].subarray(0,1024).findIndex(v=>v===0);
 assert(positive>=0&&zero>=0);
 bad.hidden[0][zero]=bad.hidden[0][positive];bad.hidden[0][positive]=0;assert.throws(()=>compare(bad,ref));
 bad=mutated();bad.hidden[0][positive]+=100;assert.throws(()=>compare(bad,ref));
 bad=mutated();bad.logits[0]+=1;assert.throws(()=>compare(bad,ref));
 bad=mutated();bad.crossEntropyBits[0]+=1;assert.throws(()=>compare(bad,ref));
 bad=mutated();bad.crossEntropyBits=bad.crossEntropyBits.slice(1);assert.throws(()=>compare(bad,ref));
 bad=mutated();bad.logits=bad.logits.slice(1);assert.throws(()=>compare(bad,ref));
 // Operator mutations exist only in isolated VM strings; disk source stays intact.
 const source=read('transformer.js');
 const mutations=[
  ['causal mask', 's<=t', 's<T'],
  ['RoPE sign', 'a[o]=f32(aa*c)-f32(bb*s)', 'a[o]=f32(aa*c)+f32(bb*s)'],
  ['head layout', 'v[s*D+h*N+j]', 'v[s*D+j*nh+h]']
 ];
 for(const [label,from,to] of mutations) {
   assert(source.includes(from),'mutation must hit '+label);
   const context={module:{exports:{}}};vm.createContext(context);
   vm.runInContext(source.split(from).join(to),context,{filename:'isolated-'+label+'.js'});
   const mutant=new context.module.exports.TinyTransformer(JSON.parse(read(weight)));
   const mutatedOutput=mutant.forward(ref.sequence,{keepRaw:true});
   assert.throws(()=>compare(mutatedOutput,ref),undefined,label+' must fail parity');
   console.log(name+' operator mutation rejected: '+label);
 }
}
console.log('Transformer parity, causal isolation, and eight corrupted-output controls and three operator mutations per model PASS.');
module.exports={compare};
