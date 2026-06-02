const menuToggle = document.querySelector(".menu-toggle");
const navLinks = document.querySelector(".nav-links");
const filterButtons = document.querySelectorAll(".filter-button");
const courseCards = document.querySelectorAll(".course-card");
const leadForm = document.querySelector("#lead-form");
const statusText = document.querySelector(".form-status");
const revealItems = document.querySelectorAll(".reveal");

menuToggle?.addEventListener("click", () => {
  const isOpen = navLinks.classList.toggle("open");
  document.body.classList.toggle("menu-open", isOpen);
  menuToggle.setAttribute("aria-expanded", String(isOpen));
});

navLinks?.addEventListener("click", (event) => {
  if (event.target instanceof HTMLAnchorElement) {
    navLinks.classList.remove("open");
    document.body.classList.remove("menu-open");
    menuToggle?.setAttribute("aria-expanded", "false");
  }
});

filterButtons.forEach((button) => {
  button.addEventListener("click", () => {
    const selectedFilter = button.dataset.filter;

    filterButtons.forEach((item) => item.classList.remove("active"));
    button.classList.add("active");

    courseCards.forEach((card) => {
      const shouldShow = selectedFilter === "all" || card.dataset.category === selectedFilter;
      card.classList.toggle("is-hidden", !shouldShow);
    });
  });
});

leadForm?.addEventListener("submit", (event) => {
  event.preventDefault();

  const formData = new FormData(leadForm);
  const studentName = formData.get("name")?.toString().trim() || "دوست عزیز";

  statusText.textContent = `${studentName}، درخواست شما ثبت شد. تیم مشاوره به‌زودی تماس می‌گیرد.`;
  leadForm.reset();
});

const revealObserver = new IntersectionObserver(
  (entries) => {
    entries.forEach((entry) => {
      if (entry.isIntersecting) {
        entry.target.classList.add("visible");
        revealObserver.unobserve(entry.target);
      }
    });
  },
  { threshold: 0.14 },
);

revealItems.forEach((item) => revealObserver.observe(item));
