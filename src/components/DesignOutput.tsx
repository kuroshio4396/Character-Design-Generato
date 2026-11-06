import React, { useState } from 'react';
import { DesignSection } from '../types';
import { ChevronDown, ChevronRight, Plus, Trash2, Edit2, Check } from 'lucide-react';

interface DesignOutputProps {
  sections: DesignSection[];
  setSections: React.Dispatch<React.SetStateAction<DesignSection[]>>;
  isLoading: boolean;
}

export function DesignOutput({ sections, setSections, isLoading }: DesignOutputProps) {
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editValue, setEditValue] = useState('');

  const toggleExpand = (id: string) => {
    setSections(prev => prev.map(s => s.id === id ? { ...s, isExpanded: !s.isExpanded } : s));
  };

  const removeSection = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setSections(prev => prev.filter(s => s.id !== id));
  };

  const startEditing = (id: string, currentLabel: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setEditingId(id);
    setEditValue(currentLabel);
  };

  const saveEditing = (id: string, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    if (editValue.trim()) {
      setSections(prev => prev.map(s => s.id === id ? { ...s, label: editValue.trim() } : s));
    }
    setEditingId(null);
  };

  const addSection = () => {
    const newId = Math.random().toString(36).substr(2, 9);
    setSections(prev => [...prev, { id: newId, label: '新增设定项', content: '', isExpanded: true }]);
    setEditingId(newId);
    setEditValue('新增设定项');
  };

  const updateContent = (id: string, newContent: string) => {
    setSections(prev => prev.map(s => s.id === id ? { ...s, content: newContent } : s));
  };

  return (
    <div className="flex flex-col gap-2">
      {isLoading && (
        <div className="w-full flex flex-col items-center justify-center p-6 mb-4 gap-4 border border-[#0078d4]/30 rounded bg-[#eff6fc]">
          <div className="relative flex w-6 h-6">
            <div className="absolute inset-0 rounded-sm border-2 border-[#0078d4] border-t-transparent animate-spin"></div>
          </div>
          <p className="text-sm text-[#0078d4] font-semibold tracking-wider animate-pulse">正在分析参考图像并生成设定...</p>
        </div>
      )}

      {sections.map((section) => (
        <div key={section.id} className="border border-gray-300 rounded bg-white shadow-sm overflow-hidden">
          <div 
            className="flex items-center justify-between p-3 bg-[#faf9f8] hover:bg-gray-100 cursor-pointer border-b border-transparent transition-colors group"
            onClick={() => toggleExpand(section.id)}
            style={{ borderBottomColor: section.isExpanded ? '#e1dfdd' : 'transparent' }}
          >
            <div className="flex items-center gap-2 flex-1">
              <span className="text-gray-500">
                {section.isExpanded ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
              </span>
              
              {editingId === section.id ? (
                <div className="flex items-center gap-2" onClick={e => e.stopPropagation()}>
                  <input
                    type="text"
                    value={editValue}
                    onChange={(e) => setEditValue(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') saveEditing(section.id);
                      if (e.key === 'Escape') setEditingId(null);
                    }}
                    autoFocus
                    className="px-2 py-0.5 text-[13px] font-semibold text-[#201f1e] border border-[#0078d4] rounded outline-none"
                  />
                  <button onClick={(e) => saveEditing(section.id, e)} className="p-1 hover:bg-gray-200 rounded text-gray-600">
                    <Check className="w-3.5 h-3.5" />
                  </button>
                </div>
              ) : (
                <span className="text-[13px] font-semibold text-[#201f1e] select-none">
                  {section.label}
                </span>
              )}
            </div>
            
            <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
              {editingId !== section.id && (
                <button 
                  onClick={(e) => startEditing(section.id, section.label, e)}
                  className="p-1.5 text-gray-400 hover:text-[#0078d4] hover:bg-[#eff6fc] rounded transition-colors"
                  title="编辑标签"
                >
                  <Edit2 className="w-3.5 h-3.5" />
                </button>
              )}
              <button 
                onClick={(e) => removeSection(section.id, e)}
                className="p-1.5 text-gray-400 hover:text-[#a4262c] hover:bg-[#fdeded] rounded transition-colors"
                title="删除标签"
              >
                <Trash2 className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>

          {section.isExpanded && (
            <div className="p-4 bg-white">
              <textarea
                value={section.content}
                onChange={(e) => updateContent(section.id, e.target.value)}
                placeholder={isLoading ? "生成中..." : "暂无内容，可手动输入或点击生成..."}
                className="w-full min-h-[80px] p-2 text-sm text-[#201f1e] leading-relaxed resize-y border border-transparent hover:border-gray-200 focus:border-[#0078d4] focus:outline-none rounded transition-colors"
                readOnly={isLoading}
              />
            </div>
          )}
        </div>
      ))}

      <button 
        onClick={addSection}
        disabled={isLoading}
        className="flex items-center justify-center gap-2 w-full p-3 mt-2 border border-dashed border-gray-300 rounded text-sm text-gray-500 hover:text-[#0078d4] hover:border-[#0078d4] hover:bg-[#eff6fc] transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
      >
        <Plus className="w-4 h-4" /> 新增设定标签
      </button>
    </div>
  );
}

