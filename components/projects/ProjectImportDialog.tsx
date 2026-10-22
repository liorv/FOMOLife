import { useState } from "react";
import type { ProjectSubproject } from "@myorg/types";
import { validateProjectImportJson, type ValidatedImportProject } from "@/lib/projects/importProject";

interface ProjectImportDialogProps {
  projectName: string;
  onClose: () => void;
  onImport: (subprojects: ProjectSubproject[]) => void;
}

export default function ProjectImportDialog({
  projectName,
  onClose,
  onImport,
}: ProjectImportDialogProps) {
  const [jsonText, setJsonText] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [preview, setPreview] = useState<{
    data: ValidatedImportProject;
    stats: { subprojectCount: number; taskCount: number };
  } | null>(null);

  const handleFileSelected = (file: File) => {
    const reader = new FileReader();
    reader.onload = () => {
      const text = typeof reader.result === "string" ? reader.result : "";
      setJsonText(text);
      setError(null);
      setPreview(null);
    };
    reader.readAsText(file);
  };

  const handlePreview = () => {
    const result = validateProjectImportJson(jsonText);
    if (!result.ok || !result.data || !result.stats) {
      setError(result.error ?? "Invalid project JSON.");
      setPreview(null);
      return;
    }
    setError(null);
    setPreview({ data: result.data, stats: result.stats });
  };

  const handleConfirm = () => {
    if (!preview) return;
    onImport(preview.data.subprojects);
    onClose();
  };

  return (
    <div className="project-overview-modal-overlay" onClick={onClose}>
      <div className="project-overview-modal" onClick={(event) => event.stopPropagation()} style={{ maxWidth: 520 }}>
        <div className="project-overview-modal-header">
          <h2>Import into {projectName}</h2>
          <button className="project-overview-modal-close" onClick={onClose} title="Close">
            <span className="material-icons">close</span>
          </button>
        </div>
        <div className="project-overview-modal-content">
          {!preview ? (
            <>
              <p style={{ marginTop: 0, fontSize: 13, color: "var(--text-secondary)" }}>
                Select or paste a project JSON file matching the format produced by &quot;Export&quot;.
                Its sub-projects and tasks will be added into <strong>{projectName}</strong>.
              </p>
              <input
                type="file"
                accept="application/json,.json"
                onChange={(event) => {
                  const file = event.target.files?.[0];
                  if (file) handleFileSelected(file);
                  event.target.value = "";
                }}
                style={{ marginBottom: 12 }}
              />
              <textarea
                value={jsonText}
                onChange={(event) => {
                  setJsonText(event.target.value);
                  setError(null);
                }}
                placeholder='{"name": "My project", "sub_projects": [...]}'
                rows={10}
                style={{
                  width: "100%",
                  boxSizing: "border-box",
                  padding: "10px 12px",
                  borderRadius: 8,
                  border: "1px solid var(--border-color, #d0d5dd)",
                  fontSize: 13,
                  fontFamily: "monospace",
                  resize: "vertical",
                }}
              />
              {error && (
                <p style={{ color: "#d33b27", fontSize: 13, marginTop: 8 }} role="alert">{error}</p>
              )}
              <div style={{ display: "flex", justifyContent: "flex-end", gap: 8, marginTop: 16 }}>
                <button
                  onClick={onClose}
                  style={{ padding: "8px 16px", borderRadius: 8, border: "1px solid var(--border-color, #d0d5dd)", background: "white", cursor: "pointer", fontSize: 14 }}
                >
                  Cancel
                </button>
                <button
                  onClick={handlePreview}
                  disabled={!jsonText.trim()}
                  style={{
                    padding: "8px 16px",
                    borderRadius: 8,
                    border: "none",
                    background: !jsonText.trim() ? "#a5b4fc" : "var(--accent-primary, #4f46e5)",
                    color: "white",
                    cursor: !jsonText.trim() ? "not-allowed" : "pointer",
                    fontSize: 14,
                    fontWeight: 600,
                  }}
                >
                  Preview
                </button>
              </div>
            </>
          ) : (
            <>
              <p style={{ marginTop: 0, fontSize: 13, color: "var(--text-secondary)" }}>
                Adding into <strong>{projectName}</strong>:
              </p>
              <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 8 }}>
                {preview.stats.subprojectCount} sub-project{preview.stats.subprojectCount === 1 ? "" : "s"}, {preview.stats.taskCount} task{preview.stats.taskCount === 1 ? "" : "s"}
              </div>
              <ul style={{ listStyle: "none", padding: 0, margin: 0, maxHeight: 320, overflowY: "auto" }}>
                {preview.data.subprojects.map((subproject) => (
                  <li key={subproject.id} style={{ padding: "8px 0", borderBottom: "1px solid var(--border-color, #eee)" }}>
                    <div style={{ fontWeight: 600, fontSize: 14 }}>{subproject.text}</div>
                    {subproject.tasks.length > 0 && (
                      <ul style={{ listStyle: "none", padding: 0, margin: "4px 0 0 12px" }}>
                        {subproject.tasks.map((task) => (
                          <li key={task.id} style={{ fontSize: 13, color: "var(--text-secondary)", padding: "2px 0" }}>
                            • {task.text}
                          </li>
                        ))}
                      </ul>
                    )}
                  </li>
                ))}
              </ul>
              <div style={{ display: "flex", justifyContent: "flex-end", gap: 8, marginTop: 16 }}>
                <button
                  onClick={() => setPreview(null)}
                  style={{ padding: "8px 16px", borderRadius: 8, border: "1px solid var(--border-color, #d0d5dd)", background: "white", cursor: "pointer", fontSize: 14 }}
                >
                  Back
                </button>
                <button
                  onClick={handleConfirm}
                  style={{ padding: "8px 16px", borderRadius: 8, border: "none", background: "var(--accent-primary, #4f46e5)", color: "white", cursor: "pointer", fontSize: 14, fontWeight: 600 }}
                >
                  Confirm Import
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
