import { useState } from 'react';
import CodeEditor from './components/CodeEditor';
import './EditorDemo.css';

const EditorDemo = () => {
  return (
    <div className="editor-demo">
      <CodeEditor />
    </div>
  );
};

export default EditorDemo;
