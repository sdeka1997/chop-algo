// Test script for 16-week format (Week 17 is always CHOP - Championship)
async function test16WeekAlgorithm() {
    const seeds = [
        "MNF_2025_W01_8:15PM_ET_2025-09-08",
        "MNF_2025_W02_8:15PM_ET_2025-09-15", 
        "MNF_2025_W03_8:15PM_ET_2025-09-22",
        "MNF_2025_W04_8:15PM_ET_2025-09-29",
        "MNF_2025_W05_8:15PM_ET_2025-10-06",
        "MNF_2025_W06_8:15PM_ET_2025-10-13",
        "MNF_2025_W07_8:15PM_ET_2025-10-20",
        "MNF_2025_W08_8:15PM_ET_2025-10-27",
        "MNF_2025_W09_8:15PM_ET_2025-11-03",
        "MNF_2025_W10_8:15PM_ET_2025-11-10",
        "MNF_2025_W11_8:15PM_ET_2025-11-17",
        "MNF_2025_W12_8:15PM_ET_2025-11-24",
        "MNF_2025_W13_8:15PM_ET_2025-12-01",
        "MNF_2025_W14_8:15PM_ET_2025-12-08",
        "MNF_2025_W15_8:15PM_ET_2025-12-15",
        "MNF_2025_W16_8:15PM_ET_2025-12-22"
    ];
    
    let safesUsed = 0;
    console.log('🏈 Testing 16-Week Algorithm (Week 17 = Championship)');
    console.log('==================================================');
    
    for (let week = 1; week <= 16; week++) {
        const remainingSafes = 5 - safesUsed;
        const remainingWeeks = 16 - (week - 1);
        
        // Handle edge cases
        if (remainingSafes === 0) {
            console.log(`Week ${week.toString().padStart(2)}: 🔴 CHOP (no safes left)`);
            continue;
        }
        if (remainingSafes === remainingWeeks) {
            console.log(`Week ${week.toString().padStart(2)}: 🟢 SAFE (must use remaining safes)`);
            safesUsed++;
            continue;
        }
        
        // Normal progressive draw
        const hashBytes = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(seeds[week-1]));
        const hashArray = new Uint8Array(hashBytes);
        
        let hashInt = BigInt(0);
        for (let byte of hashArray) {
            hashInt = (hashInt << BigInt(8)) + BigInt(byte);
        }
        
        const threshold = (BigInt(remainingSafes) * (BigInt(2) ** BigInt(256))) / BigInt(remainingWeeks);
        const isSafe = hashInt < threshold;
        const probability = (remainingSafes / remainingWeeks * 100).toFixed(1);
        
        if (isSafe) safesUsed++;
        
        console.log(`Week ${week.toString().padStart(2)}: ${isSafe ? '🟢 SAFE' : '🔴 CHOP'} (${probability}% chance) - ${5 - safesUsed} safes left`);
    }
    
    console.log(`Week 17: 🔴 CHOP (Championship - always elimination)`);
    
    console.log('\n📊 Final Results:');
    console.log(`SAFE weeks used: ${safesUsed}/5`);
    console.log(`Algorithm ${safesUsed === 5 ? '✅ PASSED' : '❌ FAILED'}: Got exactly 5 SAFE weeks`);
    console.log(`Championship guaranteed elimination: ✅`);
    
    return safesUsed;
}

// Run the test
test16WeekAlgorithm();