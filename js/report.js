/* global L */

import { appState } from './state.js';
import { decimalToDM } from './geo.js';

let previousView = null;

/* =========================
   PDF REPORT
========================= */

export async function exportMapReportPDF() {

    if (!appState.currentPoints || appState.currentPoints.length === 0) {
        alert('Disegna prima il campo.');
        return;
    }

    previousView = {
        center: appState.map.getCenter(),
        zoom: appState.map.getZoom()
    };

    buildPrintReport();

    document.body.classList.add('print-report-mode');

    await waitForMapReady();

    fitReportBounds();

    await waitForMapMoveEnd();

    appState.map.invalidateSize(true);

    await wait(250);

    window.print();
}

/* =========================
   BUILD REPORT
========================= */

function buildPrintReport() {

    removeExistingReport();

    const report = document.createElement('div');
    report.id = 'printReport';

    const points = appState.currentPoints || [];

    const outsidePoints = points.filter(point =>
        point.outsideAuthorizedArea === true
    );

    const courseType = getCourseLabel();
    const twd = getInputValue('twd', 'N/D');
    const lineLength = getInputValue('lineLen', 'N/D');
    const areaName = getSelectedAreaName();

    const now = new Date().toLocaleString('it-IT', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
    });

    const statusClass =
        outsidePoints.length > 0
            ? 'print-status-warning'
            : 'print-status-ok';

    const statusText =
        outsidePoints.length > 0
            ? `ATTENZIONE: ${outsidePoints.length} boa/e risultano fuori dall’area autorizzata.`
            : 'Tutte le boe risultano all’interno dell’area autorizzata.';

    report.innerHTML = `
        <div class="print-sheet">

            <div class="print-header">

                <div>
                    <div class="print-kicker">CDVM Regatta Field</div>

                    <h1>Report campo di regata</h1>

                    <div class="print-subtitle">
                        Documento operativo per Comitato di Regata, posaboe e controllo campo
                    </div>
                </div>

                <div class="print-meta-box">
                    <div>
                        <strong>Versione</strong>
                        <span>4.5</span>
                    </div>

                    <div>
                        <strong>Generato</strong>
                        <span>${now}</span>
                    </div>
                </div>

            </div>

            <div class="print-summary-grid">

                <div class="print-summary-item">
                    <strong>Percorso</strong>
                    <span>${courseType}</span>
                </div>

                <div class="print-summary-item">
                    <strong>TWD</strong>
                    <span>${twd}°</span>
                </div>

                <div class="print-summary-item">
                    <strong>Linea</strong>
                    <span>${lineLength} m</span>
                </div>

                <div class="print-summary-item">
                    <strong>Area autorizzata</strong>
                    <span>${areaName}</span>
                </div>

            </div>

            <div class="print-status ${statusClass}">
                ${statusText}
            </div>

            <div class="print-map-frame">
                <div class="print-map-placeholder"></div>
            </div>

            <div class="print-side-panel">

                <div class="print-section-title">
                    Coordinate boe
                </div>

                ${buildCoordinatesTable(points)}

                <div class="print-section-title print-notes-title">
                    Note operative
                </div>

                <ol class="print-notes">
                    <li>Verificare orientamento linea e bias prima della procedura di partenza.</li>
                    <li>Comunicare ai posaboe eventuali correzioni dovute a vento, corrente o traffico.</li>
                    <li>Controllare che tutte le boe siano riconoscibili e correttamente ancorate.</li>
                    <li>Registrare sul verbale eventuali modifiche al campo dopo la stampa del report.</li>
                </ol>

            </div>

            <div class="print-footer">
                Coordinate in formato gradi e minuti decimali. Verificare sempre in mare la posizione effettiva delle boe, le condizioni meteo-marine e le eventuali prescrizioni dell’Autorità Marittima.
            </div>

        </div>
    `;

    document.body.appendChild(report);
}

function buildCoordinatesTable(points) {

    if (!points || points.length === 0) {
        return `
            <div class="print-empty">
                Nessuna coordinata disponibile.
            </div>
        `;
    }

    const rows = points.map((point, index) => {

        const rowClass =
            point.outsideAuthorizedArea
                ? 'row-warning'
                : '';

        const areaStatus =
            point.outsideAuthorizedArea
                ? 'NO'
                : 'OK';

        return `
            <tr class="${rowClass}">
                <td>${index + 1}</td>
                <td>${formatPointName(point.name)}</td>
                <td>${decimalToDM(point.lat, 'lat')}</td>
                <td>${decimalToDM(point.lon, 'lon')}</td>
                <td>${areaStatus}</td>
            </tr>
        `;
    }).join('');

    return `
        <table class="print-coord-table">
            <thead>
                <tr>
                    <th>#</th>
                    <th>Punto</th>
                    <th>Latitudine</th>
                    <th>Longitudine</th>
                    <th>Area</th>
                </tr>
            </thead>

            <tbody>
                ${rows}
            </tbody>
        </table>
    `;
}

/* =========================
   MAP CENTERING FOR PRINT
========================= */

function fitReportBounds() {

    const points = appState.currentPoints || [];

    const validPoints = points
        .filter(point =>
            point &&
            !isNaN(Number(point.lat)) &&
            !isNaN(Number(point.lon))
        )
        .map(point => ({
            lat: Number(point.lat),
            lon: Number(point.lon)
        }));

    if (validPoints.length === 0) return;

    const lats = validPoints.map(point => point.lat);
    const lons = validPoints.map(point => point.lon);

    const center = L.latLng(
        (Math.min(...lats) + Math.max(...lats)) / 2,
        (Math.min(...lons) + Math.max(...lons)) / 2
    );

    const bounds = L.latLngBounds(
        validPoints.map(point => [point.lat, point.lon])
    );

    if (!bounds.isValid()) return;

    appState.map.invalidateSize(true);

    appState.map.fitBounds(bounds, {
        animate: false,
        padding: [90, 90],
        maxZoom: 14
    });

    setTimeout(() => {

        appState.map.invalidateSize(true);

        appState.map.setView(
            center,
            appState.map.getZoom(),
            {
                animate: false
            }
        );

    }, 120);
}

/* =========================
   CLEANUP AFTER PRINT
========================= */

window.addEventListener('afterprint', () => {

    document.body.classList.remove('print-report-mode');

    removeExistingReport();

    if (previousView && appState.map) {

        setTimeout(() => {

            appState.map.invalidateSize(true);

            appState.map.setView(
                previousView.center,
                previousView.zoom,
                {
                    animate: false
                }
            );

        }, 250);
    }
});

/* =========================
   UTILS
========================= */

function removeExistingReport() {

    const oldReport = document.getElementById('printReport');

    if (oldReport) {
        oldReport.remove();
    }
}

function getInputValue(id, fallback = '') {

    const value = document.getElementById(id)?.value;

    return value !== undefined && value !== ''
        ? value
        : fallback;
}

function getCourseLabel() {

    const courseType = document.getElementById('courseType')?.value || '';

    switch (courseType) {
        case 'LA':
            return 'LA / WA';

        case 'TWA':
            return 'TWA / TLA';

        case 'TRAPEZOID':
            return 'Trapezoid I-O';

        default:
            return courseType || 'N/D';
    }
}

function getSelectedAreaName() {

    const select = document.getElementById('savedAreaSelect');

    if (select && select.value) {

        const selectedOption =
            select.options[select.selectedIndex];

        if (selectedOption?.textContent) {
            return selectedOption.textContent.trim();
        }
    }

    const areaName = document.getElementById('areaName')?.value;

    return areaName && areaName.trim()
        ? areaName.trim()
        : 'N/D';
}
/* =========================
   ASYNC MAP HELPERS
========================= */

function wait(ms) {

    return new Promise(resolve => {
        setTimeout(resolve, ms);
    });
}

function waitForMapReady() {

    return new Promise(resolve => {

        if (!appState.map) {
            resolve();
            return;
        }

        appState.map.whenReady(() => {
            resolve();
        });
    });
}

function waitForMapMoveEnd() {

    return new Promise(resolve => {

        if (!appState.map) {
            resolve();
            return;
        }

        let resolved = false;

        const finish = () => {

            if (resolved) return;

            resolved = true;

            appState.map.off('moveend', finish);

            resolve();
        };

        appState.map.once('moveend', finish);

        setTimeout(finish, 1200);
    });
}
function formatPointName(name) {

    if (!name) return '-';

    return String(name)
        .replace(/_/g, ' ')
        .trim();
}