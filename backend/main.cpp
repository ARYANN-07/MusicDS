/**
 * MusicDS C++ Backend — main.cpp
 * HTTP server using simple_http.h (Winsock2 only, no external deps).
 * JSON via nlohmann/json v3.7.3.
 */
#include "simple_http.h"
#include "json.hpp"
#include "data-structures/avl_tree.h"
#include "data-structures/red_black_tree.h"
#include "data-structures/fibonacci_heap.h"
#include "data-structures/splay_tree.h"
#include "data-structures/trie.h"
#include "data-structures/bplus_tree.h"
#include "data-structures/doubly_linked_list.h"
#include "data-structures/bloom_filter.h"
#include "data-structures/binomial_heap.h"
#include "data-structures/leftist_tree.h"
#include "data-structures/pairing_heap.h"
#include "data-structures/patricia_trie.h"
#include "data-structures/suffix_array.h"
#include "data-structures/skip_list.h"
#include "data-structures/treap.h"
#include <iostream>
#include <fstream>
#include <string>
#include <map>

using json = nlohmann::json;

// ── Per-user playlist and liked-songs storage ────────────────────────────────
// Each user has: a map of playlist-name → DLL, and a BloomFilter for likes
struct UserData {
    std::map<std::string, DoublyLinkedList*> playlists;
    BloomFilter likeFilter;
    SplayTree historyTree;

    UserData() : likeFilter(2048, 3) {
        playlists["__liked__"] = new DoublyLinkedList();
    }
    ~UserData() {
        for (auto& p : playlists) delete p.second;
    }
};

static std::map<std::string, UserData*> g_userData;

// Per-user skip list for playlist version history: username -> playlistName -> SkipList*
static std::map<std::string, std::map<std::string, SkipList*>> g_playlistHistory;
static int g_playlistVersions_counter = 0; // global version counter

static UserData* getUserData(const std::string& username) {
    if (g_userData.find(username) == g_userData.end()) {
        g_userData[username] = new UserData();
    }
    return g_userData[username];
}

static SkipList* getPlaylistHistory(const std::string& username, const std::string& plName) {
    if (g_playlistHistory[username].find(plName) == g_playlistHistory[username].end()) {
        g_playlistHistory[username][plName] = new SkipList();
    }
    return g_playlistHistory[username][plName];
}

// Helper: snapshot a playlist into a json array
static json snapshotPlaylist(UserData* ud, const std::string& plName) {
    json arr = json::array();
    if (ud->playlists.find(plName) != ud->playlists.end()) {
        auto songs = ud->playlists[plName]->toArray();
        for (auto& s : songs) arr.push_back(s);
    }
    return arr;
}

// ── Persistence helpers ─────────────────────────────────────────────────────
static const char* DATA_FILE = "musicds_data.json";

static void saveAllData() {
    json data;
    // Save users from B+ Tree
    auto users = g_userAuthTree.getAllUsers();
    data["users"] = json::array();
    for (auto& u : users) data["users"].push_back(u);

    // Save playlists per user
    data["playlists"] = json::object();
    for (auto& userPair : g_userData) {
        const std::string& uname = userPair.first;
        UserData* ud = userPair.second;
        data["playlists"][uname] = json::object();
        for (auto& plPair : ud->playlists) {
            json songs = json::array();
            auto arr = plPair.second->toArray();
            for (auto& s : arr) songs.push_back(s);
            data["playlists"][uname][plPair.first] = songs;
        }
    }

    // Save collab queue
    data["collabQueue"] = json::array();
    auto collabSongs = g_collabQueue.getTop(-1);
    for (auto& s : collabSongs) {
        data["collabQueue"].push_back(s);
    }

    std::ofstream f(DATA_FILE);
    if (f.is_open()) {
        f << data.dump(2);
        f.close();
    }
}

static void loadAllData() {
    std::ifstream f(DATA_FILE);
    if (!f.is_open()) return;

    std::string content((std::istreambuf_iterator<char>(f)),
                         std::istreambuf_iterator<char>());
    f.close();

    json data;
    try { data = json::parse(content); } catch (...) { return; }

    // Restore users into B+ Tree
    if (data.count("users")) {
        for (auto& u : data["users"]) {
            std::string uname = u.value("username", "");
            if (!uname.empty()) {
                g_userAuthTree.insert(uname, u);
            }
        }
    }

    // Restore playlists
    if (data.count("playlists")) {
        for (auto it = data["playlists"].begin(); it != data["playlists"].end(); ++it) {
            std::string uname = it.key();
            UserData* ud = getUserData(uname);
            json& playlistsObj = it.value();
            for (auto pit = playlistsObj.begin(); pit != playlistsObj.end(); ++pit) {
                std::string plName = pit.key();
                if (ud->playlists.find(plName) == ud->playlists.end()) {
                    ud->playlists[plName] = new DoublyLinkedList();
                }
                DoublyLinkedList* dll = ud->playlists[plName];
                for (auto& song : pit.value()) {
                    int trackId = song.value("trackId", 0);
                    dll->pushBack(trackId, song);
                    if (plName == "__liked__") {
                        ud->likeFilter.add(trackId);
                    }
                }
                if (plName != "__liked__") {
                    SkipList* sl = getPlaylistHistory(uname, plName);
                    if (sl->size() == 0) {
                        g_playlistVersions_counter++;
                        sl->insert(g_playlistVersions_counter, snapshotPlaylist(ud, plName));
                    }
                }
            }
        }
    }

    // Restore collab queue
    if (data.count("collabQueue")) {
        for (auto& s : data["collabQueue"]) {
            int trackId = s.value("trackId", 0);
            int votes = s.value("_votes", 1);
            if (trackId != 0) {
                json song = s;
                song.erase("_votes");
                g_collabQueue.insert(votes, trackId, song);
            }
        }
    }

    std::cout << "  [LOAD] Restored data from " << DATA_FILE << "\n";
}

static json parseBody(const std::string& body) {
    try { return json::parse(body); }
    catch (...) { return json(); }
}

int main() {
    // Load persisted data
    loadAllData();

    SimpleServer svr;

    // ── Health ───────────────────────────────────────────────────────────────
    svr.Get("/api/health", [](const HttpRequest&, HttpResponse& res) {
        json r = {
            {"status", "ok"},
            {"dataStructures", {
                "AVL Tree (User Preferences)",
                "Red-Black Tree (Top Charts)",
                "Fibonacci Heap (Recommendations)",
                "Trie (Search Autocomplete)",
                "Splay Tree (Recently Played)",
                "B+ Tree (User Authentication)",
                "Doubly Linked List (Playlists)",
                "Bloom Filter (Liked Songs)"
            }}
        };
        res.set_content(r.dump());
    });

    // ── B+ Tree — Auth ──────────────────────────────────────────────────────
    svr.Post("/api/auth/signup", [](const HttpRequest& req, HttpResponse& res) {
        json body = parseBody(req.body);
        if (body.is_null()) { res.status = 400; res.set_content(R"({"error":"Bad JSON"})"); return; }

        std::string username = body.value("username", "");
        std::string password = body.value("password", "");

        if (username.empty() || password.empty()) {
            res.status = 400;
            res.set_content(R"({"error":"Username and password are required"})");
            return;
        }
        if (username.length() < 3) {
            res.status = 400;
            res.set_content(R"({"error":"Username must be at least 3 characters"})");
            return;
        }
        if (password.length() < 4) {
            res.status = 400;
            res.set_content(R"({"error":"Password must be at least 4 characters"})");
            return;
        }
        if (g_userAuthTree.exists(username)) {
            res.status = 409;
            res.set_content(R"({"error":"Username already exists"})");
            return;
        }

        json user = {
            {"username", username},
            {"passwordHash", hashPassword(password)},
            {"selectedGenres", json::array()},
            {"createdAt", std::time(nullptr)}
        };
        g_userAuthTree.insert(username, user);
        getUserData(username); // Initialize user data with empty liked playlist

        saveAllData();

        json resp = {{"ok", true}, {"username", username}};
        res.set_content(resp.dump());
    });

    svr.Post("/api/auth/login", [](const HttpRequest& req, HttpResponse& res) {
        json body = parseBody(req.body);
        if (body.is_null()) { res.status = 400; res.set_content(R"({"error":"Bad JSON"})"); return; }

        std::string username = body.value("username", "");
        std::string password = body.value("password", "");

        json user = g_userAuthTree.search(username);
        if (user.is_null()) {
            res.status = 401;
            res.set_content(R"({"error":"User not found"})");
            return;
        }

        std::string storedHash = user.value("passwordHash", "");
        if (hashPassword(password) != storedHash) {
            res.status = 401;
            res.set_content(R"({"error":"Incorrect password"})");
            return;
        }

        // Return user info (without password hash)
        json safeUser = user;
        safeUser.erase("passwordHash");
        json resp = {{"ok", true}, {"user", safeUser}};
        res.set_content(resp.dump());
    });

    svr.Get("/api/auth/user/{username}", [](const HttpRequest& req, HttpResponse& res) {
        std::string username = req.getParam("username", "");
        json user = g_userAuthTree.search(username);
        if (user.is_null()) { res.status = 404; res.set_content(R"({"error":"Not found"})"); return; }
        json safeUser = user;
        safeUser.erase("passwordHash");
        res.set_content(safeUser.dump());
    });

    // ── AVL Tree — User Preferences ─────────────────────────────────────────
    svr.Post("/api/preferences", [](const HttpRequest& req, HttpResponse& res) {
        json body = parseBody(req.body);
        if (body.is_null()) { res.status = 400; res.set_content(R"({"error":"Bad JSON"})"); return; }
        std::string userId = body.value("userId", std::string("default"));
        g_userPreferencesTree.insert(userId, body);

        // Also update genres in the B+ Tree user record
        std::string username = userId;
        json existing = g_userAuthTree.search(username);
        if (!existing.is_null() && body.count("selectedGenres")) {
            existing["selectedGenres"] = body["selectedGenres"];
            g_userAuthTree.update(username, existing);
        }

        saveAllData();
        res.set_content(R"({"ok":true})");
    });

    svr.Get("/api/preferences/{userId}", [](const HttpRequest& req, HttpResponse& res) {
        std::string userId = req.getParam("userId", "default");
        json prefs = g_userPreferencesTree.search(userId);
        if (prefs.is_null()) { res.status = 404; res.set_content(R"({"error":"Not found"})"); return; }
        res.set_content(prefs.dump());
    });

    // ── Red-Black Tree — Top Charts ──────────────────────────────────────────
    svr.Post("/api/charts/increment", [](const HttpRequest& req, HttpResponse& res) {
        json body = parseBody(req.body);
        if (body.is_null() || !body.count("song")) {
            res.status = 400; res.set_content(R"({"error":"Missing song"})"); return;
        }
        json song = body["song"];
        g_topChartsTree.incrementPlayCount(song);
        int tid = song.value("trackId", 0);
        json r = {{"ok", true}, {"playCount", g_topChartsTree.getPlayCount(tid)}};
        res.set_content(r.dump());
    });

    svr.Get("/api/charts/top", [](const HttpRequest& req, HttpResponse& res) {
        int limit = 10;
        std::string lv = req.getQuery("limit");
        if (!lv.empty()) try { limit = std::stoi(lv); } catch (...) {}
        auto charts = g_topChartsTree.getTopCharts(limit);
        json arr = json::array();
        for (auto& e : charts) arr.push_back(e);
        res.set_content(arr.dump());
    });

    svr.Delete_("/api/charts/clear", [](const HttpRequest&, HttpResponse& res) {
        g_topChartsTree.clear();
        res.set_content(R"({"ok":true})");
    });

    // ── Fibonacci Heap — Recommendations ─────────────────────────────────────
    svr.Post("/api/recommendations/add", [](const HttpRequest& req, HttpResponse& res) {
        json body = parseBody(req.body);
        if (body.is_null() || !body.count("song")) {
            res.status = 400; res.set_content(R"({"error":"Missing song"})"); return;
        }
        json song   = body["song"];
        double score = body.value("score", 50.0);
        double boost = body.value("genreBoost", 0.0);
        g_recommendationsHeap.addRecommendation(song, score, boost);
        res.set_content(R"({"ok":true})");
    });

    svr.Get("/api/recommendations/top", [](const HttpRequest& req, HttpResponse& res) {
        int limit = 10;
        std::string lv = req.getQuery("limit");
        if (!lv.empty()) try { limit = std::stoi(lv); } catch (...) {}
        auto recs = g_recommendationsHeap.getTopRecommendations(limit);
        json arr = json::array();
        for (auto& s : recs) arr.push_back({{"song", s}});
        res.set_content(arr.dump());
    });

    svr.Delete_("/api/recommendations/clear", [](const HttpRequest&, HttpResponse& res) {
        g_recommendationsHeap.clear();
        res.set_content(R"({"ok":true})");
    });

    // ── Splay Tree — Recently Played ─────────────────────────────────────────
    svr.Post("/api/history/record", [](const HttpRequest& req, HttpResponse& res) {
        json body = parseBody(req.body);
        if (body.is_null() || !body.count("song")) {
            res.status = 400; res.set_content(R"({"error":"Missing song"})"); return;
        }
        std::string username = body.value("username", "");
        if (username.empty()) {
            res.status = 400; res.set_content(R"({"error":"Missing username"})"); return;
        }
        json song = body["song"];
        int trackId = song.value("trackId", 0);
        
        UserData* ud = getUserData(username);
        ud->historyTree.insert(trackId, song);
        saveAllData();
        res.set_content(R"({"ok":true})");
    });

    svr.Get("/api/history/recent", [](const HttpRequest& req, HttpResponse& res) {
        std::string username = req.getQuery("username");
        if (username.empty()) {
            res.set_content("[]"); return;
        }
        int limit = 10;
        std::string lv = req.getQuery("limit");
        if (!lv.empty()) try { limit = std::stoi(lv); } catch (...) {}
        
        UserData* ud = getUserData(username);
        auto recent = ud->historyTree.getRecent(limit);
        json arr = json::array();
        for (auto& s : recent) arr.push_back({{"song", s}});
        res.set_content(arr.dump());
    });

    // ── Trie — Search Autocomplete ──────────────────────────────────────────
    svr.Post("/api/search/index", [](const HttpRequest& req, HttpResponse& res) {
        json body = parseBody(req.body);
        if (body.is_null() || !body.count("songs")) {
            res.status = 400; res.set_content(R"({"error":"Missing songs array"})"); return;
        }
        for (const auto& song : body["songs"]) {
            std::string title = song.value("trackName", "");
            std::string artist = song.value("artistName", "");
            if (!title.empty()) g_searchTrie.insert(title, song);
            if (!artist.empty()) g_searchTrie.insert(artist, song);
        }
        res.set_content(R"({"ok":true})");
    });

    svr.Get("/api/search/autocomplete", [](const HttpRequest& req, HttpResponse& res) {
        std::string q = req.getQuery("q");
        int limit = 20;
        std::string lv = req.getQuery("limit");
        if (!lv.empty()) try { limit = std::stoi(lv); } catch (...) {}

        if (q.empty()) {
            res.set_content("[]");
            return;
        }

        auto results = g_searchTrie.autocomplete(q, limit);
        json arr = json::array();
        for (auto& s : results) arr.push_back(s);
        res.set_content(arr.dump());
    });

    // ── DLL — Playlists ─────────────────────────────────────────────────────
    svr.Post("/api/playlists/create", [](const HttpRequest& req, HttpResponse& res) {
        json body = parseBody(req.body);
        std::string username = body.value("username", "");
        std::string name = body.value("name", "");
        if (username.empty() || name.empty()) {
            res.status = 400; res.set_content(R"({"error":"username and name required"})"); return;
        }
        UserData* ud = getUserData(username);
        if (ud->playlists.find(name) != ud->playlists.end()) {
            res.status = 409; res.set_content(R"({"error":"Playlist already exists"})"); return;
        }
        ud->playlists[name] = new DoublyLinkedList();
        SkipList* sl = getPlaylistHistory(username, name);
        g_playlistVersions_counter++;
        sl->insert(g_playlistVersions_counter, json::array());
        saveAllData();
        res.set_content(R"({"ok":true})");
    });

    svr.Get("/api/playlists/{username}", [](const HttpRequest& req, HttpResponse& res) {
        std::string username = req.getParam("username", "");
        UserData* ud = getUserData(username);
        json arr = json::array();
        for (auto& plPair : ud->playlists) {
            if (plPair.first == "__liked__") continue;
            arr.push_back({{"name", plPair.first}, {"songCount", plPair.second->size()}});
        }
        res.set_content(arr.dump());
    });

    svr.Get("/api/playlists/{username}/{playlistName}", [](const HttpRequest& req, HttpResponse& res) {
        std::string username = req.getParam("username", "");
        std::string plName = req.getParam("playlistName", "");
        UserData* ud = getUserData(username);
        if (ud->playlists.find(plName) == ud->playlists.end()) {
            res.status = 404; res.set_content(R"({"error":"Playlist not found"})"); return;
        }
        auto songs = ud->playlists[plName]->toArray();
        json arr = json::array();
        for (auto& s : songs) arr.push_back(s);
        res.set_content(arr.dump());
    });

    svr.Post("/api/playlists/add", [](const HttpRequest& req, HttpResponse& res) {
        json body = parseBody(req.body);
        std::string username = body.value("username", "");
        std::string plName = body.value("playlistName", "");
        if (body.is_null() || !body.count("song")) {
            res.status = 400; res.set_content(R"({"error":"Missing fields"})"); return;
        }
        UserData* ud = getUserData(username);
        if (ud->playlists.find(plName) == ud->playlists.end()) {
            res.status = 404; res.set_content(R"({"error":"Playlist not found"})"); return;
        }
        json song = body["song"];
        int trackId = song.value("trackId", 0);
        ud->playlists[plName]->pushBack(trackId, song);
        // Record version in Skip List
        SkipList* sl = getPlaylistHistory(username, plName);
        g_playlistVersions_counter++;
        sl->insert(g_playlistVersions_counter, snapshotPlaylist(ud, plName));
        saveAllData();
        res.set_content(R"({"ok":true})");
    });

    svr.Post("/api/playlists/remove", [](const HttpRequest& req, HttpResponse& res) {
        json body = parseBody(req.body);
        std::string username = body.value("username", "");
        std::string plName = body.value("playlistName", "");
        int trackId = body.value("trackId", 0);
        UserData* ud = getUserData(username);
        if (ud->playlists.find(plName) == ud->playlists.end()) {
            res.status = 404; res.set_content(R"({"error":"Playlist not found"})"); return;
        }
        ud->playlists[plName]->remove(trackId);
        // Record version in Skip List
        SkipList* sl = getPlaylistHistory(username, plName);
        g_playlistVersions_counter++;
        sl->insert(g_playlistVersions_counter, snapshotPlaylist(ud, plName));
        saveAllData();
        res.set_content(R"({"ok":true})");
    });

    svr.Post("/api/playlists/delete", [](const HttpRequest& req, HttpResponse& res) {
        json body = parseBody(req.body);
        std::string username = body.value("username", "");
        std::string plName = body.value("playlistName", "");
        if (username.empty() || plName.empty()) {
            res.status = 400; res.set_content(R"({"error":"Missing fields"})"); return;
        }
        UserData* ud = getUserData(username);
        if (plName == "__liked__") {
            res.status = 403; res.set_content(R"({"error":"Cannot delete liked songs"})"); return;
        }
        if (ud->playlists.find(plName) != ud->playlists.end()) {
            delete ud->playlists[plName];
            ud->playlists.erase(plName);
            saveAllData();
        }
        res.set_content(R"({"ok":true})");
    });

    // ── Bloom Filter + DLL — Liked Songs ────────────────────────────────────
    svr.Post("/api/liked/toggle", [](const HttpRequest& req, HttpResponse& res) {
        json body = parseBody(req.body);
        std::string username = body.value("username", "");
        if (body.is_null() || !body.count("song") || username.empty()) {
            res.status = 400; res.set_content(R"({"error":"Missing fields"})"); return;
        }
        json song = body["song"];
        int trackId = song.value("trackId", 0);
        UserData* ud = getUserData(username);
        DoublyLinkedList* liked = ud->playlists["__liked__"];

        bool nowLiked;
        if (liked->has(trackId)) {
            liked->remove(trackId);
            nowLiked = false;
            // Note: Bloom filter has no remove — false positives possible but acceptable
        } else {
            liked->pushBack(trackId, song);
            ud->likeFilter.add(trackId);
            nowLiked = true;
        }

        saveAllData();
        json resp = {{"ok", true}, {"liked", nowLiked}};
        res.set_content(resp.dump());
    });

    svr.Get("/api/liked/{username}", [](const HttpRequest& req, HttpResponse& res) {
        std::string username = req.getParam("username", "");
        UserData* ud = getUserData(username);
        auto songs = ud->playlists["__liked__"]->toArray();
        json arr = json::array();
        for (auto& s : songs) arr.push_back(s);
        res.set_content(arr.dump());
    });

    svr.Post("/api/liked/check", [](const HttpRequest& req, HttpResponse& res) {
        json body = parseBody(req.body);
        std::string username = body.value("username", "");
        if (!body.count("trackIds")) {
            res.status = 400; res.set_content(R"({"error":"Missing trackIds"})"); return;
        }
        UserData* ud = getUserData(username);
        json result = json::object();
        for (auto& id : body["trackIds"]) {
            int trackId = id.get<int>();
            // Bloom filter for fast check, then confirm with DLL for accuracy
            bool bloomSays = ud->likeFilter.mightContain(trackId);
            bool confirmed = bloomSays ? ud->playlists["__liked__"]->has(trackId) : false;
            result[std::to_string(trackId)] = confirmed;
        }
        res.set_content(result.dump());
    });

    // ── Binomial Heap — Smart Download Queue ─────────────────────────────────
    svr.Post("/api/download/add", [](const HttpRequest& req, HttpResponse& res) {
        json body = parseBody(req.body);
        if (!body.count("song")) { res.status = 400; res.set_content(R"({"error":"Missing song"})"); return; }
        json song = body["song"];
        int priority = body.value("priority", 1);
        int trackId = song.value("trackId", 0);
        g_downloadQueue.insert(priority, trackId, song);
        json r = {{"ok", true}, {"queueSize", g_downloadQueue.size()}};
        res.set_content(r.dump());
    });

    svr.Get("/api/download/queue", [](const HttpRequest& req, HttpResponse& res) {
        int limit = 20;
        std::string lv = req.getQuery("limit");
        if (!lv.empty()) try { limit = std::stoi(lv); } catch (...) {}
        auto songs = g_downloadQueue.getAll(limit);
        json arr = json::array();
        for (auto& s : songs) arr.push_back(s);
        res.set_content(arr.dump());
    });

    svr.Post("/api/download/next", [](const HttpRequest&, HttpResponse& res) {
        auto r = g_downloadQueue.extractMax();
        if (!r.found) { res.status = 404; res.set_content(R"({"error":"Queue empty"})"); return; }
        json resp = {{"ok", true}, {"song", r.song}, {"priority", r.priority}};
        res.set_content(resp.dump());
    });

    svr.Delete_("/api/download/clear", [](const HttpRequest&, HttpResponse& res) {
        g_downloadQueue.clear();
        res.set_content(R"({"ok":true})");
    });

    // ── Leftist Tree — Priority Playback Queue ──────────────────────────────
    svr.Post("/api/playqueue/add", [](const HttpRequest& req, HttpResponse& res) {
        json body = parseBody(req.body);
        if (!body.count("song")) { res.status = 400; res.set_content(R"({"error":"Missing song"})"); return; }
        json song = body["song"];
        int priority = body.value("priority", 2);
        int trackId = song.value("trackId", 0);
        g_playQueue.insert(priority, trackId, song);
        json r = {{"ok", true}, {"queueSize", g_playQueue.size()}};
        res.set_content(r.dump());
    });

    svr.Get("/api/playqueue", [](const HttpRequest& req, HttpResponse& res) {
        int limit = 20;
        std::string lv = req.getQuery("limit");
        if (!lv.empty()) try { limit = std::stoi(lv); } catch (...) {}
        auto songs = g_playQueue.getAll(limit);
        json arr = json::array();
        for (auto& s : songs) arr.push_back(s);
        res.set_content(arr.dump());
    });

    svr.Post("/api/playqueue/next", [](const HttpRequest&, HttpResponse& res) {
        auto r = g_playQueue.extractMax();
        if (!r.found) { res.status = 404; res.set_content(R"({"error":"Queue empty"})"); return; }
        json resp = {{"ok", true}, {"song", r.song}, {"priority", r.priority}};
        res.set_content(resp.dump());
    });

    svr.Delete_("/api/playqueue/clear", [](const HttpRequest&, HttpResponse& res) {
        g_playQueue.clear();
        res.set_content(R"({"ok":true})");
    });

    // ── Pairing Heap — Collaborative Voting Queue ───────────────────────────
    svr.Post("/api/collab/vote", [](const HttpRequest& req, HttpResponse& res) {
        json body = parseBody(req.body);
        if (!body.count("song")) { res.status = 400; res.set_content(R"({"error":"Missing song"})"); return; }
        json song = body["song"];
        int trackId = song.value("trackId", 0);
        if (g_collabQueue.has(trackId)) {
            g_collabQueue.addVote(trackId);
        } else {
            g_collabQueue.insert(1, trackId, song);
        }
        json r = {{"ok", true}, {"votes", g_collabQueue.getVotes(trackId)}};
        res.set_content(r.dump());
    });

    svr.Get("/api/collab/queue", [](const HttpRequest& req, HttpResponse& res) {
        int limit = 20;
        std::string lv = req.getQuery("limit");
        if (!lv.empty()) try { limit = std::stoi(lv); } catch (...) {}
        auto songs = g_collabQueue.getTop(limit);
        json arr = json::array();
        for (auto& s : songs) arr.push_back(s);
        res.set_content(arr.dump());
    });

    svr.Post("/api/collab/pop", [](const HttpRequest&, HttpResponse& res) {
        auto r = g_collabQueue.extractMax();
        if (!r.found) { res.status = 404; res.set_content(R"({"error":"Queue empty"})"); return; }
        json resp = {{"ok", true}, {"song", r.song}, {"votes", r.votes}};
        res.set_content(resp.dump());
    });

    svr.Delete_("/api/collab/clear", [](const HttpRequest&, HttpResponse& res) {
        g_collabQueue.clear();
        res.set_content(R"({"ok":true})");
    });

    // ── Patricia Trie — Compressed Autocomplete ─────────────────────────────
    svr.Post("/api/search/index-compressed", [](const HttpRequest& req, HttpResponse& res) {
        json body = parseBody(req.body);
        if (!body.count("songs")) { res.status = 400; res.set_content(R"({"error":"Missing songs"})"); return; }
        for (const auto& song : body["songs"]) {
            std::string title = song.value("trackName", "");
            std::string artist = song.value("artistName", "");
            if (!title.empty()) g_patriciaTrie.insert(title, song);
            if (!artist.empty()) g_patriciaTrie.insert(artist, song);
        }
        res.set_content(R"({"ok":true})");
    });

    svr.Get("/api/search/autocomplete-compressed", [](const HttpRequest& req, HttpResponse& res) {
        std::string q = req.getQuery("q");
        int limit = 20;
        std::string lv = req.getQuery("limit");
        if (!lv.empty()) try { limit = std::stoi(lv); } catch (...) {}
        if (q.empty()) { res.set_content("[]"); return; }
        auto results = g_patriciaTrie.autocomplete(q, limit);
        json arr = json::array();
        for (auto& s : results) arr.push_back(s);
        res.set_content(arr.dump());
    });

    svr.Get("/api/search/trie-stats", [](const HttpRequest&, HttpResponse& res) {
        json stats = {
            {"trieType", "Patricia (Compressed)"},
            {"nodeCount", g_patriciaTrie.getNodeCount()}
        };
        res.set_content(stats.dump());
    });

    // ── Suffix Array — Substring Search ─────────────────────────────────────
    svr.Post("/api/lyrics/index", [](const HttpRequest& req, HttpResponse& res) {
        json body = parseBody(req.body);
        if (!body.count("songs")) { res.status = 400; res.set_content(R"({"error":"Missing songs"})"); return; }
        std::vector<std::pair<std::string, json>> entries;
        for (const auto& song : body["songs"]) {
            std::string text = song.value("trackName", "") + " " + song.value("artistName", "");
            entries.push_back({text, song});
        }
        g_suffixArray.build(entries);
        json r = {{"ok", true}, {"indexSize", g_suffixArray.size()}};
        res.set_content(r.dump());
    });

    svr.Get("/api/lyrics/search", [](const HttpRequest& req, HttpResponse& res) {
        std::string q = req.getQuery("q");
        int limit = 20;
        std::string lv = req.getQuery("limit");
        if (!lv.empty()) try { limit = std::stoi(lv); } catch (...) {}
        if (q.empty()) { res.set_content("[]"); return; }
        auto results = g_suffixArray.search(q, limit);
        json arr = json::array();
        for (auto& s : results) arr.push_back(s);
        res.set_content(arr.dump());
    });

    // ── Skip List — Playlist Undo/Redo ──────────────────────────────────────
    svr.Get("/api/playlists/history/{username}/{playlistName}", [](const HttpRequest& req, HttpResponse& res) {
        std::string username = req.getParam("username", "");
        std::string plName = req.getParam("playlistName", "");
        SkipList* sl = getPlaylistHistory(username, plName);
        auto versions = sl->getAllVersions();
        json arr = json::array();
        for (auto& v : versions) arr.push_back(v);
        json resp = {{"versions", arr}, {"currentVersion", sl->getLatestVersion()}};
        res.set_content(resp.dump());
    });

    svr.Post("/api/playlists/undo/{username}/{playlistName}", [](const HttpRequest& req, HttpResponse& res) {
        std::string username = req.getParam("username", "");
        std::string plName = req.getParam("playlistName", "");
        SkipList* sl = getPlaylistHistory(username, plName);
        if (sl->size() <= 1) { res.status = 400; res.set_content(R"({"error":"Nothing to undo"})"); return; }
        int currVer = sl->getLatestVersion();
        if (currVer <= 0) { res.status = 400; res.set_content(R"({"error":"Nothing to undo"})"); return; }
        
        json prevSnapshot = sl->popLatest();
        
        // Restore playlist from snapshot
        UserData* ud = getUserData(username);
        if (ud->playlists.find(plName) != ud->playlists.end()) {
            delete ud->playlists[plName];
        }
        ud->playlists[plName] = new DoublyLinkedList();
        for (auto& song : prevSnapshot) {
            int tid = song.value("trackId", 0);
            ud->playlists[plName]->pushBack(tid, song);
        }
        
        saveAllData();
        json resp = {{"ok", true}, {"version", sl->getLatestVersion()}, {"songs", prevSnapshot}};
        res.set_content(resp.dump());
    });

    // ── Treap — Randomized Shuffle ──────────────────────────────────────────
    svr.Post("/api/shuffle/add", [](const HttpRequest& req, HttpResponse& res) {
        json body = parseBody(req.body);
        if (!body.count("song")) { res.status = 400; res.set_content(R"({"error":"Missing song"})"); return; }
        json song = body["song"];
        double score = body.value("score", 50.0);
        int trackId = song.value("trackId", 0);
        g_shuffleTreap.insert(trackId, score, song);
        json r = {{"ok", true}, {"size", g_shuffleTreap.size()}};
        res.set_content(r.dump());
    });

    svr.Get("/api/shuffle/get", [](const HttpRequest& req, HttpResponse& res) {
        int limit = 20;
        std::string lv = req.getQuery("limit");
        if (!lv.empty()) try { limit = std::stoi(lv); } catch (...) {}
        auto songs = g_shuffleTreap.getShuffle(limit);
        json arr = json::array();
        for (auto& s : songs) arr.push_back(s);
        res.set_content(arr.dump());
    });

    svr.Post("/api/shuffle/rerandomize", [](const HttpRequest&, HttpResponse& res) {
        g_shuffleTreap.reRandomize();
        res.set_content(R"({"ok":true})");
    });

    svr.Delete_("/api/shuffle/clear", [](const HttpRequest&, HttpResponse& res) {
        g_shuffleTreap.clear();
        res.set_content(R"({"ok":true})");
    });

    // ── Start ────────────────────────────────────────────────────────────────
    std::cout << "========================================\n";
    std::cout << "  MusicDS C++ Backend  |  port 8080\n";
    std::cout << "========================================\n";
    std::cout << "  [OK] AVL Tree        -> /api/preferences\n";
    std::cout << "  [OK] Red-Black Tree  -> /api/charts\n";
    std::cout << "  [OK] Fibonacci Heap  -> /api/recommendations\n";
    std::cout << "  [OK] Trie            -> /api/search\n";
    std::cout << "  [OK] Splay Tree      -> /api/history\n";
    std::cout << "  [OK] B+ Tree         -> /api/auth\n";
    std::cout << "  [OK] Doubly LL       -> /api/playlists\n";
    std::cout << "  [OK] Bloom Filter    -> /api/liked\n";
    std::cout << "  [OK] Binomial Heap   -> /api/download\n";
    std::cout << "  [OK] Leftist Tree    -> /api/playqueue\n";
    std::cout << "  [OK] Pairing Heap    -> /api/collab\n";
    std::cout << "  [OK] Patricia Trie   -> /api/search (compressed)\n";
    std::cout << "  [OK] Suffix Array    -> /api/lyrics\n";
    std::cout << "  [OK] Skip List       -> /api/playlists/history\n";
    std::cout << "  [OK] Treap           -> /api/shuffle\n";
    std::cout << "========================================\n\n";

    return svr.listen("0.0.0.0", 8080) ? 0 : 1;
}
