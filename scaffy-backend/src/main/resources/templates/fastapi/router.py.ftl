from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import List
from ..database import get_db
from ..schemas.${toSnakeCase(name)} import ${name}, ${name}Create, ${name}Update
from ..crud import ${toSnakeCase(name)} as crud

router = APIRouter(
    prefix="/${toSnakeCase(name)}s",
    tags=["${name}s"]
)

@router.post("/", response_model=${name}, status_code=status.HTTP_201_CREATED)
def create_${toSnakeCase(name)}(obj_in: ${name}Create, db: Session = Depends(get_db)):
    return crud.create_${toSnakeCase(name)}(db=db, obj_in=obj_in)

@router.get("/", response_model=List[${name}])
def read_${toSnakeCase(name)}s(skip: int = 0, limit: int = 100, db: Session = Depends(get_db)):
    return crud.get_${toSnakeCase(name)}s(db=db, skip=skip, limit=limit)

@router.get("/{id}", response_model=${name})
def read_${toSnakeCase(name)}(id: ${primaryKeyTypePython}, db: Session = Depends(get_db)):
    db_obj = crud.get_${toSnakeCase(name)}(db=db, id=id)
    if not db_obj:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="${name} not found"
        )
    return db_obj

@router.put("/{id}", response_model=${name})
def update_${toSnakeCase(name)}(id: ${primaryKeyTypePython}, obj_in: ${name}Update, db: Session = Depends(get_db)):
    db_obj = crud.get_${toSnakeCase(name)}(db=db, id=id)
    if not db_obj:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="${name} not found"
        )
    return crud.update_${toSnakeCase(name)}(db=db, db_obj=db_obj, obj_in=obj_in)

@router.delete("/{id}", response_model=${name})
def delete_${toSnakeCase(name)}(id: ${primaryKeyTypePython}, db: Session = Depends(get_db)):
    db_obj = crud.get_${toSnakeCase(name)}(db=db, id=id)
    if not db_obj:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="${name} not found"
        )
    return crud.delete_${toSnakeCase(name)}(db=db, id=id)
