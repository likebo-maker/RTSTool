import { downloadFileFromUrl } from '../utils/downloadFile';

export function processTimeoutTickets({ workOrderFile, qualityFile, onUploadProgress, onHeadersReceived }) {
  const formData = new FormData();
  formData.append('work_order_file', workOrderFile);
  formData.append('quality_file', qualityFile);

  return new Promise((resolve, reject) => {
    const request = new XMLHttpRequest();
    request.open('POST', '/api/process');

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

      if (request.status >= 200 && request.status < 300) {
        resolve(payload);
        return;
      }

      reject(new Error(payload.detail || '导出失败，请检查 Excel 表头与文件内容'));
    };

    request.onerror = () => {
      reject(new Error('导出失败，无法连接后端服务'));
    };

    request.send(formData);
  });
}

export function processOnlineBusiness({
  mccFile,
  videoFile,
  mspFile,
  ivdCustomerFile,
  includeSourceSheets = false,
  onUploadProgress,
  onHeadersReceived
}) {
  const formData = new FormData();
  formData.append('mcc_file', mccFile);
  formData.append('video_file', videoFile);
  formData.append('msp_file', mspFile);
  formData.append('ivd_customer_file', ivdCustomerFile);
  formData.append('include_source_sheets', String(Boolean(includeSourceSheets)));

  return new Promise((resolve, reject) => {
    const request = new XMLHttpRequest();
    request.open('POST', '/api/online-business/process');

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

      if (request.status >= 200 && request.status < 300) {
        resolve(payload);
        return;
      }

      reject(new Error(payload.detail || '计算失败，请检查文件名、Sheet/CSV 表头和必需字段'));
    };

    request.onerror = () => {
      reject(new Error('计算失败，无法连接后端服务'));
    };

    request.send(formData);
  });
}

export function processOnlineAssessment({
  mspFile,
  mccCallFile,
  videoServiceFile,
  mccTicketFile,
  crmVideoFile,
  qualityFile,
  includeSourceSheets = false,
  onUploadProgress,
  onHeadersReceived
}) {
  const formData = new FormData();
  formData.append('msp_file', mspFile);
  formData.append('mcc_call_file', mccCallFile);
  formData.append('video_service_file', videoServiceFile);
  formData.append('mcc_ticket_file', mccTicketFile);
  formData.append('crm_video_file', crmVideoFile);
  formData.append('quality_file', qualityFile);
  formData.append('include_source_sheets', String(Boolean(includeSourceSheets)));

  return new Promise((resolve, reject) => {
    const request = new XMLHttpRequest();
    request.open('POST', '/api/online-assessment/process');

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

      if (request.status >= 200 && request.status < 300) {
        resolve(payload);
        return;
      }

      reject(new Error(payload.detail || '计算失败，请检查文件名、Sheet/CSV 表头和必需字段'));
    };

    request.onerror = () => {
      reject(new Error('计算失败，无法连接后端服务'));
    };

    request.send(formData);
  });
}

export function downloadResult(downloadUrl) {
  return downloadFileFromUrl(downloadUrl, '', '下载失败，请稍后重试');
}
