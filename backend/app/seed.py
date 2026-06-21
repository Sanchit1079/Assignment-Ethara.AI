"""Seed the database with demo data so the deployed app is not empty.

Runs only when the tables are empty, so it is safe to call on every startup.
"""
from sqlalchemy.orm import Session

from . import models
from .database import SessionLocal


def seed_if_empty() -> None:
    db: Session = SessionLocal()
    try:
        if db.query(models.Product).count() > 0:
            return

        products = [
            models.Product(name="Wireless Mouse", sku="WM-001", price=24.99, quantity_in_stock=120),
            models.Product(name="Mechanical Keyboard", sku="KB-002", price=79.99, quantity_in_stock=45),
            models.Product(name="27\" 4K Monitor", sku="MON-003", price=329.00, quantity_in_stock=18),
            models.Product(name="USB-C Hub", sku="HUB-004", price=39.50, quantity_in_stock=8),
            models.Product(name="Laptop Stand", sku="LS-005", price=29.99, quantity_in_stock=5),
            models.Product(name="Webcam 1080p", sku="CAM-006", price=54.00, quantity_in_stock=0),
        ]
        customers = [
            models.Customer(full_name="Alice Johnson", email="alice@example.com", phone="+1-202-555-0143"),
            models.Customer(full_name="Bob Smith", email="bob@example.com", phone="+1-202-555-0178"),
            models.Customer(full_name="Carla Mendes", email="carla@example.com", phone="+1-202-555-0190"),
        ]
        db.add_all(products + customers)
        db.commit()
    finally:
        db.close()
