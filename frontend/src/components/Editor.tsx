import { useState } from 'react';
import { Bold, Italic, AlignLeft, Download, Check } from 'lucide-react';

interface EditorProps {
  initialValue: string;
  onSave?: (value: string) => void;
  onDownloadPdf?: (value: string) => void;
}

export default function Editor({ initialValue, onSave, onDownloadPdf }: EditorProps) {
  const [content, setContent] = useState(initialValue);
  const [saved, setSaved] = useState(false);

  const handleBold = () => {
    setContent(prev => prev + ' **bold**');
  };

  const handleItalic = () => {
    setContent(prev => prev + ' *italic*');
  };

  const handleList = () => {
    setContent(prev => prev + '\n* ');
  };

  const handleSave = () => {
    if (onSave) onSave(content);
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  return (
    <div className="editor-container">
      <div className="editor-toolbar">
        <button onClick={handleBold} className="editor-btn" title="Bold"><Bold size={16} /></button>
        <button onClick={handleItalic} className="editor-btn" title="Italic"><Italic size={16} /></button>
        <button onClick={handleList} className="editor-btn" title="Bullet List"><AlignLeft size={16} /></button>
        
        <div style={{ marginLeft: 'auto', display: 'flex', gap: '0.5rem' }}>
          {onDownloadPdf && (
            <button
              onClick={() => onDownloadPdf(content)}
              className="btn btn-primary"
              style={{ padding: '0.25rem 0.75rem', height: '30px', fontSize: '0.75rem', gap: '0.25rem' }}
            >
              <Download size={12} />
              <span>Download PDF</span>
            </button>
          )}
        </div>
      </div>
      <textarea
        value={content}
        onChange={(e) => setContent(e.target.value)}
        className="editor-textarea"
        placeholder="Write your cover letter content here..."
      />
    </div>
  );
}
