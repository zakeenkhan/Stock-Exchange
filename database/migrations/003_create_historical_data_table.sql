-- Create historical data table
CREATE TABLE IF NOT EXISTS historical_data (
    id SERIAL PRIMARY KEY,
    stock_id INTEGER NOT NULL REFERENCES stocks(id) ON DELETE CASCADE,
    date DATE NOT NULL,
    open_price DECIMAL(12, 4),
    high_price DECIMAL(12, 4),
    low_price DECIMAL(12, 4),
    close_price DECIMAL(12, 4) NOT NULL,
    volume BIGINT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(stock_id, date)
);

-- Create index for better query performance
CREATE INDEX IF NOT EXISTS idx_historical_data_stock_id ON historical_data(stock_id);
CREATE INDEX IF NOT EXISTS idx_historical_data_date ON historical_data(date);

-- Add comment to the table
COMMENT ON TABLE historical_data IS 'Stores historical price data for stocks';

-- Add comments to columns
COMMENT ON COLUMN historical_data.stock_id IS 'Reference to the stock in the stocks table';
COMMENT ON COLUMN historical_data.date IS 'The trading date';
COMMENT ON COLUMN historical_data.open_price IS 'Opening price of the stock on the given date';
COMMENT ON COLUMN historical_data.high_price IS 'Highest price of the stock on the given date';
COMMENT ON COLUMN historical_data.low_price IS 'Lowest price of the stock on the given date';
COMMENT ON COLUMN historical_data.close_price IS 'Closing price of the stock on the given date';
COMMENT ON COLUMN historical_data.volume IS 'Trading volume for the stock on the given date';
