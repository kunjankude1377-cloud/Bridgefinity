console.log("Bridgefinity V2 loaded successfully.");

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

const VOLUNTEER_PROFILE_KEY = 'bridgefinityVolunteerProfile';

const defaultVolunteerProfile = {
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

function hasVolunteerProfile() {
    return Boolean(localStorage.getItem(VOLUNTEER_PROFILE_KEY));
}

function getVolunteerProfile() {
    try {
        const savedProfile = localStorage.getItem(VOLUNTEER_PROFILE_KEY);
        if (!savedProfile) {
            return { ...defaultVolunteerProfile };
        }
        return { ...defaultVolunteerProfile, ...JSON.parse(savedProfile) };
    } catch (error) {
        return { ...defaultVolunteerProfile };
    }
}

function saveVolunteerProfile(profile) {
    localStorage.setItem(VOLUNTEER_PROFILE_KEY, JSON.stringify(profile));
}

function getFirstName(fullName) {
    return (fullName || 'Volunteer').trim().split(' ')[0] || 'Volunteer';
}

function setupAuthUI() {
    const loginButton = document.querySelector('[data-login-open]');
    const userMenu = document.querySelector('[data-user-menu]');
    const userName = document.querySelector('[data-user-name]');
    const logoutButtons = document.querySelectorAll('[data-logout]');
    const trigger = document.querySelector('[data-user-trigger]');
    const profile = getVolunteerProfile();
    const isLoggedIn = hasVolunteerProfile();

    if (loginButton && userMenu && userName) {
        loginButton.hidden = isLoggedIn;
        userMenu.classList.toggle('is-visible', isLoggedIn);
        userName.textContent = getFirstName(profile.name);
    }

    if (trigger) {
        trigger.addEventListener('click', () => {
            const menu = trigger.closest('.nav-user-menu');
            if (!menu) return;
            menu.classList.toggle('is-open');
        });
    }

    logoutButtons.forEach(button => {
        button.addEventListener('click', () => {
            localStorage.removeItem(VOLUNTEER_PROFILE_KEY);
            window.location.href = 'index.html';
        });
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
    const profile = getVolunteerProfile();
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

    if (pageName) pageName.textContent = profile.name;
    if (pageNameDetail) pageNameDetail.textContent = profile.name;
    if (pageEmail) pageEmail.textContent = profile.email;
    if (pageLocation) pageLocation.textContent = profile.location;
    if (pageInterests) pageInterests.innerHTML = profile.interests.map(item => `<span>${item}</span>`).join('');
    if (pageSkills) pageSkills.textContent = profile.skills;
    if (pageAvailability) pageAvailability.textContent = profile.availability;
    if (pagePrefLocation) pagePrefLocation.textContent = profile.preferences.location;
    if (pagePrefCause) pagePrefCause.textContent = profile.preferences.cause;
    if (pagePrefDays) pagePrefDays.textContent = profile.preferences.days;
    if (pagePrefTime) pagePrefTime.textContent = profile.preferences.time;

    const renderList = (target, items) => {
        if (!target) return;
        target.innerHTML = items.map(item => `<li>${item}</li>`).join('');
    };

    renderList(savedList, profile.activity.saved);
    renderList(registeredList, profile.activity.registered);
    renderList(upcomingList, profile.activity.upcoming);
    renderList(pastList, profile.activity.past);
}

// Initialize on page load
document.addEventListener('DOMContentLoaded', function() {
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
    renderProfilePage();
});

function setupNgoRegistration() {
    const overlay = document.querySelector('.ngo-overlay');
    const openButton = document.querySelector('[data-ngo-open]');
    const closeButton = document.querySelector('[data-ngo-close]');
    const doneButton = document.querySelector('[data-ngo-done]');
    const form = document.getElementById('ngoForm');
    const success = document.getElementById('ngoSuccess');

    if (!overlay || !openButton || !closeButton || !doneButton || !form || !success) return;

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
    doneButton.addEventListener('click', closePanel);
    overlay.addEventListener('click', event => { if (event.target === overlay) closePanel(); });
    document.addEventListener('keydown', event => { if (event.key === 'Escape' && overlay.classList.contains('is-open')) closePanel(); });
    form.addEventListener('submit', event => {
        event.preventDefault();
        form.hidden = true;
        success.hidden = false;
    });
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

    form.addEventListener('submit', (event) => {
        event.preventDefault();
        const formData = new FormData(form);
        const profile = getVolunteerProfile();
        const interestsValue = String(formData.get('interests') || '').split(',').map(item => item.trim()).filter(Boolean);

        profile.name = String(formData.get('name') || profile.name).trim();
        profile.email = String(formData.get('email') || profile.email).trim();
        profile.location = String(formData.get('location') || profile.location).trim();
        profile.interests = interestsValue.length ? interestsValue : profile.interests;
        profile.skills = String(formData.get('skills') || profile.skills).trim();
        profile.availability = String(formData.get('availability') || profile.availability).trim();
        profile.preferences = {
            ...profile.preferences,
            location: String(formData.get('prefLocation') || profile.preferences.location).trim(),
            cause: String(formData.get('prefCause') || profile.preferences.cause).trim(),
            days: String(formData.get('prefDays') || profile.preferences.days).trim(),
            time: String(formData.get('prefTime') || profile.preferences.time).trim()
        };

        saveVolunteerProfile(profile);
        renderProfilePage();
        setupAuthUI();
        form.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    });
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

    form.addEventListener('submit', event => {
        event.preventDefault();
        if (!validateRegistrationForm(form)) {
            return;
        }

        const formData = new FormData(form);
        const profile = {
            ...defaultVolunteerProfile,
            name: String(formData.get('name') || '').trim(),
            email: String(formData.get('email') || '').trim(),
            location: String(formData.get('location') || '').trim(),
            interests: [...document.querySelectorAll('input[name="interests"]:checked')].map(item => item.value),
            availability: document.querySelector('input[name="availability"]:checked')?.value || 'Both',
            skills: 'Community engagement, hands-on volunteering, project support',
            preferences: {
                location: String(formData.get('location') || '').trim(),
                cause: 'Environment and Community',
                days: 'Weekends',
                time: 'Morning'
            },
            activity: {
                saved: ['Community Tree Plantation Drive', 'Weekend Learning Support'],
                registered: ['Volunteer Orientation'],
                upcoming: ['Plantation Drive · Sat, 20 Sep'],
                past: ['School Supply Drive']
            }
        };

        saveVolunteerProfile(profile);
        setupAuthUI();
        openSuccessModal();
    });
}

function setupLoginPanel() {
    const overlay = document.querySelector('.login-overlay');
    const openButton = document.querySelector('[data-login-open]');
    const closeButton = document.querySelector('[data-login-close]');
    const form = document.getElementById('loginForm');

    if (!overlay || !openButton || !closeButton || !form) {
        return;
    }

    const closePanel = () => {
        overlay.classList.remove('is-open');
        overlay.setAttribute('aria-hidden', 'true');
        overlay.style.removeProperty('opacity');
        overlay.style.removeProperty('visibility');
        document.body.classList.remove('modal-open');
    };

    openButton.addEventListener('click', event => {
        event.preventDefault();
        overlay.classList.add('is-open');
        overlay.setAttribute('aria-hidden', 'false');
        overlay.style.setProperty('opacity', '1', 'important');
        overlay.style.setProperty('visibility', 'visible', 'important');
        document.body.classList.add('modal-open');
        window.setTimeout(() => document.getElementById('loginEmail').focus(), 250);
    });

    closeButton.addEventListener('click', closePanel);
    overlay.addEventListener('click', event => {
        if (event.target === overlay) closePanel();
    });
    document.addEventListener('keydown', event => {
        if (event.key === 'Escape' && overlay.classList.contains('is-open')) closePanel();
    });

    form.addEventListener('submit', event => {
        event.preventDefault();
        const email = document.getElementById('loginEmail').value.trim();
        const password = document.getElementById('loginPassword').value.trim();
        const errorBox = document.getElementById('loginError');

        if (!email || !password) {
            errorBox.textContent = 'Please enter both email and password.';
            return;
        }

        const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailPattern.test(email)) {
            errorBox.textContent = 'Please enter a valid email address.';
            return;
        }

        const profile = {
            ...defaultVolunteerProfile,
            name: email.split('@')[0].replace(/[._-]/g, ' ').replace(/\b\w/g, letter => letter.toUpperCase()),
            email,
            location: 'Nagpur, Maharashtra',
            preferences: {
                ...defaultVolunteerProfile.preferences,
                location: 'Nagpur, Wardha Road'
            }
        };

        errorBox.textContent = '';
        saveVolunteerProfile(profile);
        closePanel();
        setupAuthUI();

        if (window.location.pathname.endsWith('profile.html')) {
            renderProfilePage();
            return;
        }

        window.location.href = 'profile.html';
    });

    if (window.location.hash === '#login') {
        openButton.click();
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

// Setup filter buttons
function setupFilterButtons() {
    const filterBtns = document.querySelectorAll('.filter-btn');
    filterBtns.forEach(btn => {
        btn.addEventListener('click', function() {
            // Remove active class from all buttons
            filterBtns.forEach(b => b.classList.remove('active-filter'));
            
            // Add active class to clicked button
            this.classList.add('active-filter');
            
            // Get filter value
            currentFilter = this.textContent.trim().toUpperCase();
            
            // Filter and display events
            filterEvents();
        });
    });
}

// Setup search input
function setupSearchInput() {
    const searchInput = document.getElementById('searchInput');
    if (searchInput) {
        searchInput.addEventListener('input', function() {
            filterEvents();
        });
    }
}

// Filter events based on category and search term
function filterEvents() {
    const searchTerm = document.getElementById('searchInput')?.value.toLowerCase() || '';
    const eventCards = document.querySelectorAll('.event-card');
    const eventsContainer = document.querySelector('.events-container');
    let visibleEvents = 0;
    
    eventCards.forEach(card => {
        const eventType = card.querySelector('.event-type')?.textContent.trim().toUpperCase() || '';
        const cardText = card.textContent.toLowerCase();
        
        const matchesFilter = currentFilter === 'All' || eventType === currentFilter;
        const matchesSearch = cardText.includes(searchTerm);
        const isVisible = matchesFilter && matchesSearch;

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

    if (!modal || !closeButton || !title || !type || !description || !info || !detailButtons.length) return;

    const closeModal = () => {
        modal.classList.remove('is-open');
        modal.setAttribute('aria-hidden', 'true');
        document.body.classList.remove('modal-open');
    };

    detailButtons.forEach(button => button.addEventListener('click', () => {
        const card = button.closest('.event-card');
        if (!card) return;
        type.textContent = card.querySelector('.event-type')?.textContent.trim() || 'VOLUNTEER OPPORTUNITY';
        title.textContent = card.querySelector('h2')?.textContent.trim() || 'Opportunity details';
        description.textContent = card.querySelector('.event-details > p:not(.event-type)')?.textContent.trim() || '';
        info.innerHTML = [...card.querySelectorAll('.event-info span, .event-meta span')]
            .map(item => `<span>${item.textContent.trim()}</span>`)
            .join('');
        modal.classList.add('is-open');
        modal.setAttribute('aria-hidden', 'false');
        document.body.classList.add('modal-open');
    }));

    closeButton.addEventListener('click', closeModal);
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