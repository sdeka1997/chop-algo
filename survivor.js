// Fantasy Survivor League - Mystery SAFE Weeks System
// Progressive draw algorithm with SHA-256 hashing for verifiable randomness

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
        await this.loadSeeds();
        this.renderTable();
        this.updateStats();
        this.startCountdown();
        this.checkForNewReveal();
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

    async revealWeek(week, lowestScore) {
        if (!this.seeds || !this.seeds.weeks[week]) return null;

        // Append lowest score to seed for unpredictability
        const baseSeed = this.seeds.weeks[week];
        const fullSeed = `${baseSeed}_LOWEST_SCORE_${lowestScore}`;
        const result = await this.calculateWeekResult(week, fullSeed);
        
        const weekResult = {
            week,
            baseSeed,
            lowestScore,
            fullSeed,
            isSafe: result.isSafe,
            revealed: true,
            revealDate: new Date().toISOString()
        };

        this.results[week - 1] = weekResult;
        
        if (result.isSafe) {
            this.safesUsed++;
        }

        // Save result to results folder (for GitHub Pages)
        this.saveWeekResult(weekResult);
        
        return weekResult;
    }

    saveWeekResult(weekResult) {
        // In a real implementation, this would save to a file
        // For now, we'll store in localStorage for demo
        localStorage.setItem(`week_${weekResult.week}_result`, JSON.stringify(weekResult));
    }

    renderTable() {
        const tbody = document.getElementById('results-body');
        tbody.innerHTML = '';

        for (let week = 1; week <= this.totalWeeks; week++) {
            const row = document.createElement('tr');
            const result = this.results[week - 1];
            
            if (week === 17) {
                // Week 17 is always CHOP (Championship)
                row.innerHTML = `
                    <td>${week}</td>
                    <td class="chop">CHOP (Championship)</td>
                    <td class="revealed">Always</td>
                `;
            } else if (result && result.revealed) {
                row.innerHTML = `
                    <td>${week}</td>
                    <td class="${result.isSafe ? 'safe' : 'chop'}">${result.isSafe ? 'SAFE' : 'CHOP'}</td>
                    <td class="revealed">✓</td>
                `;
            } else {
                row.innerHTML = `
                    <td>${week}</td>
                    <td class="unknown">?</td>
                    <td class="not-revealed">-</td>
                `;
            }
            
            tbody.appendChild(row);
        }
        
        // Update current week in input section
        const currentWeek = this.getCurrentWeek();
        const inputSection = document.getElementById('input-section');
        const currentWeekSpan = document.getElementById('current-week');
        
        if (currentWeek <= 16) { // Only show input for weeks 1-16
            currentWeekSpan.textContent = currentWeek;
            inputSection.style.display = 'block';
        } else {
            inputSection.style.display = 'none';
        }
    }

    getCurrentWeek() {
        // Return the next week that needs to be revealed (only weeks 1-16)
        const revealedCount = this.results.filter(r => r && r.revealed).length;
        const nextWeek = revealedCount + 1;
        return nextWeek <= 16 ? nextWeek : 17; // Cap at 17 for display
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

    getNextRevealTime() {
        const now = new Date();
        const nextWeek = this.results.filter(r => r && r.revealed).length + 1;
        
        if (nextWeek > this.totalWeeks) return null;

        // Calculate next Monday 7 PM ET reveal time
        const seasonStart = new Date('2025-09-08T19:00:00-04:00'); // 7 PM ET
        const nextRevealTime = new Date(seasonStart);
        nextRevealTime.setDate(seasonStart.getDate() + (nextWeek - 1) * 7);

        return nextRevealTime;
    }

    startCountdown() {
        const updateCountdown = () => {
            const nextReveal = this.getNextRevealTime();
            const timer = document.getElementById('countdown-timer');
            
            if (!nextReveal) {
                timer.textContent = 'Season Complete!';
                return;
            }

            const now = new Date();
            const diff = nextReveal.getTime() - now.getTime();
            
            if (diff <= 0) {
                timer.textContent = 'Revealing now...';
                this.checkForNewReveal();
                return;
            }

            const days = Math.floor(diff / (1000 * 60 * 60 * 24));
            const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
            const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
            const seconds = Math.floor((diff % (1000 * 60)) / 1000);

            timer.textContent = `${days}d ${hours}h ${minutes}m ${seconds}s`;
        };

        updateCountdown();
        setInterval(updateCountdown, 1000);
    }

    checkForNewReveal() {
        const revealedCount = this.results.filter(r => r && r.revealed).length;
        
        for (let week = revealedCount + 1; week <= this.totalWeeks; week++) {
            if (this.shouldRevealWeek(week)) {
                this.revealWeek(week).then(() => {
                    this.renderTable();
                    this.updateStats();
                });
                break;
            }
        }
    }
}

// Global functions
async function submitLowestScore() {
    const input = document.getElementById('lowest-score');
    const lowestScore = parseFloat(input.value);
    
    if (!lowestScore || lowestScore < 0) {
        alert('Please enter a valid score (e.g., 85.4)');
        return;
    }
    
    const currentWeek = window.survivorSystem.getCurrentWeek();
    if (currentWeek > 16) {
        alert('All weeks revealed! Season complete.');
        return;
    }
    
    // Reveal the week with this lowest score
    const result = await window.survivorSystem.revealWeek(currentWeek, lowestScore);
    
    if (result) {
        // Update display
        window.survivorSystem.renderTable();
        window.survivorSystem.updateStats();
        
        // Clear input
        input.value = '';
        
        // Show result
        const status = result.isSafe ? 'SAFE' : 'CHOP';
        const statusClass = result.isSafe ? 'safe-text' : 'chop-text';
        alert(`Week ${currentWeek} Result: ${status}!`);
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