import React, { useRef, useState, useEffect } from "react";
import "../styles/global/editor.css";

const ToolbarButton = ({ onClick, active, children, title }) => (
  <button
    className={`editor-toolbar-button ${active ? "active" : ""}`}
    onMouseDown={(e) => e.preventDefault()}
    onClick={onClick}
    title={title}
  >
    {children}
  </button>
);

const EditorPage = () => {
  const editorRef = useRef(null);
  const previewRef = useRef(null);
  const [html, setHtml] = useState("<p>Bắt đầu viết ở đây...</p>");
  const [selectionState, setSelectionState] = useState(null);

  // Debounce and idle handles to avoid frequent React updates
  const draftRef = useRef("");
  const debounceTimer = useRef(null);
  const idleHandle = useRef(null);
  const dirtyRef = useRef(false);
  const [mode, setMode] = useState("edit");
  const [saveStatus, setSaveStatus] = useState("idle"); // idle | saving | saved | error
  const saveTimer = useRef(null);
  const DRAFT_KEY = "editor:draft";
  const [draftAvailable, setDraftAvailable] = useState(false);

  useEffect(() => {
    if (editorRef.current) {
      editorRef.current.innerHTML = html;
    }
    if (previewRef.current) {
      previewRef.current.innerHTML = html;
    }
    // detect existing draft
    try {
      const d = localStorage.getItem(DRAFT_KEY);
      setDraftAvailable(!!d);
    } catch (e) {
      setDraftAvailable(false);
    }
    return () => {
      if (debounceTimer.current) clearTimeout(debounceTimer.current);
      if (idleHandle.current && window.cancelIdleCallback)
        window.cancelIdleCallback(idleHandle.current);
    };
  }, []);

  const flushPreview = (value) => {
    // Direct DOM write to preview to avoid React re-render cost
    if (previewRef.current) previewRef.current.innerHTML = value;
    // keep a lightweight React state copy
    setHtml(value);
    // schedule autosave
    scheduleSave(value);
  };

  const scheduleSave = (value) => {
    if (saveTimer.current) clearTimeout(saveTimer.current);
    setSaveStatus("saving");
    saveTimer.current = setTimeout(() => {
      try {
        localStorage.setItem(DRAFT_KEY, value);
        setDraftAvailable(true);
        setSaveStatus("saved");
      } catch (e) {
        console.error("Failed to save draft", e);
        setSaveStatus("error");
      }
      saveTimer.current = null;
    }, 1000);
  };

  const loadDraft = () => {
    try {
      const d = localStorage.getItem(DRAFT_KEY);
      if (d != null && editorRef.current) {
        editorRef.current.innerHTML = d;
        flushPreview(d);
        if (mode !== "preview") editorRef.current.focus();
      }
    } catch (e) {
      console.error("Failed to load draft", e);
    }
  };

  const clearDraft = () => {
    try {
      localStorage.removeItem(DRAFT_KEY);
      setDraftAvailable(false);
      setSaveStatus("idle");
    } catch (e) {
      console.error("Failed to clear draft", e);
    }
  };

  
  // focus editor on mount and place caret at end
  useEffect(() => {
    if (editorRef.current) {
      // focus and move caret to end
      editorRef.current.focus();
      const range = document.createRange();
      range.selectNodeContents(editorRef.current);
      range.collapse(false);
      const sel = window.getSelection();
      sel.removeAllRanges();
      sel.addRange(range);
    }
  }, []);
  const scheduleSync = () => {
    if (!editorRef.current) return;
    // mark content dirty; avoid reading .innerHTML on every keystroke
    dirtyRef.current = true;

    if (debounceTimer.current) clearTimeout(debounceTimer.current);
    debounceTimer.current = setTimeout(() => {
      // read innerHTML once when debounce fires
      const value = editorRef.current ? editorRef.current.innerHTML : "";
      const apply = () => flushPreview(value);
      if (typeof window.requestIdleCallback === "function") {
        idleHandle.current = window.requestIdleCallback(() => apply(), { timeout: 1000 });
      } else {
        apply();
      }
      dirtyRef.current = false;
      debounceTimer.current = null;
    }, 250);
  };

  const exec = (command, value = null) => {
    document.execCommand(command, false, value);
    scheduleSync();
    if (editorRef.current) editorRef.current.focus();
  };

  const syncHtml = () => scheduleSync();

  const insertHeading = (level) => {
    exec("formatBlock", `H${level}`);
  };

  const handlePaste = (e) => {
    e.preventDefault();
    const text = (e.clipboardData || window.clipboardData).getData("text") || "";

    const LARGE_LIMIT = 50000; // characters
    const CHUNK_SIZE = 8000;

    const insertChunked = async (fullText) => {
      if (fullText.length <= CHUNK_SIZE) {
        document.execCommand("insertText", false, fullText);
        scheduleSync();
        return;
      }

      let i = 0;
      while (i < fullText.length) {
        const chunk = fullText.slice(i, i + CHUNK_SIZE);
        document.execCommand("insertText", false, chunk);
        i += CHUNK_SIZE;
        // yield a bit
        // eslint-disable-next-line no-await-in-loop
        await new Promise((res) => setTimeout(res, 10));
      }
      scheduleSync();
    };

    if (text.length > LARGE_LIMIT) {
      const confirmFull = window.confirm(
        "Bạn đang dán nội dung rất lớn. Dán toàn bộ có thể làm chậm trình duyệt. OK để dán, Cancel để dán rút gọn."
      );
      if (!confirmFull) {
        insertChunked(text.slice(0, LARGE_LIMIT));
        return;
      }
    }

    insertChunked(text);
  };

  // view mode controlled above

  const switchMode = (newMode) => {
    setMode(newMode);
    if (newMode === "preview") {
      // immediately flush preview from current editor content (user-driven)
      const current = editorRef.current ? editorRef.current.innerHTML : "";
      flushPreview(current);
    }
    if (newMode === "edit") {
      // focus editor for typing
      setTimeout(() => {
        if (editorRef.current) editorRef.current.focus();
      }, 0);
    }
  };

  return (
    <div className="editor-page">
      <div className="editor-header">
        <h2>Trình soạn thảo (Preview theo thời gian thực)</h2>
        <div className="editor-toolbar">
          <ToolbarButton onClick={() => exec("undo")} title="Hoàn tác">
            ↶
          </ToolbarButton>
          <ToolbarButton onClick={() => exec("redo")} title="Làm lại">
            ↷
          </ToolbarButton>
          <ToolbarButton onClick={() => exec("bold")} title="Đậm">
            B
          </ToolbarButton>
          <ToolbarButton onClick={() => exec("italic")} title="Nghiêng">
            I
          </ToolbarButton>
          <ToolbarButton onClick={() => exec("underline")} title="Gạch chân">
            U
          </ToolbarButton>
          <ToolbarButton onClick={() => insertHeading(1)} title="Heading 1">
            H1
          </ToolbarButton>
          <ToolbarButton onClick={() => insertHeading(2)} title="Heading 2">
            H2
          </ToolbarButton>
          <ToolbarButton
            onClick={() => exec("insertUnorderedList")}
            title="Danh sách"
          >
            • List
          </ToolbarButton>
          <ToolbarButton
            onClick={() => exec("createLink", prompt("Nhập URL:", "https://"))}
            title="Chèn link"
          >
            🔗
          </ToolbarButton>
          <ToolbarButton
            onClick={() => exec("removeFormat")}
            title="Xóa format"
          >
            Tx
          </ToolbarButton>
          <div style={{ width: 12 }} />
          <ToolbarButton onClick={() => switchMode('edit')} active={mode === 'edit'} title="Chỉ chỉnh sửa">✎ Edit</ToolbarButton>
          <ToolbarButton onClick={() => switchMode('preview')} active={mode === 'preview'} title="Chỉ xem">🔍 Preview</ToolbarButton>
          <ToolbarButton onClick={() => switchMode('both')} active={mode === 'both'} title="Cả hai">▦ Both</ToolbarButton>
        </div>
      </div>

      <div className="editor-body">
        <div
          className="editor-pane"
          contentEditable
          ref={editorRef}
          onInput={scheduleSync}
          onPaste={handlePaste}
          suppressContentEditableWarning
          spellCheck={false}
          aria-label="Editor"
          data-gramm="false"
          style={{ display: mode === 'preview' ? 'none' : 'block' }}
        />

        <div className="preview-pane" style={{ display: mode === 'edit' ? 'none' : 'block' }}>
          <div
            className="preview-inner"
            ref={previewRef}
            dangerouslySetInnerHTML={{ __html: html }}
          />
        </div>
      </div>
    </div>
  );
};

export default EditorPage;
