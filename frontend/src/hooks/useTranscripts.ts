// src/hooks/useTranscripts.ts
import { useState, useEffect } from "react";
import {
  collection,
  addDoc,
  getDocs,
  doc,
  deleteDoc,
  getDoc,
  updateDoc,
} from "firebase/firestore";
import { db } from "../firebase/firebase";
import type { User } from "firebase/auth";

export function useTranscripts(user: User | null) {
  const [transcripts, setTranscripts] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

  // get transcripts of that user
  const fetchTranscripts = async () => {
    if (!user) return;
    setLoading(true);

    const transcriptsRef = collection(db, "users", user.uid, "transcripts");
    const snapshot = await getDocs(transcriptsRef);

    const data = snapshot.docs.map((doc) => {
      const d = doc.data();
      return {
        id: doc.id,
        notesName: d.notesName || "Untitled",
        recordedAt: d.recordedAt,
      };
    });

    setTranscripts(data);
    setLoading(false);
  };

  //get a single transcript
  const fetchTranscriptById = async (transcriptId: string) => {
    if (!user) return null;
    try {
      const transcriptRef = doc(
        db,
        "users",
        user.uid,
        "transcripts",
        transcriptId
      );
      const docSnap = await getDoc(transcriptRef);

      if (docSnap.exists()) {
        return { id: docSnap.id, ...docSnap.data() };
      } else {
        console.warn("Transcript not found:", transcriptId);
        return null;
      }
    } catch (error) {
      console.error("Error fetching transcript by ID:", error);
      return null;
    }
  };

  // add a new transcript
  const addTranscript = async (notesContent: string) => {
    if (!user) return;
    const transcriptsRef = collection(db, "users", user.uid, "transcripts");

    await addDoc(transcriptsRef, {
      recordedAt: new Date().toISOString(),
      notesName: "Note",
      notesContent: notesContent,
    });

    await fetchTranscripts(); // add then get transcripts again
  };

  // delete a transcript
  const deleteTranscript = async (transcriptId: string) => {
    if (!user) return;
    await deleteDoc(doc(db, "users", user.uid, "transcripts", transcriptId));
    await fetchTranscripts();
  };

  // update an existing transcript
  const updateTranscript = async (
    transcriptId: string,
    updates: { notesName?: string; notesContent?: string }
  ) => {
    if (!user) return;
    try {
      console.log("11111");
      const transcriptRef = doc(
        db,
        "users",
        user.uid,
        "transcripts",
        transcriptId
      );
      await updateDoc(transcriptRef, updates);
      await fetchTranscripts();
    } catch (error) {
      console.error("Error updating transcript:", error);
    }
  };

  //reload
  useEffect(() => {
    if (user) fetchTranscripts();
  }, [user]);

  return {
    transcripts,
    loading,
    addTranscript,
    deleteTranscript,
    fetchTranscripts,
    fetchTranscriptById,
    updateTranscript,
  };
}
