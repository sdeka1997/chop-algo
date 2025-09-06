// Fantasy Survivor League - Mystery SAFE Weeks System
// Progressive draw algorithm with SHA-256 hashing for verifiable randomness

class SurvivorSystem {
    constructor() {
        this.totalWeeks = 16;
        this.totalSafes = 5;
        this.currentWeek = 1;
        this.safesUsed = 0;
        this.results = [];
        this.seeds = null;
        
        this.init();
    }

    async init() {
        await this.loadSeeds();
        
        // Check if we're in demo mode (URL parameter)
        const urlParams = new URLSearchParams(window.location.search);
        if (urlParams.get('demo') === 'true') {
            await this.loadDemoData();
        }
        
        this.renderTable();
        this.updateStats();
        this.startCountdown();
        this.checkForNewReveal();
    }

    async loadDemoData() {
        console.log('Loading demo data...');
        // Simulate first 3 weeks being revealed for demo purposes
        for (let week = 1; week <= 3; week++) {
            await this.revealWeek(week);
        }
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

    // Reveal at 7 PM Eastern each Monday
    shouldRevealWeek(week) {
        const now = new Date();
        
        // Calculate the Monday 7 PM ET reveal time for this week
        // Week 1 starts September 8, 2025 (first Monday)
        const seasonStart = new Date('2025-09-08T19:00:00-04:00'); // 7 PM ET
        const weekRevealTime = new Date(seasonStart);
        weekRevealTime.setDate(seasonStart.getDate() + (week - 1) * 7);
        
        return now >= weekRevealTime;
    }

    async revealWeek(week) {
        if (!this.seeds || !this.seeds.weeks[week]) return null;

        const seed = this.seeds.weeks[week];
        const result = await this.calculateWeekResult(week, seed);
        
        const weekResult = {
            week,
            seed,
            isSafe: result.isSafe,
            hash: result.hash,
            hashShort: result.hash ? result.hash.substring(0, 8) : '',
            threshold: result.threshold ? result.threshold.toString() : '',
            probability: result.probability,
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
            
            if (result && result.revealed) {
                row.innerHTML = `
                    <td>${week}</td>
                    <td class="${result.isSafe ? 'safe' : 'chop'}">${result.isSafe ? 'SAFE' : 'CHOP'}</td>
                    <td class="seed">${result.seed}</td>
                    <td class="hash">${result.hashShort}...</td>
                    <td class="${result.isSafe ? 'yes' : 'no'}">${result.isSafe ? 'Yes' : 'No'}</td>
                    <td class="revealed">✓</td>
                `;
            } else if (this.shouldRevealWeek(week)) {
                // Should be revealed but isn't yet - trigger reveal
                this.revealWeek(week).then(() => this.renderTable());
                row.innerHTML = `
                    <td>${week}</td>
                    <td class="pending">Revealing...</td>
                    <td>-</td>
                    <td>-</td>
                    <td>-</td>
                    <td class="pending">⏳</td>
                `;
            } else {
                row.innerHTML = `
                    <td>${week}</td>
                    <td class="unknown">?</td>
                    <td>-</td>
                    <td>-</td>
                    <td>-</td>
                    <td class="not-revealed">-</td>
                `;
            }
            
            tbody.appendChild(row);
        }
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