'use strict';
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const root = path.resolve(__dirname, '..');
const elements = new Map();
const element = id => {
  if (!elements.has(id)) elements.set(id, {innerHTML:'',hidden:false,checked:false,files:[],value:'',querySelectorAll:()=>[]});
  return elements.get(id);
};
const context = vm.createContext({document:{getElementById:element,querySelectorAll:()=>[]},window:{scrollTo(){}},setTimeout,Blob,URL,console});
vm.runInContext(fs.readFileSync(path.join(root,'bank.js'),'utf8')+'\n'+fs.readFileSync(path.join(root,'app.js'),'utf8'),context);
const run = code => vm.runInContext(code,context);
const read = name => JSON.parse(fs.readFileSync(path.join(root,'examples',name),'utf8'));
const copy = x => JSON.parse(JSON.stringify(x));
let count=0;
function test(name,fn){fn();count++;console.log('PASS '+name)}
const a=read('mock-A-post.json'), b=read('mock-B-post.json');
const pa=read('mock-A-pre.json'), pb=read('mock-B-pre.json');
Object.assign(context,{testA:a,testB:b,testPre:[pa,pb]});
test('180 core / 68 optional / 16 domains / 45 subconstructs',()=>assert.equal(run("core.length===180&&BANK.length===248&&domains.length===16&&uniq(core.map(q=>q.domain+'|'+q.sub)).length===45"),true));
test('unique nonempty item identifiers',()=>assert.equal(run('new Set(BANK.map(q=>q.id)).size===248&&BANK.every(q=>q.text&&q.sub)'),true));
test('reverse scoring and excluded answers',()=>{assert.equal(run("val({id:'x',reverse:true},{x:1})"),100);assert.equal(run("val({id:'x'},{x:1})"),0);assert.equal(run("val({id:'x'},{x:'N'})"),null)});
test('75 percent threshold without treating missing as zero',()=>{assert.equal(run("score([{id:'a'},{id:'b'},{id:'c'},{id:'d'}],{a:5,b:5,c:5})"),100);assert.equal(run("score([{id:'a'},{id:'b'},{id:'c'},{id:'d'}],{a:5,b:5})"),null);assert.equal(run('score([], {})'),null)});
test('family patterns preserve raw direction and invert overall score',()=>assert.equal(run("(()=>{const q=core.filter(q=>q.domain==='家庭凝聚力'); const x=Object.fromEntries(q.map(v=>[v.id,v.pattern?1:5])); return domainScore('家庭凝聚力',x)===100&&score(q.filter(v=>v.pattern),x)===0})()"),true));
test('known mock pair and baseline validate',()=>{run('validate(testA,testB);validateBaseline(testA,testPre)')});
for(const [name,change] of [
  ['mismatched code',x=>x.code='OTHER'],
  ['wrong role',x=>x.role='A'],
  ['invalid stage',x=>x.stage='<script>'],
  ['invalid wave',x=>x.wave='other'],
  ['array answers',x=>x.answers=[]],
  ['unknown item',x=>x.answers.UNKNOWN=3],
  ['out of range response',x=>x.answers.Q001=6],
  ['invalid safety type',x=>x.answers.X601=0],
  ['oversized open response',x=>x.answers.X701='x'.repeat(4001)],
  ['mixed mock and real markers',x=>delete x.synthetic],
])test('reject '+name,()=>{const x=copy(b);change(x);context.bad=x;assert.throws(()=>run('validate(testA,bad)'))});
test('safety yes, uncertain, refused and missing all block',()=>{for(const v of ['是','不确定','不愿回答',undefined]){const x=copy(a);if(v===undefined)delete x.answers.X601;else x.answers.X601=v;context.unsafe=x;assert.equal(run('canShare(unsafe,testB,null,true)'),false)}});
test('baseline concern cannot be hidden by later scores',()=>{const x=copy(pa);x.answers.X601='是';context.unsafePre=[x,pb];assert.equal(run('canShare(testA,testB,unsafePre,true)'),false);assert.throws(()=>run('report(testA,testB,unsafePre,true)'))});
test('separate sharing clearance required',()=>assert.equal(run('canShare(testA,testB,testPre,false)'),false));
test('render complete paired report with pre/post change',()=>{run('report(testA,testB,testPre,true)');const h=element('report').innerHTML;assert.match(h,/16\/16/);assert.match(h,/前后测变化/);assert.match(h,/第7–8周/);assert.match(h,/尚未完成信效度验证/);assert.doesNotMatch(h,/undefined|NaN/);assert.doesNotMatch(h,/模拟私密开放答案/)});
test('escape imported text before rendering',()=>{context.escapedA={...a,code:'<img src=x onerror=alert(1)>'};context.escapedB={...b,code:'<img src=x onerror=alert(1)>'};run('report(escapedA,escapedB,null,false)');assert.match(element('report').innerHTML,/&lt;img/);assert.doesNotMatch(element('report').innerHTML,/<img src=x/)});
test('demo clearly labeled and contains no broken values',()=>{run('demo()');assert.match(element('report').innerHTML,/模拟数据 · 非真实夫妻/);assert.doesNotMatch(element('report').innerHTML,/undefined|NaN/)});
(async()=>{
  for(const [id,data] of [['fa',a],['fb',b],['pa',pa],['pb',pb]])element(id).files=[{size:1000,text:async()=>JSON.stringify(data)}];
  element('clearance').checked=true;
  await run('loadPair()');assert.match(element('report').innerHTML,/前后测变化/);count++;
  element('fb').files=[{size:3,text:async()=>'{no'}];
  await run('loadPair()');assert.equal(element('report').innerHTML,'');assert.equal(element('error').hidden,false);assert.match(element('error').textContent,/JSON/);count++;
  console.log(`Passed ${count} checks. All fixtures are synthetic.`);
})().catch(e=>{console.error(e);process.exitCode=1});
