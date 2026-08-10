import type { Order } from "@/data/menuData";

export const printOrder = (order: Order) => {
  const printContent = `
    <html>
      <head>
        <title>Pedido #${order.number}</title>
        <style>
          @page { margin: 0; }
          body { font-family: monospace; padding: 10px; width: 58mm; margin: 0 auto; box-sizing: border-box; font-size: 12px; }
          h1 { font-size: 16px; text-align: center; border-bottom: 1px dashed #000; padding-bottom: 5px; margin: 5px 0; }
          .item { margin: 4px 0; font-size: 12px; }
          .total { font-size: 14px; font-weight: bold; border-top: 1px dashed #000; padding-top: 5px; margin-top: 5px; text-align: right; }
          .info { font-size: 11px; margin-top: 5px; border-top: 1px dashed #000; padding-top: 5px; }
        </style>
      </head>
      <body>
        <h1>Açaí Dois Amores <br>Pedido #${order.number}</h1>
        <p style="font-size:11px;text-align:center;margin:0 0 5px 0;">${new Date(order.createdAt).toLocaleString("pt-BR")}</p>
        ${order.items
          .map(
            (i) => {
              let productName = i.productName;
              const lower = productName.toLowerCase();
              if (lower.includes("açaí") || lower.includes("acai")) {
                if (lower.includes("pequeno")) productName += " (300ml)";
                else if (lower.includes("médio") || lower.includes("medio")) productName += " (500ml)";
                else if (lower.includes("grande")) productName += " (700ml)";
              }
              return `<div class="item"><strong>${i.quantity}x ${productName}</strong> - R$ ${(i.productPrice * i.quantity).toFixed(2).replace(".", ",")}${
                i.addons && i.addons.length > 0
                  ? i.addons.map((a) => `<br>&nbsp;&nbsp;+ ${a.quantity}x ${a.name}`).join("")
                  : ""
              }${i.notes ? `<br>&nbsp;&nbsp;<em>"${i.notes}"</em>` : ""}</div>`;
            }
          )
          .join("")}
        <div class="total">TOTAL: R$ ${order.total.toFixed(2).replace(".", ",")}</div>
        <div class="info">
          <p style="margin:2px 0;">🛒 ${order.consumeType}${order.address ? ` - ${order.address}` : ""}${order.mesa ? ` - Mesa ${order.mesa}` : ""}</p>
          <p style="margin:2px 0;">💳 ${order.paymentMethod}</p>
          <p style="margin:2px 0;">📱 ${order.customerWhatsApp || "Não informado"}</p>
        </div>
      </body>
    </html>
  `;

  // Create a hidden iframe
  const iframe = document.createElement("iframe");
  iframe.style.position = "fixed";
  iframe.style.right = "0";
  iframe.style.bottom = "0";
  iframe.style.width = "0";
  iframe.style.height = "0";
  iframe.style.border = "0";
  document.body.appendChild(iframe);

  const doc = iframe.contentWindow?.document;
  if (doc) {
    doc.open();
    doc.write(printContent);
    doc.close();

    // Wait a brief moment for the content to render before printing
    setTimeout(() => {
      const win = iframe.contentWindow;
      if (win) {
        iframe.focus();
        win.focus();
        
        try {
          win.print();
        } catch (e) {
          console.error("Print failed", e);
        }

        // Clean up iframe after a delay to allow print dialog to open and close
        setTimeout(() => {
          if (document.body.contains(iframe)) {
            document.body.removeChild(iframe);
          }
        }, 2000);
      }
    }, 500);
  }
};
