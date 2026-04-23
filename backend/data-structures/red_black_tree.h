#pragma once
#include <vector>
#include <unordered_map>
#include "../json.hpp"

using json = nlohmann::json;

enum class RBColor { RED, BLACK };

struct RBNode {
    int playCount;
    int trackId;
    json song;
    RBColor color;
    RBNode* left;
    RBNode* right;
    RBNode* parent;

    RBNode(int pc, int tid, const json& s)
        : playCount(pc), trackId(tid), song(s), color(RBColor::RED),
          left(nullptr), right(nullptr), parent(nullptr) {}
};

class RedBlackTree {
public:
    RedBlackTree();
    ~RedBlackTree();

    void incrementPlayCount(const json& song);
    std::vector<json> getTopCharts(int limit = 10) const;
    int getPlayCount(int trackId) const;
    void clear();

private:
    RBNode* root_;
    RBNode* nil_;
    std::unordered_map<int, RBNode*> nodeMap_;

    void insertNode(RBNode* z);
    void fixInsert(RBNode* z);
    void deleteNode(RBNode* z);
    void fixDelete(RBNode* x);
    void rotateLeft(RBNode* x);
    void rotateRight(RBNode* y);
    void transplant(RBNode* u, RBNode* v);
    RBNode* minimum(RBNode* node) const;
    void reverseInOrder(RBNode* node, std::vector<json>& result, int limit) const;
    void destroyTree(RBNode* node);
};

extern RedBlackTree g_topChartsTree;
