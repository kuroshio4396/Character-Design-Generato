import React, { useState } from 'react';
import { Settings } from '../types';
import { Eye, EyeOff, Zap, CheckCircle2, AlertCircle, Loader2, Globe, Cpu, Key } from 'lucide-react';

interface SidebarProps {
  settings: Settings;
  setSettings: React.Dispatch<React.SetStateAction<Settings>>;
  activeTab: 'character' | 'skills';
}

interface Preset {
  label: string;
  baseUrl: string;
  model: string;
}

const PRESETS: Preset[] = [
  { label: 'OpenAI', baseUrl: 'https://api.openai.com/v1', model: 'gpt-4o' },
  { label: 'DeepSeek', baseUrl: 'https://api.deepseek.com/v1', model: 'deepseek-chat' },
  { label: 'OpenRouter', baseUrl: 'https://openrouter.ai/api/v1', model: 'openai/gpt-4o-mini' },
  { label: '硅基流动', baseUrl: 'https://api.siliconflow.cn/v1', model: 'deepseek-ai/DeepSeek-V3' },
  { label: 'Kimi', baseUrl: 'https://api.kimi.com/coding/v1', model: 'kimi k2.7 code' },
  { label: '本地 Ollama', baseUrl: 'http://localhost:11434/v1', model: 'llama3.2-vision' },
];

export function Sidebar({ settings, setSettings, activeTab }: SidebarProps) {
  const [showApiKey, setShowApiKey] = useState(false);
  const [isTesting, setIsTesting] = useState(false);
  const [testResult, setTestResult] = useState<{ success: boolean; message: string } | null>(null);

  const handleChange = (e: React.ChangeEvent<HTMLTextAreaElement | HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setSettings((prev) => ({ ...prev, [name]: value }));
    if (testResult) setTestResult(null);
  };

  const applyPreset = (preset: Preset) => {
    setSettings((prev) => ({
      ...prev,
      model: 'openai-compatible',
      apiBaseUrl: preset.baseUrl,
      customModel: preset.model,
    }));
    if (testResult) setTestResult(null);
  };

  const handleTestConnection = async () => {
    setIsTesting(true);
    setTestResult(null);
    try {
      const response = await fetch('/api/test-connection', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          apiKey: settings.apiKey,
          model: settings.model,
          apiBaseUrl: settings.apiBaseUrl,
          customModel: settings.customModel,
        }),
      });
      const data = await response.json();
      if (response.ok && data.success) {
        setTestResult({ success: true, message: data.message || '连接成功！' });
      } else {
        setTestResult({ success: false, message: data.error || '连接失败，请检查配置。' });
      }
    } catch (err: any) {
      setTestResult({ success: false, message: err.message || '网络请求失败' });
    } finally {
      setIsTesting(false);
    }
  };

  const isOpenAI = settings.model === 'openai-compatible' || Boolean(settings.apiBaseUrl && settings.apiBaseUrl.trim() !== '');

  return (
    <aside className="w-full md:w-[300px] border-b md:border-b-0 md:border-r border-gray-300 bg-white p-5 flex flex-col gap-5 shrink-0 overflow-y-auto max-h-[50vh] md:max-h-screen">
      <div className="flex flex-col gap-1.5">
        <label htmlFor="worldview" className="text-[12px] font-semibold text-[#201f1e]">
          世界观
        </label>
        <textarea
          id="worldview"
          name="worldview"
          value={settings.worldview}
          onChange={handleChange}
          placeholder="输入故事背景..."
          className="h-28 p-3 text-sm bg-white border border-gray-300 hover:border-gray-400 rounded-sm resize-none focus:outline-none focus:border-[#0078d4] leading-relaxed text-[#201f1e] shadow-sm transition-colors"
        />
      </div>

      <div className="flex flex-col gap-1.5">
        <label htmlFor="characterSetting" className="text-[12px] font-semibold text-[#201f1e]">
          角色设定
        </label>
        <textarea
          id="characterSetting"
          name="characterSetting"
          value={settings.characterSetting}
          onChange={handleChange}
          placeholder="核心特征..."
          className="h-28 p-3 text-sm bg-white border border-gray-300 hover:border-gray-400 rounded-sm resize-none focus:outline-none focus:border-[#0078d4] leading-relaxed text-[#201f1e] shadow-sm transition-colors"
        />
      </div>

      <div className="flex flex-col gap-1.5">
        <label htmlFor="creativeInclination" className="text-[12px] font-semibold text-[#201f1e]">
          创作倾向
        </label>
        <textarea
          id="creativeInclination"
          name="creativeInclination"
          value={settings.creativeInclination}
          onChange={handleChange}
          placeholder="风格偏好..."
          className="h-28 p-3 text-sm bg-white border border-gray-300 hover:border-gray-400 rounded-sm resize-none focus:outline-none focus:border-[#0078d4] leading-relaxed text-[#201f1e] shadow-sm transition-colors"
        />
      </div>

      {activeTab === 'skills' && (
        <>
          <div className="flex flex-col gap-1.5 pt-4 border-t border-gray-200">
            <label htmlFor="skillFormat" className="text-[12px] font-semibold text-[#201f1e]">
              技能格式
            </label>
            <textarea
              id="skillFormat"
              name="skillFormat"
              value={settings.skillFormat || ''}
              onChange={handleChange}
              placeholder="例如：被动、主动、终极技能..."
              className="h-20 p-3 text-sm bg-white border border-gray-300 hover:border-gray-400 rounded-sm resize-none focus:outline-none focus:border-[#0078d4] leading-relaxed text-[#201f1e] shadow-sm transition-colors"
            />
          </div>
          <div className="flex flex-col gap-1.5">
            <label htmlFor="skillInclination" className="text-[12px] font-semibold text-[#201f1e]">
              技能倾向
            </label>
            <textarea
              id="skillInclination"
              name="skillInclination"
              value={settings.skillInclination || ''}
              onChange={handleChange}
              placeholder="例如：偏重于控场、高爆发、魔法、科技..."
              className="h-20 p-3 text-sm bg-white border border-gray-300 hover:border-gray-400 rounded-sm resize-none focus:outline-none focus:border-[#0078d4] leading-relaxed text-[#201f1e] shadow-sm transition-colors"
            />
          </div>
        </>
      )}

      {/* API 秘钥与模型配置 (参考 Novel-Translator 设计) */}
      <div className="flex flex-col gap-3 mt-1 pt-4 border-t border-gray-200">
        <div className="flex items-center justify-between">
          <label className="text-[12px] font-bold text-[#201f1e] flex items-center gap-1.5">
            <Key className="w-3.5 h-3.5 text-[#0078d4]" />
            API 与端点配置
          </label>
          <button
            type="button"
            onClick={handleTestConnection}
            disabled={isTesting}
            className="text-[11px] text-[#0078d4] hover:text-[#106ebe] hover:underline flex items-center gap-1 disabled:opacity-50"
          >
            {isTesting ? <Loader2 className="w-3 h-3 animate-spin" /> : <Zap className="w-3 h-3" />}
            测试连接
          </button>
        </div>

        {/* 模型下拉选择 */}
        <div className="flex flex-col gap-1">
          <label htmlFor="model" className="text-[11px] text-gray-600 font-medium flex items-center gap-1">
            <Cpu className="w-3 h-3 text-gray-400" />
            模型服务
          </label>
          <select
            id="model"
            name="model"
            value={settings.model || 'gemini-3.5-flash'}
            onChange={handleChange}
            className="w-full p-2 text-xs bg-white border border-gray-300 hover:border-gray-400 rounded-sm focus:outline-none focus:border-[#0078d4] text-[#201f1e] shadow-sm transition-colors"
          >
            <optgroup label="Google Gemini">
              <option value="gemini-3.6-flash">Gemini 3.6 Flash</option>
              <option value="gemini-3.5-flash">Gemini 3.5 Flash (推荐)</option>
              <option value="gemini-3-flash">Gemini 3 Flash</option>
              <option value="gemini-2.5-flash">Gemini 2.5 Flash</option>
            </optgroup>
            <optgroup label="OpenAI 兼容端点">
              <option value="openai-compatible">自定义 OpenAI 兼容端点</option>
              <option value="kimi k2.7 code">Kimi k2.7 code</option>
            </optgroup>
          </select>
        </div>

        {/* 当选择 OpenAI 兼容端点时展示详细配置 */}
        {isOpenAI ? (
          <div className="flex flex-col gap-2.5 p-2.5 bg-[#f8f9fa] border border-gray-200 rounded text-xs">
            {/* 快速预设按钮组 */}
            <div className="flex flex-col gap-1">
              <span className="text-[10px] text-gray-500 font-medium">快速预设填入:</span>
              <div className="flex flex-wrap gap-1">
                {PRESETS.map((p) => {
                  const isActive = settings.apiBaseUrl === p.baseUrl;
                  return (
                    <button
                      key={p.label}
                      type="button"
                      onClick={() => applyPreset(p)}
                      className={`px-1.5 py-0.5 text-[10px] rounded transition-colors border ${
                        isActive
                          ? 'bg-[#eff6fc] text-[#0078d4] border-[#0078d4] font-medium'
                          : 'bg-white text-gray-600 border-gray-300 hover:border-gray-400 hover:text-black'
                      }`}
                    >
                      {p.label}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* API 端点 Base URL */}
            <div className="flex flex-col gap-1">
              <label htmlFor="apiBaseUrl" className="text-[11px] text-gray-600 font-medium flex items-center gap-1">
                <Globe className="w-3 h-3 text-gray-400" />
                API 端点 (Base URL)
              </label>
              <input
                type="text"
                id="apiBaseUrl"
                name="apiBaseUrl"
                value={settings.apiBaseUrl || ''}
                onChange={handleChange}
                placeholder="https://api.openai.com/v1"
                className="w-full p-1.5 text-xs bg-white border border-gray-300 hover:border-gray-400 rounded-sm focus:outline-none focus:border-[#0078d4] text-[#201f1e] shadow-sm font-mono"
              />
              <span className="text-[10px] text-gray-400 leading-tight">
                支持任意兼容服务商、中转反代或本地 Ollama (如 http://localhost:11434/v1)
              </span>
            </div>

            {/* 自定义模型名 */}
            <div className="flex flex-col gap-1">
              <label htmlFor="customModel" className="text-[11px] text-gray-600 font-medium">
                模型标识符 (Model Name)
              </label>
              <input
                type="text"
                id="customModel"
                name="customModel"
                value={settings.customModel || ''}
                onChange={handleChange}
                placeholder="例如: gpt-4o, deepseek-chat, qwen-vl-max"
                className="w-full p-1.5 text-xs bg-white border border-gray-300 hover:border-gray-400 rounded-sm focus:outline-none focus:border-[#0078d4] text-[#201f1e] shadow-sm font-mono"
              />
            </div>

            {/* API 密钥 */}
            <div className="flex flex-col gap-1">
              <label htmlFor="apiKey" className="text-[11px] text-gray-600 font-medium">
                API 密钥 / Token
              </label>
              <div className="relative">
                <input
                  type={showApiKey ? 'text' : 'password'}
                  id="apiKey"
                  name="apiKey"
                  value={settings.apiKey || ''}
                  onChange={handleChange}
                  placeholder="sk-..."
                  className="w-full p-1.5 pr-7 text-xs bg-white border border-gray-300 hover:border-gray-400 rounded-sm focus:outline-none focus:border-[#0078d4] text-[#201f1e] shadow-sm font-mono"
                />
                <button
                  type="button"
                  onClick={() => setShowApiKey(!showApiKey)}
                  className="absolute right-1.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                  title={showApiKey ? '隐藏密钥' : '显示密钥'}
                >
                  {showApiKey ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                </button>
              </div>
            </div>
          </div>
        ) : (
          /* Gemini 模式下的 API 密钥输入框 */
          <div className="flex flex-col gap-1.5">
            <div className="flex items-center justify-between">
              <label htmlFor="apiKey" className="text-[11px] text-gray-600 font-medium">
                API 密钥 (可选)
              </label>
              <button
                type="button"
                onClick={() => {
                  setSettings(prev => ({
                    ...prev,
                    model: 'openai-compatible',
                    apiBaseUrl: prev.apiBaseUrl || 'https://api.openai.com/v1',
                    customModel: prev.customModel || 'gpt-4o'
                  }));
                }}
                className="text-[10px] text-[#0078d4] hover:underline"
              >
                切换自定义端点
              </button>
            </div>
            <div className="relative">
              <input
                type={showApiKey ? 'text' : 'password'}
                id="apiKey"
                name="apiKey"
                value={settings.apiKey || ''}
                onChange={handleChange}
                placeholder="输入您的 Gemini API 密钥..."
                className="w-full p-2 pr-8 text-xs bg-white border border-gray-300 hover:border-gray-400 rounded-sm focus:outline-none focus:border-[#0078d4] text-[#201f1e] shadow-sm transition-colors font-mono"
              />
              <button
                type="button"
                onClick={() => setShowApiKey(!showApiKey)}
                className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                title={showApiKey ? '隐藏密钥' : '显示密钥'}
              >
                {showApiKey ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
              </button>
            </div>
            <p className="text-[10px] text-gray-500">若不提供密钥，将使用内置 AI 完成处理。</p>
          </div>
        )}

        {/* 连接测试结果提示框 */}
        {testResult && (
          <div
            className={`p-2 rounded text-xs flex items-start gap-1.5 transition-all ${
              testResult.success
                ? 'bg-[#dff6dd] text-[#107c10] border border-[#b8ecc0]'
                : 'bg-[#fde7e9] text-[#a80000] border border-[#f8c0c8]'
            }`}
          >
            {testResult.success ? (
              <CheckCircle2 className="w-3.5 h-3.5 shrink-0 mt-0.5" />
            ) : (
              <AlertCircle className="w-3.5 h-3.5 shrink-0 mt-0.5" />
            )}
            <span className="break-all leading-snug">{testResult.message}</span>
          </div>
        )}
      </div>
    </aside>
  );
}
