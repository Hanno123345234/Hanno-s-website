// Interaktive Effekte + Music Studio (Login/Upload)

function $(id) {
    return document.getElementById(id);
}

function setMessage(el, text, type = 'info') {
    if (!el) return;
    if (!text) {
        el.classList.add('hidden');
        el.textContent = '';
        el.dataset.type = '';
        return;
    }
    el.classList.remove('hidden');
    el.textContent = text;
    el.dataset.type = type;
}

function hashString(input) {
    let h = 0;
    for (let i = 0; i < input.length; i++) {
        h = (h * 31 + input.charCodeAt(i)) >>> 0;
    }
    return h;
}

function gradientFor(input) {
    const h = hashString(input);
    const a = h % 360;
    const b = (a + 65) % 360;
    const c = (b + 65) % 360;
    return `linear-gradient(135deg, hsl(${a} 90% 60%), hsl(${b} 90% 55%), hsl(${c} 90% 50%))`;
}

function escapeHtml(text) {
    return String(text)
        .replaceAll('&', '&amp;')
        .replaceAll('<', '&lt;')
        .replaceAll('>', '&gt;')
        .replaceAll('"', '&quot;')
        .replaceAll("'", '&#39;');
}

async function api(path, options) {
    let res;
    try {
        res = await fetch(path, {
            credentials: 'same-origin',
            headers: {
                ...(options && options.headers ? options.headers : {})
            },
            ...options
        });
    } catch (e) {
        const err = new Error('Backend nicht erreichbar');
        err.cause = e;
        err.isNetworkError = true;
        throw err;
    }
    let body = null;
    const contentType = res.headers.get('content-type') || '';
    if (contentType.includes('application/json')) {
        body = await res.json();
    } else {
        body = await res.text();
    }
    if (!res.ok) {
        const message = body && body.error ? body.error : `Request failed: ${res.status}`;
        const err = new Error(message);
        err.status = res.status;
        throw err;
    }
    return body;
}

function backendHelpText() {
    if (window.location && window.location.protocol === 'file:') {
        return 'Du hast die Website per Doppelklick geöffnet (file://). Bitte starte den Server und öffne: http://localhost:3000';
    }
    return 'Backend nicht erreichbar. Starte den Server mit: npm start und öffne http://localhost:3000';
}

let currentMe = { loggedIn: false, username: null, role: 'user' };

function setAuthUi(me) {
    const loggedIn = !!(me && me.loggedIn);
    const out = $('authLoggedOut');
    const inn = $('authLoggedIn');
    const username = $('meUsername');
    const roleEl = $('meRole');

    if (out) out.classList.toggle('hidden', loggedIn);
    if (inn) inn.classList.toggle('hidden', !loggedIn);
    if (username) username.textContent = loggedIn ? me.username : '–';
    if (roleEl) {
        const role = (me && me.role ? String(me.role).toUpperCase() : 'USER');
        roleEl.textContent = role;
        roleEl.classList.toggle('role-admin', role === 'ADMIN');
    }

    const uploadForm = $('uploadForm');
    if (uploadForm) {
        uploadForm.classList.toggle('disabled', !loggedIn);
    }
}

function renderTracks(tracks) {
    const list = $('tracksList');
    const empty = $('tracksEmpty');
    if (!list || !empty) return;

    const has = Array.isArray(tracks) && tracks.length > 0;
    empty.classList.toggle('hidden', has);
    list.innerHTML = '';

    if (!has) return;

    for (const t of tracks) {
        const title = t.title || 'Untitled';
        const description = t.description || '';
        const storedName = t.storedName;
        const uploadedAt = t.uploadedAt ? new Date(t.uploadedAt).toLocaleString() : '';
        const bg = gradientFor(storedName || title);

        const canDelete = !!(currentMe && currentMe.loggedIn);

        const item = document.createElement('div');
        item.className = 'track';
        item.dataset.trackId = t.id;
        item.innerHTML = `
            <div class="track-cover" style="background:${bg}"></div>
            <div class="track-meta">
                <div class="track-top">
                    <div>
                        <div class="track-title">${escapeHtml(title)}</div>
                        ${description ? `<div class="track-desc">${escapeHtml(description)}</div>` : ''}
                    </div>
                    <div class="track-actions">
                        ${uploadedAt ? `<div class="track-date">${escapeHtml(uploadedAt)}</div>` : ''}
                        ${canDelete ? `<button class="track-delete" type="button" data-action="delete" data-id="${escapeHtml(t.id)}">Löschen</button>` : ''}
                    </div>
                </div>
                <audio controls preload="metadata" src="/uploads/${encodeURIComponent(storedName)}"></audio>
            </div>
        `;
        list.appendChild(item);
    }
}

async function refreshMeAndTracks() {
    const authMsg = $('authMessage');
    setMessage(authMsg, '');

    const me = await api('/api/me');
    currentMe = {
        loggedIn: !!me.loggedIn,
        username: me.username || null,
        role: me.role || 'user'
    };
    setAuthUi(me);

    if (me.loggedIn) {
        const data = await api('/api/tracks');
        renderTracks(data.tracks);
    } else {
        renderTracks([]);
    }
}

document.addEventListener('DOMContentLoaded', function() {
    const nameElement = document.querySelector('.name');

    if (nameElement) {
        nameElement.addEventListener('mouseenter', function() {
            this.style.transform = 'scale(1.1)';
            this.style.transition = 'transform 0.3s ease';
        });

        nameElement.addEventListener('mouseleave', function() {
            this.style.transform = 'scale(1)';
        });
    }

    const loginForm = $('loginForm');
    const logoutBtn = $('logoutBtn');
    const uploadForm = $('uploadForm');
    const authMsg = $('authMessage');
    const uploadMsg = $('uploadMessage');
    const tracksList = $('tracksList');

    if (loginForm) {
        loginForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            setMessage(authMsg, 'Einloggen…');

            const username = $('loginUsername')?.value || '';
            const password = $('loginPassword')?.value || '';

            try {
                await api('/api/login', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ username, password })
                });

                setMessage(authMsg, 'Erfolgreich eingeloggt.', 'success');
                await refreshMeAndTracks();
            } catch (err) {
                const msg = err && err.isNetworkError ? backendHelpText() : (err.message || 'Login fehlgeschlagen.');
                setMessage(authMsg, msg, 'error');
            }
        });
    }

    if (logoutBtn) {
        logoutBtn.addEventListener('click', async () => {
            setMessage(authMsg, 'Logout…');
            try {
                await api('/api/logout', { method: 'POST' });
                setMessage(authMsg, 'Ausgeloggt.', 'success');
                await refreshMeAndTracks();
            } catch (err) {
                setMessage(authMsg, err.message || 'Logout fehlgeschlagen.', 'error');
            }
        });
    }

    if (uploadForm) {
        uploadForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            setMessage(uploadMsg, 'Upload läuft…');

            const fileInput = $('trackFile');
            const file = fileInput && fileInput.files && fileInput.files[0] ? fileInput.files[0] : null;
            if (!file) {
                setMessage(uploadMsg, 'Bitte eine Audio-Datei auswählen.', 'error');
                return;
            }

            const fd = new FormData();
            fd.append('file', file);
            fd.append('title', $('trackTitle')?.value || '');
            fd.append('description', $('trackDescription')?.value || '');

            try {
                await api('/api/upload', {
                    method: 'POST',
                    body: fd
                });

                if ($('trackTitle')) $('trackTitle').value = '';
                if ($('trackDescription')) $('trackDescription').value = '';
                if (fileInput) fileInput.value = '';

                setMessage(uploadMsg, 'Upload fertig. Track ist in deiner Library.', 'success');
                await refreshMeAndTracks();
            } catch (err) {
                const msg = err && err.isNetworkError ? backendHelpText() : (err.message || 'Upload fehlgeschlagen.');
                setMessage(uploadMsg, msg, 'error');
                if (err.status === 401) {
                    setMessage(authMsg, 'Bitte zuerst einloggen.', 'error');
                    await refreshMeAndTracks();
                }
            }
        });
    }

    if (tracksList) {
        tracksList.addEventListener('click', async (e) => {
            const btn = e.target && e.target.closest ? e.target.closest('button[data-action="delete"]') : null;
            if (!btn) return;

            const id = btn.getAttribute('data-id');
            if (!id) return;

            const ok = confirm('Track wirklich löschen? (Datei wird entfernt)');
            if (!ok) return;

            setMessage(uploadMsg, 'Lösche Track…');
            try {
                await api(`/api/tracks/${encodeURIComponent(id)}`, { method: 'DELETE' });
                setMessage(uploadMsg, 'Track gelöscht.', 'success');
                await refreshMeAndTracks();
            } catch (err) {
                setMessage(uploadMsg, err.message || 'Löschen fehlgeschlagen.', 'error');
            }
        });
    }

    refreshMeAndTracks().catch((err) => {
        const msg = err && err.isNetworkError ? backendHelpText() : ((err && err.message) ? err.message : backendHelpText());
        setMessage(authMsg, msg, 'error');
    });
});
