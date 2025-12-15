import { db } from "./firebase";
import { 
  collection, 
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

// Helper type for what the UI expects
export interface CatalogItem {
  id: string;
  type: 'style' | 'color' | 'type';
  data: any;
  authorId: string;
  authorName: string;
  votes: number;
  voters: string[];
  timestamp: number;
}

// Map 'type' from UI to 'collectionName' in Firestore
const getCollectionName = (type: 'style' | 'color' | 'type') => {
  switch (type) {
    case 'style': return 'visual_styles';
    case 'color': return 'brand_colors';
    case 'type': return 'graphic_types';
    default: throw new Error(`Unknown type: ${type}`);
  }
};

// Helper to map docs
const mapSnapshot = (snapshot: any, type: 'style' | 'color' | 'type'): CatalogItem[] => {
  return snapshot.docs.map((doc: any) => {
    const data = doc.data();
    return {
      id: doc.id,
      type,
      data: data,
      authorId: data.authorId,
      authorName: data.authorName,
      votes: data.votes || 0,
      voters: data.voters || [],
      timestamp: data.createdAt || Date.now()
    };
  });
};

export const catalogService = {
  
  // NOTE: 'addToCatalog' is deprecated. 
  // Instead, use resourceService.addCustomItem with scope='public'.
  
  getCatalogItems: async (type: 'style' | 'color' | 'type'): Promise<CatalogItem[]> => {
    try {
      const collectionName = getCollectionName(type);
      
      // Query items where scope == 'public'
      // Try with ordering first (requires index)
      try {
        const q = query(
          collection(db, collectionName), 
          where("scope", "==", "public"),
          orderBy("votes", "desc"), 
          limit(50)
        );
        const snapshot = await getDocs(q);
        return mapSnapshot(snapshot, type);
      } catch (indexError) {
        console.warn("Index missing for ordered query, falling back to unordered", indexError);
        // Fallback: Simple query without sorting (Firestore will require index for equality + sort)
        const qFallback = query(
          collection(db, collectionName), 
          where("scope", "==", "public"),
          limit(50)
        );
        const snapshot = await getDocs(qFallback);
        const items = mapSnapshot(snapshot, type);
        // Sort in memory
        return items.sort((a, b) => b.votes - a.votes);
      }
    } catch (error) {
      console.error("Error fetching catalog:", error);
      return [];
    }
  },

  voteItem: async (type: 'style'|'color'|'type', itemId: string, userId: string, action: 'up' | 'down'): Promise<void> => {
    try {
      const collectionName = getCollectionName(type);
      const itemRef = doc(db, collectionName, itemId);
      const itemSnap = await getDoc(itemRef);
      
      if (!itemSnap.exists()) throw new Error("Item not found");
      
      const data = itemSnap.data();
      const voters = data.voters || [];
      const hasVoted = voters.includes(userId);

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
