// ============================================================
// Tic-Tac-Toe Knowledge Base
// ============================================================

import { PrologEngine } from "./prolog-engine.js";
const { atom: a, variable: v, compound: c, num: n, list } = PrologEngine;

export function buildTicTacToeKB() {
  const engine = new PrologEngine();

  const lines = [
    [1,2,3],[4,5,6],[7,8,9],
    [1,4,7],[2,5,8],[3,6,9],
    [1,5,9],[3,5,7],
  ];
  for (const [a1,b1,c1] of lines) {
    engine.addClause(c("line", [n(a1), n(b1), n(c1)]));
  }

  engine.addClause(c("win", [v("Board"), v("Player")]), [
    c("line",  [v("A"), v("B"), v("C")]),
    c("nth1",  [v("A"), v("Board"), v("Player")]),
    c("nth1",  [v("B"), v("Board"), v("Player")]),
    c("nth1",  [v("C"), v("Board"), v("Player")]),
  ]);

  engine.addClause(c("empty", [v("Board"), v("Pos")]), [
    c("nth1", [v("Pos"), v("Board"), a("e")]),
  ]);

  engine.addClause(c("move", [v("Board"), v("Pos"), v("Player"), v("NewBoard")]), [
    c("empty",   [v("Board"), v("Pos")]),
    c("replace", [v("Board"), v("Pos"), v("Player"), v("NewBoard")]),
  ]);

  engine.addClause(c("board_full", [v("Board")]), [
    c("not", [c("member", [a("e"), v("Board")])]),
  ]);

  engine.addClause(c("can_win", [v("Board"), v("Player"), v("Pos")]), [
    c("empty", [v("Board"), v("Pos")]),
    c("move",  [v("Board"), v("Pos"), v("Player"), v("NB")]),
    c("win",   [v("NB"), v("Player")]),
  ]);

  engine.addClause(c("choose_move", [v("Board"), v("Player"), v("Pos")]), [
    c("can_win", [v("Board"), v("Player"), v("Pos")]),
  ]);

  engine.addClause(c("choose_move", [v("Board"), v("Player"), v("Pos")]), [
    c("opponent", [v("Player"), v("Opp")]),
    c("can_win",  [v("Board"), v("Opp"), v("Pos")]),
  ]);

  engine.addClause(c("choose_move", [v("Board"), v("_P"), n(5)]), [
    c("empty", [v("Board"), n(5)]),
  ]);

  engine.addClause(c("choose_move", [v("Board"), v("_P"), v("Pos")]), [
    c("member", [v("Pos"), list([n(1), n(3), n(7), n(9)])]),
    c("empty",  [v("Board"), v("Pos")]),
  ]);

  engine.addClause(c("choose_move", [v("Board"), v("_P"), v("Pos")]), [
    c("member", [v("Pos"), list([n(2), n(4), n(6), n(8)])]),
    c("empty",  [v("Board"), v("Pos")]),
  ]);

  engine.addClause(c("opponent", [a("x"), a("o")]));
  engine.addClause(c("opponent", [a("o"), a("x")]));

  return engine;
}

export function boardToProlog(board) {
  return PrologEngine.list(
    board.map(cell => cell === null ? PrologEngine.atom("e") : PrologEngine.atom(cell))
  );
}
