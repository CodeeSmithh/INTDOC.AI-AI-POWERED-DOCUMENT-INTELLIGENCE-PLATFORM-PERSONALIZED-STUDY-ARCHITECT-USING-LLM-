import { jsPDF } from 'jspdf';
import html2canvas from 'html2canvas';
import { Document, Packer, Paragraph, TextRun, HeadingLevel } from 'docx';
import { saveAs } from 'file-saver';

/**
 * Exports a DOM element to a PDF file.
 * @param {HTMLElement} element 
 * @param {string} filename 
 */
export const downloadAsPDF = async (element, filename = 'Summary.pdf') => {
  if (!element) return;
  
  const canvas = await html2canvas(element, {
    scale: 2,
    useCORS: true,
    backgroundColor: '#0a0a0a', // Match the dashboard dark theme
  });
  
  const imgData = canvas.toDataURL('image/png');
  const pdf = new jsPDF({
    orientation: 'portrait',
    unit: 'px',
    format: [canvas.width, canvas.height]
  });
  
  pdf.addImage(imgData, 'PNG', 0, 0, canvas.width, canvas.height);
  pdf.save(filename);
};

/**
 * Generates and downloads a .docx file from markdown text.
 * @param {string} markdownText 
 * @param {string} filename 
 */
export const downloadAsDOCX = async (markdownText, filename = 'Summary.docx') => {
  // Simple parser to convert basic markdown (headers and bullets) to docx paragraphs
  const lines = markdownText.split('\n');
  const sections = [];

  lines.forEach(line => {
    let text = line.trim();
    if (!text) return;

    if (text.startsWith('### ')) {
      sections.push(new Paragraph({
        text: text.replace('### ', ''),
        heading: HeadingLevel.HEADING_3,
        spacing: { before: 400, after: 200 }
      }));
    } else if (text.startsWith('* ')) {
      sections.push(new Paragraph({
        text: text.replace('* ', ''),
        bullet: { level: 0 },
        spacing: { after: 120 }
      }));
    } else {
      // Handle bold text in normal paragraphs roughly
      const parts = text.split('**');
      const children = parts.map((part, i) => new TextRun({
        text: part,
        bold: i % 2 === 1
      }));

      sections.push(new Paragraph({
        children,
        spacing: { after: 200 }
      }));
    }
  });

  const doc = new Document({
    sections: [{
      properties: {},
      children: sections,
    }],
  });

  const blob = await Packer.toBlob(doc);
  saveAs(blob, filename);
};
