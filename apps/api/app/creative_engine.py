from .llm_manager import LLMClient
import logging
from google.genai import types
import json
import re

logger = logging.getLogger(__name__)

class CreativeEngine:
    def __init__(self, llm_client: LLMClient):
        self.llm_client = llm_client

    def analyze_style_image(self, image_data: bytes, provider: str = None, model: str = None) -> dict:
        """
        Analyzes an image to extract style prompts using Gemini Vision or compatible providers.
        """
        # Resolve dynamic defaults from settings
        target_provider = provider or getattr(self.llm_client.settings, "paperclip_provider", "google")
        target_model = model or getattr(self.llm_client.settings, "paperclip_model", self.llm_client.settings.default_model)
        try:
            prompt = """
            Analyze the artistic style of this image. 
            **IGNORE specific subjects** (people, objects, characters). 
            Focus ONLY on the visual technique and aesthetics.

            Extract the following details:
            1. Artistic Medium (e.g., Oil Painting, 3D Render, Polaroid, Anime)
            2. Lighting & Atmosphere (e.g., Volumetric lighting, Golden hour, Neon noir)
            3. Color Palette (e.g., Teal and Orange, Pastel, High Contrast, Monochrome)
            4. Camera/Lens Properties (e.g., Wide angle, Bokeh, Film grain, 35mm)

            Output ONLY a JSON object with these keys:
            {
                "style_prompt": "A comma-separated string of the extracted style keywords suitable for Stable Diffusion/Midjourney. Do NOT include subject descriptions.",
                "negative_prompt": "Common negative prompts suitable for this style (e.g., low quality, blurry, distorted)"
            }
            """
            
            # Construct model name based on provider
            full_model_name = target_model
            if target_provider == "openrouter" and not full_model_name.startswith("openrouter/"):
                full_model_name = f"openrouter/{full_model_name}"
            elif target_provider == "groq" and not full_model_name.startswith("groq/"):
                full_model_name = f"groq/{full_model_name}"
            
            # Pass raw bytes (LLMManager handles formatting)
            response = self.llm_client.generate_content(
                prompt=prompt,
                model_name=full_model_name,
                images=[image_data],
                full_response=False
            )
            
            text = response
            if isinstance(response, dict):
                text = response.get("content", "")
            
            if text.startswith("Error:"):
                raise RuntimeError(text)
                
            # Extract JSON block
            match = re.search(r'\{.*\}', text, re.DOTALL)
            if match:
                json_str = match.group(0)
                return json.loads(json_str)
            else:
                logger.warning("Could not parse JSON from style analysis, returning raw text.")
                return {"style_prompt": text, "negative_prompt": ""}

        except Exception as e:
            logger.error(f"Style Analysis Failed: {e}")
            raise e

    def segment_script(self, text: str, mode: str = "shorts", provider: str = None, model: str = None, style_prompt: str = "", split_method: str = "ai_smart", pacing_config: dict = None) -> list:
        """
        Splits a script into scenes and generates visual prompts based on the selected method.
        """
        # Resolve dynamic defaults from settings (환경설정에 지정된 설정값을 그대로 실시간 연동)
        target_provider = provider if provider and provider != "auto" else getattr(self.llm_client.settings, "script_analysis_provider", None) or getattr(self.llm_client.settings, "paperclip_provider", None) or getattr(self.llm_client.settings, "openclaw_preferred_provider", None)
        target_model = model if model and model != "default" else getattr(self.llm_client.settings, "script_analysis_model", None) or getattr(self.llm_client.settings, "default_llm_model", None) or getattr(self.llm_client.settings, "paperclip_model", None) or "youtube1"
        
        # 0. Custom Rule Logic (사용자가 명시적으로 커스텀 규칙을 선택한 경우에만 분할)
        if split_method == 'custom_rule' and pacing_config:
            return self._split_by_rule(text, pacing_config)

        # Helper to clean text
        cleaned_text = text.replace("\r\n", "\n").strip()

        # 1. AI-Based Splitting ('ai_smart', 'visual_change', 'semantic')
        pacing_instruction = ""
        aspect_ratio = "9:16" if mode == 'shorts' else "16:9"
        
        if split_method == 'visual_change':
            pacing_instruction = (
                "SPLIT STRATEGY: VISUAL CHANGE FOCUSED.\n"
                "- Create a new scene ONLY when the location, subject, or camera perspective changes dramatically.\n"
                "- STRICT RULE: NEVER split line-by-line or sentence-by-sentence. Combine 2 to 4 sentences that describe the same action, place, or emotional beat into ONE single scene.\n"
                "- Focus purely on 'What the viewer sees on screen'."
            )
        elif split_method == 'semantic':
            pacing_instruction = (
                "SPLIT STRATEGY: SEMANTIC & DURATION AUTO-OPTIMIZATION.\n"
                "- Group logically connected sentences into coherent narrative units (typically 2 to 4 sentences per scene).\n"
                "- STRICT RULE: DO NOT split on every line break or every short sentence. Merge consecutive lines that form a single cohesive thought or action.\n"
                "- Target duration: Each scene should naturally cover 3 to 6 seconds of narration."
            )
        elif mode == 'shorts':
            pacing_instruction = (
                "MODE: YOUTUBE SHORTS (Fast Paced & Hook-driven).\n"
                "- SPLIT RULE: Group **2 to 3 sentences** per scene based on semantic flow.\n"
                "- STRICT RULE: Do NOT split every single sentence. Combine short consecutive sentences.\n"
                "- Ensure each scene represents a meaningful visual moment."
            )
        else: # long-form
            pacing_instruction = (
                "MODE: LONG-FORM VIDEO (Cinematic Narrative).\n"
                "- SPLIT RULE: Group **1 to 2 Paragraphs** (or 3-5 sentences) into one scene.\n"
                "- Maintain smooth narrative continuity. Only create a new scene when topic or setting shifts."
            )

        # 2. Style Instruction (Refactored for Injection at END)
        style_context = ""
        if style_prompt:
            style_context = f'GLOBAL STYLE: "{style_prompt}"'

        prompt = f"""
        You are an expert AI Video Director.
        Your goal is to split the input script into meaningful narrative scenes and write a **Visual Prompt (Image)** and a **Video Prompt (Motion)** for each scene.
        
        METHOD: {split_method.upper()}
        {style_context}
        {pacing_instruction}
        Target Aspect Ratio: {aspect_ratio}

        CRITICAL SPLITTING RULES:
        1. **NEVER output 1 scene per single line/sentence** unless the input script only has 1 sentence total. You MUST intelligently combine lines that share the same context or setting.
        2. The "script" field of each scene must contain the full combined Korean text for that scene.

        INSTRUCTIONS FOR PROMPTS:
        0. **Cultural & Era Context Extraction**:
           - Deduce the exact cultural/historical era from the script (e.g. Joseon Dynasty Korea, Modern Seoul, Sci-Fi).
           - Characters, clothing (Hanbok), architecture (Hanok), props MUST accurately reflect this era.
        1. **visual_prompt (Image Prompt)**: 
           - MUST BE IN DETAILED VIVID ENGLISH. DO NOT copy or repeat the Korean script verbatim.
           - Structure: `[Aspect Ratio], [Camera Angle/Shot Type], [Detailed Subject + Action + Clothing], [Environment/Setting/Architecture], [Lighting/Atmosphere], [Art Style]`
           - Inject Global Style at the end.
        2. **video_prompt (Motion Prompt)**:
           - MUST BE IN ENGLISH: Focus STRICTLY on camera movement (panning, zooming, tracking) and subject motion.
           - Keep it concise and cinematic (e.g. "Camera slowly zooms in, scholar bows respectfully as villagers gather around").

        CRITICAL TARGET SCENE COUNT:
        - For 60-second shorts or short stories (5-10 sentences), group them into **3 to 5 cohesive scenes total**.
        - NEVER output 1 scene per line. Merge 2 to 3 consecutive sentences per scene.

        Input Script:
        {text}

        Output ONLY a valid JSON list of objects:
        [
            {{
                "scene_id": 1,
                "script": "...",
                "visual_prompt": "{aspect_ratio}, ...",
                "video_prompt": "..."
            }}
        ]
        """
        
        # 1. 작업 환경 설정에 지정된 모델(DB Settings)을 그대로 실시간 실행
        full_model_name = target_model or getattr(self.llm_client.settings, "script_analysis_model", None) or getattr(self.llm_client.settings, "default_llm_model", None)

        system_instruction = (
            "You are a professional AI Video Director and strict JSON API engine. "
            "You MUST output ONLY a valid JSON array of scene objects. "
            "NEVER output conversational filler, polite greetings, or explanations. "
            "Every visual_prompt MUST be in vivid, detailed English (never copy the Korean script verbatim into visual_prompt). "
            "Output valid RFC 8259 JSON array only."
        )

        try:
            response = self.llm_client.generate_content(
                prompt=prompt,
                model_name=full_model_name,
                system_instruction=system_instruction,
                full_response=False
            )
            
            text_resp = response
            if isinstance(response, dict):
                text_resp = response.get("content", "")
            
            if text_resp and not str(text_resp).startswith("ERROR:"):
                # Clean markdown code blocks
                cleaned_resp = re.sub(r'```json\s*', '', str(text_resp), flags=re.IGNORECASE)
                cleaned_resp = re.sub(r'```\s*', '', cleaned_resp)
                cleaned_resp = cleaned_resp.strip()

                # Extract JSON array using regex
                match = re.search(r'\[\s*\{.*\}\s*\]', cleaned_resp, re.DOTALL)
                if match:
                    json_str = match.group(0)
                    parsed = json.loads(json_str)
                    if isinstance(parsed, list) and len(parsed) > 0:
                        normalized = []
                        for i, s in enumerate(parsed):
                            vp = str(s.get("visual_prompt", "")).strip()
                            # 1. aspect ratio 중복 제거
                            vp = re.sub(r'^(9:16|16:9)[,\s]+', '', vp, flags=re.IGNORECASE).strip()
                            vp = re.sub(r'^(9:16|16:9)[,\s]+', '', vp, flags=re.IGNORECASE).strip()

                            # 2. 잡담/번역/한국어 수다 필터링 및 자가치유
                            is_filler = any(kw in vp for kw in ["도와드릴까요", "번역", "한국어", "문법", "어떤 이야기", "궁금하네요", "안녕하세요", "이야기"])
                            has_excessive_korean = len(re.findall(r'[\uac00-\ud7a3]', vp)) > 6

                            if is_filler or has_excessive_korean or len(vp) < 10:
                                vp = f"Eye-level medium shot, Joseon Dynasty Korean historical setting, person in traditional hanbok, authentic hanok architecture, warm atmospheric lighting, {style_prompt}".strip(", ")

                            final_vp = f"{aspect_ratio}, {vp}".rstrip(", ")
                            vid_p = str(s.get("video_prompt", "")).strip()
                            if not vid_p or any(kw in vid_p for kw in ["도와드릴까요", "번역"]):
                                vid_p = "Camera slowly zooms in, subtle cinematic motion"

                            normalized.append({
                                "scene_id": s.get("scene_id", i + 1),
                                "script": s.get("script", ""),
                                "visual_prompt": final_vp,
                                "video_prompt": vid_p
                            })
                        return normalized
                
                # Fallback direct parse
                try:
                    parsed = json.loads(cleaned_resp)
                    if isinstance(parsed, list) and len(parsed) > 0:
                        normalized = []
                        for i, s in enumerate(parsed):
                            vp = str(s.get("visual_prompt", "")).strip()
                            vp = re.sub(r'^(9:16|16:9)[,\s]+', '', vp, flags=re.IGNORECASE).strip()
                            vp = re.sub(r'^(9:16|16:9)[,\s]+', '', vp, flags=re.IGNORECASE).strip()

                            is_filler = any(kw in vp for kw in ["도와드릴까요", "번역", "한국어", "문법", "어떤 이야기", "궁금하네요", "안녕하세요", "이야기"])
                            has_excessive_korean = len(re.findall(r'[\uac00-\ud7a3]', vp)) > 6

                            if is_filler or has_excessive_korean or len(vp) < 10:
                                vp = f"Eye-level medium shot, Joseon Dynasty Korean historical setting, person in traditional hanbok, authentic hanok architecture, warm atmospheric lighting, {style_prompt}".strip(", ")

                            final_vp = f"{aspect_ratio}, {vp}".rstrip(", ")
                            vid_p = str(s.get("video_prompt", "")).strip()
                            if not vid_p or any(kw in vid_p for kw in ["도와드릴까요", "번역"]):
                                vid_p = "Camera slowly zooms in, subtle cinematic motion"

                            normalized.append({
                                "scene_id": s.get("scene_id", i + 1),
                                "script": s.get("script", ""),
                                "visual_prompt": final_vp,
                                "video_prompt": vid_p
                            })
                        return normalized
                except:
                    pass
        except Exception as e:
            logger.warning(f"[ROUTER] Internal router fallback triggered: {e}")

        # 2. 스마트 씬 파서 (줄바꿈/문장 기반 즉각 자가치유 분할)
        lines = [l.strip() for l in cleaned_text.split('\n') if l.strip()]
        if not lines:
            lines = [cleaned_text]

        results = []
        for idx, line in enumerate(lines):
            results.append({
                "scene_id": idx + 1,
                "script": line,
                "visual_prompt": f"{aspect_ratio}, Cinematic scene, {line}, {style_prompt}".strip(", "),
                "video_prompt": "Camera slowly zooms in, subtle cinematic motion"
            })
        return results

    def generate_visual_prompt(self, script: str, style_context: str = "", provider: str = None, model: str = None) -> dict:
        """
        Generates a visual prompt for a single scene using the dynamic model.
        """
        target_model = model or getattr(self.llm_client.settings, "script_analysis_model", None) or getattr(self.llm_client.settings, "default_llm_model", None) or "youtube1"
        
        system_prompt = f"""You are a Visual Director. Create a vivid English image description and motion description for this script line. Style: '{style_context}'.
        
        CRITICAL RULES:
        1. Output MUST be in detailed, rich ENGLISH (never repeat Korean script).
        2. Deduce era/culture (e.g. Joseon Dynasty, Hanbok, Hanok).
        
        Output MUST be a valid JSON object:
        {{
            "visual_prompt": "[Camera Angle], [Cultural & Era Context], [Subject + Action], [Background/Environment], [Lighting], [Style]",
            "video_prompt": "Motion prompt focusing on camera movement."
        }}
        """

        try:
            response = self.llm_client.generate_content(
                prompt=script, 
                model_name=target_model,
                system_instruction=system_prompt,
                full_response=False
            )
            text_resp = response if isinstance(response, str) else response.get("content", "")
            match = re.search(r'\{.*\}', text_resp, re.DOTALL)
            if match:
                return json.loads(match.group(0))
            return {"visual_prompt": text_resp, "video_prompt": "Camera slowly pans, subtle movement"}
        except Exception as e:
            logger.error(f"Visual Prompt Generation Failed: {e}")
            return {
                "visual_prompt": f"Eye-level cinematic shot, Joseon Dynasty Korean historical setting, traditional hanbok, authentic architecture, {style_context}".strip(", "), 
                "video_prompt": "Camera slowly pans, subtle movement"
            }


    def _split_by_rule(self, text: str, config: dict) -> list:
        """
        Splits text based on rigid rules: 'sentence_count' or 'time_duration'.
        """
        unit = config.get('unit', 'sentence') # 'sentence', 'time'
        value = int(config.get('value', 1))
        
        # 1. Base Sentence Split (Regex)
        cleaned_text = text.replace("\r\n", "\n").strip()
        # Strong split pattern: Punctuation followed by space or newline
        pattern = r'(?<=[.?!])\s+|(?<=[다요죠까])[\.\?!]?\s+(?=[A-Z가-힣])|\n{2,}'
        raw_sentences = re.split(pattern, cleaned_text)
        sentences = [s.strip() for s in raw_sentences if s.strip()]
        
        if not sentences: return [text]

        grouped_segments = []
        
        if unit == 'sentence':
            # Group every N sentences
            chunk = []
            for s in sentences:
                chunk.append(s)
                if len(chunk) >= value:
                    grouped_segments.append(" ".join(chunk))
                    chunk = []
            if chunk: grouped_segments.append(" ".join(chunk))
            
        elif unit == 'time':
            # Estimate Duration and Group
            # Rule of thumb: 15 chars (Korean) or 30 chars (English) ≈ 1 second?
            # Let's say 5 chars = 1 second (very rough, safe for pacing)
            # Better: 50ms per character -> 20 chars / sec.
            CHAR_PER_SEC = 15 # Conservative reading speed
            
            target_chars = value * CHAR_PER_SEC
            
            chunk = []
            current_len = 0
            
            for s in sentences:
                s_len = len(s)
                if current_len + s_len > target_chars and chunk:
                    # Current chunk is full, push it
                    grouped_segments.append(" ".join(chunk))
                    chunk = [s]
                    current_len = s_len
                else:
                    chunk.append(s)
                    current_len += s_len
            
            if chunk: grouped_segments.append(" ".join(chunk))
            
        else:
            return sentences # Fallback
            
        return grouped_segments

