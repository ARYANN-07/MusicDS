#include "leftist_tree.h"

LeftistTree g_playQueue;

static int sVal(LeftistNode* n) { return n ? n->s : 0; }

LeftistNode* LeftistTree::mergeNodes(LeftistNode* h1, LeftistNode* h2) {
    if (!h1) return h2;
    if (!h2) return h1;

    // Max-heap: larger priority on top
    if (h1->priority < h2->priority) std::swap(h1, h2);

    h1->right = mergeNodes(h1->right, h2);

    // Maintain leftist property
    if (sVal(h1->left) < sVal(h1->right)) {
        std::swap(h1->left, h1->right);
    }
    h1->s = sVal(h1->right) + 1;
    return h1;
}

void LeftistTree::insert(int priority, int trackId, const json& song) {
    if (nodeMap_.count(trackId)) return;
    LeftistNode* node = new LeftistNode(priority, trackId, song);
    nodeMap_[trackId] = node;
    root_ = mergeNodes(root_, node);
    count_++;
}

LeftistTree::Result LeftistTree::extractMax() {
    if (!root_) return Result();
    LeftistNode* mx = root_;
    root_ = mergeNodes(root_->left, root_->right);
    count_--;
    nodeMap_.erase(mx->trackId);
    Result res(mx->priority, mx->song);
    delete mx;
    return res;
}

std::vector<json> LeftistTree::getAll(int limit) {
    std::vector<json> songs;
    std::vector<std::pair<int, json>> extracted;
    int mx = (limit > 0) ? limit : count_;

    for (int i = 0; i < mx && count_ > 0; i++) {
        Result r = extractMax();
        if (r.found) {
            json entry = r.song;
            entry["_priority"] = r.priority;
            songs.push_back(entry);
            extracted.push_back({r.priority, r.song});
        }
    }
    for (auto& p : extracted) {
        int tid = p.second.value("trackId", 0);
        insert(p.first, tid, p.second);
    }
    return songs;
}

void LeftistTree::clearNode(LeftistNode* node) {
    if (!node) return;
    clearNode(node->left);
    clearNode(node->right);
    delete node;
}

void LeftistTree::clear() {
    clearNode(root_);
    root_ = nullptr;
    count_ = 0;
    nodeMap_.clear();
}
