async function parseJsonResponse(response, fallbackMessage) {
  const payload = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(payload.message || payload.detail || fallbackMessage);
  }
  return payload;
}

export async function getEclassOptions() {
  const response = await fetch('/api/eclass/options');
  return parseJsonResponse(response, 'E课堂配置读取失败');
}

export async function getEclassUploadSchema(productLine, moduleKey) {
  const params = new URLSearchParams({
    product_line: productLine || '',
    module: moduleKey || ''
  });
  const response = await fetch(`/api/eclass/upload-schema?${params.toString()}`);
  return parseJsonResponse(response, 'E课堂上传模板读取失败');
}

export function processEclassData({
  productLine,
  moduleKey,
  uploadSlots,
  filesBySlot,
  onUploadProgress,
  onHeadersReceived
}) {
  const formData = new FormData();
  formData.append('product_line', productLine);
  formData.append('module', moduleKey);

  const slots = Array.isArray(uploadSlots) && uploadSlots.length
    ? uploadSlots
    : Object.keys(filesBySlot || {}).map((key) => ({ key, input_type: 'file' }));

  slots.forEach((slot) => {
    const slotKey = slot.key;
    const files = (Array.isArray(filesBySlot?.[slotKey]) ? filesBySlot[slotKey] : [filesBySlot?.[slotKey]]).filter(Boolean);
    if (slot.input_type === 'folder') {
      const relativePaths = files.map((file) => file.webkitRelativePath || file.name);
      files.forEach((file, index) => {
        formData.append(`${slotKey}_files`, file, relativePaths[index] || file.name);
      });
      if (files.length) {
        formData.append(`${slotKey}_paths`, JSON.stringify(relativePaths));
      }
      return;
    }

    files.slice(0, slot.multiple ? files.length : 1).forEach((file) => {
      formData.append(slotKey, file);
    });
  });

  return new Promise((resolve, reject) => {
    const request = new XMLHttpRequest();
    request.open('POST', '/api/eclass/process');

    request.upload.onprogress = (event) => {
      if (!event.lengthComputable) return;
      onUploadProgress?.(Math.round((event.loaded / event.total) * 45));
    };

    request.onreadystatechange = () => {
      if (request.readyState === XMLHttpRequest.HEADERS_RECEIVED) {
        onHeadersReceived?.();
      }
    };

    request.onload = () => {
      let payload = {};
      try {
        payload = JSON.parse(request.responseText || '{}');
      } catch {
        payload = {};
      }

      if (request.status >= 200 && request.status < 300 && payload.status !== 'error') {
        resolve(payload);
        return;
      }

      reject(new Error(payload.message || payload.detail || 'E课堂处理失败，请检查上传文件'));
    };

    request.onerror = () => {
      reject(new Error('E课堂处理失败，无法连接后端服务'));
    };

    request.send(formData);
  });
}

export function downloadEclassResult(downloadUrl, filename) {
  if (!downloadUrl) return;
  const link = document.createElement('a');
  link.href = downloadUrl;
  if (filename) link.download = filename;
  document.body.appendChild(link);
  link.click();
  link.remove();
}

export async function openEclassOutputFolder(openFolderUrl) {
  if (!openFolderUrl) {
    throw new Error('输出文件夹地址不存在');
  }
  const response = await fetch(openFolderUrl, { method: 'POST' });
  return parseJsonResponse(response, '打开输出文件夹失败');
}
