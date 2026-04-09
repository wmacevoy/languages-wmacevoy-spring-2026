# JSON Recursive Descent Parser

A C++17 JSON parser built as a chain of transformers, demonstrating how parsers decompose input stage by stage from raw bytes to a structured parse tree.

## Transformer Chain

```
std::string ──▶ Source ──▶ UTF8Decoder ──▶ Lexer ──▶ Parser ──▶ AST
               (bytes)    (code points)   (tokens)            (tree)
```

Each stage pulls from the previous one through a simple `has()`/`next()` interface:

| Stage | Header | Responsibility |
|---|---|---|
| **Source** | `src/source.h` | Yields raw bytes, tracks line and column |
| **UTF8Decoder** | `src/utf8_decoder.h` | Decodes multi-byte UTF-8 into Unicode code points |
| **Lexer** | `src/lexer.h` | Produces tokens (strings, numbers, keywords, punctuation) |
| **Parser** | `src/parser.h` | Recursive descent over the JSON grammar, builds an AST |

## Wrapper Objects

**Token** (`src/token.h`) — carries a `TokenType`, string value, and source position. Supports stream output for debugging.

**AST Nodes** (`src/ast.h`) — `Node` base class with concrete types:

- `ObjectNode` — ordered list of key/value members
- `ArrayNode` — ordered list of child nodes
- `StringNode`, `NumberNode`, `BoolNode`, `NullNode` — leaf values

All nodes support pretty-printed JSON output via `operator<<`.

## Build

Requires a C++17 compiler (g++ or clang++).

```sh
make
```

## Run

```sh
./json_parser
```

This parses a built-in sample document and prints two things:

1. **Token stream** — the output of the lexer, showing each token with its type, value, and source position.
2. **Parse tree** — the AST pretty-printed back as formatted JSON, including decoded Unicode (`\u00e9` → é, surrogate pairs → emoji).

## Grammar

The parser implements standard JSON ([RFC 8259](https://datatracker.ietf.org/doc/html/rfc8259)):

```
json   → value END
value  → object | array | STRING | NUMBER | TRUE | FALSE | NULL
object → '{' (member (',' member)*)? '}'
member → STRING ':' value
array  → '[' (value (',' value)*)? ']'
```

## Example Usage in Code

```cpp
#include "source.h"
#include "utf8_decoder.h"
#include "lexer.h"
#include "parser.h"

std::string input = R"({"key": [1, true, null]})";

Source      source(input);
UTF8Decoder utf8(source);
Lexer       lexer(utf8);
Parser      parser(lexer);

NodePtr root = parser.parse();   // returns the AST
std::cout << *root << std::endl; // pretty-prints JSON
```
