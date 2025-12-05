# AI Customer Support Chatbot

An **AI-powered customer support chatbot** built with **FastAPI (backend)** and **React (frontend)**.  
It supports **multi-turn conversations with memory**, integrates a **knowledge base from multiple PDF documents** for FAQ retrieval, includes **human handoff simulation**, **user authentication**, and an **admin dashboard** for managing PDFs and viewing analytics.  

The chatbot leverages **LangChain + LangGraph** for agentic workflows, **FAISS** for vector search, and **HuggingFace embeddings** for **Retrieval-Augmented Generation (RAG)**. Designed for scalability, security, and company-specific customization.

---

## 📖 Table of Contents
- [Features](#-features)  
- [Use Cases](#-use-cases)  
- [Project Flow](#-project-flow)  
- [Setup Instructions](#-setup-instructions)  
  - [Prerequisites](#prerequisites)  
  - [Backend Setup](#backend-setup)  
  - [Frontend Setup](#frontend-setup)  
  - [Full Setup & Run](#full-setup-and-run)  
- [Customization for a Specific Company](#-customization-for-a-specific-company)  
- [Contributing](#-contributing)  
- [License](#-license)  

---

## 🚀 Features

### Conversation & Tools
- **Multi-Turn Conversations with Memory**: Context-aware responses using trimmed chat history.
- **Knowledge Base Integration**: Searches multiple PDFs with **FAISS + HuggingFace embeddings** (all-MiniLM-L6-v2).
- **FAQ Retrieval Tool**: Retrieves relevant answers from active PDFs, tracks `used_book_ids` for analytics.
- **Human Handoff Simulation**: Escalates queries containing "escalate" or "human".

### User Authentication
- **Signup & Login**: JWT-based authentication with role-based access (user/admin).
- **Password Reset**: Token-based reset system (SMTP planned for future).

### Admin Dashboard (Admin-Only)
- **Bulk PDF Uploads**: Upload multiple PDFs at once.
- **Toggle Active/Inactive PDFs**: Controls FAISS index inclusion.
- **Delete PDFs**: Removes files and updates FAISS index.
- **Analytics**: Visualizes user activity (logins, chats, password resets) and book usage (via **Chart.js** bar/pie charts).

### Security
- **Rate Limiting**: 10 login attempts per minute per IP to prevent brute-force attacks.
- **JWT Authentication**: Secures API endpoints.
- **File Locking**: Ensures safe FAISS index updates with `filelock`.

### Frontend
- **Responsive UI**: Modern React interface with **Bootstrap** (cards, spinners, toasts via `react-toastify`).
- **Role-Based Navigation**: Admins see "Admin" tab; users see "Chat" and "Logout".

### Backend
- **FAISS Index Management**: Auto-rebuilds on PDF upload, toggle, or deletion.
- **SQLite Database**: Stores users, chat history, books, activities, and usage (PostgreSQL supported).
- **Logging**: Detailed DEBUG logs for troubleshooting.

---

## 💡 Use Cases
- **Customer Support**: Answers FAQs from PDFs or escalates to human support.
- **Company-Specific Bots**: Customizes support by uploading company manuals/FAQs.
- **Admin Knowledge Management**: Monitors query patterns and PDF usage via analytics.
- **Enterprise/Education**: Internal knowledge base with insights into user interactions.

---

## 🔄 Project Flow

### User Flow
1. **Signup/Login**: Users sign up (role="user" hardcoded) or login via UI; admins created via backend. JWT issued.
2. **Chat Interaction**:
   - User sends query to `/chat`.
   - LangGraph agent processes:
     - Trims chat history for context.
     - Invokes `faq_retriever_tool` to search active PDFs via FAISS.
     - Uses `human_handoff_tool` for escalation keywords ("escalate", "human").
   - Logs `UserActivity` (action=chat) and `BookUsage` (via `used_book_ids`).
   - Returns response with source info and updated history.
3. **Password Reset**: Requests token via username, resets password with token.

### Admin Flow
1. **Access Dashboard**: Admins navigate to `/admin` (role="admin" required).
2. **Manage PDFs**:
   - Upload multiple PDFs (saved to `BOOKS_UPLOAD_DIR`, added to DB).
   - Toggle active/inactive (updates FAISS index).
   - Delete PDFs (removes file and updates FAISS).
3. **View Analytics**:
   - User activity: Bar chart (logins, chats, password resets).
   - Book usage: Pie chart (counts from `BookUsage` table).

---

## ⚙️ Setup Instructions

### Prerequisites
- **Python 3.10+**
- **Node.js 18+**
- **SQLite** (default; PostgreSQL supported)
- **HuggingFace API token** (for embeddings; optional if using local model)

### Backend Setup
1. Clone the repository:
   ```bash
   git clone <your-repo-url>
   cd ai-customer-support-chatbot/src
   ```

2. Install dependencies:
   ```bash
   pip install fastapi sqlalchemy passlib[bcrypt] python-jose[cryptography] langchain langchain-community langchain-huggingface filelock slowapi
   ```

3. Create `.env` in `src/`:
   ```env
   SECRET_KEY=your-secret-key-32-chars
   EMBEDDING_MODEL=sentence-transformers/all-MiniLM-L6-v2
   FAISS_INDEX_PATH=../instance/faiss_index
   BOOKS_UPLOAD_DIR=../instance/books/uploads
   DATABASE_URL=sqlite:///../instance/users.db
   ```

4. Run the backend:
   ```bash
   uvicorn src.interfaces.api:app --reload
   ```
   Backend available at: 👉 [http://localhost:8000](http://localhost:8000)

### Frontend Setup
1. Navigate to frontend:
   ```bash
   cd ../frontend
   ```

2. Install dependencies:
   ```bash
   npm install react-router-dom axios jwt-decode react-bootstrap bootstrap @fortawesome/fontawesome-free react-toastify react-chartjs-2 chart.js
   ```

3. Run the frontend:
   ```bash
   npm start
   ```
   Frontend available at: 👉 [http://localhost:3000](http://localhost:3000)

### Full Setup & Run
1. **Create Admin User** (via Postman or DB):
   ```json
   POST http://localhost:8000/signup
   {
       "username": "admin1",
       "password": "admin123",
       "role": "admin"
   }
   ```

2. **User Actions**:
   - Signup/login via UI (role="user" hardcoded).
   - Chat with bot at `/chat`.

3. **Admin Actions**:
   - Login as admin, access `/admin`.
   - Upload PDFs, toggle active, delete, or view analytics.

4. **Verify Database**:
   ```bash
   sqlite3 instance/users.db
   .schema
   ```
   Ensure `users`, `chat_history`, `books`, `user_activity`, `book_usage` tables exist.

---

## 🏢 Customization for a Specific Company

To tailor the chatbot for a company (e.g., product support bot):

1. **Upload Company PDFs**:
   - Login as admin (`role="admin"`).
   - Navigate to `/admin`, upload company PDFs (e.g., product manuals, FAQs) via bulk upload.
   - Toggle relevant PDFs to active (enables them in FAISS for RAG).

2. **Use as Customer Support Bot**:
   - Users login and query via `/chat` (e.g., "How to reset device?").
   - Bot retrieves answers from active PDFs using `faq_retriever_tool`.
   - If query contains "escalate" or "human", or no answer is found, `human_handoff_tool` simulates escalation.
   - Responses include source info (e.g., "From manual.pdf: ...").

3. **Monitor Usage**:
   - Admins access `/admin` (Analytics tab).
   - View user activity (logins, chats, resets) in bar chart.
   - View book usage (PDF query counts) in pie chart to identify popular FAQs.

4. **Enhancements**:
   - **Branding**: Update `App.js` navbar and `Chat.js` header (e.g., add company logo, colors).
   - **Custom Tools**: Add company-specific tools in `tools.py` (e.g., `product_lookup_tool`).
   - **SMTP Integration**: Add `email` to `User` model in `models.py`, send password reset links via `smtplib` in `api.py`.
   - **Deployment**: Host backend on Heroku/AWS, frontend on Vercel/Netlify, use PostgreSQL for production.
   - **Scaling**: Add Redis for caching analytics (`/admin/analytics/*`), Celery for async FAISS rebuilds.

Example:
- Company uploads `product_manual.pdf` and `faqs.pdf`.
- User asks, "How to troubleshoot device?" → Bot retrieves from `product_manual.pdf`.
- Admin sees `product_manual.pdf` has high usage in pie chart, prioritizes updates.

---

## 👥 Contributing
1. Fork the repository.
2. Create a branch: `git checkout -b feature/new-feature`
3. Commit changes: `git commit -m "Add new feature"`
4. Push to branch: `git push origin feature/new-feature`
5. Open a Pull Request.

---

## 📜 License
MIT License - see [LICENSE](LICENSE) file for details.

---

## 🙌 Acknowledgments
- Built with FastAPI, React, LangChain, LangGraph, FAISS, HuggingFace.
- Inspired by RAG systems and customer support automation needs.

For issues or suggestions, open a [GitHub issue](<your-repo-url>/issues).