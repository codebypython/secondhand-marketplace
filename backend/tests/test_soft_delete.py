from sqlalchemy import select

from app.models.enums import ItemCondition
from app.models.listing import Listing
from app.models.user import Profile, User


def test_soft_delete_filter_hides_deleted_rows(session):
    user = User(email="owner@example.com", password_hash="hash", profile=Profile(full_name="Owner"))
    session.add(user)
    session.commit()

    listing = Listing(
        owner_id=user.id,
        title="Vintage chair",
        description="Solid wood",
        price=10,
        condition=ItemCondition.USED,
        image_urls=[],
    )
    session.add(listing)
    session.commit()

    listing.soft_delete()
    session.add(listing)
    session.commit()

    visible = session.scalars(select(Listing)).all()
    deleted_visible = session.scalars(select(Listing).execution_options(include_deleted=True)).all()

    assert visible == []
    assert len(deleted_visible) == 1
    assert deleted_visible[0].is_deleted is True
