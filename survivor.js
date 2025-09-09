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

    async loadSeeds() {
        try {
            const response = await fetch('seeds.json');
            this.seeds = await response.json();
            console.log('Seeds loaded with commitment:', this.seeds.commitment);
        } catch (error) {
            console.error('Could not load seeds:', error);
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
                return;
            }
            
            console.log('Raw database response:', data);
            
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
        const currentWeek = this.getCurrentWeek();

        for (let week = 1; week <= this.totalWeeks; week++) {
            const row = document.createElement('tr');
            const result = this.results[week - 1];
            
            if (week === 17) {
                // Week 17 is always CHOP (Championship)
                row.innerHTML = `
                    <td>${week}</td>
                    <td>-</td>
                    <td>-</td>
                    <td class="chop">CHOP (Championship)</td>
                `;
            } else if (result && result.revealed) {
                row.innerHTML = `
                    <td>${week}</td>
                    <td>${result.lowestScore}</td>
                    <td>${result.lowestScorer || ''}</td>
                    <td class="${result.isSafe ? 'safe' : 'chop'}">${result.isSafe ? 'SAFE' : 'CHOP'}</td>
                `;
            } else if (week === currentWeek && currentWeek <= 16) {
                // Current week gets input fields in respective columns (available to everyone)
                row.innerHTML = `
                    <td>${week}</td>
                    <td>
                        <input type="number" id="week-${week}-score" placeholder="85.4" step="0.1" min="0" class="inline-input">
                    </td>
                    <td>
                        <input type="text" id="week-${week}-scorer" placeholder="Name" class="inline-input-text">
                    </td>
                    <td>
                        <button onclick="submitWeekScore(${week})" class="inline-submit">Reveal</button>
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
            
            tbody.appendChild(row);
        }
    }

    getCurrentWeek() {
        const now = new Date();
        
        // Week 1 MNF is September 8, 2025, input available starting September 3 (Wednesday before)
        const weekDates = [
            new Date('2025-09-03T00:00:00-04:00'), // Week 1 input available Sept 3
            new Date('2025-09-10T00:00:00-04:00'), // Week 2 input available Sept 10
            new Date('2025-09-17T00:00:00-04:00'), // Week 3 input available Sept 17
            new Date('2025-09-24T00:00:00-04:00'), // Week 4 input available Sept 24
            new Date('2025-10-01T00:00:00-04:00'), // Week 5 input available Oct 1
            new Date('2025-10-08T00:00:00-04:00'), // Week 6 input available Oct 8
            new Date('2025-10-15T00:00:00-04:00'), // Week 7 input available Oct 15
            new Date('2025-10-22T00:00:00-04:00'), // Week 8 input available Oct 22
            new Date('2025-10-29T00:00:00-04:00'), // Week 9 input available Oct 29
            new Date('2025-11-05T00:00:00-04:00'), // Week 10 input available Nov 5
            new Date('2025-11-12T00:00:00-04:00'), // Week 11 input available Nov 12
            new Date('2025-11-19T00:00:00-04:00'), // Week 12 input available Nov 19
            new Date('2025-11-26T00:00:00-04:00'), // Week 13 input available Nov 26
            new Date('2025-12-03T00:00:00-04:00'), // Week 14 input available Dec 3
            new Date('2025-12-10T00:00:00-04:00'), // Week 15 input available Dec 10
            new Date('2025-12-17T00:00:00-04:00')  // Week 16 input available Dec 17
        ];
        
        // Find which week's input should be available
        for (let i = 0; i < weekDates.length; i++) {
            const week = i + 1;
            const weekInputDate = weekDates[i];
            
            // Check if this week hasn't been revealed yet and the input date has passed
            const result = this.results[i];
            const isRevealed = result && result.revealed;
            
            if (!isRevealed && now >= weekInputDate) {
                return week; // Return the first unrevealed week whose input date has passed
            }
        }
        
        // If no weeks are available for input, return 17 (season complete)
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
async function submitWeekScore(week) {
    const scoreInput = document.getElementById(`week-${week}-score`);
    const scorerInput = document.getElementById(`week-${week}-scorer`);
    
    const lowestScore = parseFloat(scoreInput.value);
    const lowestScorer = scorerInput.value.trim();
    
    // Validate both fields are filled
    if (!lowestScore || lowestScore < 0) {
        scoreInput.style.borderColor = '#dc3545';
        setTimeout(() => scoreInput.style.borderColor = '', 1000);
        return;
    }
    
    if (!lowestScorer) {
        scorerInput.style.borderColor = '#dc3545';
        setTimeout(() => scorerInput.style.borderColor = '', 1000);
        return;
    }
    
    // Confirmation popup
    const confirmMessage = `⚠️ CONFIRMATION REQUIRED ⚠️\n\n` +
                          `Are you the lowest scorer for Week ${week}?\n\n` +
                          `Score: ${lowestScore}\n` +
                          `Name: ${lowestScorer}\n\n` +
                          `WARNING: This will write to the database and reveal the week's result.\n\n` +
                          `Only click OK if:\n` +
                          `• You are the lowest scorer for this week\n` +
                          `• You are entering your actual score\n` +
                          `• You understand this cannot be undone\n\n` +
                          `Click OK to proceed or Cancel to abort.`;
    
    if (!confirm(confirmMessage)) {
        return; // User cancelled
    }
    
    // Reveal the week with this lowest score and scorer
    const result = await window.survivorSystem.revealWeek(week, lowestScore, lowestScorer);
    
    if (result) {
        // Update display - this will re-render the table and show the result
        window.survivorSystem.renderTable();
        window.survivorSystem.updateStats();
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