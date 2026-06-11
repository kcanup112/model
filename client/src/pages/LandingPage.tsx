import React, { useEffect, useState, useRef, useCallback } from 'react';
import { Link } from 'react-router-dom';
import {
  GraduationCap, Clock, FileText, Award, CheckCircle, ChevronRight,
  Monitor, Building2, Radio, Users, BookOpen, Trophy, MapPin, Phone, Mail,
  ArrowLeftCircle, ArrowRightCircle,
} from 'lucide-react';

/* ─── Scroll-triggered animation hook ─── */
function useReveal(threshold = 0.15) {
  const ref = useRef<HTMLDivElement>(null);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const obs = new IntersectionObserver(
      ([e]) => { if (e.isIntersecting) { setVisible(true); obs.unobserve(el); } },
      { threshold },
    );
    obs.observe(el);
    return () => obs.disconnect();
  }, [threshold]);

  return { ref, visible };
}

/* ─── Campus photos used across sections ─── */
const CAMPUS_PHOTOS = {
  aerial1: '/DJI_0029 (Small).JPG',
  aerial2: '/DJI_0032 (Small).JPG',
  complex: '/College-Complex-scaled.jpg',
  campus1: '/IMGL3793_new.jpg',
  campus2: '/IMGL3934.jpg',
  campus3: '/IMGL3943.jpg',
  campus4: '/IMGL3945.jpg',
  campus5: '/IMGL3954.jpg',
  campus6: '/IMGL3957.jpg',
  campus7: '/IMGL3960.jpg',
  event1: '/IMG_6947photo (Small).jpg',
  event2: '/image4 (Small).jpg',
  students1: '/_DSC1789.png',
  students2: '/_DSC1828-1.png',
  students3: '/_DSC1870.png',
  students4: '/_DSC1931.png',
  students5: '/_DSC2237-1.png',
  students6: '/_DSC2280.png',
  students7: '/_DSC2296-1.png',
  students8: '/_DSC2471 (Small).jpg',
  students9: '/_DSC7082 (Small).jpg',
  brochure: '/page 7_2 (Small).jpg',
  logo: '/revised 4.png',
};

export default function LandingPage() {
  return (
    <div className="flex flex-col bg-white">
      <HeroSection />
      <AboutSection />
      <PhotoShowcase />
      <ProgramsSection />
      <MockExamCTA />
      <CampusGallery />
      <StatsSection />
      <ScholarshipSection />
      <ContactCTA />
    </div>
  );
}

/* ═══════════════════ Hero — Video bg + Ken Burns photos ═══════════════════ */
function HeroSection() {
  const slides = [
    { img: CAMPUS_PHOTOS.complex, title: 'Committed to Excellence', subtitle: 'Since 1998' },
    { img: CAMPUS_PHOTOS.aerial1, title: 'IOE Mock Exam', subtitle: 'Prepare. Practice. Succeed.' },
    { img: CAMPUS_PHOTOS.aerial2, title: 'Quality Engineering Education', subtitle: '3 Programs · TU Affiliated' },
    { img: CAMPUS_PHOTOS.campus1, title: 'Shape Your Future', subtitle: 'Kantipur Engineering College' },
  ];
  const [current, setCurrent] = useState(0);
  const [animKey, setAnimKey] = useState(0);

  useEffect(() => {
    const timer = setInterval(() => {
      setCurrent((c) => (c + 1) % slides.length);
      setAnimKey((k) => k + 1);
    }, 6000);
    return () => clearInterval(timer);
  }, [slides.length]);

  return (
    <section className="relative h-screen min-h-[500px] max-h-[900px] overflow-hidden">
      {/* Background photo with Ken Burns zoom */}
      {slides.map((slide, i) => (
        <div
          key={i}
          className="absolute inset-0 transition-opacity duration-1000"
          style={{ opacity: i === current ? 1 : 0 }}
        >
          <img
            src={slide.img}
            alt=""
            className="absolute inset-0 w-full h-full object-cover"
            style={{
              animation: i === current ? 'kenBurns 6s ease-out forwards' : 'none',
            }}
          />
        </div>
      ))}

      {/* Gradient overlay */}
      <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/30 to-black/10" />

      {/* Content — slides up from bottom */}
      <div className="relative h-full flex flex-col justify-end pb-16 sm:pb-20 lg:pb-28">
        <div className="max-w-7xl mx-auto w-full px-4 sm:px-6 lg:px-8">
          <div
            key={animKey}
            className="animate-slideUp"
          >
            <div className="inline-flex items-center gap-2 bg-white/15 text-white px-4 py-2 rounded-full text-sm mb-5 backdrop-blur-md border border-white/20">
              <img src="/keclogo.png" alt="KEC" className="h-4 w-4 object-contain" />
              Kantipur Engineering College
            </div>

            <h1 className="text-3xl sm:text-5xl lg:text-7xl font-extrabold text-white mb-3 tracking-tight leading-[1.1]">
              {slides[current].title}
            </h1>
            <p className="text-lg sm:text-2xl text-white/80 mb-6 sm:mb-8 font-light max-w-xl">
              {slides[current].subtitle}
            </p>

            <div className="flex flex-col sm:flex-row gap-3">
              <Link
                to="/register"
                className="group bg-[#c0392b] hover:bg-red-700 text-white px-6 sm:px-8 py-3 sm:py-4 rounded-xl text-base sm:text-lg font-semibold transition-all shadow-lg shadow-red-900/40 hover:shadow-xl flex items-center justify-center gap-2"
              >
                Start Mock Exam
                <ChevronRight className="h-5 w-5 group-hover:translate-x-1 transition-transform" />
              </Link>
              <a
                href="#about"
                className="bg-white/10 hover:bg-white/20 text-white px-6 sm:px-8 py-3 sm:py-4 rounded-xl text-base sm:text-lg font-semibold transition-all backdrop-blur-md border border-white/20"
              >
                Explore
              </a>
            </div>
          </div>

          {/* Slide indicators */}
          <div className="flex gap-2 mt-10">
            {slides.map((_, i) => (
              <button
                key={i}
                onClick={() => { setCurrent(i); setAnimKey(k => k + 1); }}
                className={`h-1 rounded-full transition-all duration-500 ${i === current ? 'bg-white w-10' : 'bg-white/40 w-6'}`}
              />
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}

/* ═══════════════════ About — Slide in from left/right ═══════════════════ */
function AboutSection() {
  const left = useReveal();
  const right = useReveal();

  return (
    <section id="about" className="py-24 bg-white overflow-hidden">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid md:grid-cols-2 gap-16 items-center">
          {/* Text — slide from left */}
          <div
            ref={left.ref}
            className={`transition-all duration-700 ease-out ${left.visible ? 'opacity-100 translate-x-0' : 'opacity-0 -translate-x-12'}`}
          >
            <p className="text-sm font-semibold uppercase tracking-widest text-[#c0392b] mb-3">About Us</p>
            <h2 className="text-3xl sm:text-4xl font-bold text-[#1e3a5f] mb-6 leading-tight">
              Kantipur Engineering College
            </h2>
            <p className="text-gray-600 leading-relaxed mb-4">
              Established in <strong>1998</strong>, Kantipur Engineering College (KEC) is one of Nepal's premier engineering institutions, affiliated to <strong>Tribhuvan University, Institute of Engineering (IOE)</strong>.
            </p>
            <p className="text-gray-600 leading-relaxed mb-4">
              Located in <strong>Dhapakhel, Lalitpur</strong>, KEC offers three undergraduate engineering programs and has been nurturing engineers who contribute to Nepal's development for over 28 years.
            </p>
            <p className="text-gray-600 leading-relaxed mb-8">
              KEC admits students based on the merit list of the <strong>IOE Entrance Examination</strong> — a computer-based test covering Mathematics, Physics, Chemistry, and English.
            </p>
            <a
              href="https://kec.edu.np/about-introduction/"
              target="_blank"
              rel="noopener noreferrer"
              className="group inline-flex items-center gap-2 text-[#c0392b] font-semibold hover:underline"
            >
              Learn more about KEC
              <ChevronRight className="h-4 w-4 group-hover:translate-x-1 transition-transform" />
            </a>
          </div>

          {/* Image grid — slide from right + zoom on hover */}
          <div
            ref={right.ref}
            className={`transition-all duration-700 ease-out delay-200 ${right.visible ? 'opacity-100 translate-x-0' : 'opacity-0 translate-x-12'}`}
          >
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-3">
                <div className="relative overflow-hidden rounded-2xl aspect-[4/5] group">
                  <img
                    src={CAMPUS_PHOTOS.students1}
                    alt="KEC Students"
                    className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110"
                  />
                </div>
                <div className="relative overflow-hidden rounded-2xl aspect-square group">
                  <img
                    src={CAMPUS_PHOTOS.campus2}
                    alt="KEC Campus"
                    className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110"
                  />
                </div>
              </div>
              <div className="space-y-3 pt-8">
                <div className="relative overflow-hidden rounded-2xl aspect-square group">
                  <img
                    src={CAMPUS_PHOTOS.students3}
                    alt="KEC Activities"
                    className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110"
                  />
                </div>
                <div className="relative overflow-hidden rounded-2xl aspect-[4/5] group">
                  <img
                    src={CAMPUS_PHOTOS.campus3}
                    alt="KEC Building"
                    className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110"
                  />
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

/* ═══════════════════ Photo Showcase — 3D Image Carousel ═══════════════════ */

const CAROUSEL_CSS = `
.cascade-slider_container {
  position: relative;
  max-width: 1200px;
  margin: 0 auto;
  z-index: 20;
  user-select: none;
  -webkit-user-select: none;
  touch-action: pan-y;
}
.cascade-slider_slides {
  position: relative;
  height: 100%;
}
.cascade-slider_item {
  position: absolute;
  top: 50%;
  left: 50%;
  transform: translateY(-50%) translateX(-50%) scale(0.3);
  transition: all 1s ease;
  opacity: 0;
  z-index: 1;
  cursor: grab;
}
.cascade-slider_item.now { cursor: default; }
.cascade-slider_item:active { cursor: grabbing; }
.cascade-slider_item.next {
  left: 50%;
  transform: translateY(-50%) translateX(-120%) scale(0.6);
  opacity: 1; z-index: 4;
}
.cascade-slider_item.prev {
  left: 50%;
  transform: translateY(-50%) translateX(20%) scale(0.6);
  opacity: 1; z-index: 4;
}
.cascade-slider_item.now {
  top: 50%; left: 50%;
  transform: translateY(-50%) translateX(-50%) scale(1);
  opacity: 1; z-index: 5;
}
.cascade-slider_arrow {
  display: flex; align-items: center; justify-content: center;
  position: absolute; top: 50%; cursor: pointer; z-index: 6;
  transform: translate(0, -50%);
  width: 40px; height: 40px;
  transition: all 0.3s ease;
}
@media screen and (max-width: 575px) {
  .cascade-slider_arrow-left { left: 5px; }
  .cascade-slider_arrow-right { right: 5px; }
}
@media screen and (min-width: 576px) {
  .cascade-slider_arrow-left { left: -4%; }
  .cascade-slider_arrow-right { right: -4%; }
}
.cascade-slider_slides img {
  max-width: 200px; height: auto;
  border-radius: 16px; display: block;
  transition: filter 1s ease;
}
.cascade-slider_item:not(.now) img {
  filter: grayscale(0.95);
}
@media screen and (min-width: 414px) {
  .cascade-slider_container { height: 50vh; }
  .cascade-slider_slides img { max-width: 260px; }
}
@media screen and (min-width: 576px) {
  .cascade-slider_container { height: 58vh; }
  .cascade-slider_slides img { max-width: 320px; }
}
@media screen and (min-width: 768px) {
  .cascade-slider_item.next { transform: translateY(-50%) translateX(-125%) scale(0.6); }
  .cascade-slider_item.prev { transform: translateY(-50%) translateX(25%) scale(0.6); }
  .cascade-slider_slides img { max-width: 360px; }
  .cascade-slider_container { height: 60vh; }
}
@media screen and (min-width: 991px) {
  .cascade-slider_item.next { transform: translateY(-50%) translateX(-115%) scale(0.55); z-index: 4; }
  .cascade-slider_item.prev { transform: translateY(-50%) translateX(15%) scale(0.55); z-index: 4; }
  .cascade-slider_item.next2 { transform: translateY(-50%) translateX(-150%) scale(0.37); z-index: 1; }
  .cascade-slider_item.prev2 { transform: translateY(-50%) translateX(50%) scale(0.37); z-index: 2; }
  .cascade-slider_slides img { max-width: 420px; }
  .cascade-slider_container { height: 55vh; }
}
@media screen and (min-width: 1100px) {
  .cascade-slider_item.next { transform: translateY(-50%) translateX(-130%) scale(0.55); }
  .cascade-slider_item.prev { transform: translateY(-50%) translateX(30%) scale(0.55); }
  .cascade-slider_item.next2 { transform: translateY(-50%) translateX(-180%) scale(0.37); }
  .cascade-slider_item.prev2 { transform: translateY(-50%) translateX(80%) scale(0.37); }
  .cascade-slider_slides img { max-width: 480px; }
  .cascade-slider_container { height: 60vh; }
}
`;

function getSlideClass(index: number, activeIndex: number, total: number, visibleCount: 3 | 5): string {
  const diff = index - activeIndex;
  if (diff === 0) return 'now';
  if (diff === 1 || diff === -total + 1) return 'next';
  if (visibleCount === 5 && (diff === 2 || diff === -total + 2)) return 'next2';
  if (diff === -1 || diff === total - 1) return 'prev';
  if (visibleCount === 5 && (diff === -2 || diff === total - 2)) return 'prev2';
  return '';
}

function PhotoShowcase() {
  const reveal = useReveal(0.1);
  const slides = [
    { id: 1, src: CAMPUS_PHOTOS.complex },
    { id: 2, src: CAMPUS_PHOTOS.students2 },
    { id: 3, src: CAMPUS_PHOTOS.campus4 },
    { id: 4, src: CAMPUS_PHOTOS.students5 },
    { id: 5, src: CAMPUS_PHOTOS.campus5 },
    { id: 6, src: CAMPUS_PHOTOS.event1 },
    { id: 7, src: CAMPUS_PHOTOS.students3 },
    { id: 8, src: CAMPUS_PHOTOS.campus7 },
    { id: 9, src: CAMPUS_PHOTOS.event2 },
  ];

  const [activeIndex, setActiveIndex] = useState(0);
  const autoplayRef = useRef<number | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [startX, setStartX] = useState(0);
  const total = slides.length;

  const navigate = useCallback((dir: 'next' | 'prev') => {
    setActiveIndex(c => dir === 'next' ? (c + 1) % total : (c - 1 + total) % total);
  }, [total]);

  const startAutoplay = useCallback(() => {
    if (autoplayRef.current) clearInterval(autoplayRef.current);
    autoplayRef.current = window.setInterval(() => navigate('next'), 3500);
  }, [navigate]);

  const stopAutoplay = useCallback(() => {
    if (autoplayRef.current) { clearInterval(autoplayRef.current); autoplayRef.current = null; }
  }, []);

  useEffect(() => {
    startAutoplay();
    return () => stopAutoplay();
  }, [startAutoplay, stopAutoplay]);

  const handleStart = (clientX: number) => { setIsDragging(true); setStartX(clientX); stopAutoplay(); };
  const handleEnd = (clientX: number) => {
    if (!isDragging) return;
    const dist = clientX - startX;
    if (Math.abs(dist) > 50) navigate(dist < 0 ? 'next' : 'prev');
    setIsDragging(false); setStartX(0); startAutoplay();
  };

  return (
    <section
      ref={reveal.ref}
      className={`pt-2 pb-12 bg-white transition-all duration-1000 overflow-hidden ${reveal.visible ? 'opacity-100' : 'opacity-0'}`}
    >
      <style dangerouslySetInnerHTML={{ __html: CAROUSEL_CSS }} />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-left mb-10 relative z-30">
          <h2 className="text-3xl sm:text-4xl font-bold text-[#1e3a5f]">Campus Highlight Life at KEC</h2>
        </div>

        <div
          className="cascade-slider_container bg-transparent"
          onMouseEnter={stopAutoplay}
          onMouseLeave={(e) => { startAutoplay(); if (isDragging) handleEnd(e.clientX); }}
          onMouseDown={(e) => handleStart(e.clientX)}
          onMouseUp={(e) => { handleEnd(e.clientX); startAutoplay(); }}
          onTouchStart={(e) => handleStart(e.touches[0].clientX)}
          onTouchEnd={(e) => { handleEnd(e.changedTouches[0].clientX); startAutoplay(); }}
        >
          <div className="cascade-slider_slides">
            {slides.map((slide, index) => (
              <div
                key={slide.id}
                className={`cascade-slider_item ${getSlideClass(index, activeIndex, total, 5)}`}
              >
                <img
                  src={slide.src}
                  alt={`Campus ${index + 1}`}
                  className="shadow-lg"
                />
              </div>
            ))}
          </div>

          {total > 1 && (
            <>
              <span
                className="cascade-slider_arrow cascade-slider_arrow-left rounded-full bg-black/30 text-white p-2 hover:bg-black/60 transition-colors duration-300"
                onClick={(e) => { e.stopPropagation(); navigate('prev'); }}
              >
                <ArrowLeftCircle size={30} />
              </span>
              <span
                className="cascade-slider_arrow cascade-slider_arrow-right rounded-full bg-black/30 text-white p-2 hover:bg-black/60 transition-colors duration-300"
                onClick={(e) => { e.stopPropagation(); navigate('next'); }}
              >
                <ArrowRightCircle size={30} />
              </span>
            </>
          )}
        </div>
      </div>
    </section>
  );
}

/* ═══════════════════ Programs — Stagger rise from bottom ═══════════════════ */
function ProgramsSection() {
  const reveal = useReveal();
  const programs = [
    {
      icon: <Monitor className="h-8 w-8" />,
      title: 'Computer Engineering',
      code: 'COMPUTER',
      desc: 'Computer engineering integrates Electronics Engineering with Computer Science, covering hardware design, software development, networking, and modern computing systems.',
      color: 'from-blue-500 to-blue-700',
      img: CAMPUS_PHOTOS.students6,
    },
    {
      icon: <Building2 className="h-8 w-8" />,
      title: 'Civil Engineering',
      code: 'CIVIL',
      desc: 'Civil Engineering focuses on the design and development of physical infrastructure — roads, bridges, buildings, water systems, and urban planning for sustainable development.',
      color: 'from-emerald-500 to-emerald-700',
      img: CAMPUS_PHOTOS.students7,
    },
    {
      icon: <Radio className="h-8 w-8" />,
      title: 'Electronics, Communication & Information Engineering',
      code: 'ECIC',
      desc: 'ECIC integrates electronic systems, communication technologies, and information engineering — covering signal processing, telecommunications, and embedded systems.',
      color: 'from-purple-500 to-purple-700',
      img: CAMPUS_PHOTOS.students4,
    },
  ];

  return (
    <section
      id="programs"
      ref={reveal.ref}
      className="py-24 bg-[#fafafa] overflow-hidden"
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div
          className={`text-center mb-14 transition-all duration-700 ${reveal.visible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'}`}
        >
          <p className="text-sm font-semibold uppercase tracking-widest text-[#c0392b] mb-2">Academic Programs</p>
          <h2 className="text-3xl sm:text-4xl font-bold text-[#1e3a5f]">Our Programs</h2>
          <p className="mt-3 text-gray-500 text-lg">Bachelor of Engineering (B.E.) — 4 Years</p>
        </div>

        <div className="grid md:grid-cols-3 gap-8">
          {programs.map((p, i) => {
            // 0 = fly from left, 1 = fly from right, 2 = fly from bottom
            const hiddenTransform =
              i === 0 ? 'translateX(-80px)' :
              i === 1 ? 'translateX(80px)' :
              'translateY(80px)';
            return (
              <div
                key={p.code}
                className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden hover:shadow-xl transition-all duration-700 group"
                style={{
                  transitionDelay: `${i * 150}ms`,
                  opacity: reveal.visible ? 1 : 0,
                  transform: reveal.visible ? 'translate(0)' : hiddenTransform,
                }}
              >
                {/* Program photo with zoom */}
                <div className="relative h-48 overflow-hidden">
                  <img
                    src={p.img}
                    alt={p.title}
                    className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/50 to-transparent" />
                  <div className={`absolute bottom-4 left-4 inline-flex items-center justify-center w-12 h-12 rounded-xl bg-gradient-to-br ${p.color} text-white shadow-lg`}>
                    {p.icon}
                  </div>
                </div>
                <div className="p-6">
                  <h3 className="text-lg font-bold text-gray-900 mb-3">{p.title}</h3>
                  <p className="text-gray-600 text-sm leading-relaxed">{p.desc}</p>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}

/* ═══════════════════ Mock Exam CTA — Zoom-in reveal ═══════════════════ */
function MockExamCTA() {
  const reveal = useReveal(0.2);

  return (
    <section
      id="mock-exam"
      ref={reveal.ref}
      className="py-24 relative overflow-hidden"
    >
      {/* Full-bleed background image with overlay */}
      <div className="absolute inset-0">
        <img
          src={CAMPUS_PHOTOS.campus6}
          alt=""
          className="w-full h-full object-cover"
          style={{
            transition: 'transform 1.2s ease-out',
            transform: reveal.visible ? 'scale(1)' : 'scale(1.1)',
          }}
        />
        <div className="absolute inset-0 bg-[#1e3a5f]/85 backdrop-blur-[2px]" />
      </div>

      <div
        className={`relative max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center transition-all duration-700 ${reveal.visible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-10'}`}
      >
        <div className="inline-flex items-center gap-2 bg-[#c0392b]/20 text-[#f39c12] px-4 py-2 rounded-full text-sm font-medium mb-6 border border-[#f39c12]/20">
          <Award className="h-4 w-4" />
          Free Mock Test Available
        </div>

        <h2 className="text-3xl sm:text-5xl font-extrabold text-white mb-6">
          IOE Entrance Mock Exam
        </h2>
        <p className="text-xl text-gray-300 mb-10 max-w-2xl mx-auto">
          Test yourself with a realistic simulation of the IOE entrance exam. Get instant results and subject-wise analysis.
        </p>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4 mb-10 max-w-2xl mx-auto">
          <FeatureBadge icon={<FileText />} text="100 Questions" />
          <FeatureBadge icon={<Award />} text="100 Marks" />
          <FeatureBadge icon={<Clock />} text="2 Hours" />
          <FeatureBadge icon={<CheckCircle />} text="Instant Results" />
        </div>

        {/* Question distribution */}
        <div className="bg-white/5 backdrop-blur-sm rounded-2xl border border-white/10 p-6 mb-10 max-w-xl mx-auto">
          <h3 className="text-white font-semibold mb-4 text-sm uppercase tracking-wider">Exam Distribution</h3>
          <div className="space-y-2 text-sm">
            {[
              { subject: 'English', qs: '12×1 + 4×1', marks: 16, color: 'bg-blue-500' },
              { subject: 'Chemistry', qs: '14×1 + 8×1', marks: 22, color: 'bg-green-500' },
              { subject: 'Physics', qs: '14×1 + 13×1', marks: 27, color: 'bg-yellow-500' },
              { subject: 'Mathematics', qs: '20×1 + 15×1', marks: 35, color: 'bg-red-500' },
            ].map((s) => (
              <div key={s.subject} className="flex items-center gap-3">
                <div className={`w-2 h-2 rounded-full ${s.color}`} />
                <span className="text-gray-300 w-28 text-left">{s.subject}</span>
                <span className="text-gray-400">{s.qs} Qs</span>
                <div className="flex-1 bg-white/5 rounded-full h-1.5 mx-2">
                  <div className={`${s.color} h-1.5 rounded-full`} style={{ width: `${(s.marks / 100) * 100}%` }} />
                </div>
                <span className="text-white font-medium">{s.marks}</span>
              </div>
            ))}
          </div>
        </div>

        <div className="flex flex-col sm:flex-row gap-4 justify-center">
          <Link to="/register" className="group bg-[#c0392b] hover:bg-red-700 text-white px-10 py-4 rounded-xl text-lg font-bold transition shadow-lg shadow-red-900/30 flex items-center justify-center gap-2">
            Sign Up & Start Free
            <ChevronRight className="h-5 w-5 group-hover:translate-x-1 transition-transform" />
          </Link>
          <Link to="/login" className="bg-white/10 hover:bg-white/20 text-white px-10 py-4 rounded-xl text-lg font-semibold transition backdrop-blur-sm border border-white/20">
            Already have an account? Login
          </Link>
        </div>
      </div>
    </section>
  );
}

function FeatureBadge({ icon, text }: { icon: React.ReactNode; text: string }) {
  return (
    <div className="bg-white/5 backdrop-blur-sm rounded-xl p-4 border border-white/10 text-center">
      <div className="text-[#f39c12] flex justify-center mb-2">{icon}</div>
      <div className="text-white text-sm font-medium">{text}</div>
    </div>
  );
}

/* ═══════════════════ Campus Gallery — Masonry crossfade ═══════════════════ */
function CampusGallery() {
  const reveal = useReveal(0.1);
  const gallery = [
    { src: CAMPUS_PHOTOS.complex, span: 'col-span-2 row-span-2' },
    { src: CAMPUS_PHOTOS.students2, span: '' },
    { src: CAMPUS_PHOTOS.event2, span: '' },
    { src: CAMPUS_PHOTOS.campus7, span: '' },
    { src: CAMPUS_PHOTOS.students5, span: '' },
    { src: CAMPUS_PHOTOS.students8, span: 'col-span-2' },
  ];

  return (
    <section ref={reveal.ref} className="py-24 bg-white overflow-hidden">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div
          className={`text-center mb-14 transition-all duration-700 ${reveal.visible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'}`}
        >
          <p className="text-sm font-semibold uppercase tracking-widest text-[#c0392b] mb-2">Life at KEC</p>
          <h2 className="text-3xl sm:text-4xl font-bold text-[#1e3a5f]">Campus Gallery</h2>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-2 sm:gap-3 auto-rows-[120px] sm:auto-rows-[180px]">
          {gallery.map((item, i) => (
            <div
              key={i}
              className={`relative overflow-hidden rounded-xl group ${item.span}`}
              style={{
                transitionDelay: `${i * 100}ms`,
                opacity: reveal.visible ? 1 : 0,
                transform: reveal.visible ? 'scale(1)' : 'scale(0.92)',
                transition: 'all 0.6s ease-out',
              }}
            >
              <img
                src={item.src}
                alt="Campus"
                className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110"
              />
              <div className="absolute inset-0 bg-black/0 group-hover:bg-black/10 transition-colors duration-300" />
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

/* ═══════════════════ Stats — Count up from bottom ═══════════════════ */
function StatsSection() {
  const reveal = useReveal();

  return (
    <section
      ref={reveal.ref}
      className="py-20 relative overflow-hidden"
    >
      <div className="absolute inset-0">
        <img src={CAMPUS_PHOTOS.campus5} alt="" className="w-full h-full object-cover" />
        <div className="absolute inset-0 bg-[#1e3a5f]/90" />
      </div>
      <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-8 text-center">
          {[
            { number: '1998', label: 'Established' },
            { number: '3000+', label: 'Alumni Network' },
            { number: '3', label: 'Engineering Programs' },
            { number: '100%', label: 'IOE Affiliated' },
          ].map((s, i) => (
            <div
              key={s.label}
              style={{
                transitionDelay: `${i * 120}ms`,
                opacity: reveal.visible ? 1 : 0,
                transform: reveal.visible ? 'translateY(0)' : 'translateY(24px)',
                transition: 'all 0.6s ease-out',
              }}
            >
              <div className="text-3xl sm:text-4xl lg:text-5xl font-extrabold text-white">{s.number}</div>
              <div className="text-white/60 text-sm mt-2 font-medium">{s.label}</div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

/* ═══════════════════ Scholarships ═══════════════════ */
function ScholarshipSection() {
  const reveal = useReveal();

  return (
    <section ref={reveal.ref} className="py-24 bg-white overflow-hidden">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div
          className={`text-center mb-14 transition-all duration-700 ${reveal.visible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'}`}
        >
          <p className="text-sm font-semibold uppercase tracking-widest text-[#c0392b] mb-2">Financial Aid</p>
          <h2 className="text-3xl sm:text-4xl font-bold text-[#1e3a5f]">Scholarships & Awards</h2>
          <p className="mt-3 text-gray-500 text-lg">KEC supports academic excellence</p>
        </div>

        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {[
            { title: 'Four-Year Scholarship', desc: 'Full tuition fee exemption for 4 years based on IOE entrance rank.', icon: <Trophy className="h-6 w-6" /> },
            { title: 'Semester Scholarship', desc: 'Tuition fee exemption for top-performing students each semester.', icon: <Award className="h-6 w-6" /> },
            { title: 'Local Student Scholarship', desc: '35% fee exemption for residents of Lalitpur Wards 23 and 24.', icon: <MapPin className="h-6 w-6" /> },
            { title: 'Excellence Awards', desc: 'Prizes for semester toppers, best programmers, and outstanding projects.', icon: <GraduationCap className="h-6 w-6" /> },
          ].map((s, i) => (
            <div
              key={s.title}
              className="bg-[#fafafa] rounded-2xl p-6 border border-gray-100 hover:shadow-lg hover:-translate-y-1 transition-all duration-300"
              style={{
                transitionDelay: `${i * 100}ms`,
                opacity: reveal.visible ? 1 : 0,
                transform: reveal.visible ? 'translateY(0)' : 'translateY(30px)',
              }}
            >
              <div className="inline-flex items-center justify-center w-12 h-12 rounded-xl bg-[#1e3a5f]/10 text-[#1e3a5f] mb-4">
                {s.icon}
              </div>
              <h3 className="font-bold text-[#1e3a5f] mb-2">{s.title}</h3>
              <p className="text-gray-600 text-sm leading-relaxed">{s.desc}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

/* ═══════════════════ Contact CTA — Slide from right ═══════════════════ */
function ContactCTA() {
  const reveal = useReveal();

  return (
    <section
      ref={reveal.ref}
      className="py-20 bg-[#fafafa] border-t border-gray-100 overflow-hidden"
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid md:grid-cols-2 gap-12 items-center">
          {/* Left — photo */}
          <div
            className="relative overflow-hidden rounded-2xl aspect-[4/3]"
            style={{
              opacity: reveal.visible ? 1 : 0,
              transform: reveal.visible ? 'translateX(0) scale(1)' : 'translateX(-40px) scale(0.95)',
              transition: 'all 0.7s ease-out',
            }}
          >
            <img
              src={CAMPUS_PHOTOS.students9}
              alt="KEC Campus"
              className="w-full h-full object-cover"
            />
          </div>

          {/* Right — text */}
          <div
            style={{
              opacity: reveal.visible ? 1 : 0,
              transform: reveal.visible ? 'translateX(0)' : 'translateX(40px)',
              transition: 'all 0.7s ease-out 0.15s',
            }}
          >
            <p className="text-sm font-semibold uppercase tracking-widest text-[#c0392b] mb-3">Get Started</p>
            <h2 className="text-3xl font-bold text-[#1e3a5f] mb-4">Ready to join KEC?</h2>
            <p className="text-gray-600 mb-8 leading-relaxed">
              Pass the IOE entrance exam and apply for admission at Kantipur Engineering College. Practice with our free mock exam today.
            </p>

            <div className="space-y-3 mb-8 text-sm text-gray-600">
              <div className="flex items-center gap-3">
                <MapPin className="h-4 w-4 text-[#1e3a5f]" />
                Dhapakhel, Lalitpur, Nepal
              </div>
              <div className="flex items-center gap-3">
                <Phone className="h-4 w-4 text-[#1e3a5f]" />
                <span>+977-1-5229204 / +977-1-5229005</span>
              </div>
              <div className="flex items-center gap-3">
                <Mail className="h-4 w-4 text-[#1e3a5f]" />
                admin@kec.edu.np
              </div>
            </div>

            <div className="flex flex-col sm:flex-row gap-3">
              <Link to="/register" className="bg-[#c0392b] hover:bg-red-700 text-white px-8 py-3 rounded-xl font-semibold transition text-center">
                Try Mock Exam
              </Link>
              <a href="https://kec.edu.np/admission/" target="_blank" rel="noopener noreferrer" className="bg-[#1e3a5f] hover:bg-blue-900 text-white px-8 py-3 rounded-xl font-semibold transition text-center">
                Admission Info
              </a>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
