export interface DesignSection {
  id: string;
  label: string;
  content: string;
  isExpanded: boolean;
}

export interface Skill {
  id: string;
  name: string;
  effect: string;
  visual: string;
}

export interface Settings {
  worldview: string;
  characterSetting: string;
  creativeInclination: string;
  skillFormat?: string;
  skillInclination?: string;
  apiKey?: string;
  model?: string;
  apiBaseUrl?: string;
  customModel?: string;
}


