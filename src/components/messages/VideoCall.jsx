/**
 * VideoCall.jsx
 *
 * WhatsApp-style live video and audio calling between students and teachers.
 *
 * Architecture:
 * - Direct peer-to-peer media streams via WebRTC RTCPeerConnection
 * - Real-time signaling (Offer / Answer / ICE Candidates) through Firebase Firestore
 * - Role-based authorization & multi-tenant identity matching
 * - Web Audio API dual-tone telephone ringer (zero external audio dependencies)
 * - Mobile / tablet / desktop responsive layout
 */

import {
  useState,
  useEffect,
  useRef,
  useCallback,
  createContext,
  useContext,
} from 'react';
import {
  Video,
  VideoOff,
  Mic,
  MicOff,
  PhoneOff,
  PhoneCall,
  PhoneMissed,
  Phone,
  SwitchCamera,
  Maximize2,
  Minimize2,
} from 'lucide-react';
import { collection, query, where, onSnapshot } from 'firebase/firestore';
import { db } from '../../config/firebase.js';
import {
  createCall,
  setCallOffer,
  setCallAnswer,
  updateCallStatus,
  addIceCandidate,
  subscribeToCall,
  subscribeToIceCandidates,
  getIceServers,
} from '../../services/callService';

// ─────────────────────────────────────────────────────────
// Web Audio Telephone Ringer (dual-frequency telephone tone)
// ─────────────────────────────────────────────────────────
class RingtonePlayer {
  constructor() {
    this.ctx = null;
    this.osc1 = null;
    this.osc2 = null;
    this.gain = null;
    this.interval = null;
    this.isPlaying = false;
  }

  start(isOutgoing = false) {
    if (this.isPlaying) return;
    try {
      const AudioContextClass = window.AudioContext || window.webkitAudioContext;
      if (!AudioContextClass) return;
      this.ctx = new AudioContextClass();
      this.isPlaying = true;

      // European/WhatsApp ringing cadence:
      // Outgoing: 440Hz + 480Hz tone for 1.2s, 2s silence
      // Incoming: 440Hz + 480Hz tone for 1.5s, 1.5s silence
      const burstTime = isOutgoing ? 1.2 : 1.5;
      const cycleTime = isOutgoing ? 3.2 : 3.0;

      const playBurst = () => {
        if (!this.isPlaying || !this.ctx) return;
        try {
          const now = this.ctx.currentTime;
          const osc1 = this.ctx.createOscillator();
          const osc2 = this.ctx.createOscillator();
          const gain = this.ctx.createGain();

          osc1.frequency.setValueAtTime(440, now);
          osc2.frequency.setValueAtTime(480, now);

          gain.gain.setValueAtTime(0.001, now);
          gain.gain.linearRampToValueAtTime(0.12, now + 0.05);
          gain.gain.setValueAtTime(0.12, now + burstTime - 0.05);
          gain.gain.linearRampToValueAtTime(0.001, now + burstTime);

          osc1.connect(gain);
          osc2.connect(gain);
          gain.connect(this.ctx.destination);

          osc1.start(now);
          osc2.start(now);
          osc1.stop(now + burstTime);
          osc2.stop(now + burstTime);
        } catch (_) {}
      };

      playBurst();
      this.interval = setInterval(playBurst, cycleTime * 1000);
    } catch (_) {}
  }

  stop() {
    this.isPlaying = false;
    if (this.interval) {
      clearInterval(this.interval);
      this.interval = null;
    }
    if (this.ctx) {
      try {
        this.ctx.close();
      } catch (_) {}
      this.ctx = null;
    }
  }
}

// ─────────────────────────────────────────────────────────
// Context & Provider
// ─────────────────────────────────────────────────────────
const VideoCallContext = createContext(null);

export function VideoCallProvider({
  children,
  myId,
  myAllIds = [],
  myName,
  myRole,
  onCallEnd,
}) {
  const callState = useVideoCallInternal(myId, myAllIds, myName, myRole, onCallEnd);
  return (
    <VideoCallContext.Provider value={callState}>
      {children}
    </VideoCallContext.Provider>
  );
}

export function useVideoCall() {
  return useContext(VideoCallContext);
}

// ─────────────────────────────────────────────────────────
// Internal WebRTC & Signaling Hook
// ─────────────────────────────────────────────────────────
function useVideoCallInternal(myId, myAllIds = [], myName, myRole, onCallEnd) {
  const [callId, setCallId] = useState(null);
  const [callStatus, setCallStatus] = useState(null); // 'calling' | 'accepted' | 'declined' | 'ended' | 'missed'
  const [incomingCall, setIncomingCall] = useState(null);
  const [remoteStream, setRemoteStream] = useState(null);
  const [localStream, setLocalStream] = useState(null);
  const [isMuted, setIsMuted] = useState(false);
  const [isCameraOff, setIsCameraOff] = useState(false);
  const [callDuration, setCallDuration] = useState(0);
  const [remoteInfo, setRemoteInfo] = useState(null); // { name, role, id }
  const [videoDevices, setVideoDevices] = useState([]);
  const [currentCameraFacing, setCurrentCameraFacing] = useState('user');

  const pcRef = useRef(null);
  const localStreamRef = useRef(null);
  const callIdRef = useRef(null);
  const isCallerRef = useRef(false);
  const unsubCallRef = useRef(null);
  const unsubCandidatesRef = useRef(null);
  const missedTimerRef = useRef(null);
  const durationTimerRef = useRef(null);
  const endingRef = useRef(false);
  const ringtoneRef = useRef(new RingtonePlayer());
  const incomingUnsubRef = useRef(null);

  const onCallEndRef = useRef(onCallEnd);
  useEffect(() => {
    onCallEndRef.current = onCallEnd;
  }, [onCallEnd]);

  // Combined set of all possible IDs representing the local user
  const effectiveAllIds = Array.from(
    new Set([myId, ...(Array.isArray(myAllIds) ? myAllIds : [])].filter(Boolean))
  );

  // ── Stop ringtone helper ──────────────────────────────
  const stopRing = useCallback(() => {
    try {
      ringtoneRef.current.stop();
    } catch (_) {}
  }, []);

  // ── Cleanup Call & Streams ────────────────────────────
  const cleanup = useCallback(
    async (finalStatus, cId) => {
      if (endingRef.current) return;
      endingRef.current = true;

      stopRing();
      clearTimeout(missedTimerRef.current);
      clearInterval(durationTimerRef.current);

      unsubCallRef.current?.();
      unsubCandidatesRef.current?.();

      if (pcRef.current) {
        pcRef.current.ontrack = null;
        pcRef.current.onicecandidate = null;
        pcRef.current.close();
        pcRef.current = null;
      }

      if (localStreamRef.current) {
        localStreamRef.current.getTracks().forEach((t) => t.stop());
        localStreamRef.current = null;
      }

      let snapDuration = 0;
      setCallDuration((d) => {
        snapDuration = d;
        return 0;
      });

      let snapRemote = null;
      setRemoteInfo((r) => {
        snapRemote = r;
        return r;
      });

      setLocalStream(null);
      setRemoteStream(null);
      setCallStatus(finalStatus || 'ended');
      setCallId(null);
      setIncomingCall(null);
      setIsMuted(false);
      setIsCameraOff(false);

      const id = cId || callIdRef.current;
      if (id && finalStatus) {
        await updateCallStatus(id, finalStatus).catch(() => {});
      }

      // Notify parent to log the call in messages
      if (onCallEndRef.current && snapRemote) {
        onCallEndRef.current({
          status: finalStatus || 'ended',
          duration: snapDuration,
          remoteId: snapRemote.id || null,
          remoteName: snapRemote.name || '',
          remoteRole: snapRemote.role || '',
        });
      }

      callIdRef.current = null;
      setTimeout(() => {
        endingRef.current = false;
        setCallStatus(null);
        setRemoteInfo(null);
      }, 3500);
    },
    [stopRing]
  );

  // ── Create RTCPeerConnection ──────────────────────────
  const createPC = useCallback(
    (cId, isCallerSide) => {
      const pc = new RTCPeerConnection({ iceServers: getIceServers() });
      pcRef.current = pc;

      pc.onicecandidate = (event) => {
        if (event.candidate) {
          addIceCandidate(cId, event.candidate, isCallerSide ? 'caller' : 'callee');
        }
      };

      pc.ontrack = (event) => {
        if (event.streams && event.streams[0]) {
          setRemoteStream(event.streams[0]);
        }
      };

      pc.oniceconnectionstatechange = () => {
        if (
          pc.iceConnectionState === 'disconnected' ||
          pc.iceConnectionState === 'failed' ||
          pc.iceConnectionState === 'closed'
        ) {
          if (callIdRef.current) {
            cleanup('ended', callIdRef.current);
          }
        }
      };

      return pc;
    },
    [cleanup]
  );

  // ── Subscribe to remote candidates ────────────────────
  const subscribeRemoteCandidates = useCallback((cId, side) => {
    unsubCandidatesRef.current?.();
    unsubCandidatesRef.current = subscribeToIceCandidates(cId, side, async (cand) => {
      if (pcRef.current && pcRef.current.remoteDescription) {
        try {
          await pcRef.current.addIceCandidate(new RTCIceCandidate(cand));
        } catch (e) {
          console.warn('[VideoCall] addIceCandidate error:', e);
        }
      }
    });
  }, []);

  // ── CALLER: Start Call ────────────────────────────────
  const startCall = useCallback(
    async (calleeId, calleeName, calleeRole, calleeIds = []) => {
      if (!myId || !calleeId) return;
      endingRef.current = false;

      try {
        const devices = await navigator.mediaDevices.enumerateDevices();
        const vDevices = devices.filter((d) => d.kind === 'videoinput');
        setVideoDevices(vDevices);
      } catch (_) {}

      let stream;
      try {
        stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: 'user', width: { ideal: 1280 }, height: { ideal: 720 } },
          audio: true,
        });
      } catch (err) {
        try {
          stream = await navigator.mediaDevices.getUserMedia({ video: false, audio: true });
          setIsCameraOff(true);
        } catch (e) {
          console.error('[VideoCall] Media access failed:', e);
          alert('Microphone and Camera permission is required for live calling. Please enable access in browser settings.');
          return;
        }
      }

      localStreamRef.current = stream;
      setLocalStream(stream);
      isCallerRef.current = true;
      setRemoteInfo({ id: calleeId, name: calleeName, role: calleeRole });

      ringtoneRef.current.start(true);

      const targetIds = Array.from(new Set([calleeId, ...(calleeIds || [])].filter(Boolean)));

      const cId = await createCall({
        callerId: myId,
        callerIds: effectiveAllIds,
        callerName: myName,
        callerRole: myRole,
        calleeId,
        calleeIds: targetIds,
        calleeName,
        calleeRole,
      });

      callIdRef.current = cId;
      setCallId(cId);
      setCallStatus('calling');

      const pc = createPC(cId, true);
      stream.getTracks().forEach((t) => pc.addTrack(t, stream));

      subscribeRemoteCandidates(cId, 'callee');

      const offer = await pc.createOffer();
      await pc.setLocalDescription(offer);
      await setCallOffer(cId, offer);

      unsubCallRef.current?.();
      unsubCallRef.current = subscribeToCall(cId, async (callDoc) => {
        if (!callDoc) {
          cleanup('ended', cId);
          return;
        }

        const status = callDoc.status;
        if (status === 'declined') {
          stopRing();
          cleanup('declined', null);
          return;
        }
        if (status === 'ended') {
          stopRing();
          cleanup('ended', null);
          return;
        }
        if (status === 'missed') {
          stopRing();
          cleanup('missed', null);
          return;
        }

        if (callDoc.answer && pcRef.current && !pcRef.current.currentRemoteDescription) {
          try {
            stopRing();
            clearTimeout(missedTimerRef.current);
            await pcRef.current.setRemoteDescription(new RTCSessionDescription(callDoc.answer));
            setCallStatus('accepted');
            durationTimerRef.current = setInterval(() => {
              setCallDuration((d) => d + 1);
            }, 1000);
          } catch (e) {
            console.warn('[VideoCall] setRemoteDescription answer error:', e);
          }
        }
      });

      missedTimerRef.current = setTimeout(() => {
        if (callIdRef.current) {
          cleanup('missed', callIdRef.current);
        }
      }, 30000);
    },
    [myId, effectiveAllIds, myName, myRole, createPC, subscribeRemoteCandidates, cleanup, stopRing]
  );

  // ── CALLEE: Accept Call ───────────────────────────────
  const acceptCall = useCallback(
    async (callDoc) => {
      if (!callDoc) return;
      endingRef.current = false;
      stopRing();

      const cId = callDoc.id;
      callIdRef.current = cId;
      setCallId(cId);
      isCallerRef.current = false;
      setRemoteInfo({
        id: callDoc.callerId,
        name: callDoc.callerName,
        role: callDoc.callerRole,
      });

      clearTimeout(missedTimerRef.current);

      let stream;
      try {
        stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: 'user', width: { ideal: 1280 }, height: { ideal: 720 } },
          audio: true,
        });
      } catch (err) {
        try {
          stream = await navigator.mediaDevices.getUserMedia({ video: false, audio: true });
          setIsCameraOff(true);
        } catch (e) {
          console.error('[VideoCall] Media access error:', e);
          alert('Camera/microphone access is required to answer this call.');
          await updateCallStatus(cId, 'declined');
          setIncomingCall(null);
          return;
        }
      }

      localStreamRef.current = stream;
      setLocalStream(stream);

      const pc = createPC(cId, false);
      stream.getTracks().forEach((t) => pc.addTrack(t, stream));

      subscribeRemoteCandidates(cId, 'caller');

      try {
        await pc.setRemoteDescription(new RTCSessionDescription(callDoc.offer));
      } catch (e) {
        console.error('[VideoCall] setRemoteDescription offer error:', e);
        cleanup('ended', cId);
        return;
      }

      const answer = await pc.createAnswer();
      await pc.setLocalDescription(answer);
      await setCallAnswer(cId, answer);

      setCallStatus('accepted');
      setIncomingCall(null);

      durationTimerRef.current = setInterval(() => {
        setCallDuration((d) => d + 1);
      }, 1000);

      unsubCallRef.current?.();
      unsubCallRef.current = subscribeToCall(cId, (doc) => {
        if (!doc || doc.status === 'ended' || doc.status === 'missed') {
          cleanup('ended', null);
        }
      });
    },
    [createPC, subscribeRemoteCandidates, cleanup, stopRing]
  );

  // ── CALLEE: Decline Call ──────────────────────────────
  const declineCall = useCallback(
    async (callDoc) => {
      stopRing();
      const cId = callDoc?.id;
      setIncomingCall(null);
      clearTimeout(missedTimerRef.current);
      if (cId) {
        await updateCallStatus(cId, 'declined');
      }
    },
    [stopRing]
  );

  // ── End Call Button ───────────────────────────────────
  const endCall = useCallback(() => {
    stopRing();
    cleanup('ended', callIdRef.current);
  }, [cleanup, stopRing]);

  // ── Toggle Microphone ─────────────────────────────────
  const toggleMute = useCallback(() => {
    if (!localStreamRef.current) return;
    const nextMuted = !isMuted;
    localStreamRef.current.getAudioTracks().forEach((t) => {
      t.enabled = !nextMuted;
    });
    setIsMuted(nextMuted);
  }, [isMuted]);

  // ── Toggle Camera ─────────────────────────────────────
  const toggleCamera = useCallback(() => {
    if (!localStreamRef.current) return;
    const nextCameraOff = !isCameraOff;
    localStreamRef.current.getVideoTracks().forEach((t) => {
      t.enabled = !nextCameraOff;
    });
    setIsCameraOff(nextCameraOff);
  }, [isCameraOff]);

  // ── Switch Camera (Mobile Front/Rear) ──────────────────
  const switchCamera = useCallback(async () => {
    if (!localStreamRef.current || !pcRef.current) return;
    const newFacing = currentCameraFacing === 'user' ? 'environment' : 'user';
    try {
      const newStream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: newFacing },
      });
      const newVideoTrack = newStream.getVideoTracks()[0];
      const sender = pcRef.current.getSenders().find((s) => s.track && s.track.kind === 'video');

      if (sender && newVideoTrack) {
        await sender.replaceTrack(newVideoTrack);
        localStreamRef.current.getVideoTracks().forEach((t) => t.stop());
        localStreamRef.current.removeTrack(localStreamRef.current.getVideoTracks()[0]);
        localStreamRef.current.addTrack(newVideoTrack);
        setCurrentCameraFacing(newFacing);
      }
    } catch (e) {
      console.warn('[VideoCall] switchCamera error:', e);
    }
  }, [currentCameraFacing]);

  const allIdsKey = effectiveAllIds.join(',');

  // ── Global Listener for Incoming Calls ────────────────
  useEffect(() => {
    if (!myId && effectiveAllIds.length === 0) return;

    try {
      const q = query(collection(db, 'calls'), where('status', '==', 'ringing'));

      incomingUnsubRef.current = onSnapshot(
        q,
        (snapshot) => {
          snapshot.docChanges().forEach((change) => {
            const data = change.doc.data();
            const docId = change.doc.id;

            const isTargetedToMe =
              effectiveAllIds.includes(data.calleeId) ||
              (Array.isArray(data.calleeIds) && data.calleeIds.some((id) => effectiveAllIds.includes(id)));

            if (!isTargetedToMe) return;

            if (change.type === 'added') {
              if (!callIdRef.current) {
                setIncomingCall({ id: docId, ...data });
                ringtoneRef.current?.start?.(false);
              }
            } else if (change.type === 'modified' || change.type === 'removed') {
              if (data.status !== 'ringing') {
                setIncomingCall((curr) => {
                  if (curr && curr.id === docId) {
                    stopRing();
                    return null;
                  }
                  return curr;
                });
              }
            }
          });
        },
        (err) => {
          console.warn('[VideoCall] Incoming call subscription error:', err);
        }
      );
    } catch (err) {
      console.warn('[VideoCall] onSnapshot error:', err);
    }

    return () => {
      incomingUnsubRef.current?.();
      stopRing();
    };
  }, [myId, allIdsKey, stopRing]);

  return {
    callId,
    callStatus,
    incomingCall,
    remoteStream,
    localStream,
    isMuted,
    isCameraOff,
    callDuration,
    remoteInfo,
    videoDevices,
    currentCameraFacing,
    isInCall: !!callId || callStatus === 'calling',
    startCall,
    acceptCall,
    declineCall,
    endCall,
    toggleMute,
    toggleCamera,
    switchCamera,
  };
}

// ─────────────────────────────────────────────────────────
// Time Formatter (MM:SS)
// ─────────────────────────────────────────────────────────
function formatDuration(secs) {
  const m = Math.floor(secs / 60);
  const s = secs % 60;
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
}

// ─────────────────────────────────────────────────────────
// VideoCallButton Component (Header Icon)
// ─────────────────────────────────────────────────────────
export function VideoCallButton({
  calleeId,
  calleeName,
  calleeRole,
  calleeIds = [],
  disabled,
}) {
  const ctx = useVideoCall();
  if (!ctx) return null;
  const { startCall, isInCall } = ctx;

  const handleClick = (e) => {
    e.stopPropagation();
    if (disabled || isInCall) return;
    startCall(calleeId, calleeName, calleeRole, calleeIds);
  };

  return (
    <button
      type="button"
      onClick={handleClick}
      disabled={disabled || isInCall}
      title={isInCall ? 'In an active call' : `Start video call with ${calleeName}`}
      className={`h-8 w-8 rounded-xl flex items-center justify-center transition-all cursor-pointer flex-shrink-0 active:scale-95 ${
        disabled || isInCall
          ? 'text-slate-600 cursor-not-allowed opacity-50'
          : 'text-emerald-400 hover:text-white bg-emerald-500/10 hover:bg-emerald-500/20 border border-emerald-500/20 hover:border-emerald-500/40 shadow-xs'
      }`}
    >
      <Video size={16} />
    </button>
  );
}

// ─────────────────────────────────────────────────────────
// IncomingCallOverlay Component (WhatsApp-Style Ringing UI)
// ─────────────────────────────────────────────────────────
export function IncomingCallOverlay() {
  const ctx = useVideoCall();
  if (!ctx) return null;
  const { incomingCall, acceptCall, declineCall } = ctx;
  if (!incomingCall) return null;

  const callerInitials = (incomingCall.callerName || 'U')
    .split(' ')
    .map((n) => n[0])
    .join('')
    .slice(0, 2)
    .toUpperCase();

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/85 backdrop-blur-md animate-fade-in p-4 select-none">
      <div className="relative w-full max-w-sm bg-gradient-to-b from-[#111827] to-[#0b0f19] border border-white/10 rounded-3xl p-8 flex flex-col items-center gap-7 shadow-[0_0_60px_rgba(16,185,129,0.15)]">
        {/* Pulsing ring animation */}
        <div className="relative flex items-center justify-center my-2">
          <span className="absolute w-32 h-32 rounded-full bg-emerald-500/15 animate-ping [animation-duration:2s]" />
          <span className="absolute w-24 h-24 rounded-full bg-emerald-500/20 animate-ping [animation-duration:1.5s]" />
          <div className="relative w-20 h-20 rounded-full bg-gradient-to-br from-emerald-500 to-teal-600 flex items-center justify-center shadow-lg shadow-emerald-500/40 text-white font-bold text-2xl tracking-tight border-2 border-white/20">
            {callerInitials}
          </div>
        </div>

        {/* Caller Info */}
        <div className="text-center space-y-1.5">
          <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-[11px] font-semibold uppercase tracking-wider">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
            Incoming Video Call
          </div>
          <h2 className="text-xl font-bold text-white truncate max-w-[260px] tracking-tight">
            {incomingCall.callerName}
          </h2>
          <p className="text-xs text-slate-400 font-medium capitalize">
            {incomingCall.callerRole}
          </p>
        </div>

        {/* WhatsApp-Style Accept / Decline Buttons */}
        <div className="flex items-center justify-around w-full pt-2 px-4">
          {/* Decline */}
          <button
            type="button"
            onClick={() => declineCall(incomingCall)}
            className="flex flex-col items-center gap-2 group cursor-pointer active:scale-95 transition-transform"
          >
            <div className="w-14 h-14 rounded-full bg-red-600 hover:bg-red-500 flex items-center justify-center shadow-lg shadow-red-600/40 transition-all group-hover:scale-105 border border-red-400/20">
              <PhoneOff size={22} className="text-white" />
            </div>
            <span className="text-xs font-medium text-slate-300 group-hover:text-white">
              Decline
            </span>
          </button>

          {/* Accept */}
          <button
            type="button"
            onClick={() => acceptCall(incomingCall)}
            className="flex flex-col items-center gap-2 group cursor-pointer active:scale-95 transition-transform"
          >
            <div className="w-14 h-14 rounded-full bg-emerald-500 hover:bg-emerald-400 flex items-center justify-center shadow-lg shadow-emerald-500/50 transition-all group-hover:scale-105 border border-emerald-300/30 animate-pulse">
              <Phone size={22} className="text-white" />
            </div>
            <span className="text-xs font-semibold text-emerald-400 group-hover:text-emerald-300">
              Accept
            </span>
          </button>
        </div>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────
// ActiveCallScreen Component (Live In-Call UI)
// ─────────────────────────────────────────────────────────
export function ActiveCallScreen() {
  const ctx = useVideoCall();
  const remoteVideoRef = useRef(null);
  const localVideoRef = useRef(null);
  const [isPipExpanded, setIsPipExpanded] = useState(false);

  const {
    callStatus,
    remoteStream,
    localStream,
    isMuted,
    isCameraOff,
    callDuration,
    remoteInfo,
    videoDevices,
    currentCameraFacing = 'user',
    endCall,
    toggleMute,
    toggleCamera,
    switchCamera,
  } = ctx || {};

  useEffect(() => {
    if (remoteVideoRef.current && remoteStream) {
      remoteVideoRef.current.srcObject = remoteStream;
    }
  }, [remoteStream]);

  useEffect(() => {
    if (localVideoRef.current && localStream) {
      localVideoRef.current.srcObject = localStream;
    }
  }, [localStream]);

  if (!ctx) return null;

  const isCallingOrConnected =
    callStatus === 'calling' ||
    callStatus === 'accepted' ||
    callStatus === 'ringing';

  if (!isCallingOrConnected) {
    if (callStatus === 'ended' || callStatus === 'declined' || callStatus === 'missed') {
      return (
        <div className="fixed inset-0 z-[9998] flex items-center justify-center bg-black/80 backdrop-blur-sm animate-fade-in select-none">
          <div className="bg-[#0F1623] border border-white/10 rounded-2xl px-8 py-6 flex flex-col items-center gap-3 shadow-2xl">
            <div className="w-12 h-12 rounded-full bg-red-500/10 flex items-center justify-center text-red-400">
              <PhoneMissed size={26} />
            </div>
            <p className="text-white font-semibold text-sm">
              {callStatus === 'declined'
                ? 'Call declined'
                : callStatus === 'missed'
                ? 'No answer'
                : 'Call ended'}
            </p>
            {callStatus === 'ended' && callDuration > 0 && (
              <p className="text-xs text-slate-400 font-mono">
                Duration: {formatDuration(callDuration)}
              </p>
            )}
          </div>
        </div>
      );
    }
    return null;
  }

  const isConnected = callStatus === 'accepted';
  const remoteInitials = (remoteInfo?.name || 'U')
    .split(' ')
    .map((n) => n[0])
    .join('')
    .slice(0, 2)
    .toUpperCase();

  return (
    <div className="fixed inset-0 z-[9998] bg-[#070A12] flex flex-col overflow-hidden select-none animate-fade-in">
      {/* ── Main View (Remote Stream / Avatar) ── */}
      <div className="flex-1 relative overflow-hidden bg-[#0a0f1c] flex items-center justify-center">
        {isConnected && remoteStream ? (
          <video
            ref={remoteVideoRef}
            autoPlay
            playsInline
            className="w-full h-full object-cover"
          />
        ) : (
          <div className="w-full h-full flex flex-col items-center justify-center gap-5 p-6 bg-gradient-to-b from-[#0b0f19] to-[#070A12]">
            <div className="relative">
              <span className="absolute -inset-4 rounded-full bg-blue-500/20 animate-ping [animation-duration:2.5s]" />
              <div className="relative w-28 h-28 rounded-full bg-gradient-to-br from-blue-600 to-indigo-700 flex items-center justify-center shadow-2xl border-2 border-white/10">
                <span className="text-3xl font-bold text-white tracking-tight">
                  {remoteInitials}
                </span>
              </div>
            </div>

            <div className="text-center space-y-1">
              <h3 className="text-xl font-bold text-white tracking-tight">
                {remoteInfo?.name || 'Connecting...'}
              </h3>
              <p className="text-xs text-slate-400 capitalize">
                {remoteInfo?.role ? `${remoteInfo.role}` : ''}
              </p>
              <div className="pt-2">
                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/[0.05] border border-white/[0.08] text-xs text-slate-300 font-medium">
                  <span
                    className={`w-2 h-2 rounded-full ${
                      isConnected ? 'bg-emerald-400' : 'bg-amber-400 animate-pulse'
                    }`}
                  />
                  {callStatus === 'calling'
                    ? 'Ringing...'
                    : isConnected
                    ? 'Connected'
                    : 'Connecting...'}
                </span>
              </div>
            </div>
          </div>
        )}

        {/* ── Top Floating Glass Pill (Remote Name & Duration) ── */}
        <div className="absolute top-5 left-0 right-0 flex justify-center pointer-events-none px-4 z-20">
          <div className="bg-[#0b0f19]/80 backdrop-blur-md border border-white/10 rounded-full px-4 py-1.5 flex items-center gap-2.5 shadow-lg">
            <span
              className={`w-2 h-2 rounded-full ${
                isConnected ? 'bg-emerald-400 animate-pulse' : 'bg-amber-400 animate-pulse'
              }`}
            />
            <span className="text-xs font-semibold text-white truncate max-w-[140px] sm:max-w-[200px]">
              {remoteInfo?.name || 'Calling'}
            </span>
            {isConnected && (
              <span className="text-[11px] font-mono text-emerald-400 bg-emerald-500/15 border border-emerald-500/20 px-2 py-0.5 rounded-full">
                {formatDuration(callDuration)}
              </span>
            )}
          </div>
        </div>

        {/* ── PiP Local Preview (Bottom Right) ── */}
        <div
          className={`absolute z-30 transition-all duration-200 overflow-hidden rounded-2xl border-2 border-white/20 shadow-2xl bg-[#111827] ${
            isPipExpanded
              ? 'bottom-24 right-4 w-44 sm:w-56 aspect-[3/4]'
              : 'bottom-24 right-4 sm:bottom-28 sm:right-6 w-28 sm:w-36 aspect-[3/4]'
          }`}
        >
          {localStream && !isCameraOff ? (
            <video
              ref={localVideoRef}
              autoPlay
              playsInline
              muted
              className="w-full h-full object-cover"
              style={{ transform: currentCameraFacing === 'user' ? 'scaleX(-1)' : 'none' }}
            />
          ) : (
            <div className="w-full h-full flex flex-col items-center justify-center gap-1 bg-[#121826] text-slate-400">
              <VideoOff size={18} />
              <span className="text-[10px]">Camera off</span>
            </div>
          )}

          {/* PiP expand toggle */}
          <button
            type="button"
            onClick={() => setIsPipExpanded((v) => !v)}
            className="absolute top-1.5 right-1.5 p-1 rounded-md bg-black/50 text-white hover:bg-black/80 transition-colors"
            title={isPipExpanded ? 'Minimize' : 'Expand'}
          >
            {isPipExpanded ? <Minimize2 size={12} /> : <Maximize2 size={12} />}
          </button>

          <div className="absolute bottom-1 left-2 pointer-events-none">
            <span className="text-[10px] text-white/80 font-semibold px-1 rounded bg-black/40">
              You {isMuted ? '(Muted)' : ''}
            </span>
          </div>
        </div>
      </div>

      {/* ── WhatsApp-Style Floating Bottom Dock ── */}
      <div className="flex-shrink-0 bg-[#090d16]/95 backdrop-blur-xl border-t border-white/[0.08] px-4 py-4 pb-safe z-40">
        <div className="max-w-md mx-auto flex items-center justify-around gap-2 sm:gap-4">
          {/* Mute Mic */}
          <button
            type="button"
            onClick={toggleMute}
            className="flex flex-col items-center gap-1.5 group cursor-pointer"
            title={isMuted ? 'Unmute microphone' : 'Mute microphone'}
          >
            <div
              className={`w-12 h-12 rounded-full flex items-center justify-center transition-all group-hover:scale-105 active:scale-95 ${
                isMuted
                  ? 'bg-red-600 text-white shadow-md shadow-red-600/30'
                  : 'bg-white/10 hover:bg-white/20 text-white border border-white/10'
              }`}
            >
              {isMuted ? <MicOff size={20} /> : <Mic size={20} />}
            </div>
            <span className="text-[10px] font-medium text-slate-400 group-hover:text-white">
              {isMuted ? 'Unmute' : 'Mute'}
            </span>
          </button>

          {/* End Call (Hang Up) */}
          <button
            type="button"
            onClick={endCall}
            className="flex flex-col items-center gap-1.5 group cursor-pointer active:scale-95 transition-transform"
            title="End call"
          >
            <div className="w-14 h-14 rounded-full bg-red-600 hover:bg-red-500 flex items-center justify-center shadow-xl shadow-red-600/50 transition-all group-hover:scale-105 border border-red-400/30">
              <PhoneOff size={24} className="text-white" />
            </div>
            <span className="text-[10px] font-semibold text-red-400 group-hover:text-red-300">
              End Call
            </span>
          </button>

          {/* Camera On/Off */}
          <button
            type="button"
            onClick={toggleCamera}
            className="flex flex-col items-center gap-1.5 group cursor-pointer"
            title={isCameraOff ? 'Turn camera on' : 'Turn camera off'}
          >
            <div
              className={`w-12 h-12 rounded-full flex items-center justify-center transition-all group-hover:scale-105 active:scale-95 ${
                isCameraOff
                  ? 'bg-red-600 text-white shadow-md shadow-red-600/30'
                  : 'bg-white/10 hover:bg-white/20 text-white border border-white/10'
              }`}
            >
              {isCameraOff ? <VideoOff size={20} /> : <Video size={20} />}
            </div>
            <span className="text-[10px] font-medium text-slate-400 group-hover:text-white">
              {isCameraOff ? 'Cam On' : 'Cam Off'}
            </span>
          </button>

          {/* Flip Camera (if multi-camera device) */}
          {videoDevices.length > 1 && (
            <button
              type="button"
              onClick={switchCamera}
              className="flex flex-col items-center gap-1.5 group cursor-pointer"
              title="Switch camera"
            >
              <div className="w-12 h-12 rounded-full bg-white/10 hover:bg-white/20 text-white border border-white/10 flex items-center justify-center transition-all group-hover:scale-105 active:scale-95">
                <SwitchCamera size={20} />
              </div>
              <span className="text-[10px] font-medium text-slate-400 group-hover:text-white">
                Flip
              </span>
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────
// MissedCallMessage Component (Chat Feed Log Bubble)
// ─────────────────────────────────────────────────────────
export function MissedCallMessage({ msg, isMe }) {
  const status = msg.callStatus;
  const duration = msg.callDuration;

  const isMissed = status === 'missed' || status === 'declined';

  return (
    <div
      className={`flex items-center gap-2.5 px-3.5 py-2 rounded-2xl max-w-xs text-xs font-medium my-1 shadow-xs ${
        isMe
          ? isMissed
            ? 'bg-red-950/40 border border-red-500/20 text-red-200 self-end ml-auto'
            : 'bg-blue-900/30 border border-blue-500/20 text-blue-200 self-end ml-auto'
          : isMissed
          ? 'bg-red-950/40 border border-red-500/20 text-red-200'
          : 'bg-white/[0.04] border border-white/[0.08] text-slate-200'
      }`}
    >
      <div
        className={`w-7 h-7 rounded-xl flex items-center justify-center flex-shrink-0 ${
          isMissed ? 'bg-red-500/20 text-red-400' : 'bg-emerald-500/20 text-emerald-400'
        }`}
      >
        {isMissed ? <PhoneMissed size={14} /> : <PhoneCall size={14} />}
      </div>
      <div className="min-w-0">
        <p className="font-semibold truncate">
          {isMissed
            ? status === 'declined'
              ? 'Declined call'
              : 'Missed video call'
            : 'Video call'}
        </p>
        <p className="text-[10px] text-slate-400 mt-0.5">
          {isMissed
            ? isMe
              ? 'No answer'
              : 'Tap video to call back'
            : duration
            ? `Duration: ${formatDuration(duration)}`
            : 'Call ended'}
        </p>
      </div>
    </div>
  );
}
