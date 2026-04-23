**MusicDS: Comprehensive Project Documentation**
MusicDS is a unique, educational music streaming application. Instead of relying on traditional databases (like PostgreSQL or MongoDB) to manage state, the core business logic and data management are powered entirely by custom-built, memory-based Data Structures.


1. Core Concept & Main Things About the Project
The primary goal of MusicDS is to demonstrate how abstract computer science concepts (like Trees and Heaps) map directly to real-world software features.

Frontend (UI/UX): A modern, responsive, dark-themed UI built with React and Next.js, mimicking the look and feel of commercial apps like Spotify. It uses the iTunes Search API to fetch real song metadata and 30-second audio previews.
Backend (Data Engine): A standalone C++ HTTP server. Instead of querying a database to find "Top Charts," it traverses a Red-Black Tree. Instead of running complex SQL for "Recommendations," it extracts the maximum node from a Fibonacci Heap.
In-Memory Nature: Currently, the C++ backend operates entirely in RAM. Data is volatile; if the C++ server is stopped, the data resets.

2. Folder Structure
The project is split into two distinct ecosystems within the same repository:
MusicDS-V/
├── backend/                     # THE C++ DATA ENGINE
│   ├── build/                   # Compiled executable (musicds-backend.exe)
│   ├── data-structures/         # The core C++ logic
│   │   ├── avl_tree.cpp / .h    # Handles user profiles
│   │   ├── red_black_tree...    # Handles top charts
│   │   └── fibonacci_heap...    # Handles recommendations
│   ├── httplib.h / json.hpp     # Dependencies (older/unused versions)
│   ├── simple_http.h            # Custom, zero-dependency Winsock2 HTTP Server
│   ├── main.cpp                 # Entry point: Registers API routes & starts server
│   └── CMakeLists.txt           # Build configuration
│
├── app/                         # NEXT.JS APP ROUTER (FRONTEND UI)
│   ├── api/backend/[...path]/   # Proxy route bypassing CORS to talk to C++
│   ├── layout.tsx               # Global HTML wrapper
│   └── page.tsx                 # Main UI entry point
│
├── components/                  # REACT UI COMPONENTS
│   ├── player.tsx               # The bottom audio player bar
│   ├── search-bar.tsx           # Search input
│   ├── sidebar.tsx              # Left navigation
│   ├── song-card.tsx            # Individual song UI
│   └── song-sections.tsx        # Grids for "Recommendations", "Charts", etc.
│
├── lib/                         # FRONTEND STATE & LOGIC
│   ├── data-structures/         
│   │   └── threaded-bst.ts      # TypeScript Threaded BST for Playlist Queue
│   ├── audio-context.tsx        # React Context managing the <audio> element
│   ├── music-context.tsx        # React Context acting as the glue to the C++ API
│   ├── itunes-api.ts            # Fetches raw JSON data from Apple
│   └── types.ts                 # Shared TypeScript interfaces
│
└── tsconfig.json, package.json  # Node.js project configs
