# AI-first extraction and technical correction log

**Attribution:** Codex AI source analysis, 2026-10-13. These corrections have not been adopted as human source-review decisions. The PDF rendering was visually inspected by the AI on physical pages 6–8. The complete rendered pages and `pdftotext -layout` snapshot remain in ignored local files.

| Item | Exact location | Machine/draft issue | AI correction and residual review |
|---|---|---|---|
| C01 | PDF physical p. 7, Theorem 6.2; extracted p. 7 lines 30–32 | `pdftotext -layout` renders the stacked fractions in the theorem as `35` and `25`. | The rendered theorem shows completeness **3/5** and soundness **2/5**. Human visual confirmation remains pending. |
| C02 | PDF physical p. 6, Definition 6.1; extracted p. 6 lines 45–49 | Text extraction displaces primes, superscripts, and the two supremum indices. The line quote alone cannot certify the formula. | The rendered display uses a strict `<` and separate suprema over inputs and oracle query addresses. Its self-comparison and zero-distance interpretation remain open. |
| C03 | PDF physical p. 7, Figure 1 and p. 8 Lean note; extracted p. 7 lines 1–24 and p. 8 lines 17–24 | A broad theorem-to-Lean title would hide protocol differences. | The page explicitly describes a post-bit Bob choice and notes different randomness and constants in Lean. Keep those as D05 obligations. |
| C04 | Lean `Debate/Correct.lean:29–34` and the existing work-packet parser | The first AI formalization used the source's local `let p := ...` in a theorem header. The pipeline's safety validator rejects any `:=` in that header. | Expanded the default-parameter projections in the header. Lean accepted the resulting type via `exact correctness k k0 t`. This is a technical restatement of the pinned theorem, not a formalization of paper Theorem 6.2. No pipeline code changed. |

The source anchors in the accepted extraction are the short exact strings `Definition 6.1.` at extracted p. 6 line 45 and `Theorem 6.2.` at p. 7 line 30. A successful substring check establishes location only, not completeness or semantic fidelity.
