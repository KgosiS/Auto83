(() => {
  const API_URL = 'https://us-central1-auto83-f2836.cloudfunctions.net/getRsaNews';
  const CACHE_KEY = 'auto83-rsa-news-v2';
  const CACHE_DURATION = 30 * 60 * 1000;
  const MAX_ARTICLES = 9;
  const MAX_CACHE_AGE = 24 * 60 * 60 * 1000;

  const statusElement = document.getElementById('news-status');
  const listElement = document.getElementById('news-list');
  const refreshButton = document.getElementById('refresh-news');
  if (!statusElement || !listElement || !refreshButton) return;

  const readCache = () => {
    try {
      const cached = JSON.parse(localStorage.getItem(CACHE_KEY) || 'null');
      if (!cached || !Array.isArray(cached.articles) || !Number.isFinite(cached.savedAt)) return null;
      return { articles: normalizeArticles(cached), savedAt: cached.savedAt };
    } catch (error) {
      console.warn('Unable to read cached RSA news headlines:', error);
      return null;
    }
  };

  const writeCache = (articles) => {
    try {
      localStorage.setItem(CACHE_KEY, JSON.stringify({ articles, savedAt: Date.now() }));
    } catch (error) {
      console.warn('Unable to cache RSA news headlines:', error);
    }
  };

  const formatDate = (value) => {
    const date = new Date(value);
    return Number.isNaN(date.getTime())
      ? ''
      : new Intl.DateTimeFormat('en-ZA', { dateStyle: 'medium' }).format(date);
  };

  const displayArticles = (articles) => {
    listElement.replaceChildren();

    articles.forEach((article) => {
      const card = document.createElement('article');
      card.className = 'news-card';

      const link = document.createElement('a');
      link.href = article.url;
      link.target = '_blank';
      link.rel = 'noopener noreferrer';
      link.textContent = article.title;
      card.append(link);

      const meta = document.createElement('p');
      meta.className = 'news-meta';
      const details = [article.domain, formatDate(article.seendate)].filter(Boolean);
      meta.textContent = details.join(' · ');
      card.append(meta);
      listElement.append(card);
    });

    listElement.setAttribute('aria-busy', 'false');
  };

  const normalizeArticles = (payload) => {
    const articles = Array.isArray(payload.articles) ? payload.articles : [];
    return articles
      .filter((article) => typeof article.title === 'string' && article.title.trim() && typeof article.url === 'string')
      .map((article) => {
        let url;
        try {
          url = new URL(article.url);
        } catch (error) {
          return null;
        }
        if (!['https:', 'http:'].includes(url.protocol)) return null;
        return {
          title: article.title.trim(),
          url: url.href,
          domain: typeof article.domain === 'string' ? article.domain : url.hostname,
          seendate: article.seendate || ''
        };
      })
      .filter(Boolean)
      .slice(0, MAX_ARTICLES);
  };

  const loadHeadlines = async ({ force = false } = {}) => {
    const cached = readCache();
    const cacheAge = cached ? Date.now() - cached.savedAt : Infinity;

    if (!force && cached && cacheAge <= CACHE_DURATION) {
      displayArticles(cached.articles);
      statusElement.textContent = `Headlines cached ${formatDate(cached.savedAt)}. Refresh available every 30 minutes.`;
      return;
    }

    if (cached && cacheAge <= MAX_CACHE_AGE) {
      displayArticles(cached.articles);
      statusElement.textContent = 'Showing cached headlines while checking for updates…';
    } else {
      listElement.setAttribute('aria-busy', 'true');
      statusElement.textContent = 'Loading recent headlines…';
    }

    refreshButton.disabled = true;
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 12000);

    try {
      const response = await fetch(API_URL, { signal: controller.signal });
      if (!response.ok) throw new Error(`News service returned HTTP ${response.status}.`);

      const payload = await response.json();
      if (payload?.error) throw new Error(payload.error);
      const articles = normalizeArticles(payload);
      if (!articles.length) throw new Error('No recent headlines were returned.');

      displayArticles(articles);
      writeCache(articles);
      statusElement.textContent = `Updated ${new Intl.DateTimeFormat('en-ZA', { dateStyle: 'medium', timeStyle: 'short' }).format(new Date())}.`;
    } catch (error) {
      console.warn('Unable to load RSA news headlines:', error);
      if (cached && cacheAge <= MAX_CACHE_AGE) {
        displayArticles(cached.articles);
        statusElement.textContent = 'The news feed is temporarily unavailable. Showing cached headlines.';
      } else {
        listElement.replaceChildren();
        listElement.setAttribute('aria-busy', 'false');
        statusElement.textContent = 'Headlines are temporarily unavailable. Please try again later.';
      }
    } finally {
      clearTimeout(timeout);
      refreshButton.disabled = false;
    }
  };

  refreshButton.addEventListener('click', () => loadHeadlines({ force: true }));
  loadHeadlines();
})();
