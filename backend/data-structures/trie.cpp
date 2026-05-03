#include "trie.h"
#include <algorithm>
#include <cctype>

Trie g_searchTrie;

Trie::Trie() {
    root = new TrieNode();
}

Trie::~Trie() {
    clear(root);
}

void Trie::clear(TrieNode* node) {
    if (!node) return;
    for (auto& pair : node->children) {
        clear(pair.second);
    }
    delete node;
}

std::string Trie::toLower(const std::string& str) {
    std::string lowerStr = str;
    std::transform(lowerStr.begin(), lowerStr.end(), lowerStr.begin(),
                   [](unsigned char c){ return std::tolower(c); });
    return lowerStr;
}

void Trie::insert(const std::string& key, const json& song) {
    std::string lowerKey = toLower(key);
    TrieNode* curr = root;

    for (char c : lowerKey) {
        if (curr->children.find(c) == curr->children.end()) {
            curr->children[c] = new TrieNode();
        }
        curr = curr->children[c];
    }

    // Avoid duplicates
    int newTrackId = song.value("trackId", 0);
    bool exists = false;
    for (const auto& s : curr->songs) {
        if (s.value("trackId", 0) == newTrackId) {
            exists = true;
            break;
        }
    }

    if (!exists) {
        curr->songs.push_back(song);
    }
}

void Trie::collectSongs(TrieNode* node, std::vector<json>& results, std::set<int>& seenIds, int limit) {
    if (!node) return;
    if (results.size() >= (size_t)limit) return;

    for (const auto& song : node->songs) {
        int trackId = song.value("trackId", 0);
        if (seenIds.find(trackId) == seenIds.end()) {
            seenIds.insert(trackId);
            results.push_back(song);
            if (results.size() >= (size_t)limit) return;
        }
    }

    for (auto& pair : node->children) {
        collectSongs(pair.second, results, seenIds, limit);
        if (results.size() >= (size_t)limit) return;
    }
}

std::vector<json> Trie::autocomplete(const std::string& prefix, int limit) {
    std::vector<json> results;
    std::set<int> seenIds;
    std::string lowerPrefix = toLower(prefix);

    TrieNode* curr = root;
    for (char c : lowerPrefix) {
        if (curr->children.find(c) == curr->children.end()) {
            return results; // Prefix not found
        }
        curr = curr->children[c];
    }

    // Found prefix, collect all songs in subtree
    collectSongs(curr, results, seenIds, limit);
    return results;
}
