"""Add visibility, allowed_group_dns, ldap_groups

Revision ID: 0003
Revises: 0002
Create Date: 2026-05-27
"""
from typing import Sequence, Union
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql
from alembic import op

revision: str = "0003"
down_revision: Union[str, None] = "0002"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # Videos: add visibility + allowed_group_dns
    op.add_column("videos",
        sa.Column("visibility", sa.String(50), nullable=False, server_default="internal"))
    op.add_column("videos",
        sa.Column("allowed_group_dns", postgresql.JSONB(astext_type=sa.Text()), nullable=True))

    # Shows: add visibility + allowed_group_dns
    op.add_column("shows",
        sa.Column("visibility", sa.String(50), nullable=False, server_default="internal"))
    op.add_column("shows",
        sa.Column("allowed_group_dns", postgresql.JSONB(astext_type=sa.Text()), nullable=True))

    # Backfill: shows that were is_public=true → visibility='public'
    op.execute("UPDATE shows SET visibility = 'public' WHERE is_public = true")

    # Users: add ldap_groups
    op.add_column("users",
        sa.Column("ldap_groups", postgresql.JSONB(astext_type=sa.Text()),
                  nullable=False, server_default="'[]'::jsonb"))


def downgrade() -> None:
    op.drop_column("videos", "visibility")
    op.drop_column("videos", "allowed_group_dns")
    op.drop_column("shows", "visibility")
    op.drop_column("shows", "allowed_group_dns")
    op.drop_column("users", "ldap_groups")
