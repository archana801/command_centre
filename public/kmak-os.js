function go(id, btn){
  document.querySelectorAll('.sec').forEach(s=>s.classList.remove('on'));
  document.getElementById('sec-'+id).classList.add('on');
  document.querySelectorAll('.sb').forEach(b=>b.classList.remove('on'));
  if(btn) btn.classList.add('on');
  else { const b=document.querySelector('.sb[data-s="'+id+'"]'); if(b) b.classList.add('on'); }
  window.scrollTo({top:0,behavior:'instant'});
}

const ROLE_HOME = {owner:'overview', coo:'overview', coach:'myperf', setter:'convert'};
const ROLE_DESC = {
  owner:'Full access — every pillar, the valuation, finances and the AI partner.',
  coo:'Operational access — every pillar and the AI partner, no valuation.',
  coach:'Your caseload, your performance, Care, Delight and the AI partner.',
  setter:'Convert, plus your own performance page.'
};
function setRole(r){
  document.body.dataset.role = r;
  document.querySelectorAll('#roleSeg button').forEach(b=>b.classList.toggle('on', b.dataset.r===r));
  document.querySelector('.rname').textContent = r.charAt(0).toUpperCase()+r.slice(1);
  document.querySelector('.rdesc').textContent = ROLE_DESC[r];
  document.querySelector('.rchip').textContent = r;
  go(ROLE_HOME[r]);
}
document.querySelectorAll('#roleSeg button').forEach(b=>{
  b.addEventListener('click', ()=>setRole(b.dataset.r));
});

function fmtK(n){return n>=1000?'£'+(n/1000).toFixed(1).replace('.0','')+'k':'£'+n}

function barLineChart(el, data, beLine, targetLine, h){
  h = h || 150;
  const w = 100, n = data.length, bw = w/n*0.6, gap = w/n;
  const max = Math.max(...data, beLine, targetLine)*1.12;
  const y = v => h - (v/max)*h;
  let bars = data.map((v,i)=>{
    const x = i*gap + (gap-bw)/2;
    const col = v < beLine ? 'var(--red)' : 'var(--brand2)';
    return `<rect x="${x}" y="${y(v)}" width="${bw}" height="${h-y(v)}" rx="1.2" fill="${col}" opacity="0.9"/>`;
  }).join('');
  let beY = y(beLine), tgY = y(targetLine);
  el.innerHTML = `<svg viewBox="0 0 ${w} ${h+14}" style="width:100%;height:${h+14}px">
    <line x1="0" y1="${beY}" x2="${w}" y2="${beY}" stroke="var(--red)" stroke-width="0.6" stroke-dasharray="1.5,1.2"/>
    <line x1="0" y1="${tgY}" x2="${w}" y2="${tgY}" stroke="var(--muted)" stroke-width="0.6" stroke-dasharray="1.5,1.2"/>
    ${bars}
  </svg>`;
}
function lineChart(el, data, h, color, unit){
  h = h || 100;
  const w = 100, n = data.length;
  const max = Math.max(...data)*1.08, min = Math.min(...data)*0.92;
  const x = i => i*(w/(n-1));
  const y = v => h - ((v-min)/(max-min))*h;
  const pts = data.map((v,i)=>`${x(i)},${y(v)}`).join(' ');
  const area = `0,${h} `+pts+` ${w},${h}`;
  el.innerHTML = `<svg viewBox="0 0 ${w} ${h+6}" style="width:100%;height:${h+6}px">
    <polygon points="${area}" fill="url(#g1)" opacity="0.25"/>
    <polyline points="${pts}" fill="none" stroke="${color}" stroke-width="1.4" stroke-linejoin="round" stroke-linecap="round"/>
    <defs><linearGradient id="g1" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stop-color="${color}"/><stop offset="100%" stop-color="${color}" stop-opacity="0"/></linearGradient></defs>
  </svg>`;
}

barLineChart(document.getElementById('prodChart'), [1980,2340,2010,3120,2890,1760,2450,3310,2980,2650,3450,3120,2790,3410], 2180, 3600, 150);
lineChart(document.getElementById('valChart'), [352,358,361,367,372,379,384,391,396,401,403,412], 90, '#e00808');

function money(n){return '£'+Math.round(n).toLocaleString('en-GB')}
function refreshVal(){
  const mult = document.getElementById('multSlider').value/10;
  const base = 142000;
  const val = Math.round(base*mult);
  document.getElementById('valBig').textContent = money(val);
  document.getElementById('multLbl').textContent = mult.toFixed(1)+'×';
  const lo = Math.round(val*0.87), hi = Math.round(val*1.20);
  document.getElementById('valRange').textContent = `Range ${money(lo)} – ${money(hi)} at ${(mult-0.3).toFixed(1)}–${(mult+0.6).toFixed(1)}×`;
  document.getElementById('tickerVal').textContent = fmtK(val);
}
document.getElementById('multSlider').addEventListener('input', refreshVal);
document.querySelectorAll('#segType button').forEach(b=>b.addEventListener('click', ()=>{
  document.querySelectorAll('#segType button').forEach(x=>x.classList.remove('on'));
  b.classList.add('on');
  document.getElementById('multSlider').value = b.dataset.m;
  refreshVal();
}));

const AI_REPLIES = {
  default: "Based on this week's synced figures: Meta CPL rose because the transformation-story ad set has been running unchanged for 18 days — frequency is above 3.4, which usually means creative fatigue. Rotating in two fresh creatives typically resets CPL within 5–7 days.",
};
document.getElementById('aiSend').addEventListener('click', ()=>{
  const inp = document.getElementById('aiInput');
  const v = inp.value.trim();
  if(!v) return;
  const log = document.getElementById('aiLog');
  log.innerHTML += `<div class="m u">${v}</div>`;
  inp.value = '';
  setTimeout(()=>{
    log.innerHTML += `<div class="m a">${AI_REPLIES.default}</div>`;
    log.scrollIntoView({block:'end'});
  }, 500);
});
document.getElementById('aiInput').addEventListener('keydown', e=>{ if(e.key==='Enter') document.getElementById('aiSend').click(); });

function recalcPay(){
  let grand = 0;
  document.querySelectorAll('#payTable tbody tr').forEach(tr=>{
    const inputs = tr.querySelectorAll('.fin');
    const base = parseFloat(inputs[0].value)||0;
    const rate = parseFloat(inputs[1].value)||0;
    const clients = parseFloat(inputs[2].value)||0;
    const transBonus = parseFloat(inputs[3].value)||0;
    const transCount = parseFloat(inputs[4].value)||0;
    const upsellBonus = parseFloat(inputs[5].value)||0;
    const upsellCount = parseFloat(inputs[6].value)||0;
    const total = base + rate*clients + transBonus*transCount + upsellBonus*upsellCount;
    tr.querySelector('.tot').textContent = money(total);
    grand += total;
  });
  document.getElementById('payTotal').textContent = money(grand);
}
document.querySelectorAll('#payTable .fin').forEach(inp=>inp.addEventListener('input', recalcPay));
recalcPay();

(function(){
  const flagRow = document.getElementById('flagRow');
  const GENDATE = 'Jul 2026';
  const SOPS = {
    be:{c:'var(--red)',flag:'Coach 4 below break-even 14 days running',id:'SOP-FIN-004',title:'Bringing a coach back above break-even',
      purpose:'Diagnose and correct a coach running below the per-coach break-even revenue threshold.',
      scope:'Any coach whose 14-day average revenue falls below the current break-even figure.',
      owner:"COO · coach's direct lead",
      trigger:'Rolling 14-day average revenue per coach below break-even (currently £2,180/month).',
      steps:["Pull the coach's caseload — check ratio of active clients to capacity.",
        'Check whether the gap is volume (too few clients) or mix (too many low-tier packages).',
        'If volume: route the next 2–3 qualified leads to this coach ahead of the rota.',
        'If mix: review upsell conversations at renewal for underpriced clients.',
        'Agree a 2-week target with the coach and a specific number of client conversations to have.',
        'Re-check the 14-day average at the next finance sync.'],
      measure:'Revenue per coach back above break-even within 2 weeks',review:'Weekly until resolved'},
    hyg:{c:'var(--amb)',flag:'2 clients silent on check-ins 6+ days',id:'SOP-CARE-006',title:'Recovering a silent client before it becomes churn',
      purpose:'Re-engage a client who has stopped responding to check-ins before it becomes a renewal or churn problem.',
      scope:'Any client with no check-in response for 5+ consecutive days.',
      owner:'Assigned coach · COO (if unresolved after 3 days)',
      trigger:'Pulse IO flags 5+ days without a client response.',
      steps:['Send a warm, no-pressure WhatsApp check-in — acknowledge the gap without guilt-tripping.',
        'If no reply in 24 hours, try a different channel (call or voice note).',
        'Ask directly whether something has changed — life, motivation, or the programme itself.',
        'Offer a quick win: a lighter check-in format or a call instead of written logging.',
        'Log the outcome and flag to COO if unresolved after 3 days.',
        'If renewal falls within this window, do not let it lapse silently — always confirm intent directly.'],
      measure:'Client re-engaged (responds or confirms status) within 3 days',review:'Daily while flagged'},
    cpl:{c:'var(--amb)',flag:'Meta cost-per-lead +19%',id:'SOP-MKT-009',title:'Responding to a rising cost-per-lead',
      purpose:'Diagnose and correct a rising paid cost-per-lead before it erodes lead volume and CAC.',
      scope:'Any active paid campaign whose CPL rises more than 15% week-on-week with stable booked-consult rate.',
      owner:'Marketing lead · COO (budget sign-off)',
      trigger:'CPL up more than 15% week-on-week with ad frequency above 3.5 (a creative-fatigue pattern).',
      steps:['Confirm booked-consult rate is steady — if it is, the problem is the ad, not the funnel.',
        'Check ad frequency; above roughly 3.5 the audience is seeing the same creative too often.',
        'Rotate in two fresh creatives (new hook, new transformation story) and pause the fatigued set.',
        'Refresh or widen the audience to reduce overlap.',
        'Hold budget flat for 5–7 days and re-measure CPL against the trailing average.',
        'Check the lead-to-signed match rate so spend is judged on signed clients, not clicks.'],
      measure:'CPL back within 10% of the trailing average within 2 weeks',review:'Weekly for the duration of the campaign'},
    churn:{c:'var(--blue)',flag:'3 clients flagged high churn risk',id:'SOP-DEL-005',title:'Working a high churn-risk client list',
      purpose:'Give every high churn-risk client a direct, timely intervention before their renewal date passes.',
      scope:'Any client flagged high or watch risk on the churn risk list.',
      owner:'Assigned coach · COO (high-risk cases)',
      trigger:'Pulse IO adherence drop, renewal within 7 days with no outreach, or an explicit pause/cancel request.',
      steps:['Review the churn risk list daily and confirm each client still has a named next action.',
        'For high risk: coach reaches out personally within 24 hours, not an automated message.',
        'For a pause request, apply the standard pause policy rather than an ad-hoc discount.',
        'Understand the real reason (results, price, life circumstance) before offering a fix.',
        'Log the outcome and update the risk status.',
        "Escalate to COO if the client hasn't responded within 3 days of the first outreach."],
      measure:'Every high-risk client contacted within 24 hours; risk list reviewed daily',review:'Weekly retention huddle'},
    coll:{c:'var(--red)',flag:'Billed-to-collected gap £3.8k',id:'SOP-FIN-007',title:'Reducing the billed-to-collected gap',
      purpose:'Shrink the gap between revenue billed and cash actually collected by tightening payment recovery and discount discipline.',
      scope:'Applies in any month where collections fall below 95% of billed revenue.',
      owner:'COO · coaches (client conversations)',
      trigger:'Collections below 95% of billed, or failed-payment rate rising.',
      steps:['Split the gap into its parts — failed payments, refunds/pauses, and discounts. Each has a different fix.',
        'For failed payments, trigger Stripe\'s dunning sequence and a personal WhatsApp follow-up within 48 hours.',
        'For pause requests, apply a clear pause policy rather than an ad-hoc discount.',
        'Review discounts given this month for patterns (a specific coach, offer, or renewal conversation gap).',
        'Set a monthly collection target and report collected-vs-billed on this dashboard.',
        'Fix the root cause for any recurring pattern rather than just chasing the individual case.'],
      measure:'Collections ≥ 97% of billed within 2 months',review:'Monthly'},
    calls:{c:'var(--live)',flag:'6 high-intent DMs uncontacted',id:'SOP-CNV-011',title:'Same-day recovery of missed high-intent DMs',
      purpose:'Ensure every high-intent new-lead DM gets a same-day reply, before they book with someone else.',
      scope:'Any inbound DM or enquiry flagged high-intent (asked about pricing, availability, or booking) left unanswered 4+ hours.',
      owner:'Setter team · setter lead (accountability)',
      trigger:'Groundhogg flags an unanswered high-intent lead message.',
      steps:['Check the high-intent unanswered list at 11:00 and 16:00 every day, assigned to a named setter.',
        'Reply to every high-intent miss within two working hours; keep it warm and specific, not templated.',
        'Log the outcome (booked, follow-up needed, not interested) so nothing sits open.',
        "Offer a specific consult time rather than 'whenever suits you' to reduce drop-off.",
        'Where volume is causing the misses, review setter cover at peak DM times.',
        'Report the missed-to-booked recovery rate weekly.'],
      measure:'100% of high-intent misses contacted same day; recovery rate reported weekly',review:'Weekly'}
  };
  const ORDER=['be','hyg','cpl','churn','coll','calls'];
  flagRow.innerHTML=ORDER.map((k,i)=>`<div class="flagchip" data-k="${k}"><span class="fp" style="background:rgba(255,255,255,.06);color:${SOPS[k].c}">${i+1}</span>${SOPS[k].flag}</div>`).join('');

  function render(s){
    const meta=[['Purpose',s.purpose],['Scope',s.scope],['Owner / responsibility',s.owner],['Trigger',s.trigger]];
    return `<div class="sopdoc">
      <div class="sh"><div class="av">📋</div><div><h4>${s.title}</h4><div class="sid">${s.id} · drafted ${GENDATE} · v1 · awaiting approval</div></div></div>
      <div class="sopbody">
        <div class="sopmeta">${meta.map(m=>`<div class="m"><div class="l">${m[0]}</div><div class="v">${m[1]}</div></div>`).join('')}</div>
        <div class="sopblk"><div class="bt">Procedure</div><ol class="sopsteps">${s.steps.map(x=>`<li>${x}</li>`).join('')}</ol></div>
      </div>
      <div class="sopfoot">
        <button>Assign owner</button><button>Export PDF</button><button>Save to library</button>
        <span class="measure">◎ ${s.measure} · review ${s.review}</span>
      </div>
    </div>`;
  }
  function generate(s){
    const w=document.getElementById('sopWrap');
    w.innerHTML=`<div class="sopdoc"><div class="gen-anim"><span class="sp"></span>AI coaching partner is drafting the procedure…</div></div>`;
    setTimeout(()=>{ w.innerHTML=render(s); }, 820);
  }
  function customSOP(t){
    const title=t.charAt(0).toUpperCase()+t.slice(1);
    return {id:'SOP-GEN-'+Math.floor(100+Math.random()*899),title:title.length>64?title.slice(0,64)+'…':title,
      purpose:'Establish a consistent, documented way for the team to handle: '+t+'.',
      scope:'All relevant team members, whenever this situation arises.',
      owner:'COO (lead) · relevant team members',
      trigger:'Whenever the dashboard or the team identifies: '+t+'.',
      steps:['Confirm and quantify the issue against the relevant dashboard metric.',
        'Identify the most likely cause from the data before acting.',
        'Agree the corrective action with the responsible team member.',
        'Assign a named owner and a clear deadline.',
        'Set a measurable target and a checkpoint date.',
        'Record the outcome and file this SOP.'],
      measure:'Issue resolved and the related metric back within target',review:'Set at first checkpoint'};
  }
  flagRow.querySelectorAll('.flagchip').forEach(ch=>ch.addEventListener('click',()=>{
    flagRow.querySelectorAll('.flagchip').forEach(x=>x.classList.remove('on'));
    ch.classList.add('on');
    document.getElementById('sopInput').value='';
    generate(SOPS[ch.dataset.k]);
  }));
  document.getElementById('sopGen').addEventListener('click',()=>{
    const v=document.getElementById('sopInput').value.trim();
    if(v){ flagRow.querySelectorAll('.flagchip').forEach(x=>x.classList.remove('on')); generate(customSOP(v)); return; }
    const active=flagRow.querySelector('.flagchip.on');
    generate(active?SOPS[active.dataset.k]:SOPS.be);
  });
  document.getElementById('sopInput').addEventListener('keydown',e=>{if(e.key==='Enter')document.getElementById('sopGen').click();});
})();
