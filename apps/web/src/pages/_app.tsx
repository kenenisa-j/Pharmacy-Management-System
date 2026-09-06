import type { AppProps } from 'next/app';
import Head from 'next/head';
import '../globals.css';

export default function MyApp({ Component, pageProps }: AppProps) {
    return (
        <>
            <Head>
                <title>PharmaFlow ERP | Modern Pharmacy Management System</title>
                <link rel="icon" type="image/svg+xml" href="/favicon.svg" />
            </Head>
            <Component {...pageProps} />
        </>
    );
}

