import json
import logging
from sqlalchemy.orm import Session
from .. import models, schemas
from ..llm_manager import LLMClient

logger = logging.getLogger(__name__)

class ContentAnalyzer:
    def __init__(self, db: Session, settings: models.Settings):
        self.db = db
        self.settings = settings
        self.llm_client = LLMClient(schemas.Settings.model_validate(settings))

    def analyze_script(self, video: models.Video, content: str) -> schemas.ScriptAnalysisCreate:
        """
        Analyzes the script using the configured AI provider.
        """
        provider = self.settings.script_analysis_provider or "groq"
        model = self.settings.script_analysis_model or "groq/llama-3.3-70b-versatile"
        
        # System Prompt: English logic, strictly enforced Korean JSON output
        system_instruction = """
You are a viral content analyst. Your job is to analyze video scripts to identify why they went viral.
Analyze the provided script and output the result in STRICT JSON format.
The analysis content (values) MUST be in KOREAN (Hangul).

Output Schema:
{
    "viral_score": int, // 0-100 score based on hook strength, retention, and emotional impact
    "summary_one_line": "string", // A punchy, single-sentence summary of the core message (Korean)
    "summary_three_lines": "string", // A 3-sentence summary (Korean)
    "sentiment_score": float, // -1.0 (Negative) to 1.0 (Positive)
    "sentiment_label": "string", // "Positive", "Neutral", "Negative" (Use these English labels for code, but Korean for text if needed)
    "tone": "string", // e.g., "Urgent", "Humorous", "Inspirational" (Korean)
    "keywords": ["string", "string"], // Top 5 key topics/tags (Korean)
    "hooks": [
        {"text": "string", "type": "string"} // Identify the hook sentence and its type (e.g., "Curiosity Gap", "Shock")
    ],
    "structure_breakdown": {
        "intro": "string", // Analysis of the introduction (Korean)
        "body": "string", // Analysis of the main body arguments (Korean)
        "conclusion": "string" // Analysis of the closing/CTA (Korean)
    },
    "audience_reaction": {
        "predicted_comments": "string", // What would people say in comments? (Korean)
        "best_comment": "string" // A hypothetical top comment (Korean)
    }
}
"""

        user_prompt = f"""
Analyze the following script:

Title: {video.title}

Script:
{content[:15000]} 
""" 
# Limit content to avoid token limits, though 70B can handle more. 
# Llama-3-70b has 128k context, but let's be safe and efficient.

        response_text = self.llm_client.generate_content(
            prompt=user_prompt,
            model=model,
            system_instruction=system_instruction,
            full_response=False
        )

        try:
            # Clean up potential markdown code blocks
            clean_text = response_text.replace("```json", "").replace("```", "").strip()
            data = json.loads(clean_text)
            
            # Map to Schema
            return schemas.ScriptAnalysisCreate(
                video_id=video.id,
                viral_score=data.get("viral_score", 50),
                summary_one_line=data.get("summary_one_line", "요약 불가"),
                summary_three_lines=data.get("summary_three_lines", ""),
                sentiment_score=data.get("sentiment_score", 0.0),
                sentiment_label=data.get("sentiment_label", "Neutral"),
                tone=data.get("tone", "일반"),
                keywords=data.get("keywords", []),
                hooks=data.get("hooks", []),
                structure_breakdown=data.get("structure_breakdown", {}),
                audience_reaction=data.get("audience_reaction", {})
            )

        except json.JSONDecodeError:
            logger.error(f"Failed to parse AI response: {response_text}")
            raise ValueError("AI analysis failed to return valid JSON.")

    def rewrite_script(self, original_script: str, instruction: str, provider: str = None, model: str = None, tempo_percentage: int = 100) -> str:
        """
        Rewrites the script based on the provided instruction.
        """
        target_provider = provider or self.settings.script_analysis_provider or "groq"
        target_model = model or self.settings.script_analysis_model or "groq/llama-3.3-70b-versatile"
        
        system_instruction = """
You are an expert viral script writer. Your goal is to rewrite the provided script according to the user's specific instructions.
Maintain the core message unless told otherwise, but optimize the flow, hook, and engagement.
Output ONLY the rewritten script. Do not include introductory text or explanations.
"""
        
        tempo_adjustment = ""
        if tempo_percentage != 100:
            tempo_adjustment = f"\n[CRITICAL TEMPO ADJUSTMENT]\nPlease adjust the length of the script to approximately {tempo_percentage}% of its original word count. "
            if tempo_percentage < 100:
                tempo_adjustment += "Make it more concise and punchy, removing unnecessary words while keeping the core message."
            else:
                tempo_adjustment += "Expand on the details, add more descriptive language or context to make it longer while maintaining interest."

        user_prompt = f"""
Original Script:
{original_script[:15000]}

Instruction:
{instruction}
{tempo_adjustment}

Rewrite the script:
"""
        
        response = self.llm_client.generate_content(
            prompt=user_prompt,
            model=target_model,
            system_instruction=system_instruction,
            full_response=False
        )
        
        return response

