import Document, { Html, Head, Main, NextScript, DocumentContext } from 'next/document';
import React from 'react';
import crypto from 'crypto';

class MyDocument extends Document {
    static async getInitialProps(ctx: DocumentContext) {
        const nonce = crypto.randomBytes(16).toString('base64');
        const initialProps = await Document.getInitialProps(ctx);
        return { ...initialProps, nonce };
    }

    render() {
        const { nonce } = this.props as any;

        const csp = `
      default-src 'self';
      script-src 'self' 'nonce-${nonce}' 'strict-dynamic' 'unsafe-inline' 'unsafe-eval';
      style-src 'self' 'unsafe-inline' https://fonts.googleapis.com;
      font-src 'self' https://fonts.gstatic.com;
      img-src 'self' data: https://api.dicebear.com;
      object-src 'self' data:;
      connect-src 'self' http://localhost:8001 http://127.0.0.1:8001;
      base-uri 'self';
      form-action 'self';
      ${process.env.NODE_ENV === 'production' ? "require-trusted-types-for 'script';" : ""}
    `.replace(/\s{2,}/g, ' ').trim();

        return (
            <Html lang="en">
                <Head nonce={nonce}>
                    <meta httpEquiv="Content-Security-Policy" content={csp} />
                    <link rel="preconnect" href="https://fonts.googleapis.com" />
                    <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
                    <link href="https://fonts.googleapis.com/css2?family=Outfit:wght@100;200;300;400;500;600;700;800;900&display=swap" rel="stylesheet" />
                </Head>
                <body>
                    <Main />
                    <NextScript nonce={nonce} />
                </body>
            </Html>
        );
    }
}

export default MyDocument;
