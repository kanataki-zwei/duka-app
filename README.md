# Duka App - ERP System

A modern ERP system for digital shops selling computers, phones, and accessories.

## Tech Stack

### Backend
- **FastAPI** - Python web framework
- **Supabase** - PostgreSQL database & authentication
- **Pydantic** - Data validation

### Frontend (Coming Soon)
- **Next.js** - React framework
- **TypeScript** - Type safety
- **Tailwind CSS** - Styling

## Project Structure
```
duka-app/
├── backend/          # FastAPI backend
│   ├── app/
│   │   ├── api/      # API endpoints
│   │   ├── core/     # Core configuration
│   │   ├── schemas/  # Pydantic schemas
│   │   └── utils/    # Utility functions
│   ├── .env.example
│   └── requirements.txt
└── frontend/         # Next.js frontend (coming soon)
```

## Backend Setup

1. Navigate to backend folder:
```bash
cd backend
```

2. Create virtual environment:
```bash
python -m venv venv
venv\Scripts\activate  # Windows
```

3. Install dependencies:
```bash
pip install -r requirements.txt
```

4. Create `.env` file from `.env.example` and add your Supabase credentials

5. Run development server:
```bash
uvicorn app.main:app --reload --port 8001
```

6. Access API documentation:
- Swagger UI: http://127.0.0.1:8001/docs
- ReDoc: http://127.0.0.1:8001/redoc

## Features

### Authentication ✅
- User signup/login
- JWT token-based authentication
- Company creation and management
- Role-based access control

### Planned Features
- [ ] Product catalog management
- [ ] Inventory tracking
- [ ] Client management
- [ ] Sales transactions
- [ ] Supplier management
- [ ] Expense tracking
- [ ] Reports & analytics

## Database Schema

Currently implemented:
- `companies` - Company information
- `company_users` - User-company relationships with roles

## API Endpoints

### Authentication
- `POST /api/v1/auth/signup` - Register new user
- `POST /api/v1/auth/login` - Login user
- `POST /api/v1/auth/company` - Create company (authenticated)
- `GET /api/v1/auth/me` - Get current user (authenticated)

## License

MIT