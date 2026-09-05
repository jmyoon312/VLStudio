import os
import json
import logging
from pathlib import Path
from typing import Dict, List, Optional

logger = logging.getLogger("memory_store")

class StudioMemoryStore:
    """
    Hermes Architecture-inspired Studio Memory & Skills Store.
    Maintains soul.md (identity/rules), memory.md (learnings/feedback),
    and skills/ (reusable playbooks and prompt recipes).
    """
    def __init__(self, base_dir: Optional[str] = None):
        if not base_dir:
            project_root = Path(__file__).resolve().parent.parent.parent.parent
            self.brain_dir = project_root / "data" / "studio_brain"
        else:
            self.brain_dir = Path(base_dir)

        self.skills_dir = self.brain_dir / "skills"
        self._ensure_initialized()

    def _ensure_initialized(self):
        try:
            self.brain_dir.mkdir(parents=True, exist_ok=True)
            self.skills_dir.mkdir(parents=True, exist_ok=True)

            soul_path = self.brain_dir / "soul.md"
            if not soul_path.exists():
                default_soul = (
                    "# ViraLoop Studio Brain: Soul & Identity\n\n"
                    "## 👑 정체성\n"
                    "- **이름**: 루피 (Loopie)\n"
                    "- **직책**: ViraLoop Studio 총괄 AI 디렉터 & 자율 영상 프로덕션 총감독\n"
                    "- **성향**: 통찰력 있고 신속하며, 1인 제작자의 성장을 전폭 지원하는 든든한 파트너\n\n"
                    "## 🎯 바이럴 영상 제작 10대 절대 원칙\n"
                    "1. **3초 후킹(3-Sec Hook)**: 첫 3초 이내에 시청자의 스크롤을 멈추는 강력한 시각/음성 질문 배치.\n"
                    "2. **페이싱(Pacing)**: 숏폼 기준 씬당 2~3초의 신속한 컷 전환으로 시청 지속률(Retention Rate) 극대화.\n"
                    "3. **사운드 밸런스**: 나레이션 음성은 선명하게, BGM은 -18dB~-22dB로 묻히지 않게 조절.\n"
                    "4. **스토리 아크**: 후킹(0~3초) ➔ 호기심 유발(3~15초) ➔ 핵심 전개(15~40초) ➔ 반전/결론(40~55초) ➔ 구독 유도(Call-To-Action).\n"
                    "5. **화풍 일관성**: 동일 프로젝트 내 캐릭터와 비주얼 톤앤매너(Cinematic / Real-Photo / Webtoon) 고정.\n"
                    "6. **자막 가독성**: 핵심 키워드는 노란색/형광색 포인트 컬러 및 애니메이션 적용.\n"
                    "7. **대량 양산 규격**: 모든 에셋은 표준 폴더 구조(05_Exports) 및 CapCut Draft 규격 준수.\n"
                )
                soul_path.write_text(default_soul, encoding="utf-8")

            memory_path = self.brain_dir / "memory.md"
            if not memory_path.exists():
                default_memory = (
                    "# ViraLoop Studio Brain: Long-term Learnings & Preferences\n\n"
                    "## 💡 누적 학습된 채널 선호도\n"
                    "- 질문형 제목('99%가 속고 있는 ~')이 일반 진술형 대비 조회수 약 35% 우세.\n"
                    "- 미스터리/야담 장르에서는 어둡고 시네마틱한 조명 프롬프트가 이탈률을 낮춤.\n"
                    "- 롱폼 컷팅 시 씬 전환 구간에 0.3초 화이트 플래시 또는 줌인 효과 선호.\n"
                )
                memory_path.write_text(default_memory, encoding="utf-8")

            # Default skills
            default_skill_path = self.skills_dir / "viral_hook_formulas.md"
            if not default_skill_path.exists():
                default_skill_path.write_text(
                    "# 바이럴 후킹 5대 공식 (Viral Hook Playbook)\n\n"
                    "1. **부정형 경고형**: '이 영상 안 보면 평생 손해봅니다.'\n"
                    "2. **비밀 폭로형**: '상위 1% 부자들만 몰래 쓰는 이 방법...'\n"
                    "3. **질문 유발형**: '조선시대 왕들은 왜 40세도 못 넘겼을까?'\n"
                    "4. **시각적 충격형**: '화면에 나오는 이 장면의 비밀을 아시나요?'\n"
                    "5. **역발상 도발형**: '열심히 일할수록 가난해지는 충격적인 이유.'\n",
                    encoding="utf-8"
                )
        except Exception as e:
            logger.error(f"[StudioMemoryStore] Init error: {e}")

    def get_soul(self) -> str:
        p = self.brain_dir / "soul.md"
        return p.read_text(encoding="utf-8") if p.exists() else ""

    def save_soul(self, content: str):
        p = self.brain_dir / "soul.md"
        p.write_text(content, encoding="utf-8")

    def get_memory(self) -> str:
        p = self.brain_dir / "memory.md"
        return p.read_text(encoding="utf-8") if p.exists() else ""

    def append_memory(self, note: str):
        p = self.brain_dir / "memory.md"
        current = self.get_memory()
        updated = current.strip() + f"\n- {note}\n"
        p.write_text(updated, encoding="utf-8")

    def list_skills(self) -> List[Dict[str, str]]:
        skills = []
        if self.skills_dir.exists():
            for f in self.skills_dir.glob("*.md"):
                skills.append({
                    "name": f.stem,
                    "filename": f.name,
                    "content": f.read_text(encoding="utf-8")
                })
        return skills

    def get_skill(self, name: str) -> Optional[str]:
        p = self.skills_dir / f"{name}.md"
        return p.read_text(encoding="utf-8") if p.exists() else None

    def save_skill(self, name: str, content: str):
        p = self.skills_dir / f"{name}.md"
        p.write_text(content, encoding="utf-8")

memory_store = StudioMemoryStore()
