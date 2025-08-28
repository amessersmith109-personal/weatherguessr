// Multiplayer Game Logic
class MultiplayerManager {
    constructor() {
        this.currentUser = '';
        this.currentGame = null;
        this.isOnline = false;
        this.onlinePlayers = [];
        this.pendingInvitations = [];
        this.realTimeSubscriptions = [];
        this.heartbeatInterval = null;
        this.pollInterval = null;
        this.gameChannel = null;
        
        this.initializeMultiplayer();
    }
    
    normalizeName(name) {
        return (name || '').trim().toLowerCase();
    }
    
    getMySide() {
        if (!this.currentGame) return null;
        const me = this.normalizeName(this.currentUser);
        const p1 = this.normalizeName(this.currentGame.player1);
        const p2 = this.normalizeName(this.currentGame.player2);
        if (me && me === p1) return 'player1';
        if (me && me === p2) return 'player2';
        return null;
    }
    
    async initializeMultiplayer() {
        if (!supabase) {
            console.error('Supabase not configured for multiplayer');
            return;
        }
        
        // Set up real-time subscriptions
        this.setupRealTimeSubscriptions();
        
        // Start heartbeat to keep player online
        this.startHeartbeat();

        // Start polling as a fallback in case realtime isn't active
        this.startPolling();
    }
    
    setupRealTimeSubscriptions() {
        // Listen for online players changes
        const onlinePlayersSubscription = supabase
            .channel('online_players')
            .on('postgres_changes', 
                { event: '*', schema: 'public', table: 'online_players' },
                (payload) => {
                    this.handleOnlinePlayersChange(payload);
                }
            )
            .subscribe();
            
        // Listen for invitations
        const invitationsSubscription = supabase
            .channel('game_invitations')
            .on('postgres_changes',
                { event: '*', schema: 'public', table: 'game_invitations' },
                (payload) => {
                    this.handleInvitationChange(payload);
                }
            )
            .subscribe();
            
        // Listen for game state changes
        const gameStateSubscription = supabase
            .channel('multiplayer_games')
            .on('postgres_changes', { event: '*', schema: 'public', table: 'multiplayer_games' }, (payload) => {
                this.handleGameChange(payload);
            })
            .subscribe();
            
        this.realTimeSubscriptions.push(
            onlinePlayersSubscription,
            invitationsSubscription,
            gameStateSubscription
        );
    }
    
    async goOnline(username) {
        this.currentUser = username;
        
        try {
            // Upsert player status
            const { error } = await supabase
                .from('online_players')
                .upsert({
                    username: username,
                    last_seen: new Date().toISOString(),
                    is_available: true
                });
                
            if (error) throw error;
            
            this.isOnline = true;
            console.log(`${username} is now online`);
            
            // Load initial data
            await this.loadOnlinePlayers();
            await this.loadPendingInvitations();
            await this.processInviteLink();
            await this.processGameLink();
            
        } catch (error) {
            console.error('Error going online:', error);
        }
    }
    
    async goOffline() {
        if (!this.currentUser) return;
        
        try {
            // Remove from online players
            const { error } = await supabase
                .from('online_players')
                .delete()
                .eq('username', this.currentUser);
                
            if (error) throw error;
            
            this.isOnline = false;
            console.log(`${this.currentUser} is now offline`);
            
        } catch (error) {
            console.error('Error going offline:', error);
        }
    }
    
    startHeartbeat() {
        // Update last_seen every 30 seconds
        this.heartbeatInterval = setInterval(async () => {
            if (this.isOnline && this.currentUser) {
                try {
                    await supabase
                        .from('online_players')
                        .update({ last_seen: new Date().toISOString() })
                        .eq('username', this.currentUser);
                } catch (error) {
                    console.error('Heartbeat error:', error);
                }
            }
        }, 30000);
    }
    
    startPolling() {
        // Poll as a fallback if realtime DB changes are not configured
        if (this.pollInterval) return;
        this.pollInterval = setInterval(async () => {
            if (this.isOnline) {
                await Promise.all([
                    this.loadOnlinePlayers(),
                    this.loadPendingInvitations(),
                    this.loadRooms()
                ]);
            }
        }, 10000);
    }

    async expireOldInvitations() {
        try {
            const nowIso = new Date().toISOString();
            await supabase
                .from('game_invitations')
                .update({ status: 'expired' })
                .eq('status', 'pending')
                .lt('expires_at', nowIso);
        } catch (e) {
            console.error('Error expiring invitations:', e);
        }
    }
    
    async loadOnlinePlayers() {
        try {
            const thirtyMinutesAgo = new Date(Date.now() - 30 * 60 * 1000).toISOString();
            const { data, error } = await supabase
                .from('online_players')
                .select('*')
                .neq('username', this.currentUser)
                .gte('last_seen', thirtyMinutesAgo)
                .order('last_seen', { ascending: false });
                
            if (error) throw error;
            
            this.onlinePlayers = data || [];
            this.updateOnlinePlayersUI();
            
        } catch (error) {
            console.error('Error loading online players:', error);
        }
    }
    
    async loadPendingInvitations() {
        try {
            const nowIso = new Date().toISOString();
            await this.expireOldInvitations();
            const { data, error } = await supabase
                .from('game_invitations')
                .select('*')
                .eq('to_username', this.currentUser)
                .eq('status', 'pending')
                .gte('expires_at', nowIso)
                .order('created_at', { ascending: false });
                
            if (error) throw error;
            
            this.pendingInvitations = data || [];
            console.log('Loaded invitations:', this.pendingInvitations);
            this.updateInvitationsUI();
            
        } catch (error) {
            console.error('Error loading invitations:', error);
        }
    }
    
    async sendInvitation(toUsername) {
        try {
            // Don't send invitation to yourself
            if (toUsername === this.currentUser) {
                alert('You cannot challenge yourself!');
                return;
            }
            
            const { error } = await supabase
                .from('game_invitations')
                .insert({
                    from_username: this.currentUser,
                    to_username: toUsername,
                    status: 'pending',
                    expires_at: new Date(Date.now() + 5 * 60 * 1000).toISOString()
                });
                
            if (error) throw error;
            
            console.log(`Invitation sent to ${toUsername}`);
            
            // Show success notification
            this.showNotification(`🎮 Challenge sent to ${toUsername}! (expires in 5 min)`, 'success');
            
            // Update the button to show "Sent"
            const challengeBtn = document.querySelector(`[onclick="multiplayerManager.sendInvitation('${toUsername}')"]`);
            if (challengeBtn) {
                challengeBtn.textContent = '✅ Sent';
                challengeBtn.disabled = true;
                challengeBtn.style.backgroundColor = '#28a745';
            }
            
        } catch (error) {
            console.error('Error sending invitation:', error);
            this.showNotification(`❌ Failed to send challenge to ${toUsername}`, 'error');
        }
    }

    async copyInviteLink(toUsername) {
        try {
            if (toUsername === this.currentUser) {
                alert('You cannot challenge yourself!');
                return;
            }
            const expiresAt = new Date(Date.now() + 5 * 60 * 1000).toISOString();
            const { data, error } = await supabase
                .from('game_invitations')
                .insert({
                    from_username: this.currentUser,
                    to_username: toUsername,
                    status: 'pending',
                    expires_at: expiresAt
                })
                .select('id')
                .single();
            if (error) throw error;

            const url = new URL(window.location.href);
            url.searchParams.set('inviteId', data.id);
            await navigator.clipboard.writeText(url.toString());
            this.showNotification('🔗 Invite link copied to clipboard', 'success');
        } catch (e) {
            console.error('Error copying invite link:', e);
            this.showNotification('❌ Failed to copy invite link', 'error');
        }
    }

    async createGameLink() {
        try {
            // Create a placeholder game with player2 set to this.currentUser for now; actual join will use invite flow
            // Instead, create a lobby game where we are player1 and player2 is 'TBD' until someone joins via the link.
            const { data, error } = await supabase
                .from('multiplayer_games')
                .insert({
                    player1: this.currentUser,
                    player2: 'TBD',
                    current_round: 1,
                    player1_wins: 0,
                    player2_wins: 0,
                    game_state: this.getInitialGameState(),
                    status: 'active'
                })
                .select('id')
                .single();
            if (error) throw error;
            const url = new URL(window.location.href);
            url.searchParams.set('gameId', data.id);
            await navigator.clipboard.writeText(url.toString());
            this.showNotification('🔗 Game link copied to clipboard', 'success');
        } catch (e) {
            console.error('createGameLink error', e);
            this.showNotification('❌ Failed to create game link', 'error');
        }
    }
    
    async respondToInvitation(invitationId, response) {
        try {
            const { error } = await supabase
                .from('game_invitations')
                .update({ status: response })
                .eq('id', invitationId);
                
            if (error) throw error;
            
            if (response === 'accepted') {
                // Get the invitation details to start the game
                const { data } = await supabase
                    .from('game_invitations')
                    .select('*')
                    .eq('id', invitationId)
                    .single();
                    
                if (data) {
                    await this.startMultiplayerGame(data.from_username, data.to_username);
                }
            }
            
        } catch (error) {
            console.error('Error responding to invitation:', error);
        }
    }
    
    async startMultiplayerGame(player1, player2) {
        try {
            // Create new game
            const { data, error } = await supabase
                .from('multiplayer_games')
                .insert({
                    player1: player1,
                    player2: player2,
                    current_round: 1,
                    player1_wins: 0,
                    player2_wins: 0,
                    game_state: this.getInitialGameState(),
                    status: 'active'
                })
                .select()
                .single();
                
            if (error) throw error;
            
            this.currentGame = data;
            this.showMultiplayerGame();
            this.initializeGameState();
            this.joinGameChannel(this.currentGame.id);

            // Mark current user as busy/in-game
            try {
                await supabase
                    .from('online_players')
                    .update({ is_available: false, last_seen: new Date().toISOString() })
                    .eq('username', this.currentUser);
            } catch (e) {
                console.error('Error updating availability:', e);
            }
            // Update URL with gameId
            try {
                const url = new URL(window.location.href);
                url.searchParams.set('gameId', String(this.currentGame.id));
                window.history.replaceState({}, '', url.toString());
            } catch (e) {}
            
        } catch (error) {
            console.error('Error starting multiplayer game:', error);
        }
    }
    
    getInitialGameState() {
        return {
            player1: {
                currentState: null,
                score: 0,
                usedCategories: [],
                isReady: false,
                preReady: false
            },
            player2: {
                currentState: null,
                score: 0,
                usedCategories: [],
                isReady: false,
                preReady: false
            },
            roundState: 'waiting', // waiting, rolling, playing, complete
            roundWinner: null
        };
    }

    normalizeGameState(state) {
        const base = this.getInitialGameState();
        const out = { ...base, ...(state || {}) };
        out.player1 = { ...base.player1, ...(out.player1 || {}) };
        out.player1.usedCategories = Array.isArray(out.player1.usedCategories) ? out.player1.usedCategories : [];
        out.player1.score = Number.isFinite(out.player1.score) ? out.player1.score : 0;
        out.player1.isReady = !!out.player1.isReady;
        out.player1.preReady = !!out.player1.preReady;
        out.player2 = { ...base.player2, ...(out.player2 || {}) };
        out.player2.usedCategories = Array.isArray(out.player2.usedCategories) ? out.player2.usedCategories : [];
        out.player2.score = Number.isFinite(out.player2.score) ? out.player2.score : 0;
        out.player2.isReady = !!out.player2.isReady;
        out.player2.preReady = !!out.player2.preReady;
        out.roundState = out.roundState || 'waiting';
        return out;
    }
    
    initializeGameState() {
        if (!this.currentGame) return;
        const gameState = this.normalizeGameState(this.currentGame.game_state);
        this.currentGame.game_state = gameState;
        this.updateGameUI(gameState);
    }
    
    async rollState(playerSide) {
        if (!this.currentGame) return;
        
        const gameState = this.normalizeGameState({ ...this.currentGame.game_state });
        const player = gameState[playerSide];
        
        // Get available states (not used by either player)
        const usedStates = new Set([
            ...gameState.player1.usedCategories,
            ...gameState.player2.usedCategories
        ]);
        
        const availableStates = Object.keys(stateFlags).filter(state => 
            !usedStates.has(state)
        );
        
        if (availableStates.length === 0) {
            alert('No more states available!');
            return;
        }
        
        // Random state selection
        const randomIndex = Math.floor(Math.random() * availableStates.length);
        const selectedState = availableStates[randomIndex];
        
        // Update game state
        player.currentState = selectedState;
        player.isReady = true;
        
        // Check if both players are ready
        if (gameState.player1.isReady && gameState.player2.isReady) {
            gameState.roundState = 'playing';
        }
        
        // Save to database
        await this.updateGameState(gameState);
        // Broadcast to peer
        this.sendGameState();
    }
    
    async selectCategory(playerSide, categoryName) {
        if (!this.currentGame) return;
        
        const gameState = this.normalizeGameState({ ...this.currentGame.game_state });
        const player = gameState[playerSide];
        
        if (!player.currentState || player.usedCategories.includes(categoryName)) {
            return;
        }
        
        // Get the ranking for this state in this category
        const ranking = rankings[categoryName][player.currentState];
        const score = ranking > 100 ? 100 : ranking;
        
        // Update player state
        player.score += score;
        player.usedCategories.push(categoryName);
        
        // Check if round is complete
        if (player.usedCategories.length >= 8) {
            // Check if both players have completed
            if (gameState.player1.usedCategories.length >= 8 && 
                gameState.player2.usedCategories.length >= 8) {
                
                // Determine round winner
                const player1Score = gameState.player1.score;
                const player2Score = gameState.player2.score;
                
                if (player1Score < player2Score) {
                    gameState.roundWinner = 'player1';
                    gameState.player1_wins = (gameState.player1_wins || 0) + 1;
                } else if (player2Score < player1Score) {
                    gameState.roundWinner = 'player2';
                    gameState.player2_wins = (gameState.player2_wins || 0) + 1;
                } else {
                    gameState.roundWinner = 'tie';
                }
                
                gameState.roundState = 'complete';
            }
        }
        
        // Save to database
        await this.updateGameState(gameState);
        // Broadcast to peer
        this.sendGameState();
    }
    
    async updateGameState(gameState) {
        if (!this.currentGame) return;
        
        try {
            const { error } = await supabase
                .from('multiplayer_games')
                .update({ 
                    game_state: gameState,
                    player1_wins: gameState.player1_wins || 0,
                    player2_wins: gameState.player2_wins || 0,
                    updated_at: new Date().toISOString()
                })
                .eq('id', this.currentGame.id);
                
            if (error) throw error;
            
        } catch (error) {
            console.error('Error updating game state:', error);
        }
    }
    
    async nextRound() {
        if (!this.currentGame) return;
        
        const gameState = this.getInitialGameState();
        gameState.player1_wins = this.currentGame.player1_wins || 0;
        gameState.player2_wins = this.currentGame.player2_wins || 0;
        
        const newRound = (this.currentGame.current_round || 1) + 1;
        
        try {
            const { error } = await supabase
                .from('multiplayer_games')
                .update({
                    current_round: newRound,
                    game_state: gameState,
                    updated_at: new Date().toISOString()
                })
                .eq('id', this.currentGame.id);
                
            if (error) throw error;
            
        } catch (error) {
            console.error('Error starting next round:', error);
        }
    }
    
    updateGameUI(gameState) {
        // Update player names
        document.getElementById('player1Name').textContent = this.currentGame.player1;
        document.getElementById('player2Name').textContent = this.currentGame.player2;
        
        // Highlight my side (case-insensitive)
        const mySide = this.getMySide();
        document.getElementById('player1Side').style.outline = mySide === 'player1' ? '3px solid #667eea' : '';
        document.getElementById('player2Side').style.outline = mySide === 'player2' ? '3px solid #667eea' : '';

        // Coerce state
        const state = this.normalizeGameState(gameState);
        this.currentGame.game_state = state;
        
        // Update scores
        document.getElementById('player1Score').textContent = state.player1_wins || 0;
        document.getElementById('player2Score').textContent = state.player2_wins || 0;
        
        // Update current round
        document.getElementById('currentRound').textContent = this.currentGame.current_round || 1;
        
        // Update player states
        this.updatePlayerSide('player1', state.player1);
        this.updatePlayerSide('player2', state.player2);
        
        // Handle round state
        this.handleRoundState(state.roundState, state.roundWinner);
    }
    
    updatePlayerSide(playerSide, playerState) {
        const sideElement = document.getElementById(playerSide + 'Side');
        const stateFlag = document.getElementById(playerSide + 'StateFlag');
        const stateName = document.getElementById(playerSide + 'StateName');
        const rollBtn = document.getElementById(playerSide + 'RollBtn');
        const currentScore = document.getElementById(playerSide + 'CurrentScore');
        const status = document.getElementById(playerSide + 'Status');

        const isMySide = this.getMySide() === playerSide;
        // Debug traces to diagnose disabled state
        try {
            console.debug('[MP] updatePlayerSide', { playerSide, isMySide, isReady: playerState.isReady, preReady: playerState.preReady, used: playerState.usedCategories?.length });
        } catch (e) {}
        
        // Update state display
        if (playerState.currentState) {
            stateFlag.textContent = stateFlags[playerState.currentState];
            stateName.textContent = playerState.currentState;
        } else {
            stateFlag.textContent = '🌤️';
            stateName.textContent = 'Waiting for roll...';
        }
        
        // Update roll button (enable for my side unless completed)
        rollBtn.disabled = !isMySide || playerState.usedCategories.length >= 8;
        try {
            console.debug('[MP] rollBtn.disabled', rollBtn.disabled);
        } catch (e) {}
        
        // Update score
        currentScore.textContent = playerState.score;
        
        // Update status with preReady
        if (playerState.usedCategories.length >= 8) {
            status.textContent = 'Completed';
            status.className = 'player-status completed';
        } else if (playerState.preReady) {
            status.textContent = 'Ready';
            status.className = 'player-status playing';
        } else {
            status.textContent = 'Waiting';
            status.className = 'player-status waiting';
        }
        
        // Add/Update Ready button for my side
        let readyBtn = sideElement.querySelector('.pre-ready-btn');
        if (!readyBtn) {
            readyBtn = document.createElement('button');
            readyBtn.className = 'btn btn-secondary pre-ready-btn';
            readyBtn.style.marginTop = '6px';
            readyBtn.textContent = 'I\'m Ready';
            status.parentElement.appendChild(readyBtn);
        }
        readyBtn.style.display = isMySide && playerState.usedCategories.length < 8 ? 'inline-block' : 'none';
        readyBtn.textContent = playerState.preReady ? 'Ready ✓' : 'I\'m Ready';
        if (isMySide) {
            readyBtn.onclick = async () => {
                const gs = this.normalizeGameState({ ...this.currentGame.game_state });
                gs[playerSide].preReady = !gs[playerSide].preReady;
                await this.updateGameState(gs);
                this.sendGameState();
            };
        } else {
            readyBtn.onclick = null;
        }
        
        // Update categories
        this.updatePlayerCategories(playerSide, playerState, isMySide);
    }
    
    updatePlayerCategories(playerSide, playerState, isMySide) {
        const categoriesContainer = document.getElementById(playerSide + 'Categories');
        categoriesContainer.innerHTML = '';
        
        const categories = [
            { name: 'tornados', icon: '🌪️', displayName: 'Tornados (Yearly Avg)' },
            { name: 'rainfall', icon: '🌧️', displayName: 'Rainfall (Yearly Avg)' },
            { name: 'highestTemp', icon: '🔥', displayName: 'Highest Temp (Historic)' },
            { name: 'lowestTemp', icon: '❄️', displayName: 'Lowest Temp (Historic)' },
            { name: 'sunshine', icon: '☀️', displayName: 'Sunshine (Yearly Avg)' },
            { name: 'wind', icon: '💨', displayName: 'Wind (Yearly Avg)' },
            { name: 'snowfall', icon: '🌨️', displayName: 'Snowfall (Yearly Avg)' },
            { name: 'lightning', icon: '⚡', displayName: 'Lightning (Yearly Avg)' }
        ];
        
        categories.forEach(category => {
            const categoryElement = document.createElement('div');
            categoryElement.className = 'category';
            categoryElement.dataset.category = category.name;
            
            const isUsed = playerState.usedCategories.includes(category.name);
            const isSelected = playerState.usedCategories.includes(category.name);
            
            if (isUsed) categoryElement.classList.add('used');
            if (isSelected) categoryElement.classList.add('selected');
            
            categoryElement.innerHTML = `
                <div class="category-icon">${category.icon}</div>
                <div class="category-name">${category.displayName}</div>
                <div class="category-score">${isSelected ? this.getCategoryScore(playerState.currentState, category.name) : '-'}</div>
            `;
            
            if (isMySide && !isUsed && playerState.currentState) {
                categoryElement.addEventListener('click', () => {
                    this.selectCategory(playerSide, category.name);
                });
            }
            
            categoriesContainer.appendChild(categoryElement);
        });
    }
    
    getCategoryScore(state, category) {
        if (!state) return '-';
        const ranking = rankings[category][state];
        const score = ranking > 100 ? 100 : ranking;
        return score;
    }
    
    handleRoundState(roundState, roundWinner) {
        if (roundState === 'complete') {
            this.showRoundCompleteModal(roundWinner);
        }
    }
    
    showRoundCompleteModal(roundWinner) {
        const modal = document.getElementById('roundCompleteModal');
        const winnerName = document.getElementById('roundWinnerName');
        const finalScores = document.getElementById('roundFinalScores');
        
        if (roundWinner === 'tie') {
            winnerName.textContent = 'It\'s a tie!';
        } else {
            const winner = roundWinner === 'player1' ? this.currentGame.player1 : this.currentGame.player2;
            winnerName.textContent = winner;
        }
        
        const gameState = this.currentGame.game_state;
        finalScores.innerHTML = `
            <div>${this.currentGame.player1}: ${gameState.player1.score}</div>
            <div>${this.currentGame.player2}: ${gameState.player2.score}</div>
        `;
        
        modal.style.display = 'block';
    }
    
    showMultiplayerGame() {
        document.getElementById('multiplayerScreen').classList.remove('active');
        document.getElementById('multiplayerGameScreen').classList.add('active');
    }
    
    showMultiplayerLobby() {
        document.getElementById('mainMenuScreen').classList.remove('active');
        document.getElementById('gameScreen').classList.remove('active');
        document.getElementById('multiplayerGameScreen').classList.remove('active');
        document.getElementById('multiplayerScreen').classList.add('active');
        // Load rooms on entering lobby
        this.loadRooms();
        // If URL contains an inviteId, surface it here as a prompt
        const urlParams = new URLSearchParams(window.location.search);
        const inviteId = urlParams.get('inviteId');
        if (inviteId) {
            // Load that invite and show it prominently
            this.highlightInvite(inviteId);
        }
    }
    
    updateOnlinePlayersUI() {
        const container = document.getElementById('onlinePlayersList');
        
        if (this.onlinePlayers.length === 0) {
            container.innerHTML = '<p>No other players online</p>';
            const header = document.getElementById('onlinePlayersHeader');
            if (header) header.textContent = '👥 Online Players (0)';
            return;
        }
        
        container.innerHTML = this.onlinePlayers.map(player => {
            const isAvailable = !!player.is_available;
            const statusLabel = isAvailable ? '🟢 Available' : '🟠 In game';
            const disabledAttr = isAvailable ? '' : 'disabled style="opacity:0.6; cursor:not-allowed;"';
            return `
            <div class="player-item">
                <div class="player-info">
                    <span class="player-name">${player.username}</span>
                    <span class="player-status">${statusLabel}</span>
                </div>
                <div style="display:flex; gap:6px;">
                    <button class="challenge-btn" ${disabledAttr} onclick="multiplayerManager.sendInvitation('${player.username}')">Challenge</button>
                    <button class="challenge-btn" onclick="multiplayerManager.copyInviteLink('${player.username}')">Copy Link</button>
                </div>
            </div>`;
        }).join('');

        const header = document.getElementById('onlinePlayersHeader');
        if (header) header.textContent = `👥 Online Players (${this.onlinePlayers.length})`;
    }
    
    updateInvitationsUI() {
        const container = document.getElementById('invitationsList');
        
        if (this.pendingInvitations.length === 0) {
            container.innerHTML = '<p>No pending invitations</p>';
            const header = document.getElementById('invitationsHeader');
            if (header) header.textContent = '📨 Invitations (0)';
            return;
        }
        
        container.innerHTML = this.pendingInvitations.map(invitation => `
            <div class="invitation-item">
                <div class="invitation-info">
                    <span>${invitation.from_username} wants to play!</span>
                </div>
                <div class="invitation-actions">
                    <button class="accept-btn" onclick="multiplayerManager.respondToInvitation(${invitation.id}, 'accepted')">
                        Accept
                    </button>
                    <button class="decline-btn" onclick="multiplayerManager.respondToInvitation(${invitation.id}, 'declined')">
                        Decline
                    </button>
                </div>
            </div>
        `).join('');

        const header = document.getElementById('invitationsHeader');
        if (header) header.textContent = `📨 Invitations (${this.pendingInvitations.length})`;
    }

    // --- Minimal Rooms (placeholder) ---
    async loadRooms() {
        try {
            const container = document.getElementById('roomsList');
            if (!container) return;
            // If Supabase rooms table exists, try to fetch; otherwise fall back to placeholders
            if (typeof supabase?.from === 'function') {
                try {
                    const { data, error } = await supabase
                        .from('rooms')
                        .select('*')
                        .order('name', { ascending: true });
                    if (!error && Array.isArray(data) && data.length) {
                        this.renderRoomsUI(data);
                        return;
                    }
                } catch (_) { /* ignore and fall back */ }
            }
            // Fallback placeholder rooms
            const names = ['Room 1', 'Room 2', 'Room 3', 'Room 4', 'Room 5'];
            this.renderRoomsUI(names.map(n => ({ name: n, status: 'open' })));
        } catch (e) {
            const container = document.getElementById('roomsList');
            if (container) container.innerHTML = '<p style="opacity:.7;">Rooms unavailable</p>';
        }
    }

    renderRoomsUI(rooms) {
        const container = document.getElementById('roomsList');
        if (!container) return;
        const byName = new Map(rooms.map(r => [r.name, r]));
        const names = ['Room 1', 'Room 2', 'Room 3', 'Room 4', 'Room 5'];
        container.innerHTML = names.map(name => {
            const r = byName.get(name) || { name, status: 'open' };
            const status = r.status || 'open';
            return `
                <div class="player-item">
                    <div class="player-info">
                        <span class="player-name">${name}</span>
                        <span class="player-status">${status}</span>
                    </div>
                    <div style="display:flex; gap:6px;">
                        <button class="challenge-btn" onclick="multiplayerManager.joinRoom('${name}')">Join</button>
                    </div>
                </div>
            `;
        }).join('');
    }

    async joinRoom(name) {
        // Placeholder: just annotate URL and notify
        try {
            const url = new URL(window.location.href);
            url.searchParams.set('room', name);
            window.history.replaceState({}, '', url.toString());
            this.showNotification(`Joined ${name} (placeholder)`, 'info');
        } catch (e) {}
    }

    async leaveRoom(name) {
        try {
            const url = new URL(window.location.href);
            if (url.searchParams.get('room') === name) {
                url.searchParams.delete('room');
                window.history.replaceState({}, '', url.toString());
            }
            this.showNotification(`Left ${name}`, 'info');
            this.loadRooms();
        } catch (e) {}
    }

    async startGameFromRoom(name) {
        // Placeholder: require two users logic not enforced here
        try {
            await this.startMultiplayerGame(this.currentUser, this.currentUser);
        } catch (e) {}
    }
    // --- End Minimal Rooms ---

    async processInviteLink() {
        try {
            const urlParams = new URLSearchParams(window.location.search);
            const inviteId = urlParams.get('inviteId');
            if (!inviteId) return;
            const { data, error } = await supabase
                .from('game_invitations')
                .select('*')
                .eq('id', inviteId)
                .single();
            if (error || !data) return;
            const now = new Date();
            const expiresAt = new Date(data.expires_at);
            if (data.status !== 'pending' || expiresAt <= now) {
                this.showNotification('⏰ Invite link is expired or invalid', 'error');
                return;
            }
            if (data.to_username !== this.currentUser) {
                this.showNotification(`This invite is for ${data.to_username}.`, 'info');
                return;
            }
            // Bring user to lobby and highlight invite
            this.showMultiplayerLobby();
            this.highlightInvite(inviteId);
        } catch (e) {
            console.error('processInviteLink error:', e);
        }
    }

    async processGameLink() {
        try {
            const urlParams = new URLSearchParams(window.location.search);
            const gameId = urlParams.get('gameId');
            if (!gameId) return;
            const { data, error } = await supabase
                .from('multiplayer_games')
                .select('*')
                .eq('id', Number(gameId))
                .single();
            if (error || !data) return;
            const me = this.normalizeName(this.currentUser);
            const p1 = this.normalizeName(data.player1);
            const p2 = this.normalizeName(data.player2);
            if (me !== p1 && me !== p2) {
                // If player2 is TBD, claim that slot
                if (data.player2 === 'TBD') {
                    try {
                        const { error: updErr, data: updData } = await supabase
                            .from('multiplayer_games')
                            .update({ player2: this.currentUser, updated_at: new Date().toISOString() })
                            .eq('id', Number(gameId))
                            .select()
                            .single();
                        if (!updErr && updData) {
                            data.player2 = this.currentUser;
                        }
                    } catch (e) {}
                } else {
                    this.showNotification('You are not part of this game link.', 'error');
                    return;
                }
            }
            // Ensure state shape
            data.game_state = this.normalizeGameState(data.game_state);
            this.currentGame = data;
            this.showMultiplayerGame();
            this.initializeGameState();
            // Join broadcast channel so peers sync even without DB replication
            this.joinGameChannel(this.currentGame.id);
        } catch (e) {
            console.error('processGameLink error:', e);
        }
    }

    async highlightInvite(inviteId) {
        try {
            // Ensure invitations loaded
            if (!this.pendingInvitations.find(i => i.id === Number(inviteId))) {
                await this.loadPendingInvitations();
            }
            const container = document.getElementById('invitationsList');
            if (!container) return;
            const cards = Array.from(container.children);
            cards.forEach(card => card.style.outline = '');
            // Roughly find the card by matching onclick if present
            const match = cards.find(card => card.innerHTML.includes(`respondToInvitation(${inviteId}, 'accepted')`));
            if (match) {
                match.scrollIntoView({ behavior: 'smooth', block: 'center' });
                match.style.outline = '3px solid #ffd700';
                setTimeout(() => { match.style.outline = ''; }, 4000);
            }
        } catch (e) {
            // no-op
        }
    }
    
    handleOnlinePlayersChange(payload) {
        // Reload list to honor filters (availability and 30-minute activity)
        this.loadOnlinePlayers();
    }
    
    handleInvitationChange(payload) {
        const now = new Date();
        if (payload.eventType === 'INSERT' && payload.new.to_username === this.currentUser) {
            // New invitation received (ignore expired)
            const expiresAt = new Date(payload.new.expires_at);
            if (expiresAt > now && payload.new.status === 'pending') {
                this.pendingInvitations.push(payload.new);
                this.showNotification(`🎮 ${payload.new.from_username} has challenged you!`, 'info');
            }
        } else if (payload.eventType === 'UPDATE') {
            const index = this.pendingInvitations.findIndex(i => i.id === payload.new.id);
            if (index !== -1) {
                this.pendingInvitations[index] = payload.new;
                
                // Show notification for status changes
                if (payload.new.status === 'accepted') {
                    this.showNotification(`🎉 ${payload.new.to_username} accepted your challenge!`, 'success');
                } else if (payload.new.status === 'declined') {
                    this.showNotification(`😔 ${payload.new.to_username} declined your challenge`, 'info');
                } else if (payload.new.status === 'expired') {
                    this.showNotification(`⏰ Invite to ${payload.new.to_username} expired`, 'info');
                }
            }
            if (payload.new.from_username === this.currentUser && payload.new.status === 'expired') {
                this.showNotification(`⏰ Your invite to ${payload.new.to_username} expired`, 'info');
            }
        } else if (payload.eventType === 'DELETE') {
            this.pendingInvitations = this.pendingInvitations.filter(i => i.id !== payload.old.id);
        }
        
        this.updateInvitationsUI();
    }
    
    handleGameChange(payload) {
        // If a game is created involving the current user, join it
        if (payload.eventType === 'INSERT') {
            const game = payload.new;
            if (game.player1 === this.currentUser || game.player2 === this.currentUser) {
                this.currentGame = game;
                this.showMultiplayerGame();
                this.initializeGameState();
                // Mark busy
                supabase.from('online_players').update({ is_available: false, last_seen: new Date().toISOString() }).eq('username', this.currentUser).then(() => {}).catch(() => {});
                // Update URL gameId
                try {
                    const url = new URL(window.location.href);
                    url.searchParams.set('gameId', String(this.currentGame.id));
                    window.history.replaceState({}, '', url.toString());
                } catch (e) {}
                // Join broadcast channel
                this.joinGameChannel(this.currentGame.id);
            }
            return;
        }
        
        if (payload.eventType === 'UPDATE' && this.currentGame && payload.new.id === this.currentGame.id) {
            this.currentGame = payload.new;
            this.updateGameUI(payload.new.game_state);
        }
    }

    joinGameChannel(gameId) {
        if (!supabase) return;
        if (this.gameChannel) {
            try { this.gameChannel.unsubscribe(); } catch (e) {}
            this.gameChannel = null;
        }
        const channelName = `game:${gameId}`;
        this.gameChannel = supabase.channel(channelName, { config: { broadcast: { self: false } } });
        this.gameChannel.on('broadcast', { event: 'state' }, ({ payload }) => {
            if (!this.currentGame || this.currentGame.id !== gameId) return;
            if (payload && payload.game_state) {
                this.currentGame.game_state = payload.game_state;
                this.updateGameUI(payload.game_state);
            }
        });
        this.gameChannel.subscribe((status) => {
            if (status === 'SUBSCRIBED') {
                if (this.currentGame && this.currentGame.game_state) {
                    this.sendGameState();
                }
            }
        });
    }

    sendGameState() {
        try {
            if (this.gameChannel && this.currentGame) {
                this.gameChannel.send({
                    type: 'broadcast',
                    event: 'state',
                    payload: { game_state: this.currentGame.game_state }
                });
            }
        } catch (e) {}
    }
    
    showNotification(message, type = 'info') {
        // Create notification element
        const notification = document.createElement('div');
        notification.className = `notification notification-${type}`;
        notification.innerHTML = `
            <div class="notification-content">
                <span>${message}</span>
                <button class="notification-close" onclick="this.parentElement.parentElement.remove()">×</button>
            </div>
        `;
        
        // Add to page
        document.body.appendChild(notification);
        
        // Auto-remove after 5 seconds
        setTimeout(() => {
            if (notification.parentElement) {
                notification.remove();
            }
        }, 5000);
    }
    
    cleanup() {
        // Unsubscribe from real-time channels
        this.realTimeSubscriptions.forEach(subscription => {
            subscription.unsubscribe();
        });
        
        // Go offline
        this.goOffline();
        
        // Clear timers
        if (this.heartbeatInterval) {
            clearInterval(this.heartbeatInterval);
            this.heartbeatInterval = null;
        }
        if (this.pollInterval) {
            clearInterval(this.pollInterval);
            this.pollInterval = null;
        }
        // Leave game broadcast channel
        if (this.gameChannel) {
            try { this.gameChannel.unsubscribe(); } catch (e) {}
            this.gameChannel = null;
        }
    }
}

// Global multiplayer manager instance
let multiplayerManager = null;
