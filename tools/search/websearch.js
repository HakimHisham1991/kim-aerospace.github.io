const input = document.getElementById('search');
const resultsDiv = document.getElementById('results');

// Initialise Fuse.js once
const fuse = new Fuse(parts, {
  keys: ['part_no', 'description', 'project_code'],
  threshold: 0.3,         // 0 = exact, 0.6 = very fuzzy
  includeScore: true,
  shouldSort: true
});

input.addEventListener('input', () => {
  const query = input.value.trim();
  
  if (query.length < 2) {
    resultsDiv.innerHTML = '<div class="loading">Type 2+ characters...</div>';
    return;
  }

  const results = fuse.search(query);
  
  if (results.length === 0) {
    resultsDiv.innerHTML = '<div class="no-results">No parts found</div>';
    return;
  }

  resultsDiv.innerHTML = results.slice(0, 30).map(r => {
    const item = r.item;
    return `
      <div class="result">
        <strong>${item.part_no}</strong><br>
        <small>${item.description} <em>(${item.project_code})</em></small>
      </div>`;
  }).join('');
});
