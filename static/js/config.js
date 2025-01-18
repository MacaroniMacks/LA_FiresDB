const firebaseConfig = {
    apiKey: "AIzaSyAOAuaQiDFDTzwJ1Bhnb-2QetT2O4eT9fo",
    authDomain: "la-fires-aa4db.firebaseapp.com",
    projectId: "la-fires-aa4db",
    storageBucket: "la-fires-aa4db.firebasestorage.app",
    messagingSenderId: "117236976270",
    appId: "1:117236976270:web:f2519f52efe610743fd7df",
    measurementId: "G-MWCEE8FEXB"
};

// Initialize Firebase
firebase.initializeApp(firebaseConfig);

// Set authentication state persistence
firebase.auth().setPersistence(firebase.auth.Auth.Persistence.LOCAL)
    .catch((error) => {
        console.error('Error setting persistence:', error);
    });
