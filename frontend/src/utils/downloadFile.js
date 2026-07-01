function filenameFromContentDisposition(disposition) {
  const header = String(disposition || '');
  if (!header) return '';

  const encodedMatch = header.match(/filename\*=UTF-8''([^;]+)/i);
  if (encodedMatch?.[1]) {
    try {
      return decodeURIComponent(encodedMatch[1].trim());
    } catch {
      return encodedMatch[1].trim();
    }
  }

  const quotedMatch = header.match(/filename="([^"]+)"/i);
  if (quotedMatch?.[1]) return quotedMatch[1].trim();

  const plainMatch = header.match(/filename=([^;]+)/i);
  return plainMatch?.[1]?.trim() || '';
}

async function errorMessageFromResponse(response, fallbackMessage) {
  const contentType = response.headers.get('content-type') || '';
  if (contentType.includes('application/json')) {
    const payload = await response.json().catch(() => ({}));
    return payload.message || payload.detail || fallbackMessage;
  }
  const text = await response.text().catch(() => '');
  return text || fallbackMessage;
}

export async function downloadFileFromUrl(downloadUrl, filename = '', fallbackMessage = '下载失败') {
  if (!downloadUrl) return;

  const response = await fetch(downloadUrl, {
    credentials: 'same-origin'
  });

  if (!response.ok) {
    throw new Error(await errorMessageFromResponse(response, fallbackMessage));
  }

  const blob = await response.blob();
  const objectUrl = window.URL.createObjectURL(blob);
  const link = document.createElement('a');
  const resolvedFilename = filename || filenameFromContentDisposition(response.headers.get('content-disposition'));

  link.href = objectUrl;
  if (resolvedFilename) {
    link.download = resolvedFilename;
  }

  document.body.appendChild(link);
  link.click();
  link.remove();

  window.setTimeout(() => {
    window.URL.revokeObjectURL(objectUrl);
  }, 30000);
}
