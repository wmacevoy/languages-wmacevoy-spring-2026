# Prolog + SolidJS

A mini Prolog interpreter in JavaScript, paired with SolidJS's fine-grained
reactivity to build two demos: a tic-tac-toe AI and "The Obsidian Tower,"
a text adventure whose entire world runs on Prolog inference.

## Quick start

**Dev Container:**
Open in VS Code → Reopen in Container → ports forward automatically.

**Or locally:**
```bash
npm test           # 28 tests covering engine, tic-tac-toe, and adventure
npx serve . -p 3000
# open http://localhost:3000/tictactoe.html
# open http://localhost:3000/adventure.html
```

## Project structure

```
src/
  prolog-engine.js        Prolog interpreter v2 (standalone, zero deps)
  solid-prolog.js         Reactive bridge: Solid signals ↔ Prolog queries
  tictactoe-kb.js         Tic-tac-toe knowledge base
  adventure-kb.js         Adventure game knowledge base
  prolog-engine.test.js   Test suite (node:test)
tictactoe.html            SolidJS tic-tac-toe app (self-contained)
adventure.html            SolidJS adventure game (self-contained)
```

## Why Solid + Prolog?

The pairing is surprisingly natural, and Warren's intuition about the
observer model is exactly right.  Here's why:

### Prolog queries are pure functions

A Prolog query takes a goal and produces results from the clause database.
Given the same database, the same query always returns the same results.
This makes queries perfect candidates for Solid's `createMemo` — a derived
signal that caches its result and only recomputes when dependencies change.

### Mutable state through a generation counter

Prolog's `assert` and `retract` mutate the clause database.  We wrap
mutations in a Solid signal — a generation counter that bumps after every
assert/retract.  Any `createMemo` that reads the counter automatically
re-runs its query:

```js
const [gen, setGen] = createSignal(0);
const bump = () => setGen(g => g + 1);

// This memo automatically recomputes after any mutation
const currentRoom = createMemo(() => {
  gen();  // dependency on the generation counter
  const r = engine.queryFirst(compound("player_at", [variable("R")]));
  return r ? r.args[0].name : "unknown";
});

// Mutations bump the counter, triggering re-query
function move(dir) {
  engine.queryFirst(compound("do_go", [atom(dir)]));
  bump();  // all dependent memos recompute
}
```

This is the same pattern you'd use in Solid for any external mutable store —
the generation counter acts as a dirty flag.  But because Solid's reactivity
is fine-grained (no VDOM diffing), only the specific DOM elements that depend
on changed queries actually update.

### The adventure game makes this concrete

In the adventure game, the entire world state lives in the Prolog clause
database as dynamic facts:

```prolog
player_at(courtyard).
item_at(rusty_key, tower_base).
holding(old_scroll).
locked(garden).
```

The UI consists of reactive queries that read this state:

```
currentRoom  = memo → player_at(R)
itemsHere    = memo → findall(I, item_at(I, Room), Items)
inventory    = memo → findall(I, holding(I), Items)
exits        = memo → findall(D, can_go(D, _), Dirs)
gameWon      = memo → game_won
```

When the player takes an action (like `do_take(rusty_key)`), the engine
runs `retract(item_at(rusty_key, tower_base))` and
`assert(holding(rusty_key))`.  The generation bumps, and Solid
automatically re-queries — the inventory updates, the room's item list
updates, and any actions that depend on holding the key (like unlocking
the garden gate) become available.

### NPC dialogue is context-sensitive inference

The raven NPC has three dialogue clauses, each guarded by conditions:

```prolog
npc_talk(raven, 'You found the orb!') :-
    holding(crystal_orb).

npc_talk(raven, 'Try the well...') :-
    holding(old_scroll),
    \+ holding(crystal_orb).

npc_talk(raven, 'Seek the key...') :-
    \+ holding(old_scroll),
    \+ holding(crystal_orb).
```

Prolog's clause ordering provides priority — the engine tries the first
clause first.  If the player has the orb, they get the excited dialogue.
If they have the scroll but not the orb, they get a hint about the well.
Otherwise, they get the default.  No if/else chain in JavaScript — just
Prolog inference.

## Engine v2 additions

The engine has been extended from v1 with features needed for mutable
game worlds:

| Feature        | Description                                    |
|----------------|------------------------------------------------|
| `assert/1`     | Add a fact to the database at runtime          |
| `asserta/1`    | Add at the beginning of the database           |
| `retract/1`    | Remove the first matching fact                 |
| `findall/3`    | Collect all solutions into a list              |
| `write/1`      | Capture output (for `queryWithOutput`)         |
| `writeln/1`    | Write with newline                             |
| `nl/0`         | Newline                                        |
| `append/3`     | List concatenation                             |
| `length/2`     | List length                                    |
| `atom_concat/3`| Concatenate two atoms                          |

These are the primitives that make Prolog suitable as a world-simulation
language — assert/retract give you mutable state, findall lets you
aggregate, and the existing unification/backtracking machinery handles
all the rule evaluation.

## The reactive bridge API

```js
import { createReactiveEngine } from './src/solid-prolog.js';
import { buildAdventureKB } from './src/adventure-kb.js';

const {
  engine,          // the raw PrologEngine instance
  generation,      // Solid signal: current generation
  bump,            // function: increment generation
  act,             // function: run a goal + bump
  actWithOutput,   // function: run a goal + capture write/1 + bump
  createQuery,     // function: reactive memo for query()
  createQueryFirst // function: reactive memo for queryFirst()
} = createReactiveEngine(buildAdventureKB);

// Reactive queries — recompute automatically after act()
const room = createQueryFirst(() =>
  compound("player_at", [variable("R")])
);

// Perform an action
act(compound("do_go", [atom("north")]));
// room() now returns the new location
```

## Tests

```bash
npm test
```

28 tests covering:
- Engine basics (unification, clause resolution, builtins)
- v2 features (assert/retract, findall)
- Tic-tac-toe KB (win detection, AI strategy)
- Adventure KB (movement, locks, items, NPC dialogue, full playthrough)

## License

MIT
