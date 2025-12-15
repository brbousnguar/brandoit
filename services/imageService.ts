import { storage } from './firebase';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';

export const uploadProfileImage = async (file: File, userId: string): Promise<string> => {
  // Validate file type
  if (!file.type.startsWith('image/')) {
    throw new Error('Please upload an image file (JPEG, PNG, etc.)');
  }

  // Validate file size (max 2MB for profile photos)
  if (file.size > 2 * 1024 * 1024) {
    throw new Error('Image size must be less than 2MB');
  }

  try {
    // Create a storage reference: users/{userId}/profile.jpg
    // We use a fixed name so it overwrites the old one automatically
    const fileExtension = file.name.split('.').pop() || 'jpg';
    const storageRef = ref(storage, `users/${userId}/profile.${fileExtension}`);

    // Upload the file
    await uploadBytes(storageRef, file);

    // Get the download URL
    const downloadURL = await getDownloadURL(storageRef);
    return downloadURL;
  } catch (error: any) {
    console.error("Error uploading image:", error);
    throw new Error("Failed to upload image. Please try again.");
  }
};
