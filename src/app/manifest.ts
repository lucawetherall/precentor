import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Precentor — Church Music Planner",
    short_name: "Precentor",
    description:
      "AI-powered liturgical music and service planning for Church of England parishes",
    start_url: "/dashboard",
    display: "standalone",
    theme_color: "#8B4513",
    background_color: "#FAF6F1",
    icons: [
      {
        src: "/icon-192.png",
        sizes: "192x192",
        type: "image/png",
      },
      {
        src: "/icon-512.png",
        sizes: "512x512",
        type: "image/png",
      },
    ],
  };
}
