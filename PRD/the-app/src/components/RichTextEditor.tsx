'use client';

import { useEffect, useRef, useState } from 'react';

interface RichTextEditorProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  height?: number;
}

export default function RichTextEditor({
  value,
  onChange,
  placeholder = 'Enter your content here...',
  height = 300,
}: RichTextEditorProps) {
  const editorRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const isInternalChange = useRef(false);
  const [isSourceMode, setIsSourceMode] = useState(false);
  const [htmlSource, setHtmlSource] = useState(value);

  useEffect(() => {
    if (!isSourceMode && editorRef.current && !isInternalChange.current) {
      if (editorRef.current.innerHTML !== value) {
        editorRef.current.innerHTML = value;
      }
    }
    if (isSourceMode) {
      setHtmlSource(value);
    }
    isInternalChange.current = false;
  }, [value, isSourceMode]);

  const handleInput = () => {
    if (editorRef.current) {
      isInternalChange.current = true;
      onChange(editorRef.current.innerHTML);
    }
  };

  const handleSourceChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const newValue = e.target.value;
    setHtmlSource(newValue);
    isInternalChange.current = true;
    onChange(newValue);
  };

  const toggleSourceMode = () => {
    if (isSourceMode && editorRef.current) {
      // Switching from source to visual
      editorRef.current.innerHTML = htmlSource;
      onChange(htmlSource);
    } else if (!isSourceMode && editorRef.current) {
      // Switching from visual to source
      setHtmlSource(editorRef.current.innerHTML);
    }
    setIsSourceMode(!isSourceMode);
  };

  const execCommand = (command: string, value?: string) => {
    document.execCommand(command, false, value);
    handleInput();
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Tab') {
      e.preventDefault();
      if (isSourceMode && textareaRef.current) {
        const start = textareaRef.current.selectionStart;
        const end = textareaRef.current.selectionEnd;
        const newValue =
          htmlSource.substring(0, start) + '  ' + htmlSource.substring(end);
        setHtmlSource(newValue);
        onChange(newValue);
        setTimeout(() => {
          if (textareaRef.current) {
            textareaRef.current.selectionStart =
              textareaRef.current.selectionEnd = start + 2;
          }
        }, 0);
      } else {
        execCommand('insertHTML', '&nbsp;&nbsp;&nbsp;&nbsp;');
      }
    }
  };

  return (
    <div className="border border-gray-300 rounded-md overflow-hidden">
      <div className="bg-gray-50 border-b border-gray-300 p-2 flex flex-wrap gap-1 items-center">
        {!isSourceMode && (
          <>
            <button
              type="button"
              onClick={() => execCommand('bold')}
              className="px-3 py-1 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded hover:bg-gray-100"
              title="Bold"
            >
              <strong>B</strong>
            </button>
            <button
              type="button"
              onClick={() => execCommand('italic')}
              className="px-3 py-1 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded hover:bg-gray-100"
              title="Italic"
            >
              <em>I</em>
            </button>
            <button
              type="button"
              onClick={() => execCommand('underline')}
              className="px-3 py-1 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded hover:bg-gray-100"
              title="Underline"
            >
              <u>U</u>
            </button>
            <div className="w-px h-6 bg-gray-300 mx-1" />
            <button
              type="button"
              onClick={() => execCommand('insertUnorderedList')}
              className="px-3 py-1 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded hover:bg-gray-100"
              title="Bullet List"
            >
              • List
            </button>
            <button
              type="button"
              onClick={() => execCommand('insertOrderedList')}
              className="px-3 py-1 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded hover:bg-gray-100"
              title="Numbered List"
            >
              1. List
            </button>
            <div className="w-px h-6 bg-gray-300 mx-1" />
            <select
              onChange={e => execCommand('formatBlock', e.target.value)}
              className="px-2 py-1 text-sm text-gray-700 bg-white border border-gray-300 rounded hover:bg-gray-100"
              defaultValue=""
            >
              <option value="" disabled>
                Heading
              </option>
              <option value="p">Normal</option>
              <option value="h1">Heading 1</option>
              <option value="h2">Heading 2</option>
              <option value="h3">Heading 3</option>
            </select>
            <div className="w-px h-6 bg-gray-300 mx-1" />
            <button
              type="button"
              onClick={() => {
                const url = window.prompt('Enter URL:');
                if (url) execCommand('createLink', url);
              }}
              className="px-3 py-1 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded hover:bg-gray-100"
              title="Insert Link"
            >
              Link
            </button>
            <button
              type="button"
              onClick={() => execCommand('unlink')}
              className="px-3 py-1 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded hover:bg-gray-100"
              title="Remove Link"
            >
              Unlink
            </button>
          </>
        )}
        <div className="ml-auto flex items-center gap-2">
          <span className="text-xs text-gray-500">
            {isSourceMode ? 'HTML Source' : 'Visual Editor'}
          </span>
          <button
            type="button"
            onClick={toggleSourceMode}
            className={`px-3 py-1 text-sm font-medium rounded transition-colors ${
              isSourceMode
                ? 'bg-indigo-600 text-white hover:bg-indigo-700'
                : 'bg-white text-gray-700 border border-gray-300 hover:bg-gray-100'
            }`}
            title={
              isSourceMode ? 'Switch to Visual Editor' : 'Edit HTML Source'
            }
          >
            {isSourceMode ? 'Visual' : '</>'}
          </button>
        </div>
      </div>

      {isSourceMode ? (
        <textarea
          ref={textareaRef}
          value={htmlSource}
          onChange={handleSourceChange}
          onKeyDown={handleKeyDown}
          className="w-full p-4 font-mono text-sm bg-gray-900 text-gray-100 focus:outline-none resize-none"
          style={{ minHeight: height }}
          placeholder="Enter HTML code here..."
        />
      ) : (
        <>
          <div
            ref={editorRef}
            contentEditable
            onInput={handleInput}
            onKeyDown={handleKeyDown}
            className="p-4 focus:outline-none prose prose-sm max-w-none"
            style={{ minHeight: height }}
            data-placeholder={placeholder}
            suppressContentEditableWarning
          />
          <style jsx>{`
            [contenteditable]:empty:before {
              content: attr(data-placeholder);
              color: #9ca3af;
            }
          `}</style>
        </>
      )}
    </div>
  );
}
