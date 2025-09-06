// Test script to validate the Mystery SAFE Weeks algorithm
// Run this in browser console or Node.js to verify the system works correctly

class AlgorithmTester {
    constructor() {
        this.seeds = [
            "MNF_2024_W01_TB_DAL_8:15PM_ET_2024-09-09",
            "MNF_2024_W02_ATL_PHI_8:15PM_ET_2024-09-16", 
            "MNF_2024_W03_WAS_CIN_8:15PM_ET_2024-09-23",
            "MNF_2024_W04_SEA_DET_8:15PM_ET_2024-09-30",
            "MNF_2024_W05_NO_KC_8:15PM_ET_2024-10-07",
            "MNF_2024_W06_NYG_BUF_8:15PM_ET_2024-10-14",
            "MNF_2024_W07_BAL_TB_8:15PM_ET_2024-10-21",
            "MNF_2024_W08_NYG_PIT_8:15PM_ET_2024-10-28",
            "MNF_2024_W09_KC_TB_8:15PM_ET_2024-11-04",
            "MNF_2024_W10_MIA_LAR_8:15PM_ET_2024-11-11",
            "MNF_2024_W11_HOU_DAL_8:15PM_ET_2024-11-18",
            "MNF_2024_W12_BAL_LAC_8:15PM_ET_2024-11-25",
            "MNF_2024_W13_CLE_DEN_8:15PM_ET_2024-12-02",
            "MNF_2024_W14_CHI_MIN_8:00PM_ET_2024-12-09",
            "MNF_2024_W15_ATL_LV_8:30PM_ET_2024-12-16",
            "MNF_2024_W16_NO_GB_8:15PM_ET_2024-12-23",
            "MNF_2024_W17_DET_SF_8:15PM_ET_2024-12-30"
        ];
        this.totalWeeks = 17;
        this.totalSafes = 5;
    }

    async sha256(message) {
        if (typeof window !== 'undefined') {
            // Browser environment
            const msgBuffer = new TextEncoder().encode(message);
            const hashBuffer = await crypto.subtle.digest('SHA-256', msgBuffer);
            return new Uint8Array(hashBuffer);
        } else {
            // Node.js environment
            const crypto = require('crypto');
            const hash = crypto.createHash('sha256');
            hash.update(message, 'utf8');
            return new Uint8Array(hash.digest());
        }
    }

    hashToBigInt(hashBytes) {
        let result = BigInt(0);
        for (let i = 0; i < hashBytes.length; i++) {
            result = (result << BigInt(8)) + BigInt(hashBytes[i]);
        }
        return result;
    }

    async runFullSeasonTest() {
        console.log('🧪 Testing Mystery SAFE Weeks Algorithm');
        console.log('=====================================');
        
        let safesUsed = 0;
        let results = [];
        
        for (let week = 1; week <= this.totalWeeks; week++) {
            const remainingSafes = this.totalSafes - safesUsed;
            const remainingWeeks = this.totalWeeks - (week - 1);
            
            // Calculate result for this week
            const seed = this.seeds[week - 1];
            const hashBytes = await this.sha256(seed);
            const hashInt = this.hashToBigInt(hashBytes);
            
            // Calculate threshold
            const maxInt = BigInt(2) ** BigInt(256);
            const threshold = (BigInt(remainingSafes) * maxInt) / BigInt(remainingWeeks);
            
            const isSafe = hashInt < threshold;
            const probability = (remainingSafes / remainingWeeks * 100).toFixed(1);
            
            if (isSafe) safesUsed++;
            
            results.push({
                week,
                seed: seed.substring(0, 30) + '...',
                isSafe,
                probability: probability + '%',
                hashHex: Array.from(hashBytes).map(b => b.toString(16).padStart(2, '0')).join('').substring(0, 16) + '...',
                remainingSafes: remainingSafes - (isSafe ? 1 : 0),
                remainingWeeks: remainingWeeks - 1
            });
            
            console.log(`Week ${week.toString().padStart(2)}: ${isSafe ? '🟢 SAFE' : '🔴 CHOP'} (${probability}% chance) - ${remainingSafes - (isSafe ? 1 : 0)} safes left`);
        }
        
        console.log('\n📊 Final Results:');
        console.log(`Total SAFE weeks: ${safesUsed}`);
        console.log(`Total CHOP weeks: ${this.totalWeeks - safesUsed}`);
        console.log(`Expected SAFE weeks: ${this.totalSafes}`);
        console.log(`✅ Algorithm ${safesUsed === this.totalSafes ? 'PASSED' : 'FAILED'} - Got exactly ${this.totalSafes} SAFE weeks: ${safesUsed === this.totalSafes}`);
        
        return results;
    }

    async testMultipleRuns(numRuns = 100) {
        console.log(`\n🔄 Testing ${numRuns} different seed sets to verify distribution...`);
        
        let safeCountDistribution = {};
        
        for (let run = 0; run < numRuns; run++) {
            // Generate random seeds for this run
            const testSeeds = Array.from({length: 17}, (_, i) => 
                `TEST_RUN_${run}_WEEK_${i+1}_${Math.random().toString(36)}_${Date.now()}`
            );
            
            let safesUsed = 0;
            
            for (let week = 1; week <= this.totalWeeks; week++) {
                const remainingSafes = this.totalSafes - safesUsed;
                const remainingWeeks = this.totalWeeks - (week - 1);
                
                if (remainingSafes === 0) continue;
                if (remainingSafes === remainingWeeks) {
                    safesUsed += remainingSafes;
                    break;
                }
                
                const hashBytes = await this.sha256(testSeeds[week - 1]);
                const hashInt = this.hashToBigInt(hashBytes);
                const maxInt = BigInt(2) ** BigInt(256);
                const threshold = (BigInt(remainingSafes) * maxInt) / BigInt(remainingWeeks);
                
                if (hashInt < threshold) safesUsed++;
            }
            
            safeCountDistribution[safesUsed] = (safeCountDistribution[safesUsed] || 0) + 1;
        }
        
        console.log('\n📈 Distribution of SAFE week counts:');
        Object.keys(safeCountDistribution)
            .sort((a, b) => Number(a) - Number(b))
            .forEach(count => {
                const percentage = (safeCountDistribution[count] / numRuns * 100).toFixed(1);
                const bar = '█'.repeat(Math.floor(percentage / 2));
                console.log(`${count} SAFE weeks: ${safeCountDistribution[count].toString().padStart(3)} runs (${percentage}%) ${bar}`);
            });
        
        const exactlyFive = safeCountDistribution[5] || 0;
        console.log(`\n✅ Runs with exactly 5 SAFE weeks: ${exactlyFive}/${numRuns} (${(exactlyFive/numRuns*100).toFixed(1)}%)`);
        
        return safeCountDistribution;
    }

    async generateCommitment() {
        console.log('\n🔐 Generating SHA-256 commitment for seeds...');
        
        const allSeedsString = this.seeds.join('');
        const commitmentBytes = await this.sha256(allSeedsString);
        const commitmentHex = Array.from(commitmentBytes).map(b => b.toString(16).padStart(2, '0')).join('');
        
        console.log('Commitment hash:', commitmentHex);
        console.log('Verification string:', allSeedsString.substring(0, 100) + '...');
        
        return commitmentHex;
    }
}

// Run tests
async function runAllTests() {
    const tester = new AlgorithmTester();
    
    // Test the actual algorithm with our seeds
    console.log('🎯 TESTING WITH ACTUAL SEASON SEEDS');
    await tester.runFullSeasonTest();
    
    // Generate proper commitment
    const commitment = await tester.generateCommitment();
    
    // Test distribution with random seeds
    await tester.testMultipleRuns(50); // Reduced for browser performance
    
    console.log('\n✅ All tests complete!');
    console.log('\n🔍 To verify any week manually:');
    console.log('1. Hash the seed with SHA-256');
    console.log('2. Convert to BigInt');  
    console.log('3. Compare with threshold: (remaining_safes × 2^256) ÷ remaining_weeks');
    console.log('4. If hash < threshold → SAFE, else CHOP');
    
    return { commitment, tester };
}

// Export for browser or Node.js
if (typeof window !== 'undefined') {
    window.runAllTests = runAllTests;
    console.log('🚀 Run runAllTests() in console to test the algorithm!');
} else {
    module.exports = { AlgorithmTester, runAllTests };
}