#pragma once
#include "../json.hpp"
#include <string>
#include <vector>
#include <algorithm>

using json = nlohmann::json;

class SuffixArray {
public:
    SuffixArray() {}
    ~SuffixArray() {}

    // Build suffix array from a list of {text, song} pairs
    void build(const std::vector<std::pair<std::string, json>>& entries);

    // Search for substring, return matching songs (up to limit)
    std::vector<json> search(const std::string& query, int limit = 20);

    int size() const { return (int)sa_.size(); }

private:
    std::string text_;                      // concatenated text with separators
    std::vector<int> sa_;                   // suffix array indices
    std::vector<std::pair<int, int>> ranges_; // [start, end) in text_ for each entry
    std::vector<json> songs_;               // song data per entry

    static std::string toLower(const std::string& s);
    int findEntry(int textPos) const;       // which entry does this position belong to
};

extern SuffixArray g_suffixArray;
