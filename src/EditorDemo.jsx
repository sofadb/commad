import { useState } from 'react';
import CodeEditor from './components/CodeEditor';
import './EditorDemo.css';

const EditorDemo = () => {
  const [code, setCode] = useState(`// Try editing this code
function helloWorld() {
  console.log("Hello, world!");
  return "Hello, world!";
}

// Press the full screen button to expand the editor
const greeting = helloWorld();
`);

  const handleCodeChange = (newCode) => {
    setCode(newCode);
  };

  return (
    <div className="editor-demo">
      <h1>CodeMirror 6 Full Screen Editor</h1>
      <p>This is a demo of a CodeMirror 6 editor with full-screen capability.</p>
      <CodeEditor 
        initialValue={code}
        onChange={handleCodeChange}
        language="javascript"
      />
      <div className="output-section">
        <h2>Editor Content:</h2>
        <pre>{code}</pre>
      </div>
    </div>
  );
};

export default EditorDemo;
