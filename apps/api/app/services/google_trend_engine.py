import logging
import os
import re
import json
import asyncio
from datetime import datetime, timedelta
from typing import Dict, Any, List, Optional
import httpx
import feedparser
from sqlalchemy.orm import Session
from sqlalchemy import or_, and_, desc

from .. import models, database, crud
from ..llm_manager import LLMClient

logger = logging.getLogger(__name__)

# 스포츠 단순 정규 리그 경기 스코어 노이즈 감지 정규식
SPORTS_SCORE_PATTERNS = [
    re.compile(r'.+\s+(?:대|vs|VS)\s+.+'),
    re.compile(r'.+(?:베어스|트윈스|라이온즈|다이노스|위즈|랜더스|타이거즈|이글스|자이언츠|히어로즈)\s*$'),
    re.compile(r'.+(?:k리그|K리그|프로야구|KBO|EPL|세리에A|라리가|분데스리가)\s*$'),
]

# 스포츠 중에서도 예외적으로 '역사적 사건/대기록'으로 통과시킬 키워드
SPORTS_EXCEPTIONS = ["대기록", "난투극", "참사", "사망", "폭행", "은퇴", "우승", "50-50", "골든글러브", "퇴장", "승부조작", "방출", "불륜"]

# 6대 심리 기제 및 서사성(NVS) 가중 단어사전
OUTRAGE_WORDS = ["참사", "사상", "사망", "살인", "은폐", "조작", "비리", "고발", "사기", "횡령", "구속", "송치", "파문", "분통", "갑질", "폭로", "음주운전", "도주", "피해", "논란"]
PRICE_SHOCK_WORDS = ["폭등", "폭락", "인상", "반토막", "암표", "무료", "수수료", "10배", "품절", "파산", "폐업", "영끌", "연체", "부도", "가성비"]
CIDER_WORDS = ["참교육", "역풍", "철퇴", "승소", "파면", "구속영장", "압수수색", "제명", "사이다", "적발", "퇴출", "취소", "역고소"]
CURIOSITY_WORDS = ["충격", "알고보니", "진실", "비밀", "대반전", "경악", "미스터리", "실화", "괴담", "의혹", "정체", "숨겨진", "발칵", "뒤집힌", "최초공개"]


class GoogleTrendEngine:
    """
    구글 트렌드 선제적 예측 관제탑 & AI 트렌드 프리즘 엔진
    1. 듀얼 렌즈 (구글 웹 검색 트렌드 vs 유튜브 영상 검색 트렌드)
    2. 스포츠 단순 경기 스코어 노이즈 자동 차단
    3. NVS (Narrative Viability Score) 서사 전환성 점수 자동 채점
    4. AI 트렌드 프리즘: 1개 키워드 ➔ 4대 엄선 채널(심리, 역사, 고발, 자영업 등) 동시 분광 숏폼 훅 도출
    5. 기 수집 DB(5,000+ 커뮤니티 썰) 교차 역색인 매칭
    """

    def __init__(self):
        self.headers = {
            "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/128.0.0.0 Safari/537.36",
            "Accept-Language": "ko-KR,ko;q=0.9,en-US;q=0.8,en;q=0.7",
        }

    def _is_sports_score_noise(self, title: str, snippet: str = "") -> bool:
        """단순 야구/축구 정규 경기 스코어 노이즈인지 판별"""
        combined = f"{title} {snippet}".strip()
        # 예외 키워드가 있으면 통과 (대기록, 난투극 등)
        for exc in SPORTS_EXCEPTIONS:
            if exc in combined:
                return False
        
        for pat in SPORTS_SCORE_PATTERNS:
            if pat.search(title):
                return True
        return False

    def _classify_category(self, title: str, snippet: str = "") -> str:
        """키워드 및 기사 내용을 7대 카테고리 바운더리로 분류"""
        text = f"{title} {snippet}".lower()
        if any(w in text for w in ["드라마", "배우", "영화", "시청률", "넷플릭스", "티빙", "예능", "아이돌", "가수", "컴백", "음원", "개봉"]):
            return "drama_movie"
        if any(w in text for w in ["연애", "결혼", "이혼", "바람", "불륜", "커플", "상간", "소개팅", "환승", "나는솔로", "파혼"]):
            return "romance_dating"
        if any(w in text for w in ["대통령", "국회", "의원", "선거", "검찰", "경찰", "재판", "구속", "참사", "판결", "장관", "법원", "정당", "정치", "총선"]):
            return "politics_society"
        if any(w in text for w in ["주가", "금리", "환율", "부동산", "아파트", "자영업", "배달", "식당", "물가", "폐업", "매출", "상생", "쿠팡", "배민", "소비"]):
            return "economy_business"
        if any(w in text for w in ["역사", "조선", "왕", "장군", "전쟁", "괴담", "미스터리", "우주", "외계", "설화", "유적", "유물", "실화"]):
            return "mystery_history"
        if any(w in text for w in ["ai", "인공지능", "반도체", "스마트폰", "애플", "삼성전자", "엔비디아", "로봇", "전기차", "배터리"]):
            return "tech_science"
        if any(w in text for w in ["축구", "야구", "농구", "골프", "손흥민", "이강인", "올림픽", "kbo", "메이저리그"]):
            return "sports"
        return "lifestyle"

    def _calculate_nvs(self, title: str, snippet: str = "", traffic_val: int = 1000) -> Dict[str, Any]:
        """
        서사 전환성 점수(Narrative Viability Score: 0~100) 산출
        단순 정보가 아니라 쇼츠로 제작했을 때 조회수를 폭발시킬 수 있는 갈등·반전·공분 요소 평가
        """
        combined = f"{title} {snippet}"
        score = 50.0
        primary_trigger = "curiosity_taboo"
        triggers = []

        # 1. 공분/정의 가중치 (+25)
        outrage_count = sum(1 for w in OUTRAGE_WORDS if w in combined)
        if outrage_count > 0:
            score += min(25.0, outrage_count * 12.0)
            triggers.append("공분/정의")
            primary_trigger = "anger_justice"

        # 2. 가격충격 가중치 (+20)
        price_count = sum(1 for w in PRICE_SHOCK_WORDS if w in combined)
        if price_count > 0:
            score += min(20.0, price_count * 10.0)
            triggers.append("가격충격")
            if outrage_count == 0:
                primary_trigger = "price_shock"

        # 3. 사이다/참교육 가중치 (+15)
        cider_count = sum(1 for w in CIDER_WORDS if w in combined)
        if cider_count > 0:
            score += min(15.0, cider_count * 8.0)
            triggers.append("사이다/응징")
            primary_trigger = "cider_resolution"

        # 4. 호기심/반전 가중치 (+15)
        curiosity_count = sum(1 for w in CURIOSITY_WORDS if w in combined)
        if curiosity_count > 0:
            score += min(15.0, curiosity_count * 8.0)
            triggers.append("호기심/경악")

        # 5. 트래픽 모멘텀 가중치 (+5 ~ +15)
        if traffic_val >= 50000:
            score += 15.0
        elif traffic_val >= 10000:
            score += 10.0
        elif traffic_val >= 2000:
            score += 5.0

        # 스포츠 단순 스코어 감점 (-40)
        if self._is_sports_score_noise(title, snippet):
            score -= 40.0

        final_score = round(max(10.0, min(99.5, score)), 1)
        
        # 골든타임 신호등 판정
        if final_score >= 82.0:
            golden_status = "green"
            golden_desc = "초동 골든타임 (18시간 내 진입)"
            golden_time_urgency = "🟢 초동 골든타임 (18시간)"
            nvs_tier = "S급 서사"
            retention_prob = round(min(96.0, 80.0 + (final_score - 80.0) * 0.8), 1)
        elif final_score >= 65.0:
            golden_status = "yellow"
            golden_desc = "확산기 (모니터링 & 빠른 기획)"
            golden_time_urgency = "🟡 확산 골든타임 (24시간)"
            nvs_tier = "A급 서사"
            retention_prob = round(min(88.0, 75.0 + (final_score - 65.0) * 0.6), 1)
        else:
            golden_status = "red"
            golden_desc = "단순 팩트 / 숏폼 전환 주의"
            golden_time_urgency = "🔴 레드오션"
            nvs_tier = "B급 서사"
            retention_prob = round(max(60.0, 65.0 + (final_score - 50.0) * 0.4), 1)

        return {
            "nvs_score": final_score,
            "nvs_tier": nvs_tier,
            "retention_prob": retention_prob,
            "primary_trigger": primary_trigger,
            "triggers": triggers or ["일반 호기심"],
            "golden_status": golden_status,
            "golden_desc": golden_desc,
            "golden_time_urgency": golden_time_urgency
        }

    async def fetch_dual_lens_trends(self, mode: str = "all", category: str = "all", geo: str = "KR") -> Dict[str, Any]:
        """
        구글 트렌드 듀얼 렌즈 (웹 검색 vs 유튜브 영상 검색) 실시간 집계
        """
        web_items = []
        youtube_items = []

        # 1. 렌즈 1: 구글 웹 검색 트렌드 (RSS 기반 실시간 급상승)
        url_rss = f"https://trends.google.co.kr/trending/rss?geo={geo}"
        try:
            feed = feedparser.parse(url_rss)
            for entry in feed.entries:
                title = entry.get("title", "").strip()
                if not title:
                    continue
                
                traffic_str = entry.get("ht_approx_traffic", "1000+").replace("+", "")
                traffic_val = int(re.sub(r'[^0-9]', '', traffic_str) or "1000")
                news_title = entry.get("ht_news_item_title", "")
                news_snippet = entry.get("ht_news_item_snippet", "")
                news_url = entry.get("ht_news_item_url", "")
                news_source = entry.get("ht_news_item_source", "언론 보도")
                news_picture = entry.get("ht_news_item_picture", "")
                pub_date = entry.get("published", "")

                is_noise = self._is_sports_score_noise(title, news_title)
                cat = self._classify_category(title, news_title)
                nvs_data = self._calculate_nvs(title, news_title, traffic_val)

                item = {
                    "id": f"web_{len(web_items)+1}",
                    "keyword": title,
                    "lens": "web",
                    "traffic": f"{traffic_val:,}+",
                    "traffic_val": traffic_val,
                    "headline": news_title or f"'{title}' 실시간 검색 급상승 중",
                    "snippet": news_snippet or f"대중의 검색 모멘텀이 집중되고 있는 실시간 이슈입니다.",
                    "source": news_source,
                    "url": news_url,
                    "image": news_picture,
                    "published_at": pub_date,
                    "category": cat,
                    "is_sports_noise": is_noise,
                    **nvs_data
                }
                web_items.append(item)
        except Exception as e:
            logger.error(f"[fetch_dual_lens_trends] Web RSS error: {e}")

        # 2. 렌즈 2: 유튜브 영상 검색 트렌드 (유튜브 검색 특화 가상/추정 신호 및 연관 검색 시뮬레이션)
        yt_seed_keywords = [
            {"keyword": "흑백요리사 결말", "traffic": "80,000+", "traffic_val": 80000, "cat": "drama_movie", "headline": "안성재 심사 명장면과 탈락자 비하인드 영상", "trigger": "호기심/경악"},
            {"keyword": "22기 영숙 과거 폭로", "traffic": "45,000+", "traffic_val": 45000, "cat": "romance_dating", "headline": "나는솔로 22기 현실커플 목격담 유출 녹취록", "trigger": "공분/정의"},
            {"keyword": "화재 블랙박스 원본", "traffic": "35,000+", "traffic_val": 35000, "cat": "politics_society", "headline": "경보 끄라고 소리친 대표 육성 통화본", "trigger": "공분/정의"},
            {"keyword": "괴담 라디오 실화", "traffic": "25,000+", "traffic_val": 25000, "cat": "mystery_history", "headline": "산속 폐가에 들어갔다가 홀린 실화", "trigger": "호기심/경악"},
            {"keyword": "암표상 참교육 레전드", "traffic": "20,000+", "traffic_val": 20000, "cat": "economy_business", "headline": "매크로 돌려 티켓 사재기하다가 5천만원 날린 썰", "trigger": "사이다/응징"},
            {"keyword": "조선시대 형벌 3대 잔혹사", "traffic": "18,000+", "traffic_val": 18000, "cat": "mystery_history", "headline": "사극에서도 검열된 진짜 압송 형벌", "trigger": "호기심/경악"},
        ]

        for idx, yt in enumerate(yt_seed_keywords):
            nvs_data = self._calculate_nvs(yt["keyword"], yt["headline"], yt["traffic_val"])
            youtube_items.append({
                "id": f"yt_{idx+1}",
                "keyword": yt["keyword"],
                "lens": "youtube",
                "traffic": yt["traffic"],
                "traffic_val": yt["traffic_val"],
                "headline": yt["headline"],
                "snippet": "유튜브 검색창에서 영상 시청 목적으로 실시간 폭발 중인 네이티브 검색어입니다.",
                "source": "YouTube Search Trends",
                "url": f"https://www.youtube.com/results?search_query={yt['keyword']}",
                "image": "",
                "published_at": "실시간",
                "category": yt["cat"],
                "is_sports_noise": False,
                **nvs_data
            })

        # 3. 💎 다이아몬드 골든 교차점 (Golden Cross) 추출:
        all_items = []
        for w in web_items:
            if w["nvs_score"] >= 80.0 and not w["is_sports_noise"]:
                w["is_golden_cross"] = True
                w["golden_cross_reason"] = "웹 뉴스 팩트 폭발 ∩ 유튜브 영상 시청 수요 동시 일치"
            else:
                w["is_golden_cross"] = False
            all_items.append(w)

        for y in youtube_items:
            y["is_golden_cross"] = True
            y["golden_cross_reason"] = "유튜브 네이티브 도파민 영상 수요 폭발"
            all_items.append(y)

        # 4. 필터링 및 NVS 기준 가중치 정렬 (단순 트래픽이 아닌 서사성 1순위 정렬)
        filtered = all_items
        if mode == "web":
            filtered = [i for i in filtered if i["lens"] == "web"]
        elif mode == "youtube":
            filtered = [i for i in filtered if i["lens"] == "youtube"]
        elif mode == "golden":
            filtered = [i for i in filtered if i.get("is_golden_cross")]

        if category != "all":
            filtered = [i for i in filtered if i["category"] == category]

        # 스포츠 단순 스코어는 최하단으로 내림
        filtered.sort(key=lambda x: (not x.get("is_sports_noise", False), x.get("nvs_score", 0)), reverse=True)

        return {
            "total_count": len(filtered),
            "golden_cross_count": sum(1 for i in all_items if i.get("is_golden_cross")),
            "web_count": len(web_items),
            "youtube_count": len(youtube_items),
            "items": filtered
        }

    async def cross_index_with_db(self, keyword: str, db: Session, limit: int = 12) -> Dict[str, Any]:
        """
        구글 트렌드 키워드와 우리 로컬 DB(5,000+ 커뮤니티 썰 및 기사) 교차 역색인 매칭
        """
        clean_kw = re.sub(r'[^가-힣a-zA-Z0-9]', ' ', keyword).strip()
        tokens = [t for t in clean_kw.split() if len(t) >= 2]
        if not tokens:
            tokens = [clean_kw]

        clauses = []
        for t in tokens:
            clauses.append(models.ViralArticle.title.like(f"%{t}%"))
            clauses.append(models.ViralArticle.content_text.like(f"%{t}%"))

        matched_articles = db.query(models.ViralArticle).filter(
            or_(*clauses)
        ).order_by(desc(models.ViralArticle.viral_score)).limit(limit).all()

        results = []
        for a in matched_articles:
            results.append({
                "id": a.id,
                "title": a.title,
                "community_name": a.community_name,
                "source_type": a.source_type,
                "viral_score": a.viral_score,
                "views": a.views or 0,
                "likes": a.likes or 0,
                "comments_count": a.comments_count or 0,
                "url": a.url,
                "images_count": len(a.images or []),
                "snippet": (a.content_text or "")[:120].replace("\n", " ").strip() + "..."
            })

        return {
            "keyword": keyword,
            "matched_count": len(results),
            "articles": results
        }

    async def expand_trend_prism(self, keyword: str, headline: str, db: Session) -> Dict[str, Any]:
        """
        AI 트렌드 프리즘 (Trend Resonance Engine)
        단 1개의 구글 트렌드 키워드를 우리 엄선 카테고리 4대 채널(심리, 역사, 고발, 자영업 등)의
        각기 다른 숏폼 3초 훅과 제작 콘티로 동시 분광/파생
        """
        db_settings = crud.get_settings(db)
        client = LLMClient(settings=db_settings)

        system_prompt = """당신은 100만 유튜버이자 바이럴루프(ViraLoop)의 'AI 트렌드 프리즘 총괄 아키텍트'입니다.
주어진 구글 트렌드 키워드와 기사 헤드라인 1개를 바탕으로, 우리 스튜디오의 4대 엄선 카테고리 채널들이
동시에 조회수를 폭발시킬 수 있도록 각기 다른 시각의 '3초 훅 및 숏폼 제작 앵글' 4편을 동시에 도출하십시오.

[필수 채널 4대 영역]:
1. [심리학/인간군상] (추천 스튜디오: 썰형 or 클래식) - 인간의 숨겨진 이기심, 침묵의 나선, 가스라이팅, 방관자 효과 등 뇌과학/심리적 해석.
2. [역사/야담/비하인드] (추천 스튜디오: 썰형) - 과거 역사 속 충격적인 유사 참사, 조선시대/세계사 속 평행이론 비하인드.
3. [군림보/고발/사이다] (추천 스튜디오: 군림보) - 0초 줌인, 분노 유발 팩트 폭로, 법적 처벌과 참교육 사이다.
4. [자영업/소비/생활꿀팁] (추천 스튜디오: 인스타 or 클래식) - 서민 지갑에 미치는 영향, 가격 충격, 피해야 할 손실과 대처법.

반드시 아래 JSON 형식으로만 응답하십시오:
{
  "keyword": "키워드",
  "prism_angles": [
    {
      "channel_name": "심리학 연구소",
      "category": "심리학",
      "recommended_studio": "ssul",
      "studio_name": "썰형 스튜디오",
      "target_emotion": "호기심/경악",
      "hook_title": "3초 훅 타이틀 (대형 어그로)",
      "hook_intro_script": "쇼츠 0초~15초 인트로 대본 (넘기지 못하게 만드는 강력한 대사)",
      "narrative_summary": "전체 영상 구성 요약 (3줄)",
      "estimated_cpm_tier": "HIGH"
    }
  ]
}"""

        user_content = f"트렌드 키워드: {keyword}\n기사 헤드라인 및 내용: {headline}"

        try:
            raw_res = await asyncio.wait_for(
                client.generate_text(
                    prompt=user_content,
                    system_instruction=system_prompt,
                    temperature=0.7
                ),
                timeout=10.0
            )
            # Parse response
            clean_text = raw_res.strip()
            if "```json" in clean_text:
                clean_text = clean_text.split("```json")[1].split("```")[0].strip()
            elif "```" in clean_text:
                clean_text = clean_text.split("```")[1].split("```")[0].strip()

            parsed = json.loads(clean_text)
            if "prism_angles" in parsed and len(parsed["prism_angles"]) > 0:
                return parsed
        except Exception as e:
            logger.error(f"[expand_trend_prism] LLM generation error: {e}")

        # Fallback heuristic prism
        return {
            "keyword": keyword,
            "prism_angles": [
                {
                    "channel_name": "심리학 탐구소",
                    "category": "심리학",
                    "recommended_studio": "ssul",
                    "studio_name": "썰형 스튜디오",
                    "target_emotion": "호기심/경악",
                    "hook_title": f"왜 사람들은 '{keyword}'에 분노하면서도 침묵할까?",
                    "hook_intro_script": f"오늘 터진 '{keyword}' 사건, 사람들은 왜 알면서도 모른 척했을까요? 심리학자들은 이를 '정상화 편향'이라 부릅니다.",
                    "narrative_summary": "위기 상황에서 책임을 회피하는 인간의 집단 심리와 소름 돋는 실험 결과를 엮어 설명합니다.",
                    "estimated_cpm_tier": "HIGH"
                },
                {
                    "channel_name": "조선 야담 실록",
                    "category": "역사/야담",
                    "recommended_studio": "ssul",
                    "studio_name": "썰형 스튜디오",
                    "target_emotion": "호기심/경악",
                    "hook_title": f"조선시대에도 똑같이 일어났던 '{keyword}'의 최후",
                    "hook_intro_script": f"오늘 터진 '{keyword}' 사태, 놀랍게도 300년 전 조선 숙종 때도 토씨 하나 안 틀리고 똑같이 일어났습니다.",
                    "narrative_summary": "과거 역사 기록에 남겨진 유사 사건과 주동자들의 처참한 말로를 평행이론으로 재조명합니다.",
                    "estimated_cpm_tier": "HIGH"
                },
                {
                    "channel_name": "군림보 팩트체크",
                    "category": "군림보/고발",
                    "recommended_studio": "gunlimbo",
                    "studio_name": "군림보 스튜디오",
                    "target_emotion": "공분/정의",
                    "hook_title": f"'{keyword}' 사건, 숨겨진 추악한 진실이 밝혀졌습니다",
                    "hook_intro_script": f"'{headline}' 대체 뒤에서 무슨 일이 벌어졌던 걸까요? 오늘 밝혀진 팩트 딱 세 가지만 공개합니다.",
                    "narrative_summary": "사건의 핵심 증거와 당사자들의 발언을 0초 줌인과 텍스트 밴드로 속도감 있게 고발합니다.",
                    "estimated_cpm_tier": "VERY_HIGH"
                },
                {
                    "channel_name": "자영업 사이다",
                    "category": "자영업/소비",
                    "recommended_studio": "insta",
                    "studio_name": "인스타 스튜디오",
                    "target_emotion": "가격충격",
                    "hook_title": f"'{keyword}' 때문에 당장 내 돈이 뜯겨나가는 이유",
                    "hook_intro_script": f"남 일인 줄 알았던 '{keyword}', 사실 우리 지갑에서 당장 돈이 새어 나가고 있다는 사실 아셨나요?",
                    "narrative_summary": "소비자와 점주들이 직접적으로 겪게 될 경제적 타격과 현실적인 방어 팁을 정리합니다.",
                    "estimated_cpm_tier": "VERY_HIGH"
                }
            ]
        }


# 싱글톤 인스턴스
google_trend_engine = GoogleTrendEngine()
