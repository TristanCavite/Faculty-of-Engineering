import { getAuth, onAuthStateChanged } from 'firebase/auth';
import { getFirestore, doc, getDoc } from 'firebase/firestore';

export default defineNuxtRouteMiddleware(async (to) => {
  const auth = getAuth();
  let currentUser = auth.currentUser;

  if (!currentUser) {
    // Wait for the auth state to initialize
    await new Promise<void>((resolve) => {
      onAuthStateChanged(auth, (user) => {
        currentUser = user;
        resolve();
      });
    });
  }

  if (!currentUser) {
    console.log('User not authenticated. Redirecting to login...');
    return navigateTo('/login');
  }

  const db = getFirestore();
  const userDocRef = doc(db, 'users', currentUser.uid);
  const userDoc = await getDoc(userDocRef);

  if (!userDoc.exists()) {
    console.log('User document not found. Redirecting to login...');
    return navigateTo('/login');
  }

  const userData = userDoc.data();
  const role = userData.role;
  const status = userData.status;

  // Allow "Super Admin" to access routes regardless of status
  if (role !== 'Super Admin' && status !== 'active') {
    console.log('User is inactive. Redirecting to login...');
    alert('Your account is inactive. Please contact the administrator.');
    return navigateTo('/login');
  }

  // Role-based access control
  if (to.path.startsWith('/super-admin') && role !== 'Super Admin') {
    return navigateTo('/unauthorized');
  }

  if (to.path.startsWith('/head-admin') && role !== 'Head Admin') {
    return navigateTo('/unauthorized');
  }

  if (to.path.startsWith('/faculty') && role !== 'Faculty') {
    return navigateTo('/unauthorized');
  }

  console.log(`Access granted to role: ${role}`);
});
