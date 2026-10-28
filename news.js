(() => {
  const CACHE_KEY = "auto83-rsa-news-v3";
  const CACHE_DURATION = 30 * 60 * 1000;
  const MAX_CACHE_AGE = 24 * 60 * 60 * 1000;
  const MAX_ARTICLES = 9;
  const PROXY = "https://proxy.cors.dev/";

  const FEEDS = [
    {
      name: "SABC News",
      url: "https://feeds.bbci.co.uk/news/world/rss.xml"
    },
    {
      name: "Eyewitness News",
      url: "https://ewn.co.za/RSS%20Feeds/Latest%20News"
    },
    {
      name: "TechCentral",
      url: "https://techcentral.co.za/feed"
    },
    {
      name: "The Citizen",
      url: "https://citizen.co.za/feed/"
    },
    {
      name: "Daily Maverick",
      url: "https://www.dailymaverick.co.za/dmrss/"
    },
    {
      name: "Moneyweb",
      url: "https://www.moneyweb.co.za/feed/"
    }
  ];

  const statusElement = document.getElementById("news-status");
  const listElement = document.getElementById("news-list");
  const refreshButton = document.getElementById("refresh-news");

  if (!statusElement || !listElement || !refreshButton) return;

  const formatDate = (value) => {
    const date = new Date(value);
    return Number.isNaN(date.getTime())
      ? ""
      : new Intl.DateTimeFormat("en-ZA", {
          dateStyle: "medium"
        }).format(date);
  };

  const readCache = () => {
    try {
      const cached = JSON.parse(
        localStorage.getItem(CACHE_KEY) || "null"
      );

      if (
        !cached ||
        !Array.isArray(cached.articles) ||
        !Number.isFinite(cached.savedAt)
      ) {
        return null;
      }

      return cached;
    } catch {
      return null;
    }
  };

  const writeCache = (articles) => {
    try {
      localStorage.setItem(
        CACHE_KEY,
        JSON.stringify({
          articles,
          savedAt: Date.now()
        })
      );
    } catch (error) {
      console.warn("Unable to cache news:", error);
    }
  };

  const displayArticles = (articles) => {
    listElement.replaceChildren();

    articles.slice(0, MAX_ARTICLES).forEach((article) => {
      const card = document.createElement("article");
      card.className = "news-card";

      const link = document.createElement("a");
      link.href = article.url;
      link.target = "_blank";
      link.rel = "noopener noreferrer";
      link.textContent = article.title;

      const meta = document.createElement("p");
      meta.className = "news-meta";
      meta.textContent = [
        article.domain,
        formatDate(article.seendate)
      ].filter(Boolean).join(" · ");

      card.append(link, meta);
      listElement.append(card);
    });

    listElement.setAttribute("aria-busy", "false");
  };

  const readFeed = async (feed) => {
    const response = await fetch(
      PROXY + feed.url,
      { credentials: "omit" }
    );

    if (!response.ok) {
      throw new Error(`${feed.name}: HTTP ${response.status}`);
    }

    const xml = new DOMParser().parseFromString(
      await response.text(),
      "application/xml"
    );

    if (xml.querySelector("parsererror")) {
      throw new Error(`${feed.name}: Invalid RSS feed`);
    }

    return [...xml.querySelectorAll("item")]
      .map((item) => {
        const title =
          item.querySelector("title")?.textContent?.trim() || "";

        const rawUrl =
          item.querySelector("link")?.textContent?.trim() || "";

        const published =
          item.querySelector("pubDate")?.textContent?.trim() || "";

        try {
          const url = new URL(rawUrl);

          if (!["https:", "http:"].includes(url.protocol)) {
            return null;
          }

          if (!title || !rawUrl) return null;

          return {
            title,
            url: url.href,
            domain: feed.name,
            seendate: published
          };
        } catch {
          return null;
        }
      })
      .filter(Boolean);
  };

  const loadHeadlines = async ({ force = false } = {}) => {
    const cached = readCache();
    const cacheAge = cached
      ? Date.now() - cached.savedAt
      : Infinity;

    if (!force && cached && cacheAge < CACHE_DURATION) {
      displayArticles(cached.articles);
      statusElement.textContent =
        `Headlines cached ${formatDate(cached.savedAt)}.`;
      return;
    }

    if (cached && cacheAge <= MAX_CACHE_AGE) {
      displayArticles(cached.articles);
      statusElement.textContent =
        "Checking for updated headlines...";
    } else {
      listElement.setAttribute("aria-busy", "true");
      statusElement.textContent = "Loading South African news...";
    }

    refreshButton.disabled = true;

    try {
      const results = await Promise.allSettled(
        FEEDS.map(readFeed)
      );

      const articles = results
        .flatMap((result) =>
          result.status === "fulfilled" ? result.value : []
        )
        .sort((a, b) => {
          const dateA = Date.parse(a.seendate) || 0;
          const dateB = Date.parse(b.seendate) || 0;
          return dateB - dateA;
        });

      const unique = [];
      const seen = new Set();

      for (const article of articles) {
        const key = article.url;

        if (seen.has(key)) continue;

        seen.add(key);
        unique.push(article);

        if (unique.length === MAX_ARTICLES) break;
      }

      if (!unique.length) {
        throw new Error("No news feeds could be loaded.");
      }

      displayArticles(unique);
      writeCache(unique);

      statusElement.textContent =
        `Updated ${new Intl.DateTimeFormat("en-ZA", {
          dateStyle: "medium",
          timeStyle: "short"
        }).format(new Date())}.`;

      if (results.every((result) => result.status === "rejected")) {
        throw new Error("News feeds unavailable.");
      }
    } catch (error) {
      console.warn("Unable to refresh news:", error);

      if (cached && cacheAge <= MAX_CACHE_AGE) {
        displayArticles(cached.articles);
        statusElement.textContent =
          "News is temporarily unavailable. Showing saved headlines.";
      } else if (!listElement.children.length) {
        statusElement.textContent =
          "Headlines are temporarily unavailable. Please try again later.";
      }
    } finally {
      refreshButton.disabled = false;
    }
  };

  refreshButton.addEventListener("click", () => {
    loadHeadlines({ force: true });
  });

  loadHeadlines();
})();