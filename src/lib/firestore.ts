import {
  collection,
  addDoc,
  getDocs,
  getDoc,
  doc,
  setDoc,
  query,
  where,
  orderBy,
  limit,
  serverTimestamp,
  type Timestamp,
} from "firebase/firestore";
import { getFirestoreDb } from "@/integrations/firebase/config";

const FILINGS_COLLECTION = "filings";
const DRAFTS_COLLECTION = "drafts";

export interface FilingRecord {
  id?: string;
  userId: string;
  arn: string;
  status: string;
  assessmentYear: string;
  createdAt: Date | ReturnType<typeof serverTimestamp>;
  itrVUrl?: string;
  applicationId?: string;
}

export interface DraftRecord {
  id?: string;
  userId: string;
  draft: Record<string, unknown>;
  updatedAt: Date | ReturnType<typeof serverTimestamp>;
}

function toDate(ts: unknown): string {
  if (!ts) return "—";
  if (ts instanceof Date) return ts.toISOString().slice(0, 10);
  if (typeof ts === "object" && ts !== null && "toDate" in ts) {
    return (ts as { toDate: () => Date }).toDate().toISOString().slice(0, 10);
  }
  if (typeof ts === "string") return ts.slice(0, 10);
  return "—";
}

/** Save a filing to Firestore. No-op if Firebase is not configured. */
export async function addFiling(
  userId: string,
  data: Omit<FilingRecord, "userId" | "createdAt">
): Promise<string | null> {
  const db = getFirestoreDb();
  if (!db) return null;

  const docRef = await addDoc(collection(db, FILINGS_COLLECTION), {
    userId,
    arn: data.arn,
    status: data.status ?? "Submitted",
    assessmentYear: data.assessmentYear,
    createdAt: serverTimestamp(),
    itrVUrl: data.itrVUrl ?? null,
    applicationId: data.applicationId ?? null,
  });
  return docRef.id;
}

/** List filings for a user, newest first. Returns empty array if Firebase not configured or error. */
export async function getFilings(userId: string): Promise<(FilingRecord & { id: string })[]> {
  const db = getFirestoreDb();
  if (!db) return [];

  try {
    const q = query(
      collection(db, FILINGS_COLLECTION),
      where("userId", "==", userId),
      orderBy("createdAt", "desc"),
      limit(50)
    );
    const snapshot = await getDocs(q);
    return snapshot.docs.map((doc) => {
      const d = doc.data();
      return {
        id: doc.id,
        userId: d.userId as string,
        arn: d.arn as string,
        status: (d.status as string) ?? "Submitted",
        assessmentYear: (d.assessmentYear as string) ?? "",
        createdAt: d.createdAt as Timestamp | Date,
        itrVUrl: d.itrVUrl as string | undefined,
        applicationId: d.applicationId as string | undefined,
      };
    });
  } catch {
    return [];
  }
}

/** Format filing date for display. */
export function formatFilingDate(createdAt: FilingRecord["createdAt"]): string {
  return toDate(createdAt);
}

/** Save draft to Firestore (optional Phase 4.5). One doc per user (id = userId). No-op if Firebase not configured. */
export async function saveDraftToCloud(
  userId: string,
  draft: Record<string, unknown>
): Promise<string | null> {
  const db = getFirestoreDb();
  if (!db) return null;

  try {
    const ref = doc(db, DRAFTS_COLLECTION, userId);
    await setDoc(ref, { userId, draft, updatedAt: serverTimestamp() }, { merge: true });
    return ref.id;
  } catch {
    return null;
  }
}

/** Load draft from Firestore for user. Returns null if none or not configured. */
export async function loadDraftFromCloud(
  userId: string
): Promise<Record<string, unknown> | null> {
  const db = getFirestoreDb();
  if (!db) return null;

  try {
    const ref = doc(db, DRAFTS_COLLECTION, userId);
    const snap = await getDoc(ref);
    if (!snap.exists()) return null;
    const d = snap.data();
    return (d.draft as Record<string, unknown>) ?? null;
  } catch {
    return null;
  }
}
