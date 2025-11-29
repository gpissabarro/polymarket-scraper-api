export default async function handler(req, res) {
  const { wallet } = req.query;

  if (!wallet) {
    return res.status(400).json({ error: "Missing wallet parameter (?wallet=)" });
  }

  try {
    // Fetch trades
    const tradesRes = await fetch(
      `https://clob.polymarket.com/trades?user=${wallet}&limit=10000`
    );
    const trades = await tradesRes.json();

    // Fetch open positions
    const openPosRes = await fetch(
      `https://clob.polymarket.com/positions?user=${wallet}`
    );
    const openPositions = await openPosRes.json();

    // Fetch closed positions
    const closedPosRes = await fetch(
      `https://clob.polymarket.com/closed-positions?user=${wallet}`
    );
    const closedPositions = await closedPosRes.json();

    // Fetch portfolio value
    const valueRes = await fetch(
      `https://data-api.polymarket.com/value?user=${wallet}`
    );
    const value = await valueRes.json();

    return res.status(200).json({
      wallet,
      openPositions,
      closedPositions,
      trades,
      value
    });

  } catch (error) {
    return res.status(500).json({
      error: "Failed to fetch Polymarket data",
      details: error.message
    });
  }
}
