#pragma once

#include <string>
#include <iostream>

// Token types for JSON
enum class TokenType {
    LEFT_BRACE,     // {
    RIGHT_BRACE,    // }
    LEFT_BRACKET,   // [
    RIGHT_BRACKET,  // ]
    COLON,          // :
    COMMA,          // ,
    STRING,         // "..."
    NUMBER,         // 123, -1.5e10
    TRUE_LITERAL,   // true
    FALSE_LITERAL,  // false
    NULL_LITERAL,   // null
    END             // end of input
};

inline const char *tokenTypeName(TokenType t) {
    switch (t) {
        case TokenType::LEFT_BRACE:    return "{";
        case TokenType::RIGHT_BRACE:   return "}";
        case TokenType::LEFT_BRACKET:  return "[";
        case TokenType::RIGHT_BRACKET: return "]";
        case TokenType::COLON:         return ":";
        case TokenType::COMMA:         return ",";
        case TokenType::STRING:        return "STRING";
        case TokenType::NUMBER:        return "NUMBER";
        case TokenType::TRUE_LITERAL:  return "TRUE";
        case TokenType::FALSE_LITERAL: return "FALSE";
        case TokenType::NULL_LITERAL:  return "NULL";
        case TokenType::END:           return "END";
    }
    return "?";
}

// Wrapper object for a single token.
// Carries its type, string value, and source position.
class Token {
    TokenType type_;
    std::string value_;
    int line_;
    int col_;

public:
    Token() : type_(TokenType::END), line_(0), col_(0) {}

    Token(TokenType type, std::string value, int line, int col)
        : type_(type), value_(std::move(value)), line_(line), col_(col) {}

    TokenType          type()  const { return type_; }
    const std::string &value() const { return value_; }
    int                line()  const { return line_; }
    int                col()   const { return col_; }

    bool is(TokenType t) const { return type_ == t; }

    friend std::ostream &operator<<(std::ostream &os, const Token &t) {
        os << "Token(" << tokenTypeName(t.type_);
        if (!t.value_.empty()) os << ", \"" << t.value_ << "\"";
        os << ", " << t.line_ << ":" << t.col_ << ")";
        return os;
    }
};
