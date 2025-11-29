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

    const payload = {
      url,
      javascript: true,
      waitForSelector: "script#__NEXT_DATA__",
      timeout: 20000
    };

    const response = await fetch(
      `https://chrome.browserless.io/scrape?token=${token}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      }
    );

    const result = await response.json();

    if (!result || !result.data) {
      return res.status(500).json({
        error: "Browserless returned no data",
        details: result
      });
    }

    const html = result.data;

    const jsonMatch = html.match(
      /<script id="__NEXT_DATA__" type="application\/json">(.*?)<\/script>/
    );

    if (!jsonMatch) {
      return res.status(500).json({ error: "Unable to find trader data" });
    }

    const nextData = JSON.parse(jsonMatch[1]);
    const trader = nextData?.props?.pageProps;

    if (!trader) {
      return res.status(500).json({ error: "Trader JSON missing" });
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
      raw: trader
    });

  } catch (err) {
    return res.status(500).json({
      error: "Scraping failed",
      details: err.message
    });
  }
}
