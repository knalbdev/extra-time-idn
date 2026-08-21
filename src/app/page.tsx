import fs from "node:fs";
import path from "node:path";
import { HomeClient } from "@/components/HomeClient";

const IMAGE_EXTENSIONS = new Set([".jpg", ".jpeg", ".png", ".webp"]);

function getDocumentationPhotos(): string[] {
  const dir = path.join(process.cwd(), "public", "images", "dokumentasi");
  try {
    return fs
      .readdirSync(dir)
      .filter((file) => IMAGE_EXTENSIONS.has(path.extname(file).toLowerCase()))
      .sort()
      .map((file) => `/images/dokumentasi/${file}`);
  } catch {
    return [];
  }
}

export default function Home() {
  const documentationPhotos = getDocumentationPhotos();
  return <HomeClient documentationPhotos={documentationPhotos} />;
}
