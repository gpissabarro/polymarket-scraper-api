export default async function handler(req, res) {
  const { name } = req.query;

  // Ejemplo de uso:
  //   /api/trader?name=mikatrade77
  if (!name) {
    return res
      .status(400)
      .json({ error: "Missing trader name. Use ?name=mikatrade77" });
  }

  const token = process.env.BROWSERLESS_TOKEN;
  if (!token) {
    return res
      .status(500)
      .json({ error: "Missing Browserless token in environment vars" });
  }

  const traderUrl = `https://polymarketanalytics.com/creators/${encodeURIComponent(
    name
  )}`;

  try {
    // Llamamos al endpoint oficial /chromium/scrape
    const response = await fetch(
      `https://chrome.browserless.io/chromium/scrape?token=${token}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          url: traderUrl,
          bestAttempt: true,
          // le decimos a Browserless que espere al script con __NEXT_DATA__
          waitForSelector: {
            selector: "script#__NEXT_DATA__",
            timeout: 20000
          },
          // y que nos devuelva precisamente ese elemento
          elements: [
            {
              selector: "script#__NEXT_DATA__",
              timeout: 20000
            }
          ]
        })
      }
    );

    if (!response.ok) {
      const text = await response.text();
      return res.status(500).json({
        error: "Browserless request failed",
        status: response.status,
        body: text.slice(0, 1000)
      });
    }

    const scraped = await response.json();

    // scraped.data[0].results[0] debería contener el script con el JSON
    const firstElement = scraped?.data?.[0];
    const firstResult = firstElement?.results?.[0];

    const scriptText = firstResult?.text || firstResult?.html || null;

    if (!scriptText) {
      return res.status(500).json({
        error: "Unable to find __NEXT_DATA__ script tag",
        debug: scraped?.data
      });
    }

    let nextData;
    try {
      nextData = JSON.parse(scriptText);
    } catch (e) {
      return res.status(500).json({
        error: "Failed to parse __NEXT_DATA__ JSON",
        message: e.message,
        snippet: scriptText.slice(0, 500)
      });
    }

    const pageProps = nextData?.props?.pageProps;
    if (!pageProps) {
      return res.status(500).json({
        error: "Trader data not found in __NEXT_DATA__",
        keys: Object.keys(nextData || {})
      });
    }

    const creator = pageProps.creator || {};

    // Resumen útil + el blob crudo por si luego quieres más campos
    return res.status(200).json({
      name: creator.name ?? null,
      rank: creator.rank ?? null,
      pnl: creator.overallPnl ?? null,
      winRate: creator.winRate ?? null,
      positions: pageProps.positions ?? [],
      pnlHistory: pageProps.pnlHistory ?? [],
      categories: pageProps.categories ?? [],
      trades: pageProps.trades ?? [],
      raw: pageProps
    });
  } catch (err) {
    return res.status(
