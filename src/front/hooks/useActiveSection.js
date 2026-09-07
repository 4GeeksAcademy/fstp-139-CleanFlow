import { useEffect, useState } from "react"


export const useActiveSection = (ids) => {
    const [activeSection, setActiveSection] = useState("");

    useEffect(() => {

        const sections = ids
            .map((id) => document.getElementById(id))
            .filter(Boolean);

        if (sections.length === 0) return;

        const observer = new IntersectionObserver(
            (entries) => {
                const visible = entries
                    .filter((entry) => entry.isIntersecting)
                    .sort((a, b) => b.intersectionRatio - a.intersectionRatio)[0];

                if (visible) setActiveSection(visible.target.id);
            },
            {
                threshold: [0.25, 0.5, 0.75 ],

                rootMargin: "-40% 0px -40% 0px"
            }
        );

        sections.forEach((section) => observer.observe(section));

        return () => observer.disconnect();
    }, [ids.join(",")]);

    return activeSection;
};