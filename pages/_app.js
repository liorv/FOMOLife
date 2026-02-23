import React from 'react';
import Head from 'next/head';
import '../src/index.css';
import '../src/App.css';

export default function MyApp({ Component, pageProps }) {
  return (
    <>
      <Head>
        <link rel="icon" href="/favicon.ico" />
      </Head>
      <Component {...pageProps} />
    </>
  );
}
