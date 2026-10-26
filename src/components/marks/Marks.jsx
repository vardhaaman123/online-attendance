import { useState, useMemo, useEffect } from "react";
import {
  BookOpen, Plus, Edit2, Trash2, Save,
  Search, Users, GraduationCap, Award, TrendingUp,
  BarChart3, Check, AlertCircle, Lock, Eye, Filter,
  CheckCircle2, ChevronRight, Sparkles, RefreshCw
} from "lucide-react";
import { useApp } from "../../context/AppContext";
import { useAuth } from "../../context/AuthContext";
import { getTeacherScope } from "../../utils/teacherScope";
import Modal from "../ui/Modal";
import LoadingScreen from "../ui/LoadingScreen";

const SUBJECTS = ["Mathematics","Science","English","Hindi","Social Studies","Computer Science","Sanskrit","Physical Education"];
const EXAM_TYPES = ["Unit Test 1","Unit Test 2","Mid-term","Final Exam","Class Test","Assignment"];

function getGrade(pct) {
  if (pct >= 90) return { grade: "A+", color: "text-emerald-400", bg: "bg-emerald-500/15 border-emerald-500/30" };
  if (pct >= 80) return { grade: "A",  color: "text-blue-400",    bg: "bg-blue-500/15 border-blue-500/30" };
  if (pct >= 70) return { grade: "B+", color: "text-indigo-400",  bg: "bg-indigo-500/15 border-indigo-500/30" };
  if (pct >= 60) return { grade: "B",  color: "text-amber-400",   bg: "bg-amber-500/15 border-amber-500/30" };
  if (pct >= 50) return { grade: "C",  color: "text-orange-400",  bg: "bg-orange-500/15 border-orange-500/30" };
  if (pct >= 33) return { grade: "D",  color: "text-red-400",     bg: "bg-red-500/15 border-red-500/30" };
  return               { grade: "F",  color: "text-rose-500",     bg: "bg-rose-500/20 border-rose-500/40" };
}

function ExamModal({ open, exam, students, teacherScope, onSave, onClose }) {
  const [form, setForm] = useState({ name: "", subject: SUBJECTS[0], examType: EXAM_TYPES[0], maxMarks: 100, classFilter: "all", sectionFilter: "all", date: new Date().toISOString().split("T")[0], marks: {} });
  const [studentSearch, setStudentSearch] = useState("");
  const [nameError, setNameError] = useState("");
  const availableClasses = useMemo(() => {
    if (teacherScope?.allowedClasses?.length > 0) return teacherScope.allowedClasses;
    return Array.from(new Set(students.map(s => String(s.class || '').trim()))).filter(Boolean).sort((a, b) => a.localeCompare(b, undefined, { numeric: true }));
  }, [students, teacherScope]);
  const availableSections = useMemo(() => {
    if (teacherScope?.allowedSections?.length > 0) return teacherScope.allowedSections;
    return Array.from(new Set(students.filter(s => form.classFilter === "all" || String(s.class || '').trim() === String(form.classFilter || '').trim()).map(s => String(s.section || '').trim().toUpperCase()))).filter(Boolean).sort();
  }, [students, form.classFilter, teacherScope]);
  const availableSubjects = useMemo(() => {
    if (teacherScope?.teacherSubject) {
      const set = new Set([teacherScope.teacherSubject, ...SUBJECTS]);
      return Array.from(set);
    }
    return SUBJECTS;
  }, [teacherScope]);
  const filteredStudents = useMemo(() => {
    const base = teacherScope?.isRestricted ? teacherScope.filterStudents(students) : students;
    return base.filter(s =>
      (form.classFilter === "all" || String(s.class || '').trim().replace(/^(class|cls)\.?\s*/i, '').replace(/(st|nd|rd|th)$/i, '') === String(form.classFilter || '').trim().replace(/^(class|cls)\.?\s*/i, '').replace(/(st|nd|rd|th)$/i, '')) &&
      (form.sectionFilter === "all" || String(s.section || '').trim().toUpperCase() === String(form.sectionFilter || '').trim().toUpperCase())
    ).sort((a, b) => {
      const rA = parseInt(a.rollNumber, 10);
      const rB = parseInt(b.rollNumber, 10);
      if (!isNaN(rA) && !isNaN(rB)) return rA - rB;
      return String(a.name || '').localeCompare(String(b.name || ''));
    });
  }, [students, form.classFilter, form.sectionFilter, teacherScope]);
  const displayedStudents = useMemo(() => {
    if (!studentSearch.trim()) return filteredStudents;
    const q = studentSearch.trim().toLowerCase();
    return filteredStudents.filter(s => String(s.name || '').toLowerCase().includes(q) || String(s.rollNumber || '').includes(q));
  }, [filteredStudents, studentSearch]);

  useEffect(() => {
    if (!open) return;
    setStudentSearch("");
    setNameError("");
    if (exam) { setForm({ ...exam }); }
    else {
      const fc = teacherScope?.defaultClass || availableClasses[0] || "all";
      const fs = teacherScope?.teacherSubject || availableSubjects[0] || SUBJECTS[0];
      const fsec = teacherScope?.defaultSection || "all";
      setForm({ name: "", subject: fs, examType: EXAM_TYPES[0], maxMarks: 100, classFilter: fc, sectionFilter: fsec, date: new Date().toISOString().split("T")[0], marks: {} });
    }
  }, [open, exam, teacherScope, availableClasses, availableSubjects]);

  const setMark = (id, val) => { const num = val === "" ? "" : Math.min(Number(val), form.maxMarks); setForm(f => ({ ...f, marks: { ...f.marks, [id]: num } })); };
  const fillAll = (val) => { const m = {}; filteredStudents.forEach(s => { m[s.id] = val === "" ? "" : Math.min(Number(val), form.maxMarks); }); setForm(f => ({ ...f, marks: { ...f.marks, ...m } })); };
  const enteredCount = filteredStudents.filter(s => form.marks[s.id] !== "" && form.marks[s.id] !== undefined).length;

  return (
    <Modal open={open} onClose={onClose} title={exam ? "Edit Exam Marks" : "Add New Exam"} maxWidth="max-w-xl">
      <div className="space-y-4 p-1">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">Exam Name *</label>
            <input
              type="text"
              value={form.name}
              onChange={e => { setForm(f => ({ ...f, name: e.target.value })); if (nameError) setNameError(""); }}
              placeholder="e.g. Mid-term Mathematics"
              className={`input-field ${nameError ? "border-red-400" : ""}`}
            />
            {nameError && <p className="text-[11px] text-red-500 mt-1">{nameError}</p>}
          </div>
          <div><label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">Exam Type</label><select value={form.examType} onChange={e => setForm(f => ({ ...f, examType: e.target.value }))} className="input-field">{EXAM_TYPES.map(t => <option key={t} value={t}>{t}</option>)}</select></div>
          <div><label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">Subject</label><select value={form.subject} onChange={e => setForm(f => ({ ...f, subject: e.target.value }))} className="input-field">{availableSubjects.map(s => <option key={s} value={s}>{s}</option>)}</select></div>
          <div><label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">Max Marks</label><input type="number" min={1} max={500} value={form.maxMarks} onChange={e => setForm(f => ({ ...f, maxMarks: Number(e.target.value) || 100 }))} className="input-field" /></div>
          <div><label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">Date</label><input type="date" value={form.date} onChange={e => setForm(f => ({ ...f, date: e.target.value }))} className="input-field" /></div>
          <div className="grid grid-cols-2 gap-2">
            <div><label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">Class</label><select value={form.classFilter} onChange={e => setForm(f => ({ ...f, classFilter: e.target.value, sectionFilter: "all" }))} className="input-field"><option value="all">All Classes</option>{availableClasses.map(c => <option key={c} value={c}>Class {c}</option>)}</select></div>
            <div><label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">Section</label><select value={form.sectionFilter} onChange={e => setForm(f => ({ ...f, sectionFilter: e.target.value }))} className="input-field"><option value="all">All Sections</option>{availableSections.map(s => <option key={s} value={s}>Section {s}</option>)}</select></div>
          </div>
        </div>
        <div className="border border-white/10 rounded-xl overflow-hidden">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 px-3 py-2 bg-[#111726]/80 border-b border-white/10">
            <div className="flex items-center justify-between gap-2">
              <span className="text-xs font-semibold text-slate-300">Enter Marks ({enteredCount}/{filteredStudents.length} entered)</span>
              <div className="flex items-center gap-1.5"><span className="text-[11px] text-slate-400">Fill:</span><button type="button" onClick={() => fillAll(form.maxMarks)} className="text-[11px] px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-400 border border-emerald-500/20 hover:bg-emerald-500/30 cursor-pointer transition-colors">Max</button><button type="button" onClick={() => fillAll("")} className="text-[11px] px-2 py-0.5 rounded bg-white/[0.06] text-slate-400 border border-white/10 hover:bg-white/[0.12] cursor-pointer transition-colors">Clear</button></div>
            </div>
            <div className="relative">
              <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500 pointer-events-none" />
              <input
                type="text"
                value={studentSearch}
                onChange={e => setStudentSearch(e.target.value)}
                placeholder="Search student by name or roll number..."
                className="w-full bg-[#0B0F19] border border-white/[0.08] text-xs text-white placeholder-slate-500 rounded-lg pl-8 pr-3 py-1.5 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500/20"
              />
            </div>
          </div>
          {filteredStudents.length === 0 ? <div className="py-8 text-center text-slate-500 text-sm">No students match the selected filters.</div> : displayedStudents.length === 0 ? (
            <div className="py-8 text-center text-slate-500 text-sm">No student found for "<span className="text-slate-300">{studentSearch}</span>".</div>
          ) : (
            <div className="max-h-60 overflow-y-auto custom-scrollbar"><table className="w-full text-sm"><thead className="sticky top-0 bg-[#0E1422]"><tr><th className="text-left px-3 py-2 text-[11px] font-semibold text-slate-400">Student</th><th className="text-center px-3 py-2 text-[11px] font-semibold text-slate-400">Class</th><th className="text-center px-3 py-2 text-[11px] font-semibold text-slate-400">Marks / {form.maxMarks}</th></tr></thead><tbody>{displayedStudents.map((s, i) => { const val = form.marks[s.id]; const pct = val !== "" && val !== undefined ? Math.round((Number(val) / form.maxMarks) * 100) : null; const gi = pct !== null ? getGrade(pct) : null; return (<tr key={s.id} className={`border-t border-white/[0.05] ${i % 2 === 0 ? "" : "bg-white/[0.02]"}`}><td className="px-3 py-2"><p className="text-xs font-semibold text-slate-200">{s.name}</p><p className="text-[10px] text-slate-500">Roll #{s.rollNumber}</p></td><td className="px-3 py-2 text-center"><span className="text-[10px] font-semibold text-blue-400 bg-blue-500/10 border border-blue-500/20 px-1.5 py-0.5 rounded">{s.class}-{s.section}</span></td><td className="px-3 py-2"><div className="flex items-center justify-center gap-2"><input type="number" min={0} max={form.maxMarks} value={val !== undefined ? val : ""} onChange={e => setMark(s.id, e.target.value)} placeholder="-" className="w-16 text-center bg-[#111726] border border-white/[0.08] text-white text-xs rounded-lg px-2 py-1.5 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500/20" />{gi && <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded border ${gi.bg} ${gi.color}`}>{gi.grade}</span>}</div></td></tr>); })}</tbody></table></div>
          )}
        </div>

        <div className="flex flex-col-reverse sm:flex-row gap-2.5 sm:gap-3 sm:justify-end pt-2">
          <button type="button" onClick={onClose} className="btn-secondary w-full sm:w-auto min-h-[40px]">
            Cancel
          </button>
          <button
            type="button"
            onClick={() => {
              if (!form.name.trim()) {
                setNameError("Exam name is required");
                return;
              }
              onSave({ ...form, name: form.name.trim() });
            }}
            className="btn-primary w-full sm:w-auto min-h-[40px] cursor-pointer"
          >
            <Save size={15} /> {exam ? "Update Exam" : "Save Exam"}
          </button>
        </div>
      </div>
    </Modal>
  );
}

export default function Marks() {
  const { students, addToast, exams = [], saveExams, deleteExam, clearAllExams, refreshStudents } = useApp();
  const { role, user } = useAuth();
  const teacherScope = useMemo(() => getTeacherScope(user, role), [user, role]);
  const canEdit = role === "teacher";
  const isAdmin = role === "admin";

  // Tab view: 'roster' (Students Marks Roster) vs 'exams' (Exams History)
  const [viewMode, setViewMode] = useState("roster");

  // Filters
  const [filterClass, setFilterClass] = useState(() => {
    if (role === "teacher" && teacherScope.allowedClasses.length > 0) {
      return teacherScope.defaultClass;
    }
    return "all";
  });
  const [filterSection, setFilterSection] = useState("all");
  const [filterSubject, setFilterSubject] = useState(() => {
    if (role === "teacher" && teacherScope.teacherSubject) {
      return teacherScope.teacherSubject;
    }
    return "all";
  });
  const [filterExamType, setFilterExamType] = useState("all");
  const [search, setSearch] = useState("");

  // Roster Assessment Editor state
  const [selectedExamId, setSelectedExamId] = useState("new");
  const [assessmentName, setAssessmentName] = useState("");
  const [assessmentType, setAssessmentType] = useState(EXAM_TYPES[0]);
  const [maxMarks, setMaxMarks] = useState(100);
  const [assessmentDate, setAssessmentDate] = useState(new Date().toISOString().split("T")[0]);
  const [localMarks, setLocalMarks] = useState({});
  const [savingMarks, setSavingMarks] = useState(false);

  // Modals & single exam view
  const [examModal, setExamModal] = useState({ open: false, exam: null });
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [clearAllOpen, setClearAllOpen] = useState(false);
  const [viewExam, setViewExam] = useState(null);
  const [viewSearch, setViewSearch] = useState("");

  // Auto-fetch students if empty on mount
  useEffect(() => {
    if (students.length === 0 && refreshStudents) {
      refreshStudents();
    }
  }, [students.length, refreshStudents]);

  // Auto-sync teacher scope boundaries
  useEffect(() => {
    if (role === 'teacher' && teacherScope.isRestricted) {
      if (teacherScope.allowedClasses.length > 0 && !teacherScope.isClassAllowed(filterClass)) {
        setFilterClass(teacherScope.defaultClass);
      }
      if (teacherScope.allowedSections.length > 0 && filterSection !== 'all' && !teacherScope.isSectionAllowed(filterSection)) {
        setFilterSection('all');
      }
      if (teacherScope.teacherSubject && (filterSubject === 'all' || !teacherScope.isSubjectAllowed(filterSubject))) {
        const matched = SUBJECTS.find(s => s.toLowerCase() === teacherScope.teacherSubject.toLowerCase()) || teacherScope.teacherSubject;
        setFilterSubject(matched);
      }
    }
  }, [role, teacherScope, filterClass, filterSection, filterSubject]);

  // Allowed Classes
  const availableClasses = useMemo(() => {
    if (role === "teacher" && teacherScope.allowedClasses.length > 0) {
      return teacherScope.allowedClasses;
    }
    return Array.from(new Set(students.map(s => String(s.class || '').trim())))
      .filter(Boolean)
      .sort((a, b) => a.localeCompare(b, undefined, { numeric: true }));
  }, [students, role, teacherScope]);

  // Allowed Sections
  const availableSections = useMemo(() => {
    if (role === "teacher" && teacherScope.allowedSections.length > 0) {
      return teacherScope.allowedSections;
    }
    const filteredByCls = students.filter(s => filterClass === "all" || String(s.class || '').trim() === String(filterClass || '').trim());
    return Array.from(new Set(filteredByCls.map(s => String(s.section || '').trim().toUpperCase()))).filter(Boolean).sort();
  }, [students, filterClass, role, teacherScope]);

  // Allowed Subjects
  const availableSubjects = useMemo(() => {
    if (role === 'teacher' && teacherScope.allowedSubjects.length > 0) {
      const set = new Set([...teacherScope.allowedSubjects, ...SUBJECTS]);
      return Array.from(set);
    }
    return SUBJECTS;
  }, [role, teacherScope]);

  // Roster Students matching the teacher scope & selected class/section/search
  const rosterStudents = useMemo(() => {
    const base = teacherScope.isRestricted ? teacherScope.filterStudents(students) : students;
    return base.filter(s => {
      const sCls = String(s.class || '').trim().replace(/^(class|cls)\.?\s*/i, '').replace(/(st|nd|rd|th)$/i, '');
      const fCls = String(filterClass || '').trim().replace(/^(class|cls)\.?\s*/i, '').replace(/(st|nd|rd|th)$/i, '');
      const matchClass = filterClass === "all" || sCls === fCls;

      const sSec = String(s.section || '').trim().toUpperCase();
      const fSec = String(filterSection || '').trim().toUpperCase();
      const matchSec = filterSection === "all" || sSec === fSec;

      const q = search.trim().toLowerCase();
      const matchSearch = !q ||
        String(s.name || '').toLowerCase().includes(q) ||
        String(s.rollNumber || '').toLowerCase().includes(q);

      return matchClass && matchSec && matchSearch;
    }).sort((a, b) => {
      const rA = parseInt(a.rollNumber, 10);
      const rB = parseInt(b.rollNumber, 10);
      if (!isNaN(rA) && !isNaN(rB)) return rA - rB;
      return String(a.name || '').localeCompare(String(b.name || ''));
    });
  }, [students, teacherScope, filterClass, filterSection, search]);

  // Exams matching selected class and subject
  const matchingExams = useMemo(() => {
    return exams.filter(e => {
      const eCls = String(e.classFilter || '').trim().replace(/^(class|cls)\.?\s*/i, '').replace(/(st|nd|rd|th)$/i, '');
      const fCls = String(filterClass || '').trim().replace(/^(class|cls)\.?\s*/i, '').replace(/(st|nd|rd|th)$/i, '');
      const matchClass = filterClass === "all" || e.classFilter === "all" || eCls === fCls;

      const matchSubj = filterSubject === "all" ||
        String(e.subject || '').trim().toLowerCase() === String(filterSubject || '').trim().toLowerCase();

      return matchClass && matchSubj;
    }).sort((a, b) => new Date(b.date || b.createdAt || 0) - new Date(a.date || a.createdAt || 0));
  }, [exams, filterClass, filterSubject]);

  // Filtered exams for the Exams Overview list tab
  const filteredExams = useMemo(() => exams.filter(e => {
    const q = search.trim().toLowerCase();
    const ms = !q || String(e.name || '').toLowerCase().includes(q) || String(e.subject || '').toLowerCase().includes(q);
    const msu = filterSubject === "all" || e.subject === filterSubject;
    const mt = filterExamType === "all" || e.examType === filterExamType;
    const eCls = String(e.classFilter || '').trim().replace(/^(class|cls)\.?\s*/i, '').replace(/(st|nd|rd|th)$/i, '');
    const fCls = String(filterClass || '').trim().replace(/^(class|cls)\.?\s*/i, '').replace(/(st|nd|rd|th)$/i, '');
    const mc = filterClass === "all" || e.classFilter === "all" || eCls === fCls;
    return ms && msu && mt && mc;
  }).sort((a, b) => new Date(b.date || b.createdAt || 0) - new Date(a.date || a.createdAt || 0)),
  [exams, search, filterSubject, filterExamType, filterClass]);

  // Auto-sync assessment state with matchingExams
  useEffect(() => {
    if (matchingExams.length > 0) {
      const current = matchingExams.find(e => (e.id || e._docId) === selectedExamId);
      if (current) {
        setAssessmentName(current.name || "");
        setAssessmentType(current.examType || EXAM_TYPES[0]);
        setMaxMarks(current.maxMarks || 100);
        setAssessmentDate(current.date || new Date().toISOString().split("T")[0]);
        setLocalMarks({ ...(current.marks || {}) });
      } else if (selectedExamId !== "new") {
        const latest = matchingExams[0];
        setSelectedExamId(latest.id || latest._docId);
        setAssessmentName(latest.name || "");
        setAssessmentType(latest.examType || EXAM_TYPES[0]);
        setMaxMarks(latest.maxMarks || 100);
        setAssessmentDate(latest.date || new Date().toISOString().split("T")[0]);
        setLocalMarks({ ...(latest.marks || {}) });
      }
    } else {
      setSelectedExamId("new");
      const subjLabel = filterSubject === "all" ? (teacherScope.teacherSubject || "Subject") : filterSubject;
      setAssessmentName(`${subjLabel} Assessment`);
      setAssessmentType(EXAM_TYPES[0]);
      setMaxMarks(100);
      setAssessmentDate(new Date().toISOString().split("T")[0]);
      setLocalMarks({});
    }
  }, [matchingExams, selectedExamId, filterSubject, teacherScope.teacherSubject]);

  const handleSelectAssessment = (examId) => {
    setSelectedExamId(examId);
    if (examId === "new") {
      const subjLabel = filterSubject === "all" ? (teacherScope.teacherSubject || "Subject") : filterSubject;
      setAssessmentName(`${subjLabel} Test ${matchingExams.length + 1}`);
      setAssessmentType(EXAM_TYPES[0]);
      setMaxMarks(100);
      setAssessmentDate(new Date().toISOString().split("T")[0]);
      setLocalMarks({});
    } else {
      const exam = matchingExams.find(e => (e.id || e._docId) === examId);
      if (exam) {
        setAssessmentName(exam.name || "");
        setAssessmentType(exam.examType || EXAM_TYPES[0]);
        setMaxMarks(exam.maxMarks || 100);
        setAssessmentDate(exam.date || new Date().toISOString().split("T")[0]);
        setLocalMarks({ ...(exam.marks || {}) });
      }
    }
  };

  const handleMarkChange = (studentId, val) => {
    if (!canEdit) return;
    const num = val === "" ? "" : Math.max(0, Math.min(Number(val), Number(maxMarks) || 100));
    setLocalMarks(prev => ({ ...prev, [studentId]: num }));
  };

  const handleFillMax = () => {
    if (!canEdit) return;
    const m = { ...localMarks };
    rosterStudents.forEach(s => {
      m[s.id] = Number(maxMarks) || 100;
    });
    setLocalMarks(m);
  };

  const handleClearRosterMarks = () => {
    if (!canEdit) return;
    const m = { ...localMarks };
    rosterStudents.forEach(s => {
      m[s.id] = "";
    });
    setLocalMarks(m);
  };

  const handleSaveRosterMarks = async () => {
    if (!canEdit) {
      addToast("Administrators have view-only access. Only teachers can record or edit marks.", "error");
      return;
    }
    setSavingMarks(true);
    try {
      const activeSubject = filterSubject === "all" ? (teacherScope.teacherSubject || SUBJECTS[0]) : filterSubject;
      const finalName = assessmentName.trim() || `${activeSubject} Assessment`;
      const numMax = Number(maxMarks) || 100;

      const marksPayload = {};
      rosterStudents.forEach(s => {
        const val = localMarks[s.id];
        if (val !== undefined && val !== "") {
          marksPayload[s.id] = Number(val);
          if (s.rollNumber) {
            marksPayload[String(s.rollNumber).trim()] = Number(val);
            marksPayload[String(s.rollNumber).trim().replace(/^0+/, "")] = Number(val);
          }
        }
      });

      const existingExam = selectedExamId !== "new"
        ? matchingExams.find(e => (e.id || e._docId) === selectedExamId)
        : null;

      if (existingExam) {
        const updated = {
          ...existingExam,
          name: finalName,
          subject: activeSubject,
          examType: assessmentType,
          maxMarks: numMax,
          date: assessmentDate,
          classFilter: filterClass,
          sectionFilter: filterSection,
          marks: marksPayload,
          updatedAt: new Date().toISOString(),
        };
        const updatedList = exams.map(e => (e.id === existingExam.id || e._docId === existingExam._docId) ? updated : e);
        await saveExams(updatedList);
        addToast(`Marks for "${finalName}" updated successfully.`, "success");
      } else {
        const newExam = {
          id: `EXAM_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
          name: finalName,
          subject: activeSubject,
          examType: assessmentType,
          maxMarks: numMax,
          date: assessmentDate,
          classFilter: filterClass,
          sectionFilter: filterSection,
          marks: marksPayload,
          createdAt: new Date().toISOString(),
        };
        await saveExams([newExam, ...exams]);
        setSelectedExamId(newExam.id);
        addToast(`Marks for "${finalName}" saved successfully.`, "success");
      }
    } catch (err) {
      console.error("Failed to save marks:", err);
      addToast("Failed to save marks. Please try again.", "error");
    } finally {
      setSavingMarks(false);
    }
  };

  const handleSaveExamFromModal = async (form) => {
    if (!canEdit) {
      addToast("Administrators have view-only access. Only teachers can record or edit marks.", "error");
      return;
    }
    try {
      if (examModal.exam) {
        const u = exams.map(e => e.id === examModal.exam.id ? { ...e, ...form } : e);
        await saveExams(u);
        if (viewExam?.id === examModal.exam.id) setViewExam({ ...examModal.exam, ...form });
        addToast("Exam marks updated.", "success");
      } else {
        const ne = {
          ...form,
          id: `EXAM_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
          createdAt: new Date().toISOString()
        };
        await saveExams([ne, ...exams]);
        addToast("Exam added.", "success");
      }
    } catch (err) {
      console.error("Failed to save exam:", err);
      addToast("Failed to save exam. Please try again.", "error");
    }
    setExamModal({ open: false, exam: null });
  };

  const handleDelete = async (exam) => {
    if (!canEdit) {
      addToast("Administrators cannot delete exam records.", "error");
      return;
    }
    try {
      if (deleteExam) {
        await deleteExam(exam.id || exam._docId);
      } else {
        await saveExams(exams.filter(e => e.id !== exam.id));
      }
      addToast(`"${exam.name}" deleted.`, "info");
    } catch (err) {
      console.error("Failed to delete exam:", err);
      addToast("Failed to delete exam.", "error");
    }
    setDeleteTarget(null);
    if (viewExam?.id === exam.id) setViewExam(null);
  };

  const handleClearAll = async () => {
    if (!canEdit) {
      addToast("Administrators cannot clear exam records.", "error");
      return;
    }
    try {
      if (clearAllExams) {
        await clearAllExams();
      } else {
        await saveExams([]);
      }
      addToast("All exam records deleted successfully.", "info");
    } catch (err) {
      console.error("Failed to clear exams:", err);
      addToast("Failed to delete all exams.", "error");
    }
    setClearAllOpen(false);
    if (viewExam) setViewExam(null);
  };

  // Stats calculation for roster
  const rosterStats = useMemo(() => {
    const entered = rosterStudents
      .map(s => localMarks[s.id])
      .filter(m => m !== "" && m !== undefined && !isNaN(m))
      .map(Number);
    const numMax = Number(maxMarks) || 100;
    if (entered.length === 0) {
      return { total: rosterStudents.length, entered: 0, avgPct: 0, highest: 0, passRate: 0 };
    }
    const avg = Math.round(entered.reduce((a, b) => a + b, 0) / entered.length);
    const avgPct = Math.round((avg / numMax) * 100);
    const highest = Math.max(...entered);
    const passThreshold = numMax * 0.33;
    const passed = entered.filter(m => m >= passThreshold).length;
    const passRate = Math.round((passed / entered.length) * 100);
    return {
      total: rosterStudents.length,
      entered: entered.length,
      avgPct,
      highest,
      passRate,
    };
  }, [rosterStudents, localMarks, maxMarks]);

  const examStats = (exam) => {
    const arr = Object.values(exam.marks || {}).filter(m => m !== "" && m !== undefined && !isNaN(m)).map(Number);
    if (!arr.length) return { avg: 0, highest: 0, lowest: 0, passRate: 0, appeared: 0 };
    const avg = Math.round(arr.reduce((a, b) => a + b, 0) / arr.length);
    const thr = exam.maxMarks * 0.33;
    return {
      avg,
      highest: Math.max(...arr),
      lowest: Math.min(...arr),
      passRate: Math.round((arr.filter(m => m >= thr).length / arr.length) * 100),
      appeared: arr.length
    };
  };

  const viewStudents = useMemo(() => !viewExam ? [] : students.filter(s => {
    const hm = viewExam.marks?.[s.id] !== undefined && viewExam.marks?.[s.id] !== "";
    const mc = viewExam.classFilter === "all" || String(s.class || '').trim() === String(viewExam.classFilter || '').trim();
    const ms = viewExam.sectionFilter === "all" || String(s.section || '').trim().toUpperCase() === String(viewExam.sectionFilter || '').trim().toUpperCase();
    const mq = !viewSearch || String(s.name || '').toLowerCase().includes(viewSearch.toLowerCase()) || String(s.rollNumber).includes(viewSearch);
    return hm && mc && ms && mq;
  }).sort((a, b) => Number(viewExam.marks[b.id] ?? -1) - Number(viewExam.marks[a.id] ?? -1)), [viewExam, students, viewSearch]);

  return (
    <div className="w-full space-y-2 sm:space-y-2.5 animate-fade-in pb-6">
      {savingMarks && <LoadingScreen message="Saving marks to Firebase..." fullScreen={true} />}
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1.5 sm:gap-2">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-1.5 flex-wrap">
            <h1 className="text-base sm:text-lg font-bold text-slate-900 dark:text-white flex items-center gap-1.5 tracking-tight">
              <BookOpen size={18} className="text-blue-500 shrink-0" /> Marks & Academic Performance
            </h1>
          </div>
          <p className="text-[10px] sm:text-xs text-slate-500 dark:text-slate-400 mt-0.5">
            {role === 'teacher' ? (
              <span>
                Class {filterClass === 'all' ? (teacherScope.defaultClass || 'All') : filterClass}
                {filterSection !== 'all' ? `-${filterSection}` : ''} &bull; {filterSubject === 'all' ? 'All Subjects' : filterSubject} &bull; {rosterStudents.length} students
              </span>
            ) : (
              <span>{exams.length} exams recorded &bull; {students.length} total students</span>
            )}
          </p>
        </div>

        {/* View Switcher Tabs */}
        {!viewExam && (
          <div className="flex items-center gap-1.5 w-full sm:w-auto">
            <div className="flex items-center p-0.5 rounded-lg bg-slate-100 dark:bg-white/[0.06] border border-slate-200 dark:border-white/10 w-full sm:w-auto h-7 sm:h-7.5">
              <button
                type="button"
                onClick={() => setViewMode("roster")}
                className={`flex-1 sm:flex-initial flex items-center justify-center gap-1 px-2.5 py-0.5 rounded-md text-[11px] sm:text-xs font-semibold transition-all cursor-pointer h-full ${
                  viewMode === "roster"
                    ? "bg-blue-600 text-white shadow-xs"
                    : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white"
                }`}
              >
                <Users size={12} />
                <span>Students Roster</span>
              </button>
              <button
                type="button"
                onClick={() => setViewMode("exams")}
                className={`flex-1 sm:flex-initial flex items-center justify-center gap-1 px-2.5 py-0.5 rounded-md text-[11px] sm:text-xs font-semibold transition-all cursor-pointer h-full ${
                  viewMode === "exams"
                    ? "bg-blue-600 text-white shadow-xs"
                    : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white"
                }`}
              >
                <BookOpen size={12} />
                <span>Exams Overview</span>
                {exams.length > 0 && (
                  <span className={`text-[9px] px-1 py-0.5 rounded-full font-bold ${
                    viewMode === "exams" ? "bg-white/20 text-white" : "bg-white/[0.08] text-slate-400"
                  }`}>
                    {exams.length}
                  </span>
                )}
              </button>
            </div>

            {canEdit && viewMode === "roster" && (
              <button
                type="button"
                onClick={handleSaveRosterMarks}
                disabled={savingMarks}
                className="btn-primary h-7 sm:h-7.5 px-3 text-xs justify-center cursor-pointer shrink-0 hidden sm:inline-flex rounded-lg font-semibold"
              >
                <Save size={13} />
                <span>{savingMarks ? "Saving..." : selectedExamId !== "new" ? "Update Marks" : "Save Marks"}</span>
              </button>
            )}

            {canEdit && viewMode === "exams" && (
              <button
                type="button"
                onClick={() => setExamModal({ open: true, exam: null })}
                className="btn-primary h-7 sm:h-7.5 px-3 text-xs justify-center cursor-pointer shrink-0 rounded-lg font-semibold"
              >
                <Plus size={13} />
                <span>Add Exam</span>
              </button>
            )}
          </div>
        )}
      </div>

      {/* Main Filter Bar */}
      {!viewExam && (
        <div className="rounded-xl bg-white dark:bg-[#0B0F19]/80 border border-slate-200 dark:border-white/10 p-2 sm:p-2.5 backdrop-blur-xl shadow-[0_4px_25px_rgba(0,0,0,0.3)] relative z-10 space-y-1.5">
          {/* Top Row: Search & Class/Section/Subject Filter */}
          <div className="flex flex-col sm:flex-row gap-1 sm:gap-1.5 items-stretch sm:items-center">
            {/* Search */}
            <div className="relative flex-1 min-w-0">
              <Search size={13} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
              <input
                type="text"
                value={search}
                onChange={e => setSearch(e.target.value)}
                placeholder={viewMode === "roster" ? "Search student, roll #..." : "Search exam, subject..."}
                className="input-field pl-8 pr-2.5 py-0.5 h-7 sm:h-7.5 text-xs w-full rounded-lg"
              />
            </div>

            {/* Class, Section, Subject in a compact multi-column row */}
            <div className="grid grid-cols-3 gap-1 sm:flex sm:items-center sm:gap-1.5 shrink-0">
              {/* Class filter */}
              <select
                value={filterClass}
                onChange={e => setFilterClass(e.target.value)}
                className="input-field text-xs py-0.5 px-1.5 h-7 sm:h-7.5 font-medium rounded-lg"
              >
                {!teacherScope.isRestricted && <option value="all">All Cls</option>}
                {availableClasses.map(c => (
                  <option key={c} value={c}>Class {c}</option>
                ))}
              </select>

              {/* Section filter */}
              <select
                value={filterSection}
                onChange={e => setFilterSection(e.target.value)}
                className="input-field text-xs py-0.5 px-1.5 h-7 sm:h-7.5 font-medium rounded-lg"
              >
                <option value="all">
                  {teacherScope.allowedSections.length > 0
                    ? `Sec: All (${teacherScope.allowedSections.join(', ')})`
                    : "All Sec"}
                </option>
                {availableSections.map(s => (
                  <option key={s} value={s}>Sec {s}</option>
                ))}
              </select>

              {/* Subject filter */}
              <select
                value={filterSubject}
                onChange={e => setFilterSubject(e.target.value)}
                className="input-field text-xs py-0.5 px-1.5 h-7 sm:h-7.5 font-medium rounded-lg"
              >
                {!teacherScope.teacherSubject && <option value="all">All Subj</option>}
                {availableSubjects.map(s => (
                  <option key={s} value={s}>
                    {s} {teacherScope.isSubjectAllowed(s) && role === 'teacher' ? '★' : ''}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Roster Assessment & Controls Sub-Bar */}
          {viewMode === "roster" && (
            <div className="pt-1.5 border-t border-slate-100 dark:border-white/[0.06] flex flex-col lg:flex-row lg:items-center justify-between gap-1 text-xs">
              {/* Row 1 on mobile: Assessment Dropdown + Max Marks input */}
              <div className="flex items-center gap-1 flex-1 min-w-0">
                <div className="relative flex-1 min-w-0">
                  <select
                    value={selectedExamId}
                    onChange={e => handleSelectAssessment(e.target.value)}
                    className="input-field text-xs py-0.5 px-2 h-7 sm:h-7.5 w-full font-medium rounded-lg"
                  >
                    <option value="new">+ Record New Test</option>
                    {matchingExams.map(e => (
                      <option key={e.id || e._docId} value={e.id || e._docId}>
                        {e.name} ({e.examType} &bull; Max {e.maxMarks})
                      </option>
                    ))}
                  </select>
                </div>

                {/* Max Marks */}
                <div className="flex items-center gap-1 shrink-0 bg-slate-100 dark:bg-white/[0.04] border border-slate-200 dark:border-white/10 rounded-lg px-2 h-7 sm:h-7.5">
                  <span className="text-[10px] text-slate-400 font-medium">Max:</span>
                  <input
                    type="number"
                    min={1}
                    max={500}
                    value={maxMarks}
                    onChange={e => setMaxMarks(Number(e.target.value) || 100)}
                    className="w-9 sm:w-11 bg-transparent text-xs font-bold text-slate-900 dark:text-white text-center focus:outline-none"
                    title="Maximum Marks"
                  />
                </div>
              </div>

              {/* Row 2 on mobile: Assessment Title + Quick Fill (Max / Clear) + Save button */}
              <div className="flex items-center gap-1 justify-between lg:justify-end">
                {/* Assessment Title */}
                <input
                  type="text"
                  value={assessmentName}
                  onChange={e => setAssessmentName(e.target.value)}
                  placeholder="Assessment Title (e.g. Test 1)"
                  className="input-field text-xs py-0.5 px-2 h-7 sm:h-7.5 flex-1 lg:w-44 font-medium rounded-lg"
                  title="Assessment Name"
                />

                {/* Quick Fill & Save */}
                {canEdit && (
                  <div className="flex items-center gap-1 shrink-0">
                    <button
                      type="button"
                      onClick={handleFillMax}
                      className="text-[10px] px-2 py-0.5 rounded-lg bg-emerald-500/15 text-emerald-400 border border-emerald-500/20 hover:bg-emerald-500/25 cursor-pointer font-medium transition-colors h-7 sm:h-7.5"
                      title="Fill all students with maximum marks"
                    >
                      Max
                    </button>
                    <button
                      type="button"
                      onClick={handleClearRosterMarks}
                      className="text-[10px] px-2 py-0.5 rounded-lg bg-slate-100 dark:bg-white/[0.06] text-slate-600 dark:text-slate-400 border border-slate-200 dark:border-white/10 hover:bg-slate-200 dark:hover:bg-white/[0.1] cursor-pointer font-medium transition-colors h-7 sm:h-7.5"
                      title="Clear all entered marks"
                    >
                      Clear
                    </button>
                    <button
                      type="button"
                      onClick={handleSaveRosterMarks}
                      disabled={savingMarks}
                      className="btn-primary py-0 px-2.5 text-xs h-7 sm:h-7.5 min-h-0 flex items-center gap-1 cursor-pointer font-semibold shadow-xs rounded-lg"
                    >
                      <Save size={12} />
                      <span>{savingMarks ? "..." : "Save"}</span>
                    </button>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      )}

      {/* ── MODE 1: STUDENTS MARKS ROSTER (DEFAULT FOR TEACHERS) ── */}
      {!viewExam && viewMode === "roster" && (
        <div className="space-y-1.5 sm:space-y-2">
          {/* Class Summary Stats */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-1.5 sm:gap-2">
            {[
              {
                label: "Class Avg",
                value: `${rosterStats.avgPct}%`,
                sub: `${rosterStats.entered} entered`,
                icon: TrendingUp,
                cc: "text-blue-400",
                bc: "bg-blue-500/10 border-blue-500/20"
              },
              {
                label: "Top Score",
                value: `${rosterStats.highest}/${maxMarks}`,
                sub: `${maxMarks > 0 ? Math.round((rosterStats.highest / maxMarks) * 100) : 0}% max`,
                icon: Award,
                cc: "text-emerald-400",
                bc: "bg-emerald-500/10 border-emerald-500/20"
              },
              {
                label: "Entered",
                value: `${rosterStats.entered}/${rosterStats.total}`,
                sub: `${rosterStats.total - rosterStats.entered} pending`,
                icon: Users,
                cc: "text-violet-400",
                bc: "bg-violet-500/10 border-violet-500/20"
              },
              {
                label: "Pass Rate",
                value: `${rosterStats.passRate}%`,
                sub: ">= 33% pass",
                icon: BarChart3,
                cc: "text-amber-400",
                bc: "bg-amber-500/10 border-amber-500/20"
              }
            ].map(({ label, value, sub, icon: Icon, cc, bc }) => (
              <div key={label} className={`rounded-lg border px-2 py-1.5 sm:px-2.5 sm:py-2 ${bc} backdrop-blur-xl`}>
                <div className="flex items-center justify-between gap-1 leading-none">
                  <span className="text-[10px] text-slate-400 font-medium truncate leading-none">{label}</span>
                  <Icon size={11} className={`${cc} shrink-0`} />
                </div>
                <div className="flex items-baseline justify-between gap-1 mt-0.5 leading-none">
                  <p className={`text-sm sm:text-base font-bold leading-none ${cc}`}>{value}</p>
                  <p className="text-[9px] text-slate-500 truncate leading-none">{sub}</p>
                </div>
              </div>
            ))}
          </div>

          {/* Student Roster Table / Card Container */}
          <div className="rounded-xl bg-white dark:bg-[#0B0F19]/80 border border-slate-200 dark:border-white/10 shadow-[0_4px_25px_rgba(0,0,0,0.3)] backdrop-blur-xl overflow-hidden relative z-10">
            <div className="flex items-center justify-between gap-2 px-2.5 py-1.5 sm:px-3 sm:py-2 border-b border-slate-100 dark:border-white/10 bg-slate-50/50 dark:bg-[#111726]/60">
              <div className="flex items-center gap-1.5 min-w-0">
                <Users size={13} className="text-blue-400 shrink-0" />
                <h3 className="text-xs font-bold text-slate-900 dark:text-white truncate">
                  Roster &bull; Class {filterClass === "all" ? (teacherScope.defaultClass || "All") : filterClass}
                  {filterSection !== "all" ? `-${filterSection}` : ""}
                </h3>
              </div>
              <div className="flex items-center gap-1.5 shrink-0">
                <span className="text-[10px] sm:text-[11px] text-slate-400">
                  {rosterStudents.length} stds &bull; Max: {maxMarks}
                </span>
                {canEdit && (
                  <button
                    type="button"
                    onClick={handleSaveRosterMarks}
                    disabled={savingMarks}
                    className="btn-primary text-[11px] py-0 px-2 h-6 sm:h-6.5 min-h-0 rounded-md cursor-pointer flex items-center gap-1 font-semibold"
                  >
                    <Save size={11} />
                    <span>{savingMarks ? "..." : "Save"}</span>
                  </button>
                )}
              </div>
            </div>

            {rosterStudents.length === 0 ? (
              <div className="py-16 flex flex-col items-center justify-center text-center px-4">
                <div className="w-12 h-12 rounded-2xl bg-blue-500/10 border border-blue-500/20 flex items-center justify-center text-blue-400 mb-2">
                  <Users size={22} />
                </div>
                <h4 className="text-sm font-bold text-slate-900 dark:text-white">No students match current filters</h4>
                <p className="text-xs text-slate-500 max-w-sm mt-1">
                  {teacherScope.isRestricted
                    ? `No students found matching Class ${filterClass} and Section ${filterSection} within your assigned teacher scope.`
                    : "No students registered for this class."}
                </p>
                {students.length === 0 && (
                  <button
                    type="button"
                    onClick={refreshStudents}
                    className="btn-secondary text-xs mt-3 cursor-pointer"
                  >
                    <RefreshCw size={13} /> Refresh Students
                  </button>
                )}
              </div>
            ) : (
              <>
                {/* Desktop View Table */}
                <div className="hidden md:block overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="bg-slate-50 dark:bg-[#111726]/80 border-b border-slate-100 dark:border-white/10">
                        <th className="text-left text-xs font-semibold text-slate-500 dark:text-slate-400 px-3 py-2 w-10">#</th>
                        <th className="text-left text-xs font-semibold text-slate-500 dark:text-slate-400 px-3 py-2">Student</th>
                        <th className="text-center text-xs font-semibold text-slate-500 dark:text-slate-400 px-3 py-2">Class</th>
                        <th className="text-center text-xs font-semibold text-slate-500 dark:text-slate-400 px-3 py-2">Marks / {maxMarks}</th>
                        <th className="text-center text-xs font-semibold text-slate-500 dark:text-slate-400 px-3 py-2">%</th>
                        <th className="text-center text-xs font-semibold text-slate-500 dark:text-slate-400 px-3 py-2">Status</th>
                        <th className="text-center text-xs font-semibold text-slate-500 dark:text-slate-400 px-3 py-2">Grade</th>
                      </tr>
                    </thead>
                    <tbody>
                      {rosterStudents.map((s, idx) => {
                        const val = localMarks[s.id];
                        const hasVal = val !== "" && val !== undefined && !isNaN(val);
                        const numVal = hasVal ? Number(val) : 0;
                        const pct = hasVal ? Math.round((numVal / (Number(maxMarks) || 100)) * 100) : null;
                        const gi = pct !== null ? getGrade(pct) : null;
                        const passed = pct !== null ? pct >= 33 : null;

                        return (
                          <tr
                            key={s.id}
                            className={`border-b border-slate-100 dark:border-white/[0.06] last:border-0 hover:bg-slate-50/80 dark:hover:bg-white/[0.04] transition-colors ${
                              idx % 2 === 1 ? "bg-slate-50/30 dark:bg-white/[0.01]" : ""
                            }`}
                          >
                            <td className="px-3 py-2 text-xs font-semibold text-slate-400">
                              {idx + 1}
                            </td>
                            <td className="px-3 py-2">
                              <div className="flex items-center gap-2">
                                <div
                                  className="w-7 h-7 rounded-full flex items-center justify-center flex-shrink-0 text-[10px] font-bold text-white shadow-xs"
                                  style={{ background: `hsl(${(String(s.rollNumber || s.name).charCodeAt(0) * 47) % 360}, 60%, 55%)` }}
                                >
                                  {String(s.name || "S").split(" ").map(n => n[0]).join("").slice(0, 2)}
                                </div>
                                <div className="min-w-0">
                                  <p className="text-xs font-semibold text-slate-900 dark:text-white truncate">{s.name}</p>
                                  <p className="text-[10px] text-slate-400">Roll #{s.rollNumber}</p>
                                </div>
                              </div>
                            </td>
                            <td className="px-3 py-2 text-center">
                              <span className="text-[10px] font-semibold text-blue-400 bg-blue-500/10 border border-blue-500/20 px-1.5 py-0.5 rounded">
                                {s.class}-{s.section}
                              </span>
                            </td>
                            <td className="px-3 py-2 text-center">
                              <div className="flex items-center justify-center gap-1.5">
                                <input
                                  type="number"
                                  min={0}
                                  max={maxMarks}
                                  value={val !== undefined ? val : ""}
                                  onChange={e => handleMarkChange(s.id, e.target.value)}
                                  disabled={!canEdit}
                                  placeholder="-"
                                  className="w-16 text-center bg-white dark:bg-[#111726] border border-slate-200 dark:border-white/[0.08] text-slate-900 dark:text-white text-xs font-semibold rounded-md px-1.5 py-1 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500/20 disabled:opacity-60 disabled:cursor-not-allowed h-7"
                                />
                                <span className="text-xs text-slate-400">/{maxMarks}</span>
                              </div>
                            </td>
                            <td className="px-3 py-2 text-center">
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
                              {gi ? (
                                <span className={`text-xs font-bold px-2 py-0.5 rounded border ${gi.bg} ${gi.color}`}>
                                  {gi.grade}
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

                {/* Mobile View Cards */}
                <div className="md:hidden divide-y divide-slate-100 dark:divide-white/[0.06]">
                  {rosterStudents.map((s, idx) => {
                    const val = localMarks[s.id];
                    const hasVal = val !== "" && val !== undefined && !isNaN(val);
                    const numVal = hasVal ? Number(val) : 0;
                    const pct = hasVal ? Math.round((numVal / (Number(maxMarks) || 100)) * 100) : null;
                    const gi = pct !== null ? getGrade(pct) : null;
                    const passed = pct !== null ? pct >= 33 : null;

                    return (
                      <div
                        key={s.id}
                        className="px-2.5 py-1 hover:bg-slate-50 dark:hover:bg-white/[0.02] transition-colors flex items-center justify-between gap-1.5"
                      >
                        {/* Left: student info */}
                        <div className="flex items-center gap-2 min-w-0 flex-1">
                          <span className="text-[10px] font-semibold text-slate-500 w-3 text-center shrink-0">
                            {idx + 1}
                          </span>
                          <div
                            className="w-5.5 h-5.5 rounded-full flex items-center justify-center shrink-0 text-[8.5px] font-bold text-white shadow-2xs"
                            style={{ background: `hsl(${(String(s.rollNumber || s.name).charCodeAt(0) * 47) % 360}, 60%, 55%)` }}
                          >
                            {String(s.name || "S").split(" ").map(n => n[0]).join("").slice(0, 2)}
                          </div>
                          <div className="min-w-0 flex-1">
                            <div className="flex items-center gap-1 leading-tight">
                              <p className="text-xs font-semibold text-slate-900 dark:text-white truncate">{s.name}</p>
                              <span className="text-[9px] font-normal text-slate-400 shrink-0">#{s.rollNumber}</span>
                            </div>
                            <div className="flex items-center gap-1 text-[9.5px] text-slate-500 leading-tight mt-0.2">
                              <span className="text-blue-400 font-medium">{s.class}-{s.section}</span>
                              <span>&bull;</span>
                              {pct !== null ? (
                                <span className={passed ? "text-emerald-400 font-semibold" : "text-rose-400 font-semibold"}>
                                  {pct}% ({passed ? "Pass" : "Fail"})
                                </span>
                              ) : (
                                <span className="text-slate-400">Not entered</span>
                              )}
                            </div>
                          </div>
                        </div>

                        {/* Right: Marks input & Grade badge */}
                        <div className="flex items-center gap-1 shrink-0">
                          <input
                            type="number"
                            min={0}
                            max={maxMarks}
                            value={val !== undefined ? val : ""}
                            onChange={e => handleMarkChange(s.id, e.target.value)}
                            disabled={!canEdit}
                            placeholder="-"
                            className="w-11 sm:w-12 text-center bg-slate-50 dark:bg-[#111726] border border-slate-200 dark:border-white/[0.1] text-slate-900 dark:text-white text-xs font-bold rounded px-1 py-0 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500/20 disabled:opacity-60 h-6.5"
                          />
                          <span className="text-[10px] text-slate-400 font-medium">/{maxMarks}</span>
                          {gi && (
                            <span className={`text-[9px] font-bold px-1 py-0.5 rounded border min-w-[20px] text-center ${gi.bg} ${gi.color}`}>
                              {gi.grade}
                            </span>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>

                <div className="px-2.5 py-1.5 sm:px-3 sm:py-2 border-t border-slate-100 dark:border-white/10 bg-slate-50/50 dark:bg-[#111726]/80 flex items-center justify-between gap-2">
                  <p className="text-[10px] sm:text-xs text-slate-500 dark:text-slate-400">
                    Showing {rosterStudents.length} students &bull; {rosterStats.entered} entered
                  </p>
                  {canEdit && (
                    <button
                      type="button"
                      onClick={handleSaveRosterMarks}
                      disabled={savingMarks}
                      className="btn-primary text-xs py-0.5 px-2.5 h-6.5 sm:h-7 min-h-0 rounded-md cursor-pointer flex items-center gap-1 font-semibold"
                    >
                      <Save size={11} />
                      <span>{savingMarks ? "Saving..." : "Save All"}</span>
                    </button>
                  )}
                </div>
              </>
            )}
          </div>
        </div>
      )}

      {/* ── MODE 2: EXAMS OVERVIEW & HISTORY ── */}
      {!viewExam && viewMode === "exams" && (
        <div className="rounded-xl bg-white dark:bg-[#0B0F19]/80 border border-slate-200 dark:border-white/10 shadow-[0_4px_25px_rgba(0,0,0,0.3)] backdrop-blur-xl overflow-hidden relative z-10">
          {filteredExams.length === 0 ? (
            <div className="py-16 flex flex-col items-center gap-2.5 text-center px-4">
              <div className="w-12 h-12 rounded-xl bg-blue-500/10 border border-blue-500/20 flex items-center justify-center text-blue-400">
                <BookOpen size={22} />
              </div>
              <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                {exams.length === 0 ? "No exams recorded yet" : "No exams match the filters"}
              </h3>
              <p className="text-xs text-slate-500 max-w-xs">
                {canEdit && exams.length === 0
                  ? "Click Add Exam to record the first set of exam marks, or use Students Roster to record marks directly."
                  : "Try adjusting the filters."}
              </p>
              {canEdit && exams.length === 0 && (
                <button
                  onClick={() => setExamModal({ open: true, exam: null })}
                  className="btn-primary mt-2 cursor-pointer text-xs h-7.5 px-3 rounded-lg"
                >
                  <Plus size={13} /> Add First Exam
                </button>
              )}
            </div>
          ) : (
            <>
              {/* Desktop View Table */}
              <div className="hidden sm:block overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="bg-slate-50 dark:bg-[#111726]/80 border-b border-slate-100 dark:border-white/10">
                      <th className="text-left text-xs font-semibold text-slate-500 dark:text-slate-400 px-3 py-2">Exam</th>
                      <th className="text-center text-xs font-semibold text-slate-500 dark:text-slate-400 px-3 py-2">Subject</th>
                      <th className="text-center text-xs font-semibold text-slate-500 dark:text-slate-400 px-3 py-2 hidden md:table-cell">Class</th>
                      <th className="text-center text-xs font-semibold text-slate-500 dark:text-slate-400 px-3 py-2 hidden lg:table-cell">Date</th>
                      <th className="text-center text-xs font-semibold text-slate-500 dark:text-slate-400 px-3 py-2">Students</th>
                      <th className="text-center text-xs font-semibold text-slate-500 dark:text-slate-400 px-3 py-2 hidden md:table-cell">Avg %</th>
                      <th className="text-center text-xs font-semibold text-slate-500 dark:text-slate-400 px-3 py-2">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredExams.map(exam => {
                      const s = examStats(exam);
                      const ap = s.appeared > 0 ? Math.round((s.avg / exam.maxMarks) * 100) : null;
                      const gi = ap !== null ? getGrade(ap) : null;
                      return (
                        <tr
                          key={exam.id}
                          onClick={() => setViewExam(exam)}
                          className="border-b border-slate-100 dark:border-white/[0.06] last:border-0 hover:bg-slate-50 dark:hover:bg-white/[0.04] transition-colors cursor-pointer"
                        >
                          <td className="px-3 py-2">
                            <div className="flex items-center gap-2.5">
                              <div className="w-7 h-7 rounded-lg bg-blue-500/10 border border-blue-500/20 flex items-center justify-center flex-shrink-0">
                                <BookOpen size={13} className="text-blue-400" />
                              </div>
                              <div>
                                <p className="text-xs sm:text-sm font-semibold text-slate-900 dark:text-white">{exam.name}</p>
                                <p className="text-[10px] text-slate-400">{exam.examType} &bull; Max {exam.maxMarks}</p>
                              </div>
                            </div>
                          </td>
                          <td className="px-3 py-2 text-center"><span className="text-xs text-slate-600 dark:text-slate-300">{exam.subject}</span></td>
                          <td className="px-3 py-2 text-center hidden md:table-cell">
                            <span className="text-[10px] font-semibold text-blue-400 bg-blue-500/10 border border-blue-500/20 px-1.5 py-0.5 rounded">
                              {exam.classFilter === "all" ? "All" : `Class ${exam.classFilter}`}{exam.sectionFilter !== "all" ? `-${exam.sectionFilter}` : ""}
                            </span>
                          </td>
                          <td className="px-3 py-2 text-center hidden lg:table-cell">
                            <span className="text-xs text-slate-600 dark:text-slate-300">
                              {exam.date ? new Date(exam.date).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" }) : "-"}
                            </span>
                          </td>
                          <td className="px-3 py-2 text-center">
                            <div className="flex items-center justify-center gap-1">
                              <Users size={11} className="text-slate-400" />
                              <span className="text-xs font-semibold text-slate-900 dark:text-white">{s.appeared}</span>
                            </div>
                          </td>
                          <td className="px-3 py-2 text-center hidden md:table-cell">
                            {gi ? <span className={`text-[11px] font-bold px-1.5 py-0.5 rounded border ${gi.bg} ${gi.color}`}>{ap}%</span> : <span className="text-xs text-slate-400">-</span>}
                          </td>
                          <td className="px-3 py-2" onClick={e => e.stopPropagation()}>
                            <div className="flex items-center justify-center gap-1">
                              <button
                                onClick={() => setViewExam(exam)}
                                className={canEdit
                                  ? "p-1.5 rounded-lg hover:bg-white/[0.08] text-slate-400 hover:text-blue-400 transition-colors cursor-pointer"
                                  : "inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-blue-500/10 hover:bg-blue-500/20 text-blue-400 border border-blue-500/20 text-xs font-semibold transition-all cursor-pointer shadow-2xs"
                                }
                                title="View Student Marks"
                              >
                                <GraduationCap size={15} />
                                {!canEdit && <span>View Marks</span>}
                              </button>
                              {canEdit && (
                                <>
                                  <button
                                    onClick={() => setExamModal({ open: true, exam })}
                                    className="p-1.5 rounded-lg hover:bg-white/[0.08] text-slate-400 hover:text-amber-400 transition-colors cursor-pointer"
                                    title="Edit Marks"
                                  >
                                    <Edit2 size={15} />
                                  </button>
                                  <button
                                    onClick={() => setDeleteTarget(exam)}
                                    className="p-1.5 rounded-lg hover:bg-white/[0.08] text-slate-400 hover:text-rose-400 transition-colors cursor-pointer"
                                    title="Delete Exam"
                                  >
                                    <Trash2 size={15} />
                                  </button>
                                </>
                              )}
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>

              {/* Mobile View Cards */}
              <div className="sm:hidden divide-y divide-slate-100 dark:divide-white/[0.06]">
                {filteredExams.map(exam => {
                  const s = examStats(exam);
                  const ap = s.appeared > 0 ? Math.round((s.avg / exam.maxMarks) * 100) : null;
                  const gi = ap !== null ? getGrade(ap) : null;
                  return (
                    <div
                      key={exam.id}
                      onClick={() => setViewExam(exam)}
                      className="p-2.5 space-y-1.5 hover:bg-slate-50 dark:hover:bg-white/[0.02] transition-colors cursor-pointer"
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex items-center gap-2 min-w-0">
                          <div className="w-7 h-7 rounded-lg bg-blue-500/10 border border-blue-500/20 flex items-center justify-center flex-shrink-0">
                            <BookOpen size={13} className="text-blue-400" />
                          </div>
                          <div className="min-w-0">
                            <p className="text-xs sm:text-sm font-semibold text-slate-900 dark:text-white truncate">{exam.name}</p>
                            <p className="text-[10px] text-slate-400">{exam.examType} &bull; Max {exam.maxMarks}</p>
                          </div>
                        </div>
                        {gi && (
                          <span className={`text-[11px] font-bold px-1.5 py-0.5 rounded border flex-shrink-0 ${gi.bg} ${gi.color}`}>
                            {ap}% avg
                          </span>
                        )}
                      </div>

                      <div className="flex flex-wrap items-center gap-1.5 text-xs">
                        <span className="text-slate-600 dark:text-slate-300 bg-slate-100 dark:bg-white/[0.04] border border-slate-200 dark:border-white/[0.06] px-1.5 py-0.5 rounded text-[10px]">
                          {exam.subject}
                        </span>
                        <span className="font-semibold text-blue-400 bg-blue-500/10 border border-blue-500/20 px-1.5 py-0.5 rounded text-[10px]">
                          {exam.classFilter === "all" ? "All Classes" : `Class ${exam.classFilter}`}{exam.sectionFilter !== "all" ? `-${exam.sectionFilter}` : ""}
                        </span>
                        {exam.date && (
                          <span className="text-slate-500 text-[10px]">
                            {new Date(exam.date).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" })}
                          </span>
                        )}
                      </div>

                      <div className="flex items-center justify-between pt-1.5 border-t border-slate-100 dark:border-white/[0.04]" onClick={e => e.stopPropagation()}>
                        <div className="flex items-center gap-1 text-slate-400 text-xs">
                          <Users size={12} />
                          <span className="font-semibold text-slate-700 dark:text-slate-300 text-xs">{s.appeared}</span>
                          <span className="text-[11px]">stds</span>
                        </div>
                        <div className="flex items-center gap-1">
                          <button
                            onClick={() => setViewExam(exam)}
                            className="px-2 py-1 rounded-lg bg-blue-500/10 text-blue-400 border border-blue-500/20 text-xs font-semibold hover:bg-blue-500/20 transition-colors flex items-center gap-1 cursor-pointer h-7"
                            title="View Results"
                          >
                            <GraduationCap size={13} />
                            <span>Results</span>
                          </button>
                          {canEdit && (
                            <>
                              <button
                                onClick={() => setExamModal({ open: true, exam })}
                                className="p-1.5 rounded-lg hover:bg-white/[0.08] text-slate-400 hover:text-amber-400 transition-colors cursor-pointer h-7 w-7 flex items-center justify-center"
                                title="Edit Marks"
                              >
                                <Edit2 size={13} />
                              </button>
                              <button
                                onClick={() => setDeleteTarget(exam)}
                                className="p-1.5 rounded-lg hover:bg-white/[0.08] text-slate-400 hover:text-rose-400 transition-colors cursor-pointer h-7 w-7 flex items-center justify-center"
                                title="Delete Exam"
                              >
                                <Trash2 size={13} />
                              </button>
                            </>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>

              <div className="px-4 py-3 border-t border-slate-100 dark:border-white/10 bg-slate-50/50 dark:bg-[#111726]/80">
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  Showing {filteredExams.length} of {exams.length} exam{exams.length !== 1 ? "s" : ""}
                </p>
              </div>
            </>
          )}
        </div>
      )}

      {/* ── MODE 3: SINGLE EXAM DRILLDOWN / DETAILED RESULTS ── */}
      {viewExam && (
        <div className="space-y-2 sm:space-y-2.5">
          <div className="flex flex-col sm:flex-row sm:items-center gap-2">
            <button
              onClick={() => { setViewExam(null); setViewSearch(""); }}
              className="btn-secondary text-blue-400 border-blue-500/20 self-start min-h-0 h-7 sm:h-7.5 py-0.5 px-2.5 text-xs rounded-lg cursor-pointer"
            >
              &#8592; Back to Marks Overview
            </button>
            <div className="flex-1 min-w-0">
              <h2 className="text-base sm:text-lg font-bold text-slate-900 dark:text-white break-words">{viewExam.name}</h2>
              <p className="text-[10px] sm:text-xs text-slate-500 dark:text-slate-400 break-words mt-0.5">
                {viewExam.examType} &bull; {viewExam.subject} &bull; {viewExam.date ? new Date(viewExam.date).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" }) : ""} &bull; Class {viewExam.classFilter === "all" ? "All" : viewExam.classFilter}{viewExam.sectionFilter !== "all" ? `-${viewExam.sectionFilter}` : ""}
              </p>
            </div>
            {canEdit ? (
              <div className="flex flex-wrap items-center gap-1.5 w-full sm:w-auto">
                <button
                  onClick={() => setExamModal({ open: true, exam: viewExam })}
                  className="btn-secondary flex-1 sm:flex-initial min-h-0 h-7 sm:h-7.5 py-0.5 px-2.5 text-xs rounded-lg justify-center cursor-pointer font-semibold"
                >
                  <Edit2 size={12} /> Edit Marks
                </button>
                <button
                  onClick={() => setDeleteTarget(viewExam)}
                  className="btn-secondary text-rose-400 border-rose-500/20 flex-1 sm:flex-initial min-h-0 h-7 sm:h-7.5 py-0.5 px-2.5 text-xs rounded-lg justify-center cursor-pointer font-semibold"
                >
                  <Trash2 size={12} /> Delete
                </button>
              </div>
            ) : (
              <div className="flex items-center gap-1.5 w-full sm:w-auto">
                <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-medium text-slate-400 bg-white/[0.04] border border-white/[0.08]">
                  <Lock size={11} /> Read-only
                </span>
              </div>
            )}
          </div>

          {(() => {
            const s = examStats(viewExam);
            const ap = s.appeared > 0 ? Math.round((s.avg / viewExam.maxMarks) * 100) : 0;
            const hp = s.appeared > 0 ? Math.round((s.highest / viewExam.maxMarks) * 100) : 0;
            return (
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-1.5 sm:gap-2">
                {[
                  { label: "Class Avg", value: `${s.avg}/${viewExam.maxMarks}`, sub: `${ap}%`, icon: TrendingUp, cc: "text-blue-400", bc: "bg-blue-500/10 border-blue-500/20" },
                  { label: "Top Score", value: `${s.highest}/${viewExam.maxMarks}`, sub: `${hp}%`, icon: Award, cc: "text-emerald-400", bc: "bg-emerald-500/10 border-emerald-500/20" },
                  { label: "Appeared", value: s.appeared, sub: "students", icon: Users, cc: "text-violet-400", bc: "bg-violet-500/10 border-violet-500/20" },
                  { label: "Pass Rate", value: `${s.passRate}%`, sub: ">= 33% pass", icon: BarChart3, cc: "text-amber-400", bc: "bg-amber-500/10 border-amber-500/20" }
                ].map(({ label, value, sub, icon: Icon, cc, bc }) => (
                  <div key={label} className={`rounded-lg border px-2 py-1.5 sm:px-2.5 sm:py-2 ${bc} backdrop-blur-xl`}>
                    <div className="flex items-center justify-between gap-1 leading-none">
                      <span className="text-[10px] text-slate-400 font-medium truncate leading-none">{label}</span>
                      <Icon size={11} className={`${cc} shrink-0`} />
                    </div>
                    <div className="flex items-baseline justify-between gap-1 mt-0.5 leading-none">
                      <p className={`text-sm sm:text-base font-bold leading-none ${cc}`}>{value}</p>
                      <p className="text-[9px] text-slate-500 truncate leading-none">{sub}</p>
                    </div>
                  </div>
                ))}
              </div>
            );
          })()}

          <div className="rounded-xl bg-white dark:bg-[#0B0F19]/80 border border-slate-200 dark:border-white/10 shadow-[0_4px_25px_rgba(0,0,0,0.3)] backdrop-blur-xl overflow-hidden">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 px-2.5 py-1.5 sm:px-3 sm:py-2 border-b border-slate-100 dark:border-white/10">
              <h3 className="text-xs font-bold text-slate-900 dark:text-white">Student Results</h3>
              <div className="relative w-full sm:w-48">
                <Search size={12} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-500 pointer-events-none" />
                <input
                  type="text"
                  value={viewSearch}
                  onChange={e => setViewSearch(e.target.value)}
                  placeholder="Search student..."
                  className="w-full bg-[#111726] border border-white/[0.08] text-xs text-white placeholder-slate-500 rounded-lg pl-7 pr-2.5 py-0.5 h-7 focus:outline-none focus:border-blue-500"
                />
              </div>
            </div>

            {/* Desktop Table View */}
            <div className="hidden md:block overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="bg-slate-50 dark:bg-[#111726]/80 border-b border-slate-100 dark:border-white/10">
                    <th className="text-left text-xs font-semibold text-slate-500 dark:text-slate-400 px-4 py-3">Rank</th>
                    <th className="text-left text-xs font-semibold text-slate-500 dark:text-slate-400 px-4 py-3">Student</th>
                    <th className="text-center text-xs font-semibold text-slate-500 dark:text-slate-400 px-4 py-3">Class</th>
                    <th className="text-center text-xs font-semibold text-slate-500 dark:text-slate-400 px-4 py-3">Marks</th>
                    <th className="text-center text-xs font-semibold text-slate-500 dark:text-slate-400 px-4 py-3">%</th>
                    <th className="text-center text-xs font-semibold text-slate-500 dark:text-slate-400 px-4 py-3">Status</th>
                    <th className="text-center text-xs font-semibold text-slate-500 dark:text-slate-400 px-4 py-3">Grade</th>
                  </tr>
                </thead>
                <tbody>
                  {viewStudents.length === 0 ? (
                    <tr><td colSpan={7} className="text-center py-10 text-slate-500 text-sm">No students found.</td></tr>
                  ) : (
                    viewStudents.map((s, idx) => {
                      const mark = Number(viewExam.marks[s.id]);
                      const pct = Math.round((mark / viewExam.maxMarks) * 100);
                      const { grade, color, bg } = getGrade(pct);
                      const passed = pct >= 33;
                      return (
                        <tr key={s.id} className="border-b border-slate-100 dark:border-white/[0.06] last:border-0 hover:bg-slate-50 dark:hover:bg-white/[0.04] transition-colors">
                          <td className="px-4 py-3">
                            <span className={`text-xs font-bold w-7 h-7 rounded-full flex items-center justify-center ${idx === 0 ? "bg-amber-500/20 text-amber-300 border border-amber-500/30" : idx === 1 ? "bg-slate-400/20 text-slate-300 border border-slate-400/30" : idx === 2 ? "bg-orange-500/20 text-orange-300 border border-orange-500/30" : "bg-white/[0.04] text-slate-400 border border-white/[0.06]"}`}>{idx + 1}</span>
                          </td>
                          <td className="px-4 py-3">
                            <div className="flex items-center gap-2.5">
                              <div className="w-7 h-7 rounded-full flex items-center justify-center flex-shrink-0 text-[10px] font-bold text-white" style={{ background: `hsl(${(String(s.rollNumber).charCodeAt(0) * 47) % 360}, 60%, 55%)` }}>{String(s.name || "S").split(" ").map(n => n[0]).join("").slice(0, 2)}</div>
                              <div>
                                <p className="text-sm font-semibold text-slate-900 dark:text-white">{s.name}</p>
                                <p className="text-[10px] text-slate-400">Roll #{s.rollNumber}</p>
                              </div>
                            </div>
                          </td>
                          <td className="px-4 py-3 text-center"><span className="text-[10px] font-semibold text-blue-400 bg-blue-500/10 border border-blue-500/20 px-1.5 py-0.5 rounded">{s.class}-{s.section}</span></td>
                          <td className="px-4 py-3 text-center"><span className="text-sm font-bold text-slate-900 dark:text-white">{mark}</span><span className="text-xs text-slate-500">/{viewExam.maxMarks}</span></td>
                          <td className="px-4 py-3 text-center">
                            <div className="flex flex-col items-center gap-1">
                              <span className="text-xs font-semibold text-slate-900 dark:text-white">{pct}%</span>
                              <div className="w-16 h-1.5 bg-slate-100 dark:bg-white/10 rounded-full overflow-hidden"><div className="h-full rounded-full" style={{ width: `${pct}%`, background: pct >= 75 ? "#10B981" : pct >= 50 ? "#F59E0B" : "#EF4444" }} /></div>
                            </div>
                          </td>
                          <td className="px-4 py-3 text-center">{passed ? <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 px-2 py-0.5 rounded-full"><Check size={10} /> Pass</span> : <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-rose-400 bg-rose-500/10 border border-rose-500/20 px-2 py-0.5 rounded-full"><AlertCircle size={10} /> Fail</span>}</td>
                          <td className="px-4 py-3 text-center"><span className={`text-xs font-bold px-2 py-0.5 rounded border ${bg} ${color}`}>{grade}</span></td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>

            {/* Mobile View Cards */}
            <div className="md:hidden divide-y divide-slate-100 dark:divide-white/[0.06]">
              {viewStudents.length === 0 ? (
                <div className="text-center py-8 text-slate-500 text-xs">No students found.</div>
              ) : (
                viewStudents.map((s, idx) => {
                  const mark = Number(viewExam.marks[s.id]);
                  const pct = Math.round((mark / viewExam.maxMarks) * 100);
                  const { grade, color, bg } = getGrade(pct);
                  const passed = pct >= 33;
                  return (
                    <div
                      key={s.id}
                      className="px-3 py-2 hover:bg-slate-50 dark:hover:bg-white/[0.02] transition-colors flex items-center justify-between gap-2"
                    >
                      <div className="flex items-center gap-2 min-w-0 flex-1">
                        <span className={`text-[10px] font-bold w-4 h-4 rounded-full flex items-center justify-center shrink-0 ${
                          idx === 0 ? "bg-amber-500/20 text-amber-300 border border-amber-500/30" :
                          idx === 1 ? "bg-slate-400/20 text-slate-300 border border-slate-400/30" :
                          idx === 2 ? "bg-orange-500/20 text-orange-300 border border-orange-500/30" :
                          "bg-white/[0.04] text-slate-400 border border-white/[0.06]"
                        }`}>
                          {idx + 1}
                        </span>
                        <div
                          className="w-6 h-6 rounded-full flex items-center justify-center shrink-0 text-[9px] font-bold text-white shadow-2xs"
                          style={{ background: `hsl(${(String(s.rollNumber).charCodeAt(0) * 47) % 360}, 60%, 55%)` }}
                        >
                          {String(s.name || "S").split(" ").map(n => n[0]).join("").slice(0, 2)}
                        </div>
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-1.5">
                            <p className="text-xs font-semibold text-slate-900 dark:text-white truncate">{s.name}</p>
                            <span className="text-[9px] font-medium text-slate-400 shrink-0">#{s.rollNumber}</span>
                          </div>
                          <div className="flex items-center gap-1.5 text-[10px] text-slate-500">
                            <span className="text-blue-400 font-medium">{s.class}-{s.section}</span>
                            <span>&bull;</span>
                            <span className={passed ? "text-emerald-400 font-semibold" : "text-rose-400 font-semibold"}>
                              {pct}% ({passed ? "Pass" : "Fail"})
                            </span>
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center gap-2 shrink-0">
                        <div className="text-right">
                          <span className="text-xs font-bold text-slate-900 dark:text-white">{mark}</span>
                          <span className="text-[10px] text-slate-400">/{viewExam.maxMarks}</span>
                        </div>
                        <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded border min-w-[24px] text-center ${bg} ${color}`}>
                          {grade}
                        </span>
                      </div>
                    </div>
                  );
                })
              )}
            </div>

            <div className="px-4 py-3 border-t border-slate-100 dark:border-white/10 bg-slate-50/50 dark:bg-[#111726]/80"><p className="text-xs text-slate-500 dark:text-slate-400">Showing {viewStudents.length} students &bull; Max Marks: {viewExam.maxMarks}</p></div>
          </div>
        </div>
      )}

      {/* ── MODALS ── */}
      {canEdit && (
        <>
          <ExamModal
            open={examModal.open}
            exam={examModal.exam}
            students={students}
            teacherScope={teacherScope}
            onSave={handleSaveExamFromModal}
            onClose={() => setExamModal({ open: false, exam: null })}
          />

          <Modal open={!!deleteTarget} onClose={() => setDeleteTarget(null)} title="Delete Exam">
            <div className="space-y-4">
              <p className="text-sm text-slate-600 dark:text-slate-300">
                Are you sure you want to delete <span className="font-bold text-slate-900 dark:text-white">"{deleteTarget?.name}"</span>? All recorded marks for this exam will be permanently removed.
              </p>
              <div className="flex gap-3 justify-end">
                <button onClick={() => setDeleteTarget(null)} className="btn-secondary cursor-pointer">Cancel</button>
                <button onClick={() => handleDelete(deleteTarget)} className="btn-danger cursor-pointer">Delete Exam</button>
              </div>
            </div>
          </Modal>

          <Modal open={clearAllOpen} onClose={() => setClearAllOpen(false)} title="Delete All Exams">
            <div className="space-y-4">
              <p className="text-sm text-slate-600 dark:text-slate-300">
                Are you sure you want to delete <span className="font-bold text-rose-500">all {exams.length} exam records</span>?
              </p>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                This will permanently remove all exams and recorded marks across all classes and subjects for both Admin and Teacher portals. This action cannot be undone.
              </p>
              <div className="flex gap-3 justify-end pt-2">
                <button onClick={() => setClearAllOpen(false)} className="btn-secondary cursor-pointer">Cancel</button>
                <button onClick={handleClearAll} className="btn-danger flex items-center gap-1.5 cursor-pointer">
                  <Trash2 size={14} /> Delete All Exams
                </button>
              </div>
            </div>
          </Modal>
        </>
      )}
    </div>
  );
}
