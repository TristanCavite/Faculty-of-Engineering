<template>
  <main class="p-8">
    <div class="flex justify-between">
      <div class="flex flex-col">
        <span class="text-2xl font-bold text-red-900">User Accounts</span>
        <span class="text-sm">Manage roles, department, and access</span>
      </div>

      <UiButton
        @click="showCreateAccountModal = true"
        class="rounded bg-red-900 px-4 py-2 text-white hover:bg-red-700"
      >
        Create Account
      </UiButton>
    </div>

    <CreateAccountModal v-if="showCreateAccountModal" @close="showCreateAccountModal = false" />

    <!-- Search + Filters -->
    <div class="mb-6 mt-2 flex justify-between gap-4">
      <div class="flex w-3/4 items-center justify-between">
        <input
          v-model="searchQuery"
          type="text"
          placeholder="Search users by name or email..."
          class="w-1/3 rounded border px-4 py-2"
        />
      </div>

      <!-- Role Filter -->
      <div>
        <!-- v-model binds to selectedRole; values use our canonical keys -->
        <select v-model="selectedRole" class="select-bordered rounded border px-8 py-2">
          <option value="">All Roles</option>
          <option value="head_admin">Department Head</option>
          <option value="faculty">Faculty</option>
        </select>
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
          <tr v-for="user in filteredUsers" :key="user.id" class="border-b hover:bg-gray-50">
            <!-- Profile -->
            <td class="flex items-center space-x-3 px-4 py-2">
              <img
                :src="user.photo || '/placeholder.png'"
                alt="Profile"
                class="size-12 rounded-full object-cover"
              />
              <div class="flex flex-col items-start">
                <span class="font-trajan text-base font-semibold">
                  {{ user.fullName || "Unnamed" }}
                </span>
                <!-- Show a pretty role label regardless of how it's saved -->
                <span class="text-xs">
                  {{ prettyRole(user.role) }}
                </span>
              </div>
            </td>

            <!-- Email -->
            <td class="px-4 py-1">{{ user.email }}</td>

            <!-- Status -->
            <td class="px-4 py-1">
              <span
                :class="
                  user.status === 'active' ? 'bg-green-500 text-white' : 'bg-red-500 text-white'
                "
                class="rounded-full px-3 py-1 text-sm font-semibold"
              >
                {{ user.status === "active" ? "Active" : "Inactive" }}
              </span>
            </td>

            <!-- Actions -->
            <td class="px-4 py-1">
              <UiButton
                @click="toggleStatus(user)"
                :class="
                  user.status === 'active'
                    ? 'bg-red-900 hover:bg-red-950'
                    : 'bg-green-500 hover:bg-green-600'
                "
                class="rounded px-2 py-1 text-white"
              >
                {{ user.status === "active" ? "Deactivate" : "Activate" }}
              </UiButton>
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
  </main>
</template>

<script setup>
  /**
   * Implements role filtering:
   * - Dropdown values use canonical keys: "", "head_admin", "faculty"
   * - We normalize whatever is stored in Firestore (e.g., "Head Admin", "Department Head", "headadmin")
   *   to one of the same canonical keys for reliable comparisons.
   * - Search and role filter combine together.
   */

  import { collection, doc, getFirestore, onSnapshot, updateDoc } from "firebase/firestore";
  import { computed, onMounted, ref } from "vue";

  definePageMeta({
     middleware: ['auth'],
     roles: ['super_admin'],
    layout: "super-admin",
  });

  const showCreateAccountModal = ref(false);
  const db = getFirestore();
  const users = ref([]);

  /** Search text */
  const searchQuery = ref("");

  /**
   * Selected role filter:
   *  ""           => All Roles
   *  "head_admin" => Department Head (Head Admin)
   *  "faculty"    => Faculty
   */
  const selectedRole = ref("");

  /**
   * normalizeRole:
   * Convert many possible stored role strings to our canonical keys.
   * Examples:
   *   "Head Admin", "headadmin", "Department Head", "dept head" -> "head_admin"
   *   "Faculty", "faculty" -> "faculty"
   *   "Super Admin" -> "super_admin" (we still exclude it from list below)
   */
  function normalizeRole(role) {
    const raw = (role || "").toString().trim().toLowerCase().replace(/\s|-/g, "");
    if (["headadmin", "departmenthead", "depthead"].includes(raw)) return "head_admin";
    if (["faculty", "facultymember"].includes(raw)) return "faculty";
    if (["superadmin"].includes(raw)) return "super_admin";
    // Fallback: convert spaces to underscores (e.g., "head admin" -> "head_admin")
    return (role || "").toString().trim().toLowerCase().replace(/\s+/g, "_");
  }

  /**
   * prettyRole:
   * For display only—maps canonical keys back to nice labels.
   */
  function prettyRole(role) {
    switch (normalizeRole(role)) {
      case "head_admin":
        return "Head Admin";
      case "faculty":
        return "Faculty";
      case "super_admin":
        return "Super Admin";
      default:
        return role || "Unknown";
    }
  }

  // Expose prettyRole to the template
  // (Functions are usable directly in <script setup>, no need to return)

  /** Live users stream (exclude Super Admins from the table) */
  onMounted(() => {
    const usersCollection = collection(db, "users");
    onSnapshot(usersCollection, (snapshot) => {
      users.value = snapshot.docs
        .map((d) => ({ id: d.id, ...d.data() }))
        .filter((u) => normalizeRole(u.role) !== "super_admin");
    });
  });

  /** Combined search + role filter */
  const filteredUsers = computed(() => {
    const q = searchQuery.value.trim().toLowerCase();
    const selected = selectedRole.value; // "", "head_admin", "faculty"

    return users.value.filter((user) => {
      // 1) Role filter
      const userRoleKey = normalizeRole(user.role);
      const rolePass = selected === "" ? true : userRoleKey === selected;

      // 2) Search filter (full name or email)
      const name = (user.fullName || "").toLowerCase();
      const email = (user.email || "").toLowerCase();
      const searchPass = q === "" ? true : name.includes(q) || email.includes(q);

      return rolePass && searchPass;
    });
  });

  /** Toggle active/inactive */
  const toggleStatus = async (user) => {
    const userDocRef = doc(db, "users", user.id);
    const newStatus = user.status === "active" ? "inactive" : "active";
    try {
      await updateDoc(userDocRef, { status: newStatus });
      alert(`${user.fullName} has been ${newStatus === "active" ? "activated" : "deactivated"}`);
    } catch (error) {
      console.error("Error updating user status:", error);
      alert("Failed to update user status. Please try again.");
    }
  };
</script>
