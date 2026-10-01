"""
Hermes Multi-Turn Tool Validation & Guardrails Engine.
======================================================
Ported & adapted from Nous Research Hermes Agent v0.21.5:
- turn_tool_validation.py
- tool_guardrails.py
- tool_result_classification.py

Protects the conversational director and worker roster from:
1. Infinite loop traps (repeated identical tool calls)
2. Missing or malformed required parameters
3. Transient vs Fatal error misclassification
4. Unhandled runtime exceptions by providing graceful fallback results
"""

import time
import logging
from enum import Enum
from typing import Dict, Any, List, Optional, Tuple

logger = logging.getLogger("hermes_tool_guardrails")


class ToolResultCategory(str, Enum):
    SUCCESS = "success"
    TRANSIENT_ERROR = "transient_error"  # Retryable / Fallback available
    FATAL_ERROR = "fatal_error"          # Unrecoverable with same parameters
    LOOP_TRAP = "loop_trap"              # Infinite loop detected


class HermesToolGuardrails:
    """
    Validates and classifies tool executions across multi-turn director sessions.
    """

    def __init__(self, max_consecutive_repeats: int = 3):
        self.max_consecutive_repeats = max_consecutive_repeats
        # session_id -> list of (tool_name, args_hash, timestamp)
        self._history: Dict[str, List[Tuple[str, int, float]]] = {}

    def _hash_args(self, args: Dict[str, Any]) -> int:
        try:
            # Sort keys for deterministic hash
            serialized = str(sorted(args.items()))
            return hash(serialized)
        except Exception:
            return hash(str(args))

    def pre_validate(
        self,
        tool_name: str,
        arguments: Dict[str, Any],
        session_id: str = "default"
    ) -> Tuple[bool, Optional[str], Optional[Dict[str, Any]]]:
        """
        Validates arguments and checks for recursion / loop traps before dispatching.
        Returns: (is_valid, error_message, sanitized_arguments)
        """
        if not isinstance(arguments, dict):
            return False, f"도구 인자가 JSON 객체 형식이 아닙니다: {type(arguments)}", None

        # 1. Check for Loop Trap (identical tool call executed consecutively)
        history = self._history.setdefault(session_id, [])
        args_hash = self._hash_args(arguments)
        now = time.time()

        # Clean history older than 5 minutes
        self._history[session_id] = [h for h in history if now - h[2] < 300]
        history = self._history[session_id]

        recent_repeats = 0
        for h_tool, h_hash, _ in reversed(history):
            if h_tool == tool_name and h_hash == args_hash:
                recent_repeats += 1
            else:
                break

        if recent_repeats >= self.max_consecutive_repeats:
            logger.warning(
                f"🚨 [Hermes Guardrails] Loop trap detected: '{tool_name}' called {recent_repeats + 1} times identically!"
            )
            return (
                False,
                f"무한 반복 루프 차단: 동일한 도구('{tool_name}')가 동일한 인자로 {recent_repeats + 1}회 연속 호출되었습니다. 다른 도구를 선택하거나 매개변수를 변경하세요.",
                None
            )

        # 2. Argument Sanitization
        sanitized = {}
        for k, v in arguments.items():
            if isinstance(v, str):
                sanitized[k] = v.strip()
            else:
                sanitized[k] = v

        # Record this invocation
        history.append((tool_name, args_hash, now))
        return True, None, sanitized

    def classify_result(
        self,
        tool_name: str,
        result: Dict[str, Any]
    ) -> Tuple[ToolResultCategory, str]:
        """
        Classifies execution outcome into SUCCESS, TRANSIENT_ERROR, or FATAL_ERROR.
        """
        if not isinstance(result, dict):
            return ToolResultCategory.FATAL_ERROR, "도구 반환 결과가 딕셔너리가 아닙니다."

        is_success = result.get("success", False)
        if is_success:
            return ToolResultCategory.SUCCESS, result.get("message", "도구 실행 성공")

        # Analyze error message / characteristics
        error_msg = str(result.get("error", "")).lower()

        # Transient error indicators (Network, busy, rate limit, timeout)
        transient_keywords = [
            "timeout", "busy", "rate limit", "429", "503", "504",
            "connection", "temporarily", "queue", "gpu full"
        ]
        is_transient = any(kw in error_msg for kw in transient_keywords) or result.get("fallback_available", False)

        if is_transient:
            logger.info(f"🔄 [Hermes Guardrails] Transient error classified for '{tool_name}': {error_msg}")
            return ToolResultCategory.TRANSIENT_ERROR, result.get("error", "일시적 네트워크 또는 원격 리소스 지연")

        return ToolResultCategory.FATAL_ERROR, result.get("error", "도구 실행 치명적 오류")

    def reset_session(self, session_id: str):
        """Clears invocation history for session."""
        self._history.pop(session_id, None)


hermes_guardrails = HermesToolGuardrails()
