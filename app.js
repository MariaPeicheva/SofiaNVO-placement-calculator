let sourceData;
const labels = { bulgarian: 'БЕЛ', math: 'МАТ', combined: 'Сумарен резултат' };
const gradePoints = { 6: 50, 5: 39, 4: 26, 3: 15 };
const gradeLabels = { 6: 'Отличен 6', 5: 'Много добър 5', 4: 'Добър 4', 3: 'Среден 3' };
const annualGrades = {};
const specialScores = {};
let visibleProgramCount = 10;
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
  programResultsBody: document.getElementById('programResultsBody'),
  showMorePrograms: document.getElementById('showMorePrograms')
};
const requiredElements = ['bulgarian','math','gender','combined','validation','body','gradeOne','gradeTwo','coefBulgarian','coefMath','totalGradeScore','gradeValidation','maxGradeNote'];
function reportMissingParameters() {
  const missing = requiredElements.filter(key => !inputs[key]);
  if (!missing.length) return false;
  const message = 'Липсващи HTML елементи: ' + missing.join(', ') + '. Качете обновените index.html и app.js заедно.';
  const target = inputs.validation || document.body;
  if (target) target.textContent = message;
  console.error(message);
  return true;
}
if (reportMissingParameters()) throw new Error('Missing required HTML elements');
fetch('data.json')
  .then(response => response.json())
  .then(data => { sourceData = data; validateRankingShape(data); validateProgramShape(data); buildProgramInputs(); update(); })
  .catch(error => { inputs.validation.textContent = 'Данните не можаха да бъдат заредени или са в грешен формат: ' + error.message; console.error(error); });
function validateRankingShape(data) {
  const missing = [];
  if (!Array.isArray(data.rows)) missing.push('rows');
  if (!data.totals) missing.push('totals');
  if (missing.length) throw new Error('Липсващи параметри за НВО класиране в data.json: ' + missing.join(', '));
}
function validateProgramShape(data) {
  const ok = Array.isArray(data.programs) && Array.isArray(data.annualSubjects) && Array.isArray(data.specialSubjects);
  if (ok) return true;
  console.warn('Липсват данни за топ 10 паралелки. НВО справката ще продължи да работи.');
  if (inputs.programResultsBody) inputs.programResultsBody.innerHTML = '<tr><td colspan="9">Липсват данни за паралелките в data.json. Качете обновения data.json, за да работи тази секция.</td></tr>';
  return false;
}
['input', 'change'].forEach(eventName => {
  inputs.bulgarian.addEventListener(eventName, () => { resetProgramCount(); update(); });
  inputs.math.addEventListener(eventName, () => { resetProgramCount(); update(); });
  inputs.gender.addEventListener(eventName, () => { resetProgramCount(); update(); });
  inputs.gradeOne.addEventListener(eventName, updateTotalGrade);
  inputs.gradeTwo.addEventListener(eventName, updateTotalGrade);
  inputs.coefBulgarian.addEventListener(eventName, syncCoefMathFromBulgarian);
  inputs.coefMath.addEventListener(eventName, updateTotalGrade);
});
document.querySelectorAll('input[name="quotaFilter"]').forEach(radio => radio.addEventListener('change', () => { resetProgramCount(); updatePrograms(); }));
document.querySelectorAll('input[name="studentGender"]').forEach(radio => radio.addEventListener('change', () => { resetProgramCount(); updatePrograms(); }));
if (inputs.showMorePrograms) inputs.showMorePrograms.addEventListener('click', handleShowMorePrograms);
function resetProgramCount() { visibleProgramCount = 10; }
function handleShowMorePrograms(event) { if (event && event.preventDefault) event.preventDefault(); visibleProgramCount += 10; updatePrograms(); }
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
    if (inputs.programResultsBody) inputs.programResultsBody.innerHTML = '<tr><td colspan="9">Въведете валидни точки по БЕЛ и МАТ.</td></tr>';
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
  if (!inputs.annualSubjectInputs || !sourceData.annualSubjects || !sourceData.specialSubjects) return;
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
  if (!sourceData || !Array.isArray(sourceData.programs) || !inputs.programResultsBody) return;
  const bulgarian = Number(inputs.bulgarian.value); const math = Number(inputs.math.value);
  if (!validScore(bulgarian) || !validScore(math)) return;
  const gender = inputs.gender.value;
  const selected = document.querySelector('input[name="quotaFilter"]:checked');
  const selectedStudentGender = document.querySelector('input[name="studentGender"]:checked');
  const studentGender = selectedStudentGender ? selectedStudentGender.value : 'boys';
  const filter = selected ? selected.value : 'all';
  const programs = sourceData.programs.map(program => { const score = scoreProgram(program.formula, bulgarian, math); const hasQuota = isQuota(program.quotas); const cutoffKey = hasQuota ? studentGender : 'overall'; const cutoff = Number((program.min && (program.min[cutoffKey] || program.min.overall))); return { ...program, score, cutoff, margin: score - cutoff }; })
    .filter(program => Number.isFinite(program.cutoff) && program.margin >= 0)
    .filter(program => filter === 'all' || (filter === 'quotas' ? isQuota(program.quotas) : isNoQuota(program.quotas)))
    .sort((a, b) => b.cutoff - a.cutoff);
  if (!programs.length) { inputs.programResultsBody.innerHTML = '<tr><td colspan="9">Няма паралелки, които отговарят на избрания филтър и текущия бал.</td></tr>'; if (inputs.showMorePrograms) { inputs.showMorePrograms.hidden = true; inputs.showMorePrograms.disabled = true; } return; }
  const visiblePrograms = programs.slice(0, visibleProgramCount);
  inputs.programResultsBody.innerHTML = visiblePrograms.map(program => '<tr>' +
    '<td>' + escapeHtml(program.rankNo) + '</td>' +
    '<td>' + escapeHtml(program.school) + '</td>' +
    '<td>' + escapeHtml(program.program) + '</td>' +
    '<td>' + escapeHtml(formatQuota(program.quotas)) + '</td>' +
    '<td>' + formatNumber(roundTo2(program.score)) + '</td>' +
    '<td>' + formatNumber(program.cutoff) + '</td>' +
    '<td>' + formatNumber(roundTo2(program.margin)) + '</td>' +
    '<td class="formula-cell">' + escapeHtml(program.formula || '—') + '</td>' +
    '<td>' + escapeHtml(program.code) + '</td>' +
    '</tr>').join('');
  if (inputs.showMorePrograms) { const remaining = Math.max(0, programs.length - visibleProgramCount); inputs.showMorePrograms.hidden = false; inputs.showMorePrograms.disabled = remaining === 0; inputs.showMorePrograms.textContent = remaining === 0 ? 'Показани са всички ' + programs.length + ' резултата' : 'Покажи още (' + Math.min(10, remaining) + ')'; }
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
function isQuota(value) { return value === 'С квоти' || value === 'Quotas'; }
function isNoQuota(value) { return value === 'Без квоти' || value === 'No quotas'; }
function formatQuota(value) { return isQuota(value) ? 'С квоти' : isNoQuota(value) ? 'Без квоти' : value; }
function escapeHtml(value) { return String(value ?? '').replace(/[&<>"]/g, char => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[char])); }
