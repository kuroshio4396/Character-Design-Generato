import React, { useState } from 'react';
import { Skill } from '../types';
import { Trash2, Edit2, Check, Plus, Sparkles, Copy } from 'lucide-react';

interface SkillOutputProps {
  skills: Skill[];
  setSkills: React.Dispatch<React.SetStateAction<Skill[]>>;
  isLoading: boolean;
  onGenerateMore: () => void;
}

export function SkillOutput({ skills, setSkills, isLoading, onGenerateMore }: SkillOutputProps) {
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState('');
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const startEditingName = (id: string, currentName: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setEditingId(id);
    setEditName(currentName);
  };

  const saveEditingName = (id: string, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    if (editName.trim()) {
      setSkills(prev => prev.map(s => s.id === id ? { ...s, name: editName.trim() } : s));
    }
    setEditingId(null);
  };

  const removeSkill = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setSkills(prev => prev.filter(s => s.id !== id));
  };

  const updateSkillField = (id: string, field: 'effect' | 'visual', value: string) => {
    setSkills(prev => prev.map(s => s.id === id ? { ...s, [field]: value } : s));
  };

  const copySkill = (skill: Skill, e: React.MouseEvent) => {
    e.stopPropagation();
    const textToCopy = `【${skill.name}】\n\n[技能效果]\n${skill.effect}\n\n[动作/视觉描写]\n${skill.visual}`;
    navigator.clipboard.writeText(textToCopy);
    setCopiedId(skill.id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  if (skills.length === 0 && !isLoading) {
    return (
      <div className="w-full h-full min-h-[200px] flex flex-col items-center justify-center text-gray-400 p-12 border border-gray-300 rounded bg-[#faf9f8] border-dashed">
        <p className="text-sm font-semibold tracking-wider">等待生成技能</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-4 flex-1">
      {isLoading && (
        <div className="w-full flex flex-col items-center justify-center p-6 gap-4 border border-[#0078d4]/30 rounded bg-[#eff6fc]">
          <div className="relative flex w-6 h-6">
            <div className="absolute inset-0 rounded-sm border-2 border-[#0078d4] border-t-transparent animate-spin"></div>
          </div>
          <p className="text-sm text-[#0078d4] font-semibold tracking-wider animate-pulse">正在生成角色技能...</p>
        </div>
      )}

      {skills.map((skill) => (
        <div key={skill.id} className="flex flex-col border border-gray-300 rounded bg-white shadow-sm overflow-hidden">
          <div className="bg-[#eff6fc] border-b border-gray-200 px-4 py-3 flex items-center justify-between group">
            <div className="flex items-center gap-2 flex-1">
              {editingId === skill.id ? (
                <div className="flex items-center gap-2" onClick={e => e.stopPropagation()}>
                  <input
                    type="text"
                    value={editName}
                    onChange={(e) => setEditName(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') saveEditingName(skill.id);
                      if (e.key === 'Escape') setEditingId(null);
                    }}
                    autoFocus
                    className="px-2 py-0.5 text-sm font-bold text-[#0078d4] border border-[#0078d4] rounded outline-none bg-white w-64"
                  />
                  <button onClick={(e) => saveEditingName(skill.id, e)} className="p-1 hover:bg-white rounded text-[#0078d4]">
                    <Check className="w-4 h-4" />
                  </button>
                </div>
              ) : (
                <h3 className="text-sm font-bold text-[#0078d4]">{skill.name}</h3>
              )}
            </div>

            <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
              {editingId !== skill.id && (
                <button 
                  onClick={(e) => startEditingName(skill.id, skill.name, e)}
                  className="p-1.5 text-gray-400 hover:text-[#0078d4] hover:bg-white rounded transition-colors"
                  title="编辑技能名称"
                >
                  <Edit2 className="w-4 h-4" />
                </button>
              )}
              <button 
                onClick={(e) => copySkill(skill, e)}
                className="p-1.5 text-gray-400 hover:text-[#107c10] hover:bg-white rounded transition-colors"
                title="复制技能"
              >
                {copiedId === skill.id ? <Check className="w-4 h-4 text-[#107c10]" /> : <Copy className="w-4 h-4" />}
              </button>
              <button 
                onClick={(e) => removeSkill(skill.id, e)}
                className="p-1.5 text-gray-400 hover:text-[#a4262c] hover:bg-[#fdeded] rounded transition-colors"
                title="删除技能"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            </div>
          </div>
          
          <div className="flex flex-col gap-4 p-4">
            <div>
              <h4 className="text-[11px] font-semibold text-gray-500 uppercase tracking-wider mb-2">技能效果</h4>
              <textarea
                value={skill.effect}
                onChange={(e) => updateSkillField(skill.id, 'effect', e.target.value)}
                placeholder="技能效果描述..."
                className="w-full min-h-[60px] p-2 text-[13px] leading-relaxed text-[#201f1e] resize-y border border-transparent hover:border-gray-200 focus:border-[#0078d4] focus:outline-none rounded transition-colors bg-[#faf9f8] focus:bg-white"
              />
            </div>
            <div>
              <h4 className="text-[11px] font-semibold text-gray-500 uppercase tracking-wider mb-2">动作/视觉描写</h4>
              <textarea
                value={skill.visual}
                onChange={(e) => updateSkillField(skill.id, 'visual', e.target.value)}
                placeholder="动作/视觉描写..."
                className="w-full min-h-[60px] p-2 text-[13px] leading-relaxed text-[#201f1e] resize-y border border-transparent hover:border-gray-200 focus:border-[#0078d4] focus:outline-none rounded transition-colors bg-[#faf9f8] focus:bg-white"
              />
            </div>
          </div>
        </div>
      ))}

      {skills.length > 0 && (
        <button 
          onClick={onGenerateMore}
          disabled={isLoading}
          className="flex items-center justify-center gap-2 w-full p-4 mt-2 border border-dashed border-[#0078d4] bg-[#eff6fc] rounded text-sm font-semibold text-[#0078d4] hover:bg-[#e1f0fe] transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <Sparkles className="w-4 h-4" /> 更多技能
        </button>
      )}
    </div>
  );
}
