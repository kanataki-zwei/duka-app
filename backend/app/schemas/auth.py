from pydantic import BaseModel, EmailStr
from typing import Optional
from datetime import datetime

# User Schemas
class UserCreate(BaseModel):
    email: EmailStr
    password: str

class UserLogin(BaseModel):
    email: EmailStr
    password: str

class UserResponse(BaseModel):
    id: str
    email: str
    created_at: datetime

# Company Schemas
class CompanyCreate(BaseModel):
    name: str

class CompanyResponse(BaseModel):
    id: str
    name: str
    created_at: datetime
    is_active: bool
    website: Optional[str] = None
    address: Optional[str] = None
    kra_number: Optional[str] = None
    description: Optional[str] = None
    logo_url: Optional[str] = None

class CompanyUpdate(BaseModel):
    name: Optional[str] = None
    website: Optional[str] = None
    address: Optional[str] = None
    kra_number: Optional[str] = None
    description: Optional[str] = None

# Company User Schemas
class CompanyUserCreate(BaseModel):
    company_id: str
    role: str = "owner"

class CompanyUserResponse(BaseModel):
    id: str
    company_id: str
    user_id: str
    role: str
    created_at: datetime
    is_active: bool

# Token Schemas
class Token(BaseModel):
    access_token: str
    token_type: str = "bearer"
    user: UserResponse
    company: Optional[CompanyResponse] = None

class TokenData(BaseModel):
    user_id: Optional[str] = None