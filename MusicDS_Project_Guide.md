# MusicDS: Advanced Data Structures Music Platform 🎵

## 1. Project Overview & Objective
**MusicDS** is a high-performance, full-stack music streaming platform designed to demonstrate the practical application of advanced data structures. Instead of relying on traditional relational databases (like SQL) or standard library containers (like `std::vector` or `std::map`) for core business logic, MusicDS implements **14 distinct advanced data structures from scratch in C++** to handle everything from authentication to recommendation engines and search autocomplete. 

The objective of this project is to showcase how algorithmic choices directly impact application performance, scalability, and user experience.

---

## 2. System Architecture & Workflow

MusicDS follows a decoupled **Client-Server Architecture**:

1. **Client (Frontend):** A React/Next.js application that provides a sleek, modern, glassmorphism UI. It captures user interactions (playing a song, voting, liking, searching) and sends REST API requests to the backend.
2. **API Gateway / Proxy:** Next.js API routes act as a proxy, forwarding requests from the frontend to the C++ backend on port 8080. This avoids CORS issues and keeps the frontend securely separated from the backend logic.
3. **Server (Backend):** A custom HTTP server written entirely in C++ using Winsock2. It routes incoming HTTP requests to the appropriate Data Structure instances.
4. **Data Layer (In-Memory + Persistence):** All data is held in custom C++ data structure objects in memory for lightning-fast $O(1)$ or $O(\log n)$ access. Periodically, the data state is serialized to a local `musicds_data.json` file for persistence across server restarts.

### The Standard Workflow:
- A user types in the search bar → Frontend calls `/api/search` → Next.js proxies to C++ backend `localhost:8080/api/search/autocomplete` → C++ traverses the **Patricia Trie** and returns results in milliseconds.

---

## 3. Project File Structure

The project is strictly separated into a C++ Backend (the Data Engine) and a Next.js Frontend (the UI Layer). 

```text
MusicDS-V/
├── backend/                      # THE C++ DATA ENGINE
│   ├── build/                    # Compiled executable outputs (musicds-backend.exe)
│   ├── data-structures/          # The 14 Custom C++ Data Structures
│   │   ├── avl_tree.cpp / .h     # Stores user preferences (genres, volume)
│   │   ├── bplus_tree.cpp / .h   # Handles authentication and user credentials
│   │   ├── doubly_linked...      # Powers user playlists
│   │   ├── fibonacci_heap...     # Sorts recommendations by genre scores
│   │   ├── leftist_tree...       # Priority Playback queue
│   │   ├── pairing_heap...       # Collaborative queue with real-time voting
│   │   ├── patricia_trie...      # High-speed compressed search autocomplete
│   │   ├── red_black_tree...     # Global top charts tracker
│   │   ├── skip_list.cpp / .h    # Version control for Playlist Undo
│   │   ├── splay_tree.cpp / .h   # Recently played history (temporal locality)
│   │   ├── suffix_array.cpp / .h # Substring search (find songs by partial words)
│   │   └── treap.cpp / .h        # Randomized shuffle playback
│   ├── json.hpp                  # nlohmann/json library for data parsing
│   ├── simple_http.h             # Custom, zero-dependency Winsock2 HTTP Server
│   ├── main.cpp                  # Entry point: Registers API routes & starts server
│   └── musicds_data.json         # Persisted database for user accounts and playlists
│
├── app/                          # NEXT.JS APP ROUTER (FRONTEND UI)
│   ├── api/backend/[...path]/    # Next.js proxy route bypassing CORS to talk to C++
│   ├── layout.tsx                # Global HTML wrapper (Injects Context Providers)
│   ├── page.tsx                  # Main UI entry point (Layout orchestrator)
│   └── globals.css               # Tailwind utility classes and CSS variables
│
├── components/                   # REACT UI COMPONENTS
│   ├── auth-modal.tsx            # Login / Signup overlay
│   ├── genre-selection.tsx       # Onboarding flow for new users
│   ├── landing-page.tsx          # Marketing and intro screen
│   ├── player.tsx                # The bottom audio player bar and controls
│   ├── search-bar.tsx            # Search input field that talks to Patricia Trie
│   ├── sidebar.tsx               # Left navigation and playlist management
│   ├── song-card.tsx             # Individual song UI (with download/vote actions)
│   └── song-sections.tsx         # Grids for displaying lists of songs
│
├── lib/                          # FRONTEND STATE & LOGIC
│   ├── audio-context.tsx         # React Context managing the <audio> HTML5 element
│   ├── auth-context.tsx          # React Context managing login sessions and currentUser
│   ├── music-context.tsx         # React Context acting as the glue to the C++ API
│   ├── itunes-api.ts             # Fetches raw JSON audio data/previews from Apple
│   └── types.ts                  # Shared TypeScript interfaces (Song, User, etc.)
│
└── tsconfig.json, package.json   # Node.js project configuration files
```

---

## 3. Tech Stack & Justification

| Layer | Technology | Why it was used |
| :--- | :--- | :--- |
| **Frontend** | React, Next.js, TailwindCSS | Provides a modern, responsive UI. Next.js handles fast routing and API proxying. Tailwind allows for rapid, custom styling (like hiding scrollbars and creating complex layouts). |
| **Backend** | C++ (Winsock2) | Chosen for raw execution speed and memory control. C++ allows us to build complex, pointer-based data structures from scratch without garbage collection overhead. |
| **Data Parsing** | `nlohmann/json` | A single-header C++ JSON library used to easily parse incoming REST payloads and serialize data for persistence. |

---

## 4. Implemented Data Structures & Features

Here is the core of the project: the 14 data structures and exactly how they power the application.

### Authentication & User Data
1. **B+ Tree (Authentication / Login)**
   - **Feature:** User Signup and Login.
   - **How it works:** B+ Trees store data only in leaf nodes, with internal nodes acting as a massive index. This is the industry standard for databases.
   - **Why:** Allows for highly efficient $O(\log n)$ retrieval of user credentials, even if the application scaled to millions of users, minimizing disk I/O operations.

2. **AVL Tree (User Preferences)**
   - **Feature:** Storing user settings like selected genres.
   - **How it works:** A strictly self-balancing Binary Search Tree. The heights of the two child subtrees of any node differ by at most one.
   - **Why:** Preferences are read/updated frequently. AVL trees guarantee a strict $O(\log n)$ lookup time, preventing the tree from becoming skewed if many users register in alphabetical order.

### Core Player Features
3. **Doubly Linked List (Playlists)**
   - **Feature:** Creating and managing custom user playlists.
   - **How it works:** Each song points to the previous and next song in the list.
   - **Why:** Allows for $O(1)$ insertion and deletion of songs at the beginning or end of a playlist, and easy forward/backward traversal when the user clicks "Next Track".

4. **Bloom Filter (Liked Songs)**
   - **Feature:** Checking if a song is "Liked".
   - **How it works:** A highly space-efficient probabilistic data structure. It hashes the `trackId` multiple times to flip bits in an array. 
   - **Why:** Allows for instant $O(1)$ checks to see if a heart icon should be filled on the UI without traversing the user's entire liked playlist. (False positives are handled by a secondary DLL check).

5. **Splay Tree (Recently Played History)**
   - **Feature:** Tracking the user's listening history.
   - **How it works:** A self-adjusting BST where recently accessed elements are moved to the root of the tree via "splaying" (rotations).
   - **Why:** If a user plays the same song multiple times, it remains near the top of the tree, allowing for $O(1)$ access. This takes advantage of the principle of *temporal locality*.

### Search Engine
6. **Patricia Trie / Radix Tree (Compressed Autocomplete)**
   - **Feature:** The main Search Bar.
   - **How it works:** A space-optimized Trie where nodes with only one child are merged together. 
   - **Why:** Standard Tries waste massive amounts of memory. The Patricia Trie compresses the strings (e.g., merging "S"->"O"->"N"->"G" into a single "SONG" node), saving RAM while keeping prefix matching at $O(k)$ where $k$ is string length.

7. **Suffix Array (Substring / Deep Search)**
   - **Feature:** Searching for a song by a partial word (e.g., typing "night" finds "After Midnight").
   - **How it works:** An array containing all sorted suffixes of a string.
   - **Why:** A Trie only matches prefixes (the *start* of a string). A Suffix array allows $O(m \log n)$ binary search for *any* substring anywhere within the song title or artist name.

### Advanced Queues & Heaps
8. **Leftist Tree (Priority Playback Queue)**
   - **Feature:** "Add to Priority Play" - interrupting the normal queue.
   - **How it works:** A variant of a binary heap that is skewed to the left, meaning the right path is always the shortest.
   - **Why:** If a user wants to merge two massive playlists together into a queue, a Leftist Tree can merge them in $O(\log n)$ time, compared to standard heaps which take $O(n)$.

9. **Binomial Heap (Smart Download Queue)**
   - **Feature:** "Add to Download Queue".
   - **How it works:** A collection of binomial trees that follow specific degree rules.
   - **Why:** Allows the system to prioritize VIP user downloads or smaller file sizes, and merge multiple download batches together in $O(\log n)$ time.

10. **Pairing Heap (Collaborative Voting)**
    - **Feature:** "Vote in Collab Queue" - users vote on what plays next.
    - **How it works:** A multi-way tree heap. When a song gets a vote, its key is decreased, and it easily bubbles to the top.
    - **Why:** Offers amortized $O(1)$ insertion and `decrease_key` (voting) operations, making it incredibly fast for real-time multiplayer voting environments.

11. **Fibonacci Heap (Recommendations Engine)**
    - **Feature:** "Recommended For You" section.
    - **How it works:** A forest of trees with a relaxed structure, deferring cleanup until `extract_max` is called.
    - **Why:** The backend calculates recommendation scores based on the genres the user selected at signup. Fibonacci heaps allow $O(1)$ amortized insertion of thousands of songs, quickly sorting the absolute best recommendations to the top.

### Specialized Logic
12. **Red-Black Tree (Top Charts)**
    - **Feature:** "Top Charts" section tracking global plays.
    - **How it works:** A self-balancing BST using "color" bits (red/black) to ensure the longest path is no more than twice the shortest path.
    - **Why:** It provides faster insertion and deletion times than an AVL tree because it requires fewer rotations, making it perfect for a highly volatile global play counter.

13. **Treap (Randomized Shuffle Play)**
    - **Feature:** "Shuffle Play".
    - **How it works:** A hybrid of a Tree and a Heap. Nodes have a standard BST key, but a randomized Heap priority.
    - **Why:** Provides a mathematically perfect, uniformly randomized shuffle without the $O(n)$ overhead of array shuffling algorithms like Fisher-Yates. It guarantees $O(\log n)$ expected time operations.

14. **Skip List (Playlist Undo / Redo Time Travel)**
    - **Feature:** "Undo Last Action" in the playlist view.
    - **How it works:** A probabilistic alternative to balanced trees. It uses multiple layers of linked lists that skip over intermediate nodes.
    - **Why:** We use it to store version snapshots of the playlist. It allows for $O(\log n)$ searching of past playlist states, enabling the user to instantly undo accidental song deletions.

---

## 5. How to Run the Project for the Presentation

1. **Start the C++ Backend:**
   - Open a terminal.
   - Navigate to `C:\Users\Aryan_\Desktop\MusicDS-V\backend`.
   - Compile: `g++ -O3 main.cpp data-structures/*.cpp -o build/musicds-backend.exe -lws2_32 -lwsock32`
   - Run: `.\build\musicds-backend.exe`
   - *Ensure it prints that it is listening on port 8080.*

2. **Start the Next.js Frontend:**
   - Open a second terminal.
   - Navigate to `C:\Users\Aryan_\Desktop\MusicDS-V`.
   - Run: `npm run dev`
   - Open your browser to `http://localhost:3000`.

3. **Demonstration Flow:**
   - Show the sign-up page (mention B+ Tree).
   - Select genres (mention AVL tree and Fibonacci Heap).
   - Search for a song using a prefix (Patricia Trie) and then a partial word (Suffix Array).
   - Add a song to a playlist, delete it, and hit Undo (Doubly Linked List + Skip List).
   - Show the History section (Splay Tree per-user isolation).
   - Click the 3 dots on a song and add it to the Collab Queue, then vote on it (Pairing Heap).
