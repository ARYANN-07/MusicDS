#ifndef BLOOM_FILTER_H
#define BLOOM_FILTER_H

#include <vector>
#include <string>

class BloomFilter {
private:
    std::vector<bool> bits;
    int size;
    int numHashes;

    // Three independent hash functions
    int hash1(int key) const;  // djb2-based
    int hash2(int key) const;  // fnv1a-based
    int hash3(int key) const;  // polynomial

public:
    BloomFilter(int filterSize = 1024, int hashes = 3);

    void add(int trackId);
    bool mightContain(int trackId) const;
    void clear();
};

#endif // BLOOM_FILTER_H
