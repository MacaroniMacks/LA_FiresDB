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
                const userDoc = await firebase.firestore().collection('users').doc(userCredential.user.uid).get();
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

async function googleSignup(userType, centerName = null) {
    try {
        console.log('Starting Google signup process...');
        document.getElementById('errorMessage').style.display = 'none';
        document.getElementById('signupSuccess').style.display = 'none';

        // Create Google authentication provider
        const provider = new firebase.auth.GoogleAuthProvider();
        
        // Perform Google Sign-In
        const userCredential = await firebase.auth().signInWithPopup(provider);
        const user = userCredential.user;
        
        // Send verification email if not already verified
        if (!user.emailVerified) {
            await user.sendEmailVerification();
            console.log('Verification email sent');
        }

        // Get ID token
        const token = await user.getIdToken();
        localStorage.setItem('authToken', token);
        
        // Prepare user data
        const userData = {
            email: user.email,
            userType: userType,
            firstName: user.displayName ? user.displayName.split(' ')[0] : '',
            lastName: user.displayName ? user.displayName.split(' ').slice(1).join(' ') : ''
        };

        // Add center name for donation centers
        if (userType === 'donationCenter' && centerName) {
            userData.centerName = centerName;
        }

        // Send additional data to backend
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
            // Redirect to setup location
            window.location.href = `/setup-location?token=${token}`;
        } else {
            throw new Error('Signup failed');
        }
    } catch (error) {
        console.error('Google signup error:', error);
        document.getElementById('errorMessage').textContent = error.message;
        document.getElementById('errorMessage').style.display = 'block';
        throw error;
    }
}

// Add this to your auth.js file or in a script tag
async function handleGoogleSignIn() {
    try {
        const provider = new firebase.auth.GoogleAuthProvider();
        // Force account selection every time
        provider.setCustomParameters({
            prompt: 'select_account'
        });
        
        const result = await firebase.auth().signInWithPopup(provider);
        
        // Get the ID token
        const token = await result.user.getIdToken(true);
        localStorage.setItem('authToken', token);

        // Check Firestore for user data
        const userDoc = await firebase.firestore()
            .collection('users')
            .doc(result.user.uid)
            .get();
            
        // Check if document doesn't exist OR if isDonationCenter is null
        const isIncomplete = !userDoc.exists || userDoc.data().isDonationCenter === null;

        if (isIncomplete) {
            await firebase.auth().signOut();
            window.location.href = `/signup?email=${encodeURIComponent(result.user.email)}&provider=google`;
        } else {
            // Check if location exists
            const userData = userDoc.data();
            if (!userData.location || !userData.location.latitude || !userData.location.longitude) {
                window.location.href = `/setup-location?token=${token}`;
                return;
            }

            // Determine dashboard based on user type, just like in the login function
            const dashboardUrl = userData.isDonationCenter 
                ? '/donation-center-dashboard' 
                : '/neighbor-dashboard';

            // Navigate with token
            window.location.href = `${dashboardUrl}?token=${token}`;
        }
    } catch (error) {
        console.error("Google sign in error:", error);
        const errorMessage = document.getElementById('errorText');
        if (errorMessage) {
            errorMessage.textContent = error.message;
            document.getElementById('errorMessage').style.display = 'block';
        }
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
// Ensure you are using the admin SDK server-side only (it should not be used client-side)

async function signup(email, password, userData) {
    const errorMessageEl = document.getElementById('errorMessage');
    const signupSuccessEl = document.getElementById('signupSuccess');
    const signupFormEl = document.getElementById('signupForm');
    const signupHeaderEl = document.querySelector('.signup-header');
    const orDividerEl = document.querySelector('.or-divider');
    const googleSignupButtonEl = document.getElementById('googleSignupButton');

    let userCredential = null;

    try {
        
        console.log('Attempting to create user with email and password');
        userCredential = await firebase.auth().createUserWithEmailAndPassword(email, password);
        const user = userCredential.user;
        console.log('User created successfully:', user);

        // Send email verification
        await user.sendEmailVerification();

        // Get the ID token
        const token = await user.getIdToken();
        localStorage.setItem('authToken', token);

        // Send user data to the backend
        const response = await fetch('/api/signup', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify({
                ...userData,
                isDonationCenter: userData.accountType === 'donationCenter',
                idToken: token
            })
        });

        if (response.ok) {
            // Hide form elements and error message, then show success message
            if (signupFormEl) signupFormEl.style.display = 'none';
            if (signupHeaderEl) signupHeaderEl.style.display = 'none';
            if (orDividerEl) orDividerEl.style.display = 'none';
            if (googleSignupButtonEl) googleSignupButtonEl.style.display = 'none';
            if (errorMessageEl) errorMessageEl.style.display = 'none';
            if (signupSuccessEl) signupSuccessEl.style.display = 'block';
            return true;
        } else {
            // Display the default error message
            if (errorMessageEl) {
                errorMessageEl.textContent = 'An error occurred during signup. Please try again.';
                errorMessageEl.style.display = 'block';
            }
            return false;
        }
    } catch (error) {
        console.error('Signup error:', error);

        // Handle the "email-already-in-use" error
        if (error.code === 'auth/email-already-in-use') {
            try {
                // Query the users collection where the email field matches the given email
                const userQuery = await firebase.firestore().collection('users')
                    .where('email', '==', email)  // Match documents where the email field equals the input email
                    .get();
            
                if (!userQuery.empty) {
                    // If documents are returned, the email is associated with a regular account
                    console.log('Document(s) found:', userQuery.docs);
                    if (errorMessageEl) {
                        errorMessageEl.textContent = 'An account with this email already exists. Please sign in instead.';
                        errorMessageEl.style.display = 'block';
                    }
                } else {
                    // If no documents are returned, the email is associated with a Google account
                    console.log('No document found for this email');
                    if (errorMessageEl) {
                        errorMessageEl.textContent = 'This email is already associated with a Google account. Please use "Sign up with Google" instead.';
                        errorMessageEl.style.display = 'block';
                    }
                }
            } catch (userCheckError) {
                console.error('Error checking user in Firestore:', userCheckError);
                if (errorMessageEl) {
                    errorMessageEl.textContent = 'This email is already associated with a Google account. Please use "Sign up with Google" instead.';
                    errorMessageEl.style.display = 'block';
                }
            }
        } else {
            // Display any other error message
            if (errorMessageEl) {
                errorMessageEl.textContent = 'An error occurred during signup. Please try again.';
                errorMessageEl.style.display = 'block';
            }
        }
    }
}
