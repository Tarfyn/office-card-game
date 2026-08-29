# Office Card Game — Five Starter Audit v7.35

## Method
- Five starter decks, all ten pairings.
- Four games per pairing for the quick matrix: each pairing covers both P1/P2 seat assignments and both opening-player assignments independently.
- Seed: 73501; 24-turn / 1400-step cap.
- Heuristic bot output is directional only and is not treated as final human balance truth.

## Quick matrix before Production adjustment
- Customer Service: 3–10 across decisive games in this tiny matrix.
- IT: 6–7.
- Office: 5–8.
- Marketing: 6–7.
- Production: 13–1 (92.9%), consistent with the older ~73.9% heuristic warning.

## Conservative Production starter adjustment
- PRD-007 Shift Lead: 3 → 2 copies.
- PRD-009 Full Production: 3 → 2 copies.
- PRD-006 Maintenance Technician: 2 → 3 copies.
- PRD-015 Packaging Machine: 1 → 2 copies.
- Deck remains exactly 40 cards. No card definition changed.

## Production re-test
Four Production matchups, same seed family and four seat/opener combinations per pairing: Production finished 11–4 (73.3%) across decisive games with one timeout. Still a watch item, but materially less extreme.

## Current interpretation
- Customer Service improved materially versus IT in v7.34 but remains harder for the heuristic to pilot across other matchups; human feedback is required before card buffs.
- Production remains the clearest power/ease-of-piloting watch item.
- IT, Office and Marketing sit closer together in the tiny matrix and receive no list changes in this pass.
