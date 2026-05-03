#include "treap.h"
#include <tuple>

Treap g_shuffleTreap;

TreapNode* Treap::rotateRight(TreapNode* node) {
    TreapNode* l = node->left;
    node->left = l->right;
    l->right = node;
    return l;
}

TreapNode* Treap::rotateLeft(TreapNode* node) {
    TreapNode* r = node->right;
    node->right = r->left;
    r->left = node;
    return r;
}

TreapNode* Treap::insertNode(TreapNode* node, TreapNode* newNode) {
    if (!node) return newNode;

    if (newNode->score <= node->score) {
        node->left = insertNode(node->left, newNode);
        if (node->left->heapPriority > node->heapPriority) {
            node = rotateRight(node);
        }
    } else {
        node->right = insertNode(node->right, newNode);
        if (node->right->heapPriority > node->heapPriority) {
            node = rotateLeft(node);
        }
    }
    return node;
}

void Treap::insert(int trackId, double score, const json& song) {
    if (nodeMap_.count(trackId)) return;
    int hp = rand();
    TreapNode* node = new TreapNode(trackId, score, hp, song);
    nodeMap_[trackId] = node;
    root_ = insertNode(root_, node);
    count_++;
}

void Treap::inorder(TreapNode* node, std::vector<json>& result, int limit) {
    if (!node || (limit > 0 && (int)result.size() >= limit)) return;
    inorder(node->left, result, limit);
    if (limit > 0 && (int)result.size() >= limit) return;
    json entry = node->song;
    entry["_score"] = node->score;
    entry["_heapPriority"] = node->heapPriority;
    result.push_back(entry);
    inorder(node->right, result, limit);
}

std::vector<json> Treap::getShuffle(int limit) {
    std::vector<json> result;
    inorder(root_, result, limit);
    return result;
}

void Treap::collectAll(TreapNode* node, std::vector<std::tuple<int, double, json>>& items) {
    if (!node) return;
    collectAll(node->left, items);
    items.push_back(std::make_tuple(node->trackId, node->score, node->song));
    collectAll(node->right, items);
}

void Treap::reRandomize() {
    // Collect all items, clear tree, re-insert with new random priorities
    std::vector<std::tuple<int, double, json>> items;
    collectAll(root_, items);

    clearNode(root_);
    root_ = nullptr;
    count_ = 0;
    nodeMap_.clear();

    for (auto& t : items) {
        insert(std::get<0>(t), std::get<1>(t), std::get<2>(t));
    }
}

void Treap::clearNode(TreapNode* node) {
    if (!node) return;
    clearNode(node->left);
    clearNode(node->right);
    delete node;
}

void Treap::clear() {
    clearNode(root_);
    root_ = nullptr;
    count_ = 0;
    nodeMap_.clear();
}
