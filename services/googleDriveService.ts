
// ATENÇÃO: VOCÊ PRECISA COLOCAR SEU CLIENT_ID AQUI
// Crie em: https://console.cloud.google.com/apis/credentials
const CLIENT_ID = 'SEU_CLIENT_ID_AQUI.apps.googleusercontent.com'; 
const API_KEY = ''; // Opcional para Drive, o foco é OAuth
const DISCOVERY_DOC = 'https://www.googleapis.com/discovery/v1/apis/drive/v3/rest';
const SCOPES = 'https://www.googleapis.com/auth/drive.file';

let tokenClient: any;
let gapiInited = false;
let gisInited = false;

export const initGoogleDrive = async () => {
  return new Promise<void>((resolve) => {
    const checkScripts = setInterval(() => {
      if ((window as any).gapi && (window as any).google) {
        clearInterval(checkScripts);
        initializeGapiClient();
        initializeGisClient();
        resolve();
      }
    }, 100);
  });
};

const initializeGapiClient = async () => {
  await (window as any).gapi.client.init({
    apiKey: API_KEY,
    discoveryDocs: [DISCOVERY_DOC],
  });
  gapiInited = true;
};

const initializeGisClient = () => {
  tokenClient = (window as any).google.accounts.oauth2.initTokenClient({
    client_id: CLIENT_ID,
    scope: SCOPES,
    callback: '', // definido em tempo de execução
  });
  gisInited = true;
};

export const saveToDrive = async (fileName: string, content: string): Promise<string> => {
  if (!gapiInited || !gisInited) {
    await initGoogleDrive();
  }

  return new Promise((resolve, reject) => {
    tokenClient.callback = async (resp: any) => {
      if (resp.error !== undefined) {
        reject(resp);
        return;
      }
      try {
        const fileId = await uploadFile(fileName, content);
        resolve(fileId);
      } catch (err) {
        reject(err);
      }
    };

    // Solicita permissão ao usuário (Popup)
    if ((window as any).gapi.client.getToken() === null) {
      tokenClient.requestAccessToken({ prompt: 'consent' });
    } else {
      tokenClient.requestAccessToken({ prompt: '' });
    }
  });
};

const uploadFile = async (fileName: string, content: string) => {
  const gapi = (window as any).gapi;

  // 1. Procurar se o arquivo já existe
  const searchResponse = await gapi.client.drive.files.list({
    q: `name = '${fileName}' and trashed = false`,
    fields: 'files(id, name)',
    spaces: 'drive',
  });

  const files = searchResponse.result.files;
  const fileId = files && files.length > 0 ? files[0].id : null;

  const metadata = {
    name: fileName,
    mimeType: 'application/json',
  };

  const boundary = '-------314159265358979323846';
  const delimiter = "\r\n--" + boundary + "\r\n";
  const close_delim = "\r\n--" + boundary + "--";

  const multipartRequestBody =
    delimiter +
    'Content-Type: application/json\r\n\r\n' +
    JSON.stringify(metadata) +
    delimiter +
    'Content-Type: application/json\r\n\r\n' +
    content +
    close_delim;

  const request = gapi.client.request({
    path: fileId ? `/upload/drive/v3/files/${fileId}` : '/upload/drive/v3/files',
    method: fileId ? 'PATCH' : 'POST',
    params: { uploadType: 'multipart' },
    headers: {
      'Content-Type': 'multipart/related; boundary="' + boundary + '"'
    },
    body: multipartRequestBody
  });

  const response = await request;
  return response.result.id;
};
