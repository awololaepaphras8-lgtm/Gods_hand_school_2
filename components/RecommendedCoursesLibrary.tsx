import React, { useState } from 'react';
import { Course, GradeLevel } from '../types';
import { GRADE_GROUPS } from '../constants';
import { RECOMMENDED_COURSES_CATALOG, RecommendedCourseTemplate } from '../constants/recommendedCourses';

interface RecommendedCoursesLibraryProps {
  existingCourses: Course[];
  onAddCourse: (course: { name: string; grade: GradeLevel; description: string }) => void;
}

export const RecommendedCoursesLibrary: React.FC<RecommendedCoursesLibraryProps> = ({
  existingCourses,
  onAddCourse
}) => {
  const [selectedCategory, setSelectedCategory] = useState<string>('ALL');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [targetGrade, setTargetGrade] = useState<GradeLevel>('Basic 1');
  const [feedbackMsg, setFeedbackMsg] = useState<string>('');

  const categories = [
    'ALL',
    'Early Childhood',
    'Nursery',
    'Primary / Basic',
    'Junior Secondary',
    'Senior Secondary (Science)',
    'Senior Secondary (Commercial)',
    'Senior Secondary (Arts)'
  ];

  const filteredCatalog = RECOMMENDED_COURSES_CATALOG.filter(item => {
    if (selectedCategory !== 'ALL' && item.category !== selectedCategory) {
      return false;
    }
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      const matchName = item.name.toLowerCase().includes(q);
      const matchDesc = item.description.toLowerCase().includes(q);
      return matchName || matchDesc;
    }
    return true;
  });

  const showFeedback = (msg: string) => {
    setFeedbackMsg(msg);
    setTimeout(() => setFeedbackMsg(''), 4000);
  };

  const handleAddSingleCourse = (template: RecommendedCourseTemplate) => {
    // Check if course already exists in target class
    const alreadyExists = existingCourses.some(
      c => c.name.toLowerCase() === template.name.toLowerCase() && c.grade === targetGrade
    );

    if (alreadyExists) {
      showFeedback(`"${template.name}" already exists in ${targetGrade}!`);
      return;
    }

    onAddCourse({
      name: template.name,
      grade: targetGrade,
      description: template.description
    });
    showFeedback(`✓ "${template.name}" successfully added to ${targetGrade}!`);
  };

  const handleBatchAddForClass = () => {
    // Find all templates applicable to targetGrade
    const applicable = RECOMMENDED_COURSES_CATALOG.filter(t =>
      t.applicableGrades.includes(targetGrade)
    );

    if (applicable.length === 0) {
      alert(`No pre-matched templates for ${targetGrade}. You can pick any course manually below.`);
      return;
    }

    let addedCount = 0;
    applicable.forEach(template => {
      const alreadyExists = existingCourses.some(
        c => c.name.toLowerCase() === template.name.toLowerCase() && c.grade === targetGrade
      );
      if (!alreadyExists) {
        onAddCourse({
          name: template.name,
          grade: targetGrade,
          description: template.description
        });
        addedCount++;
      }
    });

    if (addedCount > 0) {
      showFeedback(`🎉 Success: Added ${addedCount} recommended courses to ${targetGrade}!`);
    } else {
      showFeedback(`All recommended courses for ${targetGrade} are already assigned.`);
    }
  };

  return (
    <div className="bg-white rounded-[2.5rem] p-6 sm:p-8 border-2 border-slate-100 shadow-xl space-y-6">
      {/* Top Banner */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 pb-6 border-b border-slate-100">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-2xl bg-blue-900 text-yellow-400 flex items-center justify-center font-black text-2xl shadow-md border-2 border-yellow-400 shrink-0">
            📖
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="font-serif font-black text-blue-950 text-xl sm:text-2xl">
                Recommended Curriculum & Courses Catalog
              </h3>
              <span className="px-2.5 py-0.5 rounded-full bg-yellow-400 text-blue-950 text-[10px] font-black uppercase tracking-wider">
                Admin Library
              </span>
            </div>
            <p className="text-xs text-slate-500 font-medium mt-0.5">
              Select any standard Nigerian curriculum course done by students & pupils to assign directly to each class.
            </p>
          </div>
        </div>

        {/* Target Grade Selector & Quick Batch Add */}
        <div className="flex flex-wrap items-center gap-3 bg-blue-50/70 p-3 rounded-2xl border border-blue-200">
          <div className="flex items-center gap-2">
            <span className="text-xs font-black uppercase tracking-wider text-blue-950">
              Target Class:
            </span>
            <select
              value={targetGrade}
              onChange={e => setTargetGrade(e.target.value as GradeLevel)}
              className="px-3 py-1.5 bg-white border-2 border-blue-900 rounded-xl text-xs font-black text-blue-950 outline-none"
            >
              {GRADE_GROUPS.flatMap(g => g.levels).map(lvl => (
                <option key={lvl} value={lvl}>{lvl}</option>
              ))}
            </select>
          </div>

          <button
            type="button"
            onClick={handleBatchAddForClass}
            className="px-4 py-2 bg-yellow-400 hover:bg-yellow-300 text-blue-950 rounded-xl font-black text-xs uppercase tracking-wider transition-all shadow-sm active:scale-95 flex items-center gap-1.5"
            title={`Batch add all recommended curriculum subjects for ${targetGrade}`}
          >
            <span>⚡</span>
            <span>Batch Add All for {targetGrade}</span>
          </button>
        </div>
      </div>

      {feedbackMsg && (
        <div className="p-3 bg-emerald-50 border-2 border-emerald-300 text-emerald-900 rounded-2xl text-xs font-black text-center animate-bounce">
          {feedbackMsg}
        </div>
      )}

      {/* Category Tabs & Search Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        {/* Category Pills */}
        <div className="flex flex-wrap items-center gap-1.5">
          {categories.map(cat => (
            <button
              key={cat}
              type="button"
              onClick={() => setSelectedCategory(cat)}
              className={`px-3 py-1.5 rounded-xl text-xs font-black uppercase tracking-wider transition-all border ${
                selectedCategory === cat
                  ? 'bg-blue-900 text-yellow-400 border-blue-900 shadow-sm'
                  : 'bg-slate-50 hover:bg-slate-100 text-slate-700 border-slate-200'
              }`}
            >
              {cat === 'ALL' ? 'All Divisions' : cat}
            </button>
          ))}
        </div>

        {/* Search Input */}
        <div className="w-full sm:w-64">
          <input
            type="text"
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            placeholder="Search subjects / topics..."
            className="w-full px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-900"
          />
        </div>
      </div>

      {/* Recommended Courses Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 max-h-[520px] overflow-y-auto pr-1">
        {filteredCatalog.map((template, idx) => {
          const isAlreadyInTarget = existingCourses.some(
            c => c.name.toLowerCase() === template.name.toLowerCase() && c.grade === targetGrade
          );

          return (
            <div
              key={`${template.name}-${idx}`}
              className="p-5 rounded-3xl border-2 border-slate-100 bg-white hover:border-blue-300 hover:shadow-lg transition-all flex flex-col justify-between space-y-3"
            >
              <div>
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <span className="text-2xl">{template.icon}</span>
                    <h4 className="font-serif font-black text-blue-950 text-base leading-snug">
                      {template.name}
                    </h4>
                  </div>
                  <span className="text-[9px] font-black uppercase bg-slate-100 text-slate-600 px-2 py-0.5 rounded-full shrink-0">
                    {template.category}
                  </span>
                </div>

                <p className="text-xs text-slate-500 font-medium leading-relaxed mt-2 line-clamp-2">
                  {template.description}
                </p>
              </div>

              <div className="pt-3 border-t border-slate-100 flex items-center justify-between gap-2">
                <span className="text-[10px] text-slate-400 font-bold truncate">
                  Target: <strong className="text-blue-900">{targetGrade}</strong>
                </span>

                {isAlreadyInTarget ? (
                  <span className="px-3 py-1.5 bg-green-50 text-green-700 border border-green-200 rounded-xl text-[10px] font-black uppercase flex items-center gap-1">
                    <span>✓</span> Added
                  </span>
                ) : (
                  <button
                    type="button"
                    onClick={() => handleAddSingleCourse(template)}
                    className="px-3.5 py-1.5 bg-blue-900 hover:bg-blue-800 text-yellow-400 rounded-xl font-black text-xs uppercase tracking-wider transition-all shadow-xs flex items-center gap-1 active:scale-95"
                    title={`Assign "${template.name}" to ${targetGrade}`}
                  >
                    <span>➕</span>
                    <span>Add to {targetGrade}</span>
                  </button>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
