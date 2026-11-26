'use strict';
const $=id=>document.getElementById(id), uniq=a=>[...new Set(a)], core=BANK.filter(q=>!q.optional), domains=uniq(core.map(q=>q.domain)), extras=uniq(BANK.filter(q=>q.optional).map(q=>q.domain)), esc=x=>String(x??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
let answers={},pages=[],page=0,meta=null;
function show(id){for(const k of ['home','survey','import','report'])$(k).hidden=k!==id;window.scrollTo(0,0)}
$('modules').innerHTML=extras.filter(d=>d!=='安全').map(d=>`<label><input type="checkbox" value="${d}" class="module" ${['生活压力','开放'].includes(d)?'checked':''}> ${d}（${BANK.filter(q=>q.domain===d).length}题）</label>`).join('');
function start(){if(!$('consent').checked||!$('code').value.trim()){alert('请填写配对编号并确认自愿参加。');return}meta={version:'2.0',code:$('code').value.trim(),role:$('role').value,stage:$('stage').value,wave:$('wave').value,consent:true};let chosen=[...document.querySelectorAll('.module:checked')].map(x=>x.value).filter(d=>d!=='婚前期待'||meta.stage==='婚前');pages=['安全',...domains,...chosen].map(d=>BANK.filter(q=>q.domain===d));page=0;answers={};$('setup').hidden=true;$('questions').hidden=false;renderQuestions()}
function renderQuestions(){let qs=pages[page];$('progress').textContent=`第 ${page+1} / ${pages.length} 组 · ${qs[0].domain}`;$('prog').max=pages.length;$('prog').value=page+1;$('safety-note').hidden=qs[0].domain!=='安全';$('items').innerHTML=qs.map(q=>{let opts=q.domain==='安全'?['是','否','不确定','不愿回答']:[1,2,3,4,5,'N','P'];return `<fieldset class="q"><legend>${q.id} · ${esc(q.text)}</legend>${q.domain==='开放'?`<textarea aria-label="${esc(q.text)}" maxlength="4000" data-id="${q.id}" rows="3">${esc(answers[q.id])}</textarea>`:`<div class="opts">${opts.map((v,i)=>`<label><input type="radio" name="${q.id}" value="${v}" ${String(answers[q.id])===String(v)?'checked':''}>${q.domain==='安全'?v:['1 非常不同意','2 不同意','3 不确定','4 同意','5 非常同意','不适用','不愿回答'][i]}</label>`).join('')}</div>`}</fieldset>`}).join('');$('items').querySelectorAll('input,textarea').forEach(e=>e.oninput=()=>{answers[e.name||e.dataset.id]=e.value});window.scrollTo(0,0)}
function move(n){if(page+n>=pages.length){exportAnswers();return}page=Math.max(0,page+n);renderQuestions()}
function exportAnswers(){if(!meta)return;const a=document.createElement('a');a.href=URL.createObjectURL(new Blob([JSON.stringify({...meta,answers},null,2)],{type:'application/json'}));a.download=`tongxing-${meta.role}-${meta.wave}.json`;a.click();setTimeout(()=>URL.revokeObjectURL(a.href),1000)}
function resetAll(){if(confirm('清除本页所有答案及报告？已下载文件需自行删除。'))location.reload()}
function val(q,a){let x=a[q.id];if(![1,2,3,4,5,'1','2','3','4','5'].includes(x))return null;return ((q.reverse?6-Number(x):Number(x))-1)*25}
function score(qs,a){if(!qs.length)return null;let v=qs.map(q=>val(q,a)).filter(v=>v!==null);return v.length>=Math.ceil(qs.length*.75)?v.reduce((x,y)=>x+y,0)/v.length:null}
function domainScore(d,a){let qs=core.filter(q=>q.domain===d);if(['家庭凝聚力','家庭灵活性'].includes(d)){let ss=uniq(qs.map(q=>q.sub)).map(s=>{let g=qs.filter(q=>q.sub===s),v=score(g,a);return v===null?null:g[0].pattern?100-v:v});return ss.includes(null)?null:ss.reduce((x,y)=>x+y,0)/ss.length}return score(qs,a)}
const fmt=x=>x===null?'不足':x.toFixed(1), gap=(a,b)=>a===null||b===null?null:Math.abs(a-b), flags=(a,b)=>a===null||b===null?['数据不足']:[...(Math.min(a,b)>=75?['共同优势']:[]),...(Math.max(a,b)<60?['共同成长']:[]),...(Math.min(a,b)<60?['至少一方低分']:[]),...(Math.abs(a-b)>=25?['感受差异']:[])];
function safe(o){return BANK.filter(q=>q.domain==='安全').every(q=>o.answers[q.id]==='否')}
function validatePerson(o){
  const object=x=>x!==null&&typeof x==='object'&&!Array.isArray(x);
  const allowed=['version','code','role','stage','wave','answers','synthetic','consent'];
  if(!object(o)||Object.keys(o).some(k=>!allowed.includes(k))||o.version!=='2.0'||typeof o.code!=='string'||!o.code.trim()||o.code.length>40||/[\u0000-\u001f]/.test(o.code)||!['A','B'].includes(o.role)||!['婚前','已婚'].includes(o.stage)||!['前测','后测'].includes(o.wave)||!object(o.answers)||(o.synthetic!==undefined&&typeof o.synthetic!=='boolean')||(o.consent!==undefined&&o.consent!==true))throw Error('答案文件格式或基本信息无效。请使用本网站导出的 V2.0 JSON。');
  const byId=new Map(BANK.map(q=>[q.id,q]));
  for(const [id,value] of Object.entries(o.answers)){
    const q=byId.get(id);
    if(!q)throw Error('答案文件包含未知题号。');
    const valid=q.domain==='安全'?['是','否','不确定','不愿回答'].includes(value):q.domain==='开放'?typeof value==='string'&&value.length<=4000:[1,2,3,4,5,'1','2','3','4','5','N','P'].includes(value);
    if(!valid)throw Error('答案文件包含无效回答。');
  }
}
function validate(a,b){
  validatePerson(a);validatePerson(b);
  if(a.role!=='A'||b.role!=='B'||a.code!==b.code||a.stage!==b.stage||a.wave!==b.wave||Boolean(a.synthetic)!==Boolean(b.synthetic))throw Error('文件编号、角色、关系阶段、测次或模拟标记不匹配。');
}
function validateBaseline(a,pre){
  validate(...pre);
  if(pre[0].code!==a.code||pre[0].stage!==a.stage||pre[0].wave!=='前测'||a.wave!=='后测'||Boolean(pre[0].synthetic)!==Boolean(a.synthetic))throw Error('基线与当前测次不匹配。');
}
function canShare(a,b,pre,clearance){return Boolean(clearance)&&[a,b,...(pre||[])].every(safe)}

async function loadPair(){
  $('report').innerHTML='';$('report').hidden=true;
  try{
    const read=async id=>{
      const f=$(id).files[0];
      if(!f||f.size>1000000)throw Error('请选择有效 JSON 文件（不超过1 MB）。');
      try{return JSON.parse(await f.text())}catch{throw Error('无法读取 JSON 文件。请重新选择本网站导出的答案。')}
    };
    const a=await read('fa'),b=await read('fb');validate(a,b);
    let pre=null;
    if($('pa').files.length||$('pb').files.length){pre=[await read('pa'),await read('pb')];validateBaseline(a,pre)}
    if(!canShare(a,b,pre,$('clearance').checked))throw Error('共同反馈暂不可生成。请辅导员私下核查安全与分享同意；勿要求伴侣共同查看或解释安全答案。');
    $('error').hidden=true;report(a,b,pre,Boolean(a.synthetic));
  }catch(e){$('error').textContent=e.message;$('error').hidden=false}
}
const advice={ '关系满意度':'各自写下希望保留的关系资源和一项具体改变，选择一个可观察的共同目标。','沟通':'每天十分钟轮流表达与复述，先确认理解再提出建议。','冲突解决':'约定暂停信号和恢复谈话时间；在安全前提下练习一次低强度分歧的协商与修复。','情感亲密':'每天分享一种感受和一种需要，对方先确认感受而非解决问题。','信任与承诺':'选择一项可执行的小约定，记录是否履行；不要求交出密码或放弃隐私。','身体亲密与边界':'仅在双方自愿时讨论舒适与不舒适的接触方式；任何拒绝都应受尊重。','性格与习惯':'区分个人偏好与共同责任，选择一项可协商的生活习惯。','财务管理':'共同讨论一项预算决策和各自自主支配范围，不要求交出财务控制权。','角色与责任':'分别列出可见与隐形责任，再协商一项公平且可复核的分工。','子女与养育':'讨论一个现实或未来养育情境，先确认各自的价值与选择。','原生家庭与亲友':'讨论一个节日或亲友请求的边界，尊重各自的支持网络。','共同活动':'安排双方都愿意的共同活动，并保留各自独处时间。','压力与共同应对':'每天确认压力来源、希望得到的支持类型以及可分担的一项任务。','家庭凝聚力':'分别讨论需要的连接与个人空间，避免将亲密等同于控制。','家庭灵活性':'选择一条共同规则，商定何时及如何调整。','价值观与未来':'分别列出三项优先价值，讨论一个可执行的共同目标。'};
function bars(a,b){return [a,b].map((v,i)=>`<div class="line"><span>${i?'B':'A'} ${fmt(v)}</span><div class="bar ${i?'b':''}"><i style="width:${v??0}%"></i></div></div>`).join('')}
function radar(rows){let n=rows.length,point=(v,i)=>[325+155*v/100*Math.sin(i*2*Math.PI/n),225-155*v/100*Math.cos(i*2*Math.PI/n)];let grid=[25,50,75,100].map(v=>`<polygon points="${rows.map((_,i)=>point(v,i).join(',')).join(' ')}" fill="none" stroke="#cbd7d0"/>`).join('');let labels=rows.map((r,i)=>{let [x,y]=point(126,i);return `<text x="${x}" y="${y}" text-anchor="middle" font-size="14" fill="#203b38">${esc(r.d)}</text>`}).join('');let paths=['a','b'].map((k,i)=>rows.some(r=>r[k]===null)?'':`<polygon points="${rows.map((r,j)=>point(r[k],j).join(',')).join(' ')}" stroke="${i?'#bd8052':'#367b82'}" fill="${i?'#bd8052':'#367b82'}" fill-opacity=".12" stroke-width="2"/>`).join('');return `<svg viewBox="0 0 650 450" role="img" aria-label="双人雷达图">${grid}${labels}${paths}</svg><p class="muted">A 蓝绿 · B 棕色；存在缺失维度的一方不绘制封闭雷达线，以免将缺失误当零分。</p>`}
function report(A,B,pre,demoMode){validate(A,B);if(pre)validateBaseline(A,pre);if(!canShare(A,B,pre,true))throw Error('共同反馈暂不可生成。请私下核查安全。');let a=A.answers,b=B.answers,rows=domains.map(d=>({d,a:domainScore(d,a),b:domainScore(d,b)}));let valid=rows.filter(r=>r.a!==null&&r.b!==null), priorities=valid.filter(r=>Math.min(r.a,r.b)<60||gap(r.a,r.b)>=25).sort((x,y)=>Math.min(x.a,x.b)-Math.min(y.a,y.b)||gap(y.a,y.b)-gap(x.a,x.b)).slice(0,3);let strengths=valid.filter(r=>Math.min(r.a,r.b)>=75);let h=`<div id="controls" class="no-print"><button onclick="window.print()">打印 / 保存 PDF</button></div><h2>伴侣关系综合评估报告</h2><p>${demoMode?'模拟数据 · 非真实夫妻':esc(A.code)} · ${esc(A.stage)} · ${esc(A.wave)} · V2.0</p><p class="warn">原创研究试点工具，尚未完成信效度验证，非诊断、非官方常模。分数为0–100线性转换，75/60/25为自定义讨论阈值。本报告含双方分数及部分题目级结果，仅供已同意的私下反馈。报告不含安全答案、开放题或个人压力及依恋原始答案。</p><h2>01 整体画像</h2><p>共同优势 ${strengths.length} 项；可配对分析 ${valid.length}/16 项；至少一方低于60分 ${valid.filter(r=>Math.min(r.a,r.b)<60).length} 项。</p>${radar(rows)}<table><tr><th>维度</th><th>A</th><th>B</th><th>差异</th><th>提示</th></tr>${rows.map(r=>`<tr><td>${r.d}</td><td>${fmt(r.a)}</td><td>${fmt(r.b)}</td><td>${fmt(gap(r.a,r.b))}</td><td>${flags(r.a,r.b).join('、')||'继续观察'}</td></tr>`).join('')}</table><h2>02 优势与优先成长领域</h2><p>共同优势：${strengths.map(r=>r.d).join('、')||'当前没有满足规则的维度'}。</p>${priorities.map((r,i)=>`<div class="detail"><h3>${i+1}. ${r.d}</h3><p>A ${fmt(r.a)}，B ${fmt(r.b)}，${flags(r.a,r.b).join('、')}。${Math.max(r.a,r.b)<60?'双方均报告困难，可核实是否愿意共同改善。':gap(r.a,r.b)>=25?'两人体验存在差异，需分别询问具体情境，不判断谁正确。':'至少一方报告困难，不宜以另一方较高评价抵消。'}</p><p>${advice[r.d]}</p></div>`).join('')||'<p>未识别规则触发的优先领域；由辅导员根据访谈确定。</p>'}<h2>03 分维度与子构念分析</h2>`;
for(let r of rows){let qs=core.filter(q=>q.domain===r.d);h+=`<div class="panel detail"><h3>${r.d}</h3>${bars(r.a,r.b)}<p>${flags(r.a,r.b).join('、')||'双方未触发预设提示'}</p><table><tr><th>子构念</th><th>A</th><th>B</th><th>差异</th></tr>${uniq(qs.map(q=>q.sub)).map(s=>{let g=qs.filter(q=>q.sub===s),x=score(g,a),y=score(g,b);return `<tr><td>${s}${g[0].pattern?'（高分=该模式较多）':''}</td><td>${fmt(x)}</td><td>${fmt(y)}</td><td>${fmt(gap(x,y))}</td></tr>`}).join('')}</table><p><strong>建议私下核实的题目：</strong></p>`;let items=qs.map(q=>{let x=val(q,a),y=val(q,b);if(q.pattern){x=x===null?null:100-x;y=y===null?null:100-y}return {q,x,y}}).filter(o=>o.x!==null&&o.y!==null&&(Math.min(o.x,o.y)<=25||gap(o.x,o.y)>=50)).sort((x,y)=>Math.min(x.x,x.y)-Math.min(y.x,y.y)).slice(0,3);h+=items.length?'<ul>'+items.map(o=>`<li>${o.q.id} ${esc(o.q.text)}（${o.q.pattern?'健康方向转换；':''}A ${fmt(o.x)} / B ${fmt(o.y)}）</li>`).join('')+'</ul>':'<p>无达到题目级提示规则的配对题。</p>';h+=`<p><strong>讨论建议：</strong>${advice[r.d]}</p></div>`}
h+='<h2>04 家庭系统画像</h2><p>连接、疏离、过度卷入、调整、僵化、混乱分别呈现；不使用正式 FACES IV 常模或家庭类型分类。总维度将不平衡模式反向转换。</p>';for(let d of ['家庭凝聚力','家庭灵活性'])for(let s of uniq(core.filter(q=>q.domain===d).map(q=>q.sub))){let qs=core.filter(q=>q.domain===d&&q.sub===s);h+=`<p>${s}（高分表示该模式报告较多）</p>${bars(score(qs,a),score(qs,b))}`}
h+='<h2>05 可选信仰模块</h2><p>仅评估双方信仰互动，不评价属灵成熟程度。</p>';let f=BANK.filter(q=>q.domain==='信仰');h+=bars(score(f,a),score(f,b));h+='<h2>06 八周成长计划</h2>';let chosen=priorities.length?priorities.map(r=>r.d):['沟通','共同活动','价值观与未来'];for(let i=0;i<3;i++){let d=chosen[i%chosen.length];h+=`<div class="detail"><h3>第${i*2+1}–${i*2+2}周 · ${d}</h3><p>${advice[d]}</p><p>每周分别记录练习次数、体验满意度（1–5）及是否愿意继续；在安全前提下与辅导员复盘。</p></div>`}h+='<h3>第7–8周 · 巩固与后测</h3><p>独立完成相同核心题目，核实变化与现实经历是否一致。</p>';if(pre){h+='<h2>07 前后测变化</h2><table><tr><th>维度</th><th>A变化</th><th>B变化</th></tr>'+rows.map(r=>{let x=domainScore(r.d,pre[0].answers),y=domainScore(r.d,pre[1].answers);return `<tr><td>${r.d}</td><td>${fmt(x===null||r.a===null?null:r.a-x)}</td><td>${fmt(y===null||r.b===null?null:r.b-y)}</td></tr>`}).join('')+'</table><p>变化为描述性差值，不代表统计显著性或干预因果效果。</p>'}h+='<h2>使用限制与隐私</h2><p>所有安全题回答“否”不代表已确认安全。安全结果不能被其他高分抵消。答案文件及打印 PDF 未加密，没有账号或访问权限控制；不得上传真实答卷或报告到 GitHub。浏览器历史、扩展、共享设备和打印队列可能留下痕迹。</p><p>每组需至少75%有效题；未作答、不适用和拒答不计入。家庭两维度须三个子构念均可评分。无综合健康分、离婚概率或诊断。报告由确定性规则生成，不能代替个别访谈或专业转介。</p>';$('report').innerHTML=h;show('report')}
function demo(){let make=role=>({version:'2.0',synthetic:true,code:'DEMO',role,stage:'已婚',wave:'后测',answers:Object.fromEntries(BANK.map((q,i)=>[q.id,q.domain==='安全'?'否':q.domain==='开放'?'':String(q.reverse?6-([ '沟通','冲突解决','角色与责任'].includes(q.domain)?(role==='A'?3:2):4):q.pattern?2:['沟通','冲突解决','角色与责任'].includes(q.domain)?(role==='A'?3:2):4)]))});report(make('A'),make('B'),null,true)}

for(const id of ['fa','fb','pa','pb'])$(id).onchange=()=>{$('report').innerHTML='';$('report').hidden=true;$('error').hidden=true};
