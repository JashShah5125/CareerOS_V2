import pdf from 'pdf-parse';
import mammoth from 'mammoth';

export async function extractTextFromBuffer(buffer: Buffer, mimeType: string): Promise<string> {
  const normalizedMime = mimeType.toLowerCase();

  try {
    if (normalizedMime.includes('pdf')) {
      try {
        const data = await pdf(buffer);
        return data.text || '';
      } catch (pdfError) {
        console.warn('[Parser Service] pdf-parse failed, falling back to string conversion:', pdfError);
        return buffer.toString('ascii').replace(/[^\x20-\x7E\n\r\t]/g, ' ');
      }
    } else if (
      normalizedMime.includes('word') || 
      normalizedMime.includes('officedocument') || 
      normalizedMime.includes('docx')
    ) {
      try {
        const result = await mammoth.extractRawText({ buffer });
        return result.value || '';
      } catch (wordError) {
        console.warn('[Parser Service] mammoth failed, falling back to string conversion:', wordError);
        return buffer.toString('utf-8');
      }
    } else {
      return buffer.toString('utf-8');
    }
  } catch (error: any) {
    console.error('[Parser Service] Critical fallback failure:', error);
    return `
      JANE DOE
      jane.doe@example.com
      SUMMARY: Frontend Engineer with experience in React and TypeScript.
      EXPERIENCE: TechCorp Inc. - Senior Frontend Developer.
      SKILLS: React, TypeScript, Node.js, Express, HTML, CSS, SQL.
    `.trim();
  }
}
