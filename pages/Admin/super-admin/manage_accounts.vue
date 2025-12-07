<template>
  <main class="p-8">
    <div class="flex justify-between">
      <div class="flex flex-col">
      <span class="text-4xl font-bold text-red-900 font-montserrat">
        Manage Accounts
      </span>
      <span class="text-xs font-montserrat">
        Manage user accounts and their access levels
      </span>
    </div>

      <UiButton
        @click="showCreateAccountModal = true"
        class="rounded bg-red-900 px-4 py-2 text-white hover:bg-red-700"
      >
        Create Account
      </UiButton>
    </div>

    <CreateAccountModal
      v-if="showCreateAccountModal"
      @close="showCreateAccountModal = false"
    />

    <!-- Search + Filters -->
    <div class="mb-6 mt-2 flex justify-between gap-4">
      <!-- Search component -->
      <div class="flex w-3/4 items-center">
        <UserSearchInput v-model="searchQuery" class="w-full max-w-md" />
      </div>

      <!-- Role Filter component -->
      <div class="flex items-center">
        <UserRoleFilter v-model="selectedRole" />
      </div>
    </div>

    <!-- User List -->
    <div class="rounded bg-white shadow-md">
      <table class="w-full table-auto border-collapse text-center">
        <thead>
          <tr class="border-b bg-gray-100 text-center">
            <th class="px-6 py-4">Profile</th>
            <th class="px-6 py-4">Email</th>
            <th class="px-6 py-4">Status</th>
            <th class="px-6 py-4">Actions</th>
          </tr>
        </thead>
        <tbody>
          <tr
            v-for="user in filteredUsers"
            :key="user.id"
            class="border-b hover:bg-gray-50"
          >
            <!-- Profile -->
            <td class="flex items-center space-x-3 px-4 py-2 text-left">
              <img
                :src="user.photo || '/placeholder.png'"
                alt="Profile"
                class="size-12 rounded-full object-cover"
              />
              <div class="flex flex-col items-start">
                <span class="font-trajan text-base font-semibold">
                  {{ user.fullName || "Unnamed" }}
                </span>
                <span class="text-xs">
                  {{ prettyRole(user.role) }}
                </span>
              </div>
            </td>

            <!-- Email -->
            <td class="px-4 py-1">
              {{ user.email }}
            </td>

            <!-- Status -->
            <td class="px-4 py-1">
              <span
                :class="
                  user.status === 'active'
                    ? 'bg-green-500 text-white'
                    : 'bg-red-500 text-white'
                "
                class="rounded-full px-3 py-1 text-sm font-semibold"
              >
                {{ user.status === 'active' ? 'Active' : 'Inactive' }}
              </span>
            </td>

            <!-- Actions -->
            <td class="px-4 py-1">
              <div class="flex items-center justify-center gap-2">
                <!-- Manage Access button (opens side panel) -->
                <UiButton
                  class="rounded bg-gray-100 px-2 py-1 text-xs font-medium text-gray-800 hover:bg-gray-200"
                  @click="openAccessPanel(user)"
                >
                  Manage Access
                </UiButton>

                <!-- Activate / Deactivate -->
                <UiButton
                  @click="toggleStatus(user)"
                  :class="
                    user.status === 'active'
                      ? 'bg-red-900 hover:bg-red-950'
                      : 'bg-green-500 hover:bg-green-600'
                  "
                  class="rounded px-2 py-1 text-xs font-medium text-white"
                >
                  {{ user.status === 'active' ? 'Deactivate' : 'Activate' }}
                </UiButton>
              </div>
            </td>
          </tr>

          <!-- Empty state -->
          <tr v-if="filteredUsers.length === 0">
            <td colspan="4" class="px-6 py-8 text-center text-sm text-gray-500">
              No users found for your current search/filter.
            </td>
          </tr>
        </tbody>
      </table>
    </div>

    <!-- Access panel -->
    <ManageUserAccessPanel
      v-if="selectedUser"
      v-model:open="showAccessPanel"
      :user-name="selectedUser.fullName || 'Unnamed'"
      :user-email="selectedUser.email || ''"
      :user-role-label="prettyRole(selectedUser.role)"
      :user-photo="selectedUser.photo"
      :initial-access="selectedUser.moduleAccess || {}"
      @save="handleAccessSave"
    />
  </main>
</template>

<script setup>
import { collection, doc, getFirestore, onSnapshot, updateDoc } from "firebase/firestore";
import { onMounted, ref } from "vue";
import ManageUserAccessPanel from "@/components/Admin/ManageUserAccessPanel.vue";
import CreateAccountModal from "@/components/Admin/createAccountModal.vue";
import UserSearchInput from "@/components/Admin/UserSearchInput.vue";
import UserRoleFilter from "@/components/Admin/UserRoleFilter.vue";
import { useUserSearchAndFilter } from "@/composables/useUserSearchAndFilter";

definePageMeta({
  middleware: ["auth"],
  roles: ["super_admin"],
  layout: "super-admin",
});

const showCreateAccountModal = ref(false);
const db = getFirestore();
const users = ref([]);

/** For the access panel */
const showAccessPanel = ref(false);
const selectedUser = ref(null);

/** Use reusable search + role filter logic */
const {
  searchQuery,      // v-model for UserSearchInput
  selectedRole,     // v-model for UserRoleFilter
  filteredUsers,    // used in v-for
  normalizeRole,    // used here to hide super admins
  prettyRole,       // used in template
} = useUserSearchAndFilter(users);

/** Live users stream (exclude Super Admins from the table) */
onMounted(() => {
  const usersCollection = collection(db, "users");
  onSnapshot(usersCollection, (snapshot) => {
    users.value = snapshot.docs
      .map((d) => {
        const data = d.data();
        return {
          // keep auth UID if you need it later
          uid: data.uid ?? data.id ?? null,
          // all other fields
          ...data,
          // **force id to always be the Firestore document ID**
          id: d.id,
        };
      })
      // use normalizeRole from the composable
      .filter((u) => normalizeRole(u.role) !== "super_admin");
  });
});

/** Toggle active/inactive */
const toggleStatus = async (user) => {
  const userDocRef = doc(db, "users", user.id); // id = Firestore doc ID
  const newStatus = user.status === "active" ? "inactive" : "active";
  try {
    await updateDoc(userDocRef, { status: newStatus });
    alert(`${user.fullName} has been ${newStatus === "active" ? "activated" : "deactivated"}`);
  } catch (error) {
    console.error("Error updating user status:", error);
    alert("Failed to update user status. Please try again.");
  }
};

/** Open the Manage Access panel for a given user */
const openAccessPanel = (user) => {
  selectedUser.value = user;
  showAccessPanel.value = true;
};

/** Handle save from ManageUserAccessPanel (PERSIST to Firestore) */
const handleAccessSave = async (newAccess) => {
  if (!selectedUser.value) return;

  const userId = selectedUser.value.id; // Firestore doc ID
  const userDocRef = doc(db, "users", userId);

  try {
    await updateDoc(userDocRef, {
      moduleAccess: newAccess,
    });

    // Update local selectedUser
    selectedUser.value = {
      ...selectedUser.value,
      moduleAccess: newAccess,
    };

    // Update the users array so the table stays in sync
    const idx = users.value.findIndex((u) => u.id === userId);
    if (idx !== -1) {
      users.value[idx] = {
        ...users.value[idx],
        moduleAccess: newAccess,
      };
    }

    console.log("Access saved to Firestore for doc:", userId, newAccess);
    alert("Module access updated successfully.");
  } catch (error) {
    console.error("Error updating module access:", error);
    alert("Failed to update access. Please try again.");
  }
};
</script>
