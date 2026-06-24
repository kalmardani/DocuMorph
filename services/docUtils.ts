import mammoth from "mammoth";
import { Document, Packer, Paragraph, TextRun, HeadingLevel, AlignmentType } from "docx";
import { jsPDF } from "jspdf";
import saveAs from "file-saver";

// --- FILE READING HELPERS ---

export const fileToBase64 = (file: File): Promise<string> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const result = reader.result as string;
      // Remove Data URI prefix if present (e.g. "data:application/pdf;base64,")
      const base64 = result.split(",")[1];
      resolve(base64);
    };
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
};

export const readDocxText = async (file: File): Promise<string> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = async (event) => {
      try {
        const arrayBuffer = event.target?.result as ArrayBuffer;
        const result = await mammoth.extractRawText({ arrayBuffer });
        resolve(result.value);
      } catch (err) {
        reject(err);
      }
    };
    reader.onerror = reject;
    reader.readAsArrayBuffer(file);
  });
};

// --- FILE GENERATION HELPERS ---

/**
 * Parses markdown inline formatting (Bold only for now) and returns TextRuns
 */
const parseInlineFormatting = (text: string, isTable: boolean = false): TextRun[] => {
  // Split by bold markers
  const parts = text.split("**");
  
  return parts.map((part, index) => {
    // Odd indices are inside the ** **, so they are bold
    const isBold = index % 2 === 1;
    
    return new TextRun({
      text: part,
      bold: isBold,
      font: isTable ? "Courier New" : undefined, // Use monospaced for tables to keep alignment
      size: isTable ? 20 : undefined, // 10pt for tables
    });
  });
};

/**
 * Parses simple Markdown-like text from Gemini and creates a .docx Blob
 */
export const generateDocxFromMarkdown = async (markdown: string): Promise<Blob> => {
  const lines = markdown.split("\n");
  const children: Paragraph[] = [];

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const trimmed = line.trim();

    // Skip purely empty lines if they are excessive, but keep some for spacing
    if (trimmed === "") {
      children.push(new Paragraph({ text: "" }));
      continue;
    }

    // --- Headers ---
    if (trimmed.startsWith("# ")) {
      children.push(new Paragraph({
        text: trimmed.substring(2),
        heading: HeadingLevel.HEADING_1,
        spacing: { after: 240, before: 240 },
      }));
      continue;
    }
    if (trimmed.startsWith("## ")) {
      children.push(new Paragraph({
        text: trimmed.substring(3),
        heading: HeadingLevel.HEADING_2,
        spacing: { after: 200, before: 200 },
      }));
      continue;
    }
    if (trimmed.startsWith("### ")) {
      children.push(new Paragraph({
        text: trimmed.substring(4),
        heading: HeadingLevel.HEADING_3,
        spacing: { after: 160, before: 160 },
      }));
      continue;
    }

    // --- List items ---
    if (trimmed.startsWith("- ") || trimmed.startsWith("* ")) {
      children.push(new Paragraph({
        children: parseInlineFormatting(trimmed.substring(2)),
        bullet: { level: 0 },
        spacing: { after: 100 },
      }));
      continue;
    }
    
    // --- Tables (Simple Detection) ---
    // If a line starts with |, treat it as a table row.
    // Converting complex markdown tables to Docx tables is hard without a parser.
    // Fallback: Render as Monospaced text to preserve visual alignment.
    if (trimmed.startsWith("|")) {
      children.push(new Paragraph({
        children: parseInlineFormatting(trimmed, true), // true = isTable
        spacing: { after: 0, before: 0 }, // Tight spacing for "tables"
      }));
      continue;
    }

    // --- Default Paragraph ---
    children.push(new Paragraph({
      children: parseInlineFormatting(trimmed),
      spacing: { after: 140 },
      alignment: AlignmentType.BOTH
    }));
  }

  const doc = new Document({
    sections: [
      {
        properties: {},
        children: children,
      },
    ],
  });

  return await Packer.toBlob(doc);
};

/**
 * Generates a PDF from text using jsPDF
 */
export const generatePdfFromText = (text: string): Blob => {
  const doc = new jsPDF();
  
  const splitText = doc.splitTextToSize(text, 180); // 180mm width (A4 is ~210mm)
  let y = 15;
  const pageHeight = doc.internal.pageSize.height;
  
  splitText.forEach((line: string) => {
    if (y > pageHeight - 15) {
      doc.addPage();
      y = 15;
    }
    
    // Simple header detection for styling in PDF
    if (line.trim().startsWith("# ")) {
        doc.setFontSize(16);
        doc.setFont("helvetica", "bold");
        doc.text(line.replace("# ", ""), 15, y);
        y += 10;
        doc.setFont("helvetica", "normal"); // Reset
        doc.setFontSize(12);
    } else if (line.trim().startsWith("## ")) {
        doc.setFontSize(14);
        doc.setFont("helvetica", "bold");
        doc.text(line.replace("## ", ""), 15, y);
        y += 8;
        doc.setFont("helvetica", "normal");
        doc.setFontSize(12);
    } else {
        doc.text(line, 15, y);
        y += 7;
    }
  });

  return doc.output("blob");
};

export const saveFile = (blob: Blob, fileName: string) => {
  saveAs(blob, fileName);
};