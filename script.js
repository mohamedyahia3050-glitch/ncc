/* =======================
   LOAD DATA
======================= */
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
   ADMIN SECRET
======================= */
const ADMIN_SECRET = 'yahia3050';

/* =======================
   SEARCH LIMIT (3 / DAY)
======================= */
function checkSearchLimit(){
  if(localStorage.getItem('ADMIN_MODE') === '1'){
    return { allowed:true, remaining:'غير محدود' };
  }

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

/* =======================
   CAPTCHA
======================= */
let captchaAnswer = null;
let captchaPassed = false;

function generateCaptcha(){
  const a = Math.floor(Math.random()*9) + 1;
  const b = Math.floor(Math.random()*9) + 1;
  captchaAnswer = a + b;

  document.getElementById('captchaQuestion').innerText = `${a} + ${b} = ؟`;
  document.getElementById('captchaInput').value = '';
  document.getElementById('captchaBox').classList.remove('hidden');
}

/* =======================
   UI
======================= */
function makeBanner(hasNotes){
  if(hasNotes)
    return '<div class="py-2 px-4 rounded-t-lg text-white font-semibold" style="background:linear-gradient(90deg,#16a34a,#059669)">يوجد قرارات تعديل</div>';
  return '<div class="py-2 px-4 rounded-t-lg text-white font-semibold" style="background:linear-gradient(90deg,#dc2626,#b91c1c)">لا توجد قرارات تعديل</div>';
}

function makeCardHtml(item, idx){
  const hasNotes = (item.attachments||'').toString().trim() !== '';
  return `
    <div class="mb-3 rounded-lg overflow-hidden shadow" id="card-${idx}">
      ${makeBanner(hasNotes)}
      <div class="p-4 bg-white text-right">
        <p><strong>الاسم:</strong> ${escapeHtml(item.name)}</p>
        <p><strong>جهة التكليف:</strong> ${escapeHtml(item.current)}</p>
        <p><strong>الرقم القومي:</strong> ${escapeHtml(item.id)}</p>
        <p><strong>قرارات التعديل:</strong>
          ${
            hasNotes
              ? `<div class="mt-2 text-sm whitespace-pre-line">${escapeHtml(item.attachments)}</div>`
              : '<span class="text-red-600">لا توجد قرارات تعديل</span>'
          }
        </p>
      </div>
    </div>
  `;
}

function makeAccordion(items){
  let html = '<div class="space-y-2">';
  items.forEach((it,i)=>{
    html += `
      <div class="border rounded-lg overflow-hidden">
        <button class="w-full text-right p-3 font-semibold accordion-header">
          ${escapeHtml(it.current || 'طلب '+(i+1))}
        </button>
        <div class="accordion-body hidden p-3 bg-white">
          ${makeCardHtml(it,i)}
        </div>
      </div>
    `;
  });
  html += '</div>';
  return html;
}

/* =======================
   EVENTS
======================= */
let ALL = [];

document.getElementById('searchBtn').addEventListener('click', async ()=>{
  if(!ALL.length) ALL = await loadData();
  doSearch();
});

document.getElementById('resetBtn').addEventListener('click', ()=>{
  document.getElementById('searchInput').value='';
  document.getElementById('result').innerHTML='';
  captchaPassed = false;
  captchaAnswer = null;
  document.getElementById('captchaBox').classList.add('hidden');
});

document.getElementById('searchInput').addEventListener('keydown', async (e)=>{
  if(e.key === 'Enter'){
    if(!ALL.length) ALL = await loadData();
    doSearch();
  }
});

/* ===== CAPTCHA INPUT ===== */
document.getElementById('captchaInput').addEventListener('keydown', (e)=>{
  if(e.key === 'Enter'){
    const val = e.target.value.trim();

    // كلمة السر → أدمن فورًا
    if(val === ADMIN_SECRET){
      localStorage.setItem('ADMIN_MODE','1');
      captchaPassed = true;
      document.getElementById('captchaBox').classList.add('hidden');
      doSearch();
      return;
    }

    // مستخدم عادي
    if(val === captchaAnswer.toString()){
      captchaPassed = true;
      document.getElementById('captchaBox').classList.add('hidden');
      doSearch();
    }else{
      document.getElementById('result').innerHTML =
        '<p class="text-red-600 font-semibold">ناتج عملية التحقق غير صحيح</p>';
    }
  }
});

/* =======================
   SEARCH
======================= */
function doSearch(){
  const resDiv = document.getElementById('result');

  if(localStorage.getItem('ADMIN_MODE') !== '1' && !captchaPassed){
    if(captchaAnswer === null) generateCaptcha();
    resDiv.innerHTML =
      '<p class="text-red-600 font-semibold">يرجى حل عملية التحقق أولاً لعرض النتيجة</p>';
    return;
  }

  const limit = checkSearchLimit();
  if(!limit.allowed){
    resDiv.innerHTML = `
      <div class="p-4 bg-red-50 border border-red-300 text-red-700 rounded-md text-right font-semibold">
        تم استنفاد عدد الاستعلامات المسموح بها لهذا اليوم.<br>
        يرجى المحاولة مرة أخرى غدًا.
      </div>`;
    return;
  }

  const q = formatId(document.getElementById('searchInput').value);
  if(!q){
    resDiv.innerHTML = '<p class="text-red-500">من فضلك أدخل الرقم القومي</p>';
    return;
  }

  const matches = ALL.filter(it => formatId(it.id) === q);
  if(!matches.length){
    resDiv.innerHTML = '<p class="text-red-500 font-semibold">لا توجد بيانات لهذا الرقم القومي</p>';
    return;
  }

  if(typeof limit.remaining === 'number'){
    resDiv.innerHTML =
      `<div class="mb-2 text-sm text-red-600">متبقي ${limit.remaining} محاولة اليوم</div>`;
  }else{
    resDiv.innerHTML = '';
  }

  if(matches.length === 1){
    resDiv.innerHTML += makeCardHtml(matches[0],0);
    return;
  }

  resDiv.innerHTML += makeAccordion(matches);
  document.querySelectorAll('.accordion-header').forEach(btn=>{
    btn.addEventListener('click', ()=>{
      btn.nextElementSibling.classList.toggle('hidden');
    });
  });
}
