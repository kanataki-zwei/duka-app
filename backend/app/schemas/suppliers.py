from pydantic import BaseModel, Field, EmailStr
from typing import Optional, List
from datetime import datetime

# ==========================================
# PAYMENT TERMS SCHEMAS
# ==========================================

class PaymentTermBase(BaseModel):
    name: str = Field(..., min_length=1, max_length=100)
    description: Optional[str] = None
    days: Optional[int] = Field(None, ge=0)

class PaymentTermCreate(PaymentTermBase):
    pass

class PaymentTermUpdate(BaseModel):
    name: Optional[str] = Field(None, min_length=1, max_length=100)
    description: Optional[str] = None
    days: Optional[int] = Field(None, ge=0)

class PaymentTermResponse(PaymentTermBase):
    id: str
    company_id: str
    created_at: datetime

    class Config:
        from_attributes = True

# ==========================================
# SUPPLIER SCHEMAS
# ==========================================

class SupplierBase(BaseModel):
    name: str = Field(..., min_length=1, max_length=200)
    contact_person: Optional[str] = Field(None, max_length=200)
    email: Optional[EmailStr] = None
    phone: Optional[str] = Field(None, max_length=50)
    address: Optional[str] = None
    payment_term_id: Optional[str] = None

class SupplierCreate(SupplierBase):
    product_category_ids: Optional[List[str]] = []

class SupplierUpdate(BaseModel):
    name: Optional[str] = Field(None, min_length=1, max_length=200)
    contact_person: Optional[str] = Field(None, max_length=200)
    email: Optional[EmailStr] = None
    phone: Optional[str] = Field(None, max_length=50)
    address: Optional[str] = None
    payment_term_id: Optional[str] = None
    is_active: Optional[bool] = None
    product_category_ids: Optional[List[str]] = None

class SupplierResponse(SupplierBase):
    id: str
    company_id: str
    created_at: datetime
    updated_at: datetime
    is_active: bool

    class Config:
        from_attributes = True

class SupplierWithCategories(SupplierResponse):
    product_categories: Optional[List[dict]] = []

# ==========================================
# SUPPLIER PRODUCT CATEGORY SCHEMAS
# ==========================================

class SupplierProductCategoryCreate(BaseModel):
    supplier_id: str
    product_category_id: str

class SupplierProductCategoryResponse(BaseModel):
    id: str
    supplier_id: str
    product_category_id: str
    created_at: datetime

    class Config:
        from_attributes = True