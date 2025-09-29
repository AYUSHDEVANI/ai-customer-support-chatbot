from typing import TypedDict, Annotated 
from langchain_core.messages import AIMessage, HumanMessage
from langchain_core.messages.utils import get_buffer_string


class AgentState(TypedDict):
    input: str
    chat_history: list[HumanMessage | AIMessage]
    output : str
    user_id: int

def trim_history(history: list, max_tokens: int = 8000) -> list:
    """Trim history to fit under max_tokens (rough estimate: 4 chars/token)."""
    if not history:
        return []
    # Simple char-based trim (or use tiktoken for precision: pip install tiktoken)
    buffer = get_buffer_string(history)
    if len(buffer) <= max_tokens * 4:  # Rough: 4 chars per token
        return history
    # Keep last N messages until under limit
    trimmed = []
    for msg in reversed(history):
        trimmed.insert(0, msg)
        buffer = get_buffer_string(trimmed)
        if len(buffer) > max_tokens * 4:
            return trimmed[1:]  # Drop oldest
    return trimmed