console.log("Bridgefinity V2 loaded successfully.");

// Firebase configuration
const firebaseConfig = window.BRIDGEFINITY_FIREBASE_CONFIG || {
    apiKey: "YOUR_API_KEY",
    authDomain: "YOUR_PROJECT_ID.firebaseapp.com",
    projectId: "YOUR_PROJECT_ID",
    storageBucket: "YOUR_PROJECT_ID.appspot.com",
    messagingSenderId: "YOUR_MESSAGING_SENDER_ID",
    appId: "YOUR_APP_ID"
};

const SESSION_PROFILE_KEY = 'bridgefinitySessionProfile';
const VOLUNTEER_PROFILE_KEY = 'bridgefinityVolunteerProfile';
const OPPORTUNITY_COLLECTION = 'opportunities';
const FOLLOW_COLLECTION = 'follows';
const NOTIFICATION_COLLECTION = 'notifications';
const APPLICATION_COLLECTION = 'applications';
const APPLICATION_REQUEST_TIMEOUT_MS = 15000;
const EMAIL_SERVICE_CONFIG = window.BRIDGEFINITY_EMAIL_CONFIG || { enabled: false, endpoint: '', defaultFrom: 'noreply@bridgefinity.app' };

let auth = null;
let db = null;

function hasPlaceholderFirebaseConfig(config) {
    if (!config || typeof config !== 'object') {
        return true;
    }

    const requiredFields = ['apiKey', 'authDomain', 'projectId', 'storageBucket', 'messagingSenderId', 'appId'];
    return requiredFields.some((field) => {
        const value = config[field];
        return typeof value !== 'string' || value.trim() === '' || /YOUR_[A-Z_]+|PASTE_YOUR_FIREBASE_API_KEY/i.test(value);
    });
}

function ensureFirebaseReady() {
    if (hasPlaceholderFirebaseConfig(firebaseConfig)) {
        throw new Error('Firebase is not configured yet. Add your real Firebase project values in firebase-config.js before creating an account.');
    }

    if (!window.firebase) {
        throw new Error('Firebase SDK did not load. Check that the Firebase scripts are included on this page.');
    }

    if (!firebase.apps.length) {
        firebase.initializeApp(firebaseConfig);
    }

    auth = firebase.auth();
    db = firebase.firestore();

    if (auth && firebase.auth.Auth && firebase.auth.Auth.Persistence) {
        auth.setPersistence(firebase.auth.Auth.Persistence.LOCAL).catch(() => {});
    }

    return { auth, db };
}

try {
    if (window.firebase && !firebase.apps.length) {
        firebase.initializeApp(firebaseConfig);
    }
    auth = firebase.auth();
    db = firebase.firestore();
    if (auth && firebase.auth.Auth && firebase.auth.Auth.Persistence) {
        auth.setPersistence(firebase.auth.Auth.Persistence.LOCAL).catch(() => {});
    }
} catch (error) {
    console.error('Bridgefinity Firebase initialization failed:', error);
}

// Event data
const events = [
    {
        id: 1,
        icon: '🌱',
        type: 'ENVIRONMENT',
        title: 'Community Plantation Drive',
        description: 'Join volunteers in planting trees and promoting greener public spaces.',
        location: 'Nagpur',
        date: '20 September',
        volunteers: '25 Volunteers'
    },
    {
        id: 2,
        icon: '📚',
        type: 'EDUCATION',
        title: 'Weekend Teaching Support',
        description: 'Help school students with basic learning activities and educational support.',
        location: 'Nagpur',
        date: '25 September',
        volunteers: '15 Volunteers'
    },
    {
        id: 3,
        icon: '♻️',
        type: 'COMMUNITY',
        title: 'Clean Community Initiative',
        description: 'Participate in a community clean-up drive and promote responsible waste management.',
        location: 'Nagpur',
        date: '28 September',
        volunteers: '30 Volunteers'
    },
    {
        id: 4,
        icon: '❤️',
        type: 'SOCIAL WELFARE',
        title: 'Community Support Initiative',
        description: 'Support a local welfare initiative working towards helping members of the community.',
        location: 'Nagpur',
        date: '05 October',
        volunteers: '20 Volunteers'
    }
];

let currentFilter = 'All';

const defaultVolunteerProfile = {
    type: 'volunteer',
    role: 'volunteer',
    accountStatus: 'accepted',
    name: 'Aanya Sharma',
    email: 'aanya@example.com',
    location: 'Nagpur, Maharashtra',
    interests: ['Environment', 'Education', 'Community'],
    skills: 'Event support, teaching assistance, community outreach',
    availability: 'Weekends · 9:00 AM - 1:00 PM',
    preferences: {
        location: 'Nagpur, Wardha Road',
        cause: 'Environment and Education',
        days: 'Saturday, Sunday',
        time: 'Morning'
    },
    activity: {
        saved: ['Community Tree Plantation Drive', 'Neighbourhood Clean-up Drive', 'Weekend Learning Support'],
        registered: ['Teaching Support', 'Volunteer Orientation'],
        upcoming: ['Plantation Drive · Sat, 20 Sep', 'Reading Circle · Sun, 25 Sep'],
        past: ['School Supply Drive', 'Riverside Cleanup', 'Health Camp Support']
    }
};

function normalizeProfileRole(role) {
    return role === 'ngo' ? 'ngo' : 'volunteer';
}

function normalizeAccountStatus(role, status) {
    const safeRole = normalizeProfileRole(role);
    const acceptableStatuses = ['pending', 'accepted', 'rejected'];
    if (!acceptableStatuses.includes((status || '').toLowerCase())) {
        return safeRole === 'ngo' ? 'pending' : 'accepted';
    }
    return status.toLowerCase();
}

function buildNotificationRecord({ recipientUserId, notificationType, relatedNgoId, relatedOpportunityId, relatedApplicationId, message, read = false, createdAt = new Date().toISOString() }) {
    return {
        recipientUserId: recipientUserId || '',
        notificationType: notificationType || 'general',
        relatedNgoId: relatedNgoId || '',
        relatedOpportunityId: relatedOpportunityId || '',
        relatedApplicationId: relatedApplicationId || '',
        message: message || '',
        read,
        createdAt
    };
}

function getProfileType(profile) {
    if (!profile) return 'volunteer';
    const rawRole = profile.role || profile.type || 'volunteer';
    return normalizeProfileRole(rawRole);
}

function normalizeProfileData(profile) {
    if (!profile) return { ...defaultVolunteerProfile };

    const safeRole = getProfileType(profile);
    const normalized = {
        ...defaultVolunteerProfile,
        ...profile,
        role: safeRole,
        type: safeRole,
        accountStatus: normalizeAccountStatus(safeRole, profile.accountStatus || profile.status || (safeRole === 'ngo' ? 'pending' : 'accepted')),
        status: normalizeAccountStatus(safeRole, profile.accountStatus || profile.status || (safeRole === 'ngo' ? 'pending' : 'accepted'))
    };

    normalized.preferences = {
        ...(defaultVolunteerProfile.preferences || {}),
        ...(profile.preferences || {})
    };

    normalized.activity = {
        ...(defaultVolunteerProfile.activity || {}),
        ...(profile.activity || {})
    };

    if (safeRole === 'ngo') {
        normalized.organizationName = profile.organizationName || profile.name || 'Organisation';
        normalized.name = profile.name || normalized.organizationName;
        normalized.location = profile.location || profile.city || 'Nagpur, Maharashtra';
        normalized.city = profile.city || normalized.location;
        normalized.causes = Array.isArray(profile.causes) && profile.causes.length ? profile.causes : (profile.categories || (profile.organizationType ? [profile.organizationType] : ['Community']));
        normalized.description = profile.description || 'Community-first organisation';
        normalized.contactPhone = profile.contactPhone || profile.phone || '';
        normalized.contactEmail = profile.contactEmail || profile.email || '';
        normalized.organizationType = profile.organizationType || (Array.isArray(normalized.causes) && normalized.causes[0]) || 'Community';
    }

    return normalized;
}

function normalizeOpportunity(opportunity) {
    if (!opportunity) return null;

    return {
        id: opportunity.id || '',
        title: opportunity.title || 'Volunteer opportunity',
        description: opportunity.description || 'A meaningful volunteering opportunity.',
        category: opportunity.category || 'Community',
        location: opportunity.location || 'Nagpur',
        date: opportunity.date || '',
        time: opportunity.time || '',
        duration: opportunity.duration || 'Flexible',
        volunteersNeeded: Number(opportunity.volunteersNeeded || 0),
        organizerId: opportunity.organizerId || opportunity.ngoId || opportunity.createdBy || '',
        organizerName: opportunity.organizerName || opportunity.ngoName || 'Bridgefinity NGO',
        createdBy: opportunity.createdBy || opportunity.organizerId || '',
        createdAt: opportunity.createdAt || new Date().toISOString(),
        status: opportunity.status || 'active'
    };
}

function isValidEmailAddress(value) {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(value || '').trim());
}

function getFirebaseActionError(error, action) {
    const code = error?.code || '';
    const messages = {
        'auth/configuration-not-found': 'Firebase Authentication is not enabled for this project. Enable Email/Password in Firebase Console under Authentication > Sign-in method.',
        'auth/operation-not-allowed': 'Email/password sign-in is disabled. Enable it in Firebase Console under Authentication > Sign-in method.',
        'auth/email-already-in-use': 'This email is already registered. Please log in instead.',
        'auth/invalid-email': 'Please enter a valid email address.',
        'auth/weak-password': 'Choose a stronger password with at least 6 characters.',
        'auth/invalid-credential': 'Email or password is incorrect. Check both and try again.',
        'auth/invalid-login-credentials': 'Email or password is incorrect. Check both and try again.',
        'auth/user-not-found': 'Email or password is incorrect. Check both and try again.',
        'auth/wrong-password': 'Email or password is incorrect. Check both and try again.',
        'auth/too-many-requests': 'Too many attempts. Please wait a while and try again.',
        'auth/network-request-failed': 'Could not reach Firebase. Check your internet connection and try again.',
        'auth/invalid-api-key': 'Firebase rejected the API key. Check the Firebase web app settings in firebase-config.js.',
        'auth/unauthorized-domain': 'This website domain is not authorized in Firebase Authentication settings.',
        'auth/app-not-authorized': 'This Firebase app is not authorized to use Authentication. Check the project and API key settings.'
    };

    if (code === 'permission-denied' || code === 'firestore/permission-denied') {
        return 'Firebase Firestore denied access to the account profile. Check that Firestore is enabled and its rules are published.';
    }

    return messages[code] || `Unable to ${action}${code ? ` (Firebase error: ${code})` : ''}. Please try again.`;
}

function validateRequiredInput(label, value) {
    const safeValue = String(value || '').trim();
    if (!safeValue) {
        return `${label} is required.`;
    }
    return '';
}

function validateOpportunityPayload(opportunity) {
    const errors = [];
    const titleError = validateRequiredInput('Opportunity title', opportunity?.title);
    const descriptionError = validateRequiredInput('Opportunity description', opportunity?.description);
    const locationError = validateRequiredInput('Opportunity location', opportunity?.location);
    const dateError = validateRequiredInput('Opportunity date', opportunity?.date);
    const timeError = validateRequiredInput('Opportunity time', opportunity?.time);
    const volunteerCountError = Number(opportunity?.volunteersNeeded || 0) > 0 ? '' : 'Please add at least 1 volunteer slot.';

    if (titleError) errors.push(titleError);
    if (descriptionError) errors.push(descriptionError);
    if (locationError) errors.push(locationError);
    if (dateError) errors.push(dateError);
    if (timeError) errors.push(timeError);
    if (volunteerCountError) errors.push(volunteerCountError);

    return errors;
}

async function sendBridgefinityEmail({ to, name, subject, template, accountType, eventType, message }) {
    if (!EMAIL_SERVICE_CONFIG.enabled || !EMAIL_SERVICE_CONFIG.endpoint) {
        return { sent: false, message: 'Email delivery is disabled because no secure backend endpoint is configured.' };
    }

    if (!to || !isValidEmailAddress(to)) {
        return { sent: false, message: 'A valid email address is required before an email can be sent.' };
    }

    try {
        const headers = { 'Content-Type': 'application/json' };
        if (auth && auth.currentUser) {
            const idToken = await auth.currentUser.getIdToken().catch(() => null);
            if (idToken) {
                headers.Authorization = `Bearer ${idToken}`;
            }
        }

        const response = await fetch(EMAIL_SERVICE_CONFIG.endpoint, {
            method: 'POST',
            headers,
            body: JSON.stringify({
                to,
                name: name || 'Bridgefinity user',
                subject,
                template,
                accountType: accountType || 'user',
                eventType: eventType || 'general',
                message,
                from: EMAIL_SERVICE_CONFIG.defaultFrom || 'noreply@bridgefinity.app',
                source: 'Bridgefinity static frontend'
            })
        });

        const payload = await response.json().catch(() => ({}));
        if (!response.ok || !payload.sent) {
            const reason = payload.message || `Email service rejected the request with status ${response.status}.`;
            return { sent: false, message: reason };
        }

        return { sent: true, message: payload.message || 'Email confirmation received from the backend.' };
    } catch (error) {
        console.warn('Email service unavailable:', error);
        return { sent: false, message: 'Email service was unavailable, so no email guarantee can be made.' };
    }
}

async function fetchAllOpportunities() {
    if (!db) return null;

    try {
        const snapshot = await db.collection(OPPORTUNITY_COLLECTION).orderBy('createdAt', 'desc').get();
        return snapshot.docs.map(doc => normalizeOpportunity({ ...doc.data(), id: doc.id }));
    } catch (error) {
        console.error('Unable to load opportunities:', error);
        return null;
    }
}

async function getFollowState(ngoUid) {
    if (!auth || !auth.currentUser || !ngoUid || !db) return false;
    try {
        const docId = `${auth.currentUser.uid}_${ngoUid}`;
        const doc = await db.collection(FOLLOW_COLLECTION).doc(docId).get();
        return doc.exists;
    } catch (error) {
        console.error('Unable to load follow state:', error);
        return false;
    }
}

async function getFollowingForVolunteer(volunteerUid) {
    if (!db || !volunteerUid) return [];
    try {
        const snapshot = await db.collection(FOLLOW_COLLECTION).where('volunteerUid', '==', volunteerUid).get();
        return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    } catch (error) {
        console.error('Unable to load following list:', error);
        return [];
    }
}

async function getFollowersForNgo(ngoUid) {
    if (!db || !ngoUid) return [];
    try {
        const snapshot = await db.collection(FOLLOW_COLLECTION).where('ngoUid', '==', ngoUid).get();
        return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    } catch (error) {
        console.error('Unable to load NGO followers:', error);
        return [];
    }
}

async function toggleFollowOrganisation(ngoUid, ngoName) {
    if (!auth || !auth.currentUser || !db || !ngoUid) {
        if (window.location.pathname.endsWith('profile.html')) {
            window.location.href = 'index.html#login';
        }
        return;
    }

    if (auth.currentUser.uid === ngoUid) {
        return;
    }

    const docId = `${auth.currentUser.uid}_${ngoUid}`;
    const docRef = db.collection(FOLLOW_COLLECTION).doc(docId);

    try {
        const existing = await docRef.get();
        if (existing.exists) {
            await docRef.delete();
            if (document.getElementById('followOrganisationButton')) {
                document.getElementById('followOrganisationButton').textContent = 'Follow Organisation';
            }
            return;
        }

        await docRef.set({
            volunteerUid: auth.currentUser.uid,
            ngoUid,
            ngoName: ngoName || 'Bridgefinity NGO',
            createdAt: new Date().toISOString(),
            status: 'following'
        });

        if (document.getElementById('followOrganisationButton')) {
            document.getElementById('followOrganisationButton').textContent = 'Following ✓';
        }
    } catch (error) {
        console.error('Unable to update follow status:', error);
    }
}

function showMessage(elementId, message) {
    const box = document.getElementById(elementId);
    if (!box) return;
    box.textContent = message;
}

function clearMessage(elementId) {
    const box = document.getElementById(elementId);
    if (!box) return;
    box.textContent = '';
}

function saveSessionProfile(profile) {
    if (!profile) return;
    const normalized = normalizeProfileData(profile);
    localStorage.setItem(SESSION_PROFILE_KEY, JSON.stringify(normalized));
}

function getSessionProfile() {
    try {
        const saved = localStorage.getItem(SESSION_PROFILE_KEY);
        if (!saved) return null;
        return normalizeProfileData(JSON.parse(saved));
    } catch (error) {
        return null;
    }
}

function clearSessionProfile() {
    localStorage.removeItem(SESSION_PROFILE_KEY);
    localStorage.removeItem(VOLUNTEER_PROFILE_KEY);
}

function hasVolunteerProfile() {
    return Boolean(auth && auth.currentUser) || Boolean(getSessionProfile());
}

function getVolunteerProfile() {
    const savedSession = getSessionProfile();
    if (!savedSession) {
        return normalizeProfileData({ ...defaultVolunteerProfile });
    }
    return normalizeProfileData(savedSession);
}

function saveVolunteerProfile(profile) {
    const normalized = normalizeProfileData(profile);
    localStorage.setItem(VOLUNTEER_PROFILE_KEY, JSON.stringify(normalized));
    saveSessionProfile(normalized);
    return normalized;
}

function getFirstName(fullName) {
    return (fullName || 'Volunteer').trim().split(' ')[0] || 'Volunteer';
}

function getProfileDisplayName(profile) {
    if (!profile) return 'Volunteer';
    if (profile.type === 'ngo') {
        return profile.organizationName || profile.name || 'Organization';
    }
    return profile.name || 'Volunteer';
}

async function fetchUserProfile(uid) {
    if (!db || !uid) return null;
    try {
        const docRef = db.collection('users').doc(uid);
        const snapshot = await docRef.get();
        return snapshot.exists ? normalizeProfileData(snapshot.data()) : null;
    } catch (error) {
        return null;
    }
}

async function upsertUserProfile(profile) {
    if (!db || !profile || !profile.uid) return profile;

    const normalized = normalizeProfileData(profile);
    const cleanProfile = {
        ...normalized,
        uid: normalized.uid,
        type: normalized.type,
        role: normalized.role,
        accountStatus: normalized.accountStatus,
        status: normalized.accountStatus,
        updatedAt: new Date().toISOString()
    };

    try {
        const profileWrite = db.collection('users').doc(cleanProfile.uid).set(cleanProfile, { merge: true });
        const timeout = new Promise((_, reject) => {
            window.setTimeout(() => reject(new Error('Firestore profile write timed out.')),
                8000);
        });
        await Promise.race([profileWrite, timeout]);
        return cleanProfile;
    } catch (error) {
        // Firebase Authentication is independent from Firestore. Keep the account usable
        // when the browser blocks the Firestore network channel or the profile write is denied.
        console.warn('Profile persistence skipped:', error.code || error.message || error);
        return cleanProfile;
    }
}

async function hydrateCurrentUserProfile(user, fallbackProfile = null) {
    if (!user || !user.uid) {
        return normalizeProfileData(fallbackProfile || getSessionProfile() || defaultVolunteerProfile);
    }

    const storedDoc = await fetchUserProfile(user.uid);
    if (storedDoc) {
        saveSessionProfile(storedDoc);
        return storedDoc;
    }

    const baseProfile = normalizeProfileData(fallbackProfile || getSessionProfile() || {
        uid: user.uid,
        email: user.email || '',
        name: user.displayName || (user.email ? user.email.split('@')[0] : 'Volunteer'),
        role: 'volunteer',
        type: 'volunteer',
        accountStatus: 'accepted'
    });

    const finalProfile = { ...baseProfile, uid: user.uid, email: user.email || baseProfile.email || '' };
    const savedProfile = await upsertUserProfile(finalProfile);
    saveSessionProfile(savedProfile);
    return savedProfile;
}

function setupAuthUI() {
    const loginButton = document.querySelector('[data-login-open]');
    const userMenu = document.querySelector('[data-user-menu]');
    const userName = document.querySelector('[data-user-name]');
    const logoutButtons = document.querySelectorAll('[data-logout]');
    const trigger = document.querySelector('[data-user-trigger]');
    const currentUser = auth ? auth.currentUser : null;
    const savedProfile = getSessionProfile();
    const profile = savedProfile || getVolunteerProfile();
    const isLoggedIn = Boolean(currentUser || savedProfile);

    if (loginButton && userMenu && userName) {
        loginButton.hidden = isLoggedIn;
        userMenu.classList.toggle('is-visible', isLoggedIn);
        userName.textContent = getFirstName(getProfileDisplayName(profile));
    }

    if (trigger) {
        trigger.onclick = () => {
            const menu = trigger.closest('.nav-user-menu');
            if (!menu) return;
            menu.classList.toggle('is-open');
        };
    }

    logoutButtons.forEach(button => {
        button.onclick = async () => {
            if (auth) {
                try {
                    await auth.signOut();
                } catch (error) {
                    console.error('Logout failed:', error);
                }
            }
            clearSessionProfile();
            if (window.location.pathname.endsWith('profile.html')) {
                window.location.href = 'index.html';
                return;
            }
            window.location.reload();
        };
    });

    document.addEventListener('click', (event) => {
        const userMenuElement = document.querySelector('.nav-user-menu');
        if (!userMenuElement) return;
        if (!userMenuElement.contains(event.target) && userMenuElement.classList.contains('is-open')) {
            userMenuElement.classList.remove('is-open');
        }
    });
}

function renderProfilePage() {
    const profile = normalizeProfileData(getSessionProfile() || getVolunteerProfile());
    const isNgoProfile = getProfileType(profile) === 'ngo';
    const pageName = document.querySelector('[data-profile-name]');
    const pageNameDetail = document.querySelector('[data-profile-name-detail]');
    const pageEmail = document.querySelector('[data-profile-email]');
    const pageLocation = document.querySelector('[data-profile-location]');
    const pageInterests = document.querySelector('[data-profile-interests]');
    const pageSkills = document.querySelector('[data-profile-skills]');
    const pageAvailability = document.querySelector('[data-profile-availability]');
    const pagePrefLocation = document.querySelector('[data-preference-location]');
    const pagePrefCause = document.querySelector('[data-preference-cause]');
    const pagePrefDays = document.querySelector('[data-preference-days]');
    const pagePrefTime = document.querySelector('[data-preference-time]');
    const savedList = document.querySelector('[data-activity-saved]');
    const registeredList = document.querySelector('[data-activity-registered]');
    const upcomingList = document.querySelector('[data-activity-upcoming]');
    const pastList = document.querySelector('[data-activity-past]');
    const pageTag = document.querySelector('.profile-hero .small-heading');
    const pageIntro = document.querySelector('.profile-intro');
    const ngoOpportunityCard = document.getElementById('ngoOpportunityManager');
    const notificationsCard = document.getElementById('notificationsCard');
    const followedCard = document.getElementById('followedOrganisations');
    const myApplicationsCard = document.getElementById('myApplicationsCard');
    const ngoApplicationsCard = document.getElementById('ngoApplicationsCard');

    if (ngoOpportunityCard) ngoOpportunityCard.style.display = isNgoProfile ? 'block' : 'none';
    if (notificationsCard) notificationsCard.style.display = 'block';
    if (followedCard) followedCard.style.display = isNgoProfile ? 'none' : 'block';
    if (myApplicationsCard) myApplicationsCard.style.display = isNgoProfile ? 'none' : 'block';
    if (ngoApplicationsCard) ngoApplicationsCard.style.display = isNgoProfile ? 'block' : 'none';

    const genericName = isNgoProfile ? (profile.organizationName || profile.name || 'Organisation') : (profile.name || 'Volunteer');
    const genericLocation = isNgoProfile ? (profile.location || profile.city || 'City not added') : (profile.location || 'Nagpur, Maharashtra');
    const genericInterestChips = isNgoProfile
        ? (profile.causes && profile.causes.length ? profile.causes : [profile.organizationType || 'Community'])
        : (profile.interests || ['Environment']);

    if (pageTag) pageTag.textContent = isNgoProfile ? 'NGO DASHBOARD' : 'VOLUNTEER DASHBOARD';
    if (pageIntro) pageIntro.textContent = isNgoProfile ? 'Manage your organisation, opportunities and community engagement.' : 'Find opportunities that fit your interests, location and availability.';
    if (pageName) pageName.textContent = genericName;
    if (pageNameDetail) pageNameDetail.textContent = genericName;
    if (pageEmail) pageEmail.textContent = profile.email || 'not provided';
    if (pageLocation) pageLocation.textContent = genericLocation;
    if (pageInterests) pageInterests.innerHTML = genericInterestChips.map(item => `<span>${item}</span>`).join('');
    if (pageSkills) pageSkills.textContent = isNgoProfile ? (`${profile.description || 'Community-focused organisation'} · ${profile.organizationType || 'NGO'}`) : (profile.skills || 'Community engagement, hands-on volunteering, project support');
    if (pageAvailability) pageAvailability.textContent = isNgoProfile ? `Account status: ${profile.accountStatus || 'pending'}` : (profile.availability || 'Flexible');
    if (pagePrefLocation) pagePrefLocation.textContent = isNgoProfile ? (profile.location || profile.city || 'Community') : (profile.preferences?.location || 'Nagpur, Wardha Road');
    if (pagePrefCause) pagePrefCause.textContent = isNgoProfile ? (profile.organizationType || 'Community support') : (profile.preferences?.cause || 'Environment and Education');
    if (pagePrefDays) pagePrefDays.textContent = isNgoProfile ? (profile.contactPhone || 'Contact details available on request') : (profile.preferences?.days || 'Weekends');
    if (pagePrefTime) pagePrefTime.textContent = isNgoProfile ? (profile.contactEmail || 'hello@ngo.org') : (profile.preferences?.time || 'Morning');

    const renderList = (target, items) => {
        if (!target) return;
        const safeItems = Array.isArray(items) ? items : [];
        target.innerHTML = safeItems.map(item => `<li>${item}</li>`).join('');
    };

    renderList(savedList, isNgoProfile ? (profile.activity?.opportunities || []) : (profile.activity?.saved || []));
    renderList(registeredList, isNgoProfile ? (profile.activity?.volunteers || []) : (profile.activity?.registered || []));
    renderList(upcomingList, isNgoProfile ? (profile.activity?.upcoming || []) : (profile.activity?.upcoming || []));
    renderList(pastList, isNgoProfile ? (profile.activity?.past || []) : (profile.activity?.past || []));

    const ngoDashboardList = document.querySelector('[data-ngo-opportunity-list]');
    if (ngoDashboardList) {
        if (!isNgoProfile) {
            ngoDashboardList.innerHTML = '<li>NGO tools are available only for organisation accounts.</li>';
        } else {
            setupNgoDashboardListener();
        }
    }

    if (!isNgoProfile) {
        setupVolunteerApplicationsListener();
    } else {
        setupNgoApplicationsListener();
    }
}

async function updateAuthState(user) {
    if (!user) {
        clearSessionProfile();
        setupAuthUI();
        return;
    }

    const existingProfile = getSessionProfile();
    const fallbackProfile = existingProfile || {
        uid: user.uid,
        role: 'volunteer',
        type: 'volunteer',
        accountStatus: 'accepted',
        name: user.displayName || user.email?.split('@')[0] || 'Volunteer',
        email: user.email || '',
        location: 'Nagpur, Maharashtra',
        interests: ['Environment'],
        availability: 'Flexible',
        activity: {
            saved: [],
            registered: [],
            upcoming: [],
            past: []
        },
        preferences: {
            location: 'Nagpur, Wardha Road',
            cause: 'Environment and Education',
            days: 'Weekends',
            time: 'Morning'
        }
    };

    const profile = await hydrateCurrentUserProfile(user, fallbackProfile);
    saveSessionProfile(profile);
    setupAuthUI();
    setupNotificationListener();
    setupNgoDashboardListener();
}

function setupFirebaseAuthListener() {
    if (!auth) return;
    auth.onAuthStateChanged((user) => {
        updateAuthState(user);
    });
}

// Initialize on page load
document.addEventListener('DOMContentLoaded', function() {
    setupFirebaseAuthListener();
    setupAuthUI();
    setupFilterButtons();
    setupSearchInput();
    setupOpportunityDetails();
    setupFAQ();
    setupNewsletter();
    setupScrollAnimations();
    setupStatisticCounter();
    setupLiveImpactRadar();
    setupButtonFeedback();
    setupLoginPanel();
    setupRegistrationForm();
    setupNgoRegistration();
    setupResearchModal();
    setupProfileForm();
    setupNgoOpportunityForm();
    renderProfilePage();
    renderFollowedOrganizations();
    if (document.querySelector('.events-container')) {
        loadOpportunities();
    }
    if (document.querySelector('[data-notification-list]') || document.querySelector('[data-ngo-opportunity-list]')) {
        setupNotificationListener();
        setupNgoDashboardListener();
    }
});

function setupNgoRegistration() {
    const overlay = document.querySelector('.ngo-overlay');
    const openButton = document.querySelector('[data-ngo-open]');
    const closeButton = document.querySelector('[data-ngo-close]');
    const doneButton = document.querySelector('[data-ngo-done]');
    const form = document.getElementById('ngoForm');
    const success = document.getElementById('ngoSuccess');

    if (!overlay || !openButton || !closeButton || !doneButton || !form || !success) return;

    if (!success.querySelector('.success-badge')) {
        const badge = document.createElement('div');
        badge.className = 'success-badge';
        badge.setAttribute('aria-hidden', 'true');
        badge.textContent = '🎉';
        success.prepend(badge);
    }

    form.hidden = false;
    success.hidden = true;

    const closePanel = () => {
        overlay.classList.remove('is-open');
        overlay.setAttribute('aria-hidden', 'true');
        document.body.classList.remove('modal-open');
        window.setTimeout(() => {
            form.hidden = false;
            success.hidden = true;
            form.reset();
        }, 300);
    };

    const openPanel = event => {
        event.preventDefault();
        overlay.classList.add('is-open');
        overlay.setAttribute('aria-hidden', 'false');
        document.body.classList.add('modal-open');
        window.setTimeout(() => document.getElementById('ngoName').focus(), 250);
    };

    openButton.addEventListener('click', openPanel);
    closeButton.addEventListener('click', closePanel);
    doneButton.addEventListener('click', () => { window.location.href = 'profile.html'; });
    overlay.addEventListener('click', event => { if (event.target === overlay) closePanel(); });
    document.addEventListener('keydown', event => { if (event.key === 'Escape' && overlay.classList.contains('is-open')) closePanel(); });
    form.addEventListener('submit', async (event) => {
        event.preventDefault();

        try {
            ensureFirebaseReady();
        } catch (error) {
            showMessage('ngoError', error.message || 'Firebase is not configured yet. Add your Firebase settings in firebase-config.js.');
            return;
        }

        const name = document.getElementById('ngoName').value.trim();
        const email = document.getElementById('ngoEmail').value.trim();
        const phone = document.getElementById('ngoPhone').value.trim();
        const city = document.getElementById('ngoLocation').value.trim();
        const organizationType = document.getElementById('ngoArea').value.trim();
        const password = document.getElementById('ngoPassword').value;

        if (!name || !email || !phone || !city || !organizationType || !password) {
            showMessage('ngoError', 'Please complete all NGO fields before creating your account.');
            return;
        }

        if (password.length < 6) {
            showMessage('ngoError', 'Password must be at least 6 characters long.');
            return;
        }

        const submitButton = form.querySelector('button[type="submit"]');
        const originalButtonMarkup = submitButton?.innerHTML || '';
        if (submitButton) {
            submitButton.disabled = true;
            submitButton.textContent = 'Creating NGO account...';
        }

        try {
            const userCredential = await auth.createUserWithEmailAndPassword(email, password);
            submitButton.textContent = 'Sending verification email...';
            await userCredential.user.updateProfile({ displayName: name });
            let verificationEmailSent = true;
            try {
                await userCredential.user.sendEmailVerification();
            } catch (verificationError) {
                verificationEmailSent = false;
                console.error('NGO verification email failed:', verificationError);
            }

            submitButton.textContent = 'Saving organization profile...';
            const ngoProfile = {
                uid: userCredential.user.uid,
                type: 'ngo',
                role: 'ngo',
                organizationName: name,
                name: name,
                email,
                city,
                location: city,
                phone,
                contactPhone: phone,
                contactEmail: email,
                organizationType,
                causes: [organizationType],
                description: 'Community organisation looking to connect with volunteers.',
                accountStatus: 'pending',
                status: 'pending',
                createdAt: new Date().toISOString(),
                activity: {
                    opportunities: [],
                    volunteers: [],
                    upcoming: [],
                    past: []
                },
                notificationPreferences: {
                    email: true,
                    inApp: true
                }
            };

            const savedProfile = await upsertUserProfile(ngoProfile);
            saveSessionProfile(savedProfile);
            form.hidden = true;
            success.hidden = false;
            const verificationNotice = success.querySelector('p');
            doneButton.textContent = 'Continue to profile';
            if (verificationNotice) {
                verificationNotice.textContent = verificationEmailSent
                    ? `We sent a verification link to ${email}. Check your inbox and spam folder.`
                    : `Your account was created, but Firebase could not send a verification email to ${email}. Please contact support.`;
            }
        } catch (error) {
            showMessage('ngoError', getFirebaseActionError(error, 'create your NGO account'));
        } finally {
            if (submitButton) {
                submitButton.disabled = false;
                submitButton.innerHTML = originalButtonMarkup;
            }
        }
    });
}

function renderProfileForm(profile) {
    const form = document.getElementById('profileForm');
    if (!form) return;

    const safeProfile = normalizeProfileData(profile || getSessionProfile() || getVolunteerProfile());
    const isNgoProfile = getProfileType(safeProfile) === 'ngo';

    form.innerHTML = isNgoProfile ? `
        <div class="profile-form-grid">
            <label>
                <span>Organisation Name</span>
                <input type="text" name="organizationName" value="${(safeProfile.organizationName || '').replace(/"/g, '&quot;')}" required>
            </label>
            <label>
                <span>Email</span>
                <input type="email" name="email" value="${(safeProfile.email || '').replace(/"/g, '&quot;')}" required>
            </label>
            <label>
                <span>Location</span>
                <input type="text" name="location" value="${(safeProfile.location || '').replace(/"/g, '&quot;')}" required>
            </label>
            <label>
                <span>Causes / Categories</span>
                <input type="text" name="causes" value="${(Array.isArray(safeProfile.causes) ? safeProfile.causes.join(', ') : (safeProfile.organizationType || 'Community')).replace(/"/g, '&quot;')}" required>
            </label>
            <label>
                <span>Contact Phone</span>
                <input type="tel" name="contactPhone" value="${(safeProfile.contactPhone || '').replace(/"/g, '&quot;')}" placeholder="+91 98765 43210">
            </label>
            <label>
                <span>Account Status</span>
                <select name="accountStatus">
                    <option value="pending" ${safeProfile.accountStatus === 'pending' ? 'selected' : ''}>Pending</option>
                    <option value="accepted" ${safeProfile.accountStatus === 'accepted' ? 'selected' : ''}>Accepted</option>
                    <option value="rejected" ${safeProfile.accountStatus === 'rejected' ? 'selected' : ''}>Rejected</option>
                </select>
            </label>
            <label class="full-width">
                <span>Description</span>
                <textarea name="description" rows="3" required>${(safeProfile.description || '').replace(/</g, '&lt;').replace(/>/g, '&gt;')}</textarea>
            </label>
        </div>
        <button type="submit" class="primary-btn form-submit">Save Changes</button>
    ` : `
        <div class="profile-form-grid">
            <label>
                <span>Full Name</span>
                <input type="text" name="name" value="${(safeProfile.name || '').replace(/"/g, '&quot;')}" required>
            </label>
            <label>
                <span>Email</span>
                <input type="email" name="email" value="${(safeProfile.email || '').replace(/"/g, '&quot;')}" required>
            </label>
            <label>
                <span>City / Location</span>
                <input type="text" name="location" value="${(safeProfile.location || '').replace(/"/g, '&quot;')}" required>
            </label>
            <label>
                <span>Areas of Interest</span>
                <input type="text" name="interests" value="${(Array.isArray(safeProfile.interests) ? safeProfile.interests.join(', ') : '').replace(/"/g, '&quot;')}" required>
            </label>
            <label class="full-width">
                <span>Skills / Interests</span>
                <textarea name="skills" rows="3" required>${(safeProfile.skills || '').replace(/</g, '&lt;').replace(/>/g, '&gt;')}</textarea>
            </label>
            <label class="full-width">
                <span>Availability</span>
                <input type="text" name="availability" value="${(safeProfile.availability || '').replace(/"/g, '&quot;')}" required>
            </label>
            <label>
                <span>Preferred location</span>
                <input type="text" name="prefLocation" value="${((safeProfile.preferences && safeProfile.preferences.location) || '').replace(/"/g, '&quot;')}" required>
            </label>
            <label>
                <span>Preferred cause</span>
                <input type="text" name="prefCause" value="${((safeProfile.preferences && safeProfile.preferences.cause) || '').replace(/"/g, '&quot;')}" required>
            </label>
            <label>
                <span>Preferred days</span>
                <input type="text" name="prefDays" value="${((safeProfile.preferences && safeProfile.preferences.days) || '').replace(/"/g, '&quot;')}" required>
            </label>
            <label>
                <span>Preferred time</span>
                <input type="text" name="prefTime" value="${((safeProfile.preferences && safeProfile.preferences.time) || '').replace(/"/g, '&quot;')}" required>
            </label>
        </div>
        <button type="submit" class="primary-btn form-submit">Save Changes</button>
    `;
}

function setupProfileForm() {
    const form = document.getElementById('profileForm');
    if (!form) return;

    const toggleCard = document.querySelector('[data-profile-edit]');
    const formCard = document.querySelector('.profile-form-card');

    if (toggleCard && formCard) {
        toggleCard.addEventListener('click', () => {
            formCard.classList.toggle('is-collapsed');
            const isCollapsed = formCard.classList.contains('is-collapsed');
            toggleCard.textContent = isCollapsed ? 'Edit Profile' : 'Hide Form';
        });
    }

    renderProfileForm(getSessionProfile() || getVolunteerProfile());

    const currentForm = document.getElementById('profileForm');
    if (!currentForm) return;

    currentForm.addEventListener('submit', async (event) => {
        event.preventDefault();
        const formData = new FormData(currentForm);
        const profile = normalizeProfileData(getSessionProfile() || getVolunteerProfile());
        const isNgoProfile = getProfileType(profile) === 'ngo';

        if (isNgoProfile) {
            profile.organizationName = String(formData.get('organizationName') || profile.organizationName || profile.name).trim();
            profile.name = profile.organizationName;
            profile.email = String(formData.get('email') || profile.email).trim();
            profile.location = String(formData.get('location') || profile.location).trim();
            profile.city = profile.location;
            profile.causes = String(formData.get('causes') || '').split(',').map(item => item.trim()).filter(Boolean) || profile.causes || [profile.organizationType || 'Community'];
            profile.organizationType = profile.causes[0] || profile.organizationType || 'Community';
            profile.description = String(formData.get('description') || profile.description).trim();
            profile.contactPhone = String(formData.get('contactPhone') || profile.contactPhone || '').trim();
            profile.accountStatus = normalizeAccountStatus('ngo', String(formData.get('accountStatus') || profile.accountStatus || 'pending'));
            profile.status = profile.accountStatus;
        } else {
            const interestsValue = String(formData.get('interests') || '').split(',').map(item => item.trim()).filter(Boolean);
            profile.name = String(formData.get('name') || profile.name).trim();
            profile.email = String(formData.get('email') || profile.email).trim();
            profile.location = String(formData.get('location') || profile.location).trim();
            profile.interests = interestsValue.length ? interestsValue : (profile.interests || ['Environment']);
            profile.skills = String(formData.get('skills') || profile.skills).trim();
            profile.availability = String(formData.get('availability') || profile.availability).trim();
            profile.preferences = {
                ...profile.preferences,
                location: String(formData.get('prefLocation') || profile.preferences?.location || '').trim(),
                cause: String(formData.get('prefCause') || profile.preferences?.cause || '').trim(),
                days: String(formData.get('prefDays') || profile.preferences?.days || '').trim(),
                time: String(formData.get('prefTime') || profile.preferences?.time || '').trim()
            };
            profile.accountStatus = normalizeAccountStatus('volunteer', profile.accountStatus || 'accepted');
            profile.status = profile.accountStatus;
        }

        profile.uid = auth && auth.currentUser ? auth.currentUser.uid : (profile.uid || getSessionProfile()?.uid || '');
        const finalProfile = await upsertUserProfile(profile);
        saveVolunteerProfile(finalProfile);
        renderProfilePage();
        renderProfileForm(finalProfile);
        setupAuthUI();
        currentForm.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    });
}

async function renderFollowedOrganizations() {
    const list = document.querySelector('[data-followed-ngos-list]');
    if (!list) return;

    if (!auth || !auth.currentUser || !db) {
        list.innerHTML = '<li>Login to view organisations you follow.</li>';
        return;
    }

    const followRecords = await getFollowingForVolunteer(auth.currentUser.uid);
    if (!followRecords.length) {
        list.innerHTML = '<li>No organisations followed yet.</li>';
        return;
    }

    const ngoIds = followRecords.map(item => item.ngoUid).filter(Boolean);
    if (!ngoIds.length) {
        list.innerHTML = '<li>No organisations followed yet.</li>';
        return;
    }

    const ngoPromises = ngoIds.map(async (ngoUid) => {
        const profile = await fetchUserProfile(ngoUid);
        const opportunitySnapshot = await db.collection(OPPORTUNITY_COLLECTION).where('organizerId', '==', ngoUid).get();
        const activeOpportunities = opportunitySnapshot.docs.length;
        return {
            ...profile,
            organizationName: profile?.organizationName || profile?.name || 'Organisation',
            description: profile?.description || 'Community-focused organisation',
            opportunityCount: activeOpportunities,
            uid: ngoUid
        };
    });

    const ngos = await Promise.all(ngoPromises);
    list.innerHTML = ngos.map((ngo) => `
        <li class="followed-org-item">
            <div>
                <strong>${ngo.organizationName || ngo.name || 'Organisation'}</strong>
                <span>${ngo.description || 'Community-focused organisation'}</span>
                <small>${ngo.opportunityCount || 0} active opportunities</small>
            </div>
            <div class="followed-org-actions">
                <button type="button" class="secondary-btn" data-view-ngo="${ngo.uid}">View</button>
                <button type="button" class="secondary-btn danger-btn" data-unfollow-ngo="${ngo.uid}">Unfollow</button>
            </div>
        </li>
    `).join('');

    list.querySelectorAll('[data-view-ngo]').forEach((button) => {
        button.addEventListener('click', () => {
            const ngoUid = button.getAttribute('data-view-ngo');
            if (!ngoUid) return;
            sessionStorage.setItem('bridgefinityOpenNgoProfile', ngoUid);
            window.location.href = 'events.html';
        });
    });

    list.querySelectorAll('[data-unfollow-ngo]').forEach((button) => {
        button.addEventListener('click', async () => {
            const ngoUid = button.getAttribute('data-unfollow-ngo');
            if (!ngoUid) return;
            await db.collection(FOLLOW_COLLECTION).doc(`${auth.currentUser.uid}_${ngoUid}`).delete();
            await renderFollowedOrganizations();
        });
    });
}

function formatNotificationTime(createdAt) {
    if (!createdAt) return 'Just now';
    try {
        if (typeof createdAt.toDate === 'function') {
            return createdAt.toDate().toLocaleString();
        }
        return new Date(createdAt).toLocaleString();
    } catch (error) {
        return 'Just now';
    }
}

function normalizeApplicationStatus(status) {
    const normalized = String(status || 'pending').toLowerCase();
    if (['pending', 'accepted', 'rejected'].includes(normalized)) {
        return normalized;
    }
    return 'pending';
}

async function markNotificationRead(notificationId) {
    if (!db || !notificationId) return;
    try {
        await db.collection(NOTIFICATION_COLLECTION).doc(notificationId).update({ read: true });
    } catch (error) {
        console.error('Could not mark notification as read:', error);
    }
}

function renderNotifications(notifications) {
    const list = document.querySelector('[data-notification-list]');
    if (!list) return;
    if (!notifications.length) {
        list.innerHTML = '<li class="notification-empty">No notifications yet.</li>';
        return;
    }

    list.innerHTML = notifications.map((notification) => {
        const unreadClass = notification.read ? '' : 'is-unread';
        const messageText = notification.message || 'New update from Bridgefinity';
        return `
            <li class="notification-item ${unreadClass}">
                <button type="button" data-notification-id="${notification.id}" data-notification-open="${notification.relatedOpportunityId || ''}" class="notification-link">
                    <strong>${messageText}</strong>
                    <span>${formatNotificationTime(notification.createdAt)}</span>
                </button>
            </li>
        `;
    }).join('');

    list.querySelectorAll('[data-notification-open]').forEach((button) => {
        button.addEventListener('click', async () => {
            const notificationId = button.getAttribute('data-notification-id');
            const relatedOpportunityId = button.getAttribute('data-notification-open');
            if (notificationId) {
                await markNotificationRead(notificationId);
            }
            if (relatedOpportunityId) {
                sessionStorage.setItem('bridgefinityOpenOpportunityId', relatedOpportunityId);
                window.location.href = 'events.html';
            }
        });
    });
}

async function setupNotificationListener() {
    if (!auth || !auth.currentUser || !db) return;
    const list = document.querySelector('[data-notification-list]');
    if (!list) return;

    if (window.__bridgefinityNotificationListener) {
        window.__bridgefinityNotificationListener();
    }

    const unsubscribe = db.collection(NOTIFICATION_COLLECTION)
        .where('recipientUserId', '==', auth.currentUser.uid)
        .orderBy('createdAt', 'desc')
        .onSnapshot((snapshot) => {
            const notifications = snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
            renderNotifications(notifications);
        }, (error) => {
            console.error('Notification listener error:', error);
        });

    window.__bridgefinityNotificationListener = unsubscribe;
}

async function notifyFollowersOfNgo(ngoUid, ngoName, opportunityName, opportunityId) {
    if (!db || !ngoUid) return;
    try {
        const snapshot = await db.collection(FOLLOW_COLLECTION).where('ngoUid', '==', ngoUid).get();
        if (!snapshot.empty) {
            const notifications = snapshot.docs.map((doc) => {
                const recipientUserId = doc.data().volunteerUid;
                return {
                    recipientUserId,
                    notificationType: 'new_opportunity',
                    relatedNgoId: ngoUid,
                    relatedOpportunityId: opportunityId,
                    relatedApplicationId: '',
                    message: `🔔 New opportunity from ${ngoName}: ${opportunityName} is now available.`,
                    read: false,
                    createdAt: new Date().toISOString()
                };
            });

            const writes = notifications.map(async (entry) => {
                await db.collection(NOTIFICATION_COLLECTION).add(entry);
                const recipientProfile = await fetchUserProfile(entry.recipientUserId);
                if (recipientProfile?.email) {
                    await sendBridgefinityEmail({
                        to: recipientProfile.email,
                        name: recipientProfile.name || 'Volunteer',
                        subject: `New opportunity from ${ngoName}`,
                        template: 'new_opportunity',
                        accountType: 'volunteer',
                        eventType: 'new_opportunity',
                        message: `A new opportunity, ${opportunityName}, is now live with ${ngoName}.`
                    });
                }
            });

            await Promise.all(writes);
        }
    } catch (error) {
        console.error('Could not notify followers:', error);
    }
}

async function notifyNgoOfNewApplication({ ngoUid, ngoName, volunteerName, opportunityTitle, opportunityId, applicationId }) {
    if (!db || !ngoUid) return;

    const notification = buildNotificationRecord({
        recipientUserId: ngoUid,
        notificationType: 'application_submitted',
        relatedNgoId: ngoUid,
        relatedOpportunityId: opportunityId,
        relatedApplicationId: applicationId,
        message: `🔔 New volunteer application\n\"${volunteerName} has applied for ${opportunityTitle}.\"`,
        read: false,
        createdAt: new Date().toISOString()
    });

    await db.collection(NOTIFICATION_COLLECTION).add(notification);
}

async function notifyVolunteerApplicationConfirmation({ volunteerUid, opportunityTitle, opportunityId, applicationId }) {
    if (!db || !volunteerUid) return;

    const notification = buildNotificationRecord({
        recipientUserId: volunteerUid,
        notificationType: 'application_confirmation',
        relatedNgoId: '',
        relatedOpportunityId: opportunityId,
        relatedApplicationId: applicationId,
        message: `🎉 Congratulations! You applied for ${opportunityTitle}. The NGO will share further information, and you will receive a notification when there is an update.`,
        read: false,
        createdAt: new Date().toISOString()
    });

    await db.collection(NOTIFICATION_COLLECTION).add(notification);
}

function withApplicationRequestTimeout(request, message) {
    let timeoutId;
    const timeout = new Promise((resolve, reject) => {
        timeoutId = window.setTimeout(() => {
            const error = new Error(message);
            error.name = 'TimeoutError';
            reject(error);
        }, APPLICATION_REQUEST_TIMEOUT_MS);
    });

    return Promise.race([request, timeout]).finally(() => window.clearTimeout(timeoutId));
}

async function isDuplicateApplication(opportunityId, volunteerUid) {
    if (!db || !opportunityId || !volunteerUid) {
        throw new Error('Application service is unavailable.');
    }
    const duplicateCheck = db.collection(APPLICATION_COLLECTION)
        .where('opportunityId', '==', opportunityId)
        .where('volunteerUid', '==', volunteerUid)
        .limit(1)
        .get();
    const snapshot = await withApplicationRequestTimeout(
        duplicateCheck,
        'Checking for an existing application timed out. Check your connection and try again.'
    );
    return !snapshot.empty;
}

async function submitOpportunityApplication(opportunity) {
    if (!opportunity || !opportunity.id) {
        return { ok: false, message: 'Opportunity details are missing.' };
    }

    if (!auth || !auth.currentUser) {
        return { ok: false, message: 'Please log in to apply.' };
    }

    if (!db) {
        return { ok: false, message: 'The application service is unavailable. Please try again later.' };
    }

    try {
        const currentProfile = normalizeProfileData(getSessionProfile() || await fetchUserProfile(auth.currentUser.uid));
        if (getProfileType(currentProfile) !== 'volunteer') {
            return { ok: false, message: 'Only volunteers can apply to opportunities.' };
        }

        if (await isDuplicateApplication(opportunity.id, auth.currentUser.uid)) {
            return { ok: true, alreadyApplied: true };
        }

        const applicationRef = db.collection(APPLICATION_COLLECTION).doc();
        const applicationData = {
            applicationId: applicationRef.id,
            opportunityId: opportunity.id,
            volunteerUid: auth.currentUser.uid,
            volunteerName: currentProfile.name || auth.currentUser.displayName || 'Volunteer',
            ngoUid: opportunity.organizerId || opportunity.ngoId || '',
            opportunityTitle: opportunity.title || 'Opportunity',
            status: 'pending',
            appliedAt: new Date().toISOString(),
            createdAt: new Date().toISOString()
        };
        const applicationWrite = applicationRef.set(applicationData);
        await withApplicationRequestTimeout(
            applicationWrite,
            'Saving your application timed out. Check your connection before retrying; the application may still have been saved.'
        );

        const savedApplication = { ...applicationData, id: applicationRef.id, applicationId: applicationRef.id };

        notifyNgoOfNewApplication({
            ngoUid: savedApplication.ngoUid,
            ngoName: opportunity.organizerName || 'Bridgefinity NGO',
            volunteerName: savedApplication.volunteerName,
            opportunityTitle: savedApplication.opportunityTitle,
            opportunityId: savedApplication.opportunityId,
            applicationId: savedApplication.applicationId
        }).catch(error => console.error('Unable to notify NGO of application:', error));

        notifyVolunteerApplicationConfirmation({
            volunteerUid: savedApplication.volunteerUid,
            opportunityTitle: savedApplication.opportunityTitle,
            opportunityId: savedApplication.opportunityId,
            applicationId: savedApplication.applicationId
        }).catch(error => console.error('Unable to save volunteer confirmation:', error));

        const volunteerEmail = currentProfile.email || auth.currentUser.email || '';
        if (volunteerEmail) {
            sendBridgefinityEmail({
                to: volunteerEmail,
                name: currentProfile.name || 'Volunteer',
                subject: 'Application received',
                template: 'application_confirmation',
                accountType: 'volunteer',
                eventType: 'application_confirmation',
                message: `Your application for ${savedApplication.opportunityTitle} has been sent successfully. The NGO will review it soon.`
            }).catch(error => console.error('Unable to send application confirmation email:', error));
        }

        return {
            ok: true,
            message: `Congratulations! You have applied for ${savedApplication.opportunityTitle}.`,
            application: savedApplication
        };
    } catch (error) {
        console.error('Unable to submit application:', error);
        const message = error?.name === 'TimeoutError'
            ? error.message
            : error?.code === 'permission-denied'
                ? 'Firestore denied this application. Check the volunteer account role and Firestore rules.'
                : getFirebaseActionError(error, 'submit your application');
        return { ok: false, message };
    }
}

async function notifyVolunteerOfApplicationDecision({ volunteerUid, ngoName, opportunityTitle, opportunityId, applicationId, status }) {
    if (!db || !volunteerUid) return;

    const normalizedStatus = normalizeApplicationStatus(status);
    const message = normalizedStatus === 'accepted'
        ? `🔔 Application accepted\nYour application for "${opportunityTitle}" has been accepted by ${ngoName}.`
        : normalizedStatus === 'rejected'
            ? `🔔 Application update\nYour application for "${opportunityTitle}" was not accepted.`
            : `🔔 Application update\nYour application for "${opportunityTitle}" is now ${normalizedStatus}.`;

    const notification = buildNotificationRecord({
        recipientUserId: volunteerUid,
        notificationType: 'application_decision',
        relatedNgoId: '',
        relatedOpportunityId: opportunityId,
        relatedApplicationId: applicationId,
        message,
        read: false,
        createdAt: new Date().toISOString()
    });

    await db.collection(NOTIFICATION_COLLECTION).add(notification);
}

async function updateApplicationStatus(applicationId, newStatus) {
    if (!auth || !auth.currentUser || !db || !applicationId) return false;

    const validStatuses = ['pending', 'accepted', 'rejected'];
    const normalized = normalizeApplicationStatus(newStatus);
    if (!validStatuses.includes(normalized)) return false;

    try {
        const applicationDoc = await db.collection(APPLICATION_COLLECTION).doc(applicationId).get();
        if (!applicationDoc.exists) return false;

        const application = applicationDoc.data();
        const profile = normalizeProfileData(getSessionProfile() || await fetchUserProfile(auth.currentUser.uid));
        if (getProfileType(profile) !== 'ngo') return false;
        if (application.ngoUid !== auth.currentUser.uid) return false;
        if (normalizeApplicationStatus(application.status) === normalized) return false;

        await db.collection(APPLICATION_COLLECTION).doc(applicationId).update({ status: normalized, updatedAt: new Date().toISOString() });

        await notifyVolunteerOfApplicationDecision({
            volunteerUid: application.volunteerUid,
            ngoName: profile.organizationName || profile.name || 'NGO',
            opportunityTitle: application.opportunityTitle || 'Opportunity',
            opportunityId: application.opportunityId,
            applicationId: applicationId,
            status: normalized
        });

        const volunteerProfile = await fetchUserProfile(application.volunteerUid);
        if (volunteerProfile?.email) {
            await sendBridgefinityEmail({
                to: volunteerProfile.email,
                name: volunteerProfile.name || 'Volunteer',
                subject: normalized === 'accepted' ? 'Your application was accepted' : 'Your application update',
                template: normalized === 'accepted' ? 'application_accepted' : 'application_rejected',
                accountType: 'volunteer',
                eventType: 'application_decision',
                message: normalized === 'accepted'
                    ? `Congratulations. Your application for ${application.opportunityTitle || 'this opportunity'} was accepted by ${profile.organizationName || profile.name || 'the NGO'}.`
                    : `Your application for ${application.opportunityTitle || 'this opportunity'} was updated to ${normalized}.`
            });
        }

        return true;
    } catch (error) {
        console.error('Unable to update application status:', error);
        return false;
    }
}

function renderVolunteerApplications(applications) {
    const list = document.querySelector('[data-my-applications-list]');
    if (!list) return;

    if (!applications.length) {
        list.innerHTML = '<li>No applications submitted yet.</li>';
        return;
    }

    list.innerHTML = applications.map((application) => `
        <li class="application-row">
            <div>
                <strong>${application.opportunityTitle || 'Opportunity'}</strong>
                <span>${application.ngoName || 'NGO'}</span>
            </div>
            <div class="application-meta">
                <small>${application.appliedAt ? formatNotificationTime(application.appliedAt) : 'Recently'}</small>
                <em class="application-status ${normalizeApplicationStatus(application.status)}">${normalizeApplicationStatus(application.status)}</em>
            </div>
        </li>
    `).join('');
}

async function setupVolunteerApplicationsListener() {
    if (!auth || !auth.currentUser || !db) return;

    if (window.__bridgefinityVolunteerApplicationListener) {
        window.__bridgefinityVolunteerApplicationListener();
    }

    const unsubscribe = db.collection(APPLICATION_COLLECTION)
        .where('volunteerUid', '==', auth.currentUser.uid)
        .orderBy('appliedAt', 'desc')
        .onSnapshot(async (snapshot) => {
            const applications = snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }));

            const hydrated = await Promise.all(applications.map(async (application) => {
                if (!application.ngoUid) return application;
                const ngoProfile = await fetchUserProfile(application.ngoUid);
                return {
                    ...application,
                    ngoName: ngoProfile?.organizationName || ngoProfile?.name || 'NGO'
                };
            }));

            renderVolunteerApplications(hydrated);
        }, (error) => {
            console.error('Volunteer applications listener error:', error);
        });

    window.__bridgefinityVolunteerApplicationListener = unsubscribe;
}

function renderNgoApplications(applications) {
    const list = document.querySelector('[data-ngo-applications-list]');
    if (!list) return;

    if (!applications.length) {
        list.innerHTML = '<li>No volunteer applications yet.</li>';
        return;
    }

    list.innerHTML = applications.map((application) => {
        const volunteerProfile = application.volunteerProfile || {};
        const infoLine = volunteerProfile.email || volunteerProfile.location || 'Volunteer profile available';
        const status = normalizeApplicationStatus(application.status);
        const canDecide = status === 'pending';

        return `
            <li class="application-row">
                <div>
                    <strong>${application.volunteerName || 'Volunteer'}</strong>
                    <span>${application.opportunityTitle || 'Opportunity'}</span>
                    <small>${infoLine}</small>
                </div>
                <div class="application-status-actions">
                    <em class="application-status ${status}">${status}</em>
                    <button type="button" data-application-status="accepted" data-application-id="${application.id}" class="secondary-btn" ${canDecide ? '' : 'disabled'}>Accept</button>
                    <button type="button" data-application-status="rejected" data-application-id="${application.id}" class="secondary-btn danger-btn" ${canDecide ? '' : 'disabled'}>Reject</button>
                </div>
            </li>
        `;
    }).join('');

    list.querySelectorAll('[data-application-status]').forEach((button) => {
        button.addEventListener('click', async () => {
            const applicationId = button.getAttribute('data-application-id');
            const nextStatus = button.getAttribute('data-application-status');
            if (!applicationId || !nextStatus) return;
            const success = await updateApplicationStatus(applicationId, nextStatus);
            if (success) {
                if (window.__bridgefinityNgoApplicationListener) {
                    window.__bridgefinityNgoApplicationListener();
                }
            }
        });
    });
}

async function setupNgoApplicationsListener() {
    if (!auth || !auth.currentUser || !db) return;

    const profile = normalizeProfileData(getSessionProfile() || await fetchUserProfile(auth.currentUser.uid));
    if (getProfileType(profile) !== 'ngo') return;

    if (window.__bridgefinityNgoApplicationListener) {
        window.__bridgefinityNgoApplicationListener();
    }

    const unsubscribe = db.collection(APPLICATION_COLLECTION)
        .where('ngoUid', '==', auth.currentUser.uid)
        .orderBy('appliedAt', 'desc')
        .onSnapshot(async (snapshot) => {
            const applications = snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
            const hydrated = await Promise.all(applications.map(async (application) => {
                if (!application.volunteerUid) return application;
                const volunteerProfile = await fetchUserProfile(application.volunteerUid);
                return {
                    ...application,
                    volunteerProfile: volunteerProfile || {}
                };
            }));
            renderNgoApplications(hydrated);
        }, (error) => {
            console.error('NGO applications listener error:', error);
        });

    window.__bridgefinityNgoApplicationListener = unsubscribe;
}

function renderNgoOpportunityDashboard(opportunities) {
    const list = document.querySelector('[data-ngo-opportunity-list]');
    if (!list) return;

    if (!opportunities.length) {
        list.innerHTML = '<li>No opportunities created yet.</li>';
        return;
    }

    list.innerHTML = opportunities.map((opportunity) => `
        <li class="dashboard-opportunity-item">
            <div>
                <strong>${opportunity.title}</strong>
                <span>${opportunity.location} · ${opportunity.date}</span>
                <small>Applications: ${Number(opportunity.applicationCount || 0)}</small>
            </div>
            <div class="dashboard-opportunity-actions">
                <button type="button" data-edit-opportunity="${opportunity.id}" class="secondary-btn">Edit</button>
                <button type="button" data-delete-opportunity="${opportunity.id}" class="secondary-btn danger-btn">Delete</button>
            </div>
        </li>
    `).join('');

    list.querySelectorAll('[data-edit-opportunity]').forEach((button) => {
        button.addEventListener('click', async () => {
            const id = button.getAttribute('data-edit-opportunity');
            const docRef = db.collection(OPPORTUNITY_COLLECTION).doc(id);
            const snapshot = await docRef.get();
            const data = snapshot.data();
            if (!data) return;

            const form = document.getElementById('ngoOpportunityForm');
            if (!form) return;
            form.title.value = data.title || '';
            form.description.value = data.description || '';
            form.category.value = data.category || 'Community';
            form.location.value = data.location || '';
            form.date.value = data.date || '';
            form.time.value = data.time || '';
            form.duration.value = data.duration || '3-4 hours';
            form.volunteersNeeded.value = data.volunteersNeeded || 1;
            form.dataset.editOpportunityId = id;
            form.querySelector('button[type="submit"]').textContent = 'Update Opportunity';
            form.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
        });
    });

    list.querySelectorAll('[data-delete-opportunity]').forEach((button) => {
        button.addEventListener('click', async () => {
            const id = button.getAttribute('data-delete-opportunity');
            if (!id || !confirm('Delete this opportunity?')) return;
            await db.collection(OPPORTUNITY_COLLECTION).doc(id).delete();
        });
    });
}

async function setupNgoDashboardListener() {
    if (!auth || !auth.currentUser || !db) return;
    const profile = normalizeProfileData(getSessionProfile() || await fetchUserProfile(auth.currentUser.uid));
    if (getProfileType(profile) !== 'ngo') return;

    if (window.__bridgefinityNgoOpportunityListener) {
        window.__bridgefinityNgoOpportunityListener();
    }

    const unsubscribe = db.collection(OPPORTUNITY_COLLECTION)
        .where('organizerId', '==', auth.currentUser.uid)
        .orderBy('createdAt', 'desc')
        .onSnapshot((snapshot) => {
            const items = snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
            renderNgoOpportunityDashboard(items);
        }, (error) => {
            console.error('NGO dashboard listener error:', error);
        });

    window.__bridgefinityNgoOpportunityListener = unsubscribe;
}

function setupNgoOpportunityForm() {
    const form = document.getElementById('ngoOpportunityForm');
    if (!form) return;

    form.addEventListener('submit', async (event) => {
        event.preventDefault();

        if (!auth || !auth.currentUser || !db) {
            showMessage('ngoOpportunityError', 'Please sign in to create an opportunity.');
            return;
        }

        const currentProfile = normalizeProfileData(getSessionProfile() || await fetchUserProfile(auth.currentUser.uid));
        if (getProfileType(currentProfile) !== 'ngo') {
            showMessage('ngoOpportunityError', 'Only NGO accounts can create opportunities.');
            return;
        }

        const formData = new FormData(form);
        const opportunity = {
            title: String(formData.get('title') || '').trim(),
            description: String(formData.get('description') || '').trim(),
            category: String(formData.get('category') || 'Community').trim(),
            location: String(formData.get('location') || '').trim(),
            date: String(formData.get('date') || '').trim(),
            time: String(formData.get('time') || '').trim(),
            duration: String(formData.get('duration') || 'Flexible').trim(),
            volunteersNeeded: Number(formData.get('volunteersNeeded') || 0),
            organizerId: auth.currentUser.uid,
            ngoId: auth.currentUser.uid,
            organizerName: currentProfile.organizationName || currentProfile.name || 'Bridgefinity NGO',
            ngoName: currentProfile.organizationName || currentProfile.name || 'Bridgefinity NGO',
            createdBy: auth.currentUser.uid,
            createdAt: new Date().toISOString(),
            status: 'active',
            applicationCount: 0
        };

        const opportunityErrors = validateOpportunityPayload(opportunity);
        if (opportunityErrors.length) {
            showMessage('ngoOpportunityError', opportunityErrors[0]);
            return;
        }

        try {
            const editId = form.dataset.editOpportunityId;
            if (editId) {
                await db.collection(OPPORTUNITY_COLLECTION).doc(editId).update(opportunity);
                delete form.dataset.editOpportunityId;
                const submitButton = form.querySelector('button[type="submit"]');
                if (submitButton) submitButton.textContent = 'Create Opportunity';
            } else {
                const newDoc = await db.collection(OPPORTUNITY_COLLECTION).add(opportunity);
                await notifyFollowersOfNgo(auth.currentUser.uid, opportunity.ngoName, opportunity.title, newDoc.id);
            }
            form.reset();
            showMessage('ngoOpportunityError', 'Opportunity saved successfully.');
            if (window.location.pathname.endsWith('events.html')) {
                await loadOpportunities();
            }
            if (window.location.pathname.endsWith('profile.html')) {
                renderProfilePage();
                await renderFollowedOrganizations();
            }
        } catch (error) {
            console.error('Opportunity creation failed:', error);
            showMessage('ngoOpportunityError', 'Unable to create opportunity right now.');
        }
    });
}

async function loadOpportunities() {
    const container = document.querySelector('.events-container');
    if (!container) return;

    if (!db) {
        collectOpportunityFilterOptions();
        filterEvents();
        return;
    }

    const opportunities = await fetchAllOpportunities();
    if (opportunities === null) {
        collectOpportunityFilterOptions();
        filterEvents();
        return;
    }

    if (!opportunities.length) {
        collectOpportunityFilterOptions();
        filterEvents();
        return;
    }

    container.innerHTML = '';

    opportunities.forEach((opportunity) => {
        const article = document.createElement('article');
        article.className = 'event-card';
        article.dataset.opportunityId = opportunity.id;
        article.dataset.organizerId = opportunity.organizerId || '';
        article.dataset.organizerName = opportunity.organizerName || '';
        article.dataset.category = opportunity.category || 'Community';
        article.dataset.location = opportunity.location || 'Nagpur';
        article.dataset.date = opportunity.date || 'Flexible';
        article.dataset.organiserName = opportunity.organizerName || 'Bridgefinity NGO';
        const icon = ['🌱', '📚', '♻️', '❤️', '🩺', '🏡'][Math.abs(opportunity.title.length + opportunity.category.length) % 6];
        article.innerHTML = `
            <div class="event-icon">${icon}</div>
            <div class="event-details">
                <p class="event-type">${(opportunity.category || 'COMMUNITY').toUpperCase()}</p>
                <h2>${opportunity.title}</h2>
                <p>${opportunity.description}</p>
                <div class="event-info">
                    <span>📍 ${opportunity.location}</span>
                    <span>📅 ${opportunity.date}</span>
                    <span>👥 ${opportunity.volunteersNeeded || 0} Volunteers</span>
                </div>
                <div class="event-meta">
                    <span class="event-badge">⏱ ${opportunity.duration || 'Flexible'}</span>
                    <span class="event-badge">🕒 ${opportunity.time || 'Flexible time'}</span>
                    <span class="event-badge">🏢 ${opportunity.organizerName || 'Bridgefinity NGO'}</span>
                </div>
            </div>
            <button type="button" class="event-view-btn" data-event-details>
                View Details →
            </button>
        `;
        container.appendChild(article);
    });

    collectOpportunityFilterOptions();
    setupOpportunityDetails();
    filterEvents();
}

function validateRegistrationForm(form) {
    const name = document.getElementById('regName').value.trim();
    const email = document.getElementById('regEmail').value.trim();
    const password = document.getElementById('regPassword').value;
    const confirmPassword = document.getElementById('regConfirmPassword').value;
    const location = document.getElementById('regLocation').value.trim();
    const interests = [...document.querySelectorAll('input[name="interests"]:checked')].map(item => item.value);
    const errorBox = document.getElementById('registrationError');

    if (!name) {
        errorBox.textContent = 'Please enter your full name.';
        return false;
    }

    const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailPattern.test(email)) {
        errorBox.textContent = 'Please enter a valid email address.';
        return false;
    }

    if (!password) {
        errorBox.textContent = 'Please enter a password.';
        return false;
    }

    if (password.length < 6) {
        errorBox.textContent = 'Password must be at least 6 characters long.';
        return false;
    }

    if (password !== confirmPassword) {
        errorBox.textContent = 'Passwords do not match. Please try again.';
        return false;
    }

    if (!location) {
        errorBox.textContent = 'Please tell us your city or location.';
        return false;
    }

    if (!interests.length) {
        errorBox.textContent = 'Please select at least one area of interest.';
        return false;
    }

    errorBox.textContent = '';
    return true;
}

function setupRegistrationForm() {
    const form = document.getElementById('registrationForm');
    const errorBox = document.getElementById('registrationError');
    const successOverlay = document.getElementById('registrationSuccessModal');
    const successClose = document.querySelector('[data-success-close]');
    const exploreButton = document.querySelector('[data-success-opportunities]');
    const profileButton = document.querySelector('[data-success-profile]');

    if (!form || !errorBox) return;

    const openSuccessModal = () => {
        if (!successOverlay) return;
        successOverlay.classList.add('is-open');
        successOverlay.setAttribute('aria-hidden', 'false');
        document.body.classList.add('modal-open');
    };

    const closeSuccessModal = () => {
        if (!successOverlay) return;
        successOverlay.classList.remove('is-open');
        successOverlay.setAttribute('aria-hidden', 'true');
        document.body.classList.remove('modal-open');
    };

    if (successClose) successClose.addEventListener('click', closeSuccessModal);
    if (exploreButton) exploreButton.addEventListener('click', () => { closeSuccessModal(); window.location.href = 'events.html'; });
    if (profileButton) profileButton.addEventListener('click', () => { closeSuccessModal(); window.location.href = 'profile.html'; });

    if (successOverlay) {
        successOverlay.addEventListener('click', (event) => {
            if (event.target === successOverlay) closeSuccessModal();
        });
    }

    form.addEventListener('submit', async (event) => {
        event.preventDefault();
        if (!validateRegistrationForm(form)) {
            return;
        }

        try {
            ensureFirebaseReady();
        } catch (error) {
            showMessage('registrationError', error.message || 'Firebase is not configured yet. Add your Firebase settings in firebase-config.js.');
            return;
        }

        const formData = new FormData(form);
        const fullName = String(formData.get('name') || '').trim();
        const email = String(formData.get('email') || '').trim();
        const password = String(formData.get('password') || '');
        const city = String(formData.get('location') || '').trim();
        const interests = [...document.querySelectorAll('input[name="interests"]:checked')].map(item => item.value);
        const availability = document.querySelector('input[name="availability"]:checked')?.value || 'Both';

        const submitButton = form.querySelector('button[type="submit"]');
        const originalButtonMarkup = submitButton?.innerHTML || '';
        if (submitButton) {
            submitButton.disabled = true;
            submitButton.textContent = 'Creating account...';
        }

        try {
            const userCredential = await auth.createUserWithEmailAndPassword(email, password);
            submitButton.textContent = 'Sending verification email...';
            await userCredential.user.updateProfile({ displayName: fullName });
            await userCredential.user.sendEmailVerification();

            submitButton.textContent = 'Saving your profile...';
            const volunteerProfile = {
                uid: userCredential.user.uid,
                type: 'volunteer',
                role: 'volunteer',
                name: fullName,
                email,
                city,
                location: city,
                interests,
                availability,
                skills: 'Community engagement, hands-on volunteering, project support',
                accountStatus: 'accepted',
                status: 'accepted',
                preferences: {
                    location: city,
                    cause: interests.join(', ') || 'Environment and Community',
                    days: 'Weekends',
                    time: 'Morning'
                },
                activity: {
                    saved: ['Community Tree Plantation Drive', 'Weekend Learning Support'],
                    registered: ['Volunteer Orientation'],
                    upcoming: ['Plantation Drive · Sat, 20 Sep'],
                    past: ['School Supply Drive']
                },
                createdAt: new Date().toISOString(),
                notifications: []
            };

            const savedProfile = await upsertUserProfile(volunteerProfile);
            saveSessionProfile(savedProfile);

            setupAuthUI();
            const verificationNotice = document.getElementById('verificationNotice');
            if (verificationNotice) {
                verificationNotice.textContent = `We sent a verification email to ${email}. Check your inbox and spam folder.`;
            }
            if (!savedProfile) {
                showMessage('registrationError', 'Your account was created, but your profile could not be saved. You can retry from the profile page.');
                return;
            }
            openSuccessModal();
        } catch (error) {
            showMessage('registrationError', getFirebaseActionError(error, 'create your account'));
        } finally {
            if (submitButton) {
                submitButton.disabled = false;
                submitButton.innerHTML = originalButtonMarkup;
            }
        }
    });
}

function setupLoginPanel() {
    const overlay = document.querySelector('.login-overlay');
    const openButtons = document.querySelectorAll('[data-login-open]');
    const closeButton = document.querySelector('[data-login-close]');
    const form = document.getElementById('loginForm');

    if (!overlay || !openButtons.length || !closeButton || !form) {
        return;
    }

    const closePanel = () => {
        overlay.classList.remove('is-open');
        overlay.setAttribute('aria-hidden', 'true');
        overlay.style.removeProperty('opacity');
        overlay.style.removeProperty('visibility');
        document.body.classList.remove('modal-open');
    };

    openButtons.forEach(openButton => {
        openButton.addEventListener('click', event => {
            event.preventDefault();
            overlay.classList.add('is-open');
            overlay.setAttribute('aria-hidden', 'false');
            overlay.style.setProperty('opacity', '1', 'important');
            overlay.style.setProperty('visibility', 'visible', 'important');
            document.body.classList.add('modal-open');
            window.setTimeout(() => document.getElementById('loginEmail').focus(), 250);
        });
    });

    closeButton.addEventListener('click', closePanel);
    overlay.addEventListener('click', event => {
        if (event.target === overlay) closePanel();
    });
    document.addEventListener('keydown', event => {
        if (event.key === 'Escape' && overlay.classList.contains('is-open')) closePanel();
    });

    form.addEventListener('submit', async (event) => {
        event.preventDefault();
        const email = document.getElementById('loginEmail').value.trim();
        const password = document.getElementById('loginPassword').value.trim();
        const errorBox = document.getElementById('loginError');

        if (!email || !password) {
            showMessage('loginError', 'Please enter both email and password.');
            return;
        }

        const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailPattern.test(email)) {
            showMessage('loginError', 'Please enter a valid email address.');
            return;
        }

        if (!auth) {
            showMessage('loginError', 'Firebase is not configured yet. Add your Firebase settings in script.js.');
            return;
        }

        const submitButton = form.querySelector('button[type="submit"]');
        const originalButtonMarkup = submitButton?.innerHTML || '';
        if (submitButton) {
            submitButton.disabled = true;
            submitButton.textContent = 'Signing in...';
        }

        try {
            const userCredential = await auth.signInWithEmailAndPassword(email, password);
            if (!userCredential.user.emailVerified) {
                await userCredential.user.signOut();
                showMessage('loginError', 'Your email address has not been verified. Check your inbox for the verification email, then sign in again.');
                return;
            }

            const userDoc = await fetchUserProfile(userCredential.user.uid);
            const fallbackProfile = {
                uid: userCredential.user.uid,
                type: 'volunteer',
                role: 'volunteer',
                name: userCredential.user.displayName || email.split('@')[0],
                email,
                location: 'Nagpur, Maharashtra',
                interests: ['Environment'],
                availability: 'Flexible',
                accountStatus: 'accepted',
                status: 'accepted',
                preferences: {
                    location: 'Nagpur, Wardha Road',
                    cause: 'Environment and Education',
                    days: 'Weekends',
                    time: 'Morning'
                },
                activity: { saved: [], registered: [], upcoming: [], past: [] }
            };

            const activeProfile = userDoc || fallbackProfile;
            const finalProfile = await upsertUserProfile(activeProfile);
            saveSessionProfile(finalProfile);

            closePanel();
            setupAuthUI();

            if (window.location.pathname.endsWith('profile.html')) {
                renderProfilePage();
                return;
            }

            window.location.href = 'profile.html';
        } catch (error) {
            showMessage('loginError', getFirebaseActionError(error, 'sign you in'));
        } finally {
            if (submitButton) {
                submitButton.disabled = false;
                submitButton.innerHTML = originalButtonMarkup;
            }
        }
    });

    if (window.location.hash === '#login') {
        openButtons[0].click();
    }
}

function setupResearchModal() {
    const modal = document.getElementById('researchModal');
    const closeButton = document.querySelector('[data-research-close]');
    const title = document.getElementById('researchModalTitle');
    const note = document.getElementById('researchModalNote');
    const buttons = document.querySelectorAll('[data-research]');

    if (!modal || !closeButton || !title || !note || !buttons.length) {
        return;
    }

    const openModal = (event) => {
        const button = event.currentTarget;
        title.textContent = button.dataset.title || 'Research evidence';
        note.textContent = button.dataset.note || 'Placeholder research note.';
        modal.classList.add('is-open');
        modal.setAttribute('aria-hidden', 'false');
        document.body.classList.add('modal-open');
    };

    const closeModal = () => {
        modal.classList.remove('is-open');
        modal.setAttribute('aria-hidden', 'true');
        document.body.classList.remove('modal-open');
    };

    buttons.forEach(button => button.addEventListener('click', openModal));
    closeButton.addEventListener('click', closeModal);
    modal.addEventListener('click', (event) => {
        if (event.target === modal) closeModal();
    });
    document.addEventListener('keydown', (event) => {
        if (event.key === 'Escape' && modal.classList.contains('is-open')) closeModal();
    });
}

function setupButtonFeedback() {
    document.querySelectorAll('a, button').forEach(control => {
        control.addEventListener('pointerdown', event => {
            const bounds = control.getBoundingClientRect();
            control.style.setProperty('--ripple-x', `${event.clientX - bounds.left}px`);
            control.style.setProperty('--ripple-y', `${event.clientY - bounds.top}px`);
            control.classList.remove('is-pressed');
            requestAnimationFrame(() => control.classList.add('is-pressed'));
        });
    });
}


// Keep the hero connected to a small, believable stream of community activity.
function setupLiveImpactRadar() {
    const activityText = document.querySelector('[data-activity-text]');
    const activityAvatar = document.querySelector('[data-activity-avatar]');
    const activityStatus = document.querySelector('[data-activity-status]');
    const liveStat = document.querySelector('[data-live-stat]');

    if (!activityText || !activityAvatar || !activityStatus || !liveStat) {
        return;
    }

    const updates = [
        ['Ananya joined the clean-up crew', 'AS', 'Three new connections made in the last hour.'],
        ['Rohan signed up for teaching support', 'RP', 'A new match was found for weekend availability.'],
        ['GreenSteps NGO posted a new opportunity', 'GS', 'The community just opened 12 new volunteer spots.'],
        ['Meera completed her first impact shift', 'MK', 'The network crossed 50 shared hours today.']
    ];
    let updateIndex = 0;
    let activePeople = 128;

    window.setInterval(() => {
        updateIndex = (updateIndex + 1) % updates.length;
        const [text, initials, status] = updates[updateIndex];
        activityText.classList.add('activity-refresh');
        activityAvatar.classList.add('activity-refresh');

        window.setTimeout(() => {
            activityText.textContent = text;
            activityAvatar.textContent = initials;
            activityStatus.textContent = status;
            activePeople += 1;
            liveStat.textContent = activePeople;
            activityText.classList.remove('activity-refresh');
            activityAvatar.classList.remove('activity-refresh');
        }, 220);
    }, 3600);
}

function collectOpportunityFilterOptions() {
    const categoryFilter = document.getElementById('categoryFilter');
    const locationFilter = document.getElementById('locationFilter');
    const dateFilter = document.getElementById('dateFilter');
    const organisationFilter = document.getElementById('organisationFilter');

    const cards = document.querySelectorAll('.event-card');
    const categories = new Set(['All']);
    const locations = new Set(['All']);
    const dates = new Set(['All']);
    const organisations = new Set(['All']);

    cards.forEach((card) => {
        const category = (card.dataset.category || card.querySelector('.event-type')?.textContent || '').trim();
        const location = (card.dataset.location || card.querySelector('.event-info span')?.textContent || '').replace('📍 ', '').trim();
        const date = (card.dataset.date || card.querySelectorAll('.event-info span')[1]?.textContent || '').replace('📅 ', '').trim();
        const organisation = (card.dataset.organiserName || card.querySelectorAll('.event-meta span')[2]?.textContent || '').replace('🏢 ', '').trim();

        if (category) categories.add(category);
        if (location) locations.add(location);
        if (date) dates.add(date);
        if (organisation) organisations.add(organisation);
    });

    if (categoryFilter) {
        const selected = categoryFilter.value || 'All';
        categoryFilter.innerHTML = Array.from(categories).map((value) => `<option value="${value}">${value === 'All' ? 'All categories' : value}</option>`).join('');
        categoryFilter.value = categories.has(selected) ? selected : 'All';
    }

    if (locationFilter) {
        const selected = locationFilter.value || 'All';
        locationFilter.innerHTML = Array.from(locations).map((value) => `<option value="${value}">${value === 'All' ? 'All locations' : value}</option>`).join('');
        locationFilter.value = locations.has(selected) ? selected : 'All';
    }

    if (dateFilter) {
        const selected = dateFilter.value || 'All';
        dateFilter.innerHTML = Array.from(dates).map((value) => `<option value="${value}">${value === 'All' ? 'All dates' : value}</option>`).join('');
        dateFilter.value = dates.has(selected) ? selected : 'All';
    }

    if (organisationFilter) {
        const selected = organisationFilter.value || 'All';
        organisationFilter.innerHTML = Array.from(organisations).map((value) => `<option value="${value}">${value === 'All' ? 'All organisations' : value}</option>`).join('');
        organisationFilter.value = organisations.has(selected) ? selected : 'All';
    }
}

function setupFilterButtons() {
    const filterBtns = document.querySelectorAll('.filter-btn');
    filterBtns.forEach(btn => {
        btn.addEventListener('click', function() {
            filterBtns.forEach(b => b.classList.remove('active-filter'));
            this.classList.add('active-filter');
            currentFilter = this.textContent.trim().toUpperCase();
            filterEvents();
        });
    });

    const categoryFilter = document.getElementById('categoryFilter');
    const locationFilter = document.getElementById('locationFilter');
    const dateFilter = document.getElementById('dateFilter');
    const organisationFilter = document.getElementById('organisationFilter');

    [categoryFilter, locationFilter, dateFilter, organisationFilter].forEach((element) => {
        if (element) {
            element.addEventListener('change', filterEvents);
        }
    });
}

function setupSearchInput() {
    const searchInput = document.getElementById('searchInput');
    if (searchInput) {
        searchInput.addEventListener('input', function() {
            filterEvents();
        });
    }
}

function filterEvents() {
    const searchInput = document.getElementById('searchInput');
    const categoryFilter = document.getElementById('categoryFilter');
    const locationFilter = document.getElementById('locationFilter');
    const dateFilter = document.getElementById('dateFilter');
    const organisationFilter = document.getElementById('organisationFilter');

    const searchTerm = (searchInput?.value || '').trim().toLowerCase();
    const categoryValue = categoryFilter?.value || 'All';
    const locationValue = locationFilter?.value || 'All';
    const dateValue = dateFilter?.value || 'All';
    const organisationValue = organisationFilter?.value || 'All';

    const eventCards = document.querySelectorAll('.event-card');
    const eventsContainer = document.querySelector('.events-container');
    let visibleEvents = 0;

    eventCards.forEach((card) => {
        const eventType = (card.querySelector('.event-type')?.textContent || '').trim().toUpperCase();
        const category = (card.dataset.category || card.querySelector('.event-type')?.textContent || '').trim();
        const location = (card.dataset.location || card.querySelector('.event-info span')?.textContent || '').replace('📍 ', '').trim();
        const date = (card.dataset.date || card.querySelectorAll('.event-info span')[1]?.textContent || '').replace('📅 ', '').trim();
        const organisation = (card.dataset.organiserName || card.querySelectorAll('.event-meta span')[2]?.textContent || '').replace('🏢 ', '').trim();
        const title = (card.querySelector('h2')?.textContent || '').trim().toLowerCase();
        const description = (card.querySelector('.event-details p')?.textContent || '').trim().toLowerCase();
        const searchableText = `${title} ${organisation} ${location} ${category} ${description}`.toLowerCase();

        const matchesCategory = categoryValue === 'All' || category === categoryValue || eventType === categoryValue.toUpperCase();
        const matchesLocation = locationValue === 'All' || location === locationValue;
        const matchesDate = dateValue === 'All' || date === dateValue;
        const matchesOrganisation = organisationValue === 'All' || organisation === organisationValue;
        const matchesSearch = !searchTerm || searchableText.includes(searchTerm);
        const matchesQuickFilter = currentFilter === 'All' || eventType === currentFilter;

        const isVisible = matchesCategory && matchesLocation && matchesDate && matchesOrganisation && matchesSearch && matchesQuickFilter;
        card.style.display = isVisible ? 'flex' : 'none';
        if (isVisible) visibleEvents += 1;
    });

    if (eventsContainer) {
        let emptyState = eventsContainer.querySelector('.events-empty-state');
        if (!visibleEvents) {
            if (!emptyState) {
                emptyState = document.createElement('p');
                emptyState.className = 'events-empty-state';
                eventsContainer.appendChild(emptyState);
            }
            emptyState.textContent = 'No opportunities match your search. Try another cause, location, or date.';
            emptyState.hidden = false;
        } else if (emptyState) {
            emptyState.hidden = true;
        }
    }
}

function setupOpportunityDetails() {
    const modal = document.getElementById('eventModal');
    const closeButton = document.querySelector('[data-event-close]');
    const title = document.getElementById('eventModalTitle');
    const type = document.getElementById('eventModalType');
    const description = document.getElementById('eventModalDescription');
    const info = document.getElementById('eventModalInfo');
    const detailButtons = document.querySelectorAll('[data-event-details]');
    const followButton = document.getElementById('followOrganisationButton');
    const applyButton = document.getElementById('applyOpportunityButton');
    const messageBox = document.getElementById('applyOpportunityMessage');
    const detailsPanel = document.getElementById('eventOpportunityDetails');
    const successPanel = document.getElementById('eventApplicationSuccess');
    const successLabel = successPanel?.querySelector('.small-heading');
    const successTitle = document.getElementById('eventApplicationSuccessTitle');
    const successMessage = successPanel?.querySelector('.success-message');
    const successSubtext = successPanel?.querySelector('.success-subtext');
    const successOpportunityTitle = document.getElementById('eventApplicationOpportunityTitle');
    const successCloseButton = document.querySelector('[data-event-success-close]');
    let currentOpportunity = null;
    let applicationInProgress = false;

    if (!modal || !closeButton || !title || !type || !description || !info) return;

    const closeModal = () => {
        modal.classList.remove('is-open');
        modal.setAttribute('aria-hidden', 'true');
        document.body.classList.remove('modal-open');
        if (messageBox) messageBox.textContent = '';
    };

    const applyToCurrentOpportunity = async () => {
        if (!currentOpportunity || applicationInProgress) return;

        if (messageBox) messageBox.textContent = '';
        applicationInProgress = true;
        const buttonText = applyButton?.textContent || 'Apply Now';
        if (applyButton) {
            applyButton.disabled = true;
            applyButton.textContent = 'Processing...';
        }

        const opportunity = currentOpportunity;

        try {
            await new Promise(resolve => window.setTimeout(resolve, 3500));
            if (!modal.classList.contains('is-open')) return;

            if (detailsPanel) detailsPanel.hidden = true;
            if (successPanel) {
                successPanel.hidden = false;
                successPanel.classList.add('is-visible');
            }
            if (successLabel) successLabel.textContent = 'GREAT CHOICE';
            if (successTitle) successTitle.textContent = 'Congratulations!';
            if (successMessage) successMessage.textContent = "You've chosen:";
            if (successOpportunityTitle) successOpportunityTitle.textContent = opportunity.title;
            if (successSubtext) {
                successSubtext.textContent = 'We look forward to seeing you make a difference in your community.';
            }
        } catch (error) {
            console.error('Unable to show application confirmation:', error);
            if (messageBox) messageBox.textContent = 'Unable to show the confirmation right now.';
        } finally {
            applicationInProgress = false;
            if (applyButton) {
                applyButton.disabled = false;
                applyButton.textContent = buttonText;
            }
        }
    };

    if (applyButton) {
        applyButton.addEventListener('click', applyToCurrentOpportunity);
    }

    detailButtons.forEach(button => button.addEventListener('click', async () => {
        const card = button.closest('.event-card');
        if (!card) return;

        const opportunityId = card.dataset.opportunityId || card.dataset.opportunity_id || card.getAttribute('data-opportunity-id') || '';
        const organizerId = card.dataset.organizerId || card.dataset.organizer_id || card.getAttribute('data-organizer-id') || '';
        const organizerName = card.dataset.organizerName || card.dataset.organizer_name || card.getAttribute('data-organizer-name') || 'Bridgefinity NGO';

        currentOpportunity = normalizeOpportunity({
            id: opportunityId,
            title: card.querySelector('h2')?.textContent.trim() || 'Opportunity details',
            description: card.querySelector('.event-details > p:not(.event-type)')?.textContent.trim() || '',
            category: card.querySelector('.event-type')?.textContent.trim() || 'Community',
            location: (card.querySelector('.event-info span')?.textContent || '').replace('📍 ', '').trim(),
            date: (card.querySelectorAll('.event-info span')[1]?.textContent || '').replace('📅 ', '').trim(),
            time: (card.querySelectorAll('.event-meta span')[1]?.textContent || '').replace('🕒 ', '').trim(),
            duration: (card.querySelectorAll('.event-meta span')[0]?.textContent || '').replace('⏱ ', '').trim(),
            volunteersNeeded: Number((card.querySelectorAll('.event-info span')[2]?.textContent || '').replace(/[^0-9]/g, '') || 0),
            organizerName,
            organizerId,
            createdBy: organizerId
        });

        type.textContent = currentOpportunity.category.toUpperCase();
        title.textContent = currentOpportunity.title;
        description.textContent = currentOpportunity.description;
        info.innerHTML = `
            <span>📍 ${currentOpportunity.location}</span>
            <span>📅 ${currentOpportunity.date}</span>
            <span>🕒 ${currentOpportunity.time}</span>
            <span>⏱ ${currentOpportunity.duration}</span>
            <span>👥 ${currentOpportunity.volunteersNeeded} volunteers needed</span>
            <span>🏢 ${currentOpportunity.organizerName || 'Bridgefinity NGO'}</span>
        `;

        if (applyButton) {
            applyButton.disabled = false;
            applyButton.textContent = 'Apply Now';
            if (auth && auth.currentUser) {
                const isVolunteer = getSessionProfile() ? getProfileType(getSessionProfile()) === 'volunteer' : true;
                applyButton.disabled = !isVolunteer;
                if (!isVolunteer) {
                    applyButton.textContent = 'Volunteer accounts only';
                }
            }
        }

        if (followButton) {
            const ngoId = currentOpportunity.organizerId || '';
            followButton.style.display = ngoId && auth && auth.currentUser && auth.currentUser.uid !== ngoId ? 'inline-flex' : 'none';
            if (ngoId && auth && auth.currentUser && auth.currentUser.uid !== ngoId) {
                const following = await getFollowState(ngoId);
                followButton.textContent = following ? 'Following ✓' : 'Follow Organisation';
                followButton.onclick = () => toggleFollowOrganisation(ngoId, currentOpportunity.organizerName || 'Bridgefinity NGO');
            }
        }

        if (detailsPanel) detailsPanel.hidden = false;
        if (successPanel) {
            successPanel.hidden = true;
            successPanel.classList.remove('is-visible');
        }
        if (messageBox) messageBox.textContent = '';
        modal.classList.add('is-open');
        modal.setAttribute('aria-hidden', 'false');
        document.body.classList.add('modal-open');
    }));

    closeButton.addEventListener('click', closeModal);
    if (successCloseButton) successCloseButton.addEventListener('click', closeModal);
    modal.addEventListener('click', event => { if (event.target === modal) closeModal(); });
    document.addEventListener('keydown', event => {
        if (event.key === 'Escape' && modal.classList.contains('is-open')) closeModal();
    });
}

// Setup FAQ Accordion
function setupFAQ() {
    const faqItems = document.querySelectorAll('.faq-item');
    
    faqItems.forEach(item => {
        const question = item.querySelector('.faq-question');
        question.addEventListener('click', function() {
            // Close other items
            faqItems.forEach(otherItem => {
                if (otherItem !== item) {
                    otherItem.classList.remove('active');
                }
            });
            
            // Toggle current item
            item.classList.toggle('active');
        });
    });
}

// Setup Newsletter Form
function setupNewsletter() {
    const form = document.getElementById('newsletterForm');
    if (form) {
        form.addEventListener('submit', function(e) {
            e.preventDefault();
            const email = this.querySelector('.newsletter-input').value;
            
            // Simple validation
            if (email) {
                alert(`Thank you for subscribing with ${email}! You'll receive our updates soon.`);
                this.reset();
            }
        });
    }
}

// Setup Scroll Animations
function setupScrollAnimations() {
    const observerOptions = {
        threshold: 0.1,
        rootMargin: '0px 0px -50px 0px'
    };
    
    const observer = new IntersectionObserver(function(entries) {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                entry.target.classList.add('fade-in');
                observer.unobserve(entry.target);
            }
        });
    }, observerOptions);
    
    // Observe all elements with fade-in class
    document.querySelectorAll('.fade-in').forEach(el => {
        observer.observe(el);
    });
    
    // Also observe testimonial and spotlight cards
    document.querySelectorAll('.testimonial-card, .spotlight-card').forEach(el => {
        el.classList.add('fade-in');
        observer.observe(el);
    });
}

// Setup Statistics Counter Animation
function setupStatisticCounter() {
    const observerOptions = {
        threshold: 0.5
    };
    
    const observer = new IntersectionObserver(function(entries) {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                const statCards = entry.target.querySelectorAll('.stat-number');
                
                statCards.forEach(card => {
                    const targetValue = parseInt(card.dataset.target) || 0;
                    animateCounter(card, targetValue);
                    card.parentElement.classList.add('fade-in');
                });
                
                observer.unobserve(entry.target);
            }
        });
    }, observerOptions);
    
    const statisticsSection = document.getElementById('statistics');
    if (statisticsSection) {
        observer.observe(statisticsSection);
    }
}

// Animate counter from 0 to target value
function animateCounter(element, targetValue) {
    let currentValue = 0;
    const increment = targetValue / 50; // Animate over 50 steps
    const speed = 30; // milliseconds per step
    
    const counter = setInterval(() => {
        currentValue += increment;
        
        if (currentValue >= targetValue) {
            element.textContent = targetValue.toLocaleString();
            clearInterval(counter);
        } else {
            element.textContent = Math.floor(currentValue).toLocaleString();
        }
    }, speed);
}