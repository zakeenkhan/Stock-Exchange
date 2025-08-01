// Theme management
document.addEventListener('DOMContentLoaded', function() {
    // Get theme from user settings or localStorage
    const currentTheme = localStorage.getItem('theme') || 'light';
    applyTheme(currentTheme);
    
    // Listen for theme changes in settings
    const themeSelect = document.querySelector('select[name="theme"]');
    if (themeSelect) {
        themeSelect.addEventListener('change', function() {
            const selectedTheme = this.value;
            if (selectedTheme === 'system') {
                // Use system preference
                if (window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches) {
                    applyTheme('dark');
                } else {
                    applyTheme('light');
                }
                // Listen for system changes
                window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', e => {
                    applyTheme(e.matches ? 'dark' : 'light');
                });
            } else {
                applyTheme(selectedTheme);
            }
            localStorage.setItem('theme', selectedTheme);
        });
    }
});

function applyTheme(theme) {
    if (theme === 'dark') {
        document.body.classList.add('dark-theme');
        document.body.classList.remove('light-theme');
    } else {
        document.body.classList.add('light-theme');
        document.body.classList.remove('dark-theme');
    }
}