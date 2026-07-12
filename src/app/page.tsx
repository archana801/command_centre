import fs from "node:fs";
import path from "node:path";
import Script from "next/script";

export default function Home() {
  const html = fs.readFileSync(
    path.join(process.cwd(), "src/app/kmak-body.html"),
    "utf-8"
  );

  return (
    <>
      <div dangerouslySetInnerHTML={{ __html: html }} />
      <Script src="/kmak-os.js" strategy="afterInteractive" />
    </>
  );
}
