const { Pool } = require('pg');
require('dotenv').config();

let connectionString = process.env.DATABASE_URL;
if (connectionString) {
  connectionString = connectionString.replace('-pooler', '');
}

const pool = new Pool({
  connectionString,
  ssl: {
    rejectUnauthorized: false
  }
});

async function seedHistoricalData() {
  const client = await pool.connect();
  try {
    console.log('Fetching stocks to generate historical data...');
    const stocksResult = await client.query('SELECT id, current_price FROM stocks');
    const stocks = stocksResult.rows;

    if (stocks.length === 0) {
      console.log('No stocks found in the database. Please seed stocks first.');
      return;
    }

    console.log(`Found ${stocks.length} stocks. Generating and inserting historical data...`);

    for (const stock of stocks) {
      const historicalEntries = [];
      for (let i = 0; i < 30; i++) {
        const date = new Date();
        date.setDate(date.getDate() - (30 - i));

        const basePrice = parseFloat(stock.current_price);
        const fluctuation = (Math.random() - 0.5) * (basePrice * 0.1); // Fluctuate by up to 10%
        const close_price = basePrice + fluctuation;
        const open_price = close_price * (1 + (Math.random() - 0.5) * 0.02); // Open within 2% of close
        const high_price = Math.max(open_price, close_price) * (1 + Math.random() * 0.03); // High up to 3% more
        const low_price = Math.min(open_price, close_price) * (1 - Math.random() * 0.03); // Low up to 3% less
        const volume = Math.floor(Math.random() * 1000000) + 50000;

        historicalEntries.push({
          stock_id: stock.id,
          date: date.toISOString().split('T')[0],
          open_price: open_price.toFixed(2),
          high_price: high_price.toFixed(2),
          low_price: low_price.toFixed(2),
          close_price: close_price.toFixed(2),
          volume
        });
      }

      // Insert entries for the current stock
      for (const entry of historicalEntries) {
        await client.query(`
          INSERT INTO stock_price_history (stock_id, date, open_price, high_price, low_price, close_price, volume)
          VALUES ($1, $2, $3, $4, $5, $6, $7)
          ON CONFLICT (stock_id, date) DO NOTHING;
        `, [entry.stock_id, entry.date, entry.open_price, entry.high_price, entry.low_price, entry.close_price, entry.volume]);
      }
      console.log(`Inserted 30 days of historical data for stock_id: ${stock.id}`);
    }

    console.log('Historical data seeding completed successfully!');
  } catch (error) {
    console.error('Error seeding historical data:', error);
  } finally {
    client.release();
    await pool.end();
  }
}

seedHistoricalData();
