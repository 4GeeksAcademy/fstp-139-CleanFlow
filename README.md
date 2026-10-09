# CleanFlow

CleanFlow es una aplicación web Full Stack diseñada para centralizar la gestión de una empresa de servicios de limpieza.

La plataforma conecta a clientes, trabajadores y encargados, facilitando la gestión de reservas, horarios, servicios, tareas y disponibilidad desde un mismo lugar.

## Aplicación publicada

[Ver CleanFlow en funcionamiento](https://sample-service-name-vf40.onrender.com/)

## Funcionalidades principales

### Clientes

- Registro e inicio de sesión.
- Consulta del catálogo de servicios.
- Visualización de los detalles de cada servicio.
- Creación y gestión de reservas.
- Consulta del estado y del historial de servicios.
- Cancelación y reprogramación de reservas.
- Publicación de reseñas.

### Trabajadores

- Consulta de los servicios asignados.
- Acceso a horarios y turnos.
- Visualización de los datos necesarios del cliente.
- Consulta de las tareas correspondientes a cada servicio.

### Encargados y administradores

- Gestión de clientes y trabajadores.
- Asignación de trabajadores a los servicios.
- Administración de reservas y horarios.
- Gestión de candidaturas laborales.
- Consulta de mensajes recibidos mediante los formularios públicos.
- Supervisión general de los servicios.

## Tecnologías utilizadas

### Front-End

- React
- JavaScript
- HTML5
- CSS3
- Bootstrap
- React Router
- Context API
- Vite

### Back-End

- Python
- Flask
- API REST
- JWT
- SQLAlchemy

### Base de datos y despliegue

- PostgreSQL
- Neon
- Render

### Herramientas de trabajo

- Git
- GitHub
- GitHub Projects
- Visual Studio Code
- Figma

## Arquitectura del proyecto

El proyecto está organizado con una arquitectura Full Stack:

- React para la interfaz de usuario.
- Flask para el desarrollo de la API REST.
- PostgreSQL para el almacenamiento de datos.
- JWT para la autenticación y autorización de usuarios.
- Diferentes paneles y permisos según el tipo de usuario.

## Instalación local

1. Clona el repositorio:

```bash
git clone https://github.com/4GeeksAcademy/fstp-139-CleanFlow.git
