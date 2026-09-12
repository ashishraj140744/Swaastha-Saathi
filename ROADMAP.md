# Roadmap — Phase 2 (2-week SIH final build)

Tonight's build proves the core loop works end-to-end. These are the
next additions, roughly in priority order, each scoped as its own
feature — not bolted on top of what already works.

## Phase 2A — Depth on what exists
- [ ] Expand knowledge base: more categories, more keyword coverage
      (test-driven — add failing test case, then fix, like we did tonight)
- [ ] Real facility data via government open-data APIs or manual district
      dataset, replacing mock `facilities.json`
- [ ] Voice input (speech-to-text) for low-literacy users — separate ML
      pipeline (ASR), scoped as its own sprint, not squeezed into Phase 1

## Phase 2B — New capabilities
- [ ] Doctor-side dashboard: view incoming triage requests by urgency,
      confirm/override AI suggestions (this is where a real doctor's
      judgment enters the loop — the AI proposes, a human disposes)
- [ ] Referral tracking: once routed, track whether the patient actually
      reached the facility (addresses PS's "referral completion" outcome)
- [ ] Multi-role auth (patient / health worker / doctor / NGO coordinator)

## Phase 2C — Explored but intentionally deferred
- **Lung sound analysis (pneumonia/asthma/croup) via low-cost acoustic
  coupler** — genuinely promising, but this is a *separate ML domain*
  (audio signal processing, not text classification) requiring its own
  data collection, model training, and hardware testing. Scoping this
  correctly means treating it as its own project phase with its own
  timeline, not squeezing it into a 9-hour text-based build.
- **Full multilingual voice I/O** across major Indian languages —
  needs ASR + MT + TTS as three separate integrated systems.
- **Interoperable EHR (ABDM-compliant)** — significant standards and
  compliance work beyond hackathon scope.

## Why this roadmap exists

A judge asking "why doesn't this do X" should hear a scoped, deliberate
answer — not "we ran out of time." Knowing what you *didn't* build, and
why, and when you'd build it, is itself a signal of engineering maturity.
