import { api, esc, money, dialog } from '../../shared/feature-ui.js';
const names={dashboard:'数据统计与决策',forecast:'实时动态供需预测',safety:'食品安全管控',supplier:'供应商协同',inventory:'库存与批次',procurement:'采购履约管理'};
const card=(title,body,subtitle='')=>'<section class="zx-card demo-chart-card"><header><h3>'+title+'</h3><p>'+subtitle+'</p></header>'+body+'</section>';
const number=value=>Number(value||0).toLocaleString('zh-CN');
function lineChart(rows,keys,labels,unit='') {
  if(!rows.length)return '<p class="demo-empty">当前筛选范围内暂无记录</p>';
  const colors=['#2258a6','#edaa49','#77aaa1'];
  const max=Math.max(1,...rows.flatMap(r=>keys.map(k=>Number(r[k])||0)))*1.12;
  const x=i=>52+i*600/Math.max(1,rows.length-1), y=v=>208-Number(v||0)/max*168;
  const paths=keys.map((key,k)=>'<path d="'+rows.map((r,i)=>(i?'L':'M')+x(i).toFixed(1)+','+y(r[key]).toFixed(1)).join(' ')+'" fill="none" stroke="'+colors[k]+'" stroke-width="3" stroke-linejoin="round"/>').join('');
  const grid=[0,1,2,3,4].map(i=>{const value=max*i/4,yy=y(value);return '<line x1="52" x2="652" y1="'+yy+'" y2="'+yy+'" stroke="#e5ebf2"/><text x="44" y="'+(yy+4)+'" text-anchor="end">'+Math.round(value)+'</text>';}).join('');
  const indexes=[...new Set([0,Math.floor(rows.length/3),Math.floor(rows.length*2/3),rows.length-1])];
  const ticks=indexes.map(i=>'<text x="'+x(i)+'" y="236" text-anchor="middle">'+esc(rows[i].label||rows[i].day?.slice(5)||'')+'</text>').join('');
  return '<div class="demo-legend">'+labels.map((label,i)=>'<span><i style="background:'+colors[i]+'"></i>'+label+'</span>').join('')+'<span>'+unit+'</span></div><svg class="demo-line-chart" viewBox="0 0 700 252" role="img" aria-label="'+esc(labels.join('与')+'趋势')+'">'+grid+paths+ticks+'</svg>';
}
function heatmap(data) {
  return '<div class="demo-heatmaps">'+data.traffic.map(r=>'<button class="demo-floor" data-detail="traffic" data-id="'+r.id+'"><span class="demo-floor-heading"><strong>'+esc(r.name)+'</strong><em>'+r.occupancy+'/'+r.capacity+'人在厅</em></span><svg viewBox="0 0 300 160" role="img" aria-label="'+esc(r.name)+'人流热力图"><rect x="4" y="4" width="292" height="150" rx="16" fill="#eff4f9"/><path d="M150 12V145M12 80H288" stroke="#fff" stroke-width="10"/>'+r.zones.map((z,i)=>{const x=i%2?224:77,y=i<2?43:118;const color=z.people>32?'#eb9855':z.people>18?'#e9c66d':'#74b9ae';return '<circle class="demo-heat-pulse" cx="'+x+'" cy="'+y+'" r="'+(17+z.people*.55)+'" fill="'+color+'" opacity=".45"/><circle cx="'+x+'" cy="'+y+'" r="15" fill="'+color+'"/><text x="'+x+'" y="'+(y+4)+'" text-anchor="middle">'+z.people+'</text><text x="'+x+'" y="'+(y+28)+'" text-anchor="middle">'+z.name+'</text>';}).join('')+'</svg><span>'+esc(r.campus)+' · 排队 '+r.queue+' 人 · 到达速率 '+r.visits+' 人/小时</span></button>').join('')+'</div><p class="zx-source">人数较多的区域以暖色显示 · 点击食堂查看各区域人数</p>';
}
function matrix(data) {
  return '<div class="zx-table-scroll"><table class="demo-matrix"><thead><tr><th>食堂 / 餐次</th><th>早餐</th><th>午餐</th><th>晚餐</th></tr></thead><tbody>'+data.traffic.map(r=>'<tr><th>'+esc(r.name)+'</th>'+data.matrix.filter(x=>x.restaurantId===r.id).map((cell)=>'<td><button class="'+(cell.gap<0?'shortage':cell.gap>45?'surplus':'balanced')+'" data-detail="matrix" data-id="'+cell.restaurantId+'" data-meal="'+cell.meal+'"><strong>'+cell.supply+' / '+cell.demand+'</strong><span>'+(cell.gap<0?'缺口 '+(-cell.gap):'余量 '+cell.gap)+' 份</span></button></td>').join('')+'</tr>').join('')+'</tbody></table></div><p class="zx-source">每格：可用供给 / 预测需求 · 橙色提示缺口 · 点击查看备餐建议</p>';
}
function supplierChart(data) {
  return '<div class="demo-suppliers">'+data.suppliers.map((s,i)=>'<button data-detail="supplier" data-id="'+i+'"><span><strong>'+esc(s.name)+'</strong><em>'+s.ontime+'%</em></span><i class="demo-bar"><b style="width:'+s.ontime+'%"></b></i><small>'+s.deliveries+' 次交付 · 采购额 '+money(s.cost)+'</small></button>').join('')+'</div>';
}
function safetyPanel(data) {
  const s=data.safety;
  return '<div class="demo-safety-overview"><div class="demo-gauge" style="--value:'+s.rate+'"><span><b>'+s.rate+'%</b><small>检查合格率</small></span></div><div><h3>'+number(s.checks)+' 项检查</h3><p>合格 '+number(s.passed)+' 项 · 待复核 '+s.open+' 项</p><p class="zx-source">检查结果与食品安全台账一致</p></div></div><div class="demo-temperature">'+s.temperatures.map(r=>'<div><span>'+esc(r.name)+'</span><strong>'+r.value+'°C</strong><small>冷藏监测 · 0–8°C</small></div>').join('')+'</div>';
}
export async function renderDemo(root,module,context,renderLedger) {
  let disposed=false, timer, latest;
  root.innerHTML='<div class="demo-heading"><div><span class="demo-eyebrow">演示数据 · 运营工作台</span><h2>'+names[module]+'</h2></div><div class="demo-live"><i></i><span id="demo-clock-label">正在加载</span></div></div><div class="demo-controls zx-row"><span>场景</span>'+[['breakfast','早餐'],['lunch','午餐高峰'],['dinner','晚餐'],['quiet','非高峰']].map(([id,label])=>'<button class="zx-button" data-scene="'+id+'">'+label+'</button>').join('')+'<button class="zx-button" id="demo-pause" aria-pressed="false">暂停推进</button><span class="zx-source">每秒推进 1 分钟</span></div><div id="demo-error" role="status"></div><div id="demo-viz"></div><div id="demo-ledger"></div>';
  const target=root.querySelector('#demo-viz'),error=root.querySelector('#demo-error');
  const draw=data=>{
    latest=data;
    root.querySelector('#demo-clock-label').textContent='场景时钟 '+data.clock.label;
    const pause=root.querySelector('#demo-pause');pause.textContent=data.clock.playing?'暂停推进':'继续推进';pause.setAttribute('aria-pressed',String(!data.clock.playing));
    const metrics=[['区间成交订单',number(data.summary.orders)+' 单'],['区间营业额',money(data.summary.revenue)],['区间供餐份数',number(data.summary.portions)+' 份'],['当前在厅人数',number(data.summary.occupancy)+' 人']];
    let html='<div class="demo-kpis">'+metrics.map(([label,value],i)=>'<article style="--kpi-color:'+['#3b73ce','#6bc371','#f49d42','#83b8ae'][i]+'"><span>'+label+'</span><strong>'+value+'</strong><small>'+esc(i===3?'随场景更新':data.from+' 至 '+data.to)+'</small></article>').join('')+'</div>';
    if(module==='dashboard'||module==='forecast') {
      html+='<div class="demo-two-columns">'+card('动态人流量热点图',heatmap(data),'2 个校区 · 4 座食堂 · 分区热度')+card('供需矩阵',matrix(data),'按餐次查看备餐覆盖情况')+'</div>';
      html+='<div class="demo-two-columns">'+card('分时客流与需求预测',lineChart(data.forecast,['baseline','demand','upper'],['历史基线','需求预测','预测上界'],'人 / 小时'),data.method)+card('运营趋势',lineChart(data.trend,['revenue'],['营业额'],'元'),'连续运营记录 · 随顶部日期筛选')+'</div>';
      if(module==='forecast') html+=card('备餐决策建议','<div class="demo-records">'+data.matrix.filter(r=>r.gap<0).map(r=>'<button data-detail="matrix" data-id="'+r.restaurantId+'" data-meal="'+r.meal+'"><strong>'+esc(r.restaurant)+' · '+r.meal+'</strong><span>预计需求 '+r.demand+' 份，可用供给 '+r.supply+' 份</span><em>建议补充 '+(-r.gap)+' 份，分批备餐</em></button>').join('')+'</div>'+(data.summary.shortage?'':'<p>当前供给可覆盖预测需求。</p>'));
      html+='<div class="demo-two-columns">'+card('食品安全概览',safetyPanel(data))+card('供应商准时交付率',supplierChart(data))+'</div>';
    } else if(module==='safety') {
      html+='<div class="demo-two-columns">'+card('食品安全闭环',safetyPanel(data))+card('检查合格率趋势',lineChart(data.safety.trend,['rate'],['合格率'],'%'))+'</div>';
      html+=card('检查与整改跟进','<div class="demo-records">'+data.safety.records.slice(0,8).map((r,i)=>'<button data-detail="safety" data-id="'+i+'"><strong>'+esc(r.title)+'</strong><span>'+r.payload.passed+'/'+r.payload.checkpoints+' 项合格</span><em>'+esc(r.status)+'</em></button>').join('')+'</div>');
    } else {
      html+='<div class="demo-two-columns">'+card('供应商准时交付率',supplierChart(data))+card('供需与采购协同',matrix(data))+'</div>';
      html+=card('库存批次与临期关注','<div class="demo-records">'+data.inventory.map((r,i)=>'<button data-detail="inventory" data-id="'+i+'"><strong>'+esc(r.title)+'</strong><span>'+r.payload.quantity+' · '+esc(r.payload.batch)+'</span><em>'+esc(r.status)+'</em></button>').join('')+'</div>');
    }
    target.innerHTML=html+'<p class="zx-source">演示数据 · 180 天运营记录 · 本次更新 '+new Date(data.updatedAt).toLocaleTimeString('zh-CN',{hour12:false,timeZone:'Asia/Shanghai'})+'</p>';
  };
  const refresh=async()=>{
    try{const response=await api('/demo/insights?'+new URLSearchParams(context));if(!disposed&&root.isConnected){draw(response.data);error.textContent='';}}
    catch(e){if(!disposed)error.textContent=e.message;}
  };
  root.querySelector('.demo-controls').onclick=async event=>{
    const button=event.target.closest('button');if(!button)return;
    button.disabled=true;
    try{await api('/demo/clock',{method:'POST',body:button.dataset.scene?{scene:button.dataset.scene,playing:true}:{playing:!latest?.clock.playing}});await refresh();}catch(e){error.textContent=e.message;}finally{button.disabled=false;}
  };
  target.onclick=event=>{
    const button=event.target.closest('[data-detail]');if(!button||!latest)return;
    let title,fields;
    if(button.dataset.detail==='traffic') {const r=latest.traffic.find(r=>r.id===Number(button.dataset.id));title=r.name+' · 分区人流';fields=[['在厅人数',r.occupancy+' / '+r.capacity],['排队人数',r.queue],...r.zones.map(z=>[z.name,z.people+' 人'])];}
    if(button.dataset.detail==='matrix') {const r=latest.matrix.find(r=>r.restaurantId===Number(button.dataset.id)&&r.meal===button.dataset.meal);title=r.restaurant+' · '+r.meal;fields=[['可用供给',r.supply+' 份'],['预测需求',r.demand+' 份'],['建议',r.gap<0?'补充备餐 '+(-r.gap)+' 份':'结合销量分批备餐，当前余量 '+r.gap+' 份'],['说明','需求依据所选区间历史销量与当前场景计算']];}
    if(button.dataset.detail==='supplier'){const r=latest.suppliers[Number(button.dataset.id)];title=r.name;fields=[['交付次数',r.deliveries],['准时交付率',r.ontime+'%'],['采购额',money(r.cost)],['资质',r.qualification],['有效期',r.expiresAt]];}
    if(['safety','inventory'].includes(button.dataset.detail)){const r=(button.dataset.detail==='safety'?latest.safety.records:latest.inventory)[Number(button.dataset.id)];title=r.title;const p=r.payload;fields=[['状态',r.status],['负责人',p.owner],['批次',p.batch||'—'],['供应商',p.supplier||'—'],['说明',p.description],['跟进',p.followUp||'—'],['有效期',p.expiresAt||'—']];}
    if(fields)dialog(title,'<p class="zx-source">演示数据</p><dl class="demo-detail">'+fields.map(([label,value])=>'<div><dt>'+esc(label)+'</dt><dd>'+esc(value)+'</dd></div>').join('')+'</dl>');
  };
  await refresh();
  if(renderLedger&&!disposed) await renderLedger(root.querySelector('#demo-ledger'));
  timer=setInterval(()=>{if(!disposed&&root.isConnected&&!document.hidden)refresh();},5000);
  return ()=>{disposed=true;clearInterval(timer);};
}
