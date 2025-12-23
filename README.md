# Fantasy Survivor League - Mystery SAFE Weeks

A GitHub Pages site that implements a verifiable random system for determining 5 SAFE weeks out of 17 in a fantasy Survivor league, where the lowest-scoring team is eliminated each week except during SAFE weeks.

## The Problem

- **13 teams** in the league need **12 eliminations** over **17 weeks**
- Need exactly **5 SAFE weeks** (out of 17 weeks) where no one goes home
- SAFE weeks must be **randomly distributed** and **manipulation-proof**
- Commissioner controls reveal timing each week

## The Solution: Progressive Draw + MNF Score System

We use a **progressive draw algorithm** with **Monday Night Football total scores** for manipulation-proof randomness:

1. **Base seeds published**: All 17 weekly base seeds available upfront for transparency
2. **Each week**: System fetches the MNF game's final total score from ESPN API
3. **Full seed created**: `base_seed + "_MNF_TOTAL_" + mnf_total_points`
4. **Hash and compare**: SHA-256 hash compared against threshold using progressive draw
5. **Result revealed**: SAFE or CHOP shown immediately
6. **Elimination**: On CHOP weeks, the lowest fantasy scorer is eliminated

## Why This Works

- **Manipulation-Proof**: No fantasy team can control NFL game outcomes
- **Unpredictable**: MNF scores unknown until Monday night
- **Verifiable**: Anyone can reproduce results using published seeds + official NFL scores
- **Fair probability**: Uses progressive draw math for decreasing SAFE probability
- **Transparent**: All inputs public, algorithm is deterministic
- **No gaming**: Fantasy teams can't manipulate their scores to affect SAFE/CHOP outcomes

## Manual Verification

Anyone can verify results using the published base seeds and official NFL MNF scores:

### Step-by-Step Verification

**For any revealed week:**

1. **Get the MNF total score**: Check official NFL box score for combined points
   - Example: Chiefs 27, Steelers 24 → Total = 51

2. **Get the full seed**: `base_seed + "_MNF_TOTAL_" + mnf_score`
   - Example: `"MNF_2025_W01_8:15PM_ET_2025-09-08_MNF_TOTAL_51"`

3. **Calculate SHA-256 hash** of the full seed

4. **Convert hash to 256-bit integer**

5. **Calculate threshold**: `(remaining_safes × 2^256) ÷ remaining_weeks`

6. **Compare**: If hash < threshold → SAFE, otherwise CHOP

### Verification Examples

**JavaScript:**
```javascript
async function verifyWeek(baseSeed, mnfTotal, remainingSafes, remainingWeeks) {
    const fullSeed = `${baseSeed}_MNF_TOTAL_${mnfTotal}`;

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

// Example: Week 1, MNF total was 51, 5 safes left out of 17 weeks
verifyWeek("MNF_2025_W01_8:15PM_ET_2025-09-08", 51, 5, 17);
```

**Python:**
```python
import hashlib

def verify_week(base_seed, mnf_total, remaining_safes, remaining_weeks):
    full_seed = f"{base_seed}_MNF_TOTAL_{mnf_total}"
    hash_bytes = hashlib.sha256(full_seed.encode()).digest()
    hash_int = int.from_bytes(hash_bytes, 'big')
    threshold = (remaining_safes * (2**256)) // remaining_weeks
    return "SAFE" if hash_int < threshold else "CHOP"

# Example usage
result = verify_week("MNF_2025_W01_8:15PM_ET_2025-09-08", 51, 5, 17)
print(result)
```

**Command Line:**
```bash
# Create full seed and hash it
echo -n "MNF_2025_W01_8:15PM_ET_2025-09-08_MNF_TOTAL_51" | shasum -a 256
```

## How Results Are Revealed

1. **After MNF**: System automatically fetches the MNF game's final total score from ESPN API
2. **Click reveal**: Commissioner clicks the "Reveal" button for the week
3. **Instant result**: Algorithm runs using MNF score and shows SAFE or CHOP
4. **Elimination**: On CHOP weeks, the lowest fantasy scorer is eliminated
5. **Next week**: Reveal button updates for the next week

## Base Seeds (Published)

All base seeds are available in [`seeds.json`](seeds.json):

```
Week 1: "MNF_2025_W01_8:15PM_ET_2025-09-08"
Week 2: "MNF_2025_W02_8:15PM_ET_2025-09-15"
...
Week 16: "MNF_2025_W16_8:15PM_ET_2025-12-22"
Week 17: "MNF_2025_W17_8:15PM_ET_2025-12-29"
```

## Progressive Probability

The probability of SAFE decreases as safes are used:

| Scenario | Safes Left | Weeks Left | SAFE Probability |
|----------|------------|------------|------------------|
| Week 1 | 5 | 17 | 29.4% |
| Week 5 (if 1 used) | 4 | 13 | 30.8% |
| Week 10 (if 3 used) | 2 | 8 | 25.0% |
| Week 15 (if 4 used) | 1 | 3 | 33.3% |
| Week 16 (if 4 used) | 1 | 2 | 50.0% |
| Week 17 (if 4 used) | 1 | 1 | 100.0% |

## Files in This Repository

- `index.html` - Main site with input system
- `survivor.js` - Progressive draw algorithm
- `styles.css` - Site styling  
- `seeds.json` - Base seeds for transparency
- `README.md` - This documentation

## Trust & Verification

- ✅ **Base seeds published upfront** - Cannot be changed
- ✅ **MNF scores are official NFL data** - Publicly verifiable, impossible to manipulate
- ✅ **Algorithm is deterministic** - Same inputs = same outputs
- ✅ **Math is transparent** - Anyone can reproduce calculations
- ✅ **No gaming possible** - Fantasy teams cannot affect NFL game outcomes
- ✅ **Elimination is fair** - Lowest fantasy scorer goes home on CHOP weeks

The system is completely fair, manipulation-proof, and verifiable while maintaining weekly suspense! 🏈