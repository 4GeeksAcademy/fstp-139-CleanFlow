/**
 * Sección de contacto de la landing (WEB-09).
 *
 * Muestra los datos de contacto (data/company.js) y un formulario que
 * guarda el mensaje en base de datos (POST /api/contact-messages,
 * WEB-03). El encargado los consulta desde su panel (WEB-13): no se
 * envían por correo.
 *
 * El mapa no va aquí: lo lleva LocationSection (WEB-07), justo debajo.
 */

import { useState } from "react";
import { sendContactMessage } from "../../../services/contactService";
import { COMPANY } from "../../../data/company";

const INITIAL_FORM_DATA = {
    name: "",
    email: "",
    phone: "",
    subject: "",
    message: "",
    website: "",
};

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export const ContactSection = () => {
    const [formData, setFormData] = useState(INITIAL_FORM_DATA);
    const [error, setError] = useState("");
    const [success, setSuccess] = useState("");
    const [loading, setLoading] = useState(false);

    const emailIsValid = EMAIL_PATTERN.test(formData.email);

    const requiredFieldsAreComplete =
        formData.name.trim() &&
        formData.email.trim() &&
        formData.subject.trim() &&
        formData.message.trim();

    const formIsValid = requiredFieldsAreComplete && emailIsValid;

    const handleChange = (event) => {
        const { name, value } = event.target;

        setFormData((currentFormData) => ({
            ...currentFormData,
            [name]: value,
        }));

        setError("");
    };

    const handleSubmit = async (event) => {
        event.preventDefault();

        if (loading) return;

        setError("");
        setSuccess("");

        if (!formIsValid) {
            setError("Completa los campos obligatorios y revisa el correo electrónico.");
            return;
        }

        setLoading(true);

        try {
            const { ok, data } = await sendContactMessage(formData);

            if (!ok) {
                setError(
                    data?.message || "No se pudo enviar el mensaje. Inténtalo de nuevo."
                );
                return;
            }

            setFormData(INITIAL_FORM_DATA);
            setSuccess("Hemos recibido tu mensaje. Te responderemos lo antes posible.");
        } finally {
            setLoading(false);
        }
    };

    return (
        <section id="contact" className="cf-section cf-contact">
            <div className="cf-container">
                <p className="cf-section__label">Hablemos</p>
                <h2 className="cf-section__title">Contacta con nosotros</h2>
                <p className="cf-section__lede">
                    ¿Tienes alguna duda antes de contratar? Escríbenos y te
                    responderemos lo antes posible.
                </p>

                <div className="cf-contact__card">
                    <div className="cf-contact__information">
                        <div className="cf-contact__block">
                            <i className="fa-solid fa-phone" aria-hidden="true" />
                            <div>
                                <h3>Teléfono</h3>
                                <a href={`tel:${COMPANY.phoneLink}`}>{COMPANY.phone}</a>
                            </div>
                        </div>

                        <div className="cf-contact__block">
                            <i className="fa-solid fa-envelope" aria-hidden="true" />
                            <div>
                                <h3>Email</h3>
                                <a href={`mailto:${COMPANY.email}`}>{COMPANY.email}</a>
                            </div>
                        </div>

                        <div className="cf-contact__block">
                            <i className="fa-regular fa-clock" aria-hidden="true" />
                            <div>
                                <h3>Horario</h3>
                                <ul>
                                    {COMPANY.schedule.map((schedule) => (
                                        <li key={schedule}>{schedule}</li>
                                    ))}
                                </ul>
                            </div>
                        </div>
                    </div>

                    <form className="cf-contact__form" onSubmit={handleSubmit} noValidate>
                        {error && (
                            <p className="cf-contact__alert cf-contact__alert--error" role="alert">
                                {error}
                            </p>
                        )}

                        {success && (
                            <p className="cf-contact__alert cf-contact__alert--success" role="status">
                                {success}
                            </p>
                        )}

                        <div className="cf-contact__row">
                            <div className="cf-contact__field">
                                <label htmlFor="contact-name">Nombre</label>
                                <input
                                    id="contact-name"
                                    type="text"
                                    name="name"
                                    value={formData.name}
                                    onChange={handleChange}
                                    autoComplete="name"
                                    required
                                />
                            </div>

                            <div className="cf-contact__field">
                                <label htmlFor="contact-email">Correo electrónico</label>
                                <input
                                    id="contact-email"
                                    type="email"
                                    name="email"
                                    value={formData.email}
                                    onChange={handleChange}
                                    autoComplete="email"
                                    required
                                />
                            </div>
                        </div>

                        <div className="cf-contact__row">
                            <div className="cf-contact__field">
                                <label htmlFor="contact-phone">Teléfono (opcional)</label>
                                <input
                                    id="contact-phone"
                                    type="tel"
                                    name="phone"
                                    value={formData.phone}
                                    onChange={handleChange}
                                    autoComplete="tel"
                                />
                            </div>

                            <div className="cf-contact__field">
                                <label htmlFor="contact-subject">Asunto</label>
                                <input
                                    id="contact-subject"
                                    type="text"
                                    name="subject"
                                    value={formData.subject}
                                    onChange={handleChange}
                                    required
                                />
                            </div>
                        </div>

                        <div className="cf-contact__field">
                            <label htmlFor="contact-message">Mensaje</label>
                            <textarea
                                id="contact-message"
                                name="message"
                                value={formData.message}
                                onChange={handleChange}
                                rows="5"
                                required
                            />
                        </div>

                        <div className="sr-only" aria-hidden="true">
                            <label htmlFor="contact-website">Sitio web</label>
                            <input
                                id="contact-website"
                                type="text"
                                name="website"
                                value={formData.website}
                                onChange={handleChange}
                                tabIndex="-1"
                                autoComplete="off"
                            />
                        </div>

                        <button
                            className="cf-contact__submit"
                            type="submit"
                            disabled={!formIsValid || loading}
                        >
                            {loading ? "Enviando..." : "Enviar mensaje"}
                        </button>
                    </form>
                </div>
            </div>
        </section>
    );
};
