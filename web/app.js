// «ساعة البيت»: نفس شاشة التوقف حق صندوق شاومي، كصفحة تشتغل على شاشة سامسونج (وأي متصفح)
// الإعداد من الرابط: ?city=madinah
'use strict';

const CITIES = {
  madinah: { name: 'المدينة المنورة', lat: 24.4672, lon: 39.6111, west: true },
  makkah: { name: 'مكة المكرمة', lat: 21.4225, lon: 39.8262, west: true },
  jeddah: { name: 'جدة', lat: 21.4858, lon: 39.1925, west: true },
  taif: { name: 'الطائف', lat: 21.2703, lon: 40.4158, west: true },
  riyadh: { name: 'الرياض', lat: 24.7136, lon: 46.6753 },
  dammam: { name: 'الدمام', lat: 26.4207, lon: 50.0888 },
};
const q = new URLSearchParams(location.search);
const city = CITIES[q.get('city')] || CITIES.madinah;

const DAYS = ['الأحد', 'الاثنين', 'الثلاثاء', 'الأربعاء', 'الخميس', 'الجمعة', 'السبت'];
const MONTHS = ['يناير', 'فبراير', 'مارس', 'أبريل', 'مايو', 'يونيو', 'يوليو', 'أغسطس', 'سبتمبر', 'أكتوبر', 'نوفمبر', 'ديسمبر'];
const PRAYERS = { fajr: 'الفجر', dhuhr: 'الظهر', asr: 'العصر', maghrib: 'المغرب', isha: 'العشاء' };
const $ = (id) => document.getElementById(id);
const ar = (s) => String(s).replace(/[0-9]/g, (d) => '٠١٢٣٤٥٦٧٨٩'[d]).replace(/\./g, '٫').replace(/,/g, '٬');
const deg = (n) => '°' + ar(n);   // العلامة قبل الرقم منطقياً فتطلع «٢٨°» في السطر العربي
const dayMs = 86400000;
const startOfDay = (d) => new Date(d.getFullYear(), d.getMonth(), d.getDate());
const daysBetween = (a, b) => Math.round((startOfDay(b) - startOfDay(a)) / dayMs);

function hijriParts(d) {
  const f = new Intl.DateTimeFormat('en-u-ca-islamic-umalqura', { day: 'numeric', month: 'numeric', year: 'numeric' });
  const p = Object.fromEntries(f.formatToParts(d).map((x) => [x.type, x.value]));
  return { d: +p.day, m: +p.month, y: parseInt(p.year) };
}
const HMONTHS = ['محرم', 'صفر', 'ربيع الأول', 'ربيع الآخر', 'جمادى الأولى', 'جمادى الآخرة', 'رجب', 'شعبان', 'رمضان', 'شوال', 'ذو القعدة', 'ذو الحجة'];
const gregorian = (d) => `${ar(d.getDate())} ${MONTHS[d.getMonth()]} ${ar(d.getFullYear())}`;
const hijri = (d) => { const h = hijriParts(d); return `${ar(h.d)} ${HMONTHS[h.m - 1]} ${ar(h.y)} هـ`; };
const shortDate = (d) => `${DAYS[d.getDay()]} ${ar(d.getDate())} ${MONTHS[d.getMonth()]}`;

function time12(d) {
  const h = d.getHours() % 12 || 12;
  return { h: ar(h), m: ar(String(d.getMinutes()).padStart(2, '0')), ap: d.getHours() < 12 ? 'ص' : 'م' };
}
function inLabel(min) {
  const h = Math.floor(min / 60), m = min % 60;
  const hs = h === 0 ? '' : h === 1 ? 'ساعة' : h === 2 ? 'ساعتين' : h <= 10 ? `${ar(h)} ساعات` : `${ar(h)} ساعة`;
  const ms = m === 0 ? '' : m === 1 ? 'دقيقة' : m === 2 ? 'دقيقتين' : m <= 10 ? `${ar(m)} دقائق` : `${ar(m)} دقيقة`;
  return 'بعد ' + ([hs, ms].filter(Boolean).join(' و') || 'أقل من دقيقة');
}
const daysUntil = (n) => n <= 0 ? 'اليوم' : n === 1 ? 'بكرة' : n === 2 ? 'بعد يومين' : n <= 10 ? `بعد ${ar(n)} أيام` : `بعد ${ar(n)} يومًا`;
const daysCount = (n) => n === 1 ? 'يوم' : n === 2 ? 'يومين' : n <= 10 ? `${ar(n)} أيام` : `${ar(n)} يومًا`;

// ---------- الصلاة (أم القرى) ----------
function nextPrayer(now) {
  const coords = new adhan.Coordinates(city.lat, city.lon);
  const params = adhan.CalculationMethod.UmmAlQura();
  for (const off of [0, 1]) {
    const day = new Date(now.getTime() + off * dayMs);
    const pt = new adhan.PrayerTimes(coords, day, params);
    for (const k of ['fajr', 'dhuhr', 'asr', 'maghrib', 'isha']) if (pt[k] > now) return { name: PRAYERS[k], at: pt[k] };
  }
}

// ---------- رمضان ----------
function ramadan(today) {
  const h = hijriParts(today);
  if (h.m === 9) return { big: ar(h.d), unit: 'رمضان', sub: `اليوم ${ar(h.d)} من رمضان` };
  for (let i = 1; i < 400; i++) {
    const d = new Date(today.getTime() + i * dayMs);
    const x = hijriParts(d);
    if (x.m === 9 && x.d === 1) return { big: ar(i), unit: i >= 3 && i <= 10 ? 'أيام' : 'يومًا', sub: `يبدأ ${shortDate(d)} تقريبًا` };
  }
  return { big: '', unit: '', sub: '' };
}

// ---------- الإجازات ----------
let HOL = null;
const parseD = (s) => { const [y, m, d] = s.split('-').map(Number); return new Date(y, m - 1, d); };
function renderHolidays(today) {
  if (!HOL) return;
  const list = (city.west ? HOL.west : HOL.general).map((h) => ({ ...h, s: parseD(h.start), e: parseD(h.end) }));
  const cur = list.find((h) => today >= h.s && today <= h.e);
  const next = list.filter((h) => h.s > today);
  let html = '';
  if (cur) {
    const left = daysBetween(today, cur.e) + 1;
    html += `<div class="k">أنت الحين في</div><div class="t mint">${cur.name}</div><div class="d">باقي ${daysCount(left)} وترجع الدراسة ${shortDate(new Date(cur.e.getTime() + dayMs))}</div>`;
  } else if (next[0]) {
    const n = next[0], d = daysBetween(today, n.s), len = daysBetween(n.s, n.e) + 1;
    html += `<div class="k">أقرب إجازة</div><div class="t">${n.name}</div>`;
    html += d <= 2 ? `<div class="n">${daysUntil(d)}</div>` : `<div class="n">${ar(d)}<small>${d <= 10 ? 'أيام' : 'يومًا'}</small></div>`;
    html += `<div class="d">${shortDate(n.s)} — ${daysCount(len)}</div>`;
  }
  const rest = next.slice(cur ? 0 : 1, (cur ? 0 : 1) + 3);
  if (rest.length) {
    html += '<hr><div class="k" style="color:var(--faint)">بعدها</div>';
    for (const r of rest) {
      const len = daysBetween(r.s, r.e) + 1;
      html += `<div class="row"><div class="dot"></div><div class="x"><b>${r.name}</b><span>${ar(r.s.getDate())} ${MONTHS[r.s.getMonth()]} — ${daysCount(len)}</span></div><div class="w">${daysUntil(daysBetween(today, r.s))}</div></div>`;
    }
  }
  html += `<div class="foot">${city.west ? 'تقويم مكة والمدينة وجدة والطائف' : 'تقويم وزارة التعليم'}</div>`;
  $('hol').innerHTML = html;
}

// ---------- الطقس (Open-Meteo) ----------
const WX = { 0: ['مشمس', 'صافي'], 1: ['مشمس غالبًا', 'صافي غالبًا'], 2: 'غائم جزئيًا', 3: 'غائم', 45: 'ضباب', 48: 'ضباب', 51: 'رذاذ', 53: 'رذاذ', 55: 'رذاذ',
  61: 'مطر', 63: 'مطر', 65: 'مطر غزير', 80: 'زخات مطر', 81: 'زخات مطر', 82: 'زخات غزيرة', 95: 'عواصف رعدية', 96: 'عواصف رعدية', 99: 'عواصف رعدية' };
async function weather() {
  try {
    const r = await fetch(`https://api.open-meteo.com/v1/forecast?latitude=${city.lat}&longitude=${city.lon}&current=temperature_2m,apparent_temperature,weather_code,is_day&daily=temperature_2m_max,temperature_2m_min&timezone=auto&forecast_days=1`);
    const j = await r.json(), c = j.current, t = Math.round(c.temperature_2m), f = Math.round(c.apparent_temperature);
    const w = WX[c.weather_code]; const name = Array.isArray(w) ? w[c.is_day ? 0 : 1] : (w || '');
    $('wLbl').textContent = `الطقس الحين، ${city.name}`;
    $('wTemp').textContent = deg(t); $('wName').textContent = name;
    $('wSub').textContent = `العظمى ${deg(Math.round(j.daily.temperature_2m_max[0]))}، الصغرى ${deg(Math.round(j.daily.temperature_2m_min[0]))}` + (Math.abs(f - t) >= 2 ? `، كأنها ${deg(f)}` : '');
  } catch {}
}

// ---------- الصور ----------
let photos = [], pIdx = 0, layer = 0;
async function loadPhotos() {
  try { const r = await fetch('photos/photos.json?' + Date.now()); photos = (await r.json()).images || []; } catch {}
  if (photos.length) showPhoto();
}
function showPhoto() {
  const p = photos[pIdx % photos.length];
  const img = new Image();
  img.onload = () => {
    layer = 1 - layer;
    const el = $('ph' + layer); el.style.backgroundImage = `url(${img.src})`; el.classList.add('on');
    $('ph' + (1 - layer)).classList.remove('on');
    $('caption').textContent = p.caption || '';
  };
  img.src = 'photos/' + p.file;
}

// ---------- الرسم كل ثانية ----------
let lastMinute = -1;
function tick() {
  const now = new Date();
  const t = time12(now);
  $('hh').textContent = t.h; $('mm').textContent = t.m; $('ampm').textContent = t.ap;
  if (now.getMinutes() !== lastMinute) {
    lastMinute = now.getMinutes();
    const today = startOfDay(now);
    $('day').textContent = DAYS[now.getDay()];
    $('dates').textContent = `${gregorian(now)} — ${hijri(now)}`;
    const np = nextPrayer(now); const pt = time12(np.at);
    $('pName').textContent = np.name; $('pTime').textContent = `${pt.h}:${pt.m} ${pt.ap}`;
    $('pIn').textContent = inLabel(Math.round((np.at - now) / 60000));
    const r = ramadan(today); $('rBig').textContent = r.big; $('rUnit').textContent = r.unit; $('rSub').textContent = r.sub;
    renderHolidays(today);
    // خافت بالليل (١٠م – ٦ص)
    document.body.classList.toggle('night', now.getHours() >= 22 || now.getHours() < 6);
    // نحرّك المحتوى شوي كل ٣ دقايق عشان ما تنحرق الشاشة
    const k = Math.floor(now.getTime() / 180000);
    $('stage').style.transform = `translate(${((k % 5) - 2) * 9}px, ${((k % 3) - 1) * 8}px)`;
  }
  setTimeout(tick, 1000 - (Date.now() % 1000));
}

(async () => {
  try { HOL = await (await fetch('holidays.json?' + Date.now())).json(); } catch {}
  tick();
  weather(); setInterval(weather, 15 * 60000);
  loadPhotos(); setInterval(() => { pIdx++; showPhoto(); }, 10 * 60000);
  setInterval(loadPhotos, 6 * 3600000);
  // نعيد تحميل الصفحة مرة باليوم عشان أي تحديث في التصميم يوصل لحاله
  setTimeout(() => location.reload(), (24 - new Date().getHours()) * 3600000 + 5 * 60000);
})();
