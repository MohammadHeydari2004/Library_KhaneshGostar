/**
 * @fileoverview فایل اصلی جاوااسکریپت پروژه «کتابخانه خوانش گستر».
 * این ماژول شامل مدیریت تم، انیمیشن‌های اسکرول، منوی موبایل،
 * سیستم آکاردئون (FAQ) و سایر تعاملات رابط کاربری است.
 *
 * @author Mohammad Heydari
 * @version 1.0.0
 */
(function () {
  "use strict";

  // تنظیم حالت بازیابی اسکرول به دستی برای جلوگیری از پرش‌های ناخواسته مرورگر
  if ("scrollRestoration" in history) {
    history.scrollRestoration = "manual";
  }

  /**
   * تابع کمکی برای انتخاب اولین عنصر مطابق با سلکتور CSS.
   * @function $
   * @param {string} s - سلکتور CSS.
   * @param {Document|Element} [c=document] - کانتکست یا محدوده جستجو.
   * @returns {Element|null} عنصر یافت‌شده یا null.
   */
  const $ = (s, c = document) => c.querySelector(s);

  /**
   * تابع کمکی برای انتخاب تمامی عناصر مطابق با سلکتور CSS و تبدیل آن‌ها به آرایه.
   * @function $$
   * @param {string} s - سلکتور CSS.
   * @param {Document|Element} [c=document] - کانتکست یا محدوده جستجو.
   * @returns {Element[]} آرایه‌ای از عناصر یافت‌شده.
   */
  const $$ = (s, c = document) => Array.from(c.querySelectorAll(s));

  /**
   * بررسی تنظیمات سیستم عامل کاربر برای کاهش انیمیشن‌ها (دسترس‌پذیری / A11y).
   * @type {boolean}
   * @constant
   */
  const prefersReducedMotion = window.matchMedia(
    "(prefers-reduced-motion: reduce)",
  ).matches;

  /**
   * شیء کمکی برای مدیریت ایمن LocalStorage.
   * از بروز خطا در حالت‌هایی مانند Incognito یا پر بودن حافظه جلوگیری می‌کند.
   * @namespace safeStorage
   */
  const safeStorage = {
    /**
     * دریافت مقدار از LocalStorage.
     * @param {string} key - کلید مورد نظر.
     * @returns {string|null} مقدار ذخیره‌شده یا null در صورت بروز خطا.
     */
    get(key) {
      try {
        return localStorage.getItem(key);
      } catch {
        return null;
      }
    },
    /**
     * ذخیره مقدار در LocalStorage.
     * @param {string} key - کلید مورد نظر.
     * @param {string} value - مقدار رشته‌ای برای ذخیره.
     * @returns {void}
     */
    set(key, value) {
      try {
        localStorage.setItem(key, value);
      } catch {
        /* رد شو */
      }
    },
  };

  /** @type {HTMLElement|null} ارجاع به عنصر صفحه لودینگ */
  const loadingScreen = $("#loadingScreen");
  /** @type {boolean} وضعیت مخفی بودن صفحه لودینگ */
  let loadingHidden = false;

  /**
   * مخفی کردن صفحه لودینگ با افزودن کلاس hidden.
   * @function hideLoading
   * @returns {void}
   */
  const hideLoading = () => {
    if (loadingHidden || !loadingScreen) return;
    loadingHidden = true;
    loadingScreen.classList.add("hidden");
  };

  window.addEventListener("load", hideLoading);
  setTimeout(hideLoading, 1800);

  /**
   * ماژول مدیریت تم (روشن/تاریک) و هماهنگی با تنظیمات سیستم.
   * @namespace ThemeManager
   */
  const ThemeManager = {
    /** @type {string} کلید ذخیره‌سازی تم در LocalStorage */
    STORAGE_KEY: "library-theme",
    /** @type {HTMLButtonElement|null} ارجاع به دکمه تغییر تم */
    toggle: $("#themeToggle"),
    /** @type {HTMLElement} ارجاع به تگ ریشه HTML */
    html: document.documentElement,

    /**
     * راه‌اندازی اولیه ماژول تم و ثبت رویدادها.
     * @memberof ThemeManager
     * @returns {void}
     */
    init() {
      if (!this.toggle) return;
      this.loadTheme();
      this.toggle.addEventListener("click", () => this.switchTheme());
      this.watchSystemPreference();
    },

    /**
     * بارگذاری تم از LocalStorage یا تشخیص تم پیش‌فرض سیستم.
     * @memberof ThemeManager
     * @returns {void}
     */
    loadTheme() {
      const saved = safeStorage.get(this.STORAGE_KEY);
      if (saved === "dark" || saved === "light") {
        this.html.setAttribute("data-theme", saved);
      } else {
        const prefersDark = window.matchMedia(
          "(prefers-color-scheme: dark)",
        ).matches;
        this.html.setAttribute("data-theme", prefersDark ? "dark" : "light");
      }
      this.updateMetaTheme();
    },

    /**
     * تغییر تم بین روشن و تاریک و ذخیره آن.
     * @memberof ThemeManager
     * @returns {void}
     */
    switchTheme() {
      const current = this.html.getAttribute("data-theme");
      const next = current === "light" ? "dark" : "light";
      this.html.setAttribute("data-theme", next);
      safeStorage.set(this.STORAGE_KEY, next);
      this.updateMetaTheme();

      if (!prefersReducedMotion) {
        this.toggle.animate(
          [
            { transform: "scale(1)" },
            { transform: "scale(0.85)" },
            { transform: "scale(1)" },
          ],
          { duration: 300, easing: "ease-in-out" },
        );
      }
    },

    /**
     * پایش تغییرات تم در سطح سیستم عامل (OS-level preference).
     * @memberof ThemeManager
     * @returns {void}
     */
    watchSystemPreference() {
      window
        .matchMedia("(prefers-color-scheme: dark)")
        .addEventListener("change", (e) => {
          if (!safeStorage.get(this.STORAGE_KEY)) {
            this.html.setAttribute("data-theme", e.matches ? "dark" : "light");
            this.updateMetaTheme();
          }
        });
    },

    /**
     * به‌روزرسانی متا تگ theme-color برای هماهنگی مرورگرهای موبایل.
     * @memberof ThemeManager
     * @returns {void}
     */
    updateMetaTheme() {
      const meta = $('meta[name="theme-color"]');
      if (meta) {
        meta.setAttribute(
          "content",
          this.html.getAttribute("data-theme") === "dark"
            ? "#10140d"
            : "#f7f2e2",
        );
      }
    },
  };

  ThemeManager.init();

  /** @type {HTMLButtonElement|null} دکمه همبرگری منوی موبایل */
  const mobileMenuToggle = $("#mobileMenuToggle");
  /** @type {HTMLElement|null} کانتینر اصلی منوی ناوبری */
  const mainNav = $("#mainNav");

  /**
   * بررسی وضعیت باز بودن منوی موبایل.
   * @function isMenuOpen
   * @returns {boolean} وضعیت باز بودن منو.
   */
  const isMenuOpen = () => mainNav && mainNav.classList.contains("open");

  /**
   * بستن منوی موبایل و تنظیم اتریبیوت‌های دسترس‌پذیری (A11y).
   * @function closeMobileMenu
   * @returns {void}
   */
  const closeMobileMenu = () => {
    if (!mainNav || !mobileMenuToggle) return;
    mainNav.classList.remove("open");
    mobileMenuToggle.classList.remove("active");
    mobileMenuToggle.setAttribute("aria-expanded", "false");
  };

  /**
   * باز کردن منوی موبایل و تنظیم اتریبیوت‌های دسترس‌پذیری (A11y).
   * @function openMobileMenu
   * @returns {void}
   */
  const openMobileMenu = () => {
    if (!mainNav || !mobileMenuToggle) return;
    mainNav.classList.add("open");
    mobileMenuToggle.classList.add("active");
    mobileMenuToggle.setAttribute("aria-expanded", "true");
  };

  if (mobileMenuToggle && mainNav) {
    mobileMenuToggle.addEventListener("click", (e) => {
      e.stopPropagation();
      isMenuOpen() ? closeMobileMenu() : openMobileMenu();
    });

    $$(".nav_link", mainNav).forEach((link) => {
      link.addEventListener("click", () => {
        if (window.innerWidth < 1024) closeMobileMenu();
      });
    });

    document.addEventListener("click", (e) => {
      if (
        window.innerWidth < 1024 &&
        isMenuOpen() &&
        !mainNav.contains(e.target) &&
        !mobileMenuToggle.contains(e.target)
      ) {
        closeMobileMenu();
      }
    });

    window.addEventListener(
      "scroll",
      () => {
        if (window.innerWidth < 1024 && isMenuOpen()) closeMobileMenu();
      },
      { passive: true },
    );

    document.addEventListener("keydown", (e) => {
      if (e.key === "Escape" && isMenuOpen()) {
        closeMobileMenu();
        mobileMenuToggle.focus();
      }
    });
  }

  /** @type {number|undefined} تایمر برای Debounce کردن رویداد تغییر ابعاد */
  let resizeTimer;
  window.addEventListener("resize", () => {
    clearTimeout(resizeTimer);
    resizeTimer = setTimeout(() => {
      if (window.innerWidth >= 1024) closeMobileMenu();
    }, 120);
  });

  /** @type {HTMLElement|null} ارجاع به هدر سایت */
  const header = $(".header");
  /** @type {HTMLElement|null} نوار پیشرفت مطالعه */
  const readingProgress = $("#readingProgress");
  /** @type {HTMLButtonElement|null} دکمه بازگشت به بالا */
  const backToTopBtn = $("#backToTop");

  /**
   * تابع اصلی برای مدیریت رویدادهای وابسته به اسکرول (تغییر هدر، نوار پیشرفت، دکمه بک‌توتاپ).
   * @function onScrollFrame
   * @returns {void}
   */
  const onScrollFrame = () => {
    const y = window.scrollY;

    if (header) header.classList.toggle("scrolled", y > 50);

    // نوار پیشرفت
    if (readingProgress) {
      const max = document.documentElement.scrollHeight - window.innerHeight;
      const p = max > 0 ? Math.min(Math.max(y / max, 0), 1) : 0;
      readingProgress.style.transform = `scaleX(${p})`;
      readingProgress.classList.toggle("active", p > 0.001);
    }

    if (backToTopBtn) backToTopBtn.classList.toggle("visible", y > 400);

    highlightActiveSection();
  };

  /** @type {boolean} فلگ برای کنترل requestAnimationFrame و جلوگیری از Layout Thrashing */
  let ticking = false;
  window.addEventListener(
    "scroll",
    () => {
      if (!ticking) {
        window.requestAnimationFrame(() => {
          onScrollFrame();
          ticking = false;
        });
        ticking = true;
      }
    },
    { passive: true },
  );

  if (backToTopBtn) {
    backToTopBtn.addEventListener("click", () => {
      window.scrollTo({
        top: 0,
        behavior: prefersReducedMotion ? "auto" : "smooth",
      });
    });
  }

  /**
   * راه‌اندازی انیمیشن‌های ورود به viewport با استفاده از IntersectionObserver.
   * در صورت عدم پشتیبانی مرورگر یا فعال بودن prefers-reduced-motion، کلاس‌ها مستقیماً اضافه می‌شوند.
   * @function initRevealAnimations
   * @returns {void}
   */
  function initRevealAnimations() {
    const revealElements = $$(".reveal");
    if (!revealElements.length) return;

    if (!("IntersectionObserver" in window) || prefersReducedMotion) {
      revealElements.forEach((el) => el.classList.add("visible"));
      return;
    }

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add("visible");
            observer.unobserve(entry.target);
          }
        });
      },
      { threshold: 0.08, rootMargin: "0px 0px -40px 0px" },
    );

    revealElements.forEach((el) => observer.observe(el));

    setTimeout(() => {
      revealElements.forEach((el) => {
        const r = el.getBoundingClientRect();
        if (r.top < window.innerHeight && r.bottom > 0) {
          el.classList.add("visible");
        }
      });
    }, 1500);
  }

  /** @type {HTMLElement[]} لیست تمامی سکشن‌های دارای ID */
  const sections = $$("section[id]");
  /** @type {HTMLElement[]} لیست لینک‌های منوی ناوبری */
  const navLinks = $$(".nav_link");

  /**
   * برجسته‌سازی لینک منوی فعال بر اساس موقعیت اسکرول کاربر (Spy Scroll).
   * @function highlightActiveSection
   * @returns {void}
   */
  function highlightActiveSection() {
    const y = window.scrollY + window.innerHeight * 0.35;

    let currentId = null;
    sections.forEach((section) => {
      if (
        y >= section.offsetTop &&
        y < section.offsetTop + section.offsetHeight
      ) {
        currentId = section.id;
      }
    });

    navLinks.forEach((link) => {
      link.classList.toggle(
        "active",
        link.getAttribute("href") === `#${currentId}`,
      );
    });
  }

  /** @type {HTMLElement[]} لیست عناصر آکاردئون پرسش‌های متداول */
  const faqItems = $$(".faq_item");

  /**
   * انیمیشن بستن آیتم آکاردئون با مدیریت ارتفاع (Height Transition).
   * @function animateClose
   * @param {HTMLDetailsElement} details - عنصر Details هدف.
   * @returns {void}
   */
  const animateClose = (details) => {
    const wrap = details.querySelector(".faq_answer_wrap");
    if (!wrap) {
      details.open = false;
      return;
    }

    if (prefersReducedMotion) {
      details.open = false;
      wrap.style.height = "";
      return;
    }

    wrap.style.height = `${wrap.scrollHeight}px`;
    requestAnimationFrame(() => {
      wrap.style.height = "0px";
    });

    const onEnd = (e) => {
      if (e.propertyName !== "height") return;
      details.open = false;
      wrap.style.height = "";
      wrap.removeEventListener("transitionend", onEnd);
    };
    wrap.addEventListener("transitionend", onEnd);
  };

  /**
   * انیمیشن باز کردن آیتم آکاردئون با مدیریت ارتفاع (Height Transition).
   * @function animateOpen
   * @param {HTMLDetailsElement} details - عنصر Details هدف.
   * @returns {void}
   */
  const animateOpen = (details) => {
    const wrap = details.querySelector(".faq_answer_wrap");
    details.open = true;
    if (!wrap) return;

    if (prefersReducedMotion) {
      wrap.style.height = "";
      return;
    }

    wrap.style.height = "0px";
    requestAnimationFrame(() => {
      wrap.style.height = `${wrap.scrollHeight}px`;
    });

    const onEnd = (e) => {
      if (e.propertyName !== "height") return;
      wrap.style.height = "";
      wrap.removeEventListener("transitionend", onEnd);
    };
    wrap.addEventListener("transitionend", onEnd);
  };

  faqItems.forEach((item) => {
    const summary = item.querySelector(".faq_question");
    if (!summary) return;

    summary.addEventListener("click", (e) => {
      e.preventDefault();

      if (item.open) {
        animateClose(item);
      } else {
        faqItems.forEach((other) => {
          if (other !== item && other.open) animateClose(other);
        });
        animateOpen(item);
      }
    });
  });

  /** @type {HTMLElement|null} عنصر هدف برای افکت ماشین تحریر */
  const typewriterElement = $(".typewriter");

  if (typewriterElement && !prefersReducedMotion) {
    const text = typewriterElement.textContent;
    typewriterElement.textContent = "";
    typewriterElement.classList.add("typing");

    /** @type {number} اندیس فعلی کاراکتر در حال تایپ */
    let index = 0;
    /** @type {number} سرعت تایپ هر کاراکتر (میلی‌ثانیه) */
    const typeSpeed = 60;

    /**
     * تابع بازگشتی برای شبیه‌سازی افکت ماشین تحریر.
     * @function typeWriter
     * @returns {void}
     */
    const typeWriter = () => {
      if (index < text.length) {
        typewriterElement.textContent += text.charAt(index);
        index++;
        setTimeout(typeWriter, typeSpeed);
      } else {
        setTimeout(() => {
          typewriterElement.classList.remove("typing");
        }, 100);
      }
    };

    setTimeout(typeWriter, 500);
  }

  /**
   * ماژول تشخیص روز جاری هفته و علامت‌گذاری آن در جدول ساعات کاری.
   * @function markTodayRow
   * @returns {void}
   */
  (function markTodayRow() {
    const persianIndex = (new Date().getDay() + 1) % 7;
    const rows = $$(".table_body .table_row");
    const row = rows[persianIndex];
    if (!row) return;

    row.classList.add("row-today");
    const dayCell = row.querySelector(".table_data");
    if (dayCell) {
      dayCell.insertAdjacentHTML(
        "afterbegin",
        '<span class="today_chip">امروز</span>',
      );
    }
  })();

  /**
   * تابع راه‌انداز اولیه برای اجرای همزمان انیمیشن‌ها و تنظیمات اسکرول.
   * @function bootstrap
   * @returns {void}
   */
  const bootstrap = () => {
    initRevealAnimations();
    onScrollFrame();
  };

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", bootstrap);
  } else {
    bootstrap();
  }
})();
