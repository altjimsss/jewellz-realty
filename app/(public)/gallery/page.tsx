"use client";

import React, { useState, useEffect } from "react";
import {
  FaMedal,
  FaCalendarCheck,
  FaUserGraduate,
  FaHandshake,
  FaBuilding,
} from "react-icons/fa";
import { Navbar } from "@/components/layout/Navbar";
import { Footer } from "@/components/layout/Footer";

const RED = "#DD141C";

const navLinks = [
  { label: "Home", href: "/" },
  { label: "Project List", href: "/project-list" },
  { label: "Gallery", href: "/gallery" },
  { label: "About us", href: "/about-us" },
  { label: "Contact", href: "/contact" },
  { label: "Career", href: "/career" },
];

type Photo = { src: string; label: string };

type Option = {
  title: string;
  description: string;
  cover: string;
  icon: React.ReactNode;
  photos: Photo[];
};

const OPTIONS: Option[] = [
  {
    title: "Achievements",
    description: "Awards, recognitions & milestones",
    cover: "https://images.unsplash.com/photo-1605810230434-7631ac76ec81?w=1200&q=80",
    icon: <FaMedal size={16} />,
    photos: [
      { src: "https://images.unsplash.com/photo-1567427017947-545c5f8d16ad?w=600&q=80", label: "Agent of the Year" },
      { src: "https://images.unsplash.com/photo-1561489401-fc2876ced162?w=600&q=80", label: "Sales milestone" },
      { src: "https://images.unsplash.com/photo-1523240795612-9a054b0db644?w=600&q=80", label: "Recognition night" },
      { src: "https://images.unsplash.com/photo-1530099486328-e021101a494a?w=600&q=80", label: "Top producer award" },
      { src: "https://images.unsplash.com/photo-1543269865-cbf427effbad?w=600&q=80", label: "Team excellence" },
      { src: "https://images.unsplash.com/photo-1552664730-d307ca884978?w=600&q=80", label: "Annual gala night" },
    ],
  },
  {
    title: "Events",
    description: "Community outreach & celebrations",
    cover: "https://images.unsplash.com/photo-1511578314322-379afb476865?w=1200&q=80",
    icon: <FaCalendarCheck size={16} />,
    photos: [
      { src: "https://images.unsplash.com/photo-1540575467063-178a50c2df87?w=600&q=80", label: "Grand launch" },
      { src: "https://images.unsplash.com/photo-1528605248644-14dd04022da1?w=600&q=80", label: "Team building day" },
      { src: "https://images.unsplash.com/photo-1475721027785-f74eccf877e2?w=600&q=80", label: "Community fair" },
      { src: "https://images.unsplash.com/photo-1505373877841-8d25f7d46678?w=600&q=80", label: "Property expo" },
      { src: "https://images.unsplash.com/photo-1519671482749-fd09be7ccebf?w=600&q=80", label: "Client celebration" },
    ],
  },
  {
    title: "Trainings",
    description: "Coaching, workshops & upskilling",
    cover: "https://images.unsplash.com/photo-1524178232363-1fb2b075b655?w=1200&q=80",
    icon: <FaUserGraduate size={16} />,
    photos: [
      { src: "https://images.unsplash.com/photo-1552664730-d307ca884978?w=600&q=80", label: "Leadership seminar" },
      { src: "https://images.unsplash.com/photo-1454165804606-c3d57bc86b40?w=600&q=80", label: "Sales coaching" },
      { src: "https://images.unsplash.com/photo-1517245386807-bb43f82c33c4?w=600&q=80", label: "Group workshop" },
      { src: "https://images.unsplash.com/photo-1498050108023-c5249f4df085?w=600&q=80", label: "Digital upskilling" },
      { src: "https://images.unsplash.com/photo-1488190211105-8b0e65b80b4e?w=600&q=80", label: "Writing for agents" },
      { src: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=600&q=80", label: "1-on-1 mentoring" },
    ],
  },
  {
    title: "Service",
    description: "Client support & lasting partnerships",
    cover: "https://images.unsplash.com/photo-1560264280-88b68371db39?w=1200&q=80",
    icon: <FaHandshake size={16} />,
    photos: [
      { src: "https://images.unsplash.com/photo-1573497491765-dccce02b29df?w=600&q=80", label: "Contract signing" },
      { src: "https://images.unsplash.com/photo-1556761175-4b46a572b786?w=600&q=80", label: "Client meeting" },
      { src: "https://images.unsplash.com/photo-1600880292203-757bb62b4baf?w=600&q=80", label: "Partner visit" },
      { src: "https://images.unsplash.com/photo-1551836022-d5d88e9218df?w=600&q=80", label: "After-sales care" },
    ],
  },
  {
    title: "Jewellz Realty",
    description: "People-first real estate team",
    cover: "https://images.unsplash.com/photo-1564013799919-ab600027ffc6?w=1200&q=80",
    icon: <FaBuilding size={16} />,
    photos: [
      { src: "https://images.unsplash.com/photo-1560518883-ce09059eeffa?w=600&q=80", label: "Property launch" },
      { src: "https://images.unsplash.com/photo-1512917774080-9991f1c4c750?w=600&q=80", label: "Dream home" },
      { src: "https://images.unsplash.com/photo-1448630360428-65456885c650?w=600&q=80", label: "Site visit" },
      { src: "https://images.unsplash.com/photo-1582407947304-fd86f028f716?w=600&q=80", label: "New listing" },
      { src: "https://images.unsplash.com/photo-1572120360610-d971b9d7767c?w=600&q=80", label: "Team showcase" },
      { src: "https://images.unsplash.com/photo-1600047509807-ba8f99d2cdde?w=600&q=80", label: "Key handover" },
    ],
  },
];

export default function GalleryPage() {
  const [activeIndex, setActiveIndex] = useState(0);
  const [animatedPanels, setAnimatedPanels] = useState<number[]>([]);
  const [visiblePhotos, setVisiblePhotos] = useState<boolean[]>([]);

  useEffect(() => {
    const timers = OPTIONS.map((_, i) =>
      setTimeout(() => setAnimatedPanels((p) => [...p, i]), 120 * i)
    );
    return () => timers.forEach(clearTimeout);
  }, []);

  useEffect(() => {
    setVisiblePhotos([]);
    const timers = OPTIONS[activeIndex].photos.map((_, i) =>
      setTimeout(() => {
        setVisiblePhotos((p) => {
          const next = [...p];
          next[i] = true;
          return next;
        });
      }, i * 55 + 20)
    );
    return () => timers.forEach(clearTimeout);
  }, [activeIndex]);

  const activeOption = OPTIONS[activeIndex];

  return (
    <main className="min-h-screen bg-white" style={{ fontFamily: "'Poppins', sans-serif" }}>
      {/* Announcement Bar */}
      <div className="flex h-7 items-center justify-center gap-1 bg-black px-2 text-[10px] text-[#FAFAFA] sm:h-8 sm:gap-2 sm:text-sm">
        <p className="whitespace-nowrap">Premium but Affordable Properties on Sale.</p>
        <a className="underline" href="#">Browse Now</a>
      </div>

      <Navbar links={navLinks} />

      {/* ── Accordion ── */}
      <div className="w-full flex h-[88px] items-stretch overflow-hidden border-b-2 border-zinc-200">
        {OPTIONS.map((option, index) => {
          const isActive = index === activeIndex;
          const isAnimated = animatedPanels.includes(index);

          return (
            <div
              key={option.title}
              onClick={() => { if (index !== activeIndex) setActiveIndex(index); }}
              className="relative flex flex-col justify-center overflow-hidden cursor-pointer"
              style={{
                minWidth: "44px",
                borderRight: "1px solid rgb(255, 255, 255)",
                backgroundColor: "#000000",
                flex: isActive ? "6 1 0%" : "1 1 0%",
                zIndex: isActive ? 10 : 1,
                transition: "flex 0.6s cubic-bezier(0.4,0,0.2,1)",
              }}
            >
              {/* Cover photo */}
              <div
                className="absolute inset-0"
                style={{
                  backgroundImage: `url('${option.cover}')`,
                  backgroundSize: "cover",
                  backgroundPosition: "center",
                  opacity: isActive ? 1 : 0,
                  transition: "opacity 0.65s ease",
                }}
              />

              {/* Gradient overlay */}
              <div
                className="absolute inset-0 pointer-events-none"
                style={{
                  background: `linear-gradient(to right, ${RED} 0%, ${RED} 28%, rgba(221,20,28,0.82) 42%, rgba(221,20,28,0.4) 62%, rgba(0,0,0,0.15) 80%, transparent 100%)`,
                  opacity: isActive ? 1 : 0,
                  transition: "opacity 0.65s ease",
                }}
              />

              {/* "Viewing" badge */}
              <div
                className="absolute top-2.5 right-3 z-20 pointer-events-none"
                style={{
                  fontSize: "8px",
                  fontWeight: 600,
                  letterSpacing: "0.1em",
                  textTransform: "uppercase",
                  color: "rgba(255,255,255,0.75)",
                  border: "1px solid rgba(255,255,255,0.28)",
                  padding: "2px 7px",
                  borderRadius: "3px",
                  opacity: isActive ? 1 : 0,
                  transition: "opacity 0.4s ease 0.2s",
                }}
              >
                Viewing
              </div>

              {/* Info row */}
              <div className="relative z-10 flex items-center gap-2.5 px-3.5 pointer-events-none">
                {/* Icon circle */}
                <div
                  className="flex-shrink-0 flex items-center justify-center rounded-full text-white"
                  style={{
                    minWidth: "32px",
                    width: "32px",
                    height: "32px",
                    background: "rgba(255,255,255,0.18)",
                    border: isActive
                      ? "1.5px solid rgba(255,255,255,0.55)"
                      : "1.5px solid rgba(255,255,255,0.15)",
                    opacity: isActive ? 1 : 0.45,
                    transition: "border-color 0.5s ease, opacity 0.5s ease",
                  }}
                >
                  {option.icon}
                </div>

                {/* Title + subtitle — tighter line spacing, bigger title, smaller description */}
                <div className="overflow-hidden" style={{ lineHeight: 1 }}>
                  <div
                    className="text-white font-semibold whitespace-nowrap"
                    style={{
                      fontSize: "15px",
                      fontFamily: "'Poppins', sans-serif",
                      opacity: isAnimated && isActive ? 1 : 0,
                      transform: isAnimated && isActive ? "translateX(0)" : "translateX(18px)",
                      transition: "opacity 0.45s ease, transform 0.45s ease",
                      marginBottom: "2px",
                    }}
                  >
                    {option.title}
                  </div>
                  <div
                    className="text-white/60 whitespace-nowrap"
                    style={{
                      fontSize: "9px",
                      fontFamily: "'Poppins', sans-serif",
                      opacity: isAnimated && isActive ? 1 : 0,
                      transform: isAnimated && isActive ? "translateX(0)" : "translateX(18px)",
                      transition: "opacity 0.45s ease 0.06s, transform 0.45s ease 0.06s",
                    }}
                  >
                    {option.description}
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* ── Masonry Gallery ── */}
      <div className="mx-auto max-w-[1160px] px-5 py-10">
        {/* Section header */}
<div className="flex items-center justify-between border-b border-zinc-200 pb-4 mb-7">
  <div className="flex items-center gap-2.5">
    {/* Vertical red line accent */}
    <span
      style={{
        display: "inline-block",
        width: "3px",
        height: "2.2em",
        background: RED,
        borderRadius: "2px",
        flexShrink: 0,
        alignSelf: "center",
      }}
    />
    <div>
      <h2
        className="font-semibold text-zinc-900 leading-tight"
        style={{ fontFamily: "'Poppins', sans-serif", fontSize: "22px" }}
      >
        Gallery
      </h2>
      <p
        className="text-zinc-400 font-normal leading-tight"
        style={{ fontFamily: "'Poppins', sans-serif", fontSize: "11px", marginTop: "2px" }}
      >
        Milestones, moments & memories from our journey
      </p>
    </div>
  </div>
  <span className="text-xs text-zinc-400 font-medium">
    {activeOption.photos.length} photos
  </span>
</div>

        {/* Masonry grid */}
        <div className="columns-2 sm:columns-3 lg:columns-4 gap-3">
          {activeOption.photos.map((photo, idx) => (
            <div
              key={`${activeIndex}-${idx}`}
              className="break-inside-avoid mb-3 rounded-[9px] overflow-hidden relative group"
              style={{
                border: "1px solid transparent",
                opacity: visiblePhotos[idx] ? 1 : 0,
                transform: visiblePhotos[idx] ? "translateY(0)" : "translateY(14px)",
                transition: `opacity 0.42s ease ${idx * 55}ms, transform 0.42s ease ${idx * 55}ms, border-color 0.3s ease`,
              }}
              onMouseEnter={(e) => {
                (e.currentTarget as HTMLDivElement).style.borderColor = `${RED}70`;
              }}
              onMouseLeave={(e) => {
                (e.currentTarget as HTMLDivElement).style.borderColor = "transparent";
              }}
            >
              <img
                src={photo.src}
                alt={photo.label}
                loading="lazy"
                className="w-full block"
                style={{ transition: "transform 0.5s ease" }}
                onMouseEnter={(e) => {
                  (e.currentTarget as HTMLImageElement).style.transform = "scale(1.06)";
                }}
                onMouseLeave={(e) => {
                  (e.currentTarget as HTMLImageElement).style.transform = "scale(1)";
                }}
              />

              {/* Hover overlay */}
              <div
                className="absolute inset-0 flex items-end p-3 opacity-0 group-hover:opacity-100"
                style={{
                  background: "linear-gradient(to top, rgba(10,10,10,0.75) 0%, rgba(10,10,10,0.1) 55%, transparent 100%)",
                  transition: "opacity 0.32s ease",
                }}
              >
                <span
                  className="text-white font-medium"
                  style={{
                    fontSize: "11px",
                    background: `${RED}e0`,
                    padding: "3px 10px",
                    borderRadius: "4px",
                  }}
                >
                  {photo.label}
                </span>
              </div>
            </div>
          ))}
        </div>
      </div>

      <Footer />
    </main>
  );
}