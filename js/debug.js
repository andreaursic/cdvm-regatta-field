export function debugFormData(data) {

    console.group("🧭 REGATTA DEBUG - INPUT");

    if (!data) {
        console.error("❌ getFormData returned null/undefined");
        console.groupEnd();
        return;
    }

    Object.entries(data).forEach(([key, value]) => {

        const status = (typeof value === 'number' && isNaN(value))
            ? "❌ NaN"
            : "✔";

        console.log(`${status} ${key}:`, value);
    });

    console.groupEnd();
}

export function debugPoints(points) {

    console.group("📍 REGATTA DEBUG - POINTS");

    points.forEach((p, i) => {

        const ok =
            !isNaN(p.lat) &&
            !isNaN(p.lon);

        console.log(
            ok ? "✔" : "❌",
            i,
            p.name,
            p.lat,
            p.lon
        );
    });

    console.groupEnd();
}

export function debugCourse(result) {

    console.group("⛵ REGATTA DEBUG - COURSE");

    console.log("RC:", result.rc);
    console.log("PIN:", result.pin);
    console.log("POINTS:", result.points.length);

    console.groupEnd();
}