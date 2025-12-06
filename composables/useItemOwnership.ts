import { computed } from 'vue';
import { getAuth } from 'firebase/auth';  // Correct import for Firebase Auth

export function useItemOwnership(itemAuthorId: string, itemStatus: string) {
  const currentUser = getAuth().currentUser;

  // Return a computed property that checks if the item is visible to the current user
  const canViewItem = computed(() => {
    if (!currentUser) return false;  // If no user is logged in, they can't view the item

    const isOwner = currentUser.uid === itemAuthorId;
    const isPublished = itemStatus === 'published';

    // Allow viewing if the item is published or if the user is the owner of the item
    return isPublished || isOwner;
  });

  return {
    canViewItem,
  };
}
