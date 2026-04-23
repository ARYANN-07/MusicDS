#pragma once
#include <string>
#include "../json.hpp"

using json = nlohmann::json;

struct AVLNode {
    std::string key;
    json value;
    int height;
    AVLNode* left;
    AVLNode* right;
    AVLNode(const std::string& k, const json& v)
        : key(k), value(v), height(1), left(nullptr), right(nullptr) {}
};

class AVLTree {
public:
    AVLTree() : root_(nullptr) {}
    ~AVLTree() { destroy(root_); }

    void insert(const std::string& key, const json& value);
    // Returns json::null (json()) if not found
    json search(const std::string& key) const;
    void remove(const std::string& key);
    void clear();

private:
    AVLNode* root_;

    int height(AVLNode* n) const { return n ? n->height : 0; }
    int balance(AVLNode* n) const { return n ? height(n->left) - height(n->right) : 0; }
    void updateHeight(AVLNode* n);
    AVLNode* rotateRight(AVLNode* y);
    AVLNode* rotateLeft(AVLNode* x);
    AVLNode* insert(AVLNode* node, const std::string& key, const json& value);
    AVLNode* remove(AVLNode* node, const std::string& key);
    AVLNode* minNode(AVLNode* node) const;
    json search(AVLNode* node, const std::string& key) const;
    void destroy(AVLNode* node);
};

extern AVLTree g_userPreferencesTree;
