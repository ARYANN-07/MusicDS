#include "avl_tree.h"
#include <algorithm>

AVLTree g_userPreferencesTree;

void AVLTree::updateHeight(AVLNode* n) {
    n->height = 1 + std::max(height(n->left), height(n->right));
}

AVLNode* AVLTree::rotateRight(AVLNode* y) {
    AVLNode* x = y->left;
    AVLNode* T2 = x->right;
    x->right = y; y->left = T2;
    updateHeight(y); updateHeight(x);
    return x;
}

AVLNode* AVLTree::rotateLeft(AVLNode* x) {
    AVLNode* y = x->right;
    AVLNode* T2 = y->left;
    y->left = x; x->right = T2;
    updateHeight(x); updateHeight(y);
    return y;
}

AVLNode* AVLTree::insert(AVLNode* node, const std::string& key, const json& value) {
    if (!node) return new AVLNode(key, value);
    if (key < node->key)      node->left  = insert(node->left,  key, value);
    else if (key > node->key) node->right = insert(node->right, key, value);
    else { node->value = value; return node; }

    updateHeight(node);
    int bal = balance(node);
    if (bal > 1  && key < node->left->key)   return rotateRight(node);
    if (bal < -1 && key > node->right->key)  return rotateLeft(node);
    if (bal > 1  && key > node->left->key)   { node->left  = rotateLeft(node->left);   return rotateRight(node); }
    if (bal < -1 && key < node->right->key)  { node->right = rotateRight(node->right); return rotateLeft(node);  }
    return node;
}

AVLNode* AVLTree::minNode(AVLNode* node) const {
    while (node->left) node = node->left;
    return node;
}

AVLNode* AVLTree::remove(AVLNode* node, const std::string& key) {
    if (!node) return nullptr;
    if (key < node->key)      node->left  = remove(node->left,  key);
    else if (key > node->key) node->right = remove(node->right, key);
    else {
        if (!node->left || !node->right) {
            AVLNode* tmp = node->left ? node->left : node->right;
            delete node; return tmp;
        }
        AVLNode* tmp = minNode(node->right);
        node->key = tmp->key; node->value = tmp->value;
        node->right = remove(node->right, tmp->key);
    }
    updateHeight(node);
    int bal = balance(node);
    if (bal > 1  && balance(node->left)  >= 0) return rotateRight(node);
    if (bal > 1  && balance(node->left)  <  0) { node->left  = rotateLeft(node->left);   return rotateRight(node); }
    if (bal < -1 && balance(node->right) <= 0) return rotateLeft(node);
    if (bal < -1 && balance(node->right) >  0) { node->right = rotateRight(node->right); return rotateLeft(node);  }
    return node;
}

// Returns json() (null) if not found
json AVLTree::search(AVLNode* node, const std::string& key) const {
    if (!node) return json();
    if (key == node->key) return node->value;
    if (key < node->key)  return search(node->left, key);
    return search(node->right, key);
}

void AVLTree::destroy(AVLNode* node) {
    if (!node) return;
    destroy(node->left); destroy(node->right);
    delete node;
}

// Public API
void AVLTree::insert(const std::string& key, const json& value) {
    root_ = insert(root_, key, value);
}
json AVLTree::search(const std::string& key) const {
    return search(root_, key);
}
void AVLTree::remove(const std::string& key) {
    root_ = remove(root_, key);
}
void AVLTree::clear() {
    destroy(root_); root_ = nullptr;
}
