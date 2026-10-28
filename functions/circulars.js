const DPSA_CIRCULARS_URL = "https://www.dpsa.gov.za/newsroom/psvc/";

const parseLatestCirculars = (html) => {
  const circulars = [];
  const seen = new Set();
  const linkPattern =
    /<a\b[^>]*\bhref=(["'])(\/newsroom\/psvc\/circular-\d+-of-\d{4}\/?)\1[^>]*>([\s\S]*?)<\/a>/gi;

  for (const match of html.matchAll(linkPattern)) {
    const title = match[3]
      .replace(/<[^>]*>/g, " ")
      .replace(/\s+/g, " ")
      .trim();

    if (!/^Circular\s+\d+\s+of\s+\d{4}$/i.test(title)) {
      continue;
    }

    const url = new URL(match[2], DPSA_CIRCULARS_URL).href;
    if (seen.has(url)) continue;

    seen.add(url);
    circulars.push({ title, url });

    if (circulars.length === 3) break;
  }

  return circulars;
};

module.exports = { DPSA_CIRCULARS_URL, parseLatestCirculars };
