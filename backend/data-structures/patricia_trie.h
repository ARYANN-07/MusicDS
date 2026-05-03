#pragma once
#include "../json.hpp"
#include <string>
#include <vector>
#include <map>
#include <set>

using json = nlohmann::json;

struct PatriciaEdge {
    std::string label;
    struct PatriciaNode* child;
};

struct PatriciaNode {
    std::map<char, PatriciaEdge> edges; // first-char -> edge
    std::vector<json> songs;
};

class PatriciaTrie {
public:
    PatriciaTrie();
    ~PatriciaTrie();

    void insert(const std::string& key, const json& song);
    std::vector<json> autocomplete(const std::string& prefix, int limit);
    int getNodeCount() const { return nodeCount_; }

private:
    PatriciaNode* root_;
    int nodeCount_;

    void clear(PatriciaNode* node);
    void collectSongs(PatriciaNode* node, std::vector<json>& results, std::set<int>& seen, int limit);
    static std::string toLower(const std::string& s);
};

extern PatriciaTrie g_patriciaTrie;
