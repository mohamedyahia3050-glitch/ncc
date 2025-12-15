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

function escapeHtml(s){ return (s||'').toString().replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;'); }

function formatId(s){ return (s||'').toString().replace(/\D/g,''); }

function makeBanner(hasNotes){
  if(hasNotes) return '<div class="py-2 px-4 rounded-t-lg text-white font-semibold" style="background:linear-gradient(90deg,#16a34a,#059669)"><span>يوجد ملاحظات</span></div>';
  return '<div class="py-2 px-4 rounded-t-lg text-white font-semibold" style="background:linear-gradient(90deg,#dc2626,#b91c1c)"><span>لا توجد ملاحظات</span></div>';
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
        <p class="mb-1"><strong>الملاحظات:</strong> ${ item.attachments ? '<div class="whitespace-pre-line mt-2 text-sm">'+escapeHtml(item.attachments)+'</div>' : '<span class="text-red-600">لا توجد ملاحظات</span>' }</p>
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
  const q = formatId(document.getElementById('searchInput').value);
  const resDiv = document.getElementById('result');
  if(!q){ resDiv.innerHTML = '<p class="text-red-500">من فضلك أدخل الرقم القومي</p>'; return; }
  const matches = ALL.filter(it => formatId(it.id) === q);
  if(!matches.length){ resDiv.innerHTML = '<p class="text-red-500 font-semibold">لا توجد بيانات لهذا الرقم القومي</p>'; return; }
  if(matches.length === 1){
    resDiv.innerHTML = makeCardHtml(matches[0], 0);
    return;
  }
  resDiv.innerHTML = makeAccordion(matches);
  document.querySelectorAll('.accordion-header').forEach((btn, idx)=>{
    btn.addEventListener('click', ()=>{
      const body = btn.nextElementSibling;
      if(!body) return;
      body.classList.toggle('hidden');
    });
  });
}
