from pydantic import BaseModel, Field
from typing import Optional, List
from datetime import datetime
from enum import Enum

# ==========================================
# ENUMS
# ==========================================

class LocationType(str, Enum):
    warehouse = "warehouse"
    shop = "shop"
    store = "store"
    other = "other"

class TransactionType(str, Enum):
    stock_in = "in"
    stock_out = "out"
    adjustment = "adjustment"
    transfer = "transfer"

# ==========================================
# STORAGE LOCATION SCHEMAS
# ==========================================

class StorageLocationBase(BaseModel):
    name: str = Field(..., min_length=1, max_length=200)
    location_type: LocationType
    address: Optional[str] = None
    description: Optional[str] = None

class StorageLocationCreate(StorageLocationBase):
    pass

class StorageLocationUpdate(BaseModel):
    name: Optional[str] = Field(None, min_length=1, max_length=200)
    location_type: Optional[LocationType] = None
    address: Optional[str] = None
    description: Optional[str] = None
    is_active: Optional[bool] = None

class StorageLocationResponse(StorageLocationBase):
    id: str
    company_id: str
    created_at: datetime
    updated_at: datetime
    is_active: bool

    class Config:
        from_attributes = True

# ==========================================
# INVENTORY ITEM SCHEMAS
# ==========================================

class InventoryItemBase(BaseModel):
    product_variant_id: str
    storage_location_id: str
    quantity: int = Field(..., ge=0)
    min_stock_level: Optional[int] = Field(None, ge=0)
    max_stock_level: Optional[int] = Field(None, ge=0)

class InventoryItemCreate(InventoryItemBase):
    pass

class InventoryItemUpdate(BaseModel):
    quantity: Optional[int] = Field(None, ge=0)
    min_stock_level: Optional[int] = Field(None, ge=0)
    max_stock_level: Optional[int] = Field(None, ge=0)

class InventoryItemResponse(InventoryItemBase):
    id: str
    company_id: str
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True

class InventoryItemWithDetails(InventoryItemResponse):
    product_variant: Optional[dict] = None
    storage_location: Optional[dict] = None

# ==========================================
# INVENTORY TRANSACTION SCHEMAS
# ==========================================

class InventoryTransactionBase(BaseModel):
    product_variant_id: str
    transaction_type: TransactionType
    quantity: int = Field(..., gt=0)
    from_location_id: Optional[str] = None
    to_location_id: Optional[str] = None
    reference_type: Optional[str] = None
    reference_id: Optional[str] = None
    notes: Optional[str] = None
    # New fields for supplier and payment tracking
    supplier_id: Optional[str] = None
    unit_cost: Optional[float] = Field(None, ge=0)
    total_cost: Optional[float] = Field(None, ge=0)
    payment_status: Optional[str] = Field(None, pattern="^(unpaid|partial|paid)$")
    amount_paid: Optional[float] = Field(None, ge=0)
    amount_due: Optional[float] = Field(None, ge=0)

class InventoryTransactionCreate(InventoryTransactionBase):
    pass

class InventoryTransactionResponse(InventoryTransactionBase):
    id: str
    company_id: str
    created_by: Optional[str] = None
    created_at: datetime

    class Config:
        from_attributes = True

class InventoryTransactionWithDetails(InventoryTransactionResponse):
    product_variant: Optional[dict] = None
    from_location: Optional[dict] = None
    to_location: Optional[dict] = None
    supplier: Optional[dict] = None  # Add this line

# ==========================================
# STOCK ADJUSTMENT SCHEMA (Simplified)
# ==========================================

class StockAdjustment(BaseModel):
    product_variant_id: str
    storage_location_id: str
    quantity_change: int  # Can be positive or negative
    notes: Optional[str] = None