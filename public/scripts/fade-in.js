// Reveal sections with [data-fade-in] as they enter the viewport
const observer = new IntersectionObserver(
  (entries) => {
    for (const entry of entries) {
      if (entry.isIntersecting) {
        entry.target.setAttribute('data-visible', 'true');
        observer.unobserve(entry.target);
      }
    }
  },
  { threshold: 0.15 }
);
document.querySelectorAll('[data-fade-in]').forEach((el) => observer.observe(el));
