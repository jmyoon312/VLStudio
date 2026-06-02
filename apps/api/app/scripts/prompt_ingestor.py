import os
import json
import re
import argparse
from typing import List, Dict

# ---------------------------------------------------------
# GitHub Prompt Ingestor Pipeline
# ---------------------------------------------------------
# 1. GitHub의 검증된 프롬프트 모음집(awesome-video-prompts 등) Markdown을 스크랩
# 2. 정규식과 LLM을 이용해 원본 프롬프트를 분리
# 3. Bento Box 스키마(Camera, Lighting, Style)로 변환 후 JSON 저장
# ---------------------------------------------------------

BENTO_BOX_SCHEMA = {
    "id": "",
    "name": "",
    "category": "",
    "camera": "",
    "lighting": "",
    "style": ""
}

def parse_markdown_to_prompts(md_content: str) -> List[str]:
    """마크다운에서 프롬프트로 추정되는 텍스트 블록 추출"""
    # 아주 기초적인 추출기 (향후 LLM 적용 권장)
    prompts = re.findall(r'```text\n(.*?)\n```', md_content, re.DOTALL)
    return prompts

def simulate_llm_parsing(raw_prompt: str, category: str) -> Dict:
    """
    LLM을 통과시켜 원본 프롬프트를 4개의 모듈로 분해하는 로직 (Mock)
    실제 구현 시 Langchain / Groq 등을 사용하여 정밀하게 분해합니다.
    """
    # (Mock Logic)
    import hashlib
    pid = hashlib.md5(raw_prompt.encode()).hexdigest()[:8]
    
    return {
        "id": f"{category.lower()}_{pid}",
        "name": f"Imported {category} Skill",
        "category": category,
        "camera": "Dynamic camera movement extracted by LLM",
        "lighting": "Lighting and environment extracted by LLM",
        "style": "Aesthetic keywords extracted by LLM"
    }

def ingest_from_github(repo_url: str, category: str, output_dir: str):
    """지정된 GitHub 저장소에서 프롬프트를 긁어와 JSON 파츠로 변환"""
    print(f"[*] Ingesting from {repo_url} for category: {category}")
    # (Scraping logic goes here via requests or github api)
    
    # Mock Data for demonstration
    mock_md_content = """
    ## Best Cinematic Prompts
    ```text
    Slow dolly zoom on a subject, golden hour lighting, cinematic film grain, 8k, shot on 35mm
    ```
    """
    
    raw_prompts = parse_markdown_to_prompts(mock_md_content)
    parsed_skills = []
    for raw in raw_prompts:
        skill = simulate_llm_parsing(raw, category)
        parsed_skills.append(skill)
        
    output_file = os.path.join(output_dir, f"{category.lower()}.json")
    
    # Merge with existing if exists
    if os.path.exists(output_file):
        with open(output_file, 'r', encoding='utf-8') as f:
            existing = json.load(f)
            parsed_skills = existing + parsed_skills
            
    with open(output_file, 'w', encoding='utf-8') as f:
        json.dump(parsed_skills, f, indent=2, ensure_ascii=False)
        
    print(f"[+] Successfully ingested {len(raw_prompts)} skills into {output_file}")

if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="GitHub Prompt Ingestor")
    parser.add_argument("--url", required=True, help="GitHub repository URL")
    parser.add_argument("--category", required=True, help="Target category (e.g., Cinematic, Horror)")
    parser.add_argument("--output", default="../features/agent-studio/prompt-skills", help="Output directory")
    args = parser.parse_args()
    
    ingest_from_github(args.url, args.category, args.output)
