async function loadData(){
  try{
    const r = await fetch('data.json');
    const data = await r.json();
    return data;
  }catch(e){
    console.error(e);
    return [];
  }
}

function escapeHtml(s){ 
  return (s||'')
    .toString()
    .replace(/&/g,'&amp;')
    .replace(/</g,'&lt;')
    .replace(/>/g,'&gt;')
    .replace(/"/g,'&quot;'); 
}

function formatId(s){ 
  return (s||'').toString().replace(/\D/g,''); 
}

/* =======================
   LIMIT : 3 searches / day
======================= */
function checkSearchLimit(){
  const today = new Date().toISOString().slice(0,10);
  const limit = 3;

  let data = JSON.parse(localStorage.getItem('searchLimit'));

  if(!data || data.date !== today){
    data = { date: today, count: 0 };
  }

  if(data.count >= limit){
    return { allowed:false, remaining:0 };
  }

  data.count++;
  localStorage.setItem('searchLimit', JSON.stringify(data));

  return { allowed:true, remaining: limit - data.count };
}
/* ======================= */

function makeBanner(hasNotes){
  if(hasNotes) 
    return '<div class="py-2 px-4 rounded-t-lg text-white font-semibold" style="background:linear-gradient(90deg,#16a34a,#059669)"><span>يوجد قرارات تعديل</span></div>';
  return '<div class="py-2 px-4 rounded-t-lg text-white font-semibold" style="background:linear-gradient(90deg,#dc2626,#b91c1c)"><span>لا توجد قرارات تعديل</span></div>';
}

function makeCardHtml(item, idx){
  const hasNotes = (item.attachments || '').toString().trim() !== '';
  const banner = makeBanner(hasNotes);
  return `
    <div class="mb-3 rounded-lg overflow-hidden shadow" id="card-${idx}">
      ${banner}
      <div class="p-4 bg-white text-right">
        <p class="mb-1"><strong>الاسم:</strong> ${escapeHtml(item.name)}</p>
        <p class="mb-1"><strong>جهة التكليف:</strong> ${escapeHtml(item.current)}</p>
        <p class="mb-1"><strong>الرقم القومي:</strong> ${escapeHtml(item.id)}</p>
        <p class="mb-1"><strong>قرارات التعديل:</strong> ${
          item.attachments
            ? '<div class="whitespace-pre-line mt-2 text-sm">'+escapeHtml(item.attachments)+'</div>'
            : '<span class="text-red-600">لا توجد قرارات تعديل</span>'
        }</p>
      </div>
    </div>
  `;
}

function makeAccordion(items){
  let html = '<div class="space-y-2">';
  items.forEach((it, i)=>{
    const title = it.current || ('طلب رقم '+(i+1));
    const hasNotes = (it.attachments||'').toString().trim() !== '';
    const color = hasNotes ? 'bg-green-100' : 'bg-red-100';
    html += `
      <div class="border rounded-lg overflow-hidden ${color}">
        <button class="w-full text-right p-3 font-semibold accordion-header">${escapeHtml(title)}</button>
        <div class="accordion-body hidden p-3 bg-white text-right">
          ${makeCardHtml(it, i)}
        </div>
      </div>
    `;
  });
  html += '</div>';
  return html;
}

let ALL = [];

document.getElementById('searchBtn').addEventListener('click', async ()=>{
  if(!ALL.length) ALL = await loadData();
  doSearch();
});

document.getElementById('resetBtn').addEventListener('click', ()=>{
  document.getElementById('searchInput').value='';
  document.getElementById('result').innerHTML='';
});

document.getElementById('searchInput').addEventListener('keydown', async (e)=>{
  if(!ALL.length) ALL = await loadData();
  if(e.key === 'Enter') doSearch();
});

function doSearch(){
  const resDiv = document.getElementById('result');

  // LIMIT CHECK
  const limitCheck = checkSearchLimit();
  if(!limitCheck.allowed){
    resDiv.innerHTML = `
      <div class="mt-4 p-4 rounded-md border border-red-300 bg-red-50 text-red-700 text-sm font-semibold text-right">
        تم استنفاد عدد الاستعلامات المسموح بها لهذا اليوم.
        <br>يرجى المحاولة مرة أخرى غدًا.
      </div>
    `;
    return;
  }else{
    resDiv.innerHTML = `
      <div class="mb-2 text-sm text-red-600 text-right">
        متبقي ${limitCheck.remaining} محاولة اليوم
      </div>
    `;
  }

  const q = formatId(document.getElementById('searchInput').value);
  if(!q){
    resDiv.innerHTML +
