// Fantasy Survivor League - Mystery SAFE Weeks System
// Progressive draw algorithm with SHA-256 hashing for verifiable randomness

// Supabase configuration
const SUPABASE_URL = 'https://fryzvuftyimdagfahdjv.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZyeXp2dWZ0eWltZGFnZmFoZGp2Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTcyMDExNjAsImV4cCI6MjA3Mjc3NzE2MH0.QFjKIfxlzLv9R-zLdXm1mM7H_BzZmBNJ3EXZJ52sEB4';

// Initialize Supabase client (wait for CDN to load)
let supabase;
function initSupabase() {
    if (window.supabase && window.supabase.createClient) {
        supabase = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
        return true;
    }
    return false;
}

class SurvivorSystem {
    constructor() {
        this.totalWeeks = 17;
        this.totalSafes = 5;
        this.currentWeek = 1;
        this.safesUsed = 0;
        this.results = [];
        this.seeds = null;
        this.leagueId = "1264279102727135232";
        this.baseUrl = "https://api.sleeper.app/v1";
        
        this.init();
    }

    async init() {
        // Wait for Supabase to load
        if (!initSupabase()) {
            console.log('Waiting for Supabase to load...');
            setTimeout(() => this.init(), 100);
            return;
        }
        
        await this.loadSeeds();
        await this.loadResults();
        this.renderTable();
        this.updateStats();
    }

    showDebugMessage(message) {
        const debugDiv = document.getElementById('debug-message');
        if (debugDiv) {
            debugDiv.textContent = message;
            debugDiv.style.display = 'block';
        }
    }

    async loadSeeds() {
        try {
            const response = await fetch('seeds.json');
            this.seeds = await response.json();
            console.log('Seeds loaded with commitment:', this.seeds.commitment);
        } catch (error) {
            console.error('Could not load seeds:', error);
            this.showDebugMessage('⚠️ Failed to load seeds.json: ' + error.message);
        }
    }

    async loadResults() {
        try {
            const { data, error } = await supabase
                .from('results')
                .select('*')
                .order('week');
            
            if (error) {
                console.error('Database error:', error);
                this.showDebugMessage('⚠️ Database error: ' + (error.message || JSON.stringify(error)));
                return;
            }

            console.log('Raw database response:', data);

            // Check if data exists before processing
            if (!data || data.length === 0) {
                console.log('No results found in database');
                this.showDebugMessage('⚠️ No results found in database. Database returned empty.');
                return;
            }

            this.showDebugMessage(`✓ Loaded ${data.length} weeks from database`);

            // Convert database results to our results format
            data.forEach(row => {
                const weekIndex = row.week - 1;
                this.results[weekIndex] = {
                    week: row.week,
                    baseSeed: this.seeds?.weeks?.[row.week] || '',
                    lowestScore: row.lowest_score,
                    lowestScorer: row.lowest_scorer,
                    fullSeed: `${this.seeds?.weeks?.[row.week] || ''}_LOWEST_SCORE_${row.lowest_score}`,
                    isSafe: row.is_safe,
                    revealed: true,
                    revealDate: row.revealed_at
                };
                
                if (row.is_safe) {
                    this.safesUsed++;
                }
            });
        } catch (error) {
            console.error('Could not load results from database:', error);
        }
    }

    async saveResult(weekResult) {
        try {
            const data = {
                week: weekResult.week,
                lowest_score: weekResult.lowestScore,
                lowest_scorer: weekResult.lowestScorer,
                is_safe: weekResult.isSafe,
                revealed_at: new Date().toISOString()
            };
            
            console.log('Attempting to save:', data);
            
            const { error } = await supabase
                .from('results')
                .insert([data]);
            
            if (error) {
                console.error('Insert failed:', error);
            } else {
                console.log('Successfully saved to database');
            }
        } catch (error) {
            console.error('Could not save result to database:', error);
        }
    }

    async fetchSleeperData(endpoint) {
        try {
            const response = await fetch(`${this.baseUrl}${endpoint}`);
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            return await response.json();
        } catch (error) {
            console.error('Sleeper API error:', error);
            return null;
        }
    }

    getEliminatedTeams() {
        const eliminatedTeams = new Set();

        // Look through all revealed results for CHOP weeks
        this.results.forEach(result => {
            if (result && result.revealed && !result.isSafe && result.lowestScorer) {
                eliminatedTeams.add(result.lowestScorer);
            }
        });

        return eliminatedTeams;
    }

    async getLowestScorerForWeek(week) {
        try {
            console.log(`Fetching lowest scorer for week ${week} from Sleeper...`);

            // Get eliminated teams from previous CHOP weeks
            const eliminatedTeams = this.getEliminatedTeams();
            console.log('Eliminated teams:', Array.from(eliminatedTeams));

            // Fetch matchups, rosters, and users
            const [matchups, rosters, users] = await Promise.all([
                this.fetchSleeperData(`/league/${this.leagueId}/matchups/${week}`),
                this.fetchSleeperData(`/league/${this.leagueId}/rosters`),
                this.fetchSleeperData(`/league/${this.leagueId}/users`)
            ]);

            if (!matchups || !rosters || !users) {
                console.error('Failed to fetch data from Sleeper API');
                return null;
            }

            // Map roster_id -> owner_id -> display/team name
            const ownerByRoster = {};
            rosters.forEach(r => {
                ownerByRoster[r.roster_id] = r.owner_id;
            });

            const nameByOwner = {};
            users.forEach(u => {
                const teamName = u.metadata?.team_name;
                const displayName = u.display_name;
                nameByOwner[u.user_id] = teamName || displayName || "Unknown";
            });

            // Find lowest score among active (non-eliminated) teams
            let lowest = null;
            let lowestTeam = null;

            matchups.forEach(team => {
                const points = parseFloat(team.points || 0);
                const rosterId = team.roster_id;
                const ownerId = ownerByRoster[rosterId];
                const teamName = nameByOwner[ownerId] || `Roster ${rosterId}`;

                // Skip eliminated teams
                if (eliminatedTeams.has(teamName)) {
                    console.log(`Skipping eliminated team: ${teamName} (${points} points)`);
                    return;
                }

                if (lowest === null || points < lowest) {
                    lowest = points;
                    lowestTeam = teamName;
                }
            });

            console.log(`Week ${week} lowest among active teams: ${lowestTeam} with ${lowest?.toFixed(1)} points`);
            return { score: lowest, team: lowestTeam };

        } catch (error) {
            console.error('Error fetching lowest scorer:', error);
            return null;
        }
    }


    getWeekRevealDates() {
        // Tuesday reveals at 7am ET after each week's games
        return [
            new Date('2025-09-09T07:00:00-04:00'), // Week 1 reveal Sept 9
            new Date('2025-09-16T07:00:00-04:00'), // Week 2 reveal Sept 16
            new Date('2025-09-23T07:00:00-04:00'), // Week 3 reveal Sept 23
            new Date('2025-09-30T07:00:00-04:00'), // Week 4 reveal Sept 30
            new Date('2025-10-07T07:00:00-04:00'), // Week 5 reveal Oct 7
            new Date('2025-10-14T07:00:00-04:00'), // Week 6 reveal Oct 14
            new Date('2025-10-21T07:00:00-04:00'), // Week 7 reveal Oct 21
            new Date('2025-10-28T07:00:00-04:00'), // Week 8 reveal Oct 28
            new Date('2025-11-04T07:00:00-05:00'), // Week 9 reveal Nov 4 (EST begins)
            new Date('2025-11-11T07:00:00-05:00'), // Week 10 reveal Nov 11
            new Date('2025-11-18T07:00:00-05:00'), // Week 11 reveal Nov 18
            new Date('2025-11-25T07:00:00-05:00'), // Week 12 reveal Nov 25
            new Date('2025-12-02T07:00:00-05:00'), // Week 13 reveal Dec 2
            new Date('2025-12-09T07:00:00-05:00'), // Week 14 reveal Dec 9
            new Date('2025-12-16T07:00:00-05:00'), // Week 15 reveal Dec 16
            new Date('2025-12-23T07:00:00-05:00')  // Week 16 reveal Dec 23
        ];
    }

    async autoRevealWeek(week) {
        const lowestData = await this.getLowestScorerForWeek(week);
        if (!lowestData) {
            console.error(`Could not get lowest scorer data for week ${week}`);
            return;
        }

        const result = await this.revealWeek(week, lowestData.score, lowestData.team);
        if (result) {
            console.log(`Week ${week} automatically revealed: ${result.isSafe ? 'SAFE' : 'CHOP'}`);
            this.renderTable();
            this.updateStats();
        }
    }

    // SHA-256 hash function using Web Crypto API
    async sha256(message) {
        const msgBuffer = new TextEncoder().encode(message);
        const hashBuffer = await crypto.subtle.digest('SHA-256', msgBuffer);
        const hashArray = new Uint8Array(hashBuffer);
        return hashArray;
    }

    // Convert hash bytes to BigInt
    hashToBigInt(hashBytes) {
        let result = BigInt(0);
        for (let i = 0; i < hashBytes.length; i++) {
            result = (result << BigInt(8)) + BigInt(hashBytes[i]);
        }
        return result;
    }

    // Progressive draw algorithm
    async calculateWeekResult(week, seed) {
        const remainingSafes = this.totalSafes - this.safesUsed;
        const remainingWeeks = this.totalWeeks - (week - 1);
        
        if (remainingSafes === 0) {
            return { isSafe: false, hash: null, threshold: null, probability: 0 };
        }
        
        if (remainingSafes === remainingWeeks) {
            return { isSafe: true, hash: null, threshold: null, probability: 100 };
        }

        // Calculate hash
        const hashBytes = await this.sha256(seed);
        const hashInt = this.hashToBigInt(hashBytes);
        
        // Calculate threshold: (remaining_safes * 2^256) / remaining_weeks
        const maxInt = BigInt(2) ** BigInt(256);
        const threshold = (BigInt(remainingSafes) * maxInt) / BigInt(remainingWeeks);
        
        const isSafe = hashInt < threshold;
        const probability = (remainingSafes / remainingWeeks * 100).toFixed(1);
        
        return {
            isSafe,
            hash: Array.from(hashBytes).map(b => b.toString(16).padStart(2, '0')).join(''),
            hashInt,
            threshold,
            probability: parseFloat(probability)
        };
    }

    // Manual reveal only - no automatic timing
    shouldRevealWeek(week) {
        // Only manual reveals via the input system
        return false;
    }

    async revealWeek(week, lowestScore, lowestScorer) {
        if (!this.seeds || !this.seeds.weeks[week]) return null;

        // Append lowest score to seed for unpredictability
        const baseSeed = this.seeds.weeks[week];
        const fullSeed = `${baseSeed}_LOWEST_SCORE_${lowestScore}`;
        const result = await this.calculateWeekResult(week, fullSeed);
        
        const weekResult = {
            week,
            baseSeed,
            lowestScore,
            lowestScorer,
            fullSeed,
            isSafe: result.isSafe,
            revealed: true,
            revealDate: new Date().toISOString()
        };

        this.results[week - 1] = weekResult;
        
        if (result.isSafe) {
            this.safesUsed++;
        }

        // Save result to database
        await this.saveResult(weekResult);
        
        return weekResult;
    }

    saveWeekResult(weekResult) {
        // In a real implementation, this would save to a file
        // Store in localStorage for persistence
        localStorage.setItem(`week_${weekResult.week}_result`, JSON.stringify(weekResult));
    }


    renderTable() {
        const tbody = document.getElementById('results-body');
        tbody.innerHTML = '';
        const now = new Date();
        const currentWeek = this.getCurrentWeek();

        for (let week = 1; week <= this.totalWeeks; week++) {
            const row = document.createElement('tr');
            const result = this.results[week - 1];
            
            // Add current week highlighting
            if (week === currentWeek && week <= 16) {
                row.style.backgroundColor = '#fff3cd';
                row.style.fontWeight = 'bold';
            }
            
            if (week === 17) {
                // Week 17 status is determined by weeks 1-16
                // If week 16 is revealed, we can calculate week 17
                const week16Result = this.results[15]; // Week 16 is at index 15

                if (week16Result && week16Result.revealed) {
                    // Count safes used in weeks 1-16
                    const safesUsedInWeeks1to16 = this.results.slice(0, 16).filter(r => r && r.revealed && r.isSafe).length;

                    // Week 17 is SAFE if only 4 safes were used in weeks 1-16
                    // (because we need exactly 5 total safes)
                    const week17IsSafe = safesUsedInWeeks1to16 < this.totalSafes;

                    row.innerHTML = `
                        <td>${week}</td>
                        <td>-</td>
                        <td>-</td>
                        <td class="${week17IsSafe ? 'safe' : 'chop'}">${week17IsSafe ? 'SAFE' : 'CHOP'}</td>
                    `;
                } else {
                    // Week 16 not yet revealed, so week 17 is still unknown
                    row.innerHTML = `
                        <td>${week}</td>
                        <td class="unknown">?</td>
                        <td class="unknown">?</td>
                        <td class="unknown">?</td>
                    `;
                }
            } else if (result && result.revealed) {
                row.innerHTML = `
                    <td>${week}</td>
                    <td>${result.lowestScore}</td>
                    <td>${result.lowestScorer || ''}</td>
                    <td class="${result.isSafe ? 'safe' : 'chop'}">${result.isSafe ? 'SAFE' : 'CHOP'}</td>
                `;
            } else {
                // Check if this week can be revealed (it's 10am ET on the reveal Tuesday)
                const revealDates = this.getWeekRevealDates();
                const canReveal = week <= 16 && now >= revealDates[week - 1];
                
                if (canReveal) {
                    row.innerHTML = `
                        <td>${week}</td>
                        <td class="unknown">?</td>
                        <td class="unknown">?</td>
                        <td class="unknown">
                            <button onclick="revealWeekFromSleeper(${week})" class="inline-submit">Reveal</button>
                        </td>
                    `;
                } else {
                    row.innerHTML = `
                        <td>${week}</td>
                        <td class="unknown">?</td>
                        <td class="unknown">?</td>
                        <td class="unknown">?</td>
                    `;
                }
            }
            
            tbody.appendChild(row);
        }
    }

    getCurrentWeek() {
        // Find the first unrevealed week (1-16)
        for (let week = 1; week <= 16; week++) {
            const result = this.results[week - 1];
            if (!result || !result.revealed) {
                return week;
            }
        }
        
        // If all weeks 1-16 are revealed, season complete
        return 17;
    }

    updateStats() {
        const safesUsed = this.results.filter(r => r && r.revealed && r.isSafe).length;
        const safesRemaining = this.totalSafes - safesUsed;
        const weeksRevealed = this.results.filter(r => r && r.revealed).length;
        const weeksRemaining = this.totalWeeks - weeksRevealed;
        
        const currentProbability = weeksRemaining > 0 && safesRemaining > 0 
            ? (safesRemaining / weeksRemaining * 100).toFixed(1)
            : '0.0';

        document.getElementById('safe-count').textContent = safesUsed;
        document.getElementById('safe-remaining').textContent = safesRemaining;
        document.getElementById('weeks-remaining').textContent = weeksRemaining;
        document.getElementById('current-probability').textContent = currentProbability + '%';
    }

}

// Global functions
async function revealWeekFromSleeper(week) {
    const result = await window.survivorSystem.autoRevealWeek(week);
    if (result) {
        console.log(`Week ${week} revealed from Sleeper API`);
    }
}

function showVerificationDetails() {
    const details = document.getElementById('verification-details');
    details.classList.toggle('hidden');
    
    const button = document.getElementById('verify-button');
    button.textContent = details.classList.contains('hidden') 
        ? 'Show Verification Details' 
        : 'Hide Verification Details';
}

// Initialize when page loads
document.addEventListener('DOMContentLoaded', () => {
    window.survivorSystem = new SurvivorSystem();
});