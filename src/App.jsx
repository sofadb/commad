import React, { useState } from 'react';
import './App.css';
import CodeEditor from './components/CodeEditor';
import CommandPalette from './components/CommandPalette';
import ConfigDisplay from './components/ConfigDisplay';
import SyncStatus from './components/SyncStatus';

function App() {
  const [code, setCode] = useState(`# Markdown Editor

## Features

- **Full-screen** Markdown editor
- *Light theme* for comfortable writing
- Simple and distraction-free interface

### How to use

1. Start typing your Markdown content
2. Use standard Markdown syntax for formatting:
   - # headers
   - **bold text**
   - *italic text*
   - \`inline code\`
   - [links](https://example.com)

### Text formatting examples

This is *italic text*.

This is **bold text**.

This is a \`code snippet\` inline.

### Code blocks with syntax highlighting

\`\`\`javascript
// JavaScript code example
function greeting(name) {
  return \`Hello, \${name}!\`;
}

console.log(greeting('World'));
\`\`\`

\`\`\`python
# Python code example
def factorial(n):
    if n <= 1:
        return 1
    return n * factorial(n-1)

print(factorial(5))
\`\`\`

This is a code block:

\`\`\`
This is a plain text code block
No language highlighting needed
Just pure markdown
\`\`\`

---

> This is a blockquote that can be used for important notes or quotes.
`)

  const handleCodeChange = (newCode) => {
    setCode(newCode);
  }

  return (
    <div className="editor-container">
      <ConfigDisplay />
      <SyncStatus />
      <CodeEditor
        initialValue={code}
        onChange={handleCodeChange}
      />
    </div>
  )
}

export default App
