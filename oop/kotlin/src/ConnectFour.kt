// ConnectFour with Move = Int (column), Undo = ConnectFourUndo.
//
// Parameterized on (rows, cols, need) so the same code covers the
// standard 6x7-need-4 game and small variants useful for benchmarking
// optimal play (e.g. 4x4-need-3). The full 6x7 game is far beyond a
// naive minimax — it's left as a hook for richer search strategies.

package games

data class ConnectFourUndo(val col: Int, val row: Int, val prevWinner: Side?)

class ConnectFour(
    private val rows: Int = 6,
    private val cols: Int = 7,
    private val need: Int = 4,
) : Game<Int, ConnectFourUndo> {

    private val cells: Array<CharArray> = Array(rows) { CharArray(cols) { '.' } }
    private var current: Side = Side.ONE
    private var _winner: Side? = null

    private fun mark(s: Side): Char = if (s == Side.ONE) 'X' else 'O'

    // Count consecutive marks in (dr,dc) from (r,c), exclusive.
    private fun run(r: Int, c: Int, dr: Int, dc: Int, m: Char): Int {
        var n = 0
        for (i in 1 until need) {
            val rr = r + dr * i
            val cc = c + dc * i
            if (rr !in 0 until rows || cc !in 0 until cols) break
            if (cells[rr][cc] != m) break
            n++
        }
        return n
    }

    private fun checkWinAt(r: Int, c: Int): Boolean {
        val m = cells[r][c]
        val dirs = arrayOf(0 to 1, 1 to 0, 1 to 1, 1 to -1)
        return dirs.any { (dr, dc) ->
            1 + run(r, c, dr, dc, m) + run(r, c, -dr, -dc, m) >= need
        }
    }

    override fun legalMoves(): List<Int> {
        if (_winner != null) return emptyList()
        return (0 until cols).filter { cells[0][it] == '.' }
    }

    override fun applyMove(move: Int): ConnectFourUndo {
        val prevWinner = _winner
        var row = rows - 1
        while (row >= 0 && cells[row][move] != '.') row--
        cells[row][move] = mark(current)
        if (checkWinAt(row, move)) _winner = current
        current = current.other()
        return ConnectFourUndo(move, row, prevWinner)
    }

    override fun undoMove(undo: ConnectFourUndo) {
        cells[undo.row][undo.col] = '.'
        _winner = undo.prevWinner
        current = current.other()
    }

    override fun currentSide(): Side = current
    override fun isOver(): Boolean = _winner != null || legalMoves().isEmpty()
    override fun winner(): Side? = _winner

    override fun stateKey(): Long {
        // rows*cols cells * 2 bits + 1 side bit. Empty=0, X=1, O=2.
        // Caller is responsible for using a small enough board to fit u64
        // (i.e. rows*cols <= 31). Benchmark uses 4x4 = 16 cells -> 33 bits.
        var k = 0L
        var i = 0
        for (r in 0 until rows) {
            for (c in 0 until cols) {
                val v = when (cells[r][c]) { '.' -> 0L; 'X' -> 1L; else -> 2L }
                k = k or (v shl (2 * i))
                i++
            }
        }
        k = k or ((if (current == Side.ONE) 0L else 1L) shl (2 * i))
        return k
    }

    override fun render(): String = buildString {
        for (r in 0 until rows) {
            append('|')
            for (c in 0 until cols) { append(cells[r][c]); append('|') }
            append('\n')
        }
        append(' ')
        for (c in 0 until cols) { append(c); append(' ') }
        append('\n')
    }

    override fun moveToString(move: Int): String = "col $move"
}
