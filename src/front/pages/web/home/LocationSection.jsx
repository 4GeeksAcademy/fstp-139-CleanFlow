import { OfficeMap } from "../../../components/OfficeMap";
import { COMPANY } from "../../../data/company";

export const LocationSection = () => {
    const fullAddress = `${COMPANY.address}, ${COMPANY.city}`;

    return (
        <section id="location" className="cf-location">
            <div className="cf-container">
                <div className="cf-location__heading">
                    <p className="cf-location__eyebrow">
                        Ven a conocernos
                    </p>

                    <h2 className="cf-location__title">
                        Dónde estamos
                    </h2>
                </div>

                <div className="cf-location__content">
                    <OfficeMap address={fullAddress} />

                    <div className="cf-location__information">
                        <div className="cf-location__block">
                            <i
                                className="fa-solid fa-location-dot"
                                aria-hidden="true"
                            />

                            <div>
                                <h3>Dirección</h3>

                                <address>
                                    {COMPANY.address}
                                    <br />
                                    {COMPANY.city}
                                </address>
                            </div>
                        </div>

                        <div className="cf-location__block">
                            <i
                                className="fa-regular fa-clock"
                                aria-hidden="true"
                            />

                            <div>
                                <h3>Horario</h3>

                                <ul>
                                    {COMPANY.schedule.map((schedule) => (
                                        <li key={schedule}>
                                            {schedule}
                                        </li>
                                    ))}
                                </ul>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </section>
    );
};