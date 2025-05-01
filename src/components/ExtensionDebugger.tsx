import React, { useEffect, useState } from 'react';
import { AlertTriangle, CheckCircle } from 'lucide-react';

interface ExtensionInfo {
  name: string;
  id: string;
  enabled: boolean;
}

const ExtensionDebugger = () => {
  const [extensions, setExtensions] = useState<ExtensionInfo[]>([]);
  const [isChecking, setIsChecking] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const checkExtensions = async () => {
      try {
        setIsChecking(true);
        setError(null);

        // Check if Chrome Extensions API is available
        if (!('chrome' in window && chrome.runtime && chrome.runtime.getManifest)) {
          setError('Chrome Extensions APIにアクセスできません');
          return;
        }

        // Get list of installed extensions
        const installedExtensions: ExtensionInfo[] = [];
        
        // Use messaging to detect active extensions
        const detectExtension = (id: string): Promise<boolean> => {
          return new Promise(resolve => {
            try {
              chrome.runtime.sendMessage(id, { type: 'PING' }, response => {
                resolve(!!response);
              });
              // Set timeout for response
              setTimeout(() => resolve(false), 100);
            } catch {
              resolve(false);
            }
          });
        };

        // Common extension IDs to check
        const commonExtensions = [
          { id: 'nkbihfbeogaeaoehlefnkodbefgpgknn', name: 'MetaMask' },
          { id: 'djclckkglechooblngghdinmeemkbgci', name: 'React Developer Tools' },
          { id: 'fmkadmapgofadopljbjfkapdkoienihi', name: 'React Developer Tools (Beta)' },
          { id: 'bgnkhhnnamicmpeenaelnjfhikgbkllg', name: 'AdGuard' },
          // Add more common extensions as needed
        ];

        // Check each extension
        for (const ext of commonExtensions) {
          const isEnabled = await detectExtension(ext.id);
          if (isEnabled) {
            installedExtensions.push({
              ...ext,
              enabled: true
            });
          }
        }

        setExtensions(installedExtensions);
      } catch (err) {
        console.error('Extension check error:', err);
        setError('拡張機能の確認中にエラーが発生しました');
      } finally {
        setIsChecking(false);
      }
    };

    checkExtensions();
  }, []);

  return (
    <div className="bg-white rounded-lg shadow-md p-4">
      <h2 className="text-lg font-bold mb-4">拡張機能診断</h2>

      {isChecking ? (
        <div className="flex items-center gap-2 text-gray-600">
          <div className="animate-spin rounded-full h-4 w-4 border-2 border-gray-500 border-t-transparent"></div>
          拡張機能を確認中...
        </div>
      ) : error ? (
        <div className="flex items-center gap-2 text-red-600">
          <AlertTriangle className="w-5 h-5" />
          {error}
        </div>
      ) : extensions.length === 0 ? (
        <div className="flex items-center gap-2 text-green-600">
          <CheckCircle className="w-5 h-5" />
          アクティブな拡張機能は検出されませんでした
        </div>
      ) : (
        <div className="space-y-2">
          <div className="text-sm text-gray-600 mb-2">
            以下の拡張機能が検出されました:
          </div>
          {extensions.map(ext => (
            <div
              key={ext.id}
              className="flex items-center justify-between bg-gray-50 p-2 rounded"
            >
              <div>
                <div className="font-medium">{ext.name}</div>
                <div className="text-xs text-gray-500">{ext.id}</div>
              </div>
              <div className="text-sm">
                {ext.enabled ? (
                  <span className="text-green-600">アクティブ</span>
                ) : (
                  <span className="text-gray-400">無効</span>
                )}
              </div>
            </div>
          ))}
          <div className="mt-4 text-sm text-gray-600">
            これらの拡張機能が動作に影響を与えている可能性があります。
            テストのため、一時的に無効化することをお勧めします。
          </div>
        </div>
      )}
    </div>
  );
};

export default ExtensionDebugger;