let sourceData;
const labels = { bulgarian: 'БЕЛ', math: 'МАТ', combined: 'Сумарен резултат' };
const gradePoints = { 6: 50, 5: 39, 4: 26, 3: 15 };
const gradeLabels = { 6: 'Отличен 6', 5: 'Много добър 5', 4: 'Добър 4', 3: 'Среден 3' };
const annualGrades = {};
const specialScores = {};
const inputs = {
  bulgarian: document.getElementById('bulgarianScore'),
  math: document.getElementById('mathScore'),
  gender: document.getElementById('gender'),
  combined: document.getElementById('combinedScore'),
  validation: document.getElementById('validation'),
  body: document.getElementById('resultsBody'),
  gradeOne: document.getElementById('gradeOne'),
  gradeTwo: document.getElementById('gradeTwo'),
  coefBulgarian: document.getElementById('coefBulgarian'),
  coefMath: document.getElementById('coefMath'),
  totalGradeScore: document.getElementById('totalGradeScore'),
  gradeValidation: document.getElementById('gradeValidation'),
  maxGradeNote: document.getElementById('maxGradeNote'),
  annualSubjectInputs: document.getElementById('annualSubjectInputs'),
  specialScoreInputs: document.getElementById('specialScoreInputs'),
  programResultsBody: document.getElementById('programResultsBody')
};
fetch('data.json')
  .then(response => response.json())
  .then(data => { sourceData = data; buildProgramInputs(); update(); })
  .catch(() => { inputs.validation.textContent = 'Данните не можаха да бъдат заредени. Проверете дали data.json е качен до index.html.'; });
['input', 'change'].forEach(eventName => {
  inputs.bulgarian.addEventListener(eventName, update);
  inputs.math.addEventListener(eventName, update);
  inputs.gender.addEventListener(eventName, update);
  inputs.gradeOne.addEventListener(eventName, updateTotalGrade);
  inputs.gradeTwo.addEventListener(eventName, updateTotalGrade);
  inputs.coefBulgarian.addEventListener(eventName, syncCoefMathFromBulgarian);
  inputs.coefMath.addEventListener(eventName, updateTotalGrade);
});
document.querySelectorAll('input[name="quotaFilter"]').forEach(radio => radio.addEventListener('change', updatePrograms));
function syncCoefMathFromBulgarian() {
  const coefBulgarian = Number(inputs.coefBulgarian.value);
  if (validCoefficient(coefBulgarian)) inputs.coefMath.value = String(4 - coefBulgarian);
  updateTotalGrade();
}
function update() {
  const bulgarian = Number(inputs.bulgarian.value);
  const math = Number(inputs.math.value);
  const combined = roundTo2(bulgarian + math);
  inputs.combined.value = Number.isFinite(combined) ? combined.toFixed(2) : '';
  updateTotalGrade();
  if (!sourceData) return;
  const gender = inputs.gender.value;
  if (!validScore(bulgarian) || !validScore(math)) {
    inputs.validation.textContent = 'Въведете резултати между 0 и 100.';
    inputs.body.innerHTML = '';
    if (inputs.programResultsBody) inputs.programResultsBody.innerHTML = '<tr><td colspan="8">Въведете валидни точки по БЕЛ и МАТ.</td></tr>';
    return;
  }
  inputs.validation.textContent = '';
  const rows = [buildResult('bulgarian', bulgarian, gender), buildResult('math', math, gender), buildResult('combined', combined, gender)];
  inputs.body.innerHTML = rows.map(row => '<tr><td>' + row.label + '</td><td>' + formatScore(row.score) + ' (' + row.band + ')</td><td>' + formatInt(row.count) + '</td><td>' + formatInt(row.above) + '</td><td class="rank">#' + formatInt(row.rankFrom) + '–' + formatInt(row.rankTo) + '</td><td>' + formatInt(row.total) + '</td><td>Топ ' + row.topFrom + '%–' + row.topTo + '%</td></tr>').join('');
  updatePrograms();
}
function updateTotalGrade() {
  const bulgarian = Number(inputs.bulgarian.value);
  const math = Number(inputs.math.value);
  const gradeOne = Number(inputs.gradeOne.value);
  const gradeTwo = Number(inputs.gradeTwo.value);
  const coefBulgarian = Number(inputs.coefBulgarian.value);
  const coefMath = Number(inputs.coefMath.value);
  updateGradeNote(coefBulgarian, coefMath, gradeOne, gradeTwo);
  if (!validScore(bulgarian) || !validScore(math) || !validCoefficient(coefBulgarian) || !validCoefficient(coefMath) || coefBulgarian + coefMath !== 4) {
    inputs.gradeValidation.textContent = 'Коефициентите трябва да са цели числа от 1 до 3 и сборът им да е точно 4.';
    inputs.totalGradeScore.textContent = '—';
    return;
  }
  inputs.gradeValidation.textContent = '';
  const total = bulgarian * coefBulgarian + math * coefMath + gradePoints[gradeOne] + gradePoints[gradeTwo];
  inputs.totalGradeScore.textContent = formatNumber(roundTo2(total));
  updatePrograms();
}
function updateGradeNote(coefBulgarian, coefMath, gradeOne, gradeTwo) {
  if (!inputs.maxGradeNote) return;
  if (!validCoefficient(coefBulgarian) || !validCoefficient(coefMath) || coefBulgarian + coefMath !== 4 || !gradePoints[gradeOne] || !gradePoints[gradeTwo]) { inputs.maxGradeNote.textContent = 'балът се изчислява след валидни коефициенти и оценки'; return; }
  const certificatePoints = gradePoints[gradeOne] + gradePoints[gradeTwo];
  const maxExamPoints = 100 * coefBulgarian + 100 * coefMath;
  const maxScore = maxExamPoints + certificatePoints;
  inputs.maxGradeNote.textContent = 'макс. ' + formatNumber(maxScore) + ' при коефициенти ' + coefBulgarian + ' + ' + coefMath + ' и годишни оценки ' + gradeLabels[gradeOne] + ' + ' + gradeLabels[gradeTwo];
}
function buildProgramInputs() {
  if (!inputs.annualSubjectInputs || !sourceData.annualSubjects) return;
  inputs.annualSubjectInputs.innerHTML = ''; inputs.specialScoreInputs.innerHTML = '';
  sourceData.annualSubjects.forEach(subject => {
    annualGrades[subject] = annualGrades[subject] || '6';
    const label = document.createElement('label'); label.textContent = subject;
    const select = document.createElement('select');
    [6,5,4,3].forEach(grade => { const option = document.createElement('option'); option.value = String(grade); option.textContent = gradeLabels[grade] + ' → ' + gradePoints[grade] + ' т.'; select.appendChild(option); });
    select.value = annualGrades[subject]; select.addEventListener('change', () => { annualGrades[subject] = select.value; updatePrograms(); });
    label.appendChild(select); inputs.annualSubjectInputs.appendChild(label);
  });
  (sourceData.specialSubjects || []).forEach(subject => {
    specialScores[subject] = specialScores[subject] || 0;
    const label = document.createElement('label'); label.textContent = subject;
    const input = document.createElement('input'); input.type = 'number'; input.min = '0'; input.max = '100'; input.step = '0.01'; input.value = specialScores[subject];
    input.addEventListener('input', () => { specialScores[subject] = Math.max(0, Math.min(100, Number(input.value) || 0)); updatePrograms(); });
    label.appendChild(input); inputs.specialScoreInputs.appendChild(label);
  });
}
function updatePrograms() {
  if (!sourceData || !sourceData.programs || !inputs.programResultsBody) return;
  const bulgarian = Number(inputs.bulgarian.value); const math = Number(inputs.math.value);
  if (!validScore(bulgarian) || !validScore(math)) return;
  const gender = inputs.gender.value;
  const selected = document.querySelector('input[name="quotaFilter"]:checked');
  const filter = selected ? selected.value : 'all';
  const programs = sourceData.programs.map(program => { const score = scoreProgram(program.formula, bulgarian, math); const cutoff = Number(program.min && program.min[gender]); return { ...program, score, cutoff, margin: score - cutoff }; })
    .filter(program => Number.isFinite(program.cutoff) && program.margin >= 0)
    .filter(program => filter === 'all' || (filter === 'quotas' ? program.quotas === 'Quotas' : program.quotas === 'No quotas'))
    .sort((a, b) => b.cutoff - a.cutoff).slice(0, 10);
  if (!programs.length) { inputs.programResultsBody.innerHTML = '<tr><td colspan="8">Няма паралелки, които отговарят на избрания филтър и текущия бал.</td></tr>'; return; }
  inputs.programResultsBody.innerHTML = programs.map(program => '<tr><td>' + escapeHtml(program.rankNo) + '</td><td>' + escapeHtml(program.school) + '</td><td>' + escapeHtml(program.program) + '</td><td>' + escapeHtml(program.quotas) + '</td><td>' + formatNumber(roundTo2(program.score)) + '</td><td>' + formatNumber(program.cutoff) + '</td><td>' + formatNumber(roundTo2(program.margin)) + '</td><td>' + escapeHtml(program.code) + '</td></tr>').join('');
}
function scoreProgram(method, bulgarian, math) { const alternatives = String(method || '').split(/\s+или\s+/i).map(text => text.trim()).filter(Boolean); return Math.max(...alternatives.map(text => scoreAlternative(text, bulgarian, math)), 0); }
function scoreAlternative(text, bulgarian, math) { const groups = [...String(text).matchAll(/\(([^()]*)\)/g)].map(match => match[1]); return sumTerms(groups[0] || text, 'exam', bulgarian, math) + sumTerms(groups.slice(1).join(' + '), 'annual', bulgarian, math); }
function sumTerms(text, type, bulgarian, math) { let total = 0; const re = /(\d+(?:[.,]\d+)?)\s*\*\s*([^+()]+)/g; let match; while ((match = re.exec(String(text))) !== null) total += Number(String(match[1]).replace(',', '.')) * valueForToken(String(match[2]).trim().replace(/\s+/g, ' '), type, bulgarian, math); return total; }
function valueForToken(token, type, bulgarian, math) { if (type === 'exam') { if (token === 'БЕЛ') return bulgarian; if (token === 'МАТ') return math; return Number(specialScores[token] || 0); } return gradePoints[Number(annualGrades[token] || 6)] || 0; }
function buildResult(metric, score, gender) { const row = findBand(score); const stat = row[metric][gender]; const total = sourceData.totals[metric][gender]; const rankFrom = stat.above + 1; const rankTo = stat.above + stat.count; return { label: labels[metric], score, band: row.band, count: stat.count, above: stat.above, total, rankFrom, rankTo, topFrom: ((rankFrom / total) * 100).toFixed(1), topTo: ((rankTo / total) * 100).toFixed(1) }; }
function findBand(score) { const targetStart = Math.floor(score * 2) / 2; const match = sourceData.rows.find(row => { const parsed = parseBand(row.band); return parsed && targetStart >= parsed.min && targetStart <= parsed.max; }); return match || sourceData.rows[sourceData.rows.length - 1]; }
function parseBand(band) { const parts = String(band).split(' - ').map(Number); if (parts.length === 2 && parts.every(Number.isFinite)) return { min: parts[0], max: parts[1] }; const exact = Number(band); return Number.isFinite(exact) ? { min: exact, max: exact } : null; }
function validScore(value) { return Number.isFinite(value) && value >= 0 && value <= 100; }
function validCoefficient(value) { return Number.isInteger(value) && value >= 1 && value <= 3; }
function roundTo2(value) { return Math.round(value * 100) / 100; }
function formatInt(value) { return new Intl.NumberFormat('bg-BG').format(value); }
function formatScore(value) { return new Intl.NumberFormat('bg-BG', { maximumFractionDigits: 2 }).format(value); }
function formatNumber(value) { return new Intl.NumberFormat('bg-BG', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(value); }
function escapeHtml(value) { return String(value ?? '').replace(/[&<>"]/g, char => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[char])); }
