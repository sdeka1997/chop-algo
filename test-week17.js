// Test Week 17 calculation with actual SHA-256 algorithm
const crypto = require('crypto');

// Week 17 parameters
const baseSeed = "MNF_2025_W17_8:15PM_ET_2025-12-29";
const lowestScore = 100;
const fullSeed = `${baseSeed}_LOWEST_SCORE_${lowestScore}`;

// Algorithm parameters (after 16 weeks with 4 safes used)
const remainingSafes = 1;  // 5 total - 4 used = 1 remaining
const remainingWeeks = 1;  // Only week 17 left

console.log("=== Week 17 SHA-256 Calculation ===\n");
console.log("Full seed:", fullSeed);
console.log("Remaining safes:", remainingSafes);
console.log("Remaining weeks:", remainingWeeks);
console.log();

// Calculate SHA-256 hash
const hash = crypto.createHash('sha256').update(fullSeed).digest();
console.log("SHA-256 hash (hex):", hash.toString('hex'));
console.log();

// Convert hash to BigInt
let hashInt = BigInt(0);
for (let i = 0; i < hash.length; i++) {
    hashInt = (hashInt << BigInt(8)) + BigInt(hash[i]);
}
console.log("Hash as BigInt:", hashInt.toString());
console.log();

// Calculate threshold: (remaining_safes * 2^256) / remaining_weeks
const maxInt = BigInt(2) ** BigInt(256);
const threshold = (BigInt(remainingSafes) * maxInt) / BigInt(remainingWeeks);

console.log("Max possible value (2^256):", maxInt.toString());
console.log("Threshold:", threshold.toString());
console.log();

// Determine if SAFE or CHOP
const isSafe = hashInt < threshold;
const probability = (remainingSafes / remainingWeeks * 100).toFixed(1);

console.log("=== RESULT ===");
console.log("Hash < Threshold?", hashInt < threshold);
console.log("Week 17 is:", isSafe ? "SAFE ✓" : "CHOP ✗");
console.log("Probability was:", probability + "%");
console.log();

// Show the comparison
console.log("Mathematical guarantee:");
console.log("Since remaining_safes (1) = remaining_weeks (1),");
console.log("threshold = 2^256, which is larger than ANY possible hash.");
console.log("Therefore, week 17 is GUARANTEED to be SAFE!");
