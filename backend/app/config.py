"""FTalentHub — backend (FastAPI + SQLite, SQLAlchemy 2.0).

Khởi tạo và seed DB:  python -m app.seed
Chạy server:          uvicorn app.main:app --reload --port 8000
"""
import logging
from pathlib import Path
from dotenv import load_dotenv

load_dotenv()

log = logging.getLogger("ftalenthub")
logging.basicConfig(level=logging.INFO, format="%(levelname)s %(name)s: %(message)s")

BASE_DIR = Path(__file__).resolve().parent.parent
DB_PATH = BASE_DIR / "talenthub.db"
DB_URL = f"sqlite:///{DB_PATH}"