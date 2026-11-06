import React, { useState, useEffect } from 'react';
import { Sidebar } from './components/Sidebar';
import { ImageUpload } from './components/ImageUpload';
import { DesignOutput } from './components/DesignOutput';
import { SkillOutput } from './components/SkillOutput';
import { DesignSection, Settings, Skill } from './types';
import { Wand2, AlertCircle, Download } from 'lucide-react';

const getStorageItem = (key: string): string | null => {
  try {
    return localStorage.getItem(key);
  } catch (e) {
    console.warn("localStorage not available", e);
    return null;
  }
};

const setStorageItem = (key: string, value: string): void => {
  try {
    localStorage.setItem(key, value);
  } catch (e) {
    console.warn("localStorage not available", e);
  }
};

const removeStorageItem = (key: string): void => {
  try {
    localStorage.removeItem(key);
  } catch (e) {
    console.warn("localStorage not available", e);
  }
};

export default function App() {
  const [activeTab, setActiveTab] = useState<'character' | 'skills'>(() => {
    const saved = getStorageItem('app_activeTab');
    return (saved as 'character' | 'skills') || 'character';
  });
  const [image, setImage] = useState<string | null>(() => getStorageItem('app_image'));
  const [mimeType, setMimeType] = useState<string>(() => getStorageItem('app_mimeType') || '');
  
  const [settings, setSettings] = useState<Settings>(() => {
    const saved = getStorageItem('app_settings');
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch (e) {
        console.error('Error parsing app_settings from localStorage', e);
      }
    }
    return {
      worldview: '',
      characterSetting: '',
      creativeInclination: '',
      skillFormat: '',
      skillInclination: '',
      apiKey: '',
      model: 'gemini-3.5-flash',
      apiBaseUrl: '',
      customModel: ''
    };
  });
  
  const [sections, setSections] = useState<DesignSection[]>(() => {
    const saved = getStorageItem('app_sections');
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch (e) {
        console.error('Error parsing app_sections from localStorage', e);
      }
    }
    return [
      { id: '1', label: '肤色与基础体态', content: '', isExpanded: true },
      { id: '2', label: '发型', content: '', isExpanded: true },
      { id: '3', label: '面部特征', content: '', isExpanded: true },
      { id: '4', label: '胸部特征', content: '', isExpanded: true },
      { id: '5', label: '腹部与腰身', content: '', isExpanded: true },
      { id: '6', label: '腿部与足部', content: '', isExpanded: true },
      { id: '7', label: '服装材质及风格', content: '', isExpanded: true },
      { id: '8', label: '配饰细节', content: '', isExpanded: true },
      { id: '9', label: '整体性格关键词', content: '', isExpanded: true },
    ];
  });

  const [skills, setSkills] = useState<Skill[]>(() => {
    const saved = getStorageItem('app_skills');
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch (e) {
        console.error('Error parsing app_skills from localStorage', e);
      }
    }
    return [];
  });
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isGenerated, setIsGenerated] = useState(() => getStorageItem('app_isGenerated') === 'true');
  const [isSkillsGenerated, setIsSkillsGenerated] = useState(() => getStorageItem('app_isSkillsGenerated') === 'true');

  useEffect(() => {
    setStorageItem('app_activeTab', activeTab);
  }, [activeTab]);

  useEffect(() => {
    if (image) setStorageItem('app_image', image);
    else removeStorageItem('app_image');
  }, [image]);

  useEffect(() => {
    setStorageItem('app_mimeType', mimeType);
  }, [mimeType]);

  useEffect(() => {
    setStorageItem('app_settings', JSON.stringify(settings));
  }, [settings]);

  useEffect(() => {
    setStorageItem('app_sections', JSON.stringify(sections));
  }, [sections]);

  useEffect(() => {
    setStorageItem('app_skills', JSON.stringify(skills));
  }, [skills]);

  useEffect(() => {
    setStorageItem('app_isGenerated', isGenerated.toString());
  }, [isGenerated]);

  useEffect(() => {
    setStorageItem('app_isSkillsGenerated', isSkillsGenerated.toString());
  }, [isSkillsGenerated]);

  const handleGenerate = async () => {
    setIsLoading(true);
    setError(null);
    setIsGenerated(false);

    try {
      const response = await fetch('/api/generate-character', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          imageBase64: image,
          mimeType,
          sectionLabels: sections.map(s => s.label),
          ...settings
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to generate design sheet');
      }

      setSections(prev => prev.map((sec, idx) => ({
        ...sec,
        content: data[`section_${idx}`] || '',
        isExpanded: true
      })));
      setIsGenerated(true);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  };

  const handleGenerateSkills = async (append: boolean = false) => {
    setIsLoading(true);
    setError(null);
    if (!append) {
      setIsSkillsGenerated(false);
    }

    try {
      const characterDesignText = sections.map(s => `${s.label}:\n${s.content}`).join('\n\n');
      const existingSkills = append ? skills.map(s => `Name: ${s.name}\nEffect: ${s.effect}\nVisual: ${s.visual}`).join('\n\n') : '';

      const response = await fetch('/api/generate-skills', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          imageBase64: image,
          mimeType,
          characterDesign: characterDesignText,
          existingSkills,
          ...settings
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to generate skills');
      }

      const newSkills = (data.skills || []).map((skill: any) => ({
        ...skill,
        id: crypto.randomUUID ? crypto.randomUUID() : Math.random().toString(36).substring(7)
      }));

      setSkills(prev => append ? [...prev, ...newSkills] : newSkills);
      setIsSkillsGenerated(true);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  };

  const handleExportText = () => {
    if (activeTab === 'character') {
      const text = sections.map(s => `【${s.label}】\n${s.content}`).join('\n\n');
      downloadFile(text, '角色设定集.txt');
    } else {
      const text = skills.map(s => `【${s.name}】\n- 技能效果: ${s.effect}\n- 动作/视觉描写: ${s.visual}`).join('\n\n');
      downloadFile(text, '技能设定集.txt');
    }
  };

  const downloadFile = (content: string, filename: string) => {
    const blob = new Blob([content], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  return (
    <div className="w-full h-screen bg-[#f3f2f1] text-[#201f1e] font-sans flex flex-col overflow-hidden select-none">
      {/* Header Navigation */}
      <header className="h-14 border-b border-gray-300 bg-white flex items-center justify-between px-6 shrink-0 shadow-sm z-10">
        <div className="flex items-center gap-6">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 bg-[#0078d4] rounded flex items-center justify-center">
              <div className="w-4 h-4 border-2 border-white rotate-45"></div>
            </div>
            <h1 className="text-lg font-semibold tracking-tight">AI 角色设定集生成器 <span className="text-xs font-normal text-gray-500 ml-2">V2.4</span></h1>
          </div>
          <div className="h-6 w-[1px] bg-gray-300 ml-2 mr-2"></div>
          <div className="flex items-center gap-1 bg-[#f3f2f1] p-1 rounded">
            <button 
              onClick={() => setActiveTab('character')}
              className={`px-4 py-1 text-sm rounded transition-colors ${activeTab === 'character' ? 'bg-white shadow-sm font-semibold text-[#0078d4]' : 'text-gray-600 hover:text-gray-900'}`}
            >
              角色设定集
            </button>
            <button 
              onClick={() => setActiveTab('skills')}
              className={`px-4 py-1 text-sm rounded transition-colors ${activeTab === 'skills' ? 'bg-white shadow-sm font-semibold text-[#0078d4]' : 'text-gray-600 hover:text-gray-900'}`}
            >
              技能设定集生成器
            </button>
          </div>
        </div>
        <div className="flex items-center gap-4">
          <button className="px-4 py-1.5 text-sm border border-gray-300 rounded hover:bg-gray-50 transition-colors text-[#201f1e]">导出 PDF</button>
          {activeTab === 'character' ? (
            <button 
              onClick={handleGenerate}
              disabled={!image || isLoading || sections.length === 0}
              className="px-4 py-1.5 text-sm bg-[#0078d4] text-white rounded hover:bg-[#106ebe] transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isLoading ? '生成中...' : '生成设定集'}
            </button>
          ) : (
            <button 
              onClick={() => handleGenerateSkills(false)}
              disabled={!image || isLoading}
              className="px-4 py-1.5 text-sm bg-[#0078d4] text-white rounded hover:bg-[#106ebe] transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isLoading ? '生成中...' : '生成角色技能'}
            </button>
          )}
        </div>
      </header>

      <div className="flex-1 flex flex-col md:flex-row overflow-hidden">
        <Sidebar settings={settings} setSettings={setSettings} activeTab={activeTab} />
        
        <main className="flex-1 overflow-y-auto bg-transparent p-6 md:p-8">
          <div className="max-w-5xl mx-auto flex flex-col gap-8">
            
            <section className="flex flex-col gap-4">
              <div className="flex items-center justify-between">
                <h2 className="text-[11px] font-semibold text-gray-500 uppercase tracking-wider border-b border-gray-300 pb-1 w-full">1. 参考图像</h2>
              </div>
              <ImageUpload image={image} setImage={setImage} setMimeType={setMimeType} />
            </section>

            {error && (
              <div className="p-4 rounded border border-[#fad3d0] bg-[#fdeded] flex items-start gap-3 text-[#a4262c]">
                <AlertCircle className="w-5 h-5 shrink-0 mt-0.5" />
                <p className="text-sm">{error}</p>
              </div>
            )}

            <section className="flex flex-col gap-4">
              <div className="flex items-center justify-between border-b border-gray-300 pb-1">
                <h2 className="text-[11px] font-semibold text-gray-500 uppercase tracking-wider">
                  {activeTab === 'character' ? '2. 生成的设定集' : '2. 角色技能卡片'}
                </h2>
                <div className="flex items-center gap-4">
                  {(activeTab === 'character' ? sections.length > 0 : skills.length > 0) && (
                    <button 
                      onClick={handleExportText}
                      className="text-[11px] text-gray-500 hover:text-[#0078d4] flex items-center gap-1 transition-colors"
                    >
                      <Download className="w-3.5 h-3.5" />
                      一键导出
                    </button>
                  )}
                  {activeTab === 'skills' && skills.length > 0 && (
                    <button 
                      onClick={() => {
                        setSkills([]);
                        setIsSkillsGenerated(false);
                      }}
                      className="text-[11px] text-gray-500 hover:text-[#a4262c] flex items-center gap-1 transition-colors"
                    >
                      一键清空
                    </button>
                  )}
                </div>
              </div>
              {activeTab === 'character' ? (
                <DesignOutput sections={sections} setSections={setSections} isLoading={isLoading} />
              ) : (
                <SkillOutput skills={skills} setSkills={setSkills} onGenerateMore={() => handleGenerateSkills(true)} isLoading={isLoading} />
              )}
            </section>
          </div>
        </main>
      </div>

      {/* Footer Bar */}
      <footer className="h-8 bg-white border-t border-gray-300 text-gray-600 flex items-center px-6 text-[10px] tracking-wider shrink-0">
        <div className="flex-1">AI 生成状态: {activeTab === 'character' ? (isGenerated ? '准备就绪' : '等待中') : (isSkillsGenerated ? '技能就绪' : '等待中')}</div>
        <div className="flex gap-6">
          <span>消耗令牌: --</span>
          <span>延迟: --</span>
          <span>种子: {Math.floor(Math.random() * 99999999)}</span>
        </div>
      </footer>
    </div>
  );
}
