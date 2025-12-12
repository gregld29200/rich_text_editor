import { initializeApp, getApps, getApp, FirebaseApp } from 'firebase/app';
import { 
  getFirestore, 
  collection, 
  doc, 
  getDoc, 
  setDoc, 
  getDocs,
  query,
  orderBy,
  limit,
  Firestore,
  addDoc
} from 'firebase/firestore';
import { BookStructure, BookSection, BookVersion, SectionStatus } from '../types';

let app: FirebaseApp | undefined;
let db: Firestore | undefined;

// Configuration for the "La Santé dans l'Assiette" Editor
const firebaseConfig = {
  apiKey: "AIzaSyDqE2ijxOKLsE2hFVlpFqqKGGwg5_7taR4",
  authDomain: "sante-dans-assiette-editor.firebaseapp.com",
  projectId: "sante-dans-assiette-editor",
  storageBucket: "sante-dans-assiette-editor.firebasestorage.app",
  messagingSenderId: "471130640122",
  appId: "1:471130640122:web:6b2bb73f3a8adc18430343"
};

export const initFirebase = (config: any = firebaseConfig) => {
  if (!getApps().length) {
    app = initializeApp(config);
  } else {
    app = getApp();
  }
  db = getFirestore(app);
  return app;
};

export const isFirebaseInitialized = () => !!db;

const BOOK_ID = 'health-plate';

// 1. SAVE/LOAD STRUCTURE (Sidebar Data only, no heavy content)
export const saveBookStructure = async (structure: BookStructure) => {
  if (!db) return;
  
  // Create a lightweight version of the structure (strip content/history)
  const lightParts = structure.parts.map(part => ({
    ...part,
    chapters: part.chapters.map(c => ({
      id: c.id,
      title: c.title,
      status: c.status,
      // We do NOT save content or history here to keep it fast
    }))
  }));

  const bookRef = doc(db, 'books', BOOK_ID);
  await setDoc(bookRef, { structure: { parts: lightParts }, lastUpdated: Date.now() }, { merge: true });
};

export const loadBookStructure = async (): Promise<BookStructure | null> => {
  if (!db) return null;
  const bookRef = doc(db, 'books', BOOK_ID);
  const snap = await getDoc(bookRef);
  
  if (snap.exists()) {
    return snap.data().structure as BookStructure;
  }
  return null;
};

// 2. SAVE/LOAD SPECIFIC SECTION CONTENT
export const loadSectionContent = async (sectionId: string): Promise<{ content: string, status: SectionStatus } | null> => {
  if (!db) return null;
  const sectionRef = doc(db, 'books', BOOK_ID, 'sections', sectionId);
  const snap = await getDoc(sectionRef);
  
  if (snap.exists()) {
    const data = snap.data();
    return {
      content: data.content,
      status: data.status
    };
  }
  return null;
};

export const saveSectionContent = async (sectionId: string, content: string, status: SectionStatus) => {
  if (!db) return;
  const sectionRef = doc(db, 'books', BOOK_ID, 'sections', sectionId);
  await setDoc(sectionRef, { content, status, lastUpdated: Date.now() }, { merge: true });
};

// 3. HISTORY MANAGEMENT (Sub-collection)
export const addHistoryEntry = async (sectionId: string, version: BookVersion) => {
  if (!db) return;
  // Use specific ID or auto-ID. Here we use timestamp as ID for easy sorting if needed, 
  // but addDoc is often safer. Let's use setDoc with ID.
  const historyRef = doc(db, 'books', BOOK_ID, 'sections', sectionId, 'history', version.id);
  await setDoc(historyRef, version);
};

export const loadSectionHistory = async (sectionId: string): Promise<BookVersion[]> => {
  if (!db) return [];
  const historyRef = collection(db, 'books', BOOK_ID, 'sections', sectionId, 'history');
  const q = query(historyRef, orderBy('timestamp', 'desc'), limit(20));
  const snap = await getDocs(q);
  
  return snap.docs.map(d => d.data() as BookVersion);
};