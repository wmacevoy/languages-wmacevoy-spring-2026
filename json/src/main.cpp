#include "source.h"
#include "utf8_decoder.h"
#include "lexer.h"
#include "parser.h"

#include <iostream>
#include <string>

// Demonstrate the full transformer chain:
//   Source (bytes) -> UTF8Decoder (code points) -> Lexer (tokens) -> Parser (AST)

static NodePtr parseJSON(const std::string &input) {
    Source      source(input);
    UTF8Decoder utf8(source);
    Lexer       lexer(utf8);
    Parser      parser(lexer);
    return parser.parse();
}

// Dump token stream (does not build AST)
static void showTokens(const std::string &input) {
    Source      source(input);
    UTF8Decoder utf8(source);
    Lexer       lexer(utf8);

    std::cout << "Tokens:\n";
    while (true) {
        Token t = lexer.next();
        std::cout << "  " << t << "\n";
        if (t.is(TokenType::END)) break;
    }
    std::cout << "\n";
}

int main() {
    std::string json = R"({
  "name": "JSON Parser",
  "version": 2.1,
  "keywords": ["recursive descent", "C++17", null],
  "metadata": {
    "author": "demo",
    "stable": true,
    "deprecated": false
  },
  "counts": [1, -2, 3.14, 6.022e23],
  "empty_obj": {},
  "empty_arr": [],
  "unicode": "caf\u00e9 \uD83D\uDE00"
})";

    // Stage 3 output: show the token stream
    showTokens(json);

    // Stage 4 output: parse into AST and pretty-print
    try {
        NodePtr root = parseJSON(json);
        std::cout << "Parse tree (pretty-printed JSON):\n";
        std::cout << *root << "\n";
    } catch (const std::runtime_error &e) {
        std::cerr << "Parse error: " << e.what() << "\n";
        return 1;
    }

    return 0;
}
