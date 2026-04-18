"""Add performance indexes"""

revision = '75d6788d1c8a'
down_revision = '7b19759ade0a'
branch_labels = None
depends_on = None

from alembic import op
import sqlalchemy as sa


def upgrade() -> None:
    # Listings indexes
    op.create_index('ix_listings_status', 'listings', ['status'])
    op.create_index('ix_listings_category_id', 'listings', ['category_id'])

    # Offers indexes
    op.create_index('ix_offers_status', 'offers', ['status'])

    # Deals indexes
    op.create_index('ix_deals_status', 'deals', ['status'])
    op.create_index('ix_deals_delivery_status', 'deals', ['delivery_status'])


def downgrade() -> None:
    op.drop_index('ix_deals_delivery_status', table_name='deals')
    op.drop_index('ix_deals_status', table_name='deals')
    op.drop_index('ix_offers_status', table_name='offers')
    op.drop_index('ix_listings_category_id', table_name='listings')
    op.drop_index('ix_listings_status', table_name='listings')
