from langchain_groq import ChatGroq
from langchain_core.prompts import ChatPromptTemplate, MessagesPlaceholder
from langchain_core.runnables import RunnablePassthrough
from sqlalchemy.orm import Session

from src.config.settings import MODEL_NAME, GROQ_API_KEY
from src.core.tools import make_faq_retriever_tool, human_handoff_tool


def get_agent(db: Session):
    """
    Create an agent using ChatGroq with tool binding.
    Returns a runnable that can be used with AgentExecutor.
    """
    llm = ChatGroq(
        model=MODEL_NAME,
        groq_api_key=GROQ_API_KEY,
    )

    tools = [make_faq_retriever_tool(db), human_handoff_tool]
    
    # Bind tools to the LLM
    llm_with_tools = llm.bind_tools(tools)

    prompt = ChatPromptTemplate.from_messages([
        ("system", 
         "You are a helpful customer support AI. "
         "Your primary source of information is the knowledge base accessed via 'faq_retriever_tool'. "
         "1. ALWAYS search the knowledge base first using 'faq_retriever_tool' for any user query. "
         "2. If the tool returns relevant information (even if it's from a book or document), USE IT to answer the user's question directly and politely. "
         "3. Only if the tool returns absolutely NO relevant information should you say you couldn't find anything. "
         "4. Do NOT ask the user if they want you to generate an answer using LLM. Instead, if the context is missing, just say: "
         "'I couldn't find specific information in our knowledge base about that. Would you like me to try answering based on my general knowledge?' "
         "5. If the user explicitly asks to speak to a human or is frustrated, use 'human_handoff_tool'."),
        MessagesPlaceholder(variable_name="chat_history"),
        ("human", "{input}"),
        MessagesPlaceholder(variable_name="agent_scratchpad"),
    ])

    # Manual implementation of format_to_openai_tool_messages
    from langchain_core.messages import AIMessage, ToolMessage
    
    def format_to_openai_tool_messages(intermediate_steps):
        messages = []
        for agent_action, observation in intermediate_steps:
            # Try to get tool_call_id from attribute or message_log
            tool_call_id = getattr(agent_action, "tool_call_id", None)
            
            if not tool_call_id and hasattr(agent_action, "message_log") and agent_action.message_log:
                for msg in agent_action.message_log:
                    if hasattr(msg, "tool_calls") and msg.tool_calls:
                        tool_call_id = msg.tool_calls[0]["id"]
                        break
            
            # Fallback if still missing (should not happen with OpenAI tools)
            if not tool_call_id:
                tool_call_id = f"call_{hash(agent_action.tool)}"

            # Ensure tool_input is a dict for 'args'
            tool_input = agent_action.tool_input
            if not isinstance(tool_input, dict):
                tool_input = {"input": str(tool_input)}

            messages.append(AIMessage(content="", tool_calls=[{
                "id": tool_call_id,
                "name": agent_action.tool,
                "args": tool_input
            }]))
            messages.append(ToolMessage(
                content=str(observation),
                tool_call_id=tool_call_id
            ))
        return messages

    # Manual implementation of OpenAIToolsAgentOutputParser
    from langchain_core.agents import AgentActionMessageLog, AgentFinish
    from langchain_core.output_parsers import BaseOutputParser
    
    class OpenAIToolsAgentOutputParser(BaseOutputParser):
        def parse(self, text: str):
            # This method is required by BaseOutputParser but might not be used if we override invoke
            return text

        def invoke(self, response, config=None, **kwargs):
            try:
                # If response is already an AgentAction or AgentFinish, return it
                if isinstance(response, (AgentActionMessageLog, AgentFinish)):
                    return response
                
                # If response is a message with tool calls
                if hasattr(response, "tool_calls") and response.tool_calls:
                    actions = []
                    for tool_call in response.tool_calls:
                        action = AgentActionMessageLog(
                            tool=tool_call["name"],
                            tool_input=tool_call["args"],
                            log=f"\nInvoking: {tool_call['name']} with {tool_call['args']}\n",
                            message_log=[response],
                            tool_call_id=tool_call["id"]
                        )
                        actions.append(action)
                    return actions
                
                # Otherwise, it's a finish message
                return AgentFinish(
                    return_values={"output": response.content},
                    log=str(response.content)
                )
            except Exception as e:
                # Fallback for safety
                return AgentFinish(
                    return_values={"output": str(response)},
                    log=str(response)
                )
        
    # Create the agent chain
    agent = (
        {
            "input": lambda x: x["input"],
            "agent_scratchpad": lambda x: format_to_openai_tool_messages(x["intermediate_steps"]),
            "chat_history": lambda x: x["chat_history"],
        }
        | prompt
        | llm_with_tools
        | OpenAIToolsAgentOutputParser()
    )
    
    return agent
