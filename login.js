let auth, db;

async function initializeFirebase() {
  try {
    const response = await fetch('/api/firebase-config');
    const result = await response.json();
    
    if (result.success) {
      firebase.initializeApp(result.config);
      auth = firebase.auth();
      db = firebase.firestore();
      console.log('Firebase initialized');
      
      db.settings({
		  cacheSizeBytes: firebase.firestore.CACHE_SIZE_UNLIMITED,
		  experimentalForceLongPolling: false,
		  experimentalAutoDetectLongPolling: true
		});
      
      // ✅ Initialize menu page AFTER Firebase is ready
      initializeLoginPage();
    }
  } catch (error) {
    console.error('Error:', error);
  }
}

// Start Firebase initialization
initializeFirebase();

// Custom error message mapping
function getCustomErrorMessage(error) {
  const errorCode = error.code;
  const errorMessages = {
    // Authentication errors
    'auth/invalid-email': 'Please enter a valid email address.',
    'auth/user-disabled': 'This account has been disabled. Please contact support.',
    'auth/user-not-found': 'No account found with this email. Please sign up first.',
    'auth/wrong-password': 'Incorrect password. Please try again.',
    'auth/invalid-credential': 'Invalid login credentials. Please check your email and password.',
    'auth/email-already-in-use': 'This email is already registered. Please login instead.',
    'auth/weak-password': 'Password is too weak. Use at least 6 characters.',
    'auth/operation-not-allowed': 'This sign-in method is not enabled. Please contact support.',
    'auth/account-exists-with-different-credential': 'An account already exists with the same email but different sign-in method.',
    'auth/invalid-verification-code': 'Invalid verification code. Please try again.',
    'auth/invalid-verification-id': 'Verification session expired. Please try again.',
    'auth/missing-verification-code': 'Please enter the verification code.',
    'auth/missing-verification-id': 'Verification failed. Please restart the process.',
    'auth/too-many-requests': 'Too many unsuccessful attempts. Please try again later.',
    'auth/requires-recent-login': 'For security reasons, please log in again to continue.',
    'auth/popup-closed-by-user': 'Sign-in cancelled. Please try again.',
    'auth/popup-blocked': 'Pop-up blocked by browser. Please allow pop-ups and try again.',
    'auth/unauthorized-domain': 'This domain is not authorized for authentication.',
    'auth/cancelled-popup-request': 'Only one authentication popup allowed at a time.',
    
    // Network errors
    'auth/network-request-failed': 'Network error. Please check your internet connection.',
    'auth/timeout': 'Request timed out. Please try again.',
    
    // Invalid action errors
    'auth/invalid-action-code': 'This link is invalid or has expired.',
    'auth/expired-action-code': 'This link has expired. Please request a new one.',
    'auth/user-token-expired': 'Your session has expired. Please log in again.',
    'auth/invalid-user-token': 'Invalid session. Please log in again.',
    'auth/credential-already-in-use': 'This credential is already linked to another account.',
    
    // Missing fields
    'auth/missing-email': 'Please enter your email address.',
    'auth/missing-password': 'Please enter your password.',
    
    // Default
    'default': 'An error occurred. Please try again.'
  };

  // Check for network errors
  if (!navigator.onLine || 
      error.message?.includes('network') || 
      error.message?.includes('timeout')) {
    return 'Network error. Please check your internet connection and try again.';
  }

  return errorMessages[errorCode] || errorMessages['default'];
}

function handleNetworkError(error) {
  if (!navigator.onLine || 
      error.code === 'auth/network-request-failed' || 
      error.message.includes('network') || 
      error.message.includes('timeout')) {
    return 'Network error. Please check your internet connection and try again.';
  }
  return getCustomErrorMessage(error);
}

// Display error message
function showError(message) {
  const authMessage = document.getElementById('authMessage');
  if (authMessage) {
    authMessage.textContent = message;
    authMessage.className = 'auth-message error-message';
    authMessage.style.display = 'block';
	setTimeout(() => clearMessage(), 3000);
  }
}

// Display success message
function showSuccess(message) {
  const authMessage = document.getElementById('authMessage');
  if (authMessage) {
    authMessage.textContent = message;
    authMessage.className = 'auth-message success-message';
    authMessage.style.display = 'block';
	setTimeout(() => clearMessage(), 3000);
  }
}

// Clear message
function clearMessage() {
  const authMessage = document.getElementById('authMessage');
  if (authMessage) {
    authMessage.textContent = '';
    authMessage.style.display = 'none';
  }
}

  // Check if running on native platform
const isNative = window.Capacitor && window.Capacitor.isNativePlatform();

let googleAuthInitialized = false;

async function initializeGoogleAuth() {
  if (isNative && !googleAuthInitialized) {
    try {
      const { GoogleAuth } = window.Capacitor.Plugins;
      await GoogleAuth.initialize({
        clientId: '779961497127-4sel93dgco3k9i9m24kgi871qafgsfjo.apps.googleusercontent.com',
        scopes: ['profile', 'email'],
        grantOfflineAccess: true
      });
      googleAuthInitialized = true;
      console.log('GoogleAuth initialized successfully');
    } catch (error) {
      console.error('GoogleAuth initialization failed:', error);
    }
  }
}

// Call initialization
if (isNative) {
  initializeGoogleAuth();
}

// Wait for both DOM and Firebase to be ready
Promise.all([
  new Promise(resolve => {
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', resolve);
    } else {
      resolve();
    }
  }),
  new Promise(resolve => {
    // Give Firebase a moment to initialize
    setTimeout(resolve, 100);
  })
]).then(() => {
  console.log('Initializing login page...');
  initializeLoginPage();
});
		
function initializeLoginPage() {
  const formTitle = document.getElementById('formTitle');
  const nameGroup = document.getElementById('nameGroup');
  const email = document.getElementById('email');
  const nameInput = document.getElementById('name');
  const PasswordGroup = document.getElementById('PasswordGroup');
  const password = document.getElementById('password');
  const confirmPasswordGroup = document.getElementById('confirmPasswordGroup');
  const confirmPassword = document.getElementById('confirmPassword');
  const loginBtn = document.getElementById('loginBtn');
  const signUpBtn = document.getElementById('signUpBtn');
  const socialSection = document.getElementById('socialSection');
  const deleteSocialButtons = document.getElementById('deleteSocialButtons');
  const switchLink = document.getElementById('switchLink');
  const googleLogin = document.getElementById('googleLogin');
  const appleLogin = document.getElementById('appleLogin');
  const authMessage = document.getElementById('authMessage');
  const buttonGroup = document.querySelector('.button-group');
  const forgotPasswordLink = document.getElementById('forgotPasswordLink');
  const sendResetBtn = document.getElementById('sendResetBtn');
  const deleteAccountBtn = document.getElementById('deleteAccountBtn');

  let isSignup = false;
  let processingSignup = false;
  let isDeletingAccount = false;
  let isDeleteSuccessState = false;
  
  
function isValidEmail(email) {
  const validDomains = [
    '.com', '.co', '.uk', '.in', '.org', '.net', '.edu', '.gov', 
    '.mil', '.int', '.eu', '.us', '.ca', '.au', '.de', '.fr', 
    '.jp', '.cn', '.br', '.ru', '.it', '.es', '.nl', '.info', 
    '.biz', '.io', '.app', '.dev'
  ];
  
  // Check if email contains @
  if (!email.includes('@')) {
    return false;
  }
  
  // Check if there's content before and after @
  const parts = email.split('@');
  if (parts.length !== 2 || parts[0].length === 0 || parts[1].length === 0) {
    return false;
  }
  
  // Check if domain has valid extension
  const domain = parts[1].toLowerCase();
  if (domain.startsWith('.')) {
    return false;
  }
    
  if (!domain.includes('.') || domain.indexOf('.') === 0) {
    return false;
  }
    
  const hasValidDomain = validDomains.some(validDomain => domain.endsWith(validDomain));
  return hasValidDomain;
}

function isValidName(name) {
  // Remove all spaces to count only letters
  const nameWithoutSpaces = name.replace(/\s/g, '');
  
  // Check if at least 4 letters
  if (nameWithoutSpaces.length < 4) {
    return false;
  }
  
  // Check if only letters and spaces (no numbers or special characters)
  const onlyLettersAndSpaces = /^[a-zA-Z\s]+$/;
  return onlyLettersAndSpaces.test(name);
}

function showLogin() {
  isSignup = false;
  formTitle.textContent = 'Login';
  nameGroup.style.display = 'none';
  PasswordGroup.style.display = 'block';
  confirmPasswordGroup.style.display = 'none';
  loginBtn.style.display = 'block';
  signUpBtn.style.display = 'block';
  signUpBtn.textContent = 'Sign Up';
  sendResetBtn.style.display = 'none';
  deleteAccountBtn.style.display = 'none';
  deleteSocialButtons.style.display = 'none';
  forgotPasswordLink.style.display = 'block';
  socialSection.style.display = 'block';
  switchLink.innerHTML = '';
  clearMessage();
  [email, nameInput, password, confirmPassword].forEach(el => el.value = '');
}

function showSignUp() {
  isSignup = true;
  formTitle.textContent = 'Sign Up';
  nameGroup.style.display = 'block';
  confirmPasswordGroup.style.display = 'block';
  loginBtn.style.display = 'none';
  signUpBtn.textContent = 'Create Account';
  forgotPasswordLink.style.display = 'none';
  deleteSocialButtons.style.display = 'none';
  clearMessage();
  [email, nameInput, password, confirmPassword].forEach(el => el.value = '');

  switchLink.innerHTML = "Already have an account? <a id='loginLink'>Login</a>";

  setTimeout(() => {
    const loginLink = document.getElementById('loginLink');
    if (loginLink) {
      loginLink.onclick = (e) => {
        e.preventDefault();
        showLogin();
      };
    }
  }, 10);
}

function showResetPassword() {
  formTitle.textContent = 'Reset Password';
  nameGroup.style.display = 'none';
  PasswordGroup.style.display = 'none';
  confirmPasswordGroup.style.display = 'none';
  loginBtn.style.display = 'none';
  signUpBtn.style.display = 'none';
  sendResetBtn.style.display = 'block';
  deleteAccountBtn.style.display = 'none';
  forgotPasswordLink.style.display = 'none';
  socialSection.style.display = 'none';
  deleteSocialButtons.style.display = 'none';
  clearMessage();
  [email, nameInput, password, confirmPassword].forEach(el => el.value = '');
  
  switchLink.innerHTML = '<a id="backToLoginFromReset">Back to Login</a>';
  
  setTimeout(() => {
    const backLink = document.getElementById('backToLoginFromReset');
    if (backLink) {
      backLink.onclick = (e) => {
        e.preventDefault();
        showLogin();
        socialSection.style.display = 'block';
      };
    }
  }, 10);
}

function showDeleteAccount() {
  formTitle.textContent = 'Delete Account';
  nameGroup.style.display = 'none';
  PasswordGroup.style.display = 'block';
  confirmPasswordGroup.style.display = 'none';
  loginBtn.style.display = 'none';
  signUpBtn.style.display = 'none';
  sendResetBtn.style.display = 'none';
  deleteAccountBtn.style.display = 'block';
  forgotPasswordLink.style.display = 'none';
  socialSection.style.display = 'none';
  deleteSocialButtons.style.display = 'block';
  clearMessage();
  [email, nameInput, password, confirmPassword].forEach(el => el.value = '');
  
  switchLink.innerHTML = '<a id="backToLoginFromDelete">Back to Login</a>';
  
  setTimeout(() => {
    const backLink = document.getElementById('backToLoginFromDelete');
    if (backLink) {
      backLink.onclick = (e) => {
        e.preventDefault();
        deleteSocialButtons.style.display = 'none';
        showLogin();
        socialSection.style.display = 'block';
      };
    }
  }, 10);
}

  if (signUpBtn) {
    signUpBtn.addEventListener('click', async (e) => {
      e.preventDefault();
      clearMessage();

      if (!isSignup) {
        showSignUp();
        return;
      }

      const emailValue = email.value.trim();
      const nameValue = nameInput.value.trim();
      const passwordValue = password.value;
      const confirmPasswordValue = confirmPassword.value;

      if (!isValidEmail(emailValue)) {
        showError('Please enter a valid email address.');
        return;
      }

      if (!isValidName(nameValue)) {
        showError('Name must be at least 4 letters with no numbers or special characters.');
        return;
      }

      if (passwordValue.length < 6) {
        showError('Password must be at least 6 characters long.');
        return;
      }

      if (passwordValue !== confirmPasswordValue) {
        showError('Passwords do not match.');
        return;
      }

      try {
        processingSignup = true;
        const userCredential = await auth.createUserWithEmailAndPassword(emailValue, passwordValue);
        const user = userCredential.user;

        await db.collection('users').doc(user.uid).set({
          name: nameValue,
          email: emailValue,
          createdAt: firebase.firestore.FieldValue.serverTimestamp()
        });

        showSuccess('Account created successfully! Redirecting...');
        setTimeout(() => {
          processingSignup = false;
          window.location.replace('index.html');
        }, 1000);
      } catch (error) {
        processingSignup = false;
        showError(getCustomErrorMessage(error));
      }
    });
  }

  if (loginBtn) {
    loginBtn.addEventListener('click', async (e) => {
      e.preventDefault();
      clearMessage();

      const emailValue = email.value.trim();
      const passwordValue = password.value;

      if (!emailValue || !passwordValue) {
        showError('Please enter both email and password.');
        return;
      }

      if (!isValidEmail(emailValue)) {
        showError('Please enter a valid email address.');
        return;
      }

      try {
        await auth.signInWithEmailAndPassword(emailValue, passwordValue);
		showSuccess('Login successful! Redirecting...');
      } catch (error) {
        showError(getCustomErrorMessage(error));
      }
    });
  }

  // Forgot Password Link
  const forgotLink = document.getElementById('forgotLink');
  if (forgotLink) {
    forgotLink.addEventListener('click', (e) => {
      e.preventDefault();
      showResetPassword();
    });
  }

  // Send Reset Password
  if (sendResetBtn) {
    sendResetBtn.addEventListener('click', async (e) => {
      e.preventDefault();
      clearMessage();

      const emailValue = email.value.trim();

      if (!emailValue) {
        showError('Please enter your email address.');
        return;
      }

      if (!isValidEmail(emailValue)) {
        showError('Please enter a valid email address.');
        return;
      }
	  
	const signInMethods = await auth.fetchSignInMethodsForEmail(emailValue);

	if (signInMethods.length === 0) {
	  showError("This email doesn't exist in our database. Please check and try again.");
	  return;
	}

	if (signInMethods.length > 0) {
	  const hasGoogle = signInMethods.some(m => m.includes('google'));
	  const hasApple = signInMethods.some(m => m.includes('apple'));
	  const hasPassword = signInMethods.includes('password');
	  
	  if (hasGoogle && !hasPassword) {
		showError('This email is associated with Google login. Please use "Continue with Google" instead.');
		return;
	  }
	  if (hasApple && !hasPassword) {
		showError('This email is associated with Apple login. Please use "Continue with Apple" instead.');
		return;
	  }
	}

      try {
        await auth.sendPasswordResetEmail(emailValue);
        document.getElementById('resetMessage').textContent = 
          'Password reset link sent! Please check your email.';
        document.getElementById('resetModal').style.display = 'flex';
      } catch (error) {
        showError(getCustomErrorMessage(error));
      }
    });
  }

  // Delete Account Link
  const deleteAccountLink = document.getElementById('deleteAccountLink');
  if (deleteAccountLink) {
    deleteAccountLink.addEventListener('click', (e) => {
      e.preventDefault();
      showDeleteAccount();
    });
  }

  // Delete Account with Email/Password
  if (deleteAccountBtn) {
    deleteAccountBtn.addEventListener('click', async (e) => {
      e.preventDefault();
      clearMessage();

      const emailValue = email.value.trim();
      const passwordValue = password.value;

      if (!emailValue || !passwordValue) {
        showError('Please enter both email and password.');
        return;
      }

      try {
        isDeletingAccount = true;

        const userCredential = await auth.signInWithEmailAndPassword(emailValue, passwordValue);
        
        const snapshot = await db.collection('authenticators')
          .where('uid', '==', userCredential.user.uid)
          .get();

        if (!snapshot.empty) {
          showError('Please delete all authenticators before deleting your account.');
          await auth.signOut();
          isDeletingAccount = false;
          return;
        }

        document.getElementById('deleteConfirmModal').style.display = 'flex';

      } catch (error) {
        isDeletingAccount = false;
        showError(getCustomErrorMessage(error));
      }
    });
  }

  // Google Login
  if (googleLogin) {
    googleLogin.addEventListener('click', async (e) => {
      e.preventDefault();
      clearMessage();

      try {
        let userCredential;

        if (isNative) {
          const { GoogleAuth } = window.Capacitor.Plugins;

          if (!googleAuthInitialized) {
            await initializeGoogleAuth();
          }

          const result = await GoogleAuth.signIn();

          const credential = firebase.auth.GoogleAuthProvider.credential(result.authentication.idToken);

          userCredential = await auth.signInWithCredential(credential);

        } else {
          const provider = new firebase.auth.GoogleAuthProvider();
          provider.setCustomParameters({ prompt: 'select_account' });
          userCredential = await auth.signInWithPopup(provider);
        }

        const userDoc = await db.collection('users').doc(userCredential.user.uid).get();

        if (!userDoc.exists) {
          await db.collection('users').doc(userCredential.user.uid).set({
            name: userCredential.user.displayName || 'User',
            email: userCredential.user.email,
            createdAt: firebase.firestore.FieldValue.serverTimestamp()
          });
        }

      } catch (error) {
        showError(getCustomErrorMessage(error));
      }
    });
  }

  // Apple Login
  if (appleLogin) {
    appleLogin.addEventListener('click', async (e) => {
      e.preventDefault();
      clearMessage();

      try {
        let userCredential;

        if (isNative) {
          const { FirebaseAuthentication } = window.Capacitor.Plugins;

          const result = await FirebaseAuthentication.signInWithApple();

          const credential = firebase.auth.OAuthProvider.credential({
            idToken: result.credential.idToken,
            rawNonce: result.credential.nonce
          });

          userCredential = await auth.signInWithCredential(credential);

        } else {
          const provider = new firebase.auth.OAuthProvider('apple.com');
          userCredential = await auth.signInWithPopup(provider);
        }

        const userDoc = await db.collection('users').doc(userCredential.user.uid).get();

        if (!userDoc.exists) {
          await db.collection('users').doc(userCredential.user.uid).set({
            name: userCredential.user.displayName || 'User',
            email: userCredential.user.email,
            createdAt: firebase.firestore.FieldValue.serverTimestamp()
          });
        }

      } catch (error) {
        showError(getCustomErrorMessage(error));
      }
    });
  }
	
	// Delete with Google
	const deleteWithGoogle = document.getElementById('deleteWithGoogle');
	if (deleteWithGoogle) {
	  deleteWithGoogle.addEventListener('click', async (e) => {
		e.preventDefault();
		clearMessage();

		try {
		  isDeletingAccount = true;

		  let userCredential;

		  if (isNative) {
			const { GoogleAuth } = window.Capacitor.Plugins;

			if (!googleAuthInitialized) {
			  await initializeGoogleAuth();
			}

			const result = await GoogleAuth.signIn();

			const credential = firebase.auth.GoogleAuthProvider.credential(result.authentication.idToken);

			userCredential = await auth.signInWithCredential(credential);

		  } else {
			const provider = new firebase.auth.GoogleAuthProvider();
			provider.setCustomParameters({ prompt: 'select_account' });
			userCredential = await auth.signInWithPopup(provider);
		  }

		  const snapshot = await db.collection('authenticators')
			.where('uid', '==', userCredential.user.uid)
			.get();

		  if (!snapshot.empty) {
			showError('Please delete all authenticators before deleting your account.');
			await auth.signOut();
			isDeletingAccount = false;
			return;
		  }

		  document.getElementById('deleteConfirmModal').style.display = 'flex';

		} catch (error) {
		  isDeletingAccount = false;
		  showError(getCustomErrorMessage(error));
		}
	  });
	}
	
	// Delete with Apple
	const deleteWithApple = document.getElementById('deleteWithApple');
	if (deleteWithApple) {
	  deleteWithApple.addEventListener('click', async (e) => {
		e.preventDefault();
		clearMessage();

		try {
		  isDeletingAccount = true;

		  let userCredential;

		  if (isNative) {
			const { FirebaseAuthentication } = window.Capacitor.Plugins;

			const result = await FirebaseAuthentication.signInWithApple();

			const credential = firebase.auth.OAuthProvider.credential({
			  idToken: result.credential.idToken,
			  rawNonce: result.credential.nonce
			});

			userCredential = await auth.signInWithCredential(credential);

		  } else {
			const provider = new firebase.auth.OAuthProvider('apple.com');
			userCredential = await auth.signInWithPopup(provider);
		  }

		  const snapshot = await db.collection('authenticators')
			.where('uid', '==', userCredential.user.uid)
			.get();

		  if (!snapshot.empty) {
			showError('Please delete all authenticators before deleting your account.');
			await auth.signOut();
			isDeletingAccount = false;
			return;
		  }

		  document.getElementById('deleteConfirmModal').style.display = 'flex';

		} catch (error) {
		  isDeletingAccount = false;
		  showError(getCustomErrorMessage(error));
		}
	  });
	}
	
	// Delete Confirmation Modal
	const cancelDeleteAccount = document.getElementById('cancelDeleteAccount');
	const confirmDeleteAccount = document.getElementById('confirmDeleteAccount');
	const deleteSuccessActions = document.getElementById('deleteSuccessActions');
	const deleteSuccessOk = document.getElementById('deleteSuccessOk');

	if (cancelDeleteAccount) {
	  cancelDeleteAccount.addEventListener('click', async () => {

		document.getElementById('deleteConfirmModal').style.display = 'none';

		document.querySelector('.modal-actions-horizontal').style.display = 'flex';
		deleteSuccessActions.style.display = 'none';

		await auth.signOut();
		isDeletingAccount = false;
		email.value = '';
		password.value = '';
		showLogin();
	  });
	}

	if (confirmDeleteAccount) {
	  confirmDeleteAccount.addEventListener('click', async () => {

		// hide Confirm/Cancel buttons
		document.querySelector('.modal-actions-horizontal').style.display = 'none';

		try {
		  const user = auth.currentUser;

		  if (!user) {
			alert("No authenticated user found.");
			return;
		  }

		  // 🔥 Delete all deleted_authenticators for this user
	      const deletedAuthSnapshot = await db.collection('deleted_authenticators')
	        .where('uid', '==', user.uid)
	        .get();
	
	      const deleteBatch = db.batch();
	      deletedAuthSnapshot.forEach(doc => {
	        deleteBatch.delete(doc.ref);
	      });
	      
	      if (!deletedAuthSnapshot.empty) {
	        await deleteBatch.commit();
	      }

		  // 🔥 delete Firebase account
		  await user.delete();

		  // update modal content to success state
		  document.querySelector('#deleteConfirmModal .privacy-scroll-content').innerHTML = `
			<h2>Account Deleted</h2>
			<p>Your account has been deleted successfully!</p>
		  `;

		  // show OK button
		  deleteSuccessActions.style.display = 'flex';
		  isDeleteSuccessState = true;

		} catch (error) {
		  if (error.code === 'auth/requires-recent-login') {
			alert("For security reasons, please log in again before deleting.");
		  } else {
			alert("Error deleting account: " + getCustomErrorMessage(error));
		  }

		  // restore original buttons for retry
		  document.querySelector('.modal-actions-horizontal').style.display = 'flex';
		}
	  });
	}

	if (deleteSuccessOk) {
	  deleteSuccessOk.addEventListener('click', async () => {

		document.getElementById('deleteConfirmModal').style.display = 'none';

		// reset modal text to original
		document.querySelector('#deleteConfirmModal .privacy-scroll-content').innerHTML = `
		  <h2>Delete Account</h2>
		  <p>Please note, once the account is deleted, all your information will be deleted. However, you can sign up anytime.</p>
		`;

		// restore default button state
		document.querySelector('.modal-actions-horizontal').style.display = 'flex';
		deleteSuccessActions.style.display = 'none';

		// log out & reset UI
		await auth.signOut();
		isDeletingAccount = false;
		isDeleteSuccessState = false;
		email.value = '';
		password.value = '';
		showLogin();
		socialSection.style.display = 'block';    
	  });
	}

	// Toggle Password Visibility
	document.querySelectorAll('.toggle-password').forEach(button => {
	  button.addEventListener('click', function() {
		const targetId = this.getAttribute('data-target');
		const input = document.getElementById(targetId);
		
		if (input.type === 'password') {
		  input.type = 'text';
		  this.innerHTML = '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"></path><line x1="1" y1="1" x2="23" y2="23"></line></svg>';
		} else {
		  input.type = 'password';
		  this.innerHTML = '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path><circle cx="12" cy="12" r="3"></circle></svg>';
		}
	  });
	});

	// Reset Modal Close
	const closeReset = document.getElementById('closeReset');
	if (closeReset) {
	  closeReset.addEventListener('click', () => {
		document.getElementById('resetModal').style.display = 'none';
		email.value = '';
		showLogin();
	  });
	}
	
	// Auth state listener
	auth.onAuthStateChanged((user) => {
	  if (user && !processingSignup) {
		console.log('User authenticated:', user.email);
		
		// Don't redirect if we're in account deletion flow
		if (isDeletingAccount) {
		  console.log('Account deletion in progress, redirecting');
		  return;
		}
		
		// Prevent multiple redirects
		if (!window.location.href.includes('index.html')) {
		  console.log('Redirecting to index.html');
		  
		  // Use replace to prevent back button issues
		  window.location.replace('index.html');
		}
	  } else {
		console.log('No user authenticated');
	  }
	});

  // Privacy modal
  const modal = document.getElementById('privacyModal');
  const openBtn = document.getElementById('openPrivacy');
  const closeBtn = document.getElementById('closePrivacy');

  if (openBtn && modal && closeBtn) {
    openBtn.onclick = function() {
      modal.style.display = "flex";
    };
    closeBtn.onclick = function() {
      modal.style.display = "none";
    };
    window.onclick = function(event) {
      if (event.target == modal) {
        modal.style.display = "none";
      }
    };
  }

  // Initial setup
  showLogin();
  if (buttonGroup) {
    buttonGroup.classList.remove('signup-mode');
    buttonGroup.classList.add('signup-mode');
  }
  
}
