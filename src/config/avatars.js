/**
 * Avatar options for users who don't have a Google profile photo.
 * 2 male + 2 female avatars in Google colors.
 */
export const AVATARS = [
  { id: 'male-1', label: 'Homme 1', url: '/avatars/avatar-male-1.svg', category: 'male' },
  { id: 'male-2', label: 'Homme 2', url: '/avatars/avatar-male-2.svg', category: 'male' },
  { id: 'female-1', label: 'Femme 1', url: '/avatars/avatar-female-1.svg', category: 'female' },
  { id: 'female-2', label: 'Femme 2', url: '/avatars/avatar-female-2.svg', category: 'female' },
];

/**
 * Get avatar URL by ID, or return null if not found.
 */
export function getAvatarUrl(avatarId) {
  const avatar = AVATARS.find((a) => a.id === avatarId);
  return avatar?.url || null;
}
