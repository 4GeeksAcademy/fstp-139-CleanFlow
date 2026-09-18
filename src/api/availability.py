"""
DISPONIBILIDAD: cuándo se puede reservar a cada trabajador (#69).

Casi todo es cálculo: las funciones reciben los datos ya cargados y
devuelven un resultado, sin consultar la base de datos ni saber nada de
Flask. Así se pueden probar sueltas desde `flask shell`. La única que
consulta es load_busy(), y lo hace una sola vez por petición.

La regla, en corto: un trabajador está libre para una reserva si cada uno
de sus tramos cae en un día laborable suyo, cabe entero dentro de su turno
y no choca con sus otras reservas (contando 30 minutos de margen).

Las reservas se guardan en hora de Madrid sin zona, así que aquí todas las
fechas son de ese tipo: nunca se mezclan con fechas con zona.
"""

from collections import defaultdict
from datetime import datetime, time, timedelta
from zoneinfo import ZoneInfo

from api.models import db, Booking, BookingDay, BookingStatus


# Una reserva larga se reparte en tramos de, como mucho, esta duración:
# 12 h son dos días de 6 h. Es la jornada máxima de un trabajador.
MAX_HOURS_PER_DAY = 6

# Hueco entre dos reservas del mismo trabajador, para ir de una casa a otra.
TRAVEL_MARGIN = timedelta(minutes=30)

# Hasta dónde se buscan días laborables para los tramos de una reserva.
# Sin tope, un trabajador de baja indefinida haría buscar para siempre.
SEARCH_LIMIT_DAYS = 60

# La ventana de reserva: como pronto 24 h después de ahora, y como mucho a
# 60 días vista. La #14 comprueba lo mismo al guardar, con estos valores.
MIN_NOTICE = timedelta(hours=24)
BOOKING_HORIZON = timedelta(days=60)

# Las horas de inicio que se ofrecen van de media en media hora.
SLOT_STEP = timedelta(minutes=30)

MADRID = ZoneInfo("Europe/Madrid")


def madrid_now():
    """Ahora, en hora de Madrid y sin zona: el mismo tipo que las reservas."""
    return datetime.now(MADRID).replace(tzinfo=None)

def split_into_days(hours):
    """Reparte las horas en tramos de un día: 9 -> [6, 3] · 12 -> [6, 6]."""
    full_days, rest = divmod(hours, MAX_HOURS_PER_DAY)
    return [MAX_HOURS_PER_DAY] * full_days + ([rest] if rest else [])


def can_work(worker):
    """Si se le puede reservar a alguien, sea el día que sea: trabajador y
    usuario activos, y con un turno que también lo esté."""
    return bool(
        worker.is_active
        and worker.user is not None
        and worker.user.is_active
        and worker.shift is not None
        and worker.shift.is_active
    )


def worker_unavailable_days(worker, first_day, last_day):
    """Días entre first_day y last_day (incluidos) en los que el trabajador
    no puede trabajar aunque sean de su turno.

    Hoy no hay ninguno: devuelve un conjunto vacío. La #15 la rellenará con
    las vacaciones y las bajas, y el resto del cálculo no tendrá que cambiar.
    """
    return set()


def working_days(worker, first_day, count):
    """Los `count` primeros días laborables del trabajador a partir de
    first_day (incluido). Un día es laborable si es de su turno y no está
    en worker_unavailable_days(). Si no se encuentran a tiempo, None.
    """
    last_day = first_day + timedelta(days=SEARCH_LIMIT_DAYS)
    unavailable = worker_unavailable_days(worker, first_day, last_day)
    shift_days = worker.shift.days

    found = []
    day = first_day

    while day <= last_day and len(found) < count:
        if day.isoweekday() in shift_days and day not in unavailable:
            found.append(day)
        day += timedelta(days=1)

    return found if len(found) == count else None


def booking_intervals(worker, start, hours):
    """Los tramos (inicio, fin) de una reserva de `hours` horas que empieza
    en `start`, o None si no encaja en el turno del trabajador.

    Todos los tramos empiezan a la misma hora, y el primero tiene que caer
    justo el día de `start`: si ese día no trabaja, no hay reserva.
    """
    if not can_work(worker):
        return None

    chunks = split_into_days(hours)
    days = working_days(worker, start.date(), len(chunks))

    if days is None or days[0] != start.date():
        return None

    shift = worker.shift
    intervals = []

    for day, chunk in zip(days, chunks):
        begins = datetime.combine(day, start.time())
        ends = begins + timedelta(hours=chunk)

        # Tiene que caber entero dentro del turno de ese día.
        if begins < datetime.combine(day, shift.start_time) or ends > datetime.combine(day, shift.end_time):
            return None

        intervals.append((begins, ends))

    return intervals


def is_free(intervals, busy):
    """Si ninguno de los tramos choca con las reservas que ya tiene el
    trabajador (`busy`, una lista de tramos (inicio, fin)).

    El margen se suma por los dos lados: entre el fin de una reserva y el
    inicio de la siguiente tiene que haber, al menos, TRAVEL_MARGIN.
    """
    for begins, ends in intervals:
        for busy_begins, busy_ends in busy:
            if begins < busy_ends + TRAVEL_MARGIN and busy_begins < ends + TRAVEL_MARGIN:
                return False

    return True



# ----------------------------------------------------------------------
# JUNTAR LAS PIEZAS
# ----------------------------------------------------------------------

def load_busy(workers, first_day, last_day):
    """Los tramos ya reservados de estos trabajadores entre first_day y
    last_day, agrupados por trabajador: {worker_id: [(inicio, fin), ...]}.

    UNA sola consulta para todos. Hacer una por franja serían cientos por
    petición. Las canceladas no cuentan: su hueco vuelve a estar libre.
    """
    worker_ids = [worker.worker_id for worker in workers]
    busy = defaultdict(list)

    if not worker_ids:
        return busy

    # El margen amplía la ventana: un tramo que acaba justo antes de
    # first_day todavía puede estorbar a uno que empiece a primera hora.
    window_start = datetime.combine(first_day, time.min) - TRAVEL_MARGIN
    window_end = datetime.combine(last_day, time.max) + TRAVEL_MARGIN

    rows = db.session.execute(
        db.select(Booking.worker_id, BookingDay.starts_at, BookingDay.ends_at)
        .join(BookingDay, BookingDay.booking_id == Booking.booking_id)
        .where(
            Booking.worker_id.in_(worker_ids),
            Booking.status != BookingStatus.CANCELLED,
            BookingDay.starts_at < window_end,
            BookingDay.ends_at > window_start,
        )
    ).all()

    for worker_id, starts_at, ends_at in rows:
        busy[worker_id].append((starts_at, ends_at))

    return busy


def candidate_starts(worker, day):
    """Las horas de inicio posibles de un trabajador un día concreto: de
    media en media hora, desde que empieza su turno hasta que termina.
    booking_intervals() ya descarta las que no caben."""
    current = datetime.combine(day, worker.shift.start_time)
    shift_end = datetime.combine(day, worker.shift.end_time)

    while current < shift_end:
        yield current
        current += SLOT_STEP


def month_availability(workers, hours, month_first_day, now, busy):
    """Los huecos de un mes: {día: [{"start": "09:00", "options": [...]}]}.

    Cada opción es un trabajador libre a esa hora y los días que ocuparía:
    {"worker_id": 3, "days": [lunes, martes]}. Con "Cualquiera", la lista
    `workers` trae a todos; con uno concreto, solo a ese.

    Solo salen los días con algún hueco, dentro de la ventana de reserva.
    `now` llega de fuera (madrid_now()) para poder probarlo con cualquier fecha.
    """
    earliest = now + MIN_NOTICE
    latest = now + BOOKING_HORIZON

    # Primer día del mes siguiente: el mes termina justo antes.
    next_month = (month_first_day.replace(day=28) + timedelta(days=4)).replace(day=1)

    days = {}
    day = month_first_day

    while day < next_month:
        slots = defaultdict(list)

        for worker in workers:
            if not can_work(worker) or day.isoweekday() not in worker.shift.days:
                continue

            for start in candidate_starts(worker, day):
                if start < earliest or start > latest:
                    continue

                intervals = booking_intervals(worker, start, hours)

                if intervals and is_free(intervals, busy.get(worker.worker_id, [])):
                    slots[start].append({
                        "worker_id": worker.worker_id,
                        "days": [begins.date() for begins, _ in intervals],
                    })

        if slots:
            days[day] = [
                {"start": start.strftime("%H:%M"), "options": slots[start]}
                for start in sorted(slots)
            ]

        day += timedelta(days=1)

    return days


def booked_hours_on(busy_intervals, day):
    """Horas que un trabajador ya tiene reservadas un día concreto."""
    total = timedelta()
    for begins, ends in busy_intervals:
        if begins.date() == day:
            total += ends - begins
    return total


def pick_worker(candidates, busy, day):
    """Para "Cualquiera": de los trabajadores libres, el que menos horas
    tenga ya reservadas ese día, para repartir el trabajo. Si empatan, el
    de id más bajo, para que la elección no sea al azar."""
    return min(
        candidates,
        key=lambda worker: (booked_hours_on(busy.get(worker.worker_id, []), day), worker.worker_id),
    )