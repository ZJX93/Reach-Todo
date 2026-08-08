"""add parent_id to tasks (subtasks)

Revision ID: f1a2b3c4d5e6
Revises: 93e0a86f6f5d
Create Date: 2026-08-07 12:00:00.000000

"""
from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision = 'f1a2b3c4d5e6'
down_revision = '93e0a86f6f5d'
branch_labels = None
depends_on = None


def upgrade() -> None:
    # SQLite 不支持 ALTER ... ADD CONSTRAINT，必须用 batch 模式（复制-重建表）。
    with op.batch_alter_table("tasks") as batch_op:
        batch_op.add_column(
            sa.Column("parent_id", sa.Integer(), nullable=True)
        )
        batch_op.create_foreign_key(
            "fk_tasks_parent_id",
            "tasks",
            ["parent_id"],
            ["id"],
            ondelete="CASCADE",
        )
        batch_op.create_index("ix_tasks_parent_id", ["parent_id"])


def downgrade() -> None:
    with op.batch_alter_table("tasks") as batch_op:
        batch_op.drop_index("ix_tasks_parent_id")
        batch_op.drop_constraint("fk_tasks_parent_id", type_="foreignkey")
        batch_op.drop_column("parent_id")
