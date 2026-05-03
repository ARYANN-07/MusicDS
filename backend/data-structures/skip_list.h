#pragma once
#include "../json.hpp"
#include <vector>
#include <string>
#include <cstdlib>
#include <ctime>

using json = nlohmann::json;

struct SkipNode {
    int version;
    json snapshot; // array of songs at this version
    std::vector<SkipNode*> forward; // forward pointers per level

    SkipNode(int v, const json& s, int level)
        : version(v), snapshot(s), forward(level + 1, nullptr) {}
};

class SkipList {
public:
    SkipList(int maxLevel = 16);
    ~SkipList();

    void insert(int version, const json& snapshot);
    json search(int version) const;
    json getLatest() const;
    int getLatestVersion() const { return latestVersion_; }
    std::vector<json> getAllVersions() const;
    int size() const { return count_; }

private:
    int maxLevel_;
    int currentLevel_;
    int count_;
    int latestVersion_;
    SkipNode* header_;

    int randomLevel();
    void clear();
};

// Per-user skip lists stored in a map in main.cpp
