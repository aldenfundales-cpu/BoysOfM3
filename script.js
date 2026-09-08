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


/* =========================
   CLEAN SVG ICONS
========================= */

const iconSvg = (name, className='info-icon') => {

  const icons = {

    pin: `
      <path d="M12 21s6-5.2 6-11a6 6 0 1 0-12 0c0 5.8 6 11 6 11Z"/>
      <circle cx="12" cy="10" r="2.3"/>
    `,

    crown: `
      <path d="M3 8l4 3 5-6 5 6 4-3-2 10H5L3 8Z"/>
      <path d="M5 21h14"/>
    `,

    star: `
      <path d="M12 3l2.8 5.7 6.2.9-4.5 4.4 1.1 6.2L12 17.3 6.4 20.2 7.5 14 3 9.6l6.2-.9L12 3Z"/>
    `,

    shield: `
      <path d="M12 3l7 3v5c0 4.6-2.8 7.9-7 10-4.2-2.1-7-5.4-7-10V6l7-3Z"/>
      <path d="M9 12l2 2 4-4"/>
    `,

    bike: `
      <circle cx="6" cy="17" r="3"/>
      <circle cx="18" cy="17" r="3"/>
      <path d="M6 17l4-7h4l4 7M9 10h5l2 3M11 7h3"/>
    `,

    badge: `
      <circle cx="12" cy="9" r="5"/>
      <path d="M9 14l-1 7 4-2 4 2-1-7"/>
      <path d="M10 9l1.3 1.3L14 7.8"/>
    `,

    calendar: `
      <rect x="3" y="5" width="18" height="16" rx="2"/>
      <path d="M8 3v4M16 3v4M3 10h18"/>
      <path d="M7 14h2M11 14h2M15 14h2M7 18h2M11 18h2M15 18h2"/>
    `,

    clock: `
      <circle cx="12" cy="12" r="9"/>
      <path d="M12 7v5l3 2"/>
    `,

    users: `
      <circle cx="9" cy="9" r="3"/>
      <circle cx="17" cy="8" r="2.5"/>
      <path d="M3.5 20c.5-4 2.5-6 5.5-6s5 2 5.5 6M14 14c2.8.2 4.8 2.1 5.3 5"/>
    `
  };

  return `
    <svg
      class="${className}"
      viewBox="0 0 24 24"
      aria-hidden="true"
      focusable="false"
      fill="none"
      stroke="currentColor"
      stroke-width="1.9"
      stroke-linecap="round"
      stroke-linejoin="round"
    >
      ${icons[name] || ''}
    </svg>
  `;
};


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
            ${iconSvg('pin')}
            ${esc(z.location)}
          </p>

          <p>
            ${iconSvg('crown')}
            <b>Zone Leader:</b>
            ${esc(z.leader || 'TBA')}
          </p>

          <p>
            ${iconSvg('star')}
            <b>Vice Leader:</b>
            ${esc(z.vice_leader || 'TBA')}
          </p>

          <p>
            ${iconSvg('shield')}
            <b>Admins:</b><br>

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
          ${iconSvg('pin')}
          ${esc(m.zone)}
        </p>

        <p>
          ${iconSvg('bike')}
          ${esc(m.bike)}
        </p>

        <p>
          ${iconSvg('badge')}
          ${esc(m.position)}
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
          ${iconSvg('calendar')}
          ${formatDate(
            e.event_date
          )}
        </p>

        <p>
          ${iconSvg('clock')}
          ${esc(
            e.event_time || 'TBA'
          )}
        </p>

        <p>
          ${iconSvg('pin')}
          ${esc(
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


  if($('logoutBtn')){
    $('logoutBtn').hidden=true;
  }


  if($('adminUser')){
    $('adminUser').textContent='';
  }
}


function setLoggedIn(user,admin){

  if($('loginPanel')){
    $('loginPanel').hidden=true;
  }


  if($('dashboard')){
    $('dashboard').hidden=false;
  }


  if($('logoutBtn')){
    $('logoutBtn').hidden=false;
  }


  if($('adminUser')){

    $('adminUser').textContent=
      admin.email ||
      user.email ||
      'Administrator';

  }
}


/* =========================
   LOAD ADMIN DATA
========================= */

async function loadAdmin(){

  if(!sb) return;


  const [
    membersResult,
    zonesResult,
    requestsResult,
    eventsResult
  ]=
  await Promise.all([

    sb
      .from('members')
      .select(
        'id,name,zone,bike,position,status,public_visible'
      )
      .order(
        'name'
      ),


    sb
      .from('zones')
      .select(
        'name,location,leader,vice_leader,admins'
      )
      .order(
        'name'
      ),


    sb
      .from('membership_requests')
      .select('*')
      .order(
        'created_at',
        {
          ascending:false
        }
      ),


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


  if(membersResult.error){

    console.error(
      membersResult.error
    );

  }else{

    adminMembers=
      membersResult.data || [];

  }


  if(zonesResult.error){

    console.error(
      zonesResult.error
    );

  }else{

    adminZones=
      zonesResult.data || [];

  }


  if(requestsResult.error){

    console.error(
      requestsResult.error
    );

  }else{

    adminRequests=
      requestsResult.data || [];

  }


  if(eventsResult.error){

    console.error(
      eventsResult.error
    );

  }else{

    adminEvents=
      eventsResult.data || [];

  }


  renderAdmin();

  populateMemberZoneDropdown();
}


/* =========================
   RENDER ADMIN
========================= */

function renderAdmin(){

  renderAdminMembers();

  renderAdminZones();

  renderRequests();

  renderAdminEvents();
}

/* =========================
   ADMIN MEMBERS
========================= */

function renderAdminMembers(){

  const box=
    $('adminMemberList');

  if(!box) return;


  const list=
    [...adminMembers].sort(
      (a,b)=>
        Number(a.id) -
        Number(b.id)
    );


  box.innerHTML=
    list.map(m=>`

      <div class="admin-row">

        <div>

          <strong>
            ${esc(m.id)} —
            ${esc(m.name)}
          </strong>

          <br>

          <small>
            ${iconSvg('pin')}
            ${esc(m.zone || 'No zone')}
            &nbsp; • &nbsp;
            ${iconSvg('bike')}
            ${esc(m.bike || 'Mio i 125')}
            &nbsp; • &nbsp;
            ${iconSvg('badge')}
            ${esc(m.position || 'Member')}
          </small>

          <br>

          <small>
            Status:
            ${esc(m.status || 'pending')}
            &nbsp; • &nbsp;
            Public:
            ${m.public_visible ? 'Yes' : 'No'}
          </small>

        </div>


        <div class="row-actions">

          <button
            class="ghost-btn edit-member"
            type="button"
            data-id="${esc(m.id)}"
          >
            Edit
          </button>

          <button
            class="danger small delete-member"
            type="button"
            data-id="${esc(m.id)}"
          >
            Delete
          </button>

        </div>

      </div>

    `).join('')

    ||

    `<p class="muted">
      No members found.
    </p>`;


  document
    .querySelectorAll(
      '.edit-member'
    )
    .forEach(btn=>{

      btn.onclick=()=>{

        editMember(
          btn.dataset.id
        );

      };

    });


  document
    .querySelectorAll(
      '.delete-member'
    )
    .forEach(btn=>{

      btn.onclick=()=>{

        deleteMember(
          btn.dataset.id
        );

      };

    });
}


/* =========================
   ADMIN ZONES
========================= */

function renderAdminZones(){

  const box=
    $('adminZoneList');

  if(!box) return;


  box.innerHTML=
    adminZones.map(z=>`

      <div class="admin-row">

        <div>

          <strong>
            ${esc(z.name)}
          </strong>

          <br>

          <small>
            ${iconSvg('pin')}
            ${esc(z.location || 'TBA')}
          </small>

          <br>

          <small>
            ${iconSvg('crown')}
            Zone Leader:
            ${esc(z.leader || 'TBA')}
          </small>

          <br>

          <small>
            ${iconSvg('star')}
            Vice Leader:
            ${esc(z.vice_leader || 'TBA')}
          </small>

          <br>

          <small>
            ${iconSvg('shield')}
            Admins:
            ${esc(z.admins || 'TBA')}
          </small>

        </div>


        <div class="row-actions">

          <button
            class="ghost-btn edit-zone"
            type="button"
            data-name="${esc(z.name)}"
          >
            Edit
          </button>

          <button
            class="danger small delete-zone"
            type="button"
            data-name="${esc(z.name)}"
          >
            Delete
          </button>

        </div>

      </div>

    `).join('')

    ||

    `<p class="muted">
      No zones found.
    </p>`;


  document
    .querySelectorAll(
      '.edit-zone'
    )
    .forEach(btn=>{

      btn.onclick=()=>{

        editZone(
          btn.dataset.name
        );

      };

    });


  document
    .querySelectorAll(
      '.delete-zone'
    )
    .forEach(btn=>{

      btn.onclick=()=>{

        deleteZone(
          btn.dataset.name
        );

      };

    });
}


/* =========================
   MEMBERSHIP REQUESTS
========================= */

function renderRequests(){

  const box=
    $('requestList');

  if(!box) return;


  box.innerHTML=
    adminRequests.map(r=>{

      const requestId=
        r.id ?? '';


      return `

        <div class="admin-row">

          <div>

            <strong>
              ${esc(r.name || 'Unnamed Applicant')}
            </strong>

            <br>

            <small>
              ${iconSvg('pin')}
              ${esc(r.zone || 'No zone')}
            </small>

            <br>

            <small>
              ${iconSvg('bike')}
              ${esc(r.bike || 'Mio i 125')}
            </small>

            ${
              r.contact
                ?
                `
                <br>
                <small>
                  Contact:
                  ${esc(r.contact)}
                </small>
                `
                :
                ''
            }

            ${
              r.message
                ?
                `
                <br>
                <small>
                  ${esc(r.message)}
                </small>
                `
                :
                ''
            }

            ${
              r.status
                ?
                `
                <br>
                <small>
                  Status:
                  ${esc(r.status)}
                </small>
                `
                :
                ''
            }

          </div>


          <div class="row-actions">

            <button
              class="ghost-btn approve-request"
              type="button"
              data-id="${esc(requestId)}"
            >
              Approve
            </button>

            <button
              class="danger small delete-request"
              type="button"
              data-id="${esc(requestId)}"
            >
              Delete
            </button>

          </div>

        </div>

      `;

    }).join('')

    ||

    `<p class="muted">
      No membership requests.
    </p>`;


  document
    .querySelectorAll(
      '.approve-request'
    )
    .forEach(btn=>{

      btn.onclick=()=>{

        approveRequest(
          btn.dataset.id
        );

      };

    });


  document
    .querySelectorAll(
      '.delete-request'
    )
    .forEach(btn=>{

      btn.onclick=()=>{

        deleteRequest(
          btn.dataset.id
        );

      };

    });
}


/* =========================
   ADMIN EVENTS
========================= */

function renderAdminEvents(){

  const box=
    $('adminEventList');

  if(!box) return;


  box.innerHTML=
    adminEvents.map(e=>`

      <div class="admin-row">

        <div>

          <strong>
            ${esc(e.title)}
          </strong>

          <br>

          <small>
            ${iconSvg('calendar')}
            ${formatDate(e.event_date)}
          </small>

          <br>

          <small>
            ${iconSvg('clock')}
            ${esc(e.event_time || 'TBA')}
          </small>

          <br>

          <small>
            ${iconSvg('pin')}
            ${esc(e.location || 'TBA')}
          </small>

          ${
            e.description
              ?
              `
              <br>
              <small>
                ${esc(e.description)}
              </small>
              `
              :
              ''
          }

        </div>


        <div class="row-actions">

          <button
            class="ghost-btn edit-event"
            type="button"
            data-id="${esc(e.id)}"
          >
            Edit
          </button>

          <button
            class="danger small delete-event"
            type="button"
            data-id="${esc(e.id)}"
          >
            Delete
          </button>

        </div>

      </div>

    `).join('')

    ||

    `<p class="muted">
      No events found.
    </p>`;


  document
    .querySelectorAll(
      '.edit-event'
    )
    .forEach(btn=>{

      btn.onclick=()=>{

        editEvent(
          btn.dataset.id
        );

      };

    });


  document
    .querySelectorAll(
      '.delete-event'
    )
    .forEach(btn=>{

      btn.onclick=()=>{

        deleteEvent(
          btn.dataset.id
        );

      };

    });
}


/* =========================
   EDIT MEMBER
========================= */

function editMember(id){

  const member=
    adminMembers.find(
      m=>String(m.id)===String(id)
    );


  if(!member) return;


  if($('memberOriginalId')){
    $('memberOriginalId').value=
      member.id ?? '';
  }


  if($('memberId')){
    $('memberId').value=
      member.id ?? '';
  }


  if($('memberName')){
    $('memberName').value=
      member.name || '';
  }


  if($('memberZone')){
    $('memberZone').value=
      member.zone || '';
  }


  if($('memberBike')){
    $('memberBike').value=
      member.bike || 'Mio i 125';
  }


  if($('memberPosition')){
    $('memberPosition').value=
      member.position || 'Member';
  }


  if($('memberStatus')){
    $('memberStatus').value=
      member.status || 'verified';
  }


  if($('memberPublic')){
    $('memberPublic').checked=
      member.public_visible !== false;
  }


  if($('memberFormTitle')){
    $('memberFormTitle').textContent=
      'Edit Member';
  }


  if($('memberSubmit')){
    $('memberSubmit').textContent=
      'Update Member';
  }


  if($('memberCancel')){
    $('memberCancel').hidden=false;
  }


  message(
    'memberMessage',
    ''
  );


  const form=$('memberForm');

  if(form){

    form.scrollIntoView({
      behavior:'smooth',
      block:'center'
    });

  }
}


/* =========================
   EDIT ZONE
========================= */

function editZone(name){

  const zone=
    adminZones.find(
      z=>z.name===name
    );


  if(!zone) return;


  if($('zoneOriginalName')){
    $('zoneOriginalName').value=
      zone.name || '';
  }


  if($('zoneName')){
    $('zoneName').value=
      zone.name || '';
  }


  if($('zoneLocation')){
    $('zoneLocation').value=
      zone.location || '';
  }


  if($('zoneLeader')){
    $('zoneLeader').value=
      zone.leader || '';
  }


  if($('zoneViceLeader')){
    $('zoneViceLeader').value=
      zone.vice_leader || '';
  }


  if($('zoneAdmins')){
    $('zoneAdmins').value=
      zone.admins || '';
  }


  if($('zoneCancel')){
    $('zoneCancel').hidden=false;
  }


  message(
    'zoneMessage',
    ''
  );


  const form=$('zoneForm');

  if(form){

    form.scrollIntoView({
      behavior:'smooth',
      block:'center'
    });

  }
}


/* =========================
   EDIT EVENT
========================= */

function editEvent(id){

  const event=
    adminEvents.find(
      e=>String(e.id)===String(id)
    );


  if(!event) return;


  if($('eventId')){
    $('eventId').value=
      event.id ?? '';
  }


  if($('eventTitle')){
    $('eventTitle').value=
      event.title || '';
  }


  if($('eventDate')){
    $('eventDate').value=
      event.event_date || '';
  }


  if($('eventTime')){
    $('eventTime').value=
      event.event_time || '';
  }


  if($('eventLocation')){
    $('eventLocation').value=
      event.location || '';
  }


  if($('eventDescription')){
    $('eventDescription').value=
      event.description || '';
  }


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


  message(
    'eventMessage',
    ''
  );


  const form=$('eventForm');

  if(form){

    form.scrollIntoView({
      behavior:'smooth',
      block:'center'
    });

  }
}

/* =========================
   DELETE MEMBER
========================= */

async function deleteMember(id){

  if(!sb) return;


  const member=
    adminMembers.find(
      m=>String(m.id)===String(id)
    );


  if(!member) return;


  const confirmed=
    confirm(
      `Delete ${member.name} (${member.id})?`
    );


  if(!confirmed) return;


  const {
    error
  }=
  await sb
    .from('members')
    .delete()
    .eq('id',id);


  if(error){

    console.error(error);

    alert(
      `Could not delete member: ${error.message}`
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

  if(!sb) return;


  const confirmed=
    confirm(
      `Delete zone "${name}"?`
    );


  if(!confirmed) return;


  const {
    error
  }=
  await sb
    .from('zones')
    .delete()
    .eq('name',name);


  if(error){

    console.error(error);

    alert(
      `Could not delete zone: ${error.message}`
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

  if(!sb) return;


  const event=
    adminEvents.find(
      e=>String(e.id)===String(id)
    );


  if(!event) return;


  const confirmed=
    confirm(
      `Delete event "${event.title}"?`
    );


  if(!confirmed) return;


  const {
    error
  }=
  await sb
    .from('events')
    .delete()
    .eq('id',id);


  if(error){

    console.error(error);

    alert(
      `Could not delete event: ${error.message}`
    );

    return;
  }


  resetEventForm();

  await loadAdmin();
  await loadPublic();
}


/* =========================
   APPROVE MEMBERSHIP REQUEST
========================= */

async function approveRequest(id){

  if(!sb) return;


  const request=
    adminRequests.find(
      r=>String(r.id)===String(id)
    );


  if(!request) return;


  const confirmed=
    confirm(
      `Approve membership request from ${request.name}?`
    );


  if(!confirmed) return;


  const memberData={

    name:
      request.name || '',

    zone:
      request.zone || '',

    bike:
      request.bike || 'Mio i 125',

    position:
      'Member',

    status:
      'verified',

    public_visible:
      true

  };


  /*
    If your membership request already contains
    a requested member/badge ID, use it.
  */

  if(
    request.member_id !== undefined &&
    request.member_id !== null &&
    request.member_id !== ''
  ){

    memberData.id=
      request.member_id;

  }


  const {
    error:memberError
  }=
  await sb
    .from('members')
    .insert(memberData);


  if(memberError){

    console.error(memberError);

    alert(
      `Could not approve request: ${memberError.message}`
    );

    return;
  }


  const {
    error:requestError
  }=
  await sb
    .from('membership_requests')
    .update({
      status:'approved'
    })
    .eq('id',id);


  if(requestError){

    console.error(requestError);

  }


  await loadAdmin();
  await loadPublic();
}


/* =========================
   DELETE MEMBERSHIP REQUEST
========================= */

async function deleteRequest(id){

  if(!sb) return;


  const request=
    adminRequests.find(
      r=>String(r.id)===String(id)
    );


  if(!request) return;


  const confirmed=
    confirm(
      `Delete membership request from ${request.name || 'this applicant'}?`
    );


  if(!confirmed) return;


  const {
    error
  }=
  await sb
    .from('membership_requests')
    .delete()
    .eq('id',id);


  if(error){

    console.error(error);

    alert(
      `Could not delete request: ${error.message}`
    );

    return;
  }


  await loadAdmin();
}


/* =========================
   VERIFY MEMBER
========================= */

async function verifyMember(){

  const input=
    $('verifyInput');


  const result=
    $('verifyResult');


  if(
    !input ||
    !result
  ) return;


  const id=
    input.value.trim();


  if(!id){

    result.className=
      'result bad';

    result.innerHTML=
      'Enter a member ID.';

    return;
  }


  if(!sb){

    result.className=
      'result bad';

    result.innerHTML=
      'Database is not connected.';

    return;
  }


  result.className=
    'result';

  result.innerHTML=
    'Checking member...';


  const {
    data,
    error
  }=
  await sb
    .from('members')
    .select(
      'id,name,zone,bike,position,status'
    )
    .eq('id',id)
    .eq('status','verified')
    .maybeSingle();


  if(
    error ||
    !data
  ){

    result.className=
      'result bad';

    result.innerHTML=`
      <strong>
        Member not found
      </strong>
      <br>
      The ID you entered is not currently verified.
    `;

    return;
  }


  result.className=
    'result ok';


  result.innerHTML=`

    <strong>
      ✓ VERIFIED MEMBER
    </strong>

    <br><br>

    <b>
      ${esc(data.name)}
    </b>

    <br>

    Member ID:
    ${esc(data.id)}

    <br>

    ${iconSvg('pin')}
    ${esc(data.zone || 'No zone')}

    <br>

    ${iconSvg('bike')}
    ${esc(data.bike || 'Mio i 125')}

    <br>

    ${iconSvg('badge')}
    ${esc(data.position || 'Member')}

  `;
}


/* =========================
   LOGIN
========================= */

async function loginAdmin(e){

  e.preventDefault();


  if(!sb){

    message(
      'loginMessage',
      'Supabase is not connected.',
      'error'
    );

    return;
  }


  const email=
    $('adminEmail')
      ? $('adminEmail').value.trim()
      : '';


  const password=
    $('adminPassword')
      ? $('adminPassword').value
      : '';


  if(
    !email ||
    !password
  ){

    message(
      'loginMessage',
      'Enter your email and password.',
      'error'
    );

    return;
  }


  message(
    'loginMessage',
    'Signing in...'
  );


  const {
    data,
    error
  }=
  await sb.auth.signInWithPassword({
    email,
    password
  });


  if(error){

    message(
      'loginMessage',
      error.message,
      'error'
    );

    return;
  }


  const user=
    data.user;


  const {
    data:admin,
    error:adminError
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
    adminError ||
    !admin
  ){

    await sb.auth.signOut();


    message(
      'loginMessage',
      'This account is not authorized as a BOM3 administrator.',
      'error'
    );


    return;
  }


  message(
    'loginMessage',
    ''
  );


  setLoggedIn(
    user,
    admin
  );


  await loadAdmin();
}


/* =========================
   LOGOUT
========================= */

async function logoutAdmin(){

  if(!sb) return;


  await sb.auth.signOut();


  setLoggedOut();


  adminMembers=[];
  adminZones=[];
  adminRequests=[];
  adminEvents=[];


  resetMemberForm();
  resetZoneForm();
  resetEventForm();
}


/* =========================
   SAVE MEMBER
========================= */

async function saveMember(e){

  e.preventDefault();


  if(!sb) return;


  const originalId=
    $('memberOriginalId')
      ? $('memberOriginalId').value.trim()
      : '';


  const id=
    $('memberId')
      ? $('memberId').value.trim()
      : '';


  const name=
    $('memberName')
      ? $('memberName').value.trim()
      : '';


  const zone=
    $('memberZone')
      ? $('memberZone').value.trim()
      : '';


  const bike=
    $('memberBike')
      ? $('memberBike').value.trim()
      : 'Mio i 125';


  const position=
    $('memberPosition')
      ? $('memberPosition').value.trim()
      : 'Member';


  const status=
    $('memberStatus')
      ? $('memberStatus').value.trim()
      : 'verified';


  const publicVisible=
    $('memberPublic')
      ? $('memberPublic').checked
      : true;


  if(
    !id ||
    !name ||
    !zone
  ){

    message(
      'memberMessage',
      'Member ID, name and zone are required.',
      'error'
    );

    return;
  }


  const payload={

    id,
    name,
    zone,

    bike:
      bike || 'Mio i 125',

    position:
      position || 'Member',

    status:
      status || 'verified',

    public_visible:
      publicVisible

  };


  message(
    'memberMessage',
    originalId
      ? 'Updating member...'
      : 'Saving member...'
  );


  let result;


  if(originalId){

    result=
      await sb
        .from('members')
        .update(payload)
        .eq(
          'id',
          originalId
        );

  }else{

    result=
      await sb
        .from('members')
        .insert(payload);

  }


  if(result.error){

    console.error(
      result.error
    );


    message(
      'memberMessage',
      result.error.message,
      'error'
    );


    return;
  }


  message(
    'memberMessage',
    originalId
      ? 'Member updated successfully.'
      : 'Member added successfully.',
    'ok'
  );


  await loadAdmin();
  await loadPublic();


  setTimeout(
    resetMemberForm,
    700
  );
}

/* =========================
   SAVE ZONE
========================= */

async function saveZone(e){

  e.preventDefault();

  if(!sb) return;


  const originalName=
    $('zoneOriginalName')
      ? $('zoneOriginalName').value.trim()
      : '';


  const name=
    $('zoneName')
      ? $('zoneName').value.trim()
      : '';


  const location=
    $('zoneLocation')
      ? $('zoneLocation').value.trim()
      : '';


  const leader=
    $('zoneLeader')
      ? $('zoneLeader').value.trim()
      : '';


  const viceLeader=
    $('zoneViceLeader')
      ? $('zoneViceLeader').value.trim()
      : '';


  const admins=
    $('zoneAdmins')
      ? $('zoneAdmins').value.trim()
      : '';


  if(
    !name ||
    !location
  ){

    message(
      'zoneMessage',
      'Zone name and location are required.',
      'error'
    );

    return;
  }


  const payload={

    name,
    location,

    leader:
      leader || 'TBA',

    vice_leader:
      viceLeader || 'TBA',

    admins:
      admins || 'TBA'

  };


  message(
    'zoneMessage',
    originalName
      ? 'Updating zone...'
      : 'Saving zone...'
  );


  let result;


  if(originalName){

    result=
      await sb
        .from('zones')
        .update(payload)
        .eq(
          'name',
          originalName
        );

  }else{

    result=
      await sb
        .from('zones')
        .insert(payload);

  }


  if(result.error){

    console.error(
      result.error
    );


    message(
      'zoneMessage',
      result.error.message,
      'error'
    );


    return;
  }


  message(
    'zoneMessage',
    originalName
      ? 'Zone updated successfully.'
      : 'Zone added successfully.',
    'ok'
  );


  await loadAdmin();
  await loadPublic();


  setTimeout(
    resetZoneForm,
    700
  );
}


/* =========================
   SAVE EVENT
========================= */

async function saveEvent(e){

  e.preventDefault();

  if(!sb) return;


  const eventId=
    $('eventId')
      ? $('eventId').value.trim()
      : '';


  const title=
    $('eventTitle')
      ? $('eventTitle').value.trim()
      : '';


  const eventDate=
    $('eventDate')
      ? $('eventDate').value
      : '';


  const eventTime=
    $('eventTime')
      ? $('eventTime').value.trim()
      : '';


  const location=
    $('eventLocation')
      ? $('eventLocation').value.trim()
      : '';


  const description=
    $('eventDescription')
      ? $('eventDescription').value.trim()
      : '';


  if(!title){

    message(
      'eventMessage',
      'Event title is required.',
      'error'
    );

    return;
  }


  const payload={

    title,

    event_date:
      eventDate || null,

    event_time:
      eventTime || null,

    location:
      location || null,

    description:
      description || null

  };


  message(
    'eventMessage',
    eventId
      ? 'Updating event...'
      : 'Saving event...'
  );


  let result;


  if(eventId){

    result=
      await sb
        .from('events')
        .update(payload)
        .eq(
          'id',
          eventId
        );

  }else{

    result=
      await sb
        .from('events')
        .insert(payload);

  }


  if(result.error){

    console.error(
      result.error
    );


    message(
      'eventMessage',
      result.error.message,
      'error'
    );


    return;
  }


  message(
    'eventMessage',
    eventId
      ? 'Event updated successfully.'
      : 'Event added successfully.',
    'ok'
  );


  await loadAdmin();
  await loadPublic();


  setTimeout(
    resetEventForm,
    700
  );
}


/* =========================
   MEMBERSHIP REQUEST FORM
========================= */

async function submitMembershipRequest(e){

  e.preventDefault();


  if(!sb){

    message(
      'requestMessage',
      'Database is not connected.',
      'error'
    );

    return;
  }


  const name=
    $('requestName')
      ? $('requestName').value.trim()
      : '';


  const zone=
    $('requestZone')
      ? $('requestZone').value.trim()
      : '';


  const bike=
    $('requestBike')
      ? $('requestBike').value.trim()
      : '';


  const contact=
    $('requestContact')
      ? $('requestContact').value.trim()
      : '';


  const requestText=
    $('requestText')
      ? $('requestText').value.trim()
      : '';


  if(
    !name ||
    !zone
  ){

    message(
      'requestMessage',
      'Your name and zone are required.',
      'error'
    );

    return;
  }


  message(
    'requestMessage',
    'Sending request...'
  );


  const payload={

    name,
    zone,

    bike:
      bike || 'Mio i 125'

  };


  if(contact){
    payload.contact=contact;
  }


  if(requestText){
    payload.message=requestText;
  }


  const {
    error
  }=
  await sb
    .from('membership_requests')
    .insert(payload);


  if(error){

    console.error(error);


    message(
      'requestMessage',
      error.message,
      'error'
    );


    return;
  }


  message(
    'requestMessage',
    'Your membership request was submitted successfully.',
    'ok'
  );


  if($('requestForm')){
    $('requestForm').reset();
  }


  populateRequestZoneDropdown();
}


/* =========================
   SEARCH LISTENERS
========================= */

if($('zoneSearch')){

  $('zoneSearch').addEventListener(
    'input',
    e=>{

      renderZones(
        e.target.value
      );

    }
  );

}


if($('memberSearch')){

  $('memberSearch').addEventListener(
    'input',
    e=>{

      renderMembers(
        e.target.value
      );

    }
  );

}


/* =========================
   VERIFY BUTTON
========================= */

if($('verifyBtn')){

  $('verifyBtn').addEventListener(
    'click',
    verifyMember
  );

}


if($('verifyInput')){

  $('verifyInput').addEventListener(
    'keydown',
    e=>{

      if(e.key==='Enter'){

        e.preventDefault();

        verifyMember();

      }

    }
  );

}


/* =========================
   CLOSE MEMBERS BUTTON
========================= */

if($('closeMembers')){

  $('closeMembers').addEventListener(
    'click',
    closeZoneMembers
  );

}


/* =========================
   ADMIN LOGIN FORM
========================= */

if($('loginForm')){

  $('loginForm').addEventListener(
    'submit',
    loginAdmin
  );

}


/* =========================
   ADMIN LOGOUT
========================= */

if($('logoutBtn')){

  $('logoutBtn').addEventListener(
    'click',
    logoutAdmin
  );

}


/* =========================
   MEMBER FORM
========================= */

if($('memberForm')){

  $('memberForm').addEventListener(
    'submit',
    saveMember
  );

}


if($('memberCancel')){

  $('memberCancel').addEventListener(
    'click',
    resetMemberForm
  );

}


/* =========================
   ZONE FORM
========================= */

if($('zoneForm')){

  $('zoneForm').addEventListener(
    'submit',
    saveZone
  );

}


if($('zoneCancel')){

  $('zoneCancel').addEventListener(
    'click',
    resetZoneForm
  );

}


/* =========================
   EVENT FORM
========================= */

if($('eventForm')){

  $('eventForm').addEventListener(
    'submit',
    saveEvent
  );

}


if($('eventCancel')){

  $('eventCancel').addEventListener(
    'click',
    resetEventForm
  );

}


/* =========================
   MEMBERSHIP REQUEST
========================= */

if($('requestForm')){

  $('requestForm').addEventListener(
    'submit',
    submitMembershipRequest
  );

}

/* =========================
   MOBILE NAVIGATION
========================= */

const menuToggle =
  $('menuToggle');

const nav =
  $('mainNav');


function closeMobileMenu(){

  if(!nav || !menuToggle) return;

  nav.classList.remove('open');

  menuToggle.classList.remove('open');

  menuToggle.setAttribute(
    'aria-expanded',
    'false'
  );
}


function toggleMobileMenu(){

  if(!nav || !menuToggle) return;

  const isOpen =
    nav.classList.toggle('open');

  menuToggle.classList.toggle(
    'open',
    isOpen
  );

  menuToggle.setAttribute(
    'aria-expanded',
    String(isOpen)
  );
}


if(menuToggle){

  menuToggle.addEventListener(
    'click',
    toggleMobileMenu
  );

}


if(nav){

  nav
    .querySelectorAll('a')
    .forEach(link=>{

      link.addEventListener(
        'click',
        closeMobileMenu
      );

    });

}


/* =========================
   CLOSE MOBILE MENU
   WHEN CLICKING OUTSIDE
========================= */

document.addEventListener(
  'click',
  e=>{

    if(
      !nav ||
      !menuToggle ||
      !nav.classList.contains('open')
    ){
      return;
    }


    if(
      nav.contains(e.target) ||
      menuToggle.contains(e.target)
    ){
      return;
    }


    closeMobileMenu();
  }
);


/* =========================
   CLOSE MOBILE MENU
   WITH ESCAPE KEY
========================= */

document.addEventListener(
  'keydown',
  e=>{

    if(e.key === 'Escape'){
      closeMobileMenu();
    }

  }
);


/* =========================
   WINDOW RESIZE
========================= */

window.addEventListener(
  'resize',
  ()=>{

    if(window.innerWidth > 720){
      closeMobileMenu();
    }

  }
);


/* =========================
   SMOOTH INTERNAL LINKS
========================= */

document
  .querySelectorAll('a[href^="#"]')
  .forEach(link=>{

    link.addEventListener(
      'click',
      e=>{

        const href =
          link.getAttribute('href');


        if(
          !href ||
          href === '#'
        ){
          return;
        }


        const target =
          document.querySelector(href);


        if(!target){
          return;
        }


        e.preventDefault();


        target.scrollIntoView({
          behavior:'smooth',
          block:'start'
        });


        if(
          history.pushState
        ){

          history.pushState(
            null,
            '',
            href
          );

        }

      }
    );

  });


/* =========================
   SUPABASE AUTH STATE
========================= */

if(sb){

  sb.auth.onAuthStateChange(
    async (
      event,
      session
    )=>{

      if(
        event === 'SIGNED_OUT' ||
        !session
      ){

        setLoggedOut();

        return;
      }


      if(
        event === 'SIGNED_IN'
      ){

        await checkAdmin();

      }

    }
  );

}


/* =========================
   INITIAL UI STATE
========================= */

function initializeUI(){

  /*
    Keep the member section hidden
    until a zone is selected.
  */

  if($('members')){

    $('members').hidden =
      !selectedZone;

  }


  /*
    Make sure the mobile menu
    starts closed.
  */

  closeMobileMenu();


  /*
    Reset admin forms.
  */

  resetMemberForm();
  resetZoneForm();
  resetEventForm();


  /*
    Render empty/default content
    while Supabase is loading.
  */

  renderAll();
}


/* =========================
   START WEBSITE
========================= */

async function startWebsite(){

  initializeUI();


  /*
    Load all public website data:
    zones, verified members and events.
  */

  await loadPublic();


  /*
    Check whether an administrator
    is already logged in.
  */

  if(sb){

    await checkAdmin();

  }else{

    setLoggedOut();

  }
}


/* =========================
   RUN
========================= */

startWebsite();
