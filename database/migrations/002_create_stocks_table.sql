-- Drop and recreate stocks table
DROP TABLE IF EXISTS stocks CASCADE;
CREATE TABLE stocks (
    id SERIAL PRIMARY KEY,
    symbol VARCHAR(20) UNIQUE NOT NULL,
    name VARCHAR(255),
    company_name VARCHAR(255),
    current_price DECIMAL(10, 2),
    change_percent DECIMAL(10, 2),
    market_cap BIGINT,
    volume INT,
    sector VARCHAR(100),
    is_index BOOLEAN DEFAULT FALSE,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Add some sample data for testing
INSERT INTO stocks (symbol, name, company_name, current_price, change_percent, market_cap, volume, sector, is_index)
VALUES 
('AAPL', 'Apple Inc.', 'Apple Inc.', 185.92, 1.25, 2900000000000, 58900000, 'Technology', FALSE),
('MSFT', 'Microsoft', 'Microsoft Corporation', 338.37, 0.75, 2500000000000, 22100000, 'Technology', FALSE),
('GOOGL', 'Alphabet', 'Alphabet Inc.', 125.70, -0.50, 1600000000000, 25300000, 'Technology', FALSE),
('AMZN', 'Amazon', 'Amazon.com Inc.', 130.80, -0.25, 1350000000000, 40200000, 'Consumer Cyclical', FALSE),
('NVDA', 'NVIDIA', 'NVIDIA Corporation', 425.03, 2.15, 1050000000000, 35700000, 'Technology', FALSE),
('BRK.B', 'Berkshire', 'Berkshire Hathaway Inc.', 350.42, 0.30, 780000000000, 3800000, 'Financial Services', FALSE),
('META', 'Meta', 'Meta Platforms Inc.', 290.53, 1.80, 750000000000, 28900000, 'Communication Services', FALSE),
('TSM', 'Taiwan Semi', 'Taiwan Semiconductor Manufacturing', 98.25, -1.20, 510000000000, 12400000, 'Technology', FALSE),
('V', 'Visa', 'Visa Inc.', 240.18, 0.45, 495000000000, 6200000, 'Financial Services', FALSE),
('JPM', 'JPMorgan', 'JPMorgan Chase & Co.', 150.03, -0.65, 440000000000, 8900000, 'Financial Services', FALSE)
ON CONFLICT (symbol) DO UPDATE 
SET 
    name = EXCLUDED.name,
    company_name = EXCLUDED.company_name,
    current_price = EXCLUDED.current_price,
    change_percent = EXCLUDED.change_percent,
    market_cap = EXCLUDED.market_cap,
    volume = EXCLUDED.volume,
    sector = EXCLUDED.sector,
    is_index = EXCLUDED.is_index;
