#ifndef TRIE_H
#define TRIE_H

#include "../json.hpp"
#include <string>
#include <unordered_map>
#include <vector>
#include <set>

using json = nlohmann::json;

struct TrieNode {
    std::unordered_map<char, TrieNode*> children;
    std::vector<json> songs; // Stores songs that end exactly at this word
};

class Trie {
private:
    TrieNode* root;

    void clear(TrieNode* node);
    void collectSongs(TrieNode* node, std::vector<json>& results, std::set<int>& seenIds, int limit);
    std::string toLower(const std::string& str);

public:
    Trie();
    ~Trie();

    void insert(const std::string& key, const json& song);
    std::vector<json> autocomplete(const std::string& prefix, int limit);
};

// Global instance for search
extern Trie g_searchTrie;

#endif // TRIE_H
