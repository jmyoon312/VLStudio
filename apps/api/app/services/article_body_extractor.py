"""
ViraLoop Studio — Universal Article Body Extractor (Sovereign Hybrid Engine)

[단일 책임] 모든 매체(국내 커뮤니티 / 국외 커뮤니티 / 국내 뉴스 / 국외 뉴스 / Reddit)
로부터 "제목만"이 아니라 실제 본문 전문·고해상도 이미지·베스트 댓글을 온전히 수급한다.

3중 하이브리드 추출 전략 (셀렉터 드리프트 면역):
  1) Site-Specific Selector Matrix : 매체별 검증된 후보 셀렉터 리스트 (다중 후보 순차 시도)
  2) Trafilatura 2.2 Universal Reader : 사이트 구조 변경/신규 매체 완전 면역 범용 리더
  3) Quality-Score Arbitration : 길이·문장밀도·링크밀도·보일러플레이트·모지바케 페널티로 우승자 채택
     (※ inven 처럼 전용 셀렉터가 더 우수한 매체를 trafilatura가 역행시키지 못하도록 반드시 중재)

부가 무결성:
  - 인코딩 자동 감지 + 모지바케 가드 (euc-kr 하드코딩 목록 폐기 → 82cook 류 UTF-8 모지바케 원천 차단)
  - 403/429/5xx/타임아웃 지수 백오프 재시도 + Referer/모바일 도메인/미러 자동 우회
  - OpenGraph / JSON-LD(image, articleBody) 폴백
  - 스텁 본문 생성 금지: 실패 시 status='failed' + error 사유를 정직하게 반환 (가짜 본문 위장 금지)
"""

import json
import logging
import random
import re
from dataclasses import dataclass, field
from typing import Any, Dict, List, Optional, Tuple
from urllib.parse import urlparse

import httpx
from bs4 import BeautifulSoup

logger = logging.getLogger("viral_loop.body_extractor")

try:
    import trafilatura  # type: ignore
    TRAFILATURA_AVAILABLE = True
except Exception:  # pragma: no cover - 패키징 누락 방어
    trafilatura = None  # type: ignore
    TRAFILATURA_AVAILABLE = False

# ── 상태 계약 (models.ViralArticle.body_status 와 1:1 동기화) ──
BODY_OK = "ok"            # 충분한 실제 본문 확보
BODY_SHORT = "short"      # 본문이 존재하나 짧음(이미지 중심 게시물 등)
BODY_FAILED = "failed"    # 원문 접근/추출 실패 (스텁으로 위장하지 않음)

MIN_BODY_CHARS = 60        # 이 미만은 본문으로 인정하지 않음
ACCEPT_BODY_CHARS = 400    # 이 이상이면 정상 본문(ok)
MAX_BODY_CHARS = 20000     # 저장 상한 (DB/LLM 컨텍스트 보호)

USER_AGENTS = [
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/128.0.0.0 Safari/537.36",
    "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/127.0.0.0 Safari/537.36",
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:129.0) Gecko/20100101 Firefox/129.0",
    "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.5 Safari/605.1.15",
]

MOBILE_USER_AGENT = (
    "Mozilla/5.0 (iPhone; CPU iPhone OS 17_5 like Mac OS X) AppleWebKit/605.1.15 "
    "(KHTML, like Gecko) Version/17.5 Mobile/15E148 Safari/604.1"
)

# ── 모지바케 판정 마커 (UTF-8→CP949 / UTF-8→Latin-1 오독 산출 시퀀스) ──
#  강(強) 신호 — 치환문자(U+FFFD), ¿½ 시퀀스, CP949 오독 대표 3문자 시퀀스
_MOJIBAKE_STRONG = (
    '\ufffd', '\u00ef\u00bf\u00bd', '\u5360\uc3d9\uc625',
)
#  중(中) 신호 — UTF-8 한글 바이트를 Latin-1로 오독할 때 반복 출현하는 2문자 시퀀스
_MOJIBAKE_PAIRS = (
    '\u00eb\u201e', '\u00ec\u00b4', '\u00eb\u00b2', '\u00ea\u00b8', '\u00ec\u0160',
    '\u00ec\u017e', '\u00eb\u2039', '\u00ec\u201a', '\u00ec\u201e', '\u00eb\u201d',
    '\u00e2\u20ac', '\u00ec\u02c6', '\u00ea\u00b0', '\u00eb\u00a1', '\u00eb\u00b3',
)

# ── 보일러플레이트(메뉴/약관/로그인 안내) 판정 키워드 ──
_BOILERPLATE_MARKERS = (
    "로그인", "아이디/비밀번호", "회원가입", "개인정보처리방침", "이용약관", "이용안내",
    "본문 바로가기", "전체메뉴", "전체글보기", "사이트맵", "고객센터", "copyright",
    "all rights reserved", "이전글", "다음글", "목록보기", "광고문의",
)
_BOILERPLATE_HARD_BLOCK = ("아이디/비밀번호 찾기", "아이디/비밀번호찾기")
# ── 내비게이션/래퍼 판정 라벨 (목록 페이지가 실제 본문을 이기는 현상 차단) ──
_NAV_MARKERS = (
    "카테고리", "전체글", "인기글", "실시간", "랭킹", "글쓰기", "출석체크", "로그인",
    "회원가입", "검색", "정렬", "다음글", "이전글", "더보기", "구독", "알림",
    "메뉴", "HOT", "BEST", "공지", "조회수", "댓글순", "추천순", "뉴스 기사", "기사 제목",
)


class BodyQualityGate:
    """
    본문 품질 실측 게이트 — "존재하는가"가 아니라 "진짜 본문인가"를 판정한다.
    (검증 하니스가 제목/URL 존재만 보고 거짓 양성 PASS 하던 결함의 근본 대응)
    """

    @staticmethod
    def mojibake_ratio(text: str) -> float:
        """모지바케 신호 반원절 비율(0.0~1.0). 한글 정상 페이지는 0에 수렴."""
        if not text:
            return 0.0
        length = max(1, len(text))
        strong = sum(text.count(m) * 10 for m in _MOJIBAKE_STRONG)
        pairs = sum(text.count(m) * 4 for m in _MOJIBAKE_PAIRS)
        return min(1.0, round((strong + pairs) / length, 4))

    @staticmethod
    def is_mojibake(text: str) -> bool:
        """한글 정상 페이지(한글 음절 8% 이상)는 절대 모지바케로 오판하지 않는다."""
        if not text:
            return False
        hangul = len(re.findall(r'[가-힣]', text))
        if hangul / max(1, len(text)) >= 0.08:
            return False
        return BodyQualityGate.mojibake_ratio(text) > 0.05

    @staticmethod
    def boilerplate_ratio(text: str) -> float:
        if not text:
            return 1.0
        hits = sum(1 for kw in _BOILERPLATE_MARKERS if kw.lower() in text.lower())
        return min(1.0, hits / 6.0)

    @staticmethod
    def looks_like_login_wall(text: str) -> bool:
        """로그인 페이지/권한 안내를 본문으로 오인하는 결함 차단 (etoland 류)."""
        if not text:
            return False
        return any(kw in text for kw in _BOILERPLATE_HARD_BLOCK)

    @staticmethod
    def link_density(text: str) -> float:
        if not text:
            return 1.0
        return min(1.0, (text.lower().count("http") * 12) / max(1, len(text)))

    @staticmethod
    def sentence_density(text: str) -> float:
        """문장 종결부호 밀도 — 내비게이션 스트링 덩어리와 실제 산문을 구분."""
        if not text:
            return 0.0
        ends = len(re.findall(r"[\.\!\?。？！]\s|다\.|요\.|음\.|죠\.|니다|\n", text))
        return min(1.0, ends / max(1.0, min(len(text), 600) / 60.0))

    @staticmethod
    def is_noise_line(line: str) -> bool:
        """
        Line-level nav/meta noise detector.
        Strips menu labels, view counters and list chrome so that a container which
        mixes the article text with navigation can still qualify as a pure body.
        """
        l = line.strip()
        if not l or len(l) > 40:
            return False
        lowered = l.lower()
        for marker in _NAV_MARKERS:
            m = marker.lower()
            if lowered == m:
                return True
            if len(l) <= 8 and m in lowered:
                return True
        if re.fullmatch(r"[\d,\.\s]+(원|개|건|명|회|자|일|분|초|시간|위|점)?", l):
            return True
        if re.fullmatch(r"(조회|댓글|추천|스크|입력|수정)[\s:：]*[\d,\.]*", l):
            return True
        return False

    @staticmethod
    def normalize(text: str) -> str:
        """공백//중복 정규화 + 노이즈 라인 제거."""
        if not text:
            return ""
        lines: List[str] = []
        seen: set = set()
        for raw in text.replace("\r", "\n").split("\n"):
            line = re.sub(r"[ \t\u00a0\u200b]+", " ", raw).strip()
            if not line:
                continue
            if len(line) <= 2 and not re.search(r"[가-힣a-zA-Z0-9]", line):
                continue
            if BodyQualityGate.is_noise_line(line):
                continue
            if line in seen:
                continue
            seen.add(line)
            lines.append(line)
        return "\n".join(lines).strip()[:MAX_BODY_CHARS]

    @staticmethod
    def anchor_density_penalty(anchor_count: Optional[int], text_len: int) -> float:
        """
        링크(앵커) 밀도 패널티 — 관련기사/목록 래퍼를 실제 본문보다 열위로 만든다.
        (dcinside 정답 .write_div 587자 vs 래퍼 main 7,085자 역전 차단)
        """
        if not anchor_count or text_len <= 0:
            return 1.0
        per_100 = anchor_count / max(1.0, text_len / 100.0)
        if per_100 <= 0.5:
            return 1.0
        if per_100 <= 1.2:
            return 0.85
        if per_100 <= 2.5:
            return 0.55
        if per_100 <= 5.0:
            return 0.35
        return 0.2

    @classmethod
    def purity(cls, text: str, anchor_count: Optional[int] = None) -> float:
        """0.15~1.0 연속 순도 지표 (래퍼/목록/내비 혼입 정도의 역수)."""
        if not text or len(text) < MIN_BODY_CHARS:
            return 0.0
        p = cls.anchor_density_penalty(anchor_count, len(text))
        p *= cls.nav_density_penalty(text)
        p *= (1.0 - cls.boilerplate_ratio(text) * 0.7)
        if cls.looks_like_login_wall(text) or cls.is_mojibake(text):
            p *= 0.4
        return max(0.15, round(p, 4))

    @staticmethod
    def nav_density_penalty(text: str) -> float:
        """내비/래퍼 판정 — 목록·카테고리 라벨이 밀집한 블록 본문보다 열위로 만든다."""
        if not text:
            return 1.0
        hits = sum(1 for kw in _NAV_MARKERS if kw in text)
        per_100 = hits / max(1.0, len(text) / 100.0)
        if per_100 <= 0.1:
            return 1.0
        if per_100 <= 0.25:
            return 0.7
        if per_100 <= 0.5:
            return 0.45
        return 0.25

    @classmethod
    def score(cls, text: str, title: str = "",
              anchor_count: Optional[int] = None,
              has_images: bool = False) -> float:
        """본문 품질 점수(높을수록 우수). 0.0 이면 본문으로 인정하지 않음."""
        if not text and not has_images:
            return 0.0
        t = cls.normalize(text)
        min_chars = 6 if has_images else MIN_BODY_CHARS
        if len(t) < min_chars:
            if has_images:
                t = f"{title}\n\n(이미지 기반 바이럴 콘텐츠)"
            else:
                return 0.0
        if cls.is_mojibake(t) or cls.looks_like_login_wall(t):
            return 0.0

        # 길이 상한 2,500자 — 목록 래퍼가 분량만으로 실제 본문을 이기지 못하게 한다
        score = float(min(max(len(t), 200 if has_images else 0), 2500))
        if has_images:
            score += 350.0  # 이미지 보유 게시글은 높은 가점 부여 (짤/맛집/사진 글 보존)

        # 과대 블록 패널티 — 페이지 전체를 감싸는 래퍼(내비/목록 혼입) 의심
        if len(t) > 15000:
            score *= 0.75
        elif len(t) > 8000:
            score *= 0.9
        score *= (1.0 - cls.boilerplate_ratio(t) * 0.7)
        score *= cls.anchor_density_penalty(anchor_count, len(t))
        score *= cls.nav_density_penalty(t)
        score *= (1.0 - cls.link_density(t) * 0.5)
        if cls.sentence_density(t) < 0.12 and len(t) < 500 and not has_images:
            score *= 0.5
        # 제목 핵심 토큰이 본문에 존재하면 관련성 가중 (내비게이션 오매칭 배제)
        if title:
            tokens = [tok for tok in re.split(r"[\s\[\]\(\)\-,·:]+", title) if len(tok) >= 3]
            if tokens:
                hit = sum(1 for tok in tokens if tok in t)
                score *= (1.0 + min(0.4, hit / len(tokens) * 0.4))
        return round(score, 4)

    @staticmethod
    def classify(text: str, has_images: bool = False) -> str:
        if not text:
            return BODY_SHORT if has_images else BODY_FAILED
        if len(text) < MIN_BODY_CHARS:
            return BODY_SHORT if (has_images or len(text) >= 10) else BODY_FAILED
        return BODY_OK if len(text) >= ACCEPT_BODY_CHARS else BODY_SHORT


class SiteSelectorMatrix:
    """
    매체별 다중 후보 셀렉터 매트릭스.
    단일 셀렉터 하드코딩 기 → 후보를 순차 시도하여 사이트 개편에도 생존한다.
    """

    BODY: Dict[str, List[str]] = {
        # ── 국내 커뮤니티 (21대) ──
        "fmkorea": [".xe_content", ".rd_body", "article", ".document_2843972"],
        "mlbpark": ["#contentDetail", ".ar_txt"],
        "ppomppu": [".JS_ContentMain", "td.board-contents", ".board-contents", ".sub-hanbody"],
        "ou": [".viewContent", "#viewContent", ".bbs_content"],
        "ruli": [".board_main_view .view_content", "#board_read .view_content", ".view_content", ".news_view_content"],
        "humor": ["#cnts", "#wrap_body", "#humor_content", ".view_content", "#bbs_content"],
        "inven": [".articleBody", "#powerbbsContent", ".view_body", ".article_body"],
        "slrclub": [".slrbbs", "#vx2_content", ".view_content", "#container"],
        "82cook": ["#articleBody", "#content", ".column2", ".read_bottom"],
        "etoland": ["article .view-content", ".content-wrapper .view-content", ".view-content", ".content-wrapper", ".article_body", ".view_content"],
        "theqoo": [".rd_body .xe_content", ".xe_content", "article .xe_content"],
        "dcinside_best": [".writing_view_box .write_div", ".write_div"],
        "natepann": ["#contentArea", ".contentArea", ".pann_content", ".talk_content"],
        "instiz": [".memo_content", ".view_content", "#memo_content"],
        "bobae_best": [".bodyCont", ".bbs_view_con", ".view_body"],
        "dogdrip": [".document-body", "#article_1", ".xe_content"],
        "ygosu_real": [".container", ".board_body", ".view_content", "#ygosu_view"],
        "damoang_free": [".view-content", ".board-view-content", "#bo_v_con"],
        "arca_headline": [".article-content", ".article-body", ".fr-view"],
        "opgg_talk": [".post-content", ".talk_content", ".content_text"],
        "clien": [".post_article", ".post_view", ".post-content", ".content_view"],
        # ── 국외 커뮤니티 / 글로벌 채널 ──
        "gasengi": ["#bo_v_con", ".view-content", "#bo_v_atc", ".bo_v_con"],
        "memebase": [".post-content", "article", ".entry-content"],
        "lemmy": [".post-body", ".md", "article"],
        "stackoverflow": ["#mainbar", ".s-prose", ".answercell"],
        "devto": ["#article-body", ".crayons-article__body", ".article-body"],
        "hackernews": [".comment-tree", "#hnmain", ".storylink"],
        "lobsters": [".story_text", ".comment_text", "#story_text"],
        "openai": [".cooked", "#main-outlet", ".topic-body"],
        # ── 국내 뉴스 (네이버 8대 섹션 + 포털/언론사 공통)  ──
        "naver_politics": ["#dic_area", "#articleBodyContents", "#newsct_article", ".go_trans_area"],
        "naver_economy": ["#dic_area", "#articleBodyContents", "#newsct_article", ".go_trans_area"],
        "naver_society": ["#dic_area", "#articleBodyContents", "#newsct_article", ".go_trans_area"],
        "naver_culture": ["#dic_area", "#articleBodyContents", "#newsct_article", ".go_trans_area"],
        "naver_world": ["#dic_area", "#articleBodyContents", "#newsct_article", ".go_trans_area"],
        "naver_it": ["#dic_area", "#articleBodyContents", "#newsct_article", ".go_trans_area"],
        "naver_entertain": ["#dic_area", "#articleBodyContents", "#newsct_article", ".go_trans_area"],
        "naver_sports": ["#dic_area", "#articleBodyContents", "#newsct_article", ".go_trans_area"],
        # ── Reddit ──
        "reddit": [".md", "[data-test-id='post-content']", ".usertext-body", ".RichTextJSON-root"],
    }

    # 국내외 언론사 공통 후보 (구글 트렌드 관련 보도 / 국외 뉴스 매체)
    NEWS_BODY: List[str] = [
        "#dic_area", "#articleBodyContents", "#newsct_article", ".go_trans_area",
        "#articleBody", ".article-body", ".articleBody", "#article-content",
        "article", "[itemprop='articleBody']", ".story-body", ".post-content",
    ]

    COMMENTS: Dict[str, List[str]] = {
        "dcinside_best": [".cmt_list .cmt_txt", ".reply_list .txt", ".cmt_content"],
        "clien": [".comment_content", ".comment_view", ".comment_row .comment_content"],
        "natepann": [".comment_list .comm_txt", ".cmt_list .txt", "#commentList li .txt"],
        "theqoo": [".comment_list .comment-content", ".cmt_content", ".commentList li .text"],
        "82cook": [".comment_reply .re_txt", "#commentList li .txt", ".cmt_txt"],
        "inven": [".commentList .comment", ".comment_view .text", "#commentList .text"],
        "ruli": [".comment_element .text", ".comment_element span.text", ".comment_view .text", ".reple_list .re_cont"],
        "humor": ["#cmt_best_comm_table tr", ".comm_best_area tr", "span[id^='comment_memo_']"],
        "mlbpark": [".reply_list .re_txt", ".reply_list span.re_txt"],
        "fmkorea": [".comment_list .xe_content", ".cmt_content", ".fdb_lst .text"],
        "ppomppu": [".han_comment .txt", ".comment_list .txt", "#commentList .txt"],
        "ou": [".view_comment_list .comment_memo", ".comment_list .comment_memo"],
        "bobae_best": [".comment_list .comm_txt", ".comment-list .text", ".bbs_view_con .comm_txt"],
        "dogdrip": [".comment-list .comment-body", ".comment_list .comment-body"],
        "damoang_free": [".comment-media .comment-content", "#view_comment .comment-content"],
        "arca_headline": [".comment-item .message", ".comment-wrapper .message"],
        "etoland": ["#comment-list .comment-item .body-m-reading", ".comment-item .body-m-reading", ".comment-content"],
    }

    GENERIC_BODY: List[str] = [
        "article", "[itemprop='articleBody']", ".article_body", ".article-body",
        ".post-content", ".entry-content", ".content_view", ".view_content",
        "#content", "main", ".contents",
    ]

    GENERIC_COMMENTS: List[str] = [
        ".comment_content", ".comment-content", ".cmt_content", ".comment_view",
        "[class*='comment'] .text", "[id*='comment'] li",
    ]

    @classmethod
    def body_selectors(cls, source_code: str, url: str = "") -> List[str]:
        """매체 코드 기준 후보 셀렉터 (뉴스 도메인은 NEWS_BODY 우선)."""
        selectors: List[str] = []
        is_news_domain = any(
            token in url for token in
            ("news.naver.com", "n.news.naver.com", "/article/", "news.", "reuters.com",
             "bbc.com", "bbc.co.uk", "apnews.com", "nytimes.com", "theguardian.com")
        )
        if is_news_domain:
            selectors.extend(cls.NEWS_BODY)
        selectors.extend(cls.BODY.get(source_code or "", []))
        if source_code and source_code.startswith("naver_"):
            selectors.extend(cls.NEWS_BODY)
        for sel in cls.GENERIC_BODY:
            if sel not in selectors:
                selectors.append(sel)
        return selectors

    @classmethod
    def comment_selectors(cls, source_code: str) -> List[str]:
        """매체별 댓글 셀렉터 — 등록된 커뮤니티는 전용 셀렉터만 반환하여 타 영역 오염 차단."""
        if source_code in cls.COMMENTS:
            return list(cls.COMMENTS[source_code])
        selectors = list(cls.COMMENTS.get(source_code or "", []))
        selectors.extend(cls.GENERIC_COMMENTS)
        return selectors
@dataclass
class ExtractResult:
    """본문 추출 결과 계약 — 스텁 위장 금지(실패는 실패로 정직하게 반환)."""
    url: str
    body_text: str = ""
    images: List[str] = field(default_factory=list)
    comments: List[Dict[str, Any]] = field(default_factory=list)
    title: str = ""
    status: str = BODY_FAILED          # ok | short | failed
    error: Optional[str] = None
    engine: str = "none"               # selector:<sel> | trafilatura | jsonld | merged
    score: float = 0.0
    http_status: Optional[int] = None
    candidates: Dict[str, int] = field(default_factory=dict)

    @property
    def has_body(self) -> bool:
        return bool(self.body_text) and len(self.body_text) >= MIN_BODY_CHARS

    def as_detail_dict(self) -> Dict[str, Any]:
        """기존 fetch_article_details() 호출 계약(dict) 호환 직렬화."""
        return {
            "content_text": self.body_text,
            "images": self.images,
            "comments": self.comments,
            "title": self.title,
            "status": self.status,
            "error": self.error,
            "engine": self.engine,
            "score": self.score,
            "http_status": self.http_status,
            "content_length": len(self.body_text),
        }


async def _sleep(seconds: float) -> None:
    """백오프 대기 (단위 테스트에서 monkeypatch 가능하도록 분리)."""
    import asyncio
    await asyncio.sleep(seconds)


def _make_soup(html: str) -> BeautifulSoup:
    """lxml(가능 시) → html.parser 폴백 파서 팩토리."""
    try:
        return BeautifulSoup(html, "lxml")
    except Exception:
        return BeautifulSoup(html, "html.parser")


class ArticleBodyExtractor:
    """모든 매체 본문·이미지·댓글 수급 단일 책임 엔진."""

    def __init__(self, min_chars: int = MIN_BODY_CHARS, timeout: float = 12.0):
        self.min_chars = min_chars
        self.timeout = timeout
        self.sources = SiteSelectorMatrix

    # ─────────────────────────────────────────────────────────────
    # 1. 인코딩 자동 감지 (하드코딩 euc-kr 목록 기 → 82cook 모지바케 차단)
    # ─────────────────────────────────────────────────────────────
    @staticmethod
    def _meta_charset(raw: bytes) -> Optional[str]:
        head = raw[:4096].decode("ascii", errors="ignore").lower()
        m = re.search(r'charset=["\']?([a-z0-9_\-]+)', head)
        return m.group(1) if m else None

    @classmethod
    def decode_html(cls, raw: bytes, content_type: str = "") -> str:
        """charset 후보 전수 시도 + 모지바케 비율 최소 후보 채택."""
        candidates: List[str] = []
        meta = cls._meta_charset(raw)
        if meta:
            candidates.append(meta)
        m2 = re.search(r'charset=["\']?([a-z0-9_\-]+)', (content_type or "").lower())
        if m2:
            candidates.append(m2.group(1))
        candidates += ["utf-8", "cp949", "euc-kr", "utf-8-sig"]

        best_text, best_ratio = "", 1.0
        for enc in candidates:
            try:
                text = raw.decode(enc, errors="replace")
            except LookupError:
                continue
            ratio = BodyQualityGate.mojibake_ratio(text)
            if ratio < best_ratio - 1e-9:
                best_ratio, best_text = ratio, text
                if ratio <= 0.0005:
                    break
        if not best_text:
            best_text = raw.decode("utf-8", errors="replace")
        return best_text

    # ─────────────────────────────────────────────────────────────
    # 2. HTTP 수급 (재시도 + 백오프 + Referer/모바일/미러 자동 우회)
    # ─────────────────────────────────────────────────────────────
    def build_headers(self, referer: Optional[str] = None,
                      mobile: bool = False) -> Dict[str, str]:
        headers = {
            "User-Agent": MOBILE_USER_AGENT if mobile else random.choice(USER_AGENTS),
            "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
            "Accept-Language": "ko-KR,ko;q=0.9,en-US;q=0.8,en;q=0.7",
            "Connection": "keep-alive",
            "Upgrade-Insecure-Requests": "1",
            "Cache-Control": "no-cache",
        }
        if referer:
            headers["Referer"] = referer
        return headers

    @staticmethod
    def mirror_candidates(url: str) -> List[str]:
        """차단 우회용 미러/모바일 도메인 후보 생성."""
        variants: List[str] = []
        parsed = urlparse(url)
        host = parsed.netloc
        if not host:
            return variants
        if host.startswith("www."):
            variants.append(url.replace(f"https://{host}", f"https://{host[4:]}", 1))
        elif not host.startswith(("m.", "mobile.")) and "naver.com" not in host:
            variants.append(url.replace(f"https://{host}", f"https://m.{host}", 1))
        # 네이버 뉴스는 n.news 도메인이 본문 완결성이 가장 높다
        if "news.naver.com" in url and "n.news.naver.com" not in url:
            variants.append(url.replace("news.naver.com", "n.news.naver.com", 1))
        return variants

    async def fetch_page(self, client: httpx.AsyncClient, url: str,
                         referer: Optional[str] = None,
                         allow_mirror: bool = True
                         ) -> Tuple[Optional[str], int, Optional[str], str]:
        """
        (html, http_status, error, final_url) 반환.
        403/429/503/타임아웃은 지수 백오프 재시도 + 미러/모바일 UA 우회.
        """
        attempts: List[Tuple[str, bool]] = [(url, False)]
        if allow_mirror:
            attempts += [(m, False) for m in self.mirror_candidates(url)]
        attempts.append((url, True))  # 최후: 모바일 UA 시도

        last_status, last_error, last_url = 0, None, url
        for idx, (target, mobile) in enumerate(attempts):
            if idx > 0:
                await _sleep(min(3.0, 0.7 * idx))
            try:
                resp = await client.get(
                    target,
                    headers=self.build_headers(referer=referer, mobile=mobile),
                    timeout=self.timeout,
                    follow_redirects=True,
                )
                last_status, last_url = resp.status_code, str(resp.url)
                if resp.status_code == 200 and resp.content:
                    html = self.decode_html(resp.content, resp.headers.get("content-type", ""))
                    if html.strip():
                        return html, 200, None, last_url
                last_error = f"HTTP {resp.status_code}"
                if resp.status_code in (403, 429, 430, 503):
                    continue
                if 400 <= resp.status_code < 500:
                    break
            except Exception as exc:
                last_error = f"{type(exc).__name__}: {exc}"
                continue
        return None, last_status, last_error, last_url

    # ─────────────────────────────────────────────────────────────
    # 3. 3중 하이브리드 본문 추출 + 품질 스코어 중재
    # ─────────────────────────────────────────────────────────────────
    def _extract_by_selectors(self, soup: BeautifulSoup, source_code: str,
                              url: str, title: str = "") -> List[Tuple[float, str, str]]:
        """매체별 후보 셀렉터 순차 시도 → (점수, 본문, 엔진명) 후보 목록."""
        results: List[Tuple[float, str, str]] = []
        all_selectors = self.sources.body_selectors(source_code, url)
        specific = set(all_selectors) - set(self.sources.GENERIC_BODY)
        for sel in all_selectors:
            try:
                node = soup.select_one(sel)
            except Exception:
                continue
            if not node:
                continue

            # Detect genuine user photos inside container before decomposing non-ad tags
            imgs_in_node = [
                img for img in node.select("img, source")
                if img.get("src") or img.get("data-original") or img.get("data-src") or img.get("data-originalurl")
            ]
            valid_imgs = [
                img for img in imgs_in_node
                if not any(bad in (img.get("data-originalurl") or img.get("data-original") or img.get("data-src") or img.get("src") or "").lower() for bad in self._IMAGE_BLOCKLIST)
            ]
            has_images = len(valid_imgs) > 0

            # 매체별 본문 특화 노이즈 태그 정제 (이미지 컨테이너는 온전히 보존)
            if source_code == "humor" or "#cnts" in sel:
                for bad in node.select(".btn_racy_show_all, .btn_pc, a[onclick*='racy_show']"):
                    bad.decompose()
            elif source_code == "dcinside_best" or ".write_div" in sel:
                for bad in node.select(
                    ".btn_recommend_box, .recommend_box, .appending_file_box, .appending_file_list, "
                    ".btn_orig_view, .poll_box, .under_banner, .gallview_contents_wrap, .dccon, .written_dccon, .dccon_guide"
                ):
                    bad.decompose()
            elif source_code == "theqoo" or ".xe_content" in sel:
                for bad in node.select(".wgtPv, .sns_share, .btn_area, .rd_nav, .rd_ft, .share_box, .board_navi"):
                    bad.decompose()

            for bad in node.select(
                "script, style, iframe, noscript, .ad, .ads, .banner, .btn, .tag, "
                "nav, footer, .comment, .comments, .reply, form"
            ):
                bad.decompose()
            raw_text = node.get_text("\n", strip=True)
            if source_code == "humor":
                raw_lines = [l for l in raw_text.split("\n") if not any(nw in l for nw in ("너굴맨", "히든처리", "이미지 보기", "이미지를 보시려면"))]
                raw_text = "\n".join(raw_lines)
            elif source_code == "dcinside_best":
                dc_bad = ("추천 비추천", "개념 추천", "개념 비추천", "개념추천", "개념비추천", "추천검색", "본문 이미지 다운로드", "원본 첨부파일", "[원본 보기]", "[ 원본 보기 ]", "- dc official App", "- dc App")
                raw_lines = [
                    l for l in raw_text.split("\n")
                    if l.strip() not in dc_bad
                    and not (l.strip().startswith("펌 ") or l.strip() == "펌 0" or l.strip().startswith("출처:") or l.strip().startswith("출처 :"))
                    and not (re.search(r'\.(?:jpg|png|gif|jpeg|webp)\s*(?:복사\.jpg|\.ren\.gif|\s*$)', l, re.IGNORECASE) and len(l) < 60 and not l.strip().startswith("http"))
                ]
                raw_text = "\n".join(raw_lines)
            elif source_code == "theqoo":
                theqoo_bad = ("HOT 게시물", "정치 제외", "GO", "Up", "Down", "Print", "HOT", "카테고리")
                raw_lines = [l for l in raw_text.split("\n") if l.strip() not in theqoo_bad]
                raw_text = "\n".join(raw_lines)
            text = BodyQualityGate.normalize(raw_text)
            if not text and has_images:
                text = f"{title}\n\n(이미지 기반 바이럴 콘텐츠)"
            anchor_count = len(node.select("a"))
            score = BodyQualityGate.score(text, title, anchor_count=anchor_count, has_images=has_images)
            if score > 0:
                # 전용 셀렉터 특이도 보너스 — 범용 래퍼가 전용 본문을 덮어쓰지 못하게 한다
                if sel in specific:
                    score *= 2.0
                results.append((score, text, f"selector:{sel}", anchor_count, sel in specific))
        return results

    def _extract_by_trafilatura(self, raw_html: bytes, url: str,
                                title: str = "") -> List[Tuple[float, str, str]]:
        """trafilatura 범용 리더 (셀터 드리프트 면역 + 인코딩 자체 해결)."""
        if not TRAFILATURA_AVAILABLE or not raw_html:
            return []
        results: List[Tuple[float, str, str]] = []
        for kwargs in (
            {"favor_recall": True},
            {},
            {"favor_precision": True},
        ):
            try:
                text = trafilatura.extract(
                    raw_html, url=url, include_comments=False, include_tables=True,
                    deduplicate=True, **kwargs
                ) or ""
            except Exception as exc:
                logger.debug(f"[Extractor] trafilatura 실패({kwargs}): {exc}")
                continue
            text = BodyQualityGate.normalize(text)
            score = BodyQualityGate.score(text, title)
            if score > 0:
                results.append((score, text, "trafilatura", None, False))
        return results

    @staticmethod
    def _jsonld_blocks(soup: BeautifulSoup) -> List[str]:
        """JSON-LD articleBody 본문 폴백."""
        blocks: List[str] = []
        for script in soup.select("script[type='application/ld+json']"):
            try:
                data = json.loads(script.string or "{}")
            except Exception:
                continue
            items = data if isinstance(data, list) else [data]
            for item in items:
                if not isinstance(item, dict):
                    continue
                body = item.get("articleBody") or item.get("description") or ""
                if isinstance(body, str) and len(body) > MIN_BODY_CHARS:
                    blocks.append(BodyQualityGate.normalize(body))
            if blocks:
                break
        return blocks

    @staticmethod
    def _og_image(soup: BeautifulSoup) -> List[str]:
        imgs: List[str] = []
        for prop in ("og:image", "og:image:secure_url", "twitter:image"):
            el = soup.select_one(f"meta[property='{prop}'], meta[name='{prop}']")
            if el and el.get("content"):
                imgs.append(el["content"])
        return imgs

    @staticmethod
    def _jsonld_images(soup: BeautifulSoup) -> List[str]:
        imgs: List[str] = []
        for script in soup.select("script[type='application/ld+json']"):
            try:
                data = json.loads(script.string or "{}")
            except Exception:
                continue
            items = data if isinstance(data, list) else [data]
            for item in items:
                if not isinstance(item, dict):
                    continue
                image = item.get("image")
                if isinstance(image, str):
                    imgs.append(image)
                elif isinstance(image, dict) and image.get("url"):
                    imgs.append(image["url"])
                elif isinstance(image, list):
                    for entry in image:
                        if isinstance(entry, str):
                            imgs.append(entry)
                        elif isinstance(entry, dict) and entry.get("url"):
                            imgs.append(entry["url"])
        return imgs

    # ─────────────────────────────────────────────────────────────
    # 4. 이미지 / 댓글 수급
    # ─────────────────────────────────────────────────────────────
    _IMAGE_BLOCKLIST = (
        "icon", "emoji", "emoticon", "btn", "button", "blank.gif", "spacer",
        "banner", "logo", "tracker", "pixel", "1x1", "loading", "spinner",
        "ad_", "/ad.", "ads/", "profile", "avatar_", "rank", "level",
        # Ad networks & portal search ads
        "searchad", "pstatic.net", "adservice", "adclick", "pagead", 
        "googlesyndication", "doubleclick", "criteo", "taboola", 
        "outbrain", "adnxs", "adtech", "advertising", "daumcdn.net/ad", "ader.naver.com",
        # Community UI, category icons & bat emoticons
        "challenge/mlbpark", "donga.com/challenge", "image.donga.com",
        "donga.com/mlbpark/img", "imo0", "level_", "badge", "avatar", "hotdeal_now",
        "tit_hottest", "tit_enter", "donga.com/Board/thumb",
        # Ruliweb UI & user badges
        "achievement", "ruli_200", "ruliweb.com/img/2016", "ruliweb.com/achievement", "icon=",
        # Humoruniv UI & loading bars
        "loading_bar", "loading_bar2", "/images/loading", "icon-humoruniv", "blt_cmt",
        # TheQoo UI, skin & social share buttons (prevent capturing share icons as images)
        "theqoo.net/modules", "theqoo.net/common", "theqoo.png", "kakao_theqoo", "twitter_theqoo",
        "copy_theqoo", "sketchbook5", "theqoo_icon",
        # DCInside icons & download buttons
        "dcimg.net/icon", "dcimg.net/dccon", "dcicon", "app_down", "btn_recom"
    )

    @staticmethod
    def _absolute_image_url(src: str, base_url: str) -> Optional[str]:
        if not src:
            return None
        src = src.strip().split(" ")[0]
        if src.startswith("data:"):
            return None
        if src.startswith("//"):
            return "https:" + src
        if src.startswith("/"):
            return base_url.rstrip("/") + src
        if not src.startswith("http"):
            return base_url.rstrip("/") + "/" + src.lstrip("./")
        return src

    def _extract_images(self, soup: BeautifulSoup, base_url: str,
                        node: Optional[Any] = None, limit: int = 8) -> List[str]:
        images: List[str] = []

        # 1. Primary: If article body container is identified, extract genuine user images from it first
        if node is not None:
            for img in node.select("img, source"):
                raw = (
                    img.get("data-originalurl")
                    or img.get("data-original")
                    or img.get("data-src")
                    or img.get("data-url")
                    or img.get("src")
                    or img.get("data-lazy-src")
                    or img.get("data-srcset")
                    or img.get("srcset")
                )
                if not raw:
                    continue
                if "," in raw and " " in raw:
                    raw = raw.split(",")[-1].strip().split(" ")[0]
                resolved = self._absolute_image_url(raw, base_url)
                if not resolved:
                    continue
                lower = resolved.lower()
                if any(bad in lower for bad in self._IMAGE_BLOCKLIST):
                    continue
                if lower.endswith((".svg", ".ico")):
                    continue
                if resolved not in images:
                    images.append(resolved)
                if len(images) >= limit:
                    return images

            # If article body had genuine user photos, NEVER fall back to full page (which leaks ads/sidebars)
            if len(images) > 0:
                return images

        # 2. Fallback: Only when node has no images, check OpenGraph / JSON-LD
        for src in self._og_image(soup) + self._jsonld_images(soup):
            if src and src not in images:
                lower = src.lower()
                if not any(bad in lower for bad in self._IMAGE_BLOCKLIST):
                    images.append(src)
            if len(images) >= limit:
                break
        return images[:limit]

    def _extract_comments(self, soup: BeautifulSoup, source_code: str,
                          limit: int = 10) -> List[Dict[str, Any]]:
        """실제 댓글만 수집 (likes 날조 금지 — 실측 불가 시 0, 원문 댓글 없으면 빈 배열)."""
        comments: List[Dict[str, Any]] = []
        seen: set = set()

        # 1. 웃긴대학(humor) 전용 베스트 댓글 파서
        if source_code == "humor":
            table = soup.select_one("#cmt_best_comm_table")
            if table:
                for tr in table.select("tr"):
                    tds = tr.select("td")
                    if len(tds) >= 4:
                        author = "네티즌"
                        nick_el = tds[1].select_one(".hu_nick_txt, .best_id, a.hu_nick, span.hu_nick")
                        if nick_el:
                            author = nick_el.get_text(strip=True) or author
                        else:
                            author = tds[1].get_text(strip=True) or author

                        content_td = tds[2]
                        for bad in content_td.select(".comment_more_btn, .btn_nemo"):
                            bad.decompose()
                        txt = content_td.get_text(" ", strip=True)
                        txt = re.sub(r'\[\d+\]\s*$', '', txt).strip()
                        txt = re.sub(r'\.\.\.전체보기.*$', '', txt).strip()
                        if not txt or len(txt) < 2 or txt in seen:
                            continue
                        seen.add(txt)

                        likes = 0
                        like_el = tds[3].select_one("span.r, span.list_ok")
                        if like_el and like_el.get_text(strip=True).isdigit():
                            likes = int(like_el.get_text(strip=True))

                        comments.append({
                            "author": author,
                            "text": txt,
                            "likes": likes,
                            "is_best": True,
                            "order_idx": len(comments),
                        })
                        if len(comments) >= limit:
                            return comments
                if comments:
                    return comments

        # 2. 범용 및 타 매체 셀렉터 기반 추출
        for sel in self.sources.comment_selectors(source_code):
            try:
                nodes = soup.select(sel)
            except Exception:
                continue
            for idx, node in enumerate(nodes):
                raw_text = node.get_text(" ", strip=True)
                if source_code == "ruli":
                    raw_text = re.sub(r'^BEST\s*', '', raw_text).strip()
                text = BodyQualityGate.normalize(raw_text)
                if not text or not (2 <= len(text) <= 400):
                    continue
                if text in seen or BodyQualityGate.is_mojibake(text):
                    continue
                if text.lower().count("http") >= 1 and len(text) < 40:
                    continue
                if any(kw in text for kw in ("로그인 후", "신고")):
                    continue
                seen.add(text)

                # Real author detection from parent comment wrapper if available
                author = "네티즌"
                parent_box = node.find_parent(["div", "li", "tr"])
                if source_code == "ruli":
                    comment_box = node.find_parent(".comment_element") or parent_box
                    if comment_box:
                        auth_el = comment_box.select_one(".nick, a.nick_link, span.nick")
                        if auth_el:
                            raw_auth = auth_el.get_text(strip=True)
                            raw_auth = re.sub(r'^작성자\s*', '', raw_auth)
                            raw_auth = re.sub(r'\(.*?\)', '', raw_auth).strip()
                            author = raw_auth or author
                elif parent_box:
                    auth_el = parent_box.select_one(".name, .nick, a.nick_link, .author, a.member, .writer, span.name")
                    if auth_el:
                        author = auth_el.get_text(strip=True) or author

                comments.append({
                    "author": author,
                    "text": text,
                    "likes": 0,
                    "is_best": idx < 3,
                    "order_idx": len(comments),
                })
                if len(comments) >= limit:
                    return comments
            if comments:
                break
        return comments

    # ─────────────────────────────────────────────────────────────
    # 5. 중재(Arbitration) — 후보 중 "최고 품질" 채택 (최장 ≠ 최선)
    #    inven 류: 전용 셀렉터 우위 유지 / ruli 류: trafilatura 복구 수용
    # ─────────────────────────────────────────────────────────────
    def arbitrate(self, candidates: List[Any], title: str = ''
                  ) -> Tuple[str, str, float, Dict[str, int]]:
        """
        Purity-first arbitration (noise-resistant):
          1) Collect candidates whose text is FREE of wrapper/nav/list noise (pure=True).
          2) Among pure candidates pick the LONGEST (most complete) body; ties -> higher score.
          3) If no pure candidate exists, fall back to the highest scoring candidate.
        """
        best_text, best_engine, best_score = '', 'none', 0.0
        summary: Dict[str, int] = {}
        pure_pool: List[Tuple[float, str, str]] = []

        for candidate in candidates:
            if len(candidate) == 5:
                declared, text, engine, anchor_count, is_specific = candidate
                pure = is_specific or (anchor_count is not None and anchor_count <= 5 and BodyQualityGate.nav_density_penalty(text) >= 0.7)
            elif len(candidate) == 4:
                declared, text, engine, pure = candidate
            else:
                declared, text, engine = candidate[:3]
                pure = False

            summary[engine] = len(text)
            score = float(declared) or BodyQualityGate.score(text, title)
            if pure:
                pure_pool.append((score, text, engine))
            if score > best_score:
                best_text, best_engine, best_score = text, engine, score

        if pure_pool:
            # 1. If any site-specific selector matched and is pure, it wins unconditionally over generic readers/wrappers
            specific_cands = [
                c for c in pure_pool 
                if c[2].startswith("selector:") and not any(gen in c[2] for gen in [":article", ":main", ":#content", ":.contents"])
            ]
            if specific_cands:
                score, text, engine = max(specific_cands, key=lambda c: c[0])
                return text, engine, score, summary
            # 2. Otherwise pick the highest scoring pure candidate
            score, text, engine = max(pure_pool, key=lambda c: (c[0], len(c[1])))
            return text, engine, score, summary
        return best_text, best_engine, best_score, summary

    @staticmethod
    def _base_url(url: str) -> str:
        parsed = urlparse(url)
        if parsed.scheme and parsed.netloc:
            return f"{parsed.scheme}://{parsed.netloc}"
        return ""

    def extract_from_html(self, html: str, url: str, source_code: str = "",
                          title_hint: str = "") -> ExtractResult:
        """순수 함수: 이미 수급한 HTML에서 본문/이미지/댓글 추출 (네트워크 없음 → 오프라인 단위 테스트 가능)."""
        result = ExtractResult(url=url, title=title_hint)
        if not html:
            result.error = "empty_html"
            return result

        soup = _make_soup(html)
        if not result.title and soup.title:
            result.title = soup.title.get_text(strip=True)[:200]

        candidates: List[Tuple[float, str, str, Optional[int], bool]] = []
        candidates += self._extract_by_selectors(soup, source_code, url, result.title)
        candidates += self._extract_by_trafilatura(
            html.encode("utf-8", errors="replace"), url, result.title
        )
        for block in self._jsonld_blocks(soup):
            candidates.append((BodyQualityGate.score(block, result.title), block, "jsonld", None, False))

        best_text, engine, score, summary = self.arbitrate(candidates, result.title)

        best_node = None
        if engine.startswith("selector:"):
            try:
                best_node = soup.select_one(engine.split("selector:", 1)[1])
            except Exception:
                best_node = None

        result.body_text = best_text
        result.engine = engine
        result.score = score
        result.candidates = summary
        result.images = self._extract_images(soup, self._base_url(url), best_node)
        result.comments = self._extract_comments(soup, source_code)
        result.status = BodyQualityGate.classify(best_text, has_images=len(result.images) > 0)
        if result.status == BODY_FAILED:
            result.error = result.error or (
                "no_extractable_body" if candidates else "selector_and_reader_miss"
            )
        return result

    async def extract_url(self, client: httpx.AsyncClient, url: str,
                          source_code: str = "", title_hint: str = "",
                          referer: Optional[str] = None) -> ExtractResult:
        """원문 URL 수급 → 하이브리드 추출 (실패 시 status='failed' + 사유 반환)."""
        if not url or not url.startswith("http"):
            return ExtractResult(url=url or "", status=BODY_FAILED, error="invalid_url")
        html, status, error, final_url = await self.fetch_page(
            client, url, referer=referer or self._base_url(url)
        )
        if html is None:
            return ExtractResult(
                url=url, status=BODY_FAILED,
                error=error or "fetch_failed", http_status=status or None,
            )
        result = self.extract_from_html(html, final_url or url, source_code, title_hint)
        result.http_status = status
        return result


# 전역 싱글턴 (Stateless — 매체 무관 재사용)
article_body_extractor = ArticleBodyExtractor()

