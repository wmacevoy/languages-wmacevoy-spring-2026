#pragma once

#include "source.h"
#include <stdexcept>

// Stage 2: UTF-8 Decoder
// Transforms a byte stream into Unicode code points (char32_t).
// Validates multi-byte sequences per RFC 3629.

class UTF8Decoder {
    Source &source_;

public:
    explicit UTF8Decoder(Source &source) : source_(source) {}

    bool has() const { return source_.has(); }

    // Position delegates to source (byte-level).
    // For pure-ASCII JSON this equals character position.
    int line() const { return source_.line(); }
    int col()  const { return source_.col(); }

    char32_t next() {
        uint8_t b0 = source_.next();

        // Single-byte (ASCII)
        if (b0 < 0x80) return b0;

        int extra;      // continuation bytes expected
        char32_t cp;    // accumulator

        if      ((b0 & 0xE0) == 0xC0) { extra = 1; cp = b0 & 0x1F; }
        else if ((b0 & 0xF0) == 0xE0) { extra = 2; cp = b0 & 0x0F; }
        else if ((b0 & 0xF8) == 0xF0) { extra = 3; cp = b0 & 0x07; }
        else throw std::runtime_error("invalid UTF-8 lead byte");

        for (int i = 0; i < extra; ++i) {
            uint8_t b = source_.next();
            if ((b & 0xC0) != 0x80)
                throw std::runtime_error("invalid UTF-8 continuation byte");
            cp = (cp << 6) | (b & 0x3F);
        }

        // Reject overlong encodings and surrogates
        if ((extra == 1 && cp < 0x80) ||
            (extra == 2 && cp < 0x800) ||
            (extra == 3 && cp < 0x10000) ||
            (cp >= 0xD800 && cp <= 0xDFFF) ||
            cp > 0x10FFFF)
            throw std::runtime_error("invalid Unicode code point");

        return cp;
    }
};
