let auth, db;
const APP_CACHE_KEY = 'uj_app_cache';
const AUTH_CACHE_KEY = 'uj_auth_cache';
let firebaseConnected = false;
let firebaseConnectionTimer = null;

async function initializeFirebase() {
  try {
    const response = await fetch('/api/firebase-config');
    const result = await response.json();
    
    if (result.success) {
      firebase.initializeApp(result.config);
      auth = firebase.auth();
      db = firebase.firestore();
      console.log('Firebase initialized');
      
      // ✅ Enable offline persistence AFTER db is initialized
      await db.enablePersistence()
        .catch((err) => {
          console.log('Offline persistence error:', err.code);
        });
      
      // ✅ Initialize app AFTER Firebase is ready
      initializeApp();
      
    } else {
      console.error('Failed to get Firebase config:', result.error);
    }
  } catch (error) {
    console.error('Error initializing Firebase:', error);
  }
}

// Start Firebase initialization
initializeFirebase();

function initializeApp() {	

const userNameEl = document.getElementById('userName');
const menuUserNameEl = document.getElementById('menuUserName');
const userAvatarEl = document.getElementById('userAvatar');
const logoutBtn = document.getElementById('logoutBtn');
const addAccountBtn = document.getElementById('addAccountBtn');
const addAccountModal = document.getElementById('addAccountModal');
const closeModal = document.getElementById('closeModal');
const scanBtn = document.getElementById('scanBtn');
const scanOverlay = document.getElementById('scanOverlay');
const videoElement = document.getElementById('videoElement');
const canvasElement = document.getElementById('canvasElement');
const providerNameInput = document.getElementById('providerName');
const secretCodeInput = document.getElementById('secretCode');
const addAuthenticatorBtn = document.getElementById('addAuthenticatorBtn');
const addError = document.getElementById('addError');
const authenticatorList = document.getElementById('authenticatorList');
const logoutModal = document.getElementById('logoutModal');
const confirmLogout = document.getElementById('confirmLogout');
const cancelLogout = document.getElementById('cancelLogout');
const deleteModal = document.getElementById('deleteModal');
const confirmDelete = document.getElementById('confirmDelete');
const cancelDelete = document.getElementById('cancelDelete');
const themeToggle = document.getElementById('themeToggle');
const searchInput = document.getElementById('searchInput');
const clearSearch = document.getElementById('clearSearch');
const menuToggle = document.getElementById('menuToggle');
const sideMenu = document.getElementById('sideMenu');
const menuOverlay = document.getElementById('menuOverlay');

let authUser = null;
let scanActive = false;
let cameraStream = null;
let authAccounts = [];
let filteredAccounts = [];
let scanInterval = null;
let deleteTargetId = null;

let notificationTimeout = null;
let lastOnlineState = navigator.onLine;
let pendingSync = false;

let startY = 0;
let pulling = false;
const pullThreshold = 80;
let notificationId = 0;

let longPressTimer = null;
let isPressing = false;
let pressTarget = null;
const LONG_PRESS_DURATION = 3000; // 3 seconds
let pinnedCount = 0;

// Menu functionality
menuToggle.addEventListener('click', () => {
  sideMenu.classList.add('active');
  menuOverlay.classList.add('active');
  document.body.style.overflow = 'hidden';
});

menuOverlay.addEventListener('click', () => {
  sideMenu.classList.remove('active');
  menuOverlay.classList.remove('active');
  document.body.style.overflow = '';
});

document.querySelectorAll('.menu-item').forEach(item => {
  item.addEventListener('click', () => {
    sideMenu.classList.remove('active');
    menuOverlay.classList.remove('active');
    document.body.style.overflow = '';
  });
});

// Search functionality
searchInput.addEventListener('input', (e) => {
  const searchTerm = e.target.value.trim().toLowerCase();
  
  if (searchTerm) {
    clearSearch.style.display = 'flex';
    filteredAccounts = authAccounts.filter(acc => {
      const providerMatch = acc.providerName.toLowerCase().includes(searchTerm);
      const accountMatch = acc.accountName.toLowerCase().includes(searchTerm);
      return providerMatch || accountMatch;
    });
  } else {
    clearSearch.style.display = 'none';
    filteredAccounts = authAccounts;
  }
  
  renderAuthenticators();
});

clearSearch.addEventListener('click', () => {
  searchInput.value = '';
  clearSearch.style.display = 'none';
  filteredAccounts = authAccounts;
  renderAuthenticators();
});


function base32tohex(base32) {
  const base32chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567';
  let bits = '';
  let hex = '';
  base32 = base32.replace(/=+$/, '');
  for (let i = 0; i < base32.length; i++) {
    const val = base32chars.indexOf(base32.charAt(i).toUpperCase());
    if (val === -1) throw new Error('Invalid base32 character');
    bits += val.toString(2).padStart(5, '0');
  }
  for (let i = 0; i + 8 <= bits.length; i += 8) {
    const chunk = bits.substr(i, 8);
    hex += parseInt(chunk, 2).toString(16).padStart(2, '0');
  }
  return hex;
}

function generateTOTP(secret) {
  try {
    const epoch = Math.floor(new Date().getTime() / 1000.0);
    const time = ('0000000000000000' + Math.floor(epoch / 30).toString(16)).slice(-16);
    const key = base32tohex(secret);
    const shaObj = new jsSHA('SHA-1', 'HEX');
    shaObj.setHMACKey(key, 'HEX');
    shaObj.update(time);
    const hmac = shaObj.getHMAC('HEX');
    const offset = parseInt(hmac.substring(hmac.length - 1), 16);
    let otp = (parseInt(hmac.substr(offset * 2, 8), 16) & 0x7fffffff) + '';
    otp = otp.substr(otp.length - 6, 6);
    return otp;
  } catch (e) {
    console.error('TOTP generation error:', e);
    return '000000';
  }
}

// Helper function to add authenticator to UI and Firebase
async function addAuthenticatorToUI(provider, accountName = '', secret) {
  // Generate temporary ID for immediate UI update
  const tempId = 'temp_' + Date.now();
  
  // Add to local array immediately for instant UI
  authAccounts.unshift({
    id: tempId,
    uid: authUser.uid,
    providerName: provider,
    accountName: accountName,
    secretCode: secret,
    createdAt: new Date(),
	pinned: false,
	pinnedAt: null,
	pinnedOrder: null
  });
  
  filteredAccounts = authAccounts;
  sortAuthenticators();
  renderAuthenticators();
  cacheAppData();
  
  // Handle Firebase in background (non-blocking)
  const newDoc = {
    uid: authUser.uid,
    providerName: provider,
    accountName: accountName,
    secretCode: secret,
    createdAt: firebase.firestore.FieldValue.serverTimestamp()
  };
  
  db.collection('authenticators').add(newDoc)
    .then((docRef) => {
      // Replace temp ID with real Firestore ID
      const index = authAccounts.findIndex(acc => acc.id === tempId);
      if (index !== -1) {
        authAccounts[index].id = docRef.id;
      }
      console.log('Added to Firestore successfully');
    })
    .catch((firestoreError) => {
      pendingSync = true;
      console.log('Added to cache, will sync when online');
    });
}

// Helper function to delete authenticator from UI and Firebase
async function deleteAuthenticatorFromUI(targetId) {
  const authToDelete = authAccounts.find(acc => acc.id === targetId);
  
  if (!authToDelete) {
    console.error('Authenticator not found');
    return;
  }
  
  // Immediately remove from UI
  authAccounts = authAccounts.filter(acc => acc.id !== targetId);
  filteredAccounts = authAccounts;
  renderAuthenticators();
  
  cacheAppData();
  
  // Show notification
  showNotification('Authenticator deleted successfully and moved to bin', 'success');
  
  // Move to deleted_authenticators collection (90-day retention)
  if (navigator.onLine && authUser && firebaseConnected) {
    try {
      await db.collection('deleted_authenticators').add({
        uid: authToDelete.uid,
        providerName: authToDelete.providerName,
        accountName: authToDelete.accountName || '',
        secretCode: authToDelete.secretCode,
        deletedAt: firebase.firestore.FieldValue.serverTimestamp()
      });
      
      await db.collection('authenticators').doc(targetId).delete();
    } catch (error) {
      console.error('Error moving to bin:', error);
    }
  } else {
    pendingSync = true;
    setTimeout(async () => {
      if (navigator.onLine && authUser) {
        try {
          await db.collection('deleted_authenticators').add({
            uid: authToDelete.uid,
            providerName: authToDelete.providerName,
            accountName: authToDelete.accountName || '',
            secretCode: authToDelete.secretCode,
            deletedAt: firebase.firestore.FieldValue.serverTimestamp()
          });
          await db.collection('authenticators').doc(targetId).delete();
        } catch (error) {
          console.error('Error moving to bin (delayed):', error);
        }
      }
    }, 1000);
  }
}

function showNotification(message, type) {
  const container = document.getElementById('notificationContainer');
  
  // Create new notification element
  const notificationId = 'notif-' + Date.now();
  const messageEl = document.createElement('div');
  messageEl.id = notificationId;
  messageEl.textContent = message;
  messageEl.className = 'notification-message notification-' + type;
  
  // Add to top of container
  container.style.display = 'flex';
  container.insertBefore(messageEl, container.firstChild);
  
  // Remove after 2.5 seconds
  setTimeout(() => {
    messageEl.style.opacity = '0';
    messageEl.style.transform = 'translateY(-20px)';
    
    setTimeout(() => {
      if (messageEl.parentNode) {
        messageEl.remove();
      }
      
      // Hide container if no notifications left
      if (container.children.length === 0) {
        container.style.display = 'none';
      }
    }, 300);
  }, 2500);
}

// Monitor network status
window.addEventListener('online', async () => {
  if (!lastOnlineState) {
    showNotification('Authenticator is now online!', 'online');
    lastOnlineState = true;
    
    // Trigger sync after notification
    setTimeout(async () => {
      if (pendingSync && authUser) {
        await syncWithFirebase(authUser);
      }
    }, 2700);
  }
});

window.addEventListener('offline', () => {
  if (lastOnlineState) {
    showNotification('Network is disconnected. But app works in offline mode!', 'offline');
    lastOnlineState = false;
  }
});

authenticatorList.addEventListener('touchstart', (e) => {
  if (authenticatorList.scrollTop === 0) {
    startY = e.touches[0].clientY;
    pulling = true;
  }
});

authenticatorList.addEventListener('touchmove', (e) => {
  if (!pulling) return;
  
  const currentY = e.touches[0].clientY;
  const pullDistance = currentY - startY;
  
  if (pullDistance > 20 && authenticatorList.scrollTop === 0) {
    const loader = document.getElementById('refreshLoader');
    loader.style.display = 'block';
  }
});

authenticatorList.addEventListener('touchend', async (e) => {
  if (!pulling) return;
  
  const currentY = e.changedTouches[0].clientY;
  const pullDistance = currentY - startY;
  const loader = document.getElementById('refreshLoader');
  
  if (pullDistance > pullThreshold) {
    if (!navigator.onLine) {
      loader.style.display = 'none'; // Ensure it hides if offline
      showNotification('No network found. Try Again!', 'offline');
    } else {
      // Force immediate display, then sync
      loader.style.display = 'block';
      
      try {
        if (authUser) {
          await loadAccountsFromFirebase(); // Call the specific firebase sync
        }
        showNotification('Authenticator is synced!', 'synced');
      } catch (err) {
        showNotification('Sync failed', 'error');
      } finally {
        // Always hide loader after action
        loader.style.display = 'none';
      }
    }
  } else {
    loader.style.display = 'none';
  }
  
  pulling = false;
  startY = 0;
});

function renderAuthenticators() {
  authenticatorList.innerHTML = '';
  
  const displayAccounts = filteredAccounts.length > 0 || searchInput.value.trim() ? filteredAccounts : authAccounts;
  
  if (displayAccounts.length === 0 && searchInput.value.trim()) {
    authenticatorList.innerHTML = '<div style="text-align: center; color: #9ca3af; padding: 40px 20px; font-size: 1.1rem;"><p>No authenticators found</p><p style="font-size: 0.95rem; margin-top: 8px;">Try a different search term</p></div>';
    return;
  }
  
  if (displayAccounts.length === 0) {
    authenticatorList.innerHTML = '<div style="text-align: center; color: #9ca3af; padding: 40px 20px; font-size: 1.1rem;"><p>No authenticators added yet.</p><p style="font-size: 0.95rem; margin-top: 8px;">Click the Add button below to add your first authenticator.</p></div>';
    return;
  }
  
  displayAccounts.forEach((acc, idx) => {
    const card = document.createElement('div');
    card.className = 'authenticator-card';
    if (acc.pinned) {
      card.classList.add('pinned');
    }
    card.dataset.authId = acc.id;
    
    const accountNameHtml = acc.accountName ? '<div class="card-account">' + acc.accountName + '</div>' : '';
    
    // Pin icon HTML
    const pinIconHtml = acc.pinned ? `
      <svg class="pin-icon" data-id="${acc.id}" viewBox="0 0 24 24" fill="currentColor">
        <path d="M16 12V4H17V2H7V4H8V12L6 14V16H11.2V22H12.8V16H18V14L16 12Z"/>
      </svg>
    ` : '';
    
    card.innerHTML = `
      <button class="btn-delete" data-id="${acc.id}" title="Delete">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
          <path d="M3 6h18M19 6v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6m3 0V4a2 2 0 012-2h4a2 2 0 012 2v2M10 11v6M14 11v6" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
        </svg>
      </button>
      ${pinIconHtml}
      <div class="card-left">
        <div class="card-provider">${acc.providerName}</div>
        ${accountNameHtml}
        <div class="card-code" id="code-${idx}" data-code="${generateTOTP(acc.secretCode)}">${generateTOTP(acc.secretCode)}</div>
      </div>
      <div class="card-timer">
        <div class="timer-circle">
          <div class="timer-hand-shadow" id="shadow-${idx}"></div>
          <div class="timer-hand" id="hand-${idx}"></div>
          <span class="timer-value" id="timer-${idx}">30</span>
        </div>
      </div>
    `;
    
    authenticatorList.appendChild(card);
  });

  // Add delete button listeners
  document.querySelectorAll('.btn-delete').forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      const id = btn.getAttribute('data-id');
      showDeleteConfirmation(id);
    });
  });

  // Add pin icon listeners
  document.querySelectorAll('.pin-icon').forEach(icon => {
    icon.addEventListener('click', (e) => {
      e.stopPropagation();
      const id = icon.getAttribute('data-id');
      togglePin(id);
    });
  });

  // Add long press listeners to cards
  document.querySelectorAll('.authenticator-card').forEach(card => {
    const authId = card.dataset.authId;
    
    // Touch events
    card.addEventListener('touchstart', (e) => {
      handleLongPressStart(e, authId);
    }, { passive: true });
    
    card.addEventListener('touchend', handleLongPressEnd);
    card.addEventListener('touchcancel', handleLongPressEnd);
    
    // Mouse events (for desktop)
    card.addEventListener('mousedown', (e) => {
      if (e.button === 0) { // Left click only
        handleLongPressStart(e, authId);
      }
    });
    
    card.addEventListener('mouseup', handleLongPressEnd);
    card.addEventListener('mouseleave', handleLongPressEnd);
  });

  // Add tap to copy listeners
  document.querySelectorAll('.card-code').forEach(codeEl => {
    codeEl.addEventListener('click', (e) => {
	  e.preventDefault();
      e.stopPropagation();
      const code = codeEl.getAttribute('data-code') || codeEl.textContent;
      copyCodeToClipboard(code, codeEl);
    });
  });
  
  // Update pinned count
  checkPinnedCount();
}

function showDeleteConfirmation(id) {
  deleteTargetId = id;
  deleteModal.style.display = 'flex';
}

confirmDelete.addEventListener('click', () => {
  if (deleteTargetId) {
    const targetId = deleteTargetId;
    
    // Delete from UI and Firebase
    deleteAuthenticatorFromUI(targetId);
    
    // Close modal and reset
    deleteModal.style.display = 'none';
    deleteTargetId = null;
  }
});

cancelDelete.addEventListener('click', () => {
  deleteModal.style.display = 'none';
  deleteTargetId = null;
});

function updateTimers() {
  const now = Date.now();
  const seconds = Math.floor(now / 1000);
  const milliseconds = now % 1000;
  const timeLeft = 30 - (seconds % 30);
  
  const totalProgress = ((seconds % 30) * 1000 + milliseconds) / 30000;
  const rotationDegrees = 360 * totalProgress;

  authAccounts.forEach((acc, idx) => {
    const codeEl = document.getElementById('code-' + idx);
    const timerEl = document.getElementById('timer-' + idx);
    const shadowEl = document.getElementById('shadow-' + idx);

    if (codeEl) codeEl.textContent = generateTOTP(acc.secretCode);
    if (timerEl) timerEl.textContent = timeLeft;
    if (shadowEl) {
      shadowEl.style.transform = 'rotate(' + rotationDegrees + 'deg)';
    }
  });
    
  requestAnimationFrame(updateTimers);
}

requestAnimationFrame(updateTimers);

// Your existing applyTheme - updated to include minimal status bar handling
async function applyTheme(isDark) {
  if (isDark) {
    document.body.classList.add('dark');
    themeToggle.querySelector('.theme-icon').textContent = '☀️';
  } else {
    document.body.classList.remove('dark');
    themeToggle.querySelector('.theme-icon').textContent = '🌙';
  }
  
  // Minimal status bar logic (integrated here)
  if (window.Capacitor?.Plugins?.StatusBar) {
    const { StatusBar } = window.Capacitor.Plugins;
    try {
      await StatusBar.setBackgroundColor({ color: isDark ? '#1a1a1a' : '#f6f7fb' });
      await StatusBar.setStyle({ style: isDark ? 'DARK' : 'LIGHT' });  // Swapped for reversal
      await StatusBar.setOverlaysWebView({ overlay: false });
      await StatusBar.show();  // Force apply
    } catch (e) { console.log('StatusBar fail:', e); }
  }
  
  localStorage.setItem('theme', isDark ? 'dark' : 'light');
}

const savedTheme = localStorage.getItem('theme');
const defaultIsDark = savedTheme === 'dark';
applyTheme(defaultIsDark);
setTimeout(() => applyTheme(defaultIsDark), 800);
window.addEventListener('load', () => setTimeout(() => applyTheme(defaultIsDark), 100));

themeToggle.addEventListener('click', async () => {
  const isDark = !document.body.classList.contains('dark');
  await applyTheme(isDark);
});

if (savedTheme === 'dark') {
  applyTheme(true);
} else {
  applyTheme(false);
}

setTimeout(async () => {
  if (window.Capacitor && window.Capacitor.Plugins && window.Capacitor.Plugins.StatusBar) {
    const { StatusBar } = window.Capacitor.Plugins;
    const isDark = document.body.classList.contains('dark');
    
    try {
      if (isDark) {
        await StatusBar.setBackgroundColor({ color: '#1a1a1a' });
        await StatusBar.setStyle({ style: 'LIGHT' });
        await StatusBar.setOverlaysWebView({ overlay: false });
      } else {
        await StatusBar.setBackgroundColor({ color: '#f6f7fb' });
        await StatusBar.setStyle({ style: 'DARK' });
        await StatusBar.setOverlaysWebView({ overlay: false });
      }
    } catch (err) {
      console.log('StatusBar init error:', err);
    }
  }
}, 200);

// TIPS Modal
const tipsBtn = document.getElementById('tipsBtn');
const tipsModal = document.getElementById('tipsModal');
const tipsClose = document.getElementById('tipsClose');

if (tipsBtn) {
  tipsBtn.addEventListener('click', () => {
    tipsModal.style.display = 'flex';
  });
}

if (tipsClose) {
  tipsClose.addEventListener('click', () => {
    tipsModal.style.display = 'none';
  });
}

tipsModal.addEventListener('click', (e) => {
  if (e.target === tipsModal) {
    tipsModal.style.display = 'none';
  }
});

// Pin authenticator functions
function checkPinnedCount() {
  pinnedCount = authAccounts.filter(acc => acc.pinned).length;
  return pinnedCount;
}

async function togglePin(authId) {
  const auth = authAccounts.find(acc => acc.id === authId);
  if (!auth) return;

  if (!auth.pinned) {
    // Pinning - Check if already at max
    const pinnedItems = authAccounts.filter(acc => acc.pinned);
    
    if (pinnedItems.length >= 3) {
      // Auto-unpin the oldest (lowest pinnedOrder)
      const oldestPinned = pinnedItems.sort((a, b) => a.pinnedOrder - b.pinnedOrder)[0];
      
      // Unpin oldest
      oldestPinned.pinned = false;
      oldestPinned.pinnedAt = null;
      oldestPinned.pinnedOrder = null;
      
      if (navigator.onLine && authUser) {
        try {
          await db.collection('authenticators').doc(oldestPinned.id).update({
            pinned: false,
            pinnedAt: null,
            pinnedOrder: null
          });
        } catch (error) {
          console.error('Error unpinning:', error);
        }
      }
    }

    // Pin the new one
    auth.pinned = true;
    auth.pinnedAt = new Date();
    auth.pinnedOrder = checkPinnedCount();
    
    if (navigator.onLine && authUser) {
      try {
        await db.collection('authenticators').doc(authId).update({
          pinned: true,
          pinnedAt: firebase.firestore.FieldValue.serverTimestamp(),
          pinnedOrder: auth.pinnedOrder
        });
      } catch (error) {
        console.error('Error pinning:', error);
      }
    }
    
    showNotification(`${auth.providerName} has been pinned`, 'success');
  } else {
    // Unpinning
    auth.pinned = false;
    auth.pinnedAt = null;
    auth.pinnedOrder = null;
    
    if (navigator.onLine && authUser) {
      try {
        await db.collection('authenticators').doc(authId).update({
          pinned: false,
          pinnedAt: null,
          pinnedOrder: null
        });
      } catch (error) {
        console.error('Error unpinning:', error);
      }
    }
    
    showNotification(`${auth.providerName} has been unpinned`, 'success');
  }

  sortAuthenticators();
  renderAuthenticators();
  updateTimers();
}


function sortAuthenticators() {
  authAccounts.sort((a, b) => {
    // Pinned items first
    if (a.pinned && !b.pinned) return -1;
    if (!a.pinned && b.pinned) return 1;
    
    // If both pinned, sort by pinnedOrder (DESCENDING - higher order = more recent = top)
    if (a.pinned && b.pinned) {
      return (b.pinnedOrder || 0) - (a.pinnedOrder || 0);
    }
    
    // If both unpinned, sort by createdAt (newest first)
    if (a.createdAt && b.createdAt) {
      return b.createdAt.seconds - a.createdAt.seconds;
    }
    
    return 0;
  });
}

function handleLongPressStart(e, authId) {
  isPressing = true;
  pressTarget = authId;
  
  const card = e.currentTarget;
  card.classList.add('pressing');
  
  longPressTimer = setTimeout(() => {
    if (isPressing && pressTarget === authId) {
      const auth = authAccounts.find(acc => acc.id === authId);
      
      // Check if already pinned - ONLY show message here after 3 seconds
      if (auth && auth.pinned) {
        showNotification(`${auth.providerName} is already pinned`, 'success');
      } else {
        // Pin the authenticator
        togglePin(authId);
      }
      
      if (navigator.vibrate) {
        navigator.vibrate(50);
      }
    }
  }, LONG_PRESS_DURATION);
}

function handleLongPressEnd(e) {
  if (longPressTimer) {
    clearTimeout(longPressTimer);
    longPressTimer = null;
  }
  
  isPressing = false;
  pressTarget = null;
  
  const card = e.currentTarget;
  card.classList.remove('pressing');
}

// Copy code to clipboard
function copyCodeToClipboard(code, element) {
  // Modern clipboard API
  if (navigator.clipboard && navigator.clipboard.writeText) {
    navigator.clipboard.writeText(code).then(() => {
      showCopyFeedback(element);
    }).catch(err => {
      // Fallback for older browsers
      fallbackCopyCode(code, element);
    });
  } else {
    fallbackCopyCode(code, element);
  }
}

function fallbackCopyCode(code, element) {
  const textarea = document.createElement('textarea');
  textarea.value = code;
  textarea.style.position = 'fixed';
  textarea.style.opacity = '0';
  document.body.appendChild(textarea);
  textarea.select();
  
  try {
    document.execCommand('copy');
    showCopyFeedback(element);
  } catch (err) {
    console.error('Failed to copy:', err);
    showNotification('Failed to copy code', 'error');
  }
  
  document.body.removeChild(textarea);
}

function showCopyFeedback(element) {
  // Add copied class for animation
  element.classList.add('copied');
  setTimeout(() => {
    element.classList.remove('copied');
  }, 500);
  
  // Show toast
  showCopyToast();
}

function showCopyToast() {
  let toast = document.querySelector('.copy-toast');
  
  if (!toast) {
    toast = document.createElement('div');
    toast.className = 'copy-toast';
    toast.innerHTML = `
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
        <polyline points="20 6 9 17 4 12"></polyline>
      </svg>
      <span>Code copied!</span>
    `;
    document.body.appendChild(toast);
  }
  
  toast.classList.add('show');
  
  setTimeout(() => {
    toast.classList.remove('show');
  }, 2000);
}

logoutBtn.addEventListener('click', () => {
  logoutModal.style.display = 'flex';
});

cancelLogout.addEventListener('click', () => {
  logoutModal.style.display = 'none';
});

confirmLogout.addEventListener('click', async () => {
  try {
    await auth.signOut();
    window.location.href = 'login.html';
  } catch (error) {
    console.error('Logout error:', error);
  }
});

addAccountBtn.addEventListener('click', () => {
  addAccountModal.style.display = 'flex';
  addError.textContent = '';
  providerNameInput.value = '';
  secretCodeInput.value = '';
});

// Share button functionality
const shareBtn = document.getElementById('shareBtn');
if (shareBtn) {
  shareBtn.addEventListener('click', async () => {
    const shareUrl = 'https://auth.underjoy.in';
    
    try {
      // Try native Web Share API first (works on Android/iOS)
      if (navigator.share) {
        await navigator.share({
          title: 'UnderJoy Authenticator',
          text: 'Check out UnderJoy Authenticator - Secure 2FA app',
          url: shareUrl
        });
        console.log('Shared successfully');
      } else if (window.Capacitor) {
        // On Capacitor but no share API - try Capacitor Share
        const { Share } = window.Capacitor.Plugins;
        if (Share) {
          await Share.share({
            title: 'UnderJoy Authenticator',
            text: 'Check out UnderJoy Authenticator - Secure 2FA app',
            url: shareUrl,
            dialogTitle: 'Share UnderJoy Authenticator'
          });
        } else {
          throw new Error('Share not available');
        }
      } else {
        // Fallback: copy to clipboard
        await navigator.clipboard.writeText(shareUrl);
        showNotification('Link copied to clipboard!', 'synced');
      }
    } catch (error) {
      // User cancelled or share failed
      if (error.name !== 'AbortError') {
        console.log('Share error:', error);
        // Try clipboard as last resort
        try {
          await navigator.clipboard.writeText(shareUrl);
          showNotification('Link copied to clipboard!', 'synced');
        } catch (e) {
          console.log('Clipboard also failed:', e);
        }
      }
    }
  });
}

closeModal.addEventListener('click', () => {
  addAccountModal.style.display = 'none';
  stopCamera();
});

window.addEventListener('click', (e) => {
  if (e.target === addAccountModal) {
    addAccountModal.style.display = 'none';
    stopCamera();
  }
  if (e.target === logoutModal) {
    logoutModal.style.display = 'none';
  }
  if (e.target === deleteModal) {
    deleteModal.style.display = 'none';
    deleteTargetId = null;
  }
});

scanBtn.addEventListener('click', () => {
  if (!scanActive) {
    startCamera();
  } else {
    stopCamera();
  }
});

async function startCamera() {
  try {
    scanActive = true;
    scanBtn.textContent = 'Stop Scan';
    addError.textContent = 'Position QR code in camera view...';
    addError.style.color = '#059669';
    cameraStream = await navigator.mediaDevices.getUserMedia({ 
      video: { facingMode: 'environment', width: { ideal: 640 }, height: { ideal: 480 } } 
    });
    videoElement.srcObject = cameraStream;
    videoElement.style.display = 'block';
    scanOverlay.style.display = 'block';
    scanInterval = setInterval(scanQRCode, 300);
  } catch (error) {
    addError.textContent = 'Camera access denied or not available.';
    addError.style.color = '#dc2626';
    scanActive = false;
    scanBtn.textContent = 'Scan QR';
  }
}

function scanQRCode() {
  if (!scanActive || !videoElement.videoWidth) return;
  canvasElement.width = videoElement.videoWidth;
  canvasElement.height = videoElement.videoHeight;
  const ctx = canvasElement.getContext('2d');
  ctx.drawImage(videoElement, 0, 0, canvasElement.width, canvasElement.height);
  const imageData = ctx.getImageData(0, 0, canvasElement.width, canvasElement.height);
  const code = jsQR(imageData.data, imageData.width, imageData.height);
  if (code) {
    processQRCode(code.data);
  }
}

async function processQRCode(data) {
  try {
    const url = new URL(data);
    if (url.protocol !== 'otpauth:') {
      addError.textContent = 'Invalid QR code. Please scan an authenticator QR code.';
      addError.style.color = '#dc2626';
      return;
    }
    const params = new URLSearchParams(url.search);
    const secret = params.get('secret');
    const issuer = params.get('issuer');
    const pathParts = decodeURIComponent(url.pathname).split('/');
    const label = pathParts[pathParts.length - 1] || '';
    let providerName = issuer || 'Unknown';
    let accountName = '';
    if (label.includes(':')) {
      const labelParts = label.split(':');
      if (!issuer) {
        providerName = labelParts[0];
      }
      accountName = labelParts.slice(1).join(':');
    } else {
      accountName = label;
    }
    if (!secret || secret.length < 16) {
      addError.textContent = 'Invalid secret in QR code.';
      addError.style.color = '#dc2626';
      return;
    }
    stopCamera();
    addAccountModal.style.display = 'none';
    await addAuthenticatorDirectly(providerName, accountName, secret);
  } catch (error) {
    addError.textContent = 'Could not parse QR code. Try manual entry.';
    addError.style.color = '#dc2626';
  }
}

async function addAuthenticatorDirectly(provider, accountName, secret) {
  // Add to UI and Firebase
  addAuthenticatorToUI(provider, accountName, secret);
  
  // Close modal and reset
  addAccountModal.style.display = 'none';
  providerNameInput.value = '';
  secretCodeInput.value = '';
  stopCamera();
  addError.textContent = '';
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
  videoElement.style.display = 'none';
  videoElement.srcObject = null;
  scanOverlay.style.display = 'none';
  scanActive = false;
  scanBtn.textContent = 'Scan QR';
}

addAuthenticatorBtn.addEventListener('click', () => {
  addError.textContent = '';
  addError.style.color = '#dc2626';
  const provider = providerNameInput.value.trim();
  const secret = secretCodeInput.value.trim().toUpperCase().replace(/\s/g, '');
  
  if (!provider || !secret) {
    addError.textContent = 'Provider name and secret code are required.';
    return;
  }
  if (secret.length < 16) {
    addError.textContent = 'Secret code must be at least 16 characters.';
    return;
  }
  if (!/^[A-Z2-7]+=*$/.test(secret)) {
    addError.textContent = 'Secret must be valid Base32 format (A-Z, 2-7).';
    return;
  }
  
  // Add to UI and Firebase
  addAuthenticatorToUI(provider, '', secret);
  
  // Close modal and reset
  addAccountModal.style.display = 'none';
  providerNameInput.value = '';
  secretCodeInput.value = '';
  stopCamera();
  addError.textContent = '';
});

// LOAD FROM CACHE INSTANTLY
function loadFromCache() {
  // Load authenticators from cache
  const cachedAuth = localStorage.getItem(APP_CACHE_KEY);
  if (cachedAuth) {
    try {
      const cached = JSON.parse(cachedAuth);
      authAccounts = cached.authenticators || [];
      filteredAccounts = authAccounts;
      sortAuthenticators();
      renderAuthenticators();
      updateTimers();
      console.log('✅ Loaded from cache instantly');
      return true;
    } catch (error) {
      console.error('Cache parse error:', error);
		renderAuthenticators();
      return false;
    }
  }
	renderAuthenticators();
  return false;
}

// CACHE DATA FOR NEXT TIME
function cacheAppData() {
  const dataToCache = {
    authenticators: authAccounts,
    timestamp: Date.now()
  };
  localStorage.setItem(APP_CACHE_KEY, JSON.stringify(dataToCache));
}

// DELAYED FIREBASE CONNECTION
function connectToFirebase() {
  if (firebaseConnected) return;
  
  console.log('🔄 Connecting to Firebase (delayed)...');
  firebaseConnected = true;
  
  // Load from Firebase and sync
  loadAccountsFromFirebase();
}

// SCHEDULE DELAYED CONNECTION (1.5-2 seconds)
function scheduleFirebaseConnection() {
  const delay = Math.random() * 500 + 1500; // 1.5-2 seconds
  
  firebaseConnectionTimer = setTimeout(() => {
    connectToFirebase();
  }, delay);
}

// loadAccounts to be cache-first
async function loadAccounts() {
  // Try cache first (instant)
  const loadedFromCache = loadFromCache();
  
  if (loadedFromCache) {
    // Show cached data immediately
    console.log('✅ App loaded from cache (instant)');
  }
  
  // Schedule delayed Firebase sync
  scheduleFirebaseConnection();
}

// Load from Firebase (called after delay)
async function loadAccountsFromFirebase() {
  if (!authUser) return;
  
  try {
    console.log('🔄 Syncing with Firebase...');
    
    const snapshot = await db.collection('authenticators')
      .where('uid', '==', authUser.uid)
      .orderBy('createdAt', 'desc')
      .get();

    const firebaseAccounts = [];
    snapshot.forEach((doc) => {
      firebaseAccounts.push({ id: doc.id, ...doc.data() });
    });

    // Check if data changed
    if (JSON.stringify(firebaseAccounts) !== JSON.stringify(authAccounts)) {
      console.log('📥 Updates found, refreshing...');
      authAccounts = firebaseAccounts;
      filteredAccounts = authAccounts;
      sortAuthenticators();
      renderAuthenticators();
      updateTimers();
    } else {
      console.log('✅ Already up to date');
    }

    // Cache the fresh data
    cacheAppData();
    
  } catch (error) {
    console.error('Firebase sync error:', error);
    // App continues working with cached data
  }
}

async function syncWithFirebase(user) {
  if (!user || !navigator.onLine) return;
  
  try {
    const serverSnapshot = await db.collection('authenticators')
      .where('uid', '==', user.uid)
      .orderBy('createdAt', 'desc')
      .get({ source: 'server' });
    
    const serverData = [];
    serverSnapshot.forEach((doc) => {
      serverData.push({ id: doc.id, ...doc.data() });
    });
    
    // Check if data is different
    const cacheIds = new Set(authAccounts.map(a => a.id));
    const serverIds = new Set(serverData.map(a => a.id));
    
    const isDifferent = authAccounts.length !== serverData.length ||
                       ![...serverIds].every(id => cacheIds.has(id)) ||
                       ![...cacheIds].every(id => serverIds.has(id));
    
    // Update UI if different
    if (isDifferent) {
      authAccounts = serverData;
      filteredAccounts = authAccounts;
      renderAuthenticators();
      updateTimers();
      
      if (pendingSync) {
        showNotification('Your data has been synced with database. Cheers!', 'synced');
        pendingSync = false;
      }
    }
  } catch (error) {
    console.log('Background sync failed:', error);
  }
}

// Helper function to generate random light color
function getRandomLightColor() {
  const hue = Math.floor(Math.random() * 360);
  return `hsl(${hue}, 70%, 85%)`;
}

async function performSilentBinCleanup(user) {
  if (!navigator.onLine || !user) return;

  try {
    const ninetyDaysAgo = new Date(Date.now() - (90 * 24 * 60 * 60 * 1000));
    
    // Query items that are older than 90 days
    const expiredSnapshot = await db.collection('deleted_authenticators')
      .where('uid', '==', user.uid)
      .where('deletedAt', '<=', ninetyDaysAgo)
      .get();

    if (expiredSnapshot.empty) return;

    // Delete them one by one or in a batch
    const batch = db.batch();
    expiredSnapshot.forEach(doc => {
      batch.delete(doc.ref);
    });

    await batch.commit();
    console.log(`Silent Cleanup: Removed ${expiredSnapshot.size} expired items.`);
  } catch (error) {
    console.error('Silent cleanup failed:', error);
  }
}

auth.onAuthStateChanged((user) => {  // No async here to avoid any await blocking
  if (!user) {
    // Clear all caches on logout
    localStorage.removeItem(APP_CACHE_KEY);
    sessionStorage.removeItem(AUTH_CACHE_KEY);
    window.location.href = 'login.html';
    return;
  }
  
  authUser = user;
  
  // Cache user data
  sessionStorage.setItem(AUTH_CACHE_KEY, JSON.stringify({
    uid: user.uid,
    email: user.email,
    displayName: user.displayName
  }));
  
  // Load cache IMMEDIATELY - no awaits, no reload blocking
  loadAccounts(user);
  
  // CHANGE 1: Fix display name - use displayName if available, otherwise email prefix
  const displayName = user.displayName || user.email.split('@')[0] || 'User';
  userNameEl.textContent = displayName;
  menuUserNameEl.textContent = displayName;
  
  // Set user avatar with first letter and random color
  const firstLetter = displayName.charAt(0).toUpperCase();
  userAvatarEl.textContent = firstLetter;
  userAvatarEl.style.backgroundColor = getRandomLightColor();
  
  // Silently refresh token in FAR background (non-blocking, online-only, 2s delay)
  setTimeout(() => {
    if (navigator.onLine && user) {
      user.reload().catch((error) => {
        console.warn('Token refresh failed (ignored):', error);  // Swallow - won't break app
      });
    }
	performSilentBinCleanup(user);
  }, 2000);
});

// === Network Status Indicator ===
const netStatus = document.getElementById('netStatus');

const onlineIcon = `
	<svg width="40" height="40" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
	  <circle cx="12" cy="12" r="10" stroke="#BFBFBF" stroke-width="1"/>                      
	  <circle cx="12" cy="17" r="1.7" fill="#6BD36B"/>
	  <path d="M8.5 14C10.8 12 13.2 12 15.5 14" stroke="#6BD36B" stroke-width="1.6" stroke-linecap="round"/>
	  <path d="M7 11C10.5 8 13.5 8 17 11" stroke="#6BD36B" stroke-width="1.6" stroke-linecap="round"/>
	  <path d="M5.8 8.5C9.5 5 14.5 5 18.2 8.5" stroke="#6BD36B" stroke-width="1.6" stroke-linecap="round"/>
	</svg>
`;

const offlineIcon = `
<svg width="40" height="40" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
  <circle cx="12" cy="12" r="10" stroke="#BFBFBF" stroke-width="1"/>  
  <circle cx="12" cy="17" r="1.7" fill="#FF7A7A"/>
  <path d="M8.5 14C10.8 12 13.2 12 15.5 14" stroke="#FF7A7A" stroke-width="1.6" stroke-linecap="round"/>
  <path d="M7 11C10.5 8 13.5 8 17 11" stroke="#FF7A7A" stroke-width="1.6" stroke-linecap="round"/>
  <path d="M5.8 8.5C9.5 5 14.5 5 18.2 8.5" stroke="#FF7A7A" stroke-width="1.6" stroke-linecap="round"/>  
  <line x1="6" y1="6" x2="17" y2="17" stroke="#FF7A7A" stroke-width="1.6" stroke-linecap="round"/>
</svg>
`;

function updateNetworkStatus() {
  netStatus.innerHTML = navigator.onLine ? onlineIcon : offlineIcon;
}

updateNetworkStatus();
window.addEventListener('online', updateNetworkStatus);
window.addEventListener('offline', updateNetworkStatus);

}
