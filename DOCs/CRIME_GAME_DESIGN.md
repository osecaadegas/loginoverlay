# Crime Game — Balanced Progression & Success System

## 1. Core Formulas

### Success Rate

```
successChance = base
  + levelBonus(playerLevel, crimeMinLevel)
  + skillBonus(relevantSkills)
  - difficultyPenalty
  + hpModifier
  - heatPenalty
```

Clamped to **[5, 95]**.

| Component | Formula | Range |
|---|---|---|
| **Level bonus** | `min((playerLevel - crimeMinLevel) * 1.5, 12)` when over-leveled; `(diff * 4)` penalty when under | -40 … +12 |
| **Skill bonus** | `primarySkill^0.7 * 0.55 + secondarySkill^0.7 * 0.25` (diminishing returns) | 0 … ~18 |
| **Difficulty penalty** | Built into `base` per crime tier (see table below) | — |
| **HP modifier** | `-((0.5 - hpPct) * 15)` when HP < 50% | -7.5 … 0 |
| **Heat penalty** | `min(failsToday * 2.5, 12.5)` | 0 … -12.5 |

### Diminishing Returns Curve

Using `skill^0.7` means:

| Skill Level | Effective Value | Marginal Gain |
|---|---|---|
| 10 | 5.0 | — |
| 25 | 9.4 | +4.4 |
| 50 | 15.3 | +5.9 |
| 75 | 20.3 | +5.0 |
| 100 | 25.1 | +4.8 |

Skills matter a lot early on, then taper — you can't cheese difficulty with raw skill alone.

### XP & Leveling

```
xpToNextLevel = 100 * (level ^ 1.65)
```

| Level | XP Required | Cumulative |
|---|---|---|
| 1→2 | 100 | 100 |
| 5→6 | 1,467 | 4,218 |
| 10→11 | 4,467 | 20,145 |
| 25→26 | 18,119 | 186,640 |
| 50→51 | 56,759 | 1,123,456 |

**Tuning knobs:**
- Make game **easier**: lower exponent to `1.5`
- Make game **harder**: raise to `1.8`
- Faster early game: lower base from `100` to `75`

### Crime XP Reward

```
xpReward = crime.baseXP * (1 + relevantSkillAvg * 0.003)
```

Skilled players earn slightly more XP (up to +30% at max skills).

---

## 2. Crime Tiers & Example Crimes

| Tier | Base Success | Min Level | Jail (fail) | Example |
|---|---|---|---|---|
| **Petty** | 70% | 1 | 2 min | Pickpocket |
| **Minor** | 55% | 8 | 5 min | Shoplifting |
| **Moderate** | 42% | 20 | 10 min | Car Theft |
| **Major** | 30% | 40 | 20 min | Armed Robbery |
| **Elite** | 20% | 70 | 35 min | Bank Heist |
| **Legendary** | 12% | 100 | 60 min | Casino Vault |

### Skill Dependencies

| Crime | Primary Skill | Secondary Skill |
|---|---|---|
| Pickpocket | stealth | dexterity |
| Shoplifting | stealth | charisma |
| Car Theft | hacking | dexterity |
| Armed Robbery | strength | intimidation |
| Bank Heist | hacking | intelligence |
| Casino Vault | intelligence | stealth |

---

## 3. Risk vs. Reward Table

| Crime | Cash Reward | XP | Fine on Fail | HP Loss |
|---|---|---|---|---|
| Pickpocket | $50–$200 | 10 | $25 | 3 |
| Shoplifting | $200–$800 | 25 | $100 | 5 |
| Car Theft | $1K–$5K | 60 | $500 | 8 |
| Armed Robbery | $5K–$25K | 120 | $2K | 15 |
| Bank Heist | $25K–$100K | 250 | $10K | 25 |
| Casino Vault | $100K–$500K | 500 | $50K | 40 |

**Design principle:** reward scales ~5× per tier, penalty scales ~4×, so risk/reward ratio increases with difficulty.

---

## 4. Anti-Spam: Stamina System

- Max stamina: `50 + (level * 2)` → level 1 has 52, level 50 has 150
- Regen: 1 stamina every 3 minutes
- Crime costs: Petty = 1, Minor = 2, Moderate = 3, Major = 5, Elite = 8, Legendary = 12
- **Bonus:** skill training also costs stamina (2–3 per session)

---

## 5. Balancing Tuning Guide

| Want to... | Change |
|---|---|
| Make skills matter more | Raise `0.55`/`0.25` skill weights or lower the `0.7` exponent |
| Make skills matter less | Lower weights or raise exponent toward `0.85` |
| More forgiving for new players | Raise petty/minor base success by 5–10% |
| Harder endgame | Lower elite/legendary base by 3–5% |
| Faster leveling | Lower XP exponent from `1.65` to `1.5` |
| Slower leveling | Raise to `1.8` |
| Less RNG-dependent | Narrow the clamp to `[15, 85]` |
| More RNG chaos | Widen to `[3, 97]` |
| Punish spam harder | Increase heat penalty multiplier from `2.5` to `4` |
