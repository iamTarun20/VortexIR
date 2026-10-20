#include "search_engine.h"
#include <algorithm>
#include <cmath>
#include <fstream>
#include <sstream>
#include <stdexcept>
#include <unordered_set>
#include <utility>
namespace vortex {
std::string readFile(const std::string& path) {
    std::ifstream file(path);
    if (!file) throw std::runtime_error("Cannot open catalogue: " + path);
    std::ostringstream buffer;
    buffer << file.rdbuf();
    return buffer.str();
}
std::string jsonEscape(const std::string& text) {
    std::string out;
    const char* hex = "0123456789abcdef";
    for (unsigned char c : text) {
        if (c == '"' || c == '\\') { out += '\\'; out += c; }
        else if (c < 32) { out += "\\u00"; out += hex[c / 16]; out += hex[c % 16]; }
        else out += c;
    }
    return out;
}
std::vector<std::string> SearchEngine::tokenize(const std::string& text) {
    static const std::unordered_set<std::string> stop = {
        "a","an","the","is","are","was","were","be","been","being","to","of","in","on","at","for","from",
        "and","or","with","by","as","it","its","this","that","these","those","i","we","you","they","their",
        "what","why","how","when","where","which","does","do","did","can","could","would","should","will",
        "please","explain","about","me","my","notes","learn","using","use","into","than","then","also","not"
    };
    // An explicit, deliberately small alias dictionary; not a general stemmer.
    static const std::unordered_map<std::string,std::string> aliases = {
        {"arrays","array"},{"trees","tree"},{"graphs","graph"},{"processes","process"},
        {"threads","thread"},{"locks","lock"},{"deadlocks","deadlock"},{"databases","database"},
        {"indexes","index"},{"indices","index"},{"transactions","transaction"},{"classes","class"},
        {"objects","object"},{"algorithms","algorithm"},{"functions","function"},{"sorting","sort"},
        {"searching","search"},{"cpp","c++"},{"oop","oops"},{"synchronisation","synchronization"}
    };
    std::vector<std::string> words;
    std::string word;
    for (std::size_t i = 0; i <= text.size(); ++i) {
        unsigned char c = i == text.size() ? ' ' : text[i];
        if (c >= 'A' && c <= 'Z') c += 'a' - 'A';
        if ((c >= 'a' && c <= 'z') || (c >= '0' && c <= '9') || c == '+') word += c;
        else if (!word.empty()) {
            auto alias = aliases.find(word);
            if (alias != aliases.end()) word = alias->second;
            if (word.size() > 1 && !stop.count(word)) words.push_back(word);
            word.clear();
        }
    }
    return words;
}
void SearchEngine::load(const std::string& tsv) {
    // Commit a new index only after every record has been validated.
    SearchEngine next;
    std::unordered_set<int> ids;
    std::istringstream input(tsv);
    std::string line;
    int lineNumber = 0;
    while (std::getline(input, line)) {
        ++lineNumber;
        if (!line.empty() && line.back() == '\r') line.pop_back();
        if (line.empty() || line[0] == '#') continue;
        std::vector<std::string> fields;
        std::istringstream row(line);
        std::string field;
        while (std::getline(row, field, '\t')) fields.push_back(field);
        if (fields.size() != 7) throw std::runtime_error("Expected 7 TSV fields on line " + std::to_string(lineNumber));
        for (const auto& item : fields) if (item.empty()) throw std::runtime_error("Empty catalogue field");
        std::size_t used = 0;
        int id = std::stoi(fields[0], &used);
        if (used != fields[0].size() || id < 1 || !ids.insert(id).second) throw std::runtime_error("Invalid or duplicate resource ID");
        if (fields[1] != "DSA" && fields[1] != "OOPS" && fields[1] != "DBMS" && fields[1] != "OS") throw std::runtime_error("Invalid subject");
        if (fields[3].rfind("https://", 0) != 0) throw std::runtime_error("Resource links must use HTTPS");
        Resource resource{id,fields[1],fields[2],fields[3],fields[4],fields[5],fields[6]};
        int document = static_cast<int>(next.documents.size());
        next.documents.push_back(resource);
        auto words = tokenize(resource.title + " " + resource.description + " " + resource.keywords);
        next.lengths.push_back(static_cast<int>(words.size()));
        next.averageLength += words.size();
        std::unordered_map<std::string,int> counts;
        for (const auto& word : words) ++counts[word];
        for (const auto& pair : counts) next.index[pair.first].push_back({document,pair.second});
        next.frequencies.push_back(counts);
    }
    if (next.documents.empty()) throw std::runtime_error("Catalogue is empty");
    next.averageLength /= next.documents.size();
    *this = std::move(next);
}
double SearchEngine::contribution(int frequency, int document, int df) const {
    const double k1 = 1.2, b = 0.75;
    double idf = std::log(1.0 + (documents.size() - df + 0.5) / (df + 0.5));
    double denominator = frequency + k1 * (1.0 - b + b * lengths[document] / averageLength);
    return idf * frequency * (k1 + 1.0) / denominator;
}
std::vector<Result> SearchEngine::search(const std::string& query, const std::string& subject, bool fullScan) const {
    auto words = tokenize(query);
    std::sort(words.begin(), words.end());
    words.erase(std::unique(words.begin(),words.end()),words.end());
    std::unordered_map<int,double> scores;
    for (const auto& word : words) {
        auto found = index.find(word);
        if (found == index.end()) continue;
        int df = static_cast<int>(found->second.size());
        if (fullScan) {
            // Same formula as indexed search; inspect every document's term map.
            for (int d = 0; d < static_cast<int>(documents.size()); ++d) {
                if (!subject.empty() && documents[d].subject != subject) continue;
                auto count = frequencies[d].find(word);
                if (count != frequencies[d].end()) scores[d] += contribution(count->second,d,df);
            }
        } else {
            for (const auto& posting : found->second) {
                int d = posting.document;
                if (subject.empty() || documents[d].subject == subject)
                    scores[d] += contribution(posting.frequency,d,df);
            }
        }
    }
    std::vector<Result> results;
    for (const auto& pair : scores) results.push_back({pair.first,pair.second});
    std::sort(results.begin(),results.end(),[this](const Result& a,const Result& b) {
        if (a.score != b.score) return a.score > b.score;
        return documents[a.document].id < documents[b.document].id;
    });
    return results;
}
std::vector<std::string> SearchEngine::extractKeywords(const std::string& text, int limit) const {
    std::unordered_map<std::string,int> counts;
    for (const auto& word : tokenize(text)) if (index.count(word)) ++counts[word];
    std::vector<std::pair<std::string,double>> ranked;
    for (const auto& pair : counts) {
        double df = index.at(pair.first).size();
        ranked.push_back({pair.first,(1.0 + std::log(pair.second)) * std::log(1.0 + documents.size() / df)});
    }
    std::sort(ranked.begin(),ranked.end(),[](const std::pair<std::string,double>& a,const std::pair<std::string,double>& b) {
        return a.second == b.second ? a.first < b.first : a.second > b.second;
    });
    std::vector<std::string> output;
    for (int i = 0; i < limit && i < static_cast<int>(ranked.size()); ++i) output.push_back(ranked[i].first);
    return output;
}
}
