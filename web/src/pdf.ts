import { getDocument, GlobalWorkerOptions } from "pdfjs-dist";
import workerUrl from "pdfjs-dist/build/pdf.worker.min.mjs?url";
GlobalWorkerOptions.workerSrc = workerUrl;
export async function readPdf(
  file: File,
  progress: (message: string) => void,
  signal: AbortSignal,
): Promise<string> {
  if (file.size > 15 * 1024 * 1024)
    throw new Error(
      "Choose a PDF smaller than 15 MB. Split larger documents into chapters.",
    );
  const data = new Uint8Array(await file.arrayBuffer());
  signal.throwIfAborted();
  if (!new TextDecoder().decode(data.slice(0, 1024)).includes("%PDF-"))
    throw new Error("This file does not appear to be a PDF.");
  const task = getDocument({
    data,
    useWasm: false,
    cMapUrl: `${import.meta.env.BASE_URL}pdfjs/cmaps/`,
    cMapPacked: true,
    standardFontDataUrl: `${import.meta.env.BASE_URL}pdfjs/standard_fonts/`,
  });
  const abort = () => {
    void task.destroy();
  };
  signal.addEventListener("abort", abort, { once: true });
  try {
    const pdf = await task.promise;
    if (pdf.numPages > 200)
      throw new Error(
        "This PDF has more than 200 pages. Upload a smaller chapter.",
      );
    let text = "";
    for (let i = 1; i <= pdf.numPages; i++) {
      signal.throwIfAborted();
      progress(`Reading page ${i} of ${pdf.numPages}…`);
      const page = await pdf.getPage(i);
      const content = await page.getTextContent();
      text +=
        content.items.map((item) => ("str" in item ? item.str : "")).join(" ") +
        "\n";
      page.cleanup();
      if (text.length > 200000)
        throw new Error(
          "Extracted text exceeds 200,000 characters. Upload a smaller section.",
        );
    }
    if (text.trim().length < 30)
      throw new Error(
        "No usable text found. Scanned PDFs need OCR first; try a text-based PDF or paste your notes.",
      );
    return text;
  } catch (error) {
    if (signal.aborted)
      throw new DOMException("Reading cancelled.", "AbortError");
    if (error instanceof Error && error.name === "PasswordException")
      throw new Error(
        "This PDF is password-protected. Upload an unlocked copy.",
      );
    if (error instanceof Error && error.name === "InvalidPDFException")
      throw new Error(
        "This PDF is damaged or unsupported. Try another file or paste the text.",
      );
    throw error;
  } finally {
    signal.removeEventListener("abort", abort);
    await task.destroy();
  }
}
