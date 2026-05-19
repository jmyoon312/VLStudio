import requests
from bs4 import BeautifulSoup
import logging
import json
from typing import Dict, Any, List

logger = logging.getLogger(__name__)

class ScraperEngine:
    def __init__(self):
        self.headers = {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
        }

    def scrape_url(self, url: str, preset: str = "auto") -> Dict[str, Any]:
        """
        Scrapes a URL and returns structured data.
        Preset: 'reddit', 'news', 'auto'.
        """
        try:
            logger.info(f"Scraping URL: {url} (Preset: {preset})")
            response = requests.get(url, headers=self.headers, timeout=10, proxies={'http': 'socks5://127.0.0.1:10800', 'https': 'socks5://127.0.0.1:10800'})
            response.raise_for_status()
            
            if preset == "reddit" or "reddit.com" in url:
                return self._scrape_reddit(response.text, url)
            else:
                return self._scrape_general(response.text, url)
                
        except Exception as e:
            logger.error(f"Scraping failed: {e}")
            return {"error": str(e), "title": "Scraping Failed", "body": ""}

    def _scrape_reddit(self, html: str, url: str) -> Dict[str, Any]:
        """
        Extracts Reddit thread content. 
        Note: Direct HTML scraping of Reddit is flaky. detailed JSON api is better but requires auth.
        We will try a best-effort HTML parse or use the .json trick if url doesn't have it.
        """
        # Trick: Append .json to reddit url get structured data
        if not url.endswith('.json'):
            try:
                json_url = url.rstrip('/') + '.json'
                resp = requests.get(json_url, headers=self.headers, timeout=10, proxies={'http': 'socks5://127.0.0.1:10800', 'https': 'socks5://127.0.0.1:10800'})
                if resp.status_code == 200:
                    return self._parse_reddit_json(resp.json())
            except Exception as e:
                logger.warning(f"Reddit JSON API failed, falling back to HTML: {e}")

        soup = BeautifulSoup(html, 'html.parser')
        title = soup.find('h1').get_text().strip() if soup.find('h1') else "No Title"
        
        # This is highly dependent on Reddit's changing class names.
        # Fallback to general if specialized fails.
        return {
            "source": "reddit",
            "title": title,
            "body": "Content extraction limited without API.",
            "comments": [],
            "images": []
        }

    def _parse_reddit_json(self, data: List) -> Dict[str, Any]:
        post = data[0]['data']['children'][0]['data']
        title = post.get('title', '')
        body = post.get('selftext', '')
        
        comments = []
        if len(data) > 1:
            comment_children = data[1]['data']['children']
            for c in comment_children[:5]: # Top 5
                if 'body' in c['data']:
                    comments.append(c['data']['body'])
                    
        images = []
        if 'url_overridden_by_dest' in post:
            url = post['url_overridden_by_dest']
            if url.endswith(('.jpg', '.png', '.gif')):
                images.append(url)
                
        return {
            "source": "reddit",
            "title": title,
            "body": body,
            "comments": comments,
            "images": images
        }

    def _scrape_general(self, html: str, url: str) -> Dict[str, Any]:
        soup = BeautifulSoup(html, 'html.parser')
        
        # Title
        title = "No Title"
        if soup.find('h1'):
            title = soup.find('h1').get_text().strip()
        elif soup.find('title'):
            title = soup.find('title').get_text().strip()
            
        # Body (Paragraphs)
        paragraphs = soup.find_all('p')
        body_text = "\n".join([p.get_text().strip() for p in paragraphs if len(p.get_text().strip()) > 30])
        
        # Images (OG Image or first large img)
        images = []
        og_image = soup.find('meta', property='og:image')
        if og_image and og_image.get('content'):
            images.append(og_image.get('content'))
            
        return {
            "source": "general",
            "title": title,
            "body": body_text[:2000], # Limit length
            "comments": [],
            "images": images
        }
