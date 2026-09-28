import servicePlaceholder from "../assets/img/service-placeholder.svg";
import limpiezaEsencial from "../assets/img/services/limpieza-esencial.webp";
import limpiezaIntegral from "../assets/img/services/limpieza-integral.webp";
import limpiezaProfunda from "../assets/img/services/limpieza-profunda.webp";
import limpiezaFinDeObra from "../assets/img/services/limpieza-fin-de-obra.webp";

const serviceImages = {
  "limpieza-esencial": limpiezaEsencial,
  "limpieza-integral": limpiezaIntegral,
  "limpieza-profunda": limpiezaProfunda,
  "limpieza-fin-de-obra": limpiezaFinDeObra,
};

export const getServiceImage = (service) =>
  service?.image_url || serviceImages[service?.slug] || servicePlaceholder;

export { servicePlaceholder };