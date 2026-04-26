# A Note on Objects

Some thoughts on where OO stands in modern software, and what's worth telling a student about it. Written as a companion to the four-language game-engine example in this directory.

## Where objects stand now

Modern software increasingly deals with what you might call **object-shards** — entities too large to hold whole anywhere. The social network, the internet, a global user base. No single machine, process, or request carries the full thing. REST and GraphQL handlers are, in this view, methods on *facets* of these shards: a slice of state large enough to answer the current question, and no more.

That observation is real, and it explains why so much of the patterns winning at scale — event sourcing, CRDTs, immutable logs, pure projections, reducers — are functional in shape rather than object-oriented. State becomes "what you fold over a stream"; there's no `self`.

But it's a mistake to read this as the death of OO.

A few corrections to the obituary:

1. **OO's center of gravity moved; it didn't disappear.** The classic abstraction — a domain object that owns its state and enforces its invariants in one address space — is exactly where OO still wins. The `Game` / `Player` abstractions in this directory are unembarrassed examples. What changed is that this is no longer the *whole* problem; it's now the *inside* of services whose *outsides* are functional.

2. **The "object shard" insight is older than it looks.** Hewitt's actor model (1973) said an object is a message endpoint, not a state holder. Erlang shipped that view. What's new isn't sharding — it's that we tried for thirty years to pretend objects weren't sharded (RPC, ORM, "transparent" remoting), and that pretense finally collapsed. CRDTs and event sourcing are us admitting Hewitt was right.

3. **OO can still abstract complexity — just lazily.** A `User` doesn't have to *contain* the social graph; it just has to know how to answer questions about it. That's the **lazy flyweight** view: the object is a handle that delegates storage but keeps a coherent interface. Most modern ORMs, GraphQL resolvers, and ActiveRecord-shaped things do exactly this. The *shape* of the object survives even when the *storage* leaves.

4. **The thing OO actually offered was never inheritance.** It was **dispatch** — "send this message, the right code runs." Sum types and pattern matching cover the closed cases; traits and typeclasses cover the open ones. So OO-as-syntax is fading, but OO-as-semantic-pattern (polymorphic dispatch on runtime data) is everywhere, often hiding in code that calls itself functional.

5. **Functional and OO aren't really fighting.** Modern systems are FP *between* services and OO *within* them. A request handler is a pure function; the aggregate it calls is an object enforcing local invariants. The real winner of the last decade is arguably neither — it's *the type system itself* (sum types, traits, exhaustive matching), a third tradition (ML/Haskell) finally eating into both.

So: shards killed the **naive** object — the one that imagined it could hold everything in its fields — the same way HTTP killed naive RPC. The deeper instinct, that *code should travel with the data it operates on*, is alive in trait dispatch, in actor systems, in the `impl` blocks of this project. It's wearing different clothes.

## What I'd tell a student

Seven things, in roughly the order they matter.

1. **Build one object that owns its state, then build one that doesn't.** Our `TicTacToe` owns its board — invariants enforceable, the textbook works. Then go build a `User` backed by a database: same interface, but every method is a query. Feel the difference. That's the whole lesson.

2. **The real skill isn't OO vs. FP — it's knowing where the boundary is.** Inside a process, with state you own, OO earns its keep. Across a network, across processes, across time, think in functions and immutable data. Most bugs in distributed systems come from someone trying to make a remote thing feel like a local object. Don't do that. Make the seams visible.

3. **Encapsulation is about who's allowed to break your invariants, not about hiding fields.** Private members are a tool, not the goal. If your `Order` lets anyone mutate the line items but enforces "total = sum of items" at save time, you've lost. The point is: the object is the only place that can put the system in an inconsistent state, so it's the only place you have to look when it does.

4. **Inheritance is a trap; composition isn't.** Almost every "is-a" you can write is actually "has-a" or "acts-as-a." Our `RandomPlayer` doesn't inherit from `Game` — it *uses* one. That scales; deep inheritance trees don't.

5. **Polymorphism is the part worth keeping.** "Send this message, the right code runs" — whether you spell it `virtual`, `trait`, `interface`, or `match`, that idea is what makes large programs tractable. Learn it deeply in one language; it'll transfer.

6. **Write the same program in two paradigms at least once.** What this directory does across four languages, but smaller. You'll never read a "OOP vs. FP" blog post the same way again, because you'll see both are mostly arguing about syntax over the same underlying ideas.

7. **Be suspicious of any rule stated absolutely** — including these. "Always use composition." "Never use inheritance." "Functions are better than methods." Each is right about 70% of the time, which is exactly the percentage that makes them dangerous as rules. Learn when they fail.

## The short version

Objects are a tool for managing complexity by giving complexity a **name** and an **address**. That's still useful. It will keep being useful as long as humans have to read code. Just don't confuse the tool with the truth.
