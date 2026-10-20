#include "search_engine.h"
#include <iostream>
#include <stdexcept>
int main(int argc,char** argv) {
    if (argc < 3) { std::cerr << "Usage: vortexir data/resources.tsv \"query\" [DSA|OOPS|DBMS|OS]\n"; return 1; }
    try {
        vortex::SearchEngine engine;
        engine.load(vortex::readFile(argv[1]));
        std::string subject = argc > 3 ? argv[3] : "";
        if (!subject.empty() && subject != "DSA" && subject != "OOPS" && subject != "DBMS" && subject != "OS") throw std::runtime_error("Unknown subject");
        auto results = engine.search(argv[2],subject);
        std::cout << results.size() << " matching resources\n";
        for (const auto& result : results) {
            const auto& r = engine.resources()[result.document];
            std::cout << '[' << r.subject << "] " << r.title << " (BM25 " << result.score << ")\n" << r.url << '\n';
        }
    } catch (const std::exception& error) { std::cerr << error.what() << '\n'; return 1; }
}
