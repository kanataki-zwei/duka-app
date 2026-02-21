from pydantic import BaseModel, Field
from typing import Optional, List
from datetime import datetime, date
from decimal import Decimal
from enum import Enum

# ==========================================
# ENUMS
# ==========================================

class SaleType(str, Enum):
    invoice = "invoice"
    credit_note = "credit_note"

class PaymentStatus(str, Enum):
    unpaid = "unpaid"
    partial = "partial"
    paid = "paid"

class PaymentMethod(str, Enum):
    cash = "cash"
    mpesa = "mpesa"
    bank = "bank"
    card = "card"

# ==========================================
# SALE SCHEMAS
# ==========================================

class SaleItemBase(BaseModel):
    product_variant_id: str
    quantity: int = Field(..., description="Positive for invoices, negative for credit notes")
    unit_price: Decimal = Field(..., ge=0)
    discount_percentage: Decimal = Field(default=0, ge=0, le=100)

class SaleItemCreate(SaleItemBase):
    pass

class SaleItemResponse(SaleItemBase):
    id: str
    sale_id: str
    discount_amount: Decimal
    line_total: Decimal
    created_at: datetime

    class Config:
        from_attributes = True

class SaleItemWithDetails(SaleItemResponse):
    product_variant: Optional[dict] = None

class SaleBase(BaseModel):
    customer_id: str
    sale_date: date = Field(default_factory=date.today)
    storage_location_id: str
    notes: Optional[str] = None

class SaleCreate(SaleBase):
    sale_type: SaleType = SaleType.invoice
    original_sale_id: Optional[str] = None
    items: List[SaleItemCreate] = Field(..., min_length=1)

class SaleResponse(SaleBase):
    id: str
    company_id: str
    sale_number: str
    sale_type: SaleType
    original_sale_id: Optional[str] = None
    subtotal: Decimal
    discount_percentage: Decimal
    discount_amount: Decimal
    total_amount: Decimal
    payment_status: PaymentStatus
    amount_paid: Decimal
    amount_due: Decimal
    created_by: Optional[str] = None
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True

class SaleWithDetails(SaleResponse):
    customer: Optional[dict] = None
    storage_location: Optional[dict] = None
    original_sale: Optional[dict] = None
    items: List[SaleItemWithDetails] = []
    payments: List[dict] = []

# ==========================================
# PAYMENT SCHEMAS
# ==========================================

class SalePaymentBase(BaseModel):
    sale_id: str
    payment_date: date = Field(default_factory=date.today)
    amount: Decimal = Field(..., gt=0)
    payment_method: PaymentMethod
    reference_number: Optional[str] = None
    notes: Optional[str] = None

class SalePaymentCreate(SalePaymentBase):
    pass

class SalePaymentResponse(SalePaymentBase):
    id: str
    created_by: Optional[str] = None
    created_at: datetime

    class Config:
        from_attributes = True

# ==========================================
# CREDIT NOTE SCHEMAS
# ==========================================

class CreditNoteItemBase(BaseModel):
    sale_item_id: str
    return_quantity: int = Field(..., gt=0)

class CreditNoteCreate(BaseModel):
    original_sale_id: str
    sale_date: date = Field(default_factory=date.today)
    items: List[CreditNoteItemBase] = Field(..., min_length=1)
    notes: Optional[str] = None