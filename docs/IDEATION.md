# Why Crate exists

Developed by Ajnas N B

Crate helps an independent bookstore prepare two separately staffed cultural stalls that depart simultaneously. It proposes books from one stock pool, preserves shop reserves and editorial decisions, and produces packing manifests. The concept is provisional: the workflow is supported by public examples, but willingness to adopt Crate and the value of its live Qloo results remain unvalidated.

## Sixteen rounds of proposal and criticism

This is a decision ledger, not a transcript, customer research, or a record of sixteen product experiments.

| Round | Question or criticism | Resulting decision |
| --- | --- | --- |
| 1 | Which specific jobs need cultural intelligence? | Compare bookstore merchandising, cultural partnerships, and library outreach. Prefer a bounded stock-backed bookstore task. |
| 2 | Are partnership and group-recommendation tools already common? | Existing partnership concepts weaken that direction; compare venue recovery against a shelf planning tool. |
| 3 | What can the API and optimizer honestly support? | Use a fixed candidate inventory. Compare ranks within a query, never raw scores across independent queries or purchase probabilities. |
| 4 | Is inventory merchandising real, or invented demand? | Existing Edelweiss and NoveList workflows confirm the broad job and serious competition. Their existence does not validate demand for Crate. |
| 5 | What survives established inventory and campaign tools? | Narrow to selecting stock for cultural pop-ups, where explicit external cultural anchors can matter. |
| 6 | What identity and baseline assumptions could invalidate results? | Match book titles with author disambiguation; do not promise ISBN-level Qloo matching. Use supported book parameters and an honest oldest-stock baseline. |
| 7 | Do two events really compete for the same copies? | Require simultaneous departure with separate staff. Sequential events otherwise can reuse unsold stock. |
| 8 | Is an agent merely decorative? | Make evidence acquisition, input resolution, targeted re-query, constraint checks, and repair visible. A lineup is an audience hypothesis, not observed attendee taste. |
| 9 | Can repair preserve the bookseller's work? | Use bounded exact allocation with explicit decisions; preserve editorial and packed-crate constraints and minimize avoidable changes. |
| 10 | Can judges try a concrete example before API access arrives? | Use twelve real bibliographic pairs, fictional stock, and two clearly fictional events. Label every synthetic ranking. |
| 11 | How can an impressive demo avoid misleading judges? | Maintain source labels, show evidence and failures, and define short end-to-end acceptance gates. |
| 12 | How large must the backend be? | Keep it bounded and stateless. Considered signed result receipts as an integrity aid, without making them a prerequisite. |
| 13 | Is there enough evidence to build? | Conditional accept for a small planning prototype. Gate cultural-value claims on live API and customer evaluation. |
| 14 | Is a strong concept already a strong submission? | Separate qualitative concept assessment from demonstrated implementation, design, and impact. No win probability is justified. |
| 15 | Which architecture is proportionate to the product? | Treat the plan as a browser-owned artifact; unnecessary receipt signing is outside scope. Keep live Qloo proof a submission gate. |
| 16 | Can a judge reach a credible live result quickly? | Keep Crate, but require a reviewed starter catalogue with genuine entity mappings after access arrives. Fetch fresh rankings rather than embedding purported live results. Verify a non-adaptation selection, differences between programmes, a live external-tool call, and stock-safe repair before submission. |

## Evidence and hypotheses

**Public evidence:** booksellers operate pop-ups and select event-specific stock. A Cappella advertised a cinema-lobby sale selected around film and Hollywood; Small Print describes a mobile bookstore attending markets and cultural events. These examples establish that the workflow exists, not that these businesses use, endorse, or need Crate.

- [A Cappella's film-book pop-up](https://www.acappellabooks.com/pages/events/1525/a-cappella-at-the-movies-a-film-book-pop-up-sale)
- [Small Print Books](https://www.smallprintbooks.com/)

**Established competition:** Edelweiss offers inventory analytics and targeted book marketing; NoveList offers collection-aware reading recommendations. Crate cannot claim that stock-aware recommendations or campaign tools are new.

- [American Booksellers Association business services](https://www.bookweb.org/membership/business-services)
- [Edelweiss360 inventory-aware campaign workflow](https://analytics-help.edelweiss.plus/?page_id=6712)
- [NoveList Select](https://about.ebsco.com/novelist/products/novelist-select)
- [Public Library Association on displays and overlooked titles](https://www.ala.org/pla/education/onlinelearning/webinars/ondemand/passive-readers-advisory)
- [Ingram on inventory turns](https://marketing.ingramcontent.com/mrkng/documents/retailers/turning-inveltory.pdf)

**Unvalidated hypotheses:** explicit film/artist anchors can help a bookseller discover useful non-adaptation book choices; a shared stock plan reduces preparation work; live Qloo rankings improve those choices compared with existing practice. No sales uplift, adoption, measured time saving, attendee preferences, or customer testimonials are claimed.

## Boundaries

Two simultaneous stalls; up to eighteen local stock records; user-chosen cultural anchors; quantities, reserves, pins, vetoes, locks, repair, and manifests. No event discovery, purchasing, ticket sales, customer profiling, artist sponsorship, demand forecasts, or external messages. No unsupported literary interpretations are generated from affinities.

The sample events Future Frequencies and Soul & City are fictional. Their artists and films have no association with this project. Sample prices, quantities, reserves, shelf ages, and all simulation rankings are authored fixtures. The bibliographic pairs are real; examples can be checked against [Le Guin's bibliography](https://www.ursulakleguin.com/bibliography), [Butler's official site](https://www.octaviabutler.com/frequentlyaskedquestions), [Baldwin's publisher](https://www.penguinrandomhouse.com/books/761984/james-baldwin-3-book-box-set-by-james-baldwin/), and [Piranesi's publisher](https://www.bloomsbury.com/uk/piranesi-9781526634108/).

## Remaining decision gate

An API access request has been submitted, but no working key or live result was available when this ledger was written. The central risk is that Qloo coverage or affinity results are weak for a small, fixed bookstore inventory. If that occurs, the allocation tool may remain useful while the proposed cultural intelligence advantage fails. Do not conceal that result by replacing live output with a synthetic fixture.

Official references: [hackathon requirements](https://qloo.devpost.com/), [rules](https://qloo.devpost.com/rules), [developer guide](https://docs.qloo.com/reference/qloo-llm-hackathon-developer-guide), [entity-specific parameters](https://docs.qloo.com/reference/available-parameters-by-entity-type).
