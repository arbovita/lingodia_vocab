// Lingo Día Daily Vocab Trainer
// Static, browser-only app. Requires vocab.js first.

const state = {
  lesson: localStorage.getItem("lesson") || "S2L1",
  category: localStorage.getItem("category") || "All Categories",
  dailySet: localStorage.getItem("dailySet") || "All Sets",
  view: "today",
  sessionWords: [],
  recallIndex: 0,
  typeIndex: 0,
  matchIndex: 0,
  finalIndex: 0,
  score: 0,
  missedThisSession: []
};

const mastery = JSON.parse(localStorage.getItem("mastery") || "{}");

const $ = (id) => document.getElementById(id);

function savePrefs() {
  localStorage.setItem("lesson", state.lesson);
  localStorage.setItem("category", state.category);
  localStorage.setItem("dailySet", state.dailySet);
}

function stripAccents(text) {
  return text.normalize("NFD").replace(/[\u0300-\u036f]/g, "");
}

function cleanAnswer(text) {
  return stripAccents(String(text).toLowerCase())
    .replace(/[¿?¡!.,;:()]/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

function shuffle(array) {
  return [...array].sort(() => Math.random() - 0.5);
}

function getLessonWords() {
  return VOCAB_DATA.filter(w => w.lesson === state.lesson);
}

function getCategories() {
  return ["All Categories", ...Array.from(new Set(getLessonWords().map(w => w.category))).sort()];
}

function getDailySets() {
  const base = getLessonWords().filter(w => state.category === "All Categories" || w.category === state.category);
  return ["All Sets", ...Array.from(new Set(base.map(w => w.dailySet))).sort((a,b) => a.localeCompare(b, undefined, {numeric:true}))];
}

function getCurrentWords() {
  return VOCAB_DATA.filter(w => {
    const lessonOk = w.lesson === state.lesson;
    const catOk = state.category === "All Categories" || w.category === state.category;
    const setOk = state.dailySet === "All Sets" || w.dailySet === state.dailySet;
    return lessonOk && catOk && setOk;
  });
}

function getWordStatus(word) {
  return mastery[word.id] || { correct: 0, missed: 0, mastered: false };
}

function record(word, wasCorrect) {
  const current = getWordStatus(word);
  if (wasCorrect) current.correct += 1;
  else current.missed += 1;
  current.mastered = current.correct >= 2 && current.missed === 0;
  mastery[word.id] = current;
  localStorage.setItem("mastery", JSON.stringify(mastery));
}

function markMissed(word) {
  if (!state.missedThisSession.some(w => w.id === word.id)) state.missedThisSession.push(word);
  record(word, false);
}

function lessonTitle() {
  return LESSONS.find(l => l.id === state.lesson)?.title || state.lesson;
}

function initSelectors() {
  const lessonSelect = $("lessonSelect");
  lessonSelect.innerHTML = LESSONS.map(l => `<option value="${l.id}">${l.title}</option>`).join("");
  lessonSelect.value = state.lesson;

  lessonSelect.addEventListener("change", () => {
    state.lesson = lessonSelect.value;
    state.category = "All Categories";
    state.dailySet = "All Sets";
    savePrefs();
    populateSelectors();
    render();
  });

  $("categorySelect").addEventListener("change", () => {
    state.category = $("categorySelect").value;
    state.dailySet = "All Sets";
    savePrefs();
    populateSelectors();
    render();
  });

  $("dailySetSelect").addEventListener("change", () => {
    state.dailySet = $("dailySetSelect").value;
    savePrefs();
    render();
  });
}

function populateSelectors() {
  const categorySelect = $("categorySelect");
  const categories = getCategories();
  if (!categories.includes(state.category)) state.category = "All Categories";
  categorySelect.innerHTML = categories.map(c => `<option value="${c}">${c}</option>`).join("");
  categorySelect.value = state.category;

  const dailySetSelect = $("dailySetSelect");
  const sets = getDailySets();
  if (!sets.includes(state.dailySet)) state.dailySet = "All Sets";
  dailySetSelect.innerHTML = sets.map(s => `<option value="${s}">${s}</option>`).join("");
  dailySetSelect.value = state.dailySet;

  const words = getCurrentWords();
  const mastered = words.filter(w => getWordStatus(w).mastered).length;
  $("setSummary").innerHTML = `
    <span class="pill">${words.length} words</span>
    <span class="pill">${lessonTitle()}</span>
    <span class="pill">${state.category}</span>
    <span class="pill">${state.dailySet}</span>
    <span class="pill">${mastered} mastered</span>
  `;
}

function initTabs() {
  document.querySelectorAll(".tab").forEach(button => {
    button.addEventListener("click", () => {
      document.querySelectorAll(".tab").forEach(b => b.classList.remove("active"));
      button.classList.add("active");
      state.view = button.dataset.view;
      render();
    });
  });
}

function progress(current, total) {
  const pct = total ? Math.round((current / total) * 100) : 0;
  return `<div class="progress-bar"><div class="progress-fill" style="width:${pct}%"></div></div><p class="mini">${current}/${total}</p>`;
}

function render() {
  populateSelectors();

  const view = state.view;
  if (view === "today") renderToday();
  if (view === "learn") renderLearn();
  if (view === "recall") renderRecallStart();
  if (view === "type") renderTypeStart();
  if (view === "match") renderMatchStart();
  if (view === "final") renderFinalStart();
  if (view === "missed") renderMissed();
  if (view === "bank") renderBank();
  if (view === "teacher") renderTeacher();
}

function wordRows(words) {
  if (!words.length) return `<p>No words found for this filter.</p>`;
  return `<div class="word-list">` + words.map(w => {
    const status = getWordStatus(w);
    return `
      <div class="word-row">
        <div><strong>${w.spanish}</strong><div class="mini">${w.category} • ${w.dailySet}</div></div>
        <div>${w.english}</div>
        <div class="mini">${status.mastered ? "Mastered" : `${status.correct} correct • ${status.missed} missed`}</div>
      </div>
    `;
  }).join("") + `</div>`;
}

function renderToday() {
  const words = getCurrentWords();
  $("view").innerHTML = `
    <h2>Today’s Set</h2>
    <p>This is the exact slice you’re studying right now. Start with Learn if the words are new, or jump straight to Type/Final Check if the quiz is soon.</p>
    <div class="actions">
      <button class="primary" onclick="switchView('learn')">Start Learn Mode</button>
      <button onclick="switchView('recall')">Recall Drill</button>
      <button onclick="switchView('type')">Type It</button>
      <button onclick="switchView('final')">Final Check</button>
    </div>
    ${wordRows(words)}
  `;
}

function switchView(viewName) {
  state.view = viewName;
  document.querySelectorAll(".tab").forEach(b => b.classList.toggle("active", b.dataset.view === viewName));
  render();
}

function renderLearn() {
  const words = getCurrentWords();
  $("view").innerHTML = `
    <h2>Learn Mode</h2>
    <p>Use this once before drilling. Cover the English mentally, guess it, then reveal.</p>
    ${wordRows(words)}
    <div class="actions">
      <button class="primary" onclick="switchView('recall')">Now do Recall</button>
    </div>
  `;
}

function renderRecallStart() {
  state.sessionWords = shuffle(getCurrentWords());
  state.recallIndex = 0;
  state.missedThisSession = [];
  renderRecallCard();
}

function renderRecallCard() {
  const words = state.sessionWords;
  if (!words.length) {
    $("view").innerHTML = `<h2>Recall Drill</h2><p>No words in this set.</p>`;
    return;
  }
  if (state.recallIndex >= words.length) {
    const retry = state.missedThisSession;
    $("view").innerHTML = `
      <h2>Recall Complete</h2>
      <p>${retry.length ? `You missed ${retry.length}. Review them now.` : "No misses. Strong work."}</p>
      <div class="actions">
        <button class="primary" onclick="switchView('type')">Go to Type It</button>
        <button onclick="renderRecallStart()">Restart Recall</button>
      </div>
      ${wordRows(retry)}
    `;
    return;
  }
  const w = words[state.recallIndex];
  $("view").innerHTML = `
    <h2>Recall Drill</h2>
    ${progress(state.recallIndex, words.length)}
    <div class="practice-card">
      <p class="mini">Think of the meaning before revealing.</p>
      <div class="big-word">${w.spanish}</div>
      <button onclick="document.querySelector('.reveal-box').classList.add('show')">Reveal meaning</button>
      <div class="reveal-box">
        <h3>${w.english}</h3>
        <p class="mini">${w.category} • ${w.dailySet}</p>
      </div>
      <div class="actions">
        <button class="primary" onclick="recallAnswer(true)">I knew it</button>
        <button class="secondary" onclick="recallAnswer(false)">I missed it</button>
      </div>
    </div>
  `;
}

function recallAnswer(correct) {
  const w = state.sessionWords[state.recallIndex];
  if (correct) record(w, true);
  else markMissed(w);
  state.recallIndex++;
  renderRecallCard();
}

function renderTypeStart() {
  state.sessionWords = shuffle(getCurrentWords());
  state.typeIndex = 0;
  state.score = 0;
  state.missedThisSession = [];
  renderTypeCard();
}

function renderTypeCard() {
  const words = state.sessionWords;
  if (!words.length) {
    $("view").innerHTML = `<h2>Type It</h2><p>No words in this set.</p>`;
    return;
  }
  if (state.typeIndex >= words.length) {
    $("view").innerHTML = `
      <h2>Type It Complete</h2>
      <p>Your score: ${state.score}/${words.length}</p>
      <div class="actions">
        <button class="primary" onclick="switchView('final')">Go to Final Check</button>
        <button onclick="renderTypeStart()">Restart Type Mode</button>
      </div>
      ${state.missedThisSession.length ? `<h3>Missed Words</h3>${wordRows(state.missedThisSession)}` : `<p class="good">No misses.</p>`}
    `;
    return;
  }
  const w = words[state.typeIndex];
  $("view").innerHTML = `
    <h2>Type It</h2>
    ${progress(state.typeIndex, words.length)}
    <div class="practice-card">
      <p class="mini">Type the Spanish. Accent-insensitive, but the correct spelling will show.</p>
      <h3>${w.english}</h3>
      <input id="typeAnswer" autocomplete="off" placeholder="Type Spanish here" onkeydown="if(event.key==='Enter') checkTypeAnswer()" />
      <div class="actions">
        <button class="primary" onclick="checkTypeAnswer()">Check</button>
        <button onclick="typeSkip()">Skip</button>
      </div>
      <p id="typeFeedback" class="feedback"></p>
    </div>
  `;
  setTimeout(() => $("typeAnswer")?.focus(), 50);
}

function checkTypeAnswer() {
  const w = state.sessionWords[state.typeIndex];
  const answer = cleanAnswer($("typeAnswer").value);
  const correct = cleanAnswer(w.spanish);
  const ok = answer === correct;

  if (ok) {
    $("typeFeedback").innerHTML = `<span class="good">Correct.</span>`;
    state.score++;
    record(w, true);
  } else {
    $("typeFeedback").innerHTML = `<span class="bad">Not quite. Correct answer: <span class="kbd">${w.spanish}</span></span>`;
    markMissed(w);
  }
  setTimeout(() => {
    state.typeIndex++;
    renderTypeCard();
  }, ok ? 550 : 1300);
}

function typeSkip() {
  const w = state.sessionWords[state.typeIndex];
  markMissed(w);
  state.typeIndex++;
  renderTypeCard();
}

function makeOptions(word) {
  const pool = getCurrentWords().length >= 4 ? getCurrentWords() : VOCAB_DATA.filter(w => w.lesson === state.lesson);
  const wrong = shuffle(pool.filter(x => x.id !== word.id)).slice(0, 3).map(x => x.english);
  return shuffle([word.english, ...wrong]);
}

function renderMatchStart() {
  state.sessionWords = shuffle(getCurrentWords());
  state.matchIndex = 0;
  state.score = 0;
  state.missedThisSession = [];
  renderMatchCard();
}

function renderMatchCard() {
  const words = state.sessionWords;
  if (!words.length) {
    $("view").innerHTML = `<h2>Match</h2><p>No words in this set.</p>`;
    return;
  }
  if (state.matchIndex >= words.length) {
    $("view").innerHTML = `
      <h2>Match Complete</h2>
      <p>Your score: ${state.score}/${words.length}</p>
      <div class="actions">
        <button class="primary" onclick="switchView('type')">Now Type It</button>
        <button onclick="renderMatchStart()">Restart Match</button>
      </div>
      ${state.missedThisSession.length ? wordRows(state.missedThisSession) : `<p class="good">No misses.</p>`}
    `;
    return;
  }
  const w = words[state.matchIndex];
  const options = makeOptions(w);
  $("view").innerHTML = `
    <h2>Fast Match</h2>
    ${progress(state.matchIndex, words.length)}
    <div class="practice-card">
      <p>What does <strong>${w.spanish}</strong> mean?</p>
      <div class="option-grid">
        ${options.map(o => `<button class="option" onclick='matchAnswer(${JSON.stringify(o)})'>${o}</button>`).join("")}
      </div>
      <p id="matchFeedback" class="feedback"></p>
    </div>
  `;
}

function matchAnswer(choice) {
  const w = state.sessionWords[state.matchIndex];
  if (choice === w.english) {
    state.score++;
    record(w, true);
    $("matchFeedback").innerHTML = `<span class="good">Correct.</span>`;
  } else {
    markMissed(w);
    $("matchFeedback").innerHTML = `<span class="bad">Incorrect. Correct: ${w.english}</span>`;
  }
  setTimeout(() => {
    state.matchIndex++;
    renderMatchCard();
  }, 800);
}

function renderFinalStart() {
  const current = getCurrentWords();
  const missed = current.filter(w => getWordStatus(w).missed > 0 && !getWordStatus(w).mastered);
  state.sessionWords = shuffle(missed.length ? missed : current);
  state.finalIndex = 0;
  state.score = 0;
  state.missedThisSession = [];
  renderFinalCard();
}

function renderFinalCard() {
  const words = state.sessionWords;
  if (!words.length) {
    $("view").innerHTML = `<h2>Final Check</h2><p>No words in this set.</p>`;
    return;
  }
  if (state.finalIndex >= words.length) {
    $("view").innerHTML = `
      <h2>Final Check Complete</h2>
      <p>Your readiness score: ${state.score}/${words.length}</p>
      <p>${state.score === words.length ? "Ready for the quiz." : "Review missed words once more before the quiz."}</p>
      <div class="actions">
        <button class="primary" onclick="switchView('missed')">Review Missed</button>
        <button onclick="renderFinalStart()">Restart Final Check</button>
      </div>
      ${state.missedThisSession.length ? wordRows(state.missedThisSession) : `<p class="good">No misses.</p>`}
    `;
    return;
  }
  const w = words[state.finalIndex];
  const useTyping = state.finalIndex % 2 === 0;
  if (useTyping) {
    $("view").innerHTML = `
      <h2>Final Check</h2>
      ${progress(state.finalIndex, words.length)}
      <div class="practice-card">
        <p>Type the Spanish for:</p>
        <h3>${w.english}</h3>
        <input id="finalAnswer" autocomplete="off" placeholder="Type Spanish here" onkeydown="if(event.key==='Enter') finalTypeAnswer()" />
        <button class="primary" onclick="finalTypeAnswer()">Check</button>
        <p id="finalFeedback" class="feedback"></p>
      </div>
    `;
    setTimeout(() => $("finalAnswer")?.focus(), 50);
  } else {
    const options = makeOptions(w);
    $("view").innerHTML = `
      <h2>Final Check</h2>
      ${progress(state.finalIndex, words.length)}
      <div class="practice-card">
        <p>Choose the meaning of <strong>${w.spanish}</strong>:</p>
        <div class="option-grid">
          ${options.map(o => `<button class="option" onclick='finalMatchAnswer(${JSON.stringify(o)})'>${o}</button>`).join("")}
        </div>
        <p id="finalFeedback" class="feedback"></p>
      </div>
    `;
  }
}

function finalTypeAnswer() {
  const w = state.sessionWords[state.finalIndex];
  const ok = cleanAnswer($("finalAnswer").value) === cleanAnswer(w.spanish);
  finalResolve(ok, w);
}

function finalMatchAnswer(choice) {
  const w = state.sessionWords[state.finalIndex];
  finalResolve(choice === w.english, w);
}

function finalResolve(ok, w) {
  if (ok) {
    state.score++;
    record(w, true);
    $("finalFeedback").innerHTML = `<span class="good">Correct.</span>`;
  } else {
    markMissed(w);
    $("finalFeedback").innerHTML = `<span class="bad">Correct answer: ${w.spanish} — ${w.english}</span>`;
  }
  setTimeout(() => {
    state.finalIndex++;
    renderFinalCard();
  }, ok ? 600 : 1300);
}

function renderMissed() {
  const words = getCurrentWords().filter(w => getWordStatus(w).missed > 0 && !getWordStatus(w).mastered);
  $("view").innerHTML = `
    <h2>Missed Words</h2>
    <p>These are the words you missed in this set and have not mastered yet.</p>
    <div class="actions">
      <button class="primary" onclick="switchView('final')">Drill Missed Words</button>
      <button class="danger" onclick="clearMasteryForCurrentSet()">Clear progress for this set</button>
    </div>
    ${wordRows(words)}
  `;
}

function clearMasteryForCurrentSet() {
  getCurrentWords().forEach(w => delete mastery[w.id]);
  localStorage.setItem("mastery", JSON.stringify(mastery));
  render();
}

function renderBank() {
  const words = getCurrentWords();
  $("view").innerHTML = `
    <h2>Word Bank</h2>
    <div class="search-row">
      <input id="searchInput" placeholder="Search Spanish or English" oninput="filterBank()" />
      <button onclick="filterBank()">Search</button>
    </div>
    <div id="bankResults">${wordRows(words)}</div>
  `;
}

function filterBank() {
  const query = cleanAnswer($("searchInput").value);
  const words = getCurrentWords().filter(w =>
    cleanAnswer(w.spanish).includes(query) ||
    cleanAnswer(w.english).includes(query) ||
    cleanAnswer(w.category).includes(query)
  );
  $("bankResults").innerHTML = wordRows(words);
}

function renderTeacher() {
  $("view").innerHTML = `
    <h2>Teacher Notes</h2>
    <p>This resource is designed to be stricter and faster than a normal flashcard deck. It is organized by lesson, category, and daily quiz set so students do not waste time reviewing the wrong words.</p>
    <div class="teacher-box">
      <h3>Why it helps</h3>
      <p><strong>Learn</strong> gives first exposure. <strong>Recall</strong> forces memory before reveal. <strong>Type</strong> checks spelling and production. <strong>Final Check</strong> returns missed words until students are ready.</p>
    </div>
    <div class="teacher-box">
      <h3>Best-effort set note</h3>
      <p>The daily quiz set labels match the teacher’s folder names/counts provided by the student. Since the exact Quizlet term membership was not provided, the words are distributed across daily sets as a best-effort starter. Once exact set membership is available, only <span class="kbd">vocab.js</span> needs editing.</p>
    </div>
    <div class="teacher-box">
      <h3>No account needed</h3>
      <p>The app runs fully in the browser and stores progress only on the same device using localStorage.</p>
    </div>
  `;
}

initSelectors();
populateSelectors();
initTabs();
render();
