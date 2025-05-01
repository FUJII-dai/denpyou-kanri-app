import { useState, useCallback } from 'react';
import { Dropbox } from 'dropbox';

const APP_KEY = 'YOUR_DROPBOX_APP_KEY';

export const useDropbox = () => {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [dropboxClient, setDropboxClient] = useState<Dropbox | null>(null);

  const authenticate = useCallback(() => {
    const dbx = new Dropbox({ clientId: APP_KEY });
    const authUrl = dbx.auth.getAuthenticationUrl(window.location.href);
    window.location.href = authUrl;
  }, []);

  const handleAuthCallback = useCallback(async (code: string) => {
    const dbx = new Dropbox({ clientId: APP_KEY });
    try {
      await dbx.auth.getAccessTokenFromCode(window.location.href);
      setDropboxClient(dbx);
      setIsAuthenticated(true);
      return true;
    } catch (error) {
      console.error('Dropbox authentication error:', error);
      return false;
    }
  }, []);

  const uploadFile = useCallback(async (fileName: string, fileContent: Blob) => {
    if (!dropboxClient) return null;

    try {
      const response = await dropboxClient.filesUpload({
        path: `/${fileName}`,
        contents: fileContent,
        mode: { '.tag': 'overwrite' }
      });
      return response;
    } catch (error) {
      console.error('Dropbox upload error:', error);
      return null;
    }
  }, [dropboxClient]);

  return {
    isAuthenticated,
    authenticate,
    handleAuthCallback,
    uploadFile
  };
};