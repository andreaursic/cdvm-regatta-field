import { icons } from './map.js';
import { getDestination } from './geo.js';

export function calculateTWA(config) {

    const {
        lat,
        lon,
        twd,
        lineLength,
        distUp,
        distReach,
        distDown,
        gateWidth,
        offsetDistance,
        offsetAngle,
        angle2,
        hasRealPin,
        pinLat,
        pinLon,
        showOffset,
        show3S,
        show3P
    } = config;

    const windAxis = twd;

    const twaB2Angle =
        Number.isFinite(angle2) && angle2 > 0
            ? angle2
            : 45;

    const rc = {
        lat,
        lon,
        name: 'Barca_Comitato',
        icon: icons.boat
    };

    let pin;

    if (hasRealPin && pinLat !== null && pinLon !== null) {

        pin = {
            lat: pinLat,
            lon: pinLon,
            name: 'Boa_Pin',
            icon: icons.pin
        };

    } else {

        pin = getDestination(
            lat,
            lon,
            lineLength,
            (windAxis - 90 + 360) % 360
        );

        pin.name = 'Boa_Pin';
        pin.icon = icons.pin;
    }

    const startMid = {
        lat: (rc.lat + pin.lat) / 2,
        lon: (rc.lon + pin.lon) / 2
    };

    /*
       BOA 1 - bolina in asse vento
    */

    const b1 = getDestination(
        startMid.lat,
        startMid.lon,
        distUp,
        windAxis
    );

    b1.name = 'Boa_1_Bolina';
    b1.icon = icons.yellow;

    const points = [rc, pin, b1];

    /*
       OFFSET 1A
    */

    let originAfter1 = b1;

    if (showOffset) {

        const offset = getDestination(
            b1.lat,
            b1.lon,
            offsetDistance || 100,
            (windAxis - (offsetAngle || 75) + 360) % 360
        );

        offset.name = 'Boa_1A_Offset';
        offset.icon = icons.orange;

        points.push(offset);

        originAfter1 = offset;
    }

    /*
       BOA 2 - vertice laterale del triangolo TWA/TLA
    */

    const b2 = getDestination(
        originAfter1.lat,
        originAfter1.lon,
        distReach,
        (windAxis - (180 - twaB2Angle) + 360) % 360
    );

    b2.name = 'Boa_2_Reach';
    b2.icon = icons.yellow;

    points.push(b2);

    /*
       GATE 3S / 3P
       Il gate resta sull'asse vento della boa 1.
       La distanza sottovento viene calcolata affinché:
       Boa 2 → Gate 3 = distDown.
    */

    const downwindDistance = calculateDownwindDistanceToAxis(
        distReach,
        distDown,
        twaB2Angle
    );

    const gate3Center = getDestination(
        b1.lat,
        b1.lon,
        downwindDistance,
        (windAxis + 180) % 360
    );

    if (show3S && show3P) {

        const b3S = getDestination(
            gate3Center.lat,
            gate3Center.lon,
            gateWidth / 2,
            (windAxis - 90) % 360
        );

        b3S.name = 'Boa_3S_Gate';
        b3S.icon = icons.orange;

        points.push(b3S);

        const b3P = getDestination(
            gate3Center.lat,
            gate3Center.lon,
            gateWidth / 2,
            (windAxis + 90 + 360) % 360
        );

        b3P.name = 'Boa_3P_Gate';
        b3P.icon = icons.orange;

        points.push(b3P);

    } else if (show3S) {

        gate3Center.name = 'Boa_3S';
        gate3Center.icon = icons.orange;

        points.push(gate3Center);

    } else if (show3P) {

        gate3Center.name = 'Boa_3P';
        gate3Center.icon = icons.orange;

        points.push(gate3Center);
    }

    return {
        rc,
        pin,
        points
    };
}

/* =========================
   INTERNAL GEOMETRY
========================= */

function calculateDownwindDistanceToAxis(distReach, distDown, angleDeg) {

    const angleRad = angleDeg * Math.PI / 180;

    const alongDownwind =
        distReach * Math.cos(angleRad);

    const lateralOffset =
        distReach * Math.sin(angleRad);

    const remaining =
        Math.sqrt(
            Math.max(
                0,
                distDown * distDown - lateralOffset * lateralOffset
            )
        );

    return alongDownwind + remaining;
}