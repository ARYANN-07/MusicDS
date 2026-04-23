#include "red_black_tree.h"
#include <stdexcept>

RedBlackTree g_topChartsTree;

RedBlackTree::RedBlackTree() {
    nil_ = new RBNode(0, -1, json{});
    nil_->color = RBColor::BLACK;
    nil_->left = nil_->right = nil_->parent = nil_;
    root_ = nil_;
}

RedBlackTree::~RedBlackTree() {
    destroyTree(root_);
    delete nil_;
}

void RedBlackTree::rotateLeft(RBNode* x) {
    RBNode* y = x->right;
    x->right = y->left;
    if (y->left != nil_) y->left->parent = x;
    y->parent = x->parent;
    if (x->parent == nil_)       root_ = y;
    else if (x == x->parent->left) x->parent->left = y;
    else                           x->parent->right = y;
    y->left = x;
    x->parent = y;
}

void RedBlackTree::rotateRight(RBNode* y) {
    RBNode* x = y->left;
    y->left = x->right;
    if (x->right != nil_) x->right->parent = y;
    x->parent = y->parent;
    if (y->parent == nil_)       root_ = x;
    else if (y == y->parent->right) y->parent->right = x;
    else                            y->parent->left = x;
    x->right = y;
    y->parent = x;
}

void RedBlackTree::fixInsert(RBNode* z) {
    while (z->parent->color == RBColor::RED) {
        RBNode* gp = z->parent->parent;
        if (z->parent == gp->left) {
            RBNode* uncle = gp->right;
            if (uncle->color == RBColor::RED) {
                z->parent->color = RBColor::BLACK;
                uncle->color     = RBColor::BLACK;
                gp->color        = RBColor::RED;
                z = gp;
            } else {
                if (z == z->parent->right) { z = z->parent; rotateLeft(z); }
                z->parent->color = RBColor::BLACK;
                gp->color        = RBColor::RED;
                rotateRight(gp);
            }
        } else {
            RBNode* uncle = gp->left;
            if (uncle->color == RBColor::RED) {
                z->parent->color = RBColor::BLACK;
                uncle->color     = RBColor::BLACK;
                gp->color        = RBColor::RED;
                z = gp;
            } else {
                if (z == z->parent->left) { z = z->parent; rotateRight(z); }
                z->parent->color = RBColor::BLACK;
                gp->color        = RBColor::RED;
                rotateLeft(gp);
            }
        }
    }
    root_->color = RBColor::BLACK;
}

void RedBlackTree::insertNode(RBNode* z) {
    z->left = z->right = z->parent = nil_;
    RBNode* y = nil_;
    RBNode* x = root_;
    while (x != nil_) {
        y = x;
        if (z->playCount < x->playCount || (z->playCount == x->playCount && z->trackId < x->trackId))
            x = x->left;
        else
            x = x->right;
    }
    z->parent = y;
    if (y == nil_)                                          root_ = z;
    else if (z->playCount < y->playCount || (z->playCount == y->playCount && z->trackId < y->trackId))
        y->left = z;
    else
        y->right = z;
    fixInsert(z);
}

void RedBlackTree::transplant(RBNode* u, RBNode* v) {
    if (u->parent == nil_)        root_ = v;
    else if (u == u->parent->left) u->parent->left = v;
    else                           u->parent->right = v;
    v->parent = u->parent;
}

RBNode* RedBlackTree::minimum(RBNode* node) const {
    while (node->left != nil_) node = node->left;
    return node;
}

void RedBlackTree::fixDelete(RBNode* x) {
    while (x != root_ && x->color == RBColor::BLACK) {
        if (x == x->parent->left) {
            RBNode* w = x->parent->right;
            if (w->color == RBColor::RED) {
                w->color = RBColor::BLACK;
                x->parent->color = RBColor::RED;
                rotateLeft(x->parent);
                w = x->parent->right;
            }
            if (w->left->color == RBColor::BLACK && w->right->color == RBColor::BLACK) {
                w->color = RBColor::RED; x = x->parent;
            } else {
                if (w->right->color == RBColor::BLACK) {
                    w->left->color = RBColor::BLACK; w->color = RBColor::RED;
                    rotateRight(w); w = x->parent->right;
                }
                w->color = x->parent->color;
                x->parent->color = RBColor::BLACK;
                w->right->color  = RBColor::BLACK;
                rotateLeft(x->parent); x = root_;
            }
        } else {
            RBNode* w = x->parent->left;
            if (w->color == RBColor::RED) {
                w->color = RBColor::BLACK;
                x->parent->color = RBColor::RED;
                rotateRight(x->parent);
                w = x->parent->left;
            }
            if (w->right->color == RBColor::BLACK && w->left->color == RBColor::BLACK) {
                w->color = RBColor::RED; x = x->parent;
            } else {
                if (w->left->color == RBColor::BLACK) {
                    w->right->color = RBColor::BLACK; w->color = RBColor::RED;
                    rotateLeft(w); w = x->parent->left;
                }
                w->color = x->parent->color;
                x->parent->color = RBColor::BLACK;
                w->left->color   = RBColor::BLACK;
                rotateRight(x->parent); x = root_;
            }
        }
    }
    x->color = RBColor::BLACK;
}

void RedBlackTree::deleteNode(RBNode* z) {
    RBNode* y = z;
    RBNode* x;
    RBColor yOrigColor = y->color;

    if (z->left == nil_) {
        x = z->right; transplant(z, z->right);
    } else if (z->right == nil_) {
        x = z->left; transplant(z, z->left);
    } else {
        y = minimum(z->right);
        yOrigColor = y->color;
        x = y->right;
        if (y->parent == z) { x->parent = y; }
        else { transplant(y, y->right); y->right = z->right; y->right->parent = y; }
        transplant(z, y);
        y->left = z->left; y->left->parent = y;
        y->color = z->color;
    }
    if (yOrigColor == RBColor::BLACK) fixDelete(x);
}

void RedBlackTree::incrementPlayCount(const json& song) {
    int trackId = song.value("trackId", 0);
    if (nodeMap_.count(trackId)) {
        RBNode* existing = nodeMap_[trackId];
        int newCount = existing->playCount + 1;
        nodeMap_.erase(trackId);
        deleteNode(existing);
        delete existing;
        json updatedSong = song;
        updatedSong["playCount"] = newCount;
        RBNode* newNode = new RBNode(newCount, trackId, updatedSong);
        nodeMap_[trackId] = newNode;
        insertNode(newNode);
    } else {
        json updatedSong = song;
        updatedSong["playCount"] = 1;
        RBNode* newNode = new RBNode(1, trackId, updatedSong);
        nodeMap_[trackId] = newNode;
        insertNode(newNode);
    }
}

void RedBlackTree::reverseInOrder(RBNode* node, std::vector<json>& result, int limit) const {
    if (node == nil_ || (int)result.size() >= limit) return;
    reverseInOrder(node->right, result, limit);
    if ((int)result.size() < limit) {
        result.push_back({ {"song", node->song}, {"playCount", node->playCount} });
    }
    reverseInOrder(node->left, result, limit);
}

std::vector<json> RedBlackTree::getTopCharts(int limit) const {
    std::vector<json> result;
    reverseInOrder(root_, result, limit);
    return result;
}

int RedBlackTree::getPlayCount(int trackId) const {
    auto it = nodeMap_.find(trackId);
    return it != nodeMap_.end() ? it->second->playCount : 0;
}

void RedBlackTree::destroyTree(RBNode* node) {
    if (node == nil_) return;
    destroyTree(node->left);
    destroyTree(node->right);
    delete node;
}

void RedBlackTree::clear() {
    destroyTree(root_);
    root_ = nil_;
    nodeMap_.clear();
}
