from pydantic import BaseModel, Field, EmailStr
from typing import Optional
from datetime import datetime
from enum import Enum

# ==========================================
# ENUMS
# ==========================================

class CustomerType(str, Enum):
    individual = "individual"
    business = "business"
    walk_in = "walk-in"

class CustomerStatus(str, Enum):
    active = "active"
    inactive = "inactive"
    suspended = "suspended"

# ==========================================
# CUSTOMER TIER SCHEMAS
# ==========================================

class CustomerTierBase(BaseModel):
    name: str = Field(..., min_length=1, max_length=100)
    discount_percentage: float = Field(..., ge=0, le=100)
    description: Optional[str] = None

class CustomerTierCreate(CustomerTierBase):
    pass

class CustomerTierUpdate(BaseModel):
    name: Optional[str] = Field(None, min_length=1, max_length=100)
    discount_percentage: Optional[float] = Field(None, ge=0, le=100)
    description: Optional[str] = None

class CustomerTierResponse(CustomerTierBase):
    id: str
    company_id: str
    is_default: bool
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True

# ==========================================
# CUSTOMER SCHEMAS
# ==========================================

class CustomerBase(BaseModel):
    customer_type: CustomerType
    name: str = Field(..., min_length=1, max_length=200)
    email: Optional[EmailStr] = None
    phone: Optional[str] = Field(None, max_length=50)
    address: Optional[str] = None
    tax_id: Optional[str] = Field(None, max_length=100)
    payment_term_id: Optional[str] = None
    customer_tier_id: Optional[str] = None
    credit_limit: float = Field(default=0, ge=0)
    status: CustomerStatus = CustomerStatus.active
    notes: Optional[str] = None

class CustomerCreate(CustomerBase):
    pass

class CustomerUpdate(BaseModel):
    customer_type: Optional[CustomerType] = None
    name: Optional[str] = Field(None, min_length=1, max_length=200)
    email: Optional[EmailStr] = None
    phone: Optional[str] = Field(None, max_length=50)
    address: Optional[str] = None
    tax_id: Optional[str] = Field(None, max_length=100)
    payment_term_id: Optional[str] = None
    customer_tier_id: Optional[str] = None
    credit_limit: Optional[float] = Field(None, ge=0)
    status: Optional[CustomerStatus] = None
    notes: Optional[str] = None

class CustomerResponse(CustomerBase):
    id: str
    company_id: str
    current_balance: float
    is_default: bool
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True

class CustomerWithDetails(CustomerResponse):
    payment_term: Optional[dict] = None
    customer_tier: Optional[dict] = None

class CreditCheckRequest(BaseModel):
    sale_amount: float = Field(..., gt=0)

class CreditCheckResponse(BaseModel):
    has_credit: bool
    credit_limit: float
    current_balance: float
    available_credit: float
    sale_amount: float
    message: str