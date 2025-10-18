import { routing } from "@/i18n/routing";
import { NextIntlClientProvider, hasLocale } from "next-intl";
import { notFound } from "next/navigation";
import { headers } from "next/headers";

type Props = {
  children: React.ReactNode;
  params: Promise<{ locale: string }>; // Define params as a Promise
};

export default async function SubLayout({ children, params }: Props) {
  const { locale } = await params; // Await the params to get the locale
  // server-side logs
  console.log("🚀 SubLayout locale:", locale, "available:", routing.locales);

  if (!hasLocale(routing.locales, locale)) {
    // try to build a useful URL/context from headers (best-effort on server)
    const hdr = headers();
    const host = (await hdr).get("host") ?? "unknown-host";
    const proto = (await hdr).get("x-forwarded-proto") ?? "https";
    // x-original-uri is often set by proxies; referer/origin as fallback
    const originalUri =
      (await hdr).get("x-original-uri") ?? (await hdr).get("x-invoke-path") ?? (await hdr).get("referer") ?? "";

    const debug = {
      missingLocale: locale,
      availableLocales: routing.locales,
      host,
      proto,
      originalUri,
      env: process.env.NODE_ENV,
    };

    console.error("Missing locale detected:", debug);

    // In dev we render useful debug info so you can see what parameter/url triggered the 404
    if (process.env.NODE_ENV !== "production") {
      return (
        <html lang="en">
          <head>
            <meta name="robots" content="noindex" />
            <title>Locale not found</title>
          </head>
          <body style={{ fontFamily: "system-ui, sans-serif", padding: 24 }}>
            <h1 style={{ color: "#c00" }}>Locale not found: {locale}</h1>
            <p>
              Available locales: <strong>{routing.locales.join(", ")}</strong>
            </p>
            <h2>Request debug</h2>
            <pre>{JSON.stringify(debug, null, 2)}</pre>
            <p>
              Check your `app` folder segments (e.g. <code>/app/[locale]/...</code>) and routing.locales mapping.
            </p>
          </body>
        </html>
      );
    }

    // production: keep existing behavior
    notFound();
  }

  return (
    <html lang={locale}>
      <head>
        <link rel="manifest" href={`/manifest`} />
        <meta name="theme-color" content="#ffffff" />
        <link rel="icon" href="/favicon.ico" />
      </head>
      <body>{children}</body>
    </html>
  );
}
