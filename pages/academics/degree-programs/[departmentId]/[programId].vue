<template>
  <!-- Add pt-24 to offset the fixed navbar -->
  <div class="pt-10 pb-10 bg-white md:pt-24">
    <div class="max-w-6xl px-4 mx-auto">
      <!-- White Box for Program Info -->
      <div class="overflow-hidden ">
        <!-- Cover Image -->
        <div v-if="programData?.coverImageUrl">
          <img
            :src="programData.coverImageUrl"
            alt="Program cover"
            class="w-full md:h-[550px] object-cover rounded"
          />
        </div>

        <!-- Program Content -->
        <div
          v-if="programData?.content"
          class="px-6 py-8 prose max-w-none"
          v-html="programData.content"
        />
        <div v-else class="p-6 text-gray-500 ">No content available for this program.</div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { useRoute } from 'vue-router'
import { useFirestore } from 'vuefire'
import { doc, getDoc } from 'firebase/firestore'
import { ref, onMounted } from 'vue'

definePageMeta({ layout: 'custom' })

const db = useFirestore()
const route = useRoute()
const departmentId = route.params.departmentId as string
const programId = route.params.programId as string

const programData = ref<{ coverImageUrl?: string; content?: string } | null>(null)

onMounted(async () => {
  if (!departmentId || !programId) return

  const docRef = doc(db, `departments/${departmentId}/degreePrograms/${programId}`)
  const snap = await getDoc(docRef)

  if (snap.exists()) {
    programData.value = snap.data()
  }
})
</script>

<style scoped>
.text-maroon {
  color: #740505;
}
</style>
