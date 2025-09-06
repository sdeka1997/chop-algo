# Fantasy Survivor League - Mystery SAFE Weeks

A GitHub Pages site that implements a verifiable random system for determining 5 SAFE weeks out of 16 in a fantasy Survivor league, where the lowest-scoring team is eliminated each week except during SAFE weeks.

## The Problem

- **13 teams** in the league need **12 eliminations** over **17 weeks**
- Need exactly **5 SAFE weeks** (out of weeks 1-16) where no one goes home
- **Week 17** is always CHOP (Championship - must have elimination)
- SAFE weeks must be **randomly distributed** and **tamper-proof**
- Commissioner controls reveal timing each week

## The Solution: Progressive Draw + Lowest Score System

We use a **progressive draw algorithm** with **lowest weekly scores** for unpredictable randomness:

1. **Base seeds published**: All 16 weekly base seeds available upfront for transparency
2. **Each week**: Commissioner enters that week's lowest scoring team's points
3. **Full seed created**: `base_seed + "_LOWEST_SCORE_" + lowest_points`
4. **Hash and compare**: SHA-256 hash compared against threshold using progressive draw
5. **Result revealed**: SAFE or CHOP shown immediately

## Why This Works

- **Unpredictable**: No one can know the lowest score ahead of time
- **Verifiable**: Anyone can reproduce results using published seeds + lowest scores
- **Fair probability**: Uses progressive draw math for decreasing SAFE probability
- **Commissioner controlled**: Results revealed when you choose each week
- **Transparent**: All inputs public, algorithm is deterministic

## Manual Verification

Anyone can verify results using the published base seeds and lowest scores:

### Step-by-Step Verification

**For any revealed week:**

1. **Get the full seed**: `base_seed + "_LOWEST_SCORE_" + score`
   - Example: `"MNF_2025_W01_8:15PM_ET_2025-09-08_LOWEST_SCORE_73.2"`

2. **Calculate SHA-256 hash** of the full seed

3. **Convert hash to 256-bit integer**

4. **Calculate threshold**: `(remaining_safes × 2^256) ÷ remaining_weeks`

5. **Compare**: If hash < threshold → SAFE, otherwise CHOP

### Verification Examples

**JavaScript:**
```javascript
async function verifyWeek(baseSeed, lowestScore, remainingSafes, remainingWeeks) {
    const fullSeed = `${baseSeed}_LOWEST_SCORE_${lowestScore}`;
    
    // Hash the full seed
    const encoder = new TextEncoder();
    const hashBuffer = await crypto.subtle.digest('SHA-256', encoder.encode(fullSeed));
    const hashArray = new Uint8Array(hashBuffer);
    
    // Convert to BigInt
    let hashInt = BigInt(0);
    for (let byte of hashArray) {
        hashInt = (hashInt << BigInt(8)) + BigInt(byte);
    }
    
    // Calculate threshold
    const threshold = (BigInt(remainingSafes) * (BigInt(2) ** BigInt(256))) / BigInt(remainingWeeks);
    
    return hashInt < threshold ? "SAFE" : "CHOP";
}

// Example: Week 1, lowest score was 73.2, 5 safes left out of 16 weeks
verifyWeek("MNF_2025_W01_8:15PM_ET_2025-09-08", 73.2, 5, 16);
```

**Python:**
```python
import hashlib

def verify_week(base_seed, lowest_score, remaining_safes, remaining_weeks):
    full_seed = f"{base_seed}_LOWEST_SCORE_{lowest_score}"
    hash_bytes = hashlib.sha256(full_seed.encode()).digest()
    hash_int = int.from_bytes(hash_bytes, 'big')
    threshold = (remaining_safes * (2**256)) // remaining_weeks
    return "SAFE" if hash_int < threshold else "CHOP"

# Example usage
result = verify_week("MNF_2025_W01_8:15PM_ET_2025-09-08", 73.2, 5, 16)
print(result)
```

**Command Line:**
```bash
# Create full seed and hash it
echo -n "MNF_2025_W01_8:15PM_ET_2025-09-08_LOWEST_SCORE_73.2" | shasum -a 256
```

## How Results Are Revealed

1. **During the week**: Commissioner checks league scores
2. **Input lowest score**: Enter the lowest-scoring team's points on the website
3. **Instant result**: Algorithm runs and shows SAFE or CHOP
4. **Next week**: Input field updates for the next unrevealed week

## Base Seeds (Published)

All base seeds are available in [`seeds.json`](seeds.json):

```
Week 1: "MNF_2025_W01_8:15PM_ET_2025-09-08"
Week 2: "MNF_2025_W02_8:15PM_ET_2025-09-15"
...
Week 16: "MNF_2025_W16_8:15PM_ET_2025-12-22"
```

## Progressive Probability

The probability of SAFE decreases as safes are used:

| Scenario | Safes Left | Weeks Left | SAFE Probability |
|----------|------------|------------|------------------|
| Week 1 | 5 | 16 | 31.3% |
| Week 5 (if 1 used) | 4 | 12 | 33.3% |
| Week 10 (if 3 used) | 2 | 7 | 28.6% |
| Week 15 (if 4 used) | 1 | 2 | 50.0% |
| Week 16 (if 4 used) | 1 | 1 | 100.0% |

## Files in This Repository

- `index.html` - Main site with input system
- `survivor.js` - Progressive draw algorithm
- `styles.css` - Site styling  
- `seeds.json` - Base seeds for transparency
- `README.md` - This documentation

## Trust & Verification

- ✅ **Base seeds published upfront** - Cannot be changed
- ✅ **Lowest scores are public** - Verifiable from league results  
- ✅ **Algorithm is deterministic** - Same inputs = same outputs
- ✅ **Math is transparent** - Anyone can reproduce calculations
- ✅ **No manipulation possible** - Commissioner can't influence randomness

The system is completely fair and verifiable while maintaining weekly suspense! 🏈