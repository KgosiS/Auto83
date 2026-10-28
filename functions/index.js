const { onRequest } = require("firebase-functions/v2/https");
const { defineSecret } = require("firebase-functions/params");
const {
  DPSA_CIRCULARS_URL,
  parseLatestCirculars
} = require("./circulars");

const freeNewsApiKey = defineSecret("FREENEWSAPI_KEY");

const API_BASE_URL = "https://api.freenewsapi.io/v1";
const MAX_ARTICLES = 9;
const CACHE_DURATION = 30 * 60 * 1000;
const REQUEST_INTERVAL = 500;

let cachedArticles = null;
let cacheExpiresAt = 0;
let lastApiRequestAt = 0;
let inFlightRefresh = null;
let cachedCirculars = null;
let circularsCacheExpiresAt = 0;
let inFlightCircularsRefresh = null;

const waitForApiLimit = async () => {
  const wait = Math.max(
    0,
    REQUEST_INTERVAL - (Date.now() - lastApiRequestAt)
  );

  if (wait) {
    await new Promise((resolve) => setTimeout(resolve, wait));
  }

  lastApiRequestAt = Date.now();
};

const requestApi = async (url) => {
  await waitForApiLimit();

  const response = await fetch(url, {
    method: "GET",
    headers: {
      "x-api-key": freeNewsApiKey.value(),
      "Accept": "application/json"
    },
    signal: AbortSignal.timeout(10000)
  });

  if (!response.ok) {
    const errorText = await response.text().catch(() => "");
    console.error(
      `FreeNewsApi HTTP ${response.status}:`,
      errorText
    );

    throw new Error(
      `FreeNewsApi returned HTTP ${response.status}.`
    );
  }

  const payload = await response.json();

  if (payload?.error) {
    throw new Error("FreeNewsApi returned an API error.");
  }

  return payload;
};

const getArticles = async () => {
  // Get the newest South African English-language articles.
  const newsUrl = new URL(`${API_BASE_URL}/news`);

  newsUrl.search = new URLSearchParams({
    country: "za",
    language: "en",
    order_by: "recent",
    offset: "0"
  });

  const payload = await requestApi(newsUrl);

  if (!Array.isArray(payload?.data)) {
    throw new Error(
      "FreeNewsApi returned an unexpected news response."
    );
  }

  const articles = [];

  // Get the first 9 usable articles.
  for (const article of payload.data) {
    if (
      typeof article?.uuid !== "string" ||
      typeof article?.title !== "string"
    ) {
      continue;
    }

    if (articles.length >= MAX_ARTICLES) {
      break;
    }

    try {
      const detailsUrl = new URL(
        `${API_BASE_URL}/details`
      );

      detailsUrl.searchParams.set(
        "uuid",
        article.uuid
      );

      const detailsPayload = await requestApi(detailsUrl);

      const details = detailsPayload?.data;

      const articleUrl =
        details?.original_url ||
        details?.url;

      if (typeof articleUrl !== "string") {
        continue;
      }

      let url;

      try {
        url = new URL(articleUrl);
      } catch {
        continue;
      }

      if (!["http:", "https:"].includes(url.protocol)) {
        continue;
      }

      articles.push({
        title: article.title.trim(),

        url: url.href,

        domain:
          typeof article.publisher === "string" &&
          article.publisher.trim()
            ? article.publisher.trim()
            : url.hostname,

        seendate:
          article.published_at ||
          details?.published_at ||
          ""
      });
    } catch (error) {
      console.warn(
        `Unable to load article ${article.uuid}:`,
        error.message
      );
    }
  }

  if (!articles.length) {
    throw new Error(
      "FreeNewsApi returned no usable South African headlines."
    );
  }

  return articles;
};

exports.getRsaNews = onRequest(
  {
    region: "us-central1",

    cors: [
      "https://kgosis.github.io"
    ],

    secrets: [freeNewsApiKey],

    timeoutSeconds: 60
  },

  async (request, response) => {
    // Only allow GET requests.
    if (request.method !== "GET") {
      response
        .set("Allow", "GET")
        .status(405)
        .send("Method not allowed.");

      return;
    }

    // Return server-side cached news when available.
    if (
      cachedArticles &&
      Date.now() < cacheExpiresAt
    ) {
      response.json({
        articles: cachedArticles
      });

      return;
    }

    try {
      // Prevent multiple simultaneous API refreshes.
      if (!inFlightRefresh) {
        inFlightRefresh = getArticles();
      }

      const articles = await inFlightRefresh;

      cachedArticles = articles;

      cacheExpiresAt =
        Date.now() + CACHE_DURATION;

      response.json({
        articles
      });

    } catch (error) {
      console.error(
        "Unable to load South Africa headlines:",
        error
      );

      // If we have old cached articles, return them
      // instead of completely failing.
      if (cachedArticles?.length) {
        response.status(200).json({
          articles: cachedArticles,
          cached: true
        });

        return;
      }

      response.status(502).json({
        error:
          "Headlines are temporarily unavailable."
      });

    } finally {
      inFlightRefresh = null;
    }
  }
);

const fetchLatestCirculars = async () => {
  const response = await fetch(DPSA_CIRCULARS_URL, {
    headers: {
      "User-Agent": "Auto83 circular listing (https://kgosis.github.io)",
      "Accept": "text/html"
    },
    signal: AbortSignal.timeout(10000)
  });

  if (!response.ok) {
    throw new Error(`DPSA returned HTTP ${response.status}.`);
  }

  const circulars = parseLatestCirculars(await response.text());

  if (circulars.length !== 3) {
    throw new Error(
      `DPSA returned ${circulars.length} usable circular links; expected 3.`
    );
  }

  return circulars;
};

exports.getLatestCirculars = onRequest(
  {
    region: "us-central1",
    cors: ["https://kgosis.github.io"],
    timeoutSeconds: 15
  },
  async (request, response) => {
    if (request.method !== "GET") {
      response
        .set("Allow", "GET")
        .status(405)
        .send("Method not allowed.");
      return;
    }

    if (cachedCirculars && Date.now() < circularsCacheExpiresAt) {
      response.json({ circulars: cachedCirculars });
      return;
    }

    try {
      if (!inFlightCircularsRefresh) {
        inFlightCircularsRefresh = fetchLatestCirculars();
      }

      const circulars = await inFlightCircularsRefresh;
      cachedCirculars = circulars;
      circularsCacheExpiresAt = Date.now() + 60 * 60 * 1000;
      response.json({ circulars });
    } catch (error) {
      console.error("Unable to load DPSA vacancy circulars:", error);

      if (cachedCirculars?.length) {
        response.status(200).json({
          circulars: cachedCirculars,
          cached: true
        });
        return;
      }

      response.status(502).json({
        error: "DPSA vacancy circulars are temporarily unavailable."
      });
    } finally {
      inFlightCircularsRefresh = null;
    }
  }
);