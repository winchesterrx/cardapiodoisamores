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
            (i) =>
              `<div class="item"><strong>${i.quantity}x ${i.productName}</strong> - R$ ${(i.productPrice * i.quantity).toFixed(2).replace(".", ",")}${
                i.addons && i.addons.length > 0
                  ? `<br>&nbsp;&nbsp;+ ${i.addons.map((a) => `${a.quantity}x ${a.name}`).join(", ")}`
                  : ""
              }${i.notes ? `<br>&nbsp;&nbsp;<em>"${i.notes}"</em>` : ""}</div>`
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
  iframe.style.position = "absolute";
  iframe.style.top = "-9999px";
  iframe.style.left = "-9999px";
  document.body.appendChild(iframe);

  const doc = iframe.contentWindow?.document;
  if (doc) {
    doc.open();
    doc.write(printContent);
    doc.close();

    // Wait a brief moment for the content to render before printing
    setTimeout(() => {
      iframe.contentWindow?.focus();
      iframe.contentWindow?.print();
      
      // Remove iframe after printing dialog closes (or immediately for kiosk)
      setTimeout(() => {
        document.body.removeChild(iframe);
      }, 1000);
    }, 250);
  }
};
