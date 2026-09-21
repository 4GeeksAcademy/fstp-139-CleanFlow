"""
Modelos de la base de datos de CleanFlow.

  - User: una sola tabla para cliente, trabajador y encargado (campo `role`).
  - Service y Task: los dos catálogos que gestiona el encargado (#11).
  - Booking y BookingTask: reservas, con precio, minutos y nombres congelados.
  - Shift, Worker, Address, Review, Incident, Media: resto del dominio.

Lo que tiene `is_active` no se borra: se desactiva.
"""

from datetime import time, datetime, date
from flask_sqlalchemy import SQLAlchemy
from sqlalchemy import String, Boolean, Text, Float, Integer, Time, Date, DateTime, ForeignKey, func
from sqlalchemy import Enum as SQLEnum
from sqlalchemy.orm import Mapped, mapped_column
from enum import Enum
from flask_bcrypt import generate_password_hash, check_password_hash

db = SQLAlchemy()


# ==================================================================
# ENUMS
# ==================================================================

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


# ==================================================================
# USER
# ==================================================================

class User(db.Model):
    """Usuario de la aplicación.

    Cliente, trabajador y encargado comparten modelo: solo los distingue `role`.
    """

    # Sin esto la tabla se llamaría "user" y las claves foráneas a "users"
    # no la encontrarían.
    __tablename__ = "users"

    # ------------------------------------------------------------------
    # COLUMNAS
    # ------------------------------------------------------------------

    user_id: Mapped[int] = mapped_column(primary_key=True)
    name: Mapped[str] = mapped_column(String(100), nullable=False)
    last_name: Mapped[str] = mapped_column(String(150), nullable=False)
    phone: Mapped[str] = mapped_column(String(20), nullable=False)
    email: Mapped[str] = mapped_column(
        String(120), unique=True, nullable=False)

    # El hash, nunca la contraseña en claro (ver set_password).
    password_hash: Mapped[str] = mapped_column(nullable=False)

    # La BD solo acepta estos tres roles. `name` es el nombre del tipo en
    # PostgreSQL, y es obligatorio.
    role: Mapped[str] = mapped_column(
        SQLEnum("client", "worker", "manager", name="user_role"),
        nullable=False
    )

    # Desactivar en vez de borrar conserva el historial de la cuenta.
    is_active: Mapped[bool] = mapped_column(Boolean(), nullable=False)
    avatar_url: Mapped[str | None] = mapped_column(String(255), nullable=True)

    # server_default: la fecha la pone la BD al insertar, no Python.
    created_at: Mapped[DateTime] = mapped_column(
        DateTime(),
        nullable=False,
        server_default=func.now()
    )

    # ------------------------------------------------------------------
    # CONTRASEÑA
    # ------------------------------------------------------------------
    # Solo se guarda el hash, que no tiene vuelta atrás: al hacer login se
    # hashea lo recibido y se comparan los dos hashes.

    def set_password(self, password):
        """Hashea y guarda la contraseña. Todo alta de usuario pasa por aquí."""
        # bcrypt devuelve bytes; .decode() lo pasa a texto para la columna.
        self.password_hash = generate_password_hash(password).decode('utf-8')

    def check_password(self, password):
        """True si la contraseña recibida coincide con el hash guardado."""
        try:
            return check_password_hash(self.password_hash, password)
        except ValueError:
            # Hash no válido de bcrypt (p. ej. usuario creado desde el panel
            # de admin). Sin esto el login daría 500 en vez de 401.
            return False

    # ------------------------------------------------------------------
    # SERIALIZADORES
    # ------------------------------------------------------------------
    # Un método por uso, en vez de uno lleno de condicionales.

    def serialize(self):
        """Vista completa, para pantallas de gestión."""
        return {
            "user_id": self.user_id,
            "name": self.name,
            "last_name": self.last_name,
            "phone": self.phone,
            "email": self.email,
            "role": self.role,
            "is_active": self.is_active,
            "avatar_url": self.avatar_url,
            # JSON no entiende de fechas: se envía como texto ISO.
            "created_at": self.created_at.isoformat() if self.created_at else None
        }

    def serialize_session(self):
        """Vista mínima para la sesión. La devuelven /api/login y /api/profile
        y acaba en localStorage, así que solo lleva lo imprescindible.

        last_name está por el bloque de usuario del sidebar, que enseña el
        nombre completo. El teléfono NO: no hace falta para la sesión."""
        return {
            "user_id": self.user_id,
            "name": self.name,
            "last_name": self.last_name,
            "email": self.email,
            "role": self.role,
            "avatar_url": self.avatar_url
        }

    def serialize_account(self):
        """Vista para la pantalla de ajustes (#13). Añade el teléfono, que
        solo se usa ahí. El correo viaja, pero no se puede cambiar."""
        return {
            "name": self.name,
            "last_name": self.last_name,
            "phone": self.phone,
            "email": self.email,
            "role": self.role,
            "avatar_url": self.avatar_url
        }


# ==================================================================
# SHIFT
# ==================================================================
# Turno de trabajo (mañana, tarde...) con su hora de inicio y fin.

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

    # Días de la semana en que se trabaja, como texto: "1,2,3,4,5".
    # Lunes = 1 ... domingo = 7, igual que date.isoweekday(): se compara
    # sin convertir nada. Se lee y se escribe con la propiedad `days`.
    work_days: Mapped[str] = mapped_column(
        String(20),
        nullable=False,
        server_default="1,2,3,4,5"
    )

    # Desactivado: se conserva, pero no ofrece huecos para reservar.
    # server_default: los turnos que ya existían quedan activos al migrar.
    is_active: Mapped[bool] = mapped_column(
        Boolean(),
        nullable=False,
        default=True,
        server_default="true"
    )

    @property
    def days(self):
        """Los días como lista de números: "1,3,5" -> [1, 3, 5]."""
        return [int(day) for day in self.work_days.split(",") if day]

    @days.setter
    def days(self, values):
        """Guarda la lista ordenada y sin repetidos: [5, 1, 1] -> "1,5"."""
        self.work_days = ",".join(str(day) for day in sorted(set(values)))

    def serialize(self):
        return {
            "shift_id": self.shift_id,
            "name": self.name,
            "start_time": self.start_time.strftime("%H:%M"),
            "end_time": self.end_time.strftime("%H:%M"),
            "work_days": self.days,
            "is_active": self.is_active,
            "workers": [
                {
                    "worker_id": worker.worker_id,
                    "name": worker.user.name,
                    "last_name": worker.user.last_name,
                }
                for worker in self.workers
                if worker.user is not None
            ],
        }


# ==================================================================
# WORKER
# ==================================================================
# Ficha laboral de un usuario trabajador: turno, fecha de alta y puesto.

class Worker(db.Model):
    __tablename__ = "workers"

    worker_id: Mapped[int] = mapped_column(
        primary_key=True
    )

    user_id: Mapped[int] = mapped_column(
        ForeignKey("users.user_id"),
        unique=True,
        nullable=False
    )

    shift_id: Mapped[int | None] = mapped_column(
        ForeignKey("shifts.shift_id"),
        nullable=True
    )

    hire_date: Mapped[date | None] = mapped_column(
        Date,
        nullable=True
    )

    position: Mapped[str | None] = mapped_column(
        String(50),
        nullable=True
    )

    is_active: Mapped[bool] = mapped_column(
        Boolean(),
        default=True,
        nullable=False
    )

    user = db.relationship(
        "User",
        foreign_keys=[user_id],
        backref="worker",
        lazy=True
    )

    shift = db.relationship(
        "Shift",
        backref="workers",
        lazy=True
    )

    def serialize(self):
        return {
            "worker_id": self.worker_id,
            "user_id": self.user_id,
            "name": self.user.name if self.user else None,
            "last_name": self.user.last_name if self.user else None,
            "phone": self.user.phone if self.user else None,
            "email": self.user.email if self.user else None,
            "role": self.user.role if self.user else None,
            "shift_id": self.shift_id,
            "shift_name": self.shift.name if self.shift else None,
            "hire_date": (
                self.hire_date.isoformat()
                if self.hire_date
                else None
            ),
            "position": self.position,
            "is_active": self.is_active,
        }


# ==================================================================
# ADDRESS
# ==================================================================
# Dirección de un cliente donde se hace el servicio. Cada cliente tiene una
# principal (is_default), que es la que sale elegida al contratar.

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

    # Opcionales: una casa no tiene piso, y las notas de acceso (portero,
    # timbre, dónde aparcar...) son un extra.
    floor: Mapped[str | None] = mapped_column(
        String(20),
        nullable=True
    )
    postal_code: Mapped[str] = mapped_column(
        String(20),
        nullable=False
    )
    city: Mapped[str] = mapped_column(
        String(80),
        nullable=False
    )
    access_notes: Mapped[str | None] = mapped_column(
        Text,
        nullable=True
    )

    # La principal del cliente: la que sale elegida al contratar. Solo puede
    # haber una activa, y de eso se encarga la API.
    is_default: Mapped[bool] = mapped_column(
        Boolean(),
        nullable=False,
        default=False
    )

    # Se desactiva, nunca se borra: hay reservas que apuntan a ella.
    is_active: Mapped[bool] = mapped_column(
        Boolean(),
        nullable=False,
        default=True
    )

    # La pone la BD al insertar. Sirve para saber cuál es la más reciente
    # cuando hay que elegir principal nueva.
    created_at: Mapped[datetime] = mapped_column(
        DateTime,
        nullable=False,
        server_default=func.now()
    )

    def serialize(self):
        """Sin client_id: el cliente solo recibe las suyas."""
        return {
            "address_id": self.address_id,
            "street": self.street,
            "number": self.number,
            "floor": self.floor,
            "postal_code": self.postal_code,
            "city": self.city,
            "access_notes": self.access_notes,
            "is_default": self.is_default,
            "is_active": self.is_active,
        }


# ==================================================================
# SERVICE
# ==================================================================

class Service(db.Model):
    """Tipo de limpieza (esencial, integral, profunda, fin de obra...), por horas.

    `minutes_per_task` vive aquí y no en Task porque la misma tarea dura
    distinto según el servicio.
    """

    __tablename__ = "services"

    # ------------------------------------------------------------------
    # IDENTIDAD Y TEXTOS
    # ------------------------------------------------------------------

    service_id: Mapped[int] = mapped_column(
        primary_key=True
    )
    name: Mapped[str] = mapped_column(
        String(100),
        nullable=False
    )

    # URL pública ("limpieza-integral"). Se genera con slugify() al crear y
    # NO cambia al renombrar, para no romper enlaces ya compartidos.
    slug: Mapped[str] = mapped_column(
        String(120),
        unique=True,
        nullable=False
    )

    # Texto corto, para tarjetas y listados.
    description: Mapped[str] = mapped_column(
        Text,
        nullable=False
    )

    # Texto de la ficha. Opcional: sin él, la web usa `description`.
    long_description: Mapped[str | None] = mapped_column(
        Text,
        nullable=True
    )
    image_url: Mapped[str | None] = mapped_column(
        String(255),
        nullable=True
    )

    # ------------------------------------------------------------------
    # PRECIO Y TIEMPO
    # ------------------------------------------------------------------

    base_hourly_rate: Mapped[float] = mapped_column(
        Float,
        nullable=False
    )

    # Minutos por tarea: 10, 12, 15, 20, 30 o 60 (divisores de 60, lo valida
    # la API). ⚠️ NULL significa que el servicio NO lleva tareas (fin de obra).
    minutes_per_task: Mapped[int | None] = mapped_column(
        Integer,
        nullable=True
    )

    # Horas contratables: mínimo, salto y tope opcional.
    #   esencial / integral / profunda:  mínimo 1, salto 1
    #   fin de obra:                     mínimo 6, salto 3  (6, 9, 12...)
    min_hours: Mapped[int] = mapped_column(
        Integer,
        nullable=False,
        default=1
    )
    hour_step: Mapped[int] = mapped_column(
        Integer,
        nullable=False,
        default=1
    )
    max_hours: Mapped[int | None] = mapped_column(
        Integer,
        nullable=True
    )

    # Se desactiva, nunca se borra: hay reservas que apuntan a él.
    is_active: Mapped[bool] = mapped_column(
        Boolean(),
        nullable=False
    )

    # ------------------------------------------------------------------
    # DATOS CALCULADOS
    # ------------------------------------------------------------------

    @property
    def tasks_per_hour(self):
        """Tareas que caben en una hora (30 min -> 2), o None si no lleva tareas.
        Viaja en el JSON para que el frontend no repita la cuenta."""
        if self.minutes_per_task is None:
            return None
        return 60 // self.minutes_per_task

    # ------------------------------------------------------------------
    # SERIALIZADORES
    # ------------------------------------------------------------------
    # Como en User: la de gestión lo enseña todo; la pública, solo lo que
    # puede ver cualquiera.

    def serialize(self):
        """Vista completa, para el panel del encargado."""
        return {
            "service_id": self.service_id,
            "name": self.name,
            "slug": self.slug,
            "description": self.description,
            "long_description": self.long_description,
            "image_url": self.image_url,
            "base_hourly_rate": self.base_hourly_rate,
            "minutes_per_task": self.minutes_per_task,
            "tasks_per_hour": self.tasks_per_hour,
            "min_hours": self.min_hours,
            "hour_step": self.hour_step,
            "max_hours": self.max_hours,
            "is_active": self.is_active,
        }

    def serialize_public(self):
        """Vista para la web y el cliente. Sin id ni `is_active`: solo llegan
        servicios activos y se identifican por slug."""
        return {
            "name": self.name,
            "slug": self.slug,
            "description": self.description,
            "long_description": self.long_description,
            "image_url": self.image_url,
            "base_hourly_rate": self.base_hourly_rate,
            "minutes_per_task": self.minutes_per_task,
            "tasks_per_hour": self.tasks_per_hour,
            "min_hours": self.min_hours,
            "hour_step": self.hour_step,
            "max_hours": self.max_hours,
        }


# ==================================================================
# TASK
# ==================================================================

class Task(db.Model):
    """Tarea del catálogo compartido (limpiar cristales, baño...).

    Vale para cualquier servicio con tareas. No guarda minutos: eso depende
    del servicio (Service.minutes_per_task).
    """

    __tablename__ = "tasks"

    task_id: Mapped[int] = mapped_column(
        primary_key=True
    )

    # Único en la BD. Que no se repita cambiando solo mayúsculas lo
    # comprueba la API.
    task_name: Mapped[str] = mapped_column(
        String(100),
        unique=True,
        nullable=False
    )
    description: Mapped[str | None] = mapped_column(
        Text,
        nullable=True
    )

    # Se desactiva, nunca se borra: hay reservas que apuntan a ella.
    is_active: Mapped[bool] = mapped_column(
        Boolean(),
        nullable=False,
        default=True
    )

    # ------------------------------------------------------------------
    # SERIALIZADORES
    # ------------------------------------------------------------------
    # Como en Service: la de gestión lo enseña todo; la pública, sin estado.

    def serialize(self):
        """Vista completa, para el panel del encargado."""
        return {
            "task_id": self.task_id,
            "task_name": self.task_name,
            "description": self.description,
            "is_active": self.is_active,
        }

    def serialize_public(self):
        """Vista para la web y el cliente. Sin `is_active`: solo llegan tareas
        activas. Con `task_id`, a diferencia de Service: las tareas no tienen
        slug, y la reserva (#14) guardará las elegidas por su id."""
        return {
            "task_id": self.task_id,
            "task_name": self.task_name,
            "description": self.description,
        }


# ==================================================================
# BOOKING
# ==================================================================
# Reserva de un cliente: servicio, dirección, horario y precio.

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
    # Quién hace la reserva: lo elige el cliente (o se asigna solo con
    # "Cualquiera"). Por eso la reserva nace ya confirmada.
    worker_id: Mapped[int] = mapped_column(
        ForeignKey("workers.worker_id"),
        nullable=False,
        index=True
    )
    # Hora de Madrid, sin zona: inicio del primer tramo y fin del último.
    # Las horas contratadas no se guardan: salen de los tramos (hours).
    scheduled_start: Mapped[datetime] = mapped_column(
        DateTime,
        nullable=False
    )
    scheduled_end: Mapped[datetime] = mapped_column(
        DateTime,
        nullable=False
    )
    # Congelados al reservar (tarifa, minutos y total): si el servicio cambia
    # después, esta reserva conserva los suyos. El histórico no se reescribe.
    hourly_rate: Mapped[float] = mapped_column(
        Float,
        nullable=False
    )
    minutes_per_task: Mapped[int | None] = mapped_column(
        Integer,
        nullable=True
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

    # Cancelación empresarial: visible al cliente, sin exponer ausencias.
    cancelled_by_company: Mapped[bool] = mapped_column(
        Boolean, nullable=False, default=False, server_default="false"
    )
    cancellation_reason: Mapped[str | None] = mapped_column(
        Text, nullable=True)

    # ---- RELACIONES ----
    # No añaden columnas: le dicen a SQLAlchemy cómo cruzar las claves.
    # Así se lee booking.service en vez de buscarlo.
    worker = db.relationship("Worker")
    service = db.relationship("Service")
    address = db.relationship("Address")

    # Los tramos, en orden. Con booking.days.append(...) se guardan
    # junto con la reserva.
    days = db.relationship(
        "BookingDay",
        order_by="BookingDay.starts_at"
    )

    # Las tareas en el orden en que se añadieron. Con
    # booking.tasks.append(...) se guardan junto con la reserva.
    tasks = db.relationship(
        "BookingTask",
        order_by="BookingTask.booking_task_id"
    )

    # ---- DATOS CALCULADOS ----

    @property
    def hours(self):
        """Horas contratadas: la suma de sus tramos.

        Fin menos inicio no vale: una reserva de viernes a lunes contaría
        también las noches y el fin de semana.
        """
        seconds = sum((day.ends_at - day.starts_at).total_seconds() for day in self.days)
        return int(seconds // 3600)

    # ---- SERIALIZADORES ----

    def serialize(self):
        return {
            "booking_id": self.booking_id,
            "client_id": self.client_id,
            "service_id": self.service_id,
            "address_id": self.address_id,
            "worker_id": self.worker_id,
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
            "minutes_per_task": self.minutes_per_task,
            "total_price": self.total_price,
            "status": (
                self.status.value
                if self.status
                else None
            ),
            "client_notes": self.client_notes,
            "cancelled_by_company": self.cancelled_by_company,
            "cancellation_reason": self.cancellation_reason,
            "worker_name": (
                self.worker.user.name + (
                    " " + self.worker.user.last_name.strip()[0] + "."
                    if self.worker.user.last_name.strip() else ""
                ) if self.worker and self.worker.user else None
            ),
            "days": [day.serialize() for day in self.days],
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

    def serialize_detail(self):
        """La reserva completa: servicio, dirección, tramos y tareas. La
        usa la confirmación del panel, y la usará "Mis reservas" (#16)."""
        return {
            **self.serialize(),
            "hours": self.hours,
            "service": {
                "name": self.service.name,
                "slug": self.service.slug,
            },
            "address": self.address.serialize(),
            "days": [day.serialize() for day in self.days],
            "tasks": [task.serialize() for task in self.tasks],
        }


# ==================================================================
# BOOKING DAY
# ==================================================================
# Los tramos de trabajo de una reserva: uno por día, de 8 h como mucho
# (3 h = un tramo; 12 h = dos). La disponibilidad mira estos tramos y no
# el inicio y fin de la reserva: entre dos puede caer un fin de semana.

class BookingDay(db.Model):
    __tablename__ = "booking_days"

    booking_day_id: Mapped[int] = mapped_column(
        primary_key=True
    )
    booking_id: Mapped[int] = mapped_column(
        ForeignKey("bookings.booking_id"),
        nullable=False,
        index=True
    )
    # Hora de Madrid sin zona. starts_at/ends_at y no start/end: END es
    # palabra reservada de SQL.
    starts_at: Mapped[datetime] = mapped_column(
        DateTime,
        nullable=False
    )
    ends_at: Mapped[datetime] = mapped_column(
        DateTime,
        nullable=False
    )

    def serialize(self):
        return {
            "booking_day_id": self.booking_day_id,
            "starts_at": self.starts_at.isoformat(),
            "ends_at": self.ends_at.isoformat(),
        }


# ==================================================================
# BOOKING TASK
# ==================================================================

class BookingTask(db.Model):
    """Tarea dentro de una reserva. Cada repetición es una fila (tres
    habitaciones = tres filas con el mismo task_id), con su propio estado."""

    __tablename__ = "booking_tasks"

    booking_task_id: Mapped[int] = mapped_column(
        primary_key=True
    )
    booking_id: Mapped[int] = mapped_column(
        ForeignKey("bookings.booking_id"),
        nullable=False
    )
    task_id: Mapped[int] = mapped_column(
        ForeignKey("tasks.task_id"),
        nullable=False
    )

    # Congelado al reservar: si se renombra la tarea, la reserva conserva
    # el nombre con el que se contrató.
    task_name: Mapped[str] = mapped_column(
        String(100),
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
            "task_id": self.task_id,
            "task_name": self.task_name,
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


# ==================================================================
# REVIEW
# ==================================================================
# Valoración del cliente: como mucho una por reserva (booking_id único).

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


# ==================================================================
# INCIDENT
# ==================================================================
# Incidencia en una reserva; puede señalar al trabajador y a la tarea.

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


# ==================================================================
# MEDIA
# ==================================================================
# Foto o vídeo adjunto a una incidencia.

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

# Ausencias por días completos de Madrid; ambos extremos son inclusivos.


class Absence(db.Model):
    __tablename__ = "absences"
    __table_args__ = (
        db.CheckConstraint(
            "ends_on IS NULL OR ends_on >= starts_on", name="ck_absence_dates"),
        db.CheckConstraint(
            "reason IN ('vacaciones', 'baja', 'otro')", name="ck_absence_reason"),
    )

    absence_id: Mapped[int] = mapped_column(primary_key=True)
    worker_id: Mapped[int] = mapped_column(
        ForeignKey("workers.worker_id"), nullable=False, index=True
    )
    starts_on: Mapped[date] = mapped_column(Date, nullable=False)
    ends_on: Mapped[date | None] = mapped_column(Date, nullable=True)
    reason: Mapped[str] = mapped_column(String(20), nullable=False)
    notes: Mapped[str | None] = mapped_column(Text, nullable=True)

    # Una carga por grupo de trabajadores, no una consulta por hueco.
    worker = db.relationship(
        "Worker", backref=db.backref("absences", lazy="selectin")
    )

    def serialize(self):
        return {
            "absence_id": self.absence_id,
            "worker_id": self.worker_id,
            "starts_on": self.starts_on.isoformat(),
            "ends_on": self.ends_on.isoformat() if self.ends_on else None,
            "reason": self.reason,
            "notes": self.notes,
        }
