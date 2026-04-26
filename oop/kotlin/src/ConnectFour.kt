// ConnectFour with Move = Int (column index).
//
// Kotlin idiom notes:
//   - We pass moves as plain Int. No boxing concerns for the call site —
//     just a Kotlin Int passed by value.

package games

class ConnectFour : Game<Int> {
    companion object {
        const val ROWS = 6
        const val COLS = 7
        const val NEED = 4
    }

    private val cells: Array<CharArray> = Array(ROWS) { CharArray(COLS) { '.' } }
    private var current: Side = Side.ONE
    private var _winner: Side? = null

    private fun mark(s: Side): Char = if (s == Side.ONE) 'X' else 'O'

    // Count consecutive marks in (dr,dc) from (r,c), exclusive.
    private fun run(r: Int, c: Int, dr: Int, dc: Int, m: Char): Int {
        var n = 0
        for (i in 1 until NEED) {
            val rr = r + dr * i
            val cc = c + dc * i
            if (rr !in 0 until ROWS || cc !in 0 until COLS) break
            if (cells[rr][cc] != m) break
            n++
        }
        return n
    }

    private fun checkWinAt(r: Int, c: Int): Boolean {
        val m = cells[r][c]
        val dirs = arrayOf(0 to 1, 1 to 0, 1 to 1, 1 to -1)
        return dirs.any { (dr, dc) ->
            1 + run(r, c, dr, dc, m) + run(r, c, -dr, -dc, m) >= NEED
        }
    }

    override fun legalMoves(): List<Int> {
        if (_winner != null) return emptyList()
        return (0 until COLS).filter { cells[0][it] == '.' }
    }

    override fun applyMove(move: Int) {
        var row = ROWS - 1
        while (row >= 0 && cells[row][move] != '.') row--
        cells[row][move] = mark(current)
        if (checkWinAt(row, move)) _winner = current
        current = current.other()
    }

    override fun currentSide(): Side = current
    override fun isOver(): Boolean = _winner != null || legalMoves().isEmpty()
    override fun winner(): Side? = _winner

    override fun render(): String = buildString {
        for (r in 0 until ROWS) {
            append('|')
            for (c in 0 until COLS) { append(cells[r][c]); append('|') }
            append('\n')
        }
        append(' ')
        for (c in 0 until COLS) { append(c); append(' ') }
        append('\n')
    }

    override fun moveToString(move: Int): String = "col $move"
}
