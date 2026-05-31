"use client";

import React, { useEffect, useMemo, useRef, useState } from "react";
import Image from "next/image";
import {
  FaMedal,
  FaCalendarCheck,
  FaUserGraduate,
  FaHandshake,
  FaBuilding,
} from "react-icons/fa";
import { Navbar } from "@/components/layout/Navbar";
import { Footer } from "@/components/layout/Footer";
import CardSwap, { Card, type CardSwapHandle } from "@/components/gallery/CardSwap";

const RED = "#DD141C";

const navLinks = [
  { label: "Home", href: "/" },
  { label: "Project List", href: "/project-list" },
  { label: "Gallery", href: "/gallery" },
  { label: "About us", href: "/about-us" },
  { label: "Contact", href: "/contact" },
  { label: "Career", href: "/career" },
];

type Photo = { src: string; label: string; date?: string; title?: string; description?: string };

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
      { src: "https://images.unsplash.com/photo-1567427017947-545c5f8d16ad?w=600&q=80", label: "Agent of the Year", date: "Mar 2024", title: "Agent of the Year 2024", description: "Award ceremony recognizing top performing agent." },
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
      { src: "https://images.unsplash.com/photo-1540575467063-178a50c2df87?w=600&q=80", label: "Grand launch", date: "Jun 2023", title: "Grand Launch Event", description: "Opening event for our newest property showcase." },
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
      { src: "https://images.unsplash.com/photo-1552664730-d307ca884978?w=600&q=80", label: "Leadership seminar", date: "Nov 2022", title: "Leadership Seminar", description: "In-house training for emerging leaders and managers." },
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
      { src: "https://images.unsplash.com/photo-1573497491765-dccce02b29df?w=600&q=80", label: "Contract signing", date: "Sep 2023", title: "Contract Signing", description: "Closing moment with happy clients." },
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
      { src: "https://images.unsplash.com/photo-1560518883-ce09059eeffa?w=600&q=80", label: "Property launch", date: "Jan 2024", title: "Property Launch", description: "Grand opening of our newest listing." },
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
  const [activePhotoIndex, setActivePhotoIndex] = useState(0);
  const [cardWidth, setCardWidth] = useState(0);
  const cardSwapRef = useRef<CardSwapHandle | null>(null);

  useEffect(() => {
    const updateWidth = () => {
      const nextWidth = Math.min(620, Math.max(280, Math.floor(window.innerWidth * 0.52)));
      setCardWidth(nextWidth);
    };

    updateWidth();
    window.addEventListener("resize", updateWidth);

    return () => window.removeEventListener("resize", updateWidth);
  }, []);

  const activeOption = useMemo(() => OPTIONS[activeIndex], [activeIndex]);

  useEffect(() => {
    setActivePhotoIndex(0);
  }, [activeIndex]);

  const cardHeight = Math.round(cardWidth * 0.7);

  return (
    <main className="min-h-screen bg-white" style={{ fontFamily: "'Poppins', sans-serif" }}>
      {/* Announcement Bar */}
      <div className="flex h-7 items-center justify-center gap-1 bg-black px-2 text-[10px] text-[#FAFAFA] sm:h-8 sm:gap-2 sm:text-sm">
        <p className="whitespace-nowrap">Premium but Affordable Properties on Sale.</p>
        <a className="underline" href="#">Browse Now</a>
      </div>

      <Navbar links={navLinks} />

      {/* Category buttons removed from top and will be placed under the header */}

      {/* ── Gallery Showcase ── */}
      <div className="mx-auto max-w-[1120px] px-0 pt-0 pb-8 sm:px-0 lg:pt-0 lg:pb-10">
        <section className="relative min-h-[620px] overflow-hidden rounded-b-[22px] rounded-t-none border-x border-b border-zinc-200 border-t-0 bg-white px-6 py-10 pr-0 pb-0 text-zinc-900 sm:px-10 sm:pr-0 sm:pb-0 lg:px-12 lg:py-12 lg:pr-0 lg:pb-0">
          <div className="absolute inset-x-0 bottom-0 rounded-b-[22px] border-x border-b border-zinc-200 pointer-events-none" />

          <div className="relative z-10 grid min-h-[600px] grid-cols-1 lg:grid-cols-[0.72fr_1.28fr]">
            <div className="py-2">
              <div className="flex items-start gap-3">
                <span
                  className="mt-1.5 h-[2.2em] w-[3px] shrink-0 rounded-full bg-[#DE141C]"
                  aria-hidden="true"
                />
                <div>
                  <h2
                    className="font-semibold leading-tight text-zinc-900"
                    style={{ fontFamily: "'Poppins', sans-serif", fontSize: "22px" }}
                  >
                    Gallery
                  </h2>
                  <p
                    className="mt-[2px] font-normal leading-tight text-zinc-400"
                    style={{ fontFamily: "'Poppins', sans-serif", fontSize: "11px" }}
                  >
                    Milestones, moments & memories from our journey.
                  </p>
                </div>
              </div>

              <h1 className="mt-4 max-w-xl text-[clamp(1.5rem,3.2vw,2.2rem)] font-semibold leading-[1.06] tracking-[-0.04em] text-[#111111]">
                Gallery highlights from our journey
              </h1>

              <p className="mt-4 max-w-[430px] text-[14px] leading-7 text-black/55">
                Milestones, moments & memories from our journey
              </p>

              <div className="mt-6">
                <div className="flex flex-wrap gap-3 border-b border-zinc-200 pb-5">
                  {OPTIONS.map((option, index) => {
                    const isActive = index === activeIndex;

                    return (
                      <button
                        key={option.title}
                        type="button"
                        onClick={() => setActiveIndex(index)}
                        className={`inline-flex items-center gap-2 rounded-full border px-4 py-2 text-sm font-medium transition-colors ${
                          isActive
                            ? "border-[#DE141C] bg-[#DE141C] text-white"
                            : "border-zinc-200 bg-white text-zinc-700 hover:border-[#DE141C]/30 hover:text-[#DE141C]"
                        }`}
                      >
                        <span className="text-[14px]">{option.icon}</span>
                        <span>{option.title}</span>
                      </button>
                    );
                  })}
                </div>
              </div>

              <div className="mt-4 flex max-w-[430px] justify-end gap-3">
                <button
                  type="button"
                  onClick={() => cardSwapRef.current?.prev()}
                  className="inline-flex items-center rounded-full border border-zinc-200 px-4 py-2 text-[13px] font-medium text-zinc-700 transition-colors hover:border-[#DE141C] hover:text-[#DE141C]"
                >
                  Prev
                </button>
                <button
                  type="button"
                  onClick={() => cardSwapRef.current?.next()}
                  className="inline-flex items-center rounded-full bg-[#DE141C] px-4 py-2 text-[13px] font-medium text-white transition-colors hover:bg-[#c51018]"
                >
                  Next
                </button>
              </div>

              <div className="mt-5 max-w-[430px] bg-transparent p-0">
                  <p className="text-[10px] uppercase tracking-[0.18em] text-zinc-400">Featured photo</p>
                  <div className="mt-2 flex items-start gap-3">
                    <div className="mt-0.5 h-11 w-1 rounded-full bg-[#DE141C]" aria-hidden="true" />
                    <div className="min-w-0">
                      <p className="text-[11px] uppercase tracking-[0.16em] text-zinc-500">
                        {activeOption.photos[activePhotoIndex]?.date ?? activeOption.title}
                      </p>
                      <h3 className="mt-1 text-[16px] font-semibold leading-tight text-zinc-900">
                        {activeOption.photos[activePhotoIndex]?.title ?? activeOption.photos[activePhotoIndex]?.label}
                      </h3>
                      <p className="mt-1 text-[12px] leading-6 text-zinc-600">
                        {activeOption.photos[activePhotoIndex]?.description ?? activeOption.description}
                      </p>
                    </div>
                  </div>
                </div>
            </div>

            <div className="relative min-h-[400px] overflow-hidden lg:min-h-[400px]">
              <div className="absolute bottom-[-200px] right-[-390px] flex justify-end sm:right-[-370px] lg:right-[-410px]">
                <CardSwap
                  ref={cardSwapRef}
                  width={cardWidth || 720}
                  height={cardHeight || 334}
                  cardDistance={34}
                  verticalDistance={42}
                  delay={5000}
                  pauseOnHover={false}
                  onFrontChange={setActivePhotoIndex}
                >
                  {activeOption.photos.map((photo) => (
                    <Card key={photo.label} customClass="relative">
                      <div className="relative h-full w-full overflow-hidden rounded-[20px] bg-zinc-100">
                        <Image src={photo.src} alt={photo.label} fill className="object-cover" sizes="(max-width: 768px) 100vw, 760px" />
                        <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/10 to-transparent" />
                        <div className="absolute bottom-4 left-4 right-4 flex items-end justify-between gap-3">
                          <div className="max-w-[72%]">
                            <p className="text-[10px] uppercase tracking-[0.18em] text-white/70">
                              {photo.date ?? activeOption.title}
                            </p>
                            <h3 className="mt-1 text-[15px] font-semibold leading-tight text-white">
                              {photo.title ?? photo.label}
                            </h3>
                            <p className="mt-1 text-[11px] leading-5 text-white/75">
                              {photo.description ?? activeOption.description}
                            </p>
                          </div>
                          <span className="rounded-full border border-white/20 bg-white/10 px-3 py-1 text-[10px] font-medium uppercase tracking-[0.16em] text-white/75">
                            {activeOption.title}
                          </span>
                        </div>
                      </div>
                    </Card>
                  ))}
                </CardSwap>
              </div>
            </div>
          </div>
        </section>
      </div>

      <Footer />
    </main>
  );
}