CXX = g++
CXXFLAGS = -std=c++17 -Wall -Wextra -Isrc
TARGET = json_parser

all: $(TARGET)

$(TARGET): src/main.cpp src/source.h src/utf8_decoder.h src/token.h src/lexer.h src/ast.h src/parser.h
	$(CXX) $(CXXFLAGS) -o $@ src/main.cpp

clean:
	rm -f $(TARGET)

.PHONY: all clean
