// Nim with Move = NimMove. State is a list of pile sizes.

package games

data class NimMove(val pile: Int, val count: Int)

class Nim(piles: List<Int>) : Game<NimMove> {
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

    override fun applyMove(move: NimMove) {
        piles[move.pile] -= move.count
        // Normal play: whoever takes the last stone wins.
        if (piles.all { it == 0 }) _winner = current
        current = current.other()
    }

    override fun currentSide(): Side = current
    override fun isOver(): Boolean = _winner != null
    override fun winner(): Side? = _winner

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
