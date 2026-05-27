const STORAGE_KEY = 'cdvm_saved_fields_v1';

const FIELD_INPUT_IDS = [
    'courseType',

    'latDeg',
    'latMin',
    'lonDeg',
    'lonMin',

    'pinLatDeg',
    'pinLatMin',
    'pinLonDeg',
    'pinLonMin',

    'twd',
    'lineLen',
    'distUp',
    'distReach',
    'angle2',
    'distDown',
    'gateWidth',
    'offsetDistance',
    'offsetAngle',
    'trapezoidFactor',

    'showOffset',
    'show3S',
    'show3P',
    'show4S',
    'show4P',

    'savedAreaSelect'
];

export function initializeFieldStorage() {
    refreshSavedFieldSelect();
}

export function saveCurrentField(points = [], authorizedArea = []) {

    const nameInput = document.getElementById('fieldName');
    const name = (nameInput?.value || '').trim();

    if (!name) {
        alert('Inserisci un nome per il campo da salvare.');
        nameInput?.focus();
        return;
    }

    const fields = readFieldInputs();
    const savedFields = getSavedFields();

    savedFields[name] = {
        name,
        savedAt: new Date().toISOString(),
        fields,
        points: sanitizePoints(points),
        authorizedArea: sanitizePoints(authorizedArea)
    };

    setSavedFields(savedFields);
    refreshSavedFieldSelect(name);

    alert(`Campo "${name}" salvato.`);
}

export function loadSelectedField(afterLoadCallback) {

    const select = document.getElementById('savedFieldSelect');
    const name = select?.value;

    if (!name) {
        alert('Seleziona un campo salvato da caricare.');
        return;
    }

    const savedFields = getSavedFields();
    const saved = savedFields[name];

    if (!saved) {
        alert('Campo salvato non trovato.');
        refreshSavedFieldSelect();
        return;
    }

    writeFieldInputs(saved.fields || {});

    const nameInput = document.getElementById('fieldName');

    if (nameInput) {
        nameInput.value = saved.name || name;
    }

    if (typeof afterLoadCallback === 'function') {

        afterLoadCallback({
            name: saved.name || name,
            savedAt: saved.savedAt || '',
            fields: saved.fields || {},
            points: sanitizePoints(saved.points || []),
            authorizedArea: sanitizePoints(saved.authorizedArea || [])
        });
    }
}

export function deleteSelectedField() {

    const select = document.getElementById('savedFieldSelect');
    const name = select?.value;

    if (!name) {
        alert('Seleziona un campo salvato da eliminare.');
        return;
    }

    if (!confirm(`Eliminare il campo salvato "${name}"?`)) return;

    const savedFields = getSavedFields();

    delete savedFields[name];

    setSavedFields(savedFields);
    refreshSavedFieldSelect();

    const nameInput = document.getElementById('fieldName');

    if (nameInput?.value === name) {
        nameInput.value = '';
    }
}

export function refreshSavedFieldSelect(selectedName = '') {

    const select = document.getElementById('savedFieldSelect');

    if (!select) return;

    const savedFields = getSavedFields();

    const names = Object.keys(savedFields).sort((a, b) =>
        a.localeCompare(b, 'it', { sensitivity: 'base' })
    );

    select.innerHTML = '<option value="">— seleziona campo —</option>';

    names.forEach(name => {

        const option = document.createElement('option');
        option.value = name;

        const savedAt = savedFields[name]?.savedAt
            ? formatDate(savedFields[name].savedAt)
            : '';

        option.textContent = savedAt
            ? `${name} — ${savedAt}`
            : name;

        select.appendChild(option);
    });

    if (selectedName && savedFields[selectedName]) {
        select.value = selectedName;
    }
}

function readFieldInputs() {

    const result = {};

    FIELD_INPUT_IDS.forEach(id => {

        const el = document.getElementById(id);

        if (!el) return;

        if (el.type === 'checkbox') {

            result[id] = {
                type: 'checkbox',
                checked: el.checked
            };

        } else {

            result[id] = {
                type: el.tagName.toLowerCase(),
                value: el.value
            };
        }

        if (id.startsWith('pin')) {
            result[id].autoPin = el.dataset.autoPin || 'false';
        }
    });

    return result;
}

function writeFieldInputs(fields) {

    Object.entries(fields).forEach(([id, data]) => {

        const el = document.getElementById(id);

        if (!el || !data) return;

        if (el.type === 'checkbox') {

            el.checked = Boolean(data.checked);

        } else if (data.value !== undefined) {

            el.value = data.value;
        }

        if (id.startsWith('pin') && data.autoPin !== undefined) {
            el.dataset.autoPin = data.autoPin;
        }

        el.dispatchEvent(new Event('input', { bubbles: true }));
        el.dispatchEvent(new Event('change', { bubbles: true }));
    });
}

function getSavedFields() {

    try {

        const raw = localStorage.getItem(STORAGE_KEY);

        if (!raw) return {};

        const parsed = JSON.parse(raw);

        if (!parsed || typeof parsed !== 'object') return {};

        return parsed;

    } catch (err) {

        console.warn('Errore lettura campi salvati:', err);
        return {};
    }
}

function setSavedFields(savedFields) {

    try {

        localStorage.setItem(
            STORAGE_KEY,
            JSON.stringify(savedFields)
        );

    } catch (err) {

        console.error('Errore salvataggio campi:', err);
        alert('Errore durante il salvataggio del campo.');
    }
}

function sanitizePoints(points) {

    if (!Array.isArray(points)) return [];

    return points
        .filter(point =>
            point &&
            !isNaN(Number(point.lat)) &&
            !isNaN(Number(point.lon))
        )
        .map(point => ({
            name: point.name || '',
            lat: Number(point.lat),
            lon: Number(point.lon),
            outsideAuthorizedArea: Boolean(point.outsideAuthorizedArea)
        }));
}

function formatDate(isoString) {

    try {

        return new Date(isoString).toLocaleDateString('it-IT', {
            day: '2-digit',
            month: '2-digit',
            year: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        });

    } catch {

        return '';
    }
}