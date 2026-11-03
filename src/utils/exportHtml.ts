import type { Worksheet } from '../types';
import { QUESTION_TYPE_LABELS, GRADE_LEVEL_LABELS, DIFFICULTY_LABELS } from '../types';
import {
  formatCorrectAnswer,
  getAcceptedFillAnswers,
  getAnswerMode,
  getCorrectOptionIndex,
  getDisplayOptions,
  normalizeAnswerText,
} from './answerKey';

function escHtml(text: string): string {
  if (!text) return '';
  // Preserve LaTeX delimiters ($...$) — only escape HTML tags
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}



export function exportWorksheetToHtml(worksheet: Worksheet): void {
  const html = buildInteractiveHtml(worksheet);
  const blob = new Blob([html], { type: 'text/html;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `${worksheet.title.replace(/[^a-zA-Z0-9\u00C0-\u024F\u1E00-\u1EFF ]/g, '_')}.html`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

export function buildInteractiveHtml(ws: Worksheet): string {
  const questionsJson = JSON.stringify(ws.questions.map((q, i) => ({
    id: q.id,
    index: i,
    content: q.content, // Keep raw LaTeX
    type: q.type,
    typeLabel: QUESTION_TYPE_LABELS[q.type] || q.type,
    diffLabel: DIFFICULTY_LABELS[q.difficulty] || q.difficulty,
    mode: getAnswerMode(q),
    options: getDisplayOptions(q),
    correctIndex: getCorrectOptionIndex(q),
    acceptedAnswers: getAcceptedFillAnswers(q.correctAnswer),
    correctAnswer: q.correctAnswer,
    answerText: formatCorrectAnswer(q),
    explanation: q.explanation || '',
    matchingPairs: q.matchingPairs || [],
  }))).replace(/</g, '\\u003c');

  const isPreschool = ws.gradeLevel === 'preschool';

  return `<!DOCTYPE html>
<html lang="vi">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>${escHtml(ws.title)} - Phiếu học tập tương tác</title>

<!-- MathJax 3 for rendering math formulas -->
<script>
window.MathJax = {
  tex: {
    inlineMath: [['$', '$']],
    displayMath: [['$$', '$$']],
  },
  svg: { fontCache: 'global' },
  startup: {
    typeset: false,
    ready: function() {
      MathJax.startup.defaultReady();
      MathJax.startup.promise.then(function() {
        // Chỉ typeset, không render lại để không mất bài học sinh đang làm dở
        var rendered = document.getElementById('questionsContainer');
        if (rendered && rendered.children.length) MathJax.typesetPromise([rendered]).catch(function(){});
      });
    }
  }
};
</script>
<script src="https://cdn.jsdelivr.net/npm/mathjax@3/es5/tex-svg.js" async></script>

<!-- Google Font for Vietnamese -->
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Be+Vietnam+Pro:wght@300;400;500;600;700;800&display=swap" rel="stylesheet">

<style>
*{margin:0;padding:0;box-sizing:border-box}
:root{
  --teal:${isPreschool ? '#f59e0b' : '#0d9488'};
  --teal-light:${isPreschool ? '#fef3c7' : '#ccfbf1'};
  --teal-dark:${isPreschool ? '#b45309' : '#115e59'};
  --emerald:#059669;
  --emerald-light:#d1fae5;
  --red:#ef4444;
  --red-light:#fee2e2;
  --blue:#3b82f6;
  --slate-900:#0f172a;
  --slate-700:#334155;
  --slate-500:#64748b;
  --slate-300:#cbd5e1;
  --slate-100:#f1f5f9;
  --slate-50:#f8fafc;
  --white:#fff;
  --radius:14px;
  --shadow:0 4px 24px rgba(0,0,0,.08);
}
body{
  font-family:'Be Vietnam Pro','Segoe UI',system-ui,sans-serif;
  background:linear-gradient(135deg,var(--slate-50) 0%,var(--teal-light) 50%,var(--slate-50) 100%);
  min-height:100vh;color:var(--slate-700);line-height:1.7;padding:16px;
}
.container{max-width:800px;margin:0 auto}

.header{
  background:var(--white);border-radius:var(--radius);padding:28px 24px;
  text-align:center;box-shadow:var(--shadow);margin-bottom:20px;
  border:2px solid var(--teal-light);position:relative;overflow:hidden;
}
.header::before{content:'';position:absolute;top:0;left:0;right:0;height:5px;background:linear-gradient(90deg,var(--teal),var(--emerald),var(--blue))}
.school-name{font-size:12px;color:var(--slate-500);text-transform:uppercase;letter-spacing:2px;margin-bottom:4px}
.main-title{font-size:${isPreschool ? '28px' : '24px'};font-weight:800;color:var(--teal);margin:8px 0}
.sub-title{font-size:17px;font-weight:600;color:var(--slate-900)}
.meta{display:flex;gap:16px;justify-content:center;margin-top:10px;flex-wrap:wrap}
.meta span{font-size:12px;color:var(--slate-500);background:var(--slate-100);padding:3px 12px;border-radius:20px}

.progress-bar-wrap{
  background:var(--white);border-radius:var(--radius);padding:16px 20px;
  box-shadow:var(--shadow);margin-bottom:20px;position:sticky;top:8px;z-index:100;
  border:1px solid var(--slate-300);
}
.progress-top{display:flex;justify-content:space-between;align-items:center;margin-bottom:8px}
.progress-label{font-size:14px;font-weight:600;color:var(--slate-700)}
.progress-score{font-size:14px;font-weight:700;color:var(--teal)}
.progress-track{height:10px;background:var(--slate-100);border-radius:99px;overflow:hidden}
.progress-fill{height:100%;background:linear-gradient(90deg,var(--teal),var(--emerald));border-radius:99px;transition:width .5s ease;width:0%}
.progress-stats{display:flex;gap:16px;margin-top:8px;font-size:12px;color:var(--slate-500)}
.stat-correct{color:var(--emerald);font-weight:600}
.stat-wrong{color:var(--red);font-weight:600}

.q-card{
  background:var(--white);border-radius:var(--radius);
  padding:${isPreschool ? '24px' : '20px'};margin-bottom:14px;
  box-shadow:var(--shadow);border:2px solid transparent;
  transition:border-color .3s,transform .2s;
}
.q-card:hover{transform:translateY(-1px)}
.q-card.correct{border-color:var(--emerald);background:#f0fdf4}
.q-card.wrong{border-color:var(--red);background:#fef2f2}
.q-card.answered{opacity:.92}
.q-badge{display:inline-flex;gap:6px;margin-bottom:8px}
.q-badge span{font-size:10px;padding:2px 10px;border-radius:20px;background:var(--slate-100);color:var(--slate-500)}
.q-number{
  display:inline-flex;align-items:center;justify-content:center;
  width:${isPreschool ? '36px' : '30px'};height:${isPreschool ? '36px' : '30px'};
  border-radius:10px;background:var(--teal);color:var(--white);
  font-weight:700;font-size:${isPreschool ? '16px' : '13px'};margin-right:10px;flex-shrink:0;
}
.q-content{font-size:${isPreschool ? '18px' : '15px'};font-weight:600;color:var(--slate-900);margin-bottom:12px;display:flex;align-items:flex-start}
.q-content-text{flex:1}

/* MathJax inline SVG styling */
.q-content mjx-container, .opt-btn mjx-container, .match-left mjx-container,
.feedback mjx-container, .tf-btn mjx-container {
  display:inline!important;
  margin:0 2px;
}

.options-grid{display:grid;grid-template-columns:1fr 1fr;gap:8px}
@media(max-width:600px){.options-grid{grid-template-columns:1fr}}
.opt-btn{
  display:flex;align-items:center;gap:10px;
  padding:${isPreschool ? '14px 16px' : '11px 14px'};
  border:2px solid var(--slate-300);border-radius:12px;
  background:var(--white);cursor:pointer;
  font-size:${isPreschool ? '16px' : '14px'};color:var(--slate-700);
  transition:all .2s;text-align:left;width:100%;
  font-family:inherit;line-height:1.5;
}
.opt-btn:hover:not(.locked){border-color:var(--teal);background:var(--teal-light);transform:scale(1.01)}
.opt-btn.selected{border-color:var(--teal);background:var(--teal-light);font-weight:600}
.opt-btn.correct-answer{border-color:var(--emerald)!important;background:var(--emerald-light)!important;color:#065f46}
.opt-btn.wrong-answer{border-color:var(--red)!important;background:var(--red-light)!important;color:#991b1b;text-decoration:line-through}
.opt-btn.locked{cursor:default;opacity:.85}
.opt-label{
  display:flex;align-items:center;justify-content:center;
  width:28px;height:28px;border-radius:8px;
  background:var(--slate-100);font-weight:700;font-size:13px;
  color:var(--slate-500);flex-shrink:0;
}
.opt-btn.correct-answer .opt-label{background:var(--emerald);color:var(--white)}
.opt-btn.wrong-answer .opt-label{background:var(--red);color:var(--white)}

.tf-grid{display:grid;grid-template-columns:1fr 1fr;gap:10px}
.tf-btn{
  padding:14px;border:2px solid var(--slate-300);border-radius:12px;
  font-size:${isPreschool ? '18px' : '15px'};font-weight:600;text-align:center;cursor:pointer;
  transition:all .2s;background:var(--white);font-family:inherit;color:var(--slate-700);
}
.tf-btn:hover:not(.locked){border-color:var(--teal);background:var(--teal-light)}
.tf-btn.selected{border-color:var(--teal);background:var(--teal-light)}
.tf-btn.correct-answer{border-color:var(--emerald)!important;background:var(--emerald-light)!important;color:#065f46}
.tf-btn.wrong-answer{border-color:var(--red)!important;background:var(--red-light)!important;color:#991b1b}
.tf-btn.locked{cursor:default}

.fill-input{
  width:100%;padding:12px 16px;border:2px solid var(--slate-300);
  border-radius:12px;font-size:15px;font-family:inherit;
  transition:border-color .2s;outline:none;
}
.fill-input:focus{border-color:var(--teal)}
.fill-input.correct{border-color:var(--emerald);background:var(--emerald-light)}
.fill-input.wrong{border-color:var(--red);background:var(--red-light)}
.fill-submit{
  margin-top:8px;padding:10px 24px;border:none;border-radius:10px;
  background:var(--teal);color:var(--white);font-size:14px;font-weight:600;
  cursor:pointer;font-family:inherit;transition:transform .15s;
}
.fill-submit:hover{transform:scale(1.03)}
.fill-submit:disabled{opacity:.5;cursor:default;transform:none}

.match-container{display:flex;flex-direction:column;gap:8px}
.match-row{display:flex;gap:8px;align-items:center;flex-wrap:wrap}
.match-left{
  flex:1;padding:10px 14px;background:var(--teal-light);
  border-radius:10px;font-size:14px;font-weight:500;min-width:120px;
}
.match-arrow{font-size:18px;color:var(--slate-300)}
.match-select{
  flex:1;padding:10px 14px;border:2px solid var(--slate-300);
  border-radius:10px;font-size:14px;font-family:inherit;
  cursor:pointer;background:var(--white);min-width:120px;
  appearance:auto;
}
.match-select.correct{border-color:var(--emerald);background:var(--emerald-light)}
.match-select.wrong{border-color:var(--red);background:var(--red-light)}
.match-check{
  padding:8px 18px;border:none;border-radius:10px;
  background:var(--teal);color:var(--white);font-size:13px;
  font-weight:600;cursor:pointer;font-family:inherit;
  margin-top:6px;align-self:flex-start;
}
.match-check:disabled{opacity:.5;cursor:default}

.text-area{
  width:100%;min-height:80px;padding:12px;border:2px solid var(--slate-300);
  border-radius:12px;font-size:14px;font-family:inherit;resize:vertical;outline:none;
}
.text-area:focus{border-color:var(--teal)}

.activity-hint{
  display:flex;align-items:center;gap:10px;padding:14px 18px;
  background:${isPreschool ? '#fef3c7' : 'var(--teal-light)'};border-radius:12px;
  font-size:${isPreschool ? '16px' : '14px'};color:var(--teal-dark);font-style:italic;
}
.activity-done-btn{
  margin-top:10px;padding:12px 28px;border:2px dashed var(--teal);
  border-radius:12px;background:var(--white);color:var(--teal);
  font-size:${isPreschool ? '16px' : '14px'};font-weight:600;cursor:pointer;
  font-family:inherit;transition:all .2s;
}
.activity-done-btn:hover{background:var(--teal-light);border-style:solid}
.activity-done-btn.done{background:var(--emerald-light);border-color:var(--emerald);color:#065f46;border-style:solid}

.feedback{
  margin-top:10px;padding:10px 14px;border-radius:10px;
  font-size:13px;animation:fadeIn .3s ease;
}
.feedback.correct{background:var(--emerald-light);color:#065f46}
.feedback.wrong{background:var(--red-light);color:#991b1b}
.feedback.neutral{background:#f1f5f9;color:#334155}
.feedback strong{display:block;margin-bottom:2px}
@keyframes fadeIn{from{opacity:0;transform:translateY(-6px)}to{opacity:1;transform:translateY(0)}}

.summary-card{
  background:var(--white);border-radius:var(--radius);padding:28px;
  box-shadow:var(--shadow);margin-top:24px;text-align:center;
  border:2px solid var(--teal-light);display:none;
}
.summary-card.visible{display:block;animation:fadeIn .5s ease}
.summary-score{font-size:48px;font-weight:900;color:var(--teal);margin:12px 0}
.summary-message{font-size:18px;color:var(--slate-700);margin-bottom:16px}
.summary-details{display:flex;justify-content:center;gap:24px;flex-wrap:wrap}
.summary-stat{text-align:center}
.summary-stat .num{font-size:28px;font-weight:800}
.summary-stat .lbl{font-size:12px;color:var(--slate-500)}
.retry-btn{
  margin-top:20px;padding:14px 40px;border:none;border-radius:12px;
  background:linear-gradient(135deg,var(--teal),var(--emerald));
  color:var(--white);font-size:16px;font-weight:700;cursor:pointer;
  font-family:inherit;transition:transform .15s;
}
.retry-btn:hover{transform:scale(1.04)}

.confetti-wrap{position:fixed;top:0;left:0;width:100%;height:100%;pointer-events:none;z-index:9999;overflow:hidden}
.confetti-piece{position:absolute;width:10px;height:10px;top:-20px;animation:confettiFall 3s ease-in forwards}
@keyframes confettiFall{0%{transform:translateY(0) rotate(0deg);opacity:1}100%{transform:translateY(100vh) rotate(720deg);opacity:0}}

@media print{
  .progress-bar-wrap,.retry-btn,.fill-submit,.match-check,.activity-done-btn{display:none!important}
  body{background:#fff;padding:0}
  .q-card{box-shadow:none;break-inside:avoid;border:1px solid #ddd}
}
</style>
</head>
<body>
<div class="container">
  <div class="header">
    ${ws.schoolName ? `<div class="school-name">${escHtml(ws.schoolName)}</div>` : ''}
    ${ws.className ? `<div style="font-size:12px;color:#94a3b8">${escHtml(ws.className)}</div>` : ''}
    <div class="main-title">${isPreschool ? '🌈 ' : ''}PHIẾU HỌC TẬP${isPreschool ? ' 🌈' : ''}</div>
    <div class="sub-title">${escHtml(ws.title)}</div>
    <div class="meta">
      <span>📚 ${escHtml(ws.subjectName)}</span>
      <span>🎓 ${escHtml(GRADE_LEVEL_LABELS[ws.gradeLevel])}</span>
      <span>📝 ${ws.questions.length} câu</span>
    </div>
  </div>

  <div class="progress-bar-wrap">
    <div class="progress-top">
      <span class="progress-label">Tiến độ làm bài</span>
      <span class="progress-score" id="scoreText">0/${ws.questions.length}</span>
    </div>
    <div class="progress-track"><div class="progress-fill" id="progressFill"></div></div>
    <div class="progress-stats">
      <span>✅ Đúng: <span class="stat-correct" id="correctCount">0</span></span>
      <span>❌ Sai: <span class="stat-wrong" id="wrongCount">0</span></span>
      <span>⏳ Còn lại: <span id="remainCount">${ws.questions.length}</span></span>
    </div>
  </div>

  <div id="questionsContainer"></div>

  <div class="summary-card" id="summaryCard">
    <div style="font-size:32px">${isPreschool ? '🎊🌟🎊' : '🎉'}</div>
    <h2 style="color:var(--teal);margin:8px 0">${isPreschool ? 'Bé giỏi lắm!' : 'Hoàn thành!'}</h2>
    <div class="summary-score" id="summaryScore">0%</div>
    <div class="summary-message" id="summaryMessage"></div>
    <div class="summary-details">
      <div class="summary-stat"><div class="num" id="sumCorrect" style="color:var(--emerald)">0</div><div class="lbl">Đúng</div></div>
      <div class="summary-stat"><div class="num" id="sumWrong" style="color:var(--red)">0</div><div class="lbl">Sai</div></div>
      <div class="summary-stat"><div class="num" id="sumTotal" style="color:var(--teal)">${ws.questions.length}</div><div class="lbl">Tổng</div></div>
    </div>
    <button class="retry-btn" onclick="location.reload()">🔄 Làm lại</button>
  </div>
</div>

<script>
// Questions data with raw LaTeX content preserved
var questions = ${questionsJson};
var total = questions.length;
var gradableTotal = questions.filter(function(q){
  if(q.mode==='options'||q.mode==='true_false') return q.correctIndex>=0;
  if(q.mode==='fill') return q.acceptedAnswers.length>0;
  return q.mode==='matching';
}).length;
var normalizeAnswerText = ${normalizeAnswerText.toString()};
var answered = 0, correct = 0, wrong = 0;
var states = {};
var container = document.getElementById('questionsContainer');

function escH(s){
  if(!s) return '';
  return s.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
}

function updateProgress(){
  document.getElementById('scoreText').textContent = answered+'/'+total;
  document.getElementById('progressFill').style.width = (answered/total*100)+'%';
  document.getElementById('correctCount').textContent = correct;
  document.getElementById('wrongCount').textContent = wrong;
  document.getElementById('remainCount').textContent = (total-answered);
  if(answered===total) showSummary();
}

function showFeedback(qEl,isCorrect,correctAns,explanation){
  var fb = document.createElement('div');
  fb.className = 'feedback '+(isCorrect?'correct':'wrong');
  if(isCorrect){
    fb.innerHTML='<strong>${isPreschool ? '🌟 Giỏi lắm!' : '✅ Chính xác!'}</strong>'+(explanation?escH(explanation):'');
  } else {
    fb.innerHTML='<strong>❌ Chưa đúng</strong>Đáp án: '+escH(correctAns)+(explanation?' — '+escH(explanation):'');
  }
  qEl.appendChild(fb);
  // Typeset MathJax in feedback
  typesetElement(fb);
}

function showNote(qEl,note){
  var fb = document.createElement('div');
  fb.className = 'feedback neutral';
  fb.innerHTML = escH(note);
  qEl.appendChild(fb);
  typesetElement(fb);
}

function typesetElement(el){
  if(window.MathJax && window.MathJax.typesetPromise){
    window.MathJax.typesetPromise([el]).catch(function(){});
  }
}

function showSummary(){
  // Chỉ tính trên các câu chấm được; tự luận và hoạt động tô màu, nối điểm... không vào điểm
  var pct = gradableTotal ? Math.round(correct/gradableTotal*100) : 100;
  document.getElementById('summaryScore').textContent = gradableTotal ? pct+'%' : '✓';
  document.getElementById('sumCorrect').textContent = correct;
  document.getElementById('sumWrong').textContent = wrong;
  var msg = '';
  if(pct===100) msg='${isPreschool ? '🏆 Xuất sắc! Bé giỏi nhất lớp!' : '🏆 Hoàn hảo! Xuất sắc!'}';
  else if(pct>=80) msg='${isPreschool ? '⭐ Bé làm rất giỏi!' : '⭐ Rất tốt!'}';
  else if(pct>=60) msg='${isPreschool ? '👍 Bé cần cố gắng thêm nhé!' : '👍 Khá tốt, cần ôn tập thêm.'}';
  else msg='${isPreschool ? '💪 Cố lên bé nhé!' : '📖 Cần ôn tập lại kiến thức.'}';
  document.getElementById('summaryMessage').textContent = msg;
  document.getElementById('summaryCard').classList.add('visible');
  if(pct>=80) launchConfetti();
  document.getElementById('summaryCard').scrollIntoView({behavior:'smooth',block:'center'});
}

function launchConfetti(){
  var wrap=document.createElement('div');wrap.className='confetti-wrap';document.body.appendChild(wrap);
  var colors=['#0d9488','#059669','#3b82f6','#f59e0b','#ef4444','#ec4899','#8b5cf6'];
  for(var i=0;i<60;i++){
    var p=document.createElement('div');p.className='confetti-piece';
    p.style.left=Math.random()*100+'%';
    p.style.background=colors[Math.floor(Math.random()*colors.length)];
    p.style.animationDelay=Math.random()*2+'s';
    p.style.borderRadius=Math.random()>.5?'50%':'2px';
    p.style.width=(6+Math.random()*8)+'px';
    p.style.height=(6+Math.random()*8)+'px';
    wrap.appendChild(p);
  }
  setTimeout(function(){wrap.remove()},4000);
}

// Build all question cards
function renderAllQuestions(){
  container.innerHTML = '';
  questions.forEach(function(q,idx){
    var card = document.createElement('div');
    card.className = 'q-card';
    card.id = 'q-'+idx;

    var badge = '<div class="q-badge"><span>'+escH(q.typeLabel)+'</span><span>'+escH(q.diffLabel)+'</span></div>';
    var content = '<div class="q-content"><span class="q-number">'+(idx+1)+'</span><span class="q-content-text">'+escH(q.content)+'</span></div>';
    var body = '';

    switch(q.mode==='text'?q.type:q.mode){
      case 'options':
        body = renderOptions(q,idx); break;
      case 'true_false':
        body = renderTrueFalse(q,idx); break;
      case 'fill':
        body = renderFillBlank(q,idx); break;
      case 'matching':
        body = renderMatching(q,idx); break;
      case 'coloring':
        body = renderActivity(idx,'🎨','Bé hãy dùng bút sáp màu tô thật đẹp theo yêu cầu!'); break;
      case 'dot_to_dot':
        body = renderActivity(idx,'✏️','Bé hãy nối các điểm theo thứ tự số 1 → 2 → 3...'); break;
      case 'maze':
        body = renderActivity(idx,'🌀','Bé hãy vẽ đường đi vượt qua mê cung!'); break;
      case 'tracing':
        body = renderActivity(idx,'✍️','Bé hãy cầm bút đồ theo đúng các nét đứt!'); break;
      default:
        body = renderTextAnswer(idx);
    }

    card.innerHTML = badge + content + body;
    container.appendChild(card);
    attachListeners(q, idx, card);
  });

  // Typeset all MathJax in questions
  typesetElement(container);
  updateProgress();
}

function renderOptions(q, idx){
  var html='<div class="options-grid">';
  q.options.forEach(function(opt,j){
    var label = String.fromCharCode(65+j);
    html+='<button class="opt-btn" data-q="'+idx+'" data-idx="'+j+'"><span class="opt-label">'+label+'</span><span>'+escH(opt)+'</span></button>';
  });
  return html+'</div>';
}

function renderTrueFalse(q, idx){
  var html='<div class="tf-grid">';
  q.options.forEach(function(opt,j){
    html+='<button class="tf-btn" data-q="'+idx+'" data-idx="'+j+'">'+(j===0?'✅ ':'❌ ')+escH(opt)+'</button>';
  });
  return html+'</div>';
}

function renderFillBlank(q, idx){
  return '<div><input class="fill-input" id="fill-'+idx+'" placeholder="Nhập câu trả lời..." /><button class="fill-submit" data-q="'+idx+'">Kiểm tra</button></div>';
}

function renderMatching(q, idx){
  var shuffled = q.matchingPairs.map(function(p,i){return{text:p.right,origIdx:i}});
  for(var i=shuffled.length-1;i>0;i--){var j=Math.floor(Math.random()*(i+1));var t=shuffled[i];shuffled[i]=shuffled[j];shuffled[j]=t;}
  var html='<div class="match-container">';
  q.matchingPairs.forEach(function(pair,j){
    html+='<div class="match-row"><div class="match-left">'+(j+1)+'. '+escH(pair.left)+'</div>';
    html+='<span class="match-arrow">→</span>';
    html+='<select class="match-select" data-q="'+idx+'" data-pair="'+j+'"><option value="">Chọn...</option>';
    shuffled.forEach(function(s){ html+='<option value="'+s.origIdx+'">'+escH(s.text)+'</option>'; });
    html+='</select></div>';
  });
  html+='<button class="match-check" data-q="'+idx+'">Kiểm tra nối</button></div>';
  return html;
}

function renderTextAnswer(idx){
  return '<div><textarea class="text-area" id="text-'+idx+'" placeholder="${isPreschool ? 'Bé viết câu trả lời...' : 'Viết câu trả lời...'}"></textarea><button class="fill-submit" data-q="'+idx+'" data-type="text">Kiểm tra</button></div>';
}

function renderActivity(idx, emoji, hint){
  return '<div class="activity-hint">'+emoji+' '+hint+'</div><button class="activity-done-btn" data-q="'+idx+'">${isPreschool ? '⭐ Bé đã làm xong!' : '✅ Đã hoàn thành!'}</button>';
}

function attachChoiceListeners(q, idx, card, selector){
  var btns = card.querySelectorAll(selector);
  btns.forEach(function(btn){
    btn.addEventListener('click',function(){
      if(states[idx]) return; states[idx]=true; answered++;
      var picked = Number(btn.getAttribute('data-idx'));
      var isGraded = q.correctIndex>=0;
      var isRight = picked===q.correctIndex;
      if(isGraded){ if(isRight) correct++; else wrong++; }
      btns.forEach(function(b){
        b.classList.add('locked');
        var bIdx = Number(b.getAttribute('data-idx'));
        if(bIdx===q.correctIndex) b.classList.add('correct-answer');
        if(bIdx===picked && isGraded && !isRight) b.classList.add('wrong-answer');
      });
      card.classList.add('answered');
      if(isGraded){
        card.classList.add(isRight?'correct':'wrong');
        showFeedback(card,isRight,q.answerText,q.explanation);
      } else {
        showNote(card,'Câu này chưa có đáp án hợp lệ nên không tính điểm. Hãy hỏi lại giáo viên.');
      }
      updateProgress();
    });
  });
}

function attachListeners(q, idx, card){
  // Multiple choice
  if(q.mode==='options') attachChoiceListeners(q, idx, card, '.opt-btn');

  // True/False
  if(q.mode==='true_false') attachChoiceListeners(q, idx, card, '.tf-btn');

  // Fill blank
  if(q.mode==='fill'){
    var fbtn = card.querySelector('.fill-submit:not([data-type])');
    if(fbtn){
      fbtn.addEventListener('click',function(){
        if(states[idx]) return;
        var input = document.getElementById('fill-'+idx);
        var val = input.value.trim();
        if(!val) return;
        states[idx]=true; answered++;
        input.disabled=true; fbtn.disabled=true;
        card.classList.add('answered');
        if(q.acceptedAnswers.length){
          var isRight = q.acceptedAnswers.indexOf(normalizeAnswerText(val))!==-1;
          if(isRight) correct++; else wrong++;
          input.classList.add(isRight?'correct':'wrong');
          card.classList.add(isRight?'correct':'wrong');
          showFeedback(card,isRight,q.answerText,q.explanation);
        } else {
          showNote(card,'Câu này chưa có đáp án hợp lệ nên không tính điểm. Hãy hỏi lại giáo viên.');
        }
        updateProgress();
      });
    }
  }

  // Matching
  if(q.mode==='matching'){
    var mBtn = card.querySelector('.match-check');
    if(mBtn){
      mBtn.addEventListener('click',function(){
        if(states[idx]) return;
        var selects = card.querySelectorAll('.match-select');
        var allFilled = true;
        selects.forEach(function(s){if(!s.value) allFilled=false;});
        if(!allFilled) return;
        states[idx]=true; answered++;
        var allCorrect = true;
        selects.forEach(function(s,j){
          s.disabled = true;
          if(q.matchingPairs[Number(s.value)].right===q.matchingPairs[j].right){ s.classList.add('correct'); }
          else { s.classList.add('wrong'); allCorrect = false; }
        });
        if(allCorrect) correct++; else wrong++;
        mBtn.disabled = true;
        card.classList.add(allCorrect?'correct':'wrong','answered');
        var correctPairs = q.matchingPairs.map(function(p,j){return (j+1)+'. '+p.left+' → '+p.right}).join('; ');
        showFeedback(card,allCorrect,correctPairs,q.explanation);
        updateProgress();
      });
    }
  }

  // Text / Short answer
  var textBtn = card.querySelector('.fill-submit[data-type="text"]');
  if(textBtn){
    textBtn.addEventListener('click',function(){
      if(states[idx]) return;
      var ta = document.getElementById('text-'+idx);
      var val = ta.value.trim();
      if(!val) return;
      states[idx]=true; answered++;
      ta.disabled=true; textBtn.disabled=true;
      card.classList.add('answered');
      showNote(card,'Đã ghi nhận câu trả lời, câu này không tự chấm.'+(q.correctAnswer?' Đáp án tham khảo: '+q.correctAnswer:''));
      updateProgress();
    });
  }

  // Activity (coloring, dot_to_dot, maze, tracing)
  if(['coloring','dot_to_dot','maze','tracing'].indexOf(q.type)!==-1){
    var actBtn = card.querySelector('.activity-done-btn');
    if(actBtn){
      actBtn.addEventListener('click',function(){
        if(states[idx]) return;
        states[idx]=true; answered++;
        actBtn.classList.add('done');
        actBtn.textContent = '${isPreschool ? '🌟 Giỏi lắm!' : '✅ Đã hoàn thành!'}';
        card.classList.add('correct','answered');
        updateProgress();
      });
    }
  }
}

// Initial render — if MathJax is already loaded, render immediately
// Otherwise, the MathJax startup.ready callback will call renderAllQuestions
if(document.readyState==='loading'){
  document.addEventListener('DOMContentLoaded', function(){
    if(window.MathJax && window.MathJax.typesetPromise){
      renderAllQuestions();
    } else {
      // MathJax not loaded yet — render HTML first, MathJax will typeset on load
      renderAllQuestions();
    }
  });
} else {
  renderAllQuestions();
}
</script>
</body>
</html>`;
}
