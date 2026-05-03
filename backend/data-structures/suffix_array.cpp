#include "suffix_array.h"
#include <cctype>
#include <set>
#include <numeric>

SuffixArray g_suffixArray;

std::string SuffixArray::toLower(const std::string& s) {
    std::string r = s;
    std::transform(r.begin(), r.end(), r.begin(),
                   [](unsigned char c) { return std::tolower(c); });
    return r;
}

void SuffixArray::build(const std::vector<std::pair<std::string, json>>& entries) {
    text_.clear();
    sa_.clear();
    ranges_.clear();
    songs_.clear();

    // Concatenate all texts with a unique separator '\1'
    for (size_t i = 0; i < entries.size(); i++) {
        int start = (int)text_.size();
        std::string lower = toLower(entries[i].first);
        text_ += lower;
        int end = (int)text_.size();
        ranges_.push_back({start, end});
        songs_.push_back(entries[i].second);
        text_ += '\1'; // separator — won't appear in normal text
    }

    // Build suffix array using simple O(n log^2 n) approach
    int n = (int)text_.size();
    sa_.resize(n);
    std::iota(sa_.begin(), sa_.end(), 0); // sa[i] = i

    // Sort suffixes lexicographically
    const std::string& txt = text_;
    std::sort(sa_.begin(), sa_.end(), [&txt](int a, int b) {
        return txt.compare(a, std::string::npos, txt, b, std::string::npos) < 0;
    });
}

int SuffixArray::findEntry(int textPos) const {
    // Binary search to find which entry this position belongs to
    for (size_t i = 0; i < ranges_.size(); i++) {
        if (textPos >= ranges_[i].first && textPos < ranges_[i].second) {
            return (int)i;
        }
    }
    return -1;
}

std::vector<json> SuffixArray::search(const std::string& query, int limit) {
    std::vector<json> results;
    if (sa_.empty() || query.empty()) return results;

    std::string lq = toLower(query);
    int qlen = (int)lq.size();
    int n = (int)sa_.size();
    std::set<int> seenEntries;

    // Binary search for lower bound
    int lo = 0, hi = n;
    while (lo < hi) {
        int mid = (lo + hi) / 2;
        if (text_.compare(sa_[mid], qlen, lq) < 0) lo = mid + 1;
        else hi = mid;
    }

    // Scan matches from lower bound
    for (int i = lo; i < n && (int)results.size() < limit; i++) {
        if (text_.compare(sa_[i], qlen, lq) != 0) break;

        int entryIdx = findEntry(sa_[i]);
        if (entryIdx >= 0 && seenEntries.find(entryIdx) == seenEntries.end()) {
            seenEntries.insert(entryIdx);
            results.push_back(songs_[entryIdx]);
        }
    }

    return results;
}
