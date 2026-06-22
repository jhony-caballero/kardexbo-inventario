/* ===================================================================
   UTILIDADES COMPARTIDAS — usado por todas las páginas
   =================================================================== */

function showToast(msg, kind){
  let t = document.getElementById('app-toast');
  if(!t){
    t = document.createElement('div');
    t.id = 'app-toast';
    t.className = 'toast';
    document.body.appendChild(t);
  }
  t.textContent = msg;
  t.className = 'toast show' + (kind ? ' ' + kind : '');
  clearTimeout(t._timer);
  t._timer = setTimeout(()=>{ t.classList.remove('show'); }, 2600);
}

function formatSoles(n){
  n = Number(n) || 0;
  return 'S/ ' + n.toLocaleString('es-PE', {minimumFractionDigits:2, maximumFractionDigits:2});
}

function formatDate(d){
  if(!d) return '—';
  const date = d.toDate ? d.toDate() : new Date(d);
  return date.toLocaleDateString('es-PE', {day:'2-digit', month:'short', year:'numeric'});
}

function formatDateTime(d){
  if(!d) return '—';
  const date = d.toDate ? d.toDate() : new Date(d);
  return date.toLocaleDateString('es-PE', {day:'2-digit', month:'short', year:'numeric'}) +
    ' · ' + date.toLocaleTimeString('es-PE', {hour:'2-digit', minute:'2-digit'});
}

function openModal(id){
  document.getElementById(id).classList.add('open');
  document.body.style.overflow = 'hidden';
}
function closeModal(id){
  document.getElementById(id).classList.remove('open');
  document.body.style.overflow = '';
}

function setActiveNav(page){
  document.querySelectorAll('.bottom-nav a').forEach(a=>{
    a.classList.toggle('active', a.dataset.page === page);
  });
}

function debounce(fn, ms){
  let h;
  return (...args)=>{ clearTimeout(h); h = setTimeout(()=>fn(...args), ms || 250); };
}

function escapeHtml(s){
  if(s === null || s === undefined) return '';
  return String(s).replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
}

function initial(str){
  if(!str) return '?';
  return str.trim().charAt(0).toUpperCase();
}

// Sube una foto a Firebase Storage y devuelve la URL pública
async function uploadPhoto(file, path){
  const ref = storage.ref().child(path + '_' + Date.now());
  const snap = await ref.put(file);
  return await snap.ref.getDownloadURL();
}

function formatDollars(n){
  n = Number(n) || 0;
  return '$ ' + n.toLocaleString('en-US', {minimumFractionDigits:2, maximumFractionDigits:2});
}

// Convierte un monto ingresado en una moneda a sus equivalentes en PEN y USD
function convertCurrency(amount, currency, exchangeRate){
  amount = Number(amount) || 0;
  exchangeRate = Number(exchangeRate) || 3.75;
  if(currency === 'USD'){
    return { pen: amount * exchangeRate, usd: amount, rate: exchangeRate };
  }
  return { pen: amount, usd: exchangeRate ? amount / exchangeRate : 0, rate: exchangeRate };
}

// Convierte una imagen remota (ej. logo en Firebase Storage) a dataURL para incrustarla en un PDF
async function urlToDataURL(url){
  const res = await fetch(url);
  const blob = await res.blob();
  return await new Promise((resolve, reject)=>{
    const reader = new FileReader();
    reader.onloadend = ()=> resolve(reader.result);
    reader.onerror = reject;
    reader.readAsDataURL(blob);
  });
}

const CATEGORIES = ['Repuesto', 'Consumible', 'Equipo', 'Herramienta', 'Otro'];

const MACHINE_TYPES = [
  'Láser Fibra', 'Láser CO₂', 'Marcado Láser', 'Plasma CNC', 'Router CNC', 'General / Varios'
];
