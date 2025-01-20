async function login(email, password) {
    try {
        // Check rate limit for login
        checkRateLimit('login');

        document.getElementById('errorMessage').style.display = 'none';
        document.getElementById('verificationMessage').style.display = 'none';
        document.getElementById('resendSuccess').style.display = 'none';

        const userCredential = await firebase.auth().signInWithEmailAndPassword(email, password);
        const user = userCredential.user;

        // Skip email verification check for localhost/127.0.0.1
        const isLocalhost = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1';
        if (!user.emailVerified && !isLocalhost) {
            document.getElementById('verificationMessage').style.display = 'block';
            await user.sendEmailVerification();
            throw new Error('Please verify your email before logging in. A new verification email has been sent.');
        }

        const token = await user.getIdToken(true);
        localStorage.setItem('authToken', token);

        await new Promise((resolve) => {
            const unsubscribe = firebase.auth().onAuthStateChanged((user) => {
                unsubscribe();
                resolve(user);
            });
        });

        const userDoc = await firebase.firestore().collection('users').doc(user.uid).get();
        const userData = userDoc.data();

        if (!userData.location) {
            window.location.href = '/setup-location';
            return;
        }

        if (userData.isDonationCenter === true) {
            window.location.href = '/donation-center-dashboard';
        } else {
            window.location.href = '/neighbor-dashboard';
        }
    } catch (error) {
        console.error('Login error:', error);
        document.getElementById('errorMessage').textContent = error.message;
        document.getElementById('errorMessage').style.display = 'block';
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