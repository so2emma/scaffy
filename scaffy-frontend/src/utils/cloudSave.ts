import { useAuthStore } from '../store/useAuthStore';
import { useDiagramStore } from '../store/useDiagramStore';

export async function autoSaveCurrentProjectToCloud(): Promise<string | null> {
  const { user, currentProjectId, setCurrentProject, setIsCloudSaved } = useAuthStore.getState();
  if (!user) return null;

  const schema = useDiagramStore.getState().getDiagramSchema();
  const projectName = useDiagramStore.getState().projectName || 'My Project';

  if (!currentProjectId) {
    // Create new project automatically for the authenticated user
    try {
      const res = await fetch('http://localhost:8080/api/projects', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          name: projectName,
          description: 'Saved on file download',
          diagramJson: JSON.stringify(schema),
          targetFramework: schema.targetFramework,
          entityCount: schema.entities?.length ?? 0,
          versionNote: 'Initial save on file download',
        }),
      });
      if (res.ok) {
        const proj = await res.json();
        setCurrentProject(proj.id, proj.name);
        setIsCloudSaved(true);
        return proj.id;
      }
    } catch (err) {
      console.error('Failed to auto-save project to cloud:', err);
    }
  } else {
    // Sync latest changes to existing project
    try {
      const res = await fetch(`http://localhost:8080/api/projects/${currentProjectId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          name: projectName,
          diagramJson: JSON.stringify(schema),
          targetFramework: schema.targetFramework,
          entityCount: schema.entities?.length ?? 0,
          versionNote: 'Auto-save on file download',
        }),
      });
      if (res.ok) {
        setIsCloudSaved(true);
      }
    } catch (err) {
      console.error('Failed to sync project to cloud:', err);
    }
    return currentProjectId;
  }
  return null;
}
