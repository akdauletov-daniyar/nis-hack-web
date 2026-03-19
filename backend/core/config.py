from pathlib import Path
from pydantic_settings import BaseSettings
from pydantic_settings import SettingsConfigDict

BASE_DIR = Path(__file__).resolve().parent.parent

class Settings(BaseSettings):
    PROJECT_NAME: str = "Demo 1.0 API"
    SUPABASE_URL: str = ""
    SUPABASE_KEY: str = ""
    GOOGLE_CLOUD_API_KEY: str = ""
    OPENAI_API_KEY: str = ""
    ACCESSIBILITY_MODEL_PATH: str = ""
    ACCESSIBILITY_DATA_PATH: str = ""

    model_config = SettingsConfigDict(
        case_sensitive=True,
        env_file=BASE_DIR / ".env",
        extra="ignore",
    )

settings = Settings()
