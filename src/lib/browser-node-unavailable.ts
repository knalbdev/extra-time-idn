// PptxGenJS declares Node-only dynamic imports alongside its browser exporter.
// Client bundlers resolve them here; the browser download path never uses them.
export async function writeFile(): Promise<never> {
  throw new Error("Filesystem access is unavailable in the browser.");
}
const unavailable = {};
export default unavailable;
