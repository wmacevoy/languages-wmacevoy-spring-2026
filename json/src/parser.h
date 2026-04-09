#pragma once

#include "lexer.h"
#include "ast.h"
#include <stdexcept>

// Stage 4: Parser
// Recursive-descent parser that transforms tokens into an AST.
//
// Grammar:
//   json   -> value END
//   value  -> object | array | STRING | NUMBER | TRUE | FALSE | NULL
//   object -> '{' (member (',' member)*)? '}'
//   member -> STRING ':' value
//   array  -> '[' (value (',' value)*)? ']'

class Parser {
    Lexer &lexer_;
    Token current_;
    bool  has_token_ = false;

    // --- token helpers ---

    Token &peek() {
        if (!has_token_) {
            current_   = lexer_.next();
            has_token_ = true;
        }
        return current_;
    }

    Token advance() {
        Token t = peek();
        has_token_ = false;
        return t;
    }

    Token expect(TokenType type) {
        Token t = advance();
        if (!t.is(type))
            throw std::runtime_error(
                std::string("expected ") + tokenTypeName(type) +
                " but got " + tokenTypeName(t.type()) +
                " at " + std::to_string(t.line()) + ":" + std::to_string(t.col()));
        return t;
    }

    // --- recursive-descent rules ---

    NodePtr parseValue() {
        Token &t = peek();
        switch (t.type()) {
            case TokenType::LEFT_BRACE:   return parseObject();
            case TokenType::LEFT_BRACKET: return parseArray();
            case TokenType::STRING:       return parseString();
            case TokenType::NUMBER:       return parseNumber();
            case TokenType::TRUE_LITERAL: return parseBool(true);
            case TokenType::FALSE_LITERAL:return parseBool(false);
            case TokenType::NULL_LITERAL: return parseNull();
            default:
                throw std::runtime_error(
                    std::string("unexpected token ") + tokenTypeName(t.type()) +
                    " at " + std::to_string(t.line()) + ":" + std::to_string(t.col()));
        }
    }

    NodePtr parseObject() {
        expect(TokenType::LEFT_BRACE);
        auto obj = std::make_shared<ObjectNode>();

        if (!peek().is(TokenType::RIGHT_BRACE)) {
            parseMember(*obj);
            while (peek().is(TokenType::COMMA)) {
                advance(); // consume ','
                parseMember(*obj);
            }
        }

        expect(TokenType::RIGHT_BRACE);
        return obj;
    }

    void parseMember(ObjectNode &obj) {
        Token key = expect(TokenType::STRING);
        expect(TokenType::COLON);
        obj.add(key.value(), parseValue());
    }

    NodePtr parseArray() {
        expect(TokenType::LEFT_BRACKET);
        auto arr = std::make_shared<ArrayNode>();

        if (!peek().is(TokenType::RIGHT_BRACKET)) {
            arr->add(parseValue());
            while (peek().is(TokenType::COMMA)) {
                advance(); // consume ','
                arr->add(parseValue());
            }
        }

        expect(TokenType::RIGHT_BRACKET);
        return arr;
    }

    NodePtr parseString() {
        Token t = advance();
        return std::make_shared<StringNode>(t.value());
    }

    NodePtr parseNumber() {
        Token t = advance();
        return std::make_shared<NumberNode>(t.value());
    }

    NodePtr parseBool(bool val) {
        advance();
        return std::make_shared<BoolNode>(val);
    }

    NodePtr parseNull() {
        advance();
        return std::make_shared<NullNode>();
    }

public:
    explicit Parser(Lexer &lexer) : lexer_(lexer) {}

    // Parse a complete JSON document
    NodePtr parse() {
        NodePtr root = parseValue();
        Token end = peek();
        if (!end.is(TokenType::END))
            throw std::runtime_error(
                "trailing content at " +
                std::to_string(end.line()) + ":" + std::to_string(end.col()));
        return root;
    }
};
