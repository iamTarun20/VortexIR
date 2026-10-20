// Integration code is kept separate from the search algorithm.
#include "search_engine.h"
#include <sstream>
#include <exception>
static vortex::SearchEngine engine;
static std::string response;
extern "C" {
int load_catalogue(const char* text) {
    try { engine.load(text); return static_cast<int>(engine.resources().size()); }
    catch (const std::exception& error) { response = error.what(); return -1; }
}
const char* last_error() { return response.c_str(); }
const char* search_resources(const char* query,const char* subject) {
    auto results = engine.search(query,subject);
    std::ostringstream out;
    out << '[';
    for (std::size_t i = 0; i < results.size(); ++i) {
        if (i) out << ',';
        out << "{\"id\":" << engine.resources()[results[i].document].id << ",\"score\":" << results[i].score << '}';
    }
    out << ']'; response = out.str(); return response.c_str();
}
const char* extract_keywords(const char* text) {
    auto words = engine.extractKeywords(text);
    response = "[";
    for (std::size_t i = 0; i < words.size(); ++i) {
        if (i) response += ',';
        response += "\"" + vortex::jsonEscape(words[i]) + "\"";
    }
    response += ']'; return response.c_str();
}
}
