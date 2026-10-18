// Sharing an image as a file, from the browser: straight into the phone's share sheet where it can take files
// (a WhatsApp status, an Instagram story), otherwise saved to the device. The same steps as the Today page's
// "image for a status" (components/today/ShareToday.tsx), for the images of a path
// (components/connect/SharePathImage.tsx). Browser only: it reads `navigator`, `document` and `window`.

/** What happened: handed to the share sheet; saved as a file; the visitor closed the sheet; or the image was opened in a new tab (the fetch or the share failed). */
export type ShareFileResult = 'shared' | 'downloaded' | 'cancelled' | 'opened'

/**
 * Fetches `url` (a PNG made on the server), makes a file of it named `fileName` and shares it with `text`; with no file
 * sharing in this browser it downloads the file. Never throws: a closed share sheet (AbortError) is 'cancelled', any
 * other failure opens the image itself in a new tab so the visitor can save it by hand.
 */
export async function shareImageFile(o: { url: string; fileName: string; text: string }): Promise<ShareFileResult> {
  try {
    const res = await fetch(o.url)
    if (!res.ok) throw new Error(`image ${res.status}`)
    const blob = await res.blob()
    const file = new File([blob], o.fileName, { type: 'image/png' })
    if (navigator.canShare?.({ files: [file] })) {
      await navigator.share({ files: [file], text: o.text })
      return 'shared'
    }
    const a = document.createElement('a')
    const href = URL.createObjectURL(blob)
    a.href = href
    a.download = file.name
    a.click()
    // the browser starts the download from the click; the address can be let go a moment later
    setTimeout(() => URL.revokeObjectURL(href), 4000)
    return 'downloaded'
  } catch (e) {
    if ((e as Error)?.name === 'AbortError') return 'cancelled'
    try { window.open(o.url, '_blank', 'noopener') } catch { /* a blocked pop-up is only a missing convenience */ }
    return 'opened'
  }
}
