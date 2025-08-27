import React, { useState, useEffect } from 'https://esm.sh/react@19.1.1';
import { Category } from '../types.ts';
import { DEFAULT_PATTERNS } from '../constants.ts';

const RegexHelp = () => {
  const cheatSheet = [
    { char: '^', desc: '문자열의 시작과 일치' },
    { char: '$', desc: '문자열의 끝과 일치' },
    { char: '.', desc: '개행 문자를 제외한 모든 단일 문자와 일치' },
    { char: '\\d', desc: '숫자 (0-9)' },
    { char: '\\w', desc: '알파벳, 숫자, 밑줄 (_)' },
    { char: '\\s', desc: '공백 문자' },
    { char: '[ABC]', desc: '괄호 안의 문자 중 하나 (A, B, 또는 C)' },
    { char: '[A-Z]', desc: 'A부터 Z까지의 범위 내 문자 중 하나' },
    { char: '*', desc: '앞 표현식이 0번 이상 반복' },
    { char: '+', desc: '앞 표현식이 1번 이상 반복' },
    { char: '?', desc: '앞 표현식이 0번 또는 1번 발생' },
    { char: '{n}', desc: '앞 표현식이 정확히 n번 반복 (예: \\d{3})' },
    { char: '{n,}', desc: '앞 표현식이 n번 이상 반복' },
    { char: '{n,m}', desc: '앞 표현식이 n번에서 m번 사이 반복' },
    { char: '|', desc: 'OR 연산자 (예: A|B)' },
    { char: '(...)', desc: '그룹 지정 및 캡처' },
  ];

  return (
    <div className="mt-1 text-xs text-slate-400 bg-slate-900/50 p-4 rounded-md border border-slate-700 animate-fade-in-up" style={{ animationDuration: '0.3s' }}>
      <h4 className="font-semibold text-slate-300 mb-3 text-sm">정규식(Regex) 빠른 참조</h4>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-2">
        {cheatSheet.map(({ char, desc }) => (
          <div key={char} className="flex items-center space-x-3">
            <code className="bg-slate-700/50 px-2 py-1 rounded text-sky-400 font-mono w-20 text-center">{char}</code>
            <span>{desc}</span>
          </div>
        ))}
      </div>
    </div>
  );
};

export const SettingsModal = ({ patterns, onSave, onClose }) => {
  const [localPatterns, setLocalPatterns] = useState(patterns);
  const [showRegexHelp, setShowRegexHelp] = useState(false);

  // State for split Instrument pattern parts
  const [instrumentParts, setInstrumentParts] = useState(() => {
    const pattern = patterns[Category.Instrument] || '';
    const separator = '\\s?';
    const separatorIndex = pattern.indexOf(separator);
    if (separatorIndex > -1) {
      return {
        func: pattern.substring(0, separatorIndex),
        num: pattern.substring(separatorIndex + separator.length),
      };
    }
    return { func: pattern, num: '' };
  });

  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onClose]);

  const handleSave = () => {
    const finalPatterns = {
      ...localPatterns,
      [Category.Instrument]: `${instrumentParts.func}\\s?${instrumentParts.num}`,
    };
    onSave(finalPatterns);
  };
  
  const handleReset = () => {
    setLocalPatterns(DEFAULT_PATTERNS);
    const defaultInstrumentPattern = DEFAULT_PATTERNS[Category.Instrument] || '';
    const separator = '\\s?';
    const separatorIndex = defaultInstrumentPattern.indexOf(separator);
    if (separatorIndex > -1) {
      setInstrumentParts({
        func: defaultInstrumentPattern.substring(0, separatorIndex),
        num: defaultInstrumentPattern.substring(separatorIndex + separator.length),
      });
    } else {
      setInstrumentParts({ func: defaultInstrumentPattern, num: '' });
    }
  }

  const handlePatternChange = (category, value) => {
    setLocalPatterns(prev => ({...prev, [category]: value}));
  };

  const handleInstrumentPartChange = (part: 'func' | 'num', value: string) => {
    setInstrumentParts(prev => ({ ...prev, [part]: value }));
  };
  
  const categoryInfo = {
    [Category.Equipment]: {
        description: "두 개의 하이픈(-)을 포함하는 장비 태그를 찾습니다.",
        example: "P-101-A, V-200-B"
    },
    [Category.Line]: {
        description: "세 개 이상의 하이픈(-)을 포함하는 배관 라인 태그를 찾습니다.",
        example: `4"-P-1501-C1, 10"-CW-203-A2`
    },
    [Category.Instrument]: {
        description: "기능(Function)과 번호(Number) 부분으로 구성된 계측기 태그를 찾습니다. 두 부분 사이에는 공백이 있을 수도 있고 없을 수도 있습니다.",
        example: "PI 1001, FIT1002A, TIC 1004 B"
    },
    [Category.DrawingNumber]: {
        description: "도면 번호, 시트 번호 등 도면 식별 태그를 찾습니다. 페이지 당 하나, 우측 하단에서 검색됩니다.",
        example: "PID-1234-001"
    }
  };

  const categories = [Category.Equipment, Category.Line, Category.Instrument, Category.DrawingNumber];

  return (
    <div 
        className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4 animate-fade-in-up" 
        style={{ animationDuration: '0.2s' }}
        onClick={onClose}
    >
      <div 
        className="bg-slate-800 border border-slate-700 rounded-xl shadow-2xl w-full max-w-2xl text-white"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="p-4 border-b border-slate-700 flex justify-between items-center">
          <h2 className="text-lg font-bold">Extraction Settings</h2>
          <button onClick={onClose} className="p-1 rounded-full text-slate-400 hover:bg-slate-700">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
            </svg>
          </button>
        </div>
        <div className="p-6 space-y-4 max-h-[70vh] overflow-y-auto">
            <div className="space-y-2 text-sm text-slate-400 bg-slate-900/50 p-3 rounded-md border border-slate-700">
                <p>
                    태그를 찾기 위한 정규식(Regex) 패턴을 정의합니다. 파이프 기호 <code>|</code>를 사용하여 한 카테고리에 여러 패턴을 추가할 수 있습니다.
                </p>
                 <p>
                    PDF를 업로드 한 후 설정을 변경하면 문서를 다시 스캔합니다.
                </p>
                <button 
                  onClick={() => setShowRegexHelp(prev => !prev)}
                  className="text-sm text-sky-400 hover:text-sky-300 font-semibold mt-1 flex items-center space-x-1"
                >
                  <span>{showRegexHelp ? '도움말 숨기기' : '정규식(Regex) 도움말 보기'}</span>
                  <svg xmlns="http://www.w3.org/2000/svg" className={`h-4 w-4 transition-transform ${showRegexHelp ? 'rotate-180' : ''}`} viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" clipRule="evenodd" />
                  </svg>
                </button>
            </div>
            
            {showRegexHelp && <RegexHelp />}

            {categories.map(category => {
                const info = categoryInfo[category];
                
                if (category === Category.Instrument) {
                  return (
                    <div key={category}>
                      <label className="block text-sm font-semibold mb-1 text-slate-200">{category}</label>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                          <label htmlFor="pattern-inst-func" className="block text-xs font-medium text-slate-400 mb-1">Function Part</label>
                          <input
                            id="pattern-inst-func"
                            type="text"
                            value={instrumentParts.func}
                            onChange={(e) => handleInstrumentPartChange('func', e.target.value)}
                            className="w-full bg-slate-900 border border-slate-600 rounded-md p-2 text-sm font-mono focus:ring-sky-500 focus:border-sky-500"
                          />
                        </div>
                        <div>
                          <label htmlFor="pattern-inst-num" className="block text-xs font-medium text-slate-400 mb-1">Number Part</label>
                          <input
                            id="pattern-inst-num"
                            type="text"
                            value={instrumentParts.num}
                            onChange={(e) => handleInstrumentPartChange('num', e.target.value)}
                            className="w-full bg-slate-900 border border-slate-600 rounded-md p-2 text-sm font-mono focus:ring-sky-500 focus:border-sky-500"
                          />
                        </div>
                      </div>
                      {info && (
                        <div className="mt-2 text-xs text-slate-400 space-y-1 pl-1">
                          <p>{info.description}</p>
                          <p>
                            <span className="font-semibold">매칭 예시:</span>{' '}
                            <code className="bg-slate-700/50 px-1 py-0.5 rounded">{info.example}</code>
                          </p>
                        </div>
                      )}
                    </div>
                  );
                }

                return (
                    <div key={category}>
                        <label htmlFor={`pattern-${category}`} className="block text-sm font-semibold mb-1 text-slate-200">{category}</label>
                        <textarea
                            id={`pattern-${category}`}
                            value={localPatterns[category]}
                            onChange={(e) => handlePatternChange(category, e.target.value)}
                            className="w-full bg-slate-900 border border-slate-600 rounded-md p-2 text-sm font-mono focus:ring-sky-500 focus:border-sky-500"
                            rows={2}
                        />
                        {info && (
                            <div className="mt-2 text-xs text-slate-400 space-y-1 pl-1">
                                <p>{info.description}</p>
                                <p>
                                    <span className="font-semibold">매칭 예시:</span>{' '}
                                    <code className="bg-slate-700/50 px-1 py-0.5 rounded">{info.example}</code>
                                </p>
                            </div>
                        )}
                    </div>
                )
            })}
        </div>
        <div className="p-4 border-t border-slate-700 flex justify-between items-center">
            <button
                onClick={handleReset}
                className="px-4 py-2 text-sm font-semibold text-white bg-slate-600 rounded-md hover:bg-slate-700 transition-colors focus:outline-none focus:ring-2 focus:ring-slate-500 focus:ring-offset-2 focus:ring-offset-slate-800"
            >
                Reset to Defaults
            </button>
            <div className="flex space-x-2">
                <button
                    onClick={onClose}
                    className="px-4 py-2 text-sm font-semibold text-slate-300 bg-transparent rounded-md hover:bg-slate-700 transition-colors"
                >
                    Cancel
                </button>
                <button
                    onClick={handleSave}
                    className="px-4 py-2 text-sm font-semibold text-white bg-sky-600 rounded-md hover:bg-sky-700 transition-colors focus:outline-none focus:ring-2 focus:ring-sky-500 focus:ring-offset-2 focus:ring-offset-slate-800"
                >
                    Save and Re-scan
                </button>
            </div>
        </div>
      </div>
    </div>
  );
};
