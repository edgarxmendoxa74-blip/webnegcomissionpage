/**
 * SmartMenu Partner Program — Certificate of Partnership.
 *
 * Kept as one standalone HTML document so the same markup drives the print /
 * PDF output and the PNG export. A4 portrait, fixed 210 × 297 mm.
 */

export interface PartnerCertificateData {
  fullName: string;
  businessName: string;
  email: string;
  mobileNumber: string;
  businessAddress: string;
  offeredPrice: string;
  markup: string;
  stampDate: string;
}

const escapeHTML = (value: string): string =>
  value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');

export function buildPartnerCertificateHTML(
  data: PartnerCertificateData,
  logoUrl: string,
): string {
  const esc = escapeHTML;
  const fullName = esc(data.fullName);
  const businessName = esc(data.businessName);
  const email = esc(data.email);
  const mobileNumber = esc(data.mobileNumber);
  const businessAddress = esc(data.businessAddress);
  const offeredPrice = esc(data.offeredPrice);
  const markup = esc(data.markup);
  const stampDate = esc(data.stampDate);

  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8"/>
<title>Certificate of Partnership - ${fullName} - SmartMenu</title>
<style>
  @import url('https://fonts.googleapis.com/css2?family=Cinzel:wght@400;700;900&family=EB+Garamond:ital,wght@0,400;0,600;1,400&family=Montserrat:wght@400;600;700;800&display=swap');
  *, *::before, *::after { margin:0; padding:0; box-sizing:border-box; }
  html, body { width:210mm; height:297mm; overflow:hidden; background:#fff; -webkit-print-color-adjust:exact; print-color-adjust:exact; }
  .page { width:210mm; height:297mm; position:relative; display:flex; flex-direction:column; background:#fff; }

  /* ── top band ── */
  .top-band {
    background:linear-gradient(135deg,#8B0000,#E8191A);
    height:45mm;
    display:flex;
    align-items:center;
    justify-content:center;
    flex-direction:column;
    gap:3mm;
    position:relative;
    flex-shrink:0;
  }
  .band-notch { position:absolute; bottom:-6mm; left:0; right:0; height:8mm; background:#fff; clip-path:polygon(0 100%,100% 100%,100% 0); }
  .amber-line { position:absolute; bottom:0; left:0; right:0; height:3px; background:linear-gradient(to right,#F5A623,#FFD700,#F5A623); }

  /* white plate keeps the full-colour logo legible on the red band */
  .logo-plate {
    background:#ffffff;
    border-radius:4mm;
    padding:2mm 3mm;
    box-shadow:0 2mm 5mm rgba(0,0,0,0.25);
    line-height:0;
  }
  .header-logo { width:19mm; height:19mm; object-fit:contain; display:block; }

  .header-eyebrow { font-family:'Montserrat',sans-serif; font-size:6.5pt; font-weight:700; letter-spacing:4px; color:rgba(255,255,255,0.7); text-transform:uppercase; text-align:center; }
  .header-title { font-family:'Cinzel',serif; font-size:21pt; font-weight:900; color:#fff; letter-spacing:4px; text-transform:uppercase; line-height:1.05; text-shadow:0 2px 8px rgba(0,0,0,0.3); text-align:center; margin-top:1mm; }
  .header-sub { font-family:'Cinzel',serif; font-size:8.5pt; font-weight:400; color:rgba(255,255,255,0.75); letter-spacing:6px; text-transform:uppercase; text-align:center; margin-top:0.8mm; }

  /* ── accent rails (flattened from ::before/::after so html-to-image keeps them) ── */
  .side-bar { position:absolute; top:0; bottom:0; width:3px; }
  .side-bar.left { left:9mm; background:linear-gradient(to bottom,#E8191A 0%,#E8191A 100%); }
  .side-bar.right { right:9mm; background:linear-gradient(to bottom,#F5A623 0%,#F5A623 100%); }

  /* ── body ── */
  .cert-body { flex:1; display:flex; flex-direction:column; align-items:center; justify-content:center; padding:12mm 20mm 6mm; text-align:center; position:relative; }
  .watermark { position:absolute; top:50%; left:50%; transform:translate(-50%,-50%); width:90mm; height:90mm; opacity:0.026; pointer-events:none; }
  .watermark img { width:100%; height:100%; object-fit:contain; }

  .to-whom { font-family:'EB Garamond',serif; font-size:10.5pt; font-style:italic; color:#aaa; letter-spacing:1px; margin-bottom:4mm; }
  .certify-line { font-family:'EB Garamond',serif; font-size:12.5pt; font-style:italic; color:#666; margin-bottom:4.5mm; }
  .partner-badge { display:inline-block; padding:1.5mm 5mm; background:rgba(232,25,26,0.08); border:1px solid rgba(232,25,26,0.3); border-radius:20px; font-family:'Montserrat',sans-serif; font-size:7.5pt; font-weight:700; color:#E8191A; letter-spacing:3px; text-transform:uppercase; margin-bottom:5mm; }
  .employee-name { font-family:'Cinzel',serif; font-size:30pt; font-weight:700; color:#1a1a1a; letter-spacing:1px; line-height:1.15; display:block; margin-bottom:2mm; }
  .name-rule { display:block; height:2px; margin:0 auto 6mm; width:70%; background:linear-gradient(to right,transparent,#E8191A 25%,#E8191A 75%,transparent); }
  .body-text { font-family:'EB Garamond',serif; font-size:12.5pt; color:#444; line-height:1.85; max-width:160mm; margin:0 auto 6mm; }
  .em { color:#E8191A; font-weight:600; }

  /* ── details ── */
  .detail-box { background:#f9f9f9; border:1px solid #eee; border-radius:4mm; padding:6mm 8mm; width:100%; max-width:162mm; text-align:left; display:grid; grid-template-columns:1fr 1fr; gap:4mm 6mm; margin-top:1mm; }
  .detail-item .label { font-family:'Montserrat',sans-serif; font-size:6.5pt; font-weight:700; color:#bbb; text-transform:uppercase; letter-spacing:2px; }
  .detail-item .value { font-family:'Montserrat',sans-serif; font-size:10pt; font-weight:700; color:#333; margin-top:0.8mm; word-break:break-word; }
  .detail-item.price .value { color:#E8191A; font-size:11.5pt; }
  .detail-item.markup .value { color:#2a7d4f; font-size:11.5pt; }

  /* ── stamp ── */
  .stamp-wrap { margin:9mm 0 0; display:flex; flex-direction:column; align-items:center; gap:4mm; }
  .stamp { display:inline-block; border:4px solid rgba(232,25,26,0.6); border-radius:3mm; padding:2mm 7mm; transform:rotate(-8deg); }
  .stamp-text { font-family:'Cinzel',serif; font-size:18pt; font-weight:900; color:rgba(232,25,26,0.6); letter-spacing:4px; text-transform:uppercase; }
  .stamp-date { font-family:'Montserrat',sans-serif; font-size:7pt; color:rgba(0,0,0,0.35); text-align:center; letter-spacing:1px; }

  /* ── footer ── */
  .footer-band { background:linear-gradient(135deg,#1a1a1a,#2a2a2a); height:26mm; display:flex; align-items:center; justify-content:space-between; padding:0 14mm; flex-shrink:0; position:relative; }
  .footer-rule { position:absolute; top:0; left:0; right:0; height:2px; background:linear-gradient(to right,#F5A623,#FFD700,#F5A623); }
  .sig-block { text-align:center; line-height:1.3; }
  .sig-line { width:50mm; height:1px; background:rgba(255,255,255,0.3); margin:0 auto 1.5mm; }
  .sig-name { font-family:'Cinzel',serif; font-size:10pt; font-weight:700; color:#fff; letter-spacing:0.5px; }
  .sig-title { font-family:'Montserrat',sans-serif; font-size:6pt; font-weight:600; color:#F5A623; letter-spacing:2px; text-transform:uppercase; margin-top:0.5mm; }
  .sig-company { font-family:'Montserrat',sans-serif; font-size:5.5pt; color:rgba(255,255,255,0.35); text-transform:uppercase; letter-spacing:2px; }
  .footer-brand { display:flex; flex-direction:column; align-items:flex-end; gap:1.5mm; }
  .footer-plate { background:#fff; border-radius:2mm; padding:1mm 1.5mm; line-height:0; }
  .footer-logo { width:9mm; height:9mm; object-fit:contain; display:block; }
  .footer-tagline { font-family:'Montserrat',sans-serif; font-size:5.5pt; font-weight:700; color:#F5A623; letter-spacing:2px; text-transform:uppercase; }
  .footer-date { font-family:'EB Garamond',serif; font-size:8.5pt; font-style:italic; color:rgba(255,255,255,0.6); }

  @page { size:A4 portrait; margin:0; }
  @media print { html,body { width:210mm; height:297mm; } }
</style>
</head>
<body>
<div class="page">
  <div class="top-band">
    <div class="amber-line"></div>
    <div class="band-notch"></div>
    <div class="logo-plate"><img src="${logoUrl}" alt="SmartMenu" class="header-logo"/></div>
    <div>
      <div class="header-eyebrow">SmartMenu &middot; Official Partnership Document</div>
      <div class="header-title">Certificate of Partnership</div>
      <div class="header-sub">Partner Program Registration</div>
    </div>
  </div>

  <div class="cert-body">
    <div class="watermark"><img src="${logoUrl}" alt=""/></div>
    <div class="side-bar left"></div>
    <div class="side-bar right"></div>

    <div class="to-whom">To Whom It May Concern:</div>
    <div class="certify-line">This is to certify that</div>
    <div class="partner-badge">Official SmartMenu Partner</div>
    <span class="employee-name">${fullName}</span>
    <span class="name-rule"></span>
    <p class="body-text">
      has officially registered as an authorized partner of <span class="em">SmartMenu</span>.<br/>
      This partner is duly recognized under the SmartMenu Partner Program
      and has agreed to all terms and conditions.
    </p>

    <div class="detail-box">
      <div class="detail-item"><div class="label">Business Name</div><div class="value">${businessName}</div></div>
      <div class="detail-item"><div class="label">Email</div><div class="value">${email}</div></div>
      <div class="detail-item"><div class="label">Mobile</div><div class="value">${mobileNumber}</div></div>
      <div class="detail-item"><div class="label">Address</div><div class="value">${businessAddress}</div></div>
      <div class="detail-item price"><div class="label">Offered Price</div><div class="value">&#8369;${offeredPrice}</div></div>
      <div class="detail-item markup"><div class="label">Partner Markup</div><div class="value">&#8369;${markup}</div></div>
    </div>

    <div class="stamp-wrap">
      <div class="stamp"><div class="stamp-text">Registered</div></div>
      <div class="stamp-date">${stampDate}</div>
    </div>
  </div>

  <div class="footer-band">
    <div class="footer-rule"></div>
    <div class="footer-date">Issued: ${stampDate}</div>
    <div class="sig-block">
      <div class="sig-line"></div>
      <div class="sig-name">John Angelo David</div>
      <div class="sig-title">Founder &amp; Owner</div>
      <div class="sig-company">SmartMenu</div>
    </div>
    <div class="footer-brand">
      <div class="footer-plate"><img src="${logoUrl}" alt="SmartMenu" class="footer-logo"/></div>
      <div class="footer-tagline">Growing Restaurants. Together.</div>
    </div>
  </div>
</div>
</body>
</html>`;
}
