import React, { useState, useEffect } from 'react';
import { TeacherAccount, TimedStaffDelegation, AdminSectionKey, ALL_ADMIN_SECTIONS } from '../types';

interface AdminStaffDelegationManagerProps {
  teachers: TeacherAccount[];
  delegations: TimedStaffDelegation[];
  onGrantDelegation: (delegation: {
    teacherUsername: string;
    teacherName: string;
    grantedSections: AdminSectionKey[];
    durationMinutes: number;
    purpose?: string;
  }) => void;
  onRevokeDelegation: (delegationId: string) => void;
  currentUser?: string;
}

export const AdminStaffDelegationManager: React.FC<AdminStaffDelegationManagerProps> = ({
  teachers,
  delegations = [],
  onGrantDelegation,
  onRevokeDelegation,
  currentUser = 'School Admin'
}) => {
  const [selectedTeacherUsername, setSelectedTeacherUsername] = useState<string>(teachers[0]?.username || '');
  const [selectedSections, setSelectedSections] = useState<AdminSectionKey[]>([
    'attendance',
    'payments',
    'resultPublish'
  ]);
  const [durationMinutes, setDurationMinutes] = useState<number>(60);
  const [customDurationInput, setCustomDurationInput] = useState<string>('60');
  const [durationUnit, setDurationUnit] = useState<'minutes' | 'hours'>('minutes');
  const [purpose, setPurpose] = useState<string>('');
  const [now, setNow] = useState<Date>(new Date());
  const [successMessage, setSuccessMessage] = useState<string>('');

  // Update clock every second for live countdown
  useEffect(() => {
    const timer = setInterval(() => {
      setNow(new Date());
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  // Preset durations in minutes
  const presetDurations = [
    { label: '15 Mins', minutes: 15, note: 'Quick task' },
    { label: '30 Mins', minutes: 30, note: 'Verification' },
    { label: '1 Hour', minutes: 60, note: 'Standard shift' },
    { label: '2 Hours', minutes: 120, note: 'Exam session' },
    { label: '4 Hours', minutes: 240, note: 'Half day' },
    { label: '8 Hours', minutes: 480, note: 'Full day' },
    { label: '24 Hours', minutes: 1440, note: 'Full 24 hrs' },
  ];

  const handleApplyPreset = (minutes: number) => {
    setDurationMinutes(minutes);
    if (minutes >= 60 && minutes % 60 === 0) {
      setCustomDurationInput(String(minutes / 60));
      setDurationUnit('hours');
    } else {
      setCustomDurationInput(String(minutes));
      setDurationUnit('minutes');
    }
  };

  const handleCustomDurationChange = (val: string, unit: 'minutes' | 'hours') => {
    setCustomDurationInput(val);
    setDurationUnit(unit);
    const parsed = parseInt(val, 10);
    if (!isNaN(parsed) && parsed > 0) {
      const mins = unit === 'hours' ? parsed * 60 : parsed;
      setDurationMinutes(mins);
    }
  };

  const toggleSection = (sectionId: AdminSectionKey) => {
    setSelectedSections(prev =>
      prev.includes(sectionId) ? prev.filter(s => s !== sectionId) : [...prev, sectionId]
    );
  };

  const selectAllSections = () => {
    setSelectedSections(ALL_ADMIN_SECTIONS.map(s => s.id));
  };

  const clearAllSections = () => {
    setSelectedSections([]);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedTeacherUsername) {
      alert('Please select a staff member.');
      return;
    }
    if (selectedSections.length === 0) {
      alert('Please select at least one admin panel section to delegate.');
      return;
    }
    if (durationMinutes <= 0) {
      alert('Please enter a valid time duration.');
      return;
    }

    const teacher = teachers.find(t => t.username === selectedTeacherUsername);
    const teacherName = teacher?.username || selectedTeacherUsername;

    onGrantDelegation({
      teacherUsername: selectedTeacherUsername,
      teacherName,
      grantedSections: selectedSections,
      durationMinutes,
      purpose: purpose.trim() || 'Temporary operational duty'
    });

    setSuccessMessage(`✓ Administrative access successfully delegated to ${teacherName} for ${formatDurationText(durationMinutes)}!`);
    setPurpose('');
    setTimeout(() => {
      setSuccessMessage('');
    }, 5000);
  };

  // Helper for human-readable time duration
  const formatDurationText = (mins: number) => {
    if (mins < 60) return `${mins} minute${mins === 1 ? '' : 's'}`;
    const hrs = Math.floor(mins / 60);
    const remainingMins = mins % 60;
    if (remainingMins === 0) return `${hrs} hour${hrs === 1 ? '' : 's'}`;
    return `${hrs}h ${remainingMins}m`;
  };

  // Format remaining time countdown
  const getRemainingTime = (expiresAt: string) => {
    const diffMs = new Date(expiresAt).getTime() - now.getTime();
    if (diffMs <= 0) return { expired: true, text: 'Expired', percentage: 0 };

    const totalSeconds = Math.floor(diffMs / 1000);
    const hours = Math.floor(totalSeconds / 3600);
    const minutes = Math.floor((totalSeconds % 3600) / 60);
    const seconds = totalSeconds % 60;

    let text = '';
    if (hours > 0) {
      text = `${hours}h ${minutes}m ${seconds}s`;
    } else {
      text = `${minutes}m ${seconds}s`;
    }

    return { expired: false, text, totalSeconds };
  };

  // Computed delegations
  const activeDelegations = delegations.filter(d => {
    if (d.status === 'revoked') return false;
    const isExpired = new Date(d.expiresAt).getTime() <= now.getTime();
    return !isExpired;
  });

  const pastDelegations = delegations.filter(d => {
    if (d.status === 'revoked') return true;
    const isExpired = new Date(d.expiresAt).getTime() <= now.getTime();
    return isExpired;
  });

  return (
    <div className="space-y-8" id="timed-staff-delegation-manager">
      {/* Header Banner */}
      <div className="bg-gradient-to-r from-blue-950 via-blue-900 to-indigo-950 text-white p-6 sm:p-8 rounded-3xl shadow-xl border-2 border-yellow-400/30 relative overflow-hidden">
        <div className="relative z-10 max-w-4xl space-y-2">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-yellow-400 text-blue-950 text-xs font-black uppercase tracking-wider">
            <span>⏱️ Timed Delegation Controller</span>
            <span>•</span>
            <span>Security Protected</span>
          </div>
          <h2 className="text-2xl sm:text-3xl font-serif font-black tracking-tight text-white">
            Admin Panel Staff Delegation & Time-Lapse Control
          </h2>
          <p className="text-blue-100 text-xs sm:text-sm font-medium leading-relaxed">
            Grant temporary, time-limited administrator access to any teacher or staff member for specific sections of the school admin panel. Access automatically and irrevocably terminates the exact minute the countdown reaches zero.
          </p>
        </div>
      </div>

      {successMessage && (
        <div className="p-4 bg-emerald-500 text-white rounded-2xl shadow-lg flex items-center justify-between font-black text-sm">
          <span>{successMessage}</span>
          <button onClick={() => setSuccessMessage('')} className="text-white/80 hover:text-white text-lg">✕</button>
        </div>
      )}

      {/* Main Grid: Grant Delegation Form (Left) & Active Delegations (Right) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        {/* Delegation Creation Form */}
        <div className="lg:col-span-6 bg-white p-6 sm:p-7 rounded-3xl border-2 border-slate-200 shadow-sm space-y-6">
          <div className="border-b border-slate-100 pb-4">
            <h3 className="text-lg sm:text-xl font-serif font-black text-blue-950 flex items-center gap-2">
              <span>🔑 Issue New Timed Access</span>
            </h3>
            <p className="text-xs text-slate-500 font-medium mt-0.5">
              Select staff member, choose admin sections, and specify duration.
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-6">
            {/* 1. Select Staff Member */}
            <div className="space-y-1.5">
              <label className="text-xs font-black text-blue-950 uppercase tracking-wider block">
                1. Select Staff Member <span className="text-red-500">*</span>
              </label>
              {teachers.length === 0 ? (
                <div className="p-3 bg-amber-50 rounded-xl border border-amber-200 text-amber-900 text-xs">
                  No staff accounts registered yet. Please create a staff account in the Staff tab first.
                </div>
              ) : (
                <select
                  value={selectedTeacherUsername}
                  onChange={e => setSelectedTeacherUsername(e.target.value)}
                  className="w-full p-3 bg-slate-50 border-2 border-slate-200 rounded-xl font-bold text-slate-800 text-sm focus:border-blue-900 focus:bg-white transition-all outline-none"
                  required
                >
                  <option value="" disabled>-- Choose a Staff Member --</option>
                  {teachers.map(t => {
                    const activeCount = delegations.filter(
                      d => d.teacherUsername === t.username && d.status === 'active' && new Date(d.expiresAt) > now
                    ).length;
                    return (
                      <option key={t.id || t.username} value={t.username}>
                        {t.username} {t.assignedGrades?.length ? `(${t.assignedGrades.join(', ')})` : ''} {activeCount > 0 ? `[★ Active Access]` : ''}
                      </option>
                    );
                  })}
                </select>
              )}
            </div>

            {/* 2. Choose Admin Sections */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <label className="text-xs font-black text-blue-950 uppercase tracking-wider">
                  2. Granted Admin Sections ({selectedSections.length}/{ALL_ADMIN_SECTIONS.length}) <span className="text-red-500">*</span>
                </label>
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={selectAllSections}
                    className="text-[10px] font-black text-blue-900 hover:underline uppercase"
                  >
                    Select All
                  </button>
                  <span className="text-slate-300">|</span>
                  <button
                    type="button"
                    onClick={clearAllSections}
                    className="text-[10px] font-black text-slate-500 hover:underline uppercase"
                  >
                    Clear
                  </button>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-h-60 overflow-y-auto pr-1 p-1 border border-slate-100 rounded-2xl bg-slate-50/50">
                {ALL_ADMIN_SECTIONS.map(section => {
                  const isChecked = selectedSections.includes(section.id);
                  return (
                    <div
                      key={section.id}
                      onClick={() => toggleSection(section.id)}
                      className={`p-2.5 rounded-xl border cursor-pointer transition-all flex items-start space-x-2.5 select-none ${
                        isChecked
                          ? 'bg-blue-50/80 border-blue-400 text-blue-950 shadow-xs'
                          : 'bg-white border-slate-200 text-slate-600 hover:border-slate-300'
                      }`}
                    >
                      <input
                        type="checkbox"
                        checked={isChecked}
                        onChange={() => {}} // Handled by container
                        className="mt-0.5 rounded text-blue-900 focus:ring-0 cursor-pointer"
                      />
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-1.5">
                          <span className="text-sm">{section.icon}</span>
                          <span className="text-xs font-black truncate">{section.label}</span>
                        </div>
                        <p className="text-[10px] text-slate-500 truncate mt-0.5">
                          {section.description}
                        </p>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* 3. Duration & Time Validity (The Admin Sets The Time) */}
            <div className="space-y-2.5">
              <label className="text-xs font-black text-blue-950 uppercase tracking-wider block">
                3. Set Duration of Validity <span className="text-red-500">*</span>
              </label>

              {/* Quick Presets */}
              <div className="flex flex-wrap gap-1.5">
                {presetDurations.map(preset => {
                  const isSelected = durationMinutes === preset.minutes;
                  return (
                    <button
                      key={preset.minutes}
                      type="button"
                      onClick={() => handleApplyPreset(preset.minutes)}
                      className={`px-2.5 py-1.5 rounded-xl text-xs font-black uppercase tracking-wider transition-all border ${
                        isSelected
                          ? 'bg-yellow-400 text-blue-950 border-yellow-500 shadow-xs'
                          : 'bg-slate-100 text-slate-700 border-slate-200 hover:bg-slate-200'
                      }`}
                      title={preset.note}
                    >
                      {preset.label}
                    </button>
                  );
                })}
              </div>

              {/* Custom Input */}
              <div className="flex items-center gap-2 pt-1">
                <div className="relative flex-1">
                  <input
                    type="number"
                    min="1"
                    max="10080"
                    value={customDurationInput}
                    onChange={e => handleCustomDurationChange(e.target.value, durationUnit)}
                    className="w-full p-2.5 bg-slate-50 border-2 border-slate-200 rounded-xl font-black text-slate-800 text-sm focus:border-blue-900 focus:bg-white transition-all outline-none"
                    placeholder="Enter time"
                    required
                  />
                </div>
                <select
                  value={durationUnit}
                  onChange={e => handleCustomDurationChange(customDurationInput, e.target.value as 'minutes' | 'hours')}
                  className="p-2.5 bg-slate-50 border-2 border-slate-200 rounded-xl font-bold text-slate-800 text-sm focus:border-blue-900 outline-none"
                >
                  <option value="minutes">Minutes</option>
                  <option value="hours">Hours</option>
                </select>
              </div>

              {/* Expiry Timestamp Preview */}
              <div className="p-3 bg-blue-50/60 rounded-xl border border-blue-200 text-xs text-blue-900 flex items-center justify-between">
                <span className="font-medium">Total Duration: <strong>{formatDurationText(durationMinutes)}</strong></span>
                <span className="font-bold text-blue-950">
                  Expires at: {new Date(Date.now() + durationMinutes * 60000).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </span>
              </div>
            </div>

            {/* 4. Purpose / Note */}
            <div className="space-y-1.5">
              <label className="text-xs font-black text-blue-950 uppercase tracking-wider block">
                4. Reason / Operational Duty (Optional)
              </label>
              <input
                type="text"
                value={purpose}
                onChange={e => setPurpose(e.target.value)}
                placeholder="e.g. Morning QR attendance duty, fee verification, exam moderation"
                className="w-full p-2.5 bg-slate-50 border-2 border-slate-200 rounded-xl text-xs font-medium text-slate-800 focus:border-blue-900 focus:bg-white transition-all outline-none"
              />
            </div>

            {/* Submit Button */}
            <button
              type="submit"
              disabled={teachers.length === 0 || selectedSections.length === 0}
              className="w-full py-3.5 bg-blue-950 hover:bg-blue-900 disabled:opacity-50 text-white font-black text-xs uppercase tracking-widest rounded-2xl shadow-lg transition-all transform active:scale-98 flex items-center justify-center space-x-2 border-2 border-yellow-400"
            >
              <span>🚀</span>
              <span>Authorize & Issue Temporary Admin Access</span>
            </button>
          </form>
        </div>

        {/* Active & Live Delegations Monitor */}
        <div className="lg:col-span-6 space-y-6">
          <div className="bg-white p-6 sm:p-7 rounded-3xl border-2 border-slate-200 shadow-sm space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div>
                <h3 className="text-lg sm:text-xl font-serif font-black text-blue-950 flex items-center gap-2">
                  <span>⏱️ Active Temporary Delegations</span>
                  <span className="px-2 py-0.5 rounded-full text-xs font-black bg-emerald-100 text-emerald-800">
                    {activeDelegations.length} Live
                  </span>
                </h3>
                <p className="text-xs text-slate-500 font-medium">
                  Staff currently holding valid elevated admin credentials.
                </p>
              </div>
            </div>

            {activeDelegations.length === 0 ? (
              <div className="text-center py-10 px-4 bg-slate-50 rounded-2xl border-2 border-dashed border-slate-200">
                <span className="text-3xl block mb-2">🛡️</span>
                <p className="text-sm font-black text-slate-700">No Active Delegations</p>
                <p className="text-xs text-slate-400 max-w-sm mx-auto mt-1">
                  All administrative access is strictly restricted to the School Principal & Primary Administrator. Use the form on the left to delegate temporary access.
                </p>
              </div>
            ) : (
              <div className="space-y-4">
                {activeDelegations.map(del => {
                  const remaining = getRemainingTime(del.expiresAt);
                  return (
                    <div
                      key={del.id}
                      className="p-4 rounded-2xl border-2 border-emerald-300 bg-emerald-50/40 shadow-sm space-y-3 relative overflow-hidden"
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="text-base">👔</span>
                            <span className="font-black text-blue-950 text-sm">
                              {del.teacherName}
                            </span>
                            <span className="px-2 py-0.5 rounded-full text-[10px] font-black uppercase bg-emerald-600 text-white flex items-center gap-1 animate-pulse">
                              <span className="w-1.5 h-1.5 rounded-full bg-white"></span>
                              Active
                            </span>
                          </div>
                          <p className="text-xs text-slate-600 font-medium mt-0.5">
                            Purpose: <em>{del.purpose || 'Administrative assignment'}</em>
                          </p>
                        </div>

                        {/* Revoke Button */}
                        <button
                          type="button"
                          onClick={() => {
                            if (confirm(`Revoke temporary admin access for ${del.teacherName} immediately?`)) {
                              onRevokeDelegation(del.id);
                            }
                          }}
                          className="px-2.5 py-1.5 bg-red-100 hover:bg-red-600 text-red-700 hover:text-white rounded-xl text-[11px] font-black uppercase tracking-wider transition-all border border-red-300 shrink-0"
                          title="Instantly terminate admin privileges"
                        >
                          ⛔ Revoke Now
                        </button>
                      </div>

                      {/* Live Countdown Banner */}
                      <div className="bg-white p-3 rounded-xl border border-emerald-200 flex items-center justify-between">
                        <div className="flex items-center gap-1.5 text-xs text-slate-500 font-bold">
                          <span>⏳ Time Remaining:</span>
                        </div>
                        <div className="font-mono text-base sm:text-lg font-black text-emerald-800">
                          {remaining.text}
                        </div>
                      </div>

                      {/* Granted Sections Badges */}
                      <div className="space-y-1">
                        <span className="text-[10px] font-black text-slate-500 uppercase tracking-wider block">
                          Granted Modules ({del.grantedSections.length}):
                        </span>
                        <div className="flex flex-wrap gap-1">
                          {del.grantedSections.map(sKey => {
                            const config = ALL_ADMIN_SECTIONS.find(s => s.id === sKey);
                            return (
                              <span
                                key={sKey}
                                className="inline-flex items-center gap-1 px-2 py-0.5 rounded-lg bg-blue-100 text-blue-900 text-[10px] font-black"
                              >
                                <span>{config?.icon || '⚙️'}</span>
                                <span>{config?.label || sKey}</span>
                              </span>
                            );
                          })}
                        </div>
                      </div>

                      <div className="text-[10px] text-slate-400 flex items-center justify-between pt-1 border-t border-emerald-100">
                        <span>Issued: {new Date(del.grantedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                        <span>Expires: {new Date(del.expiresAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Past & Expired Delegations Audit Trail */}
          <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-xs space-y-3">
            <h4 className="text-xs font-black text-slate-400 uppercase tracking-widest flex items-center justify-between">
              <span>📋 Recent Delegation Audit Log</span>
              <span>{pastDelegations.length} Historic</span>
            </h4>

            {pastDelegations.length === 0 ? (
              <p className="text-xs text-slate-400 italic py-2">No expired or revoked delegations yet.</p>
            ) : (
              <div className="space-y-2 max-h-60 overflow-y-auto pr-1">
                {pastDelegations.slice(0, 8).map(del => (
                  <div
                    key={del.id}
                    className="p-2.5 rounded-xl border border-slate-100 bg-slate-50/60 text-xs flex items-center justify-between text-slate-600"
                  >
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-slate-800">{del.teacherName}</span>
                        <span className={`px-1.5 py-0.2 rounded text-[9px] font-black uppercase ${
                          del.status === 'revoked' ? 'bg-red-100 text-red-800' : 'bg-slate-200 text-slate-600'
                        }`}>
                          {del.status === 'revoked' ? 'Revoked' : 'Expired'}
                        </span>
                      </div>
                      <p className="text-[10px] text-slate-400 mt-0.5">
                        {del.grantedSections.length} section(s) • {formatDurationText(del.durationMinutes)}
                      </p>
                    </div>
                    <div className="text-right text-[10px] text-slate-400">
                      {new Date(del.grantedAt).toLocaleDateString()}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
