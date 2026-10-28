(() => {
  const SOURCE_URL = "https://www.dpsa.gov.za/newsroom/psvc/";
  const PROXY = "https://proxy.cors.dev/";
  const CACHE_KEY = "auto83-dpsa-circulars-v1";
  const CACHE_DURATION = 30 * 60 * 1000;

  const status = document.getElementById("circular-status");
  const list = document.getElementById("circular-list");
  const refresh = document.getElementById("refresh-circulars");

  if (!status || !list || !refresh) return;

  const escapeText = (value) =>
    String(value || "").replace(/\s+/g, " ").trim();

  const formatDate = (value) => {
    if (!value) return "";

    const date = new Date(value);

    return Number.isNaN(date.getTime())
      ? value
      : new Intl.DateTimeFormat("en-ZA", {
          day: "numeric",
          month: "short",
          year: "numeric"
        }).format(date);
  };

  const readCache = () => {
    try {
      const data = JSON.parse(
        localStorage.getItem(CACHE_KEY) || "null"
      );

      if (
        data &&
        Array.isArray(data.items) &&
        Date.now() - data.savedAt < CACHE_DURATION
      ) {
        return data.items;
      }
    } catch (error) {
      console.warn("Could not read circular cache:", error);
    }

    return null;
  };

  const showCirculars = (items) => {
    list.replaceChildren();

    items.slice(0, 3).forEach((item) => {
      const card = document.createElement("article");
      card.className = "circular-card";

      const details = document.createElement("div");

      const source = document.createElement("p");
      source.className = "circular-source";
      source.textContent = "OFFICIAL DPSA CIRCULAR";

      const title = document.createElement("h3");
      title.style.marginTop = "10px";

      const link = document.createElement("a");
      link.href = item.url;
      link.target = "_blank";
      link.rel = "noopener noreferrer";
      link.textContent = item.title;

      title.append(link);
      details.append(source, title);

      const footer = document.createElement("div");

      const date = document.createElement("p");
      date.className = "circular-source";
      date.textContent = item.date
        ? `Published: ${formatDate(item.date)}`
        : "Publication date on DPSA website";

      const open = document.createElement("a");
      open.href = item.url;
      open.target = "_blank";
      open.rel = "noopener noreferrer";
      open.textContent = "View circular ↗";

      footer.append(date, open);
      card.append(details, footer);
      list.append(card);
    });

    list.setAttribute("aria-busy", "false");
  };

  const fetchPage = async (url) => {
    const response = await fetch(PROXY + url, {
      credentials: "omit",
      headers: { Accept: "text/html" }
    });

    if (!response.ok) {
      throw new Error(`Request failed: HTTP ${response.status}`);
    }

    return response.text();
  };

  const getCircularNumber = (url) => {
    const match = url.match(
      /circular-?(\d+)-of-(\d{4})/i
    );

    return match
      ? { number: Number(match[1]), year: Number(match[2]) }
      : null;
  };

  const loadCirculars = async (force = false) => {
    if (!force) {
      const cached = readCache();

      if (cached) {
        showCirculars(cached);
        status.textContent =
          "Showing recently checked circulars. Refresh to check DPSA again.";
        return;
      }
    }

    refresh.disabled = true;
    status.textContent = "Checking the official DPSA website...";
    list.setAttribute("aria-busy", "true");

    try {
      const html = await fetchPage(SOURCE_URL);
      const documentPage = new DOMParser().parseFromString(
        html,
        "text/html"
      );

      const found = new Map();

      documentPage.querySelectorAll("a[href]").forEach((anchor) => {
        const url = new URL(anchor.getAttribute("href"), SOURCE_URL);
        const info = getCircularNumber(url.href);

        if (
          !info ||
          url.hostname !== "www.dpsa.gov.za" ||
          !url.pathname.includes("/newsroom/psvc/")
        ) {
          return;
        }

        const key = `${info.year}-${info.number}`;

        if (!found.has(key)) {
          found.set(key, {
            ...info,
            url: url.href,
            title: `Public Service Vacancy Circular ${info.number} of ${info.year}`,
            date: ""
          });
        }
      });

      const candidates = [...found.values()]
        .sort((a, b) => b.year - a.year || b.number - a.number)
        .slice(0, 3);

      if (!candidates.length) {
        throw new Error("No circular links were found on DPSA.");
      }

      // Retrieve the posting date from each official circular page.
      const checked = await Promise.allSettled(
        candidates.map(async (item) => {
          const detailHtml = await fetchPage(item.url);
          const detail = new DOMParser().parseFromString(
            detailHtml,
            "text/html"
          );

          const text = escapeText(detail.body?.innerText || "");
          const match = text.match(
            /Posting Date:\s*([0-9]{1,2}\s+[A-Za-z]+\s+[0-9]{4})/i
          );

          item.date = match ? match[1] : "";
          return item;
        })
      );

      const items = checked
        .filter((result) => result.status === "fulfilled")
        .map((result) => result.value);

      if (!items.length) {
        throw new Error("Could not read the circular detail pages.");
      }

      showCirculars(items);

      try {
        localStorage.setItem(
          CACHE_KEY,
          JSON.stringify({
            items,
            savedAt: Date.now()
          })
        );
      } catch (error) {
        console.warn("Could not save circular cache:", error);
      }

      status.textContent =
        `Showing the latest ${items.length} circulars found on DPSA.`;
    } catch (error) {
      console.error("DPSA circular update failed:", error);

      status.textContent =
        "Unable to fetch the latest circulars right now. Open the official DPSA circular page to check for updates.";

      if (!list.children.length) {
        const link = document.createElement("a");
        link.href = SOURCE_URL;
        link.target = "_blank";
        link.rel = "noopener noreferrer";
        link.textContent = "Open official DPSA circulars";
        list.append(link);
      }

      list.setAttribute("aria-busy", "false");
    } finally {
      refresh.disabled = false;
    }
  };

  refresh.addEventListener("click", () => loadCirculars(true));
  loadCirculars();
})();