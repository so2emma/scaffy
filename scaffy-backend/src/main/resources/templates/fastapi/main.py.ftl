from fastapi import FastAPI
from .config import settings
from .database import engine, Base
from . import models
from .routers import <#list entities as entity>${toSnakeCase(entity.name)}<#if entity_has_next>, </#if></#list>

# Create database tables
Base.metadata.create_all(bind=engine)

app = FastAPI(
    title=settings.PROJECT_NAME,
    openapi_url="/openapi.json" if ${openApiSupport?string("True", "False")} else None,
    docs_url="/docs" if ${openApiSupport?string("True", "False")} else None,
    redoc_url="/redoc" if ${openApiSupport?string("True", "False")} else None,
)

# Include Routers
<#list entities as entity>
app.include_router(${toSnakeCase(entity.name)}.router)
</#list>

@app.get("/")
def root():
    return {"message": f"Welcome to {settings.PROJECT_NAME} API"}
