#include "doubly_linked_list.h"

DoublyLinkedList::DoublyLinkedList() : head(nullptr), tail(nullptr), count(0) {}

DoublyLinkedList::~DoublyLinkedList() {
    clear();
}

void DoublyLinkedList::clear() {
    DLLNode* curr = head;
    while (curr) {
        DLLNode* next = curr->next;
        delete curr;
        curr = next;
    }
    head = tail = nullptr;
    count = 0;
}

DLLNode* DoublyLinkedList::findNode(int trackId) {
    DLLNode* curr = head;
    while (curr) {
        if (curr->trackId == trackId) return curr;
        curr = curr->next;
    }
    return nullptr;
}

void DoublyLinkedList::pushBack(int trackId, const json& song) {
    // Don't add duplicates
    if (has(trackId)) return;

    DLLNode* node = new DLLNode(trackId, song);
    if (!tail) {
        head = tail = node;
    } else {
        tail->next = node;
        node->prev = tail;
        tail = node;
    }
    count++;
}

void DoublyLinkedList::pushFront(int trackId, const json& song) {
    if (has(trackId)) return;

    DLLNode* node = new DLLNode(trackId, song);
    if (!head) {
        head = tail = node;
    } else {
        node->next = head;
        head->prev = node;
        head = node;
    }
    count++;
}

bool DoublyLinkedList::remove(int trackId) {
    DLLNode* node = findNode(trackId);
    if (!node) return false;

    if (node->prev) {
        node->prev->next = node->next;
    } else {
        head = node->next;
    }

    if (node->next) {
        node->next->prev = node->prev;
    } else {
        tail = node->prev;
    }

    delete node;
    count--;
    return true;
}

bool DoublyLinkedList::has(int trackId) {
    return findNode(trackId) != nullptr;
}

json DoublyLinkedList::getSong(int trackId) {
    DLLNode* node = findNode(trackId);
    return node ? node->song : json();
}

std::vector<json> DoublyLinkedList::toArray() {
    std::vector<json> result;
    DLLNode* curr = head;
    while (curr) {
        result.push_back(curr->song);
        curr = curr->next;
    }
    return result;
}
