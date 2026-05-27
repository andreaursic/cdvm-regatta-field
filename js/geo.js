import { EARTH_RADIUS } from './constants.js';

export function toRad(deg) {
    return Number(deg) * Math.PI / 180;
}

export function toDeg(rad) {
    return Number(rad) * 180 / Math.PI;
}

export function normalizeBearing(bearing) {
    const value = Number(bearing);
    if (!Number.isFinite(value)) return 0;
    return ((value % 360) + 360) % 360;
}

export function parseNumber(value, fallback = 0) {
    if (value === null || value === undefined || value === '') return fallback;

    const parsed = Number.parseFloat(
        String(value)
            .trim()
            .replace(',', '.')
    );

    return Number.isFinite(parsed) ? parsed : fallback;
}

export function dmToDecimal(deg, min) {
    const degrees = parseNumber(deg, 0);
    const minutes = Math.abs(parseNumber(min, 0));
    const sign = degrees < 0 ? -1 : 1;

    return sign * (Math.abs(degrees) + minutes / 60);
}

export function decimalToDM(decimal, type) {
    const value = Number(decimal);
    if (!Number.isFinite(value)) return '';

    const abs = Math.abs(value);
    const deg = Math.floor(abs);
    const min = ((abs - deg) * 60).toFixed(3);

    const dir = type === 'lat'
        ? (value >= 0 ? 'N' : 'S')
        : (value >= 0 ? 'E' : 'W');

    return `${deg}° ${min}' ${dir}`;
}

export function getDestination(lat, lon, distance, bearing) {
    const startLat = Number(lat);
    const startLon = Number(lon);
    const meters = Number(distance);

    if (
        !Number.isFinite(startLat) ||
        !Number.isFinite(startLon) ||
        !Number.isFinite(meters)
    ) {
        return { lat: NaN, lon: NaN };
    }

    const phi1 = toRad(startLat);
    const lambda1 = toRad(startLon);
    const theta = toRad(normalizeBearing(bearing));
    const delta = meters / EARTH_RADIUS;

    const sinPhi1 = Math.sin(phi1);
    const cosPhi1 = Math.cos(phi1);
    const sinDelta = Math.sin(delta);
    const cosDelta = Math.cos(delta);

    const phi2 = Math.asin(
        sinPhi1 * cosDelta + cosPhi1 * sinDelta * Math.cos(theta)
    );

    const lambda2 = lambda1 + Math.atan2(
        Math.sin(theta) * sinDelta * cosPhi1,
        cosDelta - sinPhi1 * Math.sin(phi2)
    );

    return {
        lat: toDeg(phi2),
        lon: ((toDeg(lambda2) + 540) % 360) - 180
    };
}

export function isValidPoint(point) {
    return Boolean(
        point &&
        Number.isFinite(Number(point.lat)) &&
        Number.isFinite(Number(point.lon))
    );
}
/* =========================
   DISTANCE / BEARING
========================= */

export function getDistanceMeters(lat1, lon1, lat2, lon2) {

    const R = 6371000;

    const φ1 = lat1 * Math.PI / 180;
    const φ2 = lat2 * Math.PI / 180;

    const Δφ = (lat2 - lat1) * Math.PI / 180;
    const Δλ = (lon2 - lon1) * Math.PI / 180;

    const a =
        Math.sin(Δφ / 2) * Math.sin(Δφ / 2) +
        Math.cos(φ1) *
        Math.cos(φ2) *
        Math.sin(Δλ / 2) *
        Math.sin(Δλ / 2);

    const c =
        2 * Math.atan2(
            Math.sqrt(a),
            Math.sqrt(1 - a)
        );

    return R * c;
}

export function getBearing(lat1, lon1, lat2, lon2) {

    const φ1 = lat1 * Math.PI / 180;
    const φ2 = lat2 * Math.PI / 180;

    const λ1 = lon1 * Math.PI / 180;
    const λ2 = lon2 * Math.PI / 180;

    const y =
        Math.sin(λ2 - λ1) * Math.cos(φ2);

    const x =
        Math.cos(φ1) * Math.sin(φ2) -
        Math.sin(φ1) *
        Math.cos(φ2) *
        Math.cos(λ2 - λ1);

    const brng =
        Math.atan2(y, x) * 180 / Math.PI;

    return ((brng % 360) + 360) % 360;
}