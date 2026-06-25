FROM python:3.11-slim

# Copy uv from the official image
COPY --from=ghcr.io/astral-sh/uv:latest /uv /uvx /bin/

WORKDIR /app

# Copy dependency files
COPY pyproject.toml .

# Install dependencies globally in the system environment using uv
RUN uv pip install --system -e .

# Copy the rest of the application
COPY main.py .

# Expose the port that Cloud Run expects
EXPOSE 8080

# Run the FastAPI app using the standard fastapi CLI
CMD ["fastapi", "run", "main.py", "--port", "8080"]
