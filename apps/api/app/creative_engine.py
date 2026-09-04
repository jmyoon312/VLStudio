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

        prompt = f"""You are an award-winning AI Film Director and Visual Storyteller.
Split the input script into 3 to 5 scenes and create a highly detailed, culturally coherent English Visual Keyframe Prompt and a 4-Layer Cinematic Video Motion Prompt (I2V) for each scene.

[GLOBAL CONSISTENCY & CULTURAL ANCHOR RULES]
1. GLOBAL CHARACTER & WORLD SHEET:
   - Identify the persistent Main Character(s): Define exact age, gender, facial traits, hairstyle (e.g. topknot/sangtusan), and exact clothing colors/materials (e.g. deep navy silk Hanbok). Keep this character's appearance IDENTICAL across all scenes.
   - Era & Setting: If Korean historical/folklore (Joseon Dynasty/Yadam), ensure setting is authentic Hanok architecture with Giwa tiled roof, wooden daecheongmaru floor, and paper changhoji sliding doors.
   - STRICT CULTURAL ISOLATION: NEVER output Japanese clothing (kimono, yukata, samurai, obi) or Chinese clothing (hanfu, qipao). Every Korean historical scene MUST use authentic Korean Hanbok.

2. 'visual_prompt' (Keyframe Image Prompt):
   - Format: "{aspect_ratio}, [Camera Shot & Angle], [Authentic Era & Setting], [Persistent Character with exact clothing & appearance], [Scene-specific Action/Pose/Emotion], [Atmospheric Lighting & Mood], {style_prompt}"
   - Must be vivid, detailed, natural English. Never copy Korean text.

3. 'video_prompt' (Image-to-Video Cinematic 4-Layer Motion Prompt):
   - Layer 1 (Subject Action & Micro-expressions): Realistic narrative movement matching the script (e.g. 'Character slowly turns head toward the camera with an intense emotional gaze, subtle blinking and gentle breathing').
   - Layer 2 (Environmental & Secondary Physics): Dynamic elements (e.g. 'Gentle breeze rippling the silk Hanbok fabric and loose hair strands, warm lantern flame flickering, soft dust particles floating in the volumetric light beam').
   - Layer 3 (Cinematic Camera Direction): Expressive camera movement (e.g. 'Slow dramatic push-in tracking shot on the character's face', 'Gentle horizontal tracking pan revealing the background').
   - Layer 4 (Coherence): 'Smooth 24fps fluid motion, seamless natural physics, cinematic depth of field'.

Input Script:
{text}

Output JSON Array ONLY:
[
  {{
    "scene_id": 1,
    "script": "Combined Korean narration for this scene",
    "visual_prompt": "{aspect_ratio}, ...",
    "video_prompt": "..."
  }}
]"""
        
        # 1. 작업 환경 설정에 지정된 모델(DB Settings)을 그대로 실시간 실행
        full_model_name = target_model or getattr(self.llm_client.settings, "script_analysis_model", None) or getattr(self.llm_client.settings, "default_llm_model", None)

        system_instruction = (
            "You are a professional AI Film Director, Cinematographer, and strict JSON API engine. "
            "You MUST output ONLY a valid JSON array of scene objects. "
            "NEVER output conversational filler, markdown formatting outside JSON, polite greetings, or explanations. "
            "Ensure cross-scene character appearance consistency and strict cultural accuracy (Korean Joseon Hanbok/Hanok, strictly no Japanese/Chinese confusion). "
            "Every visual_prompt and video_prompt MUST be in rich, cinematic English. "
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
                                vp = f"Eye-level cinematic shot, authentic Joseon Dynasty Korean historical setting, Korean scholar in traditional fine silk Hanbok, authentic wooden Hanok architecture with Giwa tiled roof, warm atmospheric lighting, {style_prompt}".strip(", ")

                            final_vp = f"{aspect_ratio}, {vp}".rstrip(", ")
                            vid_p = str(s.get("video_prompt", "")).strip()
                            if not vid_p or any(kw in vid_p for kw in ["도와드릴까요", "번역"]) or len(vid_p) < 15:
                                vid_p = "Slow cinematic push-in tracking shot, subtle emotional gaze shift and natural blinking, gentle breeze softly rippling the silk Hanbok fabric, 24fps fluid motion"

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
                                vp = f"Eye-level cinematic shot, authentic Joseon Dynasty Korean historical setting, Korean scholar in traditional fine silk Hanbok, authentic wooden Hanok architecture with Giwa tiled roof, warm atmospheric lighting, {style_prompt}".strip(", ")

                            final_vp = f"{aspect_ratio}, {vp}".rstrip(", ")
                            vid_p = str(s.get("video_prompt", "")).strip()
                            if not vid_p or any(kw in vid_p for kw in ["도와드릴까요", "번역"]) or len(vid_p) < 15:
                                vid_p = "Slow cinematic push-in tracking shot, subtle emotional gaze shift and natural blinking, gentle breeze softly rippling the silk Hanbok fabric, 24fps fluid motion"

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
                "visual_prompt": f"{aspect_ratio}, Cinematic scene, authentic Joseon Dynasty Korean setting, {line}, {style_prompt}".strip(", "),
                "video_prompt": "Slow cinematic push-in tracking shot, subtle emotional gaze shift and natural blinking, gentle breeze softly rippling the silk Hanbok fabric, 24fps fluid motion"
            })
        return results

    def generate_visual_prompt(self, script: str, style_context: str = "", provider: str = None, model: str = None) -> dict:
        """
        Generates a visual prompt for a single scene using the dynamic model.
        """
        target_model = model or getattr(self.llm_client.settings, "script_analysis_model", None) or getattr(self.llm_client.settings, "default_llm_model", None) or "youtube1"
        
        system_prompt = f"""You are a Master Visual Director and Cinematographer. Create a vivid, culturally accurate English image keyframe description and a 4-layer cinematic motion prompt for this script line. Style: '{style_context}'.
        
        CRITICAL RULES:
        1. Output MUST be in detailed, rich, evocative ENGLISH (never repeat Korean script).
        2. Deduce era/culture: If Korean historical/folklore, enforce authentic Joseon Dynasty Korean Hanbok and Hanok architecture. Strictly NO Japanese kimono or Chinese hanfu.
        3. 'video_prompt': Provide a 4-layer cinematic motion prompt (Subject Action & Micro-expressions + Secondary Environmental Physics + Camera Motion + 24fps fluid motion).
        
        Output MUST be a valid JSON object:
        {{
            "visual_prompt": "[Camera Angle], [Authentic Cultural & Era Context], [Subject Appearance & Action], [Background/Environment], [Lighting & Mood], [Style]",
            "video_prompt": "[Subject micro-expression & motion], [environmental physics], [cinematic camera movement], 24fps fluid motion"
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
                parsed = json.loads(match.group(0))
                vid_p = parsed.get("video_prompt", "")
                if not vid_p or len(vid_p) < 15:
                    parsed["video_prompt"] = "Slow cinematic push-in tracking shot, subtle emotional gaze shift and natural blinking, gentle breeze softly rippling the silk Hanbok fabric, 24fps fluid motion"
                return parsed
            return {
                "visual_prompt": text_resp, 
                "video_prompt": "Slow cinematic push-in tracking shot, subtle emotional gaze shift and natural blinking, gentle breeze softly rippling the silk Hanbok fabric, 24fps fluid motion"
            }
        except Exception as e:
            logger.error(f"Visual Prompt Generation Failed: {e}")
            return {
                "visual_prompt": f"Eye-level cinematic shot, authentic Joseon Dynasty Korean historical setting, Korean scholar in traditional fine silk Hanbok, authentic wooden Hanok architecture with Giwa tiled roof, warm atmospheric lighting, {style_context}".strip(", "), 
                "video_prompt": "Slow cinematic push-in tracking shot, subtle emotional gaze shift and natural blinking, gentle breeze softly rippling the silk Hanbok fabric, 24fps fluid motion"
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


    def rewrite_script_dual_track(
        self,
        source_script: str,
        track: str = "shorts",
        style_tone: str = "바이럴 흥미 유발",
        model: str = None
    ) -> dict:
        """
        Dual-track AI script adaptation:
        - track == 'shorts': 50-second viral 3-act compressed adaptation (280-360 chars, hook + tension + climax/CTA)
        - track == 'longform': 100% original deep re-creation (1,200-2,500 chars, complete narrative rewrite preventing any copyright dispute)
        Uses DB Settings (LLMClient) dynamically without hardcoding.
        """
        target_model = model or getattr(self.llm_client.settings, "script_analysis_model", None) or getattr(self.llm_client.settings, "default_llm_model", None) or "youtube1"

        if track == "shorts":
            system_instruction = (
                "당신은 유튜브 쇼츠 및 틱톡 1,000만 조회수 전문 숏폼 크리에이티브 디렉터이자 바이럴 대본 작가입니다. "
                "주어진 원본 대본이나 자막을 분석하여, 딱 50초 낭독 호흡(한국어 공백 포함 280~360자)에 맞춰 완벽한 3단 구조로 각색하십시오.\n"
                "1. [0~3초 훅]: 시청자가 손가락을 멈추지 않을 수 없는 충격적 질문, 강렬한 사실, 상식을 깨는 한 문장.\n"
                "2. [전개 및 갈등]: 핵심 알맹이만 압축 전달하고 지루한 서두/군더더기 100% 제거.\n"
                "3. [결말 및 반전/CTA]: 예상 밖의 통쾌한 마무리 또는 자연스러운 댓글/저장 유도.\n"
                "반드시 유효한 JSON 형식으로만 응답하십시오: "
                '{"title": "쇼츠 제목", "hook": "3초 바이럴 훅 첫 문장", "script": "50초 전체 나레이션 대본", "estimated_duration_sec": 50}'
            )
            prompt = f"다음 원본 텍스트를 50초 초고속 바이럴 쇼츠로 각색해줘:\n\n{source_script}\n\n톤앤매너: {style_tone}"
        else:
            system_instruction = (
                "당신은 최고 권위의 롱폼 다큐멘터리/스토리텔링 전문 시나리오 작가입니다. "
                "제공된 원본 텍스트의 '핵심 주제와 흥미로운 모티브'만을 차용하여, 저작권 및 표절 시비를 100% 원천 차단하는 '완전한 100% 오리지널 전면 재창작(Deep Re-creation)' 롱폼 대본(분량: 1,200자~2,500자 내외, 3~5분 영상 분량)을 집필하십시오.\n"
                "서론(몰입감 넘치는 도입) -> 본론(3~4단계 심층 전개, 구체적 예시, 드라마틱한 긴장감) -> 결론(깊은 인사이트와 여운)의 탄탄한 기승전결을 갖추어야 합니다.\n"
                "반드시 유효한 JSON 형식으로만 응답하십시오: "
                '{"title": "롱폼 다큐/스토리 제목", "hook": "도입부 훅 문장", "script": "전체 롱폼 나레이션 대본 전문", "estimated_duration_sec": 240}'
            )
            prompt = f"다음 원본 텍스트의 핵심 모티브를 바탕으로 100% 오리지널 롱폼 창작 대본을 완성해줘:\n\n{source_script}\n\n톤앤매너: {style_tone}"

        try:
            response = self.llm_client.generate_content(
                prompt=prompt,
                model_name=target_model,
                system_instruction=system_instruction,
                full_response=False
            )
            text_resp = response.get("content", "") if isinstance(response, dict) else str(response)
            cleaned = re.sub(r'```json\s*', '', text_resp, flags=re.IGNORECASE)
            cleaned = re.sub(r'```\s*', '', cleaned).strip()
            match = re.search(r'\{.*\}', cleaned, re.DOTALL)
            if match:
                data = json.loads(match.group(0))
                data["model_used"] = target_model
                data["track"] = track
                return data
            return {
                "title": f"각색된 {track} 대본",
                "hook": source_script[:40],
                "script": text_resp,
                "estimated_duration_sec": 50 if track == "shorts" else 240,
                "model_used": target_model,
                "track": track
            }
        except Exception as e:
            logger.error(f"Dual-track script adaptation failed: {e}")
            raise e

    def extract_anchor_references(self, script_text: str, model: str = None) -> dict:
        """
        Extracts key recurring visual entities (characters, environments, props) from a script
        to ensure visual identity consistency across scenes in CreativeStudio (Flow AI).
        """
        target_model = model or getattr(self.llm_client.settings, "script_analysis_model", None) or getattr(self.llm_client.settings, "default_llm_model", None) or "youtube1"

        system_instruction = (
            "You are a Lead Concept Artist and Character/Environment Reference Supervisor for cinematic AI production. "
            "Analyze the given script and identify recurring visual entities that require strict cross-scene visual consistency.\n"
            "Extract: \n"
            "1. characters: recurring people/creatures (name, visual_anchor_prompt in rich cinematic English describing face, age, hair, clothing, physical traits)\n"
            "2. environments: recurring locations/settings (name, visual_anchor_prompt in rich cinematic English describing architecture, lighting, atmosphere, materials)\n"
            "3. props: recurring key objects/items (name, visual_anchor_prompt in rich cinematic English describing shape, texture, luminescence)\n"
            "Output strictly a JSON object with keys: characters, environments, props.\n"
            'Example: {"characters": [{"name": "...", "anchor_prompt": "..."}], "environments": [{"name": "...", "anchor_prompt": "..."}], "props": []}'
        )

        prompt = f"다음 대본에서 시각적 일관성을 유지해야 할 핵심 인물, 배경, 사물을 추출하고 앵커 프롬프트를 작성해줘:\n\n{script_text}"

        try:
            response = self.llm_client.generate_content(
                prompt=prompt,
                model_name=target_model,
                system_instruction=system_instruction,
                full_response=False
            )
            text_resp = response.get("content", "") if isinstance(response, dict) else str(response)
            cleaned = re.sub(r'```json\s*', '', text_resp, flags=re.IGNORECASE)
            cleaned = re.sub(r'```\s*', '', cleaned).strip()
            match = re.search(r'\{.*\}', cleaned, re.DOTALL)
            if match:
                data = json.loads(match.group(0))
                data["model_used"] = target_model
                return data
            return {"characters": [], "environments": [], "props": [], "model_used": target_model}
        except Exception as e:
            logger.error(f"Anchor reference extraction failed: {e}")
            return {"characters": [], "environments": [], "props": [], "model_used": target_model, "error": str(e)}
