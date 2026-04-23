/**
 * simple_http.h
 * Minimal single-threaded HTTP/1.1 server using only Winsock2.
 * No external dependencies — compiles with GCC 6+ / MSVC / Clang on Windows.
 */
#pragma once
#ifdef _WIN32
  #ifndef WIN32_LEAN_AND_MEAN
    #define WIN32_LEAN_AND_MEAN
  #endif
  #ifndef NOMINMAX
    #define NOMINMAX
  #endif
  #include <winsock2.h>
  #include <windows.h>
  #pragma comment(lib, "ws2_32.lib")
  typedef int ssize_t;
#endif

#include <algorithm>
#include <functional>
#include <iostream>
#include <map>
#include <sstream>
#include <string>
#include <vector>

// ── Request / Response ────────────────────────────────────────────────────────

struct HttpRequest {
    std::string method;
    std::string path;
    std::map<std::string, std::string> params;  // URL path params  {:key → value}
    std::map<std::string, std::string> query;   // query string params
    std::string body;

    std::string getQuery(const std::string& key, const std::string& def = "") const {
        auto it = query.find(key);
        return it != query.end() ? it->second : def;
    }
    std::string getParam(const std::string& key, const std::string& def = "") const {
        auto it = params.find(key);
        return it != params.end() ? it->second : def;
    }
};

struct HttpResponse {
    int         status      = 200;
    std::string contentType = "application/json";
    std::string body;

    void set_content(const std::string& b, const std::string& ct = "application/json") {
        body = b; contentType = ct;
    }
};

// ── Helper: split string ───────────────────────────────────────────────────────

static std::vector<std::string> httpSplit(const std::string& s, char delim) {
    std::vector<std::string> parts;
    std::istringstream ss(s);
    std::string part;
    while (std::getline(ss, part, delim)) parts.push_back(part);
    return parts;
}

// ── Route ─────────────────────────────────────────────────────────────────────

using Handler = std::function<void(const HttpRequest&, HttpResponse&)>;

struct Route {
    std::string method;
    std::string pattern;   // e.g. "/api/preferences/{userId}"
    Handler     handler;
};

// ── Server ────────────────────────────────────────────────────────────────────

class SimpleServer {
public:
    SimpleServer() {}

    void Get    (const std::string& p, Handler h) { routes_.push_back({"GET",    p, h}); }
    void Post   (const std::string& p, Handler h) { routes_.push_back({"POST",   p, h}); }
    void Delete_(const std::string& p, Handler h) { routes_.push_back({"DELETE", p, h}); }

    bool listen(const char* host, int port) {
        WSADATA wsa;
        if (WSAStartup(MAKEWORD(2,2), &wsa) != 0) {
            std::cerr << "WSAStartup failed\n"; return false;
        }

        SOCKET srv = socket(AF_INET, SOCK_STREAM, IPPROTO_TCP);
        if (srv == INVALID_SOCKET) { std::cerr << "socket() failed\n"; return false; }

        int opt = 1;
        setsockopt(srv, SOL_SOCKET, SO_REUSEADDR, (char*)&opt, sizeof(opt));

        sockaddr_in addr{};
        addr.sin_family      = AF_INET;
        addr.sin_addr.s_addr = INADDR_ANY;
        addr.sin_port        = htons((u_short)port);

        if (bind(srv, (sockaddr*)&addr, sizeof(addr)) == SOCKET_ERROR) {
            std::cerr << "bind() failed\n"; closesocket(srv); return false;
        }
        if (::listen(srv, SOMAXCONN) == SOCKET_ERROR) {
            std::cerr << "listen() failed\n"; closesocket(srv); return false;
        }

        std::cout << "Server listening on http://localhost:" << port << "\n";

        while (true) {
            SOCKET client = accept(srv, nullptr, nullptr);
            if (client == INVALID_SOCKET) continue;
            handleClient(client);
        }
        WSACleanup();
        return true;
    }

private:
    std::vector<Route> routes_;

    // ── Parse and dispatch ────────────────────────────────────────────────────
    void handleClient(SOCKET client) {
        // Read full request (naively — good enough for local use)
        std::string raw;
        char buf[65536];
        int n = recv(client, buf, sizeof(buf) - 1, 0);
        if (n <= 0) { closesocket(client); return; }
        buf[n] = '\0';
        raw.assign(buf, n);

        // ── Parse request line ────────────────────────────────────────────────
        HttpRequest  req;
        HttpResponse res;

        size_t lineEnd = raw.find("\r\n");
        if (lineEnd == std::string::npos) { closesocket(client); return; }

        std::string requestLine = raw.substr(0, lineEnd);
        std::istringstream rl(requestLine);
        std::string pathFull;
        rl >> req.method >> pathFull;

        // Split path and query string
        size_t qmark = pathFull.find('?');
        if (qmark != std::string::npos) {
            req.path = pathFull.substr(0, qmark);
            parseQuery(pathFull.substr(qmark + 1), req.query);
        } else {
            req.path = pathFull;
        }

        // ── Parse headers ─────────────────────────────────────────────────────
        size_t headerEnd = raw.find("\r\n\r\n");
        int contentLen = 0;
        if (headerEnd != std::string::npos) {
            std::string headers = raw.substr(lineEnd + 2, headerEnd - lineEnd - 2);
            std::istringstream hs(headers);
            std::string h;
            while (std::getline(hs, h)) {
                if (!h.empty() && h.back() == '\r') h.pop_back();
                std::string hl = h;
                std::transform(hl.begin(), hl.end(), hl.begin(), ::tolower);
                if (hl.find("content-length:") == 0) {
                    contentLen = std::stoi(h.substr(16));
                }
            }
            req.body = raw.substr(headerEnd + 4, contentLen);
        }

        // ── Handle CORS preflight ─────────────────────────────────────────────
        if (req.method == "OPTIONS") {
            res.status = 204; res.body = "";
            sendResponse(client, res); closesocket(client); return;
        }

        // ── Route matching ────────────────────────────────────────────────────
        bool found = false;
        for (auto& route : routes_) {
            if (route.method != req.method) continue;
            std::map<std::string, std::string> pathParams;
            if (matchPattern(route.pattern, req.path, pathParams)) {
                req.params = pathParams;
                route.handler(req, res);
                found = true;
                break;
            }
        }
        if (!found) {
            res.status = 404;
            res.body   = R"({"error":"Not found"})";
        }

        sendResponse(client, res);
        closesocket(client);
    }

    // ── Pattern matching: /api/preferences/{userId} ───────────────────────────
    bool matchPattern(const std::string& pattern, const std::string& path,
                      std::map<std::string, std::string>& params) {
        auto patSegs  = httpSplit(pattern, '/');
        auto pathSegs = httpSplit(path,    '/');
        if (patSegs.size() != pathSegs.size()) return false;

        for (size_t i = 0; i < patSegs.size(); i++) {
            const auto& ps = patSegs[i];
            if (ps.size() >= 2 && ps.front() == '{' && ps.back() == '}') {
                params[ps.substr(1, ps.size() - 2)] = pathSegs[i];
            } else if (ps != pathSegs[i]) {
                return false;
            }
        }
        return true;
    }

    // ── Parse ?key=val&key2=val2 ──────────────────────────────────────────────
    void parseQuery(const std::string& qs, std::map<std::string, std::string>& out) {
        auto pairs = httpSplit(qs, '&');
        for (auto& pair : pairs) {
            size_t eq = pair.find('=');
            if (eq != std::string::npos)
                out[pair.substr(0, eq)] = pair.substr(eq + 1);
            else
                out[pair] = "";
        }
    }

    // ── Build and send HTTP response ──────────────────────────────────────────
    void sendResponse(SOCKET client, const HttpResponse& res) {
        const char* statusText = "OK";
        switch (res.status) {
            case 204: statusText = "No Content";    break;
            case 400: statusText = "Bad Request";   break;
            case 404: statusText = "Not Found";     break;
            case 503: statusText = "Unavailable";   break;
        }

        std::ostringstream oss;
        oss << "HTTP/1.1 " << res.status << " " << statusText << "\r\n"
            << "Content-Type: "  << res.contentType << "\r\n"
            << "Content-Length: " << res.body.size() << "\r\n"
            << "Access-Control-Allow-Origin: *\r\n"
            << "Access-Control-Allow-Methods: GET, POST, DELETE, OPTIONS\r\n"
            << "Access-Control-Allow-Headers: Content-Type\r\n"
            << "Connection: close\r\n"
            << "\r\n"
            << res.body;

        std::string resp = oss.str();
        send(client, resp.c_str(), (int)resp.size(), 0);
    }
};
