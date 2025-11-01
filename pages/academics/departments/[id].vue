<template>
  <main class="bg-white">
    <div class="max-w-6xl mx-auto">
      <!-- Cover Section -->
      <div v-if="departmentPage?.coverImageUrl" class="relative">
        <img
          :src="departmentPage.coverImageUrl"
          alt="Department cover"
          class="w-full h-64 md:h-[500px] object-cover rounded"
        />
      </div>

      <!-- About Section -->
      <div
        v-if="departmentPage?.content"
        class="px-6 py-10 mt-8 bg-gray-50 rounded-lg shadow-md prose max-w-none"
        v-html="departmentPage.content"
      />

      <!-- Degree Programs -->
      <div v-if="degreePrograms.length" class="p-6 mt-12">
        <h2 class="text-2xl font-bold text-maroon mb-6 flex items-center gap-2">
          🎓 Degree Programs Offered
        </h2>
        <div class="grid gap-6 md:grid-cols-2">
          <NuxtLink
            v-for="program in degreePrograms"
            :key="program.id"
            :to="`/academics/degree-programs/${departmentId}/${program.id}`"
            class="block p-6 bg-white border rounded-lg shadow-sm transition hover:shadow-lg hover:-translate-y-1"
          >
            <h3 class="text-lg font-semibold text-maroon mb-2">{{ program.name }}</h3>
            <p class="text-sm text-gray-600">Click to view program details</p>
          </NuxtLink>
        </div>
      </div>
    </div>
  </main>
</template>

<script setup lang="ts">
import { useRoute } from "vue-router";
import { useFirestore } from "vuefire";
import { doc, getDoc, collection, getDocs } from "firebase/firestore";
import { ref, onMounted } from "vue";

definePageMeta({ layout: "custom" });

const db = useFirestore();
const route = useRoute();
const departmentId = route.params.id as string;

const departmentPage = ref<{ coverImageUrl?: string; content?: string } | null>(null);
const degreePrograms = ref<{ id: string; name: string }[]>([]);

onMounted(async () => {
  // Get department page content from department_pages/{departmentId}
  const pageDoc = await getDoc(doc(db, "department_pages", departmentId));
  if (pageDoc.exists()) {
    departmentPage.value = pageDoc.data();
  }

  // Get list of degree programs under departments/{departmentId}/degreePrograms
  const programSnap = await getDocs(collection(db, "departments", departmentId, "degreePrograms"));
  degreePrograms.value = programSnap.docs.map((doc) => ({
    id: doc.id,
    name: doc.data().name,
  }));
});
</script>

<style scoped>
.text-maroon {
  color: #740505;
}
</style>
