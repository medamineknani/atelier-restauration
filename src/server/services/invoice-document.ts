import type { Order, OrderItem } from "@/server/db/schema";
import { site } from "@/config/site";
import type { Locale } from "@/lib/i18n";

/**
 * Facture — document HTML autoportant, imprimable au format A4.
 *
 * Pas de moteur de rendu ni de service tiers : une page HTML avec des styles
 * intégrés suffit, s'imprime en PDF depuis le navigateur et reste lisible
 * partout. Le document est auto-suffisant, donc archivable tel quel.
 */

type Customer = Order["customerSnapshot"];

const COPY: Record<Locale, Record<string, string>> = {
  fr: {
    invoice: "FACTURE",
    number: "Facture n°",
    issuedOn: "Éditée le",
    orderRef: "Commande",
    orderedOn: "Commandée le",
    billedTo: "Facturé à",
    description: "Prestation",
    quantity: "Qté",
    unit: "P.U.",
    total: "Total",
    subtotal: "Sous-total",
    shipping: "Livraison",
    discount: "Remise",
    totalDue: "Total TTC",
    paid: "Payée le",
    vat: "Montants exprimés en dinars tunisiens (TND).",
    thanks:
      "Merci de votre confiance. Vos photographies sont traitées une par une, à la main, dans notre atelier à Tunis.",
    print: "Imprimer",
  },
  en: {
    invoice: "INVOICE",
    number: "Invoice no.",
    issuedOn: "Issued on",
    orderRef: "Order",
    orderedOn: "Ordered on",
    billedTo: "Billed to",
    description: "Service",
    quantity: "Qty",
    unit: "Unit",
    total: "Total",
    subtotal: "Subtotal",
    shipping: "Shipping",
    discount: "Discount",
    totalDue: "Total incl. tax",
    paid: "Paid on",
    vat: "Amounts in Tunisian dinars (TND).",
    thanks:
      "Thank you for your trust. Every photograph is restored by hand, one at a time, in our workshop in Tunis.",
    print: "Print",
  },
  ar: {
    invoice: "فاتورة",
    number: "رقم الفاتورة",
    issuedOn: "تاريخ الإصدار",
    orderRef: "الطلب",
    orderedOn: "تاريخ الطلب",
    billedTo: "فاتورة إلى",
    description: "الخدمة",
    quantity: "الكمية",
    unit: "سعر الوحدة",
    total: "المجموع",
    subtotal: "المجموع الفرعي",
    shipping: "التوصيل",
    discount: "خصم",
    totalDue: "المجموع",
    paid: "تاريخ الدفع",
    vat: "المبالغ بالدينار التونسي (TND).",
    thanks: "شكراً لثقتكم. تتم معالجة صوركم واحدة تلو الأخرى، يدوياً، في ورشتنا بتونس.",
    print: "طباعة",
  },
};

function money(millimes: number) {
  return `${(millimes / 1000).toFixed(3).replace(/\.000$/, "")} DT`;
}

function date(value: Date, locale: Locale) {
  return new Intl.DateTimeFormat(locale, { dateStyle: "long" }).format(value);
}

function escape(value: string) {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

export async function renderInvoiceHtml(input: {
  order: Order;
  items: OrderItem[];
  invoice: { number: string; issuedAt: Date };
  customer: Customer;
  locale: Locale;
}): Promise<string> {
  const { order, items, invoice, customer, locale } = input;
  const c = COPY[locale] ?? COPY.fr;

  const rows = items
    .map(
      (item) => `
        <tr>
          <td>${escape(item.nameSnapshot)}</td>
          <td class="num">${item.quantity}</td>
          <td class="num">${money(item.unitPriceMillimes)}</td>
          <td class="num">${money(item.totalMillimes)}</td>
        </tr>`,
    )
    .join("");

  const lines = [
    `<div class="line"><span>${c.subtotal}</span><span>${money(order.subtotalMillimes)}</span></div>`,
    order.shippingMillimes > 0
      ? `<div class="line"><span>${c.shipping}</span><span>${money(order.shippingMillimes)}</span></div>`
      : "",
    order.discountMillimes > 0
      ? `<div class="line"><span>${c.discount}</span><span>−${money(order.discountMillimes)}</span></div>`
      : "",
  ].join("");

  const customerAddress = [customer.line1, customer.line2, customer.postalCode, customer.city]
    .filter(Boolean)
    .join(", ");

  return `<!doctype html>
<html lang="${locale}" dir="${locale === "ar" ? "rtl" : "ltr"}">
<head>
<meta charset="utf-8" />
<title>${c.invoice} ${invoice.number}</title>
<style>
  :root { --ink: #100F0D; --stone: #6E6862; --line: #DED7C9; --champagne: #B99B62; }
  * { box-sizing: border-box; }
  body { margin: 0; padding: 48px; background: #fff; color: var(--ink);
         font-family: "Iowan Old Style", Georgia, "Times New Roman", serif; }
  .sheet { max-width: 720px; margin: 0 auto; }
  header { display: flex; justify-content: space-between; align-items: flex-start; gap: 32px;
           border-bottom: 1px solid var(--line); padding-bottom: 24px; }
  .brand { font-size: 20px; letter-spacing: .02em; }
  .brand small { display: block; margin-top: 6px; font-size: 12px; color: var(--stone);
                 font-family: ui-sans-serif, system-ui, sans-serif; letter-spacing: 0; }
  h1 { font-size: 13px; letter-spacing: .22em; text-transform: uppercase; margin: 0;
       font-weight: 500; color: var(--champagne); }
  .meta { margin-top: 10px; font-size: 13px; color: var(--stone);
          font-family: ui-sans-serif, system-ui, sans-serif; line-height: 1.7; }
  section { margin-top: 32px; }
  h2 { font-size: 11px; letter-spacing: .16em; text-transform: uppercase; color: var(--stone);
       margin: 0 0 10px; font-weight: 500; font-family: ui-sans-serif, system-ui, sans-serif; }
  .party { font-size: 14px; line-height: 1.7; }
  table { width: 100%; border-collapse: collapse; margin-top: 8px;
          font-family: ui-sans-serif, system-ui, sans-serif; font-size: 14px; }
  th { text-align: start; font-size: 11px; letter-spacing: .12em; text-transform: uppercase;
       color: var(--stone); font-weight: 500; padding: 8px 0; border-bottom: 1px solid var(--line); }
  td { padding: 12px 0; border-bottom: 1px solid #F0ECE3; }
  .num { text-align: end; font-variant-numeric: tabular-nums; }
  th.num { text-align: end; }
  .totals { margin-top: 20px; display: flex; flex-direction: column; gap: 8px;
            font-family: ui-sans-serif, system-ui, sans-serif; font-size: 14px; }
  .totals .line { display: flex; justify-content: space-between; color: var(--stone); }
  .totals .grand { display: flex; justify-content: space-between; margin-top: 8px;
                   padding-top: 12px; border-top: 1px solid var(--line); font-size: 17px; }
  footer { margin-top: 44px; padding-top: 20px; border-top: 1px solid var(--line);
           font-size: 12px; color: var(--stone); line-height: 1.8;
           font-family: ui-sans-serif, system-ui, sans-serif; }
  @media print {
    body { padding: 0; }
    .no-print { display: none; }
  }
</style>
</head>
<body>
  <div class="sheet">
    <header>
      <div>
        <div class="brand">${site.name}<small>${site.tagline}</small></div>
        <div class="meta">
          ${site.address.street}, ${site.address.postalCode} ${site.address.city}<br />
          ${site.email} · ${site.phone}
        </div>
      </div>
      <div style="text-align:end">
        <h1>${c.invoice}</h1>
        <div class="meta">
          <strong>${c.number} ${invoice.number}</strong><br />
          ${c.issuedOn} ${date(invoice.issuedAt, locale)}<br />
          ${c.orderRef} ${order.reference} · ${c.orderedOn} ${date(order.createdAt, locale)}
          ${order.paidAt ? `<br />${c.paid} ${date(order.paidAt, locale)}` : ""}
        </div>
      </div>
    </header>

    <section>
      <h2>${c.billedTo}</h2>
      <div class="party">
        <strong>${escape(`${customer.firstName} ${customer.lastName}`.trim() || customer.email)}</strong><br />
        ${customerAddress ? `${escape(customerAddress)}<br />` : ""}
        ${escape(customer.email)}${customer.phone ? ` · ${escape(customer.phone)}` : ""}
      </div>
    </section>

    <section>
      <table>
        <thead>
          <tr>
            <th>${c.description}</th>
            <th class="num">${c.quantity}</th>
            <th class="num">${c.unit}</th>
            <th class="num">${c.total}</th>
          </tr>
        </thead>
        <tbody>${rows}</tbody>
      </table>

      <div class="totals">
        ${lines}
        <div class="grand"><span>${c.totalDue}</span><span>${money(order.totalMillimes)}</span></div>
      </div>
    </section>

    <footer>
      ${c.vat}<br />
      ${c.thanks}
    </footer>

    <div class="no-print" style="margin-top:32px">
      <button onclick="window.print()" style="font:inherit;padding:10px 18px;border:1px solid var(--line);background:#fff;cursor:pointer">${c.print}</button>
    </div>
  </div>
</body>
</html>`;
}
