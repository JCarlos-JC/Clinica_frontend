export const CLINICAL_EVENTS = {
  DATA_CHANGED: 'clinical_data_changed',
  TRIAGEM_CONCLUIDA: 'triagem_concluida',
  CONSULTA_FINALIZADA: 'consulta_finalizada',
  PAGAMENTO_REALIZADO: 'pagamento_realizado',
  EXAME_SOLICITADO: 'exame_solicitado',
  LABORATORIO_ATUALIZADO: 'laboratorio_atualizado',
};

const CHANNEL_NAME = 'clinica:clinical-events';
const STORAGE_KEY = 'clinica:last-clinical-event';
const SERVER_EVENT_ID_KEY = 'clinica:last-server-event-id';
const ENABLE_REMOTE_REALTIME = process.env.REACT_APP_ENABLE_REMOTE_REALTIME === 'true';
const DEFAULT_POLL_INTERVAL = Number(process.env.REACT_APP_REALTIME_POLL_INTERVAL || 30000);
const ERROR_POLL_INTERVAL = Number(process.env.REACT_APP_REALTIME_ERROR_INTERVAL || 60000);

let channel = null;
let pollingTimer = null;
let eventSource = null;
let realtimeStarted = false;
let lastServerEventId = (() => {
  if (typeof window === 'undefined') return 0;
  return Number(window.localStorage.getItem(SERVER_EVENT_ID_KEY) || 0) || 0;
})();

const getApiBaseUrl = () => (
  (process.env.REACT_APP_API_BASE_URL || (process.env.REACT_APP_API_URL || 'http://196.3.100.216/api').replace(/\/api\/?$/, '')).replace(/\/$/, '')
);

const getToken = () => {
  if (typeof window === 'undefined') return null;
  return window.localStorage.getItem('access_token') || window.localStorage.getItem('token');
};

const getChannel = () => {
  if (typeof window === 'undefined' || typeof window.BroadcastChannel === 'undefined') return null;
  if (!channel) channel = new window.BroadcastChannel(CHANNEL_NAME);
  return channel;
};

const emitClinicalEvent = (event) => {
  if (typeof window === 'undefined' || !event) return null;

  window.dispatchEvent(new CustomEvent('clinical:event', { detail: event }));

  const bc = getChannel();
  if (bc) bc.postMessage(event);

  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(event));
  } catch (error) {
    // localStorage pode estar bloqueado; window event/BroadcastChannel já cobrem o uso principal.
  }

  return event;
};

const normalizeEvent = (eventName, payload = {}) => ({
  id: `${Date.now()}-${Math.random().toString(36).slice(2)}`,
  eventName,
  payload,
  createdAt: new Date().toISOString(),
});

const resolveKeyPrefix = (eventName) => {
  if ([CLINICAL_EVENTS.CONSULTA_FINALIZADA].includes(eventName)) return 'consultas:';
  if ([CLINICAL_EVENTS.LABORATORIO_ATUALIZADO, CLINICAL_EVENTS.EXAME_SOLICITADO].includes(eventName)) return 'laboratorio:';
  if ([CLINICAL_EVENTS.TRIAGEM_CONCLUIDA, 'solicitacao_triagem_status_alterado'].includes(eventName)) return 'triagens:';
  return 'clinical-data:';
};

const persistLastServerEventId = (eventId) => {
  const numericId = Number(eventId);
  if (!Number.isFinite(numericId) || numericId <= lastServerEventId) return;

  lastServerEventId = numericId;
  try {
    window.localStorage.setItem(SERVER_EVENT_ID_KEY, String(lastServerEventId));
  } catch (error) {
    // O id em memória é suficiente até ao próximo reload.
  }
};

const buildLatestUrl = () => {
  const token = getToken();
  if (!token) return null;

  const url = new URL(`${getApiBaseUrl()}/api/pacientes/realtime/events/latest`);
  url.searchParams.set('token', token);
  url.searchParams.set('after_id', String(lastServerEventId || 0));
  url.searchParams.set('limit', '50');
  return url.toString();
};

const buildSseUrl = () => {
  const token = getToken();
  if (!token) return null;

  const url = new URL(`${getApiBaseUrl()}/api/pacientes/realtime/events`);
  url.searchParams.set('token', token);
  if (lastServerEventId) url.searchParams.set('last_id', String(lastServerEventId));
  return url.toString();
};

const publishServerEvent = (serverEvent) => {
  if (!serverEvent) return null;

  const eventName = serverEvent.eventName || serverEvent.event || CLINICAL_EVENTS.DATA_CHANGED;
  const payload = serverEvent.payload || {};
  const pacienteId = serverEvent.pacienteId || serverEvent.paciente_id || payload.paciente_id || payload.pacienteId;

  persistLastServerEventId(serverEvent.id);

  return emitClinicalEvent({
    id: `server-${serverEvent.id || Date.now()}`,
    eventName,
    payload: {
      ...payload,
      keyPrefix: payload.keyPrefix || resolveKeyPrefix(eventName),
      pacienteId,
      paciente_id: pacienteId,
      nid: serverEvent.nid || payload.nid,
      aggregateType: serverEvent.aggregateType || serverEvent.aggregate_type || payload.aggregateType || payload.aggregate_type,
      aggregateId: serverEvent.aggregateId || serverEvent.aggregate_id || payload.aggregateId || payload.aggregate_id,
      source: serverEvent.source || payload.source || 'patient-service',
    },
    createdAt: serverEvent.createdAt || serverEvent.created_at || new Date().toISOString(),
  });
};

const clearPollingTimer = () => {
  if (!pollingTimer) return;
  clearTimeout(pollingTimer);
  pollingTimer = null;
};

const schedulePolling = (delay = DEFAULT_POLL_INTERVAL) => {
  clearPollingTimer();
  if (!realtimeStarted || typeof window === 'undefined') return;
  pollingTimer = window.setTimeout(pollLatestEvents, delay);
};

async function pollLatestEvents() {
  if (!realtimeStarted || typeof window === 'undefined') return;

  const url = buildLatestUrl();
  if (!url) {
    stopClinicalRealtime();
    return;
  }

  try {
    const response = await fetch(url, {
      method: 'GET',
      headers: { Accept: 'application/json' },
      cache: 'no-store',
    });

    if (response.status === 401 || response.status === 403) {
      stopClinicalRealtime();
      return;
    }

    if (!response.ok) throw new Error(`Realtime polling falhou: ${response.status}`);

    const body = await response.json();
    const events = Array.isArray(body?.data) ? body.data : [];
    events.forEach(publishServerEvent);
    schedulePolling(DEFAULT_POLL_INTERVAL);
  } catch (error) {
    schedulePolling(ERROR_POLL_INTERVAL);
  }
}

const startSseRealtime = () => {
  if (typeof window === 'undefined' || typeof window.EventSource === 'undefined') return null;
  if (eventSource) return eventSource;

  const url = buildSseUrl();
  if (!url) return null;

  eventSource = new EventSource(url, { withCredentials: false });

  const handleServerMessage = (message) => {
    try {
      publishServerEvent(JSON.parse(message.data));
    } catch (error) {
      // Ignorar mensagens não JSON, incluindo pings/comentários SSE.
    }
  };

  eventSource.onmessage = handleServerMessage;
  [
    CLINICAL_EVENTS.DATA_CHANGED,
    CLINICAL_EVENTS.TRIAGEM_CONCLUIDA,
    CLINICAL_EVENTS.CONSULTA_FINALIZADA,
    CLINICAL_EVENTS.PAGAMENTO_REALIZADO,
    CLINICAL_EVENTS.EXAME_SOLICITADO,
    CLINICAL_EVENTS.LABORATORIO_ATUALIZADO,
    'paciente_status_alterado',
    'solicitacao_triagem_status_alterado',
  ].forEach((eventName) => {
    eventSource.addEventListener(eventName, handleServerMessage);
  });

  eventSource.onerror = () => {
    if (eventSource) {
      eventSource.close();
      eventSource = null;
    }
    schedulePolling(ERROR_POLL_INTERVAL);
  };

  return eventSource;
};

export const stopClinicalRealtime = () => {
  realtimeStarted = false;
  clearPollingTimer();

  if (eventSource) {
    eventSource.close();
    eventSource = null;
  }
};

export const startClinicalRealtime = () => {
  if (typeof window === 'undefined' || !ENABLE_REMOTE_REALTIME) return null;
  if (!getToken()) return null;
  if (realtimeStarted) return eventSource;

  realtimeStarted = true;

  if (process.env.REACT_APP_REALTIME_TRANSPORT === 'sse') {
    return startSseRealtime();
  }

  pollLatestEvents();
  return null;
};

export const publishClinicalEvent = (eventName, payload = {}) => {
  if (typeof window === 'undefined') return null;
  return emitClinicalEvent(normalizeEvent(eventName, payload));
};

export const subscribeClinicalEvents = (handler) => {
  if (typeof window === 'undefined' || typeof handler !== 'function') return () => {};

  const seen = new Set();

  const emitOnce = (event) => {
    if (!event?.id || seen.has(event.id)) return;
    seen.add(event.id);
    handler(event);
  };

  const handleWindowEvent = (event) => emitOnce(event.detail);
  const handleStorageEvent = (event) => {
    if (event.key !== STORAGE_KEY || !event.newValue) return;
    try {
      emitOnce(JSON.parse(event.newValue));
    } catch (error) {
      // Ignorar payload inválido.
    }
  };

  const bc = getChannel();
  const handleBroadcastMessage = (event) => emitOnce(event.data);

  window.addEventListener('clinical:event', handleWindowEvent);
  window.addEventListener('storage', handleStorageEvent);
  if (bc) bc.addEventListener('message', handleBroadcastMessage);

  return () => {
    window.removeEventListener('clinical:event', handleWindowEvent);
    window.removeEventListener('storage', handleStorageEvent);
    if (bc) bc.removeEventListener('message', handleBroadcastMessage);
  };
};
