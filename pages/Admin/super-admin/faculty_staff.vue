<!-- pages/Admin/super-admin/faculty_staff.vue -->
<template>
  <main class="p-8">
    <div class="flex flex-col">
      <span class="text-4xl font-bold text-red-900 font-montserrat">
        College Faculty and Staff
      </span>
      <span class="text-xs font-montserrat">
        Manage leadership roles, department heads, and the directory
      </span>
    </div>

    <!-- Add Faculty/Staff Button -->
    <div class="flex justify-end">
      <UiButton
        @click="showAddModal = true"
        class="px-4 py-2 text-white bg-red-900 rounded shadow hover:bg-red-800 hover:scale-105"
      >
        <UserPlus class="size-5" />
        Add Faculty and Staff
      </UiButton>
    </div>

    <!-- College Leadership -->
    <span class="text-xl font-bold font-trajan">College Leadership</span>
    <div class="grid grid-cols-3 mt-3 mb-10 gap-x-6">
      <!-- College Dean Section -->
      <div
        v-if="collegeDean"
        class="flex justify-start h-32 pl-4 space-x-6 text-black rounded shadow-xl cursor-pointer bg-neutral-100"
        @click="showProfilePreview(collegeDean)"
      >
        <div class="flex items-center">
          <img
            :src="collegeDean.photo || '/placeholder.png'"
            alt="College Dean"
            class="object-cover rounded-full size-28"
          />
        </div>
        <div class="flex flex-col items-start justify-center">
          <span class="text-xs font-normal font-roboto">College Dean</span>
          <span class="text-lg font-semibold font-montserrat">
            {{ collegeDean.name || 'No Dean Assigned' }}
          </span>
        </div>
      </div>

      <!-- College Secretary Section -->
      <div
        v-if="collegeSecretary"
        class="flex h-32 pl-4 space-x-6 text-black rounded shadow-xl cursor-pointer bg-neutral-100"
        @click="showProfilePreview(collegeSecretary)"
      >
        <div class="flex items-center">
          <img
            :src="collegeSecretary.photo || '/placeholder.png'"
            alt="College Secretary"
            class="object-cover rounded-full size-28"
          />
        </div>
        <div class="flex flex-col items-start justify-center">
          <span class="text-xs font-normal font-roboto">College Secretary</span>
          <span class="text-lg font-semibold font-montserrat">
            {{ collegeSecretary.name || 'No Secretary Assigned' }}
          </span>
        </div>
      </div>
    </div>

    <!-- Department Heads Section -->
    <span class="text-xl font-bold font-trajan">Department Heads</span>
    <div
      v-if="departmentHeads.length"
      class="grid grid-cols-3 mt-3 mb-10 gap-y-6 gap-x-6"
    >
      <div
        v-for="head in departmentHeads"
        :key="head.id"
        class="flex justify-start h-32 pl-4 space-x-6 text-black rounded shadow-xl cursor-pointer bg-neutral-100"
        @click="showProfilePreview(head)"
      >
        <div class="flex items-center">
          <img
            :src="head.photo || '/placeholder.png'"
            alt="Department Head"
            class="object-cover rounded-full size-28"
          />
        </div>
        <div class="flex flex-col items-start justify-center">
          <span class="text-lg font-semibold font-montserrat">
            {{ head.name || 'No Head Assigned' }}
          </span>
        </div>
      </div>
    </div>

    <!-- Administrative Staff Section -->
    <span class="text-xl font-bold font-trajand">Administrative Staff</span>
    <div
      v-if="adminStaff.length"
      class="grid grid-cols-3 mt-3 mb-10 gap-y-6 gap-x-6"
    >
      <div
        v-for="staff in adminStaff"
        :key="staff.id"
        class="flex justify-start h-32 pl-4 space-x-6 text-black rounded shadow-xl cursor-pointer bg-neutral-100"
        @click="showProfilePreview(staff)"
      >
        <div class="flex items-center">
          <img
            :src="staff.photo || '/placeholder.png'"
            alt="Staff"
            class="object-cover rounded-full shadow-lg size-28"
          />
        </div>
        <div class="flex flex-col items-start justify-center">
          <span class="mt-2 text-lg font-bold font-montserrat">
            {{ staff.name || 'No Staff Assigned' }}
          </span>
          <span class="text-sm text-gray-600 font-trajan">
            {{ staff.subDesignation || 'N/A' }}
          </span>
        </div>
      </div>
    </div>

    <!-- Profile Preview Modal -->
    <ProfilePreviewModal
      v-if="showProfilePreviewModal"
      :profile="selectedProfile"
      :showDelete="true"
      @close="closeProfilePreviewModal"
      @remove="removeUserFromCollege"
    />

    <!-- Add Faculty/Staff Modal (component) -->
    <AddFacultyStaffModal
      v-model:open="showAddModal"
      :users="users"
    />
  </main>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import {
  getFirestore,
  doc,
  getDoc,
  updateDoc,
  onSnapshot,
} from 'firebase/firestore'
import { collection } from 'firebase/firestore'
import ProfilePreviewModal from '@/components/ProfilePreviewModal.vue'
import AddFacultyStaffModal from '@/components/Admin/AddFacultyStaffModal.vue'
import { UserPlus } from 'lucide-vue-next'

definePageMeta({
  middleware: ['auth'],
  roles: ['super_admin'],
  layout: 'super-admin',
})

const db = getFirestore()

const collegeDean = ref(null)
const collegeSecretary = ref(null)
const departmentHeads = ref([])
const adminStaff = ref([])
const showAddModal = ref(false)

const showProfilePreviewModal = ref(false)
const selectedProfile = ref(null)

const users = ref([])

/* Fetch college-wide leadership & staff document */
const fetchCollegeFacultyStaff = () => {
  const docRef = doc(db, 'college_faculty_staff', 'college-wide')
  onSnapshot(docRef, (docSnap) => {
    if (docSnap.exists()) {
      const data = docSnap.data()
      collegeDean.value = data.collegeDean || null
      collegeSecretary.value = data.collegeSecretary || null
      departmentHeads.value = data.departmentHeads || []
      adminStaff.value = data.adminStaff || []
    }
  })
}

/* Keep college-wide entries in sync with changes in users collection */
const syncUserChangesToCollege = () => {
  const usersCollection = collection(db, 'users')
  onSnapshot(usersCollection, async (snapshot) => {
    const updatedUsers = snapshot.docs.map((doc) => ({
      id: doc.id,
      ...doc.data(),
    }))

    const collegeDocRef = doc(db, 'college_faculty_staff', 'college-wide')
    const collegeDoc = await getDoc(collegeDocRef)
    if (!collegeDoc.exists()) return

    const collegeData = collegeDoc.data()

    const syncUserData = (entry) => {
      const matchedUser = updatedUsers.find((user) => user.id === entry.id)
      if (matchedUser) {
        return {
          ...entry,
          name: matchedUser.fullName || entry.name,
          photo: matchedUser.photo || entry.photo,
          email: matchedUser.email || entry.email,
          specialization: matchedUser.specialization || entry.specialization,
          education: matchedUser.education || entry.education,
          websites: matchedUser.websites || entry.websites,
          status: matchedUser.status,
        }
      }
      return entry
    }

    if (collegeData.collegeDean?.id) {
      const updatedDean = syncUserData(collegeData.collegeDean)
      await updateDoc(collegeDocRef, { collegeDean: updatedDean })
    }

    if (collegeData.collegeSecretary?.id) {
      const updatedSecretary = syncUserData(collegeData.collegeSecretary)
      await updateDoc(collegeDocRef, { collegeSecretary: updatedSecretary })
    }

    const updatedHeads = (collegeData.departmentHeads || []).map(syncUserData)
    const updatedStaff = (collegeData.adminStaff || []).map(syncUserData)

    await updateDoc(collegeDocRef, {
      departmentHeads: updatedHeads,
      adminStaff: updatedStaff,
    })
  })
}

/* Profile preview logic */
const showProfilePreview = async (profile) => {
  const user = users.value.find((u) => u.id === profile.id)

  if (user?.role === 'Head Admin' && user.departmentId) {
    try {
      const deptSnap = await getDoc(doc(db, 'departments', user.departmentId))
      if (deptSnap.exists()) {
        selectedProfile.value = {
          ...profile,
          role: user.role,
          departmentName: deptSnap.data().name || '',
        }
      } else {
        selectedProfile.value = profile
      }
    } catch (err) {
      console.error('Error fetching department name:', err)
      selectedProfile.value = profile
    }
  } else {
    selectedProfile.value = profile
  }

  showProfilePreviewModal.value = true
}

const closeProfilePreviewModal = () => {
  showProfilePreviewModal.value = false
  selectedProfile.value = null
}

/* Remove a user from college-wide lists */
const removeUserFromCollege = async (user) => {
  const collegeDocRef = doc(db, 'college_faculty_staff', 'college-wide')
  const collegeDoc = await getDoc(collegeDocRef)
  if (!collegeDoc.exists()) return

  const collegeData = collegeDoc.data()
  const updates = {}

  if (collegeData.collegeDean?.id === user.id) {
    updates.collegeDean = null
  } else if (collegeData.collegeSecretary?.id === user.id) {
    updates.collegeSecretary = null
  } else if (collegeData.departmentHeads?.some((head) => head.id === user.id)) {
    updates.departmentHeads = collegeData.departmentHeads.filter(
      (head) => head.id !== user.id
    )
  } else if (collegeData.adminStaff?.some((staff) => staff.id === user.id)) {
    updates.adminStaff = collegeData.adminStaff.filter(
      (staff) => staff.id !== user.id
    )
  }

  await updateDoc(collegeDocRef, updates)
}

/* Initial data load */
onMounted(() => {
  const usersCollection = collection(db, 'users')
  onSnapshot(usersCollection, (snapshot) => {
    users.value = snapshot.docs
      .map((doc) => ({
        id: doc.id,
        ...doc.data(),
        name: doc.data().fullName || 'Unnamed',
      }))
      .filter((user) => user.role !== 'Super Admin')
  })

  fetchCollegeFacultyStaff()
  syncUserChangesToCollege()
})
</script>

<style scoped>
/* debug helper if needed
* {
  outline: 1px solid red;
}
*/
</style>
