from langgraph.graph import StateGraph, END
from langchain.agents import AgentExecutor
from src.core.agent import get_agent
from src.core.tools import human_handoff_tool, make_faq_retriever_tool
from src.core.memory import AgentState, trim_history
from src.db.models import User
from src.utils.logger import setup_logger
from langchain_core.messages import HumanMessage, AIMessage
from sqlalchemy.orm import Session
from langchain.callbacks import LangChainTracer

logger = setup_logger()

def agent_node(state: AgentState, db: Session) -> AgentState:
    trimmed_history = trim_history(state.get("chat_history", []))
    agent = get_agent(db)
    faq_retriever_tool = make_faq_retriever_tool(db)
    executor = AgentExecutor(
        agent=agent,
        tools=[human_handoff_tool, faq_retriever_tool],
        verbose=True,
        max_tokens=500
    )
    try:
        result = executor.invoke({
            "input": state["input"],
            "chat_history": trimmed_history
        })
        output = result["output"] if isinstance(result, dict) else str(result)
        used_book_ids = result.get("used_book_ids", [])  # From faq_retriever_tool
        if isinstance(result, dict) and "faq_retriever_tool" in result:
            faq_result = result["faq_retriever_tool"]
            output = faq_result["content"] if isinstance(faq_result, dict) else faq_result
            used_book_ids = faq_result.get("used_book_ids", []) if isinstance(faq_result, dict) else []
        full_history = state.get("chat_history", []) + [
            HumanMessage(content=state["input"]),
            AIMessage(content=output)
        ]
        return {
            "output": output,
            "chat_history": full_history,
            "user_id": state["user_id"],
            "used_book_ids": used_book_ids
        }
    except Exception as e:
        logger.error(f"Error in agent_node: {str(e)}")
        full_history = state.get("chat_history", []) + [
            HumanMessage(content=state["input"]),
            AIMessage(content=f"Error: {str(e)}")
        ]
        return {
            "output": f"Error: {str(e)}",
            "chat_history": full_history,
            "user_id": state["user_id"],
            "used_book_ids": []
        }

def should_handoff(state: AgentState) -> str:
    if "escalate" in state["input"].lower() or "human" in state["input"].lower():
        return "handoff"
    return "end"

def handoff_node(state: AgentState) -> AgentState:
    output = human_handoff_tool(state["input"])
    full_history = state.get("chat_history", []) + [
        HumanMessage(content=state["input"]),
        AIMessage(content=output)
    ]
    return {
        "output": output,
        "chat_history": full_history,
        "user_id": state["user_id"],
        "used_book_ids": []
    }

def build_graph(db: Session):
    graph = StateGraph(AgentState)
    graph.add_node("agent", lambda state: agent_node(state, db))
    graph.add_node("handoff", handoff_node)
    graph.set_entry_point("agent")
    graph.add_conditional_edges("agent", should_handoff, {"handoff": "handoff", "end": END})
    graph.add_edge("handoff", END)
    return graph.compile()