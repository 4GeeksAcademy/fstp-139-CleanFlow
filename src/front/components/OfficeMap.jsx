export const OfficeMap = ({
    address,
    title = "Ubicación de la oficina de CleanFlow",
}) => {
    const mapUrl =
        `https://www.google.com/maps?q=${encodeURIComponent(address)}&output=embed`;

    return (
        <div className="cf-office-map">
            <iframe
                className="cf-office-map__iframe"
                src={mapUrl}
                title={title}
                loading="lazy"
                allowFullScreen
                referrerPolicy="no-referrer-when-downgrade"
            />
        </div>
    );
};