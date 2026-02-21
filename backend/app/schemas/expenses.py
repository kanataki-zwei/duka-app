from pydantic import BaseModel, Field
from typing import Optional, List
from datetime import datetime, date
from enum import Enum
from decimal import Decimal

# ==========================================
# ENUMS
# ==========================================

class ExpenseType(str, Enum):
    standard = "standard"
    sales = "sales"

class RecurrenceFrequency(str, Enum):
    weekly = "weekly"
    monthly = "monthly"

class ExpensePaymentStatus(str, Enum):
    unpaid = "unpaid"
    partial = "partial"
    paid = "paid"

class ExpensePaymentMethod(str, Enum):
    cash = "cash"
    mpesa = "mpesa"
    bank = "bank"
    card = "card"

# ==========================================
# EXPENSE CATEGORY SCHEMAS
# ==========================================

class ExpenseCategoryBase(BaseModel):
    name: str = Field(..., min_length=1, max_length=100)
    expense_type: ExpenseType
    description: Optional[str] = None

class ExpenseCategoryCreate(ExpenseCategoryBase):
    pass

class ExpenseCategoryUpdate(BaseModel):
    name: Optional[str] = Field(None, min_length=1, max_length=100)
    expense_type: Optional[ExpenseType] = None
    description: Optional[str] = None
    is_active: Optional[bool] = None

class ExpenseCategoryResponse(ExpenseCategoryBase):
    id: str
    company_id: str
    is_active: bool
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True

# ==========================================
# EXPENSE SCHEMAS
# ==========================================

class ExpenseBase(BaseModel):
    expense_category_id: str
    expense_type: ExpenseType
    title: str = Field(..., min_length=1, max_length=200)
    description: Optional[str] = None
    amount: Decimal = Field(..., gt=0)
    supplier_id: Optional[str] = None
    sale_id: Optional[str] = None
    expense_date: date = Field(default_factory=date.today)
    notes: Optional[str] = None

class ExpenseCreate(ExpenseBase):
    is_recurring: bool = False
    recurrence_frequency: Optional[RecurrenceFrequency] = None
    recurrence_day_of_week: Optional[int] = Field(None, ge=0, le=6)
    recurrence_day_of_month: Optional[int] = Field(None, ge=1, le=31)
    recurrence_end_date: Optional[date] = None

class ExpenseUpdate(BaseModel):
    title: Optional[str] = Field(None, min_length=1, max_length=200)
    description: Optional[str] = None
    amount: Optional[Decimal] = Field(None, gt=0)
    supplier_id: Optional[str] = None
    sale_id: Optional[str] = None
    expense_date: Optional[date] = None
    notes: Optional[str] = None
    payment_status: Optional[ExpensePaymentStatus] = None

class ExpenseResponse(ExpenseBase):
    id: str
    company_id: str
    payment_status: ExpensePaymentStatus
    amount_paid: Decimal
    amount_due: Decimal
    is_recurring: bool
    recurrence_frequency: Optional[RecurrenceFrequency] = None
    recurrence_day_of_week: Optional[int] = None
    recurrence_day_of_month: Optional[int] = None
    recurrence_end_date: Optional[date] = None
    parent_expense_id: Optional[str] = None
    created_by: Optional[str] = None
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True

class ExpenseWithDetails(ExpenseResponse):
    category: Optional[dict] = None
    supplier: Optional[dict] = None
    sale: Optional[dict] = None
    payments: List[dict] = []

# ==========================================
# EXPENSE PAYMENT SCHEMAS
# ==========================================

class ExpensePaymentCreate(BaseModel):
    expense_id: str
    amount: Decimal = Field(..., gt=0)
    payment_date: date = Field(default_factory=date.today)
    payment_method: ExpensePaymentMethod
    reference_number: Optional[str] = None
    notes: Optional[str] = None

class ExpensePaymentResponse(ExpensePaymentCreate):
    id: str
    company_id: str
    created_by: Optional[str] = None
    created_at: datetime

    class Config:
        from_attributes = True