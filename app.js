"use strict";

const state = { data: null, annualGrades: {}, specialScores: {} };
const els = {};

document.addEventListener('DOMContentLoaded', async () => {
  cacheElements();
  try {
    const response = await fetch('data.json');
    if (!response.ok) throw new Error('data.json не може да се зареди');
    state.data = await response.json();
    buildExactInputs();
    attachEvents();
    updateAll();
  } catch (error) {
    document.body.insertAdjacentHTML('afterbegin', '<p class="load-error">Грешка при зареждане на данните: ' + error.message + '</p>');
  }
});

function cacheElements() {
  ['bulgarianScore','mathScore','gender','combinedScore','validation','rankRows','bulgarianCoef','mathCoef','gradeOne','gradeTwo','generalScore','mathWeightedScore','scoreNote','annualInputs','specialInputs','quotaFilter','programRows'].forEach(id => els[id] = document.getElementById(id));
}
function attachEvents() {
  ['bulgarianScore','mathScore','gender','gradeOne','gradeTwo','quotaFilter'].forEach(id => els[id].addEventListener('input', updateAll));
  els.bulgarianCoef.addEventListener('change', () => { els.mathCoef.value = String(4 - Number(els.bulgarianCoef.value)); updateAll(); });
}
function buildExactInputs() {
  const gp = state.data.gradePoints;
  for (const subject of state.data.annualSubjects) {
    state.annualGrades[subject] = '6';
    const label = document.createElement('label'); label.textContent = subject;
    const select = document.createElement('select');
    Object.keys(gp).sort((a,b) => Number(b) - Number(a)).forEach(grade => {
      const option = document.createElement('option'); option.value = grade; option.textContent = grade + ' → ' + gp[grade] + ' т.'; select.appendChild(option);
    });
    select.value = '6'; select.addEventListener('input', () => { state.annualGrades[subject] = select.value; updateAll(); });
    label.appendChild(select); els.annualInputs.appendChild(label);
  }
  for (const subject of state.data.specialSubjects) {
    state.specialScores[subject] = 0;
    const label = document.createElement('label'); label.textContent = subject;
    const input = document.createElement('input'); input.type = 'number'; input.min = '0'; input.max = '100'; input.step = '0.01'; input.value = '0';
    input.addEventListener('input', () => { state.specialScores[subject] = clamp(num(input.value), 0, 100); updateAll(); });
    label.appendChild(input); els.specialInputs.appendChild(label);
  }
}
function updateAll() {
  const bel = clamp(num(els.bulgarianScore.value), 0, 100);
  const mat = clamp(num(els.mathScore.value), 0, 100);
  const hasBel = els.bulgarianScore.value !== ''; const hasMat = els.mathScore.value !== '';
  const combined = hasBel && hasMat ? bel + mat : null;
  els.combinedScore.value = combined == null ? '' : format(combined);
  els.validation.textContent = !hasBel || !hasMat ? 'Въведете резултат по БЕЛ и МАТ.' : '';
  updateRanks(bel, mat, combined); updateScoreCards(bel, mat); updatePrograms(bel, mat);
}
function updateRanks(bel, mat, combined) {
  const gender = els.gender.value;
  const rows = [['БЕЛ', bel, 'bulgarian'], ['МАТ', mat, 'math'], ['Сумарен резултат', combined, 'combined']];
  els.rankRows.innerHTML = rows.map(([name, score, key]) => {
    if (score == null || Number.isNaN(score)) return rowHtml([name, '—', '—', '—', '—', '—']);
    const band = findBand(score); const item = state.data.distributions[band.index]?.[key]?.[gender];
    if (!item) return rowHtml([name, format(score), '—', '—', '—', '—']);
    const start = Number(item.greater) + 1; const end = Number(item.greater) + Number(item.count);
    const total = Number(state.data.distributions[0][key][gender].greater) + Number(state.data.distributions[0][key][gender].count);
    return rowHtml([name, format(score) + ' (' + band.label + ')', int(item.count), int(item.greater), '#' + int(start) + '–' + int(end), 'Топ ' + pct(start / total) + '–' + pct(end / total)]);
  }).join('');
}
function findBand(score) { const index = Math.min(state.data.distributions.length - 1, Math.floor(clamp(score, 0, 200) * 2)); return { index, label: state.data.distributions[index]?.band || '' }; }
function updateScoreCards(bel, mat) {
  const coefBel = Number(els.bulgarianCoef.value); const coefMat = 4 - coefBel; els.mathCoef.value = String(coefMat);
  const grade1 = gradePoints(els.gradeOne.value); const grade2 = gradePoints(els.gradeTwo.value);
  const general = bel * coefBel + mat * coefMat + grade1 + grade2; const mathWeighted = bel + mat * 3 + grade1 + grade2;
  els.generalScore.textContent = format(general); els.mathWeightedScore.textContent = format(mathWeighted);
  els.scoreNote.textContent = 'Формула: БЕЛ × ' + coefBel + ' + МАТ × ' + coefMat + ' + ' + grade1 + ' + ' + grade2 + '.';
}
function updatePrograms(bel, mat) {
  const gender = els.gender.value; const filter = els.quotaFilter.value;
  const rows = state.data.programs.map(program => {
    const score = scoreProgram(program.formula, bel, mat); const cutoff = Number(program.min?.[gender]); const margin = score - cutoff;
    return { ...program, score, cutoff, margin };
  }).filter(p => Number.isFinite(p.cutoff) && p.margin >= 0)
    .filter(p => filter === 'all' || (filter === 'quotas' ? p.quotas === 'Quotas' : p.quotas === 'No quotas'))
    .sort((a, b) => b.cutoff - a.cutoff).slice(0, 10);
  els.programRows.innerHTML = rows.length ? rows.map(p => rowHtml([p.rankNo, p.school, p.program, p.quotas, format(p.score), format(p.cutoff), format(p.margin), p.code])).join('') : '<tr><td colspan="8">Няма паралелки, които отговарят на избрания филтър и текущия бал.</td></tr>';
}
function scoreProgram(method, bel, mat) { const alternatives = String(method || '').split(/\s+или\s+/i).map(s => s.trim()).filter(Boolean); return Math.max(...alternatives.map(alt => scoreAlternative(alt, bel, mat)), 0); }
function scoreAlternative(text, bel, mat) { const groups = [...String(text).matchAll(/\(([^()]*)\)/g)].map(m => m[1]); return sumTerms(groups[0] || text, 'exam', bel, mat) + sumTerms(groups.slice(1).join(' + '), 'annual', bel, mat); }
function sumTerms(text, type, bel, mat) { let total = 0; const re = /(\d+(?:[.,]\d+)?)\s*\*\s*([^+()]+)/g; let m; while ((m = re.exec(String(text))) !== null) total += Number(String(m[1]).replace(',', '.')) * valueForToken(String(m[2]).trim().replace(/\s+/g, ' '), type, bel, mat); return total; }
function valueForToken(token, type, bel, mat) { if (type === 'exam') { if (token === 'БЕЛ') return bel; if (token === 'МАТ') return mat; return Number(state.specialScores[token] || 0); } return gradePoints(state.annualGrades[token] || '6'); }
function gradePoints(grade) { return Number(state.data.gradePoints[String(grade)] || 0); }
function rowHtml(values) { return '<tr>' + values.map(v => '<td>' + escapeHtml(v) + '</td>').join('') + '</tr>'; }
function num(value) { return Number(String(value).replace(',', '.')) || 0; }
function clamp(value, min, max) { return Math.max(min, Math.min(max, value)); }
function format(value) { return Number(value).toLocaleString('bg-BG', { minimumFractionDigits: 2, maximumFractionDigits: 2 }); }
function int(value) { return Number(value).toLocaleString('bg-BG', { maximumFractionDigits: 0 }); }
function pct(value) { return (value * 100).toLocaleString('bg-BG', { minimumFractionDigits: 1, maximumFractionDigits: 1 }) + '%'; }
function escapeHtml(value) { return String(value ?? '').replace(/[&<>"]/g, ch => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[ch])); }
