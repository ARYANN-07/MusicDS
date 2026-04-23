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
#include <iostream>
#include <string>

using json = nlohmann::json;

static json parseBody(const std::string& body) {
    try { return json::parse(body); }
    catch (...) { return json(); }
}

int main() {
    SimpleServer svr;

    // ── Health ───────────────────────────────────────────────────────────────
    svr.Get("/api/health", [](const HttpRequest&, HttpResponse& res) {
        json r = {
            {"status", "ok"},
            {"dataStructures", {"AVL Tree (User Preferences)", "Red-Black Tree (Top Charts)", "Fibonacci Heap (Recommendations)"}},
            {"notImplemented", {"Trie (Search Autocomplete)", "Splay Tree (Recently Played)"}}
        };
        res.set_content(r.dump());
    });

    // ── AVL Tree — User Preferences ─────────────────────────────────────────
    svr.Post("/api/preferences", [](const HttpRequest& req, HttpResponse& res) {
        json body = parseBody(req.body);
        if (body.is_null()) { res.status = 400; res.set_content(R"({"error":"Bad JSON"})"); return; }
        std::string userId = body.value("userId", std::string("default"));
        g_userPreferencesTree.insert(userId, body);
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

    // ── Start ────────────────────────────────────────────────────────────────
    std::cout << "========================================\n";
    std::cout << "  MusicDS C++ Backend  |  port 8080\n";
    std::cout << "========================================\n";
    std::cout << "  [OK] AVL Tree        -> /api/preferences\n";
    std::cout << "  [OK] Red-Black Tree  -> /api/charts\n";
    std::cout << "  [OK] Fibonacci Heap  -> /api/recommendations\n";
    std::cout << "  [--] Trie            -> not yet implemented\n";
    std::cout << "  [--] Splay Tree      -> not yet implemented\n";
    std::cout << "========================================\n\n";

    return svr.listen("0.0.0.0", 8080) ? 0 : 1;
}
