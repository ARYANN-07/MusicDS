#include "skip_list.h"

SkipList::SkipList(int maxLevel)
    : maxLevel_(maxLevel), currentLevel_(0), count_(0), latestVersion_(-1) {
    static bool seeded = false;
    if (!seeded) { srand((unsigned)time(nullptr)); seeded = true; }
    header_ = new SkipNode(-1, json(), maxLevel_);
}

SkipList::~SkipList() {
    clear();
    delete header_;
}

int SkipList::randomLevel() {
    int level = 0;
    while (level < maxLevel_ && (rand() % 2) == 0) {
        level++;
    }
    return level;
}

void SkipList::insert(int version, const json& snapshot) {
    std::vector<SkipNode*> update(maxLevel_ + 1, nullptr);
    SkipNode* curr = header_;

    // Find position to insert
    for (int i = currentLevel_; i >= 0; i--) {
        while (curr->forward[i] && curr->forward[i]->version < version) {
            curr = curr->forward[i];
        }
        update[i] = curr;
    }

    curr = curr->forward[0];

    // If version already exists, update it
    if (curr && curr->version == version) {
        curr->snapshot = snapshot;
        return;
    }

    int newLevel = randomLevel();
    if (newLevel > currentLevel_) {
        for (int i = currentLevel_ + 1; i <= newLevel; i++) {
            update[i] = header_;
        }
        currentLevel_ = newLevel;
    }

    SkipNode* newNode = new SkipNode(version, snapshot, newLevel);
    for (int i = 0; i <= newLevel; i++) {
        newNode->forward[i] = update[i]->forward[i];
        update[i]->forward[i] = newNode;
    }

    count_++;
    if (version > latestVersion_) latestVersion_ = version;
}

json SkipList::search(int version) const {
    SkipNode* curr = header_;
    for (int i = currentLevel_; i >= 0; i--) {
        while (curr->forward[i] && curr->forward[i]->version < version) {
            curr = curr->forward[i];
        }
    }
    curr = curr->forward[0];
    if (curr && curr->version == version) {
        return curr->snapshot;
    }
    return json(); // null
}

json SkipList::getLatest() const {
    if (latestVersion_ < 0) return json::array();
    return search(latestVersion_);
}

std::vector<json> SkipList::getAllVersions() const {
    std::vector<json> versions;
    SkipNode* curr = header_->forward[0];
    while (curr) {
        json entry;
        entry["version"] = curr->version;
        entry["songCount"] = curr->snapshot.is_array() ? (int)curr->snapshot.size() : 0;
        versions.push_back(entry);
        curr = curr->forward[0];
    }
    return versions;
}

void SkipList::clear() {
    SkipNode* curr = header_->forward[0];
    while (curr) {
        SkipNode* next = curr->forward[0];
        delete curr;
        curr = next;
    }
    for (int i = 0; i <= maxLevel_; i++) {
        header_->forward[i] = nullptr;
    }
    currentLevel_ = 0;
    count_ = 0;
    latestVersion_ = -1;
}

json SkipList::popLatest() {
    if (count_ <= 0) return json::array();

    std::vector<SkipNode*> update(maxLevel_ + 1, nullptr);
    SkipNode* curr = header_;

    for (int i = currentLevel_; i >= 0; i--) {
        while (curr->forward[i] && curr->forward[i]->version < latestVersion_) {
            curr = curr->forward[i];
        }
        update[i] = curr;
    }

    curr = curr->forward[0];

    if (curr && curr->version == latestVersion_) {
        for (int i = 0; i <= currentLevel_; i++) {
            if (update[i]->forward[i] != curr) break;
            update[i]->forward[i] = curr->forward[i];
        }
        delete curr;
        count_--;

        while (currentLevel_ > 0 && header_->forward[currentLevel_] == nullptr) {
            currentLevel_--;
        }

        latestVersion_ = -1;
        SkipNode* temp = header_->forward[0];
        json prevSnapshot = json::array();
        while (temp) {
            if (temp->version > latestVersion_) {
                latestVersion_ = temp->version;
                prevSnapshot = temp->snapshot;
            }
            temp = temp->forward[0];
        }
        return prevSnapshot;
    }

    return json::array();
}
