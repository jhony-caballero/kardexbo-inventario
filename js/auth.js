/* ===================================================================
   AUTH.JS — control de acceso compartido por todas las páginas internas
   Verifica sesión activa, estado de aprobación del usuario (pendiente /
   activo) y deja disponibles window.CURRENT_USER y window.COMPANY_INFO.
   =================================================================== */

window.CURRENT_USER = null;
window.COMPANY_INFO = null;

/**
 * Llamar al inicio de cada página protegida.
 * onReady(userDoc) se ejecuta solo cuando el usuario está autenticado Y activo.
 */
function protectPage(onReady){
  auth.onAuthStateChanged(async (user)=>{
    if(!user){
      window.location.href = 'index.html';
      return;
    }
    try{
      const docRef = db.collection('users').doc(user.uid);
      const docSnap = await docRef.get();

      let userData;
      if(!docSnap.exists){
        // Por si quedó sin documento (raro, pero por seguridad lo creamos como pendiente)
        userData = {
          email: user.email,
          name: user.email.split('@')[0],
          role: user.email.toLowerCase() === ADMIN_EMAIL.toLowerCase() ? 'admin' : 'user',
          status: user.email.toLowerCase() === ADMIN_EMAIL.toLowerCase() ? 'active' : 'pending',
          createdAt: firebase.firestore.FieldValue.serverTimestamp()
        };
        await docRef.set(userData);
      } else {
        userData = docSnap.data();
      }

      if(userData.status !== 'active'){
        if(!location.pathname.endsWith('pending.html')){
          window.location.href = 'pending.html';
        }
        return;
      }

      window.CURRENT_USER = { uid: user.uid, email: user.email, ...userData };

      await loadCompanyInfo();
      await loadSystemInfo();
      paintUserChip();
      paintBrand();
      onReady && onReady(window.CURRENT_USER);

    }catch(err){
      console.error('Error de autenticación:', err);
      showToast && showToast('Error al verificar tu cuenta', 'err');
    }
  });
}

async function loadCompanyInfo(){
  try{
    const snap = await db.collection('config').doc('empresa').get();
    window.COMPANY_INFO = snap.exists ? snap.data() : {
      nombre: 'V&J Electronics Import SAC',
      ruc: '', direccion: '', telefono: '', email: '', logoURL: ''
    };
  }catch(err){
    console.error('No se pudo cargar la info de empresa:', err);
    window.COMPANY_INFO = { nombre: 'V&J Electronics Import SAC' };
  }
}

async function loadSystemInfo(){
  try{
    const snap = await db.collection('config').doc('sistema').get();
    window.SYSTEM_NAME = (snap.exists && snap.data().nombre) ? snap.data().nombre : 'Almacén V&J';
  }catch(err){
    console.error('No se pudo cargar el nombre del sistema:', err);
    window.SYSTEM_NAME = 'Almacén V&J';
  }
}

function paintBrand(){
  document.querySelectorAll('.brand-name').forEach(el=>{ el.textContent = window.SYSTEM_NAME; });
  document.title = document.title.replace('Almacén V&J', window.SYSTEM_NAME);
}

function paintUserChip(){
  const chip = document.querySelectorAll('.user-chip');
  chip.forEach(c=>{ c.textContent = window.CURRENT_USER.email; });
  document.querySelectorAll('.only-admin').forEach(el=>{
    el.style.display = window.CURRENT_USER.role === 'admin' ? '' : 'none';
  });
}

function logout(){
  auth.signOut().then(()=>{ window.location.href = 'index.html'; });
}

function isAdmin(){
  return window.CURRENT_USER && window.CURRENT_USER.role === 'admin';
}
