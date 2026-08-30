from flask_sqlalchemy import SQLAlchemy
from sqlalchemy import String, Boolean, Text, Numeric, Integer, ForeignKey
from sqlalchemy.orm import Mapped, mapped_column

db = SQLAlchemy()

class User(db.Model):
    id: Mapped[int] = mapped_column(primary_key=True)
    email: Mapped[str] = mapped_column(String(120), unique=True, nullable=False)
    password: Mapped[str] = mapped_column(nullable=False)
    is_active: Mapped[bool] = mapped_column(Boolean(), nullable=False)


    def serialize(self):
        return {
            "id": self.id,
            "email": self.email,
            # do not serialize the password, its a security breach
        }


class Service(db.Model):
    __tablename__ = 'services'
    service_id: Mapped[int] = mapped_column(primary_key=True)
    name: Mapped[str] = mapped_column(String(100), nullable=False)
    description: Mapped[str] = mapped_column(Text, nullable=True)
    base_hourly_rate: Mapped[float] = mapped_column(Numeric(10, 2), nullable=False)
    default_duration_minutes: Mapped[int] = mapped_column(Integer, nullable=False)
    min_duration_minutes: Mapped[int] = mapped_column(Integer, nullable=False)
    max_duration_minutes: Mapped[int] = mapped_column(Integer, nullable=False)
    is_active: Mapped[bool] = mapped_column(Boolean(), default=True, nullable=False)

    tasks = db.relationship('ServiceTask', backref='service', lazy=True, cascade='all, delete-orphan')

    def serialize(self):
        return {
            "service_id": self.service_id,
            "name": self.name,
            "description": self.description,
            "base_hourly_rate": float(self.base_hourly_rate),
            "default_duration_minutes": self.default_duration_minutes,
            "min_duration_minutes": self.min_duration_minutes,
            "max_duration_minutes": self.max_duration_minutes,
            "is_active": self.is_active,
            "tasks": [t.serialize() for t in self.tasks],
        }


class ServiceTask(db.Model):
    __tablename__ = 'service_tasks'
    service_task_id: Mapped[int] = mapped_column(primary_key=True)
    service_id: Mapped[int] = mapped_column(ForeignKey('services.service_id'), nullable=False)
    name: Mapped[str] = mapped_column(String(100), nullable=False)
    description: Mapped[str] = mapped_column(Text, nullable=True)
    estimated_minutes: Mapped[int] = mapped_column(Integer, nullable=True)
    is_required: Mapped[bool] = mapped_column(Boolean(), default=True, nullable=False)

    def serialize(self):
        return {
            "service_task_id": self.service_task_id,
            "service_id": self.service_id,
            "name": self.name,
            "description": self.description,
            "estimated_minutes": self.estimated_minutes,
            "is_required": self.is_required,
        }