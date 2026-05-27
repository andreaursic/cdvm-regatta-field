import { decimalToDM } from './geo.js';

/* =========================
   GOOGLE EARTH - KML
========================= */

export function exportGoogleEarthKML(points, authorizedArea = []) {

    const validPoints = getValidPoints(points);
    if (!validPoints.length) {
        alert('Disegna prima il campo.');
        return;
    }

    const areaPoints = getValidPoints(authorizedArea);
    const generatedAt = new Date().toLocaleString('it-IT');

    let kml = `<?xml version="1.0" encoding="UTF-8"?>
<kml xmlns="http://www.opengis.net/kml/2.2">
<Document>
    <name>CDVM Regatta Field</name>
    <description>Campo di regata generato da CDVM Regatta Field - ${escapeXML(generatedAt)}</description>

    <Style id="markStyle">
        <IconStyle>
            <scale>1.1</scale>
            <Icon>
                <href>http://maps.google.com/mapfiles/kml/paddle/ylw-circle.png</href>
            </Icon>
        </IconStyle>
    </Style>

    <Style id="courseLineStyle">
        <LineStyle>
            <color>ff0055ff</color>
            <width>3</width>
        </LineStyle>
    </Style>

    <Style id="areaStyle">
        <LineStyle>
            <color>ff00aa00</color>
            <width>2</width>
        </LineStyle>
        <PolyStyle>
            <color>3300aa00</color>
        </PolyStyle>
    </Style>
`;

    validPoints.forEach(point => {

        const name = escapeXML(cleanName(point.name || 'Punto'));
        const description = escapeXML(
            `${decimalToDM(point.lat, 'lat')} - ${decimalToDM(point.lon, 'lon')}`
        );

        kml += `
    <Placemark>
        <name>${name}</name>
        <description>${description}</description>
        <styleUrl>#markStyle</styleUrl>
        <Point>
            <coordinates>${formatCoord(point.lon)},${formatCoord(point.lat)},0</coordinates>
        </Point>
    </Placemark>`;
    });

    if (validPoints.length > 1) {
        kml += `
    <Placemark>
        <name>Linee campo</name>
        <styleUrl>#courseLineStyle</styleUrl>
        <LineString>
            <tessellate>1</tessellate>
            <coordinates>
                ${validPoints.map(point => `${formatCoord(point.lon)},${formatCoord(point.lat)},0`).join('\n                ')}
            </coordinates>
        </LineString>
    </Placemark>`;
    }

    if (areaPoints.length >= 3) {
        const closedArea = closePolygon(areaPoints);

        kml += `
    <Placemark>
        <name>Area autorizzata</name>
        <styleUrl>#areaStyle</styleUrl>
        <Polygon>
            <outerBoundaryIs>
                <LinearRing>
                    <coordinates>
                        ${closedArea.map(point => `${formatCoord(point.lon)},${formatCoord(point.lat)},0`).join('\n                        ')}
                    </coordinates>
                </LinearRing>
            </outerBoundaryIs>
        </Polygon>
    </Placemark>`;
    }

    kml += `
</Document>
</kml>`;

    downloadFile(
        kml.trim(),
        makeFilename('cdvm_campo_regata', 'kml'),
        'application/vnd.google-earth.kml+xml'
    );
}

/* =========================
   GARMIN - GPX
========================= */

export function exportGarminGPX(points) {

    const validPoints = getValidPoints(points);
    if (!validPoints.length) {
        alert('Disegna prima il campo.');
        return;
    }

    const gpx = buildGPX(validPoints, {
        routeName: 'CDVM Regatta Field',
        garminNames: true,
        includeRoute: true
    });

    downloadFile(
        gpx,
        makeFilename('cdvm_campo_regata_garmin', 'gpx'),
        'application/gpx+xml'
    );
}

/* =========================
   NAVIONICS - GPX
========================= */

export function exportNavionicsGPX(points) {

    const validPoints = getValidPoints(points);
    if (!validPoints.length) {
        alert('Disegna prima il campo.');
        return;
    }

    const gpx = buildGPX(validPoints, {
        routeName: 'CDVM Regatta Field',
        garminNames: false,
        includeRoute: true
    });

    downloadFile(
        gpx,
        makeFilename('cdvm_campo_regata_navionics', 'gpx'),
        'application/gpx+xml'
    );
}

/* =========================
   COPY COORDINATES
========================= */

export async function copyCoordinates(points) {

    const validPoints = getValidPoints(points);
    if (!validPoints.length) return;

    let text = 'COORDINATE REGATA\n\n';

    validPoints.forEach(point => {

        const name = cleanName(point.name || 'Punto');

        text += `${name}: `
            + `${decimalToDM(point.lat, 'lat')} - `
            + `${decimalToDM(point.lon, 'lon')}\n`;
    });

    try {
        await navigator.clipboard.writeText(text);
        alert('Coordinate copiate!');
    } catch (err) {
        console.error('Clipboard error:', err);
        alert('Errore copia coordinate');
    }
}

/* =========================
   GPX BUILDER
========================= */

function buildGPX(points, options = {}) {

    const generatedAt = new Date().toISOString();

    let gpx = `<?xml version="1.0" encoding="UTF-8"?>
<gpx version="1.1"
     creator="CDVM Regatta Field"
     xmlns="http://www.topografix.com/GPX/1/1"
     xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance"
     xsi:schemaLocation="http://www.topografix.com/GPX/1/1 http://www.topografix.com/GPX/1/1/gpx.xsd">
    <metadata>
        <name>CDVM Regatta Field</name>
        <time>${generatedAt}</time>
    </metadata>
`;

    points.forEach(point => {

        const displayName = options.garminNames
            ? shortName(point.name || 'POINT')
            : cleanName(point.name || 'POINT');

        const description = `${decimalToDM(point.lat, 'lat')} - ${decimalToDM(point.lon, 'lon')}`;

        gpx += `
    <wpt lat="${formatCoord(point.lat)}" lon="${formatCoord(point.lon)}">
        <name>${escapeXML(displayName)}</name>
        <desc>${escapeXML(description)}</desc>
        <sym>Flag</sym>
    </wpt>`;
    });

    if (options.includeRoute && points.length > 1) {
        gpx += `
    <rte>
        <name>${escapeXML(options.routeName || 'Campo di regata')}</name>`;

        points.forEach(point => {
            gpx += `
        <rtept lat="${formatCoord(point.lat)}" lon="${formatCoord(point.lon)}">
            <name>${escapeXML(cleanName(point.name || 'Punto'))}</name>
        </rtept>`;
        });

        gpx += `
    </rte>`;
    }

    gpx += `
</gpx>`;

    return gpx.trim();
}

/* =========================
   UTILS
========================= */

function getValidPoints(points) {

    if (!Array.isArray(points)) return [];

    return points.filter(point =>
        point &&
        !isNaN(point.lat) &&
        !isNaN(point.lon)
    );
}

function closePolygon(points) {

    if (!points.length) return [];

    const first = points[0];
    const last = points[points.length - 1];

    const isClosed =
        Number(first.lat).toFixed(8) === Number(last.lat).toFixed(8) &&
        Number(first.lon).toFixed(8) === Number(last.lon).toFixed(8);

    return isClosed ? points : [...points, first];
}

function downloadFile(content, filename, mimeType) {

    const blob = new Blob([content], {
        type: `${mimeType};charset=utf-8`
    });

    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);

    link.href = url;
    link.download = filename;

    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    URL.revokeObjectURL(url);
}

function escapeXML(str = '') {

    return String(str)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&apos;');
}

function cleanName(name) {
    return String(name).replace(/_/g, ' ');
}

function shortName(name) {

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

    return n
        .replace(/[^A-Z0-9]/g, '')
        .slice(0, 8) || 'WP';
}

function formatCoord(value) {
    return Number(value).toFixed(6);
}

function makeFilename(base, extension) {

    const stamp = new Date()
        .toISOString()
        .slice(0, 16)
        .replace(/[-:T]/g, '');

    return `${base}_${stamp}.${extension}`;
}
