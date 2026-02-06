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

let allTracks = [];
let filteredTracks = [];
const durationByStoredName = new Map();

let queue = [];
let queueIndex = -1;
let shuffleOn = false;
let repeatMode = 'off'; // off | one | all

let playlists = [];
let activePlaylistId = null;

function formatBytes(bytes) {
    const n = Number(bytes || 0);
    if (!Number.isFinite(n) || n <= 0) return '–';
    const units = ['B', 'KB', 'MB', 'GB'];
    let v = n;
    let i = 0;
    while (v >= 1024 && i < units.length - 1) {
        v /= 1024;
        i++;
    }
    return `${v.toFixed(i === 0 ? 0 : 1)} ${units[i]}`;
}

function formatDuration(seconds) {
    const s = Number(seconds);
    if (!Number.isFinite(s) || s <= 0) return '–';
    const total = Math.round(s);
    const m = Math.floor(total / 60);
    const r = total % 60;
    return `${m}:${String(r).padStart(2, '0')}`;
}

function coverUrlForTrack(track) {
    if (track && track.coverStoredName) {
        return `/uploads/covers/${encodeURIComponent(track.coverStoredName)}`;
    }
    return null;
}

function audioUrlForTrack(track) {
    return track && track.storedName ? `/uploads/${encodeURIComponent(track.storedName)}` : '';
}

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

    const locked = $('playerLocked');
    const unlocked = $('playerUnlocked');
    if (locked) locked.classList.toggle('hidden', loggedIn);
    if (unlocked) unlocked.classList.toggle('hidden', !loggedIn);

    const adminPanel = $('adminPanel');
    if (adminPanel) {
        const isAdmin = loggedIn && String(me.role || '').toLowerCase() === 'admin';
        adminPanel.classList.toggle('hidden', !isAdmin);
    }

    const playlistsPanel = $('playlistsPanel');
    if (playlistsPanel) {
        playlistsPanel.classList.toggle('hidden', !loggedIn);
    }
}

function isAdmin() {
    return !!(currentMe && currentMe.loggedIn && String(currentMe.role || '').toLowerCase() === 'admin');
}

function setNowPlaying(track) {
    const nowTitle = $('nowTitle');
    const nowSub = $('nowSub');
    const nowCover = $('nowCover');
    const player = $('mainPlayer');

    if (!track) {
        if (nowTitle) nowTitle.textContent = '–';
        if (nowSub) nowSub.textContent = '–';
        if (nowCover) nowCover.style.background = gradientFor('empty');
        if (player) player.removeAttribute('src');
        return;
    }

    if (nowTitle) nowTitle.textContent = track.title || 'Untitled';

    const subParts = [];
    const dur = durationByStoredName.get(track.storedName);
    if (dur) subParts.push(formatDuration(dur));
    if (track.size) subParts.push(formatBytes(track.size));
    if (isAdmin() && track.uploadedByUsername) subParts.push(`by ${track.uploadedByUsername}`);
    if (nowSub) nowSub.textContent = subParts.length ? subParts.join(' • ') : (track.description || '');

    const coverUrl = coverUrlForTrack(track);
    if (nowCover) {
        if (coverUrl) {
            nowCover.style.background = `center/cover no-repeat url('${coverUrl}')`;
        } else {
            nowCover.style.background = gradientFor(track.storedName || track.title || 'track');
        }
    }

    if (player) {
        player.src = audioUrlForTrack(track);
        player.play().catch(() => {});
    }
}

function renderQueue() {
    const el = $('queueList');
    if (!el) return;
    el.innerHTML = '';

    if (!queue.length) {
        el.innerHTML = '<div class="empty-state"><p>Queue ist leer. Klick auf einen Track, um ihn hinzuzufügen.</p></div>';
        return;
    }

    queue.forEach((t, idx) => {
        const item = document.createElement('div');
        item.className = `queue-item${idx === queueIndex ? ' active' : ''}`;
        const cover = coverUrlForTrack(t);
        const dur = durationByStoredName.get(t.storedName);
        const sub = [formatDuration(dur), formatBytes(t.size)].filter(x => x && x !== '–').join(' • ');

        item.innerHTML = `
            <div class="queue-left">
                <div class="queue-cover">
                    ${cover ? `<img src="${cover}" alt="Cover" loading="lazy">` : ''}
                </div>
                <div style="min-width:0">
                    <div class="queue-title">${escapeHtml(t.title || 'Untitled')}</div>
                    <div class="queue-sub">${escapeHtml(sub || (t.description || ''))}</div>
                </div>
            </div>
            <div class="queue-actions">
                <button class="mini-btn" type="button" data-action="queue-play" data-idx="${idx}">Play</button>
                <button class="mini-btn" type="button" data-action="queue-remove" data-idx="${idx}">Remove</button>
            </div>
        `;
        el.appendChild(item);
    });
}

function playAt(index) {
    if (!queue.length) {
        queueIndex = -1;
        setNowPlaying(null);
        renderQueue();
        return;
    }
    const next = Math.max(0, Math.min(index, queue.length - 1));
    queueIndex = next;
    const track = queue[queueIndex];
    setNowPlaying(track);
    renderQueue();
}

function nextTrack() {
    if (!queue.length) return;
    if (shuffleOn && queue.length > 1) {
        let n = queueIndex;
        while (n === queueIndex) {
            n = Math.floor(Math.random() * queue.length);
        }
        playAt(n);
        return;
    }

    const atEnd = queueIndex >= queue.length - 1;
    if (atEnd) {
        if (repeatMode === 'all') return playAt(0);
        return; // stop
    }
    playAt(queueIndex + 1);
}

function prevTrack() {
    if (!queue.length) return;
    if (queueIndex <= 0) return playAt(0);
    playAt(queueIndex - 1);
}

function enqueue(track, { play = false, replace = false } = {}) {
    if (!track) return;
    if (replace) {
        queue = [track];
        queueIndex = 0;
        setNowPlaying(track);
        renderQueue();
        return;
    }

    queue.push(track);
    if (queueIndex === -1) queueIndex = 0;
    if (play) {
        playAt(queue.length - 1);
    } else {
        renderQueue();
    }
}

function clearQueue() {
    queue = [];
    queueIndex = -1;
    setNowPlaying(null);
    renderQueue();
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

        const dur = durationByStoredName.get(storedName);
        const metaPills = [];
        metaPills.push(`<span class="pill">${escapeHtml(formatDuration(dur))}</span>`);
        metaPills.push(`<span class="pill">${escapeHtml(formatBytes(t.size))}</span>`);
        if (uploadedAt) metaPills.push(`<span class="pill">${escapeHtml(uploadedAt)}</span>`);
        if (isAdmin() && t.uploadedByUsername) metaPills.push(`<span class="pill">${escapeHtml(t.uploadedByUsername)}</span>`);
        const tags = Array.isArray(t.tags) ? t.tags : [];
        const tagPills = tags.slice(0, 12).map(tag => `<span class="pill tag">#${escapeHtml(tag)}</span>`).join('');

        const canEdit = !!(currentMe && currentMe.loggedIn);
        const canDelete = !!(currentMe && currentMe.loggedIn);
        const coverUrl = coverUrlForTrack(t);

        const item = document.createElement('div');
        item.className = 'track';
        item.dataset.trackId = t.id;
        item.innerHTML = `
            <div class="track-cover" style="background:${bg}">
                ${coverUrl ? `<img src="${coverUrl}" alt="Cover" loading="lazy">` : ''}
            </div>
            <div class="track-meta">
                <div class="track-top">
                    <div>
                        <div class="track-title">${escapeHtml(title)}</div>
                        ${description ? `<div class="track-desc">${escapeHtml(description)}</div>` : ''}
                        <div class="track-meta2">${metaPills.join('')}${tagPills}</div>
                    </div>
                    <div class="track-actions">
                        <button class="track-play" type="button" data-action="play" data-id="${escapeHtml(t.id)}">Play</button>
                        <button class="track-play" type="button" data-action="queue" data-id="${escapeHtml(t.id)}">+ Queue</button>
                        ${canEdit ? `<button class="track-play" type="button" data-action="edit" data-id="${escapeHtml(t.id)}">Edit</button>` : ''}
                        ${canEdit ? `<button class="track-play" type="button" data-action="playlist-add" data-id="${escapeHtml(t.id)}">Playlist</button>` : ''}
                        ${canDelete ? `<button class="track-delete" type="button" data-action="delete" data-id="${escapeHtml(t.id)}">Löschen</button>` : ''}
                    </div>
                </div>
                <audio preload="metadata" data-stored="${escapeHtml(storedName)}" src="/uploads/${encodeURIComponent(storedName)}"></audio>
            </div>
        `;
        list.appendChild(item);
    }

    // collect durations silently
    for (const audio of list.querySelectorAll('audio[data-stored]')) {
        const stored = audio.getAttribute('data-stored');
        if (!stored || durationByStoredName.has(stored)) continue;
        audio.addEventListener('loadedmetadata', () => {
            durationByStoredName.set(stored, audio.duration);
            // re-render meta pills quickly without re-fetch
            applySearchSortAndRender();
        }, { once: true });
    }
}

function getPlaylistById(id) {
    return (Array.isArray(playlists) ? playlists : []).find(p => p.id === id) || null;
}

function renderPlaylistsUi() {
    const listEl = $('playlistsList');
    const activeEl = $('playlistActive');
    const tracksEl = $('playlistTracks');

    if (listEl) listEl.innerHTML = '';
    if (activeEl) activeEl.textContent = '–';
    if (tracksEl) tracksEl.innerHTML = '';

    if (!currentMe || !currentMe.loggedIn) return;
    if (!listEl || !activeEl || !tracksEl) return;

    const pls = Array.isArray(playlists) ? playlists : [];
    if (!pls.length) {
        listEl.innerHTML = '<div class="empty-state"><p>Noch keine Playlists. Erstelle eine.</p></div>';
        return;
    }

    for (const p of pls) {
        const row = document.createElement('div');
        row.className = 'playlist-row';
        row.innerHTML = `
            <div class="playlist-name">${escapeHtml(p.name || 'Untitled')}</div>
            <div class="queue-actions">
                <button class="mini-btn" type="button" data-action="pl-open" data-id="${escapeHtml(p.id)}">Open</button>
                <button class="mini-btn" type="button" data-action="pl-play" data-id="${escapeHtml(p.id)}">Play</button>
                <button class="mini-btn" type="button" data-action="pl-delete" data-id="${escapeHtml(p.id)}">Delete</button>
            </div>
        `;
        listEl.appendChild(row);
    }

    const active = activePlaylistId ? getPlaylistById(activePlaylistId) : null;
    if (!active) {
        activePlaylistId = pls[0].id;
    }

    const active2 = activePlaylistId ? getPlaylistById(activePlaylistId) : null;
    if (!active2) return;

    activeEl.textContent = active2.name || '–';

    const ids = Array.isArray(active2.trackIds) ? active2.trackIds : [];
    const byId = new Map((Array.isArray(allTracks) ? allTracks : []).map(t => [t.id, t]));
    const items = ids.map(id => byId.get(id)).filter(Boolean);

    if (!items.length) {
        tracksEl.innerHTML = '<div class="empty-state"><p>Noch keine Tracks in dieser Playlist.</p></div>';
        return;
    }

    for (const t of items) {
        const el = document.createElement('div');
        el.className = 'queue-item';
        const cover = coverUrlForTrack(t);
        el.innerHTML = `
            <div class="queue-left">
                <div class="queue-cover">
                    ${cover ? `<img src="${cover}" alt="Cover" loading="lazy">` : ''}
                </div>
                <div style="min-width:0">
                    <div class="queue-title">${escapeHtml(t.title || 'Untitled')}</div>
                    <div class="queue-sub">${escapeHtml(t.description || '')}</div>
                </div>
            </div>
            <div class="queue-actions">
                <button class="mini-btn" type="button" data-action="pl-track-play" data-id="${escapeHtml(t.id)}">Play</button>
                <button class="mini-btn" type="button" data-action="pl-track-queue" data-id="${escapeHtml(t.id)}">+Q</button>
                <button class="mini-btn" type="button" data-action="pl-track-remove" data-id="${escapeHtml(t.id)}">Remove</button>
            </div>
        `;
        tracksEl.appendChild(el);
    }
}

async function refreshPlaylists() {
    if (!currentMe || !currentMe.loggedIn) {
        playlists = [];
        activePlaylistId = null;
        renderPlaylistsUi();
        return;
    }
    const data = await api('/api/playlists');
    playlists = Array.isArray(data.playlists) ? data.playlists : [];
    if (activePlaylistId && !getPlaylistById(activePlaylistId)) activePlaylistId = null;
    renderPlaylistsUi();
}

async function addTrackToPlaylist(trackId, { playlistsMsgEl } = {}) {
    const msgEl = playlistsMsgEl || $('playlistsMessage');
    if (!currentMe || !currentMe.loggedIn) {
        setMessage(msgEl, 'Bitte zuerst einloggen.', 'error');
        return;
    }

    const track = (Array.isArray(allTracks) ? allTracks : []).find(t => t.id === trackId);
    if (!track) return;

    if (!Array.isArray(playlists) || playlists.length === 0) {
        const name = prompt('Keine Playlists vorhanden. Name für neue Playlist:', 'Meine Playlist');
        if (name === null) return;
        const p = String(name || '').trim();
        if (!p) return;
        const created = await api('/api/playlists', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ name: p })
        });
        await refreshPlaylists();
        const pl = created && created.playlist ? created.playlist : (Array.isArray(playlists) ? playlists.find(x => x.name === p) : null);
        const pid = pl ? pl.id : (playlists[0] ? playlists[0].id : null);
        if (!pid) return;
        await api(`/api/playlists/${encodeURIComponent(pid)}/tracks`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ trackId })
        });
        activePlaylistId = pid;
        await refreshPlaylists();
        setMessage(msgEl, 'Track zur Playlist hinzugefügt.', 'success');
        return;
    }

    const lines = playlists.map((p, i) => `${i + 1}) ${p.name}`).join('\n');
    const input = prompt(`Playlist auswählen (Nummer) oder neuen Namen eingeben:\n\n${lines}`, '1');
    if (input === null) return;

    const trimmed = String(input || '').trim();
    if (!trimmed) return;

    const asNum = Number(trimmed);
    let pid = null;
    if (Number.isFinite(asNum) && asNum >= 1 && asNum <= playlists.length) {
        pid = playlists[asNum - 1].id;
    } else {
        const created = await api('/api/playlists', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ name: trimmed })
        });
        await refreshPlaylists();
        pid = created && created.playlist ? created.playlist.id : (playlists[0] ? playlists[0].id : null);
    }
    if (!pid) return;

    await api(`/api/playlists/${encodeURIComponent(pid)}/tracks`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ trackId })
    });
    activePlaylistId = pid;
    await refreshPlaylists();
    setMessage(msgEl, 'Track zur Playlist hinzugefügt.', 'success');
}

function applySearchSortAndRender() {
    const q = String($('tracksSearch')?.value || '').trim().toLowerCase();
    const sort = String($('tracksSort')?.value || 'new');

    let t = Array.isArray(allTracks) ? [...allTracks] : [];
    if (q) {
        t = t.filter(x => {
            const hay = [x.title, x.description, ...(Array.isArray(x.tags) ? x.tags : [])]
                .filter(Boolean)
                .join(' ')
                .toLowerCase();
            return hay.includes(q);
        });
    }

    if (sort === 'old') {
        t.sort((a, b) => new Date(a.uploadedAt || 0) - new Date(b.uploadedAt || 0));
    } else if (sort === 'title') {
        t.sort((a, b) => String(a.title || '').localeCompare(String(b.title || ''), 'de', { sensitivity: 'base' }));
    } else if (sort === 'duration') {
        t.sort((a, b) => {
            const da = durationByStoredName.get(a.storedName) ?? Infinity;
            const db = durationByStoredName.get(b.storedName) ?? Infinity;
            return da - db;
        });
    } else {
        t.sort((a, b) => new Date(b.uploadedAt || 0) - new Date(a.uploadedAt || 0));
    }

    filteredTracks = t;
    renderTracks(filteredTracks);
}

async function refreshAdminUsers() {
    const usersList = $('usersList');
    if (!usersList) return;

    if (!isAdmin()) {
        usersList.innerHTML = '';
        return;
    }

    const data = await api('/api/users');
    const users = Array.isArray(data.users) ? data.users : [];
    usersList.innerHTML = '';

    for (const u of users) {
        const row = document.createElement('div');
        row.className = 'user-row';
        row.innerHTML = `
            <div class="user-meta">
                <div class="user-name">${escapeHtml(u.username)}</div>
                <div class="user-sub muted">${escapeHtml(String(u.role || '').toUpperCase())} • ${u.createdAt ? escapeHtml(new Date(u.createdAt).toLocaleString()) : ''}</div>
            </div>
            <div>
                <button class="mini-btn" type="button" data-action="user-delete" data-id="${escapeHtml(u.id)}">Delete</button>
            </div>
        `;
        usersList.appendChild(row);
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
        allTracks = Array.isArray(data.tracks) ? data.tracks : [];
        applySearchSortAndRender();
        await refreshAdminUsers();
        await refreshPlaylists();
    } else {
        allTracks = [];
        filteredTracks = [];
        renderTracks([]);
        clearQueue();
        await refreshAdminUsers();
        await refreshPlaylists();
    }
}

function xhrUpload(url, formData, { onProgress } = {}) {
    return new Promise((resolve, reject) => {
        const xhr = new XMLHttpRequest();
        xhr.open('POST', url);
        xhr.withCredentials = true;

        xhr.upload.addEventListener('progress', (e) => {
            if (!onProgress) return;
            if (!e.lengthComputable) return;
            onProgress(Math.max(0, Math.min(1, e.loaded / e.total)));
        });

        xhr.addEventListener('load', () => {
            const ct = xhr.getResponseHeader('content-type') || '';
            let body = xhr.responseText;
            if (ct.includes('application/json')) {
                try { body = JSON.parse(xhr.responseText || 'null'); } catch {}
            }
            if (xhr.status >= 200 && xhr.status < 300) {
                resolve(body);
            } else {
                const message = body && body.error ? body.error : `Request failed: ${xhr.status}`;
                const err = new Error(message);
                err.status = xhr.status;
                reject(err);
            }
        });

        xhr.addEventListener('error', () => {
            const err = new Error('Backend nicht erreichbar');
            err.isNetworkError = true;
            reject(err);
        });

        xhr.send(formData);
    });
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
    const searchInput = $('tracksSearch');
    const sortSelect = $('tracksSort');

    const player = $('mainPlayer');
    const prevBtn = $('prevBtn');
    const nextBtn = $('nextBtn');
    const shuffleBtn = $('shuffleBtn');
    const repeatBtn = $('repeatBtn');
    const clearQueueBtn = $('clearQueueBtn');
    const queueList = $('queueList');
    const playerMsg = $('playerMessage');

    const passwordForm = $('passwordForm');
    const passwordMsg = $('passwordMessage');

    const createUserForm = $('createUserForm');
    const adminMsg = $('adminMessage');
    const usersList = $('usersList');

    const dropZone = $('dropZone');
    const progressWrap = $('uploadProgress');
    const progressBar = $('uploadProgressBar');

    const createPlaylistForm = $('createPlaylistForm');
    const playlistsMsg = $('playlistsMessage');
    const playlistsList = $('playlistsList');
    const playlistTracks = $('playlistTracks');

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
                let msg = err && err.isNetworkError ? backendHelpText() : (err.message || 'Login fehlgeschlagen.');
                if (msg === 'Invalid credentials') msg = 'Falscher Username oder Passwort.';
                if (msg.startsWith('Too many failed logins.')) msg = 'Zu viele Login-Versuche. Bitte kurz warten und dann erneut versuchen.';
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

            if (progressWrap) progressWrap.classList.remove('hidden');
            if (progressBar) progressBar.style.width = '0%';

            const fileInput = $('trackFile');
            const files = fileInput && fileInput.files ? Array.from(fileInput.files) : [];
            if (!files.length) {
                setMessage(uploadMsg, 'Bitte eine oder mehrere Audio-Dateien auswählen.', 'error');
                if (progressWrap) progressWrap.classList.add('hidden');
                return;
            }

            const coverInput = $('trackCover');
            const cover = coverInput && coverInput.files && coverInput.files[0] ? coverInput.files[0] : null;

            const fd = new FormData();
            for (const f of files) fd.append('file', f);
            if (files.length === 1 && cover) {
                fd.append('cover', cover);
            }
            fd.append('title', $('trackTitle')?.value || '');
            fd.append('description', $('trackDescription')?.value || '');
            fd.append('tags', $('trackTags')?.value || '');

            try {
                await xhrUpload('/api/upload', fd, {
                    onProgress: (p) => {
                        if (progressBar) progressBar.style.width = `${Math.round(p * 100)}%`;
                    }
                });

                if ($('trackTitle')) $('trackTitle').value = '';
                if ($('trackDescription')) $('trackDescription').value = '';
                if ($('trackTags')) $('trackTags').value = '';
                if (fileInput) fileInput.value = '';
                if (coverInput) coverInput.value = '';

                setMessage(uploadMsg, files.length === 1
                    ? 'Upload fertig. Track ist in deiner Library.'
                    : `Upload fertig. ${files.length} Tracks sind in deiner Library.`, 'success');
                if (progressBar) progressBar.style.width = '100%';
                await refreshMeAndTracks();
            } catch (err) {
                const msg = err && err.isNetworkError ? backendHelpText() : (err.message || 'Upload fehlgeschlagen.');
                setMessage(uploadMsg, msg, 'error');
                if (err.status === 401) {
                    setMessage(authMsg, 'Bitte zuerst einloggen.', 'error');
                    await refreshMeAndTracks();
                }
            } finally {
                if (progressWrap) {
                    setTimeout(() => progressWrap.classList.add('hidden'), 500);
                }
            }
        });
    }

    if (dropZone) {
        const fileInput = $('trackFile');
        dropZone.addEventListener('click', () => fileInput && fileInput.click());
        dropZone.addEventListener('keydown', (e) => {
            if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                fileInput && fileInput.click();
            }
        });

        const prevent = (e) => { e.preventDefault(); e.stopPropagation(); };
        ['dragenter', 'dragover'].forEach(evt => dropZone.addEventListener(evt, (e) => {
            prevent(e);
            dropZone.classList.add('dragover');
        }));
        ['dragleave', 'drop'].forEach(evt => dropZone.addEventListener(evt, (e) => {
            prevent(e);
            dropZone.classList.remove('dragover');
        }));

        dropZone.addEventListener('drop', (e) => {
            const files = e.dataTransfer && e.dataTransfer.files ? Array.from(e.dataTransfer.files) : [];
            const audios = files.filter(f => String(f.type || '').startsWith('audio/'));
            const picked = audios.length ? audios : files;
            if (!picked.length || !fileInput) return;
            const dt = new DataTransfer();
            picked.forEach(f => dt.items.add(f));
            fileInput.files = dt.files;
            setMessage(uploadMsg, picked.length === 1 ? `Ausgewählt: ${picked[0].name}` : `Ausgewählt: ${picked.length} Dateien`, 'success');
        });
    }

    if (tracksList) {
        tracksList.addEventListener('click', async (e) => {
            const btn = e.target && e.target.closest ? e.target.closest('button[data-action]') : null;
            if (!btn) return;
            const action = btn.getAttribute('data-action');
            const id = btn.getAttribute('data-id');

            if (action === 'delete') {
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
                return;
            }

            const track = (Array.isArray(allTracks) ? allTracks : []).find(t => t.id === id);
            if (!track) return;

            if (action === 'play') {
                enqueue(track, { replace: true, play: true });
                setMessage(playerMsg, 'Spielt jetzt…', 'success');
            }
            if (action === 'queue') {
                enqueue(track, { play: false });
                setMessage(playerMsg, 'Zur Queue hinzugefügt.', 'success');
            }
            if (action === 'edit') {
                const newTitle = prompt('Titel', track.title || '');
                if (newTitle === null) return;
                const newDesc = prompt('Beschreibung', track.description || '');
                if (newDesc === null) return;
                const newTags = prompt('Tags (kommagetrennt)', Array.isArray(track.tags) ? track.tags.join(', ') : '');
                if (newTags === null) return;
                setMessage(uploadMsg, 'Speichere Änderungen…');
                try {
                    await api(`/api/tracks/${encodeURIComponent(track.id)}`, {
                        method: 'PATCH',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ title: newTitle, description: newDesc, tags: newTags })
                    });
                    setMessage(uploadMsg, 'Track aktualisiert.', 'success');
                    await refreshMeAndTracks();
                } catch (err) {
                    setMessage(uploadMsg, err.message || 'Update fehlgeschlagen.', 'error');
                }
            }
            if (action === 'playlist-add') {
                try {
                    await addTrackToPlaylist(track.id, { playlistsMsgEl: playlistsMsg });
                } catch (err) {
                    setMessage(playlistsMsg, err.message || 'Konnte nicht zur Playlist hinzufügen.', 'error');
                }
            }
        });
    }

    if (createPlaylistForm) {
        createPlaylistForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            setMessage(playlistsMsg, 'Erstelle Playlist…');
            const name = $('newPlaylistName')?.value || '';
            try {
                const data = await api('/api/playlists', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ name })
                });
                if ($('newPlaylistName')) $('newPlaylistName').value = '';
                activePlaylistId = data && data.playlist ? data.playlist.id : activePlaylistId;
                await refreshPlaylists();
                setMessage(playlistsMsg, 'Playlist erstellt.', 'success');
            } catch (err) {
                setMessage(playlistsMsg, err.message || 'Playlist erstellen fehlgeschlagen.', 'error');
            }
        });
    }

    if (playlistsList) {
        playlistsList.addEventListener('click', async (e) => {
            const btn = e.target && e.target.closest ? e.target.closest('button[data-action]') : null;
            if (!btn) return;
            const action = btn.getAttribute('data-action');
            const id = btn.getAttribute('data-id');
            if (!id) return;

            if (action === 'pl-open') {
                activePlaylistId = id;
                renderPlaylistsUi();
            }
            if (action === 'pl-play') {
                const pl = getPlaylistById(id);
                if (!pl) return;
                const ids = Array.isArray(pl.trackIds) ? pl.trackIds : [];
                const byId = new Map((Array.isArray(allTracks) ? allTracks : []).map(t => [t.id, t]));
                const items = ids.map(tid => byId.get(tid)).filter(Boolean);
                if (!items.length) return;
                clearQueue();
                items.forEach((t, idx) => enqueue(t, { play: idx === 0, replace: false }));
                setMessage(playerMsg, 'Playlist spielt…', 'success');
                activePlaylistId = id;
                renderPlaylistsUi();
            }
            if (action === 'pl-delete') {
                const ok = confirm('Playlist wirklich löschen?');
                if (!ok) return;
                setMessage(playlistsMsg, 'Lösche Playlist…');
                try {
                    await api(`/api/playlists/${encodeURIComponent(id)}`, { method: 'DELETE' });
                    if (activePlaylistId === id) activePlaylistId = null;
                    await refreshPlaylists();
                    setMessage(playlistsMsg, 'Playlist gelöscht.', 'success');
                } catch (err) {
                    setMessage(playlistsMsg, err.message || 'Playlist löschen fehlgeschlagen.', 'error');
                }
            }
        });
    }

    if (playlistTracks) {
        playlistTracks.addEventListener('click', async (e) => {
            const btn = e.target && e.target.closest ? e.target.closest('button[data-action]') : null;
            if (!btn) return;
            const action = btn.getAttribute('data-action');
            const id = btn.getAttribute('data-id');
            if (!id) return;

            const track = (Array.isArray(allTracks) ? allTracks : []).find(t => t.id === id);
            if (!track) return;

            if (action === 'pl-track-play') {
                enqueue(track, { replace: true, play: true });
                setMessage(playerMsg, 'Spielt jetzt…', 'success');
            }
            if (action === 'pl-track-queue') {
                enqueue(track, { play: false });
                setMessage(playerMsg, 'Zur Queue hinzugefügt.', 'success');
            }
            if (action === 'pl-track-remove') {
                if (!activePlaylistId) return;
                setMessage(playlistsMsg, 'Entferne Track…');
                try {
                    await api(`/api/playlists/${encodeURIComponent(activePlaylistId)}/tracks/${encodeURIComponent(track.id)}`, { method: 'DELETE' });
                    await refreshPlaylists();
                    setMessage(playlistsMsg, 'Track entfernt.', 'success');
                } catch (err) {
                    setMessage(playlistsMsg, err.message || 'Entfernen fehlgeschlagen.', 'error');
                }
            }
        });
    }

    if (queueList) {
        queueList.addEventListener('click', (e) => {
            const btn = e.target && e.target.closest ? e.target.closest('button[data-action]') : null;
            if (!btn) return;
            const action = btn.getAttribute('data-action');
            const idx = Number(btn.getAttribute('data-idx'));
            if (!Number.isFinite(idx)) return;

            if (action === 'queue-play') {
                playAt(idx);
            }
            if (action === 'queue-remove') {
                queue.splice(idx, 1);
                if (queueIndex > idx) queueIndex -= 1;
                if (queueIndex === idx) queueIndex = Math.min(queueIndex, queue.length - 1);
                if (!queue.length) setNowPlaying(null);
                renderQueue();
            }
        });
    }

    if (player) {
        player.addEventListener('ended', () => {
            if (repeatMode === 'one') {
                player.currentTime = 0;
                player.play().catch(() => {});
                return;
            }
            if (queueIndex >= queue.length - 1 && repeatMode === 'off') return;
            nextTrack();
        });
    }

    // Visualizer (Web Audio API)
    (function setupVisualizer() {
        const canvas = $('visualizer');
        if (!player || !canvas || !canvas.getContext) return;

        let audioCtx = null;
        let analyser = null;
        let source = null;
        let raf = 0;

        function stop() {
            if (raf) {
                cancelAnimationFrame(raf);
                raf = 0;
            }
        }

        function draw() {
            const ctx = canvas.getContext('2d');
            if (!ctx || !analyser) return;

            const dpr = window.devicePixelRatio || 1;
            const w = Math.max(1, Math.floor(canvas.clientWidth * dpr));
            const h = Math.max(1, Math.floor(canvas.clientHeight * dpr));
            if (canvas.width !== w) canvas.width = w;
            if (canvas.height !== h) canvas.height = h;

            const buffer = new Uint8Array(analyser.frequencyBinCount);
            analyser.getByteFrequencyData(buffer);

            ctx.clearRect(0, 0, w, h);

            const root = getComputedStyle(document.documentElement);
            const accent = (root.getPropertyValue('--accent') || '#667eea').trim();
            const accent2 = (root.getPropertyValue('--accent2') || '#764ba2').trim();
            const grad = ctx.createLinearGradient(0, 0, w, 0);
            grad.addColorStop(0, accent);
            grad.addColorStop(1, accent2);

            const bars = 48;
            const step = Math.floor(buffer.length / bars);
            const gap = Math.max(1, Math.floor(w / (bars * 24)));
            const barW = Math.max(2, Math.floor((w - gap * (bars - 1)) / bars));

            for (let i = 0; i < bars; i++) {
                const v = buffer[i * step] / 255;
                const bh = Math.max(2, Math.floor(v * h));
                const x = i * (barW + gap);
                const y = h - bh;
                ctx.fillStyle = grad;
                ctx.fillRect(x, y, barW, bh);
            }

            raf = requestAnimationFrame(draw);
        }

        async function start() {
            try {
                if (!audioCtx) {
                    audioCtx = new (window.AudioContext || window.webkitAudioContext)();
                }
                if (audioCtx.state === 'suspended') {
                    await audioCtx.resume();
                }
                if (!analyser) {
                    analyser = audioCtx.createAnalyser();
                    analyser.fftSize = 2048;
                    analyser.smoothingTimeConstant = 0.85;
                }
                if (!source) {
                    source = audioCtx.createMediaElementSource(player);
                    source.connect(analyser);
                    analyser.connect(audioCtx.destination);
                }
                if (!raf) draw();
            } catch {
                // ignore visualizer init failures
            }
        }

        player.addEventListener('play', () => start());
        player.addEventListener('pause', () => stop());
        player.addEventListener('ended', () => stop());
        document.addEventListener('visibilitychange', () => {
            if (document.hidden) stop();
        });
    })();

    if (prevBtn) prevBtn.addEventListener('click', prevTrack);
    if (nextBtn) nextBtn.addEventListener('click', nextTrack);
    if (clearQueueBtn) clearQueueBtn.addEventListener('click', clearQueue);

    if (shuffleBtn) {
        shuffleBtn.addEventListener('click', () => {
            shuffleOn = !shuffleOn;
            shuffleBtn.setAttribute('aria-pressed', shuffleOn ? 'true' : 'false');
            setMessage(playerMsg, shuffleOn ? 'Shuffle: On' : 'Shuffle: Off', 'success');
        });
    }

    if (repeatBtn) {
        repeatBtn.addEventListener('click', () => {
            repeatMode = repeatMode === 'off' ? 'all' : (repeatMode === 'all' ? 'one' : 'off');
            repeatBtn.textContent = repeatMode === 'off' ? 'Repeat: Off' : (repeatMode === 'all' ? 'Repeat: All' : 'Repeat: One');
            repeatBtn.setAttribute('aria-pressed', repeatMode === 'off' ? 'false' : 'true');
            setMessage(playerMsg, `Repeat: ${repeatMode}`, 'success');
        });
    }

    if (searchInput) searchInput.addEventListener('input', () => applySearchSortAndRender());
    if (sortSelect) sortSelect.addEventListener('change', () => applySearchSortAndRender());

    if (passwordForm) {
        passwordForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            setMessage(passwordMsg, 'Ändere Passwort…');
            const currentPassword = $('currentPassword')?.value || '';
            const newPassword = $('newPassword')?.value || '';
            try {
                await api('/api/change-password', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ currentPassword, newPassword })
                });
                if ($('currentPassword')) $('currentPassword').value = '';
                if ($('newPassword')) $('newPassword').value = '';
                setMessage(passwordMsg, 'Passwort geändert.', 'success');
            } catch (err) {
                setMessage(passwordMsg, err.message || 'Passwort ändern fehlgeschlagen.', 'error');
            }
        });
    }

    if (createUserForm) {
        createUserForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            setMessage(adminMsg, 'Erstelle User…');
            try {
                await api('/api/users', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        username: $('newUserUsername')?.value || '',
                        password: $('newUserPassword')?.value || '',
                        role: $('newUserRole')?.value || 'user'
                    })
                });
                if ($('newUserUsername')) $('newUserUsername').value = '';
                if ($('newUserPassword')) $('newUserPassword').value = '';
                if ($('newUserRole')) $('newUserRole').value = 'user';
                setMessage(adminMsg, 'User erstellt.', 'success');
                await refreshAdminUsers();
            } catch (err) {
                setMessage(adminMsg, err.message || 'User erstellen fehlgeschlagen.', 'error');
            }
        });
    }

    if (usersList) {
        usersList.addEventListener('click', async (e) => {
            const btn = e.target && e.target.closest ? e.target.closest('button[data-action="user-delete"]') : null;
            if (!btn) return;
            const id = btn.getAttribute('data-id');
            if (!id) return;
            const ok = confirm('User wirklich löschen?');
            if (!ok) return;
            setMessage(adminMsg, 'Lösche User…');
            try {
                await api(`/api/users/${encodeURIComponent(id)}`, { method: 'DELETE' });
                setMessage(adminMsg, 'User gelöscht.', 'success');
                await refreshAdminUsers();
            } catch (err) {
                setMessage(adminMsg, err.message || 'User löschen fehlgeschlagen.', 'error');
            }
        });
    }

    refreshMeAndTracks().catch((err) => {
        const msg = err && err.isNetworkError ? backendHelpText() : ((err && err.message) ? err.message : backendHelpText());
        setMessage(authMsg, msg, 'error');
    });

    renderQueue();

    // Offline app-shell (Service Worker)
    if ('serviceWorker' in navigator) {
        navigator.serviceWorker.register('/sw.js').catch(() => {});
    }
});
