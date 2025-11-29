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

    // Browserless request
    const response = await fetch(`https://chrome.browserless.io/scrape?token=${token}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        url,
        javascript: true,
        waitForSelector: "script#__NEXT_DATA__",
        timeout: 20000
      })
    });
    const html = await response.text();

    // Extract the __NEXT_DATA__ JSON
    const jsonMatch = html.match(
      /<script id="__NEXT_DATA__" type="application\/json">(.*?)<\/script>/
    );

    if (!jsonMatch) {
      return res.status(500).json({ error: "Unable to find trader data" });
    }

    const nextData = JSON.parse(jsonMatch[1]);

    // Real data is in nextData.props.pageProps
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
      raw: trader // full data if needed
    });

  } catch (err) {
    return res.status(500).json({
      error: "Scraping failed",
      details: err.message
    });
  }
}
