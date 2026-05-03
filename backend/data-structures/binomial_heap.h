#pragma once
#include "../json.hpp"
#include <vector>
#include <unordered_map>

using json = nlohmann::json;

struct BinomialNode {
    int priority;
    int trackId;
    json song;
    int degree;
    BinomialNode* parent;
    BinomialNode* child;
    BinomialNode* sibling;

    BinomialNode(int p, int tid, const json& s)
        : priority(p), trackId(tid), song(s), degree(0),
          parent(nullptr), child(nullptr), sibling(nullptr) {}
};

class BinomialHeap {
public:
    BinomialHeap() : head_(nullptr), count_(0) {}
    ~BinomialHeap() { clear(); }

    void insert(int priority, int trackId, const json& song);

    struct Result {
        bool found;
        int priority;
        json song;
        Result() : found(false), priority(0) {}
        Result(int p, const json& s) : found(true), priority(p), song(s) {}
    };

    Result extractMax();
    std::vector<json> getAll(int limit = -1);
    bool has(int trackId) const { return nodeMap_.count(trackId) > 0; }
    int size() const { return count_; }
    void clear();

private:
    BinomialNode* head_;
    int count_;
    std::unordered_map<int, BinomialNode*> nodeMap_;

    static BinomialNode* mergeRootLists(BinomialNode* h1, BinomialNode* h2);
    static void linkTrees(BinomialNode* child, BinomialNode* parent);
    BinomialNode* unionHeaps(BinomialNode* h1, BinomialNode* h2);
    void clearNode(BinomialNode* node);
};

extern BinomialHeap g_downloadQueue;
