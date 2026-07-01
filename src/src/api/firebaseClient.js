import { initializeApp, getApps } from 'firebase/app';
import { getAnalytics, isSupported } from 'firebase/analytics';
import {
  createUserWithEmailAndPassword,
  getAuth,
  onAuthStateChanged,
  signInWithEmailAndPassword,
  signOut,
  updateProfile as updateFirebaseProfile,
} from 'firebase/auth';
import {
  addDoc,
  collection,
  deleteDoc,
  doc,
  getDoc,
  getDocs,
  getFirestore,
  query as firestoreQuery,
  serverTimestamp,
  setDoc,
  updateDoc,
  where,
} from 'firebase/firestore';
import { getDownloadURL, getStorage, ref, uploadBytes } from 'firebase/storage';

const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY || 'AIzaSyAXYefCFjclmfC1-eX8XybKWuKwoFj1jmw',
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN || 'coralhub-8aed5.firebaseapp.com',
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID || 'coralhub-8aed5',
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET || 'coralhub-8aed5.firebasestorage.app',
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID || '1041382843109',
  appId: import.meta.env.VITE_FIREBASE_APP_ID || '1:1041382843109:web:081fe941fa21759b916a0c',
  measurementId: import.meta.env.VITE_FIREBASE_MEASUREMENT_ID || 'G-H621TYSTJM',
};

const PLACEHOLDER_VALUES = new Set(['', 'sua_api_key', 'seu_project_id', 'your_api_key']);

const hasConfigValue = (value) =>
  !PLACEHOLDER_VALUES.has(String(value || '').trim().toLowerCase());

export const isFirebaseConfigured =
  hasConfigValue(firebaseConfig.apiKey) && hasConfigValue(firebaseConfig.projectId);
export const isUsingLocalFirebase = false;

const firebaseApp = isFirebaseConfigured
  ? getApps()[0] || initializeApp(firebaseConfig)
  : null;

const auth = firebaseApp ? getAuth(firebaseApp) : null;
const db = firebaseApp ? getFirestore(firebaseApp) : null;
const storage = firebaseApp ? getStorage(firebaseApp) : null;

if (firebaseApp && typeof window !== 'undefined') {
  isSupported()
    .then((supported) => {
      if (supported) getAnalytics(firebaseApp);
    })
    .catch(() => null);
}

const configurationError = () => {
  const error = new Error(
    'Firebase nao configurado. Preencha VITE_FIREBASE_API_KEY e VITE_FIREBASE_PROJECT_ID no arquivo .env.local.'
  );
  error.status = 503;
  return error;
};

const requireFirebase = () => {
  if (!isFirebaseConfigured || !firebaseApp || !auth || !db || !storage) {
    throw configurationError();
  }
};

const cleanPayload = (payload = {}) =>
  Object.fromEntries(
    Object.entries(payload).filter(([, value]) => value !== undefined)
  );

const toDataPayload = (payload = {}) => {
  const { id, uid, created_date, updated_date, created_at, updated_at, ...data } = cleanPayload(payload);
  return data;
};

const normalizeSort = (sort) => {
  if (!sort || typeof sort !== 'string') return null;
  const desc = sort.startsWith('-');
  return {
    field: sort.replace(/^-/, ''),
    direction: desc ? -1 : 1,
  };
};

const sortItems = (items, sort) => {
  const normalized = normalizeSort(sort);
  if (!normalized) return items;

  const { field, direction } = normalized;
  return [...items].sort((left, right) => {
    const a = left?.[field];
    const b = right?.[field];

    if (a === b) return 0;
    if (a === undefined || a === null) return 1;
    if (b === undefined || b === null) return -1;

    return a > b ? direction : -direction;
  });
};

const paginate = (items, limit, skip = 0) => {
  const start = Number(skip) || 0;
  const max = Number(limit) || 0;
  return max > 0 ? items.slice(start, start + max) : items.slice(start);
};

const matchesQuery = (item, query = {}) =>
  Object.entries(query || {}).every(([key, value]) => {
    if (value === undefined) return true;
    return item?.[key] === value;
  });

const timestampToIso = (value) => {
  if (!value) return new Date().toISOString();
  if (typeof value === 'string') return value;
  if (typeof value.toDate === 'function') return value.toDate().toISOString();
  return new Date(value).toISOString();
};

const rowToItem = (snapshot) => {
  const row = snapshot.data() || {};
  return {
    id: snapshot.id,
    created_date: timestampToIso(row.created_at),
    updated_date: timestampToIso(row.updated_at),
    ...(row.data || {}),
  };
};

const waitForAuthUser = (required = true) => {
  requireFirebase();

  if (auth.currentUser) {
    return Promise.resolve(auth.currentUser);
  }

  return new Promise((resolve, reject) => {
    const timer = window.setTimeout(() => {
      unsubscribe();
      if (required) {
        const error = new Error('Usuario nao autenticado.');
        error.status = 401;
        reject(error);
      } else {
        resolve(null);
      }
    }, 4000);

    const unsubscribe = onAuthStateChanged(
      auth,
      (user) => {
        window.clearTimeout(timer);
        unsubscribe();
        if (!user && required) {
          const error = new Error('Usuario nao autenticado.');
          error.status = 401;
          reject(error);
          return;
        }
        resolve(user || null);
      },
      (error) => {
        window.clearTimeout(timer);
        unsubscribe();
        reject(error);
      }
    );
  });
};

const getProfileDoc = (uid) => doc(db, 'profiles', uid);

const publicUserFromFirebase = async (authUser) => {
  if (!authUser) return null;

  requireFirebase();

  const now = new Date().toISOString();
  const baseProfile = {
    id: authUser.uid,
    uid: authUser.uid,
    email: authUser.email || '',
    full_name: authUser.displayName || authUser.email || '',
    photo_url: authUser.photoURL || '',
    role: 'user',
  };

  const profileRef = getProfileDoc(authUser.uid);
  const profileSnapshot = await getDoc(profileRef);

  if (!profileSnapshot.exists()) {
    await setDoc(profileRef, {
      email: baseProfile.email,
      full_name: baseProfile.full_name,
      photo_url: baseProfile.photo_url,
      role: baseProfile.role,
      data: {},
      created_at: serverTimestamp(),
      updated_at: serverTimestamp(),
    });

    return {
      ...baseProfile,
      created_date: now,
      updated_date: now,
    };
  }

  const profile = profileSnapshot.data() || {};
  const patch = {};
  if (!profile.email && baseProfile.email) patch.email = baseProfile.email;
  if (!profile.full_name && baseProfile.full_name) patch.full_name = baseProfile.full_name;
  if (!profile.photo_url && baseProfile.photo_url) patch.photo_url = baseProfile.photo_url;

  if (Object.keys(patch).length > 0) {
    await setDoc(profileRef, { ...patch, updated_at: serverTimestamp() }, { merge: true });
  }

  const data = profile.data || {};

  return {
    ...data,
    id: authUser.uid,
    uid: authUser.uid,
    email: profile.email || baseProfile.email,
    full_name: profile.full_name || baseProfile.full_name,
    photo_url: profile.photo_url || baseProfile.photo_url,
    role: profile.role || data.role || 'user',
    created_date: timestampToIso(profile.created_at),
    updated_date: timestampToIso(profile.updated_at),
  };
};

const createEntityModule = (entityName) => ({
  async list(sort, limit, skip) {
    requireFirebase();
    const recordsQuery = firestoreQuery(
      collection(db, 'records'),
      where('entity', '==', entityName)
    );
    const snapshot = await getDocs(recordsQuery);
    const items = snapshot.docs.map(rowToItem);
    return paginate(sortItems(items, sort), limit, skip);
  },

  async filter(query = {}, sort, limit, skip) {
    const items = await this.list(sort);
    return paginate(items.filter((item) => matchesQuery(item, query)), limit, skip);
  },

  async get(id) {
    requireFirebase();
    const recordRef = doc(db, 'records', id);
    const snapshot = await getDoc(recordRef);

    if (!snapshot.exists() || snapshot.data()?.entity !== entityName) {
      const notFound = new Error(`${entityName} nao encontrado.`);
      notFound.status = 404;
      throw notFound;
    }

    return rowToItem(snapshot);
  },

  async create(payload) {
    requireFirebase();
    const authUser = await waitForAuthUser();
    const data = toDataPayload(payload);
    const createdAt = new Date().toISOString();
    const recordRef = await addDoc(collection(db, 'records'), {
      entity: entityName,
      owner_id: authUser.uid,
      data,
      created_at: serverTimestamp(),
      updated_at: serverTimestamp(),
    });

    return {
      id: recordRef.id,
      created_date: createdAt,
      updated_date: createdAt,
      ...data,
    };
  },

  async update(id, payload) {
    requireFirebase();
    const current = await this.get(id);
    const nextData = toDataPayload({ ...current, ...payload });
    const recordRef = doc(db, 'records', id);

    await updateDoc(recordRef, {
      data: nextData,
      updated_at: serverTimestamp(),
    });

    return {
      ...current,
      ...nextData,
      id,
      updated_date: new Date().toISOString(),
    };
  },

  async delete(id) {
    requireFirebase();
    await deleteDoc(doc(db, 'records', id));
    return { success: true };
  },
});

const entities = new Proxy(
  {},
  {
    get(_target, entityName) {
      if (typeof entityName !== 'string' || entityName === 'then') return undefined;
      return createEntityModule(entityName);
    },
  }
);

const sanitizeFileName = (name = 'arquivo') =>
  String(name || 'arquivo')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-zA-Z0-9._-]+/g, '-')
    .replace(/^-+|-+$/g, '') || 'arquivo';

const uploadFile = async ({ file }) => {
  requireFirebase();

  if (!file) {
    throw new Error('Arquivo obrigatorio.');
  }

  const authUser = await waitForAuthUser();
  const safeName = sanitizeFileName(file.name);
  const filePath = `${authUser.uid}/${Date.now()}-${safeName}`;
  const fileRef = ref(storage, filePath);

  await uploadBytes(fileRef, file, {
    contentType: file.type || undefined,
  });

  const fileUrl = await getDownloadURL(fileRef);

  return {
    file_url: fileUrl,
    file_name: file.name || safeName,
    file_type: file.type || '',
    file_size: file.size || 0,
  };
};

const mapFirebaseAuthError = (error) => {
  const code = error?.code || '';

  if (code === 'auth/invalid-credential' || code === 'auth/wrong-password' || code === 'auth/user-not-found') {
    error.code = 'invalid_credentials';
    error.message = 'E-mail ou senha incorretos.';
  }

  if (code === 'auth/email-already-in-use') {
    error.code = 'user_already_exists';
    error.message = 'Este e-mail ja esta cadastrado.';
  }

  return error;
};

export const firebaseClient = {
  isLocal: false,
  isConfigured: isFirebaseConfigured,

  auth: {
    onAuthStateChanged(callback) {
      requireFirebase();
      return onAuthStateChanged(
        auth,
        async (currentUser) => {
          try {
            callback(currentUser ? await publicUserFromFirebase(currentUser) : null);
          } catch (error) {
            console.error('Falha ao sincronizar perfil Firebase:', error);
            callback(null, error);
          }
        },
        (error) => callback(null, error)
      );
    },

    async completeRedirectLogin() {
      const authUser = await waitForAuthUser(false);
      return authUser ? publicUserFromFirebase(authUser) : null;
    },

    async isAuthenticated() {
      if (!isFirebaseConfigured) return false;
      return Boolean(await waitForAuthUser(false));
    },

    async me() {
      const authUser = await waitForAuthUser();
      return publicUserFromFirebase(authUser);
    },

    async updateMe(data) {
      return this.saveProfile(data);
    },

    async saveProfile(data = {}) {
      const authUser = await waitForAuthUser();
      const current = await publicUserFromFirebase(authUser);
      const topLevel = cleanPayload({
        email: authUser.email || data.email || current?.email || '',
        full_name: data.full_name || current?.full_name || authUser.email || '',
        photo_url: data.photo_url || data.foto_url || current?.photo_url || '',
        role: data.role || current?.role || 'user',
      });
      const profileData = cleanPayload({
        ...(current || {}),
        ...data,
        id: undefined,
        uid: undefined,
        email: undefined,
        full_name: undefined,
        photo_url: undefined,
        role: undefined,
        created_date: undefined,
        updated_date: undefined,
      });

      await setDoc(
        getProfileDoc(authUser.uid),
        {
          ...topLevel,
          data: profileData,
          created_at: current?.created_date ? current.created_date : serverTimestamp(),
          updated_at: serverTimestamp(),
        },
        { merge: true }
      );

      return this.me();
    },

    async loginViaEmailPassword(email, password) {
      requireFirebase();

      try {
        const credential = await signInWithEmailAndPassword(auth, email, password);
        return {
          access_token: credential.user?.accessToken || '',
          user: credential.user ? await publicUserFromFirebase(credential.user) : null,
        };
      } catch (error) {
        throw mapFirebaseAuthError(error);
      }
    },

    async register({ email, password, full_name }) {
      requireFirebase();

      try {
        const credential = await createUserWithEmailAndPassword(auth, email, password);

        if (full_name) {
          await updateFirebaseProfile(credential.user, { displayName: full_name });
        }

        await setDoc(
          getProfileDoc(credential.user.uid),
          {
            email: credential.user.email || email,
            full_name: full_name || credential.user.email || email,
            photo_url: credential.user.photoURL || '',
            role: 'user',
            data: {},
            created_at: serverTimestamp(),
            updated_at: serverTimestamp(),
          },
          { merge: true }
        );

        return {
          user: await publicUserFromFirebase(credential.user),
          needsEmailConfirmation: false,
        };
      } catch (error) {
        throw mapFirebaseAuthError(error);
      }
    },

    async loginWithGoogle() {
      throw new Error('Login com Google foi removido. Use e-mail e senha.');
    },

    async handleOAuthCallbackUrl() {
      return {
        user: await this.completeRedirectLogin(),
        returnPath: '/mural',
      };
    },

    async verifyOtp() {
      return { success: true };
    },

    async resendOtp() {
      return { success: true };
    },

    async logout(redirectUrl = '/') {
      await this.signOutOnly();

      if (typeof window !== 'undefined') {
        window.location.replace(redirectUrl || '/');
      }
    },

    async signOutOnly() {
      if (!isFirebaseConfigured) return;
      await signOut(auth);
    },

    redirectToLogin(nextUrl = '/mural') {
      if (typeof window !== 'undefined') {
        const params = new URLSearchParams({ from_url: nextUrl || '/mural' });
        window.location.href = `/login?${params.toString()}`;
      }
    },
  },

  entities,

  integrations: {
    Core: {
      UploadFile: uploadFile,
    },
  },
};
