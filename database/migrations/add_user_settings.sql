-- User Settings Table
CREATE TABLE IF NOT EXISTS user_settings (
    id SERIAL PRIMARY KEY,
    user_id INT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    email_alerts BOOLEAN DEFAULT TRUE,
    market_updates BOOLEAN DEFAULT TRUE,
    portfolio_alerts BOOLEAN DEFAULT TRUE,
    default_view VARCHAR(20) DEFAULT 'dashboard',
    price_display VARCHAR(20) DEFAULT 'percentage',
    theme VARCHAR(20) DEFAULT 'light',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(user_id)
);

-- Create index for better performance
CREATE INDEX IF NOT EXISTS idx_user_settings_user_id ON user_settings(user_id);

-- Insert default settings for existing users
INSERT INTO user_settings (user_id, email_alerts, market_updates, portfolio_alerts, default_view, price_display, theme)
SELECT id, TRUE, TRUE, TRUE, 'dashboard', 'percentage', 'light'
FROM users
WHERE NOT EXISTS (
    SELECT 1 FROM user_settings WHERE user_settings.user_id = users.id
);