// recommender.js
// Lightweight static JS app for the MVP. Stores session & feedback in localStorage.

const state = {
  profile: null,
  tools: [],
  weights: [0.6,0.5,0.4,0.3,0.2],
  dragIdx: null,
  cx: 220, cy:220, minR:30, maxR:150,
  labels: ['Startup Stage','Function / Use Case','Integration Effort','Budget Sensitivity','Data & Compliance']
};

// replace the existing loadTools() function with this one
async function loadTools(){
  try {
    const res = await fetch('data/tools.json');
    if (!res.ok) throw new Error('tools.json fetch not ok: ' + res.status);
    state.tools = await res.json();
    if (!Array.isArray(state.tools) || state.tools.length === 0) throw new Error('tools.json empty');
  } catch (err) {
    console.warn('Could not load data/tools.json — falling back to embedded list. Error:', err);
    // fallback small tool list (safe demo data)
    state.tools = [
      {"tool_id":"chatgpt","name":"ChatGPT (OpenAI)","url":"https://chat.openai.com/","primary_function":["General AI Assistant","Content"],"complexity":"low","cost_category":"freemium","scalability":"high","impact":"high","compliance":[],"description":"General-purpose LLM assistant for research, content, and prototyping.","tags":["llm","assistant","content"]},
      {"tool_id":"notion","name":"Notion AI","url":"https://www.notion.so/product/ai","primary_function":["Operations","Knowledge Management"],"complexity":"low","cost_category":"freemium","scalability":"medium","impact":"medium","compliance":["GDPR"],"description":"Knowledge-base and productivity platform with AI features.","tags":["docs","kb","ops"]},
      {"tool_id":"hubspot","name":"HubSpot","url":"https://www.hubspot.com/","primary_function":["Marketing","Sales"],"complexity":"medium","cost_category":"subscription","scalability":"high","impact":"high","compliance":["GDPR"],"description":"CRM and marketing automation with predictive features.","tags":["crm","marketing","sales"]}
    ];
  }
}


function $(id){ return document.getElementById(id); }
function showView(id){
  document.querySelectorAll('.view').forEach(v=> v.classList.add('hidden'));
  const el = $(id);
  if(el) el.classList.remove('hidden');
  // update nav buttons visibility
  const profile = JSON.parse(localStorage.getItem('profile')||'null');
  document.getElementById('nav-login').style.display = profile ? 'none':'inline-block';
}

function saveProfile(p){
  localStorage.setItem('profile', JSON.stringify(p));
  state.profile = p;
  updateHome();
}

function updateHome(){
  const p = state.profile || JSON.parse(localStorage.getItem('profile')||'null');
  if(!p) return;
  $('home-welcome').innerText = `Welcome, ${p.name}`;
  $('home-company').innerText = p.company||'—';
  $('home-points').innerText = p.points || 0;
}

function initNav(){
  document.getElementById('nav-login').onclick = ()=> showView('view-login');
  document.getElementById('nav-home').onclick = ()=> { updateHome(); showView('view-home'); };
  document.getElementById('nav-tools').onclick = ()=> { renderTools(); showView('view-tools'); };
  document.getElementById('nav-select').onclick = ()=> { drawRadial(); showView('view-select'); };
  document.getElementById('nav-vendor').onclick = ()=> { renderFeedback(); showView('view-vendor'); };
  $('cta-select').onclick = ()=> { drawRadial(); showView('view-select'); };
  $('cta-tools').onclick = ()=> { renderTools(); showView('view-tools'); };
}

function initLogin(){
  const form = $('login-form');
  form.onsubmit = (e)=>{
    e.preventDefault();
    const name = $('input-name').value.trim();
    if(!name) return alert('Enter your name');
    const company = $('input-company').value.trim();
    const role = document.querySelector('input[name="role"]:checked').value;
    const profile = { id: 'user-'+Date.now(), name, company, role, points:0 };
    saveProfile(profile);
    showView('view-home');
  };
}

function renderTools(){
  const wrap = $('tools-list');
  wrap.innerHTML = '';
  state.tools.forEach(t=>{
    const div = document.createElement('div'); div.className='result-card';
    const left = document.createElement('div'); left.style.flex='1';
    left.innerHTML = `<div style="font-weight:700">${t.name}</div>
      <div class="small">${t.description}</div>
      <div class="small">Function: ${t.primary_function.join(', ')} • Complexity: ${t.complexity} • Cost: ${t.cost_category}</div>`;
    const right = document.createElement('div');
    right.innerHTML = `<a class="tool-link" href="${t.url}" target="_blank" rel="noopener">Open site</a>`;
    div.appendChild(left); div.appendChild(right);
    wrap.appendChild(div);
  });
}

// --- Radial drawing & interaction (vanilla JS) - STABLE REPLACEMENT
function drawRadial(){
  const svg = $('radial-svg');
  if (!svg) return;

  const { cx, cy, minR, maxR, labels } = state;

  // helper funcs
  const angleFor = (i)=> (Math.PI*2)*(i/5) - Math.PI/2;
  const pointFor = (i,w)=>{
    const a = angleFor(i); const r = minR + (maxR-minR)*w;
    return { x: cx + r*Math.cos(a), y: cy + r*Math.sin(a) };
  };

  // clear previous pointer handlers to avoid duplicates
  svg.onpointermove = null;
  window.onpointerup = null;

  // single update function that rebuilds the visual (no duplicates)
  function updateVisual(){
    // clear children cleanly
    while (svg.firstChild) svg.removeChild(svg.firstChild);

    // background circle
    const bg = document.createElementNS('http://www.w3.org/2000/svg','circle');
    bg.setAttribute('cx',cx); bg.setAttribute('cy',cy); bg.setAttribute('r', maxR+8);
    bg.setAttribute('fill','#f8fafc'); svg.appendChild(bg);

    // polygon
    const poly = document.createElementNS('http://www.w3.org/2000/svg','polygon');
    poly.setAttribute('fill','#eef2ff'); poly.setAttribute('stroke','#4f46e5'); poly.setAttribute('stroke-width','2');
    const pts = state.weights.map((w,i)=> {
      const p = pointFor(i,w); return `${p.x},${p.y}`;
    }).join(' ');
    poly.setAttribute('points', pts);
    svg.appendChild(poly);

    // add handles and labels
    state.weights.forEach((w,i)=>{
      const p = pointFor(i,w);

      // handle circle
      const handle = document.createElementNS('http://www.w3.org/2000/svg','circle');
      handle.setAttribute('cx', p.x); handle.setAttribute('cy', p.y); handle.setAttribute('r', 11);
      handle.setAttribute('fill','#fff'); handle.setAttribute('stroke','#4f46e5'); handle.setAttribute('stroke-width','2');
      handle.style.cursor='grab';
      handle.dataset.idx = i;
      svg.appendChild(handle);

      // label (above)
      const lp = pointFor(i, Math.min(1,w+0.16));
      const label = document.createElementNS('http://www.w3.org/2000/svg','text');
      label.setAttribute('x', lp.x); label.setAttribute('y', lp.y); label.setAttribute('font-size','12'); label.setAttribute('text-anchor','middle');
      label.textContent = labels[i];
      svg.appendChild(label);

      // value text
      const vt = document.createElementNS('http://www.w3.org/2000/svg','text');
      vt.setAttribute('x', p.x); vt.setAttribute('y', p.y + 24); vt.setAttribute('font-size','11'); vt.setAttribute('text-anchor','middle');
      vt.setAttribute('fill','#4b5563'); vt.textContent = w.toFixed(2);
      svg.appendChild(vt);

      // pointerdown assigned once per handle -> set drag index
      handle.addEventListener('pointerdown', function(ev){
        ev.preventDefault();
        state.dragIdx = Number(this.dataset.idx);
        try { this.setPointerCapture(ev.pointerId); } catch(e){}
      });
    });
  }

  // pointermove on svg (single assignment)
  svg.onpointermove = function(e){
    if (state.dragIdx === null) return;
    const rect = svg.getBoundingClientRect();
    const x = e.clientX - rect.left, y = e.clientY - rect.top;
    const a = angleFor(state.dragIdx);
    const dx = x - cx, dy = y - cy;
    const proj = dx*Math.cos(a) + dy*Math.sin(a);
    const r = Math.max(minR, Math.min(maxR, proj));
    const w = (r - minR)/(maxR - minR);
    state.weights[state.dragIdx] = Number(w.toFixed(3));
    updateVisual();
  };

  // pointerup to release
  window.onpointerup = function(){
    state.dragIdx = null;
  };

  // initial draw
  updateVisual();
}

// --- Recommendation scoring & checklist
function mapComplexity(c){ return c==='low'?0.2: (c==='medium'?0.5:0.85); }
function mapCost(c){ return c==='free'?0.1: (c==='freemium'?0.3: (c==='subscription'?0.7:0.4)); }
function mapYes(v){ return v==='high'?1.0: (v==='medium'?0.6:0.2); }

function computeScore(tool, weights, businessFunction){
  const tvec = [
    mapYes(tool.scalability || 'medium'),
    ((tool.primary_function && tool.primary_function.length && businessFunction && businessFunction!=='General')
      ? (tool.primary_function.some(f => f.toLowerCase().includes(businessFunction.toLowerCase())) ? 1.0 : 0.4)
      : 0.6),
    mapComplexity(tool.complexity),
    1 - mapCost(tool.cost_category),
    (tool.compliance && tool.compliance.length ? 1.0 : 0.2)
  ];
  let diff=0; for(let i=0;i<5;i++){ diff += Math.pow((tvec[i] - (weights[i]||0.5)),2); }
  const score = Math.round((1/(1+diff))*100);
  return { score, rationale:`Matched: complexity=${tool.complexity}, cost=${tool.cost_category}, impact=${tool.impact}` };
}

function makeChecklist(tool, functionName){
  const checklist = [];
  const primary = (tool.primary_function && tool.primary_function[0]) || 'General';
  checklist.push(`Create account on ${tool.name}`);
  if(primary.toLowerCase().includes('marketing')) {
    checklist.push('Connect your CRM/email list (e.g. HubSpot/Sendgrid)');
    checklist.push('Run a small test campaign or workflow');
  } else if(primary.toLowerCase().includes('finance')) {
    checklist.push('Import financial records or connect accounting API');
    checklist.push('Run sample reports');
  } else if(primary.toLowerCase().includes('product') || primary.toLowerCase().includes('dev')) {
    checklist.push('Connect repo/API keys');
    checklist.push('Run a prototype task to validate output');
  } else {
    checklist.push('Read quickstart docs and run first tutorial');
    checklist.push('Invite 1 team member for collaboration');
  }
  // also attach lean-startup hint based on weights[0] (startup stage)
  const stage = state.weights[0];
  if(stage < 0.4) checklist.push('You are likely at Problem/Solution fit — consider low-cost pilot first');
  else if(stage < 0.8) checklist.push('Product/Market fit — run short MVP pilots and measure');
  else checklist.push('Growth stage — plan for scaling and integration');
  return checklist;
}

// --- Render recommendations in UI
function renderRecommendations(list){
  const wrap = $('recommend-results'); wrap.innerHTML = '';
  if(list.length===0){ wrap.innerHTML = '<div class="small">No recommendations yet. Set sliders and click Recommend.</div>'; return; }
  list.forEach(r=>{
    const div = document.createElement('div'); div.className='result-card';
    const left = document.createElement('div'); left.style.flex='1';
    left.innerHTML = `<div style="font-weight:700">${r.name} <span class="small">(${r.score})</span></div>
      <div class="small">${r.description}</div>
      <div class="small">${r.rationale}</div>
      <div style="margin-top:8px"><strong>Action checklist:</strong><ol>${r.checklist.map(s=>`<li class="small">${s}</li>`).join('')}</ol></div>`;
    const right = document.createElement('div'); right.style.textAlign='right';
    right.innerHTML = `<a class="tool-link" href="${r.url}" target="_blank" rel="noopener">Open tool site</a>
      <div style="margin-top:8px">
        <label class="small">Rate after trying:</label>
        <select id="rating-${r.tool_id}">
          <option value="5">5 — Excellent</option>
          <option value="4">4 — Good</option>
          <option value="3">3 — Okay</option>
          <option value="2">2 — Poor</option>
          <option value="1">1 — Bad</option>
        </select>
        <div style="margin-top:6px">
          <input id="comment-${r.tool_id}" class="input" placeholder="Short comment (optional)" />
        </div>
        <div style="margin-top:6px">
          <button class="button" onclick="submitFeedback('${r.tool_id}')">Submit</button>
        </div>
      </div>`;
    div.appendChild(left); div.appendChild(right);
    wrap.appendChild(div);
  });
}

// --- Feedback & points
function loadFeedback(){ return JSON.parse(localStorage.getItem('feedback')||'[]'); }
function saveFeedback(arr){ localStorage.setItem('feedback', JSON.stringify(arr)); }

function submitFeedback(tool_id){
  const profile = JSON.parse(localStorage.getItem('profile')||'null');
  if(!profile) return alert('Please login first');
  const rating = Number(document.getElementById(`rating-${tool_id}`).value);
  const comment = document.getElementById(`comment-${tool_id}`).value || '';
  const entry = { id: Date.now(), tool_id, user_id: profile.id, rating, comment, weights: state.weights.slice(), ts: new Date().toISOString() };
  const fb = loadFeedback(); fb.unshift(entry); saveFeedback(fb);
  // points rules
  let pts = profile.points || 0; if(rating >=4) pts+=10; else if(rating===3) pts+=5;
  // bonus first time feedback
  const userHas = fb.some(f=> f.user_id === profile.id && f.tool_id !== tool_id);
  if(!userHas) pts += 20;
  profile.points = pts; saveProfile(profile);
  $('feedback-text').value = '';
  alert('Thank you for your feedback!');
  renderFeedbackList();

  // --- Promo code reward (added)
  const issued = JSON.parse(localStorage.getItem('promo_issued')||'{}');
  const threshold = 50; // points needed for promo
  if ((profile.points || 0) >= threshold && !issued[profile.id]) {
    const code = 'PROMO-' + Math.random().toString(36).substring(2,8).toUpperCase();
    issued[profile.id] = { code, awarded: new Date().toISOString() };
    localStorage.setItem('promo_issued', JSON.stringify(issued));
    alert(`🎉 Congrats! You earned a promo code: ${code}`);
  }
}

// --- Vendor feedback view
function renderFeedbackList(){
  const wrap = $('feedback-list'); wrap.innerHTML = '';
  const fb = loadFeedback();
  if(fb.length===0){ wrap.innerHTML = '<div class="small">No feedback yet.</div>'; return; }
  fb.forEach(f=>{
    const t = state.tools.find(x=>x.tool_id===f.tool_id) || { name: f.tool_id };
    const div = document.createElement('div'); div.className='result-card';
    div.innerHTML = `<div style="display:flex;justify-content:space-between"><div>
      <div style="font-weight:700">${t.name} — Rating: ${f.rating}</div>
      <div class="small">${f.comment}</div>
    </div><div class="small">${new Date(f.ts).toLocaleString()}</div></div>`;
    wrap.appendChild(div);
  });
}

// --- Hook Recommend button to scoring
function wireRecommend(){
  $('btn-recommend').onclick = ()=>{
    const businessFunction = $('select-function').value;
    const complexityFilter = $('filter-complexity').value;
    const costFilter = $('filter-cost').value;
    const weights = state.weights.slice();
    // filter tools
    const candidates = state.tools.filter(t=>{
      if(complexityFilter && t.complexity !== complexityFilter) return false;
      if(costFilter && t.cost_category !== costFilter) return false;
      return true;
    });
    const scored = candidates.map(t => {
      const s = computeScore(t, weights, businessFunction);
      return {...t, score: s.score, rationale: s.rationale, checklist: makeChecklist(t, businessFunction)};
    }).sort((a,b)=>b.score - a.score);
    renderRecommendations(scored.slice(0,3));
  };
}

// --- bootstrap app
(async function init(){
  await loadTools();
  initNav();
  initLogin();
  wireRecommend();

  // show login or home depending on session
  const p = JSON.parse(localStorage.getItem('profile')||'null');
  if(p){ state.profile=p; updateHome(); showView('view-home'); } else showView('view-login');

  // prepare radial drawing when select opened - draw once
  drawRadial();
  renderFeedbackList();
})();
