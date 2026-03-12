// ============================================================
// Solid ↔ Prolog reactive bridge
//
// The key insight: Prolog queries are pure functions of their
// inputs (the goal + the clause database).  When we wrap them
// in Solid's createMemo, the query result becomes a reactive
// signal that automatically recomputes when dependencies change.
//
// For mutable Prolog state (assert/retract), we use a Solid
// signal as a "generation counter" that bumps on every mutation,
// triggering dependent memos to re-query.
// ============================================================

import { createSignal, createMemo } from "solid-js";
import { PrologEngine } from "./prolog-engine.js";

/**
 * Create a reactive wrapper around a PrologEngine that supports
 * mutable state (assert/retract) with automatic re-query.
 *
 * Returns { engine, generation, bump, createQuery, createQueryFirst }
 */
export function createReactiveEngine(engineOrFactory) {
  const engine = typeof engineOrFactory === "function"
    ? engineOrFactory()
    : engineOrFactory;

  // Generation counter — bumped on every mutation to invalidate memos
  const [generation, setGeneration] = createSignal(0);
  const bump = () => setGeneration((g) => g + 1);

  /**
   * Run an action on the engine (e.g., do_go, do_take) that uses
   * assert/retract, then bump the generation to trigger re-queries.
   */
  function act(goal) {
    const result = engine.queryFirst(goal);
    bump();
    return result;
  }

  /** Like act() but also captures write/1 output. */
  function actWithOutput(goal) {
    const { result, output } = engine.queryWithOutput(goal);
    bump();
    return { result, output };
  }

  /**
   * Create a reactive memo that re-runs a Prolog query whenever
   * the generation changes (i.e., after assert/retract).
   *
   * @param goalFn  — a function returning the Prolog goal term
   * @param options — { limit?: number }
   */
  function createQuery(goalFn, options = {}) {
    return createMemo(() => {
      generation(); // track dependency
      return engine.query(goalFn(), options.limit || 50);
    });
  }

  /** Reactive version of queryFirst. */
  function createQueryFirst(goalFn) {
    return createMemo(() => {
      generation(); // track dependency
      return engine.queryFirst(goalFn());
    });
  }

  return { engine, generation, bump, act, actWithOutput, createQuery, createQueryFirst };
}
