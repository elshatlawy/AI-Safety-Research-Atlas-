import Debate.Correct

open Classical
open Prob
open scoped Real
noncomputable section

theorem E003Pilot.correctness_recheck (k : ℝ) (k0 : 0 < k) (t : ℕ) :
    Correct (3/5) k t
      (alice (Params.defaults k t k0).c (Params.defaults k t k0).q)
      (bob (Params.defaults k t k0).s (Params.defaults k t k0).b (Params.defaults k t k0).q)
      (vera (Params.defaults k t k0).c (Params.defaults k t k0).s (Params.defaults k t k0).v) := by
  exact correctness k k0 t
