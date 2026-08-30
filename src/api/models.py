from datetime import date, time
from flask_sqlalchemy import SQLAlchemy
from sqlalchemy import String, Boolean, Date, Time, ForeignKey
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
    user_id: Mapped[int] = mapped_column(ForeignKey('user.id'), unique=True, nullable=False)
    shift_id: Mapped[int] = mapped_column(ForeignKey('shifts.shift_id'), nullable=True)
    hire_date: Mapped[date] = mapped_column(Date, nullable=True)
    position: Mapped[str] = mapped_column(String(50), nullable=True)
    is_active: Mapped[bool] = mapped_column(Boolean(), default=True, nullable=False)

    user = db.relationship('User', backref='worker', lazy=True)
    shift = db.relationship('Shift', backref='workers', lazy=True)

    def serialize(self):
        return {
            "worker_id": self.worker_id,
            "user_id": self.user_id,
            "email": self.user.email if self.user else None,  # TODO: cambiar a name cuando exista en User
            "shift_id": self.shift_id,
            "shift_name": self.shift.name if self.shift else None,
            "hire_date": self.hire_date.isoformat() if self.hire_date else None,
            "position": self.position,
            "is_active": self.is_active,
        }