document.addEventListener('DOMContentLoaded', () => {
    const overlay = document.getElementById('intro-overlay');
    const expansions = document.querySelectorAll('.intro-expand');
    const tagline = document.querySelector('.intro-tagline');

    // Prevent scrolling while intro is active
    document.body.style.overflow = 'hidden';

    // 1. Initial delay then expand text
    setTimeout(() => {
        expansions.forEach(el => el.classList.add('expanded'));
    }, 500);

    // 2. Reveal tagline
    setTimeout(() => {
        tagline.classList.add('visible');
    }, 1200);

    // 3. Fade out overlay
    setTimeout(() => {
        overlay.classList.add('fade-out');
        document.body.style.overflow = ''; // Re-enable scrolling
        
        // Trigger the hero section animations manually if needed
        // though the IntersectionObserver usually handles this
    }, 3500);

    // 4. Remove from DOM
    setTimeout(() => {
        overlay.remove();
    }, 4500);
});
