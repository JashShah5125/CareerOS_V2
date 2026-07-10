import pdf from 'pdf-parse';
import mammoth from 'mammoth';

// Clean up parsed PDF text, merging trailing single-character bullets and removing excessive whitespace gaps
export function sanitizeParsedText(text: string): string {
  if (!text) return '';
  
  // 1. Join hanging bullet points with the actual text that follows them on the next line
  // Matches a line starting with bullet/hyphen/asterisk, optional whitespace, a newline, and optional whitespace
  let cleaned = text.replace(/^[ \t]*[•\-\*][ \t]*\r?\n[ \t]*/gm, '• ');
  
  // 2. Reduce excessive multiple blank lines (3 or more newlines) down to maximum of 2 newlines
  cleaned = cleaned.replace(/(\r?\n){3,}/g, '\n\n');
  
  // 3. Trim surrounding bounding spacing
  return cleaned.trim();
}

function renderPageColumns(pageData: any): Promise<string> {
  return pageData.getTextContent().then((textContent: any) => {
    const items = textContent.items;
    if (!items || items.length === 0) return '';

    const sortedItems = [...items].sort((a: any, b: any) => {
      const yA = a.transform[5];
      const yB = b.transform[5];
      if (Math.abs(yA - yB) > 5) {
        return yB - yA;
      }
      return a.transform[4] - b.transform[4];
    });

    const xCoordinates = items.map((it: any) => it.transform[4]);
    const minX = Math.min(...xCoordinates);
    const maxX = Math.max(...xCoordinates);
    const pageSplit = minX + (maxX - minX) / 2;

    const leftCount = items.filter((it: any) => it.transform[4] < pageSplit - 30).length;
    const rightCount = items.filter((it: any) => it.transform[4] > pageSplit + 30).length;
    const centerSpanCount = items.filter((it: any) => {
      const x = it.transform[4];
      const w = it.width || 0;
      return x < pageSplit - 30 && (x + w) > pageSplit + 30;
    }).length;

    const isTwoColumn = leftCount > 5 && rightCount > 5 && centerSpanCount < 3;

    if (isTwoColumn) {
      const leftColItems = sortedItems.filter((it: any) => it.transform[4] < pageSplit);
      const rightColItems = sortedItems.filter((it: any) => it.transform[4] >= pageSplit);

      const renderCol = (colItems: any[]) => {
        let text = '';
        let lastY = null;
        for (const item of colItems) {
          if (lastY === null) {
            text += item.str;
          } else if (Math.abs(lastY - item.transform[5]) <= 5) {
            text += ' ' + item.str;
          } else {
            text += '\n' + item.str;
          }
          lastY = item.transform[5];
        }
        return text;
      };

      return renderCol(leftColItems) + '\n\n' + renderCol(rightColItems);
    } else {
      let text = '';
      let lastY = null;
      for (const item of sortedItems) {
        if (lastY === null) {
          text += item.str;
        } else if (Math.abs(lastY - item.transform[5]) <= 5) {
          text += ' ' + item.str;
        } else {
          text += '\n' + item.str;
        }
        lastY = item.transform[5];
      }
      return text;
    }
  });
}

export async function extractTextFromBuffer(buffer: Buffer, mimeType: string): Promise<string> {
  const normalizedMime = mimeType.toLowerCase();

  try {
    if (normalizedMime.includes('pdf')) {
      try {
        const options = {
          pagerender: renderPageColumns
        };
        const data = await pdf(buffer, options);
        return sanitizeParsedText(data.text || '');
      } catch (pdfError: any) {
        console.warn('[Parser Service] pdf-parse failed, trying Python fallback parser:', pdfError.message);
        try {
          const nlpServiceUrl = process.env.NLP_SERVICE_URL || 'http://localhost:8000';
          const formData = new FormData();
          const blob = new Blob([buffer as any], { type: 'application/pdf' });
          formData.append('file', blob, 'resume.pdf');

          const response = await fetch(`${nlpServiceUrl}/api/v1/pdf/parse`, {
            method: 'POST',
            body: formData
          });

          if (response.ok) {
            const result: any = await response.json();
            if (result.text && result.text.trim()) {
              console.log('[Parser Service] Successfully fell back to Python pypdf extractor!');
              return sanitizeParsedText(result.text);
            }
          }
        } catch (fallbackError: any) {
          console.error('[Parser Service] Python fallback parser failed:', fallbackError.message);
        }

        const fallbackRaw = buffer.toString('ascii').replace(/[^\x20-\x7E\n\r\t]/g, ' ');
        return sanitizeParsedText(fallbackRaw);
      }
    } else if (
      normalizedMime.includes('word') || 
      normalizedMime.includes('officedocument') || 
      normalizedMime.includes('docx')
    ) {
      try {
        const result = await mammoth.extractRawText({ buffer });
        return sanitizeParsedText(result.value || '');
      } catch (wordError) {
        console.warn('[Parser Service] mammoth failed, falling back to string conversion:', wordError);
        return sanitizeParsedText(buffer.toString('utf-8'));
      }
    } else {
      return sanitizeParsedText(buffer.toString('utf-8'));
    }
  } catch (error: any) {
    console.error('[Parser Service] Critical fallback failure:', error);
    throw error;
  }
}
