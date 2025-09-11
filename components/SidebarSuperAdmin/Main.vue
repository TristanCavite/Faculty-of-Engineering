<template>
  <div class="flex h-screen">
    <!-- Sidebar -->
    <aside class="w-64 text-white bg-red-900">
      <HeaderAdmin class="sticky top-0 z-10 pt-2" />
      <nav class="flex-1 min-h-0 p-4 overflow-y-auto text-base font-semibold">
        <ul class="">
          <li>
            <NuxtLink
              to="/admin/super-admin/"
              class="block px-3 py-2 transition duration-300 rounded hover:bg-yellow-400 hover:scale-105"
              exact-active-class="text-black bg-yellow-400"
            >
              Home
            </NuxtLink>
          </li>
          <li>
            <NuxtLink
              to="/admin/super-admin/admission"
              class="block px-3 py-2 transition duration-300 rounded hover:bg-yellow-400 hover:scale-105"
              exact-active-class="text-black bg-yellow-400"
            >
              Admission
            </NuxtLink>
          </li>
          <li>
            <NuxtLink
              to="/admin/super-admin/create-account"
              class="block px-3 py-2 transition duration-300 rounded hover:bg-yellow-400 hover:scale-105"
              exact-active-class="text-black bg-yellow-400"
            >
              Create Account
            </NuxtLink>
          </li>
          <li>
            <NuxtLink
              to="/admin/super-admin/manage_department"
              class="block px-3 py-2 transition duration-300 rounded hover:bg-yellow-400 hover:scale-105"
              exact-active-class="text-black bg-yellow-400"
            >
              Departments
            </NuxtLink>
          </li>
          <li>
            <NuxtLink
              to="/admin/super-admin/faculty_staff"
              class="block px-3 py-2 transition duration-300 rounded hover:bg-yellow-400 hover:scale-105"
              exact-active-class="text-black bg-yellow-400"
            >
              Faculty and Staff
            </NuxtLink>
          </li>
          <li>
            <div class="flex items-center justify-between px-3 py-2 transition duration-300 rounded hover:bg-yellow-400 hover:scale-105" :class="showManageSubmenu ? 'bg-red-500 rounded-sm px-2 py-2' : ''" @click="showManageSubmenu = !showManageSubmenu">
                <button>
                    <span>Manage</span>
                </button>
                <IconsChevronDown class="transition-transform size-5 stroke-[3] " :class="{ 'rotate-180': showManageSubmenu }"/>
            </div>
            <ul  v-if="showManageSubmenu" class="">
              <li><NuxtLink to="/admin/super-admin/manage_about" class="block px-3 py-2 transition duration-300 rounded hover:bg-yellow-400 hover:scale-105" exact-active-class="text-black bg-yellow-400"> Manage About</NuxtLink></li>
              <li><NuxtLink to="/admin/super-admin/manage_accounts" class="block px-3 py-2 transition duration-300 rounded hover:bg-yellow-400 hover:scale-105" exact-active-class="text-black bg-yellow-400">Manage Accounts</NuxtLink></li>
              <li><NuxtLink to="/admin/super-admin/downloads" class="block px-3 py-2 transition duration-300 rounded hover:bg-yellow-400 hover:scale-105" exact-active-class="text-black bg-yellow-400"> Manage Downloads</NuxtLink></li>
              <li><NuxtLink to="/admin/super-admin/events" class="block px-3 py-2 transition duration-300 rounded hover:bg-yellow-400 hover:scale-105" exact-active-class="text-black bg-yellow-400"> Manage Events</NuxtLink></li>
              <li><NuxtLink to="/admin/super-admin/manage_gallery" class="block px-3 py-2 transition duration-300 rounded hover:bg-yellow-400 hover:scale-105" exact-active-class="text-black bg-yellow-400">Manage Gallery</NuxtLink></li>
              <li><NuxtLink to="/admin/super-admin/news" class="block px-3 py-2 transition duration-300 rounded hover:bg-yellow-400 hover:scale-105" exact-active-class="text-black bg-yellow-400">Manage News</NuxtLink></li>
              <li><NuxtLink to="/admin/super-admin/research" class="block px-3 py-2 transition duration-300 rounded hover:bg-yellow-400 hover:scale-105" exact-active-class="text-black bg-yellow-400"> Manage Research</NuxtLink></li>
              <li><NuxtLink to="/admin/super-admin/socials" class="block px-3 py-2 transition duration-300 rounded hover:bg-yellow-400 hover:scale-105" exact-active-class="text-black bg-yellow-400">Manage Socials</NuxtLink></li>
            </ul>
          </li>
          <li>
            <button
              @click="logout"
              class="block w-56 px-3 py-2 transition duration-300 rounded hover:bg-yellow-400 text-start hover:scale-105"
            >
              Logout
            </button>
          </li>
        </ul>
      </nav>
    </aside>
  </div>
</template>

<script setup>
  import { signOut } from "firebase/auth";
  import { useRouter } from "vue-router";
  import { useFirebaseAuth } from "vuefire";
  import { ref } from 'vue' 

  const auth = useFirebaseAuth();
  const router = useRouter();

  const logout = async () => {
    if (auth) {
      await signOut(auth);
      router.push("/login");
    }
  };

  const showManageSubmenu = ref(false);
</script>

<style scoped>
</style>
