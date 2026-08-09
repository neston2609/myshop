"use client";

import type { ReactNode } from "react";
import { useEffect, useRef, useState } from "react";
import { Bold, Code2, Eraser, Heading3, Italic, Link2, List, ListOrdered, Pilcrow, Redo2, Underline, Undo2 } from "lucide-react";

type RichHtmlEditorProps = {
  name: string;
  defaultValue?: string;
  placeholder?: string;
};

function cleanInitialHtml(value?: string) {
  return value?.trim() || "<p></p>";
}

export function RichHtmlEditor({ name, defaultValue, placeholder }: RichHtmlEditorProps) {
  const editorRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const [html, setHtml] = useState(cleanInitialHtml(defaultValue));
  const [sourceMode, setSourceMode] = useState(false);

  useEffect(() => {
    if (!sourceMode && editorRef.current && editorRef.current.innerHTML !== html) {
      editorRef.current.innerHTML = html;
    }
  }, [html, sourceMode]);

  useEffect(() => {
    const textarea = textareaRef.current;
    if (!textarea) return;

    function syncFromExternalInput() {
      const next = textarea?.value || "";
      setHtml(next);
      if (editorRef.current) editorRef.current.innerHTML = next;
    }

    textarea.addEventListener("input", syncFromExternalInput);
    return () => textarea.removeEventListener("input", syncFromExternalInput);
  }, []);

  function syncFromEditor() {
    const next = editorRef.current?.innerHTML || "";
    setHtml(next);
    if (textareaRef.current) textareaRef.current.value = next;
  }

  function run(command: string, value?: string) {
    if (sourceMode) return;
    editorRef.current?.focus();
    document.execCommand(command, false, value);
    syncFromEditor();
  }

  function createLink() {
    const url = window.prompt("URL");
    if (!url) return;
    run("createLink", url);
  }

  return (
    <div className="overflow-hidden rounded-md border border-black/10 bg-white">
      <textarea ref={textareaRef} name={name} defaultValue={html} className="hidden" />
      <div className="flex flex-wrap items-center gap-1 border-b border-black/10 bg-slate-50 p-2">
        <ToolbarButton label="Paragraph" onClick={() => run("formatBlock", "p")}><Pilcrow size={16} /></ToolbarButton>
        <ToolbarButton label="Heading" onClick={() => run("formatBlock", "h3")}><Heading3 size={16} /></ToolbarButton>
        <span className="mx-1 h-6 w-px bg-black/10" />
        <ToolbarButton label="Bold" onClick={() => run("bold")}><Bold size={16} /></ToolbarButton>
        <ToolbarButton label="Italic" onClick={() => run("italic")}><Italic size={16} /></ToolbarButton>
        <ToolbarButton label="Underline" onClick={() => run("underline")}><Underline size={16} /></ToolbarButton>
        <span className="mx-1 h-6 w-px bg-black/10" />
        <ToolbarButton label="Bullet list" onClick={() => run("insertUnorderedList")}><List size={16} /></ToolbarButton>
        <ToolbarButton label="Numbered list" onClick={() => run("insertOrderedList")}><ListOrdered size={16} /></ToolbarButton>
        <ToolbarButton label="Link" onClick={createLink}><Link2 size={16} /></ToolbarButton>
        <span className="mx-1 h-6 w-px bg-black/10" />
        <ToolbarButton label="Undo" onClick={() => run("undo")}><Undo2 size={16} /></ToolbarButton>
        <ToolbarButton label="Redo" onClick={() => run("redo")}><Redo2 size={16} /></ToolbarButton>
        <ToolbarButton label="Clear formatting" onClick={() => run("removeFormat")}><Eraser size={16} /></ToolbarButton>
        <button
          type="button"
          onClick={() => setSourceMode((value) => !value)}
          title="HTML source"
          className="ml-auto inline-flex h-8 items-center gap-2 rounded-md border border-black/10 bg-white px-3 text-xs font-semibold transition hover:-translate-y-0.5 hover:bg-slate-100 active:translate-y-0"
        >
          <Code2 size={15} />
          HTML
        </button>
      </div>

      {sourceMode ? (
        <textarea
          value={html}
          onChange={(event) => {
            setHtml(event.target.value);
            if (textareaRef.current) textareaRef.current.value = event.target.value;
          }}
          className="min-h-56 w-full resize-y border-0 px-4 py-3 font-mono text-xs leading-6 outline-none"
        />
      ) : (
        <div
          ref={editorRef}
          contentEditable
          suppressContentEditableWarning
          data-rich-html-editor
          onInput={syncFromEditor}
          onBlur={syncFromEditor}
          className="product-html min-h-56 px-4 py-3 outline-none empty:before:text-slate-400 empty:before:content-[attr(data-placeholder)]"
          data-placeholder={placeholder || "Product details..."}
        />
      )}
    </div>
  );
}

function ToolbarButton({ label, onClick, children }: { label: string; onClick: () => void; children: ReactNode }) {
  return (
    <button
      type="button"
      title={label}
      onMouseDown={(event) => event.preventDefault()}
      onClick={onClick}
      className="inline-flex h-8 w-8 items-center justify-center rounded-md border border-transparent text-slate-700 transition hover:-translate-y-0.5 hover:border-black/10 hover:bg-white active:translate-y-0"
    >
      {children}
    </button>
  );
}
