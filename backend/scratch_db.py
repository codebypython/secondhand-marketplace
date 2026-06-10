import sys
import os

# Add parent directory to path so we can import app modules
sys.path.append(os.path.abspath(os.path.dirname(__file__)))

from app.db.session import SessionFactory
from app.models.livestream import LiveRoom
from app.models.user import User

def check_live_rooms():
    with SessionFactory() as session:
        rooms = session.query(LiveRoom).all()
        print(f"Total rooms found: {len(rooms)}")
        for r in rooms:
            user = session.get(User, r.user_id)
            email = user.email if user else "Unknown"
            print(f"User ID: {r.user_id} ({email}) | Title: {r.title} | is_live: {r.is_live} | is_online: {r.is_online}")

if __name__ == "__main__":
    check_live_rooms()
