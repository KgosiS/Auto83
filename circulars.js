(() => {
  const CACHE_KEY = "auto83-latest-circulars-v1";
  const CACHE_DURATION = 30 * 60 * 1000;
  const MAX_CACHE_AGE = 24 * 60 * 60 * 1000;
  const CIRCULARS_URL =
    "https://us-central1-auto83-f2836.cloudfunctions.net/getLatestCirculars";
  const statusElement = document.getElementById("circular-status");
  const listElement = document.getElementById("circular-list");
  const refreshButton = document.getElementById("refresh-circulars");

  if (!statusElement || !listElement || !refreshButton) return;

  const isValidCircular = (circular) => {
    if (
      typeof circular?.title !== "string" ||
      !/^Circular\s+\d+\s+of\s+\d{4}$/i.test(circular.title) ||
      typeof circular?.url !== "string"
    ) {
      return false;
    }

    try {
      const url = new URL(circular.url);
      return url.protocol === "https:" &&
        url.origin === "https://www.dpsa.gov.za" &&
        /^\/newsroom\/psvc\/circular-\d+-of-\d{4}\/?$/.test(url.pathname);
    } catch {
      return false;
    }
  };

  const readCache = () => {
    try {
      const cached = JSON.parse(
        localStorage.getItem(CACHE_KEY) || "null"
      );

      if (
        !cached ||
        !Array.isArray(cached.circulars) ||
        cached.circulars.length !== 3 ||
        cached.circulars.some((circular) => !isValidCircular(circular)) ||
        !Number.isFinite(cached.savedAt)
      ) {
        return null;
      }

      return cached;
    } catch (error) {
      console.warn("Unable to read saved circulars:", error);
      return null;
    }
  };

  const writeCache = (circulars) => {
    try {
      localStorage.setItem(
        CACHE_KEY,
        JSON.stringify({
          circulars,
          savedAt: Date.now()
        })
      );
    } catch (error) {
      console.warn("Unable to cache circulars:", error);
    }
  };

  const displayCirculars = (circulars) => {
    listElement.replaceChildren();

    circulars.slice(0, 3).forEach((circular) => {
      const card = document.createElement("article");
      card.className = "circular-card";

      const source = document.createElement("p");
      source.className = "circular-source";
      source.textContent = "Official DPSA circular";

      const link = document.createElement("a");
      link.href = circular.url;
      link.target = "_blank";
      link.rel = "noopener noreferrer";
      link.textContent = circular.title;

      card.append(source, link);
      listElement.append(card);
    });

    listElement.setAttribute("aria-busy", "false");
  };

  const loadCirculars = async ({ force = false } = {}) => {
    const cached = readCache();
    const cacheAge = cached
      ? Date.now() - cached.savedAt
      : Infinity;

    if (!force && cached && cacheAge < CACHE_DURATION) {
      displayCirculars(cached.circulars);
      statusElement.textContent =
        "Showing recently checked circulars.";
      return;
    }

    if (cached && cacheAge <= MAX_CACHE_AGE) {
      displayCirculars(cached.circulars);
      statusElement.textContent = "Checking for newer circulars…";
    } else {
      listElement.setAttribute("aria-busy", "true");
      statusElement.textContent = "Loading the latest circulars…";
    }

    refreshButton.disabled = true;

    try {
      const response = await fetch(CIRCULARS_URL, {
        credentials: "omit"
      });

      if (!response.ok) {
        throw new Error(`DPSA circular service returned HTTP ${response.status}.`);
      }

      const payload = await response.json();
      const circulars = payload?.circulars;

      if (
        !Array.isArray(circulars) ||
        circulars.length !== 3 ||
        circulars.some((circular) => !isValidCircular(circular))
      ) {
        throw new Error("DPSA circular service returned an invalid response.");
      }

      displayCirculars(circulars);
      if (payload.cached) {
        statusElement.textContent =
          "DPSA could not be refreshed. Showing its last available circulars.";
      } else {
        writeCache(circulars);
        statusElement.textContent =
          `Updated ${new Intl.DateTimeFormat("en-ZA", {
            dateStyle: "medium",
            timeStyle: "short"
          }).format(new Date())}.`;
      }
    } catch (error) {
      console.warn("Unable to load DPSA circulars:", error);

      if (cached && cacheAge <= MAX_CACHE_AGE) {
        displayCirculars(cached.circulars);
        statusElement.textContent =
          "Circulars are temporarily unavailable. Showing saved circulars.";
      } else {
        listElement.replaceChildren();
        listElement.setAttribute("aria-busy", "false");
        statusElement.textContent =
          "Circulars are temporarily unavailable. Visit the official DPSA vacancy circular page to view them.";
      }
    } finally {
      refreshButton.disabled = false;
    }
  };

  refreshButton.addEventListener("click", () => {
    loadCirculars({ force: true });
  });

  loadCirculars();
})();
