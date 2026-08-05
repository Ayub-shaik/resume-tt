"use client";

import { useCallback, useEffect, useState } from "react";

type DriveItem = {
  id?: string | null;
  name?: string | null;
  mimeType?: string | null;
  kind: "folder" | "file";
};

type Crumb = { id: string; name: string };

export function DriveBrowserModal({
  open,
  googleEmail,
  onClose,
  onImport,
}: {
  open: boolean;
  googleEmail?: string | null;
  onClose: () => void;
  onImport: (fileId: string, name: string) => Promise<void>;
}) {
  const [folderId, setFolderId] = useState("root");
  const [crumbs, setCrumbs] = useState<Crumb[]>([
    { id: "root", name: "My Drive" },
  ]);
  const [items, setItems] = useState<DriveItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [importing, setImporting] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const loadFolder = useCallback(async (id: string) => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(
        `/api/drive?folderId=${encodeURIComponent(id)}`,
      );
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Could not open folder");
      setFolderId(data.folderId || id);
      setCrumbs(data.breadcrumbs || [{ id: "root", name: "My Drive" }]);
      setItems(data.items || []);
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
      setItems([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!open) return;
    setFolderId("root");
    void loadFolder("root");
  }, [open, loadFolder]);

  useEffect(() => {
    if (!open) return;
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div className="drive-modal" role="dialog" aria-modal="true" aria-label="Google Drive">
      <button
        type="button"
        className="drive-modal__backdrop"
        aria-label="Close"
        onClick={onClose}
      />
      <div className="drive-modal__panel">
        <header className="drive-modal__head">
          <div>
            <p className="drive-modal__title">Google Drive</p>
            <p className="drive-modal__sub">
              Browse folders · pick a resume file
              {googleEmail ? ` · ${googleEmail}` : ""}
            </p>
          </div>
          <button type="button" className="drive-modal__close" onClick={onClose}>
            Close
          </button>
        </header>

        <nav className="drive-modal__crumbs" aria-label="Folder path">
          {crumbs.map((c, i) => (
            <span key={`${c.id}-${i}`} className="drive-modal__crumb">
              {i > 0 && <span className="drive-modal__sep">/</span>}
              <button
                type="button"
                disabled={loading || c.id === folderId}
                onClick={() => void loadFolder(c.id)}
              >
                {c.name}
              </button>
            </span>
          ))}
        </nav>

        <div className="drive-modal__body">
          {loading && <p className="drive-modal__hint">Loading…</p>}
          {error && <p className="drive-modal__error">{error}</p>}
          {!loading && !error && items.length === 0 && (
            <p className="drive-modal__hint">
              This folder has no resume files or subfolders.
            </p>
          )}
          <ul className="drive-modal__list">
            {items.map((item) => {
              const id = item.id || "";
              const name = item.name || "Untitled";
              const isFolder = item.kind === "folder";
              return (
                <li key={id}>
                  <button
                    type="button"
                    className="drive-modal__row"
                    disabled={Boolean(importing) || loading}
                    onClick={() => {
                      if (isFolder) {
                        void loadFolder(id);
                        return;
                      }
                      setImporting(id);
                      void onImport(id, name)
                        .catch((e) =>
                          setError(e instanceof Error ? e.message : String(e)),
                        )
                        .finally(() => setImporting(null));
                    }}
                  >
                    <span
                      className={
                        isFolder
                          ? "drive-modal__badge drive-modal__badge--folder"
                          : "drive-modal__badge"
                      }
                    >
                      {isFolder ? "Folder" : "File"}
                    </span>
                    <span className="drive-modal__name">{name}</span>
                    <span className="drive-modal__meta">
                      {importing === id
                        ? "Importing…"
                        : isFolder
                          ? "Open"
                          : "Import"}
                    </span>
                  </button>
                </li>
              );
            })}
          </ul>
        </div>
      </div>
    </div>
  );
}
