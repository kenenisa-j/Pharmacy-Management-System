import { Html, Head, Main, NextScript } from 'next/document';

export default function Document() {
    return (
        <Html lang="en">
            <Head>
                <link rel="icon" type="image/svg+xml" href="/favicon.svg" />
                <link rel="alternate icon" href="/favicon.svg" />
                <link rel="apple-touch-icon" href="/favicon.svg" />
                <link rel="manifest" href="/manifest.json" />
                <meta name="theme-color" content="#090d16" />
                <meta name="apple-mobile-web-app-capable" content="yes" />
                <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent" />
                <meta name="description" content="PharmaFlow ERP - Modern Pharmacy Management System & POS" />
            </Head>
            <body className="bg-slate-950 text-white antialiased">
                <Main />
                <NextScript />
            </body>
        </Html>
    );
}
