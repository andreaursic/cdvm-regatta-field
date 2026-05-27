import { appState } from './state.js';
import { dmToDecimal } from './geo.js';
import { DEFAULT_AREAS } from './default-areas.js';

const STORAGE_KEY = 'cdvm_authorized_areas';

/* =========================
   INIT
========================= */

export function initializeAreaLayer() {

    if (!appState.map) return;

    if (!appState.areaLayer) {
        appState.areaLayer = L.layerGroup().addTo(appState.map);
    }

    refreshSavedAreaSelect();
}

/* =========================
   READ FORM
========================= */

export function getAreaFormData() {

    const name =
        document.getElementById('areaName')?.value?.trim() || '';

    const color =
        document.getElementById('areaColor')?.value || '#0033cc';

    const opacity =
        parseFloat(
            document.getElementById('areaOpacity')?.value
        ) || 0.20;

    const points = [];

    for (let i = 1; i <= 5; i++) {

        const latDeg =
            document.getElementById(`areaWp${i}LatDeg`)?.value;

        const latMin =
            document.getElementById(`areaWp${i}LatMin`)?.value;

        const lonDeg =
            document.getElementById(`areaWp${i}LonDeg`)?.value;

        const lonMin =
            document.getElementById(`areaWp${i}LonMin`)?.value;

        const hasPoint =
            latDeg !== '' &&
            latMin !== '' &&
            lonDeg !== '' &&
            lonMin !== '';

        if (!hasPoint) continue;

        points.push({
            lat: dmToDecimal(latDeg, latMin),
            lon: dmToDecimal(lonDeg, lonMin),
            name: `WP${i}`
        });
    }

    return {
        name,
        color,
        opacity,
        points,
        source: 'user'
    };
}

/* =========================
   DRAW AREA
========================= */

export function drawAuthorizedArea(area) {

    initializeAreaLayer();

    if (!appState.areaLayer) return;

    appState.areaLayer.clearLayers();

    if (
        !area ||
        !Array.isArray(area.points) ||
        area.points.length < 3
    ) {
        alert('Inserisci almeno 3 waypoint per disegnare l’area autorizzata.');
        return;
    }

    const latLngs =
        area.points.map(point => [point.lat, point.lon]);

    L.polygon(
        latLngs,
        {
            color: area.color || '#0033cc',
            weight: 2,
            opacity: 0.95,
            fillColor: area.color || '#0033cc',
            fillOpacity: area.opacity ?? 0.20
        }
    )
    .addTo(appState.areaLayer)
    .bindPopup(area.name || 'Area Autorizzata');

    area.points.forEach(point => {

        L.circleMarker(
            [point.lat, point.lon],
            {
                radius: 4,
                color: area.color || '#0033cc',
                weight: 2,
                fillColor: '#ffffff',
                fillOpacity: 1
            }
        )
        .addTo(appState.areaLayer)
        .bindTooltip(point.name, {
            permanent: false,
            direction: 'top',
            offset: [0, -6],
            opacity: 0.95,
            className: 'buoy-label'
        });
    });

    appState.authorizedArea = area.points;

    const bounds = L.latLngBounds(latLngs);

    if (bounds.isValid()) {
        appState.map.fitBounds(bounds.pad(0.25), {
            animate: true,
            duration: 0.35
        });
    }
}

/* =========================
   RESET AREA
========================= */

export function resetAuthorizedArea() {

    if (appState.areaLayer) {
        appState.areaLayer.clearLayers();
    }

    appState.authorizedArea = [];
}

/* =========================
   SAVE / LOAD / DELETE
========================= */

export function saveAuthorizedArea() {

    const area = getAreaFormData();

    if (!area.name) {
        alert('Inserisci un nome area prima di salvare.');
        return;
    }

    if (
        !Array.isArray(area.points) ||
        area.points.length < 3
    ) {
        alert('Inserisci almeno 3 waypoint prima di salvare.');
        return;
    }

    const areas = getSavedAreas();

    const existingIndex =
        areas.findIndex(savedArea => savedArea.name === area.name);

    if (existingIndex >= 0) {

        const confirmOverwrite =
            confirm(`L’area personale "${area.name}" esiste già. Vuoi sovrascriverla?`);

        if (!confirmOverwrite) return;

        areas[existingIndex] = area;

    } else {

        areas.push(area);
    }

    saveAreasToStorage(areas);

    refreshSavedAreaSelect(`user:${area.name}`);

    alert(`Area personale "${area.name}" salvata.`);
}

export function loadAuthorizedArea() {

    const selectedValue =
        document.getElementById('savedAreaSelect')?.value || '';

    if (!selectedValue) {
        alert('Seleziona un’area da caricare.');
        return;
    }

    const area = findAreaBySelectValue(selectedValue);

    if (!area) {
        alert('Area non trovata.');
        refreshSavedAreaSelect();
        return;
    }

    fillAreaForm(area);

    drawAuthorizedArea(area);
}

export function deleteAuthorizedArea() {

    const selectedValue =
        document.getElementById('savedAreaSelect')?.value || '';

    if (!selectedValue) {
        alert('Seleziona un’area da eliminare.');
        return;
    }

    if (selectedValue.startsWith('default:')) {
        alert('Le aree predefinite non possono essere eliminate.');
        return;
    }

    const areaName =
        selectedValue.replace('user:', '');

    const confirmDelete =
        confirm(`Vuoi eliminare definitivamente l’area personale "${areaName}"?`);

    if (!confirmDelete) return;

    const areas =
        getSavedAreas().filter(area => area.name !== areaName);

    saveAreasToStorage(areas);

    refreshSavedAreaSelect();

    resetAuthorizedArea();

    alert(`Area personale "${areaName}" eliminata.`);
}

/* =========================
   SELECT MENU
========================= */

export function refreshSavedAreaSelect(selectedValue = '') {

    const select =
        document.getElementById('savedAreaSelect');

    if (!select) return;

    const userAreas =
        getSavedAreas();

    select.innerHTML = '';

    const placeholder =
        document.createElement('option');

    placeholder.value = '';
    placeholder.textContent = 'Seleziona area';
    select.appendChild(placeholder);

    if (Array.isArray(DEFAULT_AREAS) && DEFAULT_AREAS.length) {

        const defaultGroup =
            document.createElement('optgroup');

        defaultGroup.label = 'Aree predefinite';

        DEFAULT_AREAS.forEach(area => {

            const option =
                document.createElement('option');

            option.value = `default:${area.name}`;
            option.textContent = area.name;

            if (option.value === selectedValue) {
                option.selected = true;
            }

            defaultGroup.appendChild(option);
        });

        select.appendChild(defaultGroup);
    }

    if (userAreas.length) {

        const userGroup =
            document.createElement('optgroup');

        userGroup.label = 'Aree personali';

        userAreas
            .sort((a, b) => a.name.localeCompare(b.name))
            .forEach(area => {

                const option =
                    document.createElement('option');

                option.value = `user:${area.name}`;
                option.textContent = area.name;

                if (option.value === selectedValue) {
                    option.selected = true;
                }

                userGroup.appendChild(option);
            });

        select.appendChild(userGroup);
    }
}

function findAreaBySelectValue(value) {

    if (value.startsWith('default:')) {

        const name =
            value.replace('default:', '');

        return DEFAULT_AREAS.find(area => area.name === name) || null;
    }

    if (value.startsWith('user:')) {

        const name =
            value.replace('user:', '');

        return getSavedAreas().find(area => area.name === name) || null;
    }

    return null;
}

/* =========================
   POINT INSIDE POLYGON
========================= */

export function isPointInsideAuthorizedArea(point) {

    if (
        !point ||
        !Array.isArray(appState.authorizedArea) ||
        appState.authorizedArea.length < 3
    ) {
        return true;
    }

    const x = point.lon;
    const y = point.lat;

    let inside = false;

    const polygon = appState.authorizedArea;

    for (
        let i = 0, j = polygon.length - 1;
        i < polygon.length;
        j = i++
    ) {

        const xi = polygon[i].lon;
        const yi = polygon[i].lat;

        const xj = polygon[j].lon;
        const yj = polygon[j].lat;

        const intersect =
            ((yi > y) !== (yj > y)) &&
            (
                x <
                ((xj - xi) * (y - yi)) /
                (yj - yi) +
                xi
            );

        if (intersect) {
            inside = !inside;
        }
    }

    return inside;
}

/* =========================
   FILL FORM
========================= */

function fillAreaForm(area) {

    const areaName =
        document.getElementById('areaName');

    const areaColor =
        document.getElementById('areaColor');

    const areaOpacity =
        document.getElementById('areaOpacity');

    if (areaName) {
        areaName.value = area.name || '';
    }

    if (areaColor) {
        areaColor.value = area.color || '#0033cc';
    }

    if (areaOpacity) {
        areaOpacity.value = area.opacity ?? 0.20;
    }

    for (let i = 1; i <= 5; i++) {

        const point =
            area.points?.[i - 1];

        const latDeg =
            document.getElementById(`areaWp${i}LatDeg`);

        const latMin =
            document.getElementById(`areaWp${i}LatMin`);

        const lonDeg =
            document.getElementById(`areaWp${i}LonDeg`);

        const lonMin =
            document.getElementById(`areaWp${i}LonMin`);

        if (!latDeg || !latMin || !lonDeg || !lonMin) {
            continue;
        }

        if (!point) {
            latDeg.value = '';
            latMin.value = '';
            lonDeg.value = '';
            lonMin.value = '';
            continue;
        }

        const latParts =
            decimalToDMParts(point.lat);

        const lonParts =
            decimalToDMParts(point.lon);

        latDeg.value = latParts.deg;
        latMin.value = latParts.min;

        lonDeg.value = lonParts.deg;
        lonMin.value = lonParts.min;
    }
}

/* =========================
   STORAGE HELPERS
========================= */

function getSavedAreas() {

    const raw =
        localStorage.getItem(STORAGE_KEY);

    if (!raw) return [];

    try {

        const parsed =
            JSON.parse(raw);

        return Array.isArray(parsed)
            ? parsed
            : [];

    } catch (err) {

        console.warn('Errore lettura aree salvate:', err);
        return [];
    }
}

function saveAreasToStorage(areas) {

    localStorage.setItem(
        STORAGE_KEY,
        JSON.stringify(areas)
    );
}

/* =========================
   INTERNAL UTILS
========================= */

function decimalToDMParts(decimal) {

    const abs =
        Math.abs(decimal);

    const deg =
        Math.floor(abs);

    const min =
        ((abs - deg) * 60)
            .toFixed(3)
            .replace('.', ',');

    return {
        deg,
        min
    };
}