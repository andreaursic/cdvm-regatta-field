export const appState = {
    map: null,
    markerLayer: null,
    gpsLayer: null,
    areaLayer: null,
    gpsMarker: null,
    gpsAccuracyCircle: null,
    currentPoints: [],
    authorizedArea: []
};

export function resetState() {
    appState.currentPoints = [];

    if (appState.markerLayer) {
        appState.markerLayer.clearLayers();
    }
}