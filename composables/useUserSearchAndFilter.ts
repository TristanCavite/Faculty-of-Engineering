// composables/useUserSearchAndFilter.ts
import { computed, ref, type Ref } from 'vue'

export function useUserSearchAndFilter(users: Ref<any[]>) {
  /** Search text */
  const searchQuery = ref('')

  /** Selected role key: '', 'head_admin', 'faculty' */
  const selectedRole = ref('')

  /** Normalize role strings from Firestore */
  function normalizeRole(role: string | null | undefined) {
    const raw = (role || '').toString().trim().toLowerCase().replace(/\s|-/g, '')
    if (['headadmin', 'departmenthead', 'depthead'].includes(raw)) return 'head_admin'
    if (['faculty', 'facultymember'].includes(raw)) return 'faculty'
    if (['superadmin'].includes(raw)) return 'super_admin'
    return (role || '').toString().trim().toLowerCase().replace(/\s+/g, '_')
  }

  /** Pretty label for displaying the role */
  function prettyRole(role: string | null | undefined) {
    switch (normalizeRole(role)) {
      case 'head_admin':
        return 'Head Admin'
      case 'faculty':
        return 'Faculty'
      case 'super_admin':
        return 'Super Admin'
      default:
        return role || 'Unknown'
    }
  }

  /** Combined search + role filter */
  const filteredUsers = computed(() => {
    const q = searchQuery.value.trim().toLowerCase()
    const selected = selectedRole.value

    return users.value.filter((user) => {
      const userRoleKey = normalizeRole(user.role)
      const rolePass = selected === '' ? true : userRoleKey === selected

      const name = (user.fullName || '').toLowerCase()
      const email = (user.email || '').toLowerCase()
      const searchPass = q === '' ? true : name.includes(q) || email.includes(q)

      return rolePass && searchPass
    })
  })

  return {
    searchQuery,
    selectedRole,
    filteredUsers,
    normalizeRole,
    prettyRole,
  }
}
