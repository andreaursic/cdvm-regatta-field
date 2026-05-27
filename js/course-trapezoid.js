import { icons } from './map.js';
import { getDestination, normalizeBearing } from './geo.js';

export function calculateTrapezoid(config) {

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
        trapezoidFactor,
        angle2,
        hasRealPin,
        pinLat,
        pinLon,
        showOffset,
        show3S,
        show3P,
        show4S,
        show4P
    } = config;

    const windAxis = normalizeBearing(twd);

    const factor = Number.isFinite(Number(trapezoidFactor))
        ? Number(trapezoidFactor)
        : 0.60;

    const trapezoidB2Angle =
        Number.isFinite(Number(angle2)) && Number(angle2) > 0
            ? Number(angle2)
            : 60;

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
            normalizeBearing(windAxis - 90)
        );

        pin.name = 'Boa_Pin';
        pin.icon = icons.pin;
    }

    const mid = {
        lat: (rc.lat + pin.lat) / 2,
        lon: (rc.lon + pin.lon) / 2
    };

    const b1 = getDestination(
        mid.lat,
        mid.lon,
        distUp,
        windAxis
    );

    b1.name = 'Boa_1_Bolina';
    b1.icon = icons.yellow;

    const points = [rc, pin, b1];

    let originAfter1 = b1;

    if (showOffset) {

        const offset = getDestination(
            b1.lat,
            b1.lon,
            offsetDistance || 100,
            normalizeBearing(windAxis - (offsetAngle || 75))
        );

        offset.name = 'Boa_1A_Offset';
        offset.icon = icons.orange;

        points.push(offset);

        originAfter1 = offset;
    }

    const b2 = getDestination(
        originAfter1.lat,
        originAfter1.lon,
        distReach,
        normalizeBearing(windAxis - (180 - trapezoidB2Angle))
    );

    b2.name = 'Boa_2_Trapezio';
    b2.icon = icons.yellow;

    points.push(b2);

    const gate3Center = getDestination(
        b2.lat,
        b2.lon,
        distDown,
        normalizeBearing(windAxis + 180)
    );

    if (show3S && show3P) {

        const b3S = getDestination(
            gate3Center.lat,
            gate3Center.lon,
            gateWidth / 2,
            normalizeBearing(windAxis - 90)
        );

        b3S.name = 'Boa_3S_Gate';
        b3S.icon = icons.orange;

        points.push(b3S);

        const b3P = getDestination(
            gate3Center.lat,
            gate3Center.lon,
            gateWidth / 2,
            normalizeBearing(windAxis + 90)
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

    const gate4Center = getDestination(
        b1.lat,
        b1.lon,
        distDown * factor,
        normalizeBearing(windAxis + 180)
    );

    if (show4S && show4P) {

        const b4S = getDestination(
            gate4Center.lat,
            gate4Center.lon,
            gateWidth / 2,
            normalizeBearing(windAxis - 90)
        );

        b4S.name = 'Boa_4S_Gate';
        b4S.icon = icons.orange;

        points.push(b4S);

        const b4P = getDestination(
            gate4Center.lat,
            gate4Center.lon,
            gateWidth / 2,
            normalizeBearing(windAxis + 90)
        );

        b4P.name = 'Boa_4P_Gate';
        b4P.icon = icons.orange;

        points.push(b4P);

    } else if (show4S) {

        gate4Center.name = 'Boa_4S';
        gate4Center.icon = icons.orange;

        points.push(gate4Center);

    } else if (show4P) {

        gate4Center.name = 'Boa_4P';
        gate4Center.icon = icons.orange;

        points.push(gate4Center);
    }

    return {
        rc,
        pin,
        points
    };
}