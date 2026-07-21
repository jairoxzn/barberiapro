import ExcelJS from 'exceljs';
import { PDFDocument, StandardFonts, rgb } from 'pdf-lib';

// ============================================================================
//  Motor de exportación genérico.
//  Consume una "definición de reporte" uniforme y produce CSV / Excel / PDF:
//  { title, subtitle?, columns:[{key,label,align?,type?}], rows:[], summary?:[] }
//  type: 'money' | 'number' | 'date' | 'text'
// ============================================================================

const rawValue = (row, col) => {
  const v = row[col.key];
  if (v == null) return '';
  return v;
};

// Valor legible (para CSV/PDF): formatea dinero/número/fecha.
const displayValue = (row, col, symbol) => {
  const v = row[col.key];
  if (v == null || v === '') return '';
  switch (col.type) {
    case 'money':
      return `${symbol} ${Number(v).toFixed(2)}`;
    case 'number':
      return String(v);
    case 'date':
      return new Date(v).toLocaleString('es-PE');
    default:
      return String(v);
  }
};

// ---------------------------------------------------------------- CSV
export const toCsv = (report) => {
  const esc = (s) => {
    const str = String(s ?? '');
    return /[",\n;]/.test(str) ? `"${str.replace(/"/g, '""')}"` : str;
  };

  const lines = [];
  lines.push(report.columns.map((c) => esc(c.label)).join(','));

  for (const row of report.rows) {
    lines.push(
      report.columns
        .map((c) => {
          const v = rawValue(row, c);
          // Números crudos para que Excel/Sheets puedan operar con ellos.
          if ((c.type === 'money' || c.type === 'number') && v !== '') {
            return Number(v);
          }
          if (c.type === 'date' && v !== '') return new Date(v).toISOString();
          return esc(v);
        })
        .join(',')
    );
  }

  if (report.summary?.length) {
    lines.push('');
    for (const s of report.summary) lines.push(`${esc(s.label)},${esc(s.value)}`);
  }

  // BOM para que Excel reconozca UTF-8.
  return Buffer.from('﻿' + lines.join('\n'), 'utf8');
};

// ---------------------------------------------------------------- Excel
export const toXlsx = async (report) => {
  const wb = new ExcelJS.Workbook();
  wb.creator = 'BarberiaPro';
  const ws = wb.addWorksheet('Reporte', {
    views: [{ state: 'frozen', ySplit: 3 }],
  });

  // Título
  const lastCol = report.columns.length;
  ws.mergeCells(1, 1, 1, lastCol);
  const titleCell = ws.getCell(1, 1);
  titleCell.value = report.title;
  titleCell.font = { size: 14, bold: true, color: { argb: 'FF4F46E5' } };

  if (report.subtitle) {
    ws.mergeCells(2, 1, 2, lastCol);
    ws.getCell(2, 1).value = report.subtitle;
    ws.getCell(2, 1).font = { size: 10, color: { argb: 'FF64748B' } };
  }

  // Encabezados
  const headerRow = ws.getRow(3);
  report.columns.forEach((c, i) => {
    const cell = headerRow.getCell(i + 1);
    cell.value = c.label;
    cell.font = { bold: true, color: { argb: 'FFFFFFFF' } };
    cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF4F46E5' } };
    cell.alignment = { horizontal: c.align || 'left' };
  });
  headerRow.commit();

  // Filas
  report.rows.forEach((row) => {
    const r = ws.addRow(
      report.columns.map((c) => {
        const v = rawValue(row, c);
        if (c.type === 'money' || c.type === 'number') return v === '' ? null : Number(v);
        if (c.type === 'date' && v) return new Date(v);
        return v;
      })
    );
    report.columns.forEach((c, i) => {
      const cell = r.getCell(i + 1);
      if (c.type === 'money') cell.numFmt = '#,##0.00';
      if (c.type === 'date') cell.numFmt = 'dd/mm/yyyy hh:mm';
      cell.alignment = { horizontal: c.align || 'left' };
    });
  });

  // Anchos
  report.columns.forEach((c, i) => {
    ws.getColumn(i + 1).width = Math.max(c.label.length + 4, c.type === 'money' ? 14 : 18);
  });

  // Totales
  if (report.summary?.length) {
    ws.addRow([]);
    for (const s of report.summary) {
      const r = ws.addRow([s.label, s.value]);
      r.getCell(1).font = { bold: true };
      r.getCell(2).font = { bold: true };
    }
  }

  return Buffer.from(await wb.xlsx.writeBuffer());
};

// ---------------------------------------------------------------- PDF
export const toPdf = async (report, { symbol = 'S/' } = {}) => {
  const pdf = await PDFDocument.create();
  const font = await pdf.embedFont(StandardFonts.Helvetica);
  const bold = await pdf.embedFont(StandardFonts.HelveticaBold);

  // A4 horizontal
  const PAGE_W = 842;
  const PAGE_H = 595;
  const MARGIN = 36;
  const usable = PAGE_W - MARGIN * 2;

  const cols = report.columns;
  // Ancho proporcional; las columnas de dinero/número más angostas.
  const weights = cols.map((c) => (c.type === 'money' || c.type === 'number' ? 1 : 2));
  const totalW = weights.reduce((a, b) => a + b, 0);
  const colW = weights.map((w) => (w / totalW) * usable);

  let page = pdf.addPage([PAGE_W, PAGE_H]);
  let y = PAGE_H - MARGIN;

  const brand = rgb(0.31, 0.27, 0.9);
  const gray = rgb(0.4, 0.44, 0.52);

  const drawText = (str, x, yy, { f = font, size = 8, color } = {}) =>
    page.drawText(String(str ?? ''), { x, y: yy, size, font: f, color: color ?? rgb(0.1, 0.1, 0.1) });

  // Recorta texto para que quepa en el ancho de columna.
  const clip = (str, width, f, size) => {
    let s = String(str ?? '');
    while (s.length && f.widthOfTextAtSize(s, size) > width - 6) s = s.slice(0, -1);
    return s;
  };

  // Encabezado del documento
  drawText(report.title, MARGIN, y, { f: bold, size: 15, color: brand });
  y -= 16;
  if (report.subtitle) {
    drawText(report.subtitle, MARGIN, y, { size: 9, color: gray });
    y -= 14;
  }
  y -= 6;

  const drawHeader = () => {
    page.drawRectangle({
      x: MARGIN,
      y: y - 4,
      width: usable,
      height: 18,
      color: brand,
    });
    let x = MARGIN + 4;
    cols.forEach((c, i) => {
      const align = c.align === 'right';
      const label = clip(c.label, colW[i], bold, 8);
      const tx = align ? x + colW[i] - 8 - bold.widthOfTextAtSize(label, 8) : x;
      drawText(label, tx, y + 1, { f: bold, size: 8, color: rgb(1, 1, 1) });
      x += colW[i];
    });
    y -= 20;
  };

  drawHeader();

  const rowHeight = 16;
  for (const [idx, row] of report.rows.entries()) {
    if (y < MARGIN + 30) {
      page = pdf.addPage([PAGE_W, PAGE_H]);
      y = PAGE_H - MARGIN;
      drawHeader();
    }
    if (idx % 2 === 1) {
      page.drawRectangle({
        x: MARGIN,
        y: y - 3,
        width: usable,
        height: rowHeight,
        color: rgb(0.96, 0.97, 0.99),
      });
    }
    let x = MARGIN + 4;
    cols.forEach((c, i) => {
      const val = clip(displayValue(row, c, symbol), colW[i], font, 8);
      const align = c.align === 'right';
      const tx = align ? x + colW[i] - 8 - font.widthOfTextAtSize(val, 8) : x;
      drawText(val, tx, y, { size: 8 });
      x += colW[i];
    });
    y -= rowHeight;
  }

  // Totales
  if (report.summary?.length) {
    y -= 8;
    for (const s of report.summary) {
      if (y < MARGIN + 20) {
        page = pdf.addPage([PAGE_W, PAGE_H]);
        y = PAGE_H - MARGIN;
      }
      drawText(`${s.label}:`, MARGIN, y, { f: bold, size: 9 });
      drawText(String(s.value), MARGIN + 160, y, { f: bold, size: 9, color: brand });
      y -= 15;
    }
  }

  return Buffer.from(await pdf.save());
};

// Despacha al formato solicitado; devuelve { buffer, mime, ext }.
export const exportReport = async (report, format, opts) => {
  switch (format) {
    case 'csv':
      return { buffer: toCsv(report), mime: 'text/csv; charset=utf-8', ext: 'csv' };
    case 'xlsx':
    case 'excel':
      return {
        buffer: await toXlsx(report),
        mime: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        ext: 'xlsx',
      };
    case 'pdf':
      return { buffer: await toPdf(report, opts), mime: 'application/pdf', ext: 'pdf' };
    default:
      return null;
  }
};
