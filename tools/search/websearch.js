document.addEventListener('DOMContentLoaded', function() {
  const input = document.getElementById('search');
  const resultsDiv = document.getElementById('results');
  
  console.log("Script loaded, parts array length:", parts.length);

  // Initialise Fuse.js once
  const fuse = new Fuse(parts, {
    keys: ['part_no', 'description', 'project_code'],
    threshold: 0.4,
    includeScore: true,
    shouldSort: true
  });

  input.addEventListener('input', function() {
    const query = input.value.trim();
    console.log("Searching for:", query);
    
    if (query.length < 2) {
      resultsDiv.innerHTML = '<div class="loading">Type 2+ characters to search...</div>';
      return;
    }

    const results = fuse.search(query);
    console.log("Found results:", results.length);
    
    if (results.length === 0) {
      resultsDiv.innerHTML = '<div class="no-results">No parts found for "' + query + '"</div>';
      return;
    }

    // Show top 30 results
    const html = results.slice(0, 30).map(r => {
      const item = r.item;
      return `
        <div class="result">
          <strong>${item.part_no}</strong>
          <small>${item.description} <em>(${item.project_code})</em></small>
        </div>`;
    }).join('');
    
    resultsDiv.innerHTML = html;
  });

  // Also add keyup event for better responsiveness
  input.addEventListener('keyup', function(e) {
    if (e.key === 'Enter') {
      input.dispatchEvent(new Event('input'));
    }
  });
});
