(() => {
  'use strict';

  const EVENTS_KEY = 'timeline.events.v1';
  const SETTINGS_KEY = 'timeline.settings.v1';
  const MAX_EVENTS_DEFAULT = 5000;
  const SESSION_GAP_MS = 30 * 60 * 1000;
  let ready = false;
  let queue = Promise.resolve();
  let lastEvent = null;

  const call = async (method, payload = {}) => {
    try { return await Otzaria.call(method, payload); }
    catch (_) { return { success: false, data: null }; }
  };

  async function get(key, fallback) {
    const r = await call('storage.get', { key });
    return r && r.success && r.data != null ? r.data : fallback;
  }

  async function set(key, value) {
    return call('storage.set', { key, value });
  }

  function cleanPayload(payload) {
    if (!payload || typeof payload !== 'object') return {};
    const out = {};
    for (const [k, v] of Object.entries(payload)) {
      if (['book','bookId','bookUid','id','type','source','index','screen','workspaceId','title','ref','reference'].includes(k)) {
        out[k] = v;
      }
    }
    return out;
  }

  function labelFor(type, data) {
    if (type === 'book') return data.title || data.book || data.bookId || 'ספר';
    if (type === 'navigation') return data.screen ? 'מעבר אל ' + data.screen : 'ניווט באוצריא';
    if (type === 'workspace') return 'סביבת עבודה';
    if (type === 'startup') return 'הפעלת אוצריא';
    return 'פעילות';
  }

  async function append(type, payload = {}) {
    const data = cleanPayload(payload);
    const now = Date.now();

    // Deduplicate noisy events that repeat immediately.
    const fingerprint = JSON.stringify([type, data.bookUid || data.bookId || data.book || '', data.index ?? '', data.screen || '', data.workspaceId || '']);
    if (lastEvent && lastEvent.fingerprint === fingerprint && now - lastEvent.time < 4000) return;
    lastEvent = { fingerprint, time: now };

    queue = queue.then(async () => {
      const settings = await get(SETTINGS_KEY, {});
      if (settings && settings.paused) return;
      const maxEvents = Math.max(200, Math.min(20000, Number(settings.maxEvents) || MAX_EVENTS_DEFAULT));
      const events = await get(EVENTS_KEY, []);
      const list = Array.isArray(events) ? events : [];
      const prev = list[list.length - 1];
      const sessionId = prev && (now - Number(prev.time || 0) < SESSION_GAP_MS)
        ? prev.sessionId
        : 's-' + now.toString(36);

      list.push({
        id: 'e-' + now.toString(36) + '-' + Math.random().toString(36).slice(2, 7),
        time: now,
        type,
        label: labelFor(type, data),
        sessionId,
        data
      });
      if (list.length > maxEvents) list.splice(0, list.length - maxEvents);
      await set(EVENTS_KEY, list);
    });
    return queue;
  }

  function wire() {
    Otzaria.on('navigation.changed', p => append('navigation', p));
    Otzaria.on('reader.current_book_changed', p => append('book', p));
    Otzaria.on('workspace.changed', p => append('workspace', p));
  }

  Otzaria.on('plugin.boot', async payload => {
    if (ready) return;
    ready = true;
    wire();
    await append('startup', {
      screen: payload && payload.app && payload.app.runMode === 'background' ? 'background' : 'foreground'
    });
  });
})();