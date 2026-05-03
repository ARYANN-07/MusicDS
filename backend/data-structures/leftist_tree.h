#pragma once
#include "../json.hpp"
#include <vector>
#include <unordered_map>
#include <algorithm>

using json = nlohmann::json;

struct LeftistNode {
    int priority;
    int trackId;
    json song;
    int s; // null-path length
    LeftistNode* left;
    LeftistNode* right;

    LeftistNode(int p, int tid, const json& sg)
        : priority(p), trackId(tid), song(sg), s(1),
          left(nullptr), right(nullptr) {}
};

class LeftistTree {
public:
    LeftistTree() : root_(nullptr), count_(0) {}
    ~LeftistTree() { clear(); }

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
    int size() const { return count_; }
    bool has(int trackId) const { return nodeMap_.count(trackId) > 0; }
    void clear();

private:
    LeftistNode* root_;
    int count_;
    std::unordered_map<int, LeftistNode*> nodeMap_;

    static LeftistNode* mergeNodes(LeftistNode* h1, LeftistNode* h2);
    void clearNode(LeftistNode* node);
};

extern LeftistTree g_playQueue;
