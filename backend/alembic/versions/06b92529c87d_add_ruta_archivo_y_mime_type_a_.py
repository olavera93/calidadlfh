"""add ruta_archivo y mime_type a documentos

Revision ID: 06b92529c87d
Revises: 01a1f6dab107
Create Date: 2026-08-11 14:19:29.050119

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = '06b92529c87d'
down_revision: Union[str, Sequence[str], None] = '01a1f6dab107'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade():
    op.add_column('documento', sa.Column('ruta_archivo', sa.String(length=255), nullable=True))
    op.add_column('documento', sa.Column('mime_type', sa.String(length=100), nullable=True))

def downgrade():
    op.drop_column('documento', 'mime_type')
    op.drop_column('documento', 'ruta_archivo')
