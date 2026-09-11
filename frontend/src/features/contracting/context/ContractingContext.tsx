import React, { createContext, useContext, useState, useEffect, useCallback, useMemo } from 'react';
import { useSearchParams } from 'react-router-dom';
import { contractingApi } from '../api/contracting.api';
import type { ContractingProject, ContractingSummaryKpis } from '../contracting.types';

interface ContractingContextType {
  projects: ContractingProject[];
  selectedProjectId: string | null;
  setSelectedProjectId: (id: string | null) => void;
  activeProject: ContractingProject | null;
  kpis: ContractingSummaryKpis | null;
  loading: boolean;
  reloadProjects: () => Promise<void>;
  isCreateProjectOpen: boolean;
  setIsCreateProjectOpen: (open: boolean) => void;
}

const ContractingContext = createContext<ContractingContextType | null>(null);

export function ContractingProvider({ children }: { children: React.ReactNode }) {
  const [searchParams, setSearchParams] = useSearchParams();
  const projectParam = searchParams.get('projectId');

  const [projects, setProjects] = useState<ContractingProject[]>([]);
  const [selectedProjectId, setSelectedProjectIdState] = useState<string | null>(projectParam || null);
  const [kpis, setKpis] = useState<ContractingSummaryKpis | null>(null);
  const [loading, setLoading] = useState(false);
  const [isCreateProjectOpen, setIsCreateProjectOpen] = useState(false);

  // Sync selected project with URL search param
  const setSelectedProjectId = useCallback((id: string | null) => {
    setSelectedProjectIdState(id);
    setSearchParams(
      (prev) => {
        const next = new URLSearchParams(prev);
        if (id) {
          next.set('projectId', id);
        } else {
          next.delete('projectId');
        }
        return next;
      },
      { replace: true }
    );
  }, [setSearchParams]);

  // Keep internal state in sync if URL param changes externally
  useEffect(() => {
    if (projectParam && projectParam !== selectedProjectId) {
      setSelectedProjectIdState(projectParam);
    }
  }, [projectParam, selectedProjectId]);

  const reloadProjects = useCallback(async () => {
    try {
      setLoading(true);
      const allProjects = await contractingApi.getProjects();
      setProjects(allProjects);

      const computedKpis: ContractingSummaryKpis = allProjects.reduce(
        (acc: ContractingSummaryKpis, p: ContractingProject) => ({
          totalContractValue: acc.totalContractValue + Number(p.revisedContractValue || p.contractValue || 0),
          totalBilledToDate: acc.totalBilledToDate + Number(p.totalBilledClient || 0),
          totalRetentionsHeld: acc.totalRetentionsHeld + Number(p.retentionTotalHeld || 0),
          activeProjectsCount: acc.activeProjectsCount + (p.status === 'active' ? 1 : 0),
        }),
        { totalContractValue: 0, totalBilledToDate: 0, totalRetentionsHeld: 0, activeProjectsCount: 0 }
      );
      setKpis(computedKpis);

      // Auto-select first project if none selected yet
      setSelectedProjectIdState((current) => {
        if (!current && allProjects.length > 0) {
          return projectParam || allProjects[0].id;
        }
        return current;
      });
    } catch (err) {
      console.error('Failed to load contracting projects:', err);
    } finally {
      setLoading(false);
    }
  }, [projectParam]);

  useEffect(() => {
    void reloadProjects();
  }, []);

  const activeProject = useMemo(() => {
    return projects.find((p) => p.id === selectedProjectId) || null;
  }, [projects, selectedProjectId]);

  const value = useMemo(
    () => ({
      projects,
      selectedProjectId,
      setSelectedProjectId,
      activeProject,
      kpis,
      loading,
      reloadProjects,
      isCreateProjectOpen,
      setIsCreateProjectOpen,
    }),
    [projects, selectedProjectId, setSelectedProjectId, activeProject, kpis, loading, reloadProjects, isCreateProjectOpen]
  );

  return <ContractingContext.Provider value={value}>{children}</ContractingContext.Provider>;
}

export function useContracting() {
  const ctx = useContext(ContractingContext);
  if (!ctx) {
    throw new Error('useContracting must be used within a ContractingProvider');
  }
  return ctx;
}
