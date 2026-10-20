import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    id: "/", name: "Ekstrakurikuler IDN Akhwat", short_name: "Eskul IDN",
    description: "Jadwal dan pengingat ekstrakurikuler SMP SMK IDN Akhwat.",
    lang: "id", start_url: "/?view=dashboard", scope: "/", display: "standalone",
    background_color: "#f5f6fb", theme_color: "#12315a",
    icons: [
      { src: "/push-icon-192.png", sizes: "192x192", type: "image/png", purpose: "any" },
      { src: "/push-icon-512.png", sizes: "512x512", type: "image/png", purpose: "any" },
    ],
  };
}
