"""add mpesa_transactions table

Revision ID: b6f9a2d1e4c3
Revises: 749575365b13
Create Date: 2026-08-07 00:00:00.000000

"""

from alembic import op
import sqlalchemy as sa

# revision identifiers, used by Alembic.
revision = 'b6f9a2d1e4c3'
down_revision = '749575365b13'
branch_labels = None
depends_on = None


def upgrade():
    op.create_table(
        'mpesa_transactions',
        sa.Column('id', sa.UUID(), nullable=False),
        sa.Column('group_id', sa.UUID(), nullable=False),
        sa.Column('member_id', sa.UUID(), nullable=True),
        sa.Column('amount', sa.Numeric(precision=12, scale=2), nullable=False),
        sa.Column('phone_number', sa.String(length=20), nullable=True),
        sa.Column('checkout_request_id', sa.String(length=120), nullable=True),
        sa.Column('merchant_request_id', sa.String(length=120), nullable=True),
        sa.Column('mpesa_receipt', sa.String(length=64), nullable=True),
        sa.Column('status', sa.String(length=20), nullable=False),
        sa.Column('purpose', sa.String(length=32), nullable=True),
        sa.Column('target_id', sa.UUID(), nullable=True),
        sa.Column('created_at', sa.DateTime(timezone=True), nullable=True),
        sa.ForeignKeyConstraint(['group_id'], ['groups.id'], ondelete='CASCADE'),
        sa.ForeignKeyConstraint(['member_id'], ['users.id'], ondelete='SET NULL'),
        sa.PrimaryKeyConstraint('id'),
        sa.UniqueConstraint('checkout_request_id', name='uq_checkout_request_id'),
        sa.UniqueConstraint('merchant_request_id', name='uq_merchant_request_id'),
    )
    with op.batch_alter_table('mpesa_transactions', schema=None) as batch_op:
        batch_op.create_index('idx_mpesa_transactions_group', ['group_id'], unique=False)


def downgrade():
    with op.batch_alter_table('mpesa_transactions', schema=None) as batch_op:
        batch_op.drop_index('idx_mpesa_transactions_group')

    op.drop_table('mpesa_transactions')
