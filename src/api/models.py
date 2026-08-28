from flask_sqlalchemy import SQLAlchemy
from sqlalchemy import String, Boolean, ForeignKey, Time, Date
from sqlalchemy.orm import Mapped, mapped_column
from datetime import date, time

db = SQLAlchemy()


class User(db.Model):
    __tablename__ = "users"

    id: Mapped[int] = mapped_column(primary_key=True)
    email: Mapped[str] = mapped_column(
        String(120), unique=True, nullable=False
    )
    password: Mapped[str] = mapped_column(nullable=False)
    is_active: Mapped[bool] = mapped_column(Boolean(), nullable=False)
    role: Mapped[str] = mapped_column(String(20), nullable=False)

    def serialize(self):
        return {
            "id": self.id,
            "email": self.email,
            "role": self.role,
            # do not serialize the password, its a security breach
        }


class Shift(db.Model):
    __tablename__ = "shifts"

    shift_id: Mapped[int] = mapped_column(primary_key=True)
    name: Mapped[str | None] = mapped_column(
        String(50), nullable=True
    )
    start_time: Mapped[time | None] = mapped_column(
        Time(), nullable=True
    )
    end_time: Mapped[time | None] = mapped_column(
        Time(), nullable=True
    )


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
        nullable=True
    )

    position: Mapped[str | None] = mapped_column(
        String(100),
        nullable=True
    )

    is_active: Mapped[bool | None] = mapped_column(
        Boolean(),
        nullable=True
    )
