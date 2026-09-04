from flask_sqlalchemy import SQLAlchemy
from sqlalchemy import String, Boolean, ForeignKey, Time, Date
from sqlalchemy.orm import Mapped, mapped_column
from datetime import date, time

db = SQLAlchemy()







class Worker(db.Model):
    __tablename__ = "workers"

    worker_id: Mapped[int] = mapped_column(primary_key=True)

    user_id: Mapped[int] = mapped_column(
        ForeignKey("users.id"),
        unique=True,
        nullable=False
    )

    shift_id: Mapped[int | None] = mapped_column(
        ForeignKey("shifts.shift_id"),
        nullable=True
    )

    hire_date: Mapped[date | None] = mapped_column(
        Date(),
        nullable=False
    )

    position: Mapped[str | None] = mapped_column(
        String(100),
        nullable=True
    )

    is_active: Mapped[bool | None] = mapped_column(
        Boolean(),
        nullable=False
    )
