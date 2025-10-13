// // Authentication utility functions
// import { signOut } from "firebase/auth";
// import { auth } from "../firebase/firebase";

// export interface User {
//   uid: string;
//   displayName: string | null;
//   email: string | null;
//   photoURL: string | null;
// }

// // Check if user is logged in by checking localStorage
// export const isUserLoggedIn = (): boolean => {
//   const user = localStorage.getItem("user");
//   return user !== null;
// };

// // Get user data from localStorage
// export const getCurrentUser = (): User | null => {
//   const userString = localStorage.getItem("user");
//   if (userString) {
//     try {
//       return JSON.parse(userString) as User;
//     } catch (error) {
//       console.error("Error parsing user data from localStorage:", error);
//       localStorage.removeItem("user"); // Remove corrupted data
//       return null;
//     }
//   }
//   return null;
// };

// // Logout function - clears localStorage and signs out from Firebase
// export const logoutUser = async (): Promise<void> => {
//   try {
//     // Sign out
//     await signOut(auth);

//     // Clear user data
//     localStorage.removeItem("user");

//     console.log("User successfully logged out");
//   } catch (error) {
//     console.error("Error during logout:", error);
//     // if Firebase signOut fails, still clear localStorage
//     localStorage.removeItem("user");
//     throw error;
//   }
// };
