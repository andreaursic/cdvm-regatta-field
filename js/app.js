import { appState } from './state.js';

import {
    initializeMap,
    clearMap,
    drawPoints,
    drawStartLine,
    drawCourseLines,
    drawStartBias,
    drawWindAxis,
    fitMapToPoints,
    updateUserPosition,
    drawCommitteeOnly,
    drawGoToLine,
    clearGoToLine
} from './map.js';

import {
    getFormData,
    renderCoordinates,
    fillPinInputsFromPoint,
    markPinAsManual,
    resetPinInputs,
    setCommitteeInputsFromPosition,
    setPinInputsFromPosition
} from './ui.js';

import { calculateRaceCourse } from './racecourse.js';

import {
    exportGoogleEarthKML,
    exportGarminGPX,
    exportNavionicsGPX,
    copyCoordinates
} from './export.js';

import { exportMapReportPDF } from './report.js';

import {
    initializeFieldStorage,
    saveCurrentField,
    loadSelectedField,
    deleteSelectedField
} from './field-storage.js';

import {
    initializeAreaLayer,
    getAreaFormData,
    drawAuthorizedArea,
    resetAuthorizedArea,
    saveAuthorizedArea,
    loadAuthorizedArea,
    deleteAuthorizedArea,
    isPointInsideAuthorizedArea
} from './area.js';

import {
    getDistanceMeters,
    getBearing
} from './geo.js';

let currentGpsPosition = null;
let activeGoToIndex = null;

const DISABLE_SERVICE_WORKER_IN_DEV = true;

/* =========================
   LOCAL STORAGE
========================= */

function saveCommitteePosition() {

    localStorage.setItem(
        'cdvm_last_committee',
        JSON.stringify({
            latDeg: document.getElementById('latDeg')?.value || '',
            latMin: document.getElementById('latMin')?.value || '',
            lonDeg: document.getElementById('lonDeg')?.value || '',
            lonMin: document.getElementById('lonMin')?.value || ''
        })
    );
}

function loadCommitteePosition() {

    const saved = localStorage.getItem('cdvm_last_committee');

    if (!saved) return;

    try {

        const data = JSON.parse(saved);

        if (data.latDeg !== undefined) {
            document.getElementById('latDeg').value = data.latDeg;
        }

        if (data.latMin !== undefined) {
            document.getElementById('latMin').value = data.latMin;
        }

        if (data.lonDeg !== undefined) {
            document.getElementById('lonDeg').value = data.lonDeg;
        }

        if (data.lonMin !== undefined) {
            document.getElementById('lonMin').value = data.lonMin;
        }

    } catch (err) {
        console.warn('Errore caricamento ultima posizione:', err);
    }
}

/* =========================
   PIN MODE
========================= */

function isPinManual() {

    return (
        document.getElementById('pinLatDeg')?.dataset.autoPin === 'false' &&
        document.getElementById('pinLatMin')?.dataset.autoPin === 'false' &&
        document.getElementById('pinLonDeg')?.dataset.autoPin === 'false' &&
        document.getElementById('pinLonMin')?.dataset.autoPin === 'false'
    );
}

/* =========================
   DRAW COURSE
========================= */

function drawCourse() {

    try {

        if (!isPinManual()) {
            resetPinInputs();
        }

        const config = getFormData();

        saveCommitteePosition();

        const result = calculateRaceCourse(config);

        if (!result || !Array.isArray(result.points)) {
            throw new Error('Calcolo campo non valido.');
        }

        if (!config.hasRealPin) {
            fillPinInputsFromPoint(result.pin);
        }

        result.points.forEach(point => {
            point.outsideAuthorizedArea =
                !isPointInsideAuthorizedArea(point);
        });

        appState.currentPoints = result.points;

        clearMap();

        drawCourseLines(result.points);
        drawStartLine(result.rc, result.pin);
        drawStartBias(result.rc, result.pin, config.twd);

        const windAxisLength = Math.max(
            config.distUp * 1.25,
            1400
        );

        drawWindAxis(result.rc, config.twd, windAxisLength);

        drawPoints(result.points);

        renderCoordinates(result.points);
        populateGoToSelect(result.points);
        fitMapToPoints(result.points);

        updateGoToLive();

    } catch (err) {
        console.error('Errore disegno campo:', err);
        alert(`Impossibile disegnare il campo: ${err.message}`);
    }
}

/* =========================
   INITIAL COMMITTEE ONLY
========================= */

function drawInitialCommitteeOnly() {

    try {

        const config = getFormData();

        saveCommitteePosition();

        const rc = {
            lat: config.lat,
            lon: config.lon
        };

        appState.currentPoints = [];

        renderCoordinates([]);
        populateGoToSelect([]);

        clearGoToLine();

        drawCommitteeOnly(rc);

    } catch (err) {
        console.warn('Impossibile disegnare la sola barca comitato:', err);
    }
}

function handleCommitteePositionChange() {

    resetPinInputs();

    drawInitialCommitteeOnly();
}

/* =========================
   GPS
========================= */

function startGpsTracking() {

    if (!navigator.geolocation) {
        console.warn('GPS non disponibile su questo dispositivo/browser.');
        return;
    }

    navigator.geolocation.watchPosition(
        position => {

            currentGpsPosition = {
                lat: position.coords.latitude,
                lon: position.coords.longitude,
                accuracy: position.coords.accuracy,
                speed: position.coords.speed,
                heading: position.coords.heading,
                timestamp: Date.now()
            };

            updateUserPosition(
                currentGpsPosition.lat,
                currentGpsPosition.lon,
                currentGpsPosition.accuracy
            );

            updateGoToLive();
        },
        error => {
            console.warn('Errore GPS:', error.message);
        },
        {
            enableHighAccuracy: true,
            maximumAge: 3000,
            timeout: 10000
        }
    );
}

function useGpsForCommittee() {

    if (!currentGpsPosition) {
        alert('Posizione GPS non ancora disponibile o non autorizzata.');
        return;
    }

    setCommitteeInputsFromPosition(
        currentGpsPosition.lat,
        currentGpsPosition.lon
    );

    resetPinInputs();

    drawInitialCommitteeOnly();
}

function useGpsForPin() {

    if (!currentGpsPosition) {
        alert('Posizione GPS non ancora disponibile o non autorizzata.');
        return;
    }

    setPinInputsFromPosition(
        currentGpsPosition.lat,
        currentGpsPosition.lon
    );

    markPinAsManual();
}

/* =========================
   RESET PIN
========================= */

function resetPin() {

    resetPinInputs();

    drawInitialCommitteeOnly();
}

/* =========================
   AREA AUTORIZZATA
========================= */

function drawArea() {

    const area = getAreaFormData();

    drawAuthorizedArea(area);

    if (appState.currentPoints?.length) {
        drawCourse();
    }
}

function resetArea() {

    resetAuthorizedArea();

    if (appState.currentPoints?.length) {
        drawCourse();
    }
}

function loadAreaKeepingCourse() {

    loadAuthorizedArea();

    setTimeout(() => {

        if (appState.currentPoints?.length) {
            drawCourse();
        } else {
            drawInitialCommitteeOnly();
        }

    }, 50);
}

function deleteAreaKeepingCourse() {

    deleteAuthorizedArea();

    setTimeout(() => {

        if (appState.currentPoints?.length) {
            drawCourse();
        } else {
            drawInitialCommitteeOnly();
        }

    }, 50);
}

function toggleAreaPanel() {

    const areaPanelContent =
        document.getElementById('areaPanelContent');

    const areaPanelIcon =
        document.getElementById('areaPanelIcon');

    if (!areaPanelContent) return;

    areaPanelContent.classList.toggle('collapsed');

    if (areaPanelIcon) {
        areaPanelIcon.classList.toggle('fa-chevron-down');
        areaPanelIcon.classList.toggle('fa-chevron-up');
    }
}

/* =========================
   CAMPI SALVATI
========================= */

function saveField() {

    saveCurrentField(
        appState.currentPoints || [],
        appState.authorizedArea || []
    );
}

function loadField() {

    loadSelectedField(() => {

        const savedAreaSelect =
            document.getElementById('savedAreaSelect');

        if (savedAreaSelect?.value) {
            loadAuthorizedArea();
        }

        setTimeout(() => {
            drawCourse();
        }, 50);
    });
}

/* =========================
   EVENTS
========================= */

function setupEventListeners() {

    const drawBtn = document.getElementById('drawCourseBtn');
    const resetPinBtn = document.getElementById('resetPinBtn');

    const useGpsRcBtn = document.getElementById('useGpsRcBtn');
    const useGpsPinBtn = document.getElementById('useGpsPinBtn');

    const toggleAreaPanelBtn =
        document.getElementById('toggleAreaPanelBtn');

    const drawAreaBtn = document.getElementById('drawAreaBtn');
    const resetAreaBtn = document.getElementById('resetAreaBtn');
    const saveAreaBtn = document.getElementById('saveAreaBtn');
    const loadAreaBtn = document.getElementById('loadAreaBtn');
    const deleteAreaBtn = document.getElementById('deleteAreaBtn');

    const saveFieldBtn = document.getElementById('saveFieldBtn');
    const loadFieldBtn = document.getElementById('loadFieldBtn');
    const deleteFieldBtn = document.getElementById('deleteFieldBtn');

    const gotoBtn = document.getElementById('gotoBtn');
    const gotoSelect = document.getElementById('gotoSelect');

    const exportGoogleBtn = document.getElementById('exportGoogleBtn');
    const exportGarminBtn = document.getElementById('exportGarminBtn');
    const exportNavionicsBtn = document.getElementById('exportNavionicsBtn');
    const exportPdfBtn = document.getElementById('exportPdfBtn');

    const copyBtn = document.getElementById('copyBtn');

    drawBtn?.addEventListener('click', drawCourse);
    resetPinBtn?.addEventListener('click', resetPin);

    useGpsRcBtn?.addEventListener('click', useGpsForCommittee);
    useGpsPinBtn?.addEventListener('click', useGpsForPin);

    toggleAreaPanelBtn?.addEventListener('click', toggleAreaPanel);

    drawAreaBtn?.addEventListener('click', drawArea);
    resetAreaBtn?.addEventListener('click', resetArea);
    saveAreaBtn?.addEventListener('click', saveAuthorizedArea);
    loadAreaBtn?.addEventListener('click', loadAreaKeepingCourse);
    deleteAreaBtn?.addEventListener('click', deleteAreaKeepingCourse);

    saveFieldBtn?.addEventListener('click', saveField);
    loadFieldBtn?.addEventListener('click', loadField);
    deleteFieldBtn?.addEventListener('click', deleteSelectedField);

    gotoBtn?.addEventListener('click', handleGoTo);

    gotoSelect?.addEventListener('change', () => {
        activeGoToIndex = Number(gotoSelect.value);
        updateGoToLive();
    });

    [
        'pinLatDeg',
        'pinLatMin',
        'pinLonDeg',
        'pinLonMin'
    ].forEach(id => {
        document.getElementById(id)?.addEventListener(
            'input',
            markPinAsManual
        );
    });

    [
        'latDeg',
        'latMin',
        'lonDeg',
        'lonMin'
    ].forEach(id => {
        document.getElementById(id)?.addEventListener(
            'input',
            handleCommitteePositionChange
        );
    });

    [
        'twd',
        'offsetAngle'
    ].forEach(id => {

        document.getElementById(id)?.addEventListener(
            'change',
            event => {

                const value = Number(event.target.value);

                if (!Number.isFinite(value)) {
                    event.target.value = 0;
                    return;
                }

                event.target.value =
                    ((value % 360) + 360) % 360;
            }
        );
    });

    exportGoogleBtn?.addEventListener('click', () => {

        if (appState.currentPoints?.length) {
            exportGoogleEarthKML(
                appState.currentPoints,
                appState.authorizedArea
            );
        } else {
            alert('Disegna prima il campo.');
        }
    });

    exportGarminBtn?.addEventListener('click', () => {

        if (appState.currentPoints?.length) {
            exportGarminGPX(appState.currentPoints);
        } else {
            alert('Disegna prima il campo.');
        }
    });

    exportNavionicsBtn?.addEventListener('click', () => {

        if (appState.currentPoints?.length) {
            exportNavionicsGPX(appState.currentPoints);
        } else {
            alert('Disegna prima il campo.');
        }
    });

    exportPdfBtn?.addEventListener('click', () => {

        if (appState.currentPoints?.length) {
            exportMapReportPDF();
        } else {
            alert('Disegna prima il campo.');
        }
    });

    copyBtn?.addEventListener('click', async () => {

        if (appState.currentPoints?.length) {
            await copyCoordinates(appState.currentPoints);
        } else {
            alert('Disegna prima il campo.');
        }
    });
}

/* =========================
   INIT
========================= */

function initializeApp() {

    initializeMap();

    initializeAreaLayer();

    initializeFieldStorage();

    loadCommitteePosition();

    setupEventListeners();

    resetPinInputs();

    const courseType = document.getElementById('courseType');
    const showOffset = document.getElementById('showOffset');

    if (courseType?.value === 'TRAPEZOID' && showOffset) {
        showOffset.checked = false;
    }

    startGpsTracking();

    if (DISABLE_SERVICE_WORKER_IN_DEV) {
        unregisterServiceWorkerAndClearCaches();
    } else {
        registerServiceWorker();
    }

    drawInitialCommitteeOnly();
}

window.addEventListener('DOMContentLoaded', () => {
    initializeApp();
});

/* =========================
   PWA / SERVICE WORKER
========================= */

function registerServiceWorker() {

    if (!('serviceWorker' in navigator)) return;

    window.addEventListener('load', () => {
        navigator.serviceWorker
            .register('./service-worker.js')
            .catch(err => {
                console.warn('Service worker non registrato:', err);
            });
    });
}

function unregisterServiceWorkerAndClearCaches() {

    if ('serviceWorker' in navigator) {
        navigator.serviceWorker
            .getRegistrations()
            .then(registrations => {
                registrations.forEach(registration => {
                    registration.unregister();
                });
            })
            .catch(err => {
                console.warn('Errore rimozione service worker:', err);
            });
    }

    if ('caches' in window) {
        caches.keys()
            .then(keys => {
                keys.forEach(key => caches.delete(key));
            })
            .catch(err => {
                console.warn('Errore pulizia cache:', err);
            });
    }
}

/* =========================
   GO TO / POSABOE
========================= */

function populateGoToSelect(points) {

    const select =
        document.getElementById('gotoSelect');

    if (!select) return;

    const previousValue = select.value;

    select.innerHTML = '';

    if (!Array.isArray(points) || !points.length) {

        activeGoToIndex = null;

        select.innerHTML = `
            <option value="">
                Nessuna boa disponibile
            </option>
        `;

        clearGoToLine();

        return;
    }

    points.forEach((point, index) => {

        const option =
            document.createElement('option');

        option.value = index;

        option.textContent =
            shortGoToName(point.name);

        select.appendChild(option);
    });

    if (
        previousValue !== '' &&
        Number(previousValue) < points.length
    ) {
        select.value = previousValue;
    }

    if (activeGoToIndex !== null) {
        select.value = activeGoToIndex;
    }
}

function handleGoTo() {

    const select =
        document.getElementById('gotoSelect');

    if (!select) return;

    activeGoToIndex = Number(select.value);

    if (!Number.isFinite(activeGoToIndex)) {
        alert('Seleziona una boa.');
        return;
    }

    updateGoToLive(true);
}

function updateGoToLive(showAlert = false) {

    const output =
        document.getElementById('gotoOutput');

    if (!output) return;

    if (
        activeGoToIndex === null ||
        activeGoToIndex === undefined ||
        !Array.isArray(appState.currentPoints)
    ) {
        return;
    }

    const point =
        appState.currentPoints[activeGoToIndex];

    if (!point) {
        if (showAlert) {
            alert('Seleziona una boa.');
        }

        clearGoToLine();
        return;
    }

    const gps =
        currentGpsPosition;

    if (!gps) {
        if (showAlert) {
            alert('GPS non disponibile. Attendi qualche secondo oppure autorizza la posizione.');
        }

        return;
    }

    const distance =
        getDistanceMeters(
            gps.lat,
            gps.lon,
            point.lat,
            point.lon
        );

    const bearing =
        getBearing(
            gps.lat,
            gps.lon,
            point.lat,
            point.lon
        );

    const speedMs =
        Number.isFinite(gps.speed)
            ? gps.speed
            : null;

    const speedKn =
        speedMs !== null
            ? speedMs * 1.943844
            : null;

    const etaText =
        speedMs && speedMs > 0.4
            ? formatEta(distance / speedMs)
            : 'N/D';

    drawGoToLine(gps, point);

    output.innerHTML = `
        <div style="
            padding:12px 14px;
            color:#0033cc;
            font-weight:800;
        ">

            <div style="
                display:flex;
                align-items:center;
                gap:12px;
                margin-bottom:10px;
            ">

                <div style="
                    width:44px;
                    height:44px;
                    border-radius:50%;
                    background:#0033cc;
                    color:#ffffff;
                    display:flex;
                    align-items:center;
                    justify-content:center;
                    font-size:26px;
                    font-weight:900;
                    transform:rotate(${bearing}deg);
                    flex-shrink:0;
                ">
                    ↑
                </div>

                <div>
                    <div style="font-size:1.15rem;">
                        GO TO ${shortGoToName(point.name)}
                    </div>

                    <div style="
                        font-size:0.78rem;
                        color:#64748b;
                        font-weight:700;
                    ">
                        Modalità posaboe
                    </div>
                </div>

            </div>

            <div style="font-size:1rem;line-height:1.55;">
                Rotta:
                <strong>${Math.round(bearing)}°</strong>
            </div>

            <div style="font-size:1rem;line-height:1.55;">
                Distanza:
                <strong>${(distance / 1852).toFixed(2)} NM</strong>
                <span style="font-size:0.85rem;">
                    (${Math.round(distance)} m)
                </span>
            </div>

            <div style="font-size:1rem;line-height:1.55;">
                Velocità:
                <strong>
                    ${speedKn !== null ? speedKn.toFixed(1) + ' kn' : 'N/D'}
                </strong>
            </div>

            <div style="font-size:1rem;line-height:1.55;">
                ETA:
                <strong>${etaText}</strong>
            </div>

        </div>
    `;
}

function formatEta(seconds) {

    if (!Number.isFinite(seconds) || seconds < 0) {
        return 'N/D';
    }

    if (seconds < 60) {
        return `${Math.round(seconds)} s`;
    }

    const minutes =
        Math.floor(seconds / 60);

    const remainingSeconds =
        Math.round(seconds % 60);

    if (minutes < 60) {
        return `${minutes} min ${remainingSeconds} s`;
    }

    const hours =
        Math.floor(minutes / 60);

    const remainingMinutes =
        minutes % 60;

    return `${hours} h ${remainingMinutes} min`;
}

function shortGoToName(name) {

    if (!name) return 'WP';

    const n = String(name).toUpperCase();

    if (n.includes('BARCA_COMITATO')) return 'RC';
    if (n.includes('BOA_PIN')) return 'PIN';

    if (n.includes('BOA_1A')) return '1A';
    if (n.includes('BOA_1')) return 'B1';

    if (n.includes('BOA_2')) return 'B2';

    if (n.includes('BOA_3S')) return '3S';
    if (n.includes('BOA_3P')) return '3P';

    if (n.includes('BOA_4S')) return '4S';
    if (n.includes('BOA_4P')) return '4P';

    return n;
}