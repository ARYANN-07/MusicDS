/**
 * Threaded Binary Search Tree Data Structure
 * Used for: Next/Previous song navigation in playlist
 * 
 * A threaded BST has threads (pointers) to in-order predecessor and successor,
 * allowing O(1) next/prev navigation without recursion or stack.
 * 
 * Time Complexity:
 * - Insert: O(log n)
 * - Next/Prev: O(1) using threads
 */

import { Song } from '../types';

interface ThreadedNode {
  index: number; // Position in playlist
  song: Song;
  left: ThreadedNode | null;
  right: ThreadedNode | null;
  leftThread: boolean; // true if left pointer is a thread
  rightThread: boolean; // true if right pointer is a thread
}

export class ThreadedBST {
  private root: ThreadedNode | null = null;
  private nodeMap: Map<number, ThreadedNode> = new Map(); // trackId -> node
  private indexMap: Map<number, ThreadedNode> = new Map(); // index -> node
  private currentIndex = 0;

  private createNode(index: number, song: Song): ThreadedNode {
    return {
      index,
      song,
      left: null,
      right: null,
      leftThread: true,
      rightThread: true,
    };
  }

  // Insert a song at the end of the playlist
  insert(song: Song): number {
    const index = this.currentIndex++;
    const newNode = this.createNode(index, song);
    this.nodeMap.set(song.trackId, newNode);
    this.indexMap.set(index, newNode);

    if (!this.root) {
      this.root = newNode;
      return index;
    }

    let current = this.root;
    let parent: ThreadedNode | null = null;

    while (current) {
      parent = current;
      if (index < current.index) {
        if (current.leftThread) {
          break;
        }
        current = current.left!;
      } else {
        if (current.rightThread) {
          break;
        }
        current = current.right!;
      }
    }

    if (!parent) return index;

    if (index < parent.index) {
      // Insert as left child
      newNode.left = parent.left; // Thread to predecessor
      newNode.right = parent; // Thread to successor (parent)
      parent.leftThread = false;
      parent.left = newNode;
    } else {
      // Insert as right child
      newNode.right = parent.right; // Thread to successor
      newNode.left = parent; // Thread to predecessor (parent)
      parent.rightThread = false;
      parent.right = newNode;
    }

    return index;
  }

  // Find in-order successor (next song) - O(1) with threads
  getNext(trackId: number): Song | null {
    const node = this.nodeMap.get(trackId);
    if (!node) return null;

    // If right is a thread, it points directly to successor
    if (node.rightThread) {
      return node.right?.song || null;
    }

    // Otherwise, find leftmost node in right subtree
    let successor = node.right;
    while (successor && !successor.leftThread) {
      successor = successor.left;
    }

    return successor?.song || null;
  }

  // Find in-order predecessor (previous song) - O(1) with threads
  getPrev(trackId: number): Song | null {
    const node = this.nodeMap.get(trackId);
    if (!node) return null;

    // If left is a thread, it points directly to predecessor
    if (node.leftThread) {
      return node.left?.song || null;
    }

    // Otherwise, find rightmost node in left subtree
    let predecessor = node.left;
    while (predecessor && !predecessor.rightThread) {
      predecessor = predecessor.right;
    }

    return predecessor?.song || null;
  }

  // Get next song by index
  getNextByIndex(currentIndex: number): Song | null {
    const nextNode = this.indexMap.get(currentIndex + 1);
    return nextNode?.song || null;
  }

  // Get previous song by index
  getPrevByIndex(currentIndex: number): Song | null {
    const prevNode = this.indexMap.get(currentIndex - 1);
    return prevNode?.song || null;
  }

  // Get song by index
  getSongByIndex(index: number): Song | null {
    return this.indexMap.get(index)?.song || null;
  }

  // Get index of a song
  getIndex(trackId: number): number {
    return this.nodeMap.get(trackId)?.index ?? -1;
  }

  // Get first song
  getFirst(): Song | null {
    if (!this.root) return null;
    
    let current = this.root;
    while (!current.leftThread && current.left) {
      current = current.left;
    }
    
    return current.song;
  }

  // Get last song
  getLast(): Song | null {
    if (!this.root) return null;
    
    let current = this.root;
    while (!current.rightThread && current.right) {
      current = current.right;
    }
    
    return current.song;
  }

  // Get all songs in order
  getAllSongs(): Song[] {
    const songs: Song[] = [];
    
    if (!this.root) return songs;

    // Find leftmost (first) node
    let current: ThreadedNode | null = this.root;
    while (!current.leftThread && current.left) {
      current = current.left;
    }

    // Traverse using threads
    while (current) {
      songs.push(current.song);
      
      if (current.rightThread) {
        current = current.right;
      } else {
        current = current.right;
        if (current) {
          while (!current.leftThread && current.left) {
            current = current.left;
          }
        }
      }
    }

    return songs;
  }

  // Check if song exists
  has(trackId: number): boolean {
    return this.nodeMap.has(trackId);
  }

  // Get size
  get size(): number {
    return this.nodeMap.size;
  }

  // Clear all
  clear(): void {
    this.root = null;
    this.nodeMap.clear();
    this.indexMap.clear();
    this.currentIndex = 0;
  }

  // Build from array of songs
  buildFromSongs(songs: Song[]): void {
    this.clear();
    for (const song of songs) {
      this.insert(song);
    }
  }

  // Serialize for persistence
  serialize(): Song[] {
    return this.getAllSongs();
  }

  // Deserialize from persistence
  deserialize(songs: Song[]): void {
    this.buildFromSongs(songs);
  }
}

// Singleton instance for current playlist
export const playlistBST = new ThreadedBST();
