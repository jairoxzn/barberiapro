import { PDFDocument, StandardFonts, rgb } from 'pdf-lib';

const PAYMENT_LABEL = {
  CASH: 'Efectivo',
  YAPE: 'Yape',
  PLIN: 'Plin',
  TRANSFER: 'Transferencia',
  CARD: 'Tarjeta',
  POINTS: 'Puntos',
};

// Ticket de 80 mm de ancho (226.77 pt), alto dinámico según las líneas.
const WIDTH = 226.77;
const MARGIN = 12;

export const buildTicketPdf = async (sale) => {
  const lineCount = sale.items.length + sale.payments.length;
  const height = 300 + lineCount * 26;

  const pdf = await PDFDocument.create();
  const page = pdf.addPage([WIDTH, height]);
  const font = await pdf.embedFont(StandardFonts.Helvetica);
  const bold = await pdf.embedFont(StandardFonts.HelveticaBold);

  const currency = sale.tenant?.settings?.currency ?? 'PEN';
  const symbol = currency === 'PEN' ? 'S/' : '$';
  const money = (n) => `${symbol} ${Number(n).toFixed(2)}`;

  let y = height - MARGIN;

  const text = (str, { size = 8, f = font, align = 'left', color } = {}) => {
    const width = f.widthOfTextAtSize(str, size);
    let x = MARGIN;
    if (align === 'center') x = (WIDTH - width) / 2;
    if (align === 'right') x = WIDTH - MARGIN - width;
    page.drawText(str, { x, y, size, font: f, color: color ?? rgb(0.1, 0.1, 0.1) });
    y -= size + 4;
  };

  // Fila con etiqueta a la izquierda e importe a la derecha.
  const row = (left, right, { size = 8, f = font } = {}) => {
    page.drawText(left, { x: MARGIN, y, size, font: f });
    const w = f.widthOfTextAtSize(right, size);
    page.drawText(right, { x: WIDTH - MARGIN - w, y, size, font: f });
    y -= size + 4;
  };

  const divider = () => {
    page.drawLine({
      start: { x: MARGIN, y: y + 4 },
      end: { x: WIDTH - MARGIN, y: y + 4 },
      thickness: 0.5,
      color: rgb(0.75, 0.75, 0.75),
    });
    y -= 6;
  };

  // --- Encabezado ---
  text(sale.tenant?.name ?? 'BarberiaPro', { size: 12, f: bold, align: 'center' });
  if (sale.branch?.name) text(sale.branch.name, { size: 8, align: 'center' });
  y -= 2;
  text(`Ticket ${sale.code}`, { size: 9, f: bold, align: 'center' });
  text(new Date(sale.createdAt).toLocaleString('es-PE'), { size: 7, align: 'center' });

  if (sale.client) {
    const name = `${sale.client.firstName} ${sale.client.lastName ?? ''}`.trim();
    text(`Cliente: ${name}`, { size: 8, align: 'center' });
  }

  y -= 2;
  divider();

  // --- Detalle ---
  for (const item of sale.items) {
    text(item.description, { size: 8, f: bold });
    row(
      `  ${item.quantity} x ${money(item.unitPrice)}`,
      money(item.total),
      { size: 8 }
    );
    if (Number(item.discount) > 0) {
      row('  Descuento', `-${money(item.discount)}`, { size: 7 });
    }
  }

  divider();

  // --- Totales ---
  row('Subtotal', money(sale.subtotal));
  if (Number(sale.discount) > 0) row('Descuento', `-${money(sale.discount)}`);
  if (Number(sale.tax) > 0) row('Impuesto', money(sale.tax));
  y -= 2;
  row('TOTAL', money(sale.total), { size: 11, f: bold });

  divider();

  // --- Pagos ---
  text('Pagos', { size: 8, f: bold });
  for (const p of sale.payments) {
    row(`  ${PAYMENT_LABEL[p.method] ?? p.method}`, money(p.amount), { size: 8 });
  }

  if (sale.pointsEarned > 0) {
    y -= 2;
    divider();
    text(`Puntos ganados: ${sale.pointsEarned}`, { size: 8, f: bold, align: 'center' });
  }

  y -= 6;
  text('¡Gracias por su preferencia!', { size: 8, align: 'center' });

  return pdf.save();
};
