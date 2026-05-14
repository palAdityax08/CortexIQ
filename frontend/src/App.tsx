import { useEffect, useRef, useState, useCallback } from "react";
import * as THREE from "three";
import {
  FileText, Globe, FileUp, Mic, Video, Image,
  Loader2, Trash2, Send, Sparkles, MessageSquare, BookOpen,
} from "lucide-react";

const API_BASE: string = import.meta.env.VITE_API_URL ?? "https://cortexiq-sz4g.onrender.com";

// ── Types ─────────────────────────────────────────────────────────────────────
interface Projection { x: number; y: number; z: number; }
interface SpacePoint {
  id: string; source_id: string; title: string; modality: string;
  projection: Projection; color: string; score?: number; preview?: string; text?: string;
}
interface RackSource {
  id: string; title: string; modality: string; summary: string; chunks: number;
}
interface SpaceSnapshot {
  sources: RackSource[]; points: SpacePoint[];
  provider: string; dimensions: number; model: string;
}
interface TraceStep { agent: string; status: string; detail: string; }
interface AskResponse {
  answer: string; matches: SpacePoint[]; query_point: SpacePoint;
  trace: TraceStep[]; space: SpaceSnapshot;
}

// ── Modality Icon ─────────────────────────────────────────────────────────────
function ModalityIcon({ modality, size = 14 }: { modality: string; size?: number }) {
  const p = { size, strokeWidth: 2 };
  if (modality === "url") return <Globe {...p} />;
  if (modality === "pdf") return <BookOpen {...p} />;
  if (modality === "image") return <Image {...p} />;
  if (modality === "audio") return <Mic {...p} />;
  if (modality === "video") return <Video {...p} />;
  return <FileText {...p} />;
}

// ── 3D Canvas ─────────────────────────────────────────────────────────────────
function EmbeddingCanvas({
  points, queryPoint, matchIds, onHover,
}: {
  points: SpacePoint[]; queryPoint: SpacePoint | null;
  matchIds: Set<string>; onHover: (p: SpacePoint | null) => void;
}) {
  const mountRef = useRef<HTMLDivElement>(null);
  const onHoverRef = useRef(onHover);
  const threeRef = useRef<{
    renderer: THREE.WebGLRenderer; scene: THREE.Scene; camera: THREE.PerspectiveCamera;
    mouse: THREE.Vector2; raycaster: THREE.Raycaster;
    meshes: { mesh: THREE.Mesh; point: SpacePoint }[];
    frameId: number; angle: number;
  } | null>(null);

  useEffect(() => { onHoverRef.current = onHover; }, [onHover]);

  // Setup Three.js once
  useEffect(() => {
    const el = mountRef.current;
    if (!el) return;

    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.setSize(el.clientWidth || 600, el.clientHeight || 400);
    el.appendChild(renderer.domElement);

    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(55, (el.clientWidth || 600) / (el.clientHeight || 400), 0.01, 100);
    camera.position.set(0, 0, 6.5);

    scene.add(new THREE.AmbientLight(0xffffff, 0.7));
    const dir = new THREE.DirectionalLight(0xffffff, 1.2);
    dir.position.set(5, 8, 5);
    scene.add(dir);

    const grid = new THREE.GridHelper(6, 12, 0x2a2b22, 0x1a1b14);
    grid.position.y = -2.8;
    scene.add(grid);

    const axisMat = new THREE.LineBasicMaterial({ color: 0x424336, transparent: true, opacity: 0.4 });
    const mkAxis = (a: THREE.Vector3, b: THREE.Vector3) =>
      new THREE.Line(new THREE.BufferGeometry().setFromPoints([a, b]), axisMat);
    scene.add(mkAxis(new THREE.Vector3(-3,0,0), new THREE.Vector3(3,0,0)));
    scene.add(mkAxis(new THREE.Vector3(0,-3,0), new THREE.Vector3(0,3,0)));
    scene.add(mkAxis(new THREE.Vector3(0,0,-3), new THREE.Vector3(0,0,3)));

    const raycaster = new THREE.Raycaster();
    const mouse = new THREE.Vector2(-9999, -9999);

    const state = { renderer, scene, camera, mouse, raycaster, meshes: [] as { mesh: THREE.Mesh; point: SpacePoint }[], frameId: 0, angle: 0 };
    threeRef.current = state;

    let lastHovered: SpacePoint | null = null;

    const animate = () => {
      state.angle += 0.003;
      state.camera.position.x = Math.sin(state.angle) * 6.5;
      state.camera.position.z = Math.cos(state.angle) * 6.5;
      state.camera.lookAt(0, 0, 0);

      state.raycaster.setFromCamera(state.mouse, state.camera);
      const hits = state.raycaster.intersectObjects(state.meshes.map(m => m.mesh));
      const found = hits.length > 0 ? (state.meshes.find(m => m.mesh === hits[0].object)?.point ?? null) : null;
      if (found !== lastHovered) { lastHovered = found; onHoverRef.current(found); }

      state.renderer.render(state.scene, state.camera);
      state.frameId = requestAnimationFrame(animate);
    };
    state.frameId = requestAnimationFrame(animate);

    const ro = new ResizeObserver(() => {
      if (!el || !threeRef.current) return;
      const w = el.clientWidth; const h = el.clientHeight;
      threeRef.current.renderer.setSize(w, h);
      threeRef.current.camera.aspect = w / h;
      threeRef.current.camera.updateProjectionMatrix();
    });
    ro.observe(el);

    const onMove = (e: MouseEvent) => {
      if (!el || !threeRef.current) return;
      const r = el.getBoundingClientRect();
      threeRef.current.mouse.x = ((e.clientX - r.left) / r.width) * 2 - 1;
      threeRef.current.mouse.y = -((e.clientY - r.top) / r.height) * 2 + 1;
    };
    const onLeave = () => { if (threeRef.current) threeRef.current.mouse.set(-9999, -9999); };
    el.addEventListener("mousemove", onMove);
    el.addEventListener("mouseleave", onLeave);

    return () => {
      cancelAnimationFrame(state.frameId);
      state.renderer.dispose();
      ro.disconnect();
      el.removeEventListener("mousemove", onMove);
      el.removeEventListener("mouseleave", onLeave);
      if (el.contains(renderer.domElement)) el.removeChild(renderer.domElement);
      threeRef.current = null;
    };
  }, []);

  // Update meshes when data changes
  useEffect(() => {
    const state = threeRef.current;
    if (!state) return;

    state.meshes.forEach(({ mesh }) => { state.scene.remove(mesh); mesh.geometry.dispose(); });
    state.meshes = [];

    const all = queryPoint ? [...points, queryPoint] : points;
    all.forEach(p => {
      const isQuery = p.modality === "query";
      const isMatch = matchIds.has(p.id) || matchIds.has(p.source_id);
      const r = isQuery ? 0.18 : isMatch ? 0.15 : 0.1;
      const col = new THREE.Color(p.color || "#94a3b8");
      const mesh = new THREE.Mesh(
        new THREE.SphereGeometry(r, 20, 20),
        new THREE.MeshStandardMaterial({ color: col, emissive: col, emissiveIntensity: isMatch || isQuery ? 0.5 : 0.18, roughness: 0.3, metalness: 0.2 })
      );
      mesh.position.set(p.projection.x, p.projection.y, p.projection.z);
      state.scene.add(mesh);
      state.meshes.push({ mesh, point: p });
    });
  }, [points, queryPoint, matchIds]);

  return <div ref={mountRef} className="vector-canvas" />;
}

// ── Answer Renderer ───────────────────────────────────────────────────────────
function AnswerContent({ text }: { text: string }) {
  const lines = text.split("\n").filter(Boolean);
  return (
    <div className="answer-content">
      {lines.map((line, i) => {
        if (/^[-•]\s/.test(line)) return <p key={i} style={{ margin: "4px 0" }}>• {line.replace(/^[-•]\s*/, "")}</p>;
        if (/^(key points|##)/i.test(line)) return <h3 key={i}>{line.replace(/^#+\s*/, "").replace(/:$/, "")}</h3>;
        return <p key={i}>{line}</p>;
      })}
    </div>
  );
}

// ── Main App ──────────────────────────────────────────────────────────────────
type AddTab = "text" | "url" | "file";

export default function App() {
  const [health, setHealth] = useState<{ adk: boolean; sources: number; dimensions: number } | null>(null);
  const [space, setSpace] = useState<SpaceSnapshot | null>(null);
  const [addTab, setAddTab] = useState<AddTab>("text");
  const [titleInput, setTitleInput] = useState("");
  const [textInput, setTextInput] = useState("");
  const [urlInput, setUrlInput] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [fileNotes, setFileNotes] = useState("");
  const [addBusy, setAddBusy] = useState(false);
  const [addStatus, setAddStatus] = useState<{ kind: "success" | "error"; msg: string } | null>(null);
  const [question, setQuestion] = useState("");
  const [asking, setAsking] = useState(false);
  const [askResult, setAskResult] = useState<AskResponse | null>(null);
  const [askError, setAskError] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [hovered, setHovered] = useState<SpacePoint | null>(null);

  useEffect(() => {
    fetch(`${API_BASE}/health`).then(r => r.json()).then(setHealth).catch(() => {});
    fetch(`${API_BASE}/space`).then(r => r.json()).then(setSpace).catch(() => {});
  }, []);

  const handleAdd = async () => {
    setAddBusy(true); setAddStatus(null);
    try {
      let res: Response;
      if (addTab === "text") {
        res = await fetch(`${API_BASE}/sources/text`, {
          method: "POST", headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ title: titleInput, text: textInput }),
        });
      } else if (addTab === "url") {
        res = await fetch(`${API_BASE}/sources/url`, {
          method: "POST", headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ url: urlInput, title: titleInput || null }),
        });
      } else {
        if (!file) return;
        const fd = new FormData();
        fd.append("file", file); fd.append("title", titleInput); fd.append("notes", fileNotes);
        res = await fetch(`${API_BASE}/sources/file`, { method: "POST", body: fd });
      }
      const data = await res.json();
      if (!res.ok) throw new Error(data.detail ?? JSON.stringify(data));
      setSpace(data.space);
      setAddStatus({ kind: "success", msg: `"${data.source.title}" added — ${data.source.chunks} chunk(s).` });
      setTitleInput(""); setTextInput(""); setUrlInput(""); setFile(null); setFileNotes("");
    } catch (e) {
      setAddStatus({ kind: "error", msg: e instanceof Error ? e.message : String(e) });
    } finally { setAddBusy(false); }
  };

  const handleDelete = useCallback(async (id: string) => {
    setDeletingId(id);
    try {
      const res = await fetch(`${API_BASE}/sources/${id}`, { method: "DELETE" });
      const data = await res.json();
      if (!res.ok) throw new Error(data.detail ?? "Delete failed");
      setSpace(data.space);
    } catch (e) { alert(e instanceof Error ? e.message : String(e)); }
    finally { setDeletingId(null); }
  }, []);

  const handleAsk = async () => {
    if (!question.trim()) return;
    setAsking(true); setAskError(null); setAskResult(null);
    try {
      const res = await fetch(`${API_BASE}/ask`, {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ question }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.detail ?? JSON.stringify(data));
      setAskResult(data); setSpace(data.space);
    } catch (e) {
      setAskError(e instanceof Error ? e.message : String(e));
    } finally { setAsking(false); }
  };

  const onHover = useCallback((p: SpacePoint | null) => setHovered(p), []);
  const sources = space?.sources ?? [];
  const displayPoints = askResult?.space?.points ?? space?.points ?? [];
  const queryPoint = askResult?.query_point ?? null;
  const matchIds = new Set<string>(askResult?.matches?.flatMap(m => [m.id, m.source_id]) ?? []);

  const addDisabled = addBusy
    || (addTab === "text" && (!titleInput.trim() || !textInput.trim()))
    || (addTab === "url" && !urlInput.trim())
    || (addTab === "file" && !file);

  return (
    <div className="app-shell">
      {/* Topbar */}
      <header className="topbar">
        <div
          className="brand"
          style={{
            display: "flex",
            alignItems: "center",
            gap: "12px",
          }}
        >
          
          {/* Logo */}
          <img
            src="/log.png"
            alt="CortexIQ Logo"
            style={{
              width: "44px",
              height: "44px",
              objectFit: "cover",
              borderRadius: "12px",
              flexShrink: 0,
              display: "block",
            }}
          />

          {/* Brand Text */}
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              justifyContent: "center",
              lineHeight: 1.1,
            }}
          >
            <h1
              style={{
                margin: 0,
                fontSize: "1.55rem",
                fontWeight: 700,
                letterSpacing: "-0.5px",
              }}
            >
              CortexIQ
            </h1>

            <p
              style={{
                margin: 0,
                fontSize: "0.78rem",
                opacity: 0.72,
                marginTop: "3px",
                color: "#b8b8b8",
              }}
            >
              Agentic Multimodal Intelligence Platform
            </p>
          </div>
        </div>

        <div className="status-strip">
          <span style={{ display: "inline-flex", alignItems: "center", gap: 6 }}>
            <span
              style={{
                width: 7,
                height: 7,
                borderRadius: "50%",
                background: health?.adk
                  ? "#9fc9a2"
                  : health === null
                  ? "#a8a397"
                  : "#ff6b92",
                display: "inline-block",
              }}
            />

            {health === null
              ? "Connecting…"
              : health.adk
              ? "ADK ready"
              : "ADK unavailable"}
          </span>

          <span>{sources.length} sources</span>

          <span>{space?.dimensions ?? 768}-dim</span>
        </div>
      </header>

      <div className="workspace">
        {/* Left Rail */}
        <aside className="left-rail">
          {/* Add Source */}
          <div className="panel source-panel">
            <div className="panel-heading">
              <div><h2>Add source</h2><p>Add files, URLs, and documents for contextual retrieval.</p></div>
            </div>
            <div className="tabs">
              {(["text", "url", "file"] as AddTab[]).map(t => (
                <button key={t} id={`tab-${t}`} className={addTab === t ? "active" : ""}
                  onClick={() => { setAddTab(t); setAddStatus(null); }}>
                  {t === "text" && <FileText size={13} />}
                  {t === "url" && <Globe size={13} />}
                  {t === "file" && <FileUp size={13} />}
                  {t.charAt(0).toUpperCase() + t.slice(1)}
                </button>
              ))}
            </div>

            {addTab !== "file" && (<>
              <label className="field-label">Title</label>
              <input value={titleInput} onChange={e => setTitleInput(e.target.value)}
                placeholder={addTab === "url" ? "Optional title" : "Source title"} />
            </>)}

            {addTab === "text" && (<>
              <label className="field-label">Content</label>
              <textarea value={textInput} onChange={e => setTextInput(e.target.value)}
                placeholder="Paste or type your source text…" />
            </>)}

            {addTab === "url" && (<>
              <label className="field-label">URL</label>
              <input type="url" value={urlInput} onChange={e => setUrlInput(e.target.value)}
                placeholder="https://example.com/page" />
            </>)}

            {addTab === "file" && (<>
              <label className="field-label">File (PDF · image · audio · video)</label>
              <input type="file" accept=".pdf,image/*,audio/*,video/*"
                style={{ height: "auto", padding: "10px 14px" }}
                onChange={e => setFile(e.target.files?.[0] ?? null)} />
              {file && (
                <div className="file-preview">
                  <FileUp size={16} />
                  <span>{file.name}</span>
                  <strong>{(file.size / 1024).toFixed(1)} KB · {file.type}</strong>
                </div>
              )}
              <label className="field-label">Notes (optional)</label>
              <input value={fileNotes} onChange={e => setFileNotes(e.target.value)}
                placeholder="Describe what this file contains…" />
            </>)}

            <button id="btn-add" className="primary-button" disabled={addDisabled} onClick={handleAdd}>
              {addBusy ? <Loader2 size={15} className="spin" /> : <FileUp size={15} />}
              {addBusy ? "Embedding…" : "Add to vector space"}
            </button>
            {addStatus && <div className={`inline-status ${addStatus.kind}`}>{addStatus.msg}</div>}
          </div>

          {/* Source List */}
          <div className="panel source-list">
            <div className="source-list-heading">
              <div className="panel-heading">
                <div><h2>Indexed sources</h2><p>Click trash to remove from vector space.</p></div>
              </div>
            </div>
            {sources.length === 0
              ? <p className="empty-state">No sources yet — add text, a URL, or a file above.</p>
              : sources.map(src => (
                <div className="source-row" key={src.id}>
                  <div className={`modality-dot ${src.modality}`}><ModalityIcon modality={src.modality} size={13} /></div>
                  <div>
                    <div className="source-title">{src.title}</div>
                    <div className="source-summary">{src.summary}</div>
                    <div className="source-meta">{src.modality} · {src.chunks} chunk{src.chunks !== 1 ? "s" : ""}</div>
                  </div>
                  <button className="delete-source" disabled={deletingId === src.id}
                    onClick={() => handleDelete(src.id)} title="Remove">
                    {deletingId === src.id ? <Loader2 size={13} className="spin" /> : <Trash2 size={13} />}
                  </button>
                </div>
              ))}
          </div>
        </aside>

        {/* Center 3D Stage */}
        <main className="space-stage">
          <div className="stage-header">
            <div>
              <h2>Intelligence Space</h2>
              <p>Live 3D projection of your semantic knowledge · Gemini Embedding 2</p>
            </div>
            <div className="stage-tools">
              <div className="modality-key">
                {["text","image","audio","video","pdf","query"].map(m => (
                  <span key={m} className={`modality-key-item key-${m}`}>{m}</span>
                ))}
              </div>
              <div className="space-readout">
                <span>{sources.length} sources</span>
                <span>{space?.dimensions ?? 768}D → 3D PCA</span>
              </div>
            </div>
          </div>

          <EmbeddingCanvas points={displayPoints} queryPoint={queryPoint} matchIds={matchIds} onHover={onHover} />

          {hovered && (
            <div className="hover-card">
              <div className={`mini-dot ${hovered.modality}`} />
              <strong>{hovered.title}</strong>
              <span>{hovered.modality}</span>
              {hovered.preview && <p>{hovered.preview.slice(0, 160)}</p>}
              {hovered.score !== undefined && (
                <div className="score-track" style={{ marginTop: 10 }}>
                  <div style={{ width: `${Math.round(hovered.score * 100)}%` }} />
                </div>
              )}
            </div>
          )}
        </main>

        {/* Right Rail */}
        <aside className="right-rail">
          {/* Q&A */}
          <div className="panel qa-panel">
            <div className="panel-heading"><h2>Ask CortexIQ</h2></div>
            <textarea id="question-input" className="question-box" value={question}
              onChange={e => setQuestion(e.target.value)}
              placeholder="Ask CortexIQ to retrieve, analyze, and reason over your knowledge base…"
              onKeyDown={e => { if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) handleAsk(); }} />
            <button id="btn-ask" className="primary-button"
              disabled={asking || !question.trim() || sources.length === 0} onClick={handleAsk}>
              {asking ? <Loader2 size={15} className="spin" /> : <Send size={15} />}
              {asking ? "Thinking…" : "Ask CortexIQ"}
            </button>
            {askError && <div className="inline-status error">{askError}</div>}
          </div>

          {/* Trace */}
          {askResult?.trace && (
            <div className="panel trace-panel">
              <div className="panel-heading"><h2>Agent trace</h2></div>
              <div className="trace-list">
                {askResult.trace.map((s, i) => (
                  <div className="trace-row" key={i}>
                    <span>{s.agent.replace(/_/g, " ")}</span>
                    <p>{s.detail}</p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Answer */}
          {askResult?.answer && (
            <div className="panel answer-panel">
              <div className="panel-heading"><h2>Answer</h2></div>
              <div className="answer-box prominent-answer">
                <MessageSquare size={18} />
                <AnswerContent text={askResult.answer} />
              </div>
            </div>
          )}

          {/* Citations */}
          {askResult?.matches && askResult.matches.length > 0 && (
            <div className="panel citations-panel">
              <div className="panel-heading"><h2>Citations</h2></div>
              <div className="citation-list">
                {askResult.matches.map(m => (
                  <div className="citation-row" key={m.id}>
                    <div className="citation-top">
                      <span><div className={`mini-dot ${m.modality}`} />{m.title}</span>
                      <strong>{Math.round((m.score ?? 0) * 100)}%</strong>
                    </div>
                    {m.text && <p>{m.text.slice(0, 260)}</p>}
                    <div className="score-track">
                      <div style={{ width: `${Math.round((m.score ?? 0) * 100)}%` }} />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {!askResult && !asking && (
            <div className="panel citations-panel">
              <p className="empty-state">Answer and citations will appear here after you ask a question.</p>
            </div>
          )}
        </aside>
      </div>
    </div>
  );
}
