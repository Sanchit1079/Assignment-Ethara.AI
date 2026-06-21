from fastapi import APIRouter, Depends, status
from sqlalchemy.orm import Session

from .. import crud, schemas
from ..database import get_db

router = APIRouter(prefix="/orders", tags=["Orders"])


@router.get("", response_model=list[schemas.OrderOut])
def list_orders(db: Session = Depends(get_db)):
    return crud.get_orders(db)


@router.get("/{order_id}", response_model=schemas.OrderOut)
def get_order(order_id: int, db: Session = Depends(get_db)):
    return crud.get_order(db, order_id)


@router.post("", response_model=schemas.OrderOut, status_code=status.HTTP_201_CREATED)
def create_order(payload: schemas.OrderCreate, db: Session = Depends(get_db)):
    return crud.create_order(db, payload)


@router.delete("/{order_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_order(order_id: int, db: Session = Depends(get_db)):
    crud.delete_order(db, order_id)
    return None
