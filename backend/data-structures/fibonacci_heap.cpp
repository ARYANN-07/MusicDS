#include "fibonacci_heap.h"
#include <vector>
#include <cmath>

FibonacciHeap g_recommendationsHeap;

void FibonacciHeap::addToRootList(FibNode* node) {
    node->parent = nullptr;
    if (!max_) {
        max_ = node; node->left = node; node->right = node;
    } else {
        node->right = max_->right;
        node->left  = max_;
        max_->right->left = node;
        max_->right = node;
        if (node->score > max_->score) max_ = node;
    }
}

void FibonacciHeap::removeFromRootList(FibNode* node) {
    if (node->right == node) return;
    node->left->right = node->right;
    node->right->left = node->left;
}

void FibonacciHeap::insert(double score, int trackId, const json& song) {
    if (nodeMap_.count(trackId)) { updateScore(trackId, score); return; }
    FibNode* node = new FibNode(score, trackId, song);
    nodeMap_[trackId] = node;
    addToRootList(node);
    nodeCount_++;
}

void FibonacciHeap::link(FibNode* y, FibNode* x) {
    removeFromRootList(y);
    y->parent = x;
    if (!x->child) {
        x->child = y; y->left = y; y->right = y;
    } else {
        y->left = x->child;
        y->right = x->child->right;
        x->child->right->left = y;
        x->child->right = y;
    }
    x->degree++;
    y->marked = false;
}

void FibonacciHeap::consolidate() {
    if (!max_) return;
    int maxDeg = (int)std::floor(std::log((double)nodeCount_) / std::log(1.618)) + 2;
    std::vector<FibNode*> deg(maxDeg + 1, nullptr);

    std::vector<FibNode*> roots;
    FibNode* cur = max_;
    do { roots.push_back(cur); cur = cur->right; } while (cur != max_);

    for (FibNode* w : roots) {
        FibNode* x = w;
        int d = x->degree;
        while (d < (int)deg.size() && deg[d]) {
            FibNode* y = deg[d];
            if (x->score < y->score) { FibNode* tmp = x; x = y; y = tmp; }
            link(y, x);
            deg[d] = nullptr; d++;
        }
        if (d >= (int)deg.size()) deg.resize(d + 1, nullptr);
        deg[d] = x;
    }

    max_ = nullptr;
    for (FibNode* node : deg) {
        if (!node) continue;
        node->left = node; node->right = node;
        if (!max_) { max_ = node; }
        else { addToRootList(node); if (node->score > max_->score) max_ = node; }
    }
}

FibResult FibonacciHeap::extractMax() {
    if (!max_) return FibResult();
    FibNode* m = max_;

    if (m->child) {
        std::vector<FibNode*> kids;
        FibNode* c = m->child;
        do { kids.push_back(c); c = c->right; } while (c != m->child);
        for (FibNode* k : kids) { addToRootList(k); k->parent = nullptr; }
    }

    removeFromRootList(m);
    if (m->right == m) { max_ = nullptr; }
    else { max_ = m->right; consolidate(); }

    nodeCount_--;
    nodeMap_.erase(m->trackId);
    FibResult res(m->score, m->song);
    delete m;
    return res;
}

void FibonacciHeap::cut(FibNode* node, FibNode* parent) {
    if (node->right == node) { parent->child = nullptr; }
    else {
        if (parent->child == node) parent->child = node->right;
        node->left->right = node->right;
        node->right->left = node->left;
    }
    parent->degree--;
    addToRootList(node);
    node->marked = false;
}

void FibonacciHeap::cascadingCut(FibNode* node) {
    FibNode* p = node->parent;
    if (!p) return;
    if (!node->marked) { node->marked = true; }
    else { cut(node, p); cascadingCut(p); }
}

void FibonacciHeap::updateScore(int trackId, double newScore) {
    if (!nodeMap_.count(trackId)) return;
    FibNode* node = nodeMap_[trackId];
    if (newScore <= node->score) return;
    node->score = newScore;
    FibNode* p = node->parent;
    if (p && node->score > p->score) { cut(node, p); cascadingCut(p); }
    if (max_ && node->score > max_->score) max_ = node;
}

std::vector<json> FibonacciHeap::getTopRecommendations(int limit) {
    std::vector<json> songs;
    std::vector<std::pair<double,json>> extracted;

    for (int i = 0; i < limit && nodeCount_ > 0; i++) {
        FibResult r = extractMax();
        if (r.found) {
            songs.push_back(r.song);
            extracted.push_back({r.score, r.song});
        }
    }
    // re-insert so heap remains intact
    for (auto& p : extracted) {
        int tid = p.second.value("trackId", 0);
        FibNode* node = new FibNode(p.first, tid, p.second);
        nodeMap_[tid] = node;
        addToRootList(node);
        nodeCount_++;
    }
    return songs;
}

void FibonacciHeap::addRecommendation(const json& song, double baseScore, double genreBoost) {
    static bool seeded = false;
    if (!seeded) { srand((unsigned)time(nullptr)); seeded = true; }
    double score = baseScore + genreBoost + ((double)rand() / RAND_MAX) * 10.0;
    int trackId = song.value("trackId", 0);
    insert(score, trackId, song);
}

void FibonacciHeap::clear() {
    for (auto& kv : nodeMap_) delete kv.second;
    nodeMap_.clear();
    max_ = nullptr;
    nodeCount_ = 0;
}
