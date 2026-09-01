// Lightweight Firebase Config Bridge (No external Firebase network dependencies)
export const APP_ID = 'autoflowcut'

// Safe dummy service instances
export const auth = {
  currentUser: null,
  onAuthStateChanged: (cb) => { cb(null); return () => {} }
}
export const db = {}
export const functions = {}

export default { auth, db, functions, APP_ID }
