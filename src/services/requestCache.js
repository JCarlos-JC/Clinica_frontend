import { CLINICAL_EVENTS, publishClinicalEvent } from './clinicalRealtime';
const LEGACY_STORAGE_PREFIX = 'request-cache:';
const SNAPSHOT_STORAGE_PREFIX = 'backend-snapshot:';
const inFlightRequests = new Map();

const storageAvailable = () => typeof window !== 'undefined' && window.localStorage;

const storageKey = (key) => `${SNAPSHOT_STORAGE_PREFIX}${key}`;

const removePersistentCache = (keyPrefix, prefix = SNAPSHOT_STORAGE_PREFIX) => {
  if (!storageAvailable()) return;

  Object.keys(window.localStorage).forEach((key) => {
    if (!key.startsWith(prefix)) return;
    const originalKey = key.slice(prefix.length);
    if (!keyPrefix || originalKey.startsWith(keyPrefix)) {
      window.localStorage.removeItem(key);
    }
  });
};

const removeLegacyCache = () => removePersistentCache(null, LEGACY_STORAGE_PREFIX);

const readSnapshot = (key, ttl = null, options = {}) => {
  if (!storageAvailable()) return null;

  try {
    const raw = window.localStorage.getItem(storageKey(key));
    if (!raw) return null;

    const entry = JSON.parse(raw);
    if (!options.allowStale && ttl && Date.now() - entry.timestamp >= ttl) {
      return null;
    }

    return entry.data;
  } catch (error) {
    window.localStorage.removeItem(storageKey(key));
    return null;
  }
};

const writeSnapshot = (key, data) => {
  if (!storageAvailable()) return data;

  try {
    window.localStorage.setItem(storageKey(key), JSON.stringify({
      data,
      timestamp: Date.now()
    }));
  } catch (error) {
    // Storage cheio ou bloqueado: seguimos apenas com os dados em memória do componente.
  }

  return data;
};

const emitInvalidation = (keyPrefix) => {
  if (typeof window === 'undefined') return;

  window.dispatchEvent(new CustomEvent('request-cache-invalidated', {
    detail: { keyPrefix: keyPrefix || null }
  }));
};

removeLegacyCache();

export const getCachedRequest = async (key, fetcher, options = {}) => {
  const requestKey = key || `request:${Date.now()}`;

  if (options.singleFlight !== false && inFlightRequests.has(requestKey)) {
    return inFlightRequests.get(requestKey);
  }

  const promise = Promise.resolve()
    .then(fetcher)
    .then((data) => {
      if (options.persist) writeSnapshot(requestKey, data);
      return data;
    })
    .finally(() => {
      inFlightRequests.delete(requestKey);
    });

  if (options.singleFlight !== false) {
    inFlightRequests.set(requestKey, promise);
  }

  return promise;
};

export const setCachedRequest = (key, data, options = {}) => {
  if (options.persist) writeSnapshot(key, data);
  return data;
};

export const peekCachedRequest = (key, ttl = null, options = {}) => readSnapshot(key, ttl, options);

export const invalidateCachedRequest = (keyPrefix) => {
  removePersistentCache(keyPrefix);
  emitInvalidation(keyPrefix);
  publishClinicalEvent(CLINICAL_EVENTS.DATA_CHANGED, { keyPrefix: keyPrefix || null });
};

export const clearRequestCache = () => {
  removePersistentCache();
  removeLegacyCache();
};
