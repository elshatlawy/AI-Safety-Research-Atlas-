# E003 one-paper technical pilot: source fidelity report

**Standing:** AI-first draft; human source-fidelity review pending. E003 remains `OPEN` and no atlas record, ID, relation, or verification status changed. The exact current machine receipts and source hashes are in [summary.json](summary.json).

## What was compared

- Paper: arXiv:2311.14125v1, PDF physical p. 6 Definition 6.1, p. 7 Figure 1 and Theorem 6.2, p. 8 Lean note. The 20-page versioned local PDF has SHA-256 `88bf163ab823599049083b8c0461cb5a5c7b64614b68e7754b8d8948bed7c1da`. It was imported from a prior local copy; a fresh shell re-fetch was unavailable.
- Lean: `google-deepmind/debate` commit `de3a6e500ae1a65dfeea2f91ef519ebad9704be0`, especially `Comp/Oracle.lean:19–44`, `Debate/Protocol.lean:40–51,89–127`, and `Debate/Correct.lean:28–34`. Their source hashes are in the existing [E003 source evidence](https://github.com/elshatlawy/ai-safety-metamath-bible/blob/179d870604f948e537d2cef43b376694ffa98645/AGR_Atlas_Infrastructure/ontology_v2/review_v1/e003_v1/EVIDENCE.json) and the pilot summary.
- Formal run: expanded-defaults restatement of `correctness` under the pinned Lean `v4.8.0` environment. The proof term is `by exact correctness k k0 t`. This repeats an existing result; it is **not** a new theorem or a full paper formalization.

The rendered PDF was inspected as well as the extracted text. Physical page numbers and `pdftotext -layout` line numbers refer to this exact PDF hash. Four relevant extracted span hashes are in the summary. The [AI correction log](CORRECTION_LOG.md) records formatting errors in the extraction and the initial Lean header draft.

## Seven differences carried into the proposed fidelity packet

| ID | AI-first finding and exact source locations | Status |
|---|---|---|
| D01 | The displayed paper condition is strict and compares a fixed machine across stochastic oracles (PDF p. 6, extracted lines 45–49); Lean `Oracle.lipschitz` uses `≤` for a fixed `o,t` against every formal history kernel (`Comp/Oracle.lean:40–44`). Self and zero-distance readings remain unresolved. | Human meaning review pending |
| D02 | The paper's condition takes a supremum over inputs (PDF p. 6, lines 45–49); Lean's premise concerns the probability of one `Oracle.final t` event (`Comp/Oracle.lean:31–44`). No output-law mapping across inputs has been reviewed. | Mapping open |
| D03 | Paper Theorem 6.2 specifies a language, oracle machine, time, and query length (PDF p. 7, lines 30–32). Lean `correctness` has finite `t`, `k>0`, and a `Correct` record but no such objects (`Debate/Correct.lean:28–34`; `Debate/Protocol.lean:119–127`). Opponent strategy domains also require comparison. | Mapping open |
| D04 | The paper's strict decision margins and Lean's weak `2/3` thresholds could align in one direction only if the machine output and Lean final Boolean event have the same law (PDF p. 7, lines 30–32; `Debate/Protocol.lean:119–127`). That event-law bridge is unproved. | Bridge open |
| D05 | Figure 1 permits Bob's abort choice after the sampled bit (PDF p. 7, lines 1–24); Lean calls Bob before `bernoulli p` (`Debate/Protocol.lean:89–97`). The paper notes different randomness and constants (PDF p. 8, lines 17–20). The move domain and information pattern must be scoped. | Protocol comparison open |
| D06 | Figure 1 conditions on a relevant-coordinate history (PDF p. 7, lines 1–24); Lean's `Oracle.fold` uses prefix Boolean histories (`Comp/Oracle.lean:19–34`). Conditional-law preservation has not been established. | Bridge open |
| D07 | Paper Theorem 6.2 asserts asymptotic protocol resources (PDF p. 7, lines 30–32). The rechecked `correctness` type has no resource conjunct (`Debate/Correct.lean:28–34`); separate Lean cost results require their own scope and machine model. | Resource comparison open |

These are source-specific *proposals* consistent with the existing E003 review packet, not newly accepted equivalences. The paper's statement boundary and the meanings of Definition 6.1 and Figure 1 need a named human source decision before any scoped relationship can be promoted.

## Four separate verification questions

| Question | This run's evidence | Standing |
|---|---|---|
| Formal correctness | Lean accepted the exact frozen restatement, `#print axioms` reported `propext`, `Classical.choice`, and `Quot.sound`, and `Debate/Correct.lean` recompiled against cached pinned dependencies. | PASS for the rechecked Lean type only; no clean transitive rebuild claimed |
| Paper-to-Lean semantic correspondence | Exact PDF page/line anchors, visual AI inspection, and D01–D07 difference draft. | OPEN; human primary-source review pending |
| Implementation correspondence | No live AI system or code-to-mathematics mapping in this pilot. | Not assessed |
| Empirical support | No prediction, measurement bridge, or observations in this pilot. | Not assessed |

## Next review gate

A researcher should inspect the pinned PDF rendering and Lean source, correct the candidate boundaries and D01–D07 judgments, and decide whether a narrower correctness-only relation can be stated with explicit exclusions. The run's [proposed objects](proposed_objects.json) remain outside the default joined atlas until that review. The strict paper condition, protocol information pattern, and resource claim cannot be inferred from the successful Lean check.
