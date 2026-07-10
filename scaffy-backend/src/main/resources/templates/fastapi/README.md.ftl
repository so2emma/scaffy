# ${projectName}

This is a FastAPI backend application scaffolded by Scaffy.

## Project Structure
- `app/main.py`: Main entry point
- `app/config.py`: Application configuration and settings
- `app/database.py`: SQLAlchemy session and connection engine
- `app/models/`: SQLAlchemy database models
- `app/schemas/`: Pydantic validation schemas
- `app/crud/`: Database CRUD helper functions
- `app/routers/`: FastAPI router endpoints

## Running Locally

1. Create a virtual environment:
   ```bash
   python3 -m venv venv
   source venv/bin/activate
   ```

2. Install dependencies:
   ```bash
   pip install -r requirements.txt
   ```

3. Run the development server:
   ```bash
   uvicorn app.main:app --reload
   ```

4. Interactive API docs (Swagger UI) will be available at [http://127.0.0.1:8000/docs](http://127.0.0.1:8000/docs)
