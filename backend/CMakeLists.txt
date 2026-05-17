cmake_minimum_required(VERSION 3.10)
project(MusicDSBackend CXX)

set(CMAKE_CXX_STANDARD 14)
set(CMAKE_CXX_STANDARD_REQUIRED ON)

include_directories(${CMAKE_CURRENT_SOURCE_DIR})

add_executable(musicds-backend
    main.cpp
    data-structures/avl_tree.cpp
    data-structures/binomial_heap.cpp
    data-structures/bloom_filter.cpp
    data-structures/bplus_tree.cpp
    data-structures/doubly_linked_list.cpp
    data-structures/fibonacci_heap.cpp
    data-structures/leftist_tree.cpp
    data-structures/pairing_heap.cpp
    data-structures/patricia_trie.cpp
    data-structures/red_black_tree.cpp
    data-structures/skip_list.cpp
    data-structures/splay_tree.cpp
    data-structures/suffix_array.cpp
    data-structures/treap.cpp
    data-structures/trie.cpp
)

# Winsock2 (required on Windows — the only external dependency)
if(WIN32)
    target_link_libraries(musicds-backend ws2_32)
    target_compile_definitions(musicds-backend PRIVATE
        WIN32_LEAN_AND_MEAN
        NOMINMAX
        _CRT_SECURE_NO_WARNINGS
    )
endif()
