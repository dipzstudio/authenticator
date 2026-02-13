const firebaseConfig = {
  apiKey: "AIzaSyCC6NzVYzBGRueNlQiOfN55xxLhpu7B8D4",
  authDomain: "authenticator-9c431.firebaseapp.com",
  projectId: "authenticator-9c431",
  storageBucket: "authenticator-9c431.firebasestorage.app",
  messagingSenderId: "779961497127",
  appId: "1:779961497127:web:87610389beb7cb9415c002",
  measurementId: "G-JJB538N8CQ"
};

function handleNetworkError(error) {
  if (!navigator.onLine || 
      error.code === 'auth/network-request-failed' || 
      error.message.includes('network') || 
      error.message.includes('timeout')) {
    return 'Network Error! Please check your internet connection and try again.';
  }
  return error.message;
}

firebase.initializeApp(firebaseConfig);
const auth = firebase.auth();
const db = firebase.firestore(); 

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
  const authError = document.getElementById('authError');
  const buttonGroup = document.querySelector('.button-group');
  const forgotPasswordLink = document.getElementById('forgotPasswordLink');
  const sendResetBtn = document.getElementById('sendResetBtn');
  const deleteAccountBtn = document.getElementById('deleteAccountBtn');

  let isSignup = false;
  let isDeletingAccount = false;
  
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
  signUpBtn.style.display = 'block';  // ADD THIS LINE
  signUpBtn.textContent = 'Sign Up';
  sendResetBtn.style.display = 'none';
  deleteAccountBtn.style.display = 'none';
  deleteSocialButtons.style.display = 'none';
  forgotPasswordLink.style.display = 'block';
  socialSection.style.display = 'block';
  switchLink.innerHTML = '';
  authError.textContent = '';
  [email, name, password, confirmPassword].forEach(el => el.value = '');
}

function showSignUp() {
  isSignup = true;
  formTitle.textContent = 'Sign Up';
  nameGroup.style.display = 'block';
  confirmPasswordGroup.style.display = 'block';
  loginBtn.style.display = 'none';
  signUpBtn.textContent = 'Create Account';
  forgotPasswordLink.style.display = 'none';  // ADD THIS LINE
  deleteSocialButtons.style.display = 'none';
  authError.textContent = '';
  [email, name, password, confirmPassword].forEach(el => el.value = '');

  switchLink.innerHTML = "Already have account? <a id='loginLink'>Click Login</a>";

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
  authError.textContent = '';
  [email, name, password, confirmPassword].forEach(el => el.value = '');
  
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
  deleteSocialButtons.style.display = 'block';  // SHOW DELETE BUTTONS
  authError.textContent = '';
  [email, name, password, confirmPassword].forEach(el => el.value = '');
  
  switchLink.innerHTML = '<a id="backToLoginFromDelete">Back to Login</a>';
  
  setTimeout(() => {
    const backLink = document.getElementById('backToLoginFromDelete');
    if (backLink) {
      backLink.onclick = (e) => {
        e.preventDefault();
        deleteSocialButtons.style.display = 'none';  // HIDE DELETE BUTTONS
        showLogin();
        socialSection.style.display = 'block';
      };
    }
  }, 10);
}

  if (signUpBtn) {
    signUpBtn.addEventListener('click', async (e) => {
      e.preventDefault();
      authError.textContent = '';

      if (!isSignup) {
        showSignUp();
        return;
      }

      const emailVal = email.value.trim();
      const passwordVal = password.value;
      const nameVal = nameInput.value.trim();
      const confirmVal = confirmPassword.value;

      if (!emailVal || !nameVal || !passwordVal || !confirmVal) {
		authError.textContent = 'All fields are required.';
		return;
	  }
		
	  if (!isValidEmail(emailVal)) {
		authError.textContent = 'Invalid email format entered.';
		return;
	  }

	  if (!isValidName(nameVal)) {
		authError.textContent = 'Name must be at least 4 letters.';
		return;
	  }

	  if (passwordVal.length < 8) {
		authError.textContent = 'Password should be at least 8 characters.';
		return;
	  }

	  if (passwordVal !== confirmVal) {
		authError.textContent = 'Passwords do not match.';
		return;
	  }

      try {
        const userCredential = await auth.createUserWithEmailAndPassword(emailVal, passwordVal);

        await userCredential.user.updateProfile({
            displayName: nameVal
        });
        
        await userCredential.user.getIdToken(true);
        await auth.currentUser.reload();
        await new Promise(resolve => setTimeout(resolve, 1500));

        window.location.href = 'index.html';

		} catch (error) {
			console.error('Signup error:', error);
			authError.textContent = handleNetworkError(error);
		}
    });
  }

  if (loginBtn) {
    loginBtn.addEventListener('click', async (e) => {
	  e.preventDefault();
	  authError.textContent = '';

	  const emailVal = email.value.trim();
	  const passwordVal = password.value;

	  if (!emailVal || !passwordVal) {
		authError.textContent = 'Please enter both email and password.';
		return;
	  }
		
	  if (!isValidEmail(emailVal)) {
		authError.textContent = 'Invalid email format entered.';
		return;
	  }

	  try {
		await auth.signInWithEmailAndPassword(emailVal, passwordVal);
	  } catch (error) {
		if (error.code === 'auth/invalid-credential' || 
			error.code === 'auth/wrong-password' || 
			error.code === 'auth/user-not-found') {
		  authError.textContent = 'Incorrect email address or password entered.';
		} else {
		  authError.textContent = handleNetworkError(error);
		}
	  }
	});
  }

// Google Sign-In
if (googleLogin) {
  googleLogin.addEventListener('click', async (e) => {
    e.preventDefault();
    authError.textContent = '';
    
    try {
      if (isNative) {
        // Ensure initialized
        await initializeGoogleAuth();
        
        const { GoogleAuth } = window.Capacitor.Plugins;
		
		try {
		  await GoogleAuth.signOut();
		} catch (e) { /* ignore */ }
        
        // This opens the native account picker
        const googleUser = await GoogleAuth.signIn();
        
        // Verify token exists
        if (!googleUser?.authentication?.idToken) {
          throw new Error('No authentication token received');
        }
        
        // Create Firebase credential
        const credential = firebase.auth.GoogleAuthProvider.credential(
          googleUser.authentication.idToken
        );
        
        // Sign in to Firebase
        await auth.signInWithCredential(credential);
        
      } else {
        // Web version
        const provider = new firebase.auth.GoogleAuthProvider();
        provider.setCustomParameters({
          prompt: 'select_account'
        });
        await auth.signInWithPopup(provider);
      }
      
    } catch (error) {
      
      // User cancelled
      if (error.error === '12501' || error.code === 'auth/popup-closed-by-user') {
        console.log('Sign-in cancelled');
        return;
      }
      
      authError.textContent = handleNetworkError(error);
    }
  });
}

  // Apple Sign-In
  if (appleLogin) {
    appleLogin.addEventListener('click', async (e) => {
      e.preventDefault();
      authError.textContent = '';

      try {
        if (isNative) {
          const { FirebaseAuthentication } = window.Capacitor.Plugins;
          const result = await FirebaseAuthentication.signInWithApple();
          const credential = firebase.auth.OAuthProvider.credential({
            idToken: result.credential.idToken,
            rawNonce: result.credential.nonce
          });
          await auth.signInWithCredential(credential);
        } else {
          const provider = new firebase.auth.OAuthProvider('apple.com');
          await auth.signInWithPopup(provider);
        }
      } catch (error) {
		console.error('Apple sign-in error:', error);
		authError.textContent = 'Apple sign-in is not available at this moment.';  // CHANGE: Simple message
		appleLogin.disabled = true;
		appleLogin.style.opacity = '0.5';
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

	// Delete Account Link
	const deleteAccountLink = document.getElementById('deleteAccountLink');
	if (deleteAccountLink) {
	  deleteAccountLink.addEventListener('click', (e) => {
		e.preventDefault();
		showDeleteAccount();
	  });
	}

	// Send Reset Password Email
  if (sendResetBtn) {
	sendResetBtn.addEventListener('click', async (e) => {
	  e.preventDefault();
	  authError.textContent = '';

	  const emailVal = email.value.trim();
	  if (!emailVal) {
		authError.textContent = 'Please enter your email address.';
		return;
	  }

	  if (!isValidEmail(emailVal)) {
		authError.textContent = 'Invalid email format entered.';
		return;
	  }

	  try {
		const signInMethods = await auth.fetchSignInMethodsForEmail(emailVal);

		if (signInMethods.length === 0) {
		  authError.textContent = "This email doesn't exist in our database. Please check and try again.";
		  return;
		}

		const hasGoogle = signInMethods.some(m => m.includes('google'));
		const hasApple = signInMethods.some(m => m.includes('apple'));
		const hasPassword = signInMethods.includes('password');

		if (hasGoogle && !hasPassword) {
		  authError.textContent = 'This email is associated with a Google login. You may reset your Google password.';
		  return;
		}

		if (hasApple && !hasPassword) {
		  authError.textContent = 'This email is associated with an Apple login. You may reset your Apple password.';
		  return;
		}

		if (hasPassword) {
		  await auth.sendPasswordResetEmail(emailVal);

		  const resetModal = document.getElementById('resetModal');
		  const resetMessage = document.getElementById('resetMessage');
		  resetMessage.textContent = `A password reset link has been sent to ${emailVal}. Please check your inbox and reset within 2 hours.`;
		  resetModal.style.display = 'block';
		}

	  } catch (error) {
		authError.textContent = handleNetworkError(error);
	  }
	});
  }
	
	// Delete Account Button - Email/Password
  if (deleteAccountBtn) {
    deleteAccountBtn.addEventListener('click', async (e) => {
      e.preventDefault();
      authError.textContent = '';
      
      const emailVal = email.value.trim();
      const passwordVal = password.value;
      
      if (!emailVal || !passwordVal) {
        authError.textContent = 'Please enter both email and password.';
        return;
      }
      
      if (!isValidEmail(emailVal)) {
        authError.textContent = 'Invalid email format entered.';
        return;
      }
      
      try {
        const signInMethods = await auth.fetchSignInMethodsForEmail(emailVal);
        
        if (signInMethods.length === 0) {
          authError.textContent = "This email doesn't exist in our database.";
          return;
        }
        
        const hasGoogle = signInMethods.some(method => method.includes('google'));
        const hasApple = signInMethods.some(method => method.includes('apple'));
        const hasPassword = signInMethods.includes('password');
        
        if (hasGoogle && !hasPassword) {
          authError.textContent = "This account is associated with Google account. Click on Delete with Google below to proceed further.";
          return;
        }
        
        if (hasApple && !hasPassword) {
          authError.textContent = "This account is associated with Apple account. Click on Delete with Apple below to proceed further.";
          return;
        }
        
        if (hasPassword) {
          isDeletingAccount = true;
          
          const userCredential = await auth.signInWithEmailAndPassword(emailVal, passwordVal);
          
          const snapshot = await db.collection('authenticators')
            .where('uid', '==', userCredential.user.uid)
            .get();
          
          if (!snapshot.empty) {
            authError.textContent = 'Please delete all your authenticator accounts before deleting account.';
            await auth.signOut();
            isDeletingAccount = false;
            return;
          }
          
          document.getElementById('deleteConfirmModal').style.display = 'block';
        }
        
      } catch (error) {
        isDeletingAccount = false;
        if (error.code === 'auth/invalid-credential' || 
            error.code === 'auth/wrong-password' || 
            error.code === 'auth/user-not-found') {
          authError.textContent = 'Incorrect email address or password entered.';
        } else {
          authError.textContent = handleNetworkError(error);
        }
      }
    });
  }
	
	// Delete with Google Button
	const deleteWithGoogle = document.getElementById('deleteWithGoogle');
	if (deleteWithGoogle) {
	  deleteWithGoogle.addEventListener('click', async (e) => {
		e.preventDefault();
		authError.textContent = '';

		try {
		  isDeletingAccount = true;

		  let userCredential;

		  if (isNative) {
			await initializeGoogleAuth();
			const { GoogleAuth } = window.Capacitor.Plugins;

			try { await GoogleAuth.signOut(); } catch(e){}

			const googleUser = await GoogleAuth.signIn();

			const credential = firebase.auth.GoogleAuthProvider.credential(
			  googleUser.authentication.idToken
			);

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
			authError.textContent = 'Please delete authenticators first.';
			await auth.signOut();
			isDeletingAccount = false;
			return;
		  }

		  document.getElementById('deleteConfirmModal').style.display = 'block';

		} catch (error) {
		  isDeletingAccount = false;
		  authError.textContent = 'Google authentication failed. Try again.';
		}
	  });
	}
	
	// Delete with Apple
	const deleteWithApple = document.getElementById('deleteWithApple');
	if (deleteWithApple) {
	  deleteWithApple.addEventListener('click', async (e) => {
		e.preventDefault();
		authError.textContent = '';

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
			authError.textContent = 'Please delete authenticators first.';
			await auth.signOut();
			isDeletingAccount = false;
			return;
		  }

		  document.getElementById('deleteConfirmModal').style.display = 'block';

		} catch (error) {
		  isDeletingAccount = false;
		  authError.textContent = 'Apple authentication failed.';
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

		document.querySelector('.modal-actions-horizontal').style.display = 'none';

		try {
		  const user = auth.currentUser;

		  if (!user) {
			alert('Please log in again to continue.');
			return;
		  }

		  await user.delete();

		  document.querySelector('#deleteConfirmModal .privacy-scroll-content').innerHTML = `
			<h2>Account Deleted</h2>
			<p>Your account has been deleted successfully!</p>
		  `;

		  deleteSuccessActions.style.display = 'flex';

		} catch (error) {
		  if (error.code === 'auth/requires-recent-login') {
			alert('Please re-authenticate and try again.');
		  } else {
			if (!navigator.onLine) {
			  alert('Network Error! Please check your connection and try again.');
			} else {
			  alert('Failed to delete account. Please try again.');
			}
		  }

		  document.querySelector('.modal-actions-horizontal').style.display = 'flex';
		}
	  });
	}

	if (deleteSuccessOk) {
	  deleteSuccessOk.addEventListener('click', async () => {

		document.getElementById('deleteConfirmModal').style.display = 'none';

		document.querySelector('#deleteConfirmModal .privacy-scroll-content').innerHTML = `
		  <h2>Delete Account</h2>
		  <p>Please note, once the account is deleted, all your information will be deleted. However, you can sign up anytime.</p>
		`;

		document.querySelector('.modal-actions-horizontal').style.display = 'flex';
		deleteSuccessActions.style.display = 'none';

		await auth.signOut();
		isDeletingAccount = false;
		email.value = '';
		password.value = '';
		showLogin();
	  });
	}

	// Toggle Password Visibility
	document.querySelectorAll('.toggle-password').forEach(button => {
	  button.addEventListener('click', function() {
		const targetId = this.getAttribute('data-target');
		const input = document.getElementById(targetId);
		
		if (input.type === 'password') {
		  input.type = 'text';
		  this.innerHTML = '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"></path><line x1="1" y1="1" x2="23" y2="23"></line></svg>';
		} else {
		  input.type = 'password';
		  this.innerHTML = '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path><circle cx="12" cy="12" r="3"></circle></svg>';
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
	  if (user) {
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
      modal.style.display = "block";
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
