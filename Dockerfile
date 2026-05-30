# ==========================================
# STAGE 1: Build the React Frontend (Vite)
# ==========================================
FROM node:18 AS frontend-builder
WORKDIR /app/frontend

# Copy package files and install dependencies
COPY frontend/package*.json ./
RUN npm install

# Copy the rest of the frontend code and build
COPY frontend/ ./
RUN npm run build

# ==========================================
# STAGE 2: Setup FastAPI Backend & Serve
# ==========================================
FROM python:3.10-slim
WORKDIR /app

# Install Python dependencies
COPY backend/requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Copy backend files (main.py and your .pkl models)
COPY backend/ ./backend/

# Copy the compiled React UI from Stage 1 into a 'static' folder
COPY --from=frontend-builder /app/frontend/dist ./static

# Expose the standard Hugging Face port
EXPOSE 7860

# Run Uvicorn pointing to your main.py inside the backend folder
CMD ["uvicorn", "backend.main:app", "--host", "0.0.0.0", "--port", "7860"]