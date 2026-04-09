#pragma once

#include <memory>
#include <string>
#include <vector>
#include <iostream>

// AST node types for JSON values
enum class NodeType {
    OBJECT, ARRAY, STRING, NUMBER, BOOLEAN, NULL_VALUE
};

class Node;
using NodePtr = std::shared_ptr<Node>;

// --- Base class ---

class Node {
public:
    virtual ~Node() = default;
    virtual NodeType type() const = 0;
    virtual void print(std::ostream &os, int indent = 0) const = 0;

    friend std::ostream &operator<<(std::ostream &os, const Node &node) {
        node.print(os, 0);
        return os;
    }

protected:
    static void pad(std::ostream &os, int indent) {
        for (int i = 0; i < indent; ++i) os << "  ";
    }

    // Re-escape a string for JSON output
    static void writeJsonString(std::ostream &os, const std::string &s) {
        os << '"';
        for (unsigned char c : s) {
            switch (c) {
                case '"':  os << "\\\""; break;
                case '\\': os << "\\\\"; break;
                case '\b': os << "\\b";  break;
                case '\f': os << "\\f";  break;
                case '\n': os << "\\n";  break;
                case '\r': os << "\\r";  break;
                case '\t': os << "\\t";  break;
                default:
                    if (c < 0x20) {
                        char buf[8];
                        snprintf(buf, sizeof(buf), "\\u%04x", c);
                        os << buf;
                    } else {
                        os << c;
                    }
            }
        }
        os << '"';
    }
};

// --- Concrete node types ---

class StringNode : public Node {
    std::string value_;
public:
    explicit StringNode(std::string v) : value_(std::move(v)) {}
    NodeType type() const override { return NodeType::STRING; }
    const std::string &value() const { return value_; }

    void print(std::ostream &os, int /*indent*/) const override {
        writeJsonString(os, value_);
    }
};

class NumberNode : public Node {
    std::string raw_;   // original text representation
    double      num_;
public:
    explicit NumberNode(const std::string &raw)
        : raw_(raw), num_(std::stod(raw)) {}
    NodeType type() const override { return NodeType::NUMBER; }
    const std::string &raw() const { return raw_; }
    double             num() const { return num_; }

    void print(std::ostream &os, int /*indent*/) const override {
        os << raw_;
    }
};

class BoolNode : public Node {
    bool value_;
public:
    explicit BoolNode(bool v) : value_(v) {}
    NodeType type() const override { return NodeType::BOOLEAN; }
    bool value() const { return value_; }

    void print(std::ostream &os, int /*indent*/) const override {
        os << (value_ ? "true" : "false");
    }
};

class NullNode : public Node {
public:
    NodeType type() const override { return NodeType::NULL_VALUE; }

    void print(std::ostream &os, int /*indent*/) const override {
        os << "null";
    }
};

class ArrayNode : public Node {
    std::vector<NodePtr> elements_;
public:
    NodeType type() const override { return NodeType::ARRAY; }
    std::vector<NodePtr>       &elements()       { return elements_; }
    const std::vector<NodePtr> &elements() const { return elements_; }

    void add(NodePtr node) { elements_.push_back(std::move(node)); }

    void print(std::ostream &os, int indent) const override {
        if (elements_.empty()) { os << "[]"; return; }
        os << "[\n";
        for (size_t i = 0; i < elements_.size(); ++i) {
            pad(os, indent + 1);
            elements_[i]->print(os, indent + 1);
            if (i + 1 < elements_.size()) os << ',';
            os << '\n';
        }
        pad(os, indent);
        os << ']';
    }
};

// Object preserves insertion order (JSON objects are ordered in practice)
class ObjectNode : public Node {
public:
    using Member = std::pair<std::string, NodePtr>;
private:
    std::vector<Member> members_;
public:
    NodeType type() const override { return NodeType::OBJECT; }
    std::vector<Member>       &members()       { return members_; }
    const std::vector<Member> &members() const { return members_; }

    void add(const std::string &key, NodePtr value) {
        members_.emplace_back(key, std::move(value));
    }

    void print(std::ostream &os, int indent) const override {
        if (members_.empty()) { os << "{}"; return; }
        os << "{\n";
        for (size_t i = 0; i < members_.size(); ++i) {
            pad(os, indent + 1);
            writeJsonString(os, members_[i].first);
            os << ": ";
            members_[i].second->print(os, indent + 1);
            if (i + 1 < members_.size()) os << ',';
            os << '\n';
        }
        pad(os, indent);
        os << '}';
    }
};
