import logging
from .llm_manager import LLMClient
from .database import SessionLocal
from . import crud

# Configure Logging
logger = logging.getLogger(__name__)

class ScriptEngine:
    def __init__(self, llm_client: LLMClient):
        self.llm_client = llm_client

    def _get_default_model(self):
        db = SessionLocal()
        try:
            settings = crud.get_settings(db)
            # Use DB setting only. If empty, the caller or UI will handle the selection.
            return settings.default_model if settings and settings.default_model else ""
        finally:
            db.close()

    def generate_script(self, input_text: str, style_instruction: str, niche: str = None, sample_text: str = None, glossary: str = None, provider: str = None, model: str = None, wisdom: str = None):
        """
        Generates a YouTube script based on the input text and style.
        [SOVEREIGN V7] Upgraded with Elite Intelligence and DNA-First Logic.
        """
        # [ELITE MODEL ESCALATION] 
        # Default to high-tier intelligence available in the user's environment.
        if not provider:
            provider = "nvidia"
        if not model:
            # Nvidia DeepSeek-V3 (V4 Pro class) or Groq Llama-3.3 70b are available and powerful
            model = "nvidia/deepseek-ai/deepseek-v3" 

        logger.info(f"📝 [Elite Gen] Niche={niche}, Input={input_text[:50]}..., Model={model}")
        
        # 1. Specialized Persona Injection (Sovereign Specialist)
        specialist_persona = ""
        niche_lower = str(niche).lower() if niche else ""
        topic_lower = input_text.lower()
        
        if any(x in niche_lower or x in topic_lower for x in ["senior", "health", "elder", "medical", "시니어", "건강", "노인", "실버"]):
            specialist_persona = (
                "### [SPECIALIST ACTIVATED] SENIOR HEALTH & WELLNESS EXPERT:\n"
                "너는 30년 경력의 시니어 전문 보건 의료인이자 콘텐츠 기획자다.\n"
                "- 시니어 계층이 신뢰할 수 있는 차분하면서도 명확한 어조를 유지하라.\n"
                "- 그들의 건강 고민(관절, 당뇨, 인지력 등)에 깊이 공감하고 실질적인 해결책을 제시하라.\n"
                "- 과장된 표현보다 과학적 근거와 따뜻한 조언을 결합하여 권위와 친근함을 동시에 확보하라.\n\n"
            )

        # 2. Flavor Substrate (Sovereign v7.0)
        flavor_rule = (
            "### [SOVEREIGN V7] SEMANTIC FLAVOR RULE:\n"
            "AI 특유의 딱딱하고 반복적인 문체를 철저히 배제하고, 한국어 특유의 '말맛'과 '정서'를 살려라.\n"
            "- 시각적/청각적 의성어와 의태어를 적극적으로 활용하라 (예: '심장이 콩닥콩닥', '무릎이 욱신할 때').\n"
            "- 1인칭 시점의 체험적 묘사를 추가하여 '사람이 직접 경험하고 쓴 것 같은' 생동감을 부여하라.\n"
            "- 쇼츠 특유의 빠른 호흡과 리드미컬한 문장 배치를 유지하라.\n\n"
        )

        # 3. DNA-FIRST WISDOM (Reference Channel Patterns)
        wisdom_text = ""
        if wisdom:
            wisdom_text = f"### [CORE DNA - MUST FOLLOW] REFERENCE CHANNEL PATTERNS:\n{wisdom}\n\n"
        elif niche:
            try:
                from app.services.intelligence.wisdom import WisdomDistiller
                db = SessionLocal()
                distiller = WisdomDistiller(db)
                wisdom_text = distiller.get_wisdom_for_niche(niche)
                db.close()
                if wisdom_text:
                    wisdom_text = f"### [CORE DNA - MUST FOLLOW] REFERENCE CHANNEL PATTERNS:\n{wisdom_text}\n\n"
            except Exception as e:
                logger.warning(f"Could not fetch wisdom for niche {niche}: {e}")

        # 4. Style Guidelines
        style_text = ""
        if style_instruction:
            style_text = f"### [STYLE PRESET] AUTHOR GUIDELINES:\n{style_instruction}\n\n"
        
        if sample_text:
            style_text += f"### [STYLE SAMPLE] REFERENCE TEXT:\n{sample_text}\n\n"

        system_prompt = (
            "You are an Elite Creative Broadcast Writer for high-retention viral YouTube Shorts.\n\n"
            "### [CONSTITUTION] THE DNA RULE:\n"
            "위에 제공된 [CORE DNA]는 이 채널의 성공 법칙이다. 이를 무시하지 말고, 반드시 해당 스타일과 톤을 최우선으로 반영하여 집필하라.\n\n"
            f"{specialist_persona}"
            f"{flavor_rule}"
            f"{wisdom_text}"
            f"{style_text}"
            "### CORE SCRIPTWRITING RULES:\n"
            "1. **Direct Address**: Always speak directly to the viewer (e.g., '여러분', '지휘관님', '어르신들').\n"
            "2. **Information Density**: Extract specific facts or tips from the DNA/context. No vague summaries.\n"
            "3. **Hook, Meat, Call-to-Action**: High-energy hook (3s), core value (20s), and a sharp closing with engagement prompt.\n"
            "4. **Full Completion**: Ensure the script has a clear beginning, middle, and end. DO NOT truncate.\n\n"
            "### CRITICAL OUTPUT RULES:\n"
            "1. Output ONLY the raw Korean script. No scene labels, no markdown, no intro/outro chatter.\n"
            "2. Every single character you output MUST be spoken by the narrator.\n"
            "3. Target Duration: 30-50 seconds of fast-paced speech.\n\n"
        )

        user_prompt = f"### INPUT TOPIC/MATERIAL:\n{input_text}"
        
        try:
            result = self.llm_client.generate_content(
                prompt=user_prompt, 
                model_name=model,
                system_instruction=system_prompt,
                full_response=True
            )
            
            actual_model = result.get("model", model) if isinstance(result, dict) else model
            content = result.get("content", result) if isinstance(result, dict) else result
            
            logger.info(f"✅ Script generated successfully using {actual_model}.")
            
            warning = None
            if actual_model != model:
                warning = f"System: Scaled up to {actual_model} for quality assurance."

            return {
                "script": content,
                "model_used": actual_model,
                "warning": warning
            }
        except Exception as e:
            logger.error(f"❌ Elite script generation failed: {e}")
            raise e

    def refine_script(self, current_text: str, instruction: str, persona: str = None, style_instruction: str = None, sample_text: str = None, provider: str = None, model: str = None, tempo_percentage: int = 100):
        """
        Refines an existing script based on user instruction and style guidelines.
        Returns a dictionary: {"script": str, "model_used": str, "warning": str|None}
        """
        if not provider:
            provider = "groq"
        if not model:
            model = "groq/llama-3.3-70b-versatile"

        logger.info(f"✨ Script Refinement Request: Persona={persona}, Instruction='{instruction}', Tempo={tempo_percentage}%, Style={bool(style_instruction)}")
        
        persona_map = {
            "strategist": (
                "You are an Elite YouTube Strategist and CEO. Your tone is logical, data-driven, authoritative, and direct. "
                "You strip away all fluff. You focus on retention, CTR, and absolute clarity. Speak like a person who commands results."
            ),
            "influencer": (
                "You are a top-tier Viral Influencer with 50M followers. Your tone is trendy, explosive, relatable, and high-energy. "
                "You know exactly what makes people stop scrolling. Use dopamine-inducing hooks, emotional spikes, and internet-native nuances. "
                "Make the script feel alive and impossible to ignore."
            ),
            "educator": (
                "You are a Master Educator and world-renowned Expert. Your tone is calm, trust-inspiring, clear, and methodical. "
                "You turn complex ideas into 'Aha!' moments. You build long-term authority and deep viewer trust through precision and wisdom."
            )
        }
        
        # If style_instruction is provided (e.g. from a custom Persona/Style), use it as the primary persona
        if style_instruction:
            persona_instruction = f"### [PRIMARY PERSONA ACTIVATED]\n{style_instruction}"
        else:
            persona_instruction = persona_map.get(persona, "You are a professional YouTube Script Editor.")
        
        # Style guidelines augmentation (if any extra context exists)
        sample_context = f"### [STYLE SAMPLE] REFERENCE TEXT:\n{sample_text}\n\n" if sample_text else ""

        tempo_adjustment = ""
        if tempo_percentage != 100:
            tempo_adjustment = f"\n### [CRITICAL TEMPO ADJUSTMENT]\nPlease adjust the length of the script to approximately {tempo_percentage}% of its current word count. "
            if tempo_percentage < 100:
                tempo_adjustment += "Make it more concise and punchy, removing unnecessary words while keeping the core message and persona voice."
            else:
                tempo_adjustment += "Expand on the details, add more descriptive language or context to make it longer while maintaining interest and persona voice."

        system_prompt = (
            f"{persona_instruction}\n\n"
            "### YOUR MISSION:\n"
            "You are the world's best Script Doctor. Your task is to transform the provided script into a masterpiece based on the specific INSTRUCTIONS and your ACTIVATED PERSONA.\n\n"
            "### CRITICAL RULES:\n"
            "1. **MANDATORY LANGUAGE**: You MUST respond in **Korean**. Even if the input is English, deliver a polished Korean script.\n"
            "2. **VOICE CONSISTENCY**: Do not just fix grammar. Re-write the script to match the activated persona's unique voice, energy, and vocabulary.\n"
            "3. **OUTPUT FORMAT**: Provide ONLY the refined script text. No meta-talk, no headers, no markdown blocks.\n\n"
            f"{sample_context}"
            f"{tempo_adjustment}"
        )
        
        user_prompt = (
            "### INSTRUCTION:\n"
            f"{instruction}\n\n"
            "### CURRENT SCRIPT:\n"
            f"{current_text}\n\n"
            "### FINAL POLISHED KOREAN SCRIPT:\n"
        )
        
        try:
            result = self.llm_client.generate_content(
                prompt=user_prompt,
                model_name=model,
                system_instruction=system_prompt,
                full_response=True
            )
            
            actual_model = result.get("model", model) if isinstance(result, dict) else model
            content = result.get("content", result) if isinstance(result, dict) else result
            
            logger.info("✅ Script refined successfully.")
            
            warning = None
            # Check if models are different, ignoring provider prefixes like 'google/'
            clean_actual = actual_model.split("/")[-1] if "/" in actual_model else actual_model
            clean_requested = model.split("/")[-1] if model and "/" in model else model
            
            if clean_actual != clean_requested:
                warning = f"System: Auto-switched to {actual_model} due to error with {model}."

            return {
                "script": content,
                "model_used": actual_model,
                "warning": warning
            }
        except Exception as e:
            logger.error(f"❌ Script refinement failed with {model}: {e}")
            raise e

    def generate_multilingual_script(self, input_text: str, niche: str = None, provider: str = None, model: str = None):
        """
        [Phase 3] Day-1 Global Localization
        Generates fully localized scripts, hooks, and metadata in 4 languages: Korean, English, Japanese, and Spanish.
        Outputs a strictly formatted JSON.
        """
        if not provider:
            provider = "google"
        if not model:
            model = "gemini-2.0-flash-exp"

        logger.info(f"🌍 Multilingual Script Gen Request: Niche={niche}, Input Length={len(input_text)}")
        
        flavor_rule = (
            "### [SOVEREIGN V7] MULTILINGUAL FLAVOR RULE:\n"
            "You are a master YouTube strategist targeting four specific global markets (Korea, Global/US, Japan, Spain/LatAm).\n"
            "For each market, you must deeply localize the Hook (first 3 seconds) and Script to match the cultural nuances and internet slang.\n"
            "Korea: Fast-paced, sensory '말맛', trendy.\n"
            "Global/English: High-energy, direct, dopamine-driven hooks.\n"
            "Japan: Anime-style exaggerated reactions or subtle deep-dive documentary style, depending on the topic.\n"
            "Spanish/LatAm: Passionate, emotional storytelling, highly expressive.\n\n"
        )

        system_prompt = (
            f"{flavor_rule}"
            "### TASK:\n"
            "Rewrite the provided input into a highly engaging YouTube script concurrently in 4 languages.\n"
            "For each language, provide:\n"
            "- 'title': A click-worthy, viral YouTube title.\n"
            "- 'hook': The first 1-3 sentences designed to maximize retention.\n"
            "- 'script': The main body of the script.\n"
            "- 'thumbnail_text': 1-3 words of impact text to put on the thumbnail.\n\n"
            "### CRITICAL OUTPUT RULES:\n"
            "You MUST output valid, raw JSON only. Do not include markdown formatting (like ```json), no intro, no outro.\n"
            "The JSON structure must exactly match this format:\n"
            "{\n"
            '  "ko": {"title": "", "hook": "", "script": "", "thumbnail_text": ""},\n'
            '  "en": {"title": "", "hook": "", "script": "", "thumbnail_text": ""},\n'
            '  "ja": {"title": "", "hook": "", "script": "", "thumbnail_text": ""},\n'
            '  "es": {"title": "", "hook": "", "script": "", "thumbnail_text": ""}\n'
            "}\n"
        )

        user_prompt = f"### INPUT TEXT:\n{input_text}"
        
        try:
            result = self.llm_client.generate_content(
                prompt=user_prompt, 
                model_name=model,
                system_instruction=system_prompt,
                full_response=True
            )
            
            actual_model = result.get("content", "") if isinstance(result, str) else result.get("model", model)
            content = result.get("content", result) if isinstance(result, dict) else result
            
            # Clean JSON formatting if LLM still included markdown
            if isinstance(content, str):
                content = content.replace('```json', '').replace('```', '').strip()
                import json
                try:
                    parsed_content = json.loads(content)
                except json.JSONDecodeError:
                    logger.error("Failed to parse Multilingual JSON output.")
                    parsed_content = {"error": "Invalid output format", "raw": content}
            else:
                parsed_content = content
            
            warning = None
            if actual_model != model:
                warning = f"System: Auto-switched to {actual_model} due to error with {model}."

            return {
                "localized_scripts": parsed_content,
                "model_used": actual_model,
                "warning": warning
            }
        except Exception as e:
            logger.error(f"❌ Multilingual generation failed with {model}: {e}")
            raise e

    def segment_to_beats(self, script: str, provider: str = None, model: str = None):
        """
        [ELITE ORCHESTRATION]
        Analyzes a refined script and segments it into dynamic mission beats.
        Identifies logical scene breaks, emotional pivots, and visual intents.
        """
        if not provider:
            provider = "groq"
        if not model:
            model = "groq/llama-3.3-70b-versatile"

        logger.info(f"🧬 [Elite Orchestration] Segmenting script into beats (Length: {len(script)})")

        system_prompt = (
            "You are an Elite Video Production Orchestrator. Your task is to analyze the provided Korean script and break it down into logical, high-impact video segments (Beats).\n\n"
            "### RULES:\n"
            "1. **NO FIXED TEMPLATES**: Do not force a Hook-Problem-CTA structure. Follow the natural story arc of the script.\n"
            "2. **IDENTIFY PIVOTS**: Create a new beat whenever there is a shift in topic, emotion, or visual context.\n"
            "3. **VISUAL & AUDIO INTENT**: For each beat, define a 'visual_intent' (e.g., 'Cinematic Close-up', 'Motion Graphics Overlay') and an 'audio_intent' (e.g., 'Bass Drop', 'Whispering Narration', 'Fast Tempo Drums').\n"
            "4. **EMOTIONAL TONE**: Define the 'emotional_tone' (e.g., 'Urgent', 'Inspirational', 'Mysterious') to guide the production style.\n"
            "5. **DURATION**: Suggest a duration in seconds for each beat (total should be around 30-60s).\n"
            "6. **OUTPUT FORMAT**: You MUST output raw JSON only. No markdown.\n\n"
            "### JSON SCHEMA:\n"
            "[\n"
            "  {\n"
            '    "id": "beat-1",\n'
            '    "type": "string (e.g., hook, problem, tension, climax, resolution, cta)",\n'
            '    "title": "Short descriptive title in Korean",\n'
            '    "subtitle": "Brief strategic goal in Korean",\n'
            '    "text_overlay": "The exact script text for this segment in Korean",\n'
            '    "duration_sec": 5.0,\n'
            '    "visual_intent": "Production instruction in English",\n'
            '    "audio_intent": "Sound design instruction in English",\n'
            '    "emotional_tone": "Strategic emotional trigger in English"\n'
            "  }\n"
            "]"
        )

        user_prompt = f"### REFINED SCRIPT:\n{script}"

        try:
            result = self.llm_client.generate_content(
                prompt=user_prompt,
                model_name=model,
                system_instruction=system_prompt,
                full_response=True
            )
            
            content = result.get("content", result) if isinstance(result, dict) else result
            
            if isinstance(content, str):
                content = content.replace('```json', '').replace('```', '').strip()
                import json
                try:
                    beats = json.loads(content)
                except json.JSONDecodeError:
                    logger.error("Failed to parse Segmentation JSON.")
                    beats = []
            else:
                beats = content

            logger.info(f"✅ Successfully segmented script into {len(beats)} beats.")
            return beats
        except Exception as e:
            logger.error(f"❌ Script segmentation failed: {e}")
            raise e

