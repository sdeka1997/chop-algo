// Test Week 16 with different lowest scores
const crypto = require('crypto');

// Week 16 parameters (after 15 weeks with 4 safes used)
const baseSeed = "MNF_2025_W16_8:15PM_ET_2025-12-22";
const remainingSafes = 1;  // 5 total - 4 used = 1 remaining
const remainingWeeks = 2;  // Weeks 16 and 17 left

console.log("=== Week 16: Testing Different Lowest Scores ===\n");
console.log("Base seed:", baseSeed);
console.log("Remaining safes:", remainingSafes);
console.log("Remaining weeks:", remainingWeeks);
console.log("Probability: 50% SAFE\n");

// Calculate threshold
const maxInt = BigInt(2) ** BigInt(256);
const threshold = (BigInt(remainingSafes) * maxInt) / BigInt(remainingWeeks);
console.log("Threshold (2^255):", threshold.toString());
console.log("=" .repeat(80) + "\n");

// Test various scores
const scoresToTest = [50, 75, 80, 85, 90, 95, 100, 105, 110, 115, 120];

let safeCount = 0;
let chopCount = 0;

scoresToTest.forEach(score => {
    const fullSeed = `${baseSeed}_LOWEST_SCORE_${score}`;
    const hash = crypto.createHash('sha256').update(fullSeed).digest();

    // Convert hash to BigInt
    let hashInt = BigInt(0);
    for (let i = 0; i < hash.length; i++) {
        hashInt = (hashInt << BigInt(8)) + BigInt(hash[i]);
    }

    const isSafe = hashInt < threshold;
    const result = isSafe ? "SAFE ✓" : "CHOP ✗";

    if (isSafe) safeCount++;
    else chopCount++;

    console.log(`Score ${score.toString().padStart(5)}: ${result.padEnd(8)} | Hash: ${hash.toString('hex').substring(0, 16)}...`);
});

console.log("\n" + "=".repeat(80));
console.log(`Results: ${safeCount} SAFE, ${chopCount} CHOP (${(safeCount/scoresToTest.length*100).toFixed(1)}% SAFE)`);
console.log("\nThis shows how different scores produce different hashes,");
console.log("and approximately 50% result in SAFE (as expected with 50% probability).");
