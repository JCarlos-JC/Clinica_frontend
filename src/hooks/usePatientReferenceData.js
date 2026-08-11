import { useCallback, useEffect, useRef, useState } from 'react';
import patientService from '../services/patientService';
import { getCachedRequest, peekCachedRequest, setCachedRequest } from '../services/requestCache';

const unwrapReferenceItems = (payload) => {
  if (Array.isArray(payload)) return payload;
  if (Array.isArray(payload?.data)) return payload.data;
  if (Array.isArray(payload?.data?.data)) return payload.data.data;
  if (Array.isArray(payload?.items)) return payload.items;
  if (Array.isArray(payload?.results)) return payload.results;
  return [];
};

const normalizeReferenceList = (payload) => (
  unwrapReferenceItems(payload)
    .map((item) => ({
      ...item,
      id: item?.id ?? item?.value ?? item?.codigo,
      nome: item?.nome ?? item?.label ?? item?.descricao ?? item?.name
    }))
    .filter((item) => item.id !== undefined && item.id !== null && item.nome)
);

const usePatientReferenceData = () => {
  const snapshot = peekCachedRequest('patient-references:base', null, { persist: true, allowStale: true });
  const hasSnapshot = Boolean(snapshot);
  const [references, setReferences] = useState(snapshot || {
    racas: [],
    tiposUtentes: [],
    unidadesOrganicas: [],
    tiposDocumentos: [],
    provincias: [],
    distritos: [],
    bairros: [],
    grausParentesco: []
  });
  const [loading, setLoading] = useState(!hasSnapshot);
  const [loadingDistritos, setLoadingDistritos] = useState(false);
  const [loadingBairros, setLoadingBairros] = useState(false);
  const [error, setError] = useState(null);
  const referencesRef = useRef(references);

  const applyReferences = useCallback((updater) => {
    setReferences((current) => {
      const next = typeof updater === 'function' ? updater(current) : updater;
      referencesRef.current = next;
      return next;
    });
  }, []);

  const loadReferences = useCallback(async () => {
    if (!hasSnapshot) setLoading(true);
    setError(null);

    try {
      const resources = [
        ['racas', 'racas'],
        ['tiposUtentes', 'tipos-utentes'],
        ['unidadesOrganicas', 'unidades-organicas'],
        ['tiposDocumentos', 'tipos-documentos'],
        ['provincias', 'provincias'],
        ['grausParentesco', 'graus-parentesco']
      ];
      const responses = await Promise.all(
        resources.map(([, resource]) => getCachedRequest(
          `patient-references:${resource}`,
          () => patientService.getReferenceData(resource),
          { persist: true }
        ))
      );

      const nextReferences = resources.reduce(
        (next, [key], index) => ({
          ...next,
          [key]: normalizeReferenceList(responses[index])
        }),
        referencesRef.current
      );

      applyReferences(nextReferences);
      setCachedRequest('patient-references:base', nextReferences, { persist: true });
    } catch (requestError) {
      setError(requestError);
    } finally {
      setLoading(false);
    }
  }, [applyReferences, hasSnapshot]);

  const loadDistritos = useCallback(async (provinciaId) => {
    applyReferences((current) => ({ ...current, distritos: [], bairros: [] }));
    if (provinciaId === undefined || provinciaId === null || provinciaId === '') return [];

    setLoadingDistritos(true);
    try {
      const items = normalizeReferenceList(
        await getCachedRequest(`patient-references:distritos:${provinciaId}`, () => patientService.getReferenceData('distritos', { provincia_id: provinciaId }), { persist: true })
      );
      applyReferences((current) => ({ ...current, distritos: items }));
      return items;
    } finally {
      setLoadingDistritos(false);
    }
  }, [applyReferences]);

  const loadBairros = useCallback(async (distritoId) => {
    applyReferences((current) => ({ ...current, bairros: [] }));
    if (distritoId === undefined || distritoId === null || distritoId === '') return [];

    setLoadingBairros(true);
    try {
      const items = normalizeReferenceList(
        await getCachedRequest(`patient-references:bairros:${distritoId}`, () => patientService.getReferenceData('bairros', { distrito_id: distritoId }), { persist: true })
      );
      applyReferences((current) => ({ ...current, bairros: items }));
      return items;
    } finally {
      setLoadingBairros(false);
    }
  }, [applyReferences]);

  useEffect(() => {
    loadReferences();
  }, [loadReferences]);

  return {
    ...references,
    loading,
    loadingDistritos,
    loadingBairros,
    error,
    reload: loadReferences,
    loadDistritos,
    loadBairros
  };
};

export default usePatientReferenceData;
