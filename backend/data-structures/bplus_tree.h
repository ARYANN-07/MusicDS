#ifndef BPLUS_TREE_H
#define BPLUS_TREE_H

#include "../json.hpp"
#include <string>
#include <vector>

using json = nlohmann::json;

// Simple djb2 hash for passwords (academic use only)
static unsigned long djb2Hash(const std::string& str) {
    unsigned long hash = 5381;
    for (char c : str) {
        hash = ((hash << 5) + hash) + (unsigned char)c;
    }
    return hash;
}

static std::string hashPassword(const std::string& password) {
    unsigned long h = djb2Hash(password);
    // Convert to hex string
    char buf[32];
    snprintf(buf, sizeof(buf), "%016lx", h);
    return std::string(buf);
}

// B+ Tree order (max keys per node)
const int BPLUS_ORDER = 4;

struct BPlusNode {
    bool isLeaf;
    std::vector<std::string> keys;
    std::vector<BPlusNode*> children;   // Internal nodes only
    std::vector<json> values;           // Leaf nodes only
    BPlusNode* next;                    // Leaf linked list pointer

    BPlusNode(bool leaf = false)
        : isLeaf(leaf), next(nullptr) {}
};

class BPlusTree {
private:
    BPlusNode* root;

    BPlusNode* findLeaf(const std::string& key);
    void insertInternal(const std::string& key, BPlusNode* child, BPlusNode* parent);
    BPlusNode* findParent(BPlusNode* current, BPlusNode* child);
    void splitLeaf(BPlusNode* leaf);
    void splitInternal(BPlusNode* node);

public:
    BPlusTree();
    ~BPlusTree();

    void insert(const std::string& key, const json& value);
    json search(const std::string& key);
    bool exists(const std::string& key);
    void update(const std::string& key, const json& value);
    std::vector<json> getAllUsers();
    void clear();

private:
    void destroyTree(BPlusNode* node);
};

extern BPlusTree g_userAuthTree;

#endif // BPLUS_TREE_H
