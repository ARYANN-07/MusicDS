#include "patricia_trie.h"
#include <algorithm>
#include <cctype>

PatriciaTrie g_patriciaTrie;

PatriciaTrie::PatriciaTrie() {
    root_ = new PatriciaNode();
    nodeCount_ = 1;
}

PatriciaTrie::~PatriciaTrie() {
    clear(root_);
}

void PatriciaTrie::clear(PatriciaNode* node) {
    if (!node) return;
    for (auto& p : node->edges) {
        clear(p.second.child);
    }
    delete node;
}

std::string PatriciaTrie::toLower(const std::string& s) {
    std::string r = s;
    std::transform(r.begin(), r.end(), r.begin(),
                   [](unsigned char c) { return std::tolower(c); });
    return r;
}

void PatriciaTrie::insert(const std::string& key, const json& song) {
    std::string lk = toLower(key);
    PatriciaNode* curr = root_;
    size_t pos = 0;

    while (pos < lk.size()) {
        char firstChar = lk[pos];
        auto it = curr->edges.find(firstChar);

        if (it == curr->edges.end()) {
            // No edge starting with this char — create new edge + leaf
            PatriciaNode* leaf = new PatriciaNode();
            nodeCount_++;
            curr->edges[firstChar] = {lk.substr(pos), leaf};
            curr = leaf;
            pos = lk.size(); // done
        } else {
            std::string& edgeLabel = it->second.label;
            PatriciaNode* child = it->second.child;

            // Find common prefix length between remaining key and edge label
            size_t commonLen = 0;
            size_t maxLen = std::min(edgeLabel.size(), lk.size() - pos);
            while (commonLen < maxLen && edgeLabel[commonLen] == lk[pos + commonLen]) {
                commonLen++;
            }

            if (commonLen == edgeLabel.size()) {
                // Edge label fully matched, continue down
                pos += commonLen;
                curr = child;
            } else {
                // Split the edge
                PatriciaNode* splitNode = new PatriciaNode();
                nodeCount_++;

                // The split node takes over the remainder of the old edge
                std::string oldRemainder = edgeLabel.substr(commonLen);
                std::string newRemainder = lk.substr(pos + commonLen);

                splitNode->edges[oldRemainder[0]] = {oldRemainder, child};

                // Update the current edge to point to splitNode with the common prefix
                it->second.label = edgeLabel.substr(0, commonLen);
                it->second.child = splitNode;

                if (newRemainder.empty()) {
                    // Key ends exactly at the split point
                    curr = splitNode;
                    pos = lk.size();
                } else {
                    // Create a new leaf for the remaining key
                    PatriciaNode* leaf = new PatriciaNode();
                    nodeCount_++;
                    splitNode->edges[newRemainder[0]] = {newRemainder, leaf};
                    curr = leaf;
                    pos = lk.size();
                }
            }
        }
    }

    // Add song at the final node, avoiding duplicates
    int newTrackId = song.value("trackId", 0);
    bool exists = false;
    for (const auto& s : curr->songs) {
        if (s.value("trackId", 0) == newTrackId) { exists = true; break; }
    }
    if (!exists) curr->songs.push_back(song);
}

void PatriciaTrie::collectSongs(PatriciaNode* node, std::vector<json>& results,
                                 std::set<int>& seen, int limit) {
    if (!node || (int)results.size() >= limit) return;

    for (const auto& song : node->songs) {
        int tid = song.value("trackId", 0);
        if (seen.find(tid) == seen.end()) {
            seen.insert(tid);
            results.push_back(song);
            if ((int)results.size() >= limit) return;
        }
    }
    for (auto& p : node->edges) {
        collectSongs(p.second.child, results, seen, limit);
        if ((int)results.size() >= limit) return;
    }
}

std::vector<json> PatriciaTrie::autocomplete(const std::string& prefix, int limit) {
    std::vector<json> results;
    std::set<int> seen;
    std::string lp = toLower(prefix);

    PatriciaNode* curr = root_;
    size_t pos = 0;

    while (pos < lp.size()) {
        char firstChar = lp[pos];
        auto it = curr->edges.find(firstChar);
        if (it == curr->edges.end()) return results; // prefix not found

        const std::string& edgeLabel = it->second.label;
        size_t remaining = lp.size() - pos;

        if (remaining <= edgeLabel.size()) {
            // Check if the remaining prefix matches the start of the edge label
            if (edgeLabel.substr(0, remaining) == lp.substr(pos)) {
                // Prefix ends within or at the end of this edge
                curr = it->second.child;
                // Also collect songs from the intermediate match if prefix ended mid-edge
                // The edge leads to the child — collect from child
                break;
            } else {
                return results; // mismatch
            }
        } else {
            // Edge label is shorter than remaining prefix — must match fully
            if (lp.substr(pos, edgeLabel.size()) == edgeLabel) {
                pos += edgeLabel.size();
                curr = it->second.child;
            } else {
                return results; // mismatch
            }
        }
    }

    collectSongs(curr, results, seen, limit);
    return results;
}
