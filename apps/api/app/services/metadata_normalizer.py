"""
Metadata Normalizer Service (Single Source of Truth for Video Metadata)
Standardizes descriptions, hashtags, and search tags across diverse video generation pipelines
(AI scripts, Pixeling, Excel imports, manual inputs) to guarantee 0% duplicate hashtags and
clean YouTube Studio formatting.
"""
import re
from typing import List, Tuple, Dict, Any, Optional


def extract_hashtags_from_text(text: Optional[str]) -> List[str]:
    """텍스트 본문에서 #으로 시작하는 모든 해시태그 토큰을 추출 (순서 보존 및 중복 제거)"""
    if not text:
        return []
    # 한글, 영문, 숫자, 밑줄 포함 해시태그 패턴
    pattern = r'#([A-Za-z0-9가-힣_]+)'
    matches = re.findall(pattern, text)
    
    seen = set()
    unique_tags = []
    for m in matches:
        tag = f"#{m}"
        lower_tag = tag.lower()
        if lower_tag not in seen:
            seen.add(lower_tag)
            unique_tags.append(tag)
    return unique_tags


def clean_description_body(text: Optional[str]) -> str:
    """
    설명란 본문에서 순수 해시태그로만 이루어진 줄(상단/중간/하단)이나
    문장 끝에 달린 중복 꼬리표 해시태그를 제거하여,
    깨끗하고 정갈한 서사/소개 본문 텍스트만 남깁니다.
    """
    if not text:
        return ""
    
    lines = text.strip().split('\n')
    cleaned_lines = []
    
    for line in lines:
        stripped = line.strip()
        if not stripped:
            cleaned_lines.append('')
            continue
        
        tokens = stripped.split()
        # 줄 전체가 #해시태그로만 이루어진 경우 제거
        if tokens and all(t.startswith('#') for t in tokens):
            continue
            
        # 문장 끝자락에 연이어 붙어 있는 해시태그 제거 (예: "재미있는 영상입니다! #쇼츠 #꿀팁")
        cleaned_line = re.sub(r'(?:\s*#[A-Za-z0-9가-힣_]+)+$', '', stripped).rstrip()
        cleaned_lines.append(cleaned_line)
        
    # 연속된 빈 줄 정리 (최대 1줄 빈줄 유지)
    result_lines = []
    prev_empty = False
    for l in cleaned_lines:
        if not l:
            if not prev_empty:
                result_lines.append('')
                prev_empty = True
        else:
            result_lines.append(l)
            prev_empty = False
            
    return '\n'.join(result_lines).strip()


def strip_trailing_hashtags(text: Optional[str]) -> str:
    """하위 호환성을 위한 래퍼"""
    return clean_description_body(text)


def merge_and_deduplicate_hashtags(
    tags_a: Optional[Any],
    tags_b: Optional[Any] = None
) -> List[str]:
    """
    두 출처의 해시태그를 병합하고 대소문자 무시 중복을 제거합니다.
    #Shorts 또는 #쇼츠가 존재할 경우 맨 앞으로 배치합니다.
    """
    def to_list(t):
        if not t:
            return []
        if isinstance(t, list):
            res = []
            for item in t:
                if isinstance(item, str):
                    for sub in re.split(r'[\s,]+', item):
                        sub = sub.strip()
                        if sub:
                            res.append(sub if sub.startswith('#') else f"#{sub}")
            return res
        if isinstance(t, str):
            res = []
            for sub in re.split(r'[\s,]+', t):
                sub = sub.strip()
                if sub:
                    res.append(sub if sub.startswith('#') else f"#{sub}")
            return res
        return []

    combined = to_list(tags_a) + to_list(tags_b)
    
    seen = set()
    result = []
    shorts_tag = None

    for tag in combined:
        tag_clean = tag.strip()
        if not tag_clean or tag_clean == "#":
            continue
        if not tag_clean.startswith('#'):
            tag_clean = f"#{tag_clean}"
            
        lower_tag = tag_clean.lower()
        if lower_tag in seen:
            continue
        seen.add(lower_tag)
        
        # 쇼츠 핵심 태그는 맨 앞으로 우선 배치
        if lower_tag in ("#shorts", "#쇼츠") and not shorts_tag:
            shorts_tag = tag_clean
        else:
            result.append(tag_clean)
            
    if shorts_tag:
        result.insert(0, shorts_tag)
        
    return result


def clean_search_tags(tags: Optional[Any]) -> List[str]:
    """
    YouTube Studio '자세히 표시'의 태그 칩으로 사용될 검색 태그들을 정제합니다.
    # 기호를 제거하고, 콤마/공백 분리, 중복 제거.
    """
    if not tags:
        return []
        
    raw_list = []
    if isinstance(tags, list):
        for item in tags:
            if isinstance(item, str):
                for sub in item.split(','):
                    sub = sub.strip()
                    if sub:
                        raw_list.append(sub)
    elif isinstance(tags, str):
        for sub in tags.split(','):
            sub = sub.strip()
            if sub:
                raw_list.append(sub)
                
    seen = set()
    cleaned = []
    for t in raw_list:
        # # 제거
        t_clean = re.sub(r'^#+', '', t).strip()
        if not t_clean:
            continue
        t_lower = t_clean.lower()
        if t_lower not in seen:
            seen.add(t_lower)
            cleaned.append(t_clean)
            
    return cleaned


def normalize_item_metadata(
    description: Optional[str],
    hashtags: Optional[Any] = None,
    tags: Optional[Any] = None
) -> Dict[str, Any]:
    """
    영상 메타데이터를 전역 표준 규격으로 완벽 정규화합니다:
    1. description에서 본문과 꼬리표 해시태그를 분리
    2. hashtags와 description 내 해시태그를 병합 및 중복 0% 제거
    3. search tags에서 # 제거 및 칩 규격으로 정제
    4. 최종 youtube_description: [정제된 본문] + [중복 없는 해시태그 단 1회 결합]
    """
    raw_desc = (description or "").strip()
    
    # 1. 본문에서 해시태그 추출
    desc_hashtags = extract_hashtags_from_text(raw_desc)
    
    # 2. 본문 끝의 중복 해시태그 묶음 정리
    clean_desc = strip_trailing_hashtags(raw_desc)
    
    # 3. 해시태그 통합 및 중복 제거
    unified_hashtags = merge_and_deduplicate_hashtags(desc_hashtags, hashtags)
    
    # 4. 검색 태그 정제
    cleaned_tags = clean_search_tags(tags)
    
    # 5. 유튜브 업로드용 최종 설명문 생성
    if unified_hashtags:
        hashtags_block = " ".join(unified_hashtags)
        if clean_desc:
            youtube_desc = f"{clean_desc}\n\n{hashtags_block}"
        else:
            youtube_desc = hashtags_block
    else:
        youtube_desc = clean_desc
        
    return {
        "clean_description": clean_desc,
        "hashtags": unified_hashtags,
        "tags": cleaned_tags,
        "youtube_description": youtube_desc
    }
