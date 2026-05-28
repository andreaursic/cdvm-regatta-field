import { appState } from './state.js';
import { getDestination, isValidPoint, normalizeBearing } from './geo.js';

const SMART_ZOOM = {
    padding: 0.50,
    maxZoom: 16,
    minZoom: 13
};

export const icons = {

    boat: L.divIcon({
    html: `
        <div style="
            width:20px;
            height:20px;
            background:#0033cc;
            color:#ffffff;
            border:2px solid #ffd600;
            border-radius:50%;
            display:flex;
            align-items:center;
            justify-content:center;
            font-size:9px;
            line-height:1;
            font-weight:900;
            box-shadow:0 1px 4px rgba(0,0,0,0.45);
            overflow:hidden;
        ">
            RC
        </div>
    `,
    className: '',
    iconSize: [20, 20],
    iconAnchor: [10, 10]
    }),
    pin: L.divIcon({
        html: `
            <div style="
                width:18px;
                height:18px;
                border-radius:50%;
                background:#ffd600;
                border:2px solid #0033cc;
                box-shadow:0 1px 5px rgba(0,0,0,0.35);
            "></div>
        `,
        className: '',
        iconSize: [18, 18],
        iconAnchor: [9, 9]
    }),
    yellow: L.divIcon({
        html: '<div style="font-size:19px;color:#fff176;text-shadow:0 0 4px rgba(0,0,0,0.45);">●</div>',
        className: '',
        iconSize: [19, 19],
        iconAnchor: [9.5, 9.5]
    }),

    orange: L.divIcon({
        html: '<div style="font-size:18px;color:#ff9800;text-shadow:0 0 4px rgba(0,0,0,0.45);">●</div>',
        className: '',
        iconSize: [18, 18],
        iconAnchor: [9, 9]
    })
};

export function initializeMap() {

    if (appState.map) {
        appState.map.invalidateSize(true);
        return;
    }

    appState.map = L.map('map', {
        zoomControl: false,
        preferCanvas: true
    });

    appState.map.setView([45.6350, 13.7600], 13);

    L.control.zoom({
        position: 'bottomright'
    }).addTo(appState.map);

    L.tileLayer(
        'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',
        {
            maxZoom: 19,
            attribution: '&copy; OpenStreetMap'
        }
    ).addTo(appState.map);

    appState.markerLayer = L.layerGroup().addTo(appState.map);
    appState.gpsLayer = L.layerGroup().addTo(appState.map);

    const refresh = () => {
        appState.map?.invalidateSize(true);
    };

    setTimeout(refresh, 150);
    setTimeout(refresh, 500);

    window.addEventListener('resize', refresh);

    window.addEventListener('orientationchange', () => {
        setTimeout(refresh, 350);
    });
}

export function clearMap() {
    appState.markerLayer?.clearLayers();
}

export function drawCommitteeOnly(rc) {

    if (!isValidPoint(rc)) return;

    clearMap();

    L.marker(
        [rc.lat, rc.lon],
        {
            icon: icons.boat
        }
    )
        .addTo(appState.markerLayer)
        .bindPopup('Barca Comitato')
        .bindTooltip('RC', {
            permanent: false,
            direction: 'top',
            offset: [0, -8],
            opacity: 0.9,
            className: 'buoy-label'
        });

    appState.map.setView([rc.lat, rc.lon], 15);
}

export function drawPoints(points) {

    if (!Array.isArray(points)) return;

    points.forEach(point => {

        if (!isValidPoint(point) || !point.icon) {
            console.warn('Punto non valido:', point);
            return;
        }

        const pointName = (point.name || 'Punto').replace(/_/g, ' ');

        const tooltipHtml = `
            <span style="
                color:${point.outsideAuthorizedArea ? '#ff1744' : '#0033cc'};
                font-weight:800;
            ">
                ${pointName}
            </span>
        `;

        L.marker(
            [point.lat, point.lon],
            {
                icon: point.icon
            }
        )
            .addTo(appState.markerLayer)
            .bindPopup(pointName)
            .bindTooltip(tooltipHtml, {
                permanent: false,
                direction: 'top',
                offset: [0, -8],
                opacity: 0.95,
                className: 'buoy-label'
            });
    });
}

export function drawStartLine(rc, pin) {

    if (!isValidPoint(rc) || !isValidPoint(pin)) return;

    L.polyline(
        [
            [rc.lat, rc.lon],
            [pin.lat, pin.lon]
        ],
        {
            color: '#fff200',
            weight: 1.8,
            opacity: 0.95
        }
    ).addTo(appState.markerLayer);
}

export function drawCourseLines(points) {

    if (!Array.isArray(points)) return;

    const b1 = points.find(p => p.name === 'Boa_1_Bolina');
    const offset = points.find(p => p.name === 'Boa_1A_Offset');

    const b2 =
        points.find(p => p.name === 'Boa_2_Lasco') ||
        points.find(p => p.name === 'Boa_2_Trapezio') ||
        points.find(p => p.name === 'Boa_2_Reach') ||
        points.find(p => p.name === 'Boa_2S_Reach') ||
        points.find(p => p.name === 'Boa_2P_Reach');

    const b3S = points.find(p =>
        p.name === 'Boa_3S_Gate' ||
        p.name === 'Boa_3S'
    );

    const b3P = points.find(p =>
        p.name === 'Boa_3P_Gate' ||
        p.name === 'Boa_3P'
    );

    const b4S = points.find(p =>
        p.name === 'Boa_4S_Gate' ||
        p.name === 'Boa_4S'
    );

    const b4P = points.find(p =>
        p.name === 'Boa_4P_Gate' ||
        p.name === 'Boa_4P'
    );

    if (!b1) return;

    if (offset) {
        drawDashedLine(b1, offset);
    }

    if (b2) {
        drawDashedLine(offset || b1, b2);
    }

    if (b3S && b3P && b2) {

        const gate3Center = {
            lat: (b3S.lat + b3P.lat) / 2,
            lon: (b3S.lon + b3P.lon) / 2
        };

        drawDashedLine(b2, gate3Center);
        drawGateLine(b3S, b3P);

    } else if (b3S && b2) {
        drawDashedLine(b2, b3S);
    } else if (b3P && b2) {
        drawDashedLine(b2, b3P);
    }

    if (b4S && b4P) {

        const gate4Center = {
            lat: (b4S.lat + b4P.lat) / 2,
            lon: (b4S.lon + b4P.lon) / 2
        };

        drawDashedLine(b1, gate4Center);
        drawGateLine(b4S, b4P);

    } else if (b4S) {
        drawDashedLine(b1, b4S);
    } else if (b4P) {
        drawDashedLine(b1, b4P);
    }
}

function drawDashedLine(a, b) {

    if (!isValidPoint(a) || !isValidPoint(b)) return;

    L.polyline(
        [
            [a.lat, a.lon],
            [b.lat, b.lon]
        ],
        {
            color: '#ffffff',
            weight: 1.4,
            opacity: 0.85,
            dashArray: '6, 8'
        }
    ).addTo(appState.markerLayer);
}

function drawGateLine(a, b) {

    if (!isValidPoint(a) || !isValidPoint(b)) return;

    L.polyline(
        [
            [a.lat, a.lon],
            [b.lat, b.lon]
        ],
        {
            color: '#ff9800',
            weight: 1.6,
            opacity: 0.9,
            dashArray: '4, 6'
        }
    ).addTo(appState.markerLayer);
}

export function drawStartBias(rc, pin, twd) {

    if (!isValidPoint(rc) || !isValidPoint(pin)) return;

    const rcProjection = projectOnBearing(rc, rc, twd);
    const pinProjection = projectOnBearing(pin, rc, twd);

    const diff = pinProjection - rcProjection;

    if (Math.abs(diff) < 1) return;

    const favored = diff > 0
        ? 'Favorito PIN'
        : 'Favorita BARCA';

    const meters = Math.abs(diff).toFixed(1);

    const mid = {
        lat: (rc.lat + pin.lat) / 2,
        lon: (rc.lon + pin.lon) / 2
    };

    const labelPoint = getDestination(
        mid.lat,
        mid.lon,
        95,
        (twd + 180) % 360
    );

    L.marker(
        [labelPoint.lat, labelPoint.lon],
        {
            icon: L.divIcon({
                html: `
                    <div style="
                        font-size:11px;
                        font-weight:700;
                        color:#102a43;
                        background:rgba(255,255,255,0.92);
                        padding:3px 7px;
                        border-radius:9px;
                        box-shadow:0 1px 4px rgba(0,0,0,0.25);
                        white-space:nowrap;
                    ">
                        ${favored} ${meters} m
                    </div>
                `,
                className: '',
                iconSize: [130, 22],
                iconAnchor: [65, 11]
            })
        }
    ).addTo(appState.markerLayer);
}

export function drawWindAxis(center, twd, lengthMeters = 1400) {

    if (!isValidPoint(center)) return;

    twd = normalizeBearing(twd);

    const upwind = getDestination(
        center.lat,
        center.lon,
        lengthMeters * 0.85,
        twd
    );

    const downwind = getDestination(
        center.lat,
        center.lon,
        lengthMeters * 0.35,
        (twd + 180) % 360
    );

    L.polyline(
        [
            [upwind.lat, upwind.lon],
            [downwind.lat, downwind.lon]
        ],
        {
            color: '#0b84ff',
            weight: 1.5,
            opacity: 0.75,
            dashArray: '8, 8'
        }
    ).addTo(appState.markerLayer);

    const arrowTip = getDestination(
        center.lat,
        center.lon,
        lengthMeters * 0.72,
        twd
    );

    const arrowLeft = getDestination(
        arrowTip.lat,
        arrowTip.lon,
        70,
        (twd + 150) % 360
    );

    const arrowRight = getDestination(
        arrowTip.lat,
        arrowTip.lon,
        70,
        (twd - 150 + 360) % 360
    );

    L.polyline(
        [
            [arrowLeft.lat, arrowLeft.lon],
            [arrowTip.lat, arrowTip.lon],
            [arrowRight.lat, arrowRight.lon]
        ],
        {
            color: '#0b84ff',
            weight: 2,
            opacity: 0.9
        }
    ).addTo(appState.markerLayer);

    const labelPoint = getDestination(
        arrowTip.lat,
        arrowTip.lon,
        140,
        (twd + 180) % 360
    );

    L.marker(
        [labelPoint.lat, labelPoint.lon],
        {
            icon: L.divIcon({
                html: `
                    <div style="
                        font-size:12px;
                        font-weight:700;
                        color:#0b4dbb;
                        background:white;
                        padding:2px 6px;
                        border-radius:8px;
                        box-shadow:0 1px 4px rgba(0,0,0,0.25);
                        white-space:nowrap;
                    ">
                        TWD ${Math.round(twd)}°
                    </div>
                `,
                className: '',
                iconSize: [70, 20],
                iconAnchor: [35, 10]
            })
        }
    ).addTo(appState.markerLayer);
}

export function updateUserPosition(lat, lon, accuracy) {

    if (!appState.gpsLayer) return;

    appState.gpsLayer.clearLayers();

    L.circle(
        [lat, lon],
        {
            radius: accuracy || 10,
            color: '#2563eb',
            weight: 1,
            fillColor: '#3b82f6',
            fillOpacity: 0.12
        }
    ).addTo(appState.gpsLayer);

    L.marker(
        [lat, lon],
        {
            icon: L.divIcon({
                html: `
                    <div style="
                        width:16px;
                        height:16px;
                        background:#2563eb;
                        border:3px solid white;
                        border-radius:50%;
                        box-shadow:0 0 6px rgba(0,0,0,0.45);
                    "></div>
                `,
                className: '',
                iconSize: [16, 16],
                iconAnchor: [8, 8]
            })
        }
    )
        .addTo(appState.gpsLayer)
        .bindTooltip('La tua posizione', {
            permanent: false,
            direction: 'top'
        });
}

export function fitMapToPoints(points) {

    if (!Array.isArray(points) || !points.length) return;

    const validPoints = points.filter(point =>
        isValidPoint(point)
    );

    if (!validPoints.length) return;

    const bounds = L.latLngBounds(
        validPoints.map(point => [point.lat, point.lon])
    );

    if (!bounds.isValid()) return;

    appState.map.fitBounds(bounds.pad(SMART_ZOOM.padding), {
        maxZoom: SMART_ZOOM.maxZoom,
        animate: true,
        duration: 0.35
    });

    setTimeout(() => {
        if (appState.map.getZoom() < SMART_ZOOM.minZoom) {
            appState.map.setZoom(SMART_ZOOM.minZoom);
        }
    }, 400);
}

function projectOnBearing(point, origin, bearingDeg) {

    const metersPerDegLat = 111320;

    const metersPerDegLon =
        111320 * Math.cos(origin.lat * Math.PI / 180);

    const dx =
        (point.lon - origin.lon) * metersPerDegLon;

    const dy =
        (point.lat - origin.lat) * metersPerDegLat;

    const theta =
        bearingDeg * Math.PI / 180;

    const ux = Math.sin(theta);
    const uy = Math.cos(theta);

    return dx * ux + dy * uy;
}
/* =========================
   GO TO LINE
========================= */

let goToLayer = null;

export function drawGoToLine(from, to) {

    if (!appState.map) return;

    clearGoToLine();

    goToLayer = L.layerGroup().addTo(appState.map);

    L.polyline(
        [
            [from.lat, from.lon],
            [to.lat, to.lon]
        ],
        {
            color: '#ff1744',
            weight: 3,
            opacity: 0.9,
            dashArray: '10, 10'
        }
    ).addTo(goToLayer);

    L.circleMarker(
        [to.lat, to.lon],
        {
            radius: 7,
            color: '#ffffff',
            weight: 2,
            fillColor: '#ff1744',
            fillOpacity: 1
        }
    ).addTo(goToLayer);
}

export function clearGoToLine() {

    if (goToLayer) {
        goToLayer.clearLayers();
    }
}