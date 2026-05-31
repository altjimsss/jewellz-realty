"use client";

import { useEffect, useState } from "react";
import NextImage from "next/image";

const serviceVisuals = [
  {
    title: "Property Listings & Selling Assistance",
    subtitle: "Explore verified listings and sell with expert broker guidance.",
    image: "https://images.unsplash.com/photo-1600585154340-be6161a56a0c?w=1200&q=80",
  },
  {
    title: "CONSULTATION & GROWTH",
    subtitle: "Get tailored advice on value, timing, and smart property decisions.",
    image: "/assets/bannerconsult.png",
  },
  {
    title: "Property Viewing & Tripping Services",
    subtitle: "Schedule guided site visits to compare locations confidently.",
    image: "https://images.unsplash.com/photo-1560518883-ce09059eeffa?w=1200&q=80",
  },
] as const;

export function ServiceShowcase() {
  const [activeIndex, setActiveIndex] = useState(0);
  const [loaded, setLoaded] = useState<boolean[]>(() => serviceVisuals.map(() => false));

  useEffect(() => {
    serviceVisuals.forEach((visual, index) => {
      const image = new Image();

      image.onload = () => {
        setLoaded((current) => {
          const next = [...current];
          next[index] = true;
          return next;
        });
      };

      image.onerror = () => {
        setLoaded((current) => {
          const next = [...current];
          next[index] = true;
          return next;
        });
      };

      image.src = visual.image;
    });
  }, []);

  useEffect(() => {
    const timer = window.setInterval(() => {
      setActiveIndex((current) => {
        const nextIndex = (current + 1) % serviceVisuals.length;
        return loaded[nextIndex] ? nextIndex : current;
      });
    }, 5000);

    return () => window.clearInterval(timer);
  }, [loaded]);

  const activeVisual = serviceVisuals[activeIndex];

  return (
    <section className="grid gap-8 px-4 py-12 sm:px-6 sm:py-16 lg:grid-cols-2 lg:px-28">
      <div className="md:hidden">
        <h2 className="mb-2 text-2xl font-semibold">
          Welcome to <span className="text-[#DE141C]">Jewellz Realty</span>
        </h2>
        <p className="text-sm leading-7">
          We help buyers, sellers, and investors make confident decisions with reliable market guidance and end-to-end support.
        </p>
      </div>
      <div className="relative">
        <div className="relative aspect-[3/2] w-full overflow-hidden rounded-xl">
          {serviceVisuals.map((visual, index) => (
            <div
              key={visual.title}
              className={`absolute inset-0 transition-opacity duration-700 ${index === activeIndex ? "opacity-100" : "opacity-0"}`}
            >
              <NextImage
                src={visual.image}
                alt={visual.title}
                fill
                sizes="(min-width: 1024px) 50vw, 100vw"
                priority={index === activeIndex}
                className={`object-cover transition-transform duration-[1400ms] ${index === activeIndex ? "scale-100" : "scale-105"}`}
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/75 via-black/20 to-transparent" />
            </div>
          ))}
        </div>
        <div className="pointer-events-none absolute bottom-4 left-4 right-24 text-white">
          <p className="text-lg font-semibold">
            {activeVisual.title === "CONSULTATION & GROWTH" ? (
              <>
                CONSULTATION
                <br />
                &amp; GROWTH
              </>
            ) : (
              activeVisual.title
            )}
          </p>
          <p className="mt-1 text-sm text-white/85">{activeVisual.subtitle}</p>
        </div>
      </div>
      <div>
        <h2 className="mb-3 hidden text-3xl font-semibold md:block">
          Welcome to <span className="text-[#DE141C]">Jewellz Realty</span>
        </h2>
        <p className="mb-6 hidden text-sm leading-7 md:block">
          We help buyers, sellers, and investors make confident decisions with reliable market guidance and end-to-end support.
        </p>
        {[
          {
            title: "Property Listings & Selling Assistance",
            description: "Browse houses, lots, condos, and farmland properties while getting guided support from licensed brokers throughout the buying or selling process.",
            icon: (
              <>
                <path d="M4 7.5h16M4 12h10M4 16.5h8" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
                <path d="M16.5 14.5l1.4 1.4 2.6-2.8" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
              </>
            ),
          },
          {
            title: "Real Estate Consultation",
            description: "Provides personalized property recommendations, market guidance, and investment assistance tailored to each client&apos;s needs and budget.",
            icon: (
              <>
                <path d="M4 12a8 8 0 1114.2 5l1.8 3-3.6-.7A8 8 0 014 12z" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
                <path d="M8.5 12h7M8.5 9.5h4.5" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
              </>
            ),
          },
          {
            title: "Property Viewing & Tripping Services",
            description: "Schedule guided site visits to compare locations confidently.",
            icon: (
              <>
                <path d="M12 21s7-5.8 7-11a7 7 0 10-14 0c0 5.2 7 11 7 11z" stroke="currentColor" strokeWidth="1.8" />
                <circle cx="12" cy="10" r="2" stroke="currentColor" strokeWidth="1.8" />
              </>
            ),
          },
        ].map((item, index) => (
          <div key={item.title} className="mb-5 flex items-start gap-4">
            <div
              className={`grid h-12 w-12 shrink-0 place-items-center rounded-full border text-white transition-all duration-500 ${
                activeIndex === index
                  ? "-translate-y-0.5 scale-110 border-[#DE141C] bg-[#DE141C] shadow-[0_8px_20px_-10px_rgba(222,20,28,0.9)]"
                  : "border-black bg-black"
              }`}
            >
              <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" aria-hidden="true">
                {item.icon}
              </svg>
            </div>
            <div>
              <h3 className="font-semibold">{item.title}</h3>
              <p className="text-sm leading-6">{item.description}</p>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}