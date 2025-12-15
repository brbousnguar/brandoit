import { db } from "./firebase";
import { 
  collection, 
  addDoc, 
  query, 
  where, 
  orderBy, 
  limit, 
  getDocs, 
  doc,
  updateDoc,
  increment,
  arrayUnion,
  arrayRemove,
  getDoc
} from "firebase/firestore";
import { CatalogItem, VisualStyle, BrandColor, GraphicType } from "../types";

const CATALOG_COLLECTION = "public_catalog";

export const catalogService = {
  
  addToCatalog: async (
    type: 'style' | 'color' | 'type', 
    data: VisualStyle | BrandColor | GraphicType, 
    userId: string, 
    userName: string
  ): Promise<string> => {
    try {
      const docRef = await addDoc(collection(db, CATALOG_COLLECTION), {
        type,
        data,
        authorId: userId,
        authorName: userName,
        votes: 0,
        voters: [],
        timestamp: Date.now()
      });
      return docRef.id;
    } catch (error) {
      console.error("Error adding to catalog:", error);
      throw new Error("Failed to share to catalog.");
    }
  },

  getCatalogItems: async (type?: 'style' | 'color' | 'type'): Promise<CatalogItem[]> => {
    try {
      let q = query(collection(db, CATALOG_COLLECTION), orderBy("votes", "desc"), limit(50));
      
      if (type) {
        q = query(collection(db, CATALOG_COLLECTION), where("type", "==", type), orderBy("votes", "desc"), limit(50));
      }

      const snapshot = await getDocs(q);
      return snapshot.docs.map(doc => ({
        ...doc.data(),
        id: doc.id
      } as CatalogItem));
    } catch (error) {
      console.error("Error fetching catalog:", error);
      return [];
    }
  },

  voteItem: async (itemId: string, userId: string, action: 'up' | 'down'): Promise<void> => {
    try {
      const itemRef = doc(db, CATALOG_COLLECTION, itemId);
      const itemSnap = await getDoc(itemRef);
      
      if (!itemSnap.exists()) throw new Error("Item not found");
      
      const data = itemSnap.data() as CatalogItem;
      const hasVoted = data.voters.includes(userId);

      // Simple logic: Can only vote once (up). Toggling 'down' removes vote.
      if (action === 'up' && !hasVoted) {
        await updateDoc(itemRef, {
          votes: increment(1),
          voters: arrayUnion(userId)
        });
      } else if (action === 'down' && hasVoted) {
        await updateDoc(itemRef, {
          votes: increment(-1),
          voters: arrayRemove(userId)
        });
      }
    } catch (error) {
      console.error("Error voting:", error);
      throw error;
    }
  }
};
