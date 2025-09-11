<template>
  <div class="min-h-screen bg-gray-50 p-6">
    <EditableUserProfile
      :initialProfile="profile"
      :profilePhoto="profilePhoto"
      :isFaculty="false"
      @update-profile="handleProfileUpdate"
      @upload-photo="uploadProfilePicture"
      @change-password="handlePasswordChange"
    />
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue';
import { getAuth, EmailAuthProvider, reauthenticateWithCredential, updatePassword } from 'firebase/auth';
import {
  getFirestore,
  doc,
  getDoc,
  updateDoc,
  onSnapshot,
} from 'firebase/firestore';
import {
  getStorage,
  ref as storageRef,
  uploadBytes,
  getDownloadURL
} from 'firebase/storage';

import EditableUserProfile from '@/components/EditableUserProfile.vue';

definePageMeta({
  middleware: 'auth',
  layout: 'head-admin',
});

const auth = getAuth();
const db = getFirestore();
const storage = getStorage();

const profile = ref({
  fullName: '',
  specialization: '',
  education: '',
  educationHtml: '',
  email: '',
  websites: [],
  contact: '',
  personalEmail: ''
});

const profilePhoto = ref('');
const userData = ref(null);

const fetchProfile = async () => {
  const currentUser = auth.currentUser;
  if (!currentUser) return;

  const userRef = doc(db, 'users', currentUser.uid);
  onSnapshot(userRef, (snap) => {
    if (snap.exists()) {
      const data = snap.data();
      userData.value = data;

      profile.value = {
        fullName: data.fullName || '',
        specialization: data.specialization || '',
        education: data.education || '',
        educationHtml: data.educationHtml || data.education || '',
        email: data.email || '',
        websites: data.websites || [],
        contact: data.contact || '',
        personalEmail: data.personalEmail || ''
      };

      profilePhoto.value = data.photo || 'https://via.placeholder.com/150';
    }
  });
};

const uploadProfilePicture = async (file) => {
  const currentUser = auth.currentUser;
  if (!currentUser || !file) return;

  const fileRef = storageRef(storage, `profile-pictures/${currentUser.uid}/${file.name}`);
  await uploadBytes(fileRef, file);
  const photoURL = await getDownloadURL(fileRef);

  await updateDoc(doc(db, 'users', currentUser.uid), { photo: photoURL });
  profilePhoto.value = photoURL;
};

const handleProfileUpdate = async (updatedProfile) => {
  const currentUser = auth.currentUser;
  if (!currentUser || !userData.value) return;

  const updatedFields = {
    fullName: updatedProfile.fullName,
    specialization: updatedProfile.specialization,
    education: updatedProfile.education,
    educationHtml: updatedProfile.educationHtml,
    email: updatedProfile.email,
    websites: updatedProfile.websites,
    contact: updatedProfile.contact || '',
    personalEmail: updatedProfile.personalEmail || ''
  };

  await updateDoc(doc(db, 'users', currentUser.uid), updatedFields);

  // 🔁 Sync to department.headAdmin if head-admin
  if (userData.value.departmentId) {
    const deptRef = doc(db, 'departments', userData.value.departmentId);
    const deptSnap = await getDoc(deptRef);
    if (deptSnap.exists()) {
      const deptData = deptSnap.data();
      if (deptData.headAdmin?.id === currentUser.uid) {
        await updateDoc(deptRef, {
          headAdmin: {
            ...deptData.headAdmin,
            ...updatedFields,
            name: updatedProfile.fullName,
            designation: deptData.headAdmin.designation || 'Department Head',
            photo: profilePhoto.value,
          }
        });
      }
    }
  }

  // 🔁 Sync to college_faculty_staff.college-wide.departmentHeads if college-wide
  if (userData.value.collegeWide === true) {
    const collegeRef = doc(db, 'college_faculty_staff', 'college-wide');
    const collegeSnap = await getDoc(collegeRef);
    if (collegeSnap.exists()) {
      const collegeData = collegeSnap.data();
      const updatedHeads = (collegeData.departmentHeads || []).map((head) =>
        head.id === currentUser.uid
          ? {
              ...head,
              ...updatedFields,
              name: updatedProfile.fullName,
              designation: head.designation || 'Department Head',
              photo: profilePhoto.value,
            }
          : head
      );
      await updateDoc(collegeRef, { departmentHeads: updatedHeads });
    }
  }

  alert('Profile updated successfully!');
};

const handlePasswordChange = async ({ newPassword, currentPassword }) => {
  const user = auth.currentUser;
  if (!user || !currentPassword || !newPassword) return;

  try {
    const credential = EmailAuthProvider.credential(user.email, currentPassword);
    await reauthenticateWithCredential(user, credential);
    await updatePassword(user, newPassword);
    alert('Password updated successfully!');
  } catch (error) {
    console.error('Password update failed:', error.message);
    alert('Failed to update password. Please verify your current password.');
  }
};

onMounted(fetchProfile);
</script>

<style scoped>
.text-maroon {
  color: #740505;
}
.bg-maroon {
  background-color: #740505;
}
</style>
