# Terra Trust

A proof-of-concept agricultural data trust for cocoa cooperatives, built on **synthetic data only**. It explores how farmer consent, a fiduciary data trust and an aggregate-only buyer portal could fit together, and how such a system can be tested.

## What it is, and what it is not

It is a small research prototype. It runs in the browser, with no backend and no API keys. All state lives in memory and `localStorage`.

It is not deployed. It has no real users, farmers, cooperatives, buyers or coordinates. Every record is invented by a seeded random generator. It is not legal advice, and it makes no claim of compliance with the EU Deforestation Regulation or any other law. The role switcher is a demonstration aid, not access control.

## The governance model

Three layers:

1. **Farmer cooperatives** are first-mile stewards. Each farmer holds consent for each data category (coarse plot location, yield, price received) and each purpose (EUDR due diligence, price benchmarking, supply chain planning). A cell is set to *no sharing*, *aggregate results only*, or *aggregate, including per-cooperative results*. Farmers can change consent on the web or on a simulated feature phone (USSD). Both write to the same ledger, and a change applies to the next query.
2. **The data trust** is a fiduciary entity. It sets the minimum group size, applies the policy engine to every query, keeps the audit log, and splits query fees between farmers, cooperatives and the trust. The percentages are adjustable and the default favours farmers.
3. **The buyer query portal** lets a buyer choose a purpose and a question and returns aggregates only. Buyers never see individual records or cohort sizes.

The policy engine runs five checks in order and stops at the first failure:

1. The request is well formed and uses only allowed filters.
2. The buyer is approved for the purpose, and the question fits the purpose.
3. At least one farmer in the selection has consented.
4. Every group has at least *k* consenting farmers (default 10, configurable on the Policy screen).
5. The answer cannot be differenced against the buyer's earlier answers.

The engine is a pure function in `src/core/policyEngine.js`, separate from the interface, so it can be tested without a browser.

The app has three role views: Farmer, Cooperative and Trust, and Buyer.

## Run it

```
npm install
npm run dev        # local development server
npm test           # unit tests, including the adversarial evaluation cases
npm run build      # production build into dist/
npm run preview    # serve the production build locally
```

Needs Node.js 22.12 or later (Vitest 5 requires it). The only runtime dependencies are React and React DOM. Tests use Vitest.

## Tests

`npm test` covers the seeded generator, the consent ledger, the USSD state machine, the policy engine, the differencing guard, revenue arithmetic, the audit filters, the data card, the scorecard and the evaluation cases. It also checks the colour contrast of the design tokens, that every screen renders, and that the repository contains no em dashes, secrets, email addresses or network calls.

## Threat model

Protected: what a buyer can learn about individual farmers through the portal, and the use of data for purposes farmers did not allow.

Adversaries considered:

- **Curious buyer.** Narrows filters until one person remains. Response: a minimum group size on every group, coarse filters only, no identifier filters, and counts protected too.
- **Repeating buyer.** Asks nearly the same question twice and subtracts the answers. A consent withdrawal between two queries has the same effect. Response: a new answer is refused if the farmers behind it differ from those behind any earlier answer to the same buyer, on the same kind of data, by more than zero and fewer than *k*.
- **Purpose-creeping buyer.** Response: buyer approval per purpose, a rule for which questions fit which purpose, and consent per farmer per category and purpose.

Assumed trusted: the trust, cooperative staff, and the browser running the code.

Out of scope, and recorded as known gaps: groups where everyone shares the same value; buyers who pool answers; combinations of many queries; formal privacy guarantees such as differential privacy; refusals that are themselves a signal; and network, device and insider attacks. The controls here are heuristics, not guarantees.

## Evaluation harness

`src/core/evaluation/` holds 27 adversarial cases written as data. Each is a short sequence of queries and consent changes, with an expected outcome for every query. Each case runs on a fresh copy of a small hand-built fixture, so group sizes are exact and results do not depend on random data or on app state. The harness drives the same `submitQuery` function the portal uses.

- 25 cases are scored: re-identification, small cohorts, differencing sequences, purpose and consent violations, and consent withdrawal mid-session. Some are controls that must be released, so over-refusal is caught as well as leaks.
- 2 cases are documented gaps: a homogeneous group, and two buyers pooling answers. They state the outcome a stronger system would give. They are reported separately and are not in the pass rate. A test fails if one starts passing, so the documentation gets updated.
- The Evaluation screen shows pass or fail for each case and the overall pass rate. `npm test` runs the same cases.
- Tests also check that the harness can fail: disabling the differencing history, or bypassing the minimum group size, makes the expected cases fail.

The expectations were written from the threat model by the same author as the engine. A pass shows the engine does what was intended and will catch regressions. It is not evidence of security against a determined attacker.

## AI-readiness scorecard and data card

The scorecard assesses the synthetic dataset against the sub-criteria of the Open Data Institute's [A framework for AI-ready data](https://theodi.org/insights/reports/a-framework-for-ai-ready-data/) (version 2, December 2025). The criteria are taken from the ODI's table without additions, and a test fails if they change. The statuses and evidence are this project's own self-assessment. The framework text used here gives no scoring method, so none is invented: the scorecard shows a status per criterion and simple counts. It is informed by the framework. It does not implement it or claim conformance.

The data card is a JSON-LD file using schema.org and MLCommons [Croissant](https://github.com/mlcommons/croissant) terms, with a CSV export of the farmer table. Both can be downloaded from the AI-readiness screen. To repeat the development check with the Croissant reference library:

```
node scripts/export-card.mjs card-out
python3 -m venv .venv && . .venv/bin/activate && pip install mlcroissant
python scripts/validate-croissant.py card-out
```

With mlcroissant 1.1.1 this reported no errors and read all 300 records through the card. It gave one warning: `datePublished` is recommended and is left out, because the dataset has not been published. The app itself does not run this check.

## Known limitations

- The differencing guard compares pairs of answers per buyer. It does not stop combinations of queries, or buyers working together. A withdrawal can block a buyer's repeat of a similar query until the selection changes.
- There is no noise and no formal privacy method. Group-size thresholds are not a safe harbour, and 10 is a default, not a standard.
- Refusal messages avoid exact counts, but a refusal can still tell a buyer something.
- Data is not calibrated to any real market, survey or location. Prices, yields and consent profiles are invented.
- State is stored in the browser and is capped (audit log 2,000 entries, consent events 1,000). Clearing browser data resets it.
- The USSD simulator checks screens against a 160 character limit. Real limits vary by network and should be checked for any operator. It is not connected to any phone network.
- Revenue figures and the split are illustrative. No money moves.
- Accessibility: an automated axe-core audit of every screen found one problem, which was fixed, and text colours are tested for contrast. That audit cannot check real keyboard order or screen reader behaviour, and no testing with assistive technology or with disabled users has been done.
- Role views are not authentication.

## From prototype to real use

Moving from here to real use would need, at least:

- **Consent with real communities.** Design with the farmers and cooperatives concerned: whether per-category, per-purpose consent is the right model, who decides for a group, languages and literacy, how withdrawal and complaints work, and how benefits are shared. The default split here is a placeholder.
- **Legal review.** The form of the trust entity, data protection law where farmers and buyers are, contracts with buyers, cross-border transfers, and what any buyer's regulatory duties actually require. Nothing here is legal advice.
- **Security audit and privacy review.** Authentication and authorisation, encryption, key management, tamper-evident logging, penetration testing, and a formal privacy analysis of the query layer.
- **Real data practice.** Provenance, quality checks, handling of plot geolocation, and a data protection assessment.
- **Operations.** A USSD gateway and operator agreements, offline and low-connectivity use, support, and a named steward.

## About the EUDR

The EU Deforestation Regulation (EUDR) is the motivating context. In general terms, it concerns showing that certain commodities placed on the EU market, including cocoa, are deforestation-free and traceable to where they were produced. Its application dates have been postponed more than once and its details may have changed, so check current official sources. This prototype only releases aggregates, so it could not on its own supply plot-level information, and it is not an attempt to do so.

## Licences and credits

Code: MIT, see `LICENSE`. Synthetic dataset and data card: CC0 1.0. The scorecard uses criteria from the Open Data Institute's framework, cited above. The data card uses MLCommons Croissant terms.
