from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.core.config import settings
from app.api.v1 import (
    auth, 
    product_categories, 
    products, 
    product_variants, 
    payment_terms, 
    suppliers,
    storage_locations,
    inventory_items,
    inventory_transactions,
    customer_tiers,  
    customers,  
    sales,
    analytics
)

# Create FastAPI app
app = FastAPI(
    title=settings.PROJECT_NAME,
    openapi_url=f"{settings.API_V1_PREFIX}/openapi.json",
    debug=settings.DEBUG
)

# Configure CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.BACKEND_CORS_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include routers
app.include_router(auth.router, prefix=f"{settings.API_V1_PREFIX}/auth", tags=["Authentication"])
app.include_router(product_categories.router, prefix=f"{settings.API_V1_PREFIX}/product-categories", tags=["Product Categories"])
app.include_router(products.router, prefix=f"{settings.API_V1_PREFIX}/products", tags=["Products"])
app.include_router(product_variants.router, prefix=f"{settings.API_V1_PREFIX}/product-variants", tags=["Product Variants"])
app.include_router(payment_terms.router, prefix=f"{settings.API_V1_PREFIX}/payment-terms", tags=["Payment Terms"])
app.include_router(suppliers.router, prefix=f"{settings.API_V1_PREFIX}/suppliers", tags=["Suppliers"])
app.include_router(storage_locations.router, prefix=f"{settings.API_V1_PREFIX}/storage-locations", tags=["Storage Locations"])
app.include_router(inventory_items.router, prefix=f"{settings.API_V1_PREFIX}/inventory-items", tags=["Inventory Items"])
app.include_router(inventory_transactions.router, prefix=f"{settings.API_V1_PREFIX}/inventory-transactions", tags=["Inventory Transactions"])
app.include_router(customer_tiers.router, prefix=f"{settings.API_V1_PREFIX}/customer-tiers", tags=["Customer Tiers"])  
app.include_router(customers.router, prefix=f"{settings.API_V1_PREFIX}/customers", tags=["Customers"])  
app.include_router(sales.router, prefix=f"{settings.API_V1_PREFIX}/sales", tags=["Sales"])
app.include_router(analytics.router, prefix=f"{settings.API_V1_PREFIX}/analytics", tags=["Analytics"])

@app.get("/")
async def root():
    return {
        "message": "Welcome to ERP System API",
        "docs": "/docs",
        "version": "1.0.0"
    }

@app.get("/health")
async def health_check():
    return {"status": "healthy"}