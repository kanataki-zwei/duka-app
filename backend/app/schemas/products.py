from pydantic import BaseModel, Field
from typing import Optional, List
from datetime import datetime
from decimal import Decimal

# ==========================================
# PRODUCT CATEGORY SCHEMAS
# ==========================================

class ProductCategoryBase(BaseModel):
    name: str = Field(..., min_length=1, max_length=100)
    description: Optional[str] = None

class ProductCategoryCreate(ProductCategoryBase):
    pass

class ProductCategoryUpdate(BaseModel):
    name: Optional[str] = Field(None, min_length=1, max_length=100)
    description: Optional[str] = None
    is_active: Optional[bool] = None

class ProductCategoryResponse(ProductCategoryBase):
    id: str
    company_id: str
    created_at: datetime
    updated_at: datetime
    is_active: bool

    class Config:
        from_attributes = True

# ==========================================
# PRODUCT SCHEMAS
# ==========================================

class ProductBase(BaseModel):
    category_id: str
    name: str = Field(..., min_length=1, max_length=200)
    description: Optional[str] = None
    sku: Optional[str] = Field(None, max_length=50)

class ProductCreate(ProductBase):
    pass

class ProductUpdate(BaseModel):
    category_id: Optional[str] = None
    name: Optional[str] = Field(None, min_length=1, max_length=200)
    description: Optional[str] = None
    sku: Optional[str] = Field(None, max_length=50)
    is_active: Optional[bool] = None

class ProductResponse(ProductBase):
    id: str
    company_id: str
    created_at: datetime
    updated_at: datetime
    is_active: bool
    variant_count: Optional[int] = 0
    avg_buying_price: Optional[Decimal] = None
    avg_selling_price: Optional[Decimal] = None

    class Config:
        from_attributes = True

# ==========================================
# PRODUCT VARIANT SCHEMAS
# ==========================================

class ProductVariantBase(BaseModel):
    product_id: str
    variant_name: str = Field(..., min_length=1, max_length=200)
    sku: Optional[str] = Field(None, max_length=50)
    buying_price: Optional[Decimal] = Field(None, ge=0, decimal_places=2)
    selling_price: Optional[Decimal] = Field(None, ge=0, decimal_places=2)
    min_stock_level: Optional[int] = Field(None, ge=0)
    reorder_quantity: Optional[int] = Field(None, ge=0)

class ProductVariantCreate(ProductVariantBase):
    pass

class ProductVariantUpdate(BaseModel):
    product_id: Optional[str] = None
    variant_name: Optional[str] = Field(None, min_length=1, max_length=200)
    sku: Optional[str] = Field(None, max_length=50)
    buying_price: Optional[Decimal] = Field(None, ge=0, decimal_places=2)
    selling_price: Optional[Decimal] = Field(None, ge=0, decimal_places=2)
    min_stock_level: Optional[int] = Field(None, ge=0)
    reorder_quantity: Optional[int] = Field(None, ge=0)
    is_active: Optional[bool] = None

class ProductVariantResponse(ProductVariantBase):
    id: str
    company_id: str
    created_at: datetime
    updated_at: datetime
    is_active: bool

    class Config:
        from_attributes = True