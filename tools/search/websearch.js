// --- CONFIGURE FUSE ---
const fuse = new Fuse(parts, {
  keys: ["part_no", "description", "project_code"],
  threshold: 0.3,
  includeScore: true,
});

// --- DOM ELEMENTS ---
const searchInput = document.getElementById("search");
const resultsDiv = document.getElementById("results");

// --- SEARCH FUNCTION ---
function renderResults(query) {
  if (!query) {
    resultsDiv.innerHTML = `<div class="loading">Start typing to search instantly...</div>`;
    return;
  }

  const results = fuse.search(query).slice(0, 50); // limit to 50 results for speed

  if (results.length === 0) {
    resultsDiv.innerHTML = `<div class="no-results">No matching parts found.</div>`;
    return;
  }

  // Build result list
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

  // Enable clicking to select a part
  document.querySelectorAll(".result").forEach(el => {
    el.addEventListener("click", () => {
      const selectedPartNo = el.getAttribute("data-partno");

      searchInput.value = selectedPartNo;  // fill in textbox
      resultsDiv.innerHTML = "";           // hide results
    });
  });
}

// --- SEARCH INPUT LISTENER ---
searchInput.addEventListener("input", (e) => {
  renderResults(e.target.value.trim());
});

// --- CLICK OUTSIDE TO HIDE RESULTS ---
document.addEventListener("click", (e) => {
  const clickedInside =
    e.target.closest(".result") ||
    e.target === searchInput;

  if (!clickedInside) {
    resultsDiv.innerHTML = "";
  }
});
