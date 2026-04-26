// TicTacToe with Move = TicTacToeMove (a data class).
//
// Kotlin idiom notes:
//   - `data class` gives us equals/hashCode/toString/copy for free —
//     even less ceremony than Python's @dataclass.
//   - The board is a CharArray; Kotlin's Array types specialize to avoid
//     boxing for primitives. Idiomatic for small fixed-size state.

package games

data class TicTacToeMove(val row: Int, val col: Int)

class TicTacToe : Game<TicTacToeMove> {
    private val cells = CharArray(9) { ' ' }
    private var current: Side = Side.ONE
    private var _winner: Side? = null

    private fun mark(s: Side): Char = if (s == Side.ONE) 'X' else 'O'

    private fun checkWinAt(r: Int, c: Int): Boolean {
        val m = cells[r * 3 + c]
        val row = (0..2).all { cc -> cells[r * 3 + cc] == m }
        val col = (0..2).all { rr -> cells[rr * 3 + c] == m }
        val d1 = r == c && (0..2).all { i -> cells[i * 3 + i] == m }
        val d2 = r + c == 2 && (0..2).all { i -> cells[i * 3 + (2 - i)] == m }
        return row || col || d1 || d2
    }

    override fun legalMoves(): List<TicTacToeMove> {
        if (_winner != null) return emptyList()
        return buildList {
            for (r in 0..2) for (c in 0..2)
                if (cells[r * 3 + c] == ' ') add(TicTacToeMove(r, c))
        }
    }

    override fun applyMove(move: TicTacToeMove) {
        cells[move.row * 3 + move.col] = mark(current)
        if (checkWinAt(move.row, move.col)) _winner = current
        current = current.other()
    }

    override fun currentSide(): Side = current
    override fun isOver(): Boolean = _winner != null || legalMoves().isEmpty()
    override fun winner(): Side? = _winner

    override fun render(): String = buildString {
        for (r in 0..2) {
            for (c in 0..2) {
                append(' '); append(cells[r * 3 + c])
                if (c < 2) append(" |")
            }
            append('\n')
            if (r < 2) append("---+---+---\n")
        }
    }

    override fun moveToString(move: TicTacToeMove): String = "(r${move.row},c${move.col})"
}
