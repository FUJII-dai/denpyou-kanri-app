import React, { useState, useEffect } from 'react';
import { Clock, AlertTriangle, CheckCircle } from 'lucide-react';
import { parseTime, calculateTimeRemaining } from '../utils/time';
import { format } from 'date-fns';
import { ja } from 'date-fns/locale';

interface TimeDebuggerProps {
  onClose: () => void;
}

const TimeDebugger: React.FC<TimeDebuggerProps> = ({ onClose }) => {
  const [testCases, setTestCases] = useState<Array<{
    startTime: string;
    endTime: string;
    expectedRemaining: string;
    actualRemaining: string;
    passed: boolean;
  }>>([]);
  const [currentTime, setCurrentTime] = useState(new Date());

  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date());
      runTests();
    }, 1000);

    return () => clearInterval(timer);
  }, []);

  const runTests = () => {
    const now = new Date();
    const cases = [
      // 通常のケース（同日内）
      {
        startTime: '20:00',
        endTime: '21:00',
        expectedRemaining: '1:00'
      },
      // 0時をまたぐケース
      {
        startTime: '23:00',
        endTime: '00:00',
        expectedRemaining: '1:00'
      },
      // 営業時間の境界ケース
      {
        startTime: '18:30',
        endTime: '19:30',
        expectedRemaining: '1:00'
      },
      // 翌日のケース
      {
        startTime: '08:00',
        endTime: '09:00',
        expectedRemaining: '1:00'
      }
    ];

    const results = cases.map(testCase => {
      const actualRemaining = calculateTimeRemaining(testCase.endTime);
      const expected = testCase.expectedRemaining;
      const passed = actualRemaining === expected;

      return {
        ...testCase,
        actualRemaining,
        passed
      };
    });

    setTestCases(results);
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-[70]">
      <div className="bg-white rounded-lg w-full max-w-2xl max-h-[90vh] overflow-auto">
        <header className="bg-purple-800 text-white p-4 flex justify-between items-center sticky top-0">
          <div className="flex items-center gap-2">
            <Clock className="w-5 h-5" />
            <h2 className="text-xl font-bold">タイマーデバッグ</h2>
          </div>
          <button onClick={onClose}>×</button>
        </header>

        <div className="p-4">
          <div className="mb-4">
            <h3 className="font-bold mb-2">現在時刻</h3>
            <div className="bg-gray-100 p-3 rounded-md">
              {format(currentTime, 'yyyy/MM/dd HH:mm:ss', { locale: ja })}
            </div>
          </div>

          <div className="mb-4">
            <h3 className="font-bold mb-2">テストケース</h3>
            <div className="space-y-2">
              {testCases.map((testCase, index) => (
                <div
                  key={index}
                  className={`p-3 rounded-md ${
                    testCase.passed ? 'bg-green-50' : 'bg-red-50'
                  }`}
                >
                  <div className="flex items-center gap-2 mb-2">
                    {testCase.passed ? (
                      <CheckCircle className="w-5 h-5 text-green-600" />
                    ) : (
                      <AlertTriangle className="w-5 h-5 text-red-600" />
                    )}
                    <span className="font-medium">
                      テストケース {index + 1}
                    </span>
                  </div>
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div>
                      <div className="text-gray-600">開始時刻</div>
                      <div>{testCase.startTime}</div>
                    </div>
                    <div>
                      <div className="text-gray-600">終了時刻</div>
                      <div>{testCase.endTime}</div>
                    </div>
                    <div>
                      <div className="text-gray-600">期待値</div>
                      <div>{testCase.expectedRemaining}</div>
                    </div>
                    <div>
                      <div className="text-gray-600">実際の値</div>
                      <div className={testCase.passed ? 'text-green-600' : 'text-red-600'}>
                        {testCase.actualRemaining}
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div>
            <h3 className="font-bold mb-2">日付計算テスト</h3>
            <div className="space-y-2">
              {['19:00', '23:00', '00:00', '08:00'].map(time => {
                const date = parseTime(time);
                return (
                  <div key={time} className="bg-gray-100 p-3 rounded-md">
                    <div className="text-sm">
                      <span className="text-gray-600">入力時刻: </span>
                      {time}
                    </div>
                    <div className="text-sm">
                      <span className="text-gray-600">計算結果: </span>
                      {format(date, 'yyyy/MM/dd HH:mm:ss', { locale: ja })}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default TimeDebugger;