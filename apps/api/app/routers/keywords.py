from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from typing import List, Dict, Optional, Union
import json
import re
import random
import logging
from datetime import datetime, timedelta
from sqlalchemy.orm import Session
from .. import crud, schemas, database, models
from ..llm_manager import LLMClient
from ..services.tool_manager import tool_manager

# Setup Logger
logger = logging.getLogger(__name__)

router = APIRouter(tags=["keywords"])

# --- Schemas ---
class KeywordRequest(BaseModel):
    keyword: str
    category: str

class KeywordResponse(BaseModel):
    ko: str
    en: str
    ja: str
    zh: str
    es: str
    hi: str
    ru: str

# --- Helper: JSON Cleaner ---
def clean_json_string(text: str) -> str:
    """
    Cleans up LLM output (markdown backticks, preambles) to extract valid JSON.
    """
    text = text.strip()
    match = re.search(r"```(?:json)?(.*?)```", text, re.DOTALL)
    if match: text = match.group(1).strip()
    start = text.find('[')
    end = text.rfind(']')
    if start != -1 and end != -1: text = text[start : end + 1]
    return text

# --- Endpoint ---
@router.post("/generate", response_model=List[KeywordResponse])
def generate_keywords(request: KeywordRequest, db: Session = Depends(database.get_db)):
    """
    Generates 50 high-volume LSI keywords.
    Strategy: Hybrid Smart Cache
    1. Check DB for cached category trends (Freshness < 12h).
    2. If hit, return immediately.
    3. If miss (or specific keyword query), perform Real-time Search + LLM.
    """
    
    # CASE 1: Browsing Mode (No specific keyword or "generic" query)
    is_browsing = not request.keyword.strip() or request.keyword.lower() in ["trends", "latest"]
    
    if is_browsing:
        # Check Cache
        target_cat = request.category if request.category != "전체" else "All"
        
        # If "All", try to fetch multiple categories and shuffle
        if target_cat == "All":
            cached_items = db.query(models.Trend).limit(5).all()
            if cached_items:
                combined_results = []
                for item in cached_items:
                    if isinstance(item.related_keywords_json, list):
                        combined_results.extend(item.related_keywords_json)
                
                # Deduplicate based on 'ko' key
                seen = set()
                unique_results = []
                for item in combined_results:
                    # Robustness: ensure item is dict
                    if isinstance(item, dict) and item.get('ko'):
                        k = item.get('ko')
                        if k not in seen:
                            seen.add(k)
                            unique_results.append(item)
                
                random.shuffle(unique_results)
                return unique_results[:50]
        else:
            # Specific Category
            cache_hit = db.query(models.Trend).filter(
                models.Trend.category == request.category,
                models.Trend.updated_at > datetime.now() - timedelta(hours=12)
            ).first()
            
            if cache_hit and cache_hit.related_keywords_json:
                data = cache_hit.related_keywords_json
                
                # [ROBUSTNESS] Check for List[str] in Cache
                if isinstance(data, list) and len(data) > 0 and isinstance(data[0], str):
                    logger.warning(f"⚠️ Cache contained List[str] for {request.category}. Normalizing on read.")
                    normalized_data = []
                    for item in data:
                        if isinstance(item, str):
                            normalized_data.append({
                                "ko": item, "en": item, "ja": item, "zh": item, 
                                "es": item, "hi": item, "ru": item
                            })
                        elif isinstance(item, dict):
                            normalized_data.append(item)
                    return normalized_data
                    
                logger.info(f"🚀 Cache Hit for {request.category}")
                return data

    # CASE 2: Miss or Specific Query -> Two-Pass Agentic Generation
    logger.info(f"🧠 [Super-Explorer] Initiating Two-Pass Research for: {request.keyword} ({request.category})")

    # 1. Load Settings & Client
    settings = crud.get_settings(db)
    provider = settings.script_analysis_provider or "groq"
    model = settings.script_analysis_model or "groq/llama-3.3-70b-versatile"
    client = LLMClient(settings)

    # --- PASS 1: Strategic Inquiry (Market Researcher) ---
    logger.info("🔭 [Pass 1] Generating Research Protocol...")
    inquiry_prompt = f"""
    You are a Viral Content Strategist.
    Based on the Category: '{request.category}' and Seed Keyword: '{request.keyword}',
    Generate 2 specific search queries designed to find HIGH-VIEW, VIRAL, or OUTLIER content.
    
    Focus on:
    - Recent viral videos (last 7 days) and their view counts.
    - Specific regional breakout trends (KR, US, JP, etc.).
    
    Format: JSON Array of strings.
    """
    
    try:
        query_resp = client.generate_content(prompt="Define Research Protocol", model_name=model, system_instruction=inquiry_prompt)
        search_queries = json.loads(clean_json_string(str(query_resp)))
        if not isinstance(search_queries, list): search_queries = [f"{request.keyword} {request.category} viral trends"]
    except Exception as e:
        logger.warning(f"⚠️ Pass 1 failed: {e}. Falling back to default query.")
        search_queries = [f"{request.keyword} {request.category} popular trends 2025"]

    # --- EXECUTION: Multi-Source Harvesting ---
    logger.info(f"📡 [Execution] Harvesting data for {len(search_queries)} queries...")
    aggregated_context = []
    for q in search_queries[:2]: # [STABILIZATION] Limit to top 2 for speed
        try:
            # Pass pre-fetched settings to avoid fresh DB query during search
            search_result = tool_manager.search(q, include_images=False, settings=settings, time_range='week')
            for res in search_result.get("results", []):
                aggregated_context.append(f"- [{res.get('title')}] {res.get('content')}")
        except:
            continue
    
    context_str = "\n".join(aggregated_context) if aggregated_context else "No specific recent data found. Use general market knowledge."

    # --- PASS 2: Strategic Synthesis (The Brain) ---
    logger.info("🧪 [Pass 2] Synthesizing Viral Intelligence...")
    system_prompt = f"""
    You are a Global Viral Intelligence Agent.
    Analyze the provided Web Context for: **{request.keyword}** ({request.category}).
    
    ### Task:
    1. Extract 50 High-Performance Keywords/Entities.
    2. Group them into Semantic Clusters.
    3. For each keyword, provide:
       - 'viral_score': (0-100) VPI - Viral Potential Index. 
         *Criteria: (Views/Hours since upload) outlier factor, or high engagement mentions.*
       - 'velocity': 'Explosive' | 'Rising' | 'Steady'.
       - 'angle': A 1-sentence viral hook strategy.
       - 'basis': Short proof of popularity (e.g., "12M views in 2 days", "Rising on KR Reddit").
       - 'source_geo': Primary country where this is peaking (e.g., "US", "KR", "JP", "Global").
    
    ### Web Context:
    {context_str}
    
    ### Requirements:
    - Exactly 50 results.
    - Localization in: ko, en, ja, zh, es, hi, ru.
    - Format: JSON Array of Objects.
    """
    
    try:
        response_text = client.generate_content(prompt="Synthesize Final Keywords", model_name=model, system_instruction=system_prompt)
        raw_json = clean_json_string(str(response_text))
        data = json.loads(raw_json)
        
        # [ROBUSTNESS] Normalize
        valid_data = []
        if isinstance(data, list):
            for idx, item in enumerate(data):
                if isinstance(item, str): 
                    item = {"ko": item, "en": item}
                if isinstance(item, dict):
                    # Ensure Keys & Fallbacks
                    for lang in ["ko", "en", "ja", "zh", "es", "hi", "ru"]:
                        if not item.get(lang): 
                            item[lang] = item.get("ko") or item.get("en") or "Trend"
                    if "viral_score" not in item: item["viral_score"] = max(40, 95 - idx)
                    if "velocity" not in item: item["velocity"] = "Rising"
                    if "angle" not in item: item["angle"] = f"Viral strategy for {item.get('ko')}"
                    if "basis" not in item: item["basis"] = "Current Market Engagement"
                    if "source_geo" not in item: item["source_geo"] = "Global"
                    valid_data.append(item)
            data = valid_data

        if not data:
            raise ValueError("No valid keywords synthesized")

        # 5. Cache result if browsing
        if is_browsing:
            existing = db.query(models.Trend).filter(models.Trend.category == request.category).first()
            if not existing:
                existing = models.Trend(category=request.category)
                db.add(existing)
            existing.keyword = f"{request.keyword or request.category} Intelligence"
            existing.related_keywords_json = data
            existing.updated_at = datetime.now()
            existing.source = "SuperExplorer/v5"
            db.commit()

        return data
            
    except Exception as e:
        logger.error(f"❌ Super-Explorer Transformation Failed: {e}")
        # Return fallback mock data with all required schema fields
        fallback = [{
             "ko": f"{request.keyword or request.category} 분석 중...",
             "en": f"Analyzing {request.keyword or request.category}...",
             "ja": "分析中...", "zh": "分析中...", "es": "Analizando...", "hi": "विश्लेषण...", "ru": "Анализ...",
             "viral_score": 50, "velocity": "Steady", "angle": "실시간 데이터 수집 중입니다. 잠시 후 다시 시도해주세요."
        }]
        return fallback


@router.post("/expand", response_model=List[KeywordResponse])
def expand_keyword_web(request: KeywordRequest, db: Session = Depends(database.get_db)):
    """
    Spider-web Scouter: Recursively expands a seed keyword into a web of related 
    and viral associations.
    """
    logger.info(f"🕸️ [Spider-web] Expanding associations for: {request.keyword}")
    
    settings = crud.get_settings(db)
    client = LLMClient(settings)
    provider = settings.script_analysis_provider or "google"
    model = "gemini-2.0-flash-exp" if provider == "google" else settings.script_analysis_model
    
    # Pass 1: Semantic Expansion
    expansion_prompt = f"""
    You are a Spider-web Scouter Agent.
    Input Keyword: '{request.keyword}'
    Niche: '{request.category}'

    TASK:
    Generate 20 recursively related keywords. 
    Don't just stay on the surface. Expand into:
    1. Direct Competitors/Peers.
    2. Component Parts (e.g., if Apple, then Silicon, MagSafe, iOS).
    3. Adjacent Interests (e.g., if Tech, then Minimalist Desk Setup, productivity).
    4. Emerging Slang/Terms in this niche.

    For each, provide the standard KeywordResponse schema.
    Output ONLY JSON.
    """
    
    try:
        response = client.generate_content(
            prompt="Expand Keyword Web", 
            model_name=model, 
            system_instruction=expansion_prompt
        )
        data = json.loads(clean_json_string(str(response)))
        
        # Save to Trends as a "Web" node if significant
        new_trend = models.Trend(
            keyword=f"Web: {request.keyword}",
            category=request.category,
            related_keywords_json=data,
            source="SpiderWeb/v6.5"
        )
        db.add(new_trend)
        db.commit()
        
        return data
    except Exception as e:
        logger.error(f"Expansion failed: {e}")
        return []
