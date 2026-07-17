import { parseQualificationFiles } from '../utils/qualificationParser';

self.onmessage = async (event) => {
  const { requestId, files } = event.data || {};
  if (!requestId) return;

  try {
    const payload = await parseQualificationFiles(files, {
      onProgress: (progressPayload) => {
        self.postMessage({
          requestId,
          type: 'progress',
          payload: progressPayload
        });
      }
    });

    self.postMessage({
      requestId,
      type: 'success',
      payload
    });
  } catch (error) {
    self.postMessage({
      requestId,
      type: 'error',
      error: {
        message: error?.message || '资质数据解析失败'
      }
    });
  }
};
