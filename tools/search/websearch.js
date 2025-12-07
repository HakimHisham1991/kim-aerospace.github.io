// --- CONFIGURE FUSE ---
const fuse = new Fuse(parts, {
  keys: ["part_no", "description", "project_code"],
  threshold: 0.3,
  includeScore: true,
});

// --- DOM ELEMENTS ---
const searchInput = document.getElementById("search");
const resultsDiv = document.getElementById("results");

let currentIndex = -1; // keyboard highlight index

// --- RENDER RESULTS ---
function renderResults(query) {
  currentIndex = -1; // reset when typing

  if (!query) {
    resultsDiv.innerHTML = `<div class="loading">Start typing to search instantly...</div>`;
    return;
  }

  const results = fuse.search(query).slice(0, 50);

  if (results.length === 0) {
    resultsDiv.innerHTML = `<div class="no-results">No matching parts found.</div>`;
    return;
  }

  resultsDiv.innerHTML = results
    .map(r => {
      const p = r.item;
      return `
        <div class="result" data-partno="${p.part_no}">
          <strong>${p.part_no}</strong>
          <small>${p.description}</small><br>
          <small><em>${p.project_code}</em></small>
        </div>
      `;
    })
    .join("");

  const items = document.querySelectorAll(".result");

  // Mouse hover highlight
  items.forEach((el, idx) => {
    el.addEventListener("mouseenter", () => {
      clearHighlight();
      el.classList.add("highlight");
      currentIndex = idx;
    });

    // Click to select
    el.addEventListener("click", () => {
      const selectedPartNo = el.getAttribute("data-partno");
      searchInput.value = selectedPartNo;
      resultsDiv.innerHTML = "";
    });
  });
}

// --- CLEAR CURRENT HIGHLIGHTS ---
function clearHighlight() {
  document.querySelectorAll(".result").forEach(el => {
    el.classList.remove("highlight");
  });
}

// --- APPLY HIGHLIGHT TO CURRENT INDEX ---
function applyHighlight() {
  const items = document.querySelectorAll(".result");
  clearHighlight();
  if (items[currentIndex]) {
    items[currentIndex].classList.add("highlight");
    items[currentIndex].scrollIntoView({ block: "nearest" });
  }
}

// --- KEYBOARD SUPPORT ---
searchInput.addEventListener("keydown", (e) => {
  const items = document.querySelectorAll(".result");
  if (items.length === 0) return;

  if (e.key === "ArrowDown") {
    e.preventDefault();
    currentIndex = (currentIndex + 1) % items.length;
    applyHighlight();
  }

  else if (e.key === "ArrowUp") {
    e.preventDefault();
    currentIndex = (currentIndex - 1 + items.length) % items.length;
    applyHighlight();
  }

  else if (e.key === "Enter") {
    if (currentIndex >= 0 && items[currentIndex]) {
      const selectedPartNo = items[currentIndex].getAttribute("data-partno");
      searchInput.value = selectedPartNo;
      resultsDiv.innerHTML = "";
    }
  }
});

// --- SEARCH INPUT LISTENER ---
searchInput.addEventListener("input", (e) => {
  renderResults(e.target.value.trim());
});

// --- CLICK OUTSIDE TO CLOSE LIST ---
document.addEventListener("click", (e) => {
  if (!e.target.closest(".result") && e.target !== searchInput) {
    resultsDiv.innerHTML = "";
  }
});
