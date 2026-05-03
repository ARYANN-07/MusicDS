#pragma once
#include "../json.hpp"
#include <vector>
#include <unordered_map>

using json = nlohmann::json;

struct PairingNode {
    int votes;
    int trackId;
    json song;
    PairingNode* child;
    PairingNode* sibling;

    PairingNode(int v, int tid, const json& s)
        : votes(v), trackId(tid), song(s),
          child(nullptr), sibling(nullptr) {}
};

class PairingHeap {
public:
    PairingHeap() : root_(nullptr), count_(0) {}
    ~PairingHeap() { clear(); }

    void insert(int votes, int trackId, const json& song);
    void addVote(int trackId);

    struct Result {
        bool found;
        int votes;
        json song;
        Result() : found(false), votes(0) {}
        Result(int v, const json& s) : found(true), votes(v), song(s) {}
    };

    Result extractMax();
    std::vector<json> getTop(int limit);
    bool has(int trackId) const { return nodeMap_.count(trackId) > 0; }
    int getVotes(int trackId) const;
    int size() const { return count_; }
    void clear();

private:
    PairingNode* root_;
    int count_;
    std::unordered_map<int, PairingNode*> nodeMap_;

    static PairingNode* mergePairs(PairingNode* node);
    static PairingNode* mergeTwo(PairingNode* a, PairingNode* b);
    void clearNode(PairingNode* node);
};

extern PairingHeap g_collabQueue;
