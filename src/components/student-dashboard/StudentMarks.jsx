import { useState, useMemo } from "react";
import {
  BookOpen, Award, TrendingUp, BarChart3, Check, AlertCircle,
  Search, Users, Sparkles, Filter, Star, ChevronDown, ChevronUp,
  CheckCircle2, GraduationCap, Trophy
} from "lucide-react";
import { useAuth } from "../../context/AuthContext";
import { useApp } from "../../context/AppContext";
import { filterValidExams } from "../../utils/marksUtils";
import LoadingScreen from "../ui/LoadingScreen";

function getGrade(pct) {
  if (pct >= 90) return { grade: "A+", color: "text-emerald-400", bg: "bg-emerald-500/15 border-emerald-500/30" };
  if (pct >= 80) return { grade: "A",  color: "text-blue-400",    bg: "bg-blue-500/15 border-blue-500/30" };
  if (pct >= 70) return { grade: "B+", color: "text-indigo-400",  bg: "bg-indigo-500/15 border-indigo-500/30" };
  if (pct >= 60) return { grade: "B",  color: "text-amber-400",   bg: "bg-amber-500/15 border-amber-500/30" };
  if (pct >= 50) return { grade: "C",  color: "text-orange-400",  bg: "bg-orange-500/15 border-orange-500/30" };
  if (pct >= 33) return { grade: "D",  color: "text-red-400",     bg: "bg-red-500/15 border-red-500/30" };
  return               { grade: "F",  color: "text-rose-500",     bg: "bg-rose-500/20 border-rose-500/40" };
}

function isSameStudent(studentA, studentB) {
  if (!studentA || !studentB) return false;
  const idA = studentA.id || studentA.entityId || studentA._docId;
  const idB = studentB.id || studentB.entityId || studentB._docId;
  if (idA && idB && String(idA).trim() === String(idB).trim()) return true;

  const rollA = studentA.rollNumber ? String(studentA.rollNumber).trim().toLowerCase() : "";
  const rollB = studentB.rollNumber ? String(studentB.rollNumber).trim().toLowerCase() : "";
  if (rollA && rollB && rollA === rollB) return true;

  const emailA = studentA.email ? String(studentA.email).trim().toLowerCase() : "";
  const emailB = studentB.email ? String(studentB.email).trim().toLowerCase() : "";
  if (emailA && emailB && emailA === emailB) return true;

  return false;
}

function getStudentMark(exam, student) {
  if (!exam?.marks || !student) return null;
  const keys = [
    student.id,
    student.entityId,
    student._docId,
    student.rollNumber,
    student.rollNumber ? String(student.rollNumber).trim() : null,
    student.rollNumber ? String(student.rollNumber).trim().replace(/^0+/, "") : null,
  ].filter(Boolean);

  for (const k of keys) {
    if (exam.marks[k] !== undefined && exam.marks[k] !== "" && !isNaN(exam.marks[k])) {
      return Number(exam.marks[k]);
    }
  }
  return null;
}

export default function StudentMarks() {
  const { currentStudent } = useAuth();
  const { exams: contextExams, students = [], firestoreReady } = useApp() || {};

  const [selectedExamId, setSelectedExamId] = useState("all");
  const [filterSubject, setFilterSubject] = useState("all");
  const [filterSection, setFilterSection] = useState("all");
  const [search, setSearch] = useState("");
  const [showPersonalBreakdown, setShowPersonalBreakdown] = useState(false);

  const cleanStudentClass = useMemo(() => {
    return String(currentStudent?.class || "").trim().replace(/^(class|cls)\.?\s*/i, "").replace(/(st|nd|rd|th)$/i, "");
  }, [currentStudent?.class]);

  const allExams = useMemo(() => {
    return filterValidExams(Array.isArray(contextExams) ? contextExams : []);
  }, [contextExams]);

  // Exams that apply to the current student's class
  const classExams = useMemo(() => {
    return allExams.filter(e => {
      if (e.classFilter === "all") return true;
      const eCls = String(e.classFilter || "").trim().replace(/^(class|cls)\.?\s*/i, "").replace(/(st|nd|rd|th)$/i, "");
      return !eCls || eCls === cleanStudentClass;
    }).sort((a, b) => new Date(b.date || b.createdAt || 0) - new Date(a.date || a.createdAt || 0));
  }, [allExams, cleanStudentClass]);

  const availableSubjects = useMemo(() => {
    const set = new Set(classExams.map(e => e.subject).filter(Boolean));
    return Array.from(set);
  }, [classExams]);

  const availableSections = useMemo(() => {
    const list = students.filter(s => {
      const sCls = String(s.class || "").trim().replace(/^(class|cls)\.?\s*/i, "").replace(/(st|nd|rd|th)$/i, "");
      return sCls === cleanStudentClass;
    });
    const set = new Set(list.map(s => String(s.section || "").trim().toUpperCase()).filter(Boolean));
    return Array.from(set).sort();
  }, [students, cleanStudentClass]);

  const activeExam = useMemo(() => {
    if (selectedExamId === "all") return null;
    return classExams.find(e => (e.id || e._docId) === selectedExamId) || null;
  }, [classExams, selectedExamId]);

  const relevantExams = useMemo(() => {
    return classExams.filter(e => {
      if (filterSubject !== "all" && String(e.subject || "").trim().toLowerCase() !== String(filterSubject).trim().toLowerCase()) {
        return false;
      }
      return true;
    });
  }, [classExams, filterSubject]);

  // Logged-in student's individual exams list
  const myIndividualExams = useMemo(() => {
    if (!currentStudent) return [];
    return classExams
      .map((exam) => {
        const markVal = getStudentMark(exam, currentStudent);
        if (markVal === null) return null;
        const max = exam.maxMarks || 100;
        const pct = Math.round((Number(markVal) / max) * 100);
        return {
          ...exam,
          myMark: Number(markVal),
          pct,
          gradeInfo: getGrade(pct),
          passed: pct >= 33,
        };
      })
      .filter(Boolean);
  }, [classExams, currentStudent]);

  // Logged-in student's personal overall stats
  const myStats = useMemo(() => {
    if (!myIndividualExams.length) return null;
    const pcts = myIndividualExams.map(e => e.pct);
    const avg = Math.round(pcts.reduce((a, b) => a + b, 0) / pcts.length);
    const highest = Math.max(...pcts);
    const lowest = Math.min(...pcts);
    const passed = myIndividualExams.filter(e => e.pct >= 33).length;
    return { avg, highest, lowest, passed, total: myIndividualExams.length };
  }, [myIndividualExams]);

  // All classmates belonging to current student's class
  const classmates = useMemo(() => {
    let list = (students || []).filter(s => {
      const sCls = String(s.class || "").trim().replace(/^(class|cls)\.?\s*/i, "").replace(/(st|nd|rd|th)$/i, "");
      return sCls === cleanStudentClass;
    });

    // Ensure currentStudent is in the list
    if (currentStudent && !list.some(s => isSameStudent(s, currentStudent))) {
      list = [currentStudent, ...list];
    }

    if (filterSection !== "all") {
      list = list.filter(s => String(s.section || "").trim().toUpperCase() === String(filterSection).trim().toUpperCase());
    }

    if (search.trim()) {
      const q = search.trim().toLowerCase();
      list = list.filter(s =>
        String(s.name || "").toLowerCase().includes(q) ||
        String(s.rollNumber || "").toLowerCase().includes(q)
      );
    }

    return list;
  }, [students, currentStudent, cleanStudentClass, filterSection, search]);

  // Calculate marks for all classmates
  const scoredClassmates = useMemo(() => {
    return classmates.map(student => {
      const isMe = isSameStudent(student, currentStudent);

      if (activeExam) {
        // Specific Exam Mode
        const mark = getStudentMark(activeExam, student);
        const max = activeExam.maxMarks || 100;
        const pct = mark !== null ? Math.round((mark / max) * 100) : null;
        const gradeInfo = pct !== null ? getGrade(pct) : null;
        const passed = pct !== null ? pct >= 33 : null;

        return {
          student,
          isMe,
          score: mark,
          maxMarks: max,
          pct,
          gradeInfo,
          passed,
          examName: activeExam.name,
          subject: activeExam.subject,
        };
      } else {
        // Cumulative All Exams Mode
        let totalObtained = 0;
        let totalMax = 0;
        let appearedCount = 0;

        relevantExams.forEach(e => {
          const m = getStudentMark(e, student);
          if (m !== null) {
            totalObtained += m;
            totalMax += (e.maxMarks || 100);
            appearedCount++;
          }
        });

        const pct = totalMax > 0 ? Math.round((totalObtained / totalMax) * 100) : null;
        const gradeInfo = pct !== null ? getGrade(pct) : null;
        const passed = pct !== null ? pct >= 33 : null;

        return {
          student,
          isMe,
          score: appearedCount > 0 ? totalObtained : null,
          maxMarks: totalMax,
          pct,
          gradeInfo,
          passed,
          appearedCount,
          totalExams: relevantExams.length,
        };
      }
    });
  }, [classmates, currentStudent, activeExam, relevantExams]);

  // Rank and place logged-in student AT THE VERY TOP
  const rankedStudents = useMemo(() => {
    // 1. Sort by percentage descending to determine genuine class rank
    const sorted = [...scoredClassmates].sort((a, b) => {
      const scoreA = a.pct !== null ? a.pct : -1;
      const scoreB = b.pct !== null ? b.pct : -1;
      if (scoreB !== scoreA) return scoreB - scoreA;
      return String(a.student.name || "").localeCompare(String(b.student.name || ""));
    });

    // 2. Assign ranks
    const withRank = sorted.map((item, idx) => ({
      ...item,
      rank: item.pct !== null ? idx + 1 : null,
    }));

    // 3. Find logged-in student
    const meItem = withRank.find(item => item.isMe);
    const otherItems = withRank.filter(item => !item.isMe);

    // 4. CRITICAL REQUIREMENT:
    // Logged-in student's scorecard is ALWAYS placed at the top (index 0), followed by other students
    const finalList = meItem ? [meItem, ...otherItems] : withRank;

    const pcts = withRank.map(s => s.pct).filter(p => p !== null);
    const avgPct = pcts.length > 0 ? Math.round(pcts.reduce((a, b) => a + b, 0) / pcts.length) : 0;
    const highestPct = pcts.length > 0 ? Math.max(...pcts) : 0;

    return {
      finalList,
      myRecord: meItem,
      totalStudents: withRank.length,
      averagePct: avgPct,
      highestPct: highestPct,
    };
  }, [scoredClassmates]);

  if (!currentStudent || (!firestoreReady && students.length === 0)) {
    return <LoadingScreen message="Loading scorecard..." fullScreen={false} />;
  }

  return (
    <div className="w-full space-y-5 animate-fade-in pb-12">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <div className="flex items-center gap-2.5 flex-wrap">
            <h1 className="text-xl sm:text-2xl font-extrabold text-slate-900 dark:text-white tracking-tight flex items-center gap-2">
              <BookOpen size={24} className="text-blue-500" /> Academic Marks & Performance
            </h1>
            <span className="inline-flex items-center gap-1 text-[11px] text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 px-2.5 py-0.5 rounded-full border border-emerald-500/20 font-semibold">
              <Award size={12} /> Official Student Records
            </span>
          </div>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
            Class {currentStudent.class}-{currentStudent.section} &bull; {currentStudent.name} (Roll #{currentStudent.rollNumber})
          </p>
        </div>

        <div className="flex items-center gap-2 text-xs text-slate-500 dark:text-slate-400">
          <Users size={14} className="text-blue-400" />
          <span>{rankedStudents.totalStudents} Classmates Listed</span>
        </div>
      </div>

      {/* ── 1. LOGGED-IN STUDENT'S PERSONAL SCORECARD (ALWAYS AT THE TOP) ── */}
      <div className="rounded-2xl bg-gradient-to-br from-blue-900/30 via-slate-900/80 to-[#0B0F19] border-2 border-blue-500/40 p-4 sm:p-5 shadow-[0_8px_30px_rgba(37,99,235,0.18)] relative overflow-hidden backdrop-blur-xl">
        <div className="absolute top-0 right-0 w-64 h-64 bg-blue-500/10 rounded-full blur-3xl pointer-events-none" />

        {/* Top Header of Scorecard */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-white/10 relative z-10">
          <div className="flex items-center gap-3">
            <div
              className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-blue-600 to-indigo-600 flex items-center justify-center text-white font-extrabold text-base shadow-md flex-shrink-0"
              style={{ background: `hsl(${(String(currentStudent.rollNumber || currentStudent.name).charCodeAt(0) * 47) % 360}, 65%, 50%)` }}
            >
              {String(currentStudent.name || "S").split(" ").map(n => n[0]).join("").slice(0, 2)}
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h2 className="text-lg font-bold text-white leading-tight">{currentStudent.name}</h2>
                <span className="inline-flex items-center gap-1 text-[10px] font-extrabold uppercase px-2 py-0.5 rounded-full bg-blue-500 text-white shadow-xs">
                  <Star size={10} fill="currentColor" /> Your Scorecard
                </span>
              </div>
              <p className="text-xs text-blue-200/80 mt-0.5">
                Roll #{currentStudent.rollNumber} &bull; Class {currentStudent.class}-{currentStudent.section}
              </p>
            </div>
          </div>

          {/* Rank Badge */}
          <div className="flex items-center gap-2 self-start sm:self-auto">
            {rankedStudents.myRecord?.rank ? (
              <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-amber-500/20 text-amber-300 border border-amber-500/30 text-xs font-bold shadow-xs">
                <Trophy size={14} className="text-amber-400" />
                Class Rank #{rankedStudents.myRecord.rank}
              </span>
            ) : (
              <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-xl bg-white/[0.06] text-slate-400 border border-white/10 text-xs font-medium">
                Rank: Pending
              </span>
            )}
            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-xl bg-blue-500/20 text-blue-300 border border-blue-500/30 text-xs font-semibold">
              Class {currentStudent.class}
            </span>
          </div>
        </div>

        {/* Personal Scorecard Metrics */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-4 relative z-10">
          <div className="rounded-xl bg-white/[0.04] border border-white/[0.08] p-3">
            <div className="flex items-center gap-1.5 text-slate-400 text-[11px] mb-1">
              <TrendingUp size={13} className="text-blue-400" />
              <span>Overall Average</span>
            </div>
            <p className="text-xl font-bold text-white">
              {myStats ? `${myStats.avg}%` : "-"}
            </p>
            <p className="text-[10px] text-slate-500 mt-0.5">Across all exams</p>
          </div>

          <div className="rounded-xl bg-white/[0.04] border border-white/[0.08] p-3">
            <div className="flex items-center gap-1.5 text-slate-400 text-[11px] mb-1">
              <Award size={13} className="text-emerald-400" />
              <span>Highest Score</span>
            </div>
            <p className="text-xl font-bold text-emerald-400">
              {myStats ? `${myStats.highest}%` : "-"}
            </p>
            <p className="text-[10px] text-slate-500 mt-0.5">Best performance</p>
          </div>

          <div className="rounded-xl bg-white/[0.04] border border-white/[0.08] p-3">
            <div className="flex items-center gap-1.5 text-slate-400 text-[11px] mb-1">
              <Check size={13} className="text-amber-400" />
              <span>Exams Passed</span>
            </div>
            <p className="text-xl font-bold text-amber-400">
              {myStats ? `${myStats.passed}/${myStats.total}` : "0"}
            </p>
            <p className="text-[10px] text-slate-500 mt-0.5">&ge; 33% to pass</p>
          </div>

          <div className="rounded-xl bg-white/[0.04] border border-white/[0.08] p-3">
            <div className="flex items-center gap-1.5 text-slate-400 text-[11px] mb-1">
              <BarChart3 size={13} className="text-violet-400" />
              <span>Current Assessment</span>
            </div>
            <p className="text-xl font-bold text-violet-400">
              {rankedStudents.myRecord?.pct !== null && rankedStudents.myRecord?.pct !== undefined
                ? `${rankedStudents.myRecord.pct}%`
                : "-"}
            </p>
            <p className="text-[10px] text-slate-500 mt-0.5 truncate">
              {activeExam ? activeExam.name : "Cumulative"}
            </p>
          </div>
        </div>

        {/* Selected Assessment Spotlight for Current Student */}
        {activeExam && (
          <div className="mt-3.5 p-3 rounded-xl bg-blue-500/10 border border-blue-500/20 flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs relative z-10">
            <div>
              <p className="font-semibold text-white">
                Your Score in <span className="text-blue-300 font-bold">{activeExam.name}</span> ({activeExam.subject})
              </p>
              <p className="text-[11px] text-slate-400 mt-0.5">
                Exam Type: {activeExam.examType} &bull; Max Marks: {activeExam.maxMarks}
              </p>
            </div>
            <div className="flex items-center gap-2 self-start sm:self-auto">
              <span className="text-sm font-extrabold text-white">
                {rankedStudents.myRecord?.score !== null && rankedStudents.myRecord?.score !== undefined
                  ? `${rankedStudents.myRecord.score} / ${activeExam.maxMarks}`
                  : "Not Entered"}
              </span>
              {rankedStudents.myRecord?.pct !== null && rankedStudents.myRecord?.pct !== undefined && (
                <>
                  <span className="text-xs font-bold text-blue-300">({rankedStudents.myRecord.pct}%)</span>
                  {rankedStudents.myRecord.gradeInfo && (
                    <span className={`text-xs font-bold px-2 py-0.5 rounded border ${rankedStudents.myRecord.gradeInfo.bg} ${rankedStudents.myRecord.gradeInfo.color}`}>
                      {rankedStudents.myRecord.gradeInfo.grade}
                    </span>
                  )}
                </>
              )}
            </div>
          </div>
        )}

        {/* Toggle to view individual exam scores list */}
        {myIndividualExams.length > 0 && (
          <div className="mt-3 pt-3 border-t border-white/[0.08] relative z-10">
            <button
              type="button"
              onClick={() => setShowPersonalBreakdown(!showPersonalBreakdown)}
              className="flex items-center gap-1.5 text-xs font-semibold text-blue-400 hover:text-blue-300 cursor-pointer transition-colors"
            >
              {showPersonalBreakdown ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
              <span>{showPersonalBreakdown ? "Hide My Individual Exam Breakdown" : "View My Individual Exam Breakdown"}</span>
              <span className="text-[11px] text-slate-400 font-normal">({myIndividualExams.length} exams recorded)</span>
            </button>

            {showPersonalBreakdown && (
              <div className="mt-2.5 space-y-2 animate-fade-in">
                <div className="overflow-x-auto">
                  <table className="w-full text-xs">
                    <thead>
                      <tr className="border-b border-white/10 text-slate-400 text-left">
                        <th className="py-2 px-3">Exam Name</th>
                        <th className="py-2 px-3 text-center">Subject</th>
                        <th className="py-2 px-3 text-center">Marks</th>
                        <th className="py-2 px-3 text-center">%</th>
                        <th className="py-2 px-3 text-center">Grade</th>
                        <th className="py-2 px-3 text-center">Status</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-white/[0.05]">
                      {myIndividualExams.map((exam) => (
                        <tr key={exam.id} className="hover:bg-white/[0.02]">
                          <td className="py-2 px-3 font-semibold text-white">{exam.name}</td>
                          <td className="py-2 px-3 text-center text-slate-300">{exam.subject}</td>
                          <td className="py-2 px-3 text-center font-bold text-white">{exam.myMark} / {exam.maxMarks}</td>
                          <td className="py-2 px-3 text-center font-semibold text-blue-300">{exam.pct}%</td>
                          <td className="py-2 px-3 text-center">
                            <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded border ${exam.gradeInfo.bg} ${exam.gradeInfo.color}`}>
                              {exam.gradeInfo.grade}
                            </span>
                          </td>
                          <td className="py-2 px-3 text-center">
                            {exam.passed ? (
                              <span className="text-[10px] text-emerald-400 font-semibold">Pass</span>
                            ) : (
                              <span className="text-[10px] text-rose-400 font-semibold">Fail</span>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* ── 2. FILTER & SELECTION CONTROLS ── */}
      <div className="rounded-2xl bg-white dark:bg-[#0B0F19]/80 border border-slate-200 dark:border-white/10 p-3.5 backdrop-blur-xl shadow-[0_4px_25px_rgba(0,0,0,0.3)] space-y-3">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2.5 items-center">
          {/* Assessment Selector */}
          <div>
            <label className="block text-[11px] font-semibold text-slate-500 dark:text-slate-400 mb-1">
              Assessment / Exam
            </label>
            <select
              value={selectedExamId}
              onChange={e => setSelectedExamId(e.target.value)}
              className="input-field w-full text-xs font-medium"
            >
              <option value="all">Overall Performance (All Exams)</option>
              {classExams.map(e => (
                <option key={e.id || e._docId} value={e.id || e._docId}>
                  {e.name} ({e.subject} &bull; Max {e.maxMarks})
                </option>
              ))}
            </select>
          </div>

          {/* Subject Filter */}
          <div>
            <label className="block text-[11px] font-semibold text-slate-500 dark:text-slate-400 mb-1">
              Subject Filter
            </label>
            <select
              value={filterSubject}
              onChange={e => setFilterSubject(e.target.value)}
              className="input-field w-full text-xs font-medium"
            >
              <option value="all">All Subjects</option>
              {availableSubjects.map(s => (
                <option key={s} value={s}>{s}</option>
              ))}
            </select>
          </div>

          {/* Section Filter */}
          <div>
            <label className="block text-[11px] font-semibold text-slate-500 dark:text-slate-400 mb-1">
              Section
            </label>
            <select
              value={filterSection}
              onChange={e => setFilterSection(e.target.value)}
              className="input-field w-full text-xs font-medium"
            >
              <option value="all">All Sections (Class {currentStudent.class})</option>
              {availableSections.map(sec => (
                <option key={sec} value={sec}>
                  Section {sec} {sec === currentStudent.section ? "(My Section)" : ""}
                </option>
              ))}
            </select>
          </div>

          {/* Search classmate */}
          <div>
            <label className="block text-[11px] font-semibold text-slate-500 dark:text-slate-400 mb-1">
              Search Classmate
            </label>
            <div className="relative">
              <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500 pointer-events-none" />
              <input
                type="text"
                value={search}
                onChange={e => setSearch(e.target.value)}
                placeholder="Name or roll number..."
                className="input-field pl-9 w-full text-xs"
              />
            </div>
          </div>
        </div>
      </div>

      {/* ── 3. CLASS-WIDE STUDENT MARKS ROSTER (EVERY STUDENT SEES ALL STUDENTS) ── */}
      <div className="rounded-2xl bg-white dark:bg-[#0B0F19]/80 border border-slate-200 dark:border-white/10 shadow-[0_4px_25px_rgba(0,0,0,0.3)] backdrop-blur-xl overflow-hidden">
        {/* Table Header / Title */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 px-4 py-3 border-b border-slate-100 dark:border-white/10 bg-slate-50/50 dark:bg-[#111726]/60">
          <div className="flex items-center gap-2">
            <Users size={16} className="text-blue-500" />
            <h3 className="text-sm font-bold text-slate-900 dark:text-white">
              Class {currentStudent.class} Student Marks & Standings
            </h3>
          </div>
          <span className="text-xs text-slate-500 dark:text-slate-400">
            {activeExam ? `${activeExam.name} • Max ${activeExam.maxMarks} marks` : "Overall Performance"} &bull; {rankedStudents.totalStudents} students
          </span>
        </div>

        {rankedStudents.finalList.length === 0 ? (
          <div className="py-16 text-center text-slate-500 text-sm px-4">
            No students found matching your filters.
          </div>
        ) : (
          <>
            {/* Desktop Table View */}
            <div className="hidden sm:block overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="bg-slate-50 dark:bg-[#111726]/80 border-b border-slate-100 dark:border-white/10 text-xs">
                    <th className="text-left font-semibold text-slate-500 dark:text-slate-400 px-4 py-3 w-16">Rank</th>
                    <th className="text-left font-semibold text-slate-500 dark:text-slate-400 px-4 py-3">Student</th>
                    <th className="text-center font-semibold text-slate-500 dark:text-slate-400 px-4 py-3">Class</th>
                    <th className="text-center font-semibold text-slate-500 dark:text-slate-400 px-4 py-3">Marks</th>
                    <th className="text-center font-semibold text-slate-500 dark:text-slate-400 px-4 py-3">%</th>
                    <th className="text-center font-semibold text-slate-500 dark:text-slate-400 px-4 py-3">Status</th>
                    <th className="text-center font-semibold text-slate-500 dark:text-slate-400 px-4 py-3">Grade</th>
                  </tr>
                </thead>
                <tbody>
                  {rankedStudents.finalList.map(({ student, isMe, score, maxMarks, pct, gradeInfo, passed, rank }) => {
                    return (
                      <tr
                        key={student.id || student._docId || student.rollNumber}
                        className={`border-b border-slate-100 dark:border-white/[0.06] last:border-0 transition-colors ${
                          isMe
                            ? "bg-blue-500/10 dark:bg-blue-900/25 border-l-4 border-l-blue-500"
                            : "hover:bg-slate-50 dark:hover:bg-white/[0.03]"
                        }`}
                      >
                        <td className="px-4 py-3">
                          {rank ? (
                            <span
                              className={`text-xs font-bold w-7 h-7 rounded-full flex items-center justify-center ${
                                rank === 1
                                  ? "bg-amber-500/20 text-amber-300 border border-amber-500/30 font-extrabold"
                                  : rank === 2
                                  ? "bg-slate-400/20 text-slate-300 border border-slate-400/30 font-bold"
                                  : rank === 3
                                  ? "bg-orange-500/20 text-orange-300 border border-orange-500/30 font-bold"
                                  : "bg-white/[0.04] text-slate-400 border border-white/[0.06]"
                              }`}
                            >
                              {rank}
                            </span>
                          ) : (
                            <span className="text-xs text-slate-500">-</span>
                          )}
                        </td>

                        <td className="px-4 py-3">
                          <div className="flex items-center gap-2.5">
                            <div
                              className="w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 text-[10px] font-bold text-white shadow-xs"
                              style={{ background: `hsl(${(String(student.rollNumber || student.name).charCodeAt(0) * 47) % 360}, 60%, 55%)` }}
                            >
                              {String(student.name || "S").split(" ").map(n => n[0]).join("").slice(0, 2)}
                            </div>
                            <div className="min-w-0">
                              <div className="flex items-center gap-1.5 flex-wrap">
                                <p className={`text-sm font-semibold ${isMe ? "text-blue-400 font-bold" : "text-slate-900 dark:text-white"}`}>
                                  {student.name}
                                </p>
                                {isMe && (
                                  <span className="inline-flex items-center gap-0.5 text-[9px] font-extrabold px-1.5 py-0.5 rounded-full bg-blue-500 text-white">
                                    <Star size={9} fill="currentColor" /> YOU
                                  </span>
                                )}
                              </div>
                              <p className="text-[10px] text-slate-400">Roll #{student.rollNumber}</p>
                            </div>
                          </div>
                        </td>

                        <td className="px-4 py-3 text-center">
                          <span className="text-[10px] font-semibold text-blue-400 bg-blue-500/10 border border-blue-500/20 px-2 py-0.5 rounded">
                            {student.class}-{student.section}
                          </span>
                        </td>

                        <td className="px-4 py-3 text-center">
                          {score !== null ? (
                            <div>
                              <span className="text-sm font-bold text-slate-900 dark:text-white">{score}</span>
                              <span className="text-xs text-slate-500">/{maxMarks}</span>
                            </div>
                          ) : (
                            <span className="text-xs text-slate-400">-</span>
                          )}
                        </td>

                        <td className="px-4 py-3 text-center">
                          {pct !== null ? (
                            <div className="flex flex-col items-center gap-1">
                              <span className="text-xs font-semibold text-slate-900 dark:text-white">{pct}%</span>
                              <div className="w-16 h-1.5 bg-slate-100 dark:bg-white/10 rounded-full overflow-hidden">
                                <div
                                  className="h-full rounded-full transition-all"
                                  style={{
                                    width: `${pct}%`,
                                    background: pct >= 75 ? "#10B981" : pct >= 50 ? "#F59E0B" : "#EF4444"
                                  }}
                                />
                              </div>
                            </div>
                          ) : (
                            <span className="text-xs text-slate-400">-</span>
                          )}
                        </td>

                        <td className="px-4 py-3 text-center">
                          {passed === null ? (
                            <span className="text-xs text-slate-400">-</span>
                          ) : passed ? (
                            <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 px-2 py-0.5 rounded-full">
                              <Check size={10} /> Pass
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-rose-400 bg-rose-500/10 border border-rose-500/20 px-2 py-0.5 rounded-full">
                              <AlertCircle size={10} /> Fail
                            </span>
                          )}
                        </td>

                        <td className="px-4 py-3 text-center">
                          {gradeInfo ? (
                            <span className={`text-xs font-bold px-2 py-0.5 rounded border ${gradeInfo.bg} ${gradeInfo.color}`}>
                              {gradeInfo.grade}
                            </span>
                          ) : (
                            <span className="text-xs text-slate-400">-</span>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* Mobile Cards View */}
            <div className="sm:hidden divide-y divide-slate-100 dark:divide-white/[0.06]">
              {rankedStudents.finalList.map(({ student, isMe, score, maxMarks, pct, gradeInfo, passed, rank }) => {
                return (
                  <div
                    key={student.id || student._docId || student.rollNumber}
                    className={`p-3.5 space-y-2.5 transition-colors ${
                      isMe
                        ? "bg-blue-500/10 dark:bg-blue-900/25 border-l-4 border-l-blue-500"
                        : "hover:bg-slate-50 dark:hover:bg-white/[0.02]"
                    }`}
                  >
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex items-center gap-2.5 min-w-0">
                        {rank ? (
                          <span
                            className={`text-xs font-bold w-6 h-6 rounded-full flex items-center justify-center flex-shrink-0 ${
                              rank === 1
                                ? "bg-amber-500/20 text-amber-300 border border-amber-500/30"
                                : rank === 2
                                ? "bg-slate-400/20 text-slate-300 border border-slate-400/30"
                                : rank === 3
                                ? "bg-orange-500/20 text-orange-300 border border-orange-500/30"
                                : "bg-white/[0.06] text-slate-400 border border-white/[0.08]"
                            }`}
                          >
                            {rank}
                          </span>
                        ) : (
                          <span className="text-xs text-slate-500 w-6 text-center">-</span>
                        )}

                        <div
                          className="w-7 h-7 rounded-full flex items-center justify-center flex-shrink-0 text-[10px] font-bold text-white"
                          style={{ background: `hsl(${(String(student.rollNumber || student.name).charCodeAt(0) * 47) % 360}, 60%, 55%)` }}
                        >
                          {String(student.name || "S").split(" ").map(n => n[0]).join("").slice(0, 2)}
                        </div>

                        <div className="min-w-0">
                          <div className="flex items-center gap-1.5 flex-wrap">
                            <p className={`text-sm font-semibold truncate ${isMe ? "text-blue-400 font-bold" : "text-slate-900 dark:text-white"}`}>
                              {student.name}
                            </p>
                            {isMe && (
                              <span className="inline-flex items-center gap-0.5 text-[9px] font-extrabold px-1.5 py-0.5 rounded-full bg-blue-500 text-white">
                                <Star size={9} fill="currentColor" /> YOU
                              </span>
                            )}
                          </div>
                          <p className="text-[10px] text-slate-400">Roll #{student.rollNumber}</p>
                        </div>
                      </div>

                      <div className="flex items-center gap-1.5 flex-shrink-0">
                        <span className="text-[10px] font-semibold text-blue-400 bg-blue-500/10 border border-blue-500/20 px-2 py-0.5 rounded">
                          {student.class}-{student.section}
                        </span>
                        {gradeInfo && (
                          <span className={`text-xs font-bold px-2 py-0.5 rounded border ${gradeInfo.bg} ${gradeInfo.color}`}>
                            {gradeInfo.grade}
                          </span>
                        )}
                      </div>
                    </div>

                    <div className="flex items-center justify-between text-xs pt-1.5 border-t border-slate-100 dark:border-white/[0.04]">
                      <div>
                        {score !== null ? (
                          <span className="text-slate-400">
                            Score: <strong className="text-slate-900 dark:text-white">{score}</strong>/{maxMarks}
                            <span className="ml-1 text-slate-400">({pct}%)</span>
                          </span>
                        ) : (
                          <span className="text-slate-500">Not recorded</span>
                        )}
                      </div>

                      <div>
                        {passed === null ? (
                          <span className="text-slate-500">-</span>
                        ) : passed ? (
                          <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 px-2 py-0.5 rounded-full">
                            <Check size={9} /> Pass
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-rose-400 bg-rose-500/10 border border-rose-500/20 px-2 py-0.5 rounded-full">
                            <AlertCircle size={9} /> Fail
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>

            <div className="px-4 py-3 border-t border-slate-100 dark:border-white/10 bg-slate-50/50 dark:bg-[#111726]/80 text-xs text-slate-500 dark:text-slate-400">
              Showing {rankedStudents.finalList.length} students &bull; Logged-in student's scorecard is displayed at the top
            </div>
          </>
        )}
      </div>
    </div>
  );
}
