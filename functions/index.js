const { onRequest } = require("firebase-functions/v2/https");
const { defineSecret } = require("firebase-functions/params");

const freeNewsApiKey = defineSecret("FREENEWSAPI_KEY");
const API_BASE_URL = "https://api.freenewsapi.io/v1";
const MAX_ARTICLES = 9;
const CACHE_DURATION = 30 * 60 * 1000;
const REQUEST_INTERVAL = 500;

let cachedArticles = null;
let cacheExpiresAt = 0;
let lastApiRequestAt = 0;
let inFlightRefresh = null;

const waitForApiLimit = async () => {
  const wait = Math.max(0, REQUEST_INTERVAL - (Date.now() - lastApiRequestAt));
  if (wait) await new Promise((resolve) => setTimeout(resolve, wait));
  lastApiRequestAt = Date.now();
};

const requestApi = async (url) => {
  await waitForApiLimit();
  const response = await fetch(url, {
    headers: { "x-api-key": freeNewsApiKey.value() },
    signal: AbortSignal.timeout(10000)
  });
  if (!response.ok) {
    throw new Error(`FreeNewsApi returned HTTP ${response.status}.`);
  }
  const payload = await response.json();
  if (payload?.error) throw new Error("FreeNewsApi returned an error.");
  return payload;
};

const getArticles = async () => {
  const newsUrl = new URL(`${API_BASE_URL}/news`);
  newsUrl.search = new URLSearchParams({
    country: "za",
    language: "en",
    order_by: "archive"
  });
  const payload = await requestApi(newsUrl);
  if (!Array.isArray(payload?.data)) {
    throw new Error("FreeNewsApi returned an unexpected news response.");
  }

  const articles = [];
  for (const article of payload.data.slice(0, MAX_ARTICLES)) {
    if (typeof article?.uuid !== "string" || typeof article.title !== "string") continue;

    const detailsUrl = new URL(`${API_BASE_URL}/details`);
    detailsUrl.searchParams.set("uuid", article.uuid);
    const detailsPayload = await requestApi(detailsUrl);
    const details = detailsPayload?.data;
    const articleUrl = details?.url || details?.original_url;
    if (typeof articleUrl !== "string") continue;

    let url;
    try {
      url = new URL(articleUrl);
    } catch (error) {
      continue;
    }
    if (!["http:", "https:"].includes(url.protocol)) continue;

    articles.push({
      title: article.title.trim(),
      url: url.href,
      domain: typeof article.publisher === "string" && article.publisher.trim()
        ? article.publisher.trim()
        : url.hostname,
      seendate: article.published_at || details.published_at || ""
    });
  }

  if (!articles.length) throw new Error("FreeNewsApi returned no usable South African headlines.");
  return articles;
};

exports.getRsaNews = onRequest(
  {
    region: "us-central1",
    cors: ["https://kgosis.github.io"],
    secrets: [freeNewsApiKey],
    timeoutSeconds: 60
  },
  async (request, response) => {
    if (request.method !== "GET") {
      response.set("Allow", "GET").status(405).send("Method not allowed.");
      return;
    }

    if (cachedArticles && Date.now() < cacheExpiresAt) {
      response.json({ articles: cachedArticles });
      return;
    }

    try {
      if (!inFlightRefresh) inFlightRefresh = getArticles();
      const articles = await inFlightRefresh;
      cachedArticles = articles;
      cacheExpiresAt = Date.now() + CACHE_DURATION;
      response.json({ articles });
    } catch (error) {
      console.error("Unable to load South Africa headlines:", error);
      response.status(502).json({ error: "Headlines are temporarily unavailable." });
    } finally {
      inFlightRefresh = null;
    }
  }
);
