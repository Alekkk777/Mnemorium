import { Html, Head, Main, NextScript } from 'next/document';

export default function Document() {
  return (
    <Html lang="it">
      <Head>
        <meta name="description" content="Memorium — Palazzi della Memoria desktop app" />
        <link rel="icon" href="/favicon.ico" />
      </Head>
      <body>
        <Main />
        <NextScript />
      </body>
    </Html>
  );
}
