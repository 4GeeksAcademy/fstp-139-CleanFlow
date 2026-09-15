import { useState } from "react";
import { sendJobApplication } from "../../services/applicationService";

const INITIAL_FORM_DATA = {
  name: "",
  last_name: "",
  email: "",
  phone: "",
  experience: "",
  message: "",
  website: "",
};

export const WorkWithUs = () => {
  const [formData, setFormData] = useState(INITIAL_FORM_DATA);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [loading, setLoading] = useState(false);

  const emailIsValid = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email);

  const requiredFieldsAreComplete =
    formData.name.trim() &&
    formData.last_name.trim() &&
    formData.email.trim() &&
    formData.phone.trim() &&
    formData.experience.trim() &&
    formData.message.trim();

  const formIsValid = requiredFieldsAreComplete && emailIsValid;

  const handleChange = (event) => {
    const { name, value } = event.target;

    setFormData((currentFormData) => ({
      ...currentFormData,
      [name]: value,
    }));
  };

  const handleSubmit = async (event) => {
    event.preventDefault();

    if (loading) return;

    setError("");
    setSuccess("");

    if (!formIsValid) {
      setError("Completa todos los campos y revisa el correo electrónico.");
      return;
    }

    setLoading(true);

    try {
      const result = await sendJobApplication(formData);

      if (!result.ok) {
        setError(
          result.data?.error ||
            result.data?.message ||
            "No se pudo enviar la candidatura. Inténtalo de nuevo."
        );
        return;
      }

      setFormData(INITIAL_FORM_DATA);
      setSuccess(
        "Hemos recibido tus datos. Nos pondremos en contacto contigo en breve."
      );
    } catch (error) {
      console.error("Error inesperado al enviar la candidatura:", error);
      setError(
        "No se pudo completar la solicitud. Comprueba tu conexión e inténtalo de nuevo."
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="cf-work">
      <section className="cf-work__intro">
        <div className="cf-container">
          <p className="cf-work__eyebrow">Únete a nuestro equipo</p>
          <h1 className="cf-work__title">Trabaja con nosotros</h1>
          <p className="cf-work__description">
            Cuéntanos quién eres y cuál ha sido tu experiencia. Tendremos en
            cuenta tu candidatura cuando necesitemos incorporar nuevos
            profesionales.
          </p>
        </div>
      </section>

      <section className="cf-work__content">
        <div className="cf-container">
          <div className="cf-work__card">
            <div className="cf-work__information">
              <h2>Queremos conocerte</h2>

              <p>
                Buscamos personas responsables, cuidadosas y comprometidas con
                ofrecer un servicio de calidad.
              </p>

              <p>
                El envío de este formulario no crea una cuenta de trabajador.
                Si avanzas en el proceso de selección, CleanFlow te facilitará
                las credenciales para acceder al área de empleados.
              </p>
            </div>

            <form className="cf-work__form" onSubmit={handleSubmit} noValidate>
              {error && (
                <p className="cf-work__alert cf-work__alert--error" role="alert">
                  {error}
                </p>
              )}

              {success && (
                <p
                  className="cf-work__alert cf-work__alert--success"
                  role="status"
                >
                  {success}
                </p>
              )}

              <div className="cf-work__row">
                <div className="cf-work__field">
                  <label htmlFor="name">Nombre</label>
                  <input
                    id="name"
                    type="text"
                    name="name"
                    value={formData.name}
                    onChange={handleChange}
                    autoComplete="given-name"
                    required
                  />
                </div>

                <div className="cf-work__field">
                  <label htmlFor="last_name">Apellidos</label>
                  <input
                    id="last_name"
                    type="text"
                    name="last_name"
                    value={formData.last_name}
                    onChange={handleChange}
                    autoComplete="family-name"
                    required
                  />
                </div>
              </div>

              <div className="cf-work__row">
                <div className="cf-work__field">
                  <label htmlFor="email">Correo electrónico</label>
                  <input
                    id="email"
                    type="email"
                    name="email"
                    value={formData.email}
                    onChange={handleChange}
                    autoComplete="email"
                    required
                  />
                </div>

                <div className="cf-work__field">
                  <label htmlFor="phone">Teléfono</label>
                  <input
                    id="phone"
                    type="tel"
                    name="phone"
                    value={formData.phone}
                    onChange={handleChange}
                    autoComplete="tel"
                    required
                  />
                </div>
              </div>

              <div className="cf-work__field">
                <label htmlFor="experience">Experiencia</label>
                <textarea
                  id="experience"
                  name="experience"
                  value={formData.experience}
                  onChange={handleChange}
                  rows="4"
                  placeholder="Cuéntanos brevemente dónde has trabajado y qué funciones realizabas."
                  required
                />
              </div>

              <div className="cf-work__field">
                <label htmlFor="message">Mensaje</label>
                <textarea
                  id="message"
                  name="message"
                  value={formData.message}
                  onChange={handleChange}
                  rows="5"
                  placeholder="¿Por qué te gustaría trabajar con CleanFlow?"
                  required
                />
              </div>

              <div className="cf-work__honeypot sr-only" aria-hidden="true">
                <label htmlFor="website">Sitio web</label>
                <input
                  id="website"
                  type="text"
                  name="website"
                  value={formData.website}
                  onChange={handleChange}
                  tabIndex="-1"
                  autoComplete="off"
                />
              </div>

              <button
                className="cf-work__submit"
                type="submit"
                disabled={!formIsValid || loading}
              >
                {loading ? "Enviando candidatura..." : "Enviar candidatura"}
              </button>
            </form>
          </div>
        </div>
      </section>
    </main>
  );
};