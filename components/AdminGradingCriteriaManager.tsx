import React, { useState } from 'react';
import { GradingCriterion } from '../types';
import { DEFAULT_GRADING_CRITERIA } from '../constants';

interface AdminGradingCriteriaManagerProps {
  criteria: GradingCriterion[];
  onSaveCriteria: (newCriteria: GradingCriterion[]) => void;
}

export const AdminGradingCriteriaManager: React.FC<AdminGradingCriteriaManagerProps> = ({
  criteria = DEFAULT_GRADING_CRITERIA,
  onSaveCriteria
}) => {
  const [list, setList] = useState<GradingCriterion[]>(criteria.length > 0 ? criteria : DEFAULT_GRADING_CRITERIA);
  const [editingId, setEditingId] = useState<string | null>(null);
  
  // New Criterion Form state
  const [newGradeLetter, setNewGradeLetter] = useState('');
  const [newMinScore, setNewMinScore] = useState<number>(75);
  const [newMaxScore, setNewMaxScore] = useState<number>(100);
  const [newRemark, setNewRemark] = useState('');
  const [newDescription, setNewDescription] = useState('');
  const [newColor, setNewColor] = useState('#16a34a');

  // Edit fields
  const [editLetter, setEditLetter] = useState('');
  const [editMin, setEditMin] = useState<number>(0);
  const [editMax, setEditMax] = useState<number>(100);
  const [editRemark, setEditRemark] = useState('');
  const [editDesc, setEditDesc] = useState('');
  const [editColor, setEditColor] = useState('');

  // Interactive Test Score Calculator
  const [testScore, setTestScore] = useState<number>(85);
  const [saveSuccessMsg, setSaveSuccessMsg] = useState('');

  const calculateRemark = (score: number) => {
    const match = list.find(c => score >= c.minScore && score <= c.maxScore);
    return match || { gradeLetter: 'N/A', remark: 'Ungraded', color: '#64748b', description: 'Score outside defined brackets' };
  };

  const handleStartEdit = (item: GradingCriterion) => {
    setEditingId(item.id);
    setEditLetter(item.gradeLetter);
    setEditMin(item.minScore);
    setEditMax(item.maxScore);
    setEditRemark(item.remark);
    setEditDesc(item.description || '');
    setEditColor(item.color || '#2563eb');
  };

  const handleSaveEdit = (id: string) => {
    const updated = list.map(item => {
      if (item.id === id) {
        return {
          ...item,
          gradeLetter: editLetter.trim(),
          minScore: Number(editMin),
          maxScore: Number(editMax),
          remark: editRemark.trim(),
          description: editDesc.trim(),
          color: editColor
        };
      }
      return item;
    });
    setList(updated);
    onSaveCriteria(updated);
    setEditingId(null);
    triggerSuccess('Grading criterion updated successfully!');
  };

  const handleAddCriterion = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newGradeLetter.trim() || !newRemark.trim()) {
      alert('Please fill in both the Grade Letter and the Remark (e.g. Excellence).');
      return;
    }

    const newEntry: GradingCriterion = {
      id: `gc-${Date.now()}`,
      gradeLetter: newGradeLetter.trim().toUpperCase(),
      minScore: Number(newMinScore),
      maxScore: Number(newMaxScore),
      remark: newRemark.trim(),
      description: newDescription.trim() || undefined,
      color: newColor
    };

    // Sort descending by minScore
    const updated = [...list, newEntry].sort((a, b) => b.minScore - a.minScore);
    setList(updated);
    onSaveCriteria(updated);

    // Reset inputs
    setNewGradeLetter('');
    setNewRemark('');
    setNewDescription('');
    triggerSuccess(`Grading tier "${newEntry.gradeLetter} - ${newEntry.remark}" added successfully!`);
  };

  const handleDeleteCriterion = (id: string) => {
    if (list.length <= 1) {
      alert('You must keep at least one grading criterion in the school standard.');
      return;
    }
    const filtered = list.filter(c => c.id !== id);
    setList(filtered);
    onSaveCriteria(filtered);
    triggerSuccess('Grading criterion removed.');
  };

  const handleResetDefaults = () => {
    if (window.confirm("Reset all grading criteria to God's Hand International Model School standard brackets (including Excellence for A1)?")) {
      setList(DEFAULT_GRADING_CRITERIA);
      onSaveCriteria(DEFAULT_GRADING_CRITERIA);
      triggerSuccess('Reset to school standard grading scale!');
    }
  };

  const triggerSuccess = (msg: string) => {
    setSaveSuccessMsg(msg);
    setTimeout(() => setSaveSuccessMsg(''), 4000);
  };

  const evaluatedTest = calculateRemark(testScore);

  return (
    <div className="space-y-8 animate-in fade-in duration-300 text-left">
      {/* Top Banner */}
      <div className="bg-gradient-to-r from-blue-950 via-blue-900 to-indigo-950 text-white p-8 sm:p-10 rounded-[2.5rem] shadow-2xl relative overflow-hidden border-2 border-yellow-400/30">
        <div className="absolute top-0 right-0 w-80 h-80 bg-yellow-400/10 rounded-full blur-3xl pointer-events-none"></div>

        <div className="relative z-10 flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
          <div>
            <div className="flex items-center gap-2 mb-2">
              <span className="px-3 py-1 bg-yellow-400 text-blue-950 font-black text-[10px] uppercase rounded-full tracking-wider">
                Academic Policy & Standards
              </span>
              <span className="text-blue-300 text-xs font-bold">
                God's Hand International Model School
              </span>
            </div>
            <h2 className="text-3xl sm:text-4xl font-black font-serif text-white">
              Grading Criteria & Academic Remarks
            </h2>
            <p className="text-blue-200 text-xs sm:text-sm mt-2 max-w-2xl leading-relaxed">
              Define the official score thresholds, grade letters (A1, B2, C4, etc.), and terminal report card remarks (e.g., <strong>Excellence</strong>, Very Good, Credit, Distinction) applied across continuous assessment and examination results.
            </p>
          </div>

          <div className="flex flex-wrap gap-3">
            <button
              type="button"
              onClick={handleResetDefaults}
              className="px-5 py-3 bg-white/10 hover:bg-white/20 text-white font-bold text-xs uppercase tracking-wider rounded-2xl border border-white/20 transition-all"
            >
              🔄 Reset to Defaults
            </button>
          </div>
        </div>

        {/* Live Simulator Widget inside banner */}
        <div className="mt-8 pt-8 border-t border-white/10 grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="bg-white/10 backdrop-blur-md p-4 rounded-2xl border border-white/10">
            <p className="text-[10px] font-black uppercase tracking-wider text-yellow-300">Total Configured Tiers</p>
            <p className="text-3xl font-black text-white mt-1">{list.length} Tiers</p>
            <p className="text-xs text-blue-200 font-bold">From Excellence to Remedial</p>
          </div>

          <div className="bg-white/10 backdrop-blur-md p-4 rounded-2xl border border-white/10 md:col-span-2 flex flex-col sm:flex-row items-center justify-between gap-4">
            <div className="w-full sm:w-auto">
              <span className="text-[10px] font-black uppercase tracking-wider text-emerald-300 block mb-1">
                Live Score Remark Tester
              </span>
              <div className="flex items-center gap-3">
                <input
                  type="range"
                  min="0"
                  max="100"
                  value={testScore}
                  onChange={(e) => setTestScore(Number(e.target.value))}
                  className="w-36 accent-yellow-400 cursor-pointer"
                />
                <span className="font-mono text-xl font-black text-white">{testScore}%</span>
              </div>
            </div>

            <div className="flex items-center gap-3 bg-white/15 px-4 py-2.5 rounded-xl border border-white/20">
              <span className="text-2xl font-black text-yellow-300 font-serif">
                {evaluatedTest.gradeLetter}
              </span>
              <div>
                <p className="text-xs font-black uppercase text-white tracking-wide">
                  {evaluatedTest.remark}
                </p>
                <p className="text-[10px] text-blue-200 truncate max-w-xs font-medium">
                  {evaluatedTest.description}
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Success Notification */}
      {saveSuccessMsg && (
        <div className="p-4 bg-emerald-100 border-2 border-emerald-300 text-emerald-900 rounded-2xl font-black text-xs uppercase tracking-wider flex items-center justify-between animate-in fade-in">
          <span>✓ {saveSuccessMsg}</span>
          <button type="button" onClick={() => setSaveSuccessMsg('')} className="text-emerald-700">✕</button>
        </div>
      )}

      {/* Main Grid: Left = Add New Criteria, Right = Criteria Table */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        {/* Left Form: Add New Criterion */}
        <div className="lg:col-span-4 bg-white p-6 sm:p-7 rounded-3xl border-2 border-slate-100 shadow-sm space-y-5">
          <div className="flex items-center gap-2 border-b border-slate-100 pb-3">
            <span className="text-2xl">➕</span>
            <div>
              <h3 className="font-serif font-black text-lg text-blue-950">Add Grading Tier</h3>
              <p className="text-[11px] text-slate-400 font-bold uppercase">Define bracket & remark</p>
            </div>
          </div>

          <form onSubmit={handleAddCriterion} className="space-y-4 text-xs font-bold">
            <div>
              <label className="block text-slate-500 uppercase tracking-wider text-[10px] mb-1">
                Grade Letter / Symbol *
              </label>
              <input
                type="text"
                required
                placeholder="e.g. A1, A+, Distinction"
                value={newGradeLetter}
                onChange={(e) => setNewGradeLetter(e.target.value)}
                className="w-full px-4 py-3 bg-slate-50 border-2 border-slate-200 rounded-xl font-bold text-blue-950 outline-none focus:border-blue-900 focus:bg-white transition-all"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-slate-500 uppercase tracking-wider text-[10px] mb-1">
                  Min Score (%) *
                </label>
                <input
                  type="number"
                  min="0"
                  max="100"
                  required
                  value={newMinScore}
                  onChange={(e) => setNewMinScore(Number(e.target.value))}
                  className="w-full px-4 py-3 bg-slate-50 border-2 border-slate-200 rounded-xl font-mono font-bold text-blue-950 outline-none focus:border-blue-900 focus:bg-white"
                />
              </div>

              <div>
                <label className="block text-slate-500 uppercase tracking-wider text-[10px] mb-1">
                  Max Score (%) *
                </label>
                <input
                  type="number"
                  min="0"
                  max="100"
                  required
                  value={newMaxScore}
                  onChange={(e) => setNewMaxScore(Number(e.target.value))}
                  className="w-full px-4 py-3 bg-slate-50 border-2 border-slate-200 rounded-xl font-mono font-bold text-blue-950 outline-none focus:border-blue-900 focus:bg-white"
                />
              </div>
            </div>

            <div>
              <label className="block text-slate-500 uppercase tracking-wider text-[10px] mb-1">
                Official Remark (e.g. Excellence) *
              </label>
              <input
                type="text"
                required
                placeholder="e.g. Excellence, Very Good, Credit"
                value={newRemark}
                onChange={(e) => setNewRemark(e.target.value)}
                className="w-full px-4 py-3 bg-slate-50 border-2 border-slate-200 rounded-xl font-bold text-blue-950 outline-none focus:border-blue-900 focus:bg-white"
              />
            </div>

            <div>
              <label className="block text-slate-500 uppercase tracking-wider text-[10px] mb-1">
                Pedagogical Description
              </label>
              <textarea
                rows={2}
                placeholder="e.g. Exceptional academic performance with outstanding mastery"
                value={newDescription}
                onChange={(e) => setNewDescription(e.target.value)}
                className="w-full px-4 py-2.5 bg-slate-50 border-2 border-slate-200 rounded-xl font-normal text-xs text-blue-950 outline-none focus:border-blue-900 focus:bg-white"
              />
            </div>

            <div>
              <label className="block text-slate-500 uppercase tracking-wider text-[10px] mb-1">
                Badge Color
              </label>
              <div className="flex items-center gap-3">
                <input
                  type="color"
                  value={newColor}
                  onChange={(e) => setNewColor(e.target.value)}
                  className="w-10 h-10 rounded-xl cursor-pointer border border-slate-200"
                />
                <span className="font-mono text-slate-600 text-[11px]">{newColor}</span>
              </div>
            </div>

            <button
              type="submit"
              className="w-full py-4 bg-blue-900 hover:bg-blue-800 text-yellow-400 font-black text-xs uppercase tracking-wider rounded-xl shadow-lg transition-all"
            >
              Add Grading Tier →
            </button>
          </form>
        </div>

        {/* Right Table: Active Criteria List */}
        <div className="lg:col-span-8 space-y-4">
          <div className="flex justify-between items-center bg-white p-4 rounded-2xl border border-slate-100 shadow-sm">
            <div>
              <h3 className="font-serif font-black text-lg text-blue-950">
                Current School Grading Scale
              </h3>
              <p className="text-[11px] text-slate-400 font-bold uppercase">
                Sorted from highest score to remedial
              </p>
            </div>
            <span className="px-3 py-1 bg-yellow-400 text-blue-950 font-black text-xs rounded-full">
              {list.length} Tiers Active
            </span>
          </div>

          <div className="space-y-3">
            {list.map((tier) => {
              const isEditing = editingId === tier.id;

              if (isEditing) {
                return (
                  <div key={tier.id} className="p-5 bg-yellow-50 border-2 border-yellow-400 rounded-3xl space-y-3 shadow-md animate-in fade-in">
                    <p className="font-black text-xs uppercase text-blue-950 tracking-wider">
                      Editing Grading Tier: {tier.gradeLetter}
                    </p>
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
                      <div>
                        <label className="text-[10px] font-bold text-slate-500 block mb-1">Grade Letter</label>
                        <input
                          type="text"
                          value={editLetter}
                          onChange={(e) => setEditLetter(e.target.value)}
                          className="w-full p-2 bg-white border border-slate-300 rounded-lg font-bold"
                        />
                      </div>
                      <div>
                        <label className="text-[10px] font-bold text-slate-500 block mb-1">Min Score (%)</label>
                        <input
                          type="number"
                          value={editMin}
                          onChange={(e) => setEditMin(Number(e.target.value))}
                          className="w-full p-2 bg-white border border-slate-300 rounded-lg font-bold font-mono"
                        />
                      </div>
                      <div>
                        <label className="text-[10px] font-bold text-slate-500 block mb-1">Max Score (%)</label>
                        <input
                          type="number"
                          value={editMax}
                          onChange={(e) => setEditMax(Number(e.target.value))}
                          className="w-full p-2 bg-white border border-slate-300 rounded-lg font-bold font-mono"
                        />
                      </div>
                      <div>
                        <label className="text-[10px] font-bold text-slate-500 block mb-1">Remark</label>
                        <input
                          type="text"
                          value={editRemark}
                          onChange={(e) => setEditRemark(e.target.value)}
                          className="w-full p-2 bg-white border border-slate-300 rounded-lg font-bold"
                        />
                      </div>
                    </div>

                    <div>
                      <label className="text-[10px] font-bold text-slate-500 block mb-1">Description</label>
                      <input
                        type="text"
                        value={editDesc}
                        onChange={(e) => setEditDesc(e.target.value)}
                        className="w-full p-2 bg-white border border-slate-300 rounded-lg text-xs"
                      />
                    </div>

                    <div className="flex justify-end gap-2 pt-2">
                      <button
                        type="button"
                        onClick={() => setEditingId(null)}
                        className="px-4 py-2 bg-slate-200 text-slate-700 font-bold text-xs uppercase rounded-xl"
                      >
                        Cancel
                      </button>
                      <button
                        type="button"
                        onClick={() => handleSaveEdit(tier.id)}
                        className="px-5 py-2 bg-blue-900 text-yellow-400 font-black text-xs uppercase rounded-xl shadow-md"
                      >
                        Save Tier Changes
                      </button>
                    </div>
                  </div>
                );
              }

              return (
                <div
                  key={tier.id}
                  className="bg-white p-5 rounded-3xl border-2 border-slate-100 shadow-sm hover:border-blue-200 transition-all flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4"
                >
                  <div className="flex items-center gap-4">
                    <div
                      className="w-14 h-14 rounded-2xl flex items-center justify-center font-serif font-black text-xl text-white shadow-sm shrink-0"
                      style={{ backgroundColor: tier.color || '#1e3a8a' }}
                    >
                      {tier.gradeLetter}
                    </div>

                    <div className="space-y-0.5">
                      <div className="flex items-center gap-2">
                        <span className="font-serif font-black text-lg text-blue-950">
                          {tier.remark}
                        </span>
                        <span className="px-2.5 py-0.5 bg-slate-100 text-slate-700 font-mono font-bold text-xs rounded-lg">
                          {tier.minScore}% – {tier.maxScore}%
                        </span>
                      </div>
                      <p className="text-xs text-slate-500 font-medium">
                        {tier.description || 'Standard academic criterion'}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 self-end sm:self-center">
                    <button
                      type="button"
                      onClick={() => handleStartEdit(tier)}
                      className="px-3 py-1.5 bg-blue-50 hover:bg-blue-100 text-blue-900 font-bold text-xs uppercase rounded-xl transition-all"
                    >
                      ✏️ Edit
                    </button>
                    <button
                      type="button"
                      onClick={() => handleDeleteCriterion(tier.id)}
                      className="px-3 py-1.5 bg-red-50 hover:bg-red-100 text-red-600 font-bold text-xs uppercase rounded-xl transition-all"
                    >
                      🗑️
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
};
