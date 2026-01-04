FROM python:3.11-slim

# Create a non-root user
RUN useradd -m anchoruser

WORKDIR /app

# Install dependencies
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Copy application code
COPY . .
RUN chown -R anchoruser:anchoruser /app

USER anchoruser

EXPOSE 8000
CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "8000"]
