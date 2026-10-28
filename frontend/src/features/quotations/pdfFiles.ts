import type { DownloadedFile } from "../../api/client";

// Object URLs are released after a minute: long enough for the tab or download to start.
const release = (url: string) => window.setTimeout(() => URL.revokeObjectURL(url), 60_000);

// Opens a PDF in a new tab. The tab is opened during the click, before the request,
// because browsers block pop-ups opened later. Falls back to a download if blocked.
export async function openPdf(load: () => Promise<DownloadedFile>, fallbackName: string) {
  const tab = window.open("", "_blank");

  try {
    const file = await load();
    const url = URL.createObjectURL(file.blob);
    release(url);

    if (tab) {
      tab.location.href = url;
    } else {
      saveFile(file, fallbackName);
    }
  } catch (error) {
    tab?.close();
    throw error;
  }
}

export async function downloadPdf(load: () => Promise<DownloadedFile>, fallbackName: string) {
  saveFile(await load(), fallbackName);
}

function saveFile(file: DownloadedFile, fallbackName: string) {
  const url = URL.createObjectURL(file.blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = file.fileName ?? fallbackName;
  document.body.append(link);
  link.click();
  link.remove();
  release(url);
}
