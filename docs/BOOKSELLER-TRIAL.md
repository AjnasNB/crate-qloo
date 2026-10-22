# Exploratory bookseller trial

Developed by Ajnas N B. Protocol prepared October 22, 2026, before collecting participant results.

**Status: recruitment preparation; no completed bookseller trials, measured customer benefit or sales results.** A software test or a developer rehearsal must not be entered as a bookseller result. The workbook route is `/trial`; verify the public deployment before inviting participants. Recruitment records and participant reports stay outside this public repository.

## Questions and scope

1. Does a bookseller actually prepare simultaneous, separately staffed event stalls from shared stock? How often do conflicts or late stock changes occur? A negative answer is useful problem-discovery evidence.
2. On a small real stock subset, can they create and repair a feasible plan with Crate, and how long does their first use take including inventory preparation and reviewed Qloo matching?
3. Which suggestions would they keep, reject or change, and why? Do cultural anchors describe their audience adequately?

Recruit up to three independent adult booksellers initially. This is a convenience sample and an exploratory usability comparison, not a representative study or proof of sales lift. A session with hypothetical event briefs must be called hypothetical even when the reviewer and stock are real. An actual event deployment is a separate field trial.

## Invitation and consent

Ask for a session of up to 45 minutes with a firm stop at the agreed time; incomplete tasks are valid findings. Allow a shorter problem-discovery conversation if that is all the participant can offer. No payment, purchase, account, stock-system access or positive review is required. Participation is voluntary; they may stop and return an incomplete report. Explain that Ajnas N B is the developer and the purpose is to find failures before the hackathon deadline, not to obtain an endorsement.

Use an anonymous session code. Do not request customer data, margins, supplier credentials or full stock databases. A freely chosen 8–18-title subset is sufficient. The browser workbook does not transmit reports automatically; explicit local save/download and an optional email reply are separate actions. Confirm permission privately before publishing any identifiable shop name, quotation, stock file or screenshot. Permission to participate does not grant permission to publish identifying details.

## Before comparing methods

- Record the participant's role, event experience, whether simultaneous stalls happen in their work, and whether the briefs describe actual events or hypothetical exercises.
- Agree on two briefs, 3–6 display titles per stall, available copies, shop reserves and one editorial must-have or veto. Crate allocates one copy of a title per stall and accepts at most 18 titles. It is not a complete inventory system.
- Freeze a copy of the input CSV, briefs and constraints privately. Do not choose only titles already mapped in the starter demo. Count unmapped, unsupported or ambiguous titles and all search/setup time. Never force an incorrect identity or silently discard a difficult title.
- Before seeing the recommendations, agree how to judge a title as keep/change/reject for each brief. Keep the denominator for each stall. These are one bookseller's judgments, not attendees' preferences or buying behavior.
- Prefer two comparable cases with the same workload. Randomly assign cases to methods and record that assignment; alternate manual-first or Crate-first across participants. Give equal practice using unrelated data. If only one case is available, label its repeated use as a learning-confounded rehearsal. Counterbalancing in a tiny sample does not remove this limitation. Record coaching, interruptions, prior familiarity and software failures. Agree a 15-minute planning/setup limit and a 5-minute repair limit per method before starting; retain timed-out attempts.

## Procedure

1. **Manual plan:** using the agreed stock and briefs, prepare both lists by the shop's normal method without seeing Crate's suggestions. Time from the task instruction until the participant says both lists are ready. Record unfinished attempts, over-allocations, reserve violations and missing required choices. Retain the actual lists.
2. **Manual repair:** apply this predeclared disruption rule: in local SKU order, take the first title allocated to A but not B. Exhaust its available copies (quantity becomes the shop reserve) and protect the already-packed B list. Time the repair, then retain both lists and count changed title–stall placements. If there is no qualifying title or no feasible substitute under the frozen constraints, record N/A/task mismatch or the impossible constraint; do not skip to an easier SKU or score an unallocated title as a completed zero-work repair. A correct refusal is useful evidence but is separate from a successful-repair timing comparison.
3. **Crate setup:** start the setup clock before preparing/importing the CSV or confirming Qloo identities. Import the agreed subset, edit the two briefs, select live Qloo, and review each book/anchor match. Include retries, ambiguity, rate-limit waiting and all facilitator help. Imported mappings and decisions reset on reload; record any resulting lost work. Do not pre-complete mapping off-clock.
4. **Crate plan:** time planning through inspection, editorial changes and export until both lists are usable or the participant stops. Save the manifest and evidence snapshot. Record Qloo mode, snapshot time, matched/returned candidate counts, rejected choices and constraint errors. A failed live query stays a failure; simulation cannot stand in for live completion.
5. **Crate repair:** apply the same predeclared disruption rule to this method's own case and selections, rather than automatically removing the manual method's title. Time repair, inspection and export; retain the repaired manifest and compare changes and errors. Record the affected SKU and frozen constraints. Document N/A/task mismatch if no qualifying allocated title exists, without treating an untouched list as successful repair.
6. **Review:** ask what they would keep, what is irrelevant, the hardest step, and whether they would use it for a real event. Ask why not as directly as why. Do not coach a positive rating. Record their words accurately; let them correct the notes. Self-ratings by the participant are not independent relevance evidence. Where a second bookseller is available, shuffle and anonymize initial Crate suggestions, final edited choices and manual title–event pairs; conceal method/rank and request 0 unsuitable / 1 weak / 2 plausible / 3 would pack / unfamiliar-cannot-judge ratings and reasons. Keep initial and edited outcomes separate. Record whether this stronger assessment happened.

Run the two methods in the assigned order. Use the workbook timers where available; label every measure as client-timed/self-reported unless independently observed. Keep preparation and help time visible. An abandoned attempt belongs in the denominator.

## Measures fixed before recruitment

| Measure | Definition and reporting |
| --- | --- |
| First-use effort | Crate setup + plan + repair seconds, alongside manual plan + repair seconds. Show both totals and individual components. If either method is incomplete, do not compute a speedup. |
| Repeated task effort | Plan and repair components without setup, explicitly labeled as excluding setup. Never present this as first-use savings. |
| Feasibility | Number of over-allocated copies, reserve violations, protected-crate changes and missing requirements, assessed from retained inputs/lists. Record unknown checks as unknown, not zero. |
| Editorial acceptance | Kept title–stall placements / all rated placements for each method and brief, plus change/reject reasons. An unreturned or unrated title is not automatically accepted. |
| Repair disruption | Removed + added title–stall placements, and whether B stayed identical. One replacement counts as two changes. |
| Cultural coverage | Confirmed work-level book identities / input titles, returned ranks / candidates per query, and setup/relevance failures. Coverage is not a relevance score. |
| Problem fit | Actual workflow frequency, willingness to use, reasons against use and required missing capabilities. No inferred endorsement. |

For 1–3 sessions, publish individual paired values and sample size, optionally median and range. Do not report statistical significance, population-wide benefits, conversion or sales impact. A Qloo-vs-manual comparison cannot isolate Qloo's causal contribution from the solver, interface and learning. A separate blinded ranking comparison would be needed for that claim.

## Improvement and publication gate

Preserve all recruited/started/completed/abandoned counts and negative feedback. Log each reproducible blocker, fix it in a coherent commit and repeat the affected task; keep the original result and the follow-up separate. Do not replace an unfavorable first-use result with the improved repeat.

Only after a genuine report arrives: verify participant role/consent privately, inspect evidence and completeness, resolve inconsistent timings, and ask permission for the exact public summary. Update the existing Devpost entry with sample size, date, measured task, findings, fixes and limitations. If no one completes before the deadline, say recruitment was attempted and customer outcomes remain unmeasured. No manufactured users, quotations, scores or winning probabilities.

The [official criteria](https://qloo.devpost.com/) judge implementation, design, impact and idea quality. The deadline is October 30, 2026 at 11:45 p.m. EDT (October 31, 9:15 a.m. IST). A result should reach the developer by October 28 when possible to allow fixes and verification; this is a requested response target, not an obligation.
