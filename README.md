# Fantasy Survivor League - Mystery SAFE Weeks

A GitHub Pages site that implements a verifiable random system for determining 5 SAFE weeks out of 17 in a fantasy Survivor league, where the lowest-scoring team is eliminated each week except during SAFE weeks.

## The Problem

- **13 teams** in the league need **12 eliminations** over **17 weeks**
- Need exactly **5 SAFE weeks** where no one goes home
- SAFE weeks must be **randomly distributed** and **tamper-proof**
- Results revealed **automatically each Monday at 8 PM ET**

## The Solution: Progressive Draw Algorithm

We use a **progressive draw system** with SHA-256 hashing for verifiable randomness:

1. **Seeds are public**: All 17 weekly seeds published before season start
2. **Each week**: Hash the seed to get a 256-bit random number  
3. **Calculate threshold**: `(remaining_safes × 2^256) ÷ remaining_weeks`
4. **SAFE if**: `hash_value < threshold`, otherwise CHOP
5. **Update counters**: Decrease remaining safes/weeks accordingly

## Why This Works

- **Truly random**: Each week's result depends on actual MNF kickoff data
- **Cannot be gamed**: Even knowing all seeds, you can't predict outcomes until games are scheduled
- **Verifiable**: Anyone can reproduce results with the same math
- **Fair probability**: Probability decreases as SAFES are used (early weeks ~29%, late weeks higher if few safes used)
- **Exciting**: Creates genuine suspense since even the commissioner doesn't know future results

## Seed Format

Seeds use official MNF kickoff information:
```
MNF_2024_W01_TB_DAL_8:15PM_ET_2024-09-09
```

If no MNF game exists, fallback to SNF or latest game of the week.

## Manual Verification

You can verify any week's result yourself:

### Method 1: Online Hash Calculator
1. Go to any SHA-256 calculator (e.g., [sha256-online.com](https://emn178.github.io/online-tools/sha256.html))
2. Input the seed string for that week
3. Get the hex hash and convert to decimal
4. Calculate threshold: `(remaining_safes × 2^256) ÷ remaining_weeks`
5. Compare: hash < threshold = SAFE, otherwise CHOP

### Method 2: JavaScript/Python
```javascript
// JavaScript example for Week 1
async function verifySafe(seed, remainingSafes, remainingWeeks) {
    // Hash the seed
    const encoder = new TextEncoder();
    const data = encoder.encode(seed);
    const hashBuffer = await crypto.subtle.digest('SHA-256', data);
    const hashArray = new Uint8Array(hashBuffer);
    
    // Convert to BigInt
    let hashInt = BigInt(0);
    for (let byte of hashArray) {
        hashInt = (hashInt << BigInt(8)) + BigInt(byte);
    }
    
    // Calculate threshold
    const maxInt = BigInt(2) ** BigInt(256);
    const threshold = (BigInt(remainingSafes) * maxInt) / BigInt(remainingWeeks);
    
    return hashInt < threshold;
}

// Example: Week 1 with 5 safes remaining out of 17 weeks
const seed = "MNF_2024_W01_TB_DAL_8:15PM_ET_2024-09-09";
verifySafe(seed, 5, 17).then(isSafe => {
    console.log(isSafe ? "SAFE" : "CHOP");
});
```

### Method 3: Command Line
```bash
# Get hash
echo -n "MNF_2024_W01_TB_DAL_8:15PM_ET_2024-09-09" | shasum -a 256

# Use Python for bigint math
python3 -c "
import hashlib
seed = 'MNF_2024_W01_TB_DAL_8:15PM_ET_2024-09-09'
hash_bytes = hashlib.sha256(seed.encode()).digest()
hash_int = int.from_bytes(hash_bytes, 'big')
threshold = (5 * (2**256)) // 17
print('SAFE' if hash_int < threshold else 'CHOP')
"
```

## Probability Breakdown

The probability changes each week based on remaining SAFES:

| Week | Safes Left | Weeks Left | Probability |
|------|------------|------------|-------------|
| 1    | 5          | 17         | 29.4%       |
| 2    | 5          | 16         | 31.3%       |
| 2    | 4 (used 1) | 16         | 25.0%       |
| ...  | ...        | ...        | ...         |
| 16   | 1          | 2          | 50.0%       |
| 17   | 1          | 1          | 100.0%      |

## Files in This Repository

- `index.html` - Main site page
- `survivor.js` - Progressive draw algorithm implementation
- `styles.css` - Site styling  
- `seeds.json` - All 17 weekly seeds with SHA-256 commitment
- `results/` - Weekly result files (generated automatically)

## GitHub Pages Setup

1. Enable GitHub Pages in repository settings
2. Site automatically updates each Monday at 8 PM ET
3. Weekly results saved to `results/week_X.json`

## Trust & Transparency

- **Seeds published upfront**: Cannot be changed without breaking commitment hash
- **Algorithm is deterministic**: Same inputs always produce same outputs  
- **Public verification**: Anyone can reproduce results independently
- **No human intervention**: Results calculated automatically from NFL schedule data

## Questions?

The system is designed to be completely transparent. If you have any questions about a week's result, you can verify it yourself using the methods above. The math doesn't lie! 🎲