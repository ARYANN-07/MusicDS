#include "bplus_tree.h"
#include <algorithm>

BPlusTree g_userAuthTree;

BPlusTree::BPlusTree() : root(nullptr) {}

BPlusTree::~BPlusTree() {
    clear();
}

void BPlusTree::destroyTree(BPlusNode* node) {
    if (!node) return;
    if (!node->isLeaf) {
        for (auto* child : node->children) {
            destroyTree(child);
        }
    }
    delete node;
}

void BPlusTree::clear() {
    destroyTree(root);
    root = nullptr;
}

BPlusNode* BPlusTree::findLeaf(const std::string& key) {
    if (!root) return nullptr;
    BPlusNode* curr = root;
    while (!curr->isLeaf) {
        int i = 0;
        while (i < (int)curr->keys.size() && key >= curr->keys[i]) {
            i++;
        }
        curr = curr->children[i];
    }
    return curr;
}

json BPlusTree::search(const std::string& key) {
    BPlusNode* leaf = findLeaf(key);
    if (!leaf) return json();
    for (int i = 0; i < (int)leaf->keys.size(); i++) {
        if (leaf->keys[i] == key) {
            return leaf->values[i];
        }
    }
    return json();
}

bool BPlusTree::exists(const std::string& key) {
    return !search(key).is_null();
}

void BPlusTree::update(const std::string& key, const json& value) {
    BPlusNode* leaf = findLeaf(key);
    if (!leaf) return;
    for (int i = 0; i < (int)leaf->keys.size(); i++) {
        if (leaf->keys[i] == key) {
            leaf->values[i] = value;
            return;
        }
    }
}

void BPlusTree::insert(const std::string& key, const json& value) {
    // If tree is empty, create root leaf
    if (!root) {
        root = new BPlusNode(true);
        root->keys.push_back(key);
        root->values.push_back(value);
        return;
    }

    BPlusNode* leaf = findLeaf(key);

    // Check if key already exists — update instead
    for (int i = 0; i < (int)leaf->keys.size(); i++) {
        if (leaf->keys[i] == key) {
            leaf->values[i] = value;
            return;
        }
    }

    // Find insertion position
    int pos = 0;
    while (pos < (int)leaf->keys.size() && leaf->keys[pos] < key) {
        pos++;
    }
    leaf->keys.insert(leaf->keys.begin() + pos, key);
    leaf->values.insert(leaf->values.begin() + pos, value);

    // Split if overflow
    if ((int)leaf->keys.size() >= BPLUS_ORDER) {
        splitLeaf(leaf);
    }
}

void BPlusTree::splitLeaf(BPlusNode* leaf) {
    BPlusNode* newLeaf = new BPlusNode(true);
    int mid = (int)leaf->keys.size() / 2;

    // Move second half to new leaf
    newLeaf->keys.assign(leaf->keys.begin() + mid, leaf->keys.end());
    newLeaf->values.assign(leaf->values.begin() + mid, leaf->values.end());

    // Truncate original leaf
    leaf->keys.resize(mid);
    leaf->values.resize(mid);

    // Maintain leaf linked list
    newLeaf->next = leaf->next;
    leaf->next = newLeaf;

    // Promote first key of new leaf to parent
    std::string promotedKey = newLeaf->keys[0];

    if (leaf == root) {
        // Create new root
        BPlusNode* newRoot = new BPlusNode(false);
        newRoot->keys.push_back(promotedKey);
        newRoot->children.push_back(leaf);
        newRoot->children.push_back(newLeaf);
        root = newRoot;
    } else {
        insertInternal(promotedKey, newLeaf, findParent(root, leaf));
    }
}

BPlusNode* BPlusTree::findParent(BPlusNode* current, BPlusNode* child) {
    if (!current || current->isLeaf) return nullptr;
    for (auto* c : current->children) {
        if (c == child) return current;
        if (!c->isLeaf) {
            BPlusNode* result = findParent(c, child);
            if (result) return result;
        }
    }
    return nullptr;
}

void BPlusTree::insertInternal(const std::string& key, BPlusNode* child, BPlusNode* parent) {
    // Find position to insert
    int pos = 0;
    while (pos < (int)parent->keys.size() && parent->keys[pos] < key) {
        pos++;
    }
    parent->keys.insert(parent->keys.begin() + pos, key);
    parent->children.insert(parent->children.begin() + pos + 1, child);

    // Split if overflow
    if ((int)parent->keys.size() >= BPLUS_ORDER) {
        splitInternal(parent);
    }
}

void BPlusTree::splitInternal(BPlusNode* node) {
    int mid = (int)node->keys.size() / 2;
    std::string promotedKey = node->keys[mid];

    BPlusNode* newNode = new BPlusNode(false);
    newNode->keys.assign(node->keys.begin() + mid + 1, node->keys.end());
    newNode->children.assign(node->children.begin() + mid + 1, node->children.end());

    node->keys.resize(mid);
    node->children.resize(mid + 1);

    if (node == root) {
        BPlusNode* newRoot = new BPlusNode(false);
        newRoot->keys.push_back(promotedKey);
        newRoot->children.push_back(node);
        newRoot->children.push_back(newNode);
        root = newRoot;
    } else {
        insertInternal(promotedKey, newNode, findParent(root, node));
    }
}

std::vector<json> BPlusTree::getAllUsers() {
    std::vector<json> users;
    if (!root) return users;

    // Find leftmost leaf
    BPlusNode* curr = root;
    while (!curr->isLeaf) {
        curr = curr->children[0];
    }

    // Traverse linked list of leaves
    while (curr) {
        for (const auto& v : curr->values) {
            users.push_back(v);
        }
        curr = curr->next;
    }
    return users;
}
