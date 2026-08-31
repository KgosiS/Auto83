const firebaseConfig = {
  apiKey: "AIzaSyDwIp_mJO2lFXTNzFeD8XjATkYvvUH5UpQ",
  authDomain: "auto83-f2836.firebaseapp.com",
  projectId: "auto83-f2836",
  storageBucket: "auto83-f2836.firebasestorage.app",
  messagingSenderId: "70403564376",
  appId: "1:70403564376:web:748eb4319cbc2064907b2d",
  measurementId: "G-D0J1JRW4XZ"
};

firebase.initializeApp(firebaseConfig);

const auth = firebase.auth();
const db = firebase.firestore();
