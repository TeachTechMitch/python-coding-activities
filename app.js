// =========================================================
// CONFIGURATION — edit these three values before deploying
// =========================================================
const GITHUB_USERNAME = "YOUR_GITHUB_USERNAME";   // e.g. "mrsmith"
const GITHUB_REPO     = "python-coding-activities";
const GITHUB_TOKEN    = "YOUR_PERSONAL_ACCESS_TOKEN";
// =========================================================

// ── State ──────────────────────────────────────────────
let questions    = null;
let studentId    = null;
let pyodide      = null;
let currentUnit  = 0;
let responses    = {};   // { actId: { answer, correct, timestamp } }
let totalActivities = 0;

// ── Init ───────────────────────────────────────────────
async function init() {
  // Load questions
  const res = await fetch("questions.json");
  questions = await res.json();
  totalActivities = questions.units.reduce((s, u) => s + u.activities.length, 0);

  // Wire login
  document.getElementById("start-btn").addEventListener("click", handleLogin);
  document.getElementById("student-id").addEventListener("keydown", e => {
    if (e.key === "Enter") handleLogin();
  });

  // Wire complete screen
  document.getElementById("review-btn").addEventListener("click", () => {
    showScreen("lesson-screen");
    jumpToUnit(0);
  });
  document.getElementById("retry-btn").addEventListener("click", () => {
    responses = {};
    currentUnit = 0;
    showScreen("login-screen");
  });

  // Start loading Pyodide in background
  loadPyodide({ indexURL: "https://cdn.jsdelivr.net/pyodide/v0.25.1/full/" })
    .then(py => {
      pyodide = py;
      const st = document.getElementById("pyodide-status");
      if (st) {
        st.className = "py-status ready";
        st.querySelector(".py-text").textContent = "Python ready";
      }
    })
    .catch(() => {
      const st = document.getElementById("pyodide-status");
      if (st) {
        st.className = "py-status";
        st.querySelector(".py-text").textContent = "Python unavailable";
      }
    });
}

// ── Login ──────────────────────────────────────────────
function handleLogin() {
  const val = document.getElementById("student-id").value.trim();
  if (!val || val.length < 3) {
    const err = document.getElementById("login-error");
    err.textContent = "Please enter a valid Student ID (at least 3 characters).";
    err.classList.remove("hidden");
    return;
  }
  studentId = val;
  document.getElementById("student-label").textContent = `👤 ${studentId}`;
  showScreen("lesson-screen");
  buildTabs();
  updateScoreChip();
  jumpToUnit(0);
}

// ── Tabs ───────────────────────────────────────────────
function buildTabs() {
  const nav = document.getElementById("unit-tabs");
  nav.innerHTML = "";
  questions.units.forEach((unit, i) => {
    const btn = document.createElement("button");
    btn.className = "tab-btn" + (i === 0 ? " active" : "");
    btn.textContent = unit.title;
    btn.dataset.index = i;
    btn.addEventListener("click", () => jumpToUnit(i));
    nav.appendChild(btn);
  });
}

function updateTabs() {
  document.querySelectorAll(".tab-btn").forEach((btn, i) => {
    btn.classList.toggle("active", i === currentUnit);
    // Mark as done if all activities in this unit are answered
    const unit = questions.units[i];
    const allAnswered = unit.activities.every(a => responses[a.id]);
    btn.classList.toggle("done", allAnswered);
  });
}

// ── Jump to unit ───────────────────────────────────────
function jumpToUnit(unitIndex) {
  currentUnit = unitIndex;
  updateTabs();
  renderUnit();
}

// ── Render Unit ────────────────────────────────────────
function renderUnit() {
  const unit = questions.units[currentUnit];
  const isLast = currentUnit === questions.units.length - 1;
  const totalUnits = questions.units.length;

  // -- Lesson content panel --
  const lc = unit.lessonContent;
  document.getElementById("lesson-content-inner").innerHTML = `
    <div style="margin-bottom:.5rem">
      <span style="font-size:.72rem;color:var(--text-dim);font-family:var(--font-code);
                   text-transform:uppercase;letter-spacing:.08em">
        Unit ${currentUnit + 1} of ${totalUnits}
      </span>
    </div>
    <h2 class="lesson-heading">${lc.heading}</h2>
    <div class="lesson-body-text">${lc.body}</div>
    <div class="lesson-code-block">
      <div class="lesson-code-label">📄 Example Code</div>
      <pre>${syntaxHighlight(escapeHtml(lc.codeExample))}</pre>
    </div>
  `;

  // -- Activities --
  const list = document.getElementById("activity-list");
  list.innerHTML = "";

  unit.activities.forEach(act => {
    const card = document.createElement("div");
    card.id = `card-${act.id}`;
    card.className = "activity-card";
    list.appendChild(card);

    if (act.type === "multiple_choice") renderMC(act, card);
    else if (act.type === "fill_blank")  renderFill(act, card);
    else if (act.type === "code_runner") renderRunner(act, card);
  });

  // Add unit-complete banner if all answered
  const allDone = unit.activities.every(a => responses[a.id]);
  if (allDone) {
    appendUnitComplete(list, unit);
  }

  // -- Footer nav --
  const prevBtn   = document.getElementById("prev-unit-btn");
  const nextBtn   = document.getElementById("next-unit-btn");
  const submitBtn = document.getElementById("submit-all-btn");

  prevBtn.disabled = currentUnit === 0;
  nextBtn.classList.toggle("hidden", isLast);
  submitBtn.classList.toggle("hidden", !isLast);

  prevBtn.onclick   = () => jumpToUnit(currentUnit - 1);
  nextBtn.onclick   = () => jumpToUnit(currentUnit + 1);
  submitBtn.onclick = submitAll;

  updateProgress();
  updateScoreChip();

  // Scroll activities to top
  document.getElementById("activity-inner").scrollTop = 0;
}

function appendUnitComplete(list, unit) {
  const correct = unit.activities.filter(a => responses[a.id]?.correct).length;
  const total   = unit.activities.length;
  const banner  = document.createElement("div");
  banner.className = "unit-complete-banner";
  banner.innerHTML = `
    <div class="ucb-title">✅ Unit Complete! ${correct}/${total} correct</div>
    <div class="ucb-sub">Keep going — click Next Unit to continue.</div>
  `;
  list.appendChild(banner);
}

// ── Render Multiple Choice ─────────────────────────────
function renderMC(act, card) {
  const saved = responses[act.id];
  card.innerHTML = `
    <div class="activity-badge mc">● Multiple Choice</div>
    <div class="activity-q">${act.question}</div>
    <div class="mc-options">
      ${act.options.map(opt => `
        <button class="mc-opt
          ${saved?.answer === opt && saved.correct  ? "correct" : ""}
          ${saved?.answer === opt && !saved.correct ? "wrong"   : ""}
          ${saved && saved.answer !== opt && opt === act.answer && !saved.correct ? "correct" : ""}"
          data-value="${escapeAttr(opt)}"
          ${saved ? "disabled" : ""}>
          ${escapeHtml(opt)}
        </button>`).join("")}
    </div>
    ${saved ? `<div class="feedback ${saved.correct ? "correct" : "wrong"}">
      ${saved.correct ? "✅ Correct!" : `❌ Incorrect. The answer was: ${escapeHtml(act.answer)}`}
      <br><small style="font-weight:400;margin-top:.25rem;display:block">${act.explanation}</small>
    </div>` : ""}
  `;

  if (!saved) {
    card.querySelectorAll(".mc-opt").forEach(btn => {
      btn.addEventListener("click", () => {
        const chosen  = btn.getAttribute("data-value");
        const correct = chosen === act.answer;
        recordResponse(act.id, chosen, correct);
        // Re-render card in place
        renderMC(act, card);
        card.classList.add(correct ? "correct-card" : "wrong-card");
        checkUnitComplete();
      });
    });
  }
}

// ── Render Fill in Blank ───────────────────────────────
function renderFill(act, card) {
  const saved = responses[act.id];
  card.innerHTML = `
    <div class="activity-badge fill">◇ Fill in the Blank</div>
    <div class="activity-q">${act.instruction}</div>
    <div class="fill-wrap">
      <span>${syntaxHighlight(escapeHtml(act.code_prefix))}</span>
      <input type="text" class="fill-input" id="fill-${act.id}"
             placeholder="your answer here"
             value="${saved ? escapeAttr(saved.answer) : ""}"
             ${saved ? "disabled" : ""} />
      <span>${syntaxHighlight(escapeHtml(act.code_suffix))}</span>
    </div>
    <div class="hint-text">💡 ${act.hint}</div>
    ${!saved ? `<button class="run-btn" id="check-${act.id}">✔ Check Answer</button>` : ""}
    ${saved ? `<div class="feedback ${saved.correct ? "correct" : "wrong"}">
      ${saved.correct ? "✅ Correct!" : `❌ Expected: <code style="font-family:var(--font-code)">${escapeHtml(act.answer)}</code>`}
    </div>` : ""}
  `;

  if (!saved) {
    document.getElementById(`check-${act.id}`).addEventListener("click", () => {
      const val     = document.getElementById(`fill-${act.id}`).value.trim();
      const correct = val.toLowerCase() === act.answer.toLowerCase();
      recordResponse(act.id, val, correct);
      renderFill(act, card);
      card.classList.add(correct ? "correct-card" : "wrong-card");
      checkUnitComplete();
    });

    document.getElementById(`fill-${act.id}`).addEventListener("keydown", e => {
      if (e.key === "Enter") document.getElementById(`check-${act.id}`).click();
    });
  }
}

// ── Render Code Runner ─────────────────────────────────
function renderRunner(act, card) {
  const saved = responses[act.id];
  card.innerHTML = `
    <div class="activity-badge run">▶ Code Runner</div>
    <div class="activity-q">${act.instruction}</div>
    <textarea class="code-editor" id="editor-${act.id}" spellcheck="false">${saved ? saved.answer : act.starter_code}</textarea>
    <div class="runner-btns">
      <button class="run-btn" id="run-${act.id}">▶ Run Code</button>
      <button class="submit-btn" id="submit-${act.id}">Submit Answer</button>
    </div>
    <pre class="code-output" id="output-${act.id}">Output will appear here…</pre>
    ${saved ? `<div class="feedback ${saved.correct ? "correct" : "wrong"}">
      ${saved.correct ? "✅ All tests passed!" : "❌ Tests didn't pass — you can still try again and resubmit."}
    </div>` : ""}
  `;

  document.getElementById(`run-${act.id}`).addEventListener("click", async () => {
    const code = document.getElementById(`editor-${act.id}`).value;
    await runPython(code, act.test_cases, act.id, false);
  });

  document.getElementById(`submit-${act.id}`).addEventListener("click", async () => {
    const code   = document.getElementById(`editor-${act.id}`).value;
    const passed = await runPython(code, act.test_cases, act.id, true);
    recordResponse(act.id, code, passed);
    renderRunner(act, card);
    card.classList.add(passed ? "correct-card" : "wrong-card");
    checkUnitComplete();
  });
}

// ── Python runner ──────────────────────────────────────
async function runPython(code, testCases, actId, isSubmit) {
  const outputEl = document.getElementById(`output-${actId}`);

  if (!pyodide) {
    outputEl.textContent = "⏳ Python is still loading, please wait a moment and try again.";
    return false;
  }

  let allPassed = true;
  let outputText = "";

  for (let i = 0; i < testCases.length; i++) {
    const tc = testCases[i];
    try {
      pyodide.runPython(`
import sys, io
_out = io.StringIO()
sys.stdout = _out
`);

      if (tc.inputs && tc.inputs.length > 0) {
        pyodide.runPython(`
_q = ${JSON.stringify(tc.inputs)}
_qi = 0
def input(prompt=""):
    global _qi
    v = _q[_qi]; _qi += 1; return v
`);
      }

      pyodide.runPython(code);
      const output = pyodide.runPython("_out.getvalue().strip()");

      if (tc.expected_output !== undefined) {
        const passed = output === tc.expected_output.trim();
        if (!passed) allPassed = false;
        outputText += testCases.length > 1
          ? `Test ${i+1}: ${passed ? "✅" : "❌"}\nGot:      ${output}\nExpected: ${tc.expected_output.trim()}\n\n`
          : `${passed ? "✅ Output:" : "❌ Output:"} ${output}\n${!passed ? `Expected: ${tc.expected_output.trim()}` : ""}`;
      } else {
        outputText += output;
      }
    } catch (err) {
      allPassed = false;
      outputText += `❌ Error:\n${err.message}`;
    }
  }

  outputEl.textContent = outputText.trim() || "(no output)";
  return allPassed;
}

// ── Record response ────────────────────────────────────
function recordResponse(actId, answer, correct) {
  responses[actId] = { answer, correct, timestamp: new Date().toISOString() };
  updateScoreChip();
  updateProgress();
}

function updateScoreChip() {
  if (!questions) return;
  const correct = Object.values(responses).filter(r => r.correct).length;
  const answered = Object.keys(responses).length;
  document.getElementById("score-count").textContent = correct;
  document.getElementById("score-total").textContent = answered;
}

function updateProgress() {
  const unit      = questions.units[currentUnit];
  const answered  = unit.activities.filter(a => responses[a.id]).length;
  const pct       = unit.activities.length === 0 ? 0 : (answered / unit.activities.length) * 100;
  document.getElementById("unit-progress-bar").style.width = pct + "%";
}

function checkUnitComplete() {
  const unit    = questions.units[currentUnit];
  const allDone = unit.activities.every(a => responses[a.id]);
  updateTabs();
  if (allDone) {
    const list   = document.getElementById("activity-list");
    const banner = list.querySelector(".unit-complete-banner");
    if (!banner) appendUnitComplete(list, unit);
  }
}

// ── Submit All ─────────────────────────────────────────
async function submitAll() {
  const btn = document.getElementById("submit-all-btn");
  btn.textContent = "Saving…"; btn.disabled = true;

  const answered = Object.keys(responses).length;
  const correct  = Object.values(responses).filter(r => r.correct).length;
  const pct      = totalActivities > 0 ? Math.round((correct / totalActivities) * 100) : 0;

  // Populate complete screen
  document.getElementById("complete-name").textContent =
    `Great work, Student ${studentId}!`;

  document.getElementById("complete-stats").innerHTML = `
    <div class="stat-box">
      <div class="stat-val good">${correct}</div>
      <div class="stat-label">Correct</div>
    </div>
    <div class="stat-box">
      <div class="stat-val warn">${answered - correct}</div>
      <div class="stat-label">Incorrect</div>
    </div>
    <div class="stat-box">
      <div class="stat-val info">${pct}%</div>
      <div class="stat-label">Score</div>
    </div>
  `;

  showScreen("complete-screen");

  // Save to GitHub
  const saveStatus = document.getElementById("save-status");
  saveStatus.className = "save-status saving";
  saveStatus.textContent = "💾 Saving your responses to GitHub…";

  const payload = {
    studentId,
    submittedAt: new Date().toISOString(),
    lesson: questions.lessonTitle,
    score: { correct, total: totalActivities, percent: pct },
    responses
  };

  const success = await saveToGitHub(payload);

  if (success) {
    saveStatus.className = "save-status saved";
    saveStatus.textContent = "✅ Responses saved successfully.";
  } else {
    saveStatus.className = "save-status error";
    saveStatus.textContent = "⚠️ Could not save to GitHub. Please tell your teacher.";
  }
}

async function saveToGitHub(payload) {
  try {
    const filename = `responses/student_${studentId}_${Date.now()}.json`;
    const content  = btoa(unescape(encodeURIComponent(JSON.stringify(payload, null, 2))));

    const resp = await fetch(
      `https://api.github.com/repos/${GITHUB_USERNAME}/${GITHUB_REPO}/contents/${filename}`,
      {
        method: "PUT",
        headers: {
          "Authorization": `token ${GITHUB_TOKEN}`,
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          message: `Response: student ${studentId} — ${new Date().toISOString()}`,
          content
        })
      }
    );
    return resp.ok;
  } catch {
    return false;
  }
}

// ── Utilities ──────────────────────────────────────────
function showScreen(id) {
  document.querySelectorAll(".screen").forEach(s => {
    s.classList.add("hidden");
    s.classList.remove("active");
  });
  const el = document.getElementById(id);
  el.classList.remove("hidden");
  el.classList.add("active");
}

function escapeHtml(str = "") {
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

function escapeAttr(str = "") {
  return str.replace(/"/g, "&quot;").replace(/'/g, "&#39;");
}

// Very lightweight syntax highlighter for lesson code examples
function syntaxHighlight(html) {
  return html
    // Comments (# ...)
    .replace(/(#[^\n<]*)/g, '<span class="comment">$1</span>')
    // Keywords
    .replace(/\b(def|return|if|elif|else|for|while|in|and|or|not|import|from|class|pass|True|False|None|print|input|range|int|float|str|len|type|round)\b/g,
      '<span class="keyword">$1</span>')
    // Strings in double quotes (escaped HTML)
    .replace(/(&quot;[^&]*&quot;)/g, '<span class="string">$1</span>');
}

// ── Boot ───────────────────────────────────────────────
init();
