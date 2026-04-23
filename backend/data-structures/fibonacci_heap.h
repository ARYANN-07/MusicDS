#pragma once
#include <unordered_map>
#include <vector>
#include <utility>
#include <cmath>
#include <cstdlib>
#include <ctime>
#include "../json.hpp"

using json = nlohmann::json;

struct FibNode {
    double score;
    int trackId;
    json song;
    int degree;
    bool marked;
    FibNode* parent;
    FibNode* child;
    FibNode* left;
    FibNode* right;

    FibNode(double s, int tid, const json& sg)
        : score(s), trackId(tid), song(sg), degree(0), marked(false),
          parent(nullptr), child(nullptr), left(nullptr), right(nullptr) {
        left = this;
        right = this;
    }
};

// Simple result type for extractMax (avoids std::optional)
struct FibResult {
    bool found;
    double score;
    json song;
    FibResult() : found(false), score(0.0) {}
    FibResult(double s, const json& sg) : found(true), score(s), song(sg) {}
};

class FibonacciHeap {
public:
    FibonacciHeap() : max_(nullptr), nodeCount_(0) {}
    ~FibonacciHeap() { clear(); }

    void insert(double score, int trackId, const json& song);
    void updateScore(int trackId, double newScore);
    FibResult extractMax();
    std::vector<json> getTopRecommendations(int limit = 10);
    void addRecommendation(const json& song, double baseScore, double genreBoost = 0.0);
    bool has(int trackId) const { return nodeMap_.count(trackId) > 0; }
    int size() const { return nodeCount_; }
    void clear();

private:
    FibNode* max_;
    int nodeCount_;
    std::unordered_map<int, FibNode*> nodeMap_;

    void addToRootList(FibNode* node);
    void removeFromRootList(FibNode* node);
    void consolidate();
    void link(FibNode* y, FibNode* x);
    void cut(FibNode* node, FibNode* parent);
    void cascadingCut(FibNode* node);
};

extern FibonacciHeap g_recommendationsHeap;
