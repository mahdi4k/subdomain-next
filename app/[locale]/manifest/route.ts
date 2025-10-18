import { NextRequest, NextResponse } from "next/server";

export async function GET(req: NextRequest, params: any) {
  const { sub } = await params.params;
 
  const branding = {
    car: {
      name: "Car Dashboard",
      short_name: "Car",
      theme_color: "#007aff",
    },
    bike: {
      name: "Bike App",
      short_name: "Bike",
      theme_color: "#00c853",
    },
    bicycle: {
      name: "Bicycle Manager",
      short_name: "Bicycle",
      theme_color: "#ff4081",
    },
  };

  const fallback = {
    name: "My Awesome PWA App",
    short_name: "PWA App",
    theme_color: "#ffffff",
  };

  const meta = branding[sub as keyof typeof branding] ?? fallback;

  const manifest = {
    ...meta,
    icons: [
      {
        src: "https://placehold.co/192x192/png",
        sizes: "192x192",
        type: "image/png",
      },
      {
        src: "https://placehold.co/512x512/png",
        sizes: "512x512",
        type: "image/png",
      },
    ],
    screenshots: [
      {
        src: "https://placehold.co/1280x720/png",
        sizes: "1280x720",
        type: "image/png",
        form_factor: "wide",
      },
      {
        src: "https://placehold.co/375x667/png",
        sizes: "375x667",
        type: "image/png",
      },
    ],
    start_url: "/",
    display: "standalone",
    orientation: "portrait",
    background_color: "#FFFFFF",
  };

  return NextResponse.json(manifest);
}
