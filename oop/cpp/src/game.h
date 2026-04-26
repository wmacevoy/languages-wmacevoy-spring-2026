#pragma once

// Game<MoveT> is the abstract base class all games inherit from.
//
// C++ idiom notes:
//   - This is a CLASS TEMPLATE with pure virtual functions: compile-time
//     generics (MoveT) combined with runtime polymorphism (virtual).
//   - We template on MoveT because each game has a different Move type
//     (TicTacToeMove, int for ConnectFour, NimMove). Rust expresses this
//     with an associated type on a trait; Python doesn't need to say
//     anything (duck typing); Kotlin uses a generic interface Game<M>.
//   - virtual ~Game() = default is required so derived destructors run
//     through a base pointer / unique_ptr<Game<...>>.

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

template <typename MoveT>
class Game {
public:
    virtual ~Game() = default;

    // Rules
    virtual std::vector<MoveT> legalMoves() const = 0;
    virtual void              applyMove(const MoveT& move) = 0;

    // State queries
    virtual Side                currentSide() const = 0;
    virtual bool                isOver() const = 0;
    virtual std::optional<Side> winner() const = 0;   // nullopt => draw / ongoing

    // Presentation
    virtual std::string render() const = 0;
    virtual std::string moveToString(const MoveT& move) const = 0;
};
