/* ===================================================================
   MOVIMIENTOS.JS
   =================================================================== */

let mProducts = [];
let mSelectedType = null;
let mDirection = null;
let mDevolutionDir = null;
let mBajaReason = null;
let mPickedProduct = null;
let mHistory = [];
let mHistoryFilter = 'todos';
let mPickCategory = 'Todas';
let mPickMachine = 'Todas';
let movCurrency = 'PEN';

const TYPE_LABELS = {
  inicial:'Inventario inicial', compra:'Compra', venta:'Venta',
  devolucion_cliente:'Devolución de cliente', devolucion_proveedor:'Devolución a proveedor', baja:'Baja'
};
const TYPE_ICONS = {
  inicial:'🏁', compra:'🛒', venta:'💰', devolucion_cliente:'↩️', devolucion_proveedor:'📤', baja:'🗑️'
};

protectPage(()=>{
  setActiveNav('movimientos');
  setupTypeGrid();
  setupDevolutionDir();
  setupBajaReason();
  loadProductsCache();
  loadHistory();

  document.getElementById('pickSearch').addEventListener('input', debounce(renderPickList, 150));
  document.getElementById('btnPickProduct').addEventListener('click', ()=>{ buildPickFilters(); renderPickList(); });
  document.querySelectorAll('#historyFilterChips .chip').forEach(chip=>{
    chip.addEventListener('click', ()=>{
      document.querySelectorAll('#historyFilterChips .chip').forEach(c=>c.classList.remove('active'));
      chip.classList.add('active');
      mHistoryFilter = chip.dataset.f;
      renderHistory();
    });
  });
});

function setupTypeGrid(){
  document.querySelectorAll('#typeGrid button').forEach(btn=>{
    btn.addEventListener('click', ()=>{
      document.querySelectorAll('#typeGrid button').forEach(b=>b.classList.remove('sel','in','out'));
      mSelectedType = btn.dataset.type;
      mDirection = btn.dataset.dir;
      btn.classList.add('sel', mDirection === 'entrada' ? 'in' : 'out');

      document.getElementById('devolutionDirWrap').style.display = mSelectedType === 'devolucion' ? '' : 'none';
      document.getElementById('bajaReasonWrap').style.display = mSelectedType === 'baja' ? '' : 'none';
      mDevolutionDir = null; mBajaReason = null;
      document.querySelectorAll('#devolutionDir button').forEach(b=>b.classList.remove('active'));
      document.querySelectorAll('#bajaReasonChips button').forEach(b=>b.classList.remove('active'));

      const priceField = document.getElementById('priceField');
      const priceLabel = document.getElementById('priceLabel');
      const noteLabel = document.getElementById('noteLabel');

      if(mSelectedType === 'inicial' || mSelectedType === 'compra'){
        priceField.style.display = ''; priceLabel.textContent = 'Precio de compra (S/.)';
        noteLabel.textContent = 'Nota';
      } else if(mSelectedType === 'venta'){
        priceField.style.display = ''; priceLabel.textContent = 'Precio de venta (S/.)';
        noteLabel.textContent = 'Cliente / observación';
      } else if(mSelectedType === 'devolucion'){
        priceField.style.display = ''; priceLabel.textContent = 'Precio (opcional, S/.)';
        noteLabel.textContent = 'Motivo de la devolución';
      } else if(mSelectedType === 'baja'){
        priceField.style.display = 'none';
        noteLabel.textContent = 'Detalle adicional (opcional)';
      }
    });
  });
}

function setupDevolutionDir(){
  document.querySelectorAll('#devolutionDir button').forEach(btn=>{
    btn.addEventListener('click', ()=>{
      document.querySelectorAll('#devolutionDir button').forEach(b=>b.classList.remove('active'));
      btn.classList.add('active');
      mDevolutionDir = btn.dataset.d;
    });
  });
}

function setupBajaReason(){
  document.querySelectorAll('#bajaReasonChips button').forEach(btn=>{
    btn.addEventListener('click', ()=>{
      document.querySelectorAll('#bajaReasonChips button').forEach(b=>b.classList.remove('active'));
      btn.classList.add('active');
      mBajaReason = btn.dataset.r;
    });
  });
}

async function loadProductsCache(){
  const snap = await db.collection('products').where('active','==', true).get();
  mProducts = snap.docs.map(d=>({ id:d.id, ...d.data() })).sort((a,b)=> (a.name||'').localeCompare(b.name||''));
  renderPickList();
}

function buildPickFilters(){
  const cats = ['Todas', ...new Set(mProducts.map(p=>p.category).filter(Boolean))];
  document.getElementById('pickCatChips').innerHTML = cats.map(c=>
    `<button type="button" class="chip ${c===mPickCategory?'active':''}" data-c="${escapeHtml(c)}">${escapeHtml(c)}</button>`).join('');
  document.querySelectorAll('#pickCatChips button').forEach(btn=>{
    btn.addEventListener('click', ()=>{ mPickCategory = btn.dataset.c; buildPickFilters(); renderPickList(); });
  });

  const machines = ['Todas', ...new Set(mProducts.flatMap(p=>p.machines||[]))];
  document.getElementById('pickMachineChips').innerHTML = machines.map(m=>
    `<button type="button" class="chip ${m===mPickMachine?'active':''}" data-m="${escapeHtml(m)}">${escapeHtml(m)}</button>`).join('');
  document.querySelectorAll('#pickMachineChips button').forEach(btn=>{
    btn.addEventListener('click', ()=>{ mPickMachine = btn.dataset.m; buildPickFilters(); renderPickList(); });
  });
}

function renderPickList(){
  const q = (document.getElementById('pickSearch').value || '').trim().toLowerCase();
  let list = mProducts;
  if(mPickCategory !== 'Todas') list = list.filter(p => p.category === mPickCategory);
  if(mPickMachine !== 'Todas') list = list.filter(p => (p.machines||[]).includes(mPickMachine));
  if(q){
    list = list.filter(p => (p.name||'').toLowerCase().includes(q) || (p.code||'').toLowerCase().includes(q));
  }
  const countEl = document.getElementById('pickResultCount');
  if(countEl) countEl.textContent = `${list.length} producto${list.length===1?'':'s'} encontrado${list.length===1?'':'s'}`;

  const wrap = document.getElementById('pickList');
  if(!list.length){
    wrap.innerHTML = `<div class="empty-state" style="padding:24px;"><div class="ic">📭</div>Sin resultados con estos filtros</div>`;
    return;
  }
  wrap.innerHTML = list.map(p=>{
    let pill = '';
    const qty = Number(p.quantity)||0, min = Number(p.minStock)||0;
    if(qty<=0) pill='low'; else if(qty<=min) pill='warn';
    return `<div class="mov-row" style="cursor:pointer;" onclick="pickProduct('${p.id}')">
      <div class="mov-badge" style="background:var(--bg);color:var(--graphite);">📦</div>
      <div class="mov-info">
        <div class="mov-name">${escapeHtml(p.name)}</div>
        <div class="mov-sub">${escapeHtml(p.code||'S/C')} · ${escapeHtml(p.category||'')}</div>
      </div>
      <div class="stock-pill ${pill}">${qty} ${escapeHtml(p.unit||'und')}</div>
    </div>`;
  }).join('');
}

function pickProduct(id){
  mPickedProduct = mProducts.find(p=>p.id===id);
  if(!mPickedProduct) return;
  document.getElementById('btnPickProduct').textContent = `${mPickedProduct.code||'S/C'} — ${mPickedProduct.name}`;
  document.getElementById('stockHint').textContent = `Stock actual: ${mPickedProduct.quantity||0} ${mPickedProduct.unit||'und'}`;
  if(mPickedProduct.purchasePrice && (mSelectedType==='compra' || mSelectedType==='inicial')){
    movCurrency = mPickedProduct.priceCurrency || 'PEN';
    document.getElementById('mBtnPEN').classList.toggle('active', movCurrency==='PEN');
    document.getElementById('mBtnUSD').classList.toggle('active', movCurrency==='USD');
    document.getElementById('movExchangeRate').value = mPickedProduct.exchangeRate || 3.75;
    document.getElementById('movPrice').value = movCurrency==='USD' ? (mPickedProduct.purchasePriceUSD||'') : (mPickedProduct.purchasePrice||'');
    updateMovConversion();
  }
  closeModal('modalPickProduct');
}

function setMovCurrency(c){
  movCurrency = c;
  document.getElementById('mBtnPEN').classList.toggle('active', c==='PEN');
  document.getElementById('mBtnUSD').classList.toggle('active', c==='USD');
  updateMovConversion();
}

function updateMovConversion(){
  const val = Number(document.getElementById('movPrice').value) || 0;
  const rate = Number(document.getElementById('movExchangeRate').value) || 3.75;
  const hint = document.getElementById('movConversionHint');
  if(movCurrency === 'PEN'){
    hint.textContent = `≈ $${(val / rate).toFixed(2)} USD  (TC: ${rate})`;
  } else {
    hint.textContent = `≈ S/ ${(val * rate).toFixed(2)}  (TC: ${rate})`;
  }
}

async function saveMovement(){
  if(!mSelectedType){ showToast('Elige un tipo de movimiento', 'err'); return; }
  if(!mPickedProduct){ showToast('Elige un producto', 'err'); return; }
  if(mSelectedType === 'devolucion' && !mDevolutionDir){ showToast('Indica si la devolución es de cliente o a proveedor', 'err'); return; }
  if(mSelectedType === 'baja' && !mBajaReason){ showToast('Elige el motivo de la baja', 'err'); return; }

  const qty = Number(document.getElementById('movQuantity').value) || 0;
  if(qty <= 0){ showToast('La cantidad debe ser mayor a 0', 'err'); return; }

  let direction = mDirection;
  let finalType = mSelectedType;
  if(mSelectedType === 'devolucion'){
    direction = mDevolutionDir;
    finalType = mDevolutionDir === 'entrada' ? 'devolucion_cliente' : 'devolucion_proveedor';
  }

  const currentQty = Number(mPickedProduct.quantity) || 0;
  if(direction === 'salida' && qty > currentQty){
    showToast(`Stock insuficiente. Solo hay ${currentQty} ${mPickedProduct.unit||'und'} disponibles.`, 'err');
    return;
  }

  const enteredPrice = Number(document.getElementById('movPrice').value) || 0;
  const movExchangeRate = Number(document.getElementById('movExchangeRate').value) || 3.75;
  const conv = convertCurrency(enteredPrice, movCurrency, movExchangeRate);
  const note = document.getElementById('movNote').value.trim();

  try{
    const productRef = db.collection('products').doc(mPickedProduct.id);
    const newQty = direction === 'entrada' ? currentQty + qty : currentQty - qty;

    await db.runTransaction(async (tx)=>{
      tx.update(productRef, { quantity: newQty });
    });

    const movData = {
      type: finalType, direction,
      productId: mPickedProduct.id, productCode: mPickedProduct.code || '', productName: mPickedProduct.name,
      quantity: qty,
      unitPrice: Number(conv.pen.toFixed(2)),       // canónico en soles (se usa en gráficas y reportes)
      unitPriceUSD: Number(conv.usd.toFixed(2)),
      currency: movCurrency, exchangeRate: movExchangeRate,
      note,
      user: window.CURRENT_USER.email,
      date: firebase.firestore.FieldValue.serverTimestamp()
    };
    if(finalType === 'baja') movData.reason = mBajaReason;

    await db.collection('movements').add(movData);

    showToast('Movimiento registrado', 'ok');
    resetMovementForm();
    loadProductsCache();
    loadHistory();
  }catch(err){
    console.error(err);
    showToast('Error al registrar el movimiento', 'err');
  }
}

function resetMovementForm(){
  mSelectedType = null; mDirection = null; mDevolutionDir = null; mBajaReason = null; mPickedProduct = null;
  movCurrency = 'PEN';
  document.getElementById('mBtnPEN').classList.add('active');
  document.getElementById('mBtnUSD').classList.remove('active');
  document.getElementById('movExchangeRate').value = 3.75;
  document.querySelectorAll('#typeGrid button').forEach(b=>b.classList.remove('sel','in','out'));
  document.getElementById('devolutionDirWrap').style.display = 'none';
  document.getElementById('bajaReasonWrap').style.display = 'none';
  document.getElementById('btnPickProduct').textContent = 'Seleccionar producto...';
  document.getElementById('stockHint').textContent = '';
  document.getElementById('movQuantity').value = 1;
  document.getElementById('movPrice').value = '';
  document.getElementById('movNote').value = '';
  document.getElementById('priceField').style.display = '';
  document.getElementById('priceLabel').textContent = 'Precio unitario';
  document.getElementById('noteLabel').textContent = 'Nota / observación';
  updateMovConversion();
}

async function loadHistory(){
  const loader = document.getElementById('historyLoader');
  loader.style.display = '';
  try{
    const snap = await db.collection('movements').orderBy('date','desc').limit(100).get();
    mHistory = snap.docs.map(d=>({ id:d.id, ...d.data() }));
    renderHistory();
  }catch(err){
    console.error(err);
    showToast('No se pudo cargar el historial', 'err');
  }finally{
    loader.style.display = 'none';
  }
}

function renderHistory(){
  let list = mHistory;
  if(mHistoryFilter !== 'todos') list = list.filter(m => m.direction === mHistoryFilter);

  const wrap = document.getElementById('historyList');
  if(!list.length){
    wrap.innerHTML = `<div class="empty-state"><div class="ic">📋</div>Sin movimientos registrados aún</div>`;
    return;
  }
  wrap.innerHTML = list.map(m=>{
    const isIn = m.direction === 'entrada';
    return `<div class="mov-row">
      <div class="mov-badge ${isIn?'in':'out'}">${TYPE_ICONS[m.type] || (isIn?'➕':'➖')}</div>
      <div class="mov-info">
        <div class="mov-name">${escapeHtml(m.productName)}</div>
        <div class="mov-sub">${TYPE_LABELS[m.type]||m.type} · ${formatDateTime(m.date)}</div>
      </div>
      <div class="mov-qty ${isIn?'in':'out'}">${isIn?'+':'-'}${m.quantity} ${m.unitPrice?('· '+formatSoles(m.quantity*m.unitPrice)):''}</div>
    </div>`;
  }).join('');
}

async function exportHistoryPDF(){
  let list = mHistory;
  if(mHistoryFilter !== 'todos') list = list.filter(m => m.direction === mHistoryFilter);
  if(!list.length){ showToast('No hay movimientos para exportar', 'err'); return; }

  const { jsPDF } = window.jspdf;
  const doc = new jsPDF();
  const company = window.COMPANY_INFO || {};
  let textX = 14;

  if(company.logoURL){
    try{
      const logoData = await urlToDataURL(company.logoURL);
      doc.addImage(logoData, 'JPEG', 14, 10, 18, 18);
      textX = 36;
    }catch(err){ console.warn('No se pudo incrustar el logo en el PDF:', err); }
  }

  doc.setFontSize(14);
  doc.setFont(undefined, 'bold');
  doc.text(company.nombre || 'V&J Electronics Import SAC', textX, 18);
  doc.setFontSize(9);
  doc.setFont(undefined, 'normal');
  let y = 24;
  if(company.ruc){ doc.text('RUC: ' + company.ruc, textX, y); y += 5; }
  if(company.direccion){ doc.text(company.direccion, textX, y); y += 5; }
  if(company.telefono || company.email){ doc.text([company.telefono, company.email].filter(Boolean).join(' · '), textX, y); y += 5; }
  y = Math.max(y, 30);

  doc.setFontSize(12);
  doc.setFont(undefined, 'bold');
  doc.text('Reporte de Movimientos de Inventario', 14, y + 6);
  doc.setFontSize(9);
  doc.setFont(undefined, 'normal');
  doc.text('Generado: ' + new Date().toLocaleString('es-PE'), 14, y + 12);

  const rows = list.map(m=>[
    formatDateTime(m.date),
    TYPE_LABELS[m.type] || m.type,
    m.productCode || '',
    m.productName || '',
    (m.direction==='entrada'?'+':'-') + m.quantity,
    m.unitPrice ? formatSoles(m.unitPrice) : '—',
    m.unitPrice ? formatSoles(m.quantity * m.unitPrice) : '—',
    m.user || ''
  ]);

  doc.autoTable({
    startY: y + 18,
    head: [['Fecha','Tipo','Código','Producto','Cant.','P. Unit. (S/.)','Total (S/.)','Usuario']],
    body: rows,
    styles: { fontSize: 7.5, cellPadding: 2.5 },
    headStyles: { fillColor: [79,124,172] },
    alternateRowStyles: { fillColor: [244,246,248] }
  });

  // ---- resumen compacto en dólares (sin duplicar cada fila para no saturar el reporte) ----
  const totalPEN = list.reduce((s,m)=> s + (Number(m.unitPrice)||0) * (Number(m.quantity)||0), 0);
  const ratesUsed = list.map(m=>Number(m.exchangeRate)).filter(Boolean);
  const avgRate = ratesUsed.length ? (ratesUsed.reduce((a,b)=>a+b,0) / ratesUsed.length) : 3.75;
  const totalUSD = avgRate ? totalPEN / avgRate : 0;

  const finalY = doc.lastAutoTable.finalY + 8;
  doc.setFontSize(8.5);
  doc.setFont(undefined, 'bold');
  doc.text(`Resumen: Total S/ ${totalPEN.toFixed(2)}   ·   Equivalente $ ${totalUSD.toFixed(2)} USD   (T.C. promedio: ${avgRate.toFixed(2)})`, 14, finalY);
  doc.setFont(undefined, 'normal');

  doc.save(`vj-movimientos-${new Date().toISOString().slice(0,10)}.pdf`);
}
