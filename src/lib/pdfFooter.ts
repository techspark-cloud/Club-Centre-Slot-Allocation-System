import jsPDF from 'jspdf';

export async function addTechsparkFooter(doc: jsPDF) {
  try {
    const tsLogoRes = await fetch('/techspark-logo.png');
    if (!tsLogoRes.ok) return;
    const tsLogoBlob = await tsLogoRes.blob();
    const tsDataUrl = await new Promise<string>((resolve) => {
      const reader = new FileReader();
      reader.onloadend = () => resolve(reader.result as string);
      reader.readAsDataURL(tsLogoBlob);
    });

    const pageWidth = doc.internal.pageSize.width;
    const pageHeight = doc.internal.pageSize.height;

    const tsWidth = 28;
    const tsHeight = 8;
    const rightMargin = 14;

    doc.setFontSize(8);
    doc.setFont("helvetica", "italic");
    doc.setTextColor(148, 163, 184);

    const textStr = "Managed by";
    const textWidth = doc.getTextWidth(textStr);
    const logoX = pageWidth - rightMargin - tsWidth;
    const logoY = pageHeight - 16;
    const textX = logoX - textWidth - 3;
    const textY = logoY + 5.5;

    doc.text(textStr, textX, textY);
    doc.addImage(tsDataUrl, 'PNG', logoX, logoY, tsWidth, tsHeight);
  } catch (e) {
    console.error("Could not load Techspark logo", e);
  }
}
