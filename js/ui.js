import { decimalToDM, dmToDecimal, normalizeBearing, parseNumber } from './geo.js';
import { NM_TO_M } from './constants.js';

export function getFormData() {

    const pinLatDeg = document.getElementById('pinLatDeg')?.value || '';
    const pinLatMin = document.getElementById('pinLatMin')?.value || '';
    const pinLonDeg = document.getElementById('pinLonDeg')?.value || '';
    const pinLonMin = document.getElementById('pinLonMin')?.value || '';

    const isAutoPin =
        document.getElementById('pinLatDeg')?.dataset.autoPin === 'true' &&
        document.getElementById('pinLatMin')?.dataset.autoPin === 'true' &&
        document.getElementById('pinLonDeg')?.dataset.autoPin === 'true' &&
        document.getElementById('pinLonMin')?.dataset.autoPin === 'true';

    const hasRealPin =
        !isAutoPin &&
        pinLatDeg !== '' &&
        pinLatMin !== '' &&
        pinLonDeg !== '' &&
        pinLonMin !== '';

    return {
        courseType: document.getElementById('courseType')?.value || 'LA',

        lat: dmToDecimal(
            document.getElementById('latDeg')?.value || 0,
            document.getElementById('latMin')?.value || 0
        ),

        lon: dmToDecimal(
            document.getElementById('lonDeg')?.value || 0,
            document.getElementById('lonMin')?.value || 0
        ),

        hasRealPin,

        pinLat: hasRealPin
            ? dmToDecimal(pinLatDeg, pinLatMin)
            : null,

        pinLon: hasRealPin
            ? dmToDecimal(pinLonDeg, pinLonMin)
            : null,

        twd: normalizeBearing(
            parseNumber(document.getElementById('twd')?.value, 0)
        ),

        lineLength:
            Math.max(0, parseNumber(document.getElementById('lineLen')?.value, 0)),

        distUp:
            Math.max(0, parseNumber(document.getElementById('distUp')?.value, 0)) * NM_TO_M,

        distReach:
            Math.max(0, parseNumber(document.getElementById('distReach')?.value, 0)) * NM_TO_M,

        distDown:
            Math.max(0, parseNumber(document.getElementById('distDown')?.value, 0)) * NM_TO_M,

        angle2:
            parseNumber(document.getElementById('angle2')?.value, 0),

        gateWidth:
            Math.max(0, parseNumber(document.getElementById('gateWidth')?.value, 0)),

        offsetDistance:
            Math.max(0, parseNumber(document.getElementById('offsetDistance')?.value, 100)),

        offsetAngle:
            parseNumber(document.getElementById('offsetAngle')?.value, 75),

        trapezoidFactor:
            Math.max(0.1, parseNumber(document.getElementById('trapezoidFactor')?.value, 0.60)),

        showOffset:
            document.getElementById('showOffset')?.checked || false,

        show3S:
            document.getElementById('show3S')?.checked || false,

        show3P:
            document.getElementById('show3P')?.checked || false,

        show4S:
            document.getElementById('show4S')?.checked || false,

        show4P:
            document.getElementById('show4P')?.checked || false
    };
}

/* =========================
   PIN AUTO / MANUALE
========================= */

export function fillPinInputsFromPoint(pin) {

    if (!pin || isNaN(pin.lat) || isNaN(pin.lon)) return;

    const latParts = decimalToDMParts(pin.lat);
    const lonParts = decimalToDMParts(pin.lon);

    setAutoInput('pinLatDeg', latParts.deg);
    setAutoInput('pinLatMin', latParts.min);
    setAutoInput('pinLonDeg', lonParts.deg);
    setAutoInput('pinLonMin', lonParts.min);
}

export function markPinAsManual(event = null) {

    if (event && event.isTrusted === false) {
        return;
    }

    [
        'pinLatDeg',
        'pinLatMin',
        'pinLonDeg',
        'pinLonMin'
    ].forEach(id => {

        const el = document.getElementById(id);

        if (el) {
            el.dataset.autoPin = 'false';
        }
    });
}

export function resetPinInputs() {

    [
        'pinLatDeg',
        'pinLatMin',
        'pinLonDeg',
        'pinLonMin'
    ].forEach(id => {

        const el = document.getElementById(id);

        if (!el) return;

        el.value = '';
        el.dataset.autoPin = 'true';
    });
}

/* =========================
   GPS → RC
========================= */

export function setCommitteeInputsFromPosition(lat, lon) {

    if (isNaN(lat) || isNaN(lon)) return;

    const latParts = decimalToDMParts(lat);
    const lonParts = decimalToDMParts(lon);

    const latDeg = document.getElementById('latDeg');
    const latMin = document.getElementById('latMin');
    const lonDeg = document.getElementById('lonDeg');
    const lonMin = document.getElementById('lonMin');

    if (latDeg) latDeg.value = latParts.deg;
    if (latMin) latMin.value = latParts.min;
    if (lonDeg) lonDeg.value = lonParts.deg;
    if (lonMin) lonMin.value = lonParts.min;
}

/* =========================
   GPS → PIN
========================= */

export function setPinInputsFromPosition(lat, lon) {

    if (isNaN(lat) || isNaN(lon)) return;

    const latParts = decimalToDMParts(lat);
    const lonParts = decimalToDMParts(lon);

    const pinLatDeg = document.getElementById('pinLatDeg');
    const pinLatMin = document.getElementById('pinLatMin');
    const pinLonDeg = document.getElementById('pinLonDeg');
    const pinLonMin = document.getElementById('pinLonMin');

    if (pinLatDeg) pinLatDeg.value = latParts.deg;
    if (pinLatMin) pinLatMin.value = latParts.min;
    if (pinLonDeg) pinLonDeg.value = lonParts.deg;
    if (pinLonMin) pinLonMin.value = lonParts.min;

    [
        pinLatDeg,
        pinLatMin,
        pinLonDeg,
        pinLonMin
    ].forEach(el => {
        if (el) {
            el.dataset.autoPin = 'false';
        }
    });
}

/* =========================
   RENDER COORDINATES
========================= */

export function renderCoordinates(points) {

    const container = document.getElementById('coordOutput');

    if (!container) return;

    container.innerHTML = '';

    if (!Array.isArray(points)) return;

    points.forEach(point => {

        if (
            !point ||
            typeof point.lat !== 'number' ||
            typeof point.lon !== 'number' ||
            Number.isNaN(point.lat) ||
            Number.isNaN(point.lon)
        ) {
            console.warn('Coordinate non valide:', point);
            return;
        }

        const div = document.createElement('div');

        div.className = 'coord-item';

        const color =
            point.outsideAuthorizedArea
                ? '#ff1744'
                : '#0033cc';

        div.innerHTML = `
            <b style="color:${color};">
                ${(point.name || '').replace(/_/g, ' ')}
            </b>

            <div
                class="coord-val"
                style="color:${color};font-weight:700;"
            >
                ${decimalToDM(point.lat, 'lat')}
            </div>

            <div
                class="coord-val"
                style="color:${color};font-weight:700;"
            >
                ${decimalToDM(point.lon, 'lon')}
            </div>
        `;

        container.appendChild(div);
    });
}

/* =========================
   INTERNAL UTILS
========================= */

function setAutoInput(id, value) {

    const el = document.getElementById(id);

    if (!el) return;

    if (el.dataset.autoPin === 'false') return;

    el.value = value;
    el.dataset.autoPin = 'true';
}

function decimalToDMParts(decimal) {

    const abs = Math.abs(decimal);
    const deg = Math.floor(abs);
    const min = ((abs - deg) * 60)
        .toFixed(3)
        .replace('.', ',');

    return {
        deg,
        min
    };
}