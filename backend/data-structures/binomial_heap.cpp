#include "binomial_heap.h"

BinomialHeap g_downloadQueue;

BinomialNode* BinomialHeap::mergeRootLists(BinomialNode* h1, BinomialNode* h2) {
    if (!h1) return h2;
    if (!h2) return h1;

    BinomialNode* head = nullptr;
    BinomialNode* tail = nullptr;

    while (h1 && h2) {
        BinomialNode* next;
        if (h1->degree <= h2->degree) {
            next = h1; h1 = h1->sibling;
        } else {
            next = h2; h2 = h2->sibling;
        }
        next->sibling = nullptr;
        if (!head) { head = tail = next; }
        else { tail->sibling = next; tail = next; }
    }
    BinomialNode* rem = h1 ? h1 : h2;
    if (tail) tail->sibling = rem;
    else head = rem;
    return head;
}

void BinomialHeap::linkTrees(BinomialNode* child, BinomialNode* parent) {
    child->parent = parent;
    child->sibling = parent->child;
    parent->child = child;
    parent->degree++;
}

BinomialNode* BinomialHeap::unionHeaps(BinomialNode* h1, BinomialNode* h2) {
    BinomialNode* merged = mergeRootLists(h1, h2);
    if (!merged) return nullptr;

    BinomialNode* prev = nullptr;
    BinomialNode* curr = merged;
    BinomialNode* next = curr->sibling;

    while (next) {
        if (curr->degree != next->degree ||
            (next->sibling && next->sibling->degree == curr->degree)) {
            prev = curr; curr = next;
        } else if (curr->priority >= next->priority) {
            curr->sibling = next->sibling;
            linkTrees(next, curr);
        } else {
            if (!prev) merged = next;
            else prev->sibling = next;
            linkTrees(curr, next);
            curr = next;
        }
        next = curr->sibling;
    }
    return merged;
}

void BinomialHeap::insert(int priority, int trackId, const json& song) {
    if (nodeMap_.count(trackId)) return;
    BinomialNode* node = new BinomialNode(priority, trackId, song);
    nodeMap_[trackId] = node;
    head_ = unionHeaps(head_, node);
    count_++;
}

BinomialHeap::Result BinomialHeap::extractMax() {
    if (!head_) return Result();

    BinomialNode* maxNode = head_;
    BinomialNode* maxPrev = nullptr;
    BinomialNode* prev = nullptr;
    BinomialNode* curr = head_;

    while (curr) {
        if (curr->priority > maxNode->priority) {
            maxNode = curr; maxPrev = prev;
        }
        prev = curr; curr = curr->sibling;
    }

    if (maxPrev) maxPrev->sibling = maxNode->sibling;
    else head_ = maxNode->sibling;

    // Reverse children to form a new heap
    BinomialNode* childList = nullptr;
    BinomialNode* child = maxNode->child;
    while (child) {
        BinomialNode* nxt = child->sibling;
        child->sibling = childList;
        child->parent = nullptr;
        childList = child;
        child = nxt;
    }

    head_ = unionHeaps(head_, childList);
    count_--;
    nodeMap_.erase(maxNode->trackId);
    Result res(maxNode->priority, maxNode->song);
    delete maxNode;
    return res;
}

std::vector<json> BinomialHeap::getAll(int limit) {
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

void BinomialHeap::clearNode(BinomialNode* node) {
    if (!node) return;
    clearNode(node->child);
    clearNode(node->sibling);
    delete node;
}

void BinomialHeap::clear() {
    clearNode(head_);
    head_ = nullptr;
    count_ = 0;
    nodeMap_.clear();
}
