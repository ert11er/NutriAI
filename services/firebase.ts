
import { initializeApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getFirestore, doc, setDoc, getDoc, serverTimestamp } from 'firebase/firestore';
import firebaseConfig from '../firebase-applet-config.json';
import { UserData, DietPlan } from '../types';

const app = initializeApp(firebaseConfig);
export const db = getFirestore(app, firebaseConfig.firestoreDatabaseId);
export const auth = getAuth();

/**
 * Generates a 10-digit alphanumeric ID (numbers, uppercase, lowercase)
 */
export function generatePlanId(): string {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  let result = '';
  for (let i = 0; i < 10; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
}

export async function saveDietPlan(userData: UserData, plan: DietPlan): Promise<string> {
  const planId = generatePlanId();
  const planRef = doc(db, 'plans', planId);
  
  await setDoc(planRef, {
    userData,
    plan,
    createdAt: serverTimestamp()
  });
  
  return planId;
}

export async function updateDietPlan(planId: string, userData: UserData, plan: DietPlan): Promise<void> {
  const planRef = doc(db, 'plans', planId);
  await setDoc(planRef, {
    userData,
    plan
  }, { merge: true });
}

export async function getDietPlan(planId: string): Promise<{ userData: UserData; plan: DietPlan } | null> {
  const planRef = doc(db, 'plans', planId);
  const planSnap = await getDoc(planRef);
  
  if (planSnap.exists()) {
    const data = planSnap.data();
    return {
      userData: data.userData as UserData,
      plan: data.plan as DietPlan
    };
  }
  
  return null;
}
