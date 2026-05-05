import * as pdfjsLib from 'pdfjs-dist';
import pdfWorker from 'pdfjs-dist/build/pdf.worker.mjs?url';
import mammoth from 'mammoth';
import JSZip from 'jszip';

// Set up the PDF.js worker using the local bundled worker
pdfjsLib.GlobalWorkerOptions.workerSrc = pdfWorker;

/**
 * Extracts raw text from a PDF File object.
 * @param {File} file 
 * @returns {Promise<string>}
 */
export const extractTextFromPDF = async (file) => {
  const arrayBuffer = await file.arrayBuffer();
  const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
  let fullText = '';

  for (let i = 1; i <= pdf.numPages; i++) {
    const page = await pdf.getPage(i);
    const content = await page.getTextContent();
    const strings = content.items
      .map(item => item.str || '')
      .filter(str => str.trim().length > 0);
    fullText += strings.join(' ') + '\n';
  }

  return fullText;
};

/**
 * Extracts raw text from a DOCX File object.
 * @param {File} file 
 * @returns {Promise<string>}
 */
export const extractTextFromDOCX = async (file) => {
  const arrayBuffer = await file.arrayBuffer();
  const result = await mammoth.extractRawText({ arrayBuffer });
  return result.value;
};

/**
 * Extracts raw text from a PPTX (PowerPoint) File object.
 * @param {File} file 
 * @returns {Promise<string>}
 */
export const extractTextFromPPTX = async (file) => {
  const zip = await JSZip.loadAsync(file);
  const slideFiles = Object.keys(zip.files).filter(name => name.startsWith('ppt/slides/slide') && name.endsWith('.xml'));
  
  // Sort slides numerically
  slideFiles.sort((a, b) => {
    const aNum = parseInt(a.replace(/[^\d]/g, '') || '0');
    const bNum = parseInt(b.replace(/[^\d]/g, '') || '0');
    return aNum - bNum;
  });

  let fullText = '';
  
  for (const slide of slideFiles) {
    const content = await zip.file(slide).async('text');
    // Simple regex to extract text between <a:t>...</a:t> tags
    const matches = content.match(/<a:t>([\s\S]*?)<\/a:t>/g);
    if (matches) {
      const slideText = matches.map(m => m.replace(/<[^>]+>/g, '')).join(' ');
      fullText += `--- Slide ${slide.replace(/[^\d]/g, '')} ---\n${slideText}\n\n`;
    }
  }

  return fullText;
};

