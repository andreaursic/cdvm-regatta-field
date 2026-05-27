import { icons } from './map.js';
import { getDestination } from './geo.js';

export function calculateLA(config) {

    const {
        lat,
        lon,
        twd,
        lineLength,
        distUp,
        distDown,
        gateWidth,
        offsetDistance,
        offsetAngle,
        hasRealPin,
        pinLat,
        pinLon,
        showOffset,
        show4S,
        show4P
    } = config;

    const windAxis = twd;

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

    const b1 = getDestination(
        startMid.lat,
        startMid.lon,
        distUp,
        windAxis
    );

    b1.name = 'Boa_1_Bolina';
    b1.icon = icons.yellow;

    const points = [rc, pin, b1];

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
    }

    const gate4Center = getDestination(
        b1.lat,
        b1.lon,
        distDown,
        (windAxis + 180) % 360
    );

    if (show4S && show4P) {

        const b4S = getDestination(
            gate4Center.lat,
            gate4Center.lon,
            gateWidth / 2,
            (windAxis - 90) % 360
        );

        b4S.name = 'Boa_4S_Gate';
        b4S.icon = icons.orange;

        points.push(b4S);

        const b4P = getDestination(
            gate4Center.lat,
            gate4Center.lon,
            gateWidth / 2,
            (windAxis + 90 + 360) % 360
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