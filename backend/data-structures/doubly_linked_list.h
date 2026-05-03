#ifndef DOUBLY_LINKED_LIST_H
#define DOUBLY_LINKED_LIST_H

#include "../json.hpp"
#include <vector>
#include <string>

using json = nlohmann::json;

struct DLLNode {
    int trackId;
    json song;
    DLLNode* prev;
    DLLNode* next;

    DLLNode(int id, const json& s)
        : trackId(id), song(s), prev(nullptr), next(nullptr) {}
};

class DoublyLinkedList {
private:
    DLLNode* head;
    DLLNode* tail;
    int count;

    DLLNode* findNode(int trackId);

public:
    DoublyLinkedList();
    ~DoublyLinkedList();

    void pushBack(int trackId, const json& song);
    void pushFront(int trackId, const json& song);
    bool remove(int trackId);
    bool has(int trackId);
    json getSong(int trackId);
    std::vector<json> toArray();
    int size() const { return count; }
    void clear();
};

#endif // DOUBLY_LINKED_LIST_H
