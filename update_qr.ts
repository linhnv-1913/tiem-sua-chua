import fs from 'fs';
import https from 'https';

const url = "https://img.vietqr.io/image/vcb-0041000366292-qr_only.png";

https.get(url, (res) => {
  const chunks: Buffer[] = [];
  res.on('data', (chunk) => chunks.push(chunk));
  res.on('end', () => {
    const buffer = Buffer.concat(chunks);
    const base64 = buffer.toString('base64');
    const content = `export const qrBase64 = 'data:image/png;base64,${base64}';\n`;
    fs.writeFileSync('src/features/orders/qrBase64.ts', content);
    console.log("Updated qrBase64.ts successfully");
  });
}).on('error', (e) => {
  console.error(e);
});
