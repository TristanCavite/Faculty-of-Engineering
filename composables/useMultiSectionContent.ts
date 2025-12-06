// composables/useMultiSectionContent.ts
import { computed, onMounted, ref, watch } from 'vue'
import { useFirebaseStorage, useFirestore } from 'vuefire'
import {
  collection,
  doc,
  getDoc,
  onSnapshot,
  serverTimestamp,
  setDoc,
  updateDoc,
  writeBatch,
} from 'firebase/firestore'
import { getDownloadURL, ref as storageRef, uploadBytes } from 'firebase/storage'

type Kind = 'about' | 'admission'
type NoticeType = 'success' | 'error'

export function useMultiSectionContent(kind: Kind) {
  const db = useFirestore()
  const storage = useFirebaseStorage()

  const isEditing = ref(false)
  const selectedSection = ref('')
  const saving = ref(false)

  const form = ref({
    title: '',
    coverImageUrl: '',
    content: '',
    videoUrl: '',
  })

  const pendingCoverFile = ref<File | null>(null)
  const pendingCoverPreview = ref<string | ''>('')

  const baseline = ref({
    title: '',
    coverImageUrl: '',
    content: '',
    videoUrl: '',
  })

  const extraSections = ref<Array<{ id: string; title?: string; order?: number }>>([])

  const showSectionPublic = ref(true)
  const visSavedAt = ref<string | ''>('')

  const notice = ref<{ type: NoticeType; title: string } | null>(null)
  let hideTimer: ReturnType<typeof setTimeout> | null = null

  function showNotice(n: { type: NoticeType; title: string }, ms = 3000) {
    notice.value = n
    if (hideTimer) clearTimeout(hideTimer)
    hideTimer = setTimeout(() => {
      notice.value = null
    }, ms)
  }

  const extrasIds = ['extra_section_1', 'extra_section_2']

  const isExtraSection = computed(() => extrasIds.includes(selectedSection.value))
  const isUndergrad = computed(
    () => kind === 'admission' && selectedSection.value === 'undergraduate',
  )

  const collectionName =
    kind === 'about' ? 'about_sections' : 'admission_sections'

  const staticIds =
    kind === 'about'
      ? ['the_college', 'facilities', 'history', 'map_location']
      : ['why_choose_vsu', 'undergraduate', 'graduate']

  /* ------------ ensure docs exist ------------ */
  async function ensureDocsExist() {
    try {
      const required = [...staticIds, ...extrasIds]
      for (const id of required) {
        const snap = await getDoc(doc(db, collectionName, id))
        if (!snap.exists()) {
          await setDoc(doc(db, collectionName, id), {
            title: '',
            coverImageUrl: '',
            content: '',
            videoUrl: '',
            order: required.indexOf(id),
            createdAt: serverTimestamp(),
            updatedAt: serverTimestamp(),
          })
        }
      }
    } catch (err) {
      console.error('ensureDocsExist error', err)
    }
  }

  /* ------------ extras dropdown ------------ */
  function subscribeExtras() {
    const colRef = collection(db, collectionName)
    onSnapshot(
      colRef,
      snap => {
        const arr: any[] = []
        snap.forEach(d => {
          const data = d.data() as any
          arr.push({
            id: d.id,
            title: data.title || '',
            order: data.order ?? 999,
          })
        })
        arr.sort((a, b) => (a.order ?? 999) - (b.order ?? 999))
        extraSections.value = arr.filter(x => extrasIds.includes(x.id))
      },
      err => {
        console.error('subscribeExtras error', err)
      },
    )
  }

  onMounted(async () => {
    await ensureDocsExist()
    subscribeExtras()
  })

  /* ------------ visibility helpers ------------ */
  async function loadVisibility(id: string) {
    try {
      const flagsSnap = await getDoc(doc(db, 'settings', 'public_flags'))
      const secSnap = await getDoc(doc(db, collectionName, id))

      if (kind === 'about') {
        const flagKey = `about_${id}`
        const flagVal = flagsSnap.exists()
          ? (flagsSnap.data() as any)[flagKey]
          : undefined
        const sectionVal = secSnap.exists()
          ? (secSnap.data() as any).isVisible
          : undefined
        showSectionPublic.value = flagVal ?? sectionVal ?? true
      } else {
        if (id === 'undergraduate') {
          const flagVal = flagsSnap.exists()
            ? (flagsSnap.data() as any).admissionUndergradVisible
            : undefined
          const sectionVal = secSnap.exists()
            ? (secSnap.data() as any).isVisible
            : undefined
          showSectionPublic.value = flagVal ?? sectionVal ?? true
        } else {
          const flagKey = `admission_${id}`
          const flagVal = flagsSnap.exists()
            ? (flagsSnap.data() as any)[flagKey]
            : undefined
          const sectionVal = secSnap.exists()
            ? (secSnap.data() as any).isVisible
            : undefined
          showSectionPublic.value = flagVal ?? sectionVal ?? true
        }
      }
    } catch (err) {
      console.error('loadVisibility error', err)
      showSectionPublic.value = true
    }
  }

  async function saveVisibility() {
    if (!selectedSection.value) return
    try {
      const id = selectedSection.value
      const batch = writeBatch(db)

      if (kind === 'about') {
        const flagKey = `about_${id}`
        batch.set(
          doc(db, 'settings', 'public_flags'),
          { [flagKey]: showSectionPublic.value, updatedAt: serverTimestamp() },
          { merge: true },
        )
        batch.set(
          doc(db, collectionName, id),
          { isVisible: showSectionPublic.value, updatedAt: serverTimestamp() },
          { merge: true },
        )
      } else {
        if (id === 'undergraduate') {
          batch.set(
            doc(db, 'settings', 'public_flags'),
            {
              admissionUndergradVisible: showSectionPublic.value,
              updatedAt: serverTimestamp(),
            },
            { merge: true },
          )
          batch.set(
            doc(db, collectionName, 'undergraduate'),
            { isVisible: showSectionPublic.value, updatedAt: serverTimestamp() },
            { merge: true },
          )
        } else {
          const flagKey = `admission_${id}`
          batch.set(
            doc(db, 'settings', 'public_flags'),
            { [flagKey]: showSectionPublic.value, updatedAt: serverTimestamp() },
            { merge: true },
          )
          batch.set(
            doc(db, collectionName, id),
            { isVisible: showSectionPublic.value, updatedAt: serverTimestamp() },
            { merge: true },
          )
        }
      }

      await batch.commit()
      visSavedAt.value = new Date().toLocaleString()
      showNotice({ type: 'success', title: 'Visibility updated.' })
    } catch (err) {
      console.error('saveVisibility error', err)
      showNotice({
        type: 'error',
        title: 'Failed to update visibility. Try again.',
      })
    }
  }

  /* ------------ load section on select ------------ */
  watch(
    selectedSection,
    async id => {
      if (!id) return

      if (pendingCoverPreview.value) {
        URL.revokeObjectURL(pendingCoverPreview.value as string)
      }
      pendingCoverFile.value = null
      pendingCoverPreview.value = ''

      try {
        const snap = await getDoc(doc(db, collectionName, id))
        if (snap.exists()) {
          const data = snap.data() as any
          form.value.title = data.title || ''
          form.value.coverImageUrl = data.coverImageUrl || ''
          form.value.content = data.content || ''
          form.value.videoUrl = data.videoUrl || ''
        } else {
          form.value.title = ''
          form.value.coverImageUrl = ''
          form.value.content = ''
          form.value.videoUrl = ''
        }

        baseline.value = {
          title: form.value.title,
          coverImageUrl: form.value.coverImageUrl,
          content: form.value.content,
          videoUrl: form.value.videoUrl,
        }
        isEditing.value = false

        if (kind === 'about') {
          if (extrasIds.includes(id)) {
            await loadVisibility(id)
          } else {
            showSectionPublic.value = true
            visSavedAt.value = ''
          }
        } else {
          if (id === 'undergraduate' || extrasIds.includes(id)) {
            await loadVisibility(id)
          } else {
            showSectionPublic.value = true
            visSavedAt.value = ''
          }
        }
      } catch (err) {
        console.error('Error loading section', err)
      }
    },
    { immediate: true },
  )

  /* ------------ dirty check ------------ */
  const isDirty = computed(
    () =>
      !!pendingCoverFile.value ||
      (form.value.title || '') !== (baseline.value.title || '') ||
      form.value.coverImageUrl !== baseline.value.coverImageUrl ||
      form.value.content !== baseline.value.content ||
      form.value.videoUrl !== baseline.value.videoUrl,
  )

  /* ------------ image + editor helpers ------------ */
  function handleImage(e: Event) {
    const file = (e.target as HTMLInputElement)?.files?.[0]
    if (!file) return
    if (pendingCoverPreview.value) {
      URL.revokeObjectURL(pendingCoverPreview.value as string)
    }
    pendingCoverFile.value = file
    pendingCoverPreview.value = URL.createObjectURL(file)
  }

  async function handleEditorImageUpload(file: File) {
    const folder =
      kind === 'about' ? 'editor_images' : 'admission_editor_images'
    const path = `${folder}/${Date.now()}-${file.name}`
    const fileRef = storageRef(storage, path)
    const snap = await uploadBytes(fileRef, file)
    return await getDownloadURL(snap.ref)
  }

  /* ------------ title + save section ------------ */
  async function saveTitle() {
    if (!selectedSection.value) return
    try {
      await updateDoc(doc(db, collectionName, selectedSection.value), {
        title: form.value.title || '',
        updatedAt: serverTimestamp(),
      })
      baseline.value.title = form.value.title || ''
      showNotice({ type: 'success', title: 'Title saved successfully.' })
    } catch (err) {
      console.error('saveTitle error', err)
      showNotice({ type: 'error', title: 'Failed to save title.' })
    }
  }

  async function saveSection() {
    if (!selectedSection.value || !isDirty.value || saving.value) return
    saving.value = true

    try {
      if (pendingCoverFile.value) {
        const path = `${collectionName}/${selectedSection.value}/cover_${Date.now()}.jpg`
        const fileRef = storageRef(storage, path)
        await uploadBytes(fileRef, pendingCoverFile.value)
        form.value.coverImageUrl = await getDownloadURL(fileRef)
      }

      // 👇 Always include videoUrl now
      const payload: Record<string, any> = {
        coverImageUrl: form.value.coverImageUrl || '',
        content: form.value.content || '',
        videoUrl: form.value.videoUrl || '',
        updatedAt: serverTimestamp(),
      }

      if (isExtraSection.value) {
        payload.title = form.value.title || ''
      }

      await setDoc(doc(db, collectionName, selectedSection.value), payload, {
        merge: true,
      })

      if (pendingCoverPreview.value) {
        URL.revokeObjectURL(pendingCoverPreview.value as string)
      }
      pendingCoverFile.value = null
      pendingCoverPreview.value = ''

      baseline.value = {
        title: form.value.title,
        coverImageUrl: form.value.coverImageUrl,
        content: form.value.content,
        videoUrl: form.value.videoUrl,
      }

      isEditing.value = false
      showNotice({ type: 'success', title: 'Section updated successfully.' })
    } catch (err) {
      console.error('saveSection error', err)
      showNotice({ type: 'error', title: 'Failed to save section.' })
    } finally {
      saving.value = false
    }
  }

  /* ------------ edit toggle ------------ */
  function toggleEdit() {
    if (isEditing.value) {
      form.value.title = baseline.value.title
      form.value.coverImageUrl = baseline.value.coverImageUrl
      form.value.content = baseline.value.content
      form.value.videoUrl = baseline.value.videoUrl

      if (pendingCoverPreview.value) {
        URL.revokeObjectURL(pendingCoverPreview.value as string)
      }
      pendingCoverFile.value = null
      pendingCoverPreview.value = ''

      isEditing.value = false
    } else {
      isEditing.value = true
    }
  }

  return {
    // state
    isEditing,
    selectedSection,
    saving,
    form,
    pendingCoverPreview,
    extraSections,
    showSectionPublic,
    visSavedAt,
    notice,
    isExtraSection,
    isUndergrad,
    isDirty,
    // actions
    handleImage,
    handleEditorImageUpload,
    saveTitle,
    saveSection,
    toggleEdit,
    saveVisibility,
  }
}
