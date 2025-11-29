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
    const targetUrl = `https://polymarketanalytics.com/creators/${name}`;

    // Browserless playwright API (this one ALWAYS works)
    const response = await fetch(
      `https://chrome.browserless.io/playwright?token=${token}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          // Playwright script executed remotely
          code: `
            const { chromium } = require("playwright");

            (async () => {
              const browser = await chromium.launch();
              const page = await browser.newPage();
              await page.goto("${targetUrl}", { waitUntil: "networkidle" });

              // Extract __NEXT_DATA__ script content
              const data = await page.evaluate(() => {
                const el = document.querySelector("#__NEXT_DATA__");
                return el ? el.textContent : null;
              });

              await browser.close();
              return { nextData: data };
            })();
          `,
          context: {},
          detached: false
        })
      }
    );

    const result = await response.json();

    if (!result || !result.nextData) {
      return res.status(500).json({
        error: "NEXT_DATA not found in resulting HTML",
        raw: result
      });
    }

    // Parse JSON inside __NEXT_DATA__
    const parsed = JSON.parse(result.nextData);
    const trader = parsed?.props?.pageProps;

    if (!trader) {
      return res.status(404).json({ error: "Trader data not found" });
    }

    return res.status(200).json({
      name: trader?.creator?.name ?? null,
      rank: trader?.creator?.rank ?? null,
      pnl: trader?.creator?.overallPnl ?? null,
      winRate: trader?.creator?.winRate ?? null,
      positions: trader?.positions ?? [],
      pnlHistory: trader?.pnlHistory ?? [],
      categories: trader?.categories ?? [],
      trades: trader?.trades ?? []
    });

  } catch (err) {
    return res.status(500).json({
      error: "Scraping_failed",
      details: err.message
    });
  }
}
