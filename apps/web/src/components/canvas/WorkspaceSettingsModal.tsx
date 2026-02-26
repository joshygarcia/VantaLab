import { useState } from 'react';
import { X } from 'lucide-react';

type WorkspaceSettingsModalProps = {
  workspaceId: string;
  isOpen: boolean;
  onClose: () => void;
};

export function WorkspaceSettingsModal({ workspaceId, isOpen, onClose }: WorkspaceSettingsModalProps) {
  const [apiKey, setApiKey] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);

  if (!isOpen) {
    return null;
  }

  const handleSave = async () => {
    setSaving(true);
    setError('');
    setSuccess(false);

    try {
      const devJwt = process.env.NEXT_PUBLIC_DEV_JWT;
      const devFallbackUserId = process.env.NEXT_PUBLIC_DEV_USER_ID ?? 'dev-user';
      const apiBase = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:4000/api/v1';

      let token = devJwt;
      if (!token) {
        const tokenResponse = await fetch(`${apiBase}/auth/dev-token`, {
          method: 'POST',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify({
            userId: devFallbackUserId,
            workspaceIds: [workspaceId]
          })
        });

        if (tokenResponse.ok) {
          const body = await tokenResponse.json();
          token = body.accessToken;
        }
      }

      if (!token) {
        throw new Error('Could not acquire auth token');
      }

      const response = await fetch(`${apiBase}/workspaces/${workspaceId}/settings`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({ kieApiKey: apiKey })
      });

      if (!response.ok) {
        throw new Error('Failed to save settings');
      }

      setSuccess(true);
      setTimeout(() => {
        onClose();
        setSuccess(false);
      }, 1400);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error saving settings');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[1000] flex items-center justify-center bg-black/70 px-4 backdrop-blur-sm">
      <div className="w-full max-w-[520px] overflow-hidden rounded-xl border border-white/10 bg-ink-950 shadow-panel">
        <div className="flex items-center justify-between border-b border-white/5 px-6 py-5">
          <h2 className="text-xl font-medium text-white">Workspace Settings</h2>
          <button
            className="inline-flex h-8 w-8 items-center justify-center rounded-md text-zinc-400 transition-colors duration-200 hover:bg-white/10 hover:text-white"
            onClick={onClose}
            type="button"
            aria-label="Close settings"
          >
            <X size={16} />
          </button>
        </div>

        <div className="px-6 py-6">
          <p className="mb-6 text-sm leading-relaxed text-zinc-400">
            Configure external provider access for this workspace.
          </p>

          <label className="text-xs font-semibold uppercase tracking-[0.08em] text-zinc-500">
            Kie.ai API Key
            <input
              type="password"
              placeholder="sk-..."
              value={apiKey}
              onChange={(event) => setApiKey(event.target.value)}
              className="mt-2 h-10 w-full rounded-md border border-white/10 bg-ink-900 px-3 text-sm text-white outline-none transition-colors duration-200 placeholder:text-zinc-500 focus:border-white/20 focus:ring-1 focus:ring-white/20 ring-offset-2 ring-offset-black"
            />
          </label>

          {error ? <div className="mt-3 text-sm text-rose-300">{error}</div> : null}
          {success ? <div className="mt-3 text-sm text-emerald-300">Settings saved!</div> : null}
        </div>

        <div className="flex justify-end gap-3 border-t border-white/5 px-6 py-5">
          <button
            className="inline-flex min-w-[80px] h-9 items-center justify-center rounded-md border border-white/10 bg-transparent px-4 text-sm font-medium text-white transition-colors duration-200 hover:bg-white/5"
            onClick={onClose}
            disabled={saving}
            type="button"
          >
            Cancel
          </button>
          <button
            className="inline-flex min-w-[120px] h-9 items-center justify-center rounded-md bg-white px-4 text-sm font-medium text-ink-950 transition-colors duration-200 hover:bg-zinc-200 disabled:cursor-not-allowed disabled:opacity-50"
            onClick={handleSave}
            disabled={saving || !apiKey}
            type="button"
          >
            {saving ? 'Saving...' : 'Save Settings'}
          </button>
        </div>
      </div>
    </div>
  );
}
