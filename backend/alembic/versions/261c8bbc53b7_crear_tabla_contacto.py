"""crear tabla contacto

Revision ID: 261c8bbc53b7
Revises: 06b92529c87d
Create Date: 2026-08-15 07:52:07.606836

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa

# revision identifiers, used by Alembic.
revision: str = '261c8bbc53b7'
down_revision: Union[str, Sequence[str], None] = '06b92529c87d'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Upgrade schema."""
    op.create_table(
        'contacto',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('nombre', sa.String(length=150), nullable=False),
        sa.Column('telefono', sa.String(length=20), nullable=True),
        sa.Column('correo', sa.String(length=100), nullable=True),
        sa.Column('cargo', sa.String(length=100), nullable=True),
        sa.Column('observaciones', sa.Text(), nullable=True),
        sa.Column('proveedor_id', sa.Integer(), nullable=False),
        sa.ForeignKeyConstraint(['proveedor_id'], ['proveedor.id'], ),
        sa.PrimaryKeyConstraint('id')
    )
    op.create_index(op.f('ix_contacto_id'), 'contacto', ['id'], unique=False)


def downgrade() -> None:
    """Downgrade schema."""
    op.drop_index(op.f('ix_contacto_id'), table_name='contacto')
    op.drop_table('contacto')