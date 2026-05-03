#include "bloom_filter.h"

BloomFilter::BloomFilter(int filterSize, int hashes)
    : size(filterSize), numHashes(hashes) {
    bits.resize(size, false);
}

// djb2-based hash
int BloomFilter::hash1(int key) const {
    unsigned long hash = 5381;
    // Hash the integer's bytes
    unsigned char* bytes = (unsigned char*)&key;
    for (int i = 0; i < (int)sizeof(int); i++) {
        hash = ((hash << 5) + hash) + bytes[i];
    }
    return (int)(hash % size);
}

// fnv1a-based hash
int BloomFilter::hash2(int key) const {
    unsigned long hash = 2166136261u;
    unsigned char* bytes = (unsigned char*)&key;
    for (int i = 0; i < (int)sizeof(int); i++) {
        hash ^= bytes[i];
        hash *= 16777619u;
    }
    return (int)(hash % size);
}

// Polynomial hash
int BloomFilter::hash3(int key) const {
    unsigned long hash = 0;
    unsigned long base = 31;
    unsigned char* bytes = (unsigned char*)&key;
    for (int i = 0; i < (int)sizeof(int); i++) {
        hash = hash * base + bytes[i];
    }
    return (int)(hash % size);
}

void BloomFilter::add(int trackId) {
    bits[hash1(trackId)] = true;
    bits[hash2(trackId)] = true;
    bits[hash3(trackId)] = true;
}

bool BloomFilter::mightContain(int trackId) const {
    return bits[hash1(trackId)] &&
           bits[hash2(trackId)] &&
           bits[hash3(trackId)];
}

void BloomFilter::clear() {
    std::fill(bits.begin(), bits.end(), false);
}
