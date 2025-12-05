const client = new MeiliSearch({
  host: 'https://ms-adf78ae33284-106.lon.meilisearch.io',
  apiKey: 'a63da4928426f12639e19d62886f621130f3fa9ff3c7534c5d179f0f51c4f303'
});

const index = client.index('steam-videogames');
const input = document.getElementById('part');
const resultsDiv = document.getElementById('results');

let debounceTimer;

input.addEventListener('input', () => {
  clearTimeout(debounceTimer);
  const q = input.value.trim();

  if (q.length < 2) {
    resultsDiv.innerHTML = '<div class="loading">Type 2+ characters to search instantly...</div>';
    return;
  }

  resultsDiv.innerHTML = '<div class="loading">Searching...</div>';

  debounceTimer = setTimeout(async () => {
    try {
      const search = await index.search(q, {
        limit: 15,
        attributesToHighlight: ['name', 'description']
      });

      if (search.hits.length === 0) {
        resultsDiv.innerHTML = '<div>No results found</div>';
        return;
      }

      resultsDiv.innerHTML = search.hits.map(hit => `
        <div class="hit">
          <strong>${hit._formatted?.name || hit.name}</strong><br>
          <small>${hit._formatted?.description || hit.description || 'No description'}</small>
        </div>
      `).join('');
    } catch (e) {
      resultsDiv.innerHTML = '<div style="color:red">Search error – try again later</div>';
      console.error(e);
    }
  }, 300);
});
