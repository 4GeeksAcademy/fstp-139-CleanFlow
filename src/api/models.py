from flask_sqlalchemy import SQLAlchemy
from sqlalchemy import String, Boolean, Enum, DateTime, func
from sqlalchemy.orm import Mapped, mapped_column

db = SQLAlchemy()


class User(db.Model):
    user_id: Mapped[int] = mapped_column(primary_key=True)
    name: Mapped[str] = mapped_column(String(100), nullable=False)
    last_name: Mapped[str] = mapped_column(String(150), nullable=False)
    phone: Mapped[str] = mapped_column(String(20), nullable=False)
    email: Mapped[str] = mapped_column(String(120), unique=True, nullable=False)
    password: Mapped[str] = mapped_column(nullable=False)

    role: Mapped[str] = mapped_column(
        Enum("client", "worker", "manager", name="user_role"),
        nullable=False
    )

    is_active: Mapped[bool] = mapped_column(Boolean(), nullable=False, default=True)
    avatar_url: Mapped[str | None] = mapped_column(String(255), nullable=True)
    created_at: Mapped[DateTime] = mapped_column(
        DateTime(),
        nullable=False,
        server_default=func.now()
    )

    def serialize(self):
        return {
            "user_id": self.user_id,
            "name": self.name,
            "last_name": self.last_name,
            "phone": self.phone,
            "email": self.email,
            "role": self.role,
            "is_active": self.is_active,
            "avatar_url": self.avatar_url,
            "created_at": self.created_at.isoformat() if self.created_at else None
        }
