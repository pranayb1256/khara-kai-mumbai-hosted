from fastapi import FastAPI, Query
from pydantic import BaseModel
import requests
from bs4 import BeautifulSoup
from dateutil import parser as dateparser
import urllib.parse
from datetime import datetime
import re

app = FastAPI(title="Mumbai News Scrapers")

class Result(BaseModel):
    source: str
    url: str
    title: str
    snippet: str
    published_at: str

HEADERS = {
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
}

def fetch_google_news(query: str, max_results: int = 10):
    """Fetch news from Google News RSS feed"""
    results = []
    try:
        encoded_query = urllib.parse.quote(f"mumbai {query}")
        rss_url = f"https://news.google.com/rss/search?q={encoded_query}&hl=en-IN&gl=IN&ceid=IN:en"
        
        response = requests.get(rss_url, headers=HEADERS, timeout=10)
        if response.status_code == 200:
            soup = BeautifulSoup(response.content, 'lxml-xml')
            items = soup.find_all('item', limit=max_results)
            
            for item in items:
                title = item.find('title').text if item.find('title') else ''
                link = item.find('link').text if item.find('link') else ''
                pub_date = item.find('pubDate').text if item.find('pubDate') else ''
                source_elem = item.find('source')
                source_name = source_elem.text if source_elem else 'Google News'
                
                # Parse date
                try:
                    parsed_date = dateparser.parse(pub_date)
                    pub_date_iso = parsed_date.isoformat() if parsed_date else datetime.now().isoformat()
                except:
                    pub_date_iso = datetime.now().isoformat()
                
                results.append({
                    'source': source_name,
                    'url': link,
                    'title': title,
                    'snippet': title,  # Google News RSS doesn't include description
                    'published_at': pub_date_iso
                })
    except Exception as e:
        print(f"Google News fetch error: {e}")
    
    return results

def fetch_times_of_india(query: str, max_results: int = 5):
    """Fetch Mumbai news from Times of India"""
    results = []
    try:
        # TOI Mumbai section
        url = f"https://timesofindia.indiatimes.com/city/mumbai"
        response = requests.get(url, headers=HEADERS, timeout=10)
        
        if response.status_code == 200:
            soup = BeautifulSoup(response.content, 'html.parser')
            # Find article links
            articles = soup.select('div.col_l_6 a, div.col_r_6 a, .uwU81 a')[:max_results]
            
            for article in articles:
                title = article.get_text(strip=True)
                link = article.get('href', '')
                if not link.startswith('http'):
                    link = f"https://timesofindia.indiatimes.com{link}"
                
                # Filter by query
                if query.lower() in title.lower() or any(kw in title.lower() for kw in ['mumbai', 'local', 'train', 'traffic', 'rain', 'flood']):
                    results.append({
                        'source': 'Times of India',
                        'url': link,
                        'title': title,
                        'snippet': title,
                        'published_at': datetime.now().isoformat()
                    })
    except Exception as e:
        print(f"TOI fetch error: {e}")
    
    return results

def fetch_hindustan_times(query: str, max_results: int = 5):
    """Fetch Mumbai news from Hindustan Times"""
    results = []
    try:
        url = "https://www.hindustantimes.com/cities/mumbai-news"
        response = requests.get(url, headers=HEADERS, timeout=10)
        
        if response.status_code == 200:
            soup = BeautifulSoup(response.content, 'html.parser')
            articles = soup.select('h3.hdg3 a, .cartHolder a')[:max_results]
            
            for article in articles:
                title = article.get_text(strip=True)
                link = article.get('href', '')
                if not link.startswith('http'):
                    link = f"https://www.hindustantimes.com{link}"
                
                if query.lower() in title.lower() or 'mumbai' in title.lower():
                    results.append({
                        'source': 'Hindustan Times',
                        'url': link,
                        'title': title,
                        'snippet': title,
                        'published_at': datetime.now().isoformat()
                    })
    except Exception as e:
        print(f"HT fetch error: {e}")
    
    return results

@app.get("/search")
async def search(q: str = Query(..., description="Search query for Mumbai news")):
    """Search for Mumbai news across multiple sources in real-time"""
    all_results = []
    
    # Fetch from multiple sources
    all_results.extend(fetch_google_news(q, max_results=10))
    all_results.extend(fetch_times_of_india(q, max_results=5))
    all_results.extend(fetch_hindustan_times(q, max_results=5))
    
    # Remove duplicates based on URL
    seen_urls = set()
    unique_results = []
    for r in all_results:
        if r['url'] not in seen_urls:
            seen_urls.add(r['url'])
            unique_results.append(r)
    
    # Sort by relevance (simple keyword matching)
    query_words = set(q.lower().split())
    def relevance_score(r):
        title_lower = r['title'].lower()
        return sum(1 for word in query_words if word in title_lower)
    
    unique_results.sort(key=relevance_score, reverse=True)
    
    print(f"[Scraper] Query: '{q}' -> Found {len(unique_results)} results")
    
    return {"results": unique_results[:15]}

@app.get("/health")
async def health():
    return {"status": "healthy", "service": "mumbai-news-scraper"}
