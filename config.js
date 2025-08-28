// Weatherguessr Configuration
// Replace these values with your actual Supabase credentials

const CONFIG = {
    // Supabase Configuration
    SUPABASE_URL: 'https://mlouxvhkfcjclkcqengy.supabase.co',
    SUPABASE_ANON_KEY: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im1sb3V4dmhrZmNqY2xrY3Flbmd5Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTYzODMyMDEsImV4cCI6MjA3MTk1OTIwMX0.vP9vaUMBSf3Q2whKkXVgZWp6K6xvlN0FXTtNUedJ4uM',
    
    // Game Configuration
    MAX_SCORES_DISPLAYED: 20,
    LOCAL_STORAGE_PREFIX: 'weatherguessr_',
    
    // UI Configuration
    ANIMATION_DURATION: 1000,
    CONFETTI_COUNT: 50
};

// Export for use in other files
if (typeof module !== 'undefined' && module.exports) {
    module.exports = CONFIG;
}
