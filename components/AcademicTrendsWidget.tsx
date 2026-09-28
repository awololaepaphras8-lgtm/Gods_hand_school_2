import React, { useState, useMemo } from 'react';
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend
} from 'recharts';
import { StudentResult, GradeLevel } from '../types';
import { GRADE_GROUPS } from '../constants';

interface AcademicTrendsWidgetProps {
  results: StudentResult[];
  assignedGrades?: GradeLevel[]; // For teacher views: limit to teacher's classes if provided
  currentTerm?: string;
  className?: string;
  isStaffView?: boolean;
}

export const AcademicTrendsWidget: React.FC<AcademicTrendsWidgetProps> = ({
  results,
  assignedGrades,
  currentTerm = 'First Term',
  className = '',
  isStaffView = false
}) => {
  const [chartType, setChartType] = useState<'bar' | 'line'>('bar');
  const [selectedDivision, setSelectedDivision] = useState<string>('ALL');
  const [selectedSubject, setSelectedSubject] = useState<string>('ALL');

  // List of unique subjects present in the results
  const availableSubjects = useMemo(() => {
    const set = new Set<string>();
    results.forEach(r => {
      if (r.subject) set.add(r.subject);
    });
    return Array.from(set).sort();
  }, [results]);

  // Filter results by division and subject
  const filteredResults = useMemo(() => {
    return results.filter(r => {
      if (assignedGrades && assignedGrades.length > 0 && !assignedGrades.includes(r.grade)) {
        return false;
      }
      if (selectedSubject !== 'ALL' && r.subject !== selectedSubject) {
        return false;
      }
      if (selectedDivision !== 'ALL') {
        const group = GRADE_GROUPS.find(g => g.name === selectedDivision);
        if (group && !group.levels.includes(r.grade)) {
          return false;
        }
      }
      return true;
    });
  }, [results, assignedGrades, selectedSubject, selectedDivision]);

  // Group by grade and compute term averages
  const chartData = useMemo(() => {
    const gradesSet = new Set<GradeLevel>();
    if (assignedGrades && assignedGrades.length > 0) {
      assignedGrades.forEach(g => gradesSet.add(g));
    } else if (selectedDivision !== 'ALL') {
      const group = GRADE_GROUPS.find(g => g.name === selectedDivision);
      if (group) group.levels.forEach(g => gradesSet.add(g));
    } else {
      GRADE_GROUPS.flatMap(g => g.levels).forEach(g => gradesSet.add(g));
    }

    const data: Array<{
      grade: string;
      'First Term': number | null;
      'Second Term': number | null;
      'Third Term': number | null;
      overallAvg: number | null;
      studentCount: number;
    }> = [];

    gradesSet.forEach(grade => {
      const gradeResults = filteredResults.filter(r => r.grade === grade);

      const firstTermScores = gradeResults
        .filter(r => (r.term || '').toLowerCase().includes('first'))
        .map(r => r.score);
      const secondTermScores = gradeResults
        .filter(r => (r.term || '').toLowerCase().includes('second'))
        .map(r => r.score);
      const thirdTermScores = gradeResults
        .filter(r => (r.term || '').toLowerCase().includes('third'))
        .map(r => r.score);

      const avg = (arr: number[]) =>
        arr.length > 0 ? Math.round((arr.reduce((a, b) => a + b, 0) / arr.length) * 10) / 10 : null;

      const firstAvg = avg(firstTermScores);
      const secondAvg = avg(secondTermScores);
      const thirdAvg = avg(thirdTermScores);

      const allScores = [...firstTermScores, ...secondTermScores, ...thirdTermScores];
      const overall = avg(allScores);

      // Only include grades that either have results or if specific division is chosen
      if (allScores.length > 0 || selectedDivision !== 'ALL') {
        data.push({
          grade: grade.replace(' (Commerce and Arts)', ' C&A').replace(' (Commerce & Arts)', ' C&A').replace(' (Science)', ' Sci'),
          'First Term': firstAvg,
          'Second Term': secondAvg,
          'Third Term': thirdAvg,
          overallAvg: overall,
          studentCount: allScores.length
        });
      }
    });

    return data;
  }, [filteredResults, assignedGrades, selectedDivision]);

  // Overall Statistics Cards
  const stats = useMemo(() => {
    const allScores = filteredResults.map(r => r.score);
    const overallSchoolAvg = allScores.length > 0
      ? Math.round((allScores.reduce((a, b) => a + b, 0) / allScores.length) * 10) / 10
      : 0;

    let bestGrade = 'N/A';
    let highestAvg = -1;
    let lowestGrade = 'N/A';
    let lowestAvg = 101;

    chartData.forEach(d => {
      if (d.overallAvg !== null) {
        if (d.overallAvg > highestAvg) {
          highestAvg = d.overallAvg;
          bestGrade = d.grade;
        }
        if (d.overallAvg < lowestAvg) {
          lowestAvg = d.overallAvg;
          lowestGrade = d.grade;
        }
      }
    });

    return {
      overallSchoolAvg,
      bestGrade: highestAvg >= 0 ? `${bestGrade} (${highestAvg}%)` : 'No data',
      lowestGrade: lowestAvg <= 100 ? `${lowestGrade} (${lowestAvg}%)` : 'No data',
      totalAssessments: allScores.length
    };
  }, [filteredResults, chartData]);

  return (
    <div className={`bg-white rounded-[2.5rem] p-6 sm:p-8 border-2 border-slate-100 shadow-xl space-y-6 ${className}`}>
      {/* Top Header & Interactive Filters */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 pb-6 border-b border-slate-100">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-2xl bg-blue-900 text-yellow-400 flex items-center justify-center font-black text-xl shadow-md border-2 border-yellow-400 shrink-0">
            📊
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="font-serif font-black text-blue-950 text-xl sm:text-2xl">
                Academic Performance Trends by Grade
              </h3>
              <span className="px-2.5 py-0.5 rounded-full bg-blue-100 text-blue-900 text-[10px] font-black uppercase tracking-wider">
                Recharts Analytics
              </span>
            </div>
            <p className="text-xs text-slate-500 font-medium mt-0.5">
              Comparative average student scores across academic terms ({currentTerm} active)
            </p>
          </div>
        </div>

        {/* Filter Controls & Chart Type Toggle */}
        <div className="flex flex-wrap items-center gap-2.5">
          {/* Division Filter */}
          <select
            value={selectedDivision}
            onChange={e => setSelectedDivision(e.target.value)}
            className="px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-800 outline-none focus:ring-2 focus:ring-blue-900"
          >
            <option value="ALL">All School Divisions</option>
            {GRADE_GROUPS.map(g => (
              <option key={g.name} value={g.name}>{g.name}</option>
            ))}
          </select>

          {/* Subject Filter */}
          <select
            value={selectedSubject}
            onChange={e => setSelectedSubject(e.target.value)}
            className="px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-800 outline-none focus:ring-2 focus:ring-blue-900"
          >
            <option value="ALL">All Recorded Subjects</option>
            {availableSubjects.map(sub => (
              <option key={sub} value={sub}>{sub}</option>
            ))}
          </select>

          {/* Bar / Line Switcher */}
          <div className="flex items-center bg-slate-100 p-1 rounded-xl border border-slate-200">
            <button
              type="button"
              onClick={() => setChartType('bar')}
              className={`px-3 py-1.5 rounded-lg text-xs font-black uppercase tracking-wider transition-all ${
                chartType === 'bar' ? 'bg-blue-900 text-yellow-400 shadow-sm' : 'text-slate-600 hover:text-blue-900'
              }`}
            >
              Bar View
            </button>
            <button
              type="button"
              onClick={() => setChartType('line')}
              className={`px-3 py-1.5 rounded-lg text-xs font-black uppercase tracking-wider transition-all ${
                chartType === 'line' ? 'bg-blue-900 text-yellow-400 shadow-sm' : 'text-slate-600 hover:text-blue-900'
              }`}
            >
              Trend Line
            </button>
          </div>
        </div>
      </div>

      {/* KPI Stats Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="p-4 rounded-2xl bg-blue-50/60 border border-blue-100">
          <p className="text-[10px] font-black uppercase tracking-widest text-blue-900/70">
            Overall Academic Average
          </p>
          <div className="flex items-baseline gap-2 mt-1">
            <span className="font-serif font-black text-2xl text-blue-950">
              {stats.overallSchoolAvg}%
            </span>
            <span className={`text-[10px] font-black px-2 py-0.5 rounded-full ${
              stats.overallSchoolAvg >= 75 ? 'bg-emerald-100 text-emerald-800' :
              stats.overallSchoolAvg >= 50 ? 'bg-amber-100 text-amber-800' :
              'bg-red-100 text-red-800'
            }`}>
              {stats.overallSchoolAvg >= 75 ? 'Excellent (A)' : stats.overallSchoolAvg >= 60 ? 'Credit (B)' : 'Pass'}
            </span>
          </div>
        </div>

        <div className="p-4 rounded-2xl bg-emerald-50/60 border border-emerald-100">
          <p className="text-[10px] font-black uppercase tracking-widest text-emerald-900/70">
            Top Performing Class
          </p>
          <p className="font-serif font-black text-base sm:text-lg text-emerald-950 mt-1 truncate" title={stats.bestGrade}>
            🏆 {stats.bestGrade}
          </p>
        </div>

        <div className="p-4 rounded-2xl bg-amber-50/60 border border-amber-100">
          <p className="text-[10px] font-black uppercase tracking-widest text-amber-900/70">
            Needs Academic Support
          </p>
          <p className="font-serif font-black text-base sm:text-lg text-amber-950 mt-1 truncate" title={stats.lowestGrade}>
            🎯 {stats.lowestGrade}
          </p>
        </div>

        <div className="p-4 rounded-2xl bg-purple-50/60 border border-purple-100">
          <p className="text-[10px] font-black uppercase tracking-widest text-purple-900/70">
            Logged Assessments
          </p>
          <p className="font-serif font-black text-2xl text-purple-950 mt-1">
            {stats.totalAssessments} records
          </p>
        </div>
      </div>

      {/* Main Recharts Visualization Canvas */}
      <div className="w-full bg-slate-50/70 rounded-3xl p-4 sm:p-6 border border-slate-200">
        {chartData.length === 0 ? (
          <div className="py-20 text-center space-y-2">
            <span className="text-4xl">📈</span>
            <p className="font-serif font-black text-blue-950 text-base">
              No academic results recorded yet for this selection
            </p>
            <p className="text-xs text-slate-500 max-w-sm mx-auto">
              Once educators submit CA tests and terminal examination scores, dynamic score distribution charts will render here automatically.
            </p>
          </div>
        ) : (
          <div className="h-80 sm:h-96 w-full">
            <ResponsiveContainer width="100%" height="100%">
              {chartType === 'bar' ? (
                <BarChart data={chartData} margin={{ top: 20, right: 20, left: -10, bottom: 25 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                  <XAxis
                    dataKey="grade"
                    tick={{ fontSize: 11, fontWeight: 700, fill: '#1e293b' }}
                    interval={0}
                    angle={-25}
                    textAnchor="end"
                    height={50}
                  />
                  <YAxis
                    domain={[0, 100]}
                    tick={{ fontSize: 11, fontWeight: 700, fill: '#64748b' }}
                    unit="%"
                  />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: '#0f172a',
                      borderRadius: '1rem',
                      border: 'none',
                      color: '#fff',
                      fontSize: '12px',
                      fontWeight: 'bold',
                      boxShadow: '0 10px 25px -5px rgba(0, 0, 0, 0.3)'
                    }}
                    formatter={(value: any, name: any) => [`${value}%`, name]}
                  />
                  <Legend
                    verticalAlign="top"
                    align="right"
                    wrapperStyle={{ paddingBottom: '12px', fontSize: '11px', fontWeight: 'bold' }}
                  />
                  <Bar dataKey="First Term" fill="#1e3a8a" radius={[6, 6, 0, 0]} name="1st Term Avg" />
                  <Bar dataKey="Second Term" fill="#f59e0b" radius={[6, 6, 0, 0]} name="2nd Term Avg" />
                  <Bar dataKey="Third Term" fill="#10b981" radius={[6, 6, 0, 0]} name="3rd Term Avg" />
                </BarChart>
              ) : (
                <LineChart data={chartData} margin={{ top: 20, right: 20, left: -10, bottom: 25 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                  <XAxis
                    dataKey="grade"
                    tick={{ fontSize: 11, fontWeight: 700, fill: '#1e293b' }}
                    interval={0}
                    angle={-25}
                    textAnchor="end"
                    height={50}
                  />
                  <YAxis
                    domain={[0, 100]}
                    tick={{ fontSize: 11, fontWeight: 700, fill: '#64748b' }}
                    unit="%"
                  />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: '#0f172a',
                      borderRadius: '1rem',
                      border: 'none',
                      color: '#fff',
                      fontSize: '12px',
                      fontWeight: 'bold'
                    }}
                    formatter={(value: any, name: any) => [`${value}%`, name]}
                  />
                  <Legend
                    verticalAlign="top"
                    align="right"
                    wrapperStyle={{ paddingBottom: '12px', fontSize: '11px', fontWeight: 'bold' }}
                  />
                  <Line
                    type="monotone"
                    dataKey="First Term"
                    stroke="#1e3a8a"
                    strokeWidth={3}
                    dot={{ r: 4, strokeWidth: 2, fill: '#1e3a8a' }}
                    name="1st Term"
                  />
                  <Line
                    type="monotone"
                    dataKey="Second Term"
                    stroke="#f59e0b"
                    strokeWidth={3}
                    dot={{ r: 4, strokeWidth: 2, fill: '#f59e0b' }}
                    name="2nd Term"
                  />
                  <Line
                    type="monotone"
                    dataKey="Third Term"
                    stroke="#10b981"
                    strokeWidth={3}
                    dot={{ r: 4, strokeWidth: 2, fill: '#10b981' }}
                    name="3rd Term"
                  />
                </LineChart>
              )}
            </ResponsiveContainer>
          </div>
        )}
      </div>

      {/* Footer Educational Note */}
      <div className="flex flex-col sm:flex-row items-center justify-between text-xs text-slate-500 font-bold pt-2 border-t border-slate-100 gap-2">
        <span>💡 Continuous Assessment (CA 40%) + Terminal Exam (60%) = Total Score (100%)</span>
        <span className="text-blue-900 font-black">God's Hand International Model School Academic Analytics</span>
      </div>
    </div>
  );
};
