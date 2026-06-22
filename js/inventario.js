/* ===================================================================
   INVENTARIO.JS
   =================================================================== */

let allProducts = [];
let selectedCategory = 'Todas';
let onlyLowStock = false;
let selectedMachines = [];
let editingPhotoURL = '';
let newPhotoFile = null;
let productCurrency = 'PEN';

protectPage(()=>{
  setActiveNav('inventario');
  buildCategoryChips();
  buildMachineChips();
  buildCategorySelect();
  loadProducts();

  document.getElementById('searchInput').addEventListener('input', debounce(renderProducts, 200));
  document.getElementById('chipLowStock').addEventListener('click', ()=>{
    onlyLowStock = !onlyLowStock;
    document.getElementById('chipLowStock').classList.toggle('active', onlyLowStock);
    renderProducts();
  });
  document.getElementById('photoInput').addEventListener('change', handlePhotoSelect);
  document.getElementById('formProduct').addEventListener('submit', saveProduct);
});

function setProductCurrency(c){
  productCurrency = c;
  document.getElementById('pBtnPEN').classList.toggle('active', c==='PEN');
  document.getElementById('pBtnUSD').classList.toggle('active', c==='USD');
  updateProductConversion();
}

function updateProductConversion(){
  const val = Number(document.getElementById('pPurchasePrice').value) || 0;
  const rate = Number(document.getElementById('pExchangeRate').value) || 3.75;
  const hint = document.getElementById('pConversionHint');
  if(productCurrency === 'PEN'){
    hint.textContent = `≈ $${(val / rate).toFixed(2)} USD  (TC: ${rate})`;
  } else {
    hint.textContent = `≈ S/ ${(val * rate).toFixed(2)}  (TC: ${rate})`;
  }
}

function buildCategoryChips(){
  const wrap = document.getElementById('categoryChips');
  const cats = ['Todas', ...CATEGORIES];
  wrap.innerHTML = cats.map(c=>`<button class="chip ${c==='Todas'?'active':''}" data-cat="${c}">${c}</button>`).join('');
  wrap.querySelectorAll('.chip').forEach(chip=>{
    chip.addEventListener('click', ()=>{
      selectedCategory = chip.dataset.cat;
      wrap.querySelectorAll('.chip').forEach(c=>c.classList.remove('active'));
      chip.classList.add('active');
      renderProducts();
    });
  });
}

function buildCategorySelect(){
  document.getElementById('pCategory').innerHTML = CATEGORIES.map(c=>`<option value="${c}">${c}</option>`).join('');
}

function buildMachineChips(){
  const wrap = document.getElementById('machineChips');
  wrap.innerHTML = MACHINE_TYPES.map(m=>`<button type="button" data-m="${escapeHtml(m)}">${m}</button>`).join('');
  wrap.querySelectorAll('button').forEach(btn=>{
    btn.addEventListener('click', ()=>{
      const m = btn.dataset.m;
      const idx = selectedMachines.indexOf(m);
      if(idx === -1) selectedMachines.push(m); else selectedMachines.splice(idx,1);
      btn.classList.toggle('active');
    });
  });
}

async function loadProducts(){
  db.collection('products').orderBy('name').onSnapshot(snap=>{
    allProducts = snap.docs.map(d=>({ id:d.id, ...d.data() }));
    document.getElementById('loader').style.display = 'none';
    renderProducts();
  }, err=>{
    console.error(err);
    document.getElementById('loader').style.display = 'none';
    showToast('No se pudo cargar el inventario', 'err');
  });
}

function renderProducts(){
  const q = document.getElementById('searchInput').value.trim().toLowerCase();
  let list = allProducts.filter(p => p.active !== false);

  if(selectedCategory !== 'Todas') list = list.filter(p => p.category === selectedCategory);
  if(onlyLowStock) list = list.filter(p => (Number(p.quantity)||0) <= (Number(p.minStock)||0));
  if(q){
    list = list.filter(p =>
      (p.name||'').toLowerCase().includes(q) ||
      (p.code||'').toLowerCase().includes(q) ||
      (p.characteristics||'').toLowerCase().includes(q)
    );
  }

  const container = document.getElementById('productList');
  if(!list.length){
    container.innerHTML = `<div class="empty-state"><div class="ic">📭</div>No se encontraron productos<br><span style="font-size:12px;">Intenta otra búsqueda o agrega uno nuevo</span></div>`;
    return;
  }

  container.innerHTML = list.map(p=>{
    const qty = Number(p.quantity)||0;
    const min = Number(p.minStock)||0;
    let pillClass = '', barClass = '';
    if(qty <= 0){ pillClass='low'; barClass='low'; }
    else if(qty <= min){ pillClass='warn'; barClass='warn'; }

    const photoStyle = p.photoURL ? `style="background-image:url('${p.photoURL}')"` : '';
    return `<div class="bin-tag">
      <div class="bin-barcode ${barClass}"></div>
      <div class="bin-body">
        <div class="bin-photo" ${photoStyle}>${p.photoURL?'':'📦'}</div>
        <div class="bin-info">
          <div class="bin-top">
            <div>
              <div class="bin-code">${escapeHtml(p.code||'S/C')}</div>
              <div class="bin-name">${escapeHtml(p.name)}</div>
            </div>
          </div>
          <div class="bin-meta">
            <span>🏷️ ${escapeHtml(p.category||'Otro')}</span>
            ${p.unit?`<span>📐 ${escapeHtml(p.unit)}</span>`:''}
          </div>
          <div class="bin-bottom">
            <span class="stock-pill ${pillClass}">${qty} ${escapeHtml(p.unit||'und')}</span>
            <div class="bin-actions">
              <button onclick="openProductModal('${p.id}')" title="Editar">✏️</button>
            </div>
          </div>
        </div>
      </div>
    </div>`;
  }).join('');
}

function handlePhotoSelect(e){
  const file = e.target.files[0];
  if(!file) return;
  newPhotoFile = file;
  const reader = new FileReader();
  reader.onload = (ev)=>{
    document.getElementById('photoPreview').style.backgroundImage = `url('${ev.target.result}')`;
    document.getElementById('photoPreview').textContent = '';
  };
  reader.readAsDataURL(file);
}

function openProductModal(id){
  const form = document.getElementById('formProduct');
  form.reset();
  newPhotoFile = null;
  editingPhotoURL = '';
  selectedMachines = [];
  productCurrency = 'PEN';
  document.getElementById('pBtnPEN').classList.add('active');
  document.getElementById('pBtnUSD').classList.remove('active');
  document.getElementById('pExchangeRate').value = 3.75;
  document.querySelectorAll('#machineChips button').forEach(b=>b.classList.remove('active'));
  document.getElementById('photoPreview').style.backgroundImage = '';
  document.getElementById('photoPreview').textContent = '📷';
  document.getElementById('btnDeleteProduct').style.display = 'none';
  document.getElementById('pQuantityField').style.display = '';

  if(id){
    const p = allProducts.find(x=>x.id===id);
    if(!p) return;
    document.getElementById('modalProductTitle').textContent = 'Editar producto';
    document.getElementById('pId').value = id;
    document.getElementById('pCode').value = p.code || '';
    document.getElementById('pCategory').value = p.category || CATEGORIES[0];
    document.getElementById('pName').value = p.name || '';
    document.getElementById('pUnit').value = p.unit || '';
    document.getElementById('pMinStock').value = p.minStock || 0;
    document.getElementById('pQuantity').value = p.quantity || 0;
    document.getElementById('pCharacteristics').value = p.characteristics || '';
    document.getElementById('pDescription').value = p.description || '';
    productCurrency = p.priceCurrency || 'PEN';
    document.getElementById('pBtnPEN').classList.toggle('active', productCurrency==='PEN');
    document.getElementById('pBtnUSD').classList.toggle('active', productCurrency==='USD');
    document.getElementById('pExchangeRate').value = p.exchangeRate || 3.75;
    document.getElementById('pPurchasePrice').value = productCurrency==='USD' ? (p.purchasePriceUSD||'') : (p.purchasePrice||'');
    updateProductConversion();
    document.getElementById('pQuantityField').style.display = 'none'; // stock ya no se edita directo al editar
    document.getElementById('btnDeleteProduct').style.display = '';
    editingPhotoURL = p.photoURL || '';
    if(p.photoURL){
      document.getElementById('photoPreview').style.backgroundImage = `url('${p.photoURL}')`;
      document.getElementById('photoPreview').textContent = '';
    }
    selectedMachines = p.machines || [];
    document.querySelectorAll('#machineChips button').forEach(b=>{
      if(selectedMachines.includes(b.dataset.m)) b.classList.add('active');
    });
  } else {
    document.getElementById('modalProductTitle').textContent = 'Nuevo producto';
    document.getElementById('pId').value = '';
    updateProductConversion();
  }
  openModal('modalProduct');
}

async function saveProduct(e){
  e.preventDefault();
  const id = document.getElementById('pId').value;
  const btn = e.target.querySelector('button[type="submit"]');
  btn.disabled = true; btn.textContent = 'Guardando...';

  try{
    let photoURL = editingPhotoURL;
    if(newPhotoFile){
      photoURL = await uploadPhoto(newPhotoFile, 'products/' + (id || Date.now()));
    }

    const enteredPrice = Number(document.getElementById('pPurchasePrice').value) || 0;
    const exchangeRate = Number(document.getElementById('pExchangeRate').value) || 3.75;
    const conv = convertCurrency(enteredPrice, productCurrency, exchangeRate);

    const data = {
      code: document.getElementById('pCode').value.trim(),
      category: document.getElementById('pCategory').value,
      name: document.getElementById('pName').value.trim(),
      unit: document.getElementById('pUnit').value.trim() || 'und',
      minStock: Number(document.getElementById('pMinStock').value) || 0,
      characteristics: document.getElementById('pCharacteristics').value.trim(),
      description: document.getElementById('pDescription').value.trim(),
      priceCurrency: productCurrency,
      exchangeRate: exchangeRate,
      purchasePrice: Number(conv.pen.toFixed(2)),       // canónico en soles (se usa en valorización y gráficas)
      purchasePriceUSD: Number(conv.usd.toFixed(2)),
      machines: selectedMachines,
      photoURL,
      active: true,
      updatedAt: firebase.firestore.FieldValue.serverTimestamp(),
      updatedBy: window.CURRENT_USER.email
    };

    if(id){
      await db.collection('products').doc(id).update(data);
      showToast('Producto actualizado', 'ok');
    } else {
      const initialQty = Number(document.getElementById('pQuantity').value) || 0;
      data.quantity = initialQty;
      data.createdAt = firebase.firestore.FieldValue.serverTimestamp();
      data.createdBy = window.CURRENT_USER.email;
      const ref = await db.collection('products').add(data);

      if(initialQty > 0){
        await db.collection('movements').add({
          type:'inicial', direction:'entrada',
          productId: ref.id, productCode: data.code, productName: data.name,
          quantity: initialQty, unitPrice: data.purchasePrice, unitPriceUSD: data.purchasePriceUSD,
          currency: data.priceCurrency, exchangeRate: data.exchangeRate,
          note: 'Inventario inicial',
          user: window.CURRENT_USER.email,
          date: firebase.firestore.FieldValue.serverTimestamp()
        });
      }
      showToast('Producto creado', 'ok');
    }

    closeModal('modalProduct');
  }catch(err){
    console.error(err);
    showToast('Error al guardar el producto', 'err');
  }finally{
    btn.disabled = false; btn.textContent = 'Guardar producto';
  }
}

async function deleteProduct(){
  const id = document.getElementById('pId').value;
  if(!id) return;
  if(!confirm('¿Eliminar este producto? Su historial de movimientos se conservará, pero el producto ya no estará disponible para nuevos movimientos.')) return;
  try{
    await db.collection('products').doc(id).delete();
    showToast('Producto eliminado', 'ok');
    closeModal('modalProduct');
  }catch(err){
    console.error(err);
    showToast('Error al eliminar', 'err');
  }
}
