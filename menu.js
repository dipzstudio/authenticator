const firebaseConfig = {
  apiKey: "AIzaSyCC6NzVYzBGRueNlQiOfN55xxLhpu7B8D4",
  authDomain: "authenticator-9c431.firebaseapp.com",
  projectId: "authenticator-9c431",
  storageBucket: "authenticator-9c431.firebasestorage.app",
  messagingSenderId: "779961497127",
  appId: "1:779961497127:web:87610389beb7cb9415c002",
  measurementId: "G-JJB538N8CQ"
};

if (!firebase.apps.length) {
  firebase.initializeApp(firebaseConfig);
}

const auth = firebase.auth();
const db = firebase.firestore();

// Updated Firebase persistence - no deprecation warning
try {
  db.enablePersistence({ synchronizeTabs: true }).catch((err) => {
    if (err.code === 'failed-precondition') {
      console.log('Persistence: Multiple tabs open');
    } else if (err.code === 'unimplemented') {
      console.log('Persistence not available in this browser');
    }
  });
} catch (err) {
  console.log('Persistence error:', err.code);
}

// Cache keys
const USER_CACHE_KEY = 'uj_user_cache';
const APP_CACHE_KEY = 'uj_app_cache';
const BIN_CACHE_KEY = 'uj_bin_cache';
const EXPORT_CACHE_KEY = 'uj_export_cache';
const IMPORT_CACHE_KEY = 'uj_import_cache';

// Cache management functions
function cacheUserData(user) {
  if (!user) {
    sessionStorage.removeItem(USER_CACHE_KEY);
    return;
  }
  
  const userData = {
    uid: user.uid,
    email: user.email,
    displayName: user.displayName,
    photoURL: user.photoURL,
    providerId: user.providerData[0]?.providerId || 'password'
  };
  
  sessionStorage.setItem(USER_CACHE_KEY, JSON.stringify(userData));
}

function getCachedUser() {
  const cached = sessionStorage.getItem(USER_CACHE_KEY);
  return cached ? JSON.parse(cached) : null;
}

function updateUIWithUser(userData) {
  const name = userData.displayName || userData.email.split('@')[0] || 'User';
  
  const menuUserName = document.getElementById('menuUserName');
  const headerUserName = document.getElementById('userName');
  const userAvatar = document.getElementById('userAvatar');
  
  if (menuUserName) menuUserName.textContent = name;
  if (headerUserName) headerUserName.textContent = name;
  
  const firstLetter = name.charAt(0).toUpperCase();
  if (userAvatar) {
    userAvatar.textContent = firstLetter;
    userAvatar.style.backgroundColor = getRandomLightColor();
  }
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initializeMenuPage);
} else {
  initializeMenuPage();
}

function initializeMenuPage() {
  
const menuToggle = document.getElementById('menuToggle');
const sideMenu = document.getElementById('sideMenu');
const menuOverlay = document.getElementById('menuOverlay');
const userAvatar = document.getElementById('userAvatar');
const menuUserName = document.getElementById('menuUserName');
const headerUserName = document.getElementById('userName');
const themeToggle = document.getElementById('themeToggle');
const netStatus = document.getElementById('netStatus');

let currentUser = null;
let firebaseConnected = false;
let firebaseConnectionTimer = null;

const currentPage = window.location.pathname.split('/').pop().replace('.html', '') || 'index';

let notificationContainer = document.getElementById('notificationContainer');
if (!notificationContainer) {
  notificationContainer = document.createElement('div');
  notificationContainer.id = 'notificationContainer';
  notificationContainer.className = 'notification-container';
  notificationContainer.style.display = 'none';
  const pageContainer = document.querySelector('.page-container') || document.querySelector('.container');
  if (pageContainer) {
    pageContainer.insertBefore(
      notificationContainer, 
      document.querySelector('header').nextSibling
    );
  }
}

function showNotification(message, type) {
  const container = notificationContainer;
  if (!container) return;
  
  const messageEl = document.createElement('div');
  messageEl.textContent = message;
  messageEl.className = 'notification-message notification-' + type;
  
  container.style.display = 'flex';
  container.insertBefore(messageEl, container.firstChild);
  
  setTimeout(() => {
    messageEl.style.opacity = '0';
    messageEl.style.transform = 'translateY(-20px)';
    setTimeout(() => {
      if (messageEl.parentNode) messageEl.remove();
      if (container.children.length === 0) container.style.display = 'none';
    }, 300);
  }, 2500);
}

function getRandomLightColor() {
  const hue = Math.floor(Math.random() * 360);
  return `hsl(${hue}, 70%, 85%)`;
}

function isValidName(name) {
  const nameWithoutSpaces = name.replace(/\s/g, '');
  if (nameWithoutSpaces.length < 4) return false;
  return /^[a-zA-Z\s]+$/.test(name);
}

if (menuToggle) {
  menuToggle.addEventListener('click', () => {
    sideMenu.classList.add('active');
    menuOverlay.classList.add('active');
    document.body.style.overflow = 'hidden';
  });
}

if (menuOverlay) {
  menuOverlay.addEventListener('click', () => {
    sideMenu.classList.remove('active');
    menuOverlay.classList.remove('active');
    document.body.style.overflow = '';
  });
}

document.querySelectorAll('.menu-item').forEach(item => {
  item.addEventListener('click', () => {
    if (sideMenu) sideMenu.classList.remove('active');
    if (menuOverlay) menuOverlay.classList.remove('active');
    document.body.style.overflow = '';
  });
});

if (themeToggle) {
  const savedTheme = localStorage.getItem('theme');
  if (savedTheme === 'dark') {
    document.body.classList.add('dark');
    themeToggle.querySelector('.theme-icon').textContent = '☀️';
  }
  themeToggle.addEventListener('click', () => {
    document.body.classList.toggle('dark');
    const isDark = document.body.classList.contains('dark');
    themeToggle.querySelector('.theme-icon').textContent = isDark ? '☀️' : '🌙';
    localStorage.setItem('theme', isDark ? 'dark' : 'light');
  });
}

const onlineIcon = `<svg width="40" height="40" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><circle cx="12" cy="12" r="10" stroke="#BFBFBF" stroke-width="1"/><circle cx="12" cy="17" r="1.7" fill="#6BD36B"/><path d="M8.5 14C10.8 12 13.2 12 15.5 14" stroke="#6BD36B" stroke-width="1.6" stroke-linecap="round"/><path d="M7 11C10.5 8 13.5 8 17 11" stroke="#6BD36B" stroke-width="1.6" stroke-linecap="round"/><path d="M5.8 8.5C9.5 5 14.5 5 18.2 8.5" stroke="#6BD36B" stroke-width="1.6" stroke-linecap="round"/></svg>`;

const offlineIcon = `<svg width="40" height="40" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><circle cx="12" cy="12" r="10" stroke="#BFBFBF" stroke-width="1"/><circle cx="12" cy="17" r="1.7" fill="#FF7A7A"/><path d="M8.5 14C10.8 12 13.2 12 15.5 14" stroke="#FF7A7A" stroke-width="1.6" stroke-linecap="round"/><path d="M7 11C10.5 8 13.5 8 17 11" stroke="#FF7A7A" stroke-width="1.6" stroke-linecap="round"/><path d="M5.8 8.5C9.5 5 14.5 5 18.2 8.5" stroke="#FF7A7A" stroke-width="1.6" stroke-linecap="round"/><line x1="6" y1="6" x2="17" y2="17" stroke="#FF7A7A" stroke-width="1.6" stroke-linecap="round"/></svg>`;

function updateNetworkStatus() {
  if (netStatus) netStatus.innerHTML = navigator.onLine ? onlineIcon : offlineIcon;
}

updateNetworkStatus();
window.addEventListener('online', updateNetworkStatus);
window.addEventListener('offline', updateNetworkStatus);

// ACCOUNT PAGE
if (currentPage === 'account') {
  const profileAvatar = document.getElementById('profileAvatar');
  const displayName = document.getElementById('displayName');
  const displayEmail = document.getElementById('displayEmail');
  const loginMethod = document.getElementById('loginMethod');
  const editNameBtn = document.getElementById('editNameBtn');
  const saveNameBtn = document.getElementById('saveNameBtn');
  const cancelNameBtn = document.getElementById('cancelNameBtn');
  const nameError = document.getElementById('nameError');
  const passwordSection = document.getElementById('passwordSection');
  const socialLoginNotice = document.getElementById('socialLoginNotice');
  const changePasswordBtn = document.getElementById('changePasswordBtn');
  const changePasswordForm = document.getElementById('changePasswordForm');
  const savePasswordBtn = document.getElementById('savePasswordBtn');
  const cancelPasswordBtn = document.getElementById('cancelPasswordBtn');
  const oldPassword = document.getElementById('oldPassword');
  const newPassword = document.getElementById('newPassword');
  const confirmPassword = document.getElementById('confirmPassword');
  const passwordError = document.getElementById('passwordError');
  const forgotPasswordLink = document.getElementById('forgotPasswordLink');
  const resetSuccessModal = document.getElementById('resetSuccessModal');
  const closeResetSuccess = document.getElementById('closeResetSuccess');

  let originalDisplayName = '';
  let isEmailPasswordUser = false;

  if (editNameBtn) {
    editNameBtn.addEventListener('click', () => {
      displayName.readOnly = false;
      displayName.focus();
      displayName.select();
      editNameBtn.style.display = 'none';
      saveNameBtn.style.display = 'inline-flex';
      cancelNameBtn.style.display = 'inline-flex';
      originalDisplayName = displayName.value;
      nameError.textContent = '';
    });
  }

  if (cancelNameBtn) {
    cancelNameBtn.addEventListener('click', () => {
      displayName.value = originalDisplayName;
      displayName.readOnly = true;
      editNameBtn.style.display = 'inline-flex';
      saveNameBtn.style.display = 'none';
      cancelNameBtn.style.display = 'none';
      nameError.textContent = '';
    });
  }

  if (saveNameBtn) {
    saveNameBtn.addEventListener('click', async () => {
      const newName = displayName.value.trim();
      
      if (!newName) {
        nameError.textContent = 'Name cannot be empty';
        return;
      }
      
      if (!isValidName(newName)) {
        nameError.textContent = 'Name must have at least 4 letters and no numbers';
        return;
      }
      
      try {
        await currentUser.updateProfile({ displayName: newName });
        
        if (menuUserName) menuUserName.textContent = newName;
        if (headerUserName) headerUserName.textContent = newName;
        const firstLetter = newName.charAt(0).toUpperCase();
        if (userAvatar) userAvatar.textContent = firstLetter;
        if (profileAvatar) profileAvatar.textContent = firstLetter;
        
        displayName.readOnly = true;
        editNameBtn.style.display = 'inline-flex';
        saveNameBtn.style.display = 'none';
        cancelNameBtn.style.display = 'none';
        showNotification('Name updated successfully!', 'success');
        nameError.textContent = '';
      } catch (error) {
        nameError.textContent = 'Failed to update name. Please try again.';
      }
    });
  }

  if (changePasswordBtn) {
    changePasswordBtn.addEventListener('click', () => {
      changePasswordForm.style.display = 'block';
      changePasswordBtn.style.display = 'none';
      passwordError.textContent = '';
      oldPassword.value = '';
      newPassword.value = '';
      confirmPassword.value = '';
    });
  }

  if (cancelPasswordBtn) {
    cancelPasswordBtn.addEventListener('click', () => {
      changePasswordForm.style.display = 'none';
      changePasswordBtn.style.display = 'block';
      passwordError.textContent = '';
      oldPassword.value = '';
      newPassword.value = '';
      confirmPassword.value = '';
    });
  }

  if (savePasswordBtn) {
    savePasswordBtn.addEventListener('click', async () => {
      const old = oldPassword.value;
      const newPass = newPassword.value;
      const confirm = confirmPassword.value;
      
      if (!old || !newPass || !confirm) {
        passwordError.textContent = 'All fields are required';
        return;
      }
      
      if (newPass.length < 8) {
        passwordError.textContent = 'Password must be at least 8 characters';
        return;
      }
      
      if (newPass !== confirm) {
        passwordError.textContent = 'New passwords do not match';
        return;
      }
      
      try {
        const credential = firebase.auth.EmailAuthProvider.credential(currentUser.email, old);
        await currentUser.reauthenticateWithCredential(credential);
        await currentUser.updatePassword(newPass);
        
        changePasswordForm.style.display = 'none';
        changePasswordBtn.style.display = 'block';
        showNotification('Password updated successfully!', 'success');
        passwordError.textContent = '';
        oldPassword.value = '';
        newPassword.value = '';
        confirmPassword.value = '';
      } catch (error) {
        if (error.code === 'auth/wrong-password') {
          passwordError.textContent = 'Current password is incorrect';
        } else {
          passwordError.textContent = 'Failed to update password';
        }
      }
    });
  }

  if (forgotPasswordLink) {
    forgotPasswordLink.addEventListener('click', async (e) => {
      e.preventDefault();
      
      if (!currentUser || !currentUser.email) {
        showNotification('Unable to send reset email', 'error');
        return;
      }
      
      try {
        await auth.sendPasswordResetEmail(currentUser.email);
        if (resetSuccessModal) resetSuccessModal.style.display = 'flex';
      } catch (error) {
        showNotification('Failed to send reset email', 'error');
      }
    });
  }

  if (closeResetSuccess) {
    closeResetSuccess.addEventListener('click', () => {
      if (resetSuccessModal) resetSuccessModal.style.display = 'none';
    });
  }
  
  // Sign Out Button
	const signOutBtn = document.getElementById('signOutBtn');
	const logoutModal = document.getElementById('logoutModal');
	const confirmLogout = document.getElementById('confirmLogout');
	const cancelLogout = document.getElementById('cancelLogout');

	if (signOutBtn && logoutModal) {
	  // 1. Open Modal when Sign Out is clicked
	  signOutBtn.addEventListener('click', () => {
		logoutModal.style.display = 'flex';
	  });

	  // 2. Close Modal only when 'No' is clicked
	  if (cancelLogout) {
		cancelLogout.addEventListener('click', () => {
		  logoutModal.style.display = 'none';
		});
	  }

	  // 3. Handle 'Yes' for actual logout and cache cleanup
	  if (confirmLogout) {
		confirmLogout.addEventListener('click', async () => {
		  try {
			// Clear all session and local caches
			sessionStorage.removeItem(USER_CACHE_KEY);
			localStorage.removeItem(APP_CACHE_KEY);
			localStorage.removeItem(BIN_CACHE_KEY);
			localStorage.removeItem(EXPORT_CACHE_KEY);
			
			// Sign out from Firebase
			await auth.signOut();
			
			// Redirect to login
			window.location.href = 'login.html';
		  } catch (error) {
			console.error('Sign out error:', error);
			showNotification('Failed to sign out. Please try again.', 'error');
			logoutModal.style.display = 'none';
		  }
		});
	  }
	}

  auth.onAuthStateChanged((user) => {
    if (!user) {
      window.location.href = 'login.html';
      return;
    }
    
    currentUser = user;
    cacheUserData(user);
    
    const providerId = user.providerData[0]?.providerId || 'password';
    isEmailPasswordUser = providerId === 'password';
    
    const name = user.displayName || user.email.split('@')[0] || 'User';
    if (displayName) displayName.value = name;
    originalDisplayName = name;
    if (displayEmail) displayEmail.textContent = user.email;
    if (menuUserName) menuUserName.textContent = name;
    if (headerUserName) headerUserName.textContent = name;
    
    const firstLetter = name.charAt(0).toUpperCase();
    if (userAvatar) userAvatar.textContent = firstLetter;
    if (profileAvatar) profileAvatar.textContent = firstLetter;
    const avatarColor = getRandomLightColor();
    if (userAvatar) userAvatar.style.backgroundColor = avatarColor;
    if (profileAvatar) profileAvatar.style.backgroundColor = avatarColor;
    
    if (isEmailPasswordUser) {
      if (loginMethod) loginMethod.textContent = 'Email/Password';
      if (passwordSection) passwordSection.style.display = 'block';
      if (socialLoginNotice) socialLoginNotice.style.display = 'none';
    } else {
      const providerName = providerId === 'google.com' ? 'Google' : providerId === 'apple.com' ? 'Apple' : 'Social Login';
      if (loginMethod) loginMethod.textContent = providerName;
      if (passwordSection) passwordSection.style.display = 'none';
      if (socialLoginNotice) socialLoginNotice.style.display = 'block';
      const provider1 = document.getElementById('socialProvider');
      const provider2 = document.getElementById('socialProvider2');
      if (provider1) provider1.textContent = providerName;
      if (provider2) provider2.textContent = providerName;
    }
  });
}

// BIN PAGE
if (currentPage === 'bin') {
  const binList = document.getElementById('binList');
  const restoreModal = document.getElementById('restoreModal');
  const confirmRestore = document.getElementById('confirmRestore');
  const cancelRestore = document.getElementById('cancelRestore');
  
  let restoreTargetId = null;
  let binItems = [];

  function loadBinFromCache() {
    const cached = localStorage.getItem(BIN_CACHE_KEY);
    if (cached) {
      try {
        const data = JSON.parse(cached);
        binItems = data.items || [];
        renderBinItems();
        return true;
      } catch (error) {
        console.error('Cache parse error:', error);
      }
    }
    return false;
  }

  function cacheBinData() {
    localStorage.setItem(BIN_CACHE_KEY, JSON.stringify({
      items: binItems,
      timestamp: Date.now()
    }));
  }

  function calculateRemainingDays(deletedAt) {
    const now = new Date();
    const deletionDate = deletedAt.toDate ? deletedAt.toDate() : new Date(deletedAt);
    const expiryDate = new Date(deletionDate);
    expiryDate.setDate(expiryDate.getDate() + 90);
    
    const diffTime = expiryDate - now;
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    
    return Math.max(0, diffDays);
  }

  function renderBinItems() {
    if (binItems.length === 0) {
      binList.innerHTML = `<div style="text-align:center; padding:40px 20px; color:#6b7280;"><p style="font-size:1.1rem; margin-bottom:8px;">Bin is empty</p><p style="font-size:0.9rem;">Deleted authenticators will appear here</p></div>`;
      return;
    }

    binList.innerHTML = '';
    binItems.forEach(item => {
      const remainingDays = calculateRemainingDays(item.deletedAt);
      
      if (remainingDays === 0) {
        if (navigator.onLine && firebaseConnected) {
          db.collection('deleted_authenticators').doc(item.id).delete();
        }
        return;
      }

      const card = document.createElement('div');
      card.className = 'bin-card';
      const accountNameHtml = item.accountName ? `<div class="bin-card-account">${item.accountName}</div>` : '';
      card.innerHTML = `<div class="bin-card-content"><div class="bin-card-provider">${item.providerName}</div>${accountNameHtml}</div><div class="bin-card-actions"><div class="bin-days-remaining">${remainingDays}d</div><button class="bin-restore-btn" data-id="${item.id}"><svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="23 4 23 10 17 10"></polyline><path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10"></path></svg></button></div>`;
      binList.appendChild(card);
    });

    document.querySelectorAll('.bin-restore-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        restoreTargetId = btn.getAttribute('data-id');
        restoreModal.style.display = 'block';
      });
    });
  }

  async function loadBinItemsFromFirebase() {
    if (!currentUser) return;

    try {
      const snapshot = await db.collection('deleted_authenticators').where('uid', '==', currentUser.uid).orderBy('deletedAt', 'desc').get();
      binItems = [];
      snapshot.forEach(doc => {
        binItems.push({ id: doc.id, ...doc.data() });
      });
      renderBinItems();
      cacheBinData();
    } catch (error) {
      console.error('Error loading bin items:', error);
    }
  }

  if (confirmRestore) {
    confirmRestore.addEventListener('click', async () => {
      if (!restoreTargetId) return;

      try {
        const docRef = db.collection('deleted_authenticators').doc(restoreTargetId);
        const doc = await docRef.get();
        
        if (!doc.exists) {
          showNotification('Item not found', 'error');
          restoreModal.style.display = 'none';
          return;
        }

        const data = doc.data();
        await db.collection('authenticators').add({
          uid: data.uid,
          providerName: data.providerName,
          accountName: data.accountName || '',
          secretCode: data.secretCode,
          createdAt: firebase.firestore.FieldValue.serverTimestamp()
        });

        await docRef.delete();
        binItems = binItems.filter(item => item.id !== restoreTargetId);
        renderBinItems();
        cacheBinData();

        showNotification('Authenticator restored successfully!', 'success');
        restoreModal.style.display = 'none';
        restoreTargetId = null;
      } catch (error) {
        console.error('Error restoring item:', error);
        showNotification('Failed to restore authenticator', 'error');
      }
    });
  }

  if (cancelRestore) {
    cancelRestore.addEventListener('click', () => {
      restoreModal.style.display = 'none';
      restoreTargetId = null;
    });
  }

  // Load from cache first
  loadBinFromCache();

  auth.onAuthStateChanged((user) => {
    if (!user) {
      window.location.href = 'login.html';
      return;
    }
    
    currentUser = user;
    const name = user.displayName || user.email.split('@')[0] || 'User';
    if (menuUserName) menuUserName.textContent = name;
    if (headerUserName) headerUserName.textContent = name;
    
    const firstLetter = name.charAt(0).toUpperCase();
    if (userAvatar) {
      userAvatar.textContent = firstLetter;
      userAvatar.style.backgroundColor = getRandomLightColor();
    }
    
    // Delayed Firebase sync
    setTimeout(() => {
      if (navigator.onLine) {
        firebaseConnected = true;
        loadBinItemsFromFirebase();
      }
    }, 1500);
  });
}

// IMPORT PAGE - WITH GOOGLE AUTHENTICATOR MIGRATION SUPPORT
if (currentPage === 'import') {
  const scanImportBtn = document.getElementById('scanImportBtn');
  const stopScanBtn = document.getElementById('stopScanBtn');
  const importScanModal = document.getElementById('importScanModal');
  const videoElement = document.getElementById('importVideoElement');
  const canvasElement = document.getElementById('importCanvasElement');
  const scanOverlay = document.getElementById('importScanOverlay');
  const importScanError = document.getElementById('importScanError');
  
  let scanActive = false;
  let cameraStream = null;
  let scanInterval = null;
  let lastErrorTime = 0;

  function showImportError(message) {
    const now = Date.now();
    if (now - lastErrorTime < 3000) return;
    lastErrorTime = now;
    
    if (importScanError) {
      importScanError.textContent = message;
      importScanError.style.display = 'block';
      
      setTimeout(() => {
        importScanError.textContent = '';
        importScanError.style.display = 'none';
      }, 3000);
    }
  }

  if (scanImportBtn) {
    scanImportBtn.addEventListener('click', async () => {
      if (typeof jsQR === 'undefined') {
        showNotification('QR scanner library not loaded. Please refresh the page.', 'error');
        return;
      }

      importScanModal.style.display = 'flex';
      
      try {
        cameraStream = await navigator.mediaDevices.getUserMedia({ 
          video: { facingMode: 'environment' } 
        });
        videoElement.srcObject = cameraStream;
        videoElement.style.display = 'block';
        scanOverlay.style.display = 'block';
        scanActive = true;
        scanInterval = setInterval(scanQRCode, 300);
      } catch (error) {
        console.error('Camera error:', error);
        showImportError('Camera access denied');
        setTimeout(() => {
          importScanModal.style.display = 'none';
        }, 2000);
      }
    });
  }

  if (stopScanBtn) {
    stopScanBtn.addEventListener('click', () => {
      stopCamera();
      importScanModal.style.display = 'none';
    });
  }

  if (importScanModal) {
    importScanModal.addEventListener('click', (e) => {
      if (e.target === importScanModal) {
        stopCamera();
        importScanModal.style.display = 'none';
      }
    });
  }

  function scanQRCode() {
    if (!scanActive || !videoElement.videoWidth) return;
    
    try {
      canvasElement.width = videoElement.videoWidth;
      canvasElement.height = videoElement.videoHeight;
      const ctx = canvasElement.getContext('2d');
      ctx.drawImage(videoElement, 0, 0, canvasElement.width, canvasElement.height);
      const imageData = ctx.getImageData(0, 0, canvasElement.width, canvasElement.height);
      const code = jsQR(imageData.data, imageData.width, imageData.height);
      
      if (code && code.data) {
        processImportQR(code.data);
      }
    } catch (error) {
      console.error('Scan error:', error);
    }
  }

  async function processImportQR(data) {
    try {
      console.log('QR data received:', data.substring(0, 100));
      
      // 1. Try parsing as JSON (our export format)
      if (data.startsWith('{') || data.startsWith('[')) {
        const importData = JSON.parse(data);
        
        if (importData.authenticators && Array.isArray(importData.authenticators)) {
          stopCamera();
          importScanModal.style.display = 'none';

          let successCount = 0;
          for (const auth of importData.authenticators) {
            try {
              await db.collection('authenticators').add({
                uid: currentUser.uid,
                providerName: auth.providerName || 'Unknown',
                accountName: auth.accountName || '',
                secretCode: auth.secretCode,
                pinned: false,
                pinnedAt: null,
                pinnedOrder: null,
                createdAt: firebase.firestore.FieldValue.serverTimestamp()
              });
              successCount++;
            } catch (error) {
              console.error('Error importing:', error);
            }
          }

          showNotification(`Successfully imported ${successCount} authenticator(s)!`, 'success');
          setTimeout(() => {
            window.location.href = 'index.html';
          }, 1500);
          return;
        }
      }
      
      // 2. Try parsing as TOTP URI
      if (data.startsWith('otpauth://')) {
        const parsedAuth = parseOTPAuthURI(data);
        
        if (!parsedAuth) {
          showImportError('Invalid TOTP QR code');
          return;
        }

        stopCamera();
        importScanModal.style.display = 'none';

        try {
          await db.collection('authenticators').add({
            uid: currentUser.uid,
            providerName: parsedAuth.issuer || parsedAuth.accountName || 'Unknown',
            accountName: parsedAuth.accountName || '',
            secretCode: parsedAuth.secret,
            pinned: false,
            pinnedAt: null,
            pinnedOrder: null,
            createdAt: firebase.firestore.FieldValue.serverTimestamp()
          });

          showNotification('Successfully imported authenticator!', 'success');
          setTimeout(() => {
            window.location.href = 'index.html';
          }, 1500);
        } catch (error) {
          console.error('Error importing TOTP:', error);
          showImportError('Failed to save authenticator');
        }
        return;
      }
      
      // 3. Try Google Authenticator migration format
      if (data.startsWith('otpauth-migration://offline?data=')) {
        try {
          const migrationData = parseGoogleAuthMigration(data);
          
          if (!migrationData || migrationData.length === 0) {
            showImportError('Failed to parse migration data');
            return;
          }

          stopCamera();
          importScanModal.style.display = 'none';

          let successCount = 0;
          for (const auth of migrationData) {
            try {
              await db.collection('authenticators').add({
                uid: currentUser.uid,
                providerName: auth.issuer || auth.name || 'Unknown',
                accountName: auth.name || '',
                secretCode: auth.secret,
                pinned: false,
                pinnedAt: null,
                pinnedOrder: null,
                createdAt: firebase.firestore.FieldValue.serverTimestamp()
              });
              successCount++;
            } catch (error) {
              console.error('Error importing from migration:', error);
            }
          }

          showNotification(`Successfully imported ${successCount} authenticator(s)!`, 'success');
          setTimeout(() => {
            window.location.href = 'index.html';
          }, 1500);
          return;
        } catch (error) {
          console.error('Migration parsing error:', error);
          showImportError('Failed to parse Google Authenticator export');
          return;
        }
      }
      
      showImportError('Unsupported QR code format');
    } catch (error) {
      console.error('Error processing QR:', error);
      showImportError('Failed to process QR code');
    }
  }

  function parseOTPAuthURI(uri) {
    try {
      const url = new URL(uri);
      
      if (url.protocol !== 'otpauth:') return null;
      if (url.host !== 'totp' && url.host !== 'hotp') return null;
      
      const pathParts = decodeURIComponent(url.pathname.substring(1)).split(':');
      const params = new URLSearchParams(url.search);
      const secret = params.get('secret');
      
      if (!secret) return null;
      
      let issuer = params.get('issuer') || '';
      let accountName = '';
      
      if (pathParts.length === 2) {
        issuer = issuer || pathParts[0];
        accountName = pathParts[1];
      } else if (pathParts.length === 1) {
        accountName = pathParts[0];
      }
      
      return {
        secret: secret.toUpperCase().replace(/\s/g, ''),
        issuer: issuer,
        accountName: accountName
      };
    } catch (error) {
      console.error('Error parsing OTP URI:', error);
      return null;
    }
  }

  function parseGoogleAuthMigration(uri) {
	  try {
		const url = new URL(uri);
		const dataParam = url.searchParams.get('data');
		
		if (!dataParam) {
		  console.error('No data parameter found');
		  return null;
		}
		
		// Decode base64
		const binaryString = atob(dataParam);
		const bytes = new Uint8Array(binaryString.length);
		for (let i = 0; i < binaryString.length; i++) {
		  bytes[i] = binaryString.charCodeAt(i);
		}
		
		console.log('📦 Decoded bytes length:', bytes.length);
		console.log('📦 First 20 bytes:', Array.from(bytes.slice(0, 20)).map(b => '0x' + b.toString(16).padStart(2, '0')).join(' '));
		
		const result = [];
		let i = 0;
		let accountIndex = 0;
		
		// Read varint helper
		function readVarint() {
		  let value = 0;
		  let shift = 0;
		  while (i < bytes.length) {
			const byte = bytes[i++];
			value |= (byte & 0x7f) << shift;
			if (!(byte & 0x80)) break;
			shift += 7;
		  }
		  return value;
		}
		
		// Read length-delimited field
		function readLengthDelimited() {
		  const length = readVarint();
		  const data = bytes.slice(i, i + length);
		  i += length;
		  return data;
		}
		
		while (i < bytes.length) {
		  if (i >= bytes.length) break;
		  
		  const fieldTag = bytes[i++];
		  const fieldNumber = fieldTag >> 3;
		  const wireType = fieldTag & 0x07;
		  
		  console.log(`\n🔍 Position ${i-1}: Field ${fieldNumber}, Wire type ${wireType}`);
		  
		  if (fieldNumber === 1 && wireType === 2) { // OtpParameters message
			accountIndex++;
			console.log(`\n🎯 ===== ACCOUNT #${accountIndex} =====`);
			
			const messageData = readLengthDelimited();
			console.log('📋 Account message length:', messageData.length);
			
			// Parse the OtpParameters message
			let secret = '';
			let name = '';
			let issuer = '';
			let j = 0;
			
			while (j < messageData.length) {
			  const tag = messageData[j++];
			  const field = tag >> 3;
			  const wire = tag & 0x07;
			  
			  console.log(`  └─ Field ${field}, Wire ${wire} at position ${j-1}`);
			  
			  if (field === 1 && wire === 2) { // secret (bytes)
				let len = messageData[j++];
				if (len & 0x80) {
				  len = ((len & 0x7f) | (messageData[j++] << 7));
				}
				const secretBytes = messageData.slice(j, j + len);
				secret = base32Encode(secretBytes);
				console.log('     🔑 Secret length:', len, 'bytes ->', secret.substring(0, 10) + '...');
				j += len;
			  } else if (field === 2 && wire === 2) { // name (string)
				let len = messageData[j++];
				if (len & 0x80) {
				  len = ((len & 0x7f) | (messageData[j++] << 7));
				}
				name = String.fromCharCode(...messageData.slice(j, j + len));
				console.log('     👤 Name:', name);
				j += len;
			  } else if (field === 3 && wire === 2) { // issuer (string)
				let len = messageData[j++];
				if (len & 0x80) {
				  len = ((len & 0x7f) | (messageData[j++] << 7));
				}
				issuer = String.fromCharCode(...messageData.slice(j, j + len));
				console.log('     🏢 Issuer:', issuer);
				j += len;
			  } else if (wire === 0) { // varint
				let val = messageData[j++];
				while (val & 0x80 && j < messageData.length) {
				  val = messageData[j++];
				}
				console.log('     ⏭️  Skipped varint field', field);
			  } else if (wire === 2) { // length-delimited
				let len = messageData[j++];
				if (len & 0x80) {
				  len = ((len & 0x7f) | (messageData[j++] << 7));
				}
				j += len;
				console.log('     ⏭️  Skipped length-delimited field', field, 'length', len);
			  } else {
				console.warn('     ⚠️  Unknown wire type', wire, 'for field', field);
				j++;
			  }
			}
			
			if (secret) {
			  result.push({ secret, name, issuer });
			  console.log('✅ Account parsed successfully:', issuer || name);
			} else {
			  console.warn('❌ Account skipped - no secret found');
			}
		  } else if (wireType === 0) { // varint
			readVarint();
			console.log('⏭️  Skipped varint at top level');
		  } else if (wireType === 2) { // length-delimited
			const data = readLengthDelimited();
			console.log('⏭️  Skipped length-delimited at top level, length:', data.length);
		  } else {
			console.warn('⚠️  Unknown wire type at top level:', wireType);
			i++;
		  }
		}
		
		console.log('\n📊 FINAL RESULT: Parsed', result.length, 'accounts');
		result.forEach((acc, idx) => {
		  console.log(`  ${idx + 1}. ${acc.issuer || acc.name} - secret: ${acc.secret.substring(0, 10)}...`);
		});
		
		return result;
	  } catch (error) {
		console.error('❌ Google Auth migration parse error:', error);
		console.error('Stack:', error.stack);
		return null;
	  }
	}

  function base32Encode(bytes) {
    const alphabet = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567';
    let bits = 0;
    let value = 0;
    let output = '';
    
    for (let i = 0; i < bytes.length; i++) {
      value = (value << 8) | bytes[i];
      bits += 8;
      
      while (bits >= 5) {
        output += alphabet[(value >>> (bits - 5)) & 31];
        bits -= 5;
      }
    }
    
    if (bits > 0) {
      output += alphabet[(value << (5 - bits)) & 31];
    }
    
    return output;
  }

  function stopCamera() {
    if (scanInterval) {
      clearInterval(scanInterval);
      scanInterval = null;
    }
    if (cameraStream) {
      cameraStream.getTracks().forEach(track => track.stop());
      cameraStream = null;
    }
    if (videoElement) {
      videoElement.style.display = 'none';
      videoElement.srcObject = null;
    }
    if (scanOverlay) scanOverlay.style.display = 'none';
    scanActive = false;
    if (importScanError) {
      importScanError.textContent = '';
      importScanError.style.display = 'none';
    }
  }

  auth.onAuthStateChanged((user) => {
    if (!user) {
      window.location.href = 'login.html';
      return;
    }
    
    currentUser = user;
    const name = user.displayName || user.email.split('@')[0] || 'User';
    if (menuUserName) menuUserName.textContent = name;
    if (headerUserName) headerUserName.textContent = name;
    
    const firstLetter = name.charAt(0).toUpperCase();
    if (userAvatar) {
      userAvatar.textContent = firstLetter;
      userAvatar.style.backgroundColor = getRandomLightColor();
    }
  });
}

// EXPORT PAGE - FIXED
if (currentPage === 'export') {
  const exportList = document.getElementById('exportList');
  const exportBtn = document.getElementById('exportBtn');
  const exportQRContainer = document.getElementById('exportQRContainer');
  const qrCodeCanvas = document.getElementById('qrCodeCanvas');
  const downloadQRBtn = document.getElementById('downloadQRBtn');
  
  let authenticators = [];

  function loadExportFromCache() {
    const cached = localStorage.getItem(EXPORT_CACHE_KEY);
    if (cached) {
      try {
        const data = JSON.parse(cached);
        authenticators = data.authenticators || [];
        renderExportList();
        return true;
      } catch (error) {
        console.error('Cache parse error:', error);
      }
    }
    return false;
  }

  function cacheExportData() {
    localStorage.setItem(EXPORT_CACHE_KEY, JSON.stringify({
      authenticators: authenticators,
      timestamp: Date.now()
    }));
  }

  async function loadAuthenticatorsFromFirebase() {
    if (!currentUser) return;

    try {
      const snapshot = await db.collection('authenticators').where('uid', '==', currentUser.uid).orderBy('createdAt', 'desc').get();
      authenticators = [];
      snapshot.forEach(doc => {
        authenticators.push({ id: doc.id, ...doc.data() });
      });
      renderExportList();
      cacheExportData();
    } catch (error) {
      console.error('Error loading authenticators:', error);
    }
  }

  function renderExportList() {
    const selectAllContainer = document.getElementById('selectAllContainer');
    const selectAllCheckbox = document.getElementById('selectAllCheckbox');

    if (authenticators.length === 0) {
        exportList.innerHTML = `<div style="text-align:center; padding:40px 20px; color:#6b7280;"><p style="font-size:1.1rem; margin-bottom:8px;">No authenticators to export</p></div>`;
        if (exportBtn) exportBtn.disabled = true;
        if (selectAllContainer) selectAllContainer.style.display = 'none';
        return;
    }

    // Show "Select All" and reset its state
    if (selectAllContainer) selectAllContainer.style.display = 'flex';
    if (selectAllCheckbox) selectAllCheckbox.checked = true;

    exportList.innerHTML = '';
    authenticators.forEach(auth => {
        const item = document.createElement('div');
        item.className = 'export-item';
        const accountNameHtml = auth.accountName ? `<div class="export-item-account">${auth.accountName}</div>` : '';
        item.innerHTML = `
            <div class="export-item-info">
                <div class="export-item-provider">${auth.providerName}</div>
                ${accountNameHtml}
            </div>
            <label class="export-checkbox-wrapper">
                <input type="checkbox" class="export-checkbox" data-id="${auth.id}" checked>
                <span class="export-checkmark"></span>
            </label>`;
        exportList.appendChild(item);
    });

    if (exportBtn) exportBtn.disabled = false;

    // --- LOGIC: Select All / Deselect All ---
    if (selectAllCheckbox) {
        selectAllCheckbox.onclick = () => {
            const checkboxes = document.querySelectorAll('.export-checkbox');
            checkboxes.forEach(cb => cb.checked = selectAllCheckbox.checked);
        };
    }

    // If any item is unchecked, the "Select All" box must also uncheck
    document.querySelectorAll('.export-list .export-checkbox').forEach(cb => {
        cb.onchange = () => {
            const allChecked = document.querySelectorAll('.export-list .export-checkbox:checked').length;
            const total = document.querySelectorAll('.export-list .export-checkbox').length;
            if (selectAllCheckbox) {
                selectAllCheckbox.checked = (allChecked === total);
            }
        };
    });
}

  if (exportBtn) {
    exportBtn.addEventListener('click', () => {
      // Check if qrcode-generator library loaded
      if (typeof qrcode === 'undefined') {
        showNotification('QR library not loaded. Please refresh the page.', 'error');
        console.error('qrcode-generator library not found in export.html');
        return;
      }

      const checkedBoxes = document.querySelectorAll('.export-checkbox:checked');
      const selectedIds = Array.from(checkedBoxes).map(cb => cb.getAttribute('data-id'));
	  
	  // MAX 6 VALIDATION
    if (checkedBoxes.length > 6) {
        showNotification('Maximum 6 authenticator can be exported at a time! Try Again.', 'error');
        return;
    }
    
    if (checkedBoxes.length === 0) {
        showNotification('Please select at least one authenticator', 'error');
        return;
    }
      
      if (selectedIds.length === 0) {
        showNotification('Please select at least one authenticator', 'error');
        return;
      }

      const selectedAuths = authenticators.filter(auth => selectedIds.includes(auth.id)).map(auth => ({
        providerName: auth.providerName,
        accountName: auth.accountName || '',
        secretCode: auth.secretCode
      }));

      const exportData = {
        version: '1.0',
        authenticators: selectedAuths
      };

  try {
	  function base32ToBytes(base32) {
		const alphabet = "ABCDEFGHIJKLMNOPQRSTUVWXYZ234567";
		let bits = 0, value = 0;
		const output = [];
		base32 = base32.replace(/=+$/, "").toUpperCase();
		for (let i = 0; i < base32.length; i++) {
		  const idx = alphabet.indexOf(base32[i]);
		  const val = alphabet.indexOf(base32[i]);
		  if (val === -1) continue;
		  value = (value << 5) | val;
		  bits += 5;
		  if (bits >= 8) {
			output.push((value >>> (bits - 8)) & 255);
			bits -= 8;
		  }
		}
		return new Uint8Array(output);
	  }

	  /**
	   * Helper: Encode Varint (Protobuf requirement)
	   */
	  function encodeVarint(value) {
		const bytes = [];
		while (value > 127) {
		  bytes.push((value & 0x7f) | 0x80);
		  value >>>= 7;
		}
		bytes.push(value);
		return bytes;
	  }

	  /**
	   * Helper: Build Protobuf Message
	   */
	  function buildMessage(tag, type, data) {
		const head = encodeVarint((tag << 3) | type);
		if (type === 2) { // Length-delimited (string, bytes, sub-message)
		  const len = encodeVarint(data.length);
		  return [...head, ...len, ...data];
		}
		if (type === 0) { // Varint (int32, bool, enum)
		  return [...head, ...encodeVarint(data)];
		}
		return [];
	  }

	  let migrationPayload = [];

	  // Step 1: Wrap each authenticator in an OtpParameters message (Tag 1)
	  selectedAuths.forEach(auth => {
		let otpParams = [];
		const secretBytes = base32ToBytes(auth.secretCode);
		const nameBytes = new TextEncoder().encode(auth.accountName || "");
		const issuerBytes = new TextEncoder().encode(auth.providerName || "");

		// Field 1: Secret (bytes)
		otpParams.push(...buildMessage(1, 2, secretBytes));
		// Field 2: Name (string)
		otpParams.push(...buildMessage(2, 2, nameBytes));
		// Field 3: Issuer (string)
		otpParams.push(...buildMessage(3, 2, issuerBytes));
		// Field 4: Algorithm (SHA1 = 1)
		otpParams.push(...buildMessage(4, 0, 1));
		// Field 5: Digits (6 digits = 1)
		otpParams.push(...buildMessage(5, 0, 1));
		// Field 6: Type (TOTP = 2)
		otpParams.push(...buildMessage(6, 0, 2));

		// Add this authenticator to the payload as Field 1 (Repeated)
		migrationPayload.push(...buildMessage(1, 2, new Uint8Array(otpParams)));
	  });

	  // Step 2: Global Migration Metadata
	  migrationPayload.push(...buildMessage(2, 0, 1)); // Version
	  migrationPayload.push(...buildMessage(3, 0, 1)); // Batch Size
	  migrationPayload.push(...buildMessage(4, 0, 0)); // Batch Index
	  migrationPayload.push(...buildMessage(5, 0, 12345)); // Batch ID

	  // Step 3: Convert to Base64
	  const uint8 = new Uint8Array(migrationPayload);
	  let binaryString = "";
	  for (let i = 0; i < uint8.length; i++) {
		binaryString += String.fromCharCode(uint8[i]);
	  }
	  
	  // Use btoa and ensure it's URI encoded for the 'data' parameter
	  const base64Data = btoa(binaryString);
	  const finalURI = `otpauth-migration://offline?data=${encodeURIComponent(base64Data)}`;

	  // Step 4: Generate QR with higher error correction (M or Q)
	  qrCodeCanvas.innerHTML = ''; 
	  const qr = qrcode(0, 'M');
	  qr.addData(finalURI);
	  qr.make();

	  const size = qr.getModuleCount();
	  const cellSize = 6; // Larger cell size for better scanning
	  const margin = 20;
	  qrCodeCanvas.width = size * cellSize + margin * 2;
	  qrCodeCanvas.height = size * cellSize + margin * 2;
	  
	  qrCodeCanvas.style.width = '100%'; 
	  qrCodeCanvas.style.maxWidth = '380px';

	  const ctx = qrCodeCanvas.getContext("2d");
	  ctx.fillStyle = "#FFFFFF";
	  ctx.fillRect(0, 0, qrCodeCanvas.width, qrCodeCanvas.height);
	  ctx.fillStyle = "#000000";
	  
	  for (let row = 0; row < size; row++) {
		for (let col = 0; col < size; col++) {
		  if (qr.isDark(row, col)) {
			ctx.fillRect(col * cellSize + margin, row * cellSize + margin, cellSize, cellSize);
		  }
		}
	  }

	  exportQRContainer.style.display = "block";
	  showNotification(`Generated migration QR for ${selectedAuths.length} accounts`, "success");
	  
	// SCROLL TO BOTTOM LOGIC
	exportQRContainer.scrollIntoView({
		behavior: 'smooth',
		block: 'center'
	});

	} catch (error) {
	  console.error("Export Error:", error);
	  showNotification("Failed to generate code", "error");
	}	
    });
  }

	if (downloadQRBtn) {
	  downloadQRBtn.addEventListener('click', () => {
		try {
		  const qrCanvas = document.getElementById('qrCodeCanvas');
		  if (!qrCanvas) {
			showNotification('No QR code found to download', 'error');
			return;
		  }

		  // 1. Set a Minimum Width to prevent text overflow
		  const minWidth = 450; 
		  const padding = 40;
		  
		  // The image width will be at least 450px or the QR width + padding
		  const wrapperWidth = Math.max(minWidth, qrCanvas.width + (padding * 2));
		  
		  const textSpaceTop = 120;
		  const textSpaceBottom = 60;
		  const wrapperHeight = qrCanvas.height + textSpaceTop + textSpaceBottom;

		  const tempCanvas = document.createElement('canvas');
		  const ctx = tempCanvas.getContext('2d');
		  tempCanvas.width = wrapperWidth;
		  tempCanvas.height = wrapperHeight;

		  // 2. Background
		  ctx.fillStyle = '#FFFFFF';
		  ctx.fillRect(0, 0, wrapperWidth, wrapperHeight);

		  // 3. Add Text at Top (Centered to the Wrapper)
		  ctx.fillStyle = '#1f2937';
		  ctx.textAlign = 'center';
		  
		  ctx.font = 'bold 24px Arial';
		  ctx.fillText('Scan the QR', wrapperWidth / 2, 50);

		  ctx.font = '16px Arial';
		  const subText = 'Download UnderJoy Authenticator app and scan';
		  const subText2 = 'the QR to add the authenticators';
		  ctx.fillText(subText, wrapperWidth / 2, 85);
		  ctx.fillText(subText2, wrapperWidth / 2, 105);

		  // 4. Draw QR centered in the wrapper
		  // Calculate X to center the QR: (Total Width - QR Width) / 2
		  const qrX = (wrapperWidth - qrCanvas.width) / 2;
		  ctx.drawImage(qrCanvas, qrX, textSpaceTop);

		  // 5. Download
		  const filename = `UnderJoy_Export_${Date.now()}.png`;
		  const link = document.createElement('a');
		  link.download = filename;
		  link.href = tempCanvas.toDataURL('image/png');
		  link.click();

		  showNotification('Enhanced QR downloaded!', 'success');
		} catch (error) {
		  console.error('Download error:', error);
		  showNotification('Failed to generate image', 'error');
		}
	  });
	}

  loadExportFromCache();

  auth.onAuthStateChanged((user) => {
    if (!user) {
      window.location.href = 'login.html';
      return;
    }
    
    currentUser = user;
    const name = user.displayName || user.email.split('@')[0] || 'User';
    if (menuUserName) menuUserName.textContent = name;
    if (headerUserName) headerUserName.textContent = name;
    
    const firstLetter = name.charAt(0).toUpperCase();
    if (userAvatar) {
      userAvatar.textContent = firstLetter;
      userAvatar.style.backgroundColor = getRandomLightColor();
    }
    
    setTimeout(() => {
      if (navigator.onLine) {
        firebaseConnected = true;
        loadAuthenticatorsFromFirebase();
      }
    }, 1500);
  });
}

// SUPPORT PAGE
if (currentPage === 'support') {
  const faqSearchInput = document.getElementById('faqSearchInput');
  const faqClearSearch = document.getElementById('faqClearSearch');
  const faqNoResults = document.getElementById('faqNoResults');
  const contactUsBtn = document.getElementById('contactUsBtn');
  const contactForm = document.getElementById('contactForm');
  const cancelContactBtn = document.getElementById('cancelContactBtn');
  const submitContactBtn = document.getElementById('submitContactBtn');
  const contactSubject = document.getElementById('contactSubject');
  const contactDescription = document.getElementById('contactDescription');
  const contactError = document.getElementById('contactError');

  if (faqSearchInput) {
    faqSearchInput.addEventListener('input', (e) => {
      const searchTerm = e.target.value.toLowerCase().trim();
      const faqItems = document.querySelectorAll('.faq-item');
      let hasResults = false;
      
      if (searchTerm) {
        faqClearSearch.classList.add('visible');
      } else {
        faqClearSearch.classList.remove('visible');
      }
      
      faqItems.forEach(item => {
        const question = item.querySelector('.faq-question').textContent.toLowerCase();
        const answer = item.querySelector('.faq-answer').textContent.toLowerCase();
        
        if (searchTerm && (question.includes(searchTerm) || answer.includes(searchTerm))) {
          item.classList.remove('hidden');
          item.classList.add('matched');
          hasResults = true;
          
          if (question.includes(searchTerm)) {
            item.classList.add('active');
          }
        } else if (searchTerm) {
          item.classList.add('hidden');
          item.classList.remove('active', 'matched');
        } else {
          item.classList.remove('hidden', 'active', 'matched');
        }
      });
      
      if (searchTerm && !hasResults) {
        faqNoResults.classList.add('show');
      } else {
        faqNoResults.classList.remove('show');
      }
    });
  }

  if (faqClearSearch) {
    faqClearSearch.addEventListener('click', () => {
      faqSearchInput.value = '';
      faqClearSearch.classList.remove('visible');
      
      const faqItems = document.querySelectorAll('.faq-item');
      faqItems.forEach(item => {
        item.classList.remove('hidden', 'matched');
      });
      
      faqNoResults.classList.remove('show');
    });
  }

  document.querySelectorAll('.faq-question').forEach(question => {
    question.addEventListener('click', function() {
      const faqItem = this.parentElement;
      const isActive = faqItem.classList.contains('active');
      
      document.querySelectorAll('.faq-item').forEach(item => {
        item.classList.remove('active');
      });
      
      if (!isActive) {
        faqItem.classList.add('active');
      }
    });
  });

  if (contactUsBtn) {
    contactUsBtn.addEventListener('click', () => {
      contactForm.style.display = 'block';
      contactUsBtn.style.display = 'none';
      contactError.textContent = '';
      contactSubject.value = '';
      contactDescription.value = '';
    });
  }

  if (cancelContactBtn) {
    cancelContactBtn.addEventListener('click', () => {
      contactForm.style.display = 'none';
      contactUsBtn.style.display = 'block';
      contactError.textContent = '';
      contactSubject.value = '';
      contactDescription.value = '';
    });
  }

  if (submitContactBtn) {
    submitContactBtn.addEventListener('click', async () => {
      const subject = contactSubject.value.trim();
      const description = contactDescription.value.trim();
      
      if (!subject) {
        contactError.textContent = 'Please enter a subject';
        return;
      }
      
      if (!description) {
        contactError.textContent = 'Please describe your issue';
        return;
      }
      
      if (description.length < 10) {
        contactError.textContent = 'Please provide more details (at least 10 characters)';
        return;
      }
      
      try {
        await db.collection('support_tickets').add({
          uid: currentUser.uid,
          userEmail: currentUser.email,
          userName: currentUser.displayName || currentUser.email.split('@')[0],
          subject: subject,
          description: description,
          status: 'pending',
          createdAt: firebase.firestore.FieldValue.serverTimestamp()
        });
        
        showNotification('Your issue has been submitted. You will receive the response in registered email', 'success');
        
        contactForm.style.display = 'none';
        contactUsBtn.style.display = 'block';
        contactError.textContent = '';
        contactSubject.value = '';
        contactDescription.value = '';
      } catch (error) {
        console.error('Error submitting support ticket:', error);
        contactError.textContent = 'Failed to submit. Please try again.';
      }
    });
  }

  auth.onAuthStateChanged((user) => {
    if (!user) {
      window.location.href = 'login.html';
      return;
    }
    
    currentUser = user;
    const name = user.displayName || user.email.split('@')[0] || 'User';
    if (menuUserName) menuUserName.textContent = name;
    if (headerUserName) headerUserName.textContent = name;
    
    const firstLetter = name.charAt(0).toUpperCase();
    if (userAvatar) {
      userAvatar.textContent = firstLetter;
      userAvatar.style.backgroundColor = getRandomLightColor();
    }
  });
}

// FEEDBACK PAGE
if (currentPage === 'feedback') {
  const feedbackTitle = document.getElementById('feedbackTitle');
  const feedbackSummary = document.getElementById('feedbackSummary');
  const submitFeedbackBtn = document.getElementById('submitFeedbackBtn');
  const clearFeedbackBtn = document.getElementById('clearFeedbackBtn');
  const feedbackError = document.getElementById('feedbackError');

  if (submitFeedbackBtn) {
    submitFeedbackBtn.addEventListener('click', async () => {
      const title = feedbackTitle.value.trim();
      const summary = feedbackSummary.value.trim();
      
      if (!title) {
        feedbackError.textContent = 'Please enter a title';
        return;
      }
      
      if (!summary) {
        feedbackError.textContent = 'Please provide feedback summary';
        return;
      }
      
      if (summary.length < 10) {
        feedbackError.textContent = 'Please provide more details (at least 10 characters)';
        return;
      }
      
      try {
        await db.collection('feedback').add({
          uid: currentUser.uid,
          userEmail: currentUser.email,
          userName: currentUser.displayName || currentUser.email.split('@')[0],
          title: title,
          summary: summary,
          createdAt: firebase.firestore.FieldValue.serverTimestamp()
        });
        
        showNotification('Thank you! Your feedback has been submitted successfully', 'success');
        
        feedbackTitle.value = '';
        feedbackSummary.value = '';
        feedbackError.textContent = '';
      } catch (error) {
        console.error('Error submitting feedback:', error);
        feedbackError.textContent = 'Failed to submit. Please try again.';
      }
    });
  }

  if (clearFeedbackBtn) {
    clearFeedbackBtn.addEventListener('click', () => {
      feedbackTitle.value = '';
      feedbackSummary.value = '';
      feedbackError.textContent = '';
      showNotification('Form cleared', 'success');
    });
  }

  auth.onAuthStateChanged((user) => {
    if (!user) {
      window.location.href = 'login.html';
      return;
    }
    
    currentUser = user;
    const name = user.displayName || user.email.split('@')[0] || 'User';
    if (menuUserName) menuUserName.textContent = name;
    if (headerUserName) headerUserName.textContent = name;
    
    const firstLetter = name.charAt(0).toUpperCase();
    if (userAvatar) {
      userAvatar.textContent = firstLetter;
      userAvatar.style.backgroundColor = getRandomLightColor();
    }
  });
}

// Common auth state for other pages
if (!['account', 'bin', 'import', 'export', 'support', 'feedback'].includes(currentPage)) {
  auth.onAuthStateChanged((user) => {
    if (!user && currentPage !== 'login') {
      window.location.href = 'login.html';
      return;
    }
    
    if (user) {
      currentUser = user;
      const name = user.displayName || user.email.split('@')[0] || 'User';
      if (menuUserName) menuUserName.textContent = name;
      if (headerUserName) headerUserName.textContent = name;
      
      const firstLetter = name.charAt(0).toUpperCase();
      if (userAvatar) {
        userAvatar.textContent = firstLetter;
        userAvatar.style.backgroundColor = getRandomLightColor();
      }
    }
  });
}

}
