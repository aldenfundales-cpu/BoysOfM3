const { createClient } = window.supabase;

const SUPABASE_URL = window.BOM3_SUPABASE_URL;
const SUPABASE_KEY = window.BOM3_SUPABASE_ANON_KEY;

const configured =
  SUPABASE_URL &&
  SUPABASE_KEY &&
  !SUPABASE_URL.includes('YOUR_') &&
  !SUPABASE_KEY.includes('YOUR_');

const sb = configured
  ? createClient(SUPABASE_URL, SUPABASE_KEY)
  : null;


const $ = id => document.getElementById(id);

const esc = (s='') =>
  String(s).replace(
    /[&<>"']/g,
    c => ({
      '&':'&amp;',
      '<':'&lt;',
      '>':'&gt;',
      '"':'&quot;',
      "'":'&#039;'
    }[c])
  );

const formatDate = d =>
  d
    ? new Date(`${d}T00:00:00`).toLocaleDateString(
        undefined,
        {
          year:'numeric',
          month:'short',
          day:'numeric'
        }
      )
    : 'TBA';


let publicMembers = [];
let publicZones = [];
let publicEvents = [];

let adminMembers = [];
let adminZones = [];
let adminRequests = [];
let adminEvents = [];

let selectedZone = '';


/* =========================
   NOTICES
========================= */

function showNotice(msg,type='info'){
  const el=$('setupNotice');

  if(!el) return;

  el.hidden=false;
  el.className=`setup-notice ${type}`;
  el.textContent=msg;
}


function clearNotice(){
  const el=$('setupNotice');

  if(el){
    el.hidden=true;
  }
}


function message(id,text,type=''){
  const el=$(id);

  if(!el) return;

  el.textContent=text;
  el.className=`form-message ${type}`;
}


/* =========================
   LOAD PUBLIC DATA
========================= */

async function loadPublic(){

  if(!sb){

    showNotice(
      'Supabase is not connected yet. Add your project URL and public anon/publishable key to supabase-config.js, then refresh.',
      'warn'
    );

    renderAll();

    return;
  }


  const [z,m,e] = await Promise.all([

    sb
      .from('zones')
      .select(
        'name,location,leader,vice_leader,admins'
      )
      .order('name'),


    sb
      .from('members')
      .select(
        'id,name,zone,bike,position,status'
      )
      .eq('status','verified')
      .eq('public_visible',true)
      .order('name'),


    sb
      .from('events')
      .select(
        'id,title,event_date,event_time,location,description'
      )
      .order(
        'event_date',
        {
          ascending:true,
          nullsFirst:false
        }
      )

  ]);


  if(z.error || m.error || e.error){

    console.error(
      z.error ||
      m.error ||
      e.error
    );

    showNotice(
      'The database is connected, but the tables/policies are not ready.',
      'error'
    );

    return;
  }


  clearNotice();

  publicZones=z.data || [];
  publicMembers=m.data || [];
  publicEvents=e.data || [];

  renderAll();
}


/* =========================
   RENDER ALL
========================= */

function renderAll(){

  if($('zoneCount')){
    $('zoneCount').textContent=
      publicZones.length;
  }


  if($('memberCount')){
    $('memberCount').textContent=
      publicMembers.length;
  }


  if($('eventCount')){

    $('eventCount').textContent=
      publicEvents.filter(e=>

        !e.event_date ||

        new Date(
          `${e.event_date}T23:59:59`
        ) >= new Date()

      ).length;
  }


  renderZones(
    $('zoneSearch')
      ? $('zoneSearch').value || ''
      : ''
  );


  /* AUTOMATICALLY LOAD EXISTING ZONES
     INTO MEMBER FORM DROPDOWN */
  populateMemberZoneDropdown();
populateRequestZoneDropdown();


  if(selectedZone){

    renderMembers(
      $('memberSearch')
        ? $('memberSearch').value || ''
        : ''
    );
  }


  renderEvents();
}


/* =========================
   MEMBER ZONE DROPDOWN
========================= */

function populateMemberZoneDropdown(){

  const select = $('memberZone');

  if(!select) return;

  const currentValue = select.value;

  const zones =
    adminZones && adminZones.length
      ? adminZones
      : publicZones;

  select.innerHTML = `
    <option value="">Select Zone</option>

    ${zones.map(z => `
      <option value="${esc(z.name)}">
        ${esc(z.name)}
      </option>
    `).join('')}
  `;

  if(
    currentValue &&
    zones.some(z => z.name === currentValue)
  ){
    select.value = currentValue;
  }
}

/* =========================
   REQUEST ZONE DROPDOWN
========================= */

function populateRequestZoneDropdown(){

  const select = $('requestZone');

  if(!select) return;

  const currentValue = select.value;

  select.innerHTML = `
    <option value="">Select Zone</option>
    ${publicZones.map(z => `
      <option value="${esc(z.name)}">
        ${esc(z.name)}
      </option>
    `).join('')}
  `;

  if(
    currentValue &&
    publicZones.some(z => z.name === currentValue)
  ){
    select.value = currentValue;
  }
}


/* =========================
   ZONE DIRECTORY
========================= */

function renderZones(filter=''){

  const f=
    filter.toLowerCase();


  const list=
    publicZones.filter(z=>(

      `${z.name}
       ${z.location}
       ${z.leader || ''}
       ${z.vice_leader || ''}
       ${z.admins || ''}`

    ).toLowerCase().includes(f));


  const grid=$('zoneGrid');

  if(!grid) return;


  grid.innerHTML=
    list.map(z=>{


      const count=
        publicMembers.filter(
          m=>
            (m.zone || '')
              .toLowerCase()
            ===
            z.name.toLowerCase()
        ).length;


      return `

        <article
          class="card zone-card"
          data-zone="${esc(z.name)}"
          role="button"
          tabindex="0"
          title="View ${esc(z.name)} members"
        >

          <span class="tag">
            ● ACTIVE ZONE
          </span>

          <h3>
            ${esc(z.name)}
          </h3>

          <p>
            📍 ${esc(z.location)}
          </p>

          <p>
            👑
            <b>Zone Leader:</b>
            ${esc(z.leader || 'TBA')}
          </p>

          <p>
            ⭐
            <b>Vice Leader:</b>
            ${esc(
              z.vice_leader || 'TBA'
            )}
          </p>

          <p>
  🛡️ <b>Admins:</b><br>
  ${
    z.admins && z.admins !== 'TBA'
      ? z.admins
          .split(',')
          .map(admin => esc(admin.trim()))
          .join('<br>')
      : 'TBA'
  }
</p>

          <span class="tag">
            ${count} verified members
          </span>

        </article>

      `;

    }).join('')

    ||

    `<p class="muted">
      No zones found.
    </p>`;


  document
    .querySelectorAll(
      '.zone-card'
    )
    .forEach(card=>{


      card.onclick=()=>{

        showZoneMembers(
          card.dataset.zone
        );

      };


      card.onkeydown=e=>{

        if(
          e.key==='Enter' ||
          e.key===' '
        ){

          e.preventDefault();

          showZoneMembers(
            card.dataset.zone
          );

        }

      };

    });
}


/* =========================
   MEMBERS
========================= */

function renderMembers(filter=''){

  const grid=$('memberGrid');

  if(!grid) return;


  const f=
    filter.toLowerCase();


  let list=
    publicMembers;


  if(selectedZone){

    list=
      list.filter(
        m=>

          (m.zone || '')
            .toLowerCase()

          ===

          selectedZone
            .toLowerCase()

      );
  }


  list=
    list.filter(m=>(

      `${m.id}
       ${m.name}
       ${m.zone}
       ${m.bike}
       ${m.position}`

    ).toLowerCase().includes(f));

  /* Sort members by badge number: lowest to highest */
list.sort((a, b) => {
  return Number(a.id) - Number(b.id);
});


  grid.innerHTML=
    list.map(m=>`

      <article class="card">

        <span class="tag">
          ✓ VERIFIED
        </span>

        <h3>
          ${esc(m.name)}
        </h3>

        <p>
          <b>
            ${esc(m.id)}
          </b>
        </p>

        <p>
          📍 ${esc(m.zone)}
        </p>

        <p>
          🏍️ ${esc(m.bike)}
        </p>

        <p>
          🎖️ ${esc(m.position)}
        </p>

      </article>

    `).join('')

    ||

    `<p class="muted">
      No verified members found in this zone.
    </p>`;
}


/* =========================
   SHOW ZONE MEMBERS
========================= */

function showZoneMembers(zoneName){

  selectedZone=
    zoneName;


  if($('membersTitle')){

    $('membersTitle').textContent=
      `${zoneName} Members`;

  }


  if($('memberSearch')){

    $('memberSearch').value='';

  }


  const section=
    $('members');


  if(!section) return;


  section.hidden=false;


  renderMembers('');


  section.scrollIntoView({
    behavior:'smooth',
    block:'start'
  });
}


/* =========================
   CLOSE MEMBERS
========================= */

function closeZoneMembers(){

  selectedZone='';


  if($('memberSearch')){
    $('memberSearch').value='';
  }


  if($('membersTitle')){
    $('membersTitle').textContent=
      'Members';
  }


  if($('memberGrid')){
    $('memberGrid').innerHTML='';
  }


  if($('members')){
    $('members').hidden=true;
  }
}


/* =========================
   EVENTS
========================= */

function renderEvents(){

  const grid=$('eventGrid');

  if(!grid) return;


  grid.innerHTML=
    publicEvents.map(e=>`

      <article class="card">

        <span class="tag">
          EVENT
        </span>

        <h3>
          ${esc(e.title)}
        </h3>

        <p>
         🗓 ${formatDate(
  e.event_date
)}
        </p>

        <p>
          🕒 ${esc(
            e.event_time || 'TBA'
          )}
        </p>

        <p>
          📍 ${esc(
            e.location || 'TBA'
          )}
        </p>

        ${
          e.description
          ?
          `<p>
            ${esc(e.description)}
          </p>`
          :
          ''
        }

      </article>

    `).join('')

    ||

    `<p class="muted">
      No events yet.
    </p>`;
}


/* =========================
   RESET MEMBER FORM
========================= */

function resetMemberForm(){

  const form=
    $('memberForm');


  if(form){
    form.reset();
  }


  if($('memberBike')){
    $('memberBike').value=
      'Mio i 125';
  }


  if($('memberPosition')){
    $('memberPosition').value=
      'Member';
  }


  if($('memberPublic')){
    $('memberPublic').checked=
      true;
  }


  if($('memberStatus')){
    $('memberStatus').value=
      'verified';
  }


  if($('memberOriginalId')){
    $('memberOriginalId').value='';
  }


  if($('memberFormTitle')){
    $('memberFormTitle').textContent=
      'Add Verified Member';
  }


  if($('memberSubmit')){
    $('memberSubmit').textContent=
      'Save Member';
  }


  if($('memberCancel')){
    $('memberCancel').hidden=true;
  }


  populateMemberZoneDropdown();

  message(
    'memberMessage',
    ''
  );
}


/* =========================
   RESET ZONE FORM
========================= */

function resetZoneForm(){

  const form=$('zoneForm');

  if(form){
    form.reset();
  }


  if($('zoneOriginalName')){
    $('zoneOriginalName').value='';
  }


  if($('zoneCancel')){
    $('zoneCancel').hidden=true;
  }


  message(
    'zoneMessage',
    ''
  );
}

/* =========================
   RESET EVENT FORM
========================= */

function resetEventForm(){

  const form=
    $('eventForm');

  if(form){
    form.reset();
  }

  if($('eventId')){
    $('eventId').value='';
  }

  if($('eventFormTitle')){
    $('eventFormTitle').textContent=
      'Add Event';
  }

  if($('eventSubmit')){
    $('eventSubmit').textContent=
      'Save Event';
  }

  if($('eventCancel')){
    $('eventCancel').hidden=true;
  }

  message(
    'eventMessage',
    ''
  );
}

/* =========================
   ADMIN AUTH
========================= */

async function checkAdmin(){

  if(!sb){
    return false;
  }


  const {
    data:{user}
  }=
  await sb.auth.getUser();


  if(!user){

    setLoggedOut();

    return false;
  }


  const {
    data,
    error
  }=
  await sb
    .from('admins')
    .select(
      'user_id,email'
    )
    .eq(
      'user_id',
      user.id
    )
    .maybeSingle();


  if(
    error ||
    !data
  ){

    setLoggedOut();

    return false;
  }


  setLoggedIn(
    user,
    data
  );


  await loadAdmin();


  return true;
}


function setLoggedOut(){

  if($('loginPanel')){
    $('loginPanel').hidden=false;
  }

  if($('dashboard')){
    $('dashboard').hidden=true;
  }

  if($('adminEmail')){
    $('adminEmail').textContent='';
  }
}


function setLoggedIn(user,admin){

  if($('loginPanel')){
    $('loginPanel').hidden=true;
  }

  if($('dashboard')){
    $('dashboard').hidden=false;
  }

  if($('adminEmail')){

    $('adminEmail').textContent=
      admin.email ||
      user.email ||
      '';

  }
}


/* =========================
   LOAD ADMIN DATA
========================= */

async function loadAdmin(){

  if(!sb) return;

  const [m,z,r,e] =
  await Promise.all([

    sb
      .from('members')
      .select('*')
      .order(
        'created_at',
        {
          ascending:false
        }
      ),

    sb
      .from('zones')
      .select('*')
      .order('name'),

    sb
      .from('member_requests')
      .select('*')
      .eq('status','pending')
      .order(
        'submitted_at',
        {
          ascending:true
        }
      ),

    sb
      .from('events')
      .select('*')
      .order(
        'event_date',
        {
          ascending:true,
          nullsFirst:false
        }
      )

  ]);


  if(
    m.error ||
    z.error ||
    r.error ||
    e.error
  ){

    console.error(
      m.error ||
      z.error ||
      r.error ||
      e.error
    );


    message(
      'loginMessage',
      'Could not load admin records. Check RLS policies.',
      'error'
    );


    return;
  }


  adminMembers =
    m.data || [];


  adminZones =
    z.data || [];


  adminRequests =
    r.data || [];


  adminEvents =
    e.data || [];


  populateMemberZoneDropdown();

  renderAdminLists();
}

/* =========================
   ADMIN LISTS
========================= */

function renderAdminLists(){

  const memberList=
    $('adminMemberList');

  const zoneList=
    $('adminZoneList');
  
  const requestList=
  $('adminRequestList');

  const eventList=
  $('adminEventList');

  
  if(requestList){

  requestList.innerHTML=

    adminRequests.length

    ?

    `<div class="admin-table">

      ${adminRequests.map(r=>`

        <div class="admin-row">

          <div>

            <strong>
              ${esc(r.member_id)}
            </strong>

            · ${esc(r.name)}

            <br>

            <small>
              📍 ${esc(r.zone)}
              ·
              🏍️ ${esc(r.bike)}
            </small>

          </div>

          <div class="row-actions">

            <button
              class="btn small"
              data-approve-request="${r.id}"
            >
              Approve
            </button>

            <button
              class="danger small"
              data-reject-request="${r.id}"
            >
              Reject
            </button>

          </div>

        </div>

      `).join('')}

    </div>`

    :

    `<p class="muted">
      No pending membership requests.
    </p>`;

}

  if(memberList){

    memberList.innerHTML=

      adminMembers.length

      ?

      `<div class="admin-table">

        ${adminMembers.map(m=>`

          <div class="admin-row">

            <div>

              <strong>
                ${esc(m.id)}
              </strong>

              · ${esc(m.name)}

              <br>

              <small>

                ${esc(m.zone)}
                ·
                ${esc(m.position)}
                ·
                ${esc(m.status)}
                ·
                ${
                  m.public_visible
                  ? 'Public'
                  : 'Hidden'
                }

              </small>

            </div>


            <div class="row-actions">

              <button
                class="ghost-btn"
                data-edit-member="${esc(m.id)}"
              >
                Edit
              </button>

              <button
                class="danger small"
                data-delete-member="${esc(m.id)}"
              >
                Delete
              </button>

            </div>

          </div>

        `).join('')}

      </div>`

      :

      `<p class="muted">
        No members in the database yet.
      </p>`;

  }

    if(zoneList){

    zoneList.innerHTML=

      adminZones.length

      ?

      `<div class="admin-table">

        ${adminZones.map(z=>`

          <div class="admin-row">

            <div>

              <strong>
                ${esc(z.name)}
              </strong>

              <br>

              <small>

                ${esc(z.location)}

                <br>

                Zone Leader:
                ${esc(
                  z.leader || '—'
                )}

                <br>

                Vice Leader:
                ${esc(
                  z.vice_leader || '—'
                )}

                <br>

                Admins:
                ${esc(
                  z.admins || '—'
                )}

              </small>

            </div>


            <div class="row-actions">

              <button
                class="ghost-btn"
                data-edit-zone="${esc(z.name)}"
              >
                Edit
              </button>

              <button
                class="danger small"
                data-delete-zone="${esc(z.name)}"
              >
                Delete
              </button>

            </div>

          </div>

        `).join('')}

      </div>`

      :

      `<p class="muted">
        No zones in the database yet.
      </p>`;

  }
   
  if(eventList){

    eventList.innerHTML=

      adminEvents.length

      ?

      `<div class="admin-table">

        ${adminEvents.map(e=>`

          <div class="admin-row">

            <div>

              <strong>
                ${esc(e.title)}
              </strong>

              <br>

              <small>

                📅 ${formatDate(e.event_date)}
                ·
                🕒 ${esc(e.event_time || 'TBA')}
                ·
                📍 ${esc(e.location || 'TBA')}

              </small>

            </div>


            <div class="row-actions">

              <button
                class="ghost-btn"
                data-edit-event="${e.id}"
              >
                Edit
              </button>

              <button
                class="danger small"
                data-delete-event="${e.id}"
              >
                Delete
              </button>

            </div>

          </div>

        `).join('')}

      </div>`

      :

      `<p class="muted">
        No events in the database yet.
      </p>`;

  }


  document
    .querySelectorAll(
      '[data-edit-member]'
    )
    .forEach(
      b=>
        b.onclick=()=>
          editMember(
            b.dataset.editMember
          )
    );


  document
    .querySelectorAll(
      '[data-delete-member]'
    )
    .forEach(
      b=>
        b.onclick=()=>
          deleteMember(
            b.dataset.deleteMember
          )
    );


  document
    .querySelectorAll(
      '[data-edit-zone]'
    )
    .forEach(
      b=>
        b.onclick=()=>
          editZone(
            b.dataset.editZone
          )
    );


  document
    .querySelectorAll(
      '[data-delete-zone]'
    )
    .forEach(
      b=>
        b.onclick=()=>
          deleteZone(
            b.dataset.deleteZone
          )
    );
    document
    .querySelectorAll(
      '[data-edit-event]'
    )
    .forEach(
      b=>
        b.onclick=()=>
          editEvent(
            Number(
              b.dataset.editEvent
            )
          )
    );


  document
    .querySelectorAll(
      '[data-delete-event]'
    )
    .forEach(
      b=>
        b.onclick=()=>
          deleteEvent(
            Number(
              b.dataset.deleteEvent
            )
          )
    );
document
  .querySelectorAll(
    '[data-approve-request]'
  )
  .forEach(
    b=>
      b.onclick=()=>
        approveMemberRequest(
          Number(
            b.dataset.approveRequest
          )
        )
  );


document
  .querySelectorAll(
    '[data-reject-request]'
  )
  .forEach(
    b=>
      b.onclick=()=>
        rejectMemberRequest(
          Number(
            b.dataset.rejectRequest
          )
        )
  );
}

/* =========================
   APPROVE MEMBERSHIP REQUEST
========================= */

async function approveMemberRequest(id){

  const req=
    adminRequests.find(
      r=>Number(r.id)===Number(id)
    );

  if(!req) return;

  if(
    !confirm(
      `Approve ${req.name} (${req.member_id}) as a verified member?`
    )
  ){
    return;
  }

  message(
    'requestAdminMessage',
    'Approving membership request...'
  );

  const {error}=
    await sb.rpc(
      'approve_member_request',
      {
        request_id:Number(id)
      }
    );

  if(error){

    message(
      'requestAdminMessage',
      error.message,
      'error'
    );

    return;
  }

  message(
    'requestAdminMessage',
    `${req.name} has been approved successfully.`,
    'ok'
  );

  await loadAdmin();
  await loadPublic();
}


/* =========================
   REJECT MEMBERSHIP REQUEST
========================= */

async function rejectMemberRequest(id){

  const req=
    adminRequests.find(
      r=>Number(r.id)===Number(id)
    );

  if(!req) return;

  if(
    !confirm(
      `Reject the membership request from ${req.name} (${req.member_id})?`
    )
  ){
    return;
  }

  message(
    'requestAdminMessage',
    'Rejecting membership request...'
  );

  const {error}=
    await sb.rpc(
      'reject_member_request',
      {
        request_id:Number(id)
      }
    );

  if(error){

    message(
      'requestAdminMessage',
      error.message,
      'error'
    );

    return;
  }

  message(
    'requestAdminMessage',
    `${req.name}'s membership request was rejected.`,
    'ok'
  );

  await loadAdmin();
  await loadPublic();
}
/* =========================
   EDIT MEMBER
========================= */

function editMember(id){

  const m=
    adminMembers.find(
      x=>x.id===id
    );


  if(!m) return;


  populateMemberZoneDropdown();


  $('memberOriginalId').value=
    m.id;

  $('memberId').value=
    m.id;

  $('memberName').value=
    m.name;

  $('memberZone').value=
    m.zone;

  $('memberBike').value=
    m.bike;

  $('memberPosition').value=
    m.position;

  $('memberStatus').value=
    m.status;

  $('memberPublic').checked=
    m.public_visible;


  $('memberFormTitle').textContent=
    'Edit Member';

  $('memberSubmit').textContent=
    'Update Member';

  $('memberCancel').hidden=
    false;


  $('memberForm').scrollIntoView({
    behavior:'smooth',
    block:'center'
  });
}


/* =========================
   EDIT ZONE
========================= */

function editZone(name){

  const z=
    adminZones.find(
      x=>x.name===name
    );


  if(!z) return;


  $('zoneOriginalName').value=
    z.name;

  $('zoneName').value=
    z.name;

  $('zoneLocation').value=
    z.location;

  $('zoneLeader').value=
    z.leader || '';

  $('zoneViceLeader').value=
    z.vice_leader || '';

  $('zoneAdmins').value=
    z.admins || '';


  $('zoneCancel').hidden=
    false;


  $('zoneForm').scrollIntoView({
    behavior:'smooth',
    block:'center'
  });
}

/* =========================
   EDIT EVENT
========================= */

function editEvent(id){

  const e=
    adminEvents.find(
      x=>
        Number(x.id)===
        Number(id)
    );

  if(!e) return;


  $('eventId').value=
    e.id;

  $('eventTitle').value=
    e.title || '';

  $('eventDate').value=
    e.event_date || '';

  $('eventTime').value=
    e.event_time || '';

  $('eventLocation').value=
    e.location || '';

  $('eventDescription').value=
    e.description || '';


  if($('eventFormTitle')){
    $('eventFormTitle').textContent=
      'Edit Event';
  }

  if($('eventSubmit')){
    $('eventSubmit').textContent=
      'Update Event';
  }

  if($('eventCancel')){
    $('eventCancel').hidden=false;
  }


  $('eventForm').scrollIntoView({
    behavior:'smooth',
    block:'center'
  });
}


/* =========================
   DELETE MEMBER
========================= */

async function deleteMember(id){

  if(
    !confirm(
      `Delete member ${id}? This cannot be undone.`
    )
  ){
    return;
  }


  const {error}=
    await sb
      .from('members')
      .delete()
      .eq('id',id);


  if(error){

    alert(
      error.message
    );

    return;
  }


  await loadAdmin();
  await loadPublic();
}


/* =========================
   DELETE ZONE
========================= */

async function deleteZone(name){

  if(
    !confirm(
      `Delete zone ${name}?`
    )
  ){
    return;
  }


  const {error}=
    await sb
      .from('zones')
      .delete()
      .eq('name',name);


  if(error){

    alert(
      error.message
    );

    return;
  }


  await loadAdmin();
  await loadPublic();
}

/* =========================
   DELETE EVENT
========================= */

async function deleteEvent(id){

  if(
    !confirm(
      'Delete this event? This cannot be undone.'
    )
  ){
    return;
  }


  const {error}=
    await sb
      .from('events')
      .delete()
      .eq('id',id);


  if(error){

    alert(
      error.message
    );

    return;
  }


  await loadAdmin();
  await loadPublic();
}


/* =========================
   PUBLIC SEARCH
========================= */

if($('zoneSearch')){

  $('zoneSearch').oninput=
    e=>
      renderZones(
        e.target.value
      );

}


if($('memberSearch')){

  $('memberSearch').oninput=
    e=>
      renderMembers(
        e.target.value
      );

}


if($('closeMembers')){

  $('closeMembers').onclick=
    closeZoneMembers;

}


/* =========================
   VERIFY MEMBER
========================= */

if($('verifyBtn')){

  $('verifyBtn').onclick=
    async()=>{


      const id=
        $('verifyInput')
          .value
          .trim();


      const r=
        $('verifyResult');


      if(!id){

        r.className=
          'result bad';

        r.innerHTML=
          'Please enter a member ID.';

        return;
      }


      if(!sb){

        r.className=
          'result bad';

        r.innerHTML=
          'Database is not connected yet.';

        return;
      }


      const {
        data,
        error
      }=
      await sb
        .from('members')
        .select(
          'id,name,zone,bike,position,status'
        )
        .eq(
          'id',
          id
        )
        .eq(
          'status',
          'verified'
        )
        .eq(
          'public_visible',
          true
        )
        .maybeSingle();


      if(error){

        r.className=
          'result bad';

        r.innerHTML=
          'Unable to check the database right now.';

        return;
      }


      r.className=
        `result ${
          data
          ? 'ok'
          : 'bad'
        }`;


      r.innerHTML=

        data

        ?

        `✓ <b>VERIFIED MEMBER</b>

        <br>

        <strong>
          ${esc(data.name)}
        </strong>

        · ${esc(data.zone)}
        · ${esc(data.bike)}

        <br>

        <small>

          Member ID:
          ${esc(data.id)}

          ·
          ${esc(data.position)}

        </small>`

        :

        `✕ <b>NOT VERIFIED</b>

        <br>

        No active public verified member was found for that ID.`;

    };

}


if($('verifyInput')){

  $('verifyInput').onkeydown=
    e=>{

      if(e.key==='Enter'){

        $('verifyBtn').click();

      }

    };

}


/* =========================
   MEMBERSHIP REQUEST
========================= */

if($('requestForm')){

  $('requestForm').onsubmit = async e => {

    e.preventDefault();

    if(!sb){

      message(
        'requestMessage',
        'Database is not connected.',
        'error'
      );

      return;
    }


    const memberId =
      $('requestMemberId').value.trim();

    const name =
      $('requestName').value.trim();

    const zone =
      $('requestZone').value.trim();

    const bike =
      $('requestBike').value.trim() || 'Mio i 125';


    if(!memberId || !name || !zone){

      message(
        'requestMessage',
        'Please complete all required fields.',
        'error'
      );

      return;
    }


    message(
      'requestMessage',
      'Submitting request...'
    );


    /* Check if member ID is already registered */

    const {
      data: existingMember,
      error: memberCheckError
    } =
      await sb
        .from('members')
        .select('id')
        .eq('id', memberId)
        .maybeSingle();


    if(memberCheckError){

      message(
        'requestMessage',
        'Unable to check the member ID.',
        'error'
      );

      return;
    }


    if(existingMember){

      message(
        'requestMessage',
        'This Member ID is already registered.',
        'error'
      );

      return;
    }


    /* Submit pending request */

    const { error } =
      await sb
        .from('member_requests')
        .insert({
          member_id: memberId,
          name: name,
          zone: zone,
          bike: bike,
          status: 'pending'
        });


    if(error){

      message(
        'requestMessage',
        error.message,
        'error'
      );

      return;
    }


    message(
      'requestMessage',
      'Membership request submitted successfully. Please wait for administrator approval.',
      'ok'
    );


    $('requestForm').reset();

    $('requestBike').value =
      'Mio i 125';

    populateRequestZoneDropdown();

  };

}
/* =========================
   ADMIN LOGIN
========================= */

if($('loginForm')){

  $('loginForm').onsubmit=
    async e=>{


      e.preventDefault();


      if(!sb){

        message(
          'loginMessage',
          'Connect Supabase first.',
          'error'
        );

        return;
      }


      message(
        'loginMessage',
        'Signing in...'
      );


      const {error}=
        await sb.auth.signInWithPassword({

          email:
            $('loginEmail')
              .value
              .trim(),

          password:
            $('loginPassword')
              .value

        });


      if(error){

        message(
          'loginMessage',
          error.message,
          'error'
        );

        return;
      }


      message(
        'loginMessage',
        ''
      );


      await checkAdmin();

    };

}


/* =========================
   LOGOUT / REFRESH
========================= */

if($('logoutBtn')){

  $('logoutBtn').onclick=
    async()=>{

      await sb.auth.signOut();

      setLoggedOut();

    };

}


if($('refreshAdmin')){

  $('refreshAdmin').onclick=
    loadAdmin;

}


if($('memberCancel')){

  $('memberCancel').onclick=
    resetMemberForm;

}


if($('zoneCancel')){

  $('zoneCancel').onclick=
    resetZoneForm;

}

if($('eventCancel')){

  $('eventCancel').onclick=
    resetEventForm;

}


/* =========================
   SAVE MEMBER
========================= */

if($('memberForm')){

  $('memberForm').onsubmit=
    async e=>{


      e.preventDefault();


      if(!sb) return;


      const original=
        $('memberOriginalId')
          .value
          .trim();


      const row={

        id:
          $('memberId')
            .value
            .trim(),

        name:
          $('memberName')
            .value
            .trim(),

        zone:
          $('memberZone')
            .value
            .trim(),

        bike:
          $('memberBike')
            .value
            .trim()
          ||
          'Mio i 125',

        position:
          $('memberPosition')
            .value
            .trim()
          ||
          'Member',

        status:
          $('memberStatus')
            .value,

        public_visible:
          $('memberPublic')
            .checked

      };


      if(
        !row.id ||
        !row.name ||
        !row.zone
      ){

        message(
          'memberMessage',
          'Please complete the required fields.',
          'error'
        );

        return;
      }


      message(
        'memberMessage',
        'Saving...'
      );


      if(
        original &&
        original !== row.id
      ){


        const {error:e1}=
          await sb
            .from('members')
            .insert(row);


        if(e1){

          message(
            'memberMessage',
            e1.message,
            'error'
          );

          return;
        }


        const {error:e2}=
          await sb
            .from('members')
            .delete()
            .eq(
              'id',
              original
            );


        if(e2){

          message(
            'memberMessage',
            `New record saved, but old ID could not be deleted: ${e2.message}`,
            'error'
          );

          return;
        }


      }else{


        const {error}=
          await sb
            .from('members')
            .upsert(
              row,
              {
                onConflict:'id'
              }
            );


        if(error){

          message(
            'memberMessage',
            error.message,
            'error'
          );

          return;
        }

      }


      message(
        'memberMessage',
        'Member saved successfully.',
        'ok'
      );


      resetMemberForm();


      await loadAdmin();
      await loadPublic();

    };

}


/* =========================
   SAVE ZONE
========================= */

if($('zoneForm')){

  $('zoneForm').onsubmit=
    async e=>{


      e.preventDefault();


      if(!sb) return;


      const original=
        $('zoneOriginalName')
          .value
          .trim();


      const row={

        name:
          $('zoneName')
            .value
            .trim(),

        location:
          $('zoneLocation')
            .value
            .trim(),

        leader:
          $('zoneLeader')
            .value
            .trim()
          ||
          'TBA',

        vice_leader:
          $('zoneViceLeader')
            .value
            .trim()
          ||
          'TBA',

        admins:
          $('zoneAdmins')
            .value
            .trim()
          ||
          'TBA'

      };


      message(
        'zoneMessage',
        'Saving...'
      );


      if(
        original &&
        original !== row.name
      ){


        const {error:e1}=
          await sb
            .from('zones')
            .insert(row);


        if(e1){

          message(
            'zoneMessage',
            e1.message,
            'error'
          );

          return;
        }


        const {error:e2}=
          await sb
            .from('zones')
            .delete()
            .eq(
              'name',
              original
            );


        if(e2){

          message(
            'zoneMessage',
            `New zone saved, but old zone could not be deleted: ${e2.message}`,
            'error'
          );

          return;
        }


      }else{


        const {error}=
          await sb
            .from('zones')
            .upsert(
              row,
              {
                onConflict:'name'
              }
            );


        if(error){

          message(
            'zoneMessage',
            error.message,
            'error'
          );

          return;
        }

      }


      message(
        'zoneMessage',
        'Zone saved successfully.',
        'ok'
      );


      resetZoneForm();


      await loadAdmin();
      await loadPublic();

    };

}

/* =========================
   SAVE EVENT
========================= */

if($('eventForm')){

  $('eventForm').onsubmit=
    async e=>{

      e.preventDefault();

      if(!sb) return;


      const id=
        $('eventId')
          .value
          .trim();


      const row={

        title:
          $('eventTitle')
            .value
            .trim(),

        event_date:
          $('eventDate')
            .value
          ||
          null,

        event_time:
          $('eventTime')
            .value
          ||
          null,

        location:
          $('eventLocation')
            .value
            .trim()
          ||
          null,

        description:
          $('eventDescription')
            .value
            .trim()
          ||
          null

      };


      if(!row.title){

        message(
          'eventMessage',
          'Please enter an event title.',
          'error'
        );

        return;
      }


      message(
        'eventMessage',
        'Saving...'
      );


      let result;


      if(id){

        result=
          await sb
            .from('events')
            .update(row)
            .eq(
              'id',
              Number(id)
            );

      }else{

        result=
          await sb
            .from('events')
            .insert(row);

      }


      if(result.error){

        message(
          'eventMessage',
          result.error.message,
          'error'
        );

        return;
      }


      message(
        'eventMessage',
        'Event saved successfully.',
        'ok'
      );


      resetEventForm();


      await loadAdmin();
      await loadPublic();

    };

}

/* =========================
   MOBILE MENU
========================= */

const menuBtn=
  $('menuBtn');

const nav=
  $('nav');


if(
  menuBtn &&
  nav
){

  menuBtn.onclick=
    ()=>{

      nav.classList.toggle(
        'open'
      );

    };


  nav
    .querySelectorAll('a')
    .forEach(a=>{

      a.addEventListener(
        'click',
        ()=>{

          nav.classList.remove(
            'open'
          );

        }
      );

    });

}


/* =========================
   START WEBSITE
========================= */

(async()=>{


  renderAll();


  if(!sb){
    return;
  }


  sb.auth.onAuthStateChange(
    ()=>{

      checkAdmin();

    }
  );


  await loadPublic();

  await checkAdmin();


})();
