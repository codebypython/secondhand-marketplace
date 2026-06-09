"""Sprint 4 improvements add reset token video url and mock emails

Revision ID: 8a2b3c4d5e6f
Revises: 29b745d20c27
Create Date: 2026-06-09 23:28:00
"""

revision = '8a2b3c4d5e6f'
down_revision = '29b745d20c27'
branch_labels = None
depends_on = None

from alembic import op
import sqlalchemy as sa
import app.models.mixins


def upgrade() -> None:
    # Add columns to users
    with op.batch_alter_table('users', schema=None) as batch_op:
        batch_op.add_column(sa.Column('reset_token', sa.String(length=255), nullable=True))
        batch_op.add_column(sa.Column('reset_token_expires', sa.DateTime(timezone=True), nullable=True))
        batch_op.create_index('ix_users_reset_token', ['reset_token'], unique=False)

    # Add columns to listings
    with op.batch_alter_table('listings', schema=None) as batch_op:
        batch_op.add_column(sa.Column('video_url', sa.String(length=1024), nullable=True))

    # Create mock_emails table
    op.create_table('mock_emails',
        sa.Column('recipient', sa.String(length=255), nullable=False),
        sa.Column('subject', sa.String(length=255), nullable=False),
        sa.Column('body', sa.Text(), nullable=False),
        sa.Column('id', app.models.mixins.SafeUUID(), nullable=False),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
        sa.Column('updated_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
        sa.PrimaryKeyConstraint('id', name=op.f('pk_mock_emails'))
    )
    with op.batch_alter_table('mock_emails', schema=None) as batch_op:
        batch_op.create_index(batch_op.f('ix_mock_emails_recipient'), ['recipient'], unique=False)


def downgrade() -> None:
    with op.batch_alter_table('mock_emails', schema=None) as batch_op:
        batch_op.drop_index(batch_op.f('ix_mock_emails_recipient'))
    op.drop_table('mock_emails')

    with op.batch_alter_table('listings', schema=None) as batch_op:
        batch_op.drop_column('video_url')

    with op.batch_alter_table('users', schema=None) as batch_op:
        batch_op.drop_index('ix_users_reset_token')
        batch_op.drop_column('reset_token_expires')
        batch_op.drop_column('reset_token')
