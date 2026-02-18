import jsPDF from "jspdf";
import { format } from "date-fns";

interface ReceiptData {
  shop: {
    name: string;
    address?: string | null;
    phone?: string | null;
    email?: string | null;
    tax_id?: string | null;
    currency: string;
  };
  sale: {
    invoice_number: string;
    total_amount: number;
    subtotal: number;
    tax_amount: number;
    discount_amount: number;
    created_at: string;
  };
  items: Array<{
    product: {
      name: string;
      sku: string;
      price: number;
    };
    quantity: number;
  }>;
  customerName?: string;
  customerPhone?: string;
  paymentMethod: string;
}

export async function generateReceipt(data: ReceiptData): Promise<Blob> {
  const pdf = new jsPDF({
    orientation: "portrait",
    unit: "mm",
    format: "a4",
  });

  const pageWidth = pdf.internal.pageSize.getWidth();
  let y = 20;

  // Header - Shop Name
  pdf.setFontSize(24);
  pdf.setFont("helvetica", "bold");
  pdf.text(data.shop.name.toUpperCase(), pageWidth / 2, y, { align: "center" });
  y += 10;

  // Shop Details
  pdf.setFontSize(10);
  pdf.setFont("helvetica", "normal");
  if (data.shop.address) {
    pdf.text(data.shop.address, pageWidth / 2, y, { align: "center" });
    y += 5;
  }
  if (data.shop.phone || data.shop.email) {
    const contact = [data.shop.phone, data.shop.email]
      .filter(Boolean)
      .join(" | ");
    pdf.text(contact, pageWidth / 2, y, { align: "center" });
    y += 5;
  }
  if (data.shop.tax_id) {
    pdf.text(`Tax ID: ${data.shop.tax_id}`, pageWidth / 2, y, {
      align: "center",
    });
    y += 5;
  }

  y += 10;
  pdf.line(15, y, pageWidth - 15, y);
  y += 8;

  // Invoice Details
  pdf.setFontSize(12);
  pdf.setFont("helvetica", "bold");
  pdf.text("SALES RECEIPT", pageWidth / 2, y, { align: "center" });
  y += 8;

  pdf.setFontSize(10);
  pdf.setFont("helvetica", "normal");
  pdf.text(`Invoice #: ${data.sale.invoice_number}`, 15, y);
  y += 5;
  pdf.text(
    `Date: ${format(new Date(data.sale.created_at), "dd MMM yyyy, hh:mm a")}`,
    15,
    y,
  );
  y += 5;
  pdf.text(`Payment Method: ${data.paymentMethod.toUpperCase()}`, 15, y);
  y += 5;

  // Customer Details
  if (data.customerName || data.customerPhone) {
    y += 3;
    if (data.customerName) {
      pdf.text(`Customer: ${data.customerName}`, 15, y);
      y += 5;
    }
    if (data.customerPhone) {
      pdf.text(`Phone: ${data.customerPhone}`, 15, y);
      y += 5;
    }
  }

  y += 5;
  pdf.line(15, y, pageWidth - 15, y);
  y += 8;

  // Items Header
  pdf.setFont("helvetica", "bold");
  pdf.text("Item", 15, y);
  pdf.text("Qty", pageWidth - 70, y, { align: "right" });
  pdf.text("Price", pageWidth - 50, y, { align: "right" });
  pdf.text("Total", pageWidth - 15, y, { align: "right" });
  y += 5;
  pdf.line(15, y, pageWidth - 15, y);
  y += 6;

  // Items
  pdf.setFont("helvetica", "normal");
  data.items.forEach((item) => {
    const itemTotal = item.product.price * item.quantity;

    // Product name
    pdf.text(item.product.name, 15, y);
    y += 4;

    // SKU
    pdf.setFontSize(8);
    pdf.setTextColor(128, 128, 128);
    pdf.text(`SKU: ${item.product.sku}`, 15, y);
    pdf.setTextColor(0, 0, 0);
    pdf.setFontSize(10);
    y += 1;

    // Move back up for aligned numbers
    y -= 5;
    pdf.text(item.quantity.toString(), pageWidth - 70, y, { align: "right" });
    pdf.text(
      `${data.shop.currency} ${item.product.price.toFixed(2)}`,
      pageWidth - 50,
      y,
      { align: "right" },
    );
    pdf.text(
      `${data.shop.currency} ${itemTotal.toFixed(2)}`,
      pageWidth - 15,
      y,
      { align: "right" },
    );
    y += 10;
  });

  y += 3;
  pdf.line(15, y, pageWidth - 15, y);
  y += 8;

  // Totals
  const rightAlign = pageWidth - 15;

  pdf.text("Subtotal:", pageWidth - 70, y);
  pdf.text(
    `${data.shop.currency} ${data.sale.subtotal.toFixed(2)}`,
    rightAlign,
    y,
    { align: "right" },
  );
  y += 5;

  if (data.sale.discount_amount > 0) {
    pdf.text("Discount:", pageWidth - 70, y);
    pdf.text(
      `-${data.shop.currency} ${data.sale.discount_amount.toFixed(2)}`,
      rightAlign,
      y,
      { align: "right" },
    );
    y += 5;
  }

  if (data.sale.tax_amount > 0) {
    pdf.text("Tax:", pageWidth - 70, y);
    pdf.text(
      `${data.shop.currency} ${data.sale.tax_amount.toFixed(2)}`,
      rightAlign,
      y,
      { align: "right" },
    );
    y += 5;
  }

  y += 2;
  pdf.setFont("helvetica", "bold");
  pdf.setFontSize(12);
  pdf.text("TOTAL:", pageWidth - 70, y);
  pdf.text(
    `${data.shop.currency} ${data.sale.total_amount.toFixed(2)}`,
    rightAlign,
    y,
    { align: "right" },
  );

  // Footer - Thank you message
  y += 15;
  pdf.setFontSize(11);
  pdf.setFont("helvetica", "italic");
  pdf.text("Thank you for your business!", pageWidth / 2, y, {
    align: "center",
  });
  y += 6;
  pdf.setFontSize(9);
  pdf.setFont("helvetica", "normal");
  pdf.text("Please visit us again!", pageWidth / 2, y, { align: "center" });

  // Generate blob
  return pdf.output("blob");
}
