// Weatherguessr Configuration
// Replace these values with your actual Supabase credentials

const CONFIG = {
    // Supabase Configuration
    SUPABASE_URL: 'YOUR_SUPABASE_URL_HERE',
    SUPABASE_ANON_KEY: 'YOUR_SUPABASE_ANON_KEY_HERE',
    
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
