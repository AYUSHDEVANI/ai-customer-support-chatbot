# Stage 1: Build the React Frontend
FROM node:18-alpine as frontend-build
WORKDIR /app/frontend
COPY frontend/package*.json ./
RUN npm install
COPY frontend/ ./
RUN npm run build

# Stage 2: Setup the Python Backend
FROM python:3.11-slim

WORKDIR /app

# Install system dependencies if needed (e.g., for psycopg2)
RUN apt-get update && apt-get install -y \
    build-essential \
    libpq-dev \
    && rm -rf /var/lib/apt/lists/*

# Install Python dependencies
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Copy backend code
COPY src/ ./src/
COPY main.py .

# Copy built frontend assets from Stage 1
COPY --from=frontend-build /app/frontend/build /app/static

# Expose port
EXPOSE 8000

# Command to run the application
CMD ["uvicorn", "src.interfaces.api:app", "--host", "0.0.0.0", "--port", "8000"]
