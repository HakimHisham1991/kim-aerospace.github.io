// form_search.js — Final Production Version

// --- FUSE CONFIG (SMART + PREFIX PRIORITY) ---
const fuse = new Fuse(parts, {
  keys: [
    { name: "part_no", weight: 10 },
    { name: "description", weight: 1 },
    { name: "project_code", weight: 0.5 }
  ],
  threshold: 0.35,
  includeScore: true,
  shouldSort: true,
  minMatchCharLength: 3,
  useExtendedSearch: true,
  ignoreLocation: true
});

// --- DOM ELEMENTS ---
const searchInput = document.getElementById("search");
const resultsDiv = document.getElementById("results");
const resultCounterEl = document.getElementById("result-counter");
const copyMainBtn = document.getElementById("copy-main-btn");

let currentIndex = -1;

// --- PROJECT CODE COLORS ---
const projectColors = {
  AB01: '#dc2626', AB02: '#f97316', AB03: '#eab308',
  AD01: '#22c55e', AD02: '#3b82f6', AD03: '#8b5cf6',
  AM03: '#ec4899', AM04: '#f43f5e', 
  SA01: '#06b6d4', SB01: '#8b5cf6',
  AOG: '#ef4444', AP02: '#10b981'
};

// --- TOAST ---
function showToast(text) {
  const toast = document.createElement('div');
  toast.className = 'toast';
  toast.textContent = text;
  document.body.appendChild(toast);
  setTimeout(() => toast.remove(), 2800);
}

// --- COPY TO CLIPBOARD ---
function copyToClipboard(text) {
  navigator.clipboard.writeText(text).then(() => {
    showToast(`Copied: ${text}`);
  });
}

// --- MAIN COPY BUTTON ---
copyMainBtn.addEventListener("click", () => {
  const value = searchInput.value.trim();
  if (value) copyToClipboard(value);
});

// --- HIGHLIGHT MATCHES ---
function highlight(text, query) {
  if (!query) return text;
  const regex = new RegExp(`(${query.replace(/[-[\]{}()*+?.,\\^$|#\s]/g, '\\$&')})`, 'gi');
  return text.replace(regex, '<mark>$1</mark>');
}

// --- COUNTER HELPERS ---
function updateResultCounter(count) {
  if (count > 0) {
    resultCounterEl.textContent = `${count} result${count !== 1 ? 's' : ''} found`;
    resultCounterEl.classList.add("show");
  } else {
    resultCounterEl.classList.remove("show");
  }
}

function hideResultCounter() {
  resultCounterEl.classList.remove("show");
}

// --- RESULT SELECTION & CLEARING ---
function selectResult(element) {
  const partNo = element.getAttribute("data-partno");
  searchInput.value = partNo;
  clearResults();
  searchInput.focus();
}

function clearResults() {
  resultsDiv.innerHTML = "";
  hideResultCounter();
  currentIndex = -1;
}

// --- KEYBOARD NAVIGATION ---
searchInput.addEventListener("keydown", (e) => {
  const items = document.querySelectorAll(".result");
  if (items.length === 0) {
    currentIndex = -1;
    return;
  }

  if (e.key === "ArrowDown") {
    e.preventDefault();
    currentIndex = Math.min(currentIndex + 1, items.length - 1);
    highlightCurrent(items);
  } 
  else if (e.key === "ArrowUp") {
    e.preventDefault();
    currentIndex = Math.max(currentIndex - 1, 0);
    highlightCurrent(items);
  } 
  else if (e.key === "Enter") {
    e.preventDefault();
    if (currentIndex >= 0) selectResult(items[currentIndex]);
  } 
  else if (e.key === "Escape") {
    e.preventDefault();
    clearResults();
  } 
  else if (e.key === "Home") {
    e.preventDefault();
    currentIndex = 0;
    highlightCurrent(items);
  } 
  else if (e.key === "End") {
    e.preventDefault();
    currentIndex = items.length - 1;
    highlightCurrent(items);
  }
});

function highlightCurrent(items = document.querySelectorAll(".result")) {
  items.forEach((el, i) => {
    el.classList.toggle("highlight", i === currentIndex);
  });
  if (items[currentIndex]) {
    items[currentIndex].scrollIntoView({ block: "nearest", behavior: "smooth" });
  }
}

// --- RENDER RESULTS ---
function renderResults(query) {
  currentIndex = -1;
  const trimmed = query.trim();

  if (!trimmed) {
    resultsDiv.innerHTML = `<div class="loading">Start typing to search instantly...</div>`;
    hideResultCounter();
    return;
  }

  let results = [];

  // Priority 1: Prefix match on part_no
  if (trimmed.length >= 4 || trimmed.includes('-')) {
    results = fuse.search({ part_no: `'${trimmed}` });
  }

  // Priority 2: Fuzzy fallback
  if (results.length < 5) {
    const fuzzy = fuse.search(trimmed);
    const existing = new Set(results.map(r => r.item.part_no));
    results = [...results, ...fuzzy.filter(r => !existing.has(r.item.part_no))];
  }

  results = results.slice(0, 80);
  updateResultCounter(results.length);

  if (results.length === 0) {
    resultsDiv.innerHTML = `<div class="no-results">No matching parts found.</div>`;
    return;
  }

  resultsDiv.innerHTML = results.map(r => {
    const p = r.item;
    const color = projectColors[p.project_code] || '#64748b';
    return `
      <div class="result" data-partno="${p.part_no}" tabindex="-1">
        <strong>${highlight(p.part_no, trimmed)}</strong>
        <small>${highlight(p.description, trimmed)}</small>
        <span class="badge" style="background:${color}">${p.project_code}</span>
      </div>
    `;
  }).join("");

  setupResultInteractions();

  // Auto-highlight first result
  if (results.length > 0) {
    currentIndex = 0;
    setTimeout(() => highlightCurrent(), 10);
  }
}

// --- SETUP INTERACTIONS ---
function setupResultInteractions() {
  const items = document.querySelectorAll(".result");
  
  items.forEach((el, idx) => {
    el.addEventListener("mouseenter", () => {
      items.forEach(item => item.classList.remove("highlight"));
      el.classList.add("highlight");
      currentIndex = idx;
    });

    el.addEventListener("click", () => {
      selectResult(el);
    });
  });
}

// --- INPUT & CLICK OUTSIDE ---
searchInput.addEventListener("input", (e) => renderResults(e.target.value));

document.addEventListener("click", (e) => {
  if (!e.target.closest(".result") && e.target !== searchInput && e.target !== copyMainBtn) {
    clearResults();
  }
});

// --- DARK MODE ---
if (window.matchMedia('(prefers-color-scheme: dark)').matches) {
  document.body.classList.add('dark');
}
window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', e => {
  document.body.classList.toggle('dark', e.matches);
});
