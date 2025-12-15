import React from 'react';
import { UserSettings, AspectRatioOption, GraphicType } from '../types';
import { X, Settings as SettingsIcon, Save } from 'lucide-react';

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  settings: UserSettings;
  onSave: (newSettings: UserSettings) => void;
  graphicTypes: GraphicType[];
  aspectRatios: AspectRatioOption[];
}

export const SettingsModal: React.FC<SettingsModalProps> = ({
  isOpen,
  onClose,
  settings,
  onSave,
  graphicTypes,
  aspectRatios
}) => {
  const [localSettings, setLocalSettings] = React.useState<UserSettings>(settings);

  React.useEffect(() => {
    setLocalSettings(settings);
  }, [settings, isOpen]);

  if (!isOpen) return null;

  const handleSave = () => {
    onSave(localSettings);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-white dark:bg-[#161b22] border border-gray-200 dark:border-[#30363d] rounded-2xl w-full max-w-md shadow-2xl p-6 relative animate-in zoom-in-95 duration-200 text-slate-900 dark:text-white">
        <div className="flex justify-between items-center mb-6">
          <div className="flex items-center gap-2">
            <SettingsIcon size={20} className="text-brand-teal" />
            <h3 className="text-lg font-bold">Preferences</h3>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-900 dark:hover:text-white p-1 rounded-md hover:bg-gray-100 dark:hover:bg-[#30363d] transition-colors">
            <X size={20} />
          </button>
        </div>

        <div className="space-y-6">
          {/* Contribution Setting */}
          <div className="flex items-start gap-3 p-3 bg-gray-50 dark:bg-[#0d1117] rounded-lg border border-gray-200 dark:border-[#30363d]">
            <input 
              type="checkbox" 
              id="contributeDefault"
              checked={localSettings.contributeByDefault}
              onChange={(e) => setLocalSettings(prev => ({ ...prev, contributeByDefault: e.target.checked }))}
              className="mt-1 w-4 h-4 text-brand-red rounded border-gray-300 focus:ring-brand-red cursor-pointer"
            />
            <div>
              <label htmlFor="contributeDefault" className="block text-sm font-medium cursor-pointer">
                Contribute to Community Catalog by Default
              </label>
              <p className="text-xs text-slate-500 mt-1">
                When adding new custom styles or palettes, automatically check the "Contribute" option to share them with others.
              </p>
            </div>
          </div>

          {/* Default Graphic Type */}
          <div>
            <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">
              Default Graphic Type
            </label>
            <select
              value={localSettings.defaultGraphicTypeId || ''}
              onChange={(e) => setLocalSettings(prev => ({ ...prev, defaultGraphicTypeId: e.target.value }))}
              className="w-full bg-white dark:bg-[#0d1117] border border-gray-200 dark:border-[#30363d] rounded-lg p-2.5 text-sm focus:ring-1 focus:ring-brand-teal focus:outline-none"
            >
              <option value="">Use App Default (Infographic)</option>
              {graphicTypes.map(t => (
                <option key={t.id} value={t.id}>{t.name}</option>
              ))}
            </select>
          </div>

          {/* Default Aspect Ratio */}
          <div>
            <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">
              Default Aspect Ratio
            </label>
            <select
              value={localSettings.defaultAspectRatio || ''}
              onChange={(e) => setLocalSettings(prev => ({ ...prev, defaultAspectRatio: e.target.value }))}
              className="w-full bg-white dark:bg-[#0d1117] border border-gray-200 dark:border-[#30363d] rounded-lg p-2.5 text-sm focus:ring-1 focus:ring-brand-teal focus:outline-none"
            >
              <option value="">Use App Default (1:1)</option>
              {aspectRatios.map(r => (
                <option key={r.value} value={r.value}>{r.label}</option>
              ))}
            </select>
          </div>
        </div>

        <div className="mt-8 flex justify-end gap-3 pt-4 border-t border-gray-200 dark:border-[#30363d]">
          <button 
            onClick={onClose}
            className="px-4 py-2 text-slate-600 dark:text-slate-300 hover:bg-gray-100 dark:hover:bg-[#21262d] rounded-lg font-medium text-sm transition-colors"
          >
            Cancel
          </button>
          <button 
            onClick={handleSave}
            className="flex items-center gap-2 px-4 py-2 bg-brand-teal hover:bg-teal-600 text-white rounded-lg font-medium transition-colors text-sm shadow-lg shadow-brand-teal/20"
          >
            <Save size={16} /> Save Settings
          </button>
        </div>
      </div>
    </div>
  );
};
