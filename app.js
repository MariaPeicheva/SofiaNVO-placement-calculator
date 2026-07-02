let sourceData;
const labels = { bulgarian: 'БЕЛ', math: 'МАТ', combined: 'Сумарен резултат' };
const inputs = {
  bulgarian: document.getElementById('bulgarianScore'),
  math: document.getElementById('mathScore'),
  gender: document.getElementById('gender'),
  combined: document.getElementById('combinedScore'),
  validation: document.getElementById('validation'),
  body: document.getElementById('resultsBody')
};
fetch('data.json')
  .then(response => response.json())
  .then(data => { sourceData = data; update(); })
  .catch(() => { inputs.validation.textContent = 'Данните не можаха да бъдат заредени. Проверете дали data.json е качен до index.html.'; });
['input', 'change'].forEach(eventName => {
  inputs.bulgarian.addEventListener(eventName, update);
  inputs.math.addEventListener(eventName, update);
  inputs.gender.addEventListener(eventName, update);
});
function update() {
  if (!sourceData) return;
  const bulgarian = Number(inputs.bulgarian.value);
  const math = Number(inputs.math.value);
  const gender = inputs.gender.value;
  const combined = roundTo2(bulgarian + math);
  inputs.combined.value = Number.isFinite(combined) ? combined.toFixed(2) : '';
  if (!validScore(bulgarian) || !validScore(math)) {
    inputs.validation.textContent = 'Въведете резултати между 0 и 100.';
    inputs.body.innerHTML = '';
    return;
  }
  inputs.validation.textContent = '';
  const rows = [buildResult('bulgarian', bulgarian, gender), buildResult('math', math, gender), buildResult('combined', combined, gender)];
  inputs.body.innerHTML = rows.map(row => `<tr><td>${row.label}</td><td>${formatScore(row.score)} (${row.band})</td><td>${formatInt(row.count)}</td><td>${formatInt(row.above)}</td><td class="rank">#${formatInt(row.rankFrom)}–${formatInt(row.rankTo)}</td><td>${formatInt(row.total)}</td><td>Топ ${row.topFrom}%–${row.topTo}%</td></tr>`).join('');
}
function buildResult(metric, score, gender) {
  const row = findBand(score);
  const stat = row[metric][gender];
  const total = sourceData.totals[metric][gender];
  const rankFrom = stat.above + 1;
  const rankTo = stat.above + stat.count;
  return { label: labels[metric], score, band: row.band, count: stat.count, above: stat.above, total, rankFrom, rankTo, topFrom: ((rankFrom / total) * 100).toFixed(1), topTo: ((rankTo / total) * 100).toFixed(1) };
}
function findBand(score) {
  // Row 4 from the source is excluded; score 0 uses the 0 - 0.499 band.
  const targetStart = Math.floor(score * 2) / 2;
  const match = sourceData.rows.find(row => { const parsed = parseBand(row.band); return parsed && targetStart >= parsed.min && targetStart <= parsed.max; });
  return match || sourceData.rows[sourceData.rows.length - 1];
}
function parseBand(band) {
  if (band === '0') return { min: 0, max: 0 };
  const parts = String(band).split(' - ').map(Number);
  if (parts.length === 2 && parts.every(Number.isFinite)) return { min: parts[0], max: parts[1] };
  const exact = Number(band);
  return Number.isFinite(exact) ? { min: exact, max: exact } : null;
}
function validScore(value) { return Number.isFinite(value) && value >= 0 && value <= 100; }
function roundTo2(value) { return Math.round(value * 100) / 100; }
function formatInt(value) { return new Intl.NumberFormat('bg-BG').format(value); }
function formatScore(value) { return new Intl.NumberFormat('bg-BG', { maximumFractionDigits: 2 }).format(value); }
