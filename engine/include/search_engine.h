#pragma once
#include <string>
#include <unordered_map>
#include <vector>
namespace vortex {
struct Resource { int id; std::string subject, title, url, description, keywords, source; };
struct Posting { int document; int frequency; };
struct Result { int document; double score; };
class SearchEngine {
public:
    void load(const std::string& tsv);
    const std::vector<Resource>& resources() const { return documents; }
    std::vector<Result> search(const std::string& query, const std::string& subject = "", bool fullScan = false) const;
    std::vector<std::string> extractKeywords(const std::string& text, int limit = 12) const;
    static std::vector<std::string> tokenize(const std::string& text);
private:
    std::vector<Resource> documents;
    std::vector<std::unordered_map<std::string, int>> frequencies;
    std::vector<int> lengths;
    std::unordered_map<std::string, std::vector<Posting>> index;
    double averageLength = 0;
    double contribution(int frequency, int document, int documentFrequency) const;
};
std::string readFile(const std::string& path);
std::string jsonEscape(const std::string& text);
}
