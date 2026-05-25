import { useState, useRef, useEffect } from "react";

const API_BASE = "http://localhost:8000";

export default function App() {
  const [file, setFile] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [uploadStatus, setUploadStatus] = useState(null);
  const [question, setQuestion] = useState("");
  const [messages, setMessages] = useState([]);
  const [loading, setLoading] = useState(false);
  const [dragOver, setDragOver] = useState(false);
  const fileInputRef = useRef(null);
  const chatEndRef = useRef(null);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const handleFileSelect = (selectedFile) => {
    if (!selectedFile?.name.endsWith(".pdf")) {
      setUploadStatus({ type: "error", text: "Please choose a PDF file only." });
      return;
    }
    setFile(selectedFile);
    setUploadStatus(null);
  };

  const handleDrop = (e) => {
    e.preventDefault();
    setDragOver(false);
    const dropped = e.dataTransfer.files[0];
    if (dropped) handleFileSelect(dropped);
  };

  const handleUpload = async () => {
    if (!file) return;
    setUploading(true);
    setUploadStatus({ type: "loading", text: "Uploading and reading your PDF…" });

    const formData = new FormData();
    formData.append("file", file);

    try {
      const res = await fetch(`${API_BASE}/upload`, {
        method: "POST",
        body: formData,
      });
      const data = await res.json();
      if (res.ok) {
        setUploadStatus({
          type: "success",
          text: `Done! Split into ${data.chunks} pieces and indexed. You can now ask questions.`,
        });
        setMessages([
          {
            role: "assistant",
            text: `I've read your file "${file.name}" and I'm ready to answer questions about it. What would you like to know?`,
          },
        ]);
      } else {
        setUploadStatus({ type: "error", text: data.detail || "Upload failed." });
      }
    } catch {
      setUploadStatus({
        type: "error",
        text: "Could not reach the backend. Is it running on port 8000?",
      });
    } finally {
      setUploading(false);
    }
  };

  const handleAsk = async () => {
    const q = question.trim();
    if (!q || loading) return;
    setQuestion("");
    setMessages((prev) => [...prev, { role: "user", text: q }]);
    setLoading(true);

    try {
      const res = await fetch(`${API_BASE}/ask`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ question: q }),
      });
      const data = await res.json();
      if (res.ok) {
        setMessages((prev) => [
          ...prev,
          { role: "assistant", text: data.answer, sources: data.sources },
        ]);
      } else {
        setMessages((prev) => [
          ...prev,
          { role: "assistant", text: `Error: ${data.detail}`, isError: true },
        ]);
      }
    } catch {
      setMessages((prev) => [
        ...prev,
        {
          role: "assistant",
          text: "Could not reach the backend. Make sure it is running.",
          isError: true,
        },
      ]);
    } finally {
      setLoading(false);
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleAsk();
    }
  };

  const pdfReady = uploadStatus?.type === "success";

  return (
    <div style={styles.page}>
      <div style={styles.shell}>

        {/* ── Header ── */}
        <header style={styles.header}>
          <div style={styles.logo}>
            <svg width="28" height="28" viewBox="0 0 28 28" fill="none">
              <rect width="28" height="28" rx="8" fill="#1a1a2e" />
              <path d="M8 20 L14 8 L20 20" stroke="#e8c547" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" fill="none" />
              <path d="M10 16 H18" stroke="#e8c547" strokeWidth="1.5" strokeLinecap="round" />
            </svg>
            <span style={styles.logoText}>DocMind</span>
          </div>
          <span style={styles.badge}>RAG · Groq · FAISS</span>
        </header>

        {/* ── Upload Panel ── */}
        <section style={styles.uploadSection}>
          <div
            style={{
              ...styles.dropzone,
              ...(dragOver ? styles.dropzoneActive : {}),
              ...(pdfReady ? styles.dropzoneDone : {}),
            }}
            onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
            onDragLeave={() => setDragOver(false)}
            onDrop={handleDrop}
            onClick={() => !pdfReady && fileInputRef.current?.click()}
          >
            <input
              ref={fileInputRef}
              type="file"
              accept=".pdf"
              style={{ display: "none" }}
              onChange={(e) => handleFileSelect(e.target.files[0])}
            />
            {pdfReady ? (
              <div style={styles.dropzoneDoneContent}>
                <span style={styles.checkIcon}>✓</span>
                <span style={styles.dropzoneFileName}>{file?.name}</span>
                <button
                  style={styles.reuploadBtn}
                  onClick={(e) => {
                    e.stopPropagation();
                    setFile(null);
                    setUploadStatus(null);
                    setMessages([]);
                    fileInputRef.current?.click();
                  }}
                >
                  Change file
                </button>
              </div>
            ) : (
              <div style={styles.dropzoneInner}>
                <div style={styles.uploadIcon}>
                  <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                    <polyline points="17 8 12 3 7 8" />
                    <line x1="12" y1="3" x2="12" y2="15" />
                  </svg>
                </div>
                {file ? (
                  <p style={styles.dropzoneFileName}>{file.name}</p>
                ) : (
                  <>
                    <p style={styles.dropzoneTitle}>Drop your PDF here</p>
                    <p style={styles.dropzoneSub}>or click to browse</p>
                  </>
                )}
              </div>
            )}
          </div>

          {file && !pdfReady && (
            <button
              style={{ ...styles.uploadBtn, ...(uploading ? styles.uploadBtnDisabled : {}) }}
              onClick={handleUpload}
              disabled={uploading}
            >
              {uploading ? "Processing…" : "Upload & Index PDF"}
            </button>
          )}

          {uploadStatus && uploadStatus.type !== "success" && (
            <div style={{ ...styles.statusBar, ...styles[`status_${uploadStatus.type}`] }}>
              {uploadStatus.text}
            </div>
          )}
        </section>

        {/* ── Chat ── */}
        <section style={styles.chatSection}>
          <div style={styles.chatMessages}>
            {messages.length === 0 && (
              <div style={styles.emptyState}>
                <p style={styles.emptyTitle}>No document loaded yet</p>
                <p style={styles.emptySub}>Upload a PDF above, then ask anything about it.</p>
              </div>
            )}
            {messages.map((msg, i) => (
              <div
                key={i}
                style={{
                  ...styles.bubble,
                  ...(msg.role === "user" ? styles.bubbleUser : styles.bubbleAssistant),
                  ...(msg.isError ? styles.bubbleError : {}),
                }}
              >
                {msg.role === "assistant" && (
                  <div style={styles.avatarDot} />
                )}
                <div style={styles.bubbleContent}>
                  <p style={styles.bubbleText}>{msg.text}</p>
                  {msg.sources?.length > 0 && (
                    <details style={styles.sources}>
                      <summary style={styles.sourcesSummary}>View sources ({msg.sources.length})</summary>
                      {msg.sources.map((s, si) => (
                        <p key={si} style={styles.sourceItem}>"{s}…"</p>
                      ))}
                    </details>
                  )}
                </div>
              </div>
            ))}
            {loading && (
              <div style={{ ...styles.bubble, ...styles.bubbleAssistant }}>
                <div style={styles.avatarDot} />
                <div style={styles.typingDots}>
                  <span style={styles.dot} />
                  <span style={{ ...styles.dot, animationDelay: "0.2s" }} />
                  <span style={{ ...styles.dot, animationDelay: "0.4s" }} />
                </div>
              </div>
            )}
            <div ref={chatEndRef} />
          </div>

          {/* Input Row */}
          <div style={styles.inputRow}>
            <textarea
              style={styles.textarea}
              rows={1}
              placeholder={pdfReady ? "Ask a question about your PDF…" : "Upload a PDF to start asking questions"}
              value={question}
              disabled={!pdfReady || loading}
              onChange={(e) => setQuestion(e.target.value)}
              onKeyDown={handleKeyDown}
            />
            <button
              style={{
                ...styles.sendBtn,
                ...(!pdfReady || !question.trim() || loading ? styles.sendBtnDisabled : {}),
              }}
              onClick={handleAsk}
              disabled={!pdfReady || !question.trim() || loading}
              aria-label="Send question"
            >
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <line x1="22" y1="2" x2="11" y2="13" />
                <polygon points="22 2 15 22 11 13 2 9 22 2" />
              </svg>
            </button>
          </div>
        </section>
      </div>

      <style>{`
        @keyframes bounce {
          0%, 80%, 100% { transform: translateY(0); opacity: 0.4; }
          40% { transform: translateY(-6px); opacity: 1; }
        }
      `}</style>
    </div>
  );
}

/* ─── Styles ─────────────────────────────────────────── */
const styles = {
  page: {
    minHeight: "100vh",
    background: "#0f0f1a",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    padding: "24px 16px",
    fontFamily: "'Segoe UI', system-ui, sans-serif",
  },
  shell: {
    width: "100%",
    maxWidth: "720px",
    background: "#16162a",
    borderRadius: "20px",
    border: "1px solid rgba(255,255,255,0.07)",
    overflow: "hidden",
    display: "flex",
    flexDirection: "column",
    minHeight: "80vh",
  },
  header: {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    padding: "18px 24px",
    borderBottom: "1px solid rgba(255,255,255,0.07)",
  },
  logo: { display: "flex", alignItems: "center", gap: "10px" },
  logoText: {
    fontSize: "18px",
    fontWeight: "700",
    color: "#f0f0f8",
    letterSpacing: "-0.3px",
  },
  badge: {
    fontSize: "11px",
    color: "#e8c547",
    background: "rgba(232,197,71,0.1)",
    border: "1px solid rgba(232,197,71,0.2)",
    borderRadius: "20px",
    padding: "3px 10px",
    fontWeight: "600",
    letterSpacing: "0.5px",
  },
  uploadSection: {
    padding: "24px",
    borderBottom: "1px solid rgba(255,255,255,0.07)",
    display: "flex",
    flexDirection: "column",
    gap: "12px",
  },
  dropzone: {
    border: "2px dashed rgba(255,255,255,0.15)",
    borderRadius: "14px",
    padding: "28px",
    cursor: "pointer",
    transition: "all 0.2s ease",
    background: "rgba(255,255,255,0.02)",
    textAlign: "center",
  },
  dropzoneActive: {
    border: "2px dashed #e8c547",
    background: "rgba(232,197,71,0.05)",
  },
  dropzoneDone: {
    border: "2px solid rgba(72,199,142,0.4)",
    background: "rgba(72,199,142,0.05)",
    cursor: "default",
  },
  dropzoneInner: { display: "flex", flexDirection: "column", alignItems: "center", gap: "8px" },
  dropzoneDoneContent: { display: "flex", alignItems: "center", gap: "12px", justifyContent: "center" },
  checkIcon: { fontSize: "20px", color: "#48c78e" },
  uploadIcon: { color: "rgba(255,255,255,0.35)", marginBottom: "4px" },
  dropzoneTitle: { color: "#c8c8e8", fontSize: "15px", margin: 0, fontWeight: "500" },
  dropzoneSub: { color: "rgba(255,255,255,0.3)", fontSize: "13px", margin: 0 },
  dropzoneFileName: { color: "#c8c8e8", fontSize: "14px", fontWeight: "500", margin: 0 },
  reuploadBtn: {
    background: "transparent",
    border: "1px solid rgba(255,255,255,0.2)",
    borderRadius: "8px",
    color: "rgba(255,255,255,0.5)",
    fontSize: "12px",
    padding: "4px 10px",
    cursor: "pointer",
    marginLeft: "8px",
  },
  uploadBtn: {
    background: "#e8c547",
    color: "#0f0f1a",
    border: "none",
    borderRadius: "10px",
    padding: "12px 24px",
    fontSize: "14px",
    fontWeight: "700",
    cursor: "pointer",
    letterSpacing: "0.2px",
    transition: "opacity 0.2s",
  },
  uploadBtnDisabled: { opacity: 0.6, cursor: "not-allowed" },
  statusBar: { padding: "10px 14px", borderRadius: "10px", fontSize: "13px" },
  status_loading: { background: "rgba(232,197,71,0.1)", color: "#e8c547" },
  status_error: { background: "rgba(220,53,69,0.1)", color: "#f87171" },
  status_success: { background: "rgba(72,199,142,0.1)", color: "#48c78e" },
  chatSection: {
    flex: 1,
    display: "flex",
    flexDirection: "column",
    minHeight: "360px",
  },
  chatMessages: {
    flex: 1,
    overflowY: "auto",
    padding: "20px 24px",
    display: "flex",
    flexDirection: "column",
    gap: "16px",
  },
  emptyState: { textAlign: "center", margin: "auto", padding: "40px 0" },
  emptyTitle: { color: "rgba(255,255,255,0.3)", fontSize: "15px", margin: "0 0 6px" },
  emptySub: { color: "rgba(255,255,255,0.15)", fontSize: "13px", margin: 0 },
  bubble: {
    display: "flex",
    alignItems: "flex-start",
    gap: "10px",
    maxWidth: "85%",
  },
  bubbleUser: {
    alignSelf: "flex-end",
    flexDirection: "row-reverse",
  },
  bubbleAssistant: { alignSelf: "flex-start" },
  bubbleError: { opacity: 0.7 },
  avatarDot: {
    width: "28px",
    height: "28px",
    borderRadius: "50%",
    background: "linear-gradient(135deg, #e8c547 0%, #d4a017 100%)",
    flexShrink: 0,
    marginTop: "2px",
  },
  bubbleContent: { display: "flex", flexDirection: "column", gap: "6px" },
  bubbleText: {
    background: "rgba(255,255,255,0.06)",
    border: "1px solid rgba(255,255,255,0.08)",
    borderRadius: "14px",
    padding: "10px 14px",
    color: "#e0e0f4",
    fontSize: "14px",
    lineHeight: "1.6",
    margin: 0,
    whiteSpace: "pre-wrap",
  },
  sources: { marginTop: "4px" },
  sourcesSummary: {
    fontSize: "12px",
    color: "rgba(255,255,255,0.3)",
    cursor: "pointer",
    userSelect: "none",
  },
  sourceItem: {
    fontSize: "12px",
    color: "rgba(255,255,255,0.4)",
    background: "rgba(255,255,255,0.03)",
    borderLeft: "2px solid rgba(232,197,71,0.4)",
    padding: "6px 10px",
    margin: "4px 0 0",
    borderRadius: "0 6px 6px 0",
    fontStyle: "italic",
  },
  typingDots: {
    display: "flex",
    alignItems: "center",
    gap: "5px",
    background: "rgba(255,255,255,0.06)",
    border: "1px solid rgba(255,255,255,0.08)",
    borderRadius: "14px",
    padding: "12px 16px",
  },
  dot: {
    width: "7px",
    height: "7px",
    borderRadius: "50%",
    background: "#e8c547",
    display: "inline-block",
    animation: "bounce 1.2s infinite ease-in-out",
  },
  inputRow: {
    display: "flex",
    alignItems: "flex-end",
    gap: "10px",
    padding: "16px 24px",
    borderTop: "1px solid rgba(255,255,255,0.07)",
    background: "rgba(0,0,0,0.2)",
  },
  textarea: {
    flex: 1,
    background: "rgba(255,255,255,0.05)",
    border: "1px solid rgba(255,255,255,0.1)",
    borderRadius: "12px",
    padding: "10px 14px",
    color: "#e0e0f4",
    fontSize: "14px",
    resize: "none",
    outline: "none",
    fontFamily: "inherit",
    lineHeight: "1.5",
  },
  sendBtn: {
    background: "#e8c547",
    color: "#0f0f1a",
    border: "none",
    borderRadius: "10px",
    width: "40px",
    height: "40px",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    cursor: "pointer",
    flexShrink: 0,
    transition: "opacity 0.2s",
  },
  sendBtnDisabled: { opacity: 0.35, cursor: "not-allowed" },
};
