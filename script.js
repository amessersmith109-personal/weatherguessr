// Weatherguessr - Main Game Logic

class WeatherguessrGame {
    constructor() {
        this.currentUser = '';
        this.currentState = null;
        this.currentScore = 0;
        this.usedCategories = new Set();
        this.gameState = 'username'; // username, playing, gameOver
        this.bestScore = this.loadBestScore();
        
        this.initializeEventListeners();
        this.updateUI();
    }

    initializeEventListeners() {
        // Username screen
        document.getElementById('startGameBtn').addEventListener('click', () => this.startGame());
        document.getElementById('usernameInput').addEventListener('keypress', (e) => {
            if (e.key === 'Enter') this.startGame();
        });

        // Game controls
        document.getElementById('rollBtn').addEventListener('click', () => this.rollState());
        document.getElementById('resetBtn').addEventListener('click', () => this.resetRound());
        document.getElementById('newGameBtn').addEventListener('click', () => this.newGame());

        // Category selection
        document.querySelectorAll('.category').forEach(category => {
            category.addEventListener('click', (e) => this.selectCategory(e.currentTarget.dataset.category));
        });

        // Game over modal
        document.getElementById('playAgainBtn').addEventListener('click', () => this.playAgain());
        document.getElementById('mainMenuBtn').addEventListener('click', () => this.showUsernameScreen());

        // Score history
        document.getElementById('closeHistoryBtn').addEventListener('click', () => this.closeScoreHistory());
    }

    startGame() {
        const username = document.getElementById('usernameInput').value.trim();
        if (!username) {
            alert('Please enter a username!');
            return;
        }

        this.currentUser = username;
        this.gameState = 'playing';
        this.resetRound();
        this.showGameScreen();
        this.updateUI();
    }

    showGameScreen() {
        document.getElementById('usernameScreen').classList.remove('active');
        document.getElementById('gameScreen').classList.add('active');
    }

    showUsernameScreen() {
        document.getElementById('gameScreen').classList.remove('active');
        document.getElementById('usernameScreen').classList.add('active');
        document.getElementById('usernameInput').value = '';
        this.gameState = 'username';
    }

    rollState() {
        if (this.usedCategories.size >= 8) {
            alert('All categories have been used! Complete the round or reset.');
            return;
        }

        const availableStates = Object.keys(stateFlags).filter(state => 
            !this.usedCategories.has(state)
        );

        if (availableStates.length === 0) {
            alert('No more states available!');
            return;
        }

        // Random state selection
        const randomIndex = Math.floor(Math.random() * availableStates.length);
        this.currentState = availableStates[randomIndex];

        // Update UI
        document.getElementById('stateFlag').textContent = stateFlags[this.currentState];
        document.getElementById('stateName').textContent = this.currentState;
        document.getElementById('rollBtn').textContent = '🎲 Roll Again';
        document.getElementById('rollBtn').disabled = true;

        // Enable available categories
        this.updateCategoryAvailability();
    }

    updateCategoryAvailability() {
        document.querySelectorAll('.category').forEach(category => {
            const categoryName = category.dataset.category;
            
            if (this.usedCategories.has(categoryName)) {
                category.classList.add('used');
                category.classList.remove('selected');
            } else {
                category.classList.remove('used');
                category.classList.remove('selected');
            }
        });
    }

    selectCategory(categoryName) {
        if (!this.currentState || this.usedCategories.has(categoryName)) {
            return;
        }

        // Get the ranking for this state in this category
        const ranking = rankings[categoryName][this.currentState];
        const score = ranking > 100 ? 100 : ranking;

        // Update game state
        this.currentScore += score;
        this.usedCategories.add(categoryName);

        // Update UI
        const categoryElement = document.querySelector(`[data-category="${categoryName}"]`);
        categoryElement.classList.add('selected');
        const scoreElement = categoryElement.querySelector('.category-score');
        scoreElement.textContent = score;
        
        // Color code the score based on ranking
        if (ranking <= 5) {
            scoreElement.style.color = '#28a745'; // Green for top 5
        } else if (ranking <= 25) {
            scoreElement.style.color = '#ffc107'; // Yellow for top 25
        } else {
            scoreElement.style.color = '#dc3545'; // Red for outside top 25
        }

        // Re-enable roll button
        document.getElementById('rollBtn').disabled = false;

        // Check if game is complete
        if (this.usedCategories.size >= 8) {
            this.endGame();
        } else {
            this.updateUI();
        }
    }

    resetRound() {
        this.currentScore = 0;
        this.usedCategories.clear();
        this.currentState = null;
        
        // Reset UI
        document.getElementById('stateFlag').textContent = '🌤️';
        document.getElementById('stateName').textContent = 'Click "Roll" to start!';
        document.getElementById('rollBtn').textContent = '🎲 Roll for State';
        document.getElementById('rollBtn').disabled = false;

        // Reset categories
        document.querySelectorAll('.category').forEach(category => {
            category.classList.remove('selected', 'used');
            const scoreElement = category.querySelector('.category-score');
            scoreElement.textContent = '-';
            scoreElement.style.color = '#28a745'; // Reset to default green
        });

        this.updateUI();
    }

    endGame() {
        this.gameState = 'gameOver';
        
        // Check for new best score
        const isNewBest = this.currentScore < this.bestScore;
        if (isNewBest) {
            this.bestScore = this.currentScore;
            this.saveBestScore();
        }

        // Save score to history
        this.saveScoreToHistory();

        // Show game over modal
        document.getElementById('finalScore').textContent = this.currentScore;
        document.getElementById('newRecord').style.display = isNewBest ? 'block' : 'none';
        document.getElementById('gameOverModal').style.display = 'block';
    }

    playAgain() {
        document.getElementById('gameOverModal').style.display = 'none';
        this.resetRound();
        this.gameState = 'playing';
    }

    newGame() {
        this.showUsernameScreen();
    }

    updateUI() {
        // Update score display
        document.getElementById('currentScore').textContent = this.currentScore;
        document.getElementById('categoriesLeft').textContent = 8 - this.usedCategories.size;

        // Update user info
        if (this.currentUser) {
            document.getElementById('currentUser').textContent = `Player: ${this.currentUser}`;
            document.getElementById('bestScore').textContent = `Best: ${this.bestScore}`;
        }

        // Update category availability
        if (this.gameState === 'playing') {
            this.updateCategoryAvailability();
        }
    }

    saveScoreToHistory() {
        const scoreHistory = this.loadScoreHistory();
        const newScore = {
            username: this.currentUser,
            score: this.currentScore,
            date: new Date().toISOString(),
            timestamp: Date.now()
        };

        scoreHistory.push(newScore);
        
        // Keep only the last 50 scores
        if (scoreHistory.length > 50) {
            scoreHistory.splice(0, scoreHistory.length - 50);
        }

        localStorage.setItem('weatherguessr_scoreHistory', JSON.stringify(scoreHistory));
    }

    loadScoreHistory() {
        try {
            const history = localStorage.getItem('weatherguessr_scoreHistory');
            return history ? JSON.parse(history) : [];
        } catch (e) {
            return [];
        }
    }

    saveBestScore() {
        localStorage.setItem('weatherguessr_bestScore', this.bestScore.toString());
    }

    loadBestScore() {
        try {
            const score = localStorage.getItem('weatherguessr_bestScore');
            return score ? parseInt(score) : Infinity;
        } catch (e) {
            return Infinity;
        }
    }

    showScoreHistory() {
        const history = this.loadScoreHistory();
        const historyList = document.getElementById('scoreHistoryList');
        
        // Update modal title
        document.querySelector('#scoreHistoryModal .modal-content h2').textContent = '📊 Score History';
        
        if (history.length === 0) {
            historyList.innerHTML = '<p>No scores yet!</p>';
        } else {
            const sortedHistory = history.sort((a, b) => a.score - b.score);
            historyList.innerHTML = sortedHistory.map(score => {
                const date = new Date(score.date).toLocaleDateString();
                return `
                    <div class="score-entry">
                        <span>${score.username} - ${date}</span>
                        <span>${score.score}</span>
                    </div>
                `;
            }).join('');
        }

        document.getElementById('scoreHistoryModal').style.display = 'block';
    }

    showLeaderboard() {
        const history = this.loadScoreHistory();
        const historyList = document.getElementById('scoreHistoryList');
        
        // Update modal title
        document.querySelector('#scoreHistoryModal .modal-content h2').textContent = '🏆 All-Time Leaderboard';
        
        if (history.length === 0) {
            historyList.innerHTML = '<p>No scores yet! Be the first to play!</p>';
        } else {
            const sortedHistory = history.sort((a, b) => a.score - b.score);
            historyList.innerHTML = sortedHistory.slice(0, 20).map((score, index) => {
                const date = new Date(score.date).toLocaleDateString();
                const time = new Date(score.date).toLocaleTimeString();
                let medal = '';
                if (index === 0) medal = '🥇';
                else if (index === 1) medal = '🥈';
                else if (index === 2) medal = '🥉';
                
                return `
                    <div class="score-entry ${index < 3 ? 'top-score' : ''}">
                        <span>${medal} ${index + 1}. ${score.username}</span>
                        <span class="score-info">
                            <span class="score-value">${score.score}</span>
                            <span class="score-date">${date} ${time}</span>
                        </span>
                    </div>
                `;
            }).join('');
        }

        document.getElementById('scoreHistoryModal').style.display = 'block';
    }

    closeScoreHistory() {
        document.getElementById('scoreHistoryModal').style.display = 'none';
    }

    // Utility function to get state ranking in a category
    getStateRanking(state, category) {
        return rankings[category][state] || 50; // Default to middle rank if not found
    }

    // Utility function to get all available categories
    getAvailableCategories() {
        return Object.keys(weatherData).filter(category => 
            !this.usedCategories.has(category)
        );
    }
}

// Initialize game when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    // Show loading screen briefly
    document.getElementById('loadingScreen').classList.add('active');
    
    setTimeout(() => {
        document.getElementById('loadingScreen').classList.remove('active');
        document.getElementById('usernameScreen').classList.add('active');
        
        // Initialize the game
        window.weatherguessrGame = new WeatherguessrGame();
        
        // Add leaderboard button event listener
        document.getElementById('leaderboardBtn').addEventListener('click', () => {
            window.weatherguessrGame.showLeaderboard();
        });
    }, 1000);
});

// Add keyboard shortcuts
document.addEventListener('keydown', (e) => {
    if (window.weatherguessrGame && window.weatherguessrGame.gameState === 'playing') {
        // Number keys 1-8 for category selection
        if (e.key >= '1' && e.key <= '8') {
            const categories = ['tornados', 'rainfall', 'highestTemp', 'lowestTemp', 'sunshine', 'wind', 'snowfall', 'lightning'];
            const categoryIndex = parseInt(e.key) - 1;
            if (categoryIndex < categories.length) {
                window.weatherguessrGame.selectCategory(categories[categoryIndex]);
            }
        }
        
        // Space/Enter to roll
        if (e.key === ' ' || e.key === 'Enter') {
            e.preventDefault();
            document.getElementById('rollBtn').click();
        }
        
        // R to reset
        if (e.key === 'r' || e.key === 'R') {
            document.getElementById('resetBtn').click();
        }
    }
});

// Add some fun animations and effects
function addVisualEffects() {
    // Add confetti effect for new records
    function createConfetti() {
        const colors = ['#ff6b6b', '#4ecdc4', '#45b7d1', '#96ceb4', '#feca57'];
        const confetti = document.createElement('div');
        confetti.style.position = 'fixed';
        confetti.style.left = Math.random() * 100 + 'vw';
        confetti.style.top = '-10px';
        confetti.style.width = '10px';
        confetti.style.height = '10px';
        confetti.style.backgroundColor = colors[Math.floor(Math.random() * colors.length)];
        confetti.style.borderRadius = '50%';
        confetti.style.pointerEvents = 'none';
        confetti.style.zIndex = '9999';
        
        document.body.appendChild(confetti);
        
        const animation = confetti.animate([
            { transform: 'translateY(0px) rotate(0deg)', opacity: 1 },
            { transform: `translateY(${window.innerHeight + 10}px) rotate(720deg)`, opacity: 0 }
        ], {
            duration: 3000,
            easing: 'cubic-bezier(0.25, 0.46, 0.45, 0.94)'
        });
        
        animation.onfinish = () => confetti.remove();
    }
    
    // Trigger confetti for new records
    const originalEndGame = WeatherguessrGame.prototype.endGame;
    WeatherguessrGame.prototype.endGame = function() {
        originalEndGame.call(this);
        
        if (this.currentScore < this.bestScore) {
            // Create confetti effect
            for (let i = 0; i < 50; i++) {
                setTimeout(createConfetti, i * 50);
            }
        }
    };
}

// Initialize visual effects
addVisualEffects();
