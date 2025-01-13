from flask import Flask, render_template, request, redirect, url_for, jsonify, session
from functools import wraps
import firebase_admin
from firebase_admin import credentials, auth, firestore, initialize_app
import json
from firebase_admin import auth

app = Flask(__name__)

def validate_token(auth_token):
    """
    Validate Firebase ID token with error handling
    """
    try:
        # Verify the token
        decoded_token = auth.verify_id_token(
            auth_token, 
            check_revoked=True
        )
        return decoded_token
    except auth.InvalidIdTokenError:
        print("Invalid ID token")
        return None
    except auth.ExpiredIdTokenError:
        print("Token has expired")
        return None
    except Exception as e:
        print(f"Token validation error: {str(e)}")
        return None

# Initialize Firebase Admin SDK
try:
    cred = credentials.Certificate("serviceAccountKey.json")
    firebase_admin.initialize_app(cred)
    db = firestore.client()
except Exception as e:
    print(f"Firebase initialization error: {e}")

def login_required(view_function):
    @wraps(view_function)
    def wrapped_view(*args, **kwargs):
        print("Login required decorator called")
        
        # Check Authorization header first
        auth_header = request.headers.get('Authorization')
        token = None
        
        if auth_header and auth_header.startswith('Bearer '):
            token = auth_header.split('Bearer ')[1]
        else:
            # If not in header, check URL parameters
            token = request.args.get('token')
            
        if not token:
            print("No valid token found")
            return redirect(url_for('login'))

        try:
            decoded_token = auth.verify_id_token(
                token,
                check_revoked=False,
                clock_skew_seconds=60
            )
            
            request.user = decoded_token
            return view_function(*args, **kwargs)
            
        except Exception as e:
            print(f"Token verification error: {str(e)}")
            return redirect(url_for('login'))

    return wrapped_view

@app.route('/')
def home():
    return render_template('login.html')

@app.route('/login')
def login():
    return render_template('login.html')

@app.route('/signup')
def signup():
    return render_template('signup.html')

@app.route('/api/signup', methods=['POST'])
def api_signup():
    try:
        data = request.get_json()
        print("Received signup data:", data)
        
        is_company = data.get('userType') == 'company'
        
        # Get the user ID from the token
        token = data.get('idToken')
        decoded_token = auth.verify_id_token(token)
        user_id = decoded_token['user_id']

        # Base user data
        user_data = {
            'isCompany': is_company
        }

        if is_company:
            user_data.update({
                'companyName': data.get('companyName')
            })
        else:
            user_data.update({
                'provider': data.get('energyProvider'),
                'region': data.get('city'),
                'accountBal': 0,
                'RequestIDsAccepted': []
            })

        print("Attempting to store user data:", user_data)
        
        # Add user to Firestore
        db.collection('users').document(user_id).set(user_data)
        print("User data stored in Firestore")

        return jsonify({'status': 'success', 'uid': user_id}), 200

    except Exception as e:
        print("Error during signup:", str(e))
        return jsonify({'error': str(e)}), 400
    
@app.route('/api/login', methods=['POST', 'OPTIONS'])
def api_login():
    # Handle preflight requests
    if request.method == 'OPTIONS':
        response = jsonify({'status': 'success'})
        response.headers.add('Access-Control-Allow-Origin', '*')
        response.headers.add('Access-Control-Allow-Headers', 'Content-Type,Authorization')
        response.headers.add('Access-Control-Allow-Methods', 'POST')
        return response

    print("Login API endpoint hit")
    try:
        data = request.get_json()
        print("Received data:", data)
        
        # Extract token
        id_token = data.get('idToken')
        print("Extracted token:", id_token)
        
        if not id_token:
            print("No token provided")
            return jsonify({
                'status': 'error',
                'message': 'No token provided'
            }), 400

        try:
            # Verify the token using Firebase Admin SDK
            decoded_token = auth.verify_id_token(id_token)
            print("Token decoded successfully:", decoded_token)

            # Get the user ID from the decoded token
            uid = decoded_token['uid']
            print("User ID:", uid)

        except Exception as e:
            print(f"Token verification error: {type(e).__name__}")
            print(f"Error details: {str(e)}")
            return jsonify({
                'status': 'error',
                'message': f'Token verification failed: {str(e)}'
            }), 401

        # Get additional user data from Firestore
        user_doc = db.collection('users').document(uid).get()
        
        # Check if user document exists
        if not user_doc.exists:
            print("User document not found")
            return jsonify({
                'status': 'error',
                'message': 'User profile not found'
            }), 404

        user_data = user_doc.to_dict()
        print("User data retrieved:", user_data)

        return jsonify({
            'status': 'success',
            'isCompany': user_data.get('isCompany', False)
        }), 200

    except Exception as e:
        print(f"Unexpected login API error: {str(e)}")
        return jsonify({
            'status': 'error',
            'message': str(e)
        }), 500

@app.route('/customer-dashboard')
@login_required
def customer_dashboard():
    print("=== DASHBOARD ROUTE ===")
    print("1. Route accessed")
    print("2. User:", request.user if hasattr(request, 'user') else 'No user')
    try:
        print("3. Attempting to render template")
        return render_template('customer-dashboard.html')
    except Exception as e:
        print("4. Error:", str(e))
        return str(e), 500

@app.route('/company-dashboard')
@login_required
def company_dashboard():
    return render_template('company-dashboard.html')

@app.route('/logout')
def logout():
    # Clear any session data if you're using sessions
    session.clear()
    return redirect(url_for('login'))

@app.errorhandler(404)
def page_not_found(e):
    return render_template('404.html'), 404

@app.errorhandler(500)
def internal_server_error(e):
    return render_template('500.html'), 500

if __name__ == '__main__':
    app.run(debug=True)