from datetime import date, time, datetime
from flask_sqlalchemy import SQLAlchemy
from sqlalchemy import String, Boolean, Text, Float, Integer, Date, Time, DateTime, ForeignKey
from sqlalchemy.orm import Mapped, mapped_column

db = SQLAlchemy()


class User(db.Model):
    __tablename__ = 'users'

    user_id: Mapped[int] = mapped_column(primary_key=True)
    name: Mapped[str] = mapped_column(String(80), nullable=True)
    last_name: Mapped[str] = mapped_column(String(80), nullable=True)
    email: Mapped[str] = mapped_column(String(120), unique=True, nullable=False)
    password_hash: Mapped[str] = mapped_column(nullable=False)
    phone: Mapped[str] = mapped_column(String(20), nullable=True)
    avatar_url: Mapped[str] = mapped_column(String(255), nullable=True)
    role: Mapped[str] = mapped_column(String(20), nullable=True)
    is_active: Mapped[bool] = mapped_column(Boolean(), nullable=False)

    def serialize(self):
        return {
            "user_id": self.user_id,
            "name": self.name,
            "last_name": self.last_name,
            "email": self.email,
            "phone": self.phone,
            "avatar_url": self.avatar_url,
            "role": self.role,
            "is_active": self.is_active,
        }


class Shift(db.Model):
    __tablename__ = 'shifts'

    shift_id: Mapped[int] = mapped_column(primary_key=True)
    name: Mapped[str] = mapped_column(String(50), nullable=False)
    start_time: Mapped[time] = mapped_column(Time, nullable=False)
    end_time: Mapped[time] = mapped_column(Time, nullable=False)

    def serialize(self):
        return {
            "shift_id": self.shift_id,
            "name": self.name,
            "start_time": self.start_time.strftime("%H:%M"),
            "end_time": self.end_time.strftime("%H:%M"),
        }


class Worker(db.Model):
    __tablename__ = 'workers'

    worker_id: Mapped[int] = mapped_column(primary_key=True)
    user_id: Mapped[int] = mapped_column(ForeignKey('users.user_id'), unique=True, nullable=False)
    shift_id: Mapped[int] = mapped_column(ForeignKey('shifts.shift_id'), nullable=True)
    hire_date: Mapped[date] = mapped_column(Date, nullable=True)
    position: Mapped[str] = mapped_column(String(50), nullable=True)
    is_active: Mapped[bool] = mapped_column(Boolean(), nullable=False)

    def serialize(self):
        user = User.query.get(self.user_id)
        shift = Shift.query.get(self.shift_id) if self.shift_id else None
        return {
            "worker_id": self.worker_id,
            "user_id": self.user_id,
            "name": user.name if user else None,
            "shift_id": self.shift_id,
            "shift_name": shift.name if shift else None,
            "hire_date": self.hire_date.isoformat() if self.hire_date else None,
            "position": self.position,
            "is_active": self.is_active,
        }


class Address(db.Model):
    __tablename__ = 'addresses'

    address_id: Mapped[int] = mapped_column(primary_key=True)
    client_id: Mapped[int] = mapped_column(ForeignKey('users.user_id'), nullable=False)
    street: Mapped[str] = mapped_column(String(150), nullable=True)
    number: Mapped[str] = mapped_column(String(20), nullable=True)
    floor: Mapped[str] = mapped_column(String(20), nullable=True)
    postal_code: Mapped[str] = mapped_column(String(20), nullable=True)
    city: Mapped[str] = mapped_column(String(80), nullable=True)
    access_notes: Mapped[str] = mapped_column(Text, nullable=True)
    is_active: Mapped[bool] = mapped_column(Boolean(), nullable=False)

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


class Service(db.Model):
    __tablename__ = 'services'

    service_id: Mapped[int] = mapped_column(primary_key=True)
    name: Mapped[str] = mapped_column(String(100), nullable=False)
    description: Mapped[str] = mapped_column(Text, nullable=True)
    base_hourly_rate: Mapped[float] = mapped_column(Float, nullable=False)
    default_duration_minutes: Mapped[int] = mapped_column(Integer, nullable=False)
    min_duration_minutes: Mapped[int] = mapped_column(Integer, nullable=False)
    max_duration_minutes: Mapped[int] = mapped_column(Integer, nullable=False)
    is_active: Mapped[bool] = mapped_column(Boolean(), nullable=False)

    def serialize(self):
        tasks = ServiceTask.query.filter_by(service_id=self.service_id).all()
        return {
            "service_id": self.service_id,
            "name": self.name,
            "description": self.description,
            "base_hourly_rate": self.base_hourly_rate,
            "default_duration_minutes": self.default_duration_minutes,
            "min_duration_minutes": self.min_duration_minutes,
            "max_duration_minutes": self.max_duration_minutes,
            "is_active": self.is_active,
            "tasks": [t.serialize() for t in tasks],
        }


class ServiceTask(db.Model):
    __tablename__ = 'service_tasks'

    service_task_id: Mapped[int] = mapped_column(primary_key=True)
    service_id: Mapped[int] = mapped_column(ForeignKey('services.service_id'), nullable=False)
    name: Mapped[str] = mapped_column(String(100), nullable=False)
    description: Mapped[str] = mapped_column(Text, nullable=True)
    estimated_minutes: Mapped[int] = mapped_column(Integer, nullable=True)
    is_required: Mapped[bool] = mapped_column(Boolean(), nullable=False)

    def serialize(self):
        return {
            "service_task_id": self.service_task_id,
            "service_id": self.service_id,
            "name": self.name,
            "description": self.description,
            "estimated_minutes": self.estimated_minutes,
            "is_required": self.is_required,
        }


class Booking(db.Model):
    __tablename__ = 'bookings'

    booking_id: Mapped[int] = mapped_column(primary_key=True)
    client_id: Mapped[int] = mapped_column(ForeignKey('users.user_id'), nullable=False)
    service_id: Mapped[int] = mapped_column(ForeignKey('services.service_id'), nullable=False)
    address_id: Mapped[int] = mapped_column(ForeignKey('addresses.address_id'), nullable=False)
    scheduled_start: Mapped[datetime] = mapped_column(DateTime, nullable=False)
    scheduled_end: Mapped[datetime] = mapped_column(DateTime, nullable=False)
    hourly_rate: Mapped[float] = mapped_column(Float, nullable=False)
    total_price: Mapped[float] = mapped_column(Float, nullable=False)
    status: Mapped[str] = mapped_column(String(20), nullable=False)
    client_notes: Mapped[str] = mapped_column(Text, nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime, nullable=True)
    updated_at: Mapped[datetime] = mapped_column(DateTime, nullable=True)

    def serialize(self):
        return {
            "booking_id": self.booking_id,
            "client_id": self.client_id,
            "service_id": self.service_id,
            "address_id": self.address_id,
            "scheduled_start": self.scheduled_start.isoformat() if self.scheduled_start else None,
            "scheduled_end": self.scheduled_end.isoformat() if self.scheduled_end else None,
            "hourly_rate": self.hourly_rate,
            "total_price": self.total_price,
            "status": self.status,
            "client_notes": self.client_notes,
            "created_at": self.created_at.isoformat() if self.created_at else None,
            "updated_at": self.updated_at.isoformat() if self.updated_at else None,
        }


class BookingWorker(db.Model):
    __tablename__ = 'booking_workers'

    booking_worker_id: Mapped[int] = mapped_column(primary_key=True)
    booking_id: Mapped[int] = mapped_column(ForeignKey('bookings.booking_id'), nullable=False)
    worker_id: Mapped[int] = mapped_column(ForeignKey('workers.worker_id'), nullable=False)
    assigned_at: Mapped[datetime] = mapped_column(DateTime, nullable=True)

    def serialize(self):
        return {
            "booking_worker_id": self.booking_worker_id,
            "booking_id": self.booking_id,
            "worker_id": self.worker_id,
            "assigned_at": self.assigned_at.isoformat() if self.assigned_at else None,
        }


class BookingTask(db.Model):
    __tablename__ = 'booking_tasks'

    booking_task_id: Mapped[int] = mapped_column(primary_key=True)
    booking_id: Mapped[int] = mapped_column(ForeignKey('bookings.booking_id'), nullable=False)
    service_task_id: Mapped[int] = mapped_column(ForeignKey('service_tasks.service_task_id'), nullable=False)
    status: Mapped[str] = mapped_column(String(20), nullable=False)
    completed_at: Mapped[datetime] = mapped_column(DateTime, nullable=True)
    notes: Mapped[str] = mapped_column(Text, nullable=True)

    def serialize(self):
        return {
            "booking_task_id": self.booking_task_id,
            "booking_id": self.booking_id,
            "service_task_id": self.service_task_id,
            "status": self.status,
            "completed_at": self.completed_at.isoformat() if self.completed_at else None,
            "notes": self.notes,
        }


class Review(db.Model):
    __tablename__ = 'reviews'

    review_id: Mapped[int] = mapped_column(primary_key=True)
    booking_id: Mapped[int] = mapped_column(ForeignKey('bookings.booking_id'), unique=True, nullable=False)
    client_id: Mapped[int] = mapped_column(ForeignKey('users.user_id'), nullable=False)
    rating: Mapped[int] = mapped_column(Integer, nullable=False)
    comment: Mapped[str] = mapped_column(Text, nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime, nullable=True)

    def serialize(self):
        return {
            "review_id": self.review_id,
            "booking_id": self.booking_id,
            "client_id": self.client_id,
            "rating": self.rating,
            "comment": self.comment,
            "created_at": self.created_at.isoformat() if self.created_at else None,
        }


class Incident(db.Model):
    __tablename__ = 'incidents'

    incident_id: Mapped[int] = mapped_column(primary_key=True)
    booking_id: Mapped[int] = mapped_column(ForeignKey('bookings.booking_id'), nullable=False)
    worker_id: Mapped[int] = mapped_column(ForeignKey('workers.worker_id'), nullable=True)
    booking_task_id: Mapped[int] = mapped_column(ForeignKey('booking_tasks.booking_task_id'), nullable=True)
    incident_type: Mapped[str] = mapped_column(String(50), nullable=True)
    description: Mapped[str] = mapped_column(Text, nullable=True)
    resolved: Mapped[bool] = mapped_column(Boolean(), nullable=False)
    created_at: Mapped[datetime] = mapped_column(DateTime, nullable=True)
    resolved_at: Mapped[datetime] = mapped_column(DateTime, nullable=True)

    def serialize(self):
        media = Media.query.filter_by(incident_id=self.incident_id).all()
        return {
            "incident_id": self.incident_id,
            "booking_id": self.booking_id,
            "worker_id": self.worker_id,
            "booking_task_id": self.booking_task_id,
            "incident_type": self.incident_type,
            "description": self.description,
            "resolved": self.resolved,
            "created_at": self.created_at.isoformat() if self.created_at else None,
            "resolved_at": self.resolved_at.isoformat() if self.resolved_at else None,
            "media": [m.serialize() for m in media],
        }


class Media(db.Model):
    __tablename__ = 'media'

    media_id: Mapped[int] = mapped_column(primary_key=True)
    incident_id: Mapped[int] = mapped_column(ForeignKey('incidents.incident_id'), nullable=False)
    media_url: Mapped[str] = mapped_column(String(255), nullable=False)
    media_type: Mapped[str] = mapped_column(String(20), nullable=True)
    uploaded_at: Mapped[datetime] = mapped_column(DateTime, nullable=True)

    def serialize(self):
        return {
            "media_id": self.media_id,
            "incident_id": self.incident_id,
            "media_url": self.media_url,
            "media_type": self.media_type,
            "uploaded_at": self.uploaded_at.isoformat() if self.uploaded_at else None,
        }