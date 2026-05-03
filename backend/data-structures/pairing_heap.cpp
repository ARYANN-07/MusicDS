#include "pairing_heap.h"
#include <vector>

PairingHeap g_collabQueue;

PairingNode* PairingHeap::mergeTwo(PairingNode* a, PairingNode* b) {
    if (!a) return b;
    if (!b) return a;

    if (a->votes < b->votes) {
        PairingNode* tmp = a; a = b; b = tmp;
    }
    // b becomes leftmost child of a
    b->sibling = a->child;
    a->child = b;
    a->sibling = nullptr;
    return a;
}

PairingNode* PairingHeap::mergePairs(PairingNode* node) {
    if (!node) return nullptr;
    if (!node->sibling) return node;

    PairingNode* a = node;
    PairingNode* b = node->sibling;
    PairingNode* rest = b->sibling;

    a->sibling = nullptr;
    b->sibling = nullptr;

    PairingNode* merged = mergeTwo(a, b);
    PairingNode* restMerged = mergePairs(rest);
    return mergeTwo(merged, restMerged);
}

void PairingHeap::insert(int votes, int trackId, const json& song) {
    if (nodeMap_.count(trackId)) {
        addVote(trackId);
        return;
    }
    PairingNode* node = new PairingNode(votes, trackId, song);
    nodeMap_[trackId] = node;
    root_ = mergeTwo(root_, node);
    count_++;
}

void PairingHeap::addVote(int trackId) {
    if (!nodeMap_.count(trackId)) return;
    // For pairing heap, increaseKey requires cut+merge
    // Simple approach: extract all, increase, re-insert
    PairingNode* target = nodeMap_[trackId];
    int newVotes = target->votes + 1;
    json song = target->song;

    // Rebuild without the target
    std::vector<std::pair<int, std::pair<int, json>>> items;
    while (count_ > 0) {
        Result r = extractMax();
        if (r.found) {
            int tid = r.song.value("trackId", 0);
            int v = (tid == trackId) ? newVotes : r.votes;
            items.push_back({v, {tid, r.song}});
        }
    }
    for (auto& it : items) {
        PairingNode* n = new PairingNode(it.first, it.second.first, it.second.second);
        nodeMap_[it.second.first] = n;
        root_ = mergeTwo(root_, n);
        count_++;
    }
}

PairingHeap::Result PairingHeap::extractMax() {
    if (!root_) return Result();
    PairingNode* mx = root_;

    root_ = mergePairs(root_->child);
    count_--;
    nodeMap_.erase(mx->trackId);
    Result res(mx->votes, mx->song);
    delete mx;
    return res;
}

int PairingHeap::getVotes(int trackId) const {
    auto it = nodeMap_.find(trackId);
    return it != nodeMap_.end() ? it->second->votes : 0;
}

std::vector<json> PairingHeap::getTop(int limit) {
    std::vector<json> songs;
    std::vector<std::tuple<int, int, json>> extracted;
    int mx = (limit > 0) ? limit : count_;

    for (int i = 0; i < mx && count_ > 0; i++) {
        Result r = extractMax();
        if (r.found) {
            json entry = r.song;
            entry["_votes"] = r.votes;
            songs.push_back(entry);
            extracted.push_back(std::make_tuple(r.votes, r.song.value("trackId", 0), r.song));
        }
    }
    for (auto& t : extracted) {
        PairingNode* n = new PairingNode(std::get<0>(t), std::get<1>(t), std::get<2>(t));
        nodeMap_[std::get<1>(t)] = n;
        root_ = mergeTwo(root_, n);
        count_++;
    }
    return songs;
}

void PairingHeap::clearNode(PairingNode* node) {
    if (!node) return;
    clearNode(node->child);
    clearNode(node->sibling);
    delete node;
}

void PairingHeap::clear() {
    clearNode(root_);
    root_ = nullptr;
    count_ = 0;
    nodeMap_.clear();
}
