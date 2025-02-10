# Use Python 3.11
FROM python:3.11-slim

# Set working directory
WORKDIR /app

# Copy requirements and install dependencies
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Copy application files
COPY . .

# Create necessary directories
RUN mkdir -p static/images

# Create initial JSON files if they don't exist
RUN echo '{"teams": [], "users": []}' > users_and_teams.json
RUN echo '[]' > submissions.json
RUN touch winners.csv

# Expose port
EXPOSE 5000

# Set environment variable
ENV FLASK_APP=app.py

# Run the application
CMD ["python", "main.py"]