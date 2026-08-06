"""pytest 公共配置：测试前设置临时 SQLite 与固定 JWT 密钥，并把 backend/ 加入导入路径。"""
import os
import sys
import tempfile
from pathlib import Path

# 必须在 import app 之前设置环境变量
_tmp = tempfile.NamedTemporaryFile(suffix=".db", delete=False)
_tmp.close()
os.environ["DATABASE_URL"] = f"sqlite+aiosqlite:///{_tmp.name}"
os.environ["JWT_SECRET"] = "test-secret-for-pytest"
os.environ["SEED_DEMO_ACCOUNT"] = ""  # 测试不自动播种 demo，避免干扰断言

BACKEND_DIR = Path(__file__).resolve().parent
if str(BACKEND_DIR) not in sys.path:
    sys.path.insert(0, str(BACKEND_DIR))
