async function login(email, password) {
    try {
        // Sign in the user
        const userCredential = await firebase.auth().signInWithEmailAndPassword(email, password);
        const user = userCredential.user;

        // Get the authentication token
        const token = await user.getIdToken(true);
        localStorage.setItem('authToken', token);

        // Fetch user document from Firestore to get isCompany status
        const userDoc = await firebase.firestore().collection('users').doc(user.uid).get();
        const isCompany = userDoc.data().isCompany;

        // Determine dashboard based on account type
        let dashboardPath = '/customer-dashboard';
        if (isCompany === true) {
            dashboardPath = '/company-dashboard';
        }

        // Create URL with token
        const url = new URL(dashboardPath, window.location.origin);
        url.searchParams.append('token', token);
        
        // Redirect to appropriate dashboard
        window.location.href = url.toString();
    } catch (error) {
        console.error('Login error:', error);
        alert(error.message);
    }
}
// Signup function
async function signup(email, password, userData) {
    try {
        // Create user in Firebase
        const userCredential = await firebase.auth().createUserWithEmailAndPassword(email, password);
        const token = await userCredential.user.getIdToken();
        
        // Store token
        localStorage.setItem('authToken', token);
        
        // Send additional data to your backend
        const response = await fetch('/api/signup', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify({
                ...userData,
                idToken: token
            })
        });

        if (response.ok) {
            window.location.href = '/login';
        } else {
            throw new Error('Signup failed');
        }
    } catch (error) {
        console.error('Signup error:', error);
        throw error;
    }
}    

// Logout function
function logout() {
    firebase.auth().signOut().then(() => {
        localStorage.removeItem('authToken');
        window.location.href = '/login';
    }).catch((error) => {
        console.error('Logout error:', error);
    });
}