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

    pin:
      '<path d="M12 21s6-5.2 6-11a6 6 0 1 0-12 0c0 5.8 6 11 6 11Z"/><circle cx="12" cy="10" r="2.3"/>',

    crown:
      '<path d="M3 8l4 3 5-6 5 6 4-3-2 10H5L3 8Z"/><path d="M5 21h14"/>',

    star:
      '<path d="M12 3l2.8 5.7 6.2.9-4.5 4.4 1.1 6.2L12 17.3 6.4 20.2 7.5 14 3 9.6l6.2-.9L12 3Z"/>',

    shield:
      '<path d="M12 3l7 3v5c0 4.6-2.8 7.9-7 10-4.2-2.1-7-5.4-7-10V6l7-3Z"/><path d="M9 12l2 2 4-4"/>',

    bike:
      '<circle cx="6" cy="17" r="3"/><circle cx="18" cy="17" r="3"/><path d="M6 17l4-7h4l4 7M9 10h5l2 3M11 7h3"/>',

    badge:
      '<circle cx="12" cy="9" r="5"/><path d="M9 14l-1 7 4-2 4 2-1-7"/><path d="M10 9l1.3 1.3L14 7.8"/>',

    calendar:
      '<rect x="3" y="5" width="18" height="16" rx="2"/><path d="M8 3v4M16 3v4M3 10h18"/><path d="M7 14h2M11 14h2M15 14h2M7 18h2M11 18h2M15 18h2"/>',

    clock:
      '<circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/>',

    users:
      '<circle cx="9" cy="9" r="3"/><circle cx="17" cy="8" r="2.5"/><path d="M3.5 20c.5-4 2.5-6 5.5-6s5 2 5.5 6M14 14c2.8.2 4.8 2.1 5.3 5"/>'

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
let archivedMembers = [];
let currentAdminRole = '';
let currentAdminUserId = '';
let adminAssignments = [];
let adminAccounts = [];
let auditLogs = [];

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
  'zone_id,name,location,leader,vice_leader,admins,logo_url,cover_url,status'
)
      .order('name'),


       sb
      .from('members')
      .select(
        'id,name,zone,bike,position,status'
      )
      .eq('status','verified')
      .eq('public_visible',true)
      .is(
        'archived_at',
        null
      )
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

  const select =
    $('memberZone');


  if(!select) return;


  const currentValue =
    select.value;


  const zones =
    currentAdminRole
      ? adminZones
      : publicZones;


  select.innerHTML = `
    <option value="">
      Select Zone
    </option>

    ${zones.map(z => `
      <option value="${esc(z.name)}">
        ${esc(z.name)}
      </option>
    `).join('')}
  `;


  if(
    currentValue &&
    zones.some(
      z => z.name === currentValue
    )
  ){

    select.value =
      currentValue;

  }
}


/* =========================
   REQUEST ZONE DROPDOWN
========================= */

function populateRequestZoneDropdown(){

  const select =
    $('requestZone');


  if(!select) return;


  const currentValue =
    select.value;


  select.innerHTML = `

    <option value="">
      Select Zone
    </option>

    ${publicZones.map(z => `

      <option value="${esc(z.name)}">
        ${esc(z.name)}
      </option>

    `).join('')}

  `;


  if(
    currentValue &&
    publicZones.some(
      z => z.name === currentValue
    )
  ){

    select.value =
      currentValue;

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


  const grid=
    $('zoneGrid');


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


      const isActive=
        (z.status || 'active') === 'active';


      return `

        <article
          class="card zone-card"
          data-zone="${esc(z.name)}"
          role="button"
          tabindex="0"
          title="View ${esc(z.name)} members"
        >

          <div class="zone-media">

            ${
              z.cover_url
                ? `
                  <img
                    class="zone-cover-img"
                    src="${esc(z.cover_url)}"
                    alt="${esc(z.name)} cover photo"
                    loading="lazy"
                  >
                `
                : `
                  <div
                    class="zone-cover-placeholder"
                    aria-hidden="true"
                  ></div>
                `
            }


            ${
              z.logo_url
                ? `
                  <div class="zone-logo-overlay">
                    <img
                      src="${esc(z.logo_url)}"
                      alt="${esc(z.name)} logo"
                      loading="lazy"
                    >
                  </div>
                `
                : ''
            }

          </div>


          <div class="zone-body">

            <span class="tag zone-status-tag ${isActive ? 'active' : 'inactive'}">

              <span
                class="zone-status-dot"
                aria-hidden="true"
              ></span>

              ${
                isActive
                  ? 'ACTIVE ZONE'
                  : 'INACTIVE ZONE'
              }

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

              <b>
                Zone Leader:
              </b>

              ${esc(
                z.leader || 'TBA'
              )}
            </p>


            <p>
              ${iconSvg('star')}

              <b>
                Vice Leader:
              </b>

              ${esc(
                z.vice_leader || 'TBA'
              )}
            </p>


            <p>

              ${iconSvg('shield')}

              <b>
                Admins:
              </b>

              <br>

              ${
                z.admins &&
                z.admins !== 'TBA'

                  ? z.admins
                      .split(',')
                      .map(
                        admin =>
                          esc(
                            admin.trim()
                          )
                      )
                      .join('<br>')

                  : 'TBA'
              }

            </p>


            <span class="tag">
              ${count} verified members
            </span>

          </div>

        </article>

      `;

    }).join('')

    ||

    `
      <p class="muted">
        No zones found.
      </p>
    `;


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

  const grid=
    $('memberGrid');


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


  list.sort(
    (a,b)=>
      Number(a.id) -
      Number(b.id)
  );


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

    `
      <p class="muted">
        No verified members found in this zone.
      </p>
    `;
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

  const grid=
    $('eventGrid');


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

            ? `
              <p>
                ${esc(
                  e.description
                )}
              </p>
            `

            : ''
        }

      </article>

    `).join('')

    ||

    `
      <p class="muted">
        No events yet.
      </p>
    `;
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


  if($('memberId')){

    $('memberId').readOnly=false;

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

  const form=
    $('zoneForm');


  if(form){

    form.reset();

  }


  if($('zoneOriginalName')){

    $('zoneOriginalName').value='';

  }


  if($('zoneStatus')){

    $('zoneStatus').value=
      'active';

  }


  if($('zoneCoverFile')){

    $('zoneCoverFile').value='';

  }


  if($('zoneCoverUrl')){

    $('zoneCoverUrl').value='';

  }


  if($('zoneCoverPreview')){

    $('zoneCoverPreview').src='';

  }


  if($('zoneCoverPreviewWrap')){

    $('zoneCoverPreviewWrap').hidden=
      true;

  }


  if($('zoneLogoFile')){

    $('zoneLogoFile').value='';

  }


  if($('zoneLogoUrl')){

    $('zoneLogoUrl').value='';

  }


  if($('zoneLogoPreview')){

    $('zoneLogoPreview').src='';

  }


  if($('zoneLogoPreviewWrap')){

    $('zoneLogoPreviewWrap').hidden=
      true;

  }


  if($('zoneCancel')){

    $('zoneCancel').hidden=true;

  }


  message(
    'zoneMessage',
    ''
  );


  if($('zoneFormTitle')){

    $('zoneFormTitle').textContent=
      currentAdminRole === 'super_admin'
        ? 'Add / Edit Zone'
        : 'Edit Assigned Zone';

  }


  if(form && currentAdminRole){

    form.hidden=
      currentAdminRole !== 'super_admin';

  }

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
   'user_id,email,role'
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

  currentAdminRole='';
  currentAdminUserId='';
  adminMembers=[];
  adminZones=[];
  adminRequests=[];
  adminEvents=[];
  archivedMembers=[];
  adminAssignments=[];
  adminAccounts=[];
  auditLogs=[];


  resetMemberForm();
  resetZoneForm();
  resetEventForm();


  if($('loginPanel')){

    $('loginPanel').hidden=false;

  }


  if($('dashboard')){

    $('dashboard').hidden=true;

  }


  if($('adminEmail')){

    $('adminEmail').textContent='';

  }


  if($('adminRoleTag')){

    $('adminRoleTag').textContent='ADMIN';

  }


  [
    'recoveryPanel',
    'adminAccountsPanel',
    'auditPanel',
    'eventRecordsPanel'
  ].forEach(id=>{

    if($(id)){
      $(id).hidden=true;
    }

  });

}


function setLoggedIn(user,admin){

  currentAdminRole=
    admin.role || 'zone_admin';

  currentAdminUserId=
    user.id;

  const isSuper=
    currentAdminRole === 'super_admin';


  if(!isSuper){

    resetZoneForm();
    resetEventForm();

  }


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


  if($('adminRoleTag')){

    $('adminRoleTag').textContent=
      isSuper
        ? 'SUPER ADMIN'
        : 'ZONE ADMIN';

  }


  if($('zoneManagementEyebrow')){

    $('zoneManagementEyebrow').textContent=
      isSuper
        ? 'NATIONWIDE MANAGEMENT'
        : 'ASSIGNED ZONES';

  }


  if($('zoneManagementTitle')){

    $('zoneManagementTitle').textContent=
      isSuper
        ? 'Zone Records'
        : 'My Zones';

  }


  if($('zoneFormTitle')){

    $('zoneFormTitle').textContent=
      isSuper
        ? 'Add / Edit Zone'
        : 'Edit Assigned Zone';

  }


  if($('zoneForm')){

    $('zoneForm').hidden=
      !isSuper;

  }


  if($('eventForm')){

    $('eventForm').hidden=
      !isSuper;

  }


  if($('eventRecordsPanel')){

    $('eventRecordsPanel').hidden=
      !isSuper;

  }


  if($('recoveryPanel')){

    $('recoveryPanel').hidden=
      !isSuper;

  }


  if($('adminAccountsPanel')){

    $('adminAccountsPanel').hidden=
      !isSuper;

  }


  if($('auditPanel')){

    $('auditPanel').hidden=
      !isSuper;

  }

}


/* =========================
   LOAD ADMIN DATA
========================= */

async function loadAdmin(){

  if(!sb || !currentAdminUserId) return;


  const assignmentResult=
    await sb
      .from('admin_zones')
      .select(
        'admin_user_id,zone_id'
      );


  if(assignmentResult.error){

    console.error(
      assignmentResult.error
    );

    message(
      'loginMessage',
      'Could not load admin zone assignments.',
      'error'
    );

    return;
  }


  adminAssignments=
    assignmentResult.data || [];


  const isSuper=
    currentAdminRole === 'super_admin';


  const allowedZoneIds=
    new Set(
      adminAssignments
        .filter(a=>
          a.admin_user_id === currentAdminUserId
        )
        .map(a=>
          String(a.zone_id)
        )
    );


  const eventPromise=
    isSuper
      ? sb
          .from('events')
          .select('*')
          .order(
            'event_date',
            {
              ascending:true,
              nullsFirst:false
            }
          )
      : Promise.resolve({
          data:[],
          error:null
        });


  const archivedPromise=
    isSuper
      ? sb
          .from('members')
          .select('*')
          .not(
            'archived_at',
            'is',
            null
          )
          .order(
            'archived_at',
            {
              ascending:false
            }
          )
      : Promise.resolve({
          data:[],
          error:null
        });


  const adminAccountsPromise=
    isSuper
      ? sb
          .from('admins')
          .select(
            'user_id,email,role'
          )
          .order('email')
      : Promise.resolve({
          data:[],
          error:null
        });


  const auditPromise=
    isSuper
      ? sb
          .from('audit_logs')
          .select(
            'id,created_at,actor_email,action,entity_type,entity_id,zone_id'
          )
          .order(
            'created_at',
            {
              ascending:false
            }
          )
          .limit(50)
      : Promise.resolve({
          data:[],
          error:null
        });


  const [m,z,r,e,a,accounts,logs] =
    await Promise.all([

      sb
        .from('members')
        .select('*')
        .is(
          'archived_at',
          null
        )
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
        .eq(
          'status',
          'pending'
        )
        .order(
          'submitted_at',
          {
            ascending:true
          }
        ),

      eventPromise,
      archivedPromise,
      adminAccountsPromise,
      auditPromise

    ]);


  if(
    m.error ||
    z.error ||
    r.error ||
    e.error ||
    a.error ||
    accounts.error ||
    logs.error
  ){

    console.error(
      m.error ||
      z.error ||
      r.error ||
      e.error ||
      a.error ||
      accounts.error ||
      logs.error
    );


    message(
      'loginMessage',
      'Could not load admin records. Check RLS policies.',
      'error'
    );

    return;
  }


  const allZones=
    z.data || [];

  const allMembers=
    m.data || [];

  const allRequests=
    r.data || [];


  adminZones=
    isSuper
      ? allZones
      : allZones.filter(z=>
          allowedZoneIds.has(
            String(z.zone_id)
          )
        );


  adminMembers=
    isSuper
      ? allMembers
      : allMembers.filter(m=>
          allowedZoneIds.has(
            String(m.zone_id)
          )
        );


  adminRequests=
    isSuper
      ? allRequests
      : allRequests.filter(r=>
          allowedZoneIds.has(
            String(r.zone_id)
          )
        );


  adminEvents=
    isSuper
      ? e.data || []
      : [];


  archivedMembers=
    isSuper
      ? a.data || []
      : [];


  adminAccounts=
    isSuper
      ? accounts.data || []
      : [];


  auditLogs=
    isSuper
      ? logs.data || []
      : [];


  populateMemberZoneDropdown();

  renderAdminLists();
}


/* =========================
   ADMIN LISTS
========================= */

function renderAdminLists(){

  const zoneList=
    $('zoneManagementList');

  const eventList=
    $('adminEventList');

  const recoveryList=
    $('archivedMemberList');

  const adminAccountList=
    $('adminAccountList');

  const auditList=
    $('auditLogList');

  const isSuper=
    currentAdminRole === 'super_admin';


  if(zoneList){

    zoneList.innerHTML=
      adminZones.length

      ?

      adminZones.map(z=>{

        const zoneMembers=
          adminMembers.filter(m=>
            String(m.zone_id) ===
            String(z.zone_id)
          );

        const zoneRequests=
          adminRequests.filter(r=>
            String(r.zone_id) ===
            String(z.zone_id)
          );


        return `

          <details class="panel admin-list">

            <summary>

              <strong>
                ${esc(z.name)}
              </strong>

              &nbsp;

              <span class="tag">
                ${zoneRequests.length} Requests
              </span>

              <span class="tag">
                ${zoneMembers.length} Members
              </span>

            </summary>


            <div class="form-actions">

              <button
                type="button"
                class="ghost-btn small"
                data-zone-tab="overview"
                data-zone-id="${esc(z.zone_id)}"
              >
                Overview
              </button>

              <button
                type="button"
                class="ghost-btn small"
                data-zone-tab="requests"
                data-zone-id="${esc(z.zone_id)}"
              >
                Requests ${zoneRequests.length}
              </button>

              <button
                type="button"
                class="ghost-btn small"
                data-zone-tab="members"
                data-zone-id="${esc(z.zone_id)}"
              >
                Members ${zoneMembers.length}
              </button>

            </div>


            <div
              data-zone-pane="overview"
              data-zone-id="${esc(z.zone_id)}"
            >

              <div class="admin-table">

                <div class="admin-row">

                  <div>

                    <strong>
                      ${esc(z.name)}
                    </strong>

                    <br>

                    <small>

                      ${iconSvg('pin')}
                      ${esc(z.location)}

                      <br>

                      ${iconSvg('crown')}
                      Zone Leader:
                      ${esc(z.leader || 'TBA')}

                      <br>

                      ${iconSvg('star')}
                      Vice Leader:
                      ${esc(z.vice_leader || 'TBA')}

                      <br>

                      ${iconSvg('shield')}
                      Admins:
                      ${esc(z.admins || 'TBA')}

                      <br>

                      Status:
                      ${esc(z.status || 'active')}

                    </small>

                  </div>


                  <div class="row-actions">

                    <button
                      type="button"
                      class="ghost-btn"
                      data-edit-zone="${esc(z.name)}"
                    >
                      Edit Zone
                    </button>

                    ${
                      isSuper
                        ? `
                          <button
                            type="button"
                            class="danger small"
                            data-delete-zone="${esc(z.name)}"
                          >
                            Delete Zone
                          </button>
                        `
                        : ''
                    }

                  </div>

                </div>

              </div>

            </div>


            <div
              data-zone-pane="requests"
              data-zone-id="${esc(z.zone_id)}"
              hidden
            >

              ${
                zoneRequests.length

                ? `
                  <div class="admin-table">

                    ${zoneRequests.map(r=>`

                      <div class="admin-row">

                        <div>

                          <strong>
                            ${esc(r.member_id)}
                          </strong>

                          · ${esc(r.name)}

                          <br>

                          <small>
                            ${iconSvg('bike')}
                            ${esc(r.bike)}
                          </small>

                        </div>


                        <div class="row-actions">

                          <button
                            type="button"
                            class="btn small"
                            data-approve-request="${r.id}"
                          >
                            Approve
                          </button>

                          <button
                            type="button"
                            class="danger small"
                            data-reject-request="${r.id}"
                          >
                            Reject
                          </button>

                        </div>

                      </div>

                    `).join('')}

                  </div>
                `

                : `
                  <p class="muted">
                    No pending requests for this zone.
                  </p>
                `
              }

            </div>


            <div
              data-zone-pane="members"
              data-zone-id="${esc(z.zone_id)}"
              hidden
            >

              ${
                zoneMembers.length

                ? `
                  <div class="admin-table">

                    ${zoneMembers.map(m=>`

                      <div class="admin-row">

                        <div>

                          <strong>
                            ${esc(m.id)}
                          </strong>

                          · ${esc(m.name)}

                          <br>

                          <small>

                            ${iconSvg('badge')}
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
                            type="button"
                            class="ghost-btn"
                            data-edit-member="${esc(m.id)}"
                          >
                            Edit
                          </button>

                          <button
                            type="button"
                            class="danger small"
                            data-archive-member="${esc(m.id)}"
                          >
                            Archive
                          </button>

                        </div>

                      </div>

                    `).join('')}

                  </div>
                `

                : `
                  <p class="muted">
                    No member records for this zone.
                  </p>
                `
              }

            </div>

          </details>

        `;

      }).join('')

      :

      `<p class="muted">
        ${
          isSuper
            ? 'No zones in the database yet.'
            : 'No zones are assigned to this admin account.'
        }
      </p>`;

  }


  if(eventList){

    eventList.innerHTML=
      isSuper && adminEvents.length

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

                ${iconSvg('calendar')}
                ${formatDate(e.event_date)}

                ·

                ${iconSvg('clock')}
                ${esc(e.event_time || 'TBA')}

                ·

                ${iconSvg('pin')}
                ${esc(e.location || 'TBA')}

              </small>

            </div>


            <div class="row-actions">

              <button
                type="button"
                class="ghost-btn"
                data-edit-event="${e.id}"
              >
                Edit
              </button>

              <button
                type="button"
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


  if(recoveryList){

    recoveryList.innerHTML=
      isSuper && archivedMembers.length

      ?

      `<div class="admin-table">

        ${archivedMembers.map(m=>{

          const archivedDate=
            m.archived_at
              ? new Date(
                  m.archived_at
                ).toLocaleString()
              : 'Unknown';

          return `

            <div class="admin-row">

              <div>

                <strong>
                  ${esc(m.id)}
                </strong>

                · ${esc(m.name)}

                <br>

                <small>

                  ${iconSvg('pin')}
                  ${esc(m.zone)}

                  ·

                  ${iconSvg('badge')}
                  ${esc(m.position || 'Member')}

                  <br>

                  Archived:
                  ${esc(archivedDate)}

                  ${
                    m.archive_reason
                      ? `
                        <br>
                        Reason:
                        ${esc(m.archive_reason)}
                      `
                      : ''
                  }

                </small>

              </div>


              <div class="row-actions">

                <button
                  type="button"
                  class="ghost-btn"
                  data-restore-member="${esc(m.id)}"
                >
                  Restore
                </button>

                <button
                  type="button"
                  class="danger small"
                  data-permanent-delete-member="${esc(m.id)}"
                >
                  Permanently Delete
                </button>

              </div>

            </div>

          `;

        }).join('')}

      </div>`

      :

      `<p class="muted">
        No archived members.
      </p>`;

  }


  if(adminAccountList){

    adminAccountList.innerHTML=
      isSuper && adminAccounts.length

      ?

      `<div class="admin-table">

        ${adminAccounts.map(a=>{

          const assignedZoneNames=
            a.role === 'super_admin'
              ? ['All zones']
              : adminAssignments
                  .filter(x=>
                    x.admin_user_id === a.user_id
                  )
                  .map(x=>{

                    const zone=
                      adminZones.find(z=>
                        String(z.zone_id) ===
                        String(x.zone_id)
                      );

                    return zone
                      ? zone.name
                      : null;

                  })
                  .filter(Boolean);


          return `

            <div class="admin-row">

              <div>

                <strong>
                  ${esc(a.email || a.user_id)}
                </strong>

                <br>

                <small>

                  Role:
                  ${esc(
                    a.role === 'super_admin'
                      ? 'Super Admin'
                      : 'Zone Admin'
                  )}

                  <br>

                  Zones:
                  ${esc(
                    assignedZoneNames.length
                      ? assignedZoneNames.join(', ')
                      : 'No zone assignment'
                  )}

                </small>

              </div>

            </div>

          `;

        }).join('')}

      </div>`

      :

      `<p class="muted">
        No admin accounts found.
      </p>`;

  }


  if(auditList){

    auditList.innerHTML=
      isSuper && auditLogs.length

      ?

      `<div class="admin-table">

        ${auditLogs.map(log=>{

          const zone=
            adminZones.find(z=>
              String(z.zone_id) ===
              String(log.zone_id)
            );

          const action=
            String(log.action || '')
              .replace(/_/g,' ');

          const when=
            log.created_at
              ? new Date(
                  log.created_at
                ).toLocaleString()
              : 'Unknown';


          return `

            <div class="admin-row">

              <div>

                <strong>
                  ${esc(action)}
                </strong>

                · ${esc(log.entity_type || 'record')}

                ${
                  log.entity_id
                    ? ` · ${esc(log.entity_id)}`
                    : ''
                }

                <br>

                <small>

                  ${esc(log.actor_email || 'System / Admin')}

                  · ${esc(when)}

                  ${
                    zone
                      ? ` · ${iconSvg('pin')} ${esc(zone.name)}`
                      : ''
                  }

                </small>

              </div>

            </div>

          `;

        }).join('')}

      </div>`

      :

      `<p class="muted">
        No activity has been recorded yet.
      </p>`;

  }


  document
    .querySelectorAll(
      '[data-zone-tab]'
    )
    .forEach(b=>{

      b.onclick=()=>{

        const zoneId=
          b.dataset.zoneId;

        const tab=
          b.dataset.zoneTab;

        document
          .querySelectorAll(
            '[data-zone-pane]'
          )
          .forEach(p=>{

            if(
              p.dataset.zoneId === zoneId
            ){

              p.hidden=
                p.dataset.zonePane !== tab;

            }

          });

      };

    });


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
      '[data-archive-member]'
    )
    .forEach(
      b=>
        b.onclick=()=>
          archiveMember(
            b.dataset.archiveMember
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


  document
    .querySelectorAll(
      '[data-restore-member]'
    )
    .forEach(
      b=>
        b.onclick=()=>
          restoreMember(
            b.dataset.restoreMember
          )
    );


  document
    .querySelectorAll(
      '[data-permanent-delete-member]'
    )
    .forEach(
      b=>
        b.onclick=()=>
          permanentlyDeleteMember(
            b.dataset.permanentDeleteMember
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
      x=>String(x.id)===String(id)
    );


  if(!m) return;


  populateMemberZoneDropdown();


  $('memberOriginalId').value=
    m.id;


  $('memberId').value=
    m.id;


  $('memberId').readOnly=
    true;


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


  if($('zoneStatus')){

    $('zoneStatus').value=
      z.status || 'active';

  }


  if($('zoneCoverUrl')){

    $('zoneCoverUrl').value=
      z.cover_url || '';

  }


  if($('zoneCoverFile')){

    $('zoneCoverFile').value='';

  }


  if(
    $('zoneCoverPreview') &&
    $('zoneCoverPreviewWrap')
  ){

    if(z.cover_url){

      $('zoneCoverPreview').src=
        z.cover_url;

      $('zoneCoverPreviewWrap').hidden=
        false;

    }else{

      $('zoneCoverPreview').src='';

      $('zoneCoverPreviewWrap').hidden=
        true;

    }

  }


  if($('zoneLogoUrl')){

    $('zoneLogoUrl').value=
      z.logo_url || '';

  }


  if($('zoneLogoFile')){

    $('zoneLogoFile').value='';

  }


  if(
    $('zoneLogoPreview') &&
    $('zoneLogoPreviewWrap')
  ){

    if(z.logo_url){

      $('zoneLogoPreview').src=
        z.logo_url;

      $('zoneLogoPreviewWrap').hidden=
        false;

    }else{

      $('zoneLogoPreview').src='';

      $('zoneLogoPreviewWrap').hidden=
        true;

    }

  }


  $('zoneCancel').hidden=
    false;


  if($('zoneForm')){

    $('zoneForm').hidden=false;

  }


  if($('zoneFormTitle')){

    $('zoneFormTitle').textContent=
      currentAdminRole === 'super_admin'
        ? 'Edit Zone'
        : 'Edit Assigned Zone';

  }


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

    $('eventCancel').hidden=
      false;

  }


  $('eventForm').scrollIntoView({
    behavior:'smooth',
    block:'center'
  });
}


/* =========================
   ARCHIVE MEMBER
========================= */

async function archiveMember(id){

  if(!sb) return;


  const member=
    adminMembers.find(
      m=>String(m.id)===String(id)
    );


  const memberName=
    member
      ? member.name
      : id;


  if(
    !confirm(
      `Archive ${memberName} (${id})? The member can later be restored by a Super Admin.`
    )
  ){

    return;

  }


  const reason=
    prompt(
      'Reason for archiving this member (optional):'
    );


  if(reason === null){

    return;

  }


  const {error}=
    await sb.rpc(
      'archive_member',
      {
        p_member_id:String(id),
        p_reason:reason.trim() || null
      }
    );


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
   RESTORE ARCHIVED MEMBER
========================= */

async function restoreMember(id){

  if(!sb) return;


  if(currentAdminRole !== 'super_admin'){

    alert(
      'Only a Super Admin can restore archived members.'
    );

    return;
  }


  const member=
    archivedMembers.find(
      m=>String(m.id)===String(id)
    );


  const memberName=
    member
      ? member.name
      : id;


  if(
    !confirm(
      `Restore ${memberName} (${id}) to active Member Records?`
    )
  ){

    return;
  }


  message(
    'recoveryMessage',
    'Restoring member...'
  );


  const {error}=
    await sb.rpc(
      'restore_member',
      {
        p_member_id:String(id)
      }
    );


  if(error){

    message(
      'recoveryMessage',
      error.message,
      'error'
    );

    return;
  }


  message(
    'recoveryMessage',
    `${memberName} has been restored successfully.`,
    'ok'
  );


  await loadAdmin();

  await loadPublic();
}


/* =========================
   PERMANENTLY DELETE MEMBER
========================= */

async function permanentlyDeleteMember(id){

  if(!sb) return;


  if(currentAdminRole !== 'super_admin'){

    alert(
      'Only a Super Admin can permanently delete members.'
    );

    return;
  }


  const member=
    archivedMembers.find(
      m=>String(m.id)===String(id)
    );


  const memberName=
    member
      ? member.name
      : id;


  if(
    !confirm(
      `Permanently delete ${memberName} (${id})? This cannot be undone.`
    )
  ){

    return;
  }


  const confirmation=
    prompt(
      `Type the Member ID ${id} to confirm permanent deletion:`
    );


  if(confirmation === null){

    return;
  }


  if(confirmation.trim() !== String(id)){

    message(
      'recoveryMessage',
      'Permanent deletion cancelled because the Member ID did not match.',
      'error'
    );

    return;
  }


  message(
    'recoveryMessage',
    'Permanently deleting member...'
  );


  const {error}=
    await sb.rpc(
      'permanently_delete_member',
      {
        p_member_id:String(id)
      }
    );


  if(error){

    message(
      'recoveryMessage',
      error.message,
      'error'
    );

    return;
  }


  message(
    'recoveryMessage',
    `${memberName} has been permanently deleted.`,
    'ok'
  );


  await loadAdmin();

  await loadPublic();
}

/* =========================
   DELETE ZONE
========================= */

async function deleteZone(name){

  if(currentAdminRole !== 'super_admin'){

    alert(
      'Only a Super Admin can delete zones.'
    );

    return;
  }


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
      .eq(
        'name',
        name
      );


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

  if(currentAdminRole !== 'super_admin'){

    alert(
      'Only a Super Admin can delete events.'
    );

    return;
  }


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
      .eq(
        'id',
        id
      );


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
        .is(
          'archived_at',
          null
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

        `
          ✓ <b>VERIFIED MEMBER</b>

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

          </small>
        `

        :

        `
          ✕ <b>NOT VERIFIED</b>

          <br>

          No active public verified member was found for that ID.
        `;

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


/* Member ID: numbers only */

if($('requestMemberId')){

  $('requestMemberId').oninput=
    e=>{

      e.target.value=
        e.target.value.replace(
          /[^0-9]/g,
          ''
        );

    };

}


if($('requestForm')){

  $('requestForm').onsubmit=
    async e=>{

      e.preventDefault();


      if(!sb){

        message(
          'requestMessage',
          'Database is not connected.',
          'error'
        );

        return;
      }


      const submitButton=
        $('requestSubmit');


      if(submitButton){

        submitButton.disabled=true;
        submitButton.textContent=
          'Submitting...';

      }


      try{

               const memberId=
          $('requestMemberId')
            .value
            .trim();


        const name=
          $('requestName')
            .value
            .trim();


        const zone=
          $('requestZone')
            .value
            .trim();


        const zoneRecord=
          publicZones.find(
            z=>z.name === zone
          );


        const bike=
          $('requestBike')
            .value
            .trim()
          ||
          'Mio i 125';


        if(
          !memberId ||
          !name ||
          !zone
        ){

          message(
            'requestMessage',
            'Please complete all required fields.',
            'error'
          );

          return;
        }


        if(
          !zoneRecord ||
          !zoneRecord.zone_id
        ){

          message(
            'requestMessage',
            'Unable to match the selected zone. Please refresh the page and try again.',
            'error'
          );

          return;
        }


        if(!/^[0-9]+$/.test(memberId)){

          message(
            'requestMessage',
            'Member ID must contain numbers only.',
            'error'
          );

          return;
        }


        message(
          'requestMessage',
          'Checking Member ID...'
        );


        /* Check if already a verified member */

        const {
          data:existingMember,
          error:memberCheckError
        }=
        await sb
          .from('members')
          .select('id')
          .eq(
            'id',
            memberId
          )
          .maybeSingle();


        if(memberCheckError){

          message(
            'requestMessage',
            'Unable to check the Member ID.',
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


        message(
          'requestMessage',
          'Submitting request...'
        );


        const {error}=
          await sb
            .from('member_requests')
            .insert({

              member_id:
                memberId,

              name:
                name,

                           zone:
                zone,

              zone_id:
                zoneRecord.zone_id,

              bike:
                bike,

              status:
                'pending'

            });


        if(error){

          /* Same ID already has a pending request */

          if(error.code === '23505'){

            message(
              'requestMessage',
              'This Member ID already has a pending membership request. Please wait for administrator approval.',
              'error'
            );

          }

          /* Database numeric-only protection */

          else if(error.code === '23514'){

            message(
              'requestMessage',
              'Member ID must contain numbers only.',
              'error'
            );

          }

          else{

            console.error(
              'Membership request error:',
              error
            );

            message(
              'requestMessage',
              'Unable to submit the request right now. Please try again.',
              'error'
            );

          }

          return;
        }


        message(
          'requestMessage',
          'Membership request submitted successfully. Please wait for administrator approval.',
          'ok'
        );


        $('requestForm').reset();


        $('requestBike').value=
          'Mio i 125';


        populateRequestZoneDropdown();

      }finally{

        if(submitButton){

          submitButton.disabled=false;

          submitButton.textContent=
            'Submit Request';

        }

      }

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

      if(!sb) return;

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
   ZONE IMAGE HELPERS + PREVIEWS
========================= */

async function uploadZoneImage(
  file,
  bucket,
  zoneId,
  label
){

  const maxSize=
    10 * 1024 * 1024;


  const extension=
    (
      file.name
        .split('.')
        .pop() || ''
    ).toLowerCase();


  const allowedExtensions=[
    'png',
    'jpg',
    'jpeg',
    'webp',
    'heic',
    'heif'
  ];


  const allowedMimeTypes=[
    'image/png',
    'image/jpeg',
    'image/webp',
    'image/heic',
    'image/heif'
  ];


  if(file.size > maxSize){

    throw new Error(
      `Zone ${label} must be 10 MB or smaller.`
    );

  }


  if(
    !allowedMimeTypes.includes(
      file.type
    ) &&
    !allowedExtensions.includes(
      extension
    )
  ){

    throw new Error(
      `Please upload the zone ${label} as PNG, JPG, JPEG, WebP, HEIC, or HEIF.`
    );

  }


  const safeZoneId=
    String(zoneId || '').trim();


  if(
    !/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
      safeZoneId
    )
  ){

    throw new Error(
      'Unable to determine the secure zone storage folder. Refresh the admin dashboard and try again.'
    );

  }


  const uniqueName=
    `${Date.now()}-${Math.random()
      .toString(36)
      .slice(2,8)}`;


  const filePath=
    `${safeZoneId}/${uniqueName}.${extension || 'png'}`;


  const uploadOptions={
    cacheControl:'3600',
    upsert:false
  };


  if(file.type){

    uploadOptions.contentType=
      file.type;

  }


  const {
    error:uploadError
  }=
    await sb.storage
      .from(bucket)
      .upload(
        filePath,
        file,
        uploadOptions
      );


  if(uploadError){

    throw new Error(
      `Zone ${label} upload failed: ${uploadError.message}`
    );

  }


  const {
    data:publicUrlData
  }=
    sb.storage
      .from(bucket)
      .getPublicUrl(
        filePath
      );


  return publicUrlData.publicUrl;

}


function bindZoneImagePreview(
  fileId,
  urlId,
  previewId,
  wrapId,
  label
){

  const input=
    $(fileId);


  if(!input) return;


  input.onchange=
    ()=>{

      const file=
        input.files[0];


      if(!file){

        const currentUrl=
          $(urlId)
            ? $(urlId).value
            : '';


        if(
          currentUrl &&
          $(previewId) &&
          $(wrapId)
        ){

          $(previewId).src=
            currentUrl;

          $(wrapId).hidden=
            false;

        }else if($(wrapId)){

          $(wrapId).hidden=
            true;

        }

        return;
      }


      if(
        file.size >
        10 * 1024 * 1024
      ){

        message(
          'zoneMessage',
          `Zone ${label} must be 10 MB or smaller.`,
          'error'
        );

        input.value='';

        return;
      }


      const previewUrl=
        URL.createObjectURL(file);


      if(
        $(previewId) &&
        $(wrapId)
      ){

        $(previewId).src=
          previewUrl;

        $(wrapId).hidden=
          false;


        $(previewId).onload=
          ()=>{

            URL.revokeObjectURL(
              previewUrl
            );

          };

      }

    };

}


bindZoneImagePreview(
  'zoneCoverFile',
  'zoneCoverUrl',
  'zoneCoverPreview',
  'zoneCoverPreviewWrap',
  'cover photo'
);


bindZoneImagePreview(
  'zoneLogoFile',
  'zoneLogoUrl',
  'zoneLogoPreview',
  'zoneLogoPreviewWrap',
  'logo'
);

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


      const selectedZoneName=
        $('memberZone')
          .value
          .trim();


      const availableZones=
        currentAdminRole
          ? adminZones
          : publicZones;


      const selectedZoneRecord=
        availableZones.find(
          z=>z.name === selectedZoneName
        );


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
          selectedZoneName,

        zone_id:
          selectedZoneRecord
            ? selectedZoneRecord.zone_id
            : null,

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


      if(!row.zone_id){

        message(
          'memberMessage',
          'Unable to match the selected zone. Refresh the page and try again.',
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

        message(
          'memberMessage',
          'Member ID cannot be changed while editing. Create a new member record instead.',
          'error'
        );

        return;
      }


      let result;


      if(original){

        result=
          await sb
            .from('members')
            .update(row)
            .eq(
              'id',
              original
            );

      }else{

        result=
          await sb
            .from('members')
            .insert(row);

      }


      if(result.error){

        message(
          'memberMessage',
          result.error.message,
          'error'
        );

        return;
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


      if(
        currentAdminRole !== 'super_admin' &&
        !original
      ){

        message(
          'zoneMessage',
          'Zone Admins can edit assigned zones, but cannot create new zones.',
          'error'
        );

        return;
      }


      const zoneName=
        $('zoneName')
          .value
          .trim();


      const zoneLocation=
        $('zoneLocation')
          .value
          .trim();


      if(
        !zoneName ||
        !zoneLocation
      ){

        message(
          'zoneMessage',
          'Please complete the required fields.',
          'error'
        );

        return;
      }


      let editingZone=
        null;


      let targetZoneId=
        '';


      if(original){

        editingZone=
          adminZones.find(
            z=>z.name===original
          );


        if(
          !editingZone ||
          !editingZone.zone_id
        ){

          message(
            'zoneMessage',
            'The original zone record could not be found. Refresh the admin dashboard and try again.',
            'error'
          );

          return;
        }


        targetZoneId=
          String(editingZone.zone_id);

      }else{

        targetZoneId=
          crypto.randomUUID();

      }


      let logoUrl=
        $('zoneLogoUrl')
          ? $('zoneLogoUrl').value.trim()
          : '';


      let coverUrl=
        $('zoneCoverUrl')
          ? $('zoneCoverUrl').value.trim()
          : '';


      const logoFile=
        $('zoneLogoFile') &&
        $('zoneLogoFile').files
          ? $('zoneLogoFile').files[0]
          : null;


      const coverFile=
        $('zoneCoverFile') &&
        $('zoneCoverFile').files
          ? $('zoneCoverFile').files[0]
          : null;


      try{

        if(coverFile){

          message(
            'zoneMessage',
            'Uploading zone cover photo...'
          );

          coverUrl=
            await uploadZoneImage(
              coverFile,
              'zone-covers',
              targetZoneId,
              'cover photo'
            );

        }


        if(logoFile){

          message(
            'zoneMessage',
            'Uploading zone logo...'
          );

          logoUrl=
            await uploadZoneImage(
              logoFile,
              'zone-logos',
              targetZoneId,
              'logo'
            );

        }

      }catch(error){

        message(
          'zoneMessage',
          error.message,
          'error'
        );

        return;
      }


      const row={

        name:
          zoneName,

        location:
          zoneLocation,

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
          'TBA',

        status:
          $('zoneStatus')
            ? $('zoneStatus').value
            : 'active',

        logo_url:
          logoUrl || null,

        cover_url:
          coverUrl || null

      };


      message(
        'zoneMessage',
        'Saving zone...'
      );


            let result;


      if(original){

        result=
          await sb
            .from('zones')
            .update(row)
            .eq(
              'zone_id',
              editingZone.zone_id
            )
            .select('zone_id')
            .single();

      }else{

        result=
          await sb
            .from('zones')
            .insert({
              ...row,
              zone_id:targetZoneId
            })
            .select('zone_id')
            .single();

      }


      if(result.error){

        message(
          'zoneMessage',
          result.error.message,
          'error'
        );

        return;
      }


      message(
        'zoneMessage',
        'Zone saved successfully.',
        'ok'
      );


      resetZoneForm();

      if(currentAdminRole !== 'super_admin'){

        $('zoneForm').hidden=true;

      }

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


      if(currentAdminRole !== 'super_admin'){

        message(
          'eventMessage',
          'Only a Super Admin can create or edit events.',
          'error'
        );

        return;
      }


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
