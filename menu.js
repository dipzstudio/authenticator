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

// Enable offline persistence
db.enablePersistence().catch((err) => {
  console.log('Offline persistence error:', err.code);
});

const USER_CACHE_KEY = 'uj_user_cache';
const EXPORT_CACHE_KEY = 'uj_export_cache';
const IMPORT_CACHE_KEY = 'uj_import_cache';

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

// ACCOUNT PAGE - (keeping existing code - lines 178-431 from original)
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
        nameError.textContent = 'Name must be at least 4 characters (letters only, spaces allowed)';
        return;
      }
      
      try {
        await currentUser.updateProfile({ displayName: newName });
        await db.collection('users').doc(currentUser.uid).set({
          displayName: newName,
          updatedAt: firebase.firestore.FieldValue.serverTimestamp()
        }, { merge: true });
        
        displayName.readOnly = true;
        editNameBtn.style.display = 'inline-flex';
        saveNameBtn.style.display = 'none';
        cancelNameBtn.style.display = 'none';
        nameError.textContent = '';
        
        if (menuUserName) menuUserName.textContent = newName;
        if (headerUserName) headerUserName.textContent = newName;
        
        showNotification('Name updated successfully!', 'success');
        originalDisplayName = newName;
      } catch (error) {
        console.error('Error updating name:', error);
        nameError.textContent = 'Failed to update name';
      }
    });
  }

  if (changePasswordBtn) {
    changePasswordBtn.addEventListener('click', () => {
      changePasswordForm.style.display = 'block';
      changePasswordBtn.style.display = 'none';
      oldPassword.value = '';
      newPassword.value = '';
      confirmPassword.value = '';
      passwordError.textContent = '';
    });
  }

  if (cancelPasswordBtn) {
    cancelPasswordBtn.addEventListener('click', () => {
      changePasswordForm.style.display = 'none';
      changePasswordBtn.style.display = 'block';
      oldPassword.value = '';
      newPassword.value = '';
      confirmPassword.value = '';
      passwordError.textContent = '';
    });
  }

  if (savePasswordBtn) {
    savePasswordBtn.addEventListener('click', async () => {
      const oldPass = oldPassword.value.trim();
      const newPass = newPassword.value.trim();
      const confirmPass = confirmPassword.value.trim();
      
      if (!oldPass || !newPass || !confirmPass) {
        passwordError.textContent = 'All fields are required';
        return;
      }
      
      if (newPass.length < 8) {
        passwordError.textContent = 'New password must be at least 8 characters';
        return;
      }
      
      if (newPass !== confirmPass) {
        passwordError.textContent = 'New passwords do not match';
        return;
      }
      
      try {
        const credential = firebase.auth.EmailAuthProvider.credential(
          currentUser.email,
          oldPass
        );
        
        await currentUser.reauthenticateWithCredential(credential);
        await currentUser.updatePassword(newPass);
        
        changePasswordForm.style.display = 'none';
        changePasswordBtn.style.display = 'block';
        oldPassword.value = '';
        newPassword.value = '';
        confirmPassword.value = '';
        passwordError.textContent = '';
        
        showNotification('Password changed successfully!', 'success');
      } catch (error) {
        console.error('Error changing password:', error);
        if (error.code === 'auth/wrong-password') {
          passwordError.textContent = 'Current password is incorrect';
        } else if (error.code === 'auth/weak-password') {
          passwordError.textContent = 'New password is too weak';
        } else {
          passwordError.textContent = 'Failed to change password';
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
        resetSuccessModal.style.display = 'flex';
      } catch (error) {
        console.error('Error sending reset email:', error);
        showNotification('Failed to send reset email', 'error');
      }
    });
  }

  if (closeResetSuccess) {
    closeResetSuccess.addEventListener('click', () => {
      resetSuccessModal.style.display = 'none';
    });
  }

  resetSuccessModal.addEventListener('click', (e) => {
    if (e.target === resetSuccessModal) {
      resetSuccessModal.style.display = 'none';
    }
  });

  auth.onAuthStateChanged((user) => {
    if (!user) {
      window.location.href = 'login.html';
      return;
    }
    
    currentUser = user;
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

  // Load from cache first
  function loadBinFromCache() {
    const cached = localStorage.getItem('uj_bin_cache');
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
    localStorage.setItem('uj_bin_cache', JSON.stringify({
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

// IMPORT PAGE - FIXED VERSION
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
    if (now - lastErrorTime < 3000) return; // Prevent spam
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
      // Check if jsQR is loaded
      if (typeof jsQR === 'undefined') {
        showNotification('QR scanner library not loaded. Please refresh the page.', 'error');
        console.error('jsQR library not found');
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

  importScanModal.addEventListener('click', (e) => {
    if (e.target === importScanModal) {
      stopCamera();
      importScanModal.style.display = 'none';
    }
  });

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
      console.log('Processing QR data:', data);
      
      // Try parsing as JSON first (our export format or Google Authenticator migration)
      if (data.startsWith('{') || data.startsWith('[')) {
        const importData = JSON.parse(data);
        
        // Handle our export format
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
              console.error('Error importing authenticator:', error);
            }
          }

          showNotification(`Successfully imported ${successCount} authenticator(s)!`, 'success');
          setTimeout(() => {
            window.location.href = 'index.html';
          }, 1500);
          return;
        }
      } 
      
      // Try parsing as TOTP URI (Google Authenticator, Authy, Microsoft, etc.)
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
      
      // Try parsing as Google Authenticator migration format
      if (data.startsWith('otpauth-migration://')) {
        showImportError('Google Authenticator migration format not yet supported. Please export individual codes.');
        return;
      }
      
      showImportError('Unsupported QR code format');
    } catch (error) {
      console.error('Error processing import QR:', error);
      showImportError('Failed to process QR code');
    }
  }

  function parseOTPAuthURI(uri) {
    try {
      // Format: otpauth://totp/Provider:account?secret=XXX&issuer=Provider
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

// EXPORT PAGE - FIXED VERSION
if (currentPage === 'export') {
  const exportList = document.getElementById('exportList');
  const exportBtn = document.getElementById('exportBtn');
  const exportQRContainer = document.getElementById('exportQRContainer');
  const qrCodeCanvas = document.getElementById('qrCodeCanvas');
  const downloadQRBtn = document.getElementById('downloadQRBtn');
  
  let authenticators = [];

  // Load from cache first
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
    if (authenticators.length === 0) {
      exportList.innerHTML = `<div style="text-align:center; padding:40px 20px; color:#6b7280;"><p style="font-size:1.1rem; margin-bottom:8px;">No authenticators to export</p><p style="font-size:0.9rem;">Add authenticators first</p></div>`;
      if (exportBtn) exportBtn.disabled = true;
      return;
    }

    exportList.innerHTML = '';
    authenticators.forEach(auth => {
      const item = document.createElement('div');
      item.className = 'export-item';
      const accountNameHtml = auth.accountName ? `<div class="export-item-account">${auth.accountName}</div>` : '';
      item.innerHTML = `<div class="export-item-info"><div class="export-item-provider">${auth.providerName}</div>${accountNameHtml}</div><label class="export-checkbox-wrapper"><input type="checkbox" class="export-checkbox" data-id="${auth.id}" checked><span class="export-checkmark"></span></label>`;
      exportList.appendChild(item);
    });

    if (exportBtn) exportBtn.disabled = false;
  }

  if (exportBtn) {
    exportBtn.addEventListener('click', async () => {
      // Check if QRCode library is loaded
      if (typeof QRCode === 'undefined') {
        showNotification('QR code library not loaded. Please refresh the page.', 'error');
        console.error('QRCode library not found');
        return;
      }

      const checkedBoxes = document.querySelectorAll('.export-checkbox:checked');
      const selectedIds = Array.from(checkedBoxes).map(cb => cb.getAttribute('data-id'));
      
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
        const qrData = JSON.stringify(exportData);
        
        // Use QRCode.toCanvas method
        QRCode.toCanvas(qrCodeCanvas, qrData, {
          width: 300,
          margin: 2,
          errorCorrectionLevel: 'M',
          color: { 
            dark: '#000000', 
            light: '#FFFFFF' 
          }
        }, (error) => {
          if (error) {
            console.error('QR generation error:', error);
            showNotification('Failed to generate QR code', 'error');
          } else {
            exportQRContainer.style.display = 'block';
            showNotification(`QR code generated for ${selectedAuths.length} authenticator(s)`, 'success');
          }
        });
      } catch (error) {
        console.error('Error generating QR:', error);
        showNotification('Failed to generate QR code', 'error');
      }
    });
  }

  if (downloadQRBtn) {
    downloadQRBtn.addEventListener('click', () => {
      const now = new Date();
      const dd = now.getDate().toString().padStart(2,'0');
      const mm = (now.getMonth()+1).toString().padStart(2,'0');
      const yyyy = now.getFullYear();
      const hh = now.getHours().toString().padStart(2,'0');
      const min = now.getMinutes().toString().padStart(2,'0');
      const ss = now.getSeconds().toString().padStart(2,'0');
      const filename = `exported_qr_${dd}${mm}${yyyy}_${hh}${min}${ss}.jpg`;
      
      qrCodeCanvas.toBlob((blob) => {
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = filename;
        link.click();
        URL.revokeObjectURL(url);
        
        showNotification('QR code image downloaded', 'success');
      }, 'image/jpeg', 0.95);
    });
  }

  // Load from cache first
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
    
    // Delayed Firebase sync
    setTimeout(() => {
      if (navigator.onLine) {
        firebaseConnected = true;
        loadAuthenticatorsFromFirebase();
      }
    }, 1500);
  });
}

// SUPPORT PAGE (keeping existing code)
if (currentPage === 'support') {
  const contactUsBtn = document.getElementById('contactUsBtn');
  const contactForm = document.getElementById('contactForm');
  const submitContactBtn = document.getElementById('submitContactBtn');
  const cancelContactBtn = document.getElementById('cancelContactBtn');
  const contactSubject = document.getElementById('contactSubject');
  const contactDescription = document.getElementById('contactDescription');
  const contactError = document.getElementById('contactError');
  
  const faqSearchInput = document.getElementById('faqSearchInput');
  const faqClearSearch = document.getElementById('faqClearSearch');
  const faqNoResults = document.getElementById('faqNoResults');
  const faqItems = document.querySelectorAll('.faq-item');

  if (faqSearchInput) {
    faqSearchInput.addEventListener('input', (e) => {
      const searchTerm = e.target.value.toLowerCase().trim();
      
      if (searchTerm) {
        faqClearSearch.classList.add('visible');
      } else {
        faqClearSearch.classList.remove('visible');
      }
      
      let hasResults = false;
      
      faqItems.forEach(item => {
        const questionText = item.querySelector('.faq-question span').textContent.toLowerCase();
        const answerText = item.querySelector('.faq-answer').textContent.toLowerCase();
        const searchText = item.getAttribute('data-search-text') || '';
        
        const matches = questionText.includes(searchTerm) || 
                       answerText.includes(searchTerm) || 
                       searchText.toLowerCase().includes(searchTerm);
        
        if (searchTerm === '' || matches) {
          item.classList.remove('hidden');
          hasResults = true;
          
          if (searchTerm && matches) {
            item.classList.add('matched');
          } else {
            item.classList.remove('matched');
          }
        } else {
          item.classList.add('hidden');
          item.classList.remove('active', 'matched');
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

// Common auth state
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