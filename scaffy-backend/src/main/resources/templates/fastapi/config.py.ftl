from pydantic_settings import BaseSettings

class Settings(BaseSettings):
    PROJECT_NAME: str = "${projectName}"
    DATABASE_URL: str = "sqlite:///./${projectName?lower_case}.db"
    
    class Config:
        env_file = ".env"

settings = Settings()
