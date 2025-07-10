/**
 * Updates the paid categories for a user (for partial subscription users)
 * @param {string} userId - The user's ID
 * @param {object} paidCategoriesData - Object containing the categories and documents the user has access to
 * @returns {Promise<boolean>} - A promise that resolves with success status
 */
export const updateUserPaidCategories = async (userId, paidCategoriesData) => {
  try {
    if (!userId) {
      throw new Error('User ID is required to update paid categories');
    }
    
    const userRef = doc(db, COLLECTIONS.USERS, userId);
    
    // Update the document with the paid categories data
    await updateDoc(userRef, {
      paidCategories: paidCategoriesData,
      updatedAt: serverTimestamp()
    });
    
    return true;
  } catch (error) {
    console.error('Error updating user paid categories:', error);
    throw error;
  }
};
