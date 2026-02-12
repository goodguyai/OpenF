"use client";

import {
  createContext,
  useContext,
  useEffect,
  useState,
  ReactNode,
} from "react";
import {
  User,
  onAuthStateChanged,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signOut as firebaseSignOut,
} from "firebase/auth";
import {
  doc,
  getDoc,
  setDoc,
  serverTimestamp,
  updateDoc,
  arrayUnion,
} from "firebase/firestore";
import { auth, db } from "@/lib/firebase/client";

interface OrgData {
  id: string;
  name: string;
  ownerId: string;
  ragieConnectionId: string | null;
  stripeAccountId: string | null;
  stripeOnboardingComplete: boolean;
  stripePriceId: string | null;
  subscriptionPriceInCents: number | null;
  createdAt: Date;
  updatedAt: Date;
}

interface UserData {
  email: string;
  roles: string[];
  orgId: string | null;
  subscribedOrgIds: string[];
  createdAt: Date;
  updatedAt: Date;
}

interface AuthContextType {
  user: User | null;
  userData: UserData | null;
  orgData: OrgData | null;
  loading: boolean;
  signUpAsCreator: (
    email: string,
    password: string,
    orgName: string
  ) => Promise<void>;
  signUpAsUser: (email: string, password: string, subscribeToOrgId?: string) => Promise<void>;
  signIn: (email: string, password: string) => Promise<UserData | null>;
  signOut: () => Promise<void>;
  refreshUserData: () => Promise<void>;
  refreshOrgData: () => Promise<void>;
  subscribeToOrg: (orgId: string) => Promise<void>;
}

function getAuthErrorMessage(error: unknown): string {
  if (!(error instanceof Error)) return "An unexpected error occurred.";
  const code = (error as { code?: string }).code;
  switch (code) {
    case "auth/email-already-in-use":
      return "An account with this email already exists.";
    case "auth/invalid-email":
      return "Please enter a valid email address.";
    case "auth/weak-password":
      return "Password must be at least 6 characters.";
    case "auth/user-not-found":
    case "auth/wrong-password":
    case "auth/invalid-credential":
      return "Invalid email or password.";
    case "auth/too-many-requests":
      return "Too many attempts. Please try again later.";
    default:
      return "An unexpected error occurred. Please try again.";
  }
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [userData, setUserData] = useState<UserData | null>(null);
  const [orgData, setOrgData] = useState<OrgData | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchUserData = async (uid: string) => {
    const userDoc = await getDoc(doc(db, "users", uid));
    if (userDoc.exists()) {
      const data = userDoc.data();
      const fetchedUserData: UserData = {
        email: data.email,
        roles: data.roles,
        orgId: data.orgId || null,
        subscribedOrgIds: data.subscribedOrgIds || [],
        createdAt: data.createdAt?.toDate(),
        updatedAt: data.updatedAt?.toDate(),
      };
      setUserData(fetchedUserData);
      return fetchedUserData;
    }
    return null;
  };

  const fetchOrgData = async (orgId: string) => {
    const orgDoc = await getDoc(doc(db, "orgs", orgId));
    if (orgDoc.exists()) {
      const data = orgDoc.data();
      setOrgData({
        id: orgDoc.id,
        name: data.name,
        ownerId: data.ownerId,
        ragieConnectionId: data.ragieConnectionId,
        stripeAccountId: data.stripeAccountId || null,
        stripeOnboardingComplete: data.stripeOnboardingComplete || false,
        stripePriceId: data.stripePriceId || null,
        subscriptionPriceInCents: data.subscriptionPriceInCents || null,
        createdAt: data.createdAt?.toDate(),
        updatedAt: data.updatedAt?.toDate(),
      });
    }
  };

  const refreshUserData = async () => {
    if (user) {
      const fetchedUserData = await fetchUserData(user.uid);
      if (fetchedUserData?.orgId) {
        await fetchOrgData(fetchedUserData.orgId);
      }
    }
  };

  const refreshOrgData = async () => {
    if (userData?.orgId) {
      await fetchOrgData(userData.orgId);
    }
  };

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      setUser(user);
      if (user) {
        const fetchedUserData = await fetchUserData(user.uid);
        // If user is a creator with an org, fetch org data
        if (fetchedUserData?.orgId) {
          await fetchOrgData(fetchedUserData.orgId);
        }
      } else {
        setUserData(null);
        setOrgData(null);
      }
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  const signUpAsCreator = async (
    email: string,
    password: string,
    orgName: string
  ) => {
    try {
      const userCredential = await createUserWithEmailAndPassword(
        auth,
        email,
        password
      );

      const uid = userCredential.user.uid;

      const orgRef = doc(db, "orgs", uid);
      await setDoc(orgRef, {
        name: orgName,
        ownerId: uid,
        ragieConnectionId: null,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });

      await setDoc(doc(db, "users", uid), {
        email: userCredential.user.email,
        roles: ["creator"],
        orgId: uid,
        subscribedOrgIds: [],
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });

      await fetchUserData(uid);
      await fetchOrgData(uid);
    } catch (error) {
      throw new Error(getAuthErrorMessage(error));
    }
  };

  const signUpAsUser = async (email: string, password: string, subscribeToOrgId?: string) => {
    try {
      const userCredential = await createUserWithEmailAndPassword(
        auth,
        email,
        password
      );

      await setDoc(doc(db, "users", userCredential.user.uid), {
        email: userCredential.user.email,
        roles: ["user"],
        orgId: null,
        subscribedOrgIds: subscribeToOrgId ? [subscribeToOrgId] : [],
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });

      await fetchUserData(userCredential.user.uid);
    } catch (error) {
      throw new Error(getAuthErrorMessage(error));
    }
  };

  const signIn = async (email: string, password: string): Promise<UserData | null> => {
    try {
      const userCredential = await signInWithEmailAndPassword(auth, email, password);
      const fetchedUserData = await fetchUserData(userCredential.user.uid);
      if (fetchedUserData?.orgId) {
        await fetchOrgData(fetchedUserData.orgId);
      }
      return fetchedUserData;
    } catch (error) {
      throw new Error(getAuthErrorMessage(error));
    }
  };

  const signOut = async () => {
    await firebaseSignOut(auth);
    setUserData(null);
    setOrgData(null);
  };

  const subscribeToOrg = async (orgId: string) => {
    if (!user) return;

    await updateDoc(doc(db, "users", user.uid), {
      subscribedOrgIds: arrayUnion(orgId),
      updatedAt: serverTimestamp(),
    });

    await fetchUserData(user.uid);
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        userData,
        orgData,
        loading,
        signUpAsCreator,
        signUpAsUser,
        signIn,
        signOut,
        refreshUserData,
        refreshOrgData,
        subscribeToOrg,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}
