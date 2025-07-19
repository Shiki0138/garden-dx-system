import { useState, useEffect } from 'react';
import { supabase, dbClient } from '../lib/supabase';
import { useSupabaseAuth } from '../contexts/SupabaseAuthContext';

// カスタムフック：見積データ管理
export const useEstimates = () => {
  const { companyId } = useSupabaseAuth();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const createEstimate = async estimateData => {
    setLoading(true);
    setError(null);

    try {
      // 見積番号生成
      const estimateNumber = `EST-${Date.now()}`;

      // 見積作成
      const { data: estimate, error: estimateError } = await dbClient.estimates.create({
        ...estimateData,
        company_id: companyId,
        estimate_number: estimateNumber,
      });

      if (estimateError) throw estimateError;

      // 見積項目作成
      if (estimateData.items && estimateData.items.length > 0) {
        const { error: itemsError } = await dbClient.estimateItems.createMany(
          estimateData.items.map((item, index) => ({
            ...item,
            estimate_id: estimate.id,
            sort_order: index,
          }))
        );

        if (itemsError) throw itemsError;
      }

      return { data: estimate, error: null };
    } catch (err) {
      setError(err);
      return { data: null, error: err };
    } finally {
      setLoading(false);
    }
  };

  const getEstimates = async (filters = {}) => {
    setLoading(true);
    setError(null);

    try {
      const { data, error } = await dbClient.estimates.list(companyId, filters);
      if (error) throw error;

      return { data, error: null };
    } catch (err) {
      setError(err);
      return { data: null, error: err };
    } finally {
      setLoading(false);
    }
  };

  const getEstimate = async id => {
    setLoading(true);
    setError(null);

    try {
      const { data, error } = await dbClient.estimates.get(id);
      if (error) throw error;

      return { data, error: null };
    } catch (err) {
      setError(err);
      return { data: null, error: err };
    } finally {
      setLoading(false);
    }
  };

  const updateEstimate = async (id, updates) => {
    setLoading(true);
    setError(null);

    try {
      // 見積更新
      const { data: estimate, error: estimateError } = await dbClient.estimates.update(id, updates);
      if (estimateError) throw estimateError;

      // 項目更新がある場合
      if (updates.items) {
        const { error: itemsError } = await dbClient.estimateItems.updateMany(
          id,
          updates.items.map((item, index) => ({
            ...item,
            sort_order: index,
          }))
        );

        if (itemsError) throw itemsError;
      }

      return { data: estimate, error: null };
    } catch (err) {
      setError(err);
      return { data: null, error: err };
    } finally {
      setLoading(false);
    }
  };

  const deleteEstimate = async id => {
    setLoading(true);
    setError(null);

    try {
      const { error } = await dbClient.estimates.delete(id);
      if (error) throw error;

      return { error: null };
    } catch (err) {
      setError(err);
      return { error: err };
    } finally {
      setLoading(false);
    }
  };

  return {
    loading,
    error,
    createEstimate,
    getEstimates,
    getEstimate,
    updateEstimate,
    deleteEstimate,
  };
};

// カスタムフック：顧客データ管理
export const useClients = () => {
  const { companyId } = useSupabaseAuth();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [clients, setClients] = useState([]);

  useEffect(() => {
    if (companyId) {
      fetchClients();
    }
  }, [companyId]);

  const fetchClients = async () => {
    setLoading(true);
    setError(null);

    try {
      const { data, error } = await dbClient.clients.list(companyId);
      if (error) throw error;

      setClients(data || []);
    } catch (err) {
      setError(err);
    } finally {
      setLoading(false);
    }
  };

  const createClient = async clientData => {
    setLoading(true);
    setError(null);

    try {
      const { data, error } = await dbClient.clients.create({
        ...clientData,
        company_id: companyId,
      });

      if (error) throw error;

      await fetchClients();
      return { data, error: null };
    } catch (err) {
      setError(err);
      return { data: null, error: err };
    } finally {
      setLoading(false);
    }
  };

  const updateClient = async (id, updates) => {
    setLoading(true);
    setError(null);

    try {
      const { data, error } = await dbClient.clients.update(id, updates);
      if (error) throw error;

      await fetchClients();
      return { data, error: null };
    } catch (err) {
      setError(err);
      return { data: null, error: err };
    } finally {
      setLoading(false);
    }
  };

  const deleteClient = async id => {
    setLoading(true);
    setError(null);

    try {
      const { error } = await dbClient.clients.delete(id);
      if (error) throw error;

      await fetchClients();
      return { error: null };
    } catch (err) {
      setError(err);
      return { error: err };
    } finally {
      setLoading(false);
    }
  };

  return {
    clients,
    loading,
    error,
    createClient,
    updateClient,
    deleteClient,
    refetch: fetchClients,
  };
};

// カスタムフック：プロジェクトデータ管理
export const useProjects = () => {
  const { companyId } = useSupabaseAuth();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const createProject = async projectData => {
    setLoading(true);
    setError(null);

    try {
      const projectNumber = `PRJ-${Date.now()}`;

      const { data, error } = await dbClient.projects.create({
        ...projectData,
        company_id: companyId,
        project_number: projectNumber,
      });

      if (error) throw error;

      return { data, error: null };
    } catch (err) {
      setError(err);
      return { data: null, error: err };
    } finally {
      setLoading(false);
    }
  };

  const getProjects = async (filters = {}) => {
    setLoading(true);
    setError(null);

    try {
      const { data, error } = await dbClient.projects.list(companyId, filters);
      if (error) throw error;

      return { data, error: null };
    } catch (err) {
      setError(err);
      return { data: null, error: err };
    } finally {
      setLoading(false);
    }
  };

  const getProject = async id => {
    setLoading(true);
    setError(null);

    try {
      const { data, error } = await dbClient.projects.get(id);
      if (error) throw error;

      return { data, error: null };
    } catch (err) {
      setError(err);
      return { data: null, error: err };
    } finally {
      setLoading(false);
    }
  };

  const updateProject = async (id, updates) => {
    setLoading(true);
    setError(null);

    try {
      const { data, error } = await dbClient.projects.update(id, updates);
      if (error) throw error;

      return { data, error: null };
    } catch (err) {
      setError(err);
      return { data: null, error: err };
    } finally {
      setLoading(false);
    }
  };

  return {
    loading,
    error,
    createProject,
    getProjects,
    getProject,
    updateProject,
  };
};

// カスタムフック：項目テンプレート管理
export const useItemTemplates = () => {
  const { companyId } = useSupabaseAuth();
  const [templates, setTemplates] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (companyId) {
      fetchTemplates();
    }
  }, [companyId]);

  const fetchTemplates = async () => {
    setLoading(true);
    setError(null);

    try {
      const { data, error } = await dbClient.itemTemplates.list(companyId);
      if (error) throw error;

      setTemplates(data || []);
    } catch (err) {
      setError(err);
    } finally {
      setLoading(false);
    }
  };

  const createTemplate = async templateData => {
    setLoading(true);
    setError(null);

    try {
      const { data, error } = await dbClient.itemTemplates.create({
        ...templateData,
        company_id: companyId,
      });

      if (error) throw error;

      await fetchTemplates();
      return { data, error: null };
    } catch (err) {
      setError(err);
      return { data: null, error: err };
    } finally {
      setLoading(false);
    }
  };

  const updateTemplate = async (id, updates) => {
    setLoading(true);
    setError(null);

    try {
      const { data, error } = await dbClient.itemTemplates.update(id, updates);
      if (error) throw error;

      await fetchTemplates();
      return { data, error: null };
    } catch (err) {
      setError(err);
      return { data: null, error: err };
    } finally {
      setLoading(false);
    }
  };

  return {
    templates,
    loading,
    error,
    createTemplate,
    updateTemplate,
    refetch: fetchTemplates,
  };
};
