from datetime import time, datetime
from flask_sqlalchemy import SQLAlchemy
from sqlalchemy import String, Boolean, Text, Float, Integer, Time, DateTime, ForeignKey, func
from sqlalchemy import Enum as SQLEnum
from sqlalchemy.orm import Mapped, mapped_column
from enum import Enum
from flask_bcrypt import generate_password_hash, check_password_hash

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
# USERS
# ============================================================


class User(db.Model):
    """Usuario de la aplicación.

    Un único modelo para los tres tipos de usuario: lo que distingue a un
    cliente de un trabajador o un encargado es solo el campo `role`.
    """

    # Sin esto SQLAlchemy llamaría a la tabla "user", en singular, y las
    # claves foráneas que apuntan a "users" no la encontrarían.
    __tablename__ = "users"

    # ------------------------------------------------------------------
    # COLUMNAS
    # ------------------------------------------------------------------

    user_id: Mapped[int] = mapped_column(primary_key=True)
    name: Mapped[str] = mapped_column(String(100), nullable=False)
    last_name: Mapped[str] = mapped_column(String(150), nullable=False)
    phone: Mapped[str] = mapped_column(String(20), nullable=False)
    email: Mapped[str] = mapped_column(String(120), unique=True, nullable=False)

    # Guarda el HASH de la contraseña, nunca la contraseña. Ver más abajo.
    password_hash: Mapped[str] = mapped_column(nullable=False)

    # Enum: la BD solo acepta estos tres valores. Un rol inventado no entra
    # ni por el admin ni por código. El `name` es la etiqueta que PostgreSQL
    # le pone internamente al tipo, y es obligatorio.
    role: Mapped[str] = mapped_column(
        SQLEnum("client", "worker", "manager", name="user_role"),
        nullable=False
    )

    # Permite desactivar una cuenta sin borrarla (se conserva su historial).
    is_active: Mapped[bool] = mapped_column(Boolean(), nullable=False)
    avatar_url: Mapped[str | None] = mapped_column(String(255), nullable=True)

    # server_default: la fecha la pone la BASE DE DATOS al insertar, no
    # Python. Así todos los registros usan el mismo reloj.
    created_at: Mapped[DateTime] = mapped_column(
        DateTime(),
        nullable=False,
        server_default=func.now()
    )

    # ------------------------------------------------------------------
    # CONTRASEÑA
    #
    # La contraseña en claro no se guarda en ningún sitio. Se guarda su
    # hash: un resultado del que no se puede volver atrás. Por eso al
    # iniciar sesión no se compara "la contraseña", se vuelve a calcular
    # el hash y se comparan los dos hashes.
    # ------------------------------------------------------------------

    def set_password(self, password):
        """Hashea la contraseña y la guarda. Único sitio donde se escribe
        `password_hash`: todo alta de usuario debe pasar por aquí."""
        # bcrypt devuelve bytes; .decode() lo pasa a texto para la columna.
        self.password_hash = generate_password_hash(password).decode('utf-8')

    def check_password(self, password):
        """Devuelve True si la contraseña recibida coincide con el hash."""
        try:
            return check_password_hash(self.password_hash, password)
        except ValueError:
            # El hash guardado no es un hash válido de bcrypt (pasa con los
            # usuarios creados desde el panel de admin, que escribe el campo
            # tal cual). Sin este except, bcrypt lanzaría y el login
            # respondería 500 en vez de un 401 normal.
            return False

    # ------------------------------------------------------------------
    # SERIALIZADORES
    #
    # Un modelo no tiene una única representación en JSON, sino una por
    # cada uso. Por eso hay dos métodos y no uno con condicionales.
    # ------------------------------------------------------------------

    def serialize(self):
        """Vista completa. Para pantallas de gestión (listados de admin,
        ficha de un trabajador...)."""
        return {
            "user_id": self.user_id,
            "name": self.name,
            "last_name": self.last_name,
            "phone": self.phone,
            "email": self.email,
            "role": self.role,
            "is_active": self.is_active,
            "avatar_url": self.avatar_url,
            # isoformat() convierte la fecha a texto, porque JSON no
            # entiende de fechas. El `if` evita reventar si aún no existe.
            "created_at": self.created_at.isoformat() if self.created_at else None
        }

    def serialize_session(self):
        """Vista mínima para la sesión del frontend: solo lo justo para
        decidir rutas y pintar el sidebar.

        Es lo que devuelven /api/login y /api/profile, y lo que acaba
        guardado en localStorage — de ahí que vaya lo imprescindible.
        """
        return {
            "user_id": self.user_id,
            "name": self.name,
            "email": self.email,
            "role": self.role,
            "avatar_url": self.avatar_url
        }


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
    """Un tipo de limpieza: esencial, integral, profunda, fin de obra...

    Se contrata por horas. Lo que lo une al catálogo de tareas es
    `minutes_per_task`: cuánto dura UNA tarea en este servicio. La misma
    tarea dura distinto según el servicio, por eso el dato vive aquí y
    no en la tarea.
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

    # La URL pública: "Limpieza integral" -> "limpieza-integral". Se genera
    # con slugify() al crear y NO se regenera al renombrar, para no romper
    # los enlaces que ya circulen.
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

    # Texto largo de la ficha. Opcional: sin él, la web usa `description`.
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

    # Minutos que dura una tarea en este servicio: 20, 30, 60...
    # NULL significa, y solo significa, que el servicio NO lleva tareas
    # (fin de obra). No hay otro campo que diga lo mismo, así que no
    # pueden contradecirse. Si tiene valor, debe dividir 60: lo valida
    # la API.
    minutes_per_task: Mapped[int | None] = mapped_column(
        Integer,
        nullable=True
    )

    # Horas contratables: mínimo, de cuánto en cuánto sube, y tope.
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
        """Cuántas tareas caben en una hora, o None si no lleva tareas.

        Se calcula aquí y viaja en el JSON para que ningún frontend tenga
        que repetir la cuenta: 30 minutos -> 2 tareas por hora.
        """
        if self.minutes_per_task is None:
            return None
        return 60 // self.minutes_per_task

    # ------------------------------------------------------------------
    # SERIALIZADORES
    #
    # Dos vistas, igual que en User: la de gestión lo enseña todo; la
    # pública, solo lo que puede ver cualquiera.
    # ------------------------------------------------------------------

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
        """Vista para la web y el cliente. Sin `is_active` ni el id: la web
        solo recibe servicios activos, y los identifica por su slug."""
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


# ============================================================
# TASK
# ============================================================

class Task(db.Model):
    """Una tarea del catálogo: limpiar cristales, hacer plancha...

    El catálogo es COMPARTIDO: la misma tarea vale para cualquier
    servicio que lleve tareas. Por eso no guarda minutos: cuánto dura
    depende del servicio (ver Service.minutes_per_task).
    """

    __tablename__ = "tasks"

    task_id: Mapped[int] = mapped_column(
        primary_key=True
    )

    # Único en la BD. Que tampoco se repita cambiando solo mayúsculas
    # ("Limpiar cristales" / "limpiar cristales") lo comprueba la API.
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

    def serialize(self):
        return {
            "task_id": self.task_id,
            "task_name": self.task_name,
            "description": self.description,
            "is_active": self.is_active,
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

    # ---- CONGELADOS AL RESERVAR ----
    # Copias de cómo estaba el servicio en el momento de contratar. Si el
    # encargado cambia el precio o los minutos mañana, esta reserva no se
    # entera: el histórico no se reescribe.
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
            "minutes_per_task": self.minutes_per_task,
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
    """Una tarea dentro de una reserva.

    Las repeticiones son filas distintas: tres habitaciones son tres
    filas con el mismo task_id. Así el trabajador marca cada una por
    separado, con su propio estado.
    """

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

    # Congelado al reservar: si el encargado renombra la tarea, esta
    # reserva conserva el nombre que tenía cuando se contrató.
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
    # PROVISIONAL: apunta a users porque la tabla workers todavía no
    # existe (la crea el PR #58). Cuando ese PR entre en develop, esta
    # línea vuelve a ForeignKey("workers.worker_id"): en el conflicto,
    # quedaos con la versión del PR #58.
    worker_id: Mapped[int | None] = mapped_column(
        ForeignKey("users.user_id"),
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