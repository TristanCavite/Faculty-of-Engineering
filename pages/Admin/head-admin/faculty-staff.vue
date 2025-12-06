<template>
  <main class="p-8">
    <!-- Page title -->
    <div class="flex flex-col">
      <span class="text-4xl font-bold text-red-900 font-montserrat">
        Department Faculty & Staff Management
      </span>
      <span class="text-xs font-montserrat">
        Manage faculty and staff members within the department
      </span>
    </div>

    <!-- Cover image manager (new component) -->
    <DeptCoverImageUpload
      v-if="departmentId"
      v-model="personnelCoverUrl"
      :storage-path="`departments/${departmentId}/faculty_staff_cover`"
    />

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

    <!-- Department Head Section -->
    <div class="mt-8" v-if="departmentHead">
      <span class="text-xl font-bold font-trajan">Department Head</span>
      <div class="grid grid-cols-3 mt-3 mb-10 gap-x-6">
        <div
          class="flex justify-start h-32 pl-4 space-x-6 text-black rounded shadow-xl cursor-pointer bg-neutral-100"
          @click="showProfilePreview(departmentHead)"
        >
          <div class="flex items-center">
            <img
              :src="departmentHead?.photo || '/placeholder.png'"
              alt="Department Head"
              class="object-cover rounded-full size-28"
            />
          </div>
          <div class="flex flex-col items-start justify-center">
            <p class="text-lg font-semibold font-montserrat">
              {{ departmentHead ? departmentHead.name : "No Head Assigned" }}
            </p>
          </div>
        </div>
      </div>
    </div>

    <!-- Staff Section -->
    <span class="text-xl font-bold font-trajan">Staff</span>
    <div
      class="grid grid-cols-3 mt-3 mb-10 gap-y-6 gap-x-6"
      v-if="departmentStaff.length"
    >
      <div
        v-for="staff in departmentStaff"
        :key="staff.id"
        class="flex justify-start h-32 pl-4 space-x-6 text-black rounded shadow-xl cursor-pointer bg-neutral-100"
        @click="showProfilePreview(staff)"
      >
        <div class="flex items-center">
          <img
            :src="staff.photo || '/placeholder.png'"
            alt="Staff"
            class="object-cover rounded-full size-28"
          />
        </div>
        <div class="flex flex-col items-start justify-center">
          <p class="text-lg font-semibold font-montserrat">
            {{ staff ? staff.name : "No Staff Assigned" }}
          </p>
        </div>
      </div>
    </div>

    <!-- Profile Preview Modal -->
    <ProfilePreviewModal
      v-if="showProfilePreviewModal"
      :profile="selectedProfile"
      :showDeleteButton="true"
      @close="closeProfilePreviewModal"
      @remove="removeUserFromDepartment"
      @request-delete="openDeleteModal"
    />

    <!-- Delete confirmation modal -->
    <UiModal v-if="showDelete" @close="showDelete = false">
      <template #header>Delete image</template>
      <template #default>
        Are you sure you want to remove
        <strong>{{ profilePendingDelete?.name }}</strong>
        from college roles? This will only unassign their role(s) in the
        college-wide document and cannot be undone here.
      </template>
      <template #footer>
        <UiButton class="bg-gray-200" @click="showDelete = false">
          Cancel
        </UiButton>
        <UiButton
          class="text-white bg-red-600"
          :disabled="busy"
          @click="doDelete"
        >
          <span v-if="busy">Removing…</span>
          <span v-else>Delete</span>
        </UiButton>
      </template>
    </UiModal>

    <!-- Add Faculty/Staff Modal -->
    <HeadFacultyModal
      :show="showAddModal"
      :department-id="departmentId"
      :users="users"
      :designations="designations"
      @close="showAddModal = false"
      @added="onMemberAdded"
    />
  </main>
</template>

<script setup>
import { ref, onMounted, watch } from "vue"
import {
  getFirestore,
  doc,
  collection,
  getDoc,
  updateDoc,
  onSnapshot,
  arrayRemove,
} from "firebase/firestore"
import { getAuth } from "firebase/auth"
import ProfilePreviewModal from "@/components/ProfilePreviewModal.vue"
import HeadFacultyModal from "@/components/Admin/HeadFacultyModal.vue"
import DeptCoverImageUpload from "@/components/Admin/DeptCoverImageUpload.vue"
import { UserPlus } from "lucide-vue-next"

definePageMeta({
  middleware: "auth",
  layout: "head-admin",
})

const db = getFirestore()
const auth = getAuth()

const departmentId = ref("")
const departmentHead = ref(null)
const departmentStaff = ref([])

// cover image url for faculty & staff public page
const personnelCoverUrl = ref("")

const showAddModal = ref(false)
const showDelete = ref(false)
const busy = ref(false)
const showProfilePreviewModal = ref(false)
const selectedProfile = ref(null)
const profilePendingDelete = ref(null)
const users = ref([])

/** Designations passed to the modal (override or edit here anytime) */
const designations = [
  "Instructor I",
  "Instructor II",
  "Instructor III",
  "Assistant Professor I",
  "Assistant Professor II",
  "Assistant Professor III",
  "Assistant Professor IV",
  "Associate Professor I",
  "Associate Professor II",
  "Associate Professor III",
  "Associate Professor IV",
  "Associate Professor V",
  "Professor I",
  "Professor II",
  "Professor III",
  "Part-time Instructor",
]

onMounted(async () => {
  const currentUser = auth.currentUser
  if (!currentUser) return

  // Get current head admin's department
  const userRef = doc(db, "users", currentUser.uid)
  const userSnap = await getDoc(userRef)
  if (!userSnap.exists()) return

  departmentId.value = userSnap.data().departmentId || ""
  if (!departmentId.value) return

  // Subscribe to department staff/head updates
  fetchDepartmentFacultyAndStaff()

  // Subscribe to all users (exclude Super Admins)
  const usersRef = collection(db, "users")
  onSnapshot(usersRef, (snap) => {
    users.value = snap.docs
      .map((d) => ({
        id: d.id,
        ...d.data(),
        name: d.data().fullName || "Unnamed",
      }))
      .filter((u) => u.role !== "Super Admin")
  })
})

function fetchDepartmentFacultyAndStaff() {
  const depRef = doc(db, "departments", departmentId.value)
  onSnapshot(depRef, (snap) => {
    if (!snap.exists()) return
    const data = snap.data()
    departmentHead.value = data.headAdmin || null
    departmentStaff.value = data.staff || []
    personnelCoverUrl.value = data.personnelCoverUrl || ""
  })
}

// Save cover image URL to Firestore whenever it changes
watch(personnelCoverUrl, async (newUrl) => {
  if (!departmentId.value) return
  const depRef = doc(db, "departments", departmentId.value)
  await updateDoc(depRef, {
    personnelCoverUrl: newUrl || "",
  })
})

async function doDelete() {
  if (!profilePendingDelete.value) return
  busy.value = true

  try {
    await removeUserFromDepartment(profilePendingDelete.value)

    // close modals and reset
    showDelete.value = false
    showProfilePreviewModal.value = false
    profilePendingDelete.value = null
  } catch (err) {
    console.error("Failed to remove user from Department roles", err)
  } finally {
    busy.value = false
  }
}

async function removeUserFromDepartment(user) {
  const depRef = doc(db, "departments", departmentId.value)
  const depSnap = await getDoc(depRef)
  if (!depSnap.exists()) return

  const data = depSnap.data()
  const updates = {}

  if (data.headAdmin?.id === user.id) {
    updates.headAdmin = null
  } else {
    updates.staff = (data.staff || []).filter((s) => s.id !== user.id)
  }

  await updateDoc(depRef, updates)

  // Remove department from user's departments array
  const userRef = doc(db, "users", user.id)
  await updateDoc(userRef, {
    departments: arrayRemove(departmentId.value),
  })

  alert(`${user.name} has been removed from the department.`)
}

async function showProfilePreview(profile) {
  const user = users.value.find((u) => u.id === profile.id)

  if (user?.role === "Head Admin" && user.departmentId) {
    try {
      const deptSnap = await getDoc(doc(db, "departments", user.departmentId))
      if (deptSnap.exists()) {
        selectedProfile.value = {
          ...profile,
          role: user.role,
          departmentName: deptSnap.data().name || "",
        }
      } else {
        selectedProfile.value = profile
      }
    } catch (e) {
      console.error("Error fetching department name:", e)
      selectedProfile.value = profile
    }
  } else {
    selectedProfile.value = profile
  }

  showProfilePreviewModal.value = true
}

function closeProfilePreviewModal() {
  showProfilePreviewModal.value = false
  selectedProfile.value = null
}

function openDeleteModal(profile) {
  profilePendingDelete.value = profile
  showDelete.value = true
}

/** Optional: run things after a member is added (snapshot will auto-refresh UI) */
function onMemberAdded() {
  showAddModal.value = false
}
</script>

<style scoped>
.text-maroon {
  color: #740505;
}
.bg-maroon {
  background-color: #740505;
}
</style>
