// ============================================================
// Adventure Game Knowledge Base
//
// "The Obsidian Tower" — a small text adventure driven entirely
// by Prolog inference.  The world state lives in the clause
// database via assert/retract.  The UI queries the engine for
// descriptions, available actions, and processes commands.
// ============================================================

import { PrologEngine, termToString, listToArray } from "./prolog-engine.js";
const { atom: a, variable: v, compound: c, num: n, list } = PrologEngine;

export function buildAdventureKB() {
  const engine = new PrologEngine();

  // ── Room descriptions (static facts) ──────────────────────

  const rooms = [
    ["courtyard",    "A crumbling courtyard. Moonlight catches on shattered flagstones. A massive obsidian tower looms to the north. An iron gate bars the way east."],
    ["tower_base",   "The base of the tower. Spiral stairs wind upward into darkness. Strange glyphs pulse faintly on the walls. A doorway leads south to the courtyard."],
    ["tower_top",    "The top of the tower. Wind howls through empty windows. A stone pedestal stands in the center, covered in dust. Stairs lead down."],
    ["garden",       "An overgrown garden behind a rusted iron gate. Phosphorescent mushrooms glow among the weeds. A stone well sits in the corner. The courtyard is to the west."],
    ["well_chamber", "You descend into the well. Cool air rises. A narrow tunnel leads into a hidden chamber. Jewels glitter in the walls. A ladder leads up to the garden."],
  ];
  for (const [id, desc] of rooms) {
    engine.addClause(c("room_desc", [a(id), a(desc)]));
  }

  // ── Connections (bidirectional) ───────────────────────────

  const connections = [
    ["courtyard",   "north", "tower_base"],
    ["tower_base",  "south", "courtyard"],
    ["tower_base",  "up",    "tower_top"],
    ["tower_top",   "down",  "tower_base"],
    ["courtyard",   "east",  "garden"],
    ["garden",      "west",  "courtyard"],
    ["garden",      "down",  "well_chamber"],
    ["well_chamber","up",    "garden"],
  ];
  for (const [from, dir, to] of connections) {
    engine.addClause(c("connection", [a(from), a(dir), a(to)]));
  }

  // ── Items (static descriptions) ───────────────────────────

  const items = [
    ["rusty_key",    "A heavy iron key, flecked with rust."],
    ["crystal_orb",  "A shimmering crystal orb that hums with inner light."],
    ["old_scroll",   "A brittle scroll. The text reads: 'Place the orb upon the pedestal to open the way.'"],
    ["glowing_gem",  "A gem that pulses with deep violet light. It feels warm."],
  ];
  for (const [id, desc] of items) {
    engine.addClause(c("item_desc", [a(id), a(desc)]));
  }

  // ── Dynamic state (initial assertions) ────────────────────
  // player_at(Room), item_at(Item, Room), holding(Item), locked(Door)

  engine.addClause(c("player_at", [a("courtyard")]));
  engine.addClause(c("item_at", [a("rusty_key"),   a("tower_base")]));
  engine.addClause(c("item_at", [a("old_scroll"),  a("tower_top")]));
  engine.addClause(c("item_at", [a("crystal_orb"), a("well_chamber")]));
  engine.addClause(c("locked",  [a("garden")]));

  // ── NPC ───────────────────────────────────────────────────

  engine.addClause(c("npc_at",   [a("raven"), a("tower_top")]));
  engine.addClause(c("npc_desc", [a("raven"), a("A large raven perches on the windowsill, watching you with knowing eyes.")]));

  // npc_talk(raven, Text) — context-sensitive dialogue
  // If player has orb:
  engine.addClause(
    c("npc_talk", [a("raven"), a("The raven caws: 'You found it! The orb... place it on the pedestal. Quickly, before the tower sleeps again.'")]),
    [c("holding", [a("crystal_orb")])]
  );
  // If player has scroll but no orb:
  engine.addClause(
    c("npc_talk", [a("raven"), a("The raven tilts its head: 'The scroll speaks of the deep places. Have you tried the well in the garden?'")]),
    [c("holding", [a("old_scroll")]), c("not", [c("holding", [a("crystal_orb")])])]
  );
  // Default:
  engine.addClause(
    c("npc_talk", [a("raven"), a("The raven caws: 'Seek the key. The garden holds secrets beneath.'")]),
    [c("not", [c("holding", [a("old_scroll")])]), c("not", [c("holding", [a("crystal_orb")])])]
  );

  // ── Rules ─────────────────────────────────────────────────

  // describe_room(Room, Desc) — full room description with items and NPCs
  // (The UI assembles this from multiple queries for flexibility)

  // items_here(Room, Items) :- findall(I, item_at(I, Room), Items).
  engine.addClause(
    c("items_here", [v("Room"), v("Items")]),
    [c("findall", [v("I"), c("item_at", [v("I"), v("Room")]), v("Items")])]
  );

  // npcs_here(Room, NPCs) :- findall(N, npc_at(N, Room), NPCs).
  engine.addClause(
    c("npcs_here", [v("Room"), v("NPCs")]),
    [c("findall", [v("N"), c("npc_at", [v("N"), v("Room")]), v("NPCs")])]
  );

  // exits(Room, Dirs) :- findall(D, connection(Room, D, _), Dirs).
  engine.addClause(
    c("exits", [v("Room"), v("Dirs")]),
    [c("findall", [v("D"), c("connection", [v("Room"), v("D"), v("_To")]), v("Dirs")])]
  );

  // inventory(Items) :- findall(I, holding(I), Items).
  engine.addClause(
    c("inventory", [v("Items")]),
    [c("findall", [v("I"), c("holding", [v("I")]), v("Items")])]
  );

  // can_go(Dir, Dest) :- player_at(Here), connection(Here, Dir, Dest), not(locked(Dest)).
  engine.addClause(
    c("can_go", [v("Dir"), v("Dest")]),
    [
      c("player_at",  [v("Here")]),
      c("connection", [v("Here"), v("Dir"), v("Dest")]),
      c("not", [c("locked", [v("Dest")])]),
    ]
  );

  // can_go_locked(Dir, Dest) :- player_at(Here), connection(Here, Dir, Dest), locked(Dest).
  engine.addClause(
    c("can_go_locked", [v("Dir"), v("Dest")]),
    [
      c("player_at",  [v("Here")]),
      c("connection", [v("Here"), v("Dir"), v("Dest")]),
      c("locked", [v("Dest")]),
    ]
  );

  // ── Actions (processed by the UI via queryWithOutput) ─────

  // do_go(Dir) — move to a room
  engine.addClause(
    c("do_go", [v("Dir")]),
    [
      c("can_go", [v("Dir"), v("Dest")]),
      c("player_at", [v("Here")]),
      c("retract", [c("player_at", [v("Here")])]),
      c("assert",  [c("player_at", [v("Dest")])]),
    ]
  );

  // do_take(Item) — pick up an item
  engine.addClause(
    c("do_take", [v("Item")]),
    [
      c("player_at", [v("Here")]),
      c("item_at",   [v("Item"), v("Here")]),
      c("retract",   [c("item_at", [v("Item"), v("Here")])]),
      c("assert",    [c("holding", [v("Item")])]),
    ]
  );

  // do_drop(Item) — drop an item
  engine.addClause(
    c("do_drop", [v("Item")]),
    [
      c("holding",   [v("Item")]),
      c("player_at", [v("Here")]),
      c("retract",   [c("holding", [v("Item")])]),
      c("assert",    [c("item_at", [v("Item"), v("Here")])]),
    ]
  );

  // do_unlock(Dir) — unlock with the rusty key
  engine.addClause(
    c("do_unlock", [v("Dir")]),
    [
      c("holding",   [a("rusty_key")]),
      c("player_at", [v("Here")]),
      c("connection",[v("Here"), v("Dir"), v("Dest")]),
      c("locked",    [v("Dest")]),
      c("retract",   [c("locked", [v("Dest")])]),
    ]
  );

  // do_use_orb — place the crystal orb on the pedestal (win condition)
  engine.addClause(
    c("do_use_orb", []),
    [
      c("player_at", [a("tower_top")]),
      c("holding",   [a("crystal_orb")]),
      c("retract",   [c("holding", [a("crystal_orb")])]),
      c("assert",    [c("orb_placed", [])]),
    ]
  );

  // game_won :- orb_placed.
  engine.addClause(c("game_won", []), [c("orb_placed", [])]);

  return engine;
}

// ── Prolog source for display ──────────────────────────────

export const ADVENTURE_PROLOG_SOURCE = `% ============================================
% The Obsidian Tower — Adventure in Prolog
% ============================================

% --- Rooms ---
room_desc(courtyard, 'A crumbling courtyard...').
room_desc(tower_base, 'The base of the tower...').
room_desc(tower_top, 'The top of the tower...').
room_desc(garden, 'An overgrown garden...').
room_desc(well_chamber, 'A hidden chamber...').

% --- Connections ---
connection(courtyard, north, tower_base).
connection(tower_base, south, courtyard).
connection(tower_base, up, tower_top).
% ... etc.

% --- Dynamic state (assert/retract) ---
:- dynamic player_at/1, item_at/2,
           holding/1, locked/1.
player_at(courtyard).
item_at(rusty_key, tower_base).
locked(garden).

% --- NPC with context-sensitive dialogue ---
npc_talk(raven, 'You found the orb!...') :-
    holding(crystal_orb).
npc_talk(raven, 'Try the well...') :-
    holding(old_scroll),
    \\+ holding(crystal_orb).
npc_talk(raven, 'Seek the key...') :-
    \\+ holding(old_scroll),
    \\+ holding(crystal_orb).

% --- Movement ---
can_go(Dir, Dest) :-
    player_at(Here),
    connection(Here, Dir, Dest),
    \\+ locked(Dest).

do_go(Dir) :-
    can_go(Dir, Dest),
    player_at(Here),
    retract(player_at(Here)),
    assert(player_at(Dest)).

% --- Items ---
do_take(Item) :-
    player_at(Here),
    item_at(Item, Here),
    retract(item_at(Item, Here)),
    assert(holding(Item)).

% --- Unlock ---
do_unlock(Dir) :-
    holding(rusty_key),
    player_at(Here),
    connection(Here, Dir, Dest),
    locked(Dest),
    retract(locked(Dest)).

% --- Win condition ---
do_use_orb :-
    player_at(tower_top),
    holding(crystal_orb),
    retract(holding(crystal_orb)),
    assert(orb_placed).

game_won :- orb_placed.`;
