import React, { useState, useRef, useEffect } from 'react';
import { UserSettings, AspectRatioOption, GraphicType, User, Team } from '../types';
import { X, Settings as SettingsIcon, Save, User as UserIcon, Camera, Loader2, Users, Plus, Trash2, Mail } from 'lucide-react';
import { uploadProfileImage } from '../services/imageService';
import { teamService } from '../services/teamService';

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  user: User;
  onSave: (newSettings: UserSettings, profileData?: { name: string; username: string; photoURL?: string }) => void;
  graphicTypes: GraphicType[];
  aspectRatios: AspectRatioOption[];
}

export const SettingsModal: React.FC<SettingsModalProps> = ({
  isOpen,
  onClose,
  user,
  onSave,
  graphicTypes,
  aspectRatios
}) => {
  const [localSettings, setLocalSettings] = useState<UserSettings>(user.preferences.settings || { contributeByDefault: false });
  const [name, setName] = useState(user.name);
  const [username, setUsername] = useState(user.username || '');
  const [photoURL, setPhotoURL] = useState<string | undefined>(user.photoURL);
  
  const [isUploading, setIsUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Teams State
  const [teams, setTeams] = useState<Team[]>([]);
  const [newTeamName, setNewTeamName] = useState('');
  const [isCreatingTeam, setIsCreatingTeam] = useState(false);
  const [inviteEmail, setInviteEmail] = useState('');
  const [activeTeamId, setActiveTeamId] = useState<string | null>(null);

  useEffect(() => {
    setLocalSettings(user.preferences.settings || { contributeByDefault: false });
    setName(user.name);
    setUsername(user.username || '');
    setPhotoURL(user.photoURL);
    loadTeams();
  }, [user, isOpen]);

  const loadTeams = async () => {
    const userTeams = await teamService.getUserTeams(user.id);
    setTeams(userTeams);
  };

  if (!isOpen) return null;

  const handleSave = () => {
    onSave(localSettings, { name, username, photoURL });
    onClose();
  };

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsUploading(true);
    setUploadError(null);

    try {
      const url = await uploadProfileImage(file, user.id);
      setPhotoURL(url);
    } catch (err: any) {
      setUploadError(err.message);
    } finally {
      setIsUploading(false);
    }
  };

  // Team Handlers
  const handleCreateTeam = async () => {
      if (!newTeamName.trim()) return;
      try {
          await teamService.createTeam(newTeamName, user);
          setNewTeamName('');
          setIsCreatingTeam(false);
          loadTeams();
      } catch (e) {
          console.error("Failed to create team", e);
      }
  };

  const handleInviteMember = async (teamId: string) => {
      if (!inviteEmail.trim()) return;
      try {
          await teamService.addMember(teamId, inviteEmail);
          setInviteEmail('');
          alert("Member invited successfully!");
          loadTeams();
      } catch (e: any) {
          alert("Failed to invite member: " + e.message);
      }
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-white dark:bg-[#161b22] border border-gray-200 dark:border-[#30363d] rounded-2xl w-full max-w-2xl shadow-2xl flex flex-col max-h-[90vh] overflow-hidden text-slate-900 dark:text-white">
        
        {/* Header */}
        <div className="flex justify-between items-center px-6 py-4 border-b border-gray-200 dark:border-[#30363d]">
          <div className="flex items-center gap-2">
            <SettingsIcon size={20} className="text-brand-teal" />
            <h3 className="text-lg font-bold">Settings</h3>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-900 dark:hover:text-white p-1 rounded-md hover:bg-gray-100 dark:hover:bg-[#30363d] transition-colors">
            <X size={20} />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-6 flex flex-col md:flex-row gap-6">
          
          {/* LEFT COLUMN: Profile & Preferences */}
          <div className="flex-1 space-y-6">
            
            {/* Profile Section */}
            <div className="p-4 bg-gray-50 dark:bg-[#0d1117] rounded-lg border border-gray-200 dark:border-[#30363d] space-y-4">
              <h4 className="text-xs font-bold text-slate-500 uppercase flex items-center gap-2">
                <UserIcon size={14} /> Profile
              </h4>
              
              {/* Photo Upload */}
              <div className="flex flex-col items-center gap-3">
                <div className="relative group">
                  <div className="w-20 h-20 rounded-full overflow-hidden bg-gray-200 dark:bg-[#21262d] flex items-center justify-center border-2 border-gray-200 dark:border-[#30363d]">
                    {isUploading ? (
                      <Loader2 size={24} className="animate-spin text-brand-teal" />
                    ) : photoURL ? (
                      <img src={photoURL} alt={name} className="w-full h-full object-cover" />
                    ) : (
                      <span className="text-2xl font-bold text-slate-400">{name.charAt(0).toUpperCase()}</span>
                    )}
                  </div>
                  <button 
                    onClick={() => fileInputRef.current?.click()}
                    className="absolute bottom-0 right-0 p-1.5 bg-brand-teal text-white rounded-full shadow-lg hover:bg-teal-600 transition-colors"
                    title="Upload Photo"
                  >
                    <Camera size={14} />
                  </button>
                  <input 
                    type="file" 
                    ref={fileInputRef}
                    className="hidden"
                    accept="image/*"
                    onChange={handleFileSelect}
                  />
                </div>
                {uploadError && <p className="text-xs text-red-500">{uploadError}</p>}
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5">
                  Display Name
                </label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full bg-white dark:bg-[#161b22] border border-gray-200 dark:border-[#30363d] rounded-lg p-2.5 text-sm focus:ring-1 focus:ring-brand-teal focus:outline-none"
                  placeholder="Your Name"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5">
                  Username (for Community)
                </label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-sm font-bold">@</span>
                  <input
                    type="text"
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    className="w-full bg-white dark:bg-[#161b22] border border-gray-200 dark:border-[#30363d] rounded-lg py-2.5 pl-7 pr-3 text-sm focus:ring-1 focus:ring-brand-teal focus:outline-none"
                    placeholder="username"
                  />
                </div>
              </div>
            </div>

            {/* Preferences Section */}
            <div className="space-y-4">
              <h4 className="text-xs font-bold text-slate-500 uppercase">Defaults</h4>
              
              <div className="flex items-start gap-3">
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
                    Automatically share new styles publicly.
                  </p>
                </div>
              </div>

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
          </div>

          {/* RIGHT COLUMN: Teams Management */}
          <div className="flex-1 space-y-6 md:border-l md:border-gray-200 md:dark:border-[#30363d] md:pl-6">
             <div className="flex items-center justify-between">
                <h4 className="text-xs font-bold text-slate-500 uppercase flex items-center gap-2">
                   <Users size={14} /> My Teams
                </h4>
                <button 
                  onClick={() => setIsCreatingTeam(!isCreatingTeam)}
                  className="text-xs text-brand-teal hover:underline font-bold"
                >
                   {isCreatingTeam ? 'Cancel' : '+ New Team'}
                </button>
             </div>

             {/* Create Team Form */}
             {isCreatingTeam && (
                 <div className="p-3 bg-brand-teal/5 rounded-lg border border-brand-teal/20 animate-in fade-in slide-in-from-top-2">
                    <input
                      type="text"
                      value={newTeamName}
                      onChange={(e) => setNewTeamName(e.target.value)}
                      placeholder="Team Name"
                      className="w-full mb-2 p-2 text-sm border border-gray-200 dark:border-[#30363d] rounded bg-white dark:bg-[#0d1117]"
                      autoFocus
                    />
                    <button 
                      onClick={handleCreateTeam}
                      className="w-full py-1.5 bg-brand-teal text-white text-xs font-bold rounded hover:bg-teal-600 transition-colors"
                    >
                        Create Team
                    </button>
                 </div>
             )}

             {/* Teams List */}
             <div className="space-y-3">
                {teams.length === 0 ? (
                    <p className="text-sm text-slate-500 italic">You aren't in any teams yet.</p>
                ) : (
                    teams.map(team => (
                        <div key={team.id} className="border border-gray-200 dark:border-[#30363d] rounded-lg overflow-hidden">
                            <div 
                                className="p-3 bg-gray-50 dark:bg-[#0d1117] flex justify-between items-center cursor-pointer hover:bg-gray-100 dark:hover:bg-[#161b22]"
                                onClick={() => setActiveTeamId(activeTeamId === team.id ? null : team.id)}
                            >
                                <span className="font-bold text-sm">{team.name}</span>
                                <span className="text-xs text-slate-500">{team.members.length} members</span>
                            </div>
                            
                            {/* Team Details (Expanded) */}
                            {activeTeamId === team.id && (
                                <div className="p-3 border-t border-gray-200 dark:border-[#30363d] bg-white dark:bg-[#161b22]">
                                    <div className="flex gap-2 mb-3">
                                        <input
                                          type="email"
                                          value={inviteEmail}
                                          onChange={(e) => setInviteEmail(e.target.value)}
                                          placeholder="user@example.com"
                                          className="flex-1 p-1.5 text-xs border border-gray-200 dark:border-[#30363d] rounded bg-gray-50 dark:bg-[#0d1117]"
                                        />
                                        <button 
                                          onClick={() => handleInviteMember(team.id)}
                                          className="p-1.5 bg-slate-100 dark:bg-[#30363d] text-slate-600 dark:text-slate-300 rounded hover:text-brand-teal"
                                          title="Invite Member"
                                        >
                                            <Plus size={14} />
                                        </button>
                                    </div>
                                    <div className="space-y-1">
                                        <p className="text-[10px] uppercase font-bold text-slate-400">Members</p>
                                        <div className="text-xs text-slate-600 dark:text-slate-400">
                                            {/* In a real app we'd fetch names, here we just show count or IDs */}
                                            {team.members.map(mid => (
                                                <div key={mid} className="flex items-center gap-2">
                                                    <div className="w-4 h-4 rounded-full bg-slate-200 dark:bg-slate-700"></div>
                                                    <span className={mid === user.id ? "font-bold text-brand-teal" : ""}>
                                                        {mid === user.id ? "You" : "User " + mid.substring(0,4)}
                                                    </span>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                </div>
                            )}
                        </div>
                    ))
                )}
             </div>
          </div>

        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-gray-200 dark:border-[#30363d] flex justify-end gap-3 bg-gray-50 dark:bg-[#0d1117]">
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
            <Save size={16} /> Save Changes
          </button>
        </div>

      </div>
    </div>
  );
};
