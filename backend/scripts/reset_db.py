import sys
import os

# Add backend directory to path so app can be imported
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from app.core.config import get_settings
from app.db.session import build_engine
from app.db.base import Base

def main():
    db_url = get_settings().database_url
    print(f"Connecting to database: {db_url.split('@')[-1]} (password masked)")
    
    engine = build_engine(db_url)
    
    # SQLite has file locks, we drop tables
    # PostgreSQL drops tables with Cascade if needed, but standard metadata drop works
    print("Dropping all existing tables...")
    try:
        Base.metadata.drop_all(engine)
        print("All tables dropped successfully.")
    except Exception as e:
        print(f"Error dropping tables: {e}")
        print("Attempting to recreate tables directly...")
        
    print("Creating all tables from current SQLAlchemy models...")
    Base.metadata.create_all(engine)
    print("Database schema reset successfully!")

if __name__ == "__main__":
    main()
