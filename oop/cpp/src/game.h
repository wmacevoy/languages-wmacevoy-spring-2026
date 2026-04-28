#pragma once

// Game<MoveT, UndoT> is the abstract base class all games inherit from.
//
// C++ idiom notes:
//   - This is a CLASS TEMPLATE with pure virtual functions: compile-time
//     generics combined with runtime polymorphism (virtual). The two
//     parameters are MoveT (player-facing — what a player chooses) and
//     UndoT (engine-facing — what the engine needs to revert).
//   - We template on both because each game's pair is different. Rust
//     expresses this with two associated types on a trait; Python doesn't
//     need to say anything (duck typing); Kotlin uses Game<M, U>.
//   - virtual ~Game() = default is required so derived destructors run
//     through a base pointer / unique_ptr<Game<...>>.

#include <cstdint>
#include <optional>
#include <string>
#include <vector>

// Side identifies which of the two players is to move or has won.
// We keep the enum separate from the Player strategy class (player.h)
// because "which side" and "who is choosing moves" are different concepts.
enum class Side { One = 1, Two = 2 };

inline Side other(Side s) {
    return s == Side::One ? Side::Two : Side::One;
}

inline std::string sideName(Side s) {
    return s == Side::One ? "Player 1" : "Player 2";
}

template <typename MoveT, typename UndoT>
class Game {
public:
    using Move = MoveT;
    using Undo = UndoT;

    virtual ~Game() = default;

    // Rules
    virtual std::vector<MoveT> legalMoves() const = 0;
    virtual UndoT              applyMove(const MoveT& move) = 0;
    virtual void               undoMove(const UndoT& undo) = 0;

    // State queries
    virtual Side                currentSide() const = 0;
    virtual bool                isOver() const = 0;
    virtual std::optional<Side> winner() const = 0;   // nullopt => draw / ongoing

    // Compact integer key for transposition tables. Must include the
    // side to move and uniquely distinguish reachable states.
    virtual uint64_t            stateKey() const = 0;

    // Presentation
    virtual std::string render() const = 0;
    virtual std::string moveToString(const MoveT& move) const = 0;
};
