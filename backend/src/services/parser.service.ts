/// <reference path="../types/pdf-parse-fork.d.ts" />
import pdf from 'pdf-parse-fork';
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
      const yA = (a.transform && a.transform[5]) !== undefined ? a.transform[5] : 0;
      const yB = (b.transform && b.transform[5]) !== undefined ? b.transform[5] : 0;
      if (Math.abs(yA - yB) > 5) {
        return yB - yA;
      }
      const xA = (a.transform && a.transform[4]) !== undefined ? a.transform[4] : 0;
      const xB = (b.transform && b.transform[4]) !== undefined ? b.transform[4] : 0;
      return xA - xB;
    });

    const xCoordinates = items.map((it: any) => (it.transform && it.transform[4]) !== undefined ? it.transform[4] : 0);
    const minX = Math.min(...xCoordinates);
    const maxX = Math.max(...xCoordinates);
    const pageSplit = minX + (maxX - minX) / 2;

    const leftCount = items.filter((it: any) => {
      const x = (it.transform && it.transform[4]) !== undefined ? it.transform[4] : 0;
      return x < pageSplit - 30;
    }).length;
    
    const rightCount = items.filter((it: any) => {
      const x = (it.transform && it.transform[4]) !== undefined ? it.transform[4] : 0;
      return x > pageSplit + 30;
    }).length;
    
    const centerSpanCount = items.filter((it: any) => {
      const x = (it.transform && it.transform[4]) !== undefined ? it.transform[4] : 0;
      const w = it.width || 0;
      return x < pageSplit - 30 && (x + w) > pageSplit + 30;
    }).length;

    const isTwoColumn = leftCount > 5 && rightCount > 5 && centerSpanCount < 3;

    if (isTwoColumn) {
      const leftColItems = sortedItems.filter((it: any) => {
        const x = (it.transform && it.transform[4]) !== undefined ? it.transform[4] : 0;
        return x < pageSplit;
      });
      const rightColItems = sortedItems.filter((it: any) => {
        const x = (it.transform && it.transform[4]) !== undefined ? it.transform[4] : 0;
        return x >= pageSplit;
      });

      const renderCol = (colItems: any[]) => {
        let text = '';
        let lastY = null;
        for (const item of colItems) {
          const currentY = item.transform ? item.transform[5] : 0;
          if (lastY === null) {
            text += item.str;
          } else if (Math.abs(lastY - currentY) <= 5) {
            text += ' ' + item.str;
          } else {
            text += '\n' + item.str;
          }
          lastY = currentY;
        }
        return text;
      };

      return renderCol(leftColItems) + '\n\n' + renderCol(rightColItems);
    } else {
      let text = '';
      let lastY = null;
      for (const item of sortedItems) {
        const currentY = item.transform ? item.transform[5] : 0;
        if (lastY === null) {
          text += item.str;
        } else if (Math.abs(lastY - currentY) <= 5) {
          text += ' ' + item.str;
        } else {
          text += '\n' + item.str;
        }
        lastY = currentY;
      }
      return text;
    }
  }).catch((err: any) => {
    console.warn('[Parser Service] Page rendering failed, returning empty buffer string:', err.message);
    return '';
  });
}

export async function extractTextFromBuffer(buffer: Buffer, mimeType: string): Promise<string> {
  const normalizedMime = mimeType.toLowerCase();

  try {
    if (normalizedMime.includes('pdf')) {
      // Convert buffer to a vanilla Uint8Array to prevent Vercel/AWS Lambda buffer prototype pollution
      const cleanUint8 = new Uint8Array(buffer.buffer.slice(buffer.byteOffset, buffer.byteOffset + buffer.byteLength));
      try {
        const options = {
          pagerender: renderPageColumns
        };
        const data = await pdf(cleanUint8 as any, options);
        return sanitizeParsedText(data.text || '');
      } catch (pdfError: any) {
        console.warn('[Parser Service] Primary custom render pdf-parse failed, falling back to standard pdf-parse:', pdfError.message);
        try {
          const standardData = await pdf(cleanUint8 as any);
          return sanitizeParsedText(standardData.text || '');
        } catch (stdPdfError: any) {
          console.error('[Parser Service] Standard pdf-parse also failed:', stdPdfError.message);
          throw stdPdfError;
        }
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
    const fallbackRaw = buffer.toString('ascii').replace(/[^\x20-\x7E\n\r\t]/g, ' ');
    return sanitizeParsedText(fallbackRaw);
  }
}
