// TicTacToe with Move = TicTacToeMove, Undo = TicTacToeUndo.
//
// Kotlin idiom notes:
//   - `data class` gives us equals/hashCode/toString/copy for free —
//     even less ceremony than Python's @dataclass.
//   - The board is a CharArray; Kotlin's Array types specialize to avoid
//     boxing for primitives. Idiomatic for small fixed-size state.
//   - The Undo carries only the bits applyMove changed: the cell it
//     filled and the previous winner. currentSide flips back via .other().

package games

data class TicTacToeMove(val row: Int, val col: Int)
data class TicTacToeUndo(val cell: Int, val prevWinner: Side?)

class TicTacToe : Game<TicTacToeMove, TicTacToeUndo> {
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

    override fun applyMove(move: TicTacToeMove): TicTacToeUndo {
        val cell = move.row * 3 + move.col
        val prevWinner = _winner
        cells[cell] = mark(current)
        if (checkWinAt(move.row, move.col)) _winner = current
        current = current.other()
        return TicTacToeUndo(cell, prevWinner)
    }

    override fun undoMove(undo: TicTacToeUndo) {
        cells[undo.cell] = ' '
        _winner = undo.prevWinner
        current = current.other()
    }

    override fun currentSide(): Side = current
    override fun isOver(): Boolean = _winner != null || legalMoves().isEmpty()
    override fun winner(): Side? = _winner

    override fun stateKey(): Long {
        // 9 cells * 2 bits + 1 side bit = 19 bits total. Empty=0, X=1, O=2.
        var k = 0L
        for (i in 0..8) {
            val v = when (cells[i]) { ' ' -> 0L; 'X' -> 1L; else -> 2L }
            k = k or (v shl (2 * i))
        }
        k = k or ((if (current == Side.ONE) 0L else 1L) shl 18)
        return k
    }

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
