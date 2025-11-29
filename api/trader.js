export default async function handler(req, res) {
  const { name } = req.query;

  if (!name) {
    return res.status(400).json({ error: "Missing trader name (?name=)" });
  }

  const token = process.env.BROWSERLESS_TOKEN;
  if (!token) {
    return res.status(500).json({ error: "Missing Browserless token" });
  }

  try {
    const url = `https://polymarketanalytics.com/creators/${name}`;

    const response = await fetch(
      `https://chrome.browserless.io/scrape?token=${token}`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          url,
          html: true
        })
      }
    );

    const result = await response.json();

    if (!result || !result.html) {
      return res.status(500).json({
        error: "Browserless did not return HTML",
        raw: result
      });
    }

    const html = result.html;

    // Extract NEXT_DATA JSON
    const match = html.match(
      /<script id="__NEXT_DATA__" type="application\/json">(.*?)<\/script>/
    );

    if (!match) {
      return res.status(500).json({ 
        error: "Unable to find __NEXT_DATA__ JSON in HTML"
      });
    }

    const nextData = JSON.parse(match[1]);
    const trader = nextData?.props?.pageProps;

    if (!trader) {
      return res.status(500).json({ error: "Trader data not found" });
    }

    return res.status(200).json({
      name: trader?.creator?.name ?? null,
      rank: trader?.creator?.rank ?? null,
      pnl: trader?.creator?.overallPnl ?? null,
      winRate: trader?.creator?.winRate ?? null,
      positions: trader?.positions ?? [],
      pnlHistory: trader?.pnlHistory ?? [],
      categories: trader?.categories ?? [],
      trades: trader?.trades ?? [],
    });

  } catch (err) {
    return res.status(500).json({
      error: "Scraping_failed",
      details: err.message
    });
  }
}
