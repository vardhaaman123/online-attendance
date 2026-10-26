import { useState, useMemo, useEffect, useRef } from 'react';
import { Plus, Search, Edit2, Trash2, Eye, Download, Upload, MoreVertical, Key, Sparkles, RefreshCw, CheckSquare, X, ChevronRight } from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { useAuth } from '../../context/AuthContext';
import { calcStudentAttendancePercentage } from '../../utils/attendanceCalc';
import { getTeacherScope } from '../../utils/teacherScope';
import Modal from '../ui/Modal';
import CustomSelect from '../ui/CustomSelect';
import StudentProfileModal from './StudentProfileModal';
import AddEditStudentModal from './AddEditStudentModal';
import CredentialSlipModal from './CredentialSlipModal';
import Papa from 'papaparse';
import * as XLSX from 'xlsx';

function ConfirmDeleteModal({ open, student, onConfirm, onClose }) {
  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Delete Student"
      maxWidth="max-w-md"
      footer={
        <div className="flex gap-3 justify-end w-full">
          <button onClick={onClose} className="btn-secondary px-4 py-2 cursor-pointer">Cancel</button>
          <button onClick={onConfirm} className="btn-danger px-4 py-2 cursor-pointer">Delete Student</button>
        </div>
      }
    >
      <div className="space-y-4">
        <p className="text-sm text-slate-300">
          Are you sure you want to delete{' '}
          <span className="font-bold text-white">{student?.name}</span>?
          This action cannot be undone.
        </p>
      </div>
    </Modal>
  );
}

function ConfirmDeleteSelectedModal({ open, selectedStudents, onConfirm, onClose, isDeleting }) {
  return (
    <Modal
      open={open}
      onClose={onClose}
      title={`Delete ${selectedStudents.length} Selected Students`}
      maxWidth="max-w-md"
      footer={
        <div className="flex gap-3 justify-end w-full">
          <button onClick={onClose} disabled={isDeleting} className="btn-secondary px-4 py-2 cursor-pointer">
            Cancel
          </button>
          <button
            onClick={onConfirm}
            disabled={isDeleting || selectedStudents.length === 0}
            className="btn-danger px-4 py-2 flex items-center gap-1.5 cursor-pointer"
          >
            <Trash2 size={14} />
            {isDeleting ? 'Deleting...' : `Delete ${selectedStudents.length} Students`}
          </button>
        </div>
      }
    >
      <div className="space-y-4">
        <div className="p-3.5 rounded-xl bg-red-500/10 border border-red-500/20 text-red-300 text-xs flex items-start gap-2.5">
          <Trash2 size={16} className="text-red-400 flex-shrink-0 mt-0.5" />
          <div className="space-y-1">
            <p className="font-semibold text-red-200">Warning: Permanent Deletion</p>
            <p className="leading-relaxed">
              This will permanently delete the <strong>{selectedStudents.length} selected students</strong> and their attendance records. Their login credentials will also be revoked.
            </p>
          </div>
        </div>

        <div className="max-h-48 overflow-y-auto divide-y divide-white/5 border border-white/10 rounded-xl">
          {selectedStudents.map((s) => (
            <div key={s.id || s._docId} className="p-2.5 flex items-center justify-between text-xs">
              <div className="min-w-0 pr-2">
                <p className="font-semibold text-slate-200 truncate">{s.name}</p>
                <p className="text-[10px] text-slate-400">Class {s.class}-{s.section} · Roll #{s.rollNumber}</p>
              </div>
              <span className="text-[10px] font-mono text-slate-400 bg-white/5 px-1.5 py-0.5 rounded">
                #{s.rollNumber}
              </span>
            </div>
          ))}
        </div>

        <p className="text-xs text-slate-400">
          This action cannot be undone. Are you sure you want to proceed?
        </p>
      </div>
    </Modal>
  );
}

function DeleteClassModal({ open, selectedClass, availableClasses, students, onConfirm, onClose }) {
  const [target, setTarget] = useState(selectedClass || 'all');

  useEffect(() => {
    if (open) {
      if (selectedClass && selectedClass !== 'all' && availableClasses.includes(selectedClass)) {
        setTarget(selectedClass);
      } else if (availableClasses.length > 0) {
        setTarget(availableClasses[0]);
      } else {
        setTarget('all');
      }
    }
  }, [open, selectedClass, availableClasses]);

  const targetCount = useMemo(() => {
    if (target === 'all') return students.length;
    return students.filter(s => String(s.class) === String(target)).length;
  }, [target, students]);

  const isAll = target === 'all';

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={isAll ? "Delete All Classes & Students" : `Delete Class ${target}`}
      maxWidth="max-w-md"
      footer={
        <div className="flex gap-3 justify-end w-full">
          <button onClick={onClose} className="btn-secondary px-4 py-2 cursor-pointer">Cancel</button>
          <button
            onClick={() => onConfirm(target)}
            disabled={targetCount === 0}
            className="btn-danger px-4 py-2 flex items-center gap-1.5 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
          >
            <Trash2 size={14} />
            {isAll ? `Delete All Students (${targetCount})` : `Delete Class ${target} (${targetCount})`}
          </button>
        </div>
      }
    >
      <div className="space-y-4">
        <div>
          <label className="block text-xs font-semibold text-slate-300 mb-1.5">
            Select Class to Delete:
          </label>
          <select
            value={target}
            onChange={(e) => setTarget(e.target.value)}
            className="input-field w-full bg-[#111726] border border-white/10 text-white rounded-xl px-3 py-2 text-sm focus:outline-none"
          >
            {availableClasses.map(c => {
              const count = students.filter(s => String(s.class) === String(c)).length;
              return (
                <option key={c} value={c}>
                  Class {c} ({count} {count === 1 ? 'student' : 'students'})
                </option>
              );
            })}
            <option value="all">
              ⚠️ All Classes ({students.length} total students)
            </option>
          </select>
        </div>

        <div className="p-3.5 rounded-xl bg-red-500/10 border border-red-500/20 text-red-300 text-xs flex items-start gap-2.5">
          <Trash2 size={16} className="text-red-400 flex-shrink-0 mt-0.5" />
          <div className="space-y-1">
            <p className="font-semibold text-red-200">Warning: Permanent Deletion</p>
            <p className="leading-relaxed">
              {isAll ? (
                <>This will permanently delete <strong>all {targetCount} students</strong> across all classes and remove all their attendance records.</>
              ) : (
                <>This will automatically delete <strong>Class {target}</strong> and all <strong>{targetCount} enrolled students</strong>, including their attendance records.</>
              )}
            </p>
          </div>
        </div>

        <p className="text-xs text-slate-400">
          This action cannot be undone. Are you sure you want to proceed?
        </p>
      </div>
    </Modal>
  );
}

export default function StudentList() {
  const { students, saveStudents, deleteStudent, deleteMultipleStudents, deleteClass, attendanceRecords, addToast, refreshStudents, recentlyUpdatedStudentId } = useApp();
  const { role, user, activeCollegeId } = useAuth();
  const isTeacher = role === 'teacher';
  const teacherScope = useMemo(() => getTeacherScope(user, role), [user, role]);

  const [search, setSearch] = useState('');
  const [classFilter, setClassFilter] = useState(() => {
    if (isTeacher && teacherScope.allowedClasses.length > 0) {
      return teacherScope.defaultClass;
    }
    return 'all';
  });
  const [sectionFilter, setSectionFilter] = useState(() => {
    if (isTeacher && teacherScope.allowedSections.length > 0) {
      return teacherScope.defaultSection;
    }
    return 'all';
  });
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [isDeleteMode, setIsDeleteMode] = useState(false);
  const [selectedStudentIds, setSelectedStudentIds] = useState([]);
  const [deleteSelectedModalOpen, setDeleteSelectedModalOpen] = useState(false);
  const [isDeletingSelected, setIsDeletingSelected] = useState(false);
  const [deleteClassModalOpen, setDeleteClassModalOpen] = useState(false);
  const [profileStudent, setProfileStudent] = useState(null);
  const [editStudent, setEditStudent] = useState(null);
  const [slipStudent, setSlipStudent] = useState(null);
  const [addOpen, setAddOpen] = useState(false);
  const [activeMenuStudent, setActiveMenuStudent] = useState(null);
  const [isRefreshing, setIsRefreshing] = useState(false);

  const handleToggleMenu = (e, student) => {
    e.stopPropagation();
    setActiveMenuStudent(activeMenuStudent?.id === student.id ? null : student);
  };

  const liveActiveMenuStudent = useMemo(() => {
    if (!activeMenuStudent) return null;
    return (students || []).find(
      s => (s.id && (s.id === activeMenuStudent.id || s._docId === activeMenuStudent.id)) ||
           (s.rollNumber && s.rollNumber === activeMenuStudent.rollNumber)
    ) || activeMenuStudent;
  }, [activeMenuStudent, students]);

  // Lock body scroll when Quick Actions Modal is active
  useEffect(() => {
    if (activeMenuStudent) {
      document.body.style.overflow = 'hidden';
    }
    return () => {
      const hasOtherOpenModals = document.querySelector('.fixed.inset-0.z-\\[60\\]');
      if (!hasOtherOpenModals) {
        document.body.style.overflow = '';
      }
    };
  }, [activeMenuStudent]);

  // Close Quick Actions modal on Escape ONLY if no top child modal is open
  useEffect(() => {
    if (!activeMenuStudent) return;
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') {
        if (slipStudent || profileStudent || editStudent || deleteTarget) return;
        setActiveMenuStudent(null);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [activeMenuStudent, slipStudent, profileStudent, editStudent, deleteTarget]);

  const handleManualRefresh = async () => {
    setIsRefreshing(true);
    try {
      if (refreshStudents) {
        await refreshStudents();
      }
      addToast('Student data refreshed live from cloud.', 'success');
    } catch {
      addToast('Could not refresh students. Please check connection.', 'error');
    } finally {
      setTimeout(() => setIsRefreshing(false), 600);
    }
  };

  // Auto-fetch students if empty on mount without waiting for full page reload
  useEffect(() => {
    if (students.length === 0 && refreshStudents) {
      refreshStudents();
    }
  }, [students.length, refreshStudents]);

  // Synchronize teacher filter bounds if teacher assigned scope changes
  useEffect(() => {
    if (isTeacher && teacherScope.isRestricted) {
      if (teacherScope.allowedClasses.length > 0 && classFilter !== 'all' && !teacherScope.isClassAllowed(classFilter)) {
        setClassFilter(teacherScope.defaultClass);
      }
      if (teacherScope.allowedSections.length > 0 && sectionFilter !== 'all' && !teacherScope.isSectionAllowed(sectionFilter)) {
        setSectionFilter(teacherScope.defaultSection);
      }
    }
  }, [isTeacher, teacherScope, classFilter, sectionFilter]);

  const availableClasses = useMemo(() => {
    if (isTeacher && teacherScope.allowedClasses.length > 0) {
      return teacherScope.allowedClasses;
    }
    const set = new Set(students.map(s => String(s.class || '').trim()).filter(Boolean));
    ['8', '9', '10'].forEach(c => set.add(c));
    return Array.from(set).sort((a, b) => a.localeCompare(b, undefined, { numeric: true }));
  }, [isTeacher, teacherScope, students]);

  const availableSections = useMemo(() => {
    if (isTeacher && teacherScope.allowedSections.length > 0) {
      return teacherScope.allowedSections;
    }
    const set = new Set(students.map(s => String(s.section || '').trim().toUpperCase()).filter(Boolean));
    ['A', 'B'].forEach(s => set.add(s));
    return Array.from(set).sort();
  }, [isTeacher, teacherScope, students]);

  const filtered = useMemo(() => {
    let list = (isTeacher && teacherScope.isRestricted) ? teacherScope.filterStudents(students) : students;
    if (search) {
      const q = search.toLowerCase();
      list = list.filter(s =>
        String(s.name || '').toLowerCase().includes(q) ||
        String(s.rollNumber || '').includes(q) ||
        String(s.parentName || '').toLowerCase().includes(q)
      );
    }
    if (classFilter !== 'all') {
      const cleanFilter = String(classFilter).trim().replace(/^(class|cls)\.?\s*/i, '').replace(/(st|nd|rd|th)$/i, '');
      list = list.filter(s => {
        const cleanS = String(s.class || '').trim().replace(/^(class|cls)\.?\s*/i, '').replace(/(st|nd|rd|th)$/i, '');
        return cleanS === cleanFilter;
      });
    }
    if (sectionFilter !== 'all') {
      const cleanSec = String(sectionFilter).trim().toUpperCase();
      list = list.filter(s => String(s.section || '').trim().toUpperCase() === cleanSec);
    }
    return [...list].sort((a, b) => String(a.name || '').localeCompare(String(b.name || '')));
  }, [students, search, classFilter, sectionFilter, isTeacher, teacherScope]);

  const handleDelete = async () => {
    if (!deleteTarget) return;
    await deleteStudent(deleteTarget.id || deleteTarget._docId);
    addToast(`${deleteTarget.name} has been removed.`, 'info');
    setActiveMenuStudent(null);
    setDeleteTarget(null);
  };

  const handleConfirmDeleteClass = async (targetClass) => {
    const count = await deleteClass(targetClass);
    if (targetClass === 'all') {
      addToast(`All classes and ${count} students have been deleted.`, 'info');
      setClassFilter('all');
    } else {
      addToast(`Class ${targetClass} and ${count} students have been deleted.`, 'info');
      if (classFilter === targetClass) {
        setClassFilter('all');
      }
    }
    setDeleteClassModalOpen(false);
  };

  const isAllSelected = !isTeacher && filtered.length > 0 && filtered.every(s => selectedStudentIds.includes(s.id || s._docId));

  const handleToggleSelectAll = () => {
    if (isAllSelected) {
      const filteredIds = new Set(filtered.map(s => s.id || s._docId));
      setSelectedStudentIds(prev => prev.filter(id => !filteredIds.has(id)));
    } else {
      const allIds = new Set([...selectedStudentIds, ...filtered.map(s => s.id || s._docId)]);
      setSelectedStudentIds(Array.from(allIds));
    }
  };

  const handleToggleSelectStudent = (id) => {
    setSelectedStudentIds(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]);
  };

  const selectedStudentsObjects = useMemo(() => {
    const set = new Set(selectedStudentIds);
    return students.filter(s => set.has(s.id) || set.has(s._docId));
  }, [students, selectedStudentIds]);

  const handleDeleteSelected = async () => {
    setIsDeletingSelected(true);
    try {
      if (deleteMultipleStudents) {
        await deleteMultipleStudents(selectedStudentIds);
      }
      addToast(`${selectedStudentIds.length} students deleted successfully.`, 'info');
      setSelectedStudentIds([]);
      setIsDeleteMode(false);
      setDeleteSelectedModalOpen(false);
    } catch (err) {
      console.error('Failed to delete selected students:', err);
      addToast('Failed to delete selected students.', 'error');
    } finally {
      setIsDeletingSelected(false);
    }
  };

  const handleExportCSV = () => {
    const data = filtered.map(s => ({
      'Roll No': s.rollNumber,
      'Name': s.name,
      'Class': s.class,
      'Section': s.section,
      'Parent': s.parentName,
      'Contact': s.contact,
    }));
    const csv = Papa.unparse(data);
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = 'students.csv'; a.click();
    URL.revokeObjectURL(url);
    addToast('Student list exported as CSV.', 'success');
  };

  const handleImportSheet = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = async (evt) => {
      try {
        const data = new Uint8Array(evt.target.result);
        const workbook = XLSX.read(data, { type: 'array' });
        const firstSheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[firstSheetName];
        const rows = XLSX.utils.sheet_to_json(worksheet, { defval: '' });

        if (!rows || rows.length === 0) {
          addToast('The uploaded sheet is empty.', 'error');
          return;
        }

        const getVal = (row, keys) => {
          for (const k of keys) {
            if (row[k] !== undefined && String(row[k]).trim() !== '') {
              return String(row[k]).trim();
            }
            const matchedKey = Object.keys(row).find(
              rk => rk.trim().toLowerCase() === k.toLowerCase()
            );
            if (matchedKey && row[matchedKey] !== undefined && String(row[matchedKey]).trim() !== '') {
              return String(row[matchedKey]).trim();
            }
          }
          return '';
        };

        const effectiveCollege = user?.collegeId || activeCollegeId || 'dps_main';
        const defaultClass = isTeacher && teacherScope.defaultClass ? teacherScope.defaultClass : (classFilter !== 'all' ? classFilter : '8');
        const defaultSec = isTeacher && teacherScope.defaultSection ? teacherScope.defaultSection : (sectionFilter !== 'all' ? sectionFilter : 'A');

        const newStudents = rows
          .map((row, i) => {
            const name = getVal(row, ['Name', 'Student Name', 'Full Name']);
            if (!name) return null;
            return {
              id: `STU_${Date.now()}_${i}_${Math.random().toString(36).substring(2, 7)}`,
              rollNumber: getVal(row, ['Roll No', 'Roll Number', 'RollNo', 'Roll']) || String(i + 1).padStart(2, '0'),
              name,
              class: getVal(row, ['Class', 'Grade', 'Standard']) || defaultClass,
              section: (getVal(row, ['Section', 'Division', 'Sec']) || defaultSec).toUpperCase(),
              parentName: getVal(row, ['Parent', 'Parent Name', 'Father Name', 'Guardian']) || '',
              contact: getVal(row, ['Contact', 'Phone', 'Mobile', 'Mobile Number']) || '',
              email: getVal(row, ['Email', 'Email Address', 'Gmail']) || `${name.toLowerCase().replace(/[^a-z0-9]/g, '.')}@school.edu`,
              status: 'active',
              password: getVal(row, ['Password', 'Pass', 'Pin']) || '1234',
              collegeId: effectiveCollege,
              createdAt: new Date().toISOString(),
            };
          })
          .filter(Boolean);

        if (newStudents.length === 0) {
          addToast('No valid student rows found in the sheet.', 'error');
          return;
        }

        await saveStudents([...students, ...newStudents]);
        addToast(`${newStudents.length} students imported successfully.`, 'success');
      } catch (err) {
        console.error('Import error:', err);
        addToast('Failed to parse sheet. Please ensure it is a valid .xlsx, .xls, or .csv file.', 'error');
      }
    };
    reader.readAsArrayBuffer(file);
    e.target.value = '';
  };

  const liveProfileStudent = useMemo(() => {
    if (!profileStudent) return null;
    return (students || []).find(s => (s.id && (s.id === profileStudent.id || s._docId === profileStudent.id)) || (s.rollNumber && s.rollNumber === profileStudent.rollNumber)) || profileStudent;
  }, [profileStudent, students]);

  const liveEditStudent = useMemo(() => {
    if (!editStudent) return null;
    return (students || []).find(s => (s.id && (s.id === editStudent.id || s._docId === editStudent.id)) || (s.rollNumber && s.rollNumber === editStudent.rollNumber)) || editStudent;
  }, [editStudent, students]);

  const liveSlipStudent = useMemo(() => {
    if (!slipStudent) return null;
    return (students || []).find(s => (s.id && (s.id === slipStudent.id || s._docId === slipStudent.id)) || (s.rollNumber && s.rollNumber === slipStudent.rollNumber)) || slipStudent;
  }, [slipStudent, students]);

  return (
    <div className={`w-full space-y-5 animate-fade-in ${!isTeacher && isDeleteMode ? "pb-24 sm:pb-28" : ""}`}>
      {/* Header Actions */}
      <div className="flex items-center justify-between gap-2 sm:gap-3 pb-0.5">
        <h1 className="text-xl sm:text-2xl font-bold text-slate-900 dark:text-white tracking-tight">
          {isTeacher ? 'My Students' : 'Students'}
        </h1>
        {/* Action Option Buttons (Adjusted Size, Expandable on Hover with Smooth Spring Physics) */}
        <div className="flex items-center gap-1 sm:gap-1.5 flex-shrink-0">
          {/* Live Refresh */}
          <button
            type="button"
            onClick={handleManualRefresh}
            disabled={isRefreshing}
            className="group relative inline-flex items-center justify-center h-8 sm:h-8.5 px-2.5 rounded-xl bg-white/80 dark:bg-[#111726]/80 border border-slate-200/80 dark:border-white/10 hover:bg-slate-100 dark:hover:bg-white/10 text-slate-700 dark:text-slate-200 hover:text-slate-900 dark:hover:text-white shadow-xs backdrop-blur-xl transition-colors duration-200 cursor-pointer active:scale-95 disabled:opacity-60 select-none"
            title="Live Refresh"
            aria-label="Live Refresh"
          >
            <RefreshCw size={14} className={`flex-shrink-0 ${isRefreshing ? 'animate-spin text-blue-400' : 'text-slate-400 group-hover:text-blue-400 transition-colors'}`} />
            <span className="expandable-btn-grid">
              <span className="expandable-btn-inner">
                <span className="expandable-btn-text text-xs font-semibold">
                  {isRefreshing ? 'Refreshing...' : 'Live Refresh'}
                </span>
              </span>
            </span>
          </button>

          {/* Import Sheet */}
          <label
            className="group relative inline-flex items-center justify-center h-8 sm:h-8.5 px-2.5 rounded-xl bg-white/80 dark:bg-[#111726]/80 border border-slate-200/80 dark:border-white/10 hover:bg-slate-100 dark:hover:bg-white/10 text-slate-700 dark:text-slate-200 hover:text-slate-900 dark:hover:text-white shadow-xs backdrop-blur-xl transition-colors duration-200 cursor-pointer active:scale-95 select-none"
            title="Import Excel"
            aria-label="Import Excel"
          >
            <Upload size={14} className="flex-shrink-0 text-slate-400 group-hover:text-indigo-400 transition-colors" />
            <span className="expandable-btn-grid">
              <span className="expandable-btn-inner">
                <span className="expandable-btn-text text-xs font-semibold">
                  Import Sheet
                </span>
              </span>
            </span>
            <input type="file" accept=".xlsx,.xls,.csv" className="hidden" onChange={handleImportSheet} />
          </label>

          {/* Export CSV */}
          <button
            type="button"
            onClick={handleExportCSV}
            className="group relative inline-flex items-center justify-center h-8 sm:h-8.5 px-2.5 rounded-xl bg-white/80 dark:bg-[#111726]/80 border border-slate-200/80 dark:border-white/10 hover:bg-slate-100 dark:hover:bg-white/10 text-slate-700 dark:text-slate-200 hover:text-slate-900 dark:hover:text-white shadow-xs backdrop-blur-xl transition-colors duration-200 cursor-pointer active:scale-95 select-none"
            title="Export CSV"
            aria-label="Export CSV"
          >
            <Download size={14} className="flex-shrink-0 text-slate-400 group-hover:text-emerald-400 transition-colors" />
            <span className="expandable-btn-grid">
              <span className="expandable-btn-inner">
                <span className="expandable-btn-text text-xs font-semibold">
                  Export CSV
                </span>
              </span>
            </span>
          </button>

          {/* Delete mode / Specific delete */}
          {!isTeacher && (
            <button
              type="button"
              onClick={() => {
                if (isDeleteMode) {
                  setIsDeleteMode(false);
                  setSelectedStudentIds([]);
                } else {
                  setIsDeleteMode(true);
                }
              }}
              className={`group relative inline-flex items-center justify-center h-8 sm:h-8.5 px-2.5 rounded-xl border shadow-xs backdrop-blur-xl transition-colors duration-200 cursor-pointer active:scale-95 select-none ${
                isDeleteMode
                  ? 'bg-rose-500/20 text-rose-400 border-rose-500/50 shadow-[0_0_12px_rgba(244,63,94,0.3)] font-semibold'
                  : 'text-rose-400 hover:text-rose-300 bg-rose-500/10 hover:bg-rose-500/20 border-rose-500/20'
              }`}
              title={isDeleteMode ? 'Cancel delete mode' : 'Select and delete specific students'}
              aria-label={isDeleteMode ? 'Cancel delete mode' : 'Delete students'}
            >
              {isDeleteMode ? <X size={14} className="flex-shrink-0 text-rose-400" /> : <Trash2 size={14} className="flex-shrink-0 text-rose-400" />}
              <span className="expandable-btn-grid">
                <span className="expandable-btn-inner">
                  <span className="expandable-btn-text text-xs font-semibold">
                    {isDeleteMode ? 'Cancel' : 'Delete Students'}
                  </span>
                </span>
              </span>
            </button>
          )}

          {/* Add Student / Enroll Student */}
          <button
            type="button"
            onClick={() => setAddOpen(true)}
            className="group relative inline-flex items-center justify-center h-8 sm:h-8.5 px-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 border border-blue-400/30 text-white shadow-[0_0_15px_rgba(59,130,246,0.35)] hover:shadow-[0_0_20px_rgba(59,130,246,0.5)] transition-colors duration-200 cursor-pointer active:scale-95 select-none"
            title={isTeacher ? 'Enroll Student' : 'Add Student'}
            aria-label={isTeacher ? 'Enroll Student' : 'Add Student'}
          >
            <Plus size={14} className="flex-shrink-0 text-white" />
            <span className="expandable-btn-grid">
              <span className="expandable-btn-inner">
                <span className="expandable-btn-text text-xs font-semibold">
                  {isTeacher ? 'Enroll Student' : 'Add Student'}
                </span>
              </span>
            </span>
          </button>
        </div>
      </div>

      {/* Quick Section/Class Switcher for Teachers */}
      {isTeacher && teacherScope.isRestricted && (
        <div className="flex items-center gap-2 flex-wrap">
          {teacherScope.allowedSections.length > 1 ? (
            <>
              <button
                type="button"
                onClick={() => setSectionFilter('all')}
                className={`px-3 py-1.5 rounded-xl text-xs font-semibold border transition-all cursor-pointer ${
                  sectionFilter === 'all'
                    ? 'bg-blue-600 text-white border-blue-500 shadow-md shadow-blue-500/20'
                    : 'bg-white dark:bg-[#111726] text-slate-600 dark:text-slate-400 border-slate-200 dark:border-white/10 hover:text-white'
                }`}
              >
                All Sections ({teacherScope.filterStudents(students).length})
              </button>
              {teacherScope.allowedSections.map(sec => {
                const count = teacherScope.filterStudents(students).filter(s => String(s.section || '').trim().toUpperCase() === sec).length;
                return (
                  <button
                    key={sec}
                    type="button"
                    onClick={() => setSectionFilter(sec)}
                    className={`px-3 py-1.5 rounded-xl text-xs font-semibold border transition-all cursor-pointer ${
                      sectionFilter === sec
                        ? 'bg-blue-600 text-white border-blue-500 shadow-md shadow-blue-500/20'
                        : 'bg-white dark:bg-[#111726] text-slate-600 dark:text-slate-400 border-slate-200 dark:border-white/10 hover:text-white'
                    }`}
                  >
                    Section {sec} ({count})
                  </button>
                );
              })}
            </>
          ) : (
            <div className="px-3 py-1.5 rounded-xl text-xs font-semibold bg-blue-500/10 text-blue-400 border border-blue-500/20">
              ★ Assigned: Class {teacherScope.allowedClasses.join(', ')} - Section {teacherScope.allowedSections.join(', ') || 'All'} ({teacherScope.filterStudents(students).length} Students)
            </div>
          )}
        </div>
      )}

      {/* Helper Banner for Teacher if their assigned class has 0 students */}
      {isTeacher && teacherScope.isRestricted && filtered.length === 0 && (
        <div className="rounded-2xl p-4 bg-gradient-to-r from-blue-500/10 via-indigo-500/10 to-blue-500/10 border border-blue-500/20 text-xs text-blue-200 flex items-center gap-3 shadow-lg animate-fade-in">
          <div className="w-8 h-8 rounded-xl bg-blue-500/20 flex items-center justify-center text-blue-400 flex-shrink-0">
            <Sparkles size={16} />
          </div>
          <div>
            <p className="font-semibold text-white">
              No students found in your assigned Class {teacherScope.allowedClasses.join(', ')} (Section {teacherScope.allowedSections.join(', ') || 'All'}).
            </p>
            <p className="text-slate-400 mt-0.5">
              Please contact your administrator or enroll new students using the "Enroll Student" button above.
            </p>
          </div>
        </div>
      )}

      {/* Filters: Search Bar & Class / Section Selectors */}
      <div className="rounded-2xl bg-white dark:bg-[#0B0F1A]/80 border border-slate-200/80 dark:border-white/10 p-2 sm:p-3 backdrop-blur-xl shadow-[0_4px_25px_rgba(0,0,0,0.3)] relative z-20">
        <div className="flex items-center gap-1.5 sm:gap-2.5 w-full">
          {/* Search Bar - fills available space */}
          <div className="flex-1 min-w-0 relative">
            <Search size={15} className="absolute left-3 sm:left-3.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
            <input
              type="text"
              placeholder="Search students..."
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="input-field pl-8 sm:pl-10 py-2 sm:py-2.5 text-xs sm:text-sm w-full truncate"
            />
          </div>

          {/* Dropdown Selectors - compact, content-fitting */}
          <div className="flex items-center gap-1.5 sm:gap-2 flex-shrink-0">
            <CustomSelect
              value={classFilter}
              onChange={e => setClassFilter(e.target.value)}
              className="input-field w-auto py-2 sm:py-2.5 px-2.5 sm:px-3.5 text-xs sm:text-sm whitespace-nowrap"
            >
              <option value="all">
                {isTeacher && teacherScope.isRestricted ? `All Assigned (${teacherScope.filterStudents(students).length})` : `Classes (${students.length})`}
              </option>
              {availableClasses.map(c => {
                const baseList = isTeacher && teacherScope.isRestricted ? teacherScope.filterStudents(students) : students;
                const count = baseList.filter(s => String(s.class || '').trim().replace(/^(class|cls)\.?\s*/i, '').replace(/(st|nd|rd|th)$/i, '') === String(c).trim().replace(/^(class|cls)\.?\s*/i, '').replace(/(st|nd|rd|th)$/i, '')).length;
                return (
                  <option key={c} value={c}>
                    Class {c} ({count}) {isTeacher && teacherScope.isClassAllowed(c) ? '★' : ''}
                  </option>
                );
              })}
            </CustomSelect>

            <CustomSelect
              value={sectionFilter}
              onChange={e => setSectionFilter(e.target.value)}
              className="input-field w-auto py-2 sm:py-2.5 px-2.5 sm:px-3.5 text-xs sm:text-sm whitespace-nowrap"
              align="right"
            >
              <option value="all">Section</option>
              {availableSections.map(s => <option key={s} value={s}>Section {s}</option>)}
            </CustomSelect>
            {!isTeacher && classFilter !== 'all' && (
              <button
                type="button"
                onClick={() => setDeleteClassModalOpen(true)}
                className="p-2 sm:px-2.5 sm:py-2 rounded-xl text-xs font-semibold bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 border border-rose-500/20 transition-all flex items-center justify-center flex-shrink-0 cursor-pointer"
                title={`Delete Class ${classFilter} and all its students`}
                aria-label={`Delete Class ${classFilter}`}
              >
                <Trash2 size={13} />
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Floating Bottom Bulk Selection Action Dock (Apple-style) */}
      {!isTeacher && isDeleteMode && (
        <div className="fixed bottom-4 sm:bottom-6 left-3 right-3 sm:left-1/2 sm:-translate-x-1/2 sm:w-full sm:max-w-2xl z-50 p-3 sm:p-3.5 rounded-2xl sm:rounded-3xl bg-[#0B0F1A]/92 border border-rose-500/35 shadow-[0_20px_60px_rgba(0,0,0,0.85),0_0_30px_rgba(244,63,94,0.2),inset_0_1px_0_rgba(255,255,255,0.15)] backdrop-blur-3xl animate-slide-up flex flex-wrap sm:flex-nowrap items-center justify-between gap-2.5 sm:gap-3 text-white">
          <div className="flex items-center gap-2.5 min-w-0">
            <span className="w-2.5 h-2.5 rounded-full bg-rose-500 animate-pulse flex-shrink-0" />
            <span className="text-xs sm:text-sm font-semibold text-white flex items-center gap-1.5 truncate">
              <CheckSquare size={16} className="text-rose-400 flex-shrink-0" />
              {selectedStudentIds.length === 0
                ? 'Select students to delete'
                : `${selectedStudentIds.length} ${selectedStudentIds.length === 1 ? 'student' : 'students'} selected`}
            </span>
          </div>
          <div className="flex items-center gap-2 flex-shrink-0 ml-auto">
            <button
              type="button"
              onClick={handleToggleSelectAll}
              className="text-xs text-rose-300 hover:text-white px-2.5 py-1.5 rounded-xl hover:bg-white/10 transition-colors cursor-pointer select-none"
            >
              {isAllSelected ? 'Deselect All' : `Select All (${filtered.length})`}
            </button>
            <button
              type="button"
              onClick={() => {
                setIsDeleteMode(false);
                setSelectedStudentIds([]);
              }}
              className="text-xs text-slate-300 hover:text-white px-2.5 py-1.5 rounded-xl hover:bg-white/10 transition-colors cursor-pointer select-none"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={() => setDeleteSelectedModalOpen(true)}
              disabled={selectedStudentIds.length === 0}
              className="btn-danger text-xs py-1.5 px-3 flex items-center gap-1.5 cursor-pointer shadow-lg shadow-rose-500/20 disabled:opacity-40 disabled:cursor-not-allowed select-none"
            >
              <Trash2 size={13} />
              Delete ({selectedStudentIds.length})
            </button>
          </div>
        </div>
      )}

      {/* Desktop Table (hidden on mobile, visible on md+) */}
      <div className="hidden md:block rounded-2xl bg-white dark:bg-[#0B0F19]/80 border border-slate-200 dark:border-white/10 shadow-[0_4px_25px_rgba(0,0,0,0.3)] backdrop-blur-xl overflow-hidden relative z-10">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="bg-slate-50 dark:bg-[#111726]/80 border-b border-slate-100 dark:border-white/10">
                {!isTeacher && isDeleteMode && (
                  <th className="w-10 px-4 py-3 text-center animate-fade-in">
                    <input
                      type="checkbox"
                      checked={isAllSelected}
                      onChange={handleToggleSelectAll}
                      className="w-4 h-4 rounded border-slate-300 dark:border-white/20 text-brand-blue focus:ring-brand-blue/30 cursor-pointer accent-blue-500"
                      title={isAllSelected ? "Deselect all" : "Select all"}
                    />
                  </th>
                )}
                <th className="w-24 text-left text-xs font-semibold text-slate-500 dark:text-slate-400 px-5 py-3.5">Roll No</th>
                <th className="text-left text-xs font-semibold text-slate-500 dark:text-slate-400 px-5 py-3.5">Student</th>
                <th className="w-28 text-left text-xs font-semibold text-slate-500 dark:text-slate-400 px-5 py-3.5 hidden md:table-cell">Class</th>
                <th className="text-left text-xs font-semibold text-slate-500 dark:text-slate-400 px-5 py-3.5 hidden lg:table-cell">Parent</th>
                <th className="w-32 text-center text-xs font-semibold text-slate-500 dark:text-slate-400 px-5 py-3.5">Attendance</th>
                <th className="w-24 text-center text-xs font-semibold text-slate-500 dark:text-slate-400 px-5 py-3.5">Actions</th>
              </tr>
            </thead>
            <tbody>
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan={!isTeacher && isDeleteMode ? 7 : 6} className="text-center py-12 text-slate-500 dark:text-slate-400 text-sm">
                    No students found.
                  </td>
                </tr>
              ) : (
                filtered.map(student => {
                  const sId = student.id || student._docId;
                  const isSelected = selectedStudentIds.includes(sId);
                  const isRecentlyUpdated = recentlyUpdatedStudentId && (
                    recentlyUpdatedStudentId === student.id ||
                    recentlyUpdatedStudentId === student._docId ||
                    recentlyUpdatedStudentId === String(student.rollNumber).toLowerCase()
                  );
                  const stats = calcStudentAttendancePercentage(student, attendanceRecords);
                  const pct = stats.percentage;
                  const pctClass = pct >= 85 ? 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30' : pct >= 75 ? 'bg-amber-500/15 text-amber-400 border-amber-500/30' : 'bg-rose-500/15 text-rose-400 border-rose-500/30';
                  return (
                    <tr
                      key={student.id}
                      onClick={!isTeacher && isDeleteMode ? () => handleToggleSelectStudent(sId) : undefined}
                      className={`border-b border-slate-100 dark:border-white/[0.06] last:border-0 hover:bg-slate-50 dark:hover:bg-white/[0.04] transition-all ${
                        !isTeacher && isDeleteMode ? 'cursor-pointer' : ''
                      } ${
                        isSelected ? 'bg-blue-500/[0.07] dark:bg-blue-500/[0.12]' : ''
                      } ${
                        isRecentlyUpdated ? 'bg-emerald-500/[0.08] dark:bg-emerald-500/[0.12] ring-1 ring-emerald-500/40' : ''
                      }`}
                    >
                      {!isTeacher && isDeleteMode && (
                        <td className="w-10 px-4 py-3 text-center animate-fade-in" onClick={(e) => e.stopPropagation()}>
                          <input
                            type="checkbox"
                            checked={isSelected}
                            onChange={() => handleToggleSelectStudent(sId)}
                            className="w-4 h-4 rounded border-slate-300 dark:border-white/20 text-brand-blue focus:ring-brand-blue/30 cursor-pointer accent-blue-500"
                          />
                        </td>
                      )}
                      <td className="px-5 py-3.5">
                        <span className="text-xs font-bold text-slate-500 dark:text-slate-400 bg-slate-100 dark:bg-[#111726] border border-slate-200 dark:border-white/10 px-2 py-0.5 rounded-md font-mono">
                          {student.rollNumber}
                        </span>
                      </td>
                      <td className="px-5 py-3.5">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 text-xs font-bold text-white shadow-xs"
                            style={{ background: `hsl(${(student.rollNumber.charCodeAt(0) * 47) % 360}, 60%, 55%)` }}>
                            {student.name.split(' ').map(n => n[0]).join('').slice(0, 2)}
                          </div>
                          <div>
                            <div className="flex items-center gap-1.5">
                              <p className="text-sm font-semibold text-slate-900 dark:text-white">{student.name}</p>
                              {isRecentlyUpdated && (
                                <span className="inline-flex items-center gap-1 text-[9px] font-semibold text-emerald-400 bg-emerald-500/10 px-1.5 py-0.5 rounded-full border border-emerald-500/20">
                                  <span className="w-1 h-1 rounded-full bg-emerald-400 animate-pulse" />
                                  Live Synced
                                </span>
                              )}
                            </div>
                            <p className="text-[10px] text-slate-400">{student.email}</p>
                          </div>
                        </div>
                      </td>
                      <td className="px-5 py-3.5 hidden md:table-cell">
                        <span className="text-xs bg-blue-500/10 text-blue-400 border border-blue-500/20 font-semibold px-2 py-0.5 rounded-md">
                          {student.class}-{student.section}
                        </span>
                      </td>
                      <td className="px-5 py-3.5 hidden lg:table-cell">
                        <p className="text-xs text-slate-600 dark:text-slate-300">{student.parentName}</p>
                      </td>
                      <td className="px-5 py-3.5 text-center">
                        {stats.total > 0 ? (
                          <span className={`inline-block text-xs font-bold px-2.5 py-0.5 rounded-full border ${pctClass}`}>
                            {pct}%
                          </span>
                        ) : (
                          <span className="text-xs text-slate-400">—</span>
                        )}
                      </td>
                      {/* Actions - Three-Dots Button */}
                      <td className="px-5 py-3.5 text-center">
                        <button
                          type="button"
                          onClick={(e) => handleToggleMenu(e, student)}
                          className={`w-8 h-8 rounded-full inline-flex items-center justify-center transition-all cursor-pointer ${
                            activeMenuStudent?.id === student.id
                              ? 'bg-blue-600 text-white shadow-md shadow-blue-500/25 ring-2 ring-blue-500/40'
                              : 'bg-slate-100 dark:bg-white/10 text-slate-500 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-white/20 hover:text-slate-900 dark:hover:text-white'
                          }`}
                          title="Options"
                        >
                          <MoreVertical size={16} />
                        </button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
        <div className="px-4 py-3 border-t border-slate-100 dark:border-white/10 bg-slate-50/50 dark:bg-[#111726]/80">
          <p className="text-xs text-slate-500 dark:text-slate-400">
            Showing {filtered.length} of {students.length} students
          </p>
        </div>
      </div>

      {/* Mobile Student Cards (visible on < md, zero horizontal scroll) */}
      <div className="md:hidden space-y-3">
        {filtered.length === 0 ? (
          <div className="rounded-2xl bg-white dark:bg-[#0B0F19]/80 border border-slate-200 dark:border-white/10 p-6 text-center text-slate-500 dark:text-slate-400 text-sm">
            No students found.
          </div>
        ) : (
          filtered.map(student => {
            const sId = student.id || student._docId;
            const isSelected = selectedStudentIds.includes(sId);
            const isRecentlyUpdated = recentlyUpdatedStudentId && (
              recentlyUpdatedStudentId === student.id ||
              recentlyUpdatedStudentId === student._docId ||
              recentlyUpdatedStudentId === String(student.rollNumber).toLowerCase()
            );
            const stats = calcStudentAttendancePercentage(student, attendanceRecords);
            const pct = stats.percentage;
            const pctClass = pct >= 85 ? 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30' : pct >= 75 ? 'bg-amber-500/15 text-amber-400 border-amber-500/30' : 'bg-rose-500/15 text-rose-400 border-rose-500/30';

            return (
              <div
                key={student.id}
                className={`rounded-2xl bg-white dark:bg-[#0B0F19]/80 border border-slate-200 dark:border-white/10 p-3.5 sm:p-4 shadow-sm dark:shadow-[0_4px_25px_rgba(0,0,0,0.3)] backdrop-blur-xl relative transition-all ${
                  isSelected ? 'ring-2 ring-blue-500/50 bg-blue-500/[0.04]' : ''
                } ${
                  isRecentlyUpdated ? 'ring-2 ring-emerald-500/50 bg-emerald-500/[0.04]' : ''
                }`}
              >
                {/* Header row: Avatar, Name, Roll No, Class-Section, Attendance %, 3-dots Menu */}
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2.5 min-w-0 flex-1">
                    {!isTeacher && isDeleteMode && (
                      <input
                        type="checkbox"
                        checked={isSelected}
                        onChange={() => handleToggleSelectStudent(sId)}
                        className="w-4 h-4 rounded border-slate-300 dark:border-white/20 text-brand-blue focus:ring-brand-blue/30 cursor-pointer accent-blue-500 flex-shrink-0 animate-fade-in"
                      />
                    )}
                    <div
                      className="w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0 text-xs font-bold text-white shadow-xs"
                      style={{ background: `hsl(${(student.rollNumber.charCodeAt(0) * 47) % 360}, 60%, 55%)` }}
                    >
                      {student.name.split(' ').map(n => n[0]).join('').slice(0, 2)}
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <p className="text-sm font-bold text-slate-900 dark:text-white break-words leading-tight">{student.name}</p>
                        {isRecentlyUpdated && (
                          <span className="inline-flex items-center gap-1 text-[9px] font-semibold text-emerald-400 bg-emerald-500/10 px-1.5 py-0.5 rounded-full border border-emerald-500/20">
                            <span className="w-1 h-1 rounded-full bg-emerald-400 animate-pulse" />
                            Live Synced
                          </span>
                        )}
                      </div>
                      <div className="flex items-center gap-1.5 mt-1 flex-wrap">
                        <span className="text-[10px] font-bold text-slate-500 dark:text-slate-400 bg-slate-100 dark:bg-[#111726] border border-slate-200 dark:border-white/10 px-1.5 py-0.5 rounded font-mono">
                          Roll #{student.rollNumber}
                        </span>
                        <span className="text-[10px] bg-blue-500/10 text-blue-400 border border-blue-500/20 font-semibold px-1.5 py-0.5 rounded">
                          Class {student.class}-{student.section}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Right side: Attendance Badge & 3-dots Kebab Menu */}
                  <div className="flex items-center gap-1.5 flex-shrink-0">
                    {stats.total > 0 ? (
                      <span className={`inline-block text-xs font-extrabold px-2.5 py-1 rounded-full border ${pctClass}`}>
                        {pct}%
                      </span>
                    ) : (
                      <span className="text-xs text-slate-400 font-medium">—</span>
                    )}

                    {/* Kebab 3-dots menu button */}
                    <button
                      type="button"
                      onClick={(e) => handleToggleMenu(e, student)}
                      className={`w-8 h-8 rounded-full flex items-center justify-center transition-all cursor-pointer ${
                        activeMenuStudent?.id === student.id
                          ? 'bg-blue-600 text-white shadow-md shadow-blue-500/25 ring-2 ring-blue-500/40'
                          : 'bg-slate-100 dark:bg-white/10 text-slate-500 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-white/20 hover:text-slate-900 dark:hover:text-white'
                      }`}
                      title="Options"
                    >
                      <MoreVertical size={16} />
                    </button>
                  </div>
                </div>
              </div>
            );
          })
        )}

        <div className="px-2 py-2 text-center text-xs text-slate-500 dark:text-slate-400">
          Showing {filtered.length} of {students.length} students
        </div>
      </div>

      {/* ── Centered Student Quick Actions Modal ── */}
      {activeMenuStudent && (() => {
        const currentStudent = liveActiveMenuStudent || activeMenuStudent;
        return (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 overflow-y-auto animate-fade-in">
            {/* Frosted Dark Backdrop */}
            <div
              className="fixed inset-0 bg-black/75 backdrop-blur-md transition-opacity cursor-pointer"
              onClick={() => setActiveMenuStudent(null)}
            />

            {/* Centered Modal Card */}
            <div className="relative w-full max-w-sm sm:max-w-md bg-[#0C101A]/95 dark:bg-[#0B0F19]/95 border border-white/15 rounded-3xl shadow-[0_24px_70px_rgba(0,0,0,0.85),0_0_35px_rgba(59,130,246,0.18)] backdrop-blur-2xl overflow-hidden animate-modal-pop z-10 select-none">
              {/* Top ambient illumination glow */}
              <div className="absolute inset-x-0 top-0 h-[1.5px] bg-gradient-to-r from-transparent via-blue-400/50 to-transparent pointer-events-none" />

              {/* Header: Student Info + Close button */}
              <div className="p-4 sm:p-5 border-b border-white/10 flex items-center justify-between gap-3">
                <div className="flex items-center gap-3 min-w-0">
                  <div
                    className="w-11 h-11 rounded-2xl flex items-center justify-center flex-shrink-0 text-sm font-bold text-white shadow-md border border-white/20"
                    style={{ background: `hsl(${(String(currentStudent.rollNumber || '0').charCodeAt(0) * 47) % 360}, 60%, 55%)` }}
                  >
                    {String(currentStudent.name || 'S').split(' ').map(n => n[0]).join('').slice(0, 2)}
                  </div>
                  <div className="min-w-0">
                    <h3 className="text-sm sm:text-base font-bold text-white truncate leading-tight">
                      {currentStudent.name}
                    </h3>
                    <div className="flex items-center gap-1.5 mt-1 flex-wrap">
                      <span className="text-[10px] font-mono font-bold px-1.5 py-0.5 rounded bg-slate-100 dark:bg-white/10 text-slate-300">
                        Roll #{currentStudent.rollNumber}
                      </span>
                      <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded bg-blue-500/15 text-blue-400 border border-blue-500/20">
                        Class {currentStudent.class}-{currentStudent.section}
                      </span>
                    </div>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => setActiveMenuStudent(null)}
                  className="w-8 h-8 rounded-full bg-white/[0.06] hover:bg-white/[0.12] border border-white/10 text-slate-400 hover:text-white flex items-center justify-center transition-all cursor-pointer flex-shrink-0 active:scale-95"
                  title="Close"
                >
                  <X size={16} />
                </button>
              </div>

              {/* Action Items List */}
              <div className="p-4 space-y-2.5">
                {/* Login Slip */}
                <button
                  type="button"
                  onClick={() => {
                    setSlipStudent(currentStudent);
                  }}
                  className="group w-full h-[62px] min-h-[62px] p-2.5 sm:p-3 rounded-2xl bg-white/[0.03] hover:bg-emerald-500/10 border border-white/[0.06] hover:border-emerald-500/30 flex items-center justify-between gap-3 transition-all duration-200 cursor-pointer active:scale-[0.98] text-left"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="w-10 h-10 rounded-xl bg-emerald-500/15 border border-emerald-500/25 flex items-center justify-center text-emerald-400 flex-shrink-0 group-hover:scale-105 transition-transform shadow-[0_0_12px_rgba(16,185,129,0.2)]">
                      <Key size={18} />
                    </div>
                    <div className="min-w-0">
                      <p className="text-xs sm:text-sm font-semibold text-white group-hover:text-emerald-300 transition-colors">
                        Login Slip
                      </p>
                      <p className="text-[10px] sm:text-[11px] text-slate-400 truncate">
                        Print or download student credentials slip
                      </p>
                    </div>
                  </div>
                  <ChevronRight size={16} className="text-slate-500 group-hover:text-emerald-400 group-hover:translate-x-0.5 transition-all flex-shrink-0" />
                </button>

                {/* View Profile */}
                <button
                  type="button"
                  onClick={() => {
                    setProfileStudent(currentStudent);
                  }}
                  className="group w-full h-[62px] min-h-[62px] p-2.5 sm:p-3 rounded-2xl bg-white/[0.03] hover:bg-blue-500/10 border border-white/[0.06] hover:border-blue-500/30 flex items-center justify-between gap-3 transition-all duration-200 cursor-pointer active:scale-[0.98] text-left"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="w-10 h-10 rounded-xl bg-blue-500/15 border border-blue-500/25 flex items-center justify-center text-blue-400 flex-shrink-0 group-hover:scale-105 transition-transform shadow-[0_0_12px_rgba(59,130,246,0.2)]">
                      <Eye size={18} />
                    </div>
                    <div className="min-w-0">
                      <p className="text-xs sm:text-sm font-semibold text-white group-hover:text-blue-300 transition-colors">
                        View Profile
                      </p>
                      <p className="text-[10px] sm:text-[11px] text-slate-400 truncate">
                        Attendance stats, parent contacts & bio
                      </p>
                    </div>
                  </div>
                  <ChevronRight size={16} className="text-slate-500 group-hover:text-blue-400 group-hover:translate-x-0.5 transition-all flex-shrink-0" />
                </button>

                {/* Edit Details */}
                <button
                  type="button"
                  onClick={() => {
                    const fresh = (students || []).find(
                      x => (x.id && (x.id === currentStudent.id || x._docId === currentStudent.id)) || (x.rollNumber && x.rollNumber === currentStudent.rollNumber)
                    ) || currentStudent;
                    setEditStudent(fresh);
                  }}
                  className="group w-full h-[62px] min-h-[62px] p-2.5 sm:p-3 rounded-2xl bg-white/[0.03] hover:bg-amber-500/10 border border-white/[0.06] hover:border-amber-500/30 flex items-center justify-between gap-3 transition-all duration-200 cursor-pointer active:scale-[0.98] text-left"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="w-10 h-10 rounded-xl bg-amber-500/15 border border-amber-500/25 flex items-center justify-center text-amber-400 flex-shrink-0 group-hover:scale-105 transition-transform shadow-[0_0_12px_rgba(245,158,11,0.2)]">
                      <Edit2 size={18} />
                    </div>
                    <div className="min-w-0">
                      <p className="text-xs sm:text-sm font-semibold text-white group-hover:text-amber-300 transition-colors">
                        Edit Details
                      </p>
                      <p className="text-[10px] sm:text-[11px] text-slate-400 truncate">
                        Update student name, roll number, or class
                      </p>
                    </div>
                  </div>
                  <ChevronRight size={16} className="text-slate-500 group-hover:text-amber-400 group-hover:translate-x-0.5 transition-all flex-shrink-0" />
                </button>

                {/* Delete Student */}
                <button
                  type="button"
                  onClick={() => {
                    setDeleteTarget(currentStudent);
                  }}
                  className="group w-full h-[62px] min-h-[62px] p-2.5 sm:p-3 rounded-2xl bg-white/[0.03] hover:bg-rose-500/10 border border-white/[0.06] hover:border-rose-500/30 flex items-center justify-between gap-3 transition-all duration-200 cursor-pointer active:scale-[0.98] text-left"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="w-10 h-10 rounded-xl bg-rose-500/15 border border-rose-500/25 flex items-center justify-center text-rose-400 flex-shrink-0 group-hover:scale-105 transition-transform shadow-[0_0_12px_rgba(244,63,94,0.2)]">
                      <Trash2 size={18} />
                    </div>
                    <div className="min-w-0">
                      <p className="text-xs sm:text-sm font-semibold text-rose-400 group-hover:text-rose-300 transition-colors">
                        Delete Student
                      </p>
                      <p className="text-[10px] sm:text-[11px] text-slate-400 truncate">
                        Permanently remove student from register
                      </p>
                    </div>
                  </div>
                  <ChevronRight size={16} className="text-slate-500 group-hover:text-rose-400 group-hover:translate-x-0.5 transition-all flex-shrink-0" />
                </button>
              </div>

              {/* Footer Dismiss Button */}
              <div className="px-4 pb-4 pt-1">
                <button
                  type="button"
                  onClick={() => setActiveMenuStudent(null)}
                  className="w-full py-2.5 rounded-xl bg-white/[0.05] hover:bg-white/[0.1] text-xs font-semibold text-slate-300 hover:text-white transition-colors cursor-pointer text-center"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        );
      })()}

      <ConfirmDeleteSelectedModal
        open={deleteSelectedModalOpen}
        selectedStudents={selectedStudentsObjects}
        onConfirm={handleDeleteSelected}
        onClose={() => !isDeletingSelected && setDeleteSelectedModalOpen(false)}
        isDeleting={isDeletingSelected}
      />
      <ConfirmDeleteModal
        open={!!deleteTarget}
        student={deleteTarget}
        onConfirm={handleDelete}
        onClose={() => setDeleteTarget(null)}
      />
      <DeleteClassModal
        open={deleteClassModalOpen}
        selectedClass={classFilter}
        availableClasses={availableClasses}
        students={students}
        onConfirm={handleConfirmDeleteClass}
        onClose={() => setDeleteClassModalOpen(false)}
      />
      <StudentProfileModal
        open={!!profileStudent}
        student={liveProfileStudent}
        onClose={() => setProfileStudent(null)}
      />
      <AddEditStudentModal
        open={addOpen || !!editStudent}
        student={liveEditStudent}
        onClose={() => { setAddOpen(false); setEditStudent(null); }}
        onStudentSaved={(savedStudent) => {
          setSlipStudent(savedStudent);
        }}
      />
      <CredentialSlipModal
        open={!!slipStudent}
        student={liveSlipStudent}
        onClose={() => setSlipStudent(null)}
      />
    </div>
  );
}
