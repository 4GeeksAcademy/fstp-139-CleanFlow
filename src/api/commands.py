"""
Comandos de terminal del backend: corren fuera de la API, con acceso a la BD.

    pipenv run insert-test-data    catálogo, personas y reservas de prueba

Se puede repetir sin miedo: lo que ya existe no se duplica ni se modifica.

⚠️ SOLO PARA DESARROLLO: todas las cuentas usan la contraseña de
TEST_PASSWORD. Este comando no se ejecuta nunca en producción.
"""

from datetime import datetime, time, timedelta
from zoneinfo import ZoneInfo

from api.models import (
    db, Service, Task, User, Shift, Worker, Address,
    Booking, BookingDay, BookingTask, BookingStatus, BookingTaskStatus,
)
from api.utils import slugify


# ------------------------------------------------------------------
# CATÁLOGO DE PRUEBA
# ------------------------------------------------------------------
# Las tareas y servicios del negocio (#11), más una tarea y un servicio
# desactivados a propósito: sirven para probar las pestañas "Desactivadas"
# del panel y que las rutas públicas (#36) no enseñan lo inactivo.
# Los precios de la web salen de aquí hasta que el encargado los cambie.

# En singular: tres habitaciones son tres veces "Limpiar habitación".
TASKS = [
    {"task_name": "Limpiar habitación",     "description": "Polvo, superficies y suelo de un dormitorio.",   "is_active": True},
    {"task_name": "Limpiar baño",           "description": "Sanitarios, azulejos, espejo y suelo.",           "is_active": True},
    {"task_name": "Limpiar cocina",         "description": "Encimera, fregadero, frentes y suelo.",           "is_active": True},
    {"task_name": "Limpiar cristales",      "description": "Ventanas y cristaleras, por dentro y por fuera.", "is_active": True},
    {"task_name": "Limpiar garaje privado", "description": "Barrido y fregado de un garaje particular.",      "is_active": True},
    {"task_name": "Limpiar trastero",       "description": "Polvo, estanterías y suelo de un trastero.",      "is_active": True},
    {"task_name": "Limpiar balcón",         "description": "Suelo, barandilla y cristal de un balcón.",       "is_active": True},
    {"task_name": "Limpiar terraza",        "description": "Suelo, barandillas y mobiliario de exterior.",    "is_active": True},
    {"task_name": "Limpiar barbacoa",       "description": "Parrilla y superficies de una barbacoa.",         "is_active": True},
    {"task_name": "Limpiar armario",        "description": "Interior y exterior de un armario.",              "is_active": True},
    {"task_name": "Hacer plancha",          "description": "Planchado de ropa.",                              "is_active": True},

    # DESACTIVADA A PROPÓSITO: no debe salir en las rutas públicas (#36).
    {"task_name": "Limpiar piscina",        "description": "Vaso, bordes y zona de baño de una piscina.",    "is_active": False},
]

# Sin slug: se genera con slugify(), igual que en el endpoint de crear servicio.
SERVICES = [
    {
        "name": "Limpieza esencial",
        "description": "El mantenimiento para tener la casa al día.",
        "base_hourly_rate": 30,
        "minutes_per_task": 20,     # 3 tareas por hora
        "min_hours": 1,
        "hour_step": 1,
        "is_active": True,
    },
    {
        "name": "Limpieza integral",
        "description": "La limpieza completa de tu casa, de arriba abajo.",
        "base_hourly_rate": 40,
        "minutes_per_task": 30,     # 2 tareas por hora
        "min_hours": 1,
        "hour_step": 1,
        "is_active": True,
    },
    {
        "name": "Limpieza profunda",
        "description": "Para cuando hace falta llegar donde no se llega a diario.",
        "base_hourly_rate": 60,
        "minutes_per_task": 60,     # 1 tarea por hora
        "min_hours": 1,
        "hour_step": 1,
        "is_active": True,
    },
    {
        "name": "Limpieza fin de obra",
        "description": "Retirada de polvo y restos tras una reforma.",
        "base_hourly_rate": 90,
        "minutes_per_task": None,   # sin tareas: se contratan horas
        "min_hours": 6,             # 6, 9, 12, 15...
        "hour_step": 3,
        "is_active": True,
    },

    # DESACTIVADO A PROPÓSITO: fuera de la web (#36), visible para el encargado.
    {
        "name": "Limpieza de oficinas",
        "description": "Mantenimiento de oficinas y locales pequeños.",
        "base_hourly_rate": 35,
        "minutes_per_task": 30,     # 2 tareas por hora
        "min_hours": 2,
        "hour_step": 1,
        "is_active": False,
    },
]


# ------------------------------------------------------------------
# PERSONAS DE PRUEBA
# ------------------------------------------------------------------
# Para poder entrar en la aplicación después de cada reset_db, sin
# registrarse a mano. Todas con la misma contraseña.

TEST_PASSWORD = "cleanflow123"

# Días de lunes (1) a domingo (7), como Shift.days.
SHIFTS = [
    {"name": "Mañana", "start_time": time(8, 0),  "end_time": time(14, 0), "days": [1, 2, 3, 4, 5, 6]},
    {"name": "Tarde",  "start_time": time(14, 0), "end_time": time(20, 0), "days": [1, 2, 3, 4, 5]},
]

# Tres trabajadores de mañana y uno de tarde: con tres a la vez, la
# mañana se puede llenar entera (ver RESERVAS DE PRUEBA).
PEOPLE = [
    {"email": "encargado@cleanflow.test", "name": "Elena",  "last_name": "Soto",   "phone": "600000001", "role": "manager"},
    {"email": "cliente@cleanflow.test",   "name": "Pablo",  "last_name": "Vega",   "phone": "600000002", "role": "client"},
    {"email": "ana@cleanflow.test",       "name": "Ana",    "last_name": "García", "phone": "600000003", "role": "worker", "shift": "Mañana"},
    {"email": "luis@cleanflow.test",      "name": "Luis",   "last_name": "Martín", "phone": "600000004", "role": "worker", "shift": "Mañana"},
    {"email": "marta@cleanflow.test",     "name": "Marta",  "last_name": "Ruiz",   "phone": "600000005", "role": "worker", "shift": "Mañana"},
    {"email": "carlos@cleanflow.test",    "name": "Carlos", "last_name": "Díaz",   "phone": "600000006", "role": "worker", "shift": "Tarde"},
]


# ------------------------------------------------------------------
# RESERVAS DE PRUEBA
# ------------------------------------------------------------------
# Tres escenarios para comprobar la disponibilidad (#69) a mano. Las
# fechas se calculan a partir del día en que se ejecuta el comando, así
# siempre caen dentro de la ventana de reserva (de 24 h a 60 días).
#
#   DÍA LLENO     un miércoles con la mañana entera ocupada: Ana, Luis y
#                 Marta de 08:00 a 14:00. Ese día no hay huecos de mañana.
#   MARGEN        el jueves siguiente, Ana de 08:00 a 11:00. Con los 30
#                 minutos de margen no puede empezar otra a las 11:00,
#                 pero sí a las 11:30.
#   VARIOS DÍAS   el viernes siguiente, Carlos (tarde, de lunes a viernes)
#                 12 horas: viernes y LUNES, saltándose el fin de semana.
#
# La #15 usará estas mismas reservas para probar las reservas afectadas.

# Las reservas se guardan en hora de Madrid, sin zona (ver Booking).
MADRID = ZoneInfo("Europe/Madrid")

# Marca en client_notes: así el comando reconoce sus reservas y no las repite.
SEED_MARK = "[datos de prueba]"


# ------------------------------------------------------------------
# AYUDANTES
# ------------------------------------------------------------------

# Para imprimir los días en español sin depender del idioma del sistema.
WEEKDAYS = ["lun", "mar", "mié", "jue", "vie", "sáb", "dom"]


def next_weekday(start, weekday):
    """El primer día desde `start` (incluido) que cae en `weekday` (1-7)."""
    return start + timedelta(days=(weekday - start.isoweekday()) % 7)


def at(day, hour):
    """Un día a una hora en punto: at(miércoles, 8) -> miércoles 08:00."""
    return datetime.combine(day, time(hour, 0))


def user_by_email(email):
    return db.session.execute(
        db.select(User).filter_by(email=email)
    ).scalar_one_or_none()


def worker_by_email(email):
    return db.session.execute(
        db.select(Worker).join(User, Worker.user_id == User.user_id).where(User.email == email)
    ).scalar_one()


def service_by_slug(slug):
    return db.session.execute(
        db.select(Service).filter_by(slug=slug)
    ).scalar_one()


def add_booking(client, address, service, worker, days, note, tasks=()):
    """Una reserva confirmada con sus tramos. `days` es una lista de
    (inicio, fin); `tasks`, las tareas con sus repeticiones."""
    hours = sum((end - start).seconds // 3600 for start, end in days)

    booking = Booking(
        client_id=client.user_id,
        service_id=service.service_id,
        address_id=address.address_id,
        worker_id=worker.worker_id,
        scheduled_start=days[0][0],
        scheduled_end=days[-1][1],
        hourly_rate=service.base_hourly_rate,
        minutes_per_task=service.minutes_per_task,
        total_price=hours * service.base_hourly_rate,
        status=BookingStatus.CONFIRMED,
        client_notes=f"{SEED_MARK} {note}",
        created_at=datetime.now(MADRID).replace(tzinfo=None),
    )

    # Los tramos se guardan con la reserva gracias a la relación.
    for start, end in days:
        booking.days.append(BookingDay(starts_at=start, ends_at=end))

    db.session.add(booking)

    # flush: la reserva necesita su id antes de colgarle las tareas.
    db.session.flush()

    for task in tasks:
        db.session.add(BookingTask(
            booking_id=booking.booking_id,
            task_id=task.task_id,
            task_name=task.task_name,
            status=BookingTaskStatus.PENDING,
        ))


# ------------------------------------------------------------------
# LOS TRES BLOQUES
# ------------------------------------------------------------------

def create_catalog():
    """Tareas y servicios. Devuelve cuántos de cada uno se crearon."""
    created_tasks = 0

    for data in TASKS:
        # Si ya existe no se toca: así no se pierden los cambios hechos
        # a mano desde el panel al repetir el comando.
        exists = db.session.execute(
            db.select(Task).where(Task.task_name == data["task_name"])
        ).scalar_one_or_none()

        if exists:
            continue

        db.session.add(Task(**data))
        created_tasks += 1

    created_services = 0

    for data in SERVICES:
        # Mismo criterio que con las tareas, buscando por slug.
        slug = slugify(data["name"])

        exists = db.session.execute(
            db.select(Service).where(Service.slug == slug)
        ).scalar_one_or_none()

        if exists:
            continue

        db.session.add(Service(slug=slug, **data))
        created_services += 1

    # flush: las reservas de más abajo necesitan los ids del catálogo.
    db.session.flush()

    return created_tasks, created_services


def create_people():
    """Turnos, usuarios, trabajadores y la dirección del cliente."""
    shifts = {}
    created_shifts = 0

    for data in SHIFTS:
        shift = db.session.execute(
            db.select(Shift).filter_by(name=data["name"])
        ).scalar_one_or_none()

        if not shift:
            shift = Shift(name=data["name"], start_time=data["start_time"], end_time=data["end_time"])
            shift.days = data["days"]
            db.session.add(shift)
            created_shifts += 1

        shifts[data["name"]] = shift

    # flush: los trabajadores necesitan el id de su turno.
    db.session.flush()

    created_people = 0

    for data in PEOPLE:
        if user_by_email(data["email"]):
            continue

        user = User(
            email=data["email"],
            name=data["name"],
            last_name=data["last_name"],
            phone=data["phone"],
            role=data["role"],
            is_active=True,
        )
        user.set_password(TEST_PASSWORD)
        db.session.add(user)

        # flush: la ficha de trabajador y la dirección necesitan el user_id.
        db.session.flush()

        if data["role"] == "worker":
            db.session.add(Worker(user_id=user.user_id, shift_id=shifts[data["shift"]].shift_id))

        if data["role"] == "client":
            db.session.add(Address(
                client_id=user.user_id,
                street="Calle de Alcalá",
                number="42",
                postal_code="28014",
                city="Madrid",
                is_default=True,
            ))

        created_people += 1

    db.session.flush()

    return created_shifts, created_people


def create_bookings():
    """Las reservas de los tres escenarios. Devuelve cuántas se crearon.

    Van todas o ninguna: si ya hay alguna con la marca, no se crea nada.
    Las fechas quedan fijas desde que se crean; para moverlas a partir
    de hoy, hay que rehacer la base de datos.
    """
    exists = db.session.execute(
        db.select(Booking).where(Booking.client_notes.startswith(SEED_MARK))
    ).scalars().first()

    if exists:
        return 0

    client = user_by_email("cliente@cleanflow.test")
    address = db.session.execute(
        db.select(Address).filter_by(client_id=client.user_id, is_active=True)
    ).scalars().first()

    fin_de_obra = service_by_slug("limpieza-fin-de-obra")
    profunda = service_by_slug("limpieza-profunda")
    habitacion = db.session.execute(
        db.select(Task).filter_by(task_name="Limpiar habitación")
    ).scalar_one()

    # Al menos tres días por delante: fuera de las 24 h de antelación.
    today = datetime.now(MADRID).date()
    full_day = next_weekday(today + timedelta(days=3), 3)    # miércoles
    margin_day = full_day + timedelta(days=1)                # jueves
    long_start = full_day + timedelta(days=2)                # viernes
    long_second = long_start + timedelta(days=3)             # lunes

    # ---- DÍA LLENO ----
    for email in ("ana@cleanflow.test", "luis@cleanflow.test", "marta@cleanflow.test"):
        add_booking(
            client, address, fin_de_obra, worker_by_email(email),
            [(at(full_day, 8), at(full_day, 14))],
            "Día lleno: la mañana entera ocupada.",
        )

    # ---- MARGEN ----
    # Profunda: 60 minutos por tarea, así que 3 habitaciones = 3 horas.
    add_booking(
        client, address, profunda, worker_by_email("ana@cleanflow.test"),
        [(at(margin_day, 8), at(margin_day, 11))],
        "Margen: acaba a las 11:00.",
        tasks=[habitacion] * 3,
    )

    # ---- VARIOS DÍAS ----
    add_booking(
        client, address, fin_de_obra, worker_by_email("carlos@cleanflow.test"),
        [(at(long_start, 14), at(long_start, 20)), (at(long_second, 14), at(long_second, 20))],
        "Varios días: viernes y lunes.",
    )

    return 5


def print_seed_bookings():
    """Las reservas de prueba con sus fechas: son las que hay que usar al
    probar la disponibilidad con Postman."""
    bookings = db.session.execute(
        db.select(Booking)
        .where(Booking.client_notes.startswith(SEED_MARK))
        .order_by(Booking.scheduled_start, Booking.worker_id)
    ).scalars().all()

    for booking in bookings:
        tramos = " + ".join(
            f"{WEEKDAYS[day.starts_at.weekday()]} {day.starts_at:%d/%m %H:%M}-{day.ends_at:%H:%M}"
            for day in booking.days
        )
        worker = booking.worker.user.name
        note = booking.client_notes.removeprefix(SEED_MARK).strip()
        print(f"  {worker:<7} {tramos:<40} {note}")


# ------------------------------------------------------------------
# EL COMANDO
# ------------------------------------------------------------------

def setup_commands(app):

    @app.cli.command("insert-test-data")
    def insert_test_data():
        """Crea el catálogo, las personas y las reservas de prueba."""

        created_tasks, created_services = create_catalog()
        created_shifts, created_people = create_people()
        created_bookings = create_bookings()

        # Un solo commit al final: o entra todo, o nada.
        db.session.commit()

        print(f"Tareas:    {created_tasks} creadas, {len(TASKS) - created_tasks} ya existían")
        print(f"Servicios: {created_services} creados, {len(SERVICES) - created_services} ya existían")
        print(f"Turnos:    {created_shifts} creados, {len(SHIFTS) - created_shifts} ya existían")
        print(f"Personas:  {created_people} creadas, {len(PEOPLE) - created_people} ya existían")
        print(f"Reservas:  {created_bookings} creadas")
        print()
        print(f"Cuentas (contraseña: {TEST_PASSWORD}):")
        for person in PEOPLE:
            print(f"  {person['role']:<8} {person['email']}")
        print()
        print("Reservas de prueba:")
        print_seed_bookings()