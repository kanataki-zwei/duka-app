# ERP System - Backend

FastAPI backend for the ERP system.

## Setup

1. Create virtual environment:
```bash
   python -m venv venv
   source venv/bin/activate  # Mac/Linux
   venv\Scripts\activate     # Windows
```

2. Install dependencies:
```bash
   pip install -r requirements.txt
```

3. Create `.env` file from `.env.example` and add your Supabase credentials

4. Run development server:
```bash
   uvicorn app.main:app --reload --port 8000
```

5. Access API documentation:
   - Swagger UI: http://localhost:8000/docs
   - ReDoc: http://localhost:8000/redoc

## Project Structure
```
backend/
├── app/
│   ├── api/          # API endpoints
│   ├── core/         # Core configuration
│   ├── models/       # Database models
│   ├── schemas/      # Pydantic schemas
│   └── utils/        # Utility functions
└── requirements.txt
```