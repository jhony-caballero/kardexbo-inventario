/* ===================================================================
   DASHBOARD.JS
   =================================================================== */

const CHART_COLORS = {
  entrada:'#4C9A78', salida:'#C96A6E', azul:'#4F7CAC', teal:'#5FA3A3',
  amber:'#D9A24B', grid:'#E2E7EC', text:'#647386'
};

protectPage(async ()=>{
  setActiveNav('dashboard');
  await loadStats();
  await loadMovementsChart();
  await loadSalesChart();
  await loadCategoryChart();
});

async function loadStats(){
  const snap = await db.collection('products').where('active','==', true).get();
  let total = 0, low = 0, value = 0, valueUSD = 0;
  const lowItems = [];

  snap.forEach(doc=>{
    const p = doc.data();
    total++;
    value += (Number(p.quantity)||0) * (Number(p.purchasePrice)||0);
    valueUSD += (Number(p.quantity)||0) * (Number(p.purchasePriceUSD)||0);
    const min = Number(p.minStock)||0;
    if((Number(p.quantity)||0) <= min){
      low++;
      lowItems.push(p);
    }
  });

  document.getElementById('statProducts').textContent = total;
  document.getElementById('statLow').textContent = low;
  document.getElementById('statValue').innerHTML = `${formatSoles(value).replace('S/ ','S/')}<br><span style="font-size:9.5px;font-weight:400;color:var(--steel);">≈ ${formatDollars(valueUSD)}</span>`;

  const banner = document.getElementById('alertBanner');
  if(low > 0){
    banner.innerHTML = `<div class="alert-banner">⚠️ <span><b>${low} producto${low>1?'s':''}</b> con stock igual o por debajo del mínimo. Revisa el detalle abajo.</span></div>`;
  } else {
    banner.innerHTML = '';
  }

  const section = document.getElementById('lowStockSection');
  const list = document.getElementById('lowStockList');
  if(lowItems.length){
    section.style.display = '';
    list.innerHTML = lowItems.slice(0,8).map(p=>{
      const isOut = (Number(p.quantity)||0) <= 0;
      return `<div class="mov-row">
        <div class="mov-badge ${isOut?'out':'out'}" style="background:${isOut?'var(--red-bg)':'var(--amber-bg)'};color:${isOut?'var(--red)':'#9C6A12'};">${isOut?'0':'!'}</div>
        <div class="mov-info">
          <div class="mov-name">${escapeHtml(p.name)}</div>
          <div class="mov-sub">${escapeHtml(p.code||'')} · mínimo: ${p.minStock||0}</div>
        </div>
        <div class="mov-qty ${isOut?'out':''}" style="${isOut?'':'color:#9C6A12;'}">${p.quantity||0} ${escapeHtml(p.unit||'und')}</div>
      </div>`;
    }).join('');
  } else {
    section.style.display = 'none';
  }
}

function getLast6Months(){
  const months = [];
  const now = new Date();
  for(let i=5;i>=0;i--){
    const d = new Date(now.getFullYear(), now.getMonth()-i, 1);
    months.push({ year:d.getFullYear(), month:d.getMonth(), label: d.toLocaleDateString('es-PE',{month:'short'}) });
  }
  return months;
}

async function loadMovementsChart(){
  const months = getLast6Months();
  const start = new Date(months[0].year, months[0].month, 1);

  const snap = await db.collection('movements').where('date','>=', start).get();
  const entradas = new Array(6).fill(0);
  const salidas = new Array(6).fill(0);

  snap.forEach(doc=>{
    const m = doc.data();
    if(!m.date) return;
    const d = m.date.toDate ? m.date.toDate() : new Date(m.date);
    const idx = months.findIndex(mo => mo.year === d.getFullYear() && mo.month === d.getMonth());
    if(idx === -1) return;
    const qty = Number(m.quantity) || 0;
    if(m.direction === 'entrada') entradas[idx] += qty;
    else if(m.direction === 'salida') salidas[idx] += qty;
  });

  new Chart(document.getElementById('chartMovs'), {
    type:'bar',
    data:{
      labels: months.map(m=>m.label),
      datasets:[
        { label:'Entradas', data: entradas, backgroundColor: CHART_COLORS.entrada, borderRadius:5, maxBarThickness:26 },
        { label:'Salidas', data: salidas, backgroundColor: CHART_COLORS.salida, borderRadius:5, maxBarThickness:26 }
      ]
    },
    options: baseChartOptions(true)
  });
}

async function loadSalesChart(){
  const months = getLast6Months();
  const start = new Date(months[0].year, months[0].month, 1);

  const snap = await db.collection('movements').where('date','>=', start).get();

  const ventas = new Array(6).fill(0);
  snap.forEach(doc=>{
    const m = doc.data();
    if(m.type !== 'venta' || !m.date) return;
    const d = m.date.toDate ? m.date.toDate() : new Date(m.date);
    const idx = months.findIndex(mo => mo.year === d.getFullYear() && mo.month === d.getMonth());
    if(idx === -1) return;
    ventas[idx] += (Number(m.quantity)||0) * (Number(m.unitPrice)||0);
  });

  new Chart(document.getElementById('chartSales'), {
    type:'line',
    data:{
      labels: months.map(m=>m.label),
      datasets:[{
        label:'Ventas (S/.)', data: ventas,
        borderColor: CHART_COLORS.azul, backgroundColor:'rgba(79,124,172,.12)',
        fill:true, tension:.35, pointRadius:4, pointBackgroundColor: CHART_COLORS.azul
      }]
    },
    options: baseChartOptions(false)
  });
}

async function loadCategoryChart(){
  const snap = await db.collection('products').where('active','==', true).get();
  const byCategory = {};
  snap.forEach(doc=>{
    const p = doc.data();
    const cat = p.category || 'Otro';
    byCategory[cat] = (byCategory[cat]||0) + (Number(p.quantity)||0);
  });

  const labels = Object.keys(byCategory);
  const data = Object.values(byCategory);
  const palette = ['#4F7CAC','#5FA3A3','#4C9A78','#D9A24B','#C96A6E','#8893A2'];

  if(!labels.length){
    document.getElementById('chartCategory').parentElement.innerHTML = '<div class="empty-state" style="padding:24px;"><div class="ic">📭</div>Aún no hay productos registrados</div>';
    return;
  }

  new Chart(document.getElementById('chartCategory'), {
    type:'doughnut',
    data:{ labels, datasets:[{ data, backgroundColor: labels.map((_,i)=>palette[i % palette.length]), borderWidth:2, borderColor:'#fff' }] },
    options:{
      responsive:true, maintainAspectRatio:false,
      plugins:{ legend:{ position:'bottom', labels:{ boxWidth:11, font:{size:11}, color: CHART_COLORS.text } } }
    }
  });
}

function baseChartOptions(showLegend){
  return {
    responsive:true, maintainAspectRatio:false,
    plugins:{ legend:{ display: showLegend, position:'bottom', labels:{boxWidth:11, font:{size:11}, color: CHART_COLORS.text} } },
    scales:{
      x:{ grid:{ display:false }, ticks:{ color: CHART_COLORS.text, font:{size:11} } },
      y:{ grid:{ color: CHART_COLORS.grid }, ticks:{ color: CHART_COLORS.text, font:{size:11} }, beginAtZero:true }
    }
  };
}
