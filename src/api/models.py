from datetime import time, datetime

from flask_sqlalchemy import SQLAlchemy
from sqlalchemy import (
    String,
    Boolean,
    Text,
    Float,
    Integer,
    Time,
    DateTime,
    ForeignKey,
    Enum as SQLEnum,
)
from sqlalchemy.orm import Mapped, mapped_column
from enum import Enum


db = SQLAlchemy()


# ============================================================
# ENUMS
# ============================================================

class BookingStatus(Enum):
    PENDING = "pending"
    CONFIRMED = "confirmed"
    COMPLETED = "completed"
    CANCELLED = "cancelled"


class BookingTaskStatus(Enum):
    PENDING = "pending"
    IN_PROGRESS = "in_progress"
    COMPLETED = "completed"


class MediaType(Enum):
    IMAGE = "image"
    VIDEO = "video"


# ============================================================
# SHIFT
# ============================================================

class Shift(db.Model):
    __tablename__ = "shifts"

    shift_id: Mapped[int] = mapped_column(primary_key=True)
    name: Mapped[str] = mapped_column(
        String(50),
        nullable=False
    )
    start_time: Mapped[time] = mapped_column(
        Time,
        nullable=False
    )
    end_time: Mapped[time] = mapped_column(
        Time,
        nullable=False
    )

    def serialize(self):
        return {
            "shift_id": self.shift_id,
            "name": self.name,
            "start_time": self.start_time.strftime("%H:%M"),
            "end_time": self.end_time.strftime("%H:%M"),
        }


# ============================================================
# ADDRESS
# ============================================================

class Address(db.Model):
    __tablename__ = "addresses"

    address_id: Mapped[int] = mapped_column(
        primary_key=True
    )
    client_id: Mapped[int] = mapped_column(
        ForeignKey("users.user_id"),
        nullable=False
    )
    street: Mapped[str] = mapped_column(
        String(150),
        nullable=False
    )
    number: Mapped[str] = mapped_column(
        String(20),
        nullable=False
    )
    floor: Mapped[str] = mapped_column(
        String(20),
        nullable=False
    )
    postal_code: Mapped[str] = mapped_column(
        String(20),
        nullable=False
    )
    city: Mapped[str] = mapped_column(
        String(80),
        nullable=False
    )
    access_notes: Mapped[str] = mapped_column(
        Text,
        nullable=False
    )
    is_active: Mapped[bool] = mapped_column(
        Boolean(),
        nullable=False
    )

    def serialize(self):
        return {
            "address_id": self.address_id,
            "client_id": self.client_id,
            "street": self.street,
            "number": self.number,
            "floor": self.floor,
            "postal_code": self.postal_code,
            "city": self.city,
            "access_notes": self.access_notes,
            "is_active": self.is_active,
        }


# ============================================================
# SERVICE
# ============================================================

class Service(db.Model):
    __tablename__ = "services"

    service_id: Mapped[int] = mapped_column(
        primary_key=True
    )
    name: Mapped[str] = mapped_column(
        String(100),
        nullable=False
    )
    description: Mapped[str] = mapped_column(
        Text,
        nullable=False
    )
    base_hourly_rate: Mapped[float] = mapped_column(
        Float,
        nullable=False
    )
    is_active: Mapped[bool] = mapped_column(
        Boolean(),
        nullable=False
    )

    def serialize(self):
        tasks = ServiceTask.query.filter_by(
            service_id=self.service_id
        ).all()

        return {
            "service_id": self.service_id,
            "name": self.name,
            "description": self.description,
            "base_hourly_rate": self.base_hourly_rate,
            "is_active": self.is_active,
            "tasks": [task.serialize() for task in tasks],
        }


# ============================================================
# SERVICE TASK
# ============================================================

class ServiceTask(db.Model):
    __tablename__ = "service_tasks"

    service_task_id: Mapped[int] = mapped_column(
        primary_key=True
    )
    service_id: Mapped[int] = mapped_column(
        ForeignKey("services.service_id"),
        nullable=False
    )
    name: Mapped[str] = mapped_column(
        String(100),
        nullable=False
    )
    description: Mapped[str | None] = mapped_column(
        Text,
        nullable=True
    )
    estimated_minutes: Mapped[int] = mapped_column(
        Integer,
        nullable=False
    )
    is_required: Mapped[bool] = mapped_column(
        Boolean(),
        nullable=False
    )

    def serialize(self):
        return {
            "service_task_id": self.service_task_id,
            "service_id": self.service_id,
            "name": self.name,
            "description": self.description,
            "estimated_minutes": self.estimated_minutes,
            "is_required": self.is_required,
        }


# ============================================================
# BOOKING
# ============================================================

class Booking(db.Model):
    __tablename__ = "bookings"

    booking_id: Mapped[int] = mapped_column(
        primary_key=True
    )
    client_id: Mapped[int] = mapped_column(
        ForeignKey("users.user_id"),
        nullable=False
    )
    service_id: Mapped[int] = mapped_column(
        ForeignKey("services.service_id"),
        nullable=False
    )
    address_id: Mapped[int] = mapped_column(
        ForeignKey("addresses.address_id"),
        nullable=False
    )
    scheduled_start: Mapped[datetime] = mapped_column(
        DateTime,
        nullable=False
    )
    scheduled_end: Mapped[datetime] = mapped_column(
        DateTime,
        nullable=False
    )
    hourly_rate: Mapped[float] = mapped_column(
        Float,
        nullable=False
    )
    total_price: Mapped[float] = mapped_column(
        Float,
        nullable=False
    )
    status: Mapped[BookingStatus] = mapped_column(
        SQLEnum(BookingStatus),
        nullable=False
    )
    client_notes: Mapped[str | None] = mapped_column(
        Text,
        nullable=True
    )
    created_at: Mapped[datetime | None] = mapped_column(
        DateTime,
        nullable=True
    )
    updated_at: Mapped[datetime | None] = mapped_column(
        DateTime,
        nullable=True
    )

    def serialize(self):
        return {
            "booking_id": self.booking_id,
            "client_id": self.client_id,
            "service_id": self.service_id,
            "address_id": self.address_id,
            "scheduled_start": (
                self.scheduled_start.isoformat()
                if self.scheduled_start
                else None
            ),
            "scheduled_end": (
                self.scheduled_end.isoformat()
                if self.scheduled_end
                else None
            ),
            "hourly_rate": self.hourly_rate,
            "total_price": self.total_price,
            "status": (
                self.status.value
                if self.status
                else None
            ),
            "client_notes": self.client_notes,
            "created_at": (
                self.created_at.isoformat()
                if self.created_at
                else None
            ),
            "updated_at": (
                self.updated_at.isoformat()
                if self.updated_at
                else None
            ),
        }


# ============================================================
# BOOKING TASK
# ============================================================

class BookingTask(db.Model):
    __tablename__ = "booking_tasks"

    booking_task_id: Mapped[int] = mapped_column(
        primary_key=True
    )
    booking_id: Mapped[int] = mapped_column(
        ForeignKey("bookings.booking_id"),
        nullable=False
    )
    service_task_id: Mapped[int] = mapped_column(
        ForeignKey("service_tasks.service_task_id"),
        nullable=False
    )
    status: Mapped[BookingTaskStatus] = mapped_column(
        SQLEnum(BookingTaskStatus),
        nullable=False
    )
    completed_at: Mapped[datetime | None] = mapped_column(
        DateTime,
        nullable=True
    )
    notes: Mapped[str | None] = mapped_column(
        Text,
        nullable=True
    )

    def serialize(self):
        return {
            "booking_task_id": self.booking_task_id,
            "booking_id": self.booking_id,
            "service_task_id": self.service_task_id,
            "status": (
                self.status.value
                if self.status
                else None
            ),
            "completed_at": (
                self.completed_at.isoformat()
                if self.completed_at
                else None
            ),
            "notes": self.notes,
        }


# ============================================================
# REVIEW
# ============================================================

class Review(db.Model):
    __tablename__ = "reviews"

    review_id: Mapped[int] = mapped_column(
        primary_key=True
    )
    booking_id: Mapped[int] = mapped_column(
        ForeignKey("bookings.booking_id"),
        unique=True,
        nullable=False
    )
    client_id: Mapped[int] = mapped_column(
        ForeignKey("users.user_id"),
        nullable=False
    )
    rating: Mapped[int] = mapped_column(
        Integer,
        nullable=False
    )
    comment: Mapped[str | None] = mapped_column(
        Text,
        nullable=True
    )
    created_at: Mapped[datetime | None] = mapped_column(
        DateTime,
        nullable=True
    )

    def serialize(self):
        return {
            "review_id": self.review_id,
            "booking_id": self.booking_id,
            "client_id": self.client_id,
            "rating": self.rating,
            "comment": self.comment,
            "created_at": (
                self.created_at.isoformat()
                if self.created_at
                else None
            ),
        }


# ============================================================
# INCIDENT
# ============================================================

class Incident(db.Model):
    __tablename__ = "incidents"

    incident_id: Mapped[int] = mapped_column(
        primary_key=True
    )
    booking_id: Mapped[int] = mapped_column(
        ForeignKey("bookings.booking_id"),
        nullable=False
    )
    worker_id: Mapped[int | None] = mapped_column(
        ForeignKey("workers.worker_id"),
        nullable=True
    )
    booking_task_id: Mapped[int | None] = mapped_column(
        ForeignKey("booking_tasks.booking_task_id"),
        nullable=True
    )
    incident_type: Mapped[str | None] = mapped_column(
        String(50),
        nullable=True
    )
    description: Mapped[str | None] = mapped_column(
        Text,
        nullable=True
    )
    resolved: Mapped[bool] = mapped_column(
        Boolean(),
        nullable=False
    )
    created_at: Mapped[datetime] = mapped_column(
        DateTime,
        nullable=False
    )
    resolved_at: Mapped[datetime | None] = mapped_column(
        DateTime,
        nullable=True
    )

    def serialize(self):
        media = Media.query.filter_by(
            incident_id=self.incident_id
        ).all()

        return {
            "incident_id": self.incident_id,
            "booking_id": self.booking_id,
            "worker_id": self.worker_id,
            "booking_task_id": self.booking_task_id,
            "incident_type": self.incident_type,
            "description": self.description,
            "resolved": self.resolved,
            "created_at": (
                self.created_at.isoformat()
                if self.created_at
                else None
            ),
            "resolved_at": (
                self.resolved_at.isoformat()
                if self.resolved_at
                else None
            ),
            "media": [media_item.serialize() for media_item in media],
        }


# ============================================================
# MEDIA
# ============================================================

class Media(db.Model):
    __tablename__ = "media"

    media_id: Mapped[int] = mapped_column(
        primary_key=True
    )
    incident_id: Mapped[int] = mapped_column(
        ForeignKey("incidents.incident_id"),
        nullable=False
    )
    media_url: Mapped[str] = mapped_column(
        String(255),
        nullable=False
    )
    media_type: Mapped[MediaType] = mapped_column(
        SQLEnum(MediaType),
        nullable=False
    )
    uploaded_at: Mapped[datetime | None] = mapped_column(
        DateTime,
        nullable=True
    )

    def serialize(self):
        return {
            "media_id": self.media_id,
            "incident_id": self.incident_id,
            "media_url": self.media_url,
            "media_type": (
                self.media_type.value
                if self.media_type
                else None
            ),
            "uploaded_at": (
                self.uploaded_at.isoformat()
                if self.uploaded_at
                else None
            ),
        }