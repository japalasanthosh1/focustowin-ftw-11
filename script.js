document.addEventListener('DOMContentLoaded', () => {
    initPreloader();
    initScrollAnimations();
    initDynamicText();
    initCardShine();
    initLiquidDistortion();
    initLenis();
});

function initPreloader() {
    setTimeout(() => {
        document.querySelector('.preloader').classList.add('loaded');
    }, 1500);
}

function initScrollAnimations() {
    const chapters = document.querySelectorAll('.chapter');
    const navLinks = document.querySelectorAll('.nav-links a');

    const observer = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                // Activate animations
                entry.target.classList.add('visible');

                // Update Background if needed (CSS transition handles this via .visible if we add classes)

                // Update Nav
                const id = entry.target.id;
                navLinks.forEach(link => {
                    link.classList.remove('active');
                    if (link.getAttribute('href') === `#${id}`) {
                        link.classList.add('active');
                    }
                });
            }
        });
    }, { threshold: 0.5 }); // Trigger when 50% visible

    chapters.forEach(chapter => observer.observe(chapter));
}

/* Mouse Parallax & Magnetic Cursor Removed */


function initDynamicText() {
    const textEl = document.querySelector('.dynamic-text');
    if (!textEl) return;

    const words = ['WIN', 'BUILD', 'SCALE', 'LEAD'];
    let wordIndex = 0;
    let charIndex = 0;
    let isDeleting = false;
    let typeSpeed = 100;

    function type() {
        const currentWord = words[wordIndex];

        if (isDeleting) {
            textEl.textContent = currentWord.substring(0, charIndex - 1);
            charIndex--;
            typeSpeed = 50;
        } else {
            textEl.textContent = currentWord.substring(0, charIndex + 1);
            charIndex++;
            typeSpeed = 150;
        }

        if (!isDeleting && charIndex === currentWord.length) {
            isDeleting = true;
            typeSpeed = 2000; // Pause at end
        } else if (isDeleting && charIndex === 0) {
            isDeleting = false;
            wordIndex = (wordIndex + 1) % words.length;
            typeSpeed = 500; // Pause before new word
        }

        setTimeout(type, typeSpeed);
    }

    type();
}

function initCardShine() {
    const cards = document.querySelectorAll('.grid-card, .event-card, .trend-card, .showcase-item');

    document.addEventListener('mousemove', (e) => {
        cards.forEach(card => {
            const rect = card.getBoundingClientRect();
            const x = e.clientX - rect.left;
            const y = e.clientY - rect.top;

            card.style.setProperty('--mouse-x', `${x}px`);
            card.style.setProperty('--mouse-y', `${y}px`);
        });
    });
}

function initLiquidDistortion() {
    const filter = document.querySelector('#liquid feTurbulence');
    let frames = 0;

    function animateFluid() {
        frames += 1;
        const freqX = 0.01 + 0.005 * Math.sin(frames * 0.01);
        const freqY = 0.01 + 0.005 * Math.cos(frames * 0.01);

        filter.setAttribute('baseFrequency', `${freqX} ${freqY}`);
        requestAnimationFrame(animateFluid);
    }

    animateFluid();
}

function initLenis() {
    const lenis = new Lenis({
        duration: 1.2,
        easing: (t) => Math.min(1, 1.001 - Math.pow(2, -10 * t)), // https://www.desmos.com/calculator/brs54l4x87
        direction: 'vertical',
        gestureDirection: 'vertical',
        smooth: true,
        mouseMultiplier: 1,
        smoothTouch: false,
        touchMultiplier: 2,
    });

    function raf(time) {
        lenis.raf(time);
        requestAnimationFrame(raf);
    }

    requestAnimationFrame(raf);
}



// Form Submit Handler for the Join Form
document.addEventListener('DOMContentLoaded', () => {

    // --- Load Dynamic Content for Home Page ---
    async function loadDynamicContent() {
        try {
            // 1. Featured Videos (Priority 1 = Main, rest = Gallery)
            const videoRes = await fetch('/api/videos');
            if (videoRes.ok) {
                const videos = await videoRes.json();

                if (videos.length > 0) {
                    // Main Video (Priority 1)
                    const mainVideo = videos[0];
                    const iframe = document.getElementById('dynamicYoutube');
                    const link = document.getElementById('dynamicYoutubeLink');
                    if (iframe) iframe.src = `https://www.youtube-nocookie.com/embed/${mainVideo.youtubeId}?si=controls=1&rel=0`;
                    if (link) link.href = `https://youtu.be/${mainVideo.youtubeId}`;

                    // Gallery Grid Population
                    const grid = document.getElementById('modalGalleryGrid');
                    if (grid) {
                        grid.innerHTML = ''; // Clear default
                        // Create a thumbnail for every video *except* the currently featured main video
                        const galleryVideos = videos.slice(1);

                        if (galleryVideos.length === 0) {
                            grid.innerHTML = '<p style="color: var(--text-secondary);">No other videos available in the gallery.</p>';
                        } else {
                            // Preload the first gallery video (Priority 2) into the modal player
                            const modalPlayer = document.getElementById('modalPlayer');
                            if (modalPlayer) modalPlayer.src = `https://www.youtube-nocookie.com/embed/${galleryVideos[0].youtubeId}?si=controls=1&rel=0`;

                            galleryVideos.forEach(v => {
                                const thumbUrl = `https://img.youtube.com/vi/${v.youtubeId}/hqdefault.jpg`;
                                grid.innerHTML += `
                                    <div class="gallery-thumb" style="cursor: pointer; border-radius: 12px; overflow: hidden; background: #000; border: 1px solid rgba(255,255,255,0.1); transition: transform 0.2s; position: relative;" onclick="playInModal('${v.youtubeId}')">
                                        <img src="${thumbUrl}" alt="${v.title}" style="width: 100%; aspect-ratio: 16/9; object-fit: cover; opacity: 0.8; transition: opacity 0.2s;" onmouseover="this.style.opacity='1'" onmouseout="this.style.opacity='0.8'">
                                        <div style="padding: 15px; position: absolute; bottom: 0; left: 0; width: 100%; background: linear-gradient(to top, rgba(0,0,0,0.9), transparent);">
                                            <h4 style="margin: 0; font-size: 0.9rem; color: #fff;">${v.title}</h4>
                                        </div>
                                    </div>
                                `;
                            });
                        }
                    }
                }
            }

            // 2. Events
            const eventsRes = await fetch('/api/events');
            if (eventsRes.ok) {
                const events = await eventsRes.json();
                const eventsContainer = document.getElementById('dynamicEventsContainer');
                if (eventsContainer) {
                    eventsContainer.innerHTML = ''; // Clear loading
                    if (events.length === 0) {
                        eventsContainer.innerHTML = '<div style="text-align: center; color: var(--text-secondary); width: 100%;">No upcoming events scheduled. Stay tuned.</div>';
                    } else {
                        events.forEach((event, index) => {
                            const dateObj = new Date(event.date);
                            const day = dateObj.getDate();
                            const month = dateObj.toLocaleString('default', { month: 'short' }).toUpperCase();
                            const isFeatured = index === 0 ? 'featured' : '';

                            eventsContainer.innerHTML += `
                                <div class="event-card ${isFeatured}">
                                    <div class="event-date">
                                        <span class="day">${day}</span>
                                        <span class="month">${month}</span>
                                    </div>
                                    <div class="event-info">
                                        <h3>${event.title}</h3>
                                        <p>${event.description}</p>
                                        ${event.location ? `<span class="location">📍 ${event.location}</span>` : ''}
                                    </div>
                                    <button class="cta-button">Register</button>
                                </div>
                            `;
                        });
                    }
                }
            }

            // 3. Top Rated (Trending Content Links)
            const topRes = await fetch('/api/toprated');
            if (topRes.ok) {
                const topItems = await topRes.json();
                const container = document.getElementById('dynamicTopRatedContainer');
                if (container) {
                    container.innerHTML = '';
                    if (topItems.length === 0) {
                        container.innerHTML = '<div style="text-align: center; color: var(--text-secondary); width: 100%; padding: 20px; grid-column: 1 / -1;">No trending content at the moment.</div>';
                    } else {
                        topItems.forEach(item => {
                            const hlClass = item.highlight ? 'highlight' : '';
                            const bgImage = item.imageUrl ? `url('${item.imageUrl}')` : 'linear-gradient(45deg, #111, #222)';

                            container.innerHTML += `
                                <a href="${item.url}" target="_blank" class="trend-card ${hlClass}" style="text-decoration: none; color: inherit; overflow: hidden; display: flex; flex-direction: column; padding: 0;">
                                    <div style="height: 160px; width: 100%; background: ${bgImage} center/cover no-repeat; border-bottom: 1px solid rgba(255,255,255,0.05); border-radius: 20px 20px 0 0; position: relative;">
                                         <span class="status-badge" style="position: absolute; top: 15px; left: 15px; background: rgba(0,0,0,0.7); backdrop-filter: blur(5px); border: 1px solid rgba(255,255,255,0.2); color: #fff;">${item.tag}</span>
                                    </div>
                                    <div style="padding: 25px; flex-grow: 1; display: flex; flex-direction: column; justify-content: space-between;">
                                        <div>
                                            <h3 style="margin-bottom: 10px; font-size: 1.2rem; color: #fff;">${item.title || 'View Link'}</h3>
                                            <p style="color: var(--text-secondary); font-size: 0.95rem; margin-bottom: 20px; display: -webkit-box; -webkit-line-clamp: 3; -webkit-box-orient: vertical; overflow: hidden;">${item.description || item.url}</p>
                                        </div>
                                        <div style="display: flex; justify-content: flex-end;">
                                            <div class="card-action" style="color: var(--accent-color); font-weight: bold; font-size: 0.9rem;">Read More →</div>
                                        </div>
                                    </div>
                                </a>
                            `;
                        });
                    }
                }
            }
        } catch (error) {
            console.error("Error loading dynamic content:", error);
        }
    }

    // Only run loadDynamicContent if we are actually on a page that needs it (like index.html)
    if (document.getElementById('dynamicEventsContainer')) {
        loadDynamicContent();
    }

    // --- Join Form Submission ---
    const joinForm = document.getElementById('joinForm');
    if (joinForm) {
        joinForm.addEventListener('submit', async (e) => {
            e.preventDefault();

            const msgEl = document.getElementById('formMsg');
            msgEl.style.color = 'var(--text-secondary)';
            msgEl.innerText = 'Submitting application...';

            const submitBtn = joinForm.querySelector('button[type="submit"]');
            if (submitBtn) {
                submitBtn.disabled = true;
                submitBtn.innerText = 'Submitting...';
            }

            const payload = {
                fullName: document.getElementById('joinName').value,
                email: document.getElementById('joinEmail').value,
                role: document.getElementById('joinRole').value,
                description: document.getElementById('joinDescription').value,
                socialUrl: document.getElementById('joinSocial').value
            };

            try {
                const res = await fetch('/api/applications', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(payload)
                });

                if (res.ok) {
                    msgEl.style.color = '#4CAF50';
                    msgEl.innerText = 'Application Submitted Successfully!';
                    joinForm.reset();
                } else {
                    msgEl.style.color = '#FF1A1A';
                    msgEl.innerText = 'Error submitting application.';
                }
            } catch (error) {
                msgEl.style.color = '#FF1A1A';
                msgEl.innerText = 'Connection Error.';
                console.error(error);
            } finally {
                if (submitBtn) {
                    submitBtn.disabled = false;
                    submitBtn.innerText = 'Submit Application';
                }
            }
        });
    }

    // --- Video Gallery Modal Modal Logic ---
    // We must use event delegation because the button might be loaded dynamically, 
    // or attaching listener explicitly to document body to catch the click.
    document.body.addEventListener('click', (e) => {
        if (e.target && e.target.id === 'openGalleryBtn') {
            const modal = document.getElementById('videoGalleryModal');
            if (modal) {
                modal.style.display = 'block';
                document.body.style.overflow = 'hidden';
            }
        }

        if (e.target && e.target.id === 'closeGalleryBtn') {
            const modal = document.getElementById('videoGalleryModal');
            if (modal) {
                modal.style.display = 'none';
                document.body.style.overflow = 'auto';
            }
        }
    });

    // --- Mobile Menu Logic ---
    const mobileMenuBtn = document.getElementById('mobileMenuBtn');
    const mobileNavOverlay = document.getElementById('mobileNavOverlay');
    const mobileNavClose = document.getElementById('mobileNavClose');
    const mobileNavLinks = document.querySelectorAll('.mobile-nav-link');

    if (mobileMenuBtn && mobileNavOverlay) {
        mobileMenuBtn.addEventListener('click', () => {
            mobileNavOverlay.classList.add('active');
            document.body.style.overflow = 'hidden'; // Prevent background scrolling
        });

        mobileNavClose.addEventListener('click', () => {
            mobileNavOverlay.classList.remove('active');
            document.body.style.overflow = '';
        });

        mobileNavLinks.forEach(link => {
            link.addEventListener('click', () => {
                mobileNavOverlay.classList.remove('active');
                document.body.style.overflow = '';
            });
        });
    }
});

// Global function to swap out the active modal video
window.playInModal = function (videoId) {
    const player = document.getElementById('modalPlayer');
    if (player) {
        player.src = `https://www.youtube-nocookie.com/embed/${videoId}?si=controls=1&autoplay=1`;
        // Scroll container back up to the player
        document.getElementById('videoGalleryModal').scrollTo({ top: 0, behavior: 'smooth' });
    }
}
