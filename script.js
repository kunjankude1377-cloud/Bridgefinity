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

// Initialize on page load
document.addEventListener('DOMContentLoaded', function() {
    setupFilterButtons();
    setupSearchInput();
    setupFAQ();
    setupNewsletter();
    setupScrollAnimations();
    setupStatisticCounter();
    setupLiveImpactRadar();
    setupButtonFeedback();
    setupLoginPanel();
    setupNgoRegistration();
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
        const email = document.getElementById('loginEmail').value;
        closePanel();
        openButton.textContent = `Hi, ${email.split('@')[0]}`;
        openButton.classList.add('is-signed-in');
    });

    if (window.location.hash === '#login') {
        openButton.click();
    }
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
    
    eventCards.forEach(card => {
        const eventType = card.querySelector('.event-type')?.textContent.trim();
        const eventTitle = card.querySelector('h2')?.textContent.toLowerCase();
        const eventDescription = card.querySelector('p:nth-of-type(2)')?.textContent.toLowerCase();
        
        // Check if event matches filter
        const matchesFilter = currentFilter === 'All' || eventType === currentFilter;
        
        // Check if event matches search
        const matchesSearch = eventTitle.includes(searchTerm) || eventDescription.includes(searchTerm);
        
        // Show or hide event
        if (matchesFilter && matchesSearch) {
            card.style.display = 'block';
        } else {
            card.style.display = 'none';
        }
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