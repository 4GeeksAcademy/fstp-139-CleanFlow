/**
 * DEVUELVE EL ID DE LA SECCIÓN QUE SE ESTÁ VIENDO.
 *
 * Recibe los ids a vigilar y devuelve uno: el visible. Lo usa el navbar
 * para marcar su item correspondiente.
 *
 * Se usa IntersectionObserver y no el evento scroll porque ese se dispara
 * decenas de veces por segundo, y habría que medir las seis secciones en
 * cada una. Aquí el navegador avisa solo cuando algo entra o sale.
 */

import { useEffect, useState } from "react";

export const useActiveSection = (ids) => {
  // Vacío hasta que el observador diga algo: mejor no marcar nada que
  // suponer que estamos en la primera sección.
  const [activeSection, setActiveSection] = useState("");

  useEffect(() => {
    // filter(Boolean) descarta las que no existan: fuera de la landing
    // no hay ninguna de estas secciones.
    const sections = ids
      .map((id) => document.getElementById(id))
      .filter(Boolean);

    if (sections.length === 0) return;

    const observer = new IntersectionObserver(
      (entries) => {
        // Avisa solo de las que HAN CAMBIADO, y puede haber varias
        // visibles: se elige la que más pantalla ocupa.
        const visible = entries
          .filter((entry) => entry.isIntersecting)
          .sort((a, b) => b.intersectionRatio - a.intersectionRatio)[0];

        // Si no hay ninguna, se conserva la última marcada. Que
        // parpadee es peor que quedarse un momento en la anterior.
        if (visible) setActiveSection(visible.target.id);
      },
      {
        // Estos dos números son los que hay que tocar si el
        // resaltado cambia antes o después de lo debido.

        // Varios valores para que intersectionRatio se actualice al
        // bajar y la comparación de arriba pueda comparar de verdad.
        threshold: 0,

        // Recorta la zona que cuenta como "pantalla": solo la franja
        // central. Así una sección no se marca al asomar por el borde.
        rootMargin: "-40% 0px -40% 0px",
      },
    );

    sections.forEach((section) => observer.observe(section));

    // disconnect deja de vigilarlas todas de una vez.
    return () => observer.disconnect();

    // ids es un array nuevo en cada render: comparándolo tal cual, el efecto
    // se reharía siempre. Como texto, React ve dos cadenas iguales.
  }, [ids.join(",")]);

  return activeSection;
};
