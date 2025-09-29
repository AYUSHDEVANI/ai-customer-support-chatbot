from sqlalchemy import Boolean, Column, Integer, String, ForeignKey, Text, DateTime
from sqlalchemy.sql import func
from sqlalchemy.orm import relationship

from src.db.database import Base

class User(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index = True)
    username = Column(String, unique = True, index=True)
    hashed_password = Column(String)
    role = Column(String, default="user")
    chat_histories = relationship("ChatHistory", back_populates="user")
    password_reset_token = relationship("PasswordResetToken", back_populates="user")


class ChatHistory(Base):
    __tablename__ = "chat_histories"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"))
    role = Column(String) # "user" or assistant

    content = Column(Text)
    user = relationship("User", back_populates="chat_histories")

class Book(Base):
    __tablename__ = "books"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, unique=True)
    path = Column(String) # Full path of the pdf
    active = Column(Boolean, default=False)

class PasswordResetToken(Base):
    __tablename__ = "password_reset_token"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    token = Column(String, unique=True, index=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    expired_at = Column(DateTime(timezone=True))
    user = relationship("User", back_populates="password_reset_token")


class UserActivity(Base):
    __tablename__ = "user_activity"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), index=True)
    action = Column(String)     # e.g., Login, chat, password_reset_request 
    timestamp = Column(DateTime(timezone=True), server_default=func.now())


class BookUsage(Base):
    __tablename__ = "book_usage"

    id = Column(Integer, primary_key=True, index=True)
    book_id = Column(Integer, ForeignKey("books.id"), index=True)
    chat_id = Column(Integer, ForeignKey("chat_histories.id"), index=True)
    timestamp = Column(DateTime(timezone=True), server_default=func.now())