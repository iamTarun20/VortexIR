import React, { useEffect, useRef, useState } from "react";
import { createRoot } from "react-dom/client";
import {
  ArrowDown,
  ArrowRight,
  ArrowUpRight,
  BookOpen,
  Braces,
  Check,
  ChevronRight,
  CircleHelp,
  Code2,
  Cpu,
  Database,
  FileText,
  Github,
  Layers3,
  LoaderCircle,
  Search,
  ShieldCheck,
  Upload,
  X,
} from "lucide-react";
import {
  keywords,
  loadEngine,
  resources,
  search,
  type Match,
  type Subject,
} from "./engine";
import "./style.css";
const subjects = [
  { id: "DSA", name: "DSA", icon: Braces, color: "blue" },
  { id: "OOPS", name: "OOP in C++", icon: Code2, color: "purple" },
  { id: "DBMS", name: "Databases", icon: Database, color: "orange" },
  { id: "OS", name: "Operating systems", icon: Cpu, color: "green" },
] as const;
const featured = [1, 42, 17, 26, 2, 35];
const collection = [...resources].sort((a, b) => {
  const rank = (id: number) =>
    featured.includes(id) ? featured.indexOf(id) : featured.length + id;
  return rank(a.id) - rank(b.id);
});
const examples = [
  "How does deadlock occur?",
  "BFS vs DFS",
  "Virtual functions in C++",
];
type Mode = "question" | "notes" | "pdf";
function App() {
  const [engineState, setEngineState] = useState<"loading" | "ready" | "error">(
    "loading",
  );
  const [mode, setMode] = useState<Mode>("question");
  const [subject, setSubject] = useState<Subject | "">("");
  const [question, setQuestion] = useState("");
  const [notes, setNotes] = useState("");
  const [terms, setTerms] = useState("");
  const [extracted, setExtracted] = useState(false);
  const [fileName, setFileName] = useState("");
  const [status, setStatus] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [matches, setMatches] = useState<Match[] | null>(null);
  const [lastQuery, setLastQuery] = useState("");
  const [elapsed, setElapsed] = useState(0);
  const [visible, setVisible] = useState(6);
  const [dragging, setDragging] = useState(false);
  const dialog = useRef<HTMLDialogElement>(null);
  const fileInput = useRef<HTMLInputElement>(null);
  const operation = useRef(0);
  const pdfAbort = useRef<AbortController | null>(null);
  function init() {
    setEngineState("loading");
    loadEngine()
      .then(() => setEngineState("ready"))
      .catch(() => setEngineState("error"));
  }
  useEffect(() => {
    init();
    return () => pdfAbort.current?.abort();
  }, []);
  function stop() {
    ++operation.current;
    pdfAbort.current?.abort();
    pdfAbort.current = null;
    setBusy(false);
    setStatus("Reading cancelled.");
  }
  function changeMode(next: Mode) {
    stop();
    setMode(next);
    setStatus("");
    setError("");
    setTerms("");
    setExtracted(false);
    setFileName("");
  }
  async function run(query: string, filter = subject) {
    if (!query.trim()) {
      setError("Enter a question or at least one keyword.");
      return;
    }
    if (query.length > 500) {
      setError("Keep the search to 500 characters or fewer.");
      return;
    }
    const current = ++operation.current;
    setBusy(true);
    setError("");
    try {
      const start = performance.now();
      const found = await search(query, filter);
      if (current !== operation.current) return;
      setElapsed(performance.now() - start);
      setMatches(found);
      setLastQuery(query);
      setVisible(6);
    } catch {
      if (current === operation.current)
        setError("Search could not run. Reload the page and try again.");
    } finally {
      if (current === operation.current) setBusy(false);
    }
  }
  async function extract(text: string, current: number) {
    const found = await keywords(text);
    if (current !== operation.current) return;
    setTerms(found.join(" "));
    setExtracted(true);
    setStatus(
      found.length
        ? `${found.length} keywords found. Review them before searching.`
        : "No catalogue keywords matched. Enter your own below.",
    );
  }
  async function extractNotes() {
    if (!notes.trim()) {
      setError("Paste some notes first.");
      return;
    }
    const current = ++operation.current;
    setBusy(true);
    setError("");
    try {
      await extract(notes, current);
    } catch {
      if (current === operation.current)
        setError("Keyword extraction failed. Try again.");
    } finally {
      if (current === operation.current) setBusy(false);
    }
  }
  async function upload(file?: File) {
    if (!file) return;
    pdfAbort.current?.abort();
    const controller = new AbortController();
    pdfAbort.current = controller;
    const current = ++operation.current;
    setBusy(true);
    setError("");
    setExtracted(false);
    setTerms("");
    setFileName(file.name);
    setStatus("Opening document…");
    try {
      const { readPdf } = await import("./pdf");
      const text = await readPdf(
        file,
        (message) => {
          if (current === operation.current) setStatus(message);
        },
        controller.signal,
      );
      await extract(text, current);
    } catch (error) {
      if (current === operation.current) {
        setError(
          error instanceof Error ? error.message : "The PDF could not be read.",
        );
        setStatus("");
      }
    } finally {
      if (current === operation.current) {
        setBusy(false);
        pdfAbort.current = null;
      }
    }
  }
  function chooseSubject(next: Subject | "") {
    setSubject(next);
    setVisible(6);
    if (lastQuery) void run(lastQuery, next);
  }
  function clearSearch() {
    setMatches(null);
    setLastQuery("");
    setQuestion("");
    setError("");
    setVisible(6);
  }
  const displayed =
    matches === null
      ? collection
          .filter((r) => !subject || r.subject === subject)
          .map((resource) => ({ resource, score: null }))
      : matches.map((m) => ({
          resource: resources.find((r) => r.id === m.id)!,
          score: m.score,
        }));
  const disabled = busy || engineState !== "ready";
  return (
    <div className="app-shell">
      <aside className="sidebar">
        <a className="brand" href="./" aria-label="VortexIR home">
          <span className="brand-mark">
            <Layers3 size={24} />
          </span>
          Vortex<span>IR</span>
          <small>BETA</small>
        </a>
        <p className="sidebar-intro">
          A little curiosity.
          <br />A deeper understanding.
        </p>
        <p className="eyebrow sidebar-label">YOUR LEARNING LIBRARY</p>
        <button
          className={`nav-item ${subject === "" ? "selected" : ""}`}
          onClick={() => chooseSubject("")}
          disabled={busy}
        >
          <BookOpen size={18} />
          <span>All resources</span>
          <span className="count">{resources.length}</span>
        </button>
        <p className="eyebrow sidebar-label subjects-label">EXPLORE SUBJECTS</p>
        {subjects.map((item) => (
          <button
            className={`nav-item ${subject === item.id ? "selected" : ""}`}
            key={item.id}
            onClick={() => chooseSubject(item.id)}
            disabled={busy}
          >
            <item.icon size={18} />
            <span>{item.name}</span>
            <span className="count">
              {resources.filter((r) => r.subject === item.id).length}
            </span>
          </button>
        ))}
        <div className="sidebar-bottom">
          <div className="local-note">
            <ShieldCheck size={23} />
            <strong>Your notes stay yours.</strong>
            <p>
              Documents are processed in your browser. No uploads. No account
              needed.
            </p>
          </div>
          <a
            className="github"
            href="https://github.com/iamTarun20/VortexIR"
            target="_blank"
            rel="noreferrer"
          >
            <Github size={17} />
            Explore the source
            <ArrowUpRight size={15} />
          </a>
          <div className="sidebar-foot">
            Built with curiosity. Powered by C++.
          </div>
        </div>
      </aside>
      <div className="main-shell">
        <header className="topbar">
          <div className="breadcrumb">
            Workspace
            <ChevronRight size={14} />
            <span>Resource explorer</span>
          </div>
          <button
            className="quiet-button"
            onClick={() => dialog.current?.showModal()}
          >
            <CircleHelp size={16} />
            How it works
          </button>
        </header>
        <main>
          <section className="hero">
            <div className="section-kicker">
              <span />
              LESS SEARCHING, MORE UNDERSTANDING
            </div>
            <h1>
              Follow your curiosity.
              <br />
              <span>Find your next understanding.</span>
            </h1>
            <p>
              Turn a question, your notes, or a PDF into a path to better
              learning.
              <br className="desktop-break" />
              Explore curated computer science resources, ranked for you.
            </p>
          </section>
          <section
            className="search-panel"
            aria-label="Search learning resources"
          >
            <div className="tabs" aria-label="Input type">
              {(
                [
                  { id: "question", label: "Ask a question", icon: Search },
                  { id: "notes", label: "Paste your notes", icon: FileText },
                  { id: "pdf", label: "Upload a PDF", icon: Upload },
                ] as const
              ).map((tab) => (
                <button
                  key={tab.id}
                  aria-pressed={mode === tab.id}
                  onClick={() => changeMode(tab.id)}
                  className={mode === tab.id ? "active" : ""}
                >
                  <tab.icon size={17} />
                  {tab.label}
                </button>
              ))}
            </div>
            <div className="search-body">
              {mode === "question" && (
                <>
                  <form
                    className="question-form"
                    onSubmit={(event) => {
                      event.preventDefault();
                      void run(question);
                    }}
                  >
                    <Search size={21} />
                    <label className="sr-only" htmlFor="question">
                      Your computer science question
                    </label>
                    <input
                      id="question"
                      value={question}
                      onChange={(event) => setQuestion(event.target.value)}
                      placeholder="What would you like to understand?"
                      maxLength={500}
                    />
                    <button className="primary" disabled={disabled}>
                      {busy ? (
                        <LoaderCircle className="spin" size={17} />
                      ) : (
                        <>
                          Find resources
                          <ArrowRight size={17} />
                        </>
                      )}
                    </button>
                  </form>
                  <div className="examples">
                    <span>Try a little curiosity</span>
                    {examples.map((example) => (
                      <button
                        key={example}
                        disabled={disabled}
                        onClick={() => {
                          setQuestion(example);
                          void run(example);
                        }}
                      >
                        {example}
                        <ArrowUpRight size={12} />
                      </button>
                    ))}
                  </div>
                </>
              )}
              {mode === "notes" && (
                <div className="notes-input">
                  <label htmlFor="notes">What are you studying?</label>
                  <textarea
                    id="notes"
                    value={notes}
                    maxLength={200000}
                    placeholder="Paste your lecture notes or a passage here. We’ll find the important keywords, and you can fine-tune them."
                    onChange={(event) => {
                      setNotes(event.target.value);
                      setExtracted(false);
                      setTerms("");
                    }}
                  />
                  <div className="input-footer">
                    <small>
                      {notes.length.toLocaleString()} / 200,000 characters
                    </small>
                    <button
                      className="primary"
                      disabled={disabled}
                      onClick={() => void extractNotes()}
                    >
                      {busy && <LoaderCircle className="spin" size={17} />}
                      Extract keywords
                    </button>
                  </div>
                </div>
              )}
              {mode === "pdf" && (
                <>
                  <input
                    ref={fileInput}
                    className="sr-only"
                    type="file"
                    accept="application/pdf,.pdf"
                    aria-label="Choose a text-based PDF"
                    onChange={(event) => {
                      void upload(event.target.files?.[0]);
                      event.target.value = "";
                    }}
                  />
                  <button
                    className={`dropzone ${dragging ? "dragging" : ""}`}
                    disabled={disabled}
                    onClick={() => fileInput.current?.click()}
                    onDragOver={(event) => {
                      event.preventDefault();
                      setDragging(true);
                    }}
                    onDragLeave={() => setDragging(false)}
                    onDrop={(event) => {
                      event.preventDefault();
                      setDragging(false);
                      if (!disabled) void upload(event.dataTransfer.files[0]);
                    }}
                  >
                    <span className="upload-icon">
                      {busy ? <LoaderCircle className="spin" /> : <Upload />}
                    </span>
                    <strong>
                      {fileName || "Drop your notes here, or choose a PDF"}
                    </strong>
                    <span>Text-based PDFs · up to 15 MB and 200 pages</span>
                    <small>
                      Scanned images need OCR first. Your document stays on this
                      device.
                    </small>
                  </button>
                  {busy && (
                    <button className="quiet-button" onClick={stop}>
                      <X size={15} />
                      Cancel reading
                    </button>
                  )}
                </>
              )}
              {status && (
                <p className="status" role="status">
                  {!busy && extracted && <Check size={15} />} {status}
                </p>
              )}
              {extracted && mode !== "question" && (
                <form
                  className="keywords-form"
                  onSubmit={(event) => {
                    event.preventDefault();
                    void run(terms);
                  }}
                >
                  <label htmlFor="keywords">
                    Review your keywords
                    <span>Keep, remove, or add words before searching.</span>
                  </label>
                  <div>
                    <input
                      id="keywords"
                      value={terms}
                      maxLength={500}
                      onChange={(event) => setTerms(event.target.value)}
                    />
                    <button className="primary" disabled={disabled}>
                      Find resources
                      <ArrowRight size={17} />
                    </button>
                  </div>
                </form>
              )}
              {error && (
                <div className="error" role="alert">
                  {error}
                </div>
              )}
            </div>
            <div className="search-panel-footer">
              <span>
                <ShieldCheck size={14} />
                Private by design
              </span>
              <span>
                Curated sources. Original links. No AI-generated answers.
              </span>
            </div>
          </section>
          <div className="engine-line">
            <span className={`engine-dot ${engineState}`} />
            {engineState === "ready"
              ? "C++ search engine ready"
              : engineState === "loading"
                ? "Starting the C++ search engine…"
                : "Search engine unavailable"}
            <span className="divider">/</span>
            <span>BM25 relevance ranking</span>
            {engineState === "error" && <button onClick={init}>Retry</button>}
          </div>
          <section
            className="resources"
            aria-label="Learning resources"
            aria-busy={busy}
          >
            <div className="resources-heading">
              <div>
                <div className="eyebrow">
                  {matches === null
                    ? "A GOOD PLACE TO START"
                    : "YOUR LEARNING PATH"}
                </div>
                <h2>
                  {matches === null
                    ? "Explore the collection"
                    : "Resources for your curiosity"}
                </h2>
              </div>
              {matches !== null ? (
                <button
                  className="quiet-button"
                  disabled={busy}
                  onClick={clearSearch}
                >
                  <X size={15} />
                  Clear search
                </button>
              ) : (
                <span className="collection-count">
                  44 resources, thoughtfully selected
                </span>
              )}
            </div>
            <div className="filter-row" aria-label="Filter by subject">
              <button
                disabled={busy}
                aria-pressed={subject === ""}
                className={subject === "" ? "active" : ""}
                onClick={() => chooseSubject("")}
              >
                All subjects
              </button>
              {subjects.map((item) => (
                <button
                  key={item.id}
                  disabled={busy}
                  aria-pressed={subject === item.id}
                  className={subject === item.id ? "active" : ""}
                  onClick={() => chooseSubject(item.id)}
                >
                  <item.icon size={14} />
                  {item.name}
                </button>
              ))}
            </div>
            {matches !== null && (
              <p className="result-info" role="status">
                {displayed.length} results for <strong>“{lastQuery}”</strong>
                <span>{elapsed.toFixed(2)} ms · local search and bridge</span>
              </p>
            )}
            {displayed.length ? (
              <div className="card-grid">
                {displayed.slice(0, visible).map(({ resource, score }) => {
                  const item = subjects.find((s) => s.id === resource.subject)!;
                  return (
                    <article className="resource-card" key={resource.id}>
                      <div className="card-top">
                        <span className={`subject-icon ${item.color}`}>
                          <item.icon size={20} />
                        </span>
                        <span className={`subject-tag ${item.color}`}>
                          {item.id}
                        </span>
                      </div>
                      <h3>
                        <a
                          href={resource.url}
                          target="_blank"
                          rel="noopener noreferrer"
                        >
                          {resource.title}
                          <ArrowUpRight size={17} />
                        </a>
                      </h3>
                      <p>{resource.description}</p>
                      <div className="card-bottom">
                        <span>{resource.source}</span>
                        {score !== null ? (
                          <span
                            className="score"
                            title="Ranking value, not a confidence percentage"
                          >
                            {score.toFixed(2)} BM25
                          </span>
                        ) : (
                          <span>
                            {resource.url.endsWith(".pdf")
                              ? "READ PDF"
                              : "READ ARTICLE"}
                            <ArrowUpRight size={12} />
                          </span>
                        )}
                      </div>
                    </article>
                  );
                })}
              </div>
            ) : (
              <div className="empty-state">
                <Search size={30} />
                <h3>No matching resources yet</h3>
                <p>
                  Try a broader keyword such as “deadlock”, “inheritance” or
                  “binary search”, or choose all subjects. This collection does
                  not cover every topic.
                </p>
                <button
                  className="quiet-button"
                  onClick={() => {
                    clearSearch();
                    setSubject("");
                  }}
                >
                  Explore all resources
                  <ArrowRight size={16} />
                </button>
              </div>
            )}
            {displayed.length > visible && (
              <button
                className="load-more"
                onClick={() => setVisible(visible + 6)}
              >
                Explore more resources
                <ArrowDown size={16} />
                <span>{displayed.length - visible} more</span>
              </button>
            )}
          </section>
          <section className="explain-strip">
            <span className="explain-icon">
              <Layers3 size={24} />
            </span>
            <div>
              <strong>A small engine. A clear way to learn.</strong>
              <p>
                Your words → an inverted index → relevant resources. Built in
                C++, running in your browser.
              </p>
            </div>
            <button
              className="quiet-button"
              onClick={() => dialog.current?.showModal()}
            >
              Under the hood
              <ArrowRight size={16} />
            </button>
          </section>
          <footer>
            <span>
              VortexIR <span className="divider">/</span> Curiosity, with
              direction.
            </span>
            <span>Curated catalogue · English-language search</span>
          </footer>
        </main>
      </div>
      <dialog
        ref={dialog}
        onClick={(event) => {
          if (event.target === dialog.current) dialog.current.close();
        }}
      >
        <button
          className="close-dialog"
          aria-label="Close explanation"
          onClick={() => dialog.current?.close()}
        >
          <X />
        </button>
        <div className="eyebrow">UNDER THE HOOD</div>
        <h2>Search you can understand.</h2>
        <p>
          VortexIR searches {resources.length} curated resource descriptions and
          keywords across four computer science subjects. It does not crawl the
          internet or search full article text.
        </p>
        <ol>
          <li>
            <strong>Make the text useful.</strong> C++ lowercases English words,
            removes common words and normalizes a small list of aliases.
          </li>
          <li>
            <strong>Look up matching resources.</strong> An inverted index maps
            words to the resources that contain them.
          </li>
          <li>
            <strong>Rank with BM25.</strong> Term frequency, rarity and
            description length determine the order. Scores are not confidence
            percentages.
          </li>
        </ol>
        <p>
          For notes and PDFs, review extracted keywords before searching. PDF.js
          extracts text locally; scanned PDFs and OCR are not supported.
        </p>
        <p>
          We do not transmit or persist your document text. Opening an article
          takes you to an external website.
        </p>
        <a
          className="primary"
          href="https://github.com/iamTarun20/VortexIR"
          target="_blank"
          rel="noreferrer"
        >
          Read the source
          <Github size={17} />
        </a>
      </dialog>
    </div>
  );
}
createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
);
