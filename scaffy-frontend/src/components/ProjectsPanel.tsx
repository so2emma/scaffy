import React, { useState, useEffect, useMemo } from 'react';
import {
  X, Search, Star, Clock, Folder, MoreVertical, RotateCcw, Trash2, Edit2, Copy,
  ChevronDown, Save, Plus, FolderKanban, Loader2, Sparkles
} from 'lucide-react';
import { useAuthStore } from '../store/useAuthStore';
import { useDiagramStore } from '../store/useDiagramStore';
import { useToast } from '../hooks/useToast';
import { AVAILABLE_FRAMEWORKS } from './FrameworkSelectorModal';

interface ProjectsPanelProps {
  isOpen: boolean;
  onClose: () => void;
}

interface ProjectSummary {
  id: string;
  name: string;
  description?: string;
  targetFramework?: string;
  isFavorited: boolean;
  entityCount: number;
  lastAccessedAt: string;
  updatedAt: string;
  createdAt: string;
}

interface VersionSummary {
  id: string;
  versionNumber: number;
  note?: string;
  createdAt: string;
}

const API = 'http://localhost:8080';

export function timeAgo(dateStr: string | Date): string {
  if (!dateStr) return '';
  const seconds = Math.floor((Date.now() - new Date(dateStr).getTime()) / 1000);
  if (seconds < 60) return 'just now';
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
}

export const ProjectsPanel: React.FC<ProjectsPanelProps> = ({ isOpen, onClose }) => {
  const { user, currentProjectId, setCurrentProject, setIsCloudSaved } = useAuthStore();
  const { getDiagramSchema, importDiagram, autoLayout } = useDiagramStore();
  const { showToast } = useToast();

  const [visible, setVisible] = useState(false);
  const [animating, setAnimating] = useState(false);
  const [activeTab, setActiveTab] = useState<'all' | 'favorites' | 'recent'>('all');
  const [search, setSearch] = useState('');
  const [projects, setProjects] = useState<ProjectSummary[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  // Dropdown & Modal states
  const [isSaveDropdownOpen, setIsSaveDropdownOpen] = useState(false);
  const [isNameModalOpen, setIsNameModalOpen] = useState(false);
  const [newProjectName, setNewProjectName] = useState('');
  const [newProjectDesc, setNewProjectDesc] = useState('');
  const [isSubmittingSave, setIsSubmittingSave] = useState(false);

  // Rename modal
  const [renamingProject, setRenamingProject] = useState<ProjectSummary | null>(null);
  const [renameValue, setRenameValue] = useState('');

  // Active menu dropdown for a project card
  const [openMenuId, setOpenMenuId] = useState<string | null>(null);

  // Version history sub-panel state
  const [versionHistoryProject, setVersionHistoryProject] = useState<ProjectSummary | null>(null);
  const [versions, setVersions] = useState<VersionSummary[]>([]);
  const [isLoadingVersions, setIsLoadingVersions] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setVisible(true);
      requestAnimationFrame(() => {
        requestAnimationFrame(() => setAnimating(true));
      });
      fetchProjects(activeTab);
    } else {
      setAnimating(false);
      const timer = setTimeout(() => {
        setVisible(false);
        setSearch('');
        setOpenMenuId(null);
        setVersionHistoryProject(null);
      }, 250);
      return () => clearTimeout(timer);
    }
  }, [isOpen, activeTab]);

  useEffect(() => {
    const handleEsc = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        if (versionHistoryProject) {
          setVersionHistoryProject(null);
        } else if (isNameModalOpen) {
          setIsNameModalOpen(false);
        } else if (renamingProject) {
          setRenamingProject(null);
        } else {
          onClose();
        }
      }
    };
    window.addEventListener('keydown', handleEsc);
    return () => window.removeEventListener('keydown', handleEsc);
  }, [isOpen, versionHistoryProject, isNameModalOpen, renamingProject, onClose]);

  const fetchProjects = async (filter: 'all' | 'favorites' | 'recent') => {
    if (!user) return;
    setIsLoading(true);
    try {
      const res = await fetch(`${API}/api/projects?filter=${filter}`, {
        credentials: 'include',
      });
      if (res.ok) {
        const data = await res.json();
        setProjects(data);
      }
    } catch (err) {
      console.error('Failed to fetch projects:', err);
      showToast('Failed to load projects', 'error');
    } finally {
      setIsLoading(false);
    }
  };

  const filteredProjects = useMemo(() => {
    if (!search.trim()) return projects;
    const q = search.toLowerCase();
    return projects.filter(
      (p) =>
        p.name.toLowerCase().includes(q) ||
        (p.description && p.description.toLowerCase().includes(q))
    );
  }, [projects, search]);

  const handleSaveCurrent = async (forceNew = false) => {
    setIsSaveDropdownOpen(false);
    if (!user) {
      showToast('Please sign in to save your project', 'warning');
      return;
    }

    const schema = getDiagramSchema();
    if (currentProjectId && !forceNew) {
      // Overwrite existing project
      setIsSubmittingSave(true);
      try {
        const res = await fetch(`${API}/api/projects/${currentProjectId}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'include',
          body: JSON.stringify({
            name: schema.projectName,
            diagramJson: JSON.stringify(schema),
            targetFramework: schema.targetFramework,
            entityCount: schema.entities?.length ?? 0,
            versionNote: 'Manual Save',
          }),
        });
        if (res.ok) {
          setIsCloudSaved(true);
          showToast('Project saved to cloud', 'success');
          fetchProjects(activeTab);
        } else {
          showToast('Failed to save project', 'error');
        }
      } catch (err) {
        console.error(err);
        showToast('Error saving project', 'error');
      } finally {
        setIsSubmittingSave(false);
      }
    } else {
      // Prompt for name for new project
      setNewProjectName(schema.projectName || 'My Project');
      setNewProjectDesc('');
      setIsNameModalOpen(true);
    }
  };

  const handleCreateNewProjectSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newProjectName.trim()) return;

    setIsSubmittingSave(true);
    try {
      const schema = getDiagramSchema();
      schema.projectName = newProjectName;

      const res = await fetch(`${API}/api/projects`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          name: newProjectName,
          description: newProjectDesc,
          diagramJson: JSON.stringify(schema),
          targetFramework: schema.targetFramework,
          entityCount: schema.entities?.length ?? 0,
          versionNote: 'Initial Save',
        }),
      });

      if (res.ok) {
        const proj = await res.json();
        setCurrentProject(proj.id, proj.name);
        setIsCloudSaved(true);
        showToast(`Project "${proj.name}" created`, 'success');
        setIsNameModalOpen(false);
        fetchProjects(activeTab);
      } else {
        showToast('Failed to create project', 'error');
      }
    } catch (err) {
      console.error(err);
      showToast('Error creating project', 'error');
    } finally {
      setIsSubmittingSave(false);
    }
  };

  const handleOpenProject = async (proj: ProjectSummary) => {
    try {
      const res = await fetch(`${API}/api/projects/${proj.id}`, {
        credentials: 'include',
      });
      if (res.ok) {
        const fullProj = await res.json();
        const diagramData = JSON.parse(fullProj.diagramJson);
        importDiagram(diagramData);
        autoLayout();
        setCurrentProject(fullProj.id, fullProj.name);
        setIsCloudSaved(true);
        showToast(`Loaded project: ${fullProj.name}`, 'success');
        onClose();
      } else {
        showToast('Failed to load project details', 'error');
      }
    } catch (err) {
      console.error(err);
      showToast('Error opening project', 'error');
    }
  };

  const handleToggleFavorite = async (e: React.MouseEvent, proj: ProjectSummary) => {
    e.stopPropagation();
    try {
      const res = await fetch(`${API}/api/projects/${proj.id}/favorite`, {
        method: 'PATCH',
        credentials: 'include',
      });
      if (res.ok) {
        const updated = await res.json();
        setProjects((prev) =>
          prev.map((p) => (p.id === proj.id ? { ...p, isFavorited: updated.isFavorited } : p))
        );
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleDeleteProject = async (proj: ProjectSummary) => {
    setOpenMenuId(null);
    if (!window.confirm(`Delete project "${proj.name}"? This action cannot be undone.`)) return;

    try {
      const res = await fetch(`${API}/api/projects/${proj.id}`, {
        method: 'DELETE',
        credentials: 'include',
      });
      if (res.ok) {
        if (currentProjectId === proj.id) {
          setCurrentProject(null, null);
        }
        showToast('Project deleted', 'info');
        setProjects((prev) => prev.filter((p) => p.id !== proj.id));
      }
    } catch (err) {
      console.error(err);
      showToast('Failed to delete project', 'error');
    }
  };

  const handleDuplicateProject = async (proj: ProjectSummary) => {
    setOpenMenuId(null);
    try {
      const getRes = await fetch(`${API}/api/projects/${proj.id}`, { credentials: 'include' });
      if (!getRes.ok) return;
      const fullProj = await getRes.json();

      const postRes = await fetch(`${API}/api/projects`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          name: `${fullProj.name} (Copy)`,
          description: fullProj.description,
          diagramJson: fullProj.diagramJson,
          targetFramework: fullProj.targetFramework,
          entityCount: fullProj.entityCount,
          versionNote: 'Duplicated from ' + fullProj.name,
        }),
      });

      if (postRes.ok) {
        showToast('Project duplicated', 'success');
        fetchProjects(activeTab);
      }
    } catch (err) {
      console.error(err);
      showToast('Failed to duplicate project', 'error');
    }
  };

  const handleRenameProjectSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!renamingProject || !renameValue.trim()) return;

    try {
      const res = await fetch(`${API}/api/projects/${renamingProject.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ name: renameValue }),
      });
      if (res.ok) {
        showToast('Project renamed', 'success');
        if (currentProjectId === renamingProject.id) {
          setCurrentProject(renamingProject.id, renameValue);
        }
        setRenamingProject(null);
        fetchProjects(activeTab);
      }
    } catch (err) {
      console.error(err);
      showToast('Failed to rename project', 'error');
    }
  };

  const handleOpenVersions = async (proj: ProjectSummary) => {
    setOpenMenuId(null);
    setVersionHistoryProject(proj);
    setIsLoadingVersions(true);
    try {
      const res = await fetch(`${API}/api/projects/${proj.id}/versions`, {
        credentials: 'include',
      });
      if (res.ok) {
        const data = await res.json();
        setVersions(data);
      }
    } catch (err) {
      console.error(err);
      showToast('Failed to load version history', 'error');
    } finally {
      setIsLoadingVersions(false);
    }
  };

  const handleRestoreVersion = async (ver: VersionSummary) => {
    if (!versionHistoryProject) return;
    const confirmed = window.confirm(
      `Restore v${ver.versionNumber}? Your current changes will be saved as a new version snapshot first.`
    );
    if (!confirmed) return;

    try {
      const res = await fetch(
        `${API}/api/projects/${versionHistoryProject.id}/versions/${ver.versionNumber}/restore`,
        {
          method: 'POST',
          credentials: 'include',
        }
      );
      if (res.ok) {
        // Fetch full restored project to import
        const projRes = await fetch(`${API}/api/projects/${versionHistoryProject.id}`, {
          credentials: 'include',
        });
        if (projRes.ok) {
          const fullProj = await projRes.json();
          importDiagram(JSON.parse(fullProj.diagramJson));
          autoLayout();
          setCurrentProject(fullProj.id, fullProj.name);
          setIsCloudSaved(true);
          showToast(`Restored to version v${ver.versionNumber}`, 'success');
          setVersionHistoryProject(null);
          onClose();
        }
      }
    } catch (err) {
      console.error(err);
      showToast('Failed to restore version', 'error');
    }
  };

  if (!visible) return null;

  return (
    <div className="fixed inset-0 z-50 overflow-hidden">
      {/* Dark Backdrop */}
      <div
        className={`absolute inset-0 bg-black/60 backdrop-blur-sm transition-opacity duration-300 ${
          animating ? 'opacity-100' : 'opacity-0'
        }`}
        onClick={onClose}
      />

      {/* Main Slide-over Panel */}
      <div
        className={`absolute inset-y-0 right-0 flex w-full max-w-md flex-col border-l border-border bg-surface shadow-2xl transition-transform duration-300 ${
          animating ? 'translate-x-0' : 'translate-x-full'
        }`}
      >
        {/* Header Row */}
        <div className="flex items-center justify-between border-b border-border p-4 sm:p-5">
          <div className="flex items-center gap-2">
            <FolderKanban size={20} className="text-primary" />
            <h2 className="font-display text-base font-semibold text-content">My Projects</h2>
          </div>

          <div className="flex items-center gap-2">
            {/* Save Current Dropdown */}
            <div className="relative">
              <button
                type="button"
                onClick={() => setIsSaveDropdownOpen(!isSaveDropdownOpen)}
                className="btn btn-primary !py-1.5 !text-xs"
              >
                <Save size={14} />
                <span>Save Current</span>
                <ChevronDown size={12} />
              </button>

              {isSaveDropdownOpen && (
                <div className="absolute right-0 top-9 z-20 w-44 rounded-xl border border-border bg-surface p-1 shadow-xl">
                  <button
                    type="button"
                    onClick={() => handleSaveCurrent(false)}
                    className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-xs font-medium text-content hover:bg-surface-2"
                  >
                    <Save size={14} className="text-primary" />
                    <span>Save {currentProjectId ? '' : '(As New)'}</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => handleSaveCurrent(true)}
                    className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-xs font-medium text-content hover:bg-surface-2"
                  >
                    <Plus size={14} className="text-primary" />
                    <span>Save as New...</span>
                  </button>
                </div>
              )}
            </div>

            <button
              onClick={onClose}
              className="flex h-8 w-8 items-center justify-center rounded-lg border border-border text-muted hover:bg-surface-2 hover:text-content"
            >
              <X size={18} />
            </button>
          </div>
        </div>

        {/* Filter Tabs */}
        <div className="flex border-b border-border bg-surface-2 px-4 py-2">
          {(['all', 'favorites', 'recent'] as const).map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`flex-1 rounded-lg py-1.5 text-xs font-semibold capitalize transition-all ${
                activeTab === tab
                  ? 'bg-surface text-content shadow-sm'
                  : 'text-muted hover:text-content'
              }`}
            >
              {tab === 'favorites' ? '⭐ Favorites' : tab === 'recent' ? '🕐 Recent' : 'All'}
            </button>
          ))}
        </div>

        {/* Search Bar */}
        <div className="relative p-4 pb-2">
          <Search size={15} className="pointer-events-none absolute left-7 top-6 text-subtle" />
          <input
            type="text"
            placeholder="Search projects..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="input !pl-9 !text-xs"
          />
        </div>

        {/* Project List */}
        <div className="scroll-thin flex-1 overflow-y-auto p-4 pt-2">
          {isLoading ? (
            <div className="flex flex-col items-center justify-center py-16 text-xs text-muted">
              <Loader2 size={24} className="animate-spin text-primary" />
              <span className="mt-2">Loading projects...</span>
            </div>
          ) : filteredProjects.length === 0 ? (
            <div className="flex flex-col items-center justify-center gap-3 py-16 text-center text-xs text-muted">
              <Folder size={40} className="text-subtle opacity-30" />
              <span>
                {search
                  ? `No projects found for "${search}"`
                  : activeTab === 'favorites'
                  ? 'No favorited projects yet'
                  : activeTab === 'recent'
                  ? 'No recent projects'
                  : 'No projects saved yet.'}
              </span>
            </div>
          ) : (
            <div className="flex flex-col gap-3">
              {filteredProjects.map((proj) => {
                const fw = AVAILABLE_FRAMEWORKS.find((f) => f.id === proj.targetFramework);
                const fwColor = fw?.color ?? '#16a34a';

                return (
                  <div
                    key={proj.id}
                    className={`group relative flex flex-col rounded-xl border p-4 transition-all hover:border-primary/50 hover:shadow-md ${
                      currentProjectId === proj.id
                        ? 'border-primary bg-primary/5'
                        : 'border-border bg-surface'
                    }`}
                  >
                    {/* Card Top Row */}
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex items-center gap-2">
                        {fw && (
                          <span
                            className="rounded-md px-2 py-0.5 text-[0.65rem] font-bold uppercase tracking-wider"
                            style={{
                              background: `color-mix(in srgb, ${fwColor} 15%, transparent)`,
                              color: fwColor,
                            }}
                          >
                            {fw.displayName}
                          </span>
                        )}
                        {currentProjectId === proj.id && (
                          <span className="rounded-md bg-primary/20 px-2 py-0.5 text-[0.65rem] font-bold text-primary">
                            Active
                          </span>
                        )}
                      </div>

                      <div className="flex items-center gap-1">
                        <button
                          type="button"
                          onClick={(e) => handleToggleFavorite(e, proj)}
                          className={`p-1 text-muted transition-colors hover:text-amber-400 ${
                            proj.isFavorited ? 'text-amber-400' : ''
                          }`}
                          title="Toggle favorite"
                        >
                          <Star size={16} fill={proj.isFavorited ? 'currentColor' : 'none'} />
                        </button>

                        <div className="relative">
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              setOpenMenuId(openMenuId === proj.id ? null : proj.id);
                            }}
                            className="p-1 text-muted transition-colors hover:text-content"
                          >
                            <MoreVertical size={16} />
                          </button>

                          {openMenuId === proj.id && (
                            <div className="absolute right-0 top-6 z-30 w-40 rounded-xl border border-border bg-surface p-1 shadow-xl">
                              <button
                                type="button"
                                onClick={() => {
                                  setOpenMenuId(null);
                                  handleOpenProject(proj);
                                }}
                                className="flex w-full items-center gap-2 rounded-lg px-2.5 py-1.5 text-left text-xs text-content hover:bg-surface-2"
                              >
                                <Folder size={14} className="text-primary" /> Open
                              </button>
                              <button
                                type="button"
                                onClick={() => {
                                  setOpenMenuId(null);
                                  setRenamingProject(proj);
                                  setRenameValue(proj.name);
                                }}
                                className="flex w-full items-center gap-2 rounded-lg px-2.5 py-1.5 text-left text-xs text-content hover:bg-surface-2"
                              >
                                <Edit2 size={14} /> Rename
                              </button>
                              <button
                                type="button"
                                onClick={() => handleDuplicateProject(proj)}
                                className="flex w-full items-center gap-2 rounded-lg px-2.5 py-1.5 text-left text-xs text-content hover:bg-surface-2"
                              >
                                <Copy size={14} /> Duplicate
                              </button>
                              <button
                                type="button"
                                onClick={() => handleOpenVersions(proj)}
                                className="flex w-full items-center gap-2 rounded-lg px-2.5 py-1.5 text-left text-xs text-content hover:bg-surface-2"
                              >
                                <RotateCcw size={14} /> Version History
                              </button>
                              <div className="my-1 border-t border-border" />
                              <button
                                type="button"
                                onClick={() => handleDeleteProject(proj)}
                                className="flex w-full items-center gap-2 rounded-lg px-2.5 py-1.5 text-left text-xs text-red-500 hover:bg-red-500/10"
                              >
                                <Trash2 size={14} /> Delete
                              </button>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Content */}
                    <div
                      className="mt-2 cursor-pointer"
                      onClick={() => handleOpenProject(proj)}
                    >
                      <h3 className="font-display text-sm font-semibold text-content group-hover:text-primary">
                        {proj.name}
                      </h3>
                      {proj.description && (
                        <p className="mt-0.5 line-clamp-2 text-xs text-muted">
                          {proj.description}
                        </p>
                      )}
                    </div>

                    {/* Footer */}
                    <div className="mt-3 flex items-center justify-between text-[0.7rem] text-muted">
                      <span>{proj.entityCount} entities</span>
                      <span>Opened {timeAgo(proj.lastAccessedAt || proj.updatedAt)}</span>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* Version History Sub-Panel */}
      {versionHistoryProject && (
        <div className="absolute inset-y-0 right-0 z-50 flex w-full max-w-md flex-col border-l border-border bg-surface shadow-2xl animate-in slide-in-from-right duration-200">
          <div className="flex items-center justify-between border-b border-border p-4">
            <div className="flex items-center gap-2">
              <RotateCcw size={18} className="text-primary" />
              <div>
                <h3 className="font-display text-sm font-semibold text-content">Version History</h3>
                <p className="text-[0.7rem] text-muted">{versionHistoryProject.name}</p>
              </div>
            </div>
            <button
              onClick={() => setVersionHistoryProject(null)}
              className="flex h-8 w-8 items-center justify-center rounded-lg border border-border text-muted hover:bg-surface-2 hover:text-content"
            >
              <X size={16} />
            </button>
          </div>

          <div className="scroll-thin flex-1 overflow-y-auto p-4">
            {isLoadingVersions ? (
              <div className="flex flex-col items-center justify-center py-16 text-xs text-muted">
                <Loader2 size={24} className="animate-spin text-primary" />
                <span className="mt-2">Loading versions...</span>
              </div>
            ) : versions.length === 0 ? (
              <div className="py-12 text-center text-xs text-muted">No version history found.</div>
            ) : (
              <div className="flex flex-col gap-2.5">
                {versions.map((ver) => (
                  <div
                    key={ver.id}
                    className="flex items-center justify-between rounded-xl border border-border bg-surface-2 p-3 text-xs"
                  >
                    <div className="flex flex-col gap-0.5">
                      <div className="flex items-center gap-2">
                        <span className="font-semibold text-content">v{ver.versionNumber}</span>
                        {ver.note && (
                          <span className="rounded bg-surface px-1.5 py-0.5 text-[0.65rem] text-muted">
                            {ver.note}
                          </span>
                        )}
                      </div>
                      <span className="text-[0.68rem] text-subtle">{timeAgo(ver.createdAt)}</span>
                    </div>

                    <button
                      type="button"
                      onClick={() => handleRestoreVersion(ver)}
                      className="btn btn-secondary !px-2.5 !py-1 !text-xs"
                    >
                      <RotateCcw size={12} /> Restore
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Name Project Dialog (Save As New) */}
      {isNameModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
          <div className="w-full max-w-sm rounded-2xl border border-border bg-surface p-5 shadow-2xl">
            <h3 className="font-display text-base font-semibold text-content">Name your project</h3>
            <form onSubmit={handleCreateNewProjectSubmit} className="mt-4 flex flex-col gap-3">
              <div>
                <label className="field-label">Project Name</label>
                <input
                  type="text"
                  className="input mt-1"
                  value={newProjectName}
                  onChange={(e) => setNewProjectName(e.target.value)}
                  placeholder="My E-Commerce Service"
                  autoFocus
                  required
                />
              </div>

              <div>
                <label className="field-label">Description (optional)</label>
                <input
                  type="text"
                  className="input mt-1"
                  value={newProjectDesc}
                  onChange={(e) => setNewProjectDesc(e.target.value)}
                  placeholder="Microservice architecture"
                />
              </div>

              <div className="mt-2 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsNameModalOpen(false)}
                  className="btn btn-secondary !py-1.5 !text-xs"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmittingSave}
                  className="btn btn-primary !py-1.5 !text-xs"
                >
                  {isSubmittingSave ? 'Saving...' : 'Save Project'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Rename Project Dialog */}
      {renamingProject && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
          <div className="w-full max-w-sm rounded-2xl border border-border bg-surface p-5 shadow-2xl">
            <h3 className="font-display text-base font-semibold text-content">Rename Project</h3>
            <form onSubmit={handleRenameProjectSubmit} className="mt-4 flex flex-col gap-3">
              <input
                type="text"
                className="input"
                value={renameValue}
                onChange={(e) => setRenameValue(e.target.value)}
                autoFocus
                required
              />
              <div className="mt-2 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setRenamingProject(null)}
                  className="btn btn-secondary !py-1.5 !text-xs"
                >
                  Cancel
                </button>
                <button type="submit" className="btn btn-primary !py-1.5 !text-xs">
                  Rename
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
