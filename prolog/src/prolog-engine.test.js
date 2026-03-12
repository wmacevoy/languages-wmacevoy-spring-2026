import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { PrologEngine, termToString, listToArray } from "./prolog-engine.js";
import { buildTicTacToeKB, boardToProlog } from "./tictactoe-kb.js";
import { buildAdventureKB } from "./adventure-kb.js";

const { atom: a, variable: v, compound: c, num: n, list } = PrologEngine;

// ── Engine basics ───────────────────────────────────────────

describe("PrologEngine — unification", () => {
  const engine = new PrologEngine();
  it("unifies identical atoms", () => assert.notEqual(engine.unify(a("x"), a("x"), new Map()), null));
  it("fails on different atoms", () => assert.equal(engine.unify(a("x"), a("o"), new Map()), null));
  it("binds a variable", () => {
    const s = engine.unify(v("X"), a("hello"), new Map());
    assert.equal(s.get("X").name, "hello");
  });
  it("unifies compound terms", () => {
    const s = engine.unify(c("f", [v("X"), a("b")]), c("f", [a("a"), v("Y")]), new Map());
    assert.equal(s.get("X").name, "a");
    assert.equal(s.get("Y").name, "b");
  });
});

describe("PrologEngine — clause resolution", () => {
  it("resolves facts", () => {
    const engine = new PrologEngine();
    engine.addClause(c("parent", [a("tom"), a("bob")]));
    engine.addClause(c("parent", [a("tom"), a("liz")]));
    assert.equal(engine.query(c("parent", [a("tom"), v("X")])).length, 2);
  });
  it("resolves rules", () => {
    const engine = new PrologEngine();
    engine.addClause(c("parent", [a("tom"), a("bob")]));
    engine.addClause(c("parent", [a("bob"), a("ann")]));
    engine.addClause(c("grandparent", [v("X"), v("Z")]), [c("parent", [v("X"), v("Y")]), c("parent", [v("Y"), v("Z")])]);
    const r = engine.query(c("grandparent", [a("tom"), v("W")]));
    assert.equal(r.length, 1);
    assert.equal(r[0].args[1].name, "ann");
  });
});

describe("PrologEngine — builtins", () => {
  it("member/2", () => {
    const e = new PrologEngine();
    assert.equal(e.query(c("member", [v("X"), list([a("a"), a("b"), a("c")])])).length, 3);
  });
  it("is/2 arithmetic", () => {
    const e = new PrologEngine();
    const r = e.query(c("is", [v("X"), c("+", [n(2), n(3)])]));
    assert.equal(r[0].args[0].value, 5);
  });
  it("not/1 negation-as-failure", () => {
    const e = new PrologEngine();
    e.addClause(c("bird", [a("tweety")]));
    assert.equal(e.query(c("not", [c("bird", [a("fido")])])).length, 1);
    assert.equal(e.query(c("not", [c("bird", [a("tweety")])])).length, 0);
  });
  it("nth1/3", () => {
    const e = new PrologEngine();
    const r = e.query(c("nth1", [n(2), list([a("a"), a("b"), a("c")]), v("X")]));
    assert.equal(r[0].args[2].name, "b");
  });
  it("replace/4", () => {
    const e = new PrologEngine();
    const r = e.query(c("replace", [list([a("a"), a("b"), a("c")]), n(2), a("z"), v("O")]));
    assert.equal(termToString(r[0].args[3]), "[a,z,c]");
  });
});

// ── v2 features: assert/retract, findall ────────────────────

describe("PrologEngine v2 — assert/retract", () => {
  it("assert adds a fact", () => {
    const e = new PrologEngine();
    e.queryFirst(c("assert", [c("color", [a("red")])]));
    assert.notEqual(e.queryFirst(c("color", [a("red")])), null);
  });
  it("retract removes a fact", () => {
    const e = new PrologEngine();
    e.addClause(c("color", [a("red")]));
    e.addClause(c("color", [a("blue")]));
    e.queryFirst(c("retract", [c("color", [a("red")])]));
    assert.equal(e.queryFirst(c("color", [a("red")])), null);
    assert.notEqual(e.queryFirst(c("color", [a("blue")])), null);
  });
});

describe("PrologEngine v2 — findall", () => {
  it("collects all solutions", () => {
    const e = new PrologEngine();
    e.addClause(c("fruit", [a("apple")]));
    e.addClause(c("fruit", [a("banana")]));
    e.addClause(c("fruit", [a("cherry")]));
    const r = e.queryFirst(c("findall", [v("X"), c("fruit", [v("X")]), v("Bag")]));
    const items = listToArray(r.args[2]);
    assert.equal(items.length, 3);
    assert.equal(items[0].name, "apple");
  });
  it("returns empty list when no solutions", () => {
    const e = new PrologEngine();
    const r = e.queryFirst(c("findall", [v("X"), c("nothing", [v("X")]), v("Bag")]));
    const items = listToArray(r.args[2]);
    assert.equal(items.length, 0);
  });
});

// ── Tic-Tac-Toe ────────────────────────────────────────────

describe("Tic-Tac-Toe KB", () => {
  it("detects a win", () => {
    const e = buildTicTacToeKB();
    const b = boardToProlog(["x","x","x",null,"o","o",null,null,null]);
    assert.notEqual(e.queryFirst(c("win", [b, a("x")])), null);
  });
  it("AI takes center on empty board", () => {
    const e = buildTicTacToeKB();
    const b = boardToProlog(Array(9).fill(null));
    const r = e.queryFirst(c("choose_move", [b, a("o"), v("P")]));
    assert.equal(r.args[2].value, 5);
  });
  it("AI takes winning move", () => {
    const e = buildTicTacToeKB();
    const b = boardToProlog(["x","x",null,"o","o",null,"x",null,null]);
    const r = e.queryFirst(c("choose_move", [b, a("o"), v("P")]));
    assert.equal(r.args[2].value, 6);
  });
});

// ── Adventure KB ────────────────────────────────────────────

describe("Adventure KB", () => {
  it("starts in courtyard", () => {
    const e = buildAdventureKB();
    const r = e.queryFirst(c("player_at", [v("R")]));
    assert.equal(r.args[0].name, "courtyard");
  });

  it("can move north to tower_base", () => {
    const e = buildAdventureKB();
    e.queryFirst(c("do_go", [a("north")]));
    const r = e.queryFirst(c("player_at", [v("R")]));
    assert.equal(r.args[0].name, "tower_base");
  });

  it("cannot go east when garden is locked", () => {
    const e = buildAdventureKB();
    const before = e.queryFirst(c("player_at", [v("R")]));
    assert.equal(before.args[0].name, "courtyard");
    const r = e.queryFirst(c("do_go", [a("east")]));
    assert.equal(r, null); // can't go — locked
    const after = e.queryFirst(c("player_at", [v("R")]));
    assert.equal(after.args[0].name, "courtyard"); // didn't move
  });

  it("can unlock garden with rusty_key", () => {
    const e = buildAdventureKB();
    // Go to tower_base, take key, go back, unlock
    e.queryFirst(c("do_go", [a("north")]));
    e.queryFirst(c("do_take", [a("rusty_key")]));
    e.queryFirst(c("do_go", [a("south")]));
    const r = e.queryFirst(c("do_unlock", [a("east")]));
    assert.notEqual(r, null);
    // Now can go east
    const r2 = e.queryFirst(c("do_go", [a("east")]));
    assert.notEqual(r2, null);
    const loc = e.queryFirst(c("player_at", [v("R")]));
    assert.equal(loc.args[0].name, "garden");
  });

  it("can pick up and hold items", () => {
    const e = buildAdventureKB();
    e.queryFirst(c("do_go", [a("north")]));
    e.queryFirst(c("do_take", [a("rusty_key")]));
    assert.notEqual(e.queryFirst(c("holding", [a("rusty_key")])), null);
  });

  it("inventory query collects held items", () => {
    const e = buildAdventureKB();
    e.queryFirst(c("do_go", [a("north")]));
    e.queryFirst(c("do_take", [a("rusty_key")]));
    const r = e.queryFirst(c("inventory", [v("I")]));
    const items = listToArray(r.args[0]);
    assert.equal(items.length, 1);
    assert.equal(items[0].name, "rusty_key");
  });

  it("NPC dialogue is context-sensitive", () => {
    const e = buildAdventureKB();
    // Default dialogue (no items)
    const d1 = e.queryFirst(c("npc_talk", [a("raven"), v("T")]));
    assert.ok(d1.args[1].name.includes("Seek the key"));

    // With scroll
    e.queryFirst(c("do_go", [a("north")]));
    e.queryFirst(c("do_go", [a("up")]));
    e.queryFirst(c("do_take", [a("old_scroll")]));
    const d2 = e.queryFirst(c("npc_talk", [a("raven"), v("T")]));
    assert.ok(d2.args[1].name.includes("well"));
  });

  it("full game playthrough reaches win condition", () => {
    const e = buildAdventureKB();
    // Get key
    e.queryFirst(c("do_go", [a("north")]));
    e.queryFirst(c("do_take", [a("rusty_key")]));
    // Unlock garden
    e.queryFirst(c("do_go", [a("south")]));
    e.queryFirst(c("do_unlock", [a("east")]));
    // Get orb from well
    e.queryFirst(c("do_go", [a("east")]));
    e.queryFirst(c("do_go", [a("down")]));
    e.queryFirst(c("do_take", [a("crystal_orb")]));
    // Go to tower top
    e.queryFirst(c("do_go", [a("up")]));
    e.queryFirst(c("do_go", [a("west")]));
    e.queryFirst(c("do_go", [a("north")]));
    e.queryFirst(c("do_go", [a("up")]));
    // Place orb
    e.queryFirst(c("do_use_orb", []));
    assert.notEqual(e.queryFirst(c("game_won", [])), null);
  });
});
