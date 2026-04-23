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

<img width="858" height="671" alt="image" src="https://github.com/user-attachments/assets/255c17fe-de61-4aa2-8afb-8ae38be28f00" />
