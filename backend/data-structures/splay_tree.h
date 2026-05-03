#ifndef SPLAY_TREE_H
#define SPLAY_TREE_H

#include "../json.hpp"
#include <vector>

using json = nlohmann::json;

struct SplayNode {
    int trackId;
    json song;
    SplayNode* left;
    SplayNode* right;
    SplayNode* parent;

    SplayNode(int id, const json& s)
        : trackId(id), song(s), left(nullptr), right(nullptr), parent(nullptr) {}
};

class SplayTree {
private:
    SplayNode* root;

    void leftRotate(SplayNode* x);
    void rightRotate(SplayNode* x);
    void splay(SplayNode* x);
    void clear(SplayNode* node);

public:
    SplayTree();
    ~SplayTree();

    void insert(int trackId, const json& song);
    json search(int trackId);
    std::vector<json> getRecent(int limit);
};

// Global instance for recently played
extern SplayTree g_recentHistoryTree;

#endif // SPLAY_TREE_H
