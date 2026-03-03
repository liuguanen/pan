// worker.js - 部署到 Cloudflare Workers
export default {
  async fetch(request) {
    // 处理 CORS 预检
    if (request.method === 'OPTIONS') {
      return new Response(null, {
        headers: {
          'Access-Control-Allow-Origin': '*',
          'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
          'Access-Control-Allow-Headers': 'Content-Type',
        },
      });
    }

    const url = new URL(request.url);
    const path = url.pathname;
    
    // ==================== 固定参数 ====================
    const FIXED_PARAMS = {
      uuid: 'f7656346-4876-48ac-b7f7-e3ccc62d9869',
      devCode: 'f7656346-4876-48ac-b7f7-e3ccc62d9869',
      devType: '3',
      devModel: 'Chrome',
      devVersion: '97',
      appVersion: '1.4.0',
      lang: 'cn',
      countryAreaCode: '%2B86',
      extra: '2',
      appToken: '8c8af5ac46fabc10ff0fa671cf4fe65a6ee62c19a122998080281e0dbae4a4a1c1dafc634a17269661ea3e4816e3c65d'
    };
    
    const USER_ID = '2998599';
    const AES_KEY = 'dingHao-disk-app';
    // =================================================

    // 生成 timestamp（AES加密）
    async function generateTimestamp() {
      const encoder = new TextEncoder();
      const key = encoder.encode(AES_KEY);
      const ts = Date.now().toString();
      const data = encoder.encode(ts);
      
      // PKCS7 补位
      const blockSize = 16;
      const padding = blockSize - (data.length % blockSize);
      const padded = new Uint8Array(data.length + padding);
      padded.set(data);
      for (let i = data.length; i < padded.length; i++) {
        padded[i] = padding;
      }
      
      // 加密
      const cryptoKey = await crypto.subtle.importKey(
        'raw', key, { name: 'AES-ECB' }, false, ['encrypt']
      );
      const encrypted = await crypto.subtle.encrypt(
        { name: 'AES-ECB' }, cryptoKey, padded
      );
      
      // 转 hex
      return Array.from(new Uint8Array(encrypted))
        .map(b => b.toString(16).padStart(2, '0'))
        .join('');
    }

    // AES加密辅助函数
    async function aesEncrypt(text) {
      const encoder = new TextEncoder();
      const key = encoder.encode(AES_KEY);
      const data = encoder.encode(text);
      
      const blockSize = 16;
      const padding = blockSize - (data.length % blockSize);
      const padded = new Uint8Array(data.length + padding);
      padded.set(data);
      for (let i = data.length; i < padded.length; i++) {
        padded[i] = padding;
      }
      
      const cryptoKey = await crypto.subtle.importKey(
        'raw', key, { name: 'AES-ECB' }, false, ['encrypt']
      );
      const encrypted = await crypto.subtle.encrypt(
        { name: 'AES-ECB' }, cryptoKey, padded
      );
      
      return Array.from(new Uint8Array(encrypted))
        .map(b => b.toString(16).padStart(2, '0'))
        .join('');
    }

    // 获取文件列表
    if (path === '/api/list') {
      const folderId = url.searchParams.get('folderId') || '0';
      const timestamp = await generateTimestamp();
      
      const apiUrl = `https://api.feijipan.com/app/record/file/list?type=0&offset=1&limit=100&folderId=${folderId}&extra=2&uuid=${FIXED_PARAMS.uuid}&devCode=${FIXED_PARAMS.devCode}&devType=${FIXED_PARAMS.devType}&devModel=${FIXED_PARAMS.devModel}&devVersion=${FIXED_PARAMS.devVersion}&appVersion=${FIXED_PARAMS.appVersion}&lang=cn&countryAreaCode=${FIXED_PARAMS.countryAreaCode}&timestamp=${timestamp}&appToken=${FIXED_PARAMS.appToken}`;
      
      const response = await fetch(apiUrl, {
        headers: {
          'Accept': 'application/json, text/plain, */*',
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
          'Referer': 'https://www.feijipan.com/',
          'Origin': 'https://www.feijipan.com'
        }
      });
      
      const data = await response.json();
      return new Response(JSON.stringify(data), {
        headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' }
      });
    }

    // 获取下载链接
    if (path === '/api/download') {
      const fileId = url.searchParams.get('fileId');
      if (!fileId) {
        return new Response(JSON.stringify({ error: 'no fileId' }), {
          headers: { 'Access-Control-Allow-Origin': '*' }
        });
      }

      const ts = Date.now();
      const tsEncode = await generateTimestamp();
      
      const downloadData = `${fileId}|${USER_ID}`;
      const downloadId = await aesEncrypt(downloadData);
      
      const authData = `${fileId}|${ts}`;
      const auth = await aesEncrypt(authData);
      
      const redirectUrl = `https://api.feijipan.com/ws/file/redirect?downloadId=${downloadId}&uuid=${FIXED_PARAMS.uuid}&devType=${FIXED_PARAMS.devType}&enable=1&timestamp=${tsEncode}&auth=${auth}`;
      
      const response = await fetch(redirectUrl, { redirect: 'manual' });
      
      if (response.status === 301 || response.status === 302 || response.status === 307) {
        const location = response.headers.get('Location');
        return new Response(JSON.stringify({ url: location }), {
          headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' }
        });
      }
      
      return new Response(JSON.stringify({ error: 'failed' }), {
        headers: { 'Access-Control-Allow-Origin': '*' }
      });
    }

    return new Response('Not found', { status: 404 });
  }
};
