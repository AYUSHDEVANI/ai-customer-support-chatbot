from langchain_groq import ChatGroq
from langchain_core.prompts import ChatPromptTemplate, MessagesPlaceholder
from langchain.agents import create_tool_calling_agent
from sqlalchemy.orm import Session

from src.config.settings import MODEL_NAME, GROQ_API_KEY
from src.core.tools import make_faq_retriever_tool, human_handoff_tool



def get_agent(db: Session):



    llm = ChatGroq(
        model=MODEL_NAME,
        groq_api_key = GROQ_API_KEY,
        
        
    )

    tools = [make_faq_retriever_tool(db), human_handoff_tool]

    prompt = ChatPromptTemplate.from_messages([
    ("system", 
     "You are a customer support AI. "
     "Always check the FAQ knowledge base first using faq_retriever_tool. "
     "If no relevant FAQ is found, DO NOT generate an answer immediately. "
     "Instead, respond with: "
     "'No relevant FAQ found. Do you want me to generate an answer using LLM?' "
     "If the user replies 'yes', then generate an answer with your own reasoning. "
     "If the user replies 'no', use human_handoff_tool."),
    MessagesPlaceholder(variable_name="chat_history"),
    ("human", "{input}"),
    MessagesPlaceholder(variable_name="agent_scratchpad"),
])


    return create_tool_calling_agent(
        llm,
        tools,
        prompt
    )