(() => {
  'use strict';

  const PAGE_SIZE = 120;
  const DATA_SOURCES = [
    'https://raw.githubusercontent.com/osint4all/osint4all.github.io/main/README.md',
    'https://cdn.jsdelivr.net/gh/osint4all/osint4all.github.io@main/README.md'
  ];

  const $ = (selector) => document.querySelector(selector);
  const $$ = (selector) => [...document.querySelectorAll(selector)];
  const els = {
    input: $('#searchInput'), wrap: $('#searchWrap'), clear: $('#clearSearch'), grid: $('#toolGrid'),
    categories: $('#categoryList'), title: $('#resultTitle'), meta: $('#resultMeta'), kicker: $('#resultKicker'),
    sort: $('#sortSelect'), load: $('#loadMore'), empty: $('#emptyState'), loading: $('#loadingState'),
    error: $('#errorState'), errorMessage: $('#errorMessage'), retry: $('#retryLoad'), reset: $('#resetFilters'),
    emptyReset: $('#emptyReset'), allCount: $('#allCount'), toolCount: $('#toolCount'), categoryCount: $('#categoryCount'),
    favCount: $('#favoriteCount'), sideFav: $('#sideFavCount'), theme: $('#themeBtn'), random: $('#randomBtn')
  };

  const normalize = (value = '') => value.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
  const escapeHtml = (value = '') => value.replace(/[&<>'"]/g, ch => ({'&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#39;','"':'&quot;'}[ch]));
  const storedFavs = JSON.parse(localStorage.getItem('dv-openintel-favorites') || '[]');
  let favorites = new Set(storedFavs);
  let data = [];
  let state = { query: '', category: '__all__', sort: 'source', shown: PAGE_SIZE };

  function iconFor(category) {
    const c = normalize(category);
    if (c.includes('people') || c.includes('person') || c.includes('identity')) return '◉';
    if (c.includes('email') || c.includes('contact')) return '✉';
    if (c.includes('phone')) return '☎';
    if (c.includes('social') || c.includes('twitter') || c.includes('reddit') || c.includes('facebook') || c.includes('instagram')) return '♢';
    if (c.includes('map') || c.includes('geo') || c.includes('weather')) return '⌖';
    if (c.includes('image') || c.includes('video') || c.includes('media')) return '▣';
    if (c.includes('domain') || c.includes('ip') || c.includes('dns') || c.includes('iot')) return '◎';
    if (c.includes('search')) return '⌕';
    if (c.includes('business') || c.includes('corporation')) return '▦';
    if (c.includes('government') || c.includes('police') || c.includes('public record')) return '◆';
    if (c.includes('vehicle') || c.includes('vin') || c.includes('plate')) return '◇';
    if (c.includes('flight') || c.includes('aviation')) return '✈';
    if (c.includes('maritime')) return '≈';
    if (c.includes('security') || c.includes('threat') || c.includes('breach')) return '⬡';
    if (c.includes('file') || c.includes('document')) return '▤';
    return '•';
  }

  function cleanMarkdown(text = '') {
    return text
      .replace(/\\([\\`*{}\[\]()#+\-.!_>])/g, '$1')
      .replace(/[*_`]/g, '')
      .replace(/<[^>]*>/g, '')
      .trim();
  }

  function getDomain(url) {
    try { return new URL(url).hostname.replace(/^www\./, ''); }
    catch { return url; }
  }

  function parseMarkdown(markdown) {
    const tools = [];
    const seen = new Set();
    let category = 'General';

    markdown.split(/\r?\n/).forEach((line, sourceIndex) => {
      const heading = line.match(/^##\s+(.+?)\s*$/);
      if (heading) {
        category = cleanMarkdown(heading[1]);
        return;
      }

      const linkPattern = /\[([^\]]+)\]\((https?:\/\/[^)\s]+)(?:\s+["'][^"']*["'])?\)/g;
      let match;
      while ((match = linkPattern.exec(line)) !== null) {
        const name = cleanMarkdown(match[1]);
        const url = match[2].replace(/&amp;/g, '&');
        if (!name || !url || seen.has(url)) continue;
        seen.add(url);
        tools.push({ name, url, domain: getDomain(url), category, sourceIndex });
      }
    });

    return tools;
  }

  async function fetchCatalog() {
    let lastError;
    for (const source of DATA_SOURCES) {
      try {
        const response = await fetch(source, { cache: 'no-store' });
        if (!response.ok) throw new Error(`HTTP ${response.status}`);
        const markdown = await response.text();
        const parsed = parseMarkdown(markdown);
        if (parsed.length < 100) throw new Error('A fonte retornou poucos recursos e foi rejeitada por segurança.');
        return parsed;
      } catch (error) {
        lastError = error;
      }
    }
    throw lastError || new Error('Fonte indisponível.');
  }

  function favicon(domain) {
    return `https://www.google.com/s2/favicons?domain=${encodeURIComponent(domain)}&sz=64`;
  }

  function searchable(tool) {
    return normalize(`${tool.name} ${tool.domain} ${tool.category}`);
  }

  function filtered() {
    let list = data;
    if (state.category === '__favorites__') list = list.filter(tool => favorites.has(tool.url));
    else if (state.category !== '__all__') list = list.filter(tool => tool.category === state.category);

    const query = normalize(state.query.trim());
    if (query) list = list.filter(tool => searchable(tool).includes(query));

    list = [...list];
    if (state.sort === 'az') list.sort((a, b) => a.name.localeCompare(b.name));
    else if (state.sort === 'category') list.sort((a, b) => a.category.localeCompare(b.category) || a.name.localeCompare(b.name));
    else list.sort((a, b) => a.sourceIndex - b.sourceIndex);
    return list;
  }

  function createCard(tool) {
    const article = document.createElement('article');
    article.className = 'tool-card';
    article.innerHTML = `
      <a class="tool-link" href="${escapeHtml(tool.url)}" target="_blank" rel="noopener noreferrer" aria-label="Abrir ${escapeHtml(tool.name)}"></a>
      <div class="favicon-wrap">
        <img loading="lazy" referrerpolicy="no-referrer" src="${favicon(tool.domain)}" alt="" onerror="this.style.display='none';this.nextElementSibling.style.display='block'">
        <span class="favicon-fallback" style="display:none">${escapeHtml((tool.name || '?').charAt(0).toUpperCase())}</span>
      </div>
      <div class="tool-copy">
        <div class="tool-name" title="${escapeHtml(tool.name)}">${escapeHtml(tool.name)}</div>
        <div class="tool-domain">${escapeHtml(tool.domain || tool.url)}</div>
        <div class="tool-cat">${escapeHtml(tool.category)}</div>
      </div>
      <button class="fav-btn ${favorites.has(tool.url) ? 'active' : ''}" type="button" data-fav="${escapeHtml(tool.url)}" aria-label="Favoritar" title="Favoritar">★</button>
      <span class="external-mark">↗</span>`;
    return article;
  }

  function updateFavCounts() {
    const count = favorites.size;
    els.favCount.textContent = count.toLocaleString('pt-BR');
    els.sideFav.textContent = count.toLocaleString('pt-BR');
  }

  function buildCategories() {
    const counts = data.reduce((map, tool) => {
      map[tool.category] = (map[tool.category] || 0) + 1;
      return map;
    }, {});
    const categories = Object.entries(counts).sort((a, b) => a[0].localeCompare(b[0]));
    const fragment = document.createDocumentFragment();

    categories.forEach(([name, count]) => {
      const button = document.createElement('button');
      button.className = 'category-item';
      button.dataset.category = name;
      button.innerHTML = `<span class="cat-icon">${iconFor(name)}</span><span title="${escapeHtml(name)}">${escapeHtml(name)}</span><b>${count}</b>`;
      fragment.appendChild(button);
    });

    els.categories.replaceChildren(fragment);
    els.toolCount.textContent = data.length.toLocaleString('pt-BR');
    els.categoryCount.textContent = categories.length.toLocaleString('pt-BR');
    els.allCount.textContent = data.length.toLocaleString('pt-BR');
  }

  function render() {
    if (!data.length) return;
    const list = filtered();
    const visible = list.slice(0, state.shown);

    els.grid.replaceChildren(...visible.map(createCard));
    els.empty.hidden = list.length !== 0;
    els.grid.hidden = list.length === 0;
    els.load.hidden = list.length <= state.shown;
    els.meta.textContent = `${list.length.toLocaleString('pt-BR')} resultado${list.length === 1 ? '' : 's'}${state.query ? ` para “${state.query}”` : ''}`;

    if (state.category === '__all__') {
      els.title.textContent = state.query ? 'Resultados da busca' : 'Todas as ferramentas';
      els.kicker.textContent = state.query ? 'Busca no diretório' : 'Explorar diretório';
    } else if (state.category === '__favorites__') {
      els.title.textContent = 'Seus favoritos';
      els.kicker.textContent = 'Coleção local';
    } else {
      els.title.textContent = state.category;
      els.kicker.textContent = 'Categoria';
    }

    $$('.category-item').forEach(button => button.classList.toggle('active', button.dataset.category === state.category));
    els.wrap.classList.toggle('has-text', Boolean(state.query));
  }

  function resetAll() {
    state = { ...state, query: '', category: '__all__', shown: PAGE_SIZE };
    els.input.value = '';
    render();
  }

  async function load() {
    els.loading.hidden = false;
    els.error.hidden = true;
    els.empty.hidden = true;
    els.grid.hidden = true;
    els.load.hidden = true;
    els.kicker.textContent = 'Carregando catálogo';
    els.title.textContent = 'DV OpenIntel';
    els.meta.textContent = 'Obtendo a base pública OSINT4ALL…';

    try {
      data = await fetchCatalog();
      buildCategories();
      els.loading.hidden = true;
      render();
    } catch (error) {
      console.error(error);
      els.loading.hidden = true;
      els.error.hidden = false;
      els.kicker.textContent = 'Fonte indisponível';
      els.title.textContent = 'Catálogo não carregado';
      els.meta.textContent = 'A interface continua funcionando, mas precisa acessar a fonte pública para montar os resultados.';
      els.errorMessage.textContent = `Detalhe: ${error?.message || 'erro desconhecido'}`;
    }
  }

  els.input.addEventListener('input', event => { state.query = event.target.value; state.shown = PAGE_SIZE; render(); });
  els.clear.addEventListener('click', () => { state.query = ''; els.input.value = ''; els.input.focus(); state.shown = PAGE_SIZE; render(); });
  els.sort.addEventListener('change', event => { state.sort = event.target.value; state.shown = PAGE_SIZE; render(); });
  els.load.addEventListener('click', () => { state.shown += PAGE_SIZE; render(); });
  els.reset.addEventListener('click', resetAll);
  els.emptyReset.addEventListener('click', resetAll);
  els.retry.addEventListener('click', load);

  document.addEventListener('click', event => {
    const category = event.target.closest('.category-item');
    if (category) {
      state.category = category.dataset.category;
      state.shown = PAGE_SIZE;
      render();
      if (innerWidth < 800) document.querySelector('.content').scrollIntoView({ behavior: 'smooth', block: 'start' });
      return;
    }

    const favorite = event.target.closest('[data-fav]');
    if (favorite) {
      event.preventDefault();
      event.stopPropagation();
      const url = favorite.dataset.fav;
      favorites.has(url) ? favorites.delete(url) : favorites.add(url);
      localStorage.setItem('dv-openintel-favorites', JSON.stringify([...favorites]));
      updateFavCounts();
      render();
      return;
    }

    const hint = event.target.closest('[data-query]');
    if (hint) {
      state.query = hint.dataset.query;
      els.input.value = state.query;
      state.category = '__all__';
      state.shown = PAGE_SIZE;
      render();
      els.input.focus();
    }
  });

  document.addEventListener('keydown', event => {
    if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 'k') {
      event.preventDefault();
      els.input.focus();
      els.input.select();
    }
    if (event.key === 'Escape' && document.activeElement === els.input) {
      els.input.value = '';
      state.query = '';
      render();
    }
  });

  els.random.addEventListener('click', () => {
    const pool = filtered();
    if (!pool.length) return;
    const tool = pool[Math.floor(Math.random() * pool.length)];
    window.open(tool.url, '_blank', 'noopener,noreferrer');
  });

  const savedTheme = localStorage.getItem('dv-openintel-theme');
  if (savedTheme) document.documentElement.dataset.theme = savedTheme;
  els.theme.addEventListener('click', () => {
    const next = document.documentElement.dataset.theme === 'light' ? 'dark' : 'light';
    document.documentElement.dataset.theme = next;
    localStorage.setItem('dv-openintel-theme', next);
  });

  updateFavCounts();
  load();
})();
