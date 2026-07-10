from sqlalchemy.orm import Session
from typing import List, Optional
import datetime
from ..models.${toSnakeCase(name)} import ${name}
from ..schemas.${toSnakeCase(name)} import ${name}Create, ${name}Update

def get_${toSnakeCase(name)}(db: Session, id: ${primaryKeyTypePython}) -> Optional[${name}]:
    <#if softDelete>
    return db.query(${name}).filter(${name}.${toSnakeCase(primaryKeyName)} == id, ${name}.is_deleted == False).first()
    <#else>
    return db.query(${name}).filter(${name}.${toSnakeCase(primaryKeyName)} == id).first()
    </#if>

def get_${toSnakeCase(name)}s(db: Session, skip: int = 0, limit: int = 100) -> List[${name}]:
    <#if softDelete>
    return db.query(${name}).filter(${name}.is_deleted == False).offset(skip).limit(limit).all()
    <#else>
    return db.query(${name}).offset(skip).limit(limit).all()
    </#if>

def create_${toSnakeCase(name)}(db: Session, obj_in: ${name}Create) -> ${name}:
    db_obj = ${name}(
        **obj_in.model_dump()
    )
    db.add(db_obj)
    db.commit()
    db.refresh(db_obj)
    return db_obj

def update_${toSnakeCase(name)}(db: Session, db_obj: ${name}, obj_in: ${name}Update) -> ${name}:
    update_data = obj_in.model_dump(exclude_unset=True)
    for field, value in update_data.items():
        setattr(db_obj, field, value)
    db.add(db_obj)
    db.commit()
    db.refresh(db_obj)
    return db_obj

def delete_${toSnakeCase(name)}(db: Session, id: ${primaryKeyTypePython}) -> Optional[${name}]:
    db_obj = db.query(${name}).filter(${name}.${toSnakeCase(primaryKeyName)} == id).first()
    if db_obj:
        <#if softDelete>
        db_obj.is_deleted = True
        db_obj.deleted_at = datetime.datetime.now(datetime.UTC)
        db.add(db_obj)
        <#else>
        db.delete(db_obj)
        </#if>
        db.commit()
    return db_obj
