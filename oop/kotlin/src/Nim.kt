// Nim with Move = NimMove, Undo = NimUndo. State is a list of pile sizes.

package games

data class NimMove(val pile: Int, val count: Int)
data class NimUndo(val pile: Int, val count: Int, val prevWinner: Side?)

class Nim(piles: List<Int>) : Game<NimMove, NimUndo> {
    private val piles: IntArray = piles.toIntArray()
    private var current: Side = Side.ONE
    private var _winner: Side? = null

    override fun legalMoves(): List<NimMove> {
        if (_winner != null) return emptyList()
        return buildList {
            for (p in piles.indices)
                for (k in 1..piles[p])
                    add(NimMove(p, k))
        }
    }

    override fun applyMove(move: NimMove): NimUndo {
        val prevWinner = _winner
        piles[move.pile] -= move.count
        // Normal play: whoever takes the last stone wins.
        if (piles.all { it == 0 }) _winner = current
        current = current.other()
        return NimUndo(move.pile, move.count, prevWinner)
    }

    override fun undoMove(undo: NimUndo) {
        piles[undo.pile] += undo.count
        _winner = undo.prevWinner
        current = current.other()
    }

    override fun currentSide(): Side = current
    override fun isOver(): Boolean = _winner != null
    override fun winner(): Side? = _winner

    override fun stateKey(): Long {
        // 8 bits per pile (handles up to 255) + 1 side bit. With <= 7
        // piles this fits in 64 bits; we don't bother bounds-checking.
        var k = 0L
        for (i in piles.indices) {
            k = k or ((piles[i].toLong() and 0xFFL) shl (8 * i))
        }
        k = k or ((if (current == Side.ONE) 0L else 1L) shl (8 * piles.size))
        return k
    }

    override fun render(): String = buildString {
        for (i in piles.indices) {
            append("  pile $i: ")
            repeat(piles[i]) { append("* ") }
            append("(${piles[i]})\n")
        }
    }

    override fun moveToString(move: NimMove): String =
        "take ${move.count} from pile ${move.pile}"
}
