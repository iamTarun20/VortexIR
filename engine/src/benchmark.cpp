#include "search_engine.h"
#include <algorithm>
#include <chrono>
#include <cmath>
#include <iomanip>
#include <iostream>
#include <sstream>
#include <stdexcept>
using Clock=std::chrono::steady_clock;
std::vector<double> measure(const vortex::SearchEngine& engine,const std::vector<std::string>& queries,bool scan){
 std::vector<double> samples;volatile std::size_t checksum=0;
 for(int i=0;i<20;++i)for(const auto& q:queries)checksum+=engine.search(q,"",scan).size();
 for(int i=0;i<100;++i)for(const auto& q:queries){
  auto start=Clock::now();auto result=engine.search(q,"",scan);auto end=Clock::now();checksum+=result.size();
  samples.push_back(std::chrono::duration<double,std::micro>(end-start).count());
 }
 std::sort(samples.begin(),samples.end());if(!checksum)throw std::runtime_error("No matches");return samples;
}
int main(int argc,char** argv){
 try{
  if(argc!=2)throw std::runtime_error("Pass catalogue path");
  auto catalogue=vortex::readFile(argv[1]);
  const std::vector<std::string> queries={"deadlock","binary search","virtual functions","transaction isolation","bfs","semaphore","index","graph"};
  std::cout<<"| Dataset | Records | Build ms | Indexed median / p95 µs | Full scan median / p95 µs |\n|---|---:|---:|---:|---:|\n";
  for(int copies:{1,100}){
   std::string data;int id=0;
   for(int copy=0;copy<copies;++copy){std::istringstream in(catalogue);std::string line;while(std::getline(in,line)){if(line.empty()||line[0]=='#')continue;data+=std::to_string(++id)+line.substr(line.find('\t'))+"\n";}}
   vortex::SearchEngine engine;auto start=Clock::now();engine.load(data);double build=std::chrono::duration<double,std::milli>(Clock::now()-start).count();
   for(const auto& q:queries){auto a=engine.search(q),b=engine.search(q,"",true);if(a.size()!=b.size())throw std::runtime_error("Parity count");for(std::size_t i=0;i<a.size();++i)if(a[i].document!=b[i].document||std::abs(a[i].score-b[i].score)>1e-12)throw std::runtime_error("Parity mismatch");}
   auto a=measure(engine,queries,false),b=measure(engine,queries,true);
   std::cout<<"| "<<(copies==1?"Curated catalogue":"Synthetic 100× repetition")<<" | "<<id<<" | "<<std::fixed<<std::setprecision(3)<<build<<" | "<<a[a.size()/2]<<" / "<<a[a.size()*95/100]<<" | "<<b[b.size()/2]<<" / "<<b[b.size()*95/100]<<" |\n";
  }
 }catch(const std::exception& e){std::cerr<<e.what()<<'\n';return 1;}
}
