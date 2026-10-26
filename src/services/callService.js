/**
 * callService.js
 * Firestore-based WebRTC signalling helpers.
 *
 * Call documents live at:   /calls/{callId}
 * ICE candidates live at:   /calls/{callId}/callerCandidates/{id}
 *                           /calls/{callId}/calleeCandidates/{id}
 *
 * This collection is intentionally at the root (not under /schools/{id})
 * so both the caller and callee can access it regardless of their tenant routing.
 */

import {
  collection,
  doc,
  addDoc,
  setDoc,
  updateDoc,
  getDoc,
  deleteDoc,
  onSnapshot,
  serverTimestamp,
} from 'firebase/firestore';
import { db } from '../config/firebase.js';

// ── STUN / TURN configuration ─────────────────────────────────────────────
// Uses Google's free public STUN servers.
// For production on restrictive networks, add TURN credentials to your .env:
//   VITE_TURN_URL=turn:your-turn-server:3478
//   VITE_TURN_USERNAME=your-username
//   VITE_TURN_CREDENTIAL=your-credential
export function getIceServers() {
  const servers = [
    { urls: 'stun:stun.l.google.com:19302' },
    { urls: 'stun:stun1.l.google.com:19302' },
    { urls: 'stun:stun2.l.google.com:19302' },
  ];

  const turnUrl = import.meta.env.VITE_TURN_URL;
  const turnUser = import.meta.env.VITE_TURN_USERNAME;
  const turnCred = import.meta.env.VITE_TURN_CREDENTIAL;

  if (turnUrl && turnUser && turnCred) {
    servers.push({
      urls: turnUrl,
      username: turnUser,
      credential: turnCred,
    });
  }

  return servers;
}

// ── Collection reference ──────────────────────────────────────────────────
const callsCol = () => collection(db, 'calls');
const callDoc = (callId) => doc(db, 'calls', callId);
const candidatesCol = (callId, side) =>
  collection(db, 'calls', callId, `${side}Candidates`);

// ── Create a new call document ────────────────────────────────────────────
/**
 * @param {object} data  callerId, callerName, callerRole, calleeId, calleeName, calleeRole
 * @returns {Promise<string>} callId
 */
export async function createCall(data) {
  const ref = await addDoc(callsCol(), {
    ...data,
    status: 'ringing',
    offer: null,
    answer: null,
    createdAt: serverTimestamp(),
  });
  return ref.id;
}

// ── Write the WebRTC offer (caller side) ─────────────────────────────────
export async function setCallOffer(callId, offer) {
  await updateDoc(callDoc(callId), { offer: { type: offer.type, sdp: offer.sdp } });
}

// ── Write the WebRTC answer (callee side) ────────────────────────────────
export async function setCallAnswer(callId, answer) {
  await updateDoc(callDoc(callId), {
    answer: { type: answer.type, sdp: answer.sdp },
    status: 'accepted',
  });
}

// ── Update call status ────────────────────────────────────────────────────
export async function updateCallStatus(callId, status) {
  try {
    await updateDoc(callDoc(callId), { status });
  } catch (e) {
    console.warn('[callService] updateCallStatus error:', e);
  }
}

// ── Add an ICE candidate ──────────────────────────────────────────────────
export async function addIceCandidate(callId, candidate, side) {
  try {
    await addDoc(candidatesCol(callId, side), {
      candidate: candidate.candidate,
      sdpMid: candidate.sdpMid,
      sdpMLineIndex: candidate.sdpMLineIndex,
      usernameFragment: candidate.usernameFragment ?? null,
    });
  } catch (e) {
    console.warn('[callService] addIceCandidate error:', e);
  }
}

// ── Subscribe to a call document ─────────────────────────────────────────
export function subscribeToCall(callId, callback) {
  return onSnapshot(callDoc(callId), (snap) => {
    if (snap.exists()) {
      callback({ id: snap.id, ...snap.data() });
    } else {
      callback(null);
    }
  });
}

// ── Subscribe to ICE candidates from the remote side ─────────────────────
export function subscribeToIceCandidates(callId, side, callback) {
  return onSnapshot(candidatesCol(callId, side), (snap) => {
    snap.docChanges().forEach((change) => {
      if (change.type === 'added') {
        callback(change.doc.data());
      }
    });
  });
}

// ── Delete a call document and its sub-collections ───────────────────────
export async function deleteCall(callId) {
  try {
    await deleteDoc(callDoc(callId));
  } catch (e) {
    console.warn('[callService] deleteCall error:', e);
  }
}

// ── Get a call document once ──────────────────────────────────────────────
export async function getCall(callId) {
  try {
    const snap = await getDoc(callDoc(callId));
    return snap.exists() ? { id: snap.id, ...snap.data() } : null;
  } catch (e) {
    return null;
  }
}
