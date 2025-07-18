"""
Garden 造園業向け統合業務管理システム
データベース接続設定
"""

import os
from sqlalchemy import create_engine, event
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker
from dotenv import load_dotenv

load_dotenv()

# データベースURL設定
DATABASE_URL = os.getenv(
    "DATABASE_URL", 
    "postgresql://garden_user:garden_password@localhost:5432/garden_db"
)

# SQLAlchemyエンジン作成 - パフォーマンス最適化
engine = create_engine(
    DATABASE_URL,
    pool_pre_ping=True,
    pool_recycle=300,
    pool_size=20,              # 接続プールサイズ増加
    max_overflow=30,           # 最大オーバーフロー接続数
    pool_timeout=30,           # 接続タイムアウト
    connect_args={
        "options": "-c timezone=Asia/Tokyo",
        "application_name": "garden_dx_backend",
        "connect_timeout": 10,
    },
    echo=os.getenv("SQL_DEBUG", "false").lower() == "true"
)

# セッションローカル作成
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

# Base作成
Base = declarative_base()

# 依存関数
def get_db():
    """データベースセッション取得"""
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

# PostgreSQL特有の設定
@event.listens_for(engine, "connect")
def set_sqlite_pragma(dbapi_connection, connection_record):
    """PostgreSQLの場合はパスする"""
    pass