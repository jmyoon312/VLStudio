"""
Autonomous Viral Metadata Dispatcher Service
Platforms: YouTube Shorts, TikTok, Instagram Reels

Features:
- Zero cross-platform tag pollution (strips #shorts from TikTok, #fyp from YouTube, etc.)
- Platform-specific viral tag injection (#fyp, #foryou, #reels, #reelsinstagram)
- Niche keyword detection and contextual hashtag expansion
- Visual safe-zone caption trimming (keeps TikTok/Reels captions within 2-3 lines)
- Full preview support for UI
"""

import re
import logging
from typing import List, Dict, Any, Optional

logger = logging.getLogger("ViralMetadataDispatcher")

# 플랫폼별 상호 배제(제거) 금기 태그 목록
CROSS_PLATFORM_TABOO_TAGS = {
    "tiktok": {
        "shorts", "쇼츠", "youtube", "유튜브", "youtubeshorts", "유튜브쇼츠",
        "sub", "subscribe", "구독", "좋아요댓글구독", "채널"
    },
    "instagram": {
        "shorts", "쇼츠", "youtube", "유튜브", "youtubeshorts", "유튜브쇼츠",
        "sub", "subscribe", "구독"
    },
    "youtube": {
        "fyp", "foryou", "foryoupage", "틱톡", "틱톡순삭", "tiktok", "reels", "릴스"
    }
}

# 틱톡 최강 범용 바이럴 훅 태그
TIKTOK_UNIVERSAL_VIRAL_TAGS = ["#fyp", "#foryou", "#틱톡순삭", "#viral"]

# 인스타그램 릴스 최강 범용 바이럴 태그
INSTAGRAM_UNIVERSAL_VIRAL_TAGS = ["#reels", "#reelsinstagram", "#viralreels"]

# 니치 키워드별 플랫폼 최적화 매핑 사전
NICHE_DICTIONARY = {
    "animal": {
        "keywords": ["고양이", "cat", "강아지", "dog", "반려견", "반려묘", "애완동물", "pet", "puppy", "kitten", "동물", "animal"],
        "tiktok": ["#catsoftiktok", "#dogsoftiktok", "#petsoftiktok", "#반려동물", "#댕댕이", "#냥이"],
        "instagram": ["#냥스타그램", "#댕스타그램", "#멍스타그램", "#반려묘일상", "#반려견일상", "#펫스타그램"],
        "youtube": ["#반려동물", "#고양이", "#강아지", "#cuteanimals"]
    },
    "humor": {
        "keywords": ["유머", "funny", "웃긴", "개그", "lol", "meme", "밈", "웃김", "폭소", "병맛", "재미있는", "코미디"],
        "tiktok": ["#유머스타그램", "#웃긴영상", "#밈스타그램", "#개그", "#comedy"],
        "instagram": ["#유머", "#웃긴영상", "#오늘의유머", "#짤방", "#공감", "#웃긴짤"],
        "youtube": ["#유머", "#funny", "#웃긴영상", "#memes"]
    },
    "food": {
        "keywords": ["먹방", "요리", "food", "cook", "mukbang", "맛집", "레시피", "맛있는", "recipe", "디저트", "베이킹"],
        "tiktok": ["#foodtiktok", "#먹방틱톡", "#틱톡푸드", "#간단요리", "#맛집추천"],
        "instagram": ["#먹스타그램", "#맛스타그램", "#요리스타그램", "#맛집탐방", "#홈쿡", "#디저트그램"],
        "youtube": ["#먹방", "#요리", "#food", "#mukbang"]
    },
    "knowledge": {
        "keywords": ["상식", "지식", "꿀팁", "팁", "정보", "fact", "역사", "과학", "경제", "이슈", "비하인드"],
        "tiktok": ["#틱톡교실", "#꿀팁공유", "#지식한입", "#알고있나요", "#1분지식"],
        "instagram": ["#꿀팁", "#정보공유", "#지식", "#상식", "#인생꿀팁"],
        "youtube": ["#지식", "#상식", "#꿀팁", "#정보"]
    }
}


class ViralMetadataDispatcher:
    """
    단일 소스 메타데이터를 플랫폼별 바이럴 특화 포맷으로 100% 자동 변환하는 오케스트레이터.
    """

    def clean_tag(self, tag: str) -> str:
        """해시태그 문자열 정제"""
        t = tag.strip().replace("#", "").replace(",", "").replace(" ", "")
        return t

    def sanitize_tags(self, tags: List[str], platform: str) -> List[str]:
        """타 플랫폼 오염 태그 제거 및 유효 태그 추출"""
        taboo = CROSS_PLATFORM_TABOO_TAGS.get(platform.lower(), set())
        cleaned = []
        seen = set()

        for raw in tags:
            t = self.clean_tag(raw)
            if not t or len(t) < 2:
                continue
            lower_t = t.lower()
            if lower_t in taboo:
                continue
            if lower_t not in seen:
                seen.add(lower_t)
                cleaned.append(f"#{t}")

        return cleaned

    def detect_niche(self, text_corpus: str) -> List[str]:
        """텍스트에서 니치 카테고리 감지"""
        lower = text_corpus.lower()
        matched_niches = []
        for niche_name, conf in NICHE_DICTIONARY.items():
            for kw in conf["keywords"]:
                if kw in lower:
                    matched_niches.append(niche_name)
                    break
        return matched_niches or ["general"]

    def generate_tiktok_metadata(
        self,
        title: str,
        description: str,
        base_tags: Optional[List[str]] = None,
        custom_caption: Optional[str] = None,
        allow_comments: bool = True,
        allow_duet: bool = True
    ) -> Dict[str, Any]:
        """
        [TikTok 특화 자동 변환]
        1. 2줄 이내 훅 캡션 슬림화
        2. #shorts 등 유튜브 태그 0% 제거
        3. #fyp, #foryou, #틱톡순삭 + 니치 태그 결합
        4. 골든 룰: 최대 4~5개 해시태그 엄선 캡핑
        """
        # 1. 사용자가 직접 틱톡 탭에 적어둔 커스텀 캡션이 있다면 최우선 적용
        if custom_caption and custom_caption.strip():
            user_caption = custom_caption.strip()
            # 커스텀 캡션에서도 유튜브 오염 태그는 안전하게 제거
            tags = re.findall(r'#\w+', user_caption)
            sanitized_tags = self.sanitize_tags(tags, "tiktok")
            return {
                "caption": user_caption,
                "hashtags": sanitized_tags,
                "full_text": user_caption,
                "is_custom": True
            }

        # 2. 본문 훅 텍스트 생성 (자막 오버레이 가림 방지: 최대 100자)
        raw_text = (description or title or "").strip()
        first_line = raw_text.split('\n')[0].strip()
        # 해시태그 제거 및 타사 오염 태그 제거
        clean_first_line = re.sub(r'#[A-Za-z0-9가-힣_]+', '', first_line).strip()
        hook_caption = clean_first_line if clean_first_line else title.strip()
        # 금기 태그 본문 제거
        for taboo in CROSS_PLATFORM_TABOO_TAGS["tiktok"]:
            hook_caption = re.sub(rf'#{re.escape(taboo)}(?![A-Za-z0-9가-힣_])', '', hook_caption, flags=re.IGNORECASE)
        hook_caption = re.sub(r'\s+', ' ', hook_caption).strip()
        if len(hook_caption) > 100:
            hook_caption = hook_caption[:97] + "..."

        # 3. 해시태그 정제 및 니치 바이럴 태그 주입
        sanitized_base = self.sanitize_tags(base_tags or [], "tiktok")
        corpus = f"{title} {description} {' '.join(sanitized_base)}"
        niches = self.detect_niche(corpus)

        niche_tags = []
        for n in niches:
            if n in NICHE_DICTIONARY:
                niche_tags.extend(NICHE_DICTIONARY[n]["tiktok"][:2])

        # 틱톡 최적 조합: [범용 바이럴 2개] + [니치 태그 1~2개] + [사용자 원본 태그 1개]
        final_tags_set = []
        seen = set()

        def add_tag(t):
            normalized = t.lower()
            if normalized not in seen and len(final_tags_set) < 5:
                seen.add(normalized)
                final_tags_set.append(t if t.startswith("#") else f"#{t}")

        # 필수 바이럴 태그
        add_tag("#fyp")
        add_tag("#틱톡순삭")
        # 니치 태그
        for nt in niche_tags:
            add_tag(nt)
        # 원본 사용자 태그
        for st in sanitized_base:
            add_tag(st)
        add_tag("#foryou")

        # 4. 최종 결합 (2~3줄 이내 완성)
        tags_line = " ".join(final_tags_set[:5])
        full_text = f"{hook_caption}\n\n{tags_line}" if hook_caption else tags_line

        return {
            "caption": hook_caption,
            "hashtags": final_tags_set[:5],
            "full_text": full_text,
            "is_custom": False
        }

    def generate_instagram_metadata(
        self,
        title: str,
        description: str,
        base_tags: Optional[List[str]] = None,
        custom_caption: Optional[str] = None,
        share_to_feed: bool = False
    ) -> Dict[str, Any]:
        """
        [Instagram Reels 특화 자동 변환]
        1. 감성/공감형 본문 서식 및 여백 줄바꿈
        2. #reels, #reelsinstagram + 인스타 커뮤니티 태그(#냥스타그램 등) 주입
        3. #shorts 태그 0% 제거
        4. 최적 5~7개 태그 캡핑
        """
        if custom_caption and custom_caption.strip():
            user_caption = custom_caption.strip()
            tags = re.findall(r'#\w+', user_caption)
            sanitized_tags = self.sanitize_tags(tags, "instagram")
            return {
                "caption": user_caption,
                "hashtags": sanitized_tags,
                "full_text": user_caption,
                "is_custom": True
            }

        # 1. 본문 서식 정돈: 후행 해시태그 및 타사 오염 태그 제거
        raw_text = (description or title or "").strip()
        lines = [line.strip() for line in raw_text.split('\n') if line.strip()]
        body_lines = []
        for l in lines:
            if all(token.startswith('#') for token in l.split()):
                continue
            # 줄 끝에 연이어 붙은 해시태그 제거
            clean_l = re.sub(r'(?:\s*#[A-Za-z0-9가-힣_]+)+$', '', l).rstrip()
            if clean_l:
                body_lines.append(clean_l)
        body_text = "\n".join(body_lines) if body_lines else title.strip()
        # 금기 태그(#shorts 등) 본문에서 제거
        for taboo in CROSS_PLATFORM_TABOO_TAGS["instagram"]:
            body_text = re.sub(rf'#{re.escape(taboo)}(?![A-Za-z0-9가-힣_])', '', body_text, flags=re.IGNORECASE)
        body_text = re.sub(r'[ \t]+', ' ', body_text).strip()

        # 2. 태그 정제 및 니치 매핑
        sanitized_base = self.sanitize_tags(base_tags or [], "instagram")
        corpus = f"{title} {description} {' '.join(sanitized_base)}"
        niches = self.detect_niche(corpus)

        niche_tags = []
        for n in niches:
            if n in NICHE_DICTIONARY:
                niche_tags.extend(NICHE_DICTIONARY[n]["instagram"][:3])

        final_tags = []
        seen = set()

        def add_tag(t):
            norm = t.lower()
            if norm not in seen and len(final_tags) < 7:
                seen.add(norm)
                final_tags.append(t if t.startswith("#") else f"#{t}")

        # 릴스 필수 태그
        add_tag("#reels")
        add_tag("#reelsinstagram")
        # 니치 태그
        for nt in niche_tags:
            add_tag(nt)
        # 사용자 원본 태그
        for st in sanitized_base:
            add_tag(st)
        add_tag("#viralreels")

        tags_block = " ".join(final_tags[:7])
        full_text = f"{body_text}\n.\n.\n{tags_block}" if body_text else tags_block

        return {
            "caption": body_text,
            "hashtags": final_tags[:7],
            "full_text": full_text,
            "is_custom": False
        }

    def generate_youtube_metadata(
        self,
        title: str,
        description: str,
        base_tags: Optional[List[str]] = None,
        custom_tags_chips: Optional[List[str]] = None
    ) -> Dict[str, Any]:
        """
        [YouTube Shorts 특화 자동 변환]
        1. #shorts 태그 필수 보장
        2. #fyp, #reels 등 타 플랫폼 태그 0% 제거
        3. 검색 태그(Tags chips)는 '#' 뗀 순수 키워드 분리
        """
        sanitized_tags = self.sanitize_tags(base_tags or [], "youtube")
        
        # #shorts 보장
        has_shorts = any(self.clean_tag(t).lower() in ["shorts", "쇼츠"] for t in sanitized_tags)
        if not has_shorts:
            sanitized_tags.insert(0, "#shorts")

        # 본문 결합
        desc_clean = (description or "").strip()
        # 타사 태그 본문에서 제거
        for taboo in CROSS_PLATFORM_TABOO_TAGS["youtube"]:
            desc_clean = re.sub(rf'#{re.escape(taboo)}(?![A-Za-z0-9가-힣_])', '', desc_clean, flags=re.IGNORECASE)
        desc_clean = re.sub(r'[ \t]+', ' ', desc_clean).strip()

        # 검색 태그 칩 (Chips)
        chips = []
        if custom_tags_chips:
            chips = [self.clean_tag(c) for c in custom_tags_chips if self.clean_tag(c)]
        if not chips:
            chips = [self.clean_tag(t) for t in sanitized_tags if self.clean_tag(t)]

        return {
            "title": title.strip(),
            "description": desc_clean,
            "hashtags": sanitized_tags[:8],
            "tags_chips": chips[:15],
            "full_description": f"{desc_clean}\n\n{' '.join(sanitized_tags[:8])}".strip()
        }

    def preview_all(
        self,
        title: str,
        description: str,
        hashtags: Optional[List[str]] = None
    ) -> Dict[str, Any]:
        """UI 실시간 프리뷰를 위한 3대 플랫폼 동시 변환 결과 반환"""
        return {
            "youtube": self.generate_youtube_metadata(title, description, hashtags),
            "tiktok": self.generate_tiktok_metadata(title, description, hashtags),
            "instagram": self.generate_instagram_metadata(title, description, hashtags)
        }


viral_dispatcher = ViralMetadataDispatcher()
