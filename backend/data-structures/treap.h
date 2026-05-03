#pragma once
#include "../json.hpp"
#include <vector>
#include <unordered_map>
#include <cstdlib>
#include <ctime>

using json = nlohmann::json;

struct TreapNode {
    int trackId;
    double score;     // BST key (song score)
    int heapPriority; // random heap priority
    json song;
    TreapNode* left;
    TreapNode* right;

    TreapNode(int tid, double s, int hp, const json& sg)
        : trackId(tid), score(s), heapPriority(hp), song(sg),
          left(nullptr), right(nullptr) {}
};

class Treap {
public:
    Treap() : root_(nullptr), count_(0) {
        static bool seeded = false;
        if (!seeded) { srand((unsigned)time(nullptr)); seeded = true; }
    }
    ~Treap() { clear(); }

    void insert(int trackId, double score, const json& song);
    std::vector<json> getShuffle(int limit = -1);
    void reRandomize();
    bool has(int trackId) const { return nodeMap_.count(trackId) > 0; }
    int size() const { return count_; }
    void clear();

private:
    TreapNode* root_;
    int count_;
    std::unordered_map<int, TreapNode*> nodeMap_;

    TreapNode* rotateRight(TreapNode* node);
    TreapNode* rotateLeft(TreapNode* node);
    TreapNode* insertNode(TreapNode* node, TreapNode* newNode);
    void inorder(TreapNode* node, std::vector<json>& result, int limit);
    void clearNode(TreapNode* node);
    void collectAll(TreapNode* node, std::vector<std::tuple<int, double, json>>& items);
};

extern Treap g_shuffleTreap;
