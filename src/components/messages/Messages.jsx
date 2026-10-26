import { useState, useMemo, useEffect, useRef, useCallback } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useApp } from '../../context/AppContext';
import {
  Send,
  Users,
  User,
  UserCheck,
  MessageSquare,
  Search,
  Smile,
  Trash2,
  Copy,
  Check,
  CheckCheck,
  Megaphone,
  X,
  Clock,
  GraduationCap,
  ShieldCheck,
  Plus,
  FileText,
  Image as ImageIcon,
  Camera,
  ChevronLeft,
  Lock,
  CheckSquare,
  CornerUpLeft,
} from 'lucide-react';
import Modal from '../ui/Modal';
import {
  VideoCallProvider,
  VideoCallButton,
  IncomingCallOverlay,
  ActiveCallScreen,
  MissedCallMessage,
} from './VideoCall';

const EMOJIS = ['👍', '❤️', '🎉', '👏', '📢', '⏰', '📝', '✅'];

export default function Messages() {
  const { role, user, currentStudent } = useAuth();
  const { teachers, students, messages, addMessage, deleteMessage, deleteMessagesForMe, reactToMessage, markMessagesAsRead, addToast } = useApp();

  const [activeTab, setActiveTab] = useState('broadcast');
  const [selectedRecipientId, setSelectedRecipientId] = useState('all');
  const [mobileView, setMobileView] = useState('list'); // 'list' | 'chat'
  const [messageText, setMessageText] = useState('');
  const [teacherSearch, setTeacherSearch] = useState('');

  const [studentSearch, setStudentSearch] = useState('');
  const [chatSearch, setChatSearch] = useState('');
  const [showSearchInput, setShowSearchInput] = useState(false);
  const [showEmojiBar, setShowEmojiBar] = useState(false);
  const [showAttachmentMenu, setShowAttachmentMenu] = useState(false);
  const [copiedId, setCopiedId] = useState(null);
  const [isSelectMode, setIsSelectMode] = useState(false);
  const [selectedMsgIds, setSelectedMsgIds] = useState(new Set());
  const [deleteTarget, setDeleteTarget] = useState(null); // null | { isBatch: true } | { isBatch: false, msg: any }
  const [isDeleting, setIsDeleting] = useState(false);
  const [replyingTo, setReplyingTo] = useState(null);

  const messagesEndRef = useRef(null);
  const fileInputRef = useRef(null);
  const markedReadRef = useRef(new Set());

  const normRole = (role || 'admin').toLowerCase();

  // Resolve current logged-in identity against collections for rock-solid ID mapping
  const currentTeacherRecord = useMemo(() => {
    if (normRole !== 'teacher') return null;
    return (teachers || []).find((t) =>
      (user?.id && (t.id === user.id || t._docId === user.id)) ||
      (user?.email && t.email && t.email.toLowerCase().trim() === user.email.toLowerCase().trim()) ||
      (user?.name && t.name && t.name.toLowerCase().trim() === user.name.toLowerCase().trim())
    ) || user;
  }, [teachers, normRole, user]);

  const currentStudentRecord = useMemo(() => {
    if (normRole !== 'student') return null;
    return (students || []).find((s) => {
      if (!currentStudent) return false;
      const sId = s.id || s._docId;
      const cId = currentStudent.id || currentStudent._docId;
      if (cId && (sId === cId || s._docId === cId)) return true;
      if (currentStudent.rollNumber && s.rollNumber) {
        const sRoll = String(s.rollNumber).toLowerCase().trim();
        const cRoll = String(currentStudent.rollNumber).toLowerCase().trim();
        if (sRoll === cRoll || sRoll.replace(/^0+/, '') === cRoll.replace(/^0+/, '')) return true;
      }
      if (currentStudent.email && s.email && s.email.toLowerCase().trim() === currentStudent.email.toLowerCase().trim()) return true;
      if (currentStudent.email && s.parentEmail && s.parentEmail.toLowerCase().trim() === currentStudent.email.toLowerCase().trim()) return true;
      if (currentStudent.parentEmail && s.parentEmail && s.parentEmail.toLowerCase().trim() === currentStudent.parentEmail.toLowerCase().trim()) return true;
      if (currentStudent.parentEmail && s.email && s.email.toLowerCase().trim() === currentStudent.parentEmail.toLowerCase().trim()) return true;
      if (currentStudent.name && s.name && s.name.toLowerCase().trim() === currentStudent.name.toLowerCase().trim()) return true;
      return false;
    }) || currentStudent;
  }, [students, normRole, currentStudent]);

  const myId = useMemo(() => {
    if (normRole === 'student') return currentStudentRecord?.id || currentStudentRecord?._docId || currentStudent?.id || currentStudent?._docId || 'student';
    if (normRole === 'admin') return 'admin';
    return currentTeacherRecord?.id || currentTeacherRecord?._docId || user?.id || user?.uid || 'admin';
  }, [normRole, currentStudentRecord, currentStudent, currentTeacherRecord, user]);

  const myAllIds = useMemo(() => {
    if (normRole === 'student') {
      const rawRoll = currentStudentRecord?.rollNumber || currentStudent?.rollNumber;
      const strippedRoll = rawRoll ? String(rawRoll).trim().replace(/^0+/, '') : null;
      const paddedRoll = rawRoll ? String(rawRoll).trim().padStart(3, '0') : null;
      return [
        currentStudentRecord?.id,
        currentStudentRecord?._docId,
        currentStudentRecord?.entityId,
        currentStudent?.id,
        currentStudent?._docId,
        currentStudent?.entityId,
        rawRoll ? String(rawRoll).trim() : null,
        strippedRoll,
        paddedRoll,
        currentStudentRecord?.email?.toLowerCase().trim(),
        currentStudent?.email?.toLowerCase().trim(),
        currentStudentRecord?.parentEmail?.toLowerCase().trim(),
        currentStudent?.parentEmail?.toLowerCase().trim(),
        currentStudentRecord?.name?.toLowerCase().trim(),
        currentStudent?.name?.toLowerCase().trim(),
      ].filter(Boolean);
    }
    if (normRole === 'admin') {
      return ['admin', user?.uid, user?.id, user?.email?.toLowerCase().trim()].filter(Boolean);
    }
    return [
      currentTeacherRecord?.id,
      currentTeacherRecord?._docId,
      currentTeacherRecord?.entityId,
      user?.id,
      user?.uid,
      currentTeacherRecord?.email?.toLowerCase().trim(),
      user?.email?.toLowerCase().trim(),
      currentTeacherRecord?.name?.toLowerCase().trim(),
      user?.name?.toLowerCase().trim(),
    ].filter(Boolean);
  }, [normRole, currentStudentRecord, currentStudent, currentTeacherRecord, user]);

  // Track messages hidden locally via "Delete for me"
  const [deletedForMeIds, setDeletedForMeIds] = useState(() => {
    try {
      const stored = typeof window !== 'undefined' && myId ? localStorage.getItem(`_attendify_deleted_for_me_${myId}`) : null;
      return stored ? new Set(JSON.parse(stored)) : new Set();
    } catch {
      return new Set();
    }
  });

  useEffect(() => {
    try {
      const stored = typeof window !== 'undefined' && myId ? localStorage.getItem(`_attendify_deleted_for_me_${myId}`) : null;
      setDeletedForMeIds(stored ? new Set(JSON.parse(stored)) : new Set());
    } catch {
      setDeletedForMeIds(new Set());
    }
  }, [myId]);

  // Check if message has been deleted for the current user
  const isDeletedForMe = useCallback((msg) => {
    if (!msg) return false;
    const id = msg.id || msg._docId;
    if (id && deletedForMeIds.has(id)) return true;
    if (Array.isArray(msg.deletedFor)) {
      if (myId && msg.deletedFor.includes(myId)) return true;
      if (myAllIds.some((uid) => msg.deletedFor.includes(uid))) return true;
    }
    return false;
  }, [deletedForMeIds, myId, myAllIds]);

  // Selected recipient entity resolution
  const selectedTeacher = useMemo(() => {
    if (activeTab !== 'teachers' && selectedRecipientId !== 'teachers') return null;
    if (!selectedRecipientId) return null;
    return (teachers || []).find((t) => {
      const tId = t.id || t._docId;
      if (tId && tId === selectedRecipientId) return true;
      if (t.email && t.email.trim().toLowerCase() === String(selectedRecipientId).trim().toLowerCase()) return true;
      return false;
    }) || null;
  }, [activeTab, selectedRecipientId, teachers]);

  const selectedStudent = useMemo(() => {
    if (activeTab !== 'students' && selectedRecipientId !== 'students') return null;
    if (!selectedRecipientId) return null;
    return (students || []).find((s) => {
      const sId = s.id || s._docId;
      if (sId && sId === selectedRecipientId) return true;
      if (s.rollNumber && (String(s.rollNumber).trim() === String(selectedRecipientId).trim() || String(s.rollNumber).trim().replace(/^0+/, '') === String(selectedRecipientId).trim().replace(/^0+/, ''))) return true;
      if (s.email && s.email.trim().toLowerCase() === String(selectedRecipientId).trim().toLowerCase()) return true;
      if (s.parentEmail && s.parentEmail.trim().toLowerCase() === String(selectedRecipientId).trim().toLowerCase()) return true;
      return false;
    }) || null;
  }, [activeTab, selectedRecipientId, students]);

  const recipientAllIds = useMemo(() => {
    if (activeTab === 'teachers' && selectedTeacher) {
      return [
        selectedTeacher.id,
        selectedTeacher._docId,
        selectedTeacher.entityId,
        selectedTeacher.email?.toLowerCase().trim(),
        selectedTeacher.name?.toLowerCase().trim(),
      ].filter(Boolean);
    }
    if (activeTab === 'students' && selectedStudent) {
      const rawRoll = selectedStudent.rollNumber;
      const strippedRoll = rawRoll ? String(rawRoll).trim().replace(/^0+/, '') : null;
      const paddedRoll = rawRoll ? String(rawRoll).trim().padStart(3, '0') : null;
      return [
        selectedStudent.id,
        selectedStudent._docId,
        selectedStudent.entityId,
        rawRoll ? String(rawRoll).trim() : null,
        strippedRoll,
        paddedRoll,
        selectedStudent.email?.toLowerCase().trim(),
        selectedStudent.parentEmail?.toLowerCase().trim(),
        selectedStudent.name?.toLowerCase().trim(),
      ].filter(Boolean);
    }
    return [selectedRecipientId].filter(Boolean);
  }, [activeTab, selectedTeacher, selectedStudent, selectedRecipientId]);

  // Robust student matching helpers for multi-device / roll number formatting consistency
  const normalizeRoll = useCallback((roll) => (roll != null ? String(roll).trim().toLowerCase().replace(/^0+/, '') : ''), []);

  const matchesStudent = useCallback((stu, id, roll, email, name) => {
    if (!stu) return false;
    const sId = stu.id || stu._docId;
    if (id && (sId === id || stu.entityId === id)) return true;
    if (roll && stu.rollNumber) {
      const r1 = normalizeRoll(roll);
      const r2 = normalizeRoll(stu.rollNumber);
      if (r1 && r2 && r1 === r2) return true;
    }
    if (email) {
      const cleanEmail = String(email).trim().toLowerCase();
      if (stu.email && stu.email.trim().toLowerCase() === cleanEmail) return true;
      if (stu.parentEmail && stu.parentEmail.trim().toLowerCase() === cleanEmail) return true;
    }
    if (name && stu.name) {
      if (stu.name.trim().toLowerCase() === String(name).trim().toLowerCase()) return true;
    }
    return false;
  }, [normalizeRoll]);

  const isMsgTargetStudent = useCallback((msg, stu, stuAllIds = []) => {
    if (!stu && stuAllIds.length === 0) return false;
    const targetId = msg.targetId;
    if (stuAllIds.length > 0 && targetId && stuAllIds.includes(targetId)) return true;
    if (stu && matchesStudent(stu, targetId, msg.targetRollNumber, msg.targetEmail || msg.targetParentEmail, msg.targetName)) return true;
    if (targetId && students && stu) {
      const found = students.find((s) => (s.id || s._docId) === targetId);
      if (found && matchesStudent(stu, found.id, found.rollNumber, found.email || found.parentEmail, found.name)) return true;
    }
    return false;
  }, [students, matchesStudent]);

  const isMsgSenderStudent = useCallback((msg, stu, stuAllIds = []) => {
    if (!stu && stuAllIds.length === 0) return false;
    const senderId = msg.senderId;
    if (stuAllIds.length > 0 && senderId && stuAllIds.includes(senderId)) return true;
    if (stu && matchesStudent(stu, senderId, msg.senderRollNumber, msg.senderEmail, msg.senderName)) return true;
    if (senderId && students && stu) {
      const found = students.find((s) => (s.id || s._docId) === senderId);
      if (found && matchesStudent(stu, found.id, found.rollNumber, found.email || found.parentEmail, found.name)) return true;
    }
    return false;
  }, [students, matchesStudent]);

  // Auto scroll to bottom
  useEffect(() => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages, selectedRecipientId, activeTab]);

  // Unread calculation helpers placed before filtered lists for sorting
  const getUnreadCount = useCallback((tab, recId) => {
    return (messages || []).filter(msg => {
      if (isDeletedForMe(msg)) return false;
      const msgSenderRole = (msg.senderRole || '').toLowerCase();
      const msgTargetRole = (msg.targetRole || '').toLowerCase();
      const isMyMsg =
        myAllIds.includes(msg.senderId) ||
        (normRole === 'admin' && (msgSenderRole === 'admin' || msg.senderId === 'admin')) ||
        (normRole === 'student' && isMsgSenderStudent(msg, currentStudentRecord || currentStudent, myAllIds));
      if (isMyMsg) return false;

      const isRead = Array.isArray(msg.readBy) && (myAllIds.some(id => msg.readBy.includes(id)) || msg.readBy.includes(myId));
      if (isRead) return false;

      if (tab === 'broadcast') {
        if (recId === 'admin') {
          if (normRole === 'student') {
            return (msgSenderRole === 'admin' || msg.senderId === 'admin') &&
              (isMsgTargetStudent(msg, currentStudentRecord || currentStudent, myAllIds) || myAllIds.includes(msg.targetId));
          }
          return (msgSenderRole === 'admin' || msg.senderId === 'admin') && myAllIds.includes(msg.targetId);
        } else if (msg.targetId === 'all') {
          if (recId === 'all') return msgTargetRole === 'all' || !msgTargetRole;
          if (recId === 'teachers') return msgTargetRole === 'teacher';
          if (recId === 'students') return msgTargetRole === 'student';
        }
      } else if (tab === 'teachers') {
        const teacherObj = (teachers || []).find(t => t.id === recId || t._docId === recId);
        const tIds = [recId, teacherObj?.id, teacherObj?._docId, teacherObj?.email?.toLowerCase()].filter(Boolean);
        if (normRole === 'admin') {
          return tIds.includes(msg.senderId) && (msgTargetRole === 'admin' || msg.targetId === 'admin' || myAllIds.includes(msg.targetId));
        }
        if (normRole === 'student') {
          return tIds.includes(msg.senderId) && (myAllIds.includes(msg.targetId) || isMsgTargetStudent(msg, currentStudentRecord || currentStudent, myAllIds));
        }
        return tIds.includes(msg.senderId) && myAllIds.includes(msg.targetId);
      } else if (tab === 'students') {
        const studentObj = (students || []).find(s => s.id === recId || s._docId === recId);
        if (normRole === 'admin') {
          return isMsgSenderStudent(msg, studentObj, [recId]) && (msgTargetRole === 'admin' || msg.targetId === 'admin' || myAllIds.includes(msg.targetId));
        }
        if (normRole === 'student') {
          return false;
        }
        return isMsgSenderStudent(msg, studentObj, [recId]) && myAllIds.includes(msg.targetId);
      }
      return false;
    }).length;
  }, [messages, normRole, myId, myAllIds, teachers, students, currentStudentRecord, currentStudent, isMsgSenderStudent, isMsgTargetStudent, isDeletedForMe]);

  const getTabUnreadCount = useCallback((tab) => {
    return (messages || []).filter(msg => {
      if (isDeletedForMe(msg)) return false;
      const msgSenderRole = (msg.senderRole || '').toLowerCase();
      const msgTargetRole = (msg.targetRole || '').toLowerCase();
      const isMyMsg =
        myAllIds.includes(msg.senderId) ||
        (normRole === 'admin' && (msgSenderRole === 'admin' || msg.senderId === 'admin')) ||
        (normRole === 'student' && isMsgSenderStudent(msg, currentStudentRecord || currentStudent, myAllIds));
      if (isMyMsg) return false;

      const isRead = Array.isArray(msg.readBy) && (myAllIds.some(id => msg.readBy.includes(id)) || msg.readBy.includes(myId));
      if (isRead) return false;

      if (tab === 'broadcast') {
        if (msg.targetId === 'all') {
          if (normRole === 'admin') return true;
          if (normRole === 'teacher' && (msgTargetRole === 'teacher' || msgTargetRole === 'all' || !msgTargetRole)) return true;
          if (normRole === 'student' && (msgTargetRole === 'student' || msgTargetRole === 'all' || !msgTargetRole)) return true;
        }
        if (normRole !== 'student' && (msgSenderRole === 'admin' || msg.senderId === 'admin') && myAllIds.includes(msg.targetId)) return true;
      } else if (tab === 'teachers') {
        if (normRole === 'admin') {
          return (msgSenderRole === 'teacher' || !msgSenderRole) && (msgTargetRole === 'admin' || msg.targetId === 'admin' || myAllIds.includes(msg.targetId));
        }
        if (normRole === 'student') {
          return (msgSenderRole === 'teacher' || !msgSenderRole) && (myAllIds.includes(msg.targetId) || isMsgTargetStudent(msg, currentStudentRecord || currentStudent, myAllIds));
        }
        return msgSenderRole === 'teacher' && myAllIds.includes(msg.targetId);
      } else if (tab === 'students') {
        if (normRole === 'admin') {
          return (msgSenderRole === 'student' || !msgSenderRole) && (msgTargetRole === 'admin' || msg.targetId === 'admin' || myAllIds.includes(msg.targetId));
        }
        if (normRole === 'student') {
          return false;
        }
        return msgSenderRole === 'student' && myAllIds.includes(msg.targetId);
      }
      return false;
    }).length;
  }, [messages, normRole, myId, myAllIds, currentStudentRecord, currentStudent, isMsgSenderStudent, isMsgTargetStudent, isDeletedForMe]);

  const totalUnread = useMemo(() => {
    if (normRole === 'student') {
      return getTabUnreadCount('broadcast') + getTabUnreadCount('teachers');
    }
    return getTabUnreadCount('broadcast') + getTabUnreadCount('students') + getTabUnreadCount('teachers');
  }, [getTabUnreadCount, normRole]);

  // Teachers list - on student desktop, teachers with unread or recent messages come first!
  const filteredTeachers = useMemo(() => {
    const list = (teachers || [])
      .filter((t) => {
        // Exclude self if logged in as teacher
        if (normRole === 'teacher') {
          if (myAllIds.includes(t.id)) return false;
          if (t._docId && myAllIds.includes(t._docId)) return false;
          if (t.email && myAllIds.includes(t.email.toLowerCase().trim())) return false;
          if (user?.name && t.name && t.name.toLowerCase().trim() === user.name.toLowerCase().trim()) return false;
        }
        return true;
      })
      .filter(
        (t) =>
          (t.name || '').toLowerCase().includes((teacherSearch || '').toLowerCase()) ||
          (t.subject && t.subject.toLowerCase().includes((teacherSearch || '').toLowerCase()))
      );

    return [...list].sort((a, b) => {
      const aId = a.id || a._docId;
      const bId = b.id || b._docId;
      const aUnread = getUnreadCount('teachers', aId);
      const bUnread = getUnreadCount('teachers', bId);

      // Unread messages first
      if (aUnread > 0 && bUnread === 0) return -1;
      if (aUnread === 0 && bUnread > 0) return 1;
      if (aUnread !== bUnread) return bUnread - aUnread;

      // Teachers who sent any recent messages
      const aLastMsg = (messages || [])
        .filter((m) => (m.senderId === aId || m.targetId === aId || (a.email && (m.senderEmail === a.email.toLowerCase() || m.targetEmail === a.email.toLowerCase()))))
        .slice(-1)[0];
      const bLastMsg = (messages || [])
        .filter((m) => (m.senderId === bId || m.targetId === bId || (b.email && (m.senderEmail === b.email.toLowerCase() || m.targetEmail === b.email.toLowerCase()))))
        .slice(-1)[0];

      if (aLastMsg && !bLastMsg) return -1;
      if (!aLastMsg && bLastMsg) return 1;
      if (aLastMsg && bLastMsg) {
        const timeDiff = new Date(bLastMsg.timestamp || 0) - new Date(aLastMsg.timestamp || 0);
        if (timeDiff !== 0) return timeDiff;
      }

      // If student has a class teacher, sort matching class
      if (normRole === 'student' && currentStudentRecord?.class) {
        const aClassMatch = String(a.class) === String(currentStudentRecord.class);
        const bClassMatch = String(b.class) === String(currentStudentRecord.class);
        if (aClassMatch && !bClassMatch) return -1;
        if (!aClassMatch && bClassMatch) return 1;
      }

      return (a.name || '').localeCompare(b.name || '');
    });
  }, [teachers, teacherSearch, normRole, myAllIds, user, getUnreadCount, messages, currentStudentRecord]);

  const filteredStudents = useMemo(() => {
    const list = (students || [])
      .filter((s) => {
        // Exclude self if logged in as student
        if (normRole === 'student') {
          if (s.id && myAllIds.includes(s.id)) return false;
          if (s._docId && myAllIds.includes(s._docId)) return false;
          if (s.email && myAllIds.includes(s.email.toLowerCase().trim())) return false;
          if (s.rollNumber && myAllIds.includes(String(s.rollNumber).toLowerCase().trim())) return false;
        }
        return true;
      })
      .filter(
        (s) =>
          (s.name || '').toLowerCase().includes((studentSearch || '').toLowerCase()) ||
          (s.rollNumber && String(s.rollNumber).includes(studentSearch || '')) ||
          (`${s.class}-${s.section}`).toLowerCase().includes((studentSearch || '').toLowerCase())
      );

    // If logged in as student, sort classmates in the same class to the top
    if (normRole === 'student' && currentStudentRecord?.class) {
      return [...list].sort((a, b) => {
        const aSameClass = String(a.class) === String(currentStudentRecord.class);
        const bSameClass = String(b.class) === String(currentStudentRecord.class);
        if (aSameClass && !bSameClass) return -1;
        if (!aSameClass && bSameClass) return 1;
        return (a.name || '').localeCompare(b.name || '');
      });
    }

    return list;
  }, [students, studentSearch, normRole, myAllIds, currentStudentRecord]);

  // Ensure valid recipient selection when switching tabs or when filtered list changes
  useEffect(() => {
    setReplyingTo(null);
    if (normRole === 'student' && activeTab === 'students') {
      setActiveTab('broadcast');
      setSelectedRecipientId('all');
      return;
    }
    if (activeTab === 'broadcast') {
      const allowed = normRole === 'student'
        ? ['all', 'students']
        : normRole === 'admin'
        ? ['all', 'students', 'teachers']
        : ['all', 'teachers', 'students', 'admin'];
      if (!allowed.includes(selectedRecipientId)) {
        setSelectedRecipientId('all');
      }
    } else if (activeTab === 'teachers') {
      const exists = filteredTeachers.some((t) => (t.id || t._docId) === selectedRecipientId);
      if (!exists && filteredTeachers.length > 0) {
        setSelectedRecipientId(filteredTeachers[0].id || filteredTeachers[0]._docId);
      }
    } else if (activeTab === 'students') {
      const exists = filteredStudents.some((s) => (s.id || s._docId) === selectedRecipientId);
      if (!exists && filteredStudents.length > 0) {
        setSelectedRecipientId(filteredStudents[0].id || filteredStudents[0]._docId);
      }
    }
  }, [activeTab, selectedRecipientId, filteredTeachers, filteredStudents, normRole]);

  // If student has unread teacher messages, prioritize switching to teacher tab so it comes first
  const studentInitialTeacherCheck = useRef(false);
  useEffect(() => {
    if (!studentInitialTeacherCheck.current && normRole === 'student' && filteredTeachers.length > 0) {
      const unreadTeachers = getTabUnreadCount('teachers');
      if (unreadTeachers > 0) {
        studentInitialTeacherCheck.current = true;
        setActiveTab('teachers');
        const firstTeacherId = filteredTeachers[0]?.id || filteredTeachers[0]?._docId;
        if (firstTeacherId) setSelectedRecipientId(firstTeacherId);
      }
    }
  }, [normRole, filteredTeachers, getTabUnreadCount]);

  const handleAttachmentClick = (type) => {
    if (normRole === 'student' && activeTab !== 'teachers') return;
    if (!fileInputRef.current) return;
    if (type === 'image') {
      fileInputRef.current.accept = 'image/*,video/*';
      fileInputRef.current.removeAttribute('capture');
    } else if (type === 'camera') {
      fileInputRef.current.accept = 'image/*,video/*';
      fileInputRef.current.setAttribute('capture', 'environment');
    } else {
      fileInputRef.current.accept = '.pdf,.doc,.docx,.txt,.xls,.csv';
      fileInputRef.current.removeAttribute('capture');
    }
    fileInputRef.current.click();
    setShowAttachmentMenu(false);
  };

  const handleFileChange = (e) => {
    if (normRole === 'student' && activeTab !== 'teachers') return;
    const file = e.target.files?.[0];
    if (!file) return;

    const isImage = file.type.startsWith('image/');
    
    const reader = new FileReader();
    reader.onload = (event) => {
      const base64Url = event.target.result;
      
      // Send message with attachment
      handleSend('', {
        type: isImage ? 'image' : 'document',
        name: file.name,
        url: base64Url,
      });
    };
    reader.readAsDataURL(file);
    e.target.value = '';
  };

  const handleSend = (textToSend, attachment = null) => {
    if (normRole === 'student') {
      if (activeTab !== 'teachers') {
        addToast?.('Students can only message teachers. Broadcast channels are read-only.', 'warning');
        return;
      }
      if (!selectedRecipientId || selectedRecipientId === 'all' || selectedRecipientId === 'admin') {
        addToast?.('Please select a teacher to send a message.', 'warning');
        return;
      }
    }
    const text = (typeof textToSend === 'string' ? textToSend : messageText).trim();
    if (!text && !attachment) return;

    let targetRole = '';
    let targetId = 'all';

    if (activeTab === 'broadcast') {
      if (normRole === 'student') {
        addToast?.('Broadcast announcements can only be posted by school staff.', 'warning');
        return;
      }
      if (selectedRecipientId === 'admin') {
        targetRole = 'admin';
        targetId = 'admin';
      } else {
        targetRole = selectedRecipientId === 'students' ? 'student' : selectedRecipientId === 'teachers' ? 'teacher' : 'all';
        targetId = 'all';
      }
    } else if (activeTab === 'teachers') {
      targetRole = 'teacher';
      targetId = selectedRecipientId;
      if (!targetId) {
        addToast?.('Please select a teacher to send a message.', 'warning');
        return;
      }
    } else if (activeTab === 'students') {
      if (normRole === 'student') {
        addToast?.('Students cannot send direct messages to other students.', 'warning');
        return;
      }
      targetRole = 'student';
      targetId = selectedRecipientId;
      if (!targetId) {
        addToast?.('Please select a student to send a message.', 'warning');
        return;
      }
    }

    // Strict role protection: Students can only message teachers
    if (normRole === 'student' && (targetRole !== 'teacher' || targetId === 'admin' || targetRole === 'admin' || targetRole === 'student')) {
      addToast?.('Students can only send direct messages to teachers.', 'warning');
      return;
    }

    const senderId = normRole === 'student'
      ? (currentStudentRecord?.id || currentStudentRecord?._docId || currentStudent?.id || currentStudent?._docId || 'student')
      : normRole === 'admin'
      ? 'admin'
      : (currentTeacherRecord?.id || currentTeacherRecord?._docId || user?.id || user?.uid || 'admin');

    const senderName = normRole === 'student'
      ? (currentStudentRecord?.name || currentStudent?.name || 'Student')
      : normRole === 'admin'
      ? (user?.name || 'Administrator')
      : (currentTeacherRecord?.name || user?.name || 'Teacher');

    // Enrich message metadata for resilient multi-tab matching
    let targetName = '';
    let targetRollNumber = '';
    let targetEmail = '';
    let targetParentEmail = '';

    if (activeTab === 'students' && selectedStudent) {
      targetName = selectedStudent.name || '';
      targetRollNumber = selectedStudent.rollNumber ? String(selectedStudent.rollNumber).trim() : '';
      targetEmail = (selectedStudent.email || selectedStudent.parentEmail || '').trim().toLowerCase();
      targetParentEmail = (selectedStudent.parentEmail || '').trim().toLowerCase();
    } else if (activeTab === 'teachers' && selectedTeacher) {
      targetName = selectedTeacher.name || '';
      targetEmail = (selectedTeacher.email || '').trim().toLowerCase();
    }

    let senderRollNumber = '';
    let senderEmail = '';
    if (normRole === 'student') {
      const stuObj = currentStudentRecord || currentStudent;
      senderRollNumber = stuObj?.rollNumber ? String(stuObj.rollNumber).trim() : '';
      senderEmail = (stuObj?.email || stuObj?.parentEmail || '').trim().toLowerCase();
    } else {
      senderEmail = (user?.email || currentTeacherRecord?.email || '').trim().toLowerCase();
    }

    addMessage({
      senderId,
      senderName,
      senderRole: normRole,
      senderRollNumber,
      senderEmail,
      targetRole,
      targetId,
      targetName,
      targetRollNumber,
      targetEmail,
      targetParentEmail,
      text,
      attachment,
      replyTo: replyingTo
        ? {
            id: replyingTo.id,
            senderName: replyingTo.senderName,
            text: replyingTo.text || (replyingTo.attachment ? '[Attachment]' : ''),
          }
        : null,
    });

    setMessageText('');
    setReplyingTo(null);
    setShowEmojiBar(false);
    setShowAttachmentMenu(false);
  };

  // Filter messages for current conversation
  const conversationMessages = useMemo(() => {
    return (messages || [])
      .filter((msg) => {
        if (isDeletedForMe(msg)) return false;
        const msgSenderRole = (msg.senderRole || '').toLowerCase();
        const msgTargetRole = (msg.targetRole || '').toLowerCase();
        const msgSenderId = msg.senderId;
        const msgTargetId = msg.targetId;

        // 1. Broadcast channels
        if (activeTab === 'broadcast') {
          if (selectedRecipientId === 'admin') {
            if (normRole === 'student') return false;
            // Direct 1-on-1 channel to School Administrator
            if (normRole === 'teacher') {
              const isSentByMeToAdmin =
                myAllIds.includes(msgSenderId) &&
                (msgTargetRole === 'admin' || msgTargetId === 'admin');
              const isSentByAdminToMe =
                (msgSenderRole === 'admin' || msgSenderId === 'admin') &&
                myAllIds.includes(msgTargetId);
              return isSentByMeToAdmin || isSentByAdminToMe;
            }

            return false;
          }

          if (msgTargetId === 'all' || !msgTargetId) {
            if (selectedRecipientId === 'all') {
              return msgTargetRole === 'all' || !msgTargetRole;
            }
            if (selectedRecipientId === 'teachers') {
              return normRole !== 'student' && msgTargetRole === 'teacher';
            }
            if (selectedRecipientId === 'students') {
              return msgTargetRole === 'student';
            }
          }
          return false;
        }

        // 2. Teachers tab
        if (activeTab === 'teachers') {
          if (!selectedRecipientId) return false;

          if (normRole === 'admin') {
            // Admin viewing a specific teacher
            const isTeacherToAdmin =
              (recipientAllIds.includes(msgSenderId) || (msg.senderEmail && recipientAllIds.includes(msg.senderEmail.toLowerCase()))) &&
              (msgTargetRole === 'admin' || msgTargetId === 'admin' || myAllIds.includes(msgTargetId));
            const isAdminToTeacher =
              (msgSenderRole === 'admin' || myAllIds.includes(msgSenderId)) &&
              (recipientAllIds.includes(msgTargetId) || (msg.targetEmail && recipientAllIds.includes(msg.targetEmail.toLowerCase())));
            return isTeacherToAdmin || isAdminToTeacher;
          }

          // Direct 1-on-1 (Teacher to Teacher, or Student to Teacher)
          if (normRole === 'student') {
            const isSentByMeToTeacher =
              (myAllIds.includes(msgSenderId) || isMsgSenderStudent(msg, currentStudentRecord || currentStudent, myAllIds)) &&
              recipientAllIds.includes(msgTargetId);
            const isSentByTeacherToMe =
              recipientAllIds.includes(msgSenderId) &&
              (myAllIds.includes(msgTargetId) || isMsgTargetStudent(msg, currentStudentRecord || currentStudent, myAllIds));
            return isSentByMeToTeacher || isSentByTeacherToMe;
          }

          const isSentByMeToTarget =
            myAllIds.includes(msgSenderId) && recipientAllIds.includes(msgTargetId);
          const isSentByTargetToMe =
            recipientAllIds.includes(msgSenderId) && myAllIds.includes(msgTargetId);
          return isSentByMeToTarget || isSentByTargetToMe;
        }

        // 3. Students tab
        if (activeTab === 'students') {
          if (!selectedRecipientId) return false;

          if (normRole === 'admin') {
            // Admin viewing a specific student
            const isStudentToAdmin =
              isMsgSenderStudent(msg, selectedStudent, recipientAllIds) &&
              (msgTargetRole === 'admin' || msgTargetId === 'admin' || myAllIds.includes(msgTargetId));
            const isAdminToStudent =
              (msgSenderRole === 'admin' || myAllIds.includes(msgSenderId)) &&
              isMsgTargetStudent(msg, selectedStudent, recipientAllIds);
            return isStudentToAdmin || isAdminToStudent;
          }

          if (normRole === 'student') {
            return false;
          }

          // Direct 1-on-1 (Teacher to Student)
          const isSentByMeToTarget =
            myAllIds.includes(msgSenderId) && (isMsgTargetStudent(msg, selectedStudent, recipientAllIds) || recipientAllIds.includes(msgTargetId));
          const isSentByTargetToMe =
            (isMsgSenderStudent(msg, selectedStudent, recipientAllIds) || recipientAllIds.includes(msgSenderId)) && myAllIds.includes(msgTargetId);
          return isSentByMeToTarget || isSentByTargetToMe;
        }

        return false;
      })
      .sort((a, b) => new Date(a.timestamp || 0) - new Date(b.timestamp || 0));
  }, [messages, activeTab, selectedRecipientId, normRole, myAllIds, recipientAllIds, currentStudentRecord, currentStudent, selectedStudent, isMsgSenderStudent, isMsgTargetStudent, isDeletedForMe]);

  useEffect(() => {
    if (!myId || conversationMessages.length === 0) return;
    const unread = conversationMessages.filter((m) => {
      const isMyMsg =
        myAllIds.includes(m.senderId) ||
        (normRole === 'admin' && ((m.senderRole || '').toLowerCase() === 'admin' || m.senderId === 'admin')) ||
        (normRole === 'student' && isMsgSenderStudent(m, currentStudentRecord || currentStudent, myAllIds));
      const alreadyRead = Array.isArray(m.readBy) && (m.readBy.includes(myId) || myAllIds.some(id => m.readBy.includes(id)));
      return !isMyMsg && !alreadyRead && !markedReadRef.current.has(m.id);
    });

    if (unread.length > 0) {
      unread.forEach(m => markedReadRef.current.add(m.id));
      markMessagesAsRead(unread.map(m => m.id), myId);
    }
  }, [conversationMessages, myId, myAllIds, normRole, markMessagesAsRead, currentStudentRecord, currentStudent, isMsgSenderStudent]);

  // Apply chat search if active
  const filteredMessages = useMemo(() => {
    if (!chatSearch.trim()) return conversationMessages;
    return conversationMessages.filter((msg) =>
      (msg.text || '').toLowerCase().includes(chatSearch.toLowerCase())
    );
  }, [conversationMessages, chatSearch]);

  // Reset selection mode on conversation or tab change
  useEffect(() => {
    setIsSelectMode(false);
    setSelectedMsgIds(new Set());
  }, [selectedRecipientId, activeTab]);

  // Determine if current user has permission to delete a specific message for everyone
  const canDeleteMessage = useCallback((msg) => {
    if (!msg) return false;
    if (normRole === 'admin') return true;
    return myAllIds.includes(msg.senderId) || (currentTeacherRecord?.id && msg.senderId === currentTeacherRecord.id);
  }, [normRole, myAllIds, currentTeacherRecord]);

  // Check if current target (single message or all batch selected) can be deleted for everyone
  const targetCanDeleteForEveryone = useMemo(() => {
    if (!deleteTarget) return false;
    if (deleteTarget.isBatch) {
      if (selectedMsgIds.size === 0) return false;
      for (const id of selectedMsgIds) {
        const m = (messages || []).find((x) => (x.id || x._docId) === id);
        if (!m || !canDeleteMessage(m)) return false;
      }
      return true;
    }
    return canDeleteMessage(deleteTarget.msg);
  }, [deleteTarget, selectedMsgIds, messages, canDeleteMessage]);

  const toggleSelectMessage = useCallback((msgId) => {
    setSelectedMsgIds((prev) => {
      const next = new Set(prev);
      if (next.has(msgId)) {
        next.delete(msgId);
      } else {
        next.add(msgId);
      }
      return next;
    });
  }, []);

  const handleToggleSelectAll = useCallback(() => {
    if (selectedMsgIds.size === filteredMessages.length && filteredMessages.length > 0) {
      setSelectedMsgIds(new Set());
    } else {
      setSelectedMsgIds(new Set(filteredMessages.map((m) => m.id || m._docId)));
    }
  }, [selectedMsgIds.size, filteredMessages]);

  const handleDeleteForEveryone = async () => {
    if (isDeleting || !deleteTarget) return;
    setIsDeleting(true);
    const ids = deleteTarget.isBatch
      ? Array.from(selectedMsgIds)
      : (deleteTarget.msg ? [deleteTarget.msg.id || deleteTarget.msg._docId] : []);
    const count = ids.length;

    try {
      setDeleteTarget(null);
      if (deleteTarget.isBatch) {
        setIsSelectMode(false);
        setSelectedMsgIds(new Set());
      }

      await Promise.all(ids.map((id) => deleteMessage(id)));
      if (addToast) {
        addToast(
          `Deleted ${count} ${count === 1 ? 'message' : 'messages'} for everyone.`,
          'success'
        );
      }
    } catch (err) {
      console.error('Failed to delete message(s) for everyone:', err);
      if (addToast) {
        addToast('Failed to delete message(s) for everyone.', 'error');
      }
    } finally {
      setIsDeleting(false);
    }
  };

  const handleDeleteForMe = async () => {
    if (isDeleting || !deleteTarget) return;
    setIsDeleting(true);
    const ids = deleteTarget.isBatch
      ? Array.from(selectedMsgIds)
      : (deleteTarget.msg ? [deleteTarget.msg.id || deleteTarget.msg._docId] : []);
    const count = ids.length;

    try {
      setDeleteTarget(null);
      if (deleteTarget.isBatch) {
        setIsSelectMode(false);
        setSelectedMsgIds(new Set());
      }

      // Optimistically update local state immediately
      setDeletedForMeIds((prev) => {
        const next = new Set(prev);
        ids.forEach((id) => next.add(id));
        return next;
      });

      if (deleteMessagesForMe) {
        await deleteMessagesForMe(ids, myId);
      }

      if (addToast) {
        addToast(
          `Deleted ${count} ${count === 1 ? 'message' : 'messages'} for you.`,
          'success'
        );
      }
    } catch (err) {
      console.error('Failed to delete message(s) for me:', err);
      if (addToast) {
        addToast('Failed to delete message(s) for you.', 'error');
      }
    } finally {
      setIsDeleting(false);
    }
  };



  // Recipient Meta Info
  const recipientMeta = useMemo(() => {
    if (activeTab === 'broadcast') {
      if (selectedRecipientId === 'admin') {
        return {
          title: 'School Administrator',
          subtitle: 'Direct message channel with the principal/admin',
          badge: 'Admin',
          icon: ShieldCheck,
          color: 'text-purple-400 bg-purple-500/10 border-purple-500/20',
        };
      }
      if (selectedRecipientId === 'all') {
        return {
          title: 'Broadcast: Everyone',
          subtitle: 'Public School Announcement • Reaches all students, teachers & admins',
          badge: 'All School',
          icon: Megaphone,
          color: 'text-blue-400 bg-blue-500/10 border-blue-500/20',
        };
      }
      if (selectedRecipientId === 'students') {
        return {
          title: 'Broadcast: All Students',
          subtitle: 'Student Notice Board • Reaches all registered student accounts',
          badge: 'Students',
          icon: Users,
          color: 'text-emerald-400 bg-emerald-500/10 border-emerald-500/20',
        };
      }
      return {
        title: 'Broadcast: All Teachers',
        subtitle: 'Faculty Channel • Staff and department announcements only',
        badge: 'Teachers',
        icon: UserCheck,
        color: 'text-purple-400 bg-purple-500/10 border-purple-500/20',
      };
    }

    if (activeTab === 'students') {
      const currentStu = (students || []).find((s) => (s.id && s.id === selectedRecipientId) || (s._docId && s._docId === selectedRecipientId));
      return {
        title: currentStu ? currentStu.name : (normRole === 'student' ? 'Classmate Chat' : 'Student Chat'),
        subtitle: currentStu ? `Class ${currentStu.class}-${currentStu.section} • Roll No. ${currentStu.rollNumber} • Direct Message` : (normRole === 'student' ? 'Classmate message channel' : 'Student message channel'),
        badge: currentStu ? `Class ${currentStu.class}-${currentStu.section}` : (normRole === 'student' ? 'Classmate' : 'Student'),
        icon: GraduationCap,
        color: 'text-emerald-400 bg-emerald-500/10 border-emerald-500/20',
      };
    }

    const currentTeacher = (teachers || []).find((t) => (t.id && t.id === selectedRecipientId) || (t._docId && t._docId === selectedRecipientId));
    return {
      title: currentTeacher ? currentTeacher.name : 'Teacher Chat',
      subtitle: currentTeacher ? `Class ${currentTeacher.class}-${currentTeacher.section} Teacher • Direct Message` : 'Teacher message channel',
      badge: currentTeacher ? `Class ${currentTeacher.class}-${currentTeacher.section}` : 'Faculty',
      icon: UserCheck,
      color: 'text-blue-400 bg-blue-500/10 border-blue-500/20',
    };
  }, [activeTab, selectedRecipientId, teachers, students, normRole]);

  const handleCopy = (id, text) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    addToast?.('Message copied to clipboard', 'info');
    setTimeout(() => setCopiedId(null), 2000);
  };

  const handleCallEnd = useCallback(({ status, duration, remoteId, remoteName, remoteRole }) => {
    const allPeople = [...(teachers || []), ...(students || [])];
    const matched = allPeople.find(p =>
      (remoteId && (p.id === remoteId || p._docId === remoteId)) ||
      (remoteName && (p.name || '').toLowerCase().trim() === (remoteName || '').toLowerCase().trim())
    );
    const targetId = remoteId || matched?.id || matched?._docId || remoteName;
    const targetRole = remoteRole || 'teacher';

    if (status === 'ended' || status === 'missed' || status === 'declined') {
      addMessage?.({
        type: 'call',
        callStatus: status,
        callDuration: duration || 0,
        senderId: myId,
        senderName: normRole === 'student' ? currentStudentRecord?.name || 'Student' : user?.name || 'Teacher',
        senderRole: normRole,
        targetId,
        targetRole,
        targetName: remoteName || matched?.name || 'User',
        text: '',
      });
    }
  }, [myId, normRole, currentStudentRecord, user, teachers, students, addMessage]);

  return (
    <VideoCallProvider
      myId={myId}
      myAllIds={myAllIds}
      myName={normRole === 'student' ? currentStudentRecord?.name || 'Student' : user?.name || 'Teacher'}
      myRole={normRole}
      onCallEnd={handleCallEnd}
    >
      <IncomingCallOverlay />
      <ActiveCallScreen />
      <div className="flex flex-col md:flex-row h-full min-h-0 overflow-hidden bg-[#070A12] w-full max-w-full">
      {/* ── LEFT SIDEBAR: CHANNELS & DIRECT MESSAGES ── */}
      <div className={`w-full md:w-[320px] lg:w-[340px] xl:w-[360px] flex-shrink-0 flex-col relative z-10 border-b md:border-b-0 md:border-r border-white/[0.08] bg-[#070A12]
        ${mobileView === 'chat' ? 'hidden md:flex' : 'flex'}
        h-full min-h-0`}>
        
        {/* Top Header: Title & Total Unread badge */}
        <div className="flex-shrink-0 px-4 pt-3.5 pb-2.5 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-lg bg-blue-500/10 flex items-center justify-center text-blue-400">
              <MessageSquare size={15} />
            </div>
            <h1 className="text-sm font-bold text-white tracking-tight">Messages</h1>
          </div>
          {totalUnread > 0 && (
            <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 flex items-center gap-1.5 shadow-[0_0_10px_rgba(16,185,129,0.2)]">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
              {totalUnread} new
            </span>
          )}
        </div>

        {/* Segmented Pill Navigation: Single unified switcher bar */}
        <div className="flex-shrink-0 px-3 pt-2.5 pb-2">
          <div className={`p-1 rounded-xl bg-white/[0.04] border border-white/[0.06] grid ${normRole !== 'student' ? 'grid-cols-3' : 'grid-cols-2'} gap-1 w-full min-w-0`}>
            <button
              onClick={() => {
                setActiveTab('broadcast');
                setSelectedRecipientId('all');
              }}
              className={`w-full min-w-0 py-1.5 px-1 sm:px-2 rounded-lg text-xs font-medium flex items-center justify-center gap-1 sm:gap-1.5 transition-all cursor-pointer relative ${
                activeTab === 'broadcast'
                  ? 'bg-blue-600/20 text-blue-400 shadow-xs'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-white/[0.04]'
              }`}
              title="Broadcast announcements"
            >
              <Megaphone size={13} className="flex-shrink-0" />
              <span className="truncate">Channels</span>
              {getTabUnreadCount('broadcast') > 0 && (
                <span className="min-w-4 h-4 px-1 rounded-full bg-blue-500 text-[9px] font-bold text-white flex items-center justify-center flex-shrink-0">
                  {getTabUnreadCount('broadcast')}
                </span>
              )}
            </button>

            {normRole !== 'student' && (
              <button
                onClick={() => {
                  setActiveTab('students');
                  const firstId = filteredStudents[0]?.id || filteredStudents[0]?._docId || null;
                  setSelectedRecipientId(firstId);
                  setStudentSearch('');
                }}
                className={`w-full min-w-0 py-1.5 px-1 sm:px-2 rounded-lg text-xs font-medium flex items-center justify-center gap-1 sm:gap-1.5 transition-all cursor-pointer relative ${
                  activeTab === 'students'
                    ? 'bg-emerald-600/20 text-emerald-400 shadow-xs'
                    : 'text-slate-400 hover:text-slate-200 hover:bg-white/[0.04]'
                }`}
                title="Direct messages with students"
              >
                <GraduationCap size={13} className="flex-shrink-0" />
                <span className="truncate">Students</span>
                {getTabUnreadCount('students') > 0 && (
                  <span className="min-w-4 h-4 px-1 rounded-full bg-emerald-500 text-[9px] font-bold text-white flex items-center justify-center flex-shrink-0">
                    {getTabUnreadCount('students')}
                  </span>
                )}
              </button>
            )}

            <button
              onClick={() => {
                setActiveTab('teachers');
                setSelectedRecipientId(filteredTeachers[0]?.id || null);
                setTeacherSearch('');
              }}
              className={`w-full min-w-0 py-1.5 px-1 sm:px-2 rounded-lg text-xs font-medium flex items-center justify-center gap-1 sm:gap-1.5 transition-all cursor-pointer relative ${
                activeTab === 'teachers'
                  ? 'bg-blue-600/20 text-blue-400 shadow-xs'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-white/[0.04]'
              }`}
              title="Direct messages with teachers"
            >
              <Users size={13} className="flex-shrink-0" />
              <span className="truncate">Teachers</span>
              {getTabUnreadCount('teachers') > 0 && (
                <span className="min-w-4 h-4 px-1 rounded-full bg-blue-500 text-[9px] font-bold text-white flex items-center justify-center flex-shrink-0">
                  {getTabUnreadCount('teachers')}
                </span>
              )}
            </button>
          </div>
        </div>

        {/* Integrated Search Input for Students & Teachers */}
        {activeTab === 'teachers' && (
          <div className="px-3 pb-2 flex-shrink-0">
            <div className="relative">
              <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
              <input
                type="text"
                value={teacherSearch}
                onChange={(e) => setTeacherSearch(e.target.value)}
                placeholder="Search faculty or subject..."
                className="w-full bg-white/[0.03] border border-white/[0.06] text-xs text-white placeholder-slate-500 rounded-xl pl-8 pr-7 py-1.5 focus:outline-none focus:border-white/20 focus:bg-white/[0.05] transition-all"
              />
              {teacherSearch && (
                <button onClick={() => setTeacherSearch('')} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-500 hover:text-white">
                  <X size={12} />
                </button>
              )}
            </div>
          </div>
        )}

        {activeTab === 'students' && normRole !== 'student' && (
          <div className="px-3 pb-2 flex-shrink-0">
            <div className="relative">
              <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
              <input
                type="text"
                value={studentSearch}
                onChange={(e) => setStudentSearch(e.target.value)}
                placeholder="Search student or roll no..."
                className="w-full bg-white/[0.03] border border-white/[0.06] text-xs text-white placeholder-slate-500 rounded-xl pl-8 pr-7 py-1.5 focus:outline-none focus:border-emerald-500/40 focus:bg-white/[0.05] transition-all"
              />
              {studentSearch && (
                <button onClick={() => setStudentSearch('')} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-500 hover:text-white">
                  <X size={12} />
                </button>
              )}
            </div>
          </div>
        )}

        {/* Borderless, Clean Conversation List */}
        <div className="flex-1 min-h-0 overflow-y-auto px-2 py-1 space-y-0.5 custom-scrollbar">
          {/* Channels / Broadcasts */}
          {activeTab === 'broadcast' && (
            <div className="space-y-0.5">
              {[
                { id: 'all', title: 'Everyone', desc: 'School-wide announcements', icon: Megaphone, count: 'All', color: 'text-blue-400 bg-blue-500/10' },
                { id: 'students', title: 'All Students', desc: 'Student notices & alerts', icon: GraduationCap, count: 'Students', color: 'text-emerald-400 bg-emerald-500/10' },
                ...(normRole !== 'student' ? [{ id: 'teachers', title: 'All Teachers', desc: 'Staff & department memos', icon: UserCheck, count: 'Faculty', color: 'text-indigo-400 bg-indigo-500/10' }] : []),
                ...(normRole === 'teacher' ? [{ id: 'admin', title: 'School Admin', desc: 'Direct message to administration', icon: ShieldCheck, count: 'Admin', color: 'text-purple-400 bg-purple-500/10' }] : [])
              ].map((b) => {
                const Icon = b.icon;
                const isSelected = selectedRecipientId === b.id;
                const unread = getUnreadCount('broadcast', b.id);
                return (
                  <button
                    key={b.id}
                    onClick={() => {
                      setSelectedRecipientId(b.id);
                      setMobileView('chat');
                    }}
                    className={`w-full px-3 py-2.5 rounded-xl flex items-center gap-3 text-left transition-all duration-150 cursor-pointer group ${
                      isSelected
                        ? 'bg-blue-500/10 text-white font-medium'
                        : 'text-slate-300 hover:bg-white/[0.04] hover:text-white'
                    }`}
                  >
                    <div className="relative flex-shrink-0">
                      <div
                        className={`w-9 h-9 rounded-xl flex items-center justify-center transition-all ${
                          isSelected
                            ? 'bg-blue-500 text-white shadow-xs shadow-blue-500/30'
                            : `${b.color} group-hover:opacity-90`
                        }`}
                      >
                        <Icon size={16} />
                      </div>
                      {unread > 0 && (
                        <span className="absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 rounded-full bg-emerald-500 ring-2 ring-[#070A12] shadow-[0_0_8px_rgba(16,185,129,0.9)] animate-pulse" />
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between">
                        <span className={`text-xs font-semibold truncate ${isSelected ? 'text-white' : 'text-slate-200'}`}>
                          {b.title}
                        </span>
                        {unread > 0 ? (
                          <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-full bg-blue-500 text-white flex-shrink-0">
                            {unread}
                          </span>
                        ) : (
                          <span className="text-[10px] text-slate-500 group-hover:text-slate-400">
                            {b.count}
                          </span>
                        )}
                      </div>
                      <p className="text-[11px] text-slate-400 truncate mt-0.5">{b.desc}</p>
                    </div>
                  </button>
                );
              })}
            </div>
          )}

          {/* Students List */}
          {activeTab === 'students' && normRole !== 'student' && (
            <div className="space-y-0.5">
              {filteredStudents.length === 0 && (
                <div className="p-8 text-center text-slate-500 text-xs">
                  {studentSearch ? 'No matching students found.' : 'No students registered.'}
                </div>
              )}
              {filteredStudents.map((student) => {
                const sId = student.id || student._docId;
                const isSelected = selectedRecipientId === sId || (student.id && selectedRecipientId === student.id) || (student._docId && selectedRecipientId === student._docId);
                const initials = (student.name || 'S').split(' ').map((n) => n[0]).join('').slice(0, 2).toUpperCase();
                const unread = getUnreadCount('students', sId);
                return (
                  <button
                    key={sId}
                    onClick={() => {
                      setSelectedRecipientId(sId);
                      setMobileView('chat');
                    }}
                    className={`w-full px-3 py-2.5 rounded-xl flex items-center gap-3 text-left transition-all duration-150 cursor-pointer group ${
                      isSelected
                        ? 'bg-emerald-500/10 text-white font-medium'
                        : 'text-slate-300 hover:bg-white/[0.04] hover:text-white'
                    }`}
                  >
                    <div className="relative flex-shrink-0">
                      <div className={`w-9 h-9 rounded-xl flex items-center justify-center font-bold text-xs transition-all ${
                        isSelected
                          ? 'bg-emerald-500 text-white shadow-xs shadow-emerald-500/30'
                          : 'bg-emerald-500/15 text-emerald-400 group-hover:bg-emerald-500/25'
                      }`}>
                        {initials}
                      </div>
                      {unread > 0 && (
                        <span className="absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 rounded-full bg-emerald-500 ring-2 ring-[#070A12] shadow-[0_0_8px_rgba(16,185,129,0.9)] animate-pulse" />
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between">
                        <p className={`text-xs font-semibold truncate ${isSelected ? 'text-white' : 'text-slate-200'}`}>
                          {student.name}
                        </p>
                        {unread > 0 && (
                          <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-full bg-emerald-500 text-white flex-shrink-0">
                            {unread}
                          </span>
                        )}
                      </div>
                      <p className="text-[11px] text-slate-400 truncate mt-0.5">
                        Class {student.class}-{student.section} • #{student.rollNumber}
                      </p>
                    </div>
                  </button>
                );
              })}
            </div>
          )}

          {/* Teachers List */}
          {activeTab === 'teachers' && (
            <div className="space-y-0.5">
              {filteredTeachers.length === 0 && (
                <div className="p-8 text-center text-slate-500 text-xs">
                  {teacherSearch ? 'No teachers found.' : 'No other teachers registered.'}
                </div>
              )}
              {filteredTeachers.map((teacher) => {
                const tId = teacher.id || teacher._docId;
                const isSelected = selectedRecipientId === tId || (teacher.id && selectedRecipientId === teacher.id) || (teacher._docId && selectedRecipientId === teacher._docId);
                const initials = (teacher.name || 'T').split(' ').map((n) => n[0]).join('').slice(0, 2).toUpperCase();
                const unread = getUnreadCount('teachers', tId);
                return (
                  <button
                    key={tId}
                    onClick={() => {
                      setSelectedRecipientId(tId);
                      setMobileView('chat');
                    }}
                    className={`w-full px-3 py-2.5 rounded-xl flex items-center gap-3 text-left transition-all duration-150 cursor-pointer group ${
                      isSelected
                        ? 'bg-blue-500/10 text-white font-medium'
                        : 'text-slate-300 hover:bg-white/[0.04] hover:text-white'
                    }`}
                  >
                    <div className="relative flex-shrink-0">
                      <div className={`w-9 h-9 rounded-xl flex items-center justify-center font-bold text-xs transition-all ${
                        isSelected
                          ? 'bg-blue-500 text-white shadow-xs shadow-blue-500/30'
                          : 'bg-blue-500/15 text-blue-400 group-hover:bg-blue-500/25'
                      }`}>
                        {initials}
                      </div>
                      {unread > 0 && (
                        <span className="absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 rounded-full bg-emerald-500 ring-2 ring-[#070A12] shadow-[0_0_8px_rgba(16,185,129,0.9)] animate-pulse" />
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between">
                        <p className={`text-xs font-semibold truncate ${isSelected ? 'text-white' : 'text-slate-200'}`}>
                          {teacher.name}
                        </p>
                        {unread > 0 && (
                          <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-full bg-blue-500 text-white flex-shrink-0">
                            {unread}
                          </span>
                        )}
                      </div>
                      <p className="text-[11px] text-slate-400 truncate mt-0.5">
                        Class {teacher.class}-{teacher.section} • {teacher.subject || 'Faculty'}
                      </p>
                    </div>
                  </button>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* ── RIGHT CHAT PANEL ── */}
      <div className={`flex-1 min-w-0 min-h-0 h-full flex flex-col overflow-hidden bg-[#070A12] relative ${mobileView === 'list' ? 'hidden md:flex' : 'flex'}`}>
        
        {/* Chat Header: Modern, streamlined 56px bar */}
        <div className="flex-shrink-0 h-14 sm:h-16 px-4 sm:px-6 flex items-center justify-between bg-[#070A12] z-10">
          <div className="flex items-center gap-3 min-w-0">
            <button
              onClick={() => setMobileView('list')}
              className="md:hidden p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-white/[0.06] transition-colors cursor-pointer flex-shrink-0"
              title="Back to conversations"
            >
              <ChevronLeft size={20} />
            </button>
            <div className={`w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0 ${recipientMeta?.color || 'text-blue-400 bg-blue-500/10'}`}>
              {(() => {
                const IconComponent = recipientMeta?.icon || UserCheck;
                return <IconComponent size={18} />;
              })()}
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <h2 className="text-sm font-semibold text-white truncate tracking-tight">
                  {recipientMeta.title}
                </h2>
                <span className="text-[10px] font-medium px-2 py-0.5 rounded-full bg-white/[0.06] text-slate-400 flex-shrink-0">
                  {recipientMeta.badge}
                </span>
              </div>
              <p className="text-[11px] text-slate-400 truncate">{recipientMeta.subtitle}</p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {/* Video Call Button — only in 1-on-1 DM tabs */}
            {(activeTab === 'teachers' || activeTab === 'students') &&
              selectedRecipientId &&
              selectedRecipientId !== 'all' &&
              selectedRecipientId !== 'admin' && (() => {
                const calleeObj = activeTab === 'teachers' ? selectedTeacher : selectedStudent;
                const calleeId = calleeObj?.id || calleeObj?._docId || selectedRecipientId;
                const calleeName = calleeObj?.name || recipientMeta.title;
                const calleeRole = activeTab === 'teachers' ? 'teacher' : 'student';
                return (
                  <VideoCallButton
                    calleeId={calleeId}
                    calleeIds={recipientAllIds}
                    calleeName={calleeName}
                    calleeRole={calleeRole}
                  />
                );
              })()
            }

            {/* Select Messages Mode Toggle */}
            {filteredMessages.length > 0 && (
              <button
                type="button"
                onClick={() => {
                  if (isSelectMode) {
                    setIsSelectMode(false);
                    setSelectedMsgIds(new Set());
                  } else {
                    setIsSelectMode(true);
                  }
                }}
                className={`h-8 px-2.5 rounded-xl text-xs font-medium flex items-center gap-1.5 transition-all cursor-pointer ${
                  isSelectMode
                    ? 'bg-blue-600 text-white shadow-sm shadow-blue-500/30'
                    : 'text-slate-400 hover:text-white hover:bg-white/[0.06] border border-white/[0.06]'
                }`}
                title={isSelectMode ? 'Exit select mode' : 'Select messages to delete'}
              >
                <CheckSquare size={13} className={isSelectMode ? 'text-white' : 'text-slate-400'} />
                <span className="hidden sm:inline">{isSelectMode ? 'Done' : 'Select'}</span>
              </button>
            )}

            {showSearchInput ? (
              <div className="flex items-center gap-1.5 bg-white/[0.04] border border-white/[0.1] rounded-xl px-2.5 py-1 text-xs">
                <Search size={13} className="text-slate-400" />
                <input
                  type="text"
                  autoFocus
                  value={chatSearch}
                  onChange={(e) => setChatSearch(e.target.value)}
                  placeholder="Search in chat..."
                  className="bg-transparent text-white text-xs placeholder-slate-500 focus:outline-none w-28 sm:w-44"
                />
                <button onClick={() => { setShowSearchInput(false); setChatSearch(''); }} className="text-slate-400 hover:text-white">
                  <X size={13} />
                </button>
              </div>
            ) : (
              <button
                onClick={() => setShowSearchInput(true)}
                className="w-8 h-8 rounded-xl text-slate-400 hover:text-white hover:bg-white/[0.06] flex items-center justify-center transition-colors cursor-pointer"
                title="Search in conversation"
              >
                <Search size={16} />
              </button>
            )}
          </div>
        </div>

        {/* Chat Feed */}
        <div className="flex-1 min-h-0 overflow-y-auto px-4 sm:px-6 py-4 space-y-3.5 custom-scrollbar">
          {filteredMessages.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full max-w-sm mx-auto text-center py-12 px-4">
              <div className="w-12 h-12 rounded-2xl bg-white/[0.04] flex items-center justify-center text-slate-400 mb-3">
                {(() => {
                  const IconComponent = recipientMeta?.icon || UserCheck;
                  return <IconComponent size={22} />;
                })()}
              </div>
              <h3 className="text-sm font-semibold text-white mb-1">
                {chatSearch ? 'No matching messages found' : recipientMeta.title}
              </h3>
              <p className="text-xs text-slate-400 leading-relaxed">
                {chatSearch
                  ? 'Try searching for another keyword or clear the search field.'
                  : activeTab === 'students'
                    ? 'Start a direct message with this student. Updates sync in real-time.'
                    : activeTab === 'teachers'
                      ? 'Direct message channel with this faculty member.'
                      : 'Post announcements, schedules, and memos to everyone in this channel.'}
              </p>
            </div>
          ) : (
            filteredMessages.map((msg) => {
              const isMe =
                myAllIds.includes(msg.senderId) ||
                (normRole === 'admin' && ((msg.senderRole || '').toLowerCase() === 'admin' || msg.senderId === 'admin')) ||
                (normRole === 'student' && isMsgSenderStudent(msg, currentStudentRecord || currentStudent, myAllIds));
              const isSelected = selectedMsgIds.has(msg.id);

              const roleColors = {
                admin: 'bg-purple-500/15 text-purple-300',
                teacher: 'bg-blue-500/15 text-blue-300',
                student: 'bg-emerald-500/15 text-emerald-300',
              };

              // Render call log messages differently
              if (msg.type === 'call') {
                return (
                  <div
                    key={msg.id}
                    className={`flex flex-col ${isMe ? 'items-end' : 'items-start'} animate-fade-in`}
                  >
                    <div className="flex items-center gap-1.5 mb-1 px-1">
                      <span className="text-[11px] font-medium text-slate-300">
                        {isMe ? 'You' : msg.senderName}
                      </span>
                      <span className="text-[10px] text-slate-500 flex items-center gap-0.5 ml-1">
                        <Clock size={10} />
                        {new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </span>
                    </div>
                    <MissedCallMessage msg={msg} isMe={isMe} />
                  </div>
                );
              }

              return (
                <div
                  key={msg.id}
                  className={`group relative flex flex-col ${isMe ? 'items-end' : 'items-start'} animate-fade-in ${
                    isSelectMode ? 'cursor-pointer select-none' : ''
                  }`}
                  onClick={isSelectMode ? () => toggleSelectMessage(msg.id) : undefined}
                >
                  {/* Sender & Timestamp Header */}
                  <div className="flex items-center gap-1.5 mb-1 px-1">
                    {/* Selection Checkbox in Select Mode */}
                    {isSelectMode && (
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          toggleSelectMessage(msg.id);
                        }}
                        className={`w-4 h-4 rounded flex items-center justify-center transition-all mr-1 flex-shrink-0 cursor-pointer ${
                          isSelected
                            ? 'bg-blue-600 text-white shadow-sm shadow-blue-500/40 ring-1 ring-blue-400'
                            : 'border border-white/30 hover:border-blue-400 bg-white/[0.04]'
                        }`}
                        title={isSelected ? 'Deselect message' : 'Select message'}
                      >
                        {isSelected && <Check size={11} strokeWidth={3} className="text-white" />}
                      </button>
                    )}
                    <span className="text-[11px] font-medium text-slate-300">
                      {isMe ? 'You' : msg.senderName}
                    </span>
                    <span
                      className={`text-[9px] px-1.5 py-0.5 rounded font-semibold uppercase ${
                        roleColors[msg.senderRole] || 'bg-slate-500/15 text-slate-300'
                      }`}
                    >
                      {msg.senderRole || 'user'}
                    </span>
                    <span className="text-[10px] text-slate-500 flex items-center gap-0.5 ml-1">
                      <Clock size={10} />
                      {new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </span>
                  </div>

                  {/* Message Bubble: Sleek rounded-2xl with clean tail and no double-bordered clutter */}
                  <div
                    className={`relative max-w-[85%] md:max-w-[70%] px-4 py-2.5 rounded-2xl text-[13.5px] leading-relaxed whitespace-pre-wrap transition-all ${
                      isSelected
                        ? 'ring-2 ring-blue-500 shadow-lg shadow-blue-500/25 scale-[1.005]'
                        : isSelectMode
                        ? 'hover:ring-1 hover:ring-blue-400/40'
                        : ''
                    } ${
                      isMe
                        ? 'bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-tr-xs shadow-sm shadow-blue-500/20'
                        : 'bg-[#131927] border border-white/[0.06] text-slate-100 rounded-tl-xs shadow-sm'
                    }`}
                  >
                    {/* Quoted Reply Preview */}
                    {msg.replyTo && (
                      <div
                        className={`mb-2 p-2 rounded-xl text-xs border-l-2 ${
                          isMe
                            ? 'bg-black/25 border-white/60 text-white'
                            : 'bg-black/30 border-blue-400 text-slate-200'
                        }`}
                      >
                        <div className="flex items-center gap-1 font-semibold text-[11px] opacity-90 mb-0.5">
                          <CornerUpLeft size={10} />
                          <span>{msg.replyTo.senderName || 'Original message'}</span>
                        </div>
                        <p className="line-clamp-2 text-[11px] opacity-80 leading-snug">
                          {msg.replyTo.text || (msg.replyTo.attachment ? '[Attachment]' : '')}
                        </p>
                      </div>
                    )}

                    {msg.text && <div>{msg.text}</div>}
                    
                    {msg.attachment && (
                      <div className={`mt-2 ${!msg.text ? '-mt-0.5' : ''}`}>
                        {msg.attachment.type === 'image' ? (
                          <img src={msg.attachment.url} alt="attachment" className="max-w-[220px] max-h-[260px] object-cover rounded-xl border border-white/10 shadow-sm cursor-pointer hover:opacity-95 transition-opacity" />
                        ) : (
                          <div className={`flex items-center gap-2.5 p-2 rounded-xl border ${isMe ? 'bg-black/20 border-white/20' : 'bg-white/[0.04] border-white/10'}`}>
                            <FileText size={16} className={isMe ? 'text-white' : 'text-blue-400'} />
                            <a href={msg.attachment.url} download={msg.attachment.name} className={`text-xs truncate max-w-[160px] font-medium hover:underline ${isMe ? 'text-white' : 'text-blue-400'}`}>
                              {msg.attachment.name}
                            </a>
                          </div>
                        )}
                      </div>
                    )}

                    {/* Read Status Checks */}
                    <div className="flex items-center justify-end gap-1 mt-0.5 text-[10px] opacity-75">
                      {isMe && <CheckCheck size={12} className="text-cyan-200" />}
                    </div>

                    {/* Sleek Floating Action Bar on Hover */}
                    {!isSelectMode && (
                      <div
                        className={`absolute top-0 -translate-y-1/2 ${
                          isMe ? 'left-2 -translate-x-full' : 'right-2 translate-x-full'
                        } hidden group-hover:flex items-center gap-0.5 bg-[#161D2F] border border-white/10 px-1.5 py-1 rounded-full shadow-xl z-20`}
                      >
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            setIsSelectMode(true);
                            toggleSelectMessage(msg.id);
                          }}
                          className="p-1 text-slate-400 hover:text-blue-400 rounded-full hover:bg-white/[0.08] transition-colors"
                          title="Select message"
                        >
                          <CheckSquare size={12} />
                        </button>
                        {/* Reply button: Enabled if student is in teachers tab, or for staff in any tab */}
                        {!(normRole === 'student' && activeTab === 'broadcast') && (
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              setReplyingTo(msg);
                            }}
                            className="p-1 text-slate-400 hover:text-blue-400 rounded-full hover:bg-white/[0.08] transition-colors"
                            title="Reply to message"
                          >
                            <CornerUpLeft size={12} />
                          </button>
                        )}
                        <button
                          type="button"
                          onClick={() => handleCopy(msg.id, msg.text)}
                          className="p-1 text-slate-400 hover:text-white rounded-full hover:bg-white/[0.08]"
                          title="Copy message"
                        >
                          {copiedId === msg.id ? <Check size={12} className="text-emerald-400" /> : <Copy size={12} />}
                        </button>
                        <button
                          type="button"
                          onClick={() => reactToMessage(msg.id, '👍')}
                          className="p-1 text-xs hover:scale-125 transition-transform"
                        >
                          👍
                        </button>
                        <button
                          type="button"
                          onClick={() => reactToMessage(msg.id, '❤️')}
                          className="p-1 text-xs hover:scale-125 transition-transform"
                        >
                          ❤️
                        </button>
                        <button
                          type="button"
                          onClick={() => reactToMessage(msg.id, '🎉')}
                          className="p-1 text-xs hover:scale-125 transition-transform"
                        >
                          🎉
                        </button>
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            setDeleteTarget({ isBatch: false, msg });
                          }}
                          className="p-1 text-slate-400 hover:text-red-400 rounded-full hover:bg-red-500/10"
                          title="Delete message"
                        >
                          <Trash2 size={12} />
                        </button>
                      </div>
                    )}
                  </div>

                  {/* Reaction Chips */}
                  {msg.reactions && Object.keys(msg.reactions).length > 0 && (
                    <div className="flex items-center gap-1 mt-1 px-1">
                      {Object.entries(msg.reactions).map(([emoji, count]) => (
                        <button
                          key={emoji}
                          onClick={() => reactToMessage(msg.id, emoji)}
                          className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-white/[0.04] border border-white/[0.06] text-xs hover:bg-white/[0.08] transition-colors"
                        >
                          <span>{emoji}</span>
                          <span className="text-[10px] text-slate-400 font-medium">{count}</span>
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              );
            })
          )}
          <div ref={messagesEndRef} />
        </div>

        {/* Quick Emoji Bar */}
        {(() => {
          if (isSelectMode || (normRole === 'student' && activeTab !== 'teachers')) return null;
          const isNoRecipient = (activeTab === 'teachers' && !selectedRecipientId) || (activeTab === 'students' && !selectedRecipientId);
          return showEmojiBar && !isNoRecipient ? (
            <div className="flex-shrink-0 px-4 py-1.5 bg-[#070A12] border-t border-white/[0.06] flex items-center gap-1.5 overflow-x-auto custom-scrollbar animate-fade-in">
              <span className="text-[11px] text-slate-400 font-medium mr-1 flex-shrink-0">Quick Emojis:</span>
              {EMOJIS.map((emoji) => (
                <button
                  key={emoji}
                  type="button"
                  onClick={() => setMessageText((prev) => prev + emoji)}
                  className="w-7 h-7 rounded-lg hover:bg-white/[0.06] text-sm flex items-center justify-center transition-transform hover:scale-125 cursor-pointer flex-shrink-0"
                >
                  {emoji}
                </button>
              ))}
            </div>
          ) : null;
        })()}

        {/* Bottom Input Composer or Selection Action Bar */}
        {(() => {
          if (isSelectMode) {
            return (
              <div className="flex-shrink-0 px-4 py-3 bg-[#0c101d] border-t border-white/[0.08] shadow-2xl relative z-20 pb-safe animate-fade-in">
                <div className="w-full flex items-center justify-between gap-3">
                  <div className="flex items-center gap-2 sm:gap-3">
                    <button
                      type="button"
                      onClick={handleToggleSelectAll}
                      className="text-xs font-medium text-slate-300 hover:text-white px-3 py-1.5 rounded-xl bg-white/[0.06] hover:bg-white/[0.1] border border-white/[0.08] flex items-center gap-1.5 transition-all cursor-pointer active:scale-95"
                    >
                      <CheckSquare size={13} className={selectedMsgIds.size === filteredMessages.length && filteredMessages.length > 0 ? 'text-blue-400' : 'text-slate-400'} />
                      <span>
                        {selectedMsgIds.size === filteredMessages.length && filteredMessages.length > 0
                          ? 'Deselect All'
                          : 'Select All'}
                      </span>
                    </button>

                    <span className="text-xs font-semibold text-slate-200">
                      <span className="text-blue-400">{selectedMsgIds.size}</span>
                      <span className="text-slate-400 font-normal ml-1">
                        of {filteredMessages.length} selected
                      </span>
                    </span>
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => {
                        setIsSelectMode(false);
                        setSelectedMsgIds(new Set());
                      }}
                      className="px-3.5 py-1.5 rounded-xl text-xs font-medium text-slate-300 hover:text-white hover:bg-white/[0.06] transition-colors cursor-pointer"
                    >
                      Cancel
                    </button>
                    <button
                      type="button"
                      disabled={selectedMsgIds.size === 0}
                      onClick={() => setDeleteTarget({ isBatch: true })}
                      className="px-4 py-1.5 rounded-xl text-xs font-semibold bg-red-600 hover:bg-red-500 disabled:bg-red-600/30 text-white disabled:text-red-300/40 flex items-center gap-1.5 transition-all shadow-md shadow-red-600/30 disabled:shadow-none cursor-pointer disabled:cursor-not-allowed active:scale-95"
                    >
                      <Trash2 size={13} />
                      <span>Delete ({selectedMsgIds.size})</span>
                    </button>
                  </div>
                </div>
              </div>
            );
          }

          if (normRole === 'student' && activeTab === 'broadcast') {
            return (
              <div className="flex-shrink-0 px-4 py-3 bg-[#070A12] text-center text-xs text-slate-400 border-t border-white/[0.06] flex items-center justify-center gap-2">
                <Lock size={13} className="text-slate-500" />
                <span>Broadcast channels are view-only. You can message and reply to your teachers under the Teachers tab.</span>
              </div>
            );
          }

          const isNoRecipient = (activeTab === 'teachers' && !selectedRecipientId) || (activeTab === 'students' && !selectedRecipientId);

          if (isNoRecipient) {
            return (
              <div className="flex-shrink-0 px-4 py-3 bg-[#070A12] text-center text-xs text-slate-500 border-t border-white/[0.04]">
                {activeTab === 'teachers' ? 'Select a faculty member from the list to start messaging.' : 'Select a student from the list to start messaging.'}
              </div>
            );
          }

          return (
            <div className="flex-shrink-0 px-3 sm:px-4 py-2.5 sm:py-3 bg-[#070A12] relative z-20 pb-safe">
              {/* Active Replying Banner */}
              {replyingTo && (
                <div className="w-full mb-2 px-3.5 py-1.5 bg-[#161D2F] border border-white/10 rounded-xl flex items-center justify-between text-xs animate-fade-in shadow-md">
                  <div className="flex items-center gap-2 overflow-hidden text-slate-300">
                    <CornerUpLeft size={13} className="text-blue-400 flex-shrink-0" />
                    <span className="font-semibold text-blue-400 flex-shrink-0">
                      Replying to {replyingTo.senderName}:
                    </span>
                    <span className="truncate text-slate-400">
                      {replyingTo.text || (replyingTo.attachment ? '[Attachment]' : '')}
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={() => setReplyingTo(null)}
                    className="p-1 text-slate-400 hover:text-white rounded-md hover:bg-white/[0.06] flex-shrink-0 transition-colors"
                    title="Cancel reply"
                  >
                    <X size={13} />
                  </button>
                </div>
              )}
              <form onSubmit={(e) => { e.preventDefault(); handleSend(); }} className="w-full">
                <div className="flex items-center gap-1.5 bg-[#121826] border border-white/[0.08] focus-within:border-blue-500/40 focus-within:ring-2 focus-within:ring-blue-500/10 rounded-2xl p-1.5 transition-all">
                  
                  {/* Attachment Menu Toggle */}
                  <div className="relative flex-shrink-0">
                    <button
                      type="button"
                      onClick={() => setShowAttachmentMenu((b) => !b)}
                      className={`w-8 h-8 rounded-xl flex items-center justify-center transition-colors cursor-pointer ${
                        showAttachmentMenu
                          ? 'bg-blue-600/20 text-blue-400'
                          : 'text-slate-400 hover:text-white hover:bg-white/[0.06]'
                      }`}
                      title="Attach file"
                    >
                      <Plus size={18} />
                    </button>

                    {/* Attachment Menu Popup */}
                    {showAttachmentMenu && (
                      <div className="absolute bottom-[calc(100%+10px)] left-0 w-52 bg-[#161D2F] border border-white/10 rounded-xl shadow-2xl py-1.5 z-50 animate-fade-in">
                        <button
                          type="button"
                          onClick={() => handleAttachmentClick('document')}
                          className="w-full px-3.5 py-2 flex items-center gap-3 text-xs text-slate-200 hover:bg-white/[0.06] transition-colors cursor-pointer text-left font-medium"
                        >
                          <FileText size={16} className="text-purple-400" />
                          <span>Document</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => handleAttachmentClick('image')}
                          className="w-full px-3.5 py-2 flex items-center gap-3 text-xs text-slate-200 hover:bg-white/[0.06] transition-colors cursor-pointer text-left font-medium"
                        >
                          <ImageIcon size={16} className="text-blue-400" />
                          <span>Photo or Video</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => handleAttachmentClick('camera')}
                          className="w-full px-3.5 py-2 flex items-center gap-3 text-xs text-slate-200 hover:bg-white/[0.06] transition-colors cursor-pointer text-left font-medium"
                        >
                          <Camera size={16} className="text-pink-400" />
                          <span>Camera</span>
                        </button>
                      </div>
                    )}
                  </div>

                  {/* Hidden File Input */}
                  <input type="file" ref={fileInputRef} className="hidden" onChange={handleFileChange} />

                  {/* Emoji Bar Toggle */}
                  <button
                    type="button"
                    onClick={() => setShowEmojiBar((b) => !b)}
                    className={`w-8 h-8 rounded-xl flex items-center justify-center transition-colors cursor-pointer flex-shrink-0 ${
                      showEmojiBar
                        ? 'bg-blue-600/20 text-blue-400'
                        : 'text-slate-400 hover:text-white hover:bg-white/[0.06]'
                    }`}
                    title="Insert emoji"
                  >
                    <Smile size={17} />
                  </button>

                  {/* Unified Text Input */}
                  <input
                    type="text"
                    value={messageText}
                    onChange={(e) => setMessageText(e.target.value)}
                    placeholder={
                      activeTab === 'broadcast'
                        ? selectedRecipientId === 'admin'
                          ? 'Message the School Administrator...'
                          : 'Post an announcement to this channel...'
                        : `Message ${recipientMeta.title || ''}...`
                    }
                    className="flex-1 bg-transparent border-0 text-xs sm:text-sm text-white placeholder-slate-500 focus:outline-none focus:ring-0 px-2 py-1"
                  />

                  {/* Clean Send Button */}
                  <button
                    type="submit"
                    disabled={!messageText.trim()}
                    className="h-8 sm:h-9 px-3.5 sm:px-4 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-medium text-xs sm:text-sm flex items-center gap-1.5 transition-all shadow-sm shadow-blue-600/30 disabled:opacity-30 disabled:cursor-not-allowed cursor-pointer active:scale-95 flex-shrink-0"
                  >
                    <Send size={13} />
                    <span className="hidden sm:inline">Send</span>
                  </button>
                </div>
              </form>
            </div>
          );
        })()}
      </div>

      {/* WhatsApp-Style Delete Modal (Delete for everyone / Delete for me) */}
      <Modal
        open={Boolean(deleteTarget)}
        onClose={() => !isDeleting && setDeleteTarget(null)}
        title={
          deleteTarget?.isBatch
            ? `Delete ${selectedMsgIds.size} ${selectedMsgIds.size === 1 ? 'message' : 'messages'}?`
            : 'Delete message?'
        }
        maxWidth="max-w-sm"
      >
        <div className="space-y-4 py-1">
          <p className="text-xs text-slate-300 leading-relaxed">
            {targetCanDeleteForEveryone
              ? 'You can delete this message for everyone or delete it only for yourself.'
              : 'You can delete this message for yourself. Other participants will still be able to see it.'}
          </p>

          <div className="flex flex-col gap-2.5 pt-2">
            {targetCanDeleteForEveryone && (
              <button
                type="button"
                disabled={isDeleting}
                onClick={handleDeleteForEveryone}
                className="w-full py-2.5 px-4 rounded-xl text-xs font-semibold bg-red-600 hover:bg-red-500 disabled:opacity-50 text-white flex items-center justify-center gap-2 transition-all shadow-md shadow-red-600/30 cursor-pointer active:scale-98"
              >
                {isDeleting ? (
                  <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                ) : (
                  <Users size={15} />
                )}
                <span>Delete for everyone</span>
              </button>
            )}

            <button
              type="button"
              disabled={isDeleting}
              onClick={handleDeleteForMe}
              className="w-full py-2.5 px-4 rounded-xl text-xs font-semibold bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 disabled:opacity-50 text-white flex items-center justify-center gap-2 transition-all shadow-md shadow-blue-600/30 cursor-pointer active:scale-98"
            >
              {isDeleting ? (
                <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              ) : (
                <User size={15} />
              )}
              <span>Delete for me</span>
            </button>

            <button
              type="button"
              disabled={isDeleting}
              onClick={() => setDeleteTarget(null)}
              className="w-full py-2 px-4 rounded-xl text-xs font-medium text-slate-400 hover:text-white hover:bg-white/[0.06] transition-colors cursor-pointer text-center"
            >
              Cancel
            </button>
          </div>
        </div>
      </Modal>
    </div>
    </VideoCallProvider>
  );
}
