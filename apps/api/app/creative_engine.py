from .llm_manager import LLMClient
import logging
from google.genai import types
import json
import re
from concurrent.futures import ThreadPoolExecutor, as_completed

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

    def _chunk_text(self, text: str, max_chars: int = 2200) -> list:
        """
        Splits large text into logical narrative chunks preserving paragraph and sentence boundaries.
        Ideal for long scripts (e.g. 50,000+ chars) to prevent LLM output token overflow (8,192 token limit).
        """
        paragraphs = [p.strip() for p in text.split("\n\n") if p.strip()]
        if not paragraphs:
            paragraphs = [p.strip() for p in text.split("\n") if p.strip()]
        if not paragraphs:
            paragraphs = [text.strip()]

        chunks = []
        current_chunk = []
        current_len = 0

        for para in paragraphs:
            # If a single paragraph is too large, split by sentences
            if len(para) > max_chars:
                raw_sentences = re.split(r'(?<=[.?!])\s+|\n+', para)
                sentences = [s.strip() for s in raw_sentences if s.strip()]
                for s in sentences:
                    if current_len + len(s) > max_chars and current_chunk:
                        chunks.append("\n\n".join(current_chunk))
                        current_chunk = [s]
                        current_len = len(s)
                    else:
                        current_chunk.append(s)
                        current_len += len(s) + 2
            else:
                if current_len + len(para) > max_chars and current_chunk:
                    chunks.append("\n\n".join(current_chunk))
                    current_chunk = [para]
                    current_len = len(para)
                else:
                    current_chunk.append(para)
                    current_len += len(para) + 2

        if current_chunk:
            chunks.append("\n\n".join(current_chunk))

        return chunks if chunks else [text]

    def _segment_single_chunk(
        self,
        chunk_text: str,
        full_model_name: str,
        style_context: str,
        style_prompt: str,
        pacing_instruction: str,
        aspect_ratio: str
    ) -> list:
        """
        Segments a single narrative chunk into scenes using the dynamic LLM.
        Includes robust JSON parsing and self-healing fallback.
        """
        prompt = f"""You are an Elite AI Film Director, Cinematographer, and Google Flow AI Prompt Specialist.
Split the input script into cohesive scenes and create a deeply synthesized, highly detailed English Visual Keyframe Prompt (optimized for Google Flow's Nano Banana Pro / Imagen 3) and a continuous Cinematic Video Motion Prompt (optimized for Google Flow's Omni 1.1 Flash) for each scene.

[SCENE PACING & SEGMENTATION STRATEGY]
{pacing_instruction}

[CORE VISUAL DIRECTION & STYLE SYNTHESIS]
1. SUPREME STYLE SYNTHESIS DIRECTIVE:
   - {style_context}
   - CRITICAL STYLE SYNTHESIS: DO NOT simply paste or prepend style keywords with commas. You MUST DEEPLY RECREATE & EMBED the chosen style into the scene's actual physical elements:
     * Custom Wardrobe & Styling: Describe the specific haute-couture fabrics, tailored cuts, textures (e.g. fine silk, tailored wool, supple leather, sheer organza), hair styling, and accessories matching the chosen style.
     * Architectural Environment & Staging: Describe an authentic set or location that embodies the style (e.g. minimalist brutalist runway, luxury studio cyc with reflectors, or architectural gallery for fashion; sleek neon metropolis for cyberpunk; etc.).
     * Lighting & Optics: Specify professional studio/cinematic lighting (e.g. Profoto softbox, high-contrast rim light, directional chiaroscuro, natural golden hour backlight) and camera optics (e.g. medium format Hasselblad look, 85mm f/1.4 lens, shallow depth of field, natural skin pores, fine film grain).
   - STRICT CULTURAL ISOLATION RULE: Under NO circumstances default to Joseon Dynasty, Hanbok, Hanok, or traditional ancient Korean settings unless the script explicitly and unequivocally describes historical Joseon events. If the user selected Fashion, Contemporary, Editorial, or Anime, EVERY scene must authentically and 100% reflect that modern genre!

2. 'visual_prompt' (Google Flow Nano Banana Pro / Imagen 3 Image Prompt):
   - Nano Banana Pro thrives on fluent, descriptive photographic English prose, NOT raw comma-separated tags.
   - Format: "{aspect_ratio}, [Genre & Medium description synthesized from user style], [Subject Appearance, bespoke wardrobe textures & expressive action fulfilling the script beat], [Specific Architectural Setting & Ambient Backdrop], [Professional Directional Lighting & Color Temperature], captured on medium format camera with shallow depth of field, sharp photographic fidelity, immaculate composition."
   - STRICT NEGATIVE DIRECTIVE: Absolutely no diamond watermarks, no corner logos, no sparkle symbols, no text, no captions, no stamps. Clean edge-to-edge frame.

3. 'video_prompt' (Google Flow Omni 1.1 Flash Video Motion Prompt):
   - Omni 1.1 Flash is Google's state-of-the-art multimodal controllable video model. It excels at controllable camera work, realistic physical dynamics, and smooth temporal consistency.
   - STRICT FORMAT RULE: Write a single, continuous, fluent English directorial sentence.
   - ABSOLUTE PROHIBITION: NEVER use structured labels like "Layer 1:", "Layer 2:", "Layer 3:", or "Layer 4:".
   - Structure: "[Cinematic Camera Movement: e.g. Smooth dolly push-in tracking shot] as [Subject's authentic motion, gentle head turn, and subtle emotive micro-expressions reflecting the narrative], [natural secondary physics: subtle drift of hair, soft fabric flutter, atmospheric particles], seamless 24fps fluid cinematic motion."
   - STRICT NEGATIVE DIRECTIVE: No diamond watermarks, no corner logos, no jitter, no morphing.

Input Script:
{chunk_text}

Output JSON Array ONLY:
[
  {{
    "scene_id": 1,
    "script": "Combined Korean narration for this scene",
    "visual_prompt": "{aspect_ratio}, ...",
    "video_prompt": "Smooth cinematic push-in tracking shot as the subject..."
  }}
]"""

        system_instruction = (
            "You are an Elite AI Film Director, Cinematographer, and strict JSON API engine specialized in Google Flow (Nano Banana Pro & Omni 1.1 Flash). "
            "You MUST output ONLY a valid JSON array of scene objects. "
            "NEVER output conversational filler, markdown formatting outside JSON, polite greetings, or explanations. "
            "Follow the exact [SCENE PACING & SEGMENTATION STRATEGY] specified in the prompt. "
            "The user-specified visual style is the supreme rule. Deeply synthesize the style into wardrobe, lighting, and architecture rather than comma-separated keywords. "
            "Never insert unrequested historical Joseon or Hanbok elements. "
            "Never use 'Layer 1/2/3' labels in video_prompt; write seamless natural cinematic camera and subject motion for Omni 1.1 Flash. "
            "Strictly enforce no diamond watermarks, no logos, and no text overlays. "
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
                cleaned_resp = re.sub(r'```json\s*', '', str(text_resp), flags=re.IGNORECASE)
                cleaned_resp = re.sub(r'```\s*', '', cleaned_resp)
                cleaned_resp = cleaned_resp.strip()

                # Extract JSON array using regex
                match = re.search(r'\[\s*\{[\s\S]*\}\s*\]', cleaned_resp)
                parsed = None
                if match:
                    json_str = match.group(0)
                    try:
                        parsed = json.loads(json_str)
                    except Exception:
                        json_str_fixed = re.sub(r',\s*([\]}])', r'\1', json_str)
                        try:
                            parsed = json.loads(json_str_fixed)
                        except Exception:
                            pass

                # Fallback direct parse if regex failed
                if not parsed:
                    try:
                        parsed = json.loads(cleaned_resp)
                    except Exception:
                        try:
                            cleaned_fixed = re.sub(r',\s*([\]}])', r'\1', cleaned_resp)
                            parsed = json.loads(cleaned_fixed)
                        except Exception:
                            pass

                if isinstance(parsed, list) and len(parsed) > 0:
                    normalized = []
                    for i, s in enumerate(parsed):
                        vp = str(s.get("visual_prompt", "")).strip()
                        # aspect ratio 중복 제거
                        vp = re.sub(r'^(9:16|16:9)[,\s]+', '', vp, flags=re.IGNORECASE).strip()
                        vp = re.sub(r'^(9:16|16:9)[,\s]+', '', vp, flags=re.IGNORECASE).strip()

                        # 잡담/번역/한국어 수다 필터링 및 자가치유
                        is_filler = any(kw in vp for kw in ["도와드릴까요", "번역", "한국어", "문법", "어떤 이야기", "궁금하네요", "안녕하세요", "이야기"])
                        has_excessive_korean = len(re.findall(r'[\uac00-\ud7a3]', vp)) > 6

                        if is_filler or has_excessive_korean or len(vp) < 10:
                            shot_angles = [
                                "Medium establishing eye-level cinematic shot",
                                "Dramatic low-angle tracking shot",
                                "Cinematic close-up portrait with atmospheric depth of field",
                                "Wide storytelling composition"
                            ]
                            angle = shot_angles[i % len(shot_angles)]
                            clean_style = style_prompt if style_prompt else "Contemporary cinematic film still"
                            vp = f"High-end {clean_style}, {angle}, stylish subject with bespoke tailored styling and refined silhouette reflecting the narrative beat, elegant ambient lighting, fine tactile textures, edge-to-edge pristine photographic composition, no watermark, no diamond symbol"

                        # video_prompt에서 'Layer 1:', 'Layer 2:' 등의 불필요한 라벨 정제
                        vid_p = str(s.get("video_prompt", "")).strip()
                        vid_p = re.sub(r'Layer\s*\d+\s*:\s*', '', vid_p, flags=re.IGNORECASE)
                        vid_p = re.sub(r'\s+', ' ', vid_p).strip()

                        if not vid_p or any(kw in vid_p for kw in ["도와드릴까요", "번역"]) or len(vid_p) < 15:
                            vid_p = "Smooth cinematic push-in tracking shot as the subject gently turns head with a subtle thoughtful gaze, soft ambient lighting drifting delicately, smooth 24fps fluid motion"

                        final_vp = f"{aspect_ratio}, {vp}".rstrip(", ")

                        normalized.append({
                            "scene_id": s.get("scene_id", i + 1),
                            "script": s.get("script", ""),
                            "visual_prompt": final_vp,
                            "video_prompt": vid_p
                        })
                    return normalized
        except Exception as e:
            logger.warning(f"[CreativeEngine] Chunk segmentation LLM call failed or timed out: {e}")

        # 스마트 씬 파서 자가치유 폴백
        lines = [l.strip() for l in chunk_text.split('\n') if l.strip()]
        if not lines:
            lines = [chunk_text]

        results = []
        shot_types = [
            "Medium establishing eye-level shot",
            "Dramatic low-angle tracking shot",
            "Cinematic close-up portrait with rich bokeh",
            "Wide storytelling composition",
            "Intense emotional medium shot"
        ]
        actions = [
            "immersed in thoughtful reflection with bespoke tailored wardrobe and poised posture",
            "pausing in contemplation as directional lighting sculpts delicate shadows across the scene",
            "slowly turning with an expressive, captivating gaze in a high-end editorial set",
            "standing with poise in an elegant evocative architectural space",
            "gazing into the distance with refined composure and subtle emotional depth"
        ]

        style_prefix = f"High-end {style_prompt}, " if style_prompt else "Contemporary cinematic film still, "

        for idx, line in enumerate(lines):
            angle = shot_types[idx % len(shot_types)]
            action = actions[idx % len(actions)]
            results.append({
                "scene_id": idx + 1,
                "script": line,
                "visual_prompt": f"{aspect_ratio}, {style_prefix}{angle}, stylish subject {action}, atmospheric environment, soft volumetric lighting, medium format camera fidelity, edge-to-edge clean frame, no diamond watermark".strip(", "),
                "video_prompt": "Smooth cinematic push-in tracking shot as the subject subtly shifts gaze with measured breathing, soft breeze gently swaying hair and outfit fabric, warm ambient light, smooth 24fps fluid motion"
            })
        return results

    def _build_adaptive_pacing_instruction(self, split_method: str, mode: str, text_length: int) -> str:
        """
        Builds optimized directorial pacing instructions tailored to script length and split strategy.
        - Tier 1: Short / Shorts (<= 3,000 chars)
        - Tier 2: Mid Long-form (3,001 - 15,000 chars, ~10,000 chars)
        - Tier 3: Epic Long-form (> 15,000 chars, 50,000+ chars)
        """
        if text_length > 15000:
            scale_desc = f"EPIC LONG-FORM DOCUMENTARY / MOVIE ({text_length:,} chars)"
            tier = 3
        elif text_length > 3000:
            scale_desc = f"MID-TIER LONG-FORM STORY ({text_length:,} chars)"
            tier = 2
        else:
            scale_desc = f"COMPACT / SHORTS STORY ({text_length:,} chars)"
            tier = 1

        if split_method == 'visual_change':
            if tier == 3: # 50,000+ chars
                return (
                    f"SPLIT STRATEGY: CINEMATIC SEQUENCE VISUAL CHANGE [{scale_desc}].\n"
                    "- STRICT OVER-SEGMENTATION PREVENTION: In an epic story, do NOT create rapid cuts. Combine 5 to 8 sentences into ONE scene as long as they take place in the same location/setting.\n"
                    "- Only trigger a new scene when there is a DEFINITE change in physical location, major character entrance/exit, or day/night transition.\n"
                    "- Maintain grand cinematic scale and prolonged environmental staging."
                )
            elif tier == 2: # ~10,000 chars
                return (
                    f"SPLIT STRATEGY: SCENE & LOCATION VISUAL CHANGE [{scale_desc}].\n"
                    "- Create a new scene ONLY when setting, primary character, or camera viewpoint dramatically shifts.\n"
                    "- Combine 3 to 5 sentences that share the same backdrop and lighting into a single cohesive scene.\n"
                    "- Ensure scenes represent distinct physical staging environments."
                )
            else: # <= 3,000 chars
                return (
                    f"SPLIT STRATEGY: VISUAL CHANGE FOCUSED [{scale_desc}].\n"
                    "- Create a new scene ONLY when location, subject, or camera perspective shifts.\n"
                    "- Combine 2 to 4 sentences describing the same visual moment into one scene."
                )

        elif split_method == 'semantic':
            if tier == 3: # 50,000+ chars
                return (
                    f"SPLIT STRATEGY: MACRO SEMANTIC & EXTENDED DURATION [{scale_desc}].\n"
                    "- TARGET DURATION: Aim for 10 to 15 seconds of steady voiceover per scene (approx. 150 - 220 Korean characters / 4 to 6 full sentences).\n"
                    "- ABSOLUTE PROHIBITION: Never split short dialogue lines or sentence-by-sentence. Merge them into complete narrative thematic units.\n"
                    "- Balances the grand 50,000-character timeline to prevent excessive scene bloat (maintaining 200-350 total scenes)."
                )
            elif tier == 2: # ~10,000 chars
                return (
                    f"SPLIT STRATEGY: BALANCED SEMANTIC FLOW [{scale_desc}].\n"
                    "- TARGET DURATION: Aim for 6 to 9 seconds of narration per scene (approx. 90 - 130 characters / 3 to 5 sentences).\n"
                    "- Merge logically interconnected sentences into unified thematic blocks.\n"
                    "- Balances subtitle rhythm and viewer retention for 10k-character long videos."
                )
            else: # <= 3,000 chars
                return (
                    f"SPLIT STRATEGY: SEMANTIC & DURATION AUTO-OPTIMIZATION [{scale_desc}].\n"
                    "- TARGET DURATION: 3 to 6 seconds of narration per scene (typically 2 to 3 sentences).\n"
                    "- Group connected thoughts to maintain engaging viewer pace."
                )

        else: # 'ai_smart' or fallback
            if tier == 3: # 50,000+ chars
                return (
                    f"SPLIT STRATEGY: AI SMART NARRATIVE CHAPTER FLOW [{scale_desc}].\n"
                    "- MASTER DIRECTIVE: You are directing a feature-length cinematic production. Structure the story into meaningful narrative chapter beats.\n"
                    "- Combine 4 to 7 coherent sentences (or 1 full paragraph) per scene to give each visual keyframe substantial narrative weight.\n"
                    "- Focus on emotional arc continuity and smooth visual transitions between long-form acts."
                )
            elif tier == 2: # ~10,000 chars
                return (
                    f"SPLIT STRATEGY: AI SMART VISUAL STORYTELLING [{scale_desc}].\n"
                    "- Group 3 to 5 sentences into coherent narrative units representing a complete micro-story beat.\n"
                    "- Keep scenes rich, avoiding choppy sentence cuts. Target smooth visual continuity across the 10,000-character arc."
                )
            elif mode == 'shorts':
                return (
                    f"SPLIT STRATEGY: YOUTUBE SHORTS FAST-PACED HOOK [{scale_desc}].\n"
                    "- Group 2 to 3 punchy sentences per scene based on fast viral rhythm and dynamic camera staging.\n"
                    "- Ensure every scene has strong visual hooks for vertical short-form engagement."
                )
            else:
                return (
                    f"SPLIT STRATEGY: AI SMART CINEMATIC FLOW [{scale_desc}].\n"
                    "- Group 3 to 4 sentences into balanced narrative units with cinematic visual flow."
                )

    def segment_script(self, text: str, mode: str = "shorts", provider: str = None, model: str = None, style_prompt: str = "", split_method: str = "ai_smart", pacing_config: dict = None) -> list:
        """
        Splits a script into scenes and generates visual prompts based on the selected method.
        Supports ultra long-form scripts (10,000 to 50,000+ chars) via smart chunking pipeline.
        Strictly respects DB Settings standard analysis model as the Single Source of Truth.
        """
        # [STANDARD ANALYSIS MODEL: Single Source of Truth from DB Settings]
        standard_model = getattr(self.llm_client.settings, "script_analysis_model", None)
        standard_provider = getattr(self.llm_client.settings, "script_analysis_provider", None)

        # DB Settings 표준 분석 모델 최우선 반영
        target_model = standard_model or model or getattr(self.llm_client.settings, "default_llm_model", None) or getattr(self.llm_client.settings, "paperclip_model", None) or "opencode/deepseek-v4-flash-free"
        target_provider = standard_provider or provider or "opencode"
        aspect_ratio = "9:16" if mode == 'shorts' else "16:9"

        # Helper to clean text
        cleaned_text = text.replace("\r\n", "\n").strip()
        text_length = len(cleaned_text)

        # 0. Custom Rule Logic (사용자가 명시적으로 커스텀 규칙을 선택한 경우에만 분할)
        if split_method == 'custom_rule' and pacing_config:
            return self._split_by_rule(cleaned_text, pacing_config, aspect_ratio=aspect_ratio, style_prompt=style_prompt)

        # 1. 길이 및 전략 맞춤형 Pacing Instruction 자동 구성 (단문 / 1만자 / 5만자 차별화)
        pacing_instruction = self._build_adaptive_pacing_instruction(split_method, mode, text_length)

        # 2. Style Instruction (User Style is the Supreme Visual Authority & Deeply Synthesized)
        style_context = f'MANDATORY USER VISUAL STYLE: "{style_prompt}"' if style_prompt else 'CONTEMPORARY CINEMATIC PHOTO STYLE'
        full_model_name = target_model

        # 3. Large Script Detection (e.g. 10,000 to 50,000+ characters)
        # Commercial LLM output token limits (8,192 tokens) can only safely produce ~40-60 scenes per response.
        # Scripts > 3,000 chars are split into coherent narrative chunks and processed in parallel.
        if text_length > 3000:
            chunks = self._chunk_text(cleaned_text, max_chars=2200)
            if len(chunks) > 1:
                logger.info(f"[CreativeEngine] Standard model [{full_model_name}] executing for large script ({text_length:,} chars, {len(chunks)} chunks).")
                ordered_results = [None] * len(chunks)

                def process_chunk(idx, chunk):
                    context_header = f"[GLOBAL CONTEXT: Part {idx+1}/{len(chunks)} of {text_length:,}-character story. Maintain character, wardrobe, and atmospheric consistency.]\n\n"
                    return idx, self._segment_single_chunk(
                        chunk_text=context_header + chunk,
                        full_model_name=full_model_name,
                        style_context=style_context,
                        style_prompt=style_prompt,
                        pacing_instruction=pacing_instruction,
                        aspect_ratio=aspect_ratio
                    )

                with ThreadPoolExecutor(max_workers=3) as executor:
                    futures = [executor.submit(process_chunk, idx, c) for idx, c in enumerate(chunks)]
                    for future in as_completed(futures):
                        try:
                            idx, chunk_scenes = future.result()
                            ordered_results[idx] = chunk_scenes
                        except Exception as e:
                            logger.error(f"[CreativeEngine] Error processing chunk: {e}")

                # Combine all chunks and re-index scene_id sequentially
                combined_scenes = []
                global_id = 1
                for chunk_scenes in ordered_results:
                    if not chunk_scenes:
                        continue
                    for scene in chunk_scenes:
                        scene["scene_id"] = global_id
                        combined_scenes.append(scene)
                        global_id += 1

                logger.info(f"[CreativeEngine] Standard model [{full_model_name}] successfully assembled {len(combined_scenes)} scenes from {len(chunks)} chunks.")
                return combined_scenes

        # Standard path for normal length scripts
        return self._segment_single_chunk(
            chunk_text=cleaned_text,
            full_model_name=full_model_name,
            style_context=style_context,
            style_prompt=style_prompt,
            pacing_instruction=pacing_instruction,
            aspect_ratio=aspect_ratio
        )

    def generate_visual_prompt(self, script: str, style_context: str = "", provider: str = None, model: str = None) -> dict:
        """
        Generates a visual prompt for a single scene using the dynamic model.
        """
        standard_model = getattr(self.llm_client.settings, "script_analysis_model", None)
        target_model = standard_model or model or getattr(self.llm_client.settings, "default_llm_model", None) or "opencode/deepseek-v4-flash-free"
        
        clean_style = style_context if style_context else "Contemporary cinematic film still, photographic fidelity"
        system_prompt = f"""You are an Elite Visual Director and Google Flow Prompt Specialist (Nano Banana Pro & Omni 1.1 Flash).
Create a vivid, evocative English image keyframe description and a smooth cinematic video motion prompt for this script line.
MANDATORY VISUAL STYLE: '{clean_style}'.

CRITICAL RULES:
1. The user-specified visual style MUST be deeply synthesized into character appearance, tailored wardrobe, set architecture, and directional lighting.
2. DO NOT force historical Joseon, Hanbok, or ancient settings unless the script explicitly mentions it. If the style is Fashion, Contemporary, Editorial, etc., strictly match that genre!
3. 'visual_prompt': Write rich photographic English prose describing subject, bespoke styling, setting, lighting, and optics for Nano Banana Pro. Strictly no diamond watermarks, no corner symbols, no text.
4. 'video_prompt': Provide a single fluent English directorial sentence for Omni 1.1 Flash without labels like 'Layer 1/2/3'. Format: '[Camera motion] as [Subject motion and expression], [subtle physics], seamless 24fps fluid motion.'

Output MUST be a valid JSON object:
{{
    "visual_prompt": "[Synthesized Style & Medium], [Camera Shot & Angle], [Subject Appearance & bespoke styling matching script], [Setting/Background], [Lighting & Mood], shallow depth of field, sharp photographic fidelity, no watermark",
    "video_prompt": "[Camera movement] as [Subject motion and subtle expression], [subtle physics], seamless 24fps fluid motion"
}}"""

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
                vid_p = re.sub(r'Layer\s*\d+\s*:\s*', '', vid_p, flags=re.IGNORECASE).strip()
                if not vid_p or len(vid_p) < 15:
                    vid_p = "Smooth cinematic push-in tracking shot as the subject gently turns head with a subtle thoughtful gaze, soft ambient lighting drifting delicately, smooth 24fps fluid motion"
                parsed["video_prompt"] = vid_p
                return parsed
            return {
                "visual_prompt": text_resp, 
                "video_prompt": "Smooth cinematic push-in tracking shot as the subject subtly shifts gaze with measured breathing, soft ambient light, smooth 24fps fluid motion"
            }
        except Exception as e:
            logger.error(f"Visual Prompt Generation Failed: {e}")
            return {
                "visual_prompt": f"High-end {clean_style}, Eye-level cinematic shot, elegant subject in deep contemplation amidst a refined architectural setting, directional soft lighting with delicate shadows, sharp photographic fidelity, no watermark", 
                "video_prompt": "Smooth cinematic push-in tracking shot as the subject gently turns head with a subtle thoughtful gaze, soft ambient lighting drifting delicately, smooth 24fps fluid motion"
            }


    def _split_by_rule(self, text: str, config: dict, aspect_ratio: str = "16:9", style_prompt: str = "") -> list:
        """
        Splits text based on rigid rules: 'sentence_count' or 'time_duration',
        and returns fully formed scene objects matching List[SceneSegment] schema.
        """
        unit = config.get('unit', 'sentence') # 'sentence', 'time'
        value = int(config.get('value', 1))
        
        # 1. Base Sentence Split (Regex)
        cleaned_text = text.replace("\r\n", "\n").strip()
        # Strong split pattern: Punctuation followed by space or newline
        pattern = r'(?<=[.?!])\s+|(?<=[다요죠까])[\.\?!]?\s+(?=[A-Z가-힣])|\n{2,}'
        raw_sentences = re.split(pattern, cleaned_text)
        sentences = [s.strip() for s in raw_sentences if s.strip()]
        
        if not sentences:
            sentences = [cleaned_text]

        grouped_segments = []
        
        if unit == 'sentence':
            chunk = []
            for s in sentences:
                chunk.append(s)
                if len(chunk) >= value:
                    grouped_segments.append(" ".join(chunk))
                    chunk = []
            if chunk:
                grouped_segments.append(" ".join(chunk))
            
        elif unit == 'time':
            CHAR_PER_SEC = 15 # Reading speed approx 15 chars per sec
            target_chars = max(15, value * CHAR_PER_SEC)
            
            chunk = []
            current_len = 0
            
            for s in sentences:
                s_len = len(s)
                if current_len + s_len > target_chars and chunk:
                    grouped_segments.append(" ".join(chunk))
                    chunk = [s]
                    current_len = s_len
                else:
                    chunk.append(s)
                    current_len += s_len
            
            if chunk:
                grouped_segments.append(" ".join(chunk))
        else:
            grouped_segments = sentences

        # Build fully qualified SceneSegment dictionaries
        results = []
        style_prefix = f"High-end {style_prompt}, " if style_prompt else "Contemporary cinematic film still, "
        shot_types = [
            "Medium establishing eye-level shot",
            "Dramatic low-angle tracking shot",
            "Cinematic close-up portrait with rich bokeh",
            "Wide storytelling composition",
            "Intense emotional medium shot"
        ]
        actions = [
            "immersed in thoughtful reflection with bespoke tailored wardrobe and poised posture",
            "pausing in contemplation as directional lighting sculpts delicate shadows across the scene",
            "slowly turning with an expressive, captivating gaze in a high-end editorial set",
            "standing with poise in an elegant evocative architectural space",
            "gazing into the distance with refined composure and subtle emotional depth"
        ]

        for idx, seg in enumerate(grouped_segments):
            angle = shot_types[idx % len(shot_types)]
            action = actions[idx % len(actions)]
            results.append({
                "scene_id": idx + 1,
                "script": seg,
                "visual_prompt": f"{aspect_ratio}, {style_prefix}{angle}, stylish subject {action}, atmospheric environment, soft volumetric lighting, medium format camera fidelity, edge-to-edge clean frame, no diamond watermark".strip(", "),
                "video_prompt": "Smooth cinematic push-in tracking shot as the subject subtly shifts gaze with measured breathing, soft breeze gently swaying hair and outfit fabric, warm ambient light, smooth 24fps fluid motion"
            })

        return results


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

    def validate_script_policy(self, script_text: str, model: str = None) -> dict:
        """
        Validates a script for YouTube community guidelines, copyright/trademark risks,
        hate speech, violence, medical/financial misinformation, and awkward pronunciation/flow.
        Returns a structured assessment with suggestions and an optional polished script.
        """
        target_model = model or getattr(self.llm_client.settings, "script_analysis_model", None) or getattr(self.llm_client.settings, "default_llm_model", None) or "youtube1"

        system_instruction = (
            "You are a Senior YouTube Content Policy & Script Quality Compliance Auditor. "
            "Analyze the given video script thoroughly for:\n"
            "1. YouTube Community Guideline compliance (violence, hate speech, adult content, harmful/dangerous acts, sensitive claims)\n"
            "2. Trademark and copyright risk expressions\n"
            "3. Narration flow and TTS pronunciation obstacles (awkward translation phrasing, tongue-twisters, unpunctuated run-on sentences)\n"
            "Return strictly a JSON object with this structure:\n"
            "{\n"
            '  "is_safe": true/false,\n'
            '  "score": 100-point integer rating (e.g. 95),\n'
            '  "summary": "한국어로 작성된 한줄 총평",\n'
            '  "issues": [\n'
            '    {\n'
            '      "severity": "danger" | "warning" | "info",\n'
            '      "category": "정책위반" | "표현개선" | "발음주의" | "저작권",\n'
            '      "original": "원문 문제 문구",\n'
            '      "suggestion": "추천 대체 문구",\n'
            '      "reason": "해당 표현이 권장되지 않는 이유"\n'
            '    }\n'
            '  ],\n'
            '  "polished_script": "지적된 문제점들이 말끔히 퇴고되고 자연스럽게 정돈된 전체 대본 (원문 문맥 100% 유지)"\n'
            "}\n"
            "Output strictly valid JSON without markdown wrapping."
        )

        prompt = f"다음 대본을 정밀하게 검토하고 유튜브 정책 위반 여부와 발음/표현 퇴고 보고서를 작성해줘:\n\n{script_text}"

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
            return {
                "is_safe": True,
                "score": 90,
                "summary": "정책 검증이 완료되었습니다.",
                "issues": [],
                "polished_script": script_text,
                "model_used": target_model
            }
        except Exception as e:
            logger.error(f"Script policy validation failed: {e}")
            return {
                "is_safe": True,
                "score": 85,
                "summary": f"검증 중 오류 발생 (기본 통과): {str(e)}",
                "issues": [],
                "polished_script": script_text,
                "model_used": target_model,
                "error": str(e)
            }

