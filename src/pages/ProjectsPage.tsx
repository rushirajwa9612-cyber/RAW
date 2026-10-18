import { useEffect, useState } from 'react';
import { FolderOpen, Plus, Trash2 } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { useToast } from '@/context/ToastContext';
import { supabase } from '@/lib/supabase';
import type { Project } from '@/types/database';
import { Button } from '@/components/ui/Button';
import { LoadingState, EmptyState } from '@/components/ui/Feedback';
import { Dialog } from '@/components/ui/Dialog';
import { Input } from '@/components/ui/Input';

export function ProjectsPage() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const [createOpen, setCreateOpen] = useState(false);
  const [newName, setNewName] = useState('');
  const [newDesc, setNewDesc] = useState('');
  const [creating, setCreating] = useState(false);

  useEffect(() => {
    async function load() {
      if (!user) return;
      const { data } = await supabase
        .from('projects')
        .select('*')
        .eq('user_id', user.id)
        .order('updated_at', { ascending: false });
      setProjects((data as Project[]) ?? []);
      setLoading(false);
    }
    load();
  }, [user]);

  async function createProject() {
    if (!user || !newName.trim()) return;
    setCreating(true);
    const { data, error } = await supabase
      .from('projects')
      .insert({ user_id: user.id, name: newName.trim(), description: newDesc || null })
      .select()
      .single();
    if (error) {
      toast('Failed to create project.', 'error');
      setCreating(false);
      return;
    }
    setProjects((prev) => [data as Project, ...prev]);
    setNewName('');
    setNewDesc('');
    setCreateOpen(false);
    toast('Project created.', 'success');
    setCreating(false);
  }

  async function deleteProject(id: string) {
    const { error } = await supabase.from('projects').delete().eq('id', id);
    if (error) {
      toast('Failed to delete project.', 'error');
      return;
    }
    setProjects((prev) => prev.filter((p) => p.id !== id));
    toast('Project deleted.', 'success');
  }

  if (loading) return <LoadingState message="Loading projects..." />;

  return (
    <div className="p-6 lg:p-8 max-w-7xl mx-auto">
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="font-display text-2xl font-bold text-[var(--text-primary)] flex items-center gap-2">
            <FolderOpen className="h-6 w-6 text-[var(--accent)]" />
            Projects
          </h1>
          <p className="mt-1 text-sm text-[var(--text-secondary)]">Organize your creative work into projects.</p>
        </div>
        <Button size="sm" onClick={() => setCreateOpen(true)}>
          <Plus className="h-4 w-4" />
          New Project
        </Button>
      </div>

      {projects.length === 0 ? (
        <EmptyState
          icon={<FolderOpen className="h-12 w-12" />}
          title="No projects yet"
          description="Create a project to organize your generations and creative work."
          action={<Button size="sm" onClick={() => setCreateOpen(true)}><Plus className="h-4 w-4" /> Create Project</Button>}
        />
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
          {projects.map((project) => (
            <div key={project.id} className="card card-hover p-5 group">
              <div className="flex items-start justify-between">
                <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-[var(--accent-soft)]">
                  <FolderOpen className="h-6 w-6 text-[var(--accent)]" />
                </div>
                <button
                  onClick={() => deleteProject(project.id)}
                  className="text-[var(--text-tertiary)] hover:text-[var(--error)] transition-colors opacity-0 group-hover:opacity-100"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
              <h3 className="mt-3 font-display text-lg font-semibold text-[var(--text-primary)]">{project.name}</h3>
              {project.description && <p className="mt-1 text-sm text-[var(--text-secondary)] line-clamp-2">{project.description}</p>}
              <p className="mt-3 text-xs text-[var(--text-tertiary)]">Updated {new Date(project.updated_at).toLocaleDateString()}</p>
            </div>
          ))}
        </div>
      )}

      <Dialog open={createOpen} onClose={() => setCreateOpen(false)} title="New Project">
        <div className="space-y-4">
          <Input
            label="Project Name"
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            placeholder="My Creative Project"
            autoFocus
          />
          <div>
            <label className="text-sm font-medium text-[var(--text-secondary)] mb-1.5 block">Description <span className="text-[var(--text-tertiary)]">(optional)</span></label>
            <textarea
              value={newDesc}
              onChange={(e) => setNewDesc(e.target.value)}
              placeholder="What is this project about?"
              rows={3}
              className="input resize-none"
            />
          </div>
          <div className="flex justify-end gap-3">
            <Button variant="secondary" size="sm" onClick={() => setCreateOpen(false)}>Cancel</Button>
            <Button size="sm" onClick={createProject} loading={creating} disabled={!newName.trim()}>
              <Plus className="h-4 w-4" />
              Create
            </Button>
          </div>
        </div>
      </Dialog>
    </div>
  );
}
