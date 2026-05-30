# ==========================================
# STAGE 1: Build the React Frontend (Vite)
# ==========================================
# UPDATED: Using Node 20 to support the latest Vite version
FROM node:20 AS frontend-builder
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

# UPDATED: Copy backend AND ml_engine folders based on your exact repo structure
COPY backend/ ./backend/
COPY ml_engine/ ./ml_engine/

# Copy the compiled React UI from Stage 1 into a 'static' folder
COPY --from=frontend-builder /app/frontend/dist ./static

# Expose the standard Hugging Face port
EXPOSE 7860

# UPDATED: Run Uvicorn pointing to main.py inside backend/app/
CMD ["uvicorn", "backend.app.main:app", "--host", "0.0.0.0", "--port", "7860"]