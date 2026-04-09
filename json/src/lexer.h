#pragma once

#include "utf8_decoder.h"
#include "token.h"
#include <string>
#include <stdexcept>

// Stage 3: Lexer (Tokenizer)
// Transforms a stream of Unicode code points into JSON tokens.

class Lexer {
    UTF8Decoder &input_;

    // One-character lookahead buffer
    bool     has_peek_ = false;
    char32_t peeked_   = 0;
    int      peek_line_ = 1;
    int      peek_col_  = 1;

    // --- character-level helpers ---

    bool hasChar() const {
        return has_peek_ || input_.has();
    }

    char32_t peekChar() {
        if (!has_peek_) {
            peek_line_ = input_.line();
            peek_col_  = input_.col();
            peeked_    = input_.next();
            has_peek_  = true;
        }
        return peeked_;
    }

    char32_t nextChar() {
        if (has_peek_) {
            has_peek_ = false;
            return peeked_;
        }
        return input_.next();
    }

    void skipWhitespace() {
        while (hasChar()) {
            char32_t c = peekChar();
            if (c == ' ' || c == '\t' || c == '\n' || c == '\r')
                nextChar();
            else
                break;
        }
    }

    // --- UTF-8 encoding (code point -> bytes in std::string) ---

    static void appendUTF8(std::string &s, char32_t cp) {
        if (cp < 0x80) {
            s += static_cast<char>(cp);
        } else if (cp < 0x800) {
            s += static_cast<char>(0xC0 | (cp >> 6));
            s += static_cast<char>(0x80 | (cp & 0x3F));
        } else if (cp < 0x10000) {
            s += static_cast<char>(0xE0 | (cp >> 12));
            s += static_cast<char>(0x80 | ((cp >> 6) & 0x3F));
            s += static_cast<char>(0x80 | (cp & 0x3F));
        } else {
            s += static_cast<char>(0xF0 | (cp >> 18));
            s += static_cast<char>(0x80 | ((cp >> 12) & 0x3F));
            s += static_cast<char>(0x80 | ((cp >> 6) & 0x3F));
            s += static_cast<char>(0x80 | (cp & 0x3F));
        }
    }

    static int hexDigit(char32_t c) {
        if (c >= '0' && c <= '9') return c - '0';
        if (c >= 'a' && c <= 'f') return c - 'a' + 10;
        if (c >= 'A' && c <= 'F') return c - 'A' + 10;
        throw std::runtime_error("invalid hex digit in \\u escape");
    }

    // --- token readers ---

    Token readString() {
        int line = peek_line_, col = peek_col_;
        nextChar(); // consume opening "

        std::string value;
        while (true) {
            char32_t c = nextChar();
            if (c == '"') break;
            if (c == '\\') {
                c = nextChar();
                switch (c) {
                    case '"':  value += '"';  break;
                    case '\\': value += '\\'; break;
                    case '/':  value += '/';  break;
                    case 'b':  value += '\b'; break;
                    case 'f':  value += '\f'; break;
                    case 'n':  value += '\n'; break;
                    case 'r':  value += '\r'; break;
                    case 't':  value += '\t'; break;
                    case 'u': {
                        char32_t cp = 0;
                        for (int i = 0; i < 4; ++i)
                            cp = (cp << 4) | hexDigit(nextChar());
                        // Handle UTF-16 surrogate pairs (\uD800-\uDBFF + \uDC00-\uDFFF)
                        if (cp >= 0xD800 && cp <= 0xDBFF) {
                            char32_t hi = cp;
                            if (nextChar() != '\\' || nextChar() != 'u')
                                throw std::runtime_error("expected \\u low surrogate");
                            char32_t lo = 0;
                            for (int i = 0; i < 4; ++i)
                                lo = (lo << 4) | hexDigit(nextChar());
                            if (lo < 0xDC00 || lo > 0xDFFF)
                                throw std::runtime_error("invalid low surrogate");
                            cp = 0x10000 + ((hi - 0xD800) << 10) + (lo - 0xDC00);
                        }
                        appendUTF8(value, cp);
                        break;
                    }
                    default:
                        throw std::runtime_error("invalid escape sequence");
                }
            } else {
                appendUTF8(value, c);
            }
        }
        return Token(TokenType::STRING, value, line, col);
    }

    Token readNumber() {
        int line = peek_line_, col = peek_col_;
        std::string value;

        // Optional leading minus
        if (hasChar() && peekChar() == '-')
            value += static_cast<char>(nextChar());

        // Integer part
        if (hasChar() && peekChar() == '0') {
            value += static_cast<char>(nextChar());
        } else {
            if (!hasChar() || peekChar() < '1' || peekChar() > '9')
                throw std::runtime_error("invalid number at " +
                    std::to_string(line) + ":" + std::to_string(col));
            while (hasChar() && peekChar() >= '0' && peekChar() <= '9')
                value += static_cast<char>(nextChar());
        }

        // Fractional part
        if (hasChar() && peekChar() == '.') {
            value += static_cast<char>(nextChar());
            if (!hasChar() || peekChar() < '0' || peekChar() > '9')
                throw std::runtime_error("expected digit after decimal point");
            while (hasChar() && peekChar() >= '0' && peekChar() <= '9')
                value += static_cast<char>(nextChar());
        }

        // Exponent
        if (hasChar() && (peekChar() == 'e' || peekChar() == 'E')) {
            value += static_cast<char>(nextChar());
            if (hasChar() && (peekChar() == '+' || peekChar() == '-'))
                value += static_cast<char>(nextChar());
            if (!hasChar() || peekChar() < '0' || peekChar() > '9')
                throw std::runtime_error("expected digit in exponent");
            while (hasChar() && peekChar() >= '0' && peekChar() <= '9')
                value += static_cast<char>(nextChar());
        }

        return Token(TokenType::NUMBER, value, line, col);
    }

    Token readKeyword(const std::string &word, TokenType type) {
        int line = peek_line_, col = peek_col_;
        for (char expected : word) {
            char32_t got = nextChar();
            if (got != static_cast<char32_t>(expected))
                throw std::runtime_error(
                    "unexpected character in keyword at " +
                    std::to_string(line) + ":" + std::to_string(col));
        }
        return Token(type, word, line, col);
    }

public:
    explicit Lexer(UTF8Decoder &input) : input_(input) {}

    Token next() {
        skipWhitespace();

        if (!hasChar())
            return Token(TokenType::END, "", input_.line(), input_.col());

        char32_t c = peekChar();
        int line = peek_line_, col = peek_col_;

        switch (c) {
            case '{': nextChar(); return Token(TokenType::LEFT_BRACE,    "{", line, col);
            case '}': nextChar(); return Token(TokenType::RIGHT_BRACE,   "}", line, col);
            case '[': nextChar(); return Token(TokenType::LEFT_BRACKET,  "[", line, col);
            case ']': nextChar(); return Token(TokenType::RIGHT_BRACKET, "]", line, col);
            case ':': nextChar(); return Token(TokenType::COLON,         ":", line, col);
            case ',': nextChar(); return Token(TokenType::COMMA,         ",", line, col);
            case '"': return readString();
            case 't': return readKeyword("true",  TokenType::TRUE_LITERAL);
            case 'f': return readKeyword("false", TokenType::FALSE_LITERAL);
            case 'n': return readKeyword("null",  TokenType::NULL_LITERAL);
            default:
                if (c == '-' || (c >= '0' && c <= '9'))
                    return readNumber();
                throw std::runtime_error(
                    "unexpected character U+" +
                    std::to_string(static_cast<unsigned>(c)) +
                    " at " + std::to_string(line) + ":" + std::to_string(col));
        }
    }
};
