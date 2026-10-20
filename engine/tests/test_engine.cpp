#include "search_engine.h"
#include <cmath>
#include <iostream>
#include <stdexcept>
void check(bool ok,const std::string& message){if(!ok)throw std::runtime_error(message);}
int main(int argc,char** argv){
 try{
  check(argc==2,"Pass catalogue path");
  vortex::SearchEngine engine;engine.load(vortex::readFile(argv[1]));
  check(engine.resources().size()==44,"Catalogue size");
  check(vortex::SearchEngine::tokenize("How do DEADLOCKS occur? Classes & CPP!")==std::vector<std::string>({"deadlock","occur","class","c++"}),"Tokenizer");
  for(const std::string query:{"","the and how","xyzzyunknownword"})check(engine.search(query).empty(),"Empty or unknown query");
  check(engine.search("deadlock","DSA").empty(),"Subject exclusion");
  auto results=engine.search("deadlock","OS");check(!results.empty(),"Deadlock result");
  check(engine.resources()[results[0].document].id==42,"Deadlock ranking");
  for(const std::string query:{"deadlock synchronization","binary search","virtual functions","transaction isolation","thread locks","the unknown xyz","graph tree","indexes"}){
   for(const std::string filter:{"","DSA","OOPS","DBMS","OS"}){
    auto a=engine.search(query,filter),b=engine.search(query,filter,true);
    check(a.size()==b.size(),"Parity count");
    for(std::size_t i=0;i<a.size();++i){check(a[i].document==b[i].document,"Parity order");check(std::abs(a[i].score-b[i].score)<1e-12,"Parity score");check(std::isfinite(a[i].score)&&a[i].score>0,"Positive finite score");}
   }
  }
  check(engine.search("deadlock")[0].score==engine.search("deadlock deadlock")[0].score,"Query deduplication");
  auto keys=engine.extractKeywords("Deadlock process synchronization and waiting threads.");check(!keys.empty()&&keys.size()<=12,"Keywords");
  check(engine.extractKeywords("unknownxyz the and").empty(),"Unknown keywords");
  for(const std::string bad:{"broken row","","1\tBAD\tTitle\thttps://example.com\tDesc\tKeywords\tSource","1\tOS\tTitle\tjavascript:alert(1)\tDesc\tKeywords\tSource"}){
   bool failed=false;try{engine.load(bad);}catch(...){failed=true;}check(failed&&engine.resources().size()==44,"Invalid reload atomicity");
  }
  vortex::SearchEngine tiny;const std::string row="1\tOS\tDeadlock\thttps://example.com\tDeadlock process\tlock\tTest\n";
  tiny.load(row);check(std::isfinite(tiny.search("deadlock")[0].score),"Single document");
  bool failed=false;try{tiny.load(row+row);}catch(...){failed=true;}check(failed,"Duplicate IDs");
  check(vortex::jsonEscape("\"\n\\")=="\\\"\\u000a\\\\","JSON escape");
  std::cout<<"PASS: native ranking, tokenization, 40 scan/index comparisons, keywords, filters and invalid-load recovery\n";
 }catch(const std::exception& e){std::cerr<<"FAIL: "<<e.what()<<'\n';return 1;}
}
