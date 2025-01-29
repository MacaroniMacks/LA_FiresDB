async function login(email, password) {
    try {
        // Reset all message displays
        document.getElementById('errorMessage').style.display = 'none';
        document.getElementById('verificationMessage').style.display = 'none';
        document.getElementById('resendSuccess').style.display = 'none';
        
        // Select the error text element specifically
        const errorMessageEl = document.getElementById('errorMessage');
        const errorTextEl = document.getElementById('errorText');
        const resetPasswordButton = document.getElementById('resetPasswordButton');

        try {
            const userCredential = await firebase.auth().signInWithEmailAndPassword(email, password);
            const user = userCredential.user;

            // Skip email verification check for localhost/127.0.0.1
            const isLocalhost = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1';
            if (!user.emailVerified && !isLocalhost) {
                document.getElementById('verificationMessage').style.display = 'block';
                await user.sendEmailVerification();
                throw new Error('Please verify your email before logging in. A new verification email has been sent.');
            }

            // Get the ID token
            const token = await user.getIdToken(true);
            localStorage.setItem('authToken', token);

            // Fetch user data and determine dashboard route
            try {
                const userDoc = await firebase.firestore().collection('users').doc(user.uid).get();
                const userData = userDoc.data();

                console.log('User document data:', userData);

                if (!userData.location || !userData.location.latitude || !userData.location.longitude) {
                    console.log('No location set, redirecting to setup location');
                    window.location.href = `/setup-location?token=${token}`;
                    return;
                }

                // Determine dashboard based on user type
                const dashboardUrl = userData.isDonationCenter 
                    ? '/donation-center-dashboard' 
                    : '/neighbor-dashboard';

                // Navigate with token
                try {
                    window.location.href = `${dashboardUrl}?token=${token}`;
                } catch (navError) {
                    console.error('Navigation error:', navError);
                    errorTextEl.textContent = 'Unable to navigate. Please try again.';
                    errorMessageEl.style.display = 'block';
                }
            } catch (firestoreError) {
                console.error('Firestore document retrieval error:', firestoreError);
                errorTextEl.textContent = 'Error retrieving user profile.';
                errorMessageEl.style.display = 'block';
            }
        } catch (error) {
            // More detailed error handling
            console.error('Login error:', error);
            
            // Reset error display
            errorMessageEl.style.display = 'block';
            resetPasswordButton.style.display = 'none';

            // Specific error handling
            switch (error.code) {
                case 'auth/wrong-password':
                    errorTextEl.textContent = 'Incorrect password. Please try again.';
                    resetPasswordButton.style.display = 'block';
                    break;
                case 'auth/user-not-found':
                    errorTextEl.textContent = 'No account found with this email. Please sign up.';
                    break;
                case 'auth/invalid-credential':
                    errorTextEl.textContent = 'Invalid login credentials. Please recheck your email and password or reset password.';
                    resetPasswordButton.style.display = 'block';
                    break;
                case 'auth/too-many-requests':
                    errorTextEl.textContent = 'Too many login attempts. Please try again later.';
                    break;
                default:
                    errorTextEl.textContent = error.message || 'An unexpected error occurred. Please try again.';
            }
        }
    } catch (outerError) {
        // Catch any unexpected errors
        console.error('Unexpected login error:', outerError);
        const errorMessageEl = document.getElementById('errorMessage');
        const errorTextEl = document.getElementById('errorText');
        
        errorMessageEl.style.display = 'block';
        errorTextEl.textContent = 'An unexpected error occurred. Please try again.';
    }
}

async function continueAsGuest() {
    try {
        // Sign in anonymously with Firebase
        const userCredential = await firebase.auth().signInAnonymously();
        
        // Get ID token for our backend
        const token = await userCredential.user.getIdToken();

        // Create basic guest user data in Firestore
        await firebase.firestore().collection('users').doc(userCredential.user.uid).set({
            isGuest: true,
            isDonationCenter: false,
            email: `guest_${userCredential.user.uid}@guest.local`,
            needs: [],
            canDonate: [],
            location: null,
            timestamp: firebase.firestore.FieldValue.serverTimestamp()
        });

        // Redirect to setup-location with token
        const url = new URL('/setup-location', window.location.origin);
        url.searchParams.append('token', token);
        window.location.href = url.toString();
        
    } catch (error) {
        console.error('Guest login error:', error);
        const errorMessage = document.getElementById('errorMessage');
        const errorText = document.getElementById('errorText');
        errorMessage.style.display = 'block';
        errorText.textContent = 'Unable to continue as guest. Please try again.';
    }
}

async function sendPasswordReset() {
    try {
        const emailInput = document.getElementById('email');
        const email = emailInput.value.trim();
        
        if (!email) {
            throw new Error('No email address found');
        }

        await firebase.auth().sendPasswordResetEmail(email);
        
        // Update error message to show success
        const errorText = document.getElementById('errorText');
        const resetButton = document.getElementById('resetPasswordButton');
        
        errorText.textContent = 'Password reset email sent! Please check your inbox.';
        resetButton.style.display = 'none';
        
        // Clean up stored email
        localStorage.removeItem('resetEmail');
    } catch (error) {
        console.error('Password reset error:', error);
        document.getElementById('errorText').textContent = error.message;
    }
}

async function signup(email, password, userData) {
    try {
        console.log('Starting signup process...');
        document.getElementById('errorMessage').style.display = 'none';
        document.getElementById('signupSuccess').style.display = 'none';

        // Create user in Firebase
        const userCredential = await firebase.auth().createUserWithEmailAndPassword(email, password);
        const user = userCredential.user;
        
        // Send verification email without a continue URL
        await user.sendEmailVerification();
        console.log('Verification email sent');

        const token = await user.getIdToken();
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
            // Hide all other elements
            document.querySelector('.signup-header').style.display = 'none';
            document.querySelector('.toggle-container').style.display = 'none';
            document.getElementById('signupForm').style.display = 'none';
            
            // Show only success message
            document.getElementById('signupSuccess').style.display = 'block';
        } else {
            throw new Error('Signup failed');
        }
    } catch (error) {
        console.error('Signup error:', error);
        document.getElementById('errorMessage').textContent = error.message;
        document.getElementById('errorMessage').style.display = 'block';
        throw error;
    }
}

async function resendVerificationEmail() {
    try {
        const user = firebase.auth().currentUser;
        if (user) {
            await user.sendEmailVerification({
                url: `${window.location.protocol}//${window.location.hostname}${window.location.port ? ':' + window.location.port : ''}/landing-page`,
                handleCodeInApp: false
            });
            document.getElementById('resendSuccess').style.display = 'block';
        }
    } catch (error) {
        console.error('Error sending verification:', error);
        document.getElementById('errorMessage').textContent = error.message;
        document.getElementById('errorMessage').style.display = 'block';
    }
}

function logout() {
    firebase.auth().signOut().then(() => {
        localStorage.removeItem('authToken');
        window.location.href = '/landing-page';
    }).catch((error) => {
        console.error('Logout error:', error);
    });
}