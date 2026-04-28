"""Game + Player abstractions and the engine loop.

Python idiom notes:
    - We declare Game as an abstract base class (abc.ABC) with @abstractmethod.
      Python would actually let us skip this entirely — duck typing means
      "if it walks like a Game, it IS a Game" — but ABC makes the contract
      explicit and fails fast if a subclass forgets a method.
    - There are no generics at runtime. The Move type is just "whatever
      the game returns from legal_moves"; Python doesn't check it, the
      programmer does. Contrast with C++ templates and Rust associated
      types, which *force* the compiler to agree on a Move type.
    - enum.Enum gives us a rich enum for free.
    - apply_move returns an Undo token; undo_move reverts. This lets a
      search algorithm explore the game tree by mutating one game in place
      instead of cloning at every node — much cheaper than deepcopy.
"""

from __future__ import annotations

from abc import ABC, abstractmethod
from enum import Enum
from typing import List, Optional, Sequence


class Side(Enum):
    ONE = 1
    TWO = 2

    def other(self) -> "Side":
        return Side.TWO if self is Side.ONE else Side.ONE

    @property
    def label(self) -> str:
        return "Player 1" if self is Side.ONE else "Player 2"


class Game(ABC):
    """Abstract base for any two-player, perfect-information, turn-based game.

    Subclasses use whatever Move type they like — a tuple, a dataclass,
    a bare int. The engine never peeks at Move internals; it only asks
    the game to produce and consume them. apply_move returns an Undo
    token of whatever shape the subclass needs; undo_move(undo) must
    restore the exact prior state.
    """

    @abstractmethod
    def legal_moves(self) -> Sequence: ...

    @abstractmethod
    def apply_move(self, move):
        """Apply move; return an undo token usable by undo_move()."""

    @abstractmethod
    def undo_move(self, undo) -> None:
        """Revert the most recent apply_move using its returned token."""

    @abstractmethod
    def current_side(self) -> Side: ...

    @abstractmethod
    def is_over(self) -> bool: ...

    @abstractmethod
    def winner(self) -> Optional[Side]: ...

    @abstractmethod
    def state_key(self) -> int:
        """Compact, collision-free integer encoding of the current game state.

        Used by search algorithms as a transposition-table key. Must be
        cheap to compute (no string formatting) and must distinguish any
        two reachable states whose optimal value could differ — which
        means including the side to move.
        """

    @abstractmethod
    def render(self) -> str: ...

    @abstractmethod
    def move_to_string(self, move) -> str: ...


class Player(ABC):
    """Strategy: sees a Game (mutably), returns a move.

    A strategy MAY mutate the game during search, but MUST leave it in
    the same state on return. RandomPlayer never mutates; OptimalPlayer
    does apply/undo inside its search.
    """

    @abstractmethod
    def choose_move(self, game: Game): ...

    @property
    @abstractmethod
    def name(self) -> str: ...


def run_game(game: Game, players: List[Player], verbose: bool = True) -> Optional[Side]:
    """Drive a Game to completion with two Players. Returns the winning Side,
    or None on a draw."""
    if verbose:
        print(game.render())

    while not game.is_over():
        side = game.current_side()
        strategy = players[0] if side is Side.ONE else players[1]
        move = strategy.choose_move(game)
        if verbose:
            print(f"{side.label} ({strategy.name}) plays {game.move_to_string(move)}")
        game.apply_move(move)
        if verbose:
            print(game.render())

    w = game.winner()
    if verbose:
        print(f"{w.label} wins!" if w else "Draw.")
    return w
