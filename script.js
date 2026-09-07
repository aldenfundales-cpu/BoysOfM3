const { createClient } = window.supabase;
const SUPABASE_URL = window.BOM3_SUPABASE_URL;
const SUPABASE_KEY = window.BOM3_SUPABASE_ANON_KEY;
const configured = SUPABASE_URL && SUPABASE_KEY && !SUPABASE_URL.includes('YOUR_') && !SUPABASE_KEY.includes('YOUR_');
const sb = configured ? createClient(SUPABASE_URL, SUPABASE_KEY) : null;

const $ = (id) => document.getElementById(id);
const esc = (s='') => String(s).replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#039;'}[c]));
const formatDate = d => d ? new Date(`${d}T00:00:00`).toLocaleDateString(undefined,{year:'numeric',month:'short',day:'numeric'}) : 'TBA';
let publicMembers = [];
let publicZones = [];
let publicEvents = [];
let adminMembers = [];
let adminZones = [];

function showNotice(msg, type='info') {
  const el=$('setupNotice'); el.hidden=false; el.className=`setup-notice ${type}`; el.textContent=msg;
}
function clearNotice(){ $('setupNotice').hidden=true; }
function message(id,text,type='') { const el=$(id); el.textContent=text; el.className=`form-message ${type}`; }

async function loadPublic(){
  if(!sb){
    showNotice('Supabase is not connected yet. Add your project URL and public anon/publishable key to supabase-config.js, then refresh.','warn');
    renderAll(); return;
  }
  const [z,m,e] = await Promise.all([
    sb.from('zones').select('name,location,leader').order('name'),
    sb.from('members').select('id,name,zone,bike,position,status').eq('status','verified').eq('public_visible',true).order('name'),
    sb.from('events').select('id,name,event_date,location,type,description').order('event_date',{ascending:true,nullsFirst:false})
  ]);
  if(z.error || m.error || e.error){
    console.error(z.error||m.error||e.error);
    showNotice('The database is connected, but the tables/policies are not ready. Run database.sql in Supabase SQL Editor.','error');
    return;
  }
  clearNotice(); publicZones=z.data||[]; publicMembers=m.data||[]; publicEvents=e.data||[]; renderAll();
}

function renderAll(){
  $('zoneCount').textContent=publicZones.length;
  $('memberCount').textContent=publicMembers.length;
  $('eventCount').textContent=publicEvents.filter(e=>!e.event_date || new Date(`${e.event_date}T23:59:59`) >= new Date()).length;
  renderZones($('zoneSearch').value||''); renderMembers($('memberSearch').value||''); renderEvents();
}
function renderZones(filter=''){
  const f=filter.toLowerCase();
  const list=publicZones.filter(z=>(`${z.name} ${z.location} ${z.leader||''}`).toLowerCase().includes(f));
  $('zoneGrid').innerHTML=list.map(z=>{
    const count=publicMembers.filter(m=>m.zone.toLowerCase()===z.name.toLowerCase()).length;
    return `<article class="card"><span class="tag">● ACTIVE ZONE</span><h3>${esc(z.name)}</h3><p>📍 ${esc(z.location)}</p><p>👑 ${esc(z.leader||'—')}</p><span class="tag">${count} verified members</span></article>`;
  }).join('') || `<p class="muted">No zones found.</p>`;
}
function renderMembers(filter=''){
  const f=filter.toLowerCase();
  const list=publicMembers.filter(m=>(`${m.id} ${m.name} ${m.zone} ${m.bike} ${m.position}`).toLowerCase().includes(f));
  $('memberGrid').innerHTML=list.map(m=>`<article class="card"><span class="tag">✓ VERIFIED</span><h3>${esc(m.name)}</h3><p><b>${esc(m.id)}</b></p><p>📍 ${esc(m.zone)}</p><p>🏍️ ${esc(m.bike)}</p><p>🎖️ ${esc(m.position)}</p></article>`).join('') || `<p class="muted">No verified members found.</p>`;
}
function renderEvents(){
  $('eventGrid').innerHTML=publicEvents.map(e=>`<article class="card"><span class="tag">${esc(e.type||'EVENT')}</span><h3>${esc(e.name)}</h3><p>📅 ${formatDate(e.event_date)}</p><p>📍 ${esc(e.location||'TBA')}</p>${e.description?`<p>${esc(e.description)}</p>`:''}</article>`).join('') || `<p class="muted">No events yet.</p>`;
}

function resetMemberForm(){
  $('memberForm').reset(); $('memberBike').value='Mio i 125'; $('memberPosition').value='Member'; $('memberPublic').checked=true; $('memberStatus').value='verified';
  $('memberOriginalId').value=''; $('memberFormTitle').textContent='Add Verified Member'; $('memberSubmit').textContent='Save Member'; $('memberCancel').hidden=true; message('memberMessage','');
}
function resetZoneForm(){ $('zoneForm').reset(); $('zoneOriginalName').value=''; $('zoneCancel').hidden=true; message('zoneMessage',''); }

async function checkAdmin(){
  if(!sb) return false;
  const {data:{user}}=await sb.auth.getUser();
  if(!user){ setLoggedOut(); return false; }
  const {data,error}=await sb.from('admins').select('user_id,email').eq('user_id',user.id).maybeSingle();
  if(error || !data){ setLoggedOut(); return false; }
  setLoggedIn(user,data); await loadAdmin(); return true;
}
function setLoggedOut(){ $('loginPanel').hidden=false; $('dashboard').hidden=true; $('adminEmail').textContent=''; }
function setLoggedIn(user,admin){ $('loginPanel').hidden=true; $('dashboard').hidden=false; $('adminEmail').textContent=admin.email||user.email||''; }

async function loadAdmin(){
  const [m,z]=await Promise.all([
    sb.from('members').select('*').order('created_at',{ascending:false}),
    sb.from('zones').select('*').order('name')
  ]);
  if(m.error||z.error){ console.error(m.error||z.error); message('loginMessage','Could not load admin records. Check RLS policies.','error'); return; }
  adminMembers=m.data||[]; adminZones=z.data||[]; renderAdminLists();
}
function renderAdminLists(){
  $('adminMemberList').innerHTML=adminMembers.length ? `<div class="admin-table">${adminMembers.map(m=>`<div class="admin-row"><div><strong>${esc(m.id)}</strong> · ${esc(m.name)}<br><small>${esc(m.zone)} · ${esc(m.position)} · ${esc(m.status)} · ${m.public_visible?'Public':'Hidden'}</small></div><div class="row-actions"><button class="ghost-btn" data-edit-member="${esc(m.id)}">Edit</button><button class="danger small" data-delete-member="${esc(m.id)}">Delete</button></div></div>`).join('')}</div>` : `<p class="muted">No members in the database yet.</p>`;
  $('adminZoneList').innerHTML=adminZones.length ? `<div class="admin-table">${adminZones.map(z=>`<div class="admin-row"><div><strong>${esc(z.name)}</strong><br><small>${esc(z.location)} · Leader: ${esc(z.leader||'—')}</small></div><div class="row-actions"><button class="ghost-btn" data-edit-zone="${esc(z.name)}">Edit</button><button class="danger small" data-delete-zone="${esc(z.name)}">Delete</button></div></div>`).join('')}</div>` : `<p class="muted">No zones in the database yet.</p>`;
  document.querySelectorAll('[data-edit-member]').forEach(b=>b.onclick=()=>editMember(b.dataset.editMember));
  document.querySelectorAll('[data-delete-member]').forEach(b=>b.onclick=()=>deleteMember(b.dataset.deleteMember));
  document.querySelectorAll('[data-edit-zone]').forEach(b=>b.onclick=()=>editZone(b.dataset.editZone));
  document.querySelectorAll('[data-delete-zone]').forEach(b=>b.onclick=()=>deleteZone(b.dataset.deleteZone));
}

function editMember(id){
  const m=adminMembers.find(x=>x.id===id); if(!m)return;
  $('memberOriginalId').value=m.id; $('memberId').value=m.id; $('memberName').value=m.name; $('memberZone').value=m.zone; $('memberBike').value=m.bike; $('memberPosition').value=m.position; $('memberStatus').value=m.status; $('memberPublic').checked=m.public_visible; $('memberFormTitle').textContent='Edit Member'; $('memberSubmit').textContent='Update Member'; $('memberCancel').hidden=false; $('memberForm').scrollIntoView({behavior:'smooth',block:'center'});
}
function editZone(name){
  const z=adminZones.find(x=>x.name===name); if(!z)return;
  $('zoneOriginalName').value=z.name; $('zoneName').value=z.name; $('zoneLocation').value=z.location; $('zoneLeader').value=z.leader||''; $('zoneCancel').hidden=false; $('zoneForm').scrollIntoView({behavior:'smooth',block:'center'});
}
async function deleteMember(id){
  if(!confirm(`Delete member ${id}? This cannot be undone.`))return;
  const {error}=await sb.from('members').delete().eq('id',id); if(error){alert(error.message);return;} await loadAdmin(); await loadPublic();
}
async function deleteZone(name){
  if(!confirm(`Delete zone ${name}?`))return;
  const {error}=await sb.from('zones').delete().eq('name',name); if(error){alert(error.message);return;} await loadAdmin(); await loadPublic();
}

$('zoneSearch').oninput=e=>renderZones(e.target.value);
$('memberSearch').oninput=e=>renderMembers(e.target.value);
$('verifyBtn').onclick=async()=>{
  const id=$('verifyInput').value.trim(); const r=$('verifyResult');
  if(!id){r.className='result bad';r.innerHTML='Please enter a member ID.';return;}
  if(!sb){r.className='result bad';r.innerHTML='Database is not connected yet.';return;}
  const {data,error}=await sb.from('members').select('id,name,zone,bike,position,status').eq('id',id).eq('status','verified').eq('public_visible',true).maybeSingle();
  if(error){r.className='result bad';r.innerHTML='Unable to check the database right now.';return;}
  r.className=`result ${data?'ok':'bad'}`;
  r.innerHTML=data?`✓ <b>VERIFIED MEMBER</b><br><strong>${esc(data.name)}</strong> · ${esc(data.zone)} · ${esc(data.bike)}<br><small>Member ID: ${esc(data.id)} · ${esc(data.position)}</small>`:`✕ <b>NOT VERIFIED</b><br>No active public verified member was found for that ID.`;
};
$('verifyInput').onkeydown=e=>{if(e.key==='Enter')$('verifyBtn').click()};

$('loginForm').onsubmit=async e=>{
  e.preventDefault(); if(!sb){message('loginMessage','Connect Supabase first.','error');return;}
  message('loginMessage','Signing in...');
  const {error}=await sb.auth.signInWithPassword({email:$('loginEmail').value.trim(),password:$('loginPassword').value});
  if(error){message('loginMessage',error.message,'error');return;}
  message('loginMessage',''); await checkAdmin();
};
$('logoutBtn').onclick=async()=>{await sb.auth.signOut();setLoggedOut();};
$('refreshAdmin').onclick=loadAdmin;
$('memberCancel').onclick=resetMemberForm;
$('zoneCancel').onclick=resetZoneForm;

$('memberForm').onsubmit=async e=>{
  e.preventDefault(); if(!sb)return;
  const original=$('memberOriginalId').value.trim();
  const row={id:$('memberId').value.trim(),name:$('memberName').value.trim(),zone:$('memberZone').value.trim(),bike:$('memberBike').value.trim()||'Mio i 125',position:$('memberPosition').value.trim()||'Member',status:$('memberStatus').value,public_visible:$('memberPublic').checked};
  if(!row.id||!row.name||!row.zone)return;
  message('memberMessage','Saving...');
  if(original && original!==row.id){
    const {error:e1}=await sb.from('members').insert(row); if(e1){message('memberMessage',e1.message,'error');return;}
    const {error:e2}=await sb.from('members').delete().eq('id',original); if(e2){message('memberMessage',`New record saved, but old ID could not be deleted: ${e2.message}`,'error');return;}
  } else {
    const {error}=await sb.from('members').upsert(row,{onConflict:'id'}); if(error){message('memberMessage',error.message,'error');return;}
  }
  message('memberMessage','Member saved successfully.','ok'); resetMemberForm(); await loadAdmin(); await loadPublic();
};

$('zoneForm').onsubmit=async e=>{
  e.preventDefault(); if(!sb)return;
  const original=$('zoneOriginalName').value.trim(); const row={name:$('zoneName').value.trim(),location:$('zoneLocation').value.trim(),leader:$('zoneLeader').value.trim()||'To be assigned'};
  message('zoneMessage','Saving...');
  if(original && original!==row.name){
    const {error:e1}=await sb.from('zones').insert(row); if(e1){message('zoneMessage',e1.message,'error');return;}
    const {error:e2}=await sb.from('zones').delete().eq('name',original); if(e2){message('zoneMessage',`New zone saved, but old zone could not be deleted: ${e2.message}`,'error');return;}
  } else { const {error}=await sb.from('zones').upsert(row,{onConflict:'name'}); if(error){message('zoneMessage',error.message,'error');return;} }
  message('zoneMessage','Zone saved successfully.','ok'); resetZoneForm(); await loadAdmin(); await loadPublic();
};

const menuBtn=$('menuBtn'), nav=$('nav');
menuBtn.onclick=()=>nav.classList.toggle('open');
nav.querySelectorAll('a').forEach(a=>a.addEventListener('click',()=>nav.classList.remove('open')));

(async()=>{ renderAll(); if(!sb)return; sb.auth.onAuthStateChange((_event)=>{checkAdmin();}); await loadPublic(); await checkAdmin(); })();
