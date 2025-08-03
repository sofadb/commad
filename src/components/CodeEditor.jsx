import { useEffect, useRef, useState } from 'react';
import { basicSetup, EditorView } from 'codemirror';
import { markdown } from '@codemirror/lang-markdown';
import { languages } from '@codemirror/language-data';
import './CodeEditor.css';

const CodeEditor = ({ initialValue = '', onChange }) => {
  const editorRef = useRef(null);
  const [editorView, setEditorView] = useState(null);
  const editorWrapperRef = useRef(null);

  useEffect(() => {
    if (!editorRef.current) return;

    // Create the editor view
    const view = new EditorView({
      doc: initialValue,
      extensions: [
        basicSetup,
        markdown({ codeLanguages: languages }),
        EditorView.updateListener.of(update => {
          if (update.docChanged && onChange) {
            onChange(update.state.doc.toString());
          }
        })
      ],
      parent: editorRef.current
    });

    setEditorView(view);

    // Cleanup
    return () => {
      view.destroy();
    };
  }, [initialValue, onChange]);

  return (
    <div 
      ref={editorWrapperRef}
      className="editor-wrapper fullscreen"
    >
      <div ref={editorRef} className="editor" />
    </div>
  );
};

export default CodeEditor;
