<template>
  <div class="flex h-screen">
    <aside class="w-64 h-full text-white bg-red-900">
      <HeaderAdmin class="pt-2" />
      <div class="p-4 text-base font-semibold">
        <nav>
          <ul class="space-y-2">
            <li>
              <NuxtLink
                to="/admin/faculty/" 
                class="block px-3 py-2 transition duration-300 rounded hover:bg-yellow-400 hover:scale-105"
              > <!--this is the index.vue-->
                Profile
              </NuxtLink>
            </li>
            <li>
              <button
                @click="logout"
                class="block w-full px-3 py-2 text-left transition duration-300 rounded hover:bg-yellow-400 hover:scale-105"
              >
                Logout
              </button>
            </li>
          </ul>
        </nav>
      </div>
    </aside>
  </div>
</template>
  
  <script setup>
  import { useFirebaseAuth } from "vuefire";
  import { signOut } from "firebase/auth";
  import { useRouter } from "vue-router";
  
  const auth = useFirebaseAuth();
  const router = useRouter();
  
  const logout = async () => {
    if (auth) {
      await signOut(auth);
      router.push("/login");
    }
  };
  </script>
  
  <style scoped>
  </style>
  