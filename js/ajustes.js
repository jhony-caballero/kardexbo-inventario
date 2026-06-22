/* ===================================================================
   AJUSTES.JS
   =================================================================== */

protectPage((user)=>{
  setActiveNav('ajustes');
  document.getElementById('myAccountInfo').innerHTML =
    `${escapeHtml(user.name || user.email)} <br><span style="font-family:var(--font-mono);font-size:11px;">${escapeHtml(user.email)}</span> · ` +
    `<span class="role-badge ${user.role==='admin'?'admin':'active'}">${user.role==='admin'?'Administrador':'Usuario'}</span>`;

  if(isAdmin()){
    loadCompanyForm();
    loadSystemForm();
    loadUsers();
    document.getElementById('formCompany').addEventListener('submit', saveCompany);
    document.getElementById('formSystem').addEventListener('submit', saveSystemName);
    document.getElementById('logoInput').addEventListener('change', handleLogoSelect);
  }
});

let newLogoFile = null;

function loadSystemForm(){
  document.getElementById('sNombre').value = window.SYSTEM_NAME || 'Almacén V&J';
}

async function saveSystemName(e){
  e.preventDefault();
  const btn = e.target.querySelector('button[type="submit"]');
  const nombre = document.getElementById('sNombre').value.trim();
  if(!nombre){ showToast('Escribe un nombre', 'err'); return; }
  btn.disabled = true; btn.textContent = 'Guardando...';
  try{
    await db.collection('config').doc('sistema').set({ nombre }, { merge:true });
    window.SYSTEM_NAME = nombre;
    paintBrand();
    showToast('Nombre del sistema actualizado', 'ok');
  }catch(err){
    console.error(err);
    showToast('Error al guardar', 'err');
  }finally{
    btn.disabled = false; btn.textContent = 'Guardar nombre';
  }
}

function handleLogoSelect(e){
  const file = e.target.files[0];
  if(!file) return;
  newLogoFile = file;
  const reader = new FileReader();
  reader.onload = (ev)=>{
    const el = document.getElementById('logoPreview');
    el.classList.add('round');
    el.style.backgroundImage = `url('${ev.target.result}')`;
    el.textContent = '';
  };
  reader.readAsDataURL(file);
}

async function loadCompanyForm(){
  const info = window.COMPANY_INFO || {};
  document.getElementById('cNombre').value = info.nombre || '';
  document.getElementById('cRuc').value = info.ruc || '';
  document.getElementById('cTelefono').value = info.telefono || '';
  document.getElementById('cDireccion').value = info.direccion || '';
  document.getElementById('cEmail').value = info.email || '';
  if(info.logoURL){
    const el = document.getElementById('logoPreview');
    el.classList.add('round');
    el.style.backgroundImage = `url('${info.logoURL}')`;
    el.textContent = '';
  }
}

async function saveCompany(e){
  e.preventDefault();
  const btn = e.target.querySelector('button[type="submit"]');
  btn.disabled = true; btn.textContent = 'Guardando...';
  try{
    let logoURL = (window.COMPANY_INFO && window.COMPANY_INFO.logoURL) || '';
    if(newLogoFile){
      logoURL = await uploadPhoto(newLogoFile, 'company/logo');
    }
    const data = {
      nombre: document.getElementById('cNombre').value.trim(),
      ruc: document.getElementById('cRuc').value.trim(),
      telefono: document.getElementById('cTelefono').value.trim(),
      direccion: document.getElementById('cDireccion').value.trim(),
      email: document.getElementById('cEmail').value.trim(),
      logoURL
    };
    await db.collection('config').doc('empresa').set(data, { merge:true });
    window.COMPANY_INFO = data;
    newLogoFile = null;
    showToast('Datos de empresa actualizados', 'ok');
  }catch(err){
    console.error(err);
    showToast('Error al guardar', 'err');
  }finally{
    btn.disabled = false; btn.textContent = 'Guardar datos de empresa';
  }
}

async function loadUsers(){
  db.collection('users').onSnapshot(snap=>{
    const all = snap.docs.map(d=>({ id:d.id, ...d.data() }));
    renderPending(all.filter(u=>u.status==='pending'));
    renderActive(all.filter(u=>u.status==='active'));
  });
}

function renderPending(list){
  const wrap = document.getElementById('pendingUsers');
  if(!list.length){
    wrap.innerHTML = `<div class="empty-state" style="padding:20px;"><div class="ic">✅</div>No hay solicitudes pendientes</div>`;
    return;
  }
  wrap.innerHTML = list.map(u=>`
    <div class="user-row">
      <div class="user-avatar">${initial(u.name||u.email)}</div>
      <div class="user-info">
        <div class="user-email">${escapeHtml(u.name||u.email)}</div>
        <div class="user-sub">${escapeHtml(u.email)}</div>
      </div>
      <div class="user-actions">
        <button class="btn-approve" onclick="approveUser('${u.id}')">Aprobar</button>
        <button class="btn-reject" onclick="rejectUser('${u.id}')">Rechazar</button>
      </div>
    </div>`).join('');
}

function renderActive(list){
  const wrap = document.getElementById('activeUsers');
  wrap.innerHTML = list.map(u=>`
    <div class="user-row">
      <div class="user-avatar">${initial(u.name||u.email)}</div>
      <div class="user-info">
        <div class="user-email">${escapeHtml(u.name||u.email)}</div>
        <div class="user-sub">${escapeHtml(u.email)}</div>
      </div>
      <span class="role-badge ${u.role==='admin'?'admin':'active'}">${u.role==='admin'?'Admin':'Activo'}</span>
      ${u.role!=='admin' ? `<div class="user-actions"><button class="btn-reject" onclick="revokeUser('${u.id}')">Quitar acceso</button></div>` : ''}
    </div>`).join('');
}

async function approveUser(id){
  try{
    await db.collection('users').doc(id).update({ status:'active' });
    showToast('Usuario aprobado', 'ok');
  }catch(err){ console.error(err); showToast('Error al aprobar', 'err'); }
}

async function rejectUser(id){
  if(!confirm('¿Rechazar esta solicitud de acceso?')) return;
  try{
    await db.collection('users').doc(id).update({ status:'rejected' });
    showToast('Solicitud rechazada', 'ok');
  }catch(err){ console.error(err); showToast('Error al rechazar', 'err'); }
}

async function revokeUser(id){
  if(!confirm('¿Quitar el acceso a este usuario? Podrá volver a solicitarlo.')) return;
  try{
    await db.collection('users').doc(id).update({ status:'pending' });
    showToast('Acceso retirado', 'ok');
  }catch(err){ console.error(err); showToast('Error al actualizar', 'err'); }
}
