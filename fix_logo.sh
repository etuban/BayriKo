#!/bin/bash
sed -i '640s/.*/    \/\/ Simply add green text for "BayriKo" at the footer instead of an image/' client/src/pages/TaskPayablePage.tsx
sed -i '641s/.*/    const logoY = footerY - 20;/' client/src/pages/TaskPayablePage.tsx
sed -i '642,649d' client/src/pages/TaskPayablePage.tsx
sed -i '642i\
    \/\/ Create a simple text-based logo\
    doc.setTextColor(0, 128, 0); \/\/ Green text for BayriKo\
    doc.setFontSize(18);\
    doc.setFont("helvetica", "bold");\
\
    \/\/ Center the text\
    const logoText = "BayriKo";\
    doc.text(logoText, docPageWidth \/ 2, logoY, { align: "center" });\
\
    \/\/ Add an underline for the logo text\
    const logoTextWidth = doc.getTextWidth(logoText);\
    const lineX = (docPageWidth - logoTextWidth) \/ 2;\
    const lineY = logoY + 2;\
\
    doc.setDrawColor(0, 128, 0); \/\/ Green line\
    doc.setLineWidth(0.75);\
    doc.line(lineX, lineY, lineX + logoTextWidth, lineY);' client/src/pages/TaskPayablePage.tsx
sed -i '642,652d' client/src/pages/TaskPayablePage.tsx
sed -i '642i\
    \/\/ Create a simple text-based logo\
    doc.setTextColor(0, 128, 0); \/\/ Green text for BayriKo\
    doc.setFontSize(18);\
    doc.setFont("helvetica", "bold");\
\
    \/\/ Center the text\
    const logoText = "BayriKo";\
    doc.text(logoText, docPageWidth \/ 2, logoY, { align: "center" });\
\
    \/\/ Add an underline for the logo text\
    const logoTextWidth = doc.getTextWidth(logoText);\
    const lineX = (docPageWidth - logoTextWidth) \/ 2;\
    const lineY = logoY + 2;\
\
    doc.setDrawColor(0, 128, 0); \/\/ Green line\
    doc.setLineWidth(0.75);\
    doc.line(lineX, lineY, lineX + logoTextWidth, lineY);' client/src/pages/TaskPayablePage.tsx
sed -i '657s/logoX/lineX/' client/src/pages/TaskPayablePage.tsx
sed -i '658s/logoY/logoY - 8/' client/src/pages/TaskPayablePage.tsx
sed -i '659s/logoWidth/logoTextWidth/' client/src/pages/TaskPayablePage.tsx
sed -i '660s/logoHeight/12/' client/src/pages/TaskPayablePage.tsx
chmod +x fix_logo.sh
./fix_logo.sh
