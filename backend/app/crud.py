"""Data-access and business-logic layer.

All business rules (unique SKU/email, non-negative stock, inventory
validation, automatic stock reduction, server-side total calculation) are
enforced here and surfaced as HTTP errors by the routers.
"""
from decimal import Decimal

from fastapi import HTTPException, status
from sqlalchemy import func
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session, selectinload

from . import models, schemas
from .config import get_settings

settings = get_settings()


# ---------------- Products ----------------
def get_products(db: Session) -> list[models.Product]:
    return db.query(models.Product).order_by(models.Product.id).all()


def get_product(db: Session, product_id: int) -> models.Product:
    product = db.get(models.Product, product_id)
    if not product:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Product not found")
    return product


def create_product(db: Session, data: schemas.ProductCreate) -> models.Product:
    # Business rule: SKU must be unique.
    existing = db.query(models.Product).filter(models.Product.sku == data.sku).first()
    if existing:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail=f"A product with SKU '{data.sku}' already exists",
        )
    product = models.Product(**data.model_dump())
    db.add(product)
    _commit(db, "Could not create product (duplicate SKU?)")
    db.refresh(product)
    return product


def update_product(db: Session, product_id: int, data: schemas.ProductUpdate) -> models.Product:
    product = get_product(db, product_id)
    payload = data.model_dump(exclude_unset=True)

    # If the SKU is changing, enforce uniqueness against other products.
    new_sku = payload.get("sku")
    if new_sku and new_sku != product.sku:
        clash = (
            db.query(models.Product)
            .filter(models.Product.sku == new_sku, models.Product.id != product_id)
            .first()
        )
        if clash:
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail=f"A product with SKU '{new_sku}' already exists",
            )

    for field, value in payload.items():
        setattr(product, field, value)
    _commit(db, "Could not update product")
    db.refresh(product)
    return product


def delete_product(db: Session, product_id: int) -> None:
    product = get_product(db, product_id)
    # Prevent orphaning order history.
    in_use = (
        db.query(models.OrderItem)
        .filter(models.OrderItem.product_id == product_id)
        .first()
    )
    if in_use:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Cannot delete a product that is referenced by existing orders",
        )
    db.delete(product)
    _commit(db, "Could not delete product")


# ---------------- Customers ----------------
def get_customers(db: Session) -> list[models.Customer]:
    return db.query(models.Customer).order_by(models.Customer.id).all()


def get_customer(db: Session, customer_id: int) -> models.Customer:
    customer = db.get(models.Customer, customer_id)
    if not customer:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Customer not found")
    return customer


def create_customer(db: Session, data: schemas.CustomerCreate) -> models.Customer:
    # Business rule: email must be unique.
    existing = db.query(models.Customer).filter(models.Customer.email == data.email).first()
    if existing:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail=f"A customer with email '{data.email}' already exists",
        )
    customer = models.Customer(full_name=data.full_name, email=data.email, phone=data.phone)
    db.add(customer)
    _commit(db, "Could not create customer (duplicate email?)")
    db.refresh(customer)
    return customer


def delete_customer(db: Session, customer_id: int) -> None:
    customer = get_customer(db, customer_id)
    in_use = (
        db.query(models.Order).filter(models.Order.customer_id == customer_id).first()
    )
    if in_use:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Cannot delete a customer who has existing orders",
        )
    db.delete(customer)
    _commit(db, "Could not delete customer")


# ---------------- Orders ----------------
def get_orders(db: Session) -> list[models.Order]:
    return (
        db.query(models.Order)
        .options(
            selectinload(models.Order.customer),
            selectinload(models.Order.items).selectinload(models.OrderItem.product),
        )
        .order_by(models.Order.id.desc())
        .all()
    )


def get_order(db: Session, order_id: int) -> models.Order:
    order = (
        db.query(models.Order)
        .options(
            selectinload(models.Order.customer),
            selectinload(models.Order.items).selectinload(models.OrderItem.product),
        )
        .filter(models.Order.id == order_id)
        .first()
    )
    if not order:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Order not found")
    return order


def create_order(db: Session, data: schemas.OrderCreate) -> models.Order:
    # Validate customer exists.
    customer = get_customer(db, data.customer_id)

    # Merge duplicate product lines so stock checks use the true total qty.
    merged: dict[int, int] = {}
    for item in data.items:
        merged[item.product_id] = merged.get(item.product_id, 0) + item.quantity

    order = models.Order(customer_id=customer.id, status="confirmed", total_amount=0)
    total = Decimal("0")

    for product_id, qty in merged.items():
        product = db.get(models.Product, product_id)
        if not product:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Product with id {product_id} not found",
            )
        # Business rule: cannot order more than is in stock.
        if qty > product.quantity_in_stock:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=(
                    f"Insufficient stock for '{product.name}': "
                    f"requested {qty}, available {product.quantity_in_stock}"
                ),
            )
        # Business rule: automatically reduce stock.
        product.quantity_in_stock -= qty
        # Business rule: total is computed server-side from current prices.
        line_price = Decimal(str(product.price))
        total += line_price * qty
        order.items.append(
            models.OrderItem(product_id=product.id, quantity=qty, unit_price=product.price)
        )

    order.total_amount = total
    db.add(order)
    _commit(db, "Could not create order")
    return get_order(db, order.id)


def delete_order(db: Session, order_id: int) -> None:
    order = get_order(db, order_id)
    # Cancelling an order restocks the products.
    for item in order.items:
        product = db.get(models.Product, item.product_id)
        if product:
            product.quantity_in_stock += item.quantity
    db.delete(order)
    _commit(db, "Could not delete order")


# ---------------- Dashboard ----------------
def get_dashboard(db: Session) -> schemas.DashboardStats:
    total_products = db.query(func.count(models.Product.id)).scalar() or 0
    total_customers = db.query(func.count(models.Customer.id)).scalar() or 0
    total_orders = db.query(func.count(models.Order.id)).scalar() or 0
    low_stock = (
        db.query(models.Product)
        .filter(models.Product.quantity_in_stock <= settings.LOW_STOCK_THRESHOLD)
        .order_by(models.Product.quantity_in_stock)
        .all()
    )
    return schemas.DashboardStats(
        total_products=total_products,
        total_customers=total_customers,
        total_orders=total_orders,
        low_stock_count=len(low_stock),
        low_stock_products=low_stock,
    )


def _commit(db: Session, message: str) -> None:
    """Commit, translating DB integrity errors into clean 409 responses."""
    try:
        db.commit()
    except IntegrityError:
        db.rollback()
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail=message)
