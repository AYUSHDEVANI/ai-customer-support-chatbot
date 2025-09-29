import json
import logging
from typing import List
from fastapi import FastAPI, Depends, HTTPException, Request, UploadFile, File, WebSocket
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from sqlalchemy import func
from sqlalchemy.orm import Session
from src.core.graph import build_graph
from src.core.memory import AgentState
from src.db.models import BookUsage, User, ChatHistory, Book, PasswordResetToken, UserActivity
from src.db.database import get_db, Base, engine
from src.interfaces.auth import verify_password, get_password_hash, create_access_token, get_current_user, get_current_admin
from src.data.embeddings import build_vector_store
from langchain_core.messages import HumanMessage, AIMessage
from datetime import datetime, timedelta
import os
import secrets
from src.config.settings import BOOKS_UPLOAD_DIR

from slowapi import Limiter, _rate_limit_exceeded_handler
from slowapi.util import get_remote_address
from slowapi.errors import RateLimitExceeded

logging.basicConfig(level=logging.DEBUG)
logger = logging.getLogger(__name__)

app = FastAPI(title="AI Customer Support Chatbot")

# Rate Limiter
limiter = Limiter(key_func = get_remote_address)
app.state.limiter = limiter
app.add_exception_handler(RateLimitExceeded, _rate_limit_exceeded_handler)

# # WebSocket PubSub
# pubsub = PubSubServer()
# app.on_event("startup")(pubsub.start)
# app.on_event("shutdown")(pubsub.stop)


app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

Base.metadata.create_all(bind=engine)

class UserCreate(BaseModel):
    username: str
    password: str
    role: str = "user"
    

class UserLogin(BaseModel):
    username: str
    password: str

class PasswordResetRequest(BaseModel):
    username: str
    
class PasswrodReset(BaseModel):
    username: str
    token: str
    new_password: str

class ChatRequest(BaseModel):
    user_input: str

class BookToggle(BaseModel):
    id: int
    active: bool

class BookDelete(BaseModel):
    id: int

class Token(BaseModel):
    access_token: str
    token_type: str

@app.post("/signup", response_model=Token)
async def signup(user: UserCreate, db: Session = Depends(get_db)):
    logger.debug(f"Signup attempt for username: {user.username}, role: {user.role}")
    if db.query(User).filter(User.username == user.username).first():
        raise HTTPException(status_code=400, detail="Username already exists")
    hashed_password = get_password_hash(user.password)
    
    db_user = User(
        username=user.username, 
        hashed_password=hashed_password, 
        role=user.role,
        )
    db.add(db_user)
    db.commit()
    db.refresh(db_user)
    access_token = create_access_token(data={"sub": user.username, "role": user.role})
    logger.debug(f"User {user.username} created with role {user.role}")
    return {"access_token": access_token, "token_type": "bearer"}

@app.post("/login", response_model=Token)
@limiter.limit("5/minutes") # 5 attempts per minute per IP
async def login(user: UserLogin, db: Session = Depends(get_db), request: Request = None):
    logger.debug(f"Login attempt for username: {user.username}")
    db_user = db.query(User).filter(User.username == user.username).first()
    if not db_user or not verify_password(user.password, db_user.hashed_password):
        raise HTTPException(status_code=401, detail="Invalid credentials")
    access_token = create_access_token(data={"sub": db_user.username, "role": db_user.role})

    # Log Login activity
    db.add(UserActivity(user_id = db_user.id, action="login"))
    db.commit()

    logger.debug(f"User {db_user.username} logged in with role {db_user.role}")
    return {"access_token": access_token, "token_type": "bearer"}

@app.post("/password-reset-request")
async def password_reset_request(req: PasswordResetRequest, db: Session = Depends(get_db)):
    logger.debug(f'Password reset request for username: {req.username}')

    user = db.query(User).filter(User.username == req.username).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not Found")
    
    # Generate a security token
    token = secrets.token_urlsafe(32)
    expired_at = datetime.utcnow() + timedelta(hours=1)

    # Remove existing token for this user
    db.query(PasswordResetToken).filter(PasswordResetToken.user_id == user.id).delete()

    # Store new token
    db_token = PasswordResetToken(
        user_id = user.id,
        token = token,
        expired_at = expired_at
    )

    db.add(db_token)
    db.add(UserActivity(user_id = user.id, action="password_reset_request"))
    
    db.commit()
    # db.refresh(db_token)

    return {"token": token, "message": "Reset Token generated "}


@app.post("/password-reset")
async def password_reset(req: PasswrodReset, db: Session = Depends(get_db)):
    logger.debug(f"Password reset successful for {req.username}")

    user = db.query(User).filter(User.username == req.username).first()

    if not user:
        raise HTTPException(status_code=404, detail="User not Found")
    
    token_record = db.query(PasswordResetToken).filter(
        PasswordResetToken.user_id == user.id,
        PasswordResetToken.token == req.token,
        PasswordResetToken.expired_at > datetime.utcnow()
    ).first()

    if not token_record:
        raise HTTPException(status_code=401, detail = "Invalid or expired token")
    
    user.hashed_password = get_password_hash(req.new_password)
    db.query(PasswordResetToken).filter(PasswordResetToken.user_id == user.id).delete()
    db.commit()

    logger.debug(f"Password reset successful for {req.username}") 

    return {"message": "Password reset successful"}


@app.get("/chat")
async def get_chat_history(current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    logger.debug(f"Fetching chat history for user {current_user.username}")
    history = [
        {"role": ch.role, "content": ch.content}
        for ch in db.query(ChatHistory).filter(ChatHistory.user_id == current_user.id).order_by(ChatHistory.id).all()
    ]
    return {"chat_history": history}

@app.post("/chat")
async def chat(
    request: ChatRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    try:
        logger.debug(f"Chat request from user {current_user.username}: {request.user_input}")
        history = [
            HumanMessage(content=ch.content) if ch.role == "user" else AIMessage(content=ch.content)
            for ch in db.query(ChatHistory).filter(ChatHistory.user_id == current_user.id).order_by(ChatHistory.id.desc()).limit(5).all()
        ]
        history = list(reversed(history))
        graph = build_graph(db)
        state = AgentState(input=request.user_input, chat_history=history, output="", user_id=current_user.id)
        result = graph.invoke(state)
        chat_id = db.query(ChatHistory).count() + 1
        db.add(ChatHistory(user_id=current_user.id, role="user", content=request.user_input))
        db.add(ChatHistory(user_id=current_user.id, role="assistant", content=result["output"]))
        db.add(UserActivity(user_id=current_user.id, action="chat"))
        used_book_ids = result.get("used_book_ids", [])
        for book_id in used_book_ids:
            db.add(BookUsage(book_id=book_id, chat_id=chat_id))
        db.commit()
        serialized_history = [
            {"role": ch.role, "content": ch.content}
            for ch in db.query(ChatHistory).filter(ChatHistory.user_id == current_user.id).order_by(ChatHistory.id).all()
        ]
        return {"response": result["output"], "chat_history": serialized_history}
    except Exception as e:
        logger.error(f"Chat error: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))
    
    
@app.post("/admin/books/upload")
async def upload_book(
    files: List[UploadFile] = File(...),
    current_admin: User = Depends(get_current_admin),
    db: Session = Depends(get_db)
):
    logger.debug(f"Book upload attempt by admin {current_admin.username}: {files}")

    if not files:
        raise HTTPException(status_code=400, detail="No file provided")

    uploaded_books = []
    os.makedirs(BOOKS_UPLOAD_DIR, exist_ok=True)


    for file in files:
        if not file.filename.endswith('.pdf'):
            raise HTTPException(status_code=400, detail="Only PDF files allowed")
        if file.size > 20 * 1024 * 1024:
            raise HTTPException(status_code=400, detail="File too large")
        os.makedirs(BOOKS_UPLOAD_DIR, exist_ok=True)
        file_path = os.path.join(BOOKS_UPLOAD_DIR, file.filename)
        with open(file_path, "wb") as buffer:
            buffer.write(await file.read())
        
        if db.query(Book).filter(Book.name == file.filename).first():
            raise HTTPException(status_code=400, detail="Book with this name already exists")
        
        db_book = Book(name=file.filename, path=file_path, active=False)
        db.add(db_book)
        uploaded_books.append(file.filename)
    db.commit()
    # db.refresh(db_book)
    
    build_vector_store(db, force_rebuild=True)
    logger.debug(f"Books '{uploaded_books}' uploaded and FAISS index rebuilt")

    # publish Notification to admins
    # await pubsub.publish(
    #     topic="admin_notifications",
    #     message=json.dumps({
    #         "type": "book_upload",
    #         "message": f"Book '{file.filename}' uploaded by {current_admin.username}",
    #         "book" : {"id": db_book.id, "name": db_book.name, "active": db_book.active}
    #     })
    # )
    return {"message": f"Book '{', '.join(uploaded_books)}' uploaded successfully"}

@app.get("/admin/books")
async def list_books(current_admin: User = Depends(get_current_admin), db: Session = Depends(get_db)):
    logger.debug(f"Listing books for admin {current_admin.username}")
    books = db.query(Book).all()
    response = [{"id": b.id, "name": b.name, "active": b.active} for b in books]
    logger.debug(f"Books response: {response}")
    return response

@app.post("/admin/books/toggle")
async def toggle_book(toggle: BookToggle, current_admin: User = Depends(get_current_admin), db: Session = Depends(get_db)):
    logger.debug(f"Toggle book {toggle.id} to active={toggle.active} by admin {current_admin.username}")
    book = db.query(Book).filter(Book.id == toggle.id).first()
    if not book:
        raise HTTPException(status_code=404, detail="Book not found")
    book.active = toggle.active
    db.commit()
    
    build_vector_store(db, force_rebuild=True)
    logger.debug(f"Book '{book.name}' toggled to {'active' if toggle.active else 'inactive'}, FAISS index rebuilt")

    # Publish notification to admins
    # await pubsub.publish(
    #     topic="admin_notifications",
    #     message=json.dumps({
    #         "type": "book_toggle",
    #         "message": f"Book '{book.name}' toggled to {'active' if toggle.active else 'inactive'} by {current_admin.username}",
    #         "book": {"id": book.id, "name": book.name, "active": book.active}
    #     })
    # )

    return {"message": f"Book '{book.name}' toggled to {'active' if toggle.active else 'inactive'}"}



@app.post("/admin/books/delete")
async def delete_book(delete: BookDelete, current_admin: User = Depends(get_current_admin), db: Session = Depends(get_db)):
    logger.debug(f"Delete book {delete.id} attempt by admin {current_admin.username}")

    book = db.query(Book).filter(Book.id == delete.id).first()

    if not Book:
        raise HTTPException(status_code=404, detail = "Book Not Found")
    
    try:
        os.remove(book.path)
    except OSError as e:
        logger.warning(f"Failed to delete file {book.path}: {str(e)}")

    db.delete(book)
    db.commit()
    build_vector_store(db, force_rebuild=True)

    logger.debug(f"Book '{book.name}' deleted and FAISS index rebuilt")

    return {"message": f"Book '{book.name}' deleted successfully"}



@app.get("/admin/analytics/users")
async def user_analytics(
    current_admin: User = Depends(get_current_admin),
    db: Session = Depends(get_db)
):
    
    logger.debug(f"Fetching user analytics for admin {current_admin.username}")

    # Aggregate user activity counts
    activity_counts = db.query(
        User.username,
        func.count(UserActivity.id).filter(UserActivity.action == "login").label("login_count"),
        func.count(UserActivity.id).filter(UserActivity.action == "chat").label("chat_count"),
        func.count(UserActivity.id).filter(UserActivity.action == "password_reset_request").label("reset_count")
    ).join(UserActivity, User.id == UserActivity.user_id, isouter=True).group_by(
        User.id, User.username
    ).all()

    response = [
        {
            "username" : username,
            "logins" : login_count,
            "chats" : chat_count,
            "password_resets" : reset_count
        }
        for username, login_count, chat_count, reset_count in activity_counts
    ]

    logger.debug(f"User analytics response: {response}")

    return response


@app.get("/admin/analytics/books")
async def book_analytics(
    current_admin: User = Depends(get_current_admin),
    db: Session = Depends(get_db)
):
    
    logger.debug(f"Fetching book analytics for admin {current_admin.username}")

    usage_counts = db.query(
        Book.name,
        func.count(BookUsage.id).label("usage_count")
    ).join(BookUsage, Book.id == BookUsage.book_id, isouter=True)\
        .group_by(Book.id, Book.name).all()

    response = [
        {
            "name" : name,
            "usage_count" : usage_count
        }
        for name, usage_count in usage_counts
    ]

    logger.debug(f"Book analytics response: {response}")

    return response

# @app.websocket("/ws/notifications")
# async def websocket_notifications(websocket: WebSocket):
#     await websocket.accept()

#     async with pubsub.subscribe(websocket, topic="admin_notifications") as subscriber:
#         async for event in subscriber:
#             await websocket.send_text(event.message)
