// ============================================================
// Mini Prolog Interpreter  (v2 — refactored)
//
// A compact, embeddable Prolog engine in JavaScript.
// Supports: unification, backtracking (generators), negation-as-failure,
// arithmetic, lists, if-then-else, assert/retract, findall, and
// cut-free SLD resolution.
//
// New in v2:
//   - assert/retract for mutable knowledge bases (game state)
//   - findall/3 for collecting all solutions
//   - write/1 and writeln/1 with output capture
//   - atom_chars/2, atom_concat/3, number_chars/2
//   - append/3
//   - length/2
//   - Cleaner internal structure
// ============================================================

export class PrologEngine {
  constructor() {
    this.clauses = [];
    this.builtins = {};
    this._output = [];       // captured write/1 output
    this._registerBuiltins();
  }

  // ── Term constructors (static) ──────────────────────────────

  static atom(name)           { return { type: "atom", name }; }
  static variable(name)       { return { type: "var", name }; }
  static compound(functor, args) { return { type: "compound", functor, args }; }
  static num(n)               { return { type: "num", value: n }; }

  /** Build a Prolog list from a JS array. Optional tail for [H|T]. */
  static list(items, tail = null) {
    let l = tail || PrologEngine.atom("[]");
    for (let i = items.length - 1; i >= 0; i--) {
      l = PrologEngine.compound(".", [items[i], l]);
    }
    return l;
  }

  // ── Substitution / unification ──────────────────────────────

  walk(term, subst) {
    while (term && term.type === "var" && subst.has(term.name)) {
      term = subst.get(term.name);
    }
    return term;
  }

  deepWalk(term, subst) {
    term = this.walk(term, subst);
    if (!term) return term;
    if (term.type === "compound") {
      return PrologEngine.compound(
        term.functor,
        term.args.map((a) => this.deepWalk(a, subst))
      );
    }
    return term;
  }

  unify(a, b, subst) {
    a = this.walk(a, subst);
    b = this.walk(b, subst);
    if (!a || !b) return null;
    if (a.type === "var") { const s = new Map(subst); s.set(a.name, b); return s; }
    if (b.type === "var") { const s = new Map(subst); s.set(b.name, a); return s; }
    if (a.type === "atom" && b.type === "atom" && a.name === b.name) return subst;
    if (a.type === "num"  && b.type === "num"  && a.value === b.value) return subst;
    if (a.type === "compound" && b.type === "compound" &&
        a.functor === b.functor && a.args.length === b.args.length) {
      let s = subst;
      for (let i = 0; i < a.args.length; i++) {
        s = this.unify(a.args[i], b.args[i], s);
        if (s === null) return null;
      }
      return s;
    }
    return null;
  }

  // ── Clause management ───────────────────────────────────────

  addClause(head, body = []) {
    this.clauses.push({ head, body });
  }

  /** Remove the first clause whose head unifies with the given term. */
  retractFirst(head) {
    for (let i = 0; i < this.clauses.length; i++) {
      const fresh = this._freshVars(this.clauses[i], { n: 9000 });
      if (this.unify(head, fresh.head, new Map()) !== null) {
        this.clauses.splice(i, 1);
        return true;
      }
    }
    return false;
  }

  _freshVars(clause, counter) {
    const mapping = {};
    const rename = (term) => {
      if (!term) return term;
      if (term.type === "var") {
        if (!mapping[term.name]) mapping[term.name] = PrologEngine.variable(`_V${counter.n++}`);
        return mapping[term.name];
      }
      if (term.type === "compound") return PrologEngine.compound(term.functor, term.args.map(rename));
      return term;
    };
    return { head: rename(clause.head), body: clause.body.map(rename) };
  }

  // ── Query engine (generator-based backtracking) ─────────────

  *solve(goals, subst, counter, depth = 0) {
    if (depth > 300) return;
    if (goals.length === 0) { yield subst; return; }
    const [goal, ...rest] = goals;
    const resolved = this.deepWalk(goal, subst);

    const key = resolved.type === "compound"
      ? `${resolved.functor}/${resolved.args.length}`
      : resolved.type === "atom" ? `${resolved.name}/0` : null;
    if (key && this.builtins[key]) {
      yield* this.builtins[key](resolved, rest, subst, counter, depth);
      return;
    }

    for (const clause of this.clauses) {
      const fresh = this._freshVars(clause, counter);
      const s = this.unify(resolved, fresh.head, subst);
      if (s !== null) {
        yield* this.solve([...fresh.body, ...rest], s, counter, depth + 1);
      }
    }
  }

  query(goal, limit = 50) {
    const counter = { n: 0 };
    const results = [];
    for (const subst of this.solve([goal], new Map(), counter)) {
      results.push(this.deepWalk(goal, subst));
      if (results.length >= limit) break;
    }
    return results;
  }

  queryFirst(goal) {
    const counter = { n: 0 };
    for (const subst of this.solve([goal], new Map(), counter)) {
      return this.deepWalk(goal, subst);
    }
    return null;
  }

  /** Run a query and return captured write/1 output. */
  queryWithOutput(goal) {
    this._output = [];
    const result = this.queryFirst(goal);
    const output = [...this._output];
    this._output = [];
    return { result, output };
  }

  // ── Builtins ────────────────────────────────────────────────

  _registerBuiltins() {
    const self = this;

    // -- Negation as failure
    this.builtins["not/1"] = function*(goal, rest, subst, counter, depth) {
      const inner = self.deepWalk(goal.args[0], subst);
      let found = false;
      for (const _ of self.solve([inner], subst, counter, depth + 1)) { found = true; break; }
      if (!found) yield* self.solve(rest, subst, counter, depth + 1);
    };
    this.builtins["\\+/1"] = this.builtins["not/1"];

    // -- Unification
    this.builtins["=/2"] = function*(goal, rest, subst, counter, depth) {
      const s = self.unify(goal.args[0], goal.args[1], subst);
      if (s !== null) yield* self.solve(rest, s, counter, depth + 1);
    };
    this.builtins["\\=/2"] = function*(goal, rest, subst, counter, depth) {
      const s = self.unify(goal.args[0], goal.args[1], subst);
      if (s === null) yield* self.solve(rest, subst, counter, depth + 1);
    };

    // -- member/2
    this.builtins["member/2"] = function*(goal, rest, subst, counter, depth) {
      const elem = goal.args[0];
      let list = self.deepWalk(goal.args[1], subst);
      while (list && list.type === "compound" && list.functor === "." && list.args.length === 2) {
        const s = self.unify(elem, list.args[0], subst);
        if (s !== null) yield* self.solve(rest, s, counter, depth + 1);
        list = self.deepWalk(list.args[1], subst);
      }
    };

    // -- append/3
    this.builtins["append/3"] = function*(goal, rest, subst, counter, depth) {
      const a = self.deepWalk(goal.args[0], subst);
      const b = self.deepWalk(goal.args[1], subst);
      const c = goal.args[2];
      // If first arg is ground list, build result directly
      if (a.type === "atom" && a.name === "[]") {
        const s = self.unify(c, b, subst);
        if (s !== null) yield* self.solve(rest, s, counter, depth + 1);
      } else if (a.type === "compound" && a.functor === "." && a.args.length === 2) {
        const newC = PrologEngine.variable(`_Va${counter.n++}`);
        const s = self.unify(c, PrologEngine.compound(".", [a.args[0], newC]), subst);
        if (s !== null) {
          yield* self.solve(
            [PrologEngine.compound("append", [a.args[1], b, newC]), ...rest],
            s, counter, depth + 1
          );
        }
      }
    };

    // -- length/2
    this.builtins["length/2"] = function*(goal, rest, subst, counter, depth) {
      let list = self.deepWalk(goal.args[0], subst);
      let len = 0;
      while (list && list.type === "compound" && list.functor === "." && list.args.length === 2) {
        len++;
        list = self.deepWalk(list.args[1], subst);
      }
      const s = self.unify(goal.args[1], PrologEngine.num(len), subst);
      if (s !== null) yield* self.solve(rest, s, counter, depth + 1);
    };

    // -- nth1/3
    this.builtins["nth1/3"] = function*(goal, rest, subst, counter, depth) {
      const idxTerm = self.deepWalk(goal.args[0], subst);
      let list = self.deepWalk(goal.args[1], subst);
      const elem = goal.args[2];
      let i = 1;
      while (list && list.type === "compound" && list.functor === "." && list.args.length === 2) {
        if (idxTerm.type === "num") {
          if (i === idxTerm.value) {
            const s = self.unify(elem, list.args[0], subst);
            if (s !== null) yield* self.solve(rest, s, counter, depth + 1);
            return;
          }
        } else {
          let s = self.unify(idxTerm, PrologEngine.num(i), subst);
          if (s !== null) {
            s = self.unify(elem, list.args[0], s);
            if (s !== null) yield* self.solve(rest, s, counter, depth + 1);
          }
        }
        list = self.deepWalk(list.args[1], subst);
        i++;
      }
    };

    // -- replace/4
    this.builtins["replace/4"] = function*(goal, rest, subst, counter, depth) {
      let list = self.deepWalk(goal.args[0], subst);
      const idx = self.deepWalk(goal.args[1], subst);
      const val = self.deepWalk(goal.args[2], subst);
      const result = goal.args[3];
      if (idx.type !== "num") return;
      const items = [];
      while (list && list.type === "compound" && list.functor === "." && list.args.length === 2) {
        items.push(list.args[0]);
        list = self.deepWalk(list.args[1], subst);
      }
      if (idx.value < 1 || idx.value > items.length) return;
      const newItems = [...items];
      newItems[idx.value - 1] = val;
      const s = self.unify(result, PrologEngine.list(newItems), subst);
      if (s !== null) yield* self.solve(rest, s, counter, depth + 1);
    };

    // -- is/2 (arithmetic)
    this.builtins["is/2"] = function*(goal, rest, subst, counter, depth) {
      const lhs = goal.args[0];
      const rhs = self.deepWalk(goal.args[1], subst);
      const val = evalArith(rhs);
      if (val !== null) {
        const s = self.unify(lhs, PrologEngine.num(val), subst);
        if (s !== null) yield* self.solve(rest, s, counter, depth + 1);
      }
    };

    // -- Comparison operators
    for (const [op, fn] of [
      [">/2",   (a,b) => a > b],
      ["</2",   (a,b) => a < b],
      [">=/2",  (a,b) => a >= b],
      ["=</2",  (a,b) => a <= b],
      ["=:=/2", (a,b) => a === b],
      ["=\\=/2",(a,b) => a !== b],
    ]) {
      this.builtins[op] = function*(goal, rest, subst, counter, depth) {
        const a = evalArith(self.deepWalk(goal.args[0], subst));
        const b = evalArith(self.deepWalk(goal.args[1], subst));
        if (a !== null && b !== null && fn(a, b))
          yield* self.solve(rest, subst, counter, depth + 1);
      };
    }

    // -- Structural equality
    this.builtins["==/2"] = function*(goal, rest, subst, counter, depth) {
      if (termEq(self.deepWalk(goal.args[0], subst), self.deepWalk(goal.args[1], subst)))
        yield* self.solve(rest, subst, counter, depth + 1);
    };
    this.builtins["\\==/2"] = function*(goal, rest, subst, counter, depth) {
      if (!termEq(self.deepWalk(goal.args[0], subst), self.deepWalk(goal.args[1], subst)))
        yield* self.solve(rest, subst, counter, depth + 1);
    };

    // -- true/0, fail/0
    this.builtins["true/0"] = function*(goal, rest, subst, counter, depth) {
      yield* self.solve(rest, subst, counter, depth + 1);
    };
    this.builtins["fail/0"] = function*() {};

    // -- Conjunction ,/2
    this.builtins[",/2"] = function*(goal, rest, subst, counter, depth) {
      yield* self.solve([goal.args[0], goal.args[1], ...rest], subst, counter, depth + 1);
    };

    // -- Disjunction ;/2 (with if-then-else)
    this.builtins[";/2"] = function*(goal, rest, subst, counter, depth) {
      const left = self.deepWalk(goal.args[0], subst);
      const right = self.deepWalk(goal.args[1], subst);
      if (left.type === "compound" && left.functor === "->" && left.args.length === 2) {
        let found = false;
        for (const s of self.solve([left.args[0]], subst, counter, depth + 1)) {
          found = true;
          yield* self.solve([left.args[1], ...rest], s, counter, depth + 1);
          break;
        }
        if (!found) yield* self.solve([right, ...rest], subst, counter, depth + 1);
      } else {
        yield* self.solve([left, ...rest], subst, counter, depth + 1);
        yield* self.solve([right, ...rest], subst, counter, depth + 1);
      }
    };

    // -- If-then ->/2
    this.builtins["->/2"] = function*(goal, rest, subst, counter, depth) {
      for (const s of self.solve([goal.args[0]], subst, counter, depth + 1)) {
        yield* self.solve([goal.args[1], ...rest], s, counter, depth + 1);
        break;
      }
    };

    // -- assert/1: add a fact to the database at runtime
    this.builtins["assert/1"] = function*(goal, rest, subst, counter, depth) {
      const term = self.deepWalk(goal.args[0], subst);
      self.clauses.push({ head: term, body: [] });
      yield* self.solve(rest, subst, counter, depth + 1);
    };
    this.builtins["assertz/1"] = this.builtins["assert/1"];

    // -- asserta/1: add at the beginning
    this.builtins["asserta/1"] = function*(goal, rest, subst, counter, depth) {
      const term = self.deepWalk(goal.args[0], subst);
      self.clauses.unshift({ head: term, body: [] });
      yield* self.solve(rest, subst, counter, depth + 1);
    };

    // -- retract/1: remove first matching fact
    this.builtins["retract/1"] = function*(goal, rest, subst, counter, depth) {
      const term = self.deepWalk(goal.args[0], subst);
      if (self.retractFirst(term)) {
        yield* self.solve(rest, subst, counter, depth + 1);
      }
    };

    // -- findall/3: collect all solutions
    this.builtins["findall/3"] = function*(goal, rest, subst, counter, depth) {
      const template = goal.args[0];
      const queryGoal = self.deepWalk(goal.args[1], subst);
      const bag = goal.args[2];
      const results = [];
      for (const s of self.solve([queryGoal], subst, counter, depth + 1)) {
        results.push(self.deepWalk(template, s));
      }
      const resList = PrologEngine.list(results);
      const s2 = self.unify(bag, resList, subst);
      if (s2 !== null) yield* self.solve(rest, s2, counter, depth + 1);
    };

    // -- write/1 and writeln/1: capture output
    this.builtins["write/1"] = function*(goal, rest, subst, counter, depth) {
      const term = self.deepWalk(goal.args[0], subst);
      self._output.push(termToString(term));
      yield* self.solve(rest, subst, counter, depth + 1);
    };
    this.builtins["writeln/1"] = function*(goal, rest, subst, counter, depth) {
      const term = self.deepWalk(goal.args[0], subst);
      self._output.push(termToString(term) + "\n");
      yield* self.solve(rest, subst, counter, depth + 1);
    };
    this.builtins["nl/0"] = function*(goal, rest, subst, counter, depth) {
      self._output.push("\n");
      yield* self.solve(rest, subst, counter, depth + 1);
    };

    // -- atom_chars/2
    this.builtins["atom_chars/2"] = function*(goal, rest, subst, counter, depth) {
      const a = self.deepWalk(goal.args[0], subst);
      const b = goal.args[1];
      if (a.type === "atom") {
        const chars = PrologEngine.list(
          a.name.split("").map(ch => PrologEngine.atom(ch))
        );
        const s = self.unify(b, chars, subst);
        if (s !== null) yield* self.solve(rest, s, counter, depth + 1);
      }
    };

    // -- atom_concat/3
    this.builtins["atom_concat/3"] = function*(goal, rest, subst, counter, depth) {
      const a = self.deepWalk(goal.args[0], subst);
      const b = self.deepWalk(goal.args[1], subst);
      const c = goal.args[2];
      if (a.type === "atom" && b.type === "atom") {
        const s = self.unify(c, PrologEngine.atom(a.name + b.name), subst);
        if (s !== null) yield* self.solve(rest, s, counter, depth + 1);
      }
    };

    // ── Arithmetic helper ─────────────────────────────────────

    function evalArith(term) {
      if (!term) return null;
      if (term.type === "num") return term.value;
      if (term.type === "compound") {
        const ops2 = {
          "+": (a,b) => a+b, "-": (a,b) => a-b,
          "*": (a,b) => a*b,
        };
        if (ops2[term.functor] && term.args.length === 2) {
          const a = evalArith(term.args[0]), b = evalArith(term.args[1]);
          return a !== null && b !== null ? ops2[term.functor](a, b) : null;
        }
        if (term.functor === "//" && term.args.length === 2) {
          const a = evalArith(term.args[0]), b = evalArith(term.args[1]);
          return a !== null && b !== null && b !== 0 ? Math.trunc(a/b) : null;
        }
        if (term.functor === "mod" && term.args.length === 2) {
          const a = evalArith(term.args[0]), b = evalArith(term.args[1]);
          return a !== null && b !== null && b !== 0 ? a % b : null;
        }
        if (term.functor === "abs" && term.args.length === 1) {
          const a = evalArith(term.args[0]);
          return a !== null ? Math.abs(a) : null;
        }
        if (term.functor === "-" && term.args.length === 1) {
          const a = evalArith(term.args[0]);
          return a !== null ? -a : null;
        }
      }
      return null;
    }

    function termEq(a, b) {
      if (!a || !b) return false;
      if (a.type !== b.type) return false;
      if (a.type === "atom") return a.name === b.name;
      if (a.type === "num")  return a.value === b.value;
      if (a.type === "var")  return a.name === b.name;
      if (a.type === "compound") {
        if (a.functor !== b.functor || a.args.length !== b.args.length) return false;
        return a.args.every((arg, i) => termEq(arg, b.args[i]));
      }
      return false;
    }
  }
}

// ── Utility: term → string ────────────────────────────────────

export function termToString(term) {
  if (!term) return "?";
  if (term.type === "atom") return term.name;
  if (term.type === "num")  return String(term.value);
  if (term.type === "var")  return term.name;
  if (term.type === "compound") {
    if (term.functor === "." && term.args.length === 2) {
      const items = [];
      let cur = term;
      while (cur.type === "compound" && cur.functor === "." && cur.args.length === 2) {
        items.push(termToString(cur.args[0]));
        cur = cur.args[1];
      }
      if (cur.type === "atom" && cur.name === "[]") return `[${items.join(",")}]`;
      return `[${items.join(",")}|${termToString(cur)}]`;
    }
    return `${term.functor}(${term.args.map(termToString).join(",")})`;
  }
  return "?";
}

/** Convert a Prolog list term to a JS array of terms. */
export function listToArray(term) {
  const items = [];
  while (term && term.type === "compound" && term.functor === "." && term.args.length === 2) {
    items.push(term.args[0]);
    term = term.args[1];
  }
  return items;
}
