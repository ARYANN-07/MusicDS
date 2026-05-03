#include "splay_tree.h"
#include <queue>

SplayTree g_recentHistoryTree;

SplayTree::SplayTree() : root(nullptr) {}

SplayTree::~SplayTree() {
    clear(root);
}

void SplayTree::clear(SplayNode* node) {
    if (node) {
        clear(node->left);
        clear(node->right);
        delete node;
    }
}

void SplayTree::leftRotate(SplayNode* x) {
    SplayNode* y = x->right;
    if (!y) return;
    
    x->right = y->left;
    if (y->left != nullptr) {
        y->left->parent = x;
    }
    y->parent = x->parent;
    if (x->parent == nullptr) {
        this->root = y;
    } else if (x == x->parent->left) {
        x->parent->left = y;
    } else {
        x->parent->right = y;
    }
    y->left = x;
    x->parent = y;
}

void SplayTree::rightRotate(SplayNode* x) {
    SplayNode* y = x->left;
    if (!y) return;
    
    x->left = y->right;
    if (y->right != nullptr) {
        y->right->parent = x;
    }
    y->parent = x->parent;
    if (x->parent == nullptr) {
        this->root = y;
    } else if (x == x->parent->right) {
        x->parent->right = y;
    } else {
        x->parent->left = y;
    }
    y->right = x;
    x->parent = y;
}

void SplayTree::splay(SplayNode* x) {
    while (x->parent != nullptr) {
        if (x->parent->parent == nullptr) {
            // Zig step
            if (x->parent->left == x) {
                rightRotate(x->parent);
            } else {
                leftRotate(x->parent);
            }
        } else if (x->parent->left == x && x->parent->parent->left == x->parent) {
            // Zig-zig step
            rightRotate(x->parent->parent);
            rightRotate(x->parent);
        } else if (x->parent->right == x && x->parent->parent->right == x->parent) {
            // Zig-zig step
            leftRotate(x->parent->parent);
            leftRotate(x->parent);
        } else if (x->parent->right == x && x->parent->parent->left == x->parent) {
            // Zig-zag step
            leftRotate(x->parent);
            rightRotate(x->parent);
        } else {
            // Zig-zag step
            rightRotate(x->parent);
            leftRotate(x->parent);
        }
    }
}

void SplayTree::insert(int trackId, const json& song) {
    SplayNode* node = new SplayNode(trackId, song);
    SplayNode* y = nullptr;
    SplayNode* x = this->root;

    while (x != nullptr) {
        y = x;
        if (node->trackId < x->trackId) {
            x = x->left;
        } else if (node->trackId > x->trackId) {
            x = x->right;
        } else {
            // Already exists, just update song and splay
            x->song = song;
            delete node;
            splay(x);
            return;
        }
    }

    node->parent = y;
    if (y == nullptr) {
        root = node;
    } else if (node->trackId < y->trackId) {
        y->left = node;
    } else {
        y->right = node;
    }

    splay(node);
}

json SplayTree::search(int trackId) {
    SplayNode* x = root;
    while (x != nullptr) {
        if (trackId < x->trackId) {
            x = x->left;
        } else if (trackId > x->trackId) {
            x = x->right;
        } else {
            splay(x);
            return x->song;
        }
    }
    return json();
}

std::vector<json> SplayTree::getRecent(int limit) {
    std::vector<json> result;
    if (!root) return result;

    std::queue<SplayNode*> q;
    q.push(root);

    while (!q.empty() && result.size() < (size_t)limit) {
        SplayNode* curr = q.front();
        q.pop();

        result.push_back(curr->song);

        if (curr->left) q.push(curr->left);
        if (curr->right) q.push(curr->right);
    }

    return result;
}
