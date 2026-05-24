"use client";

import Hero from "@/components/home/Hero";
import Benefits from "@/components/home/Benefits";
import BagCategories from "@/components/home/BagCategories";
import HowItWorks from "@/components/home/HowItWorks";
import AboutSection from "@/components/home/AboutSection";
import Reviews from "@/components/home/Reviews";
import CTABanner from "@/components/home/CTABanner";
import Footer from "@/components/layout/Footer";
import MockupGenerator from "@/components/home/MockupGenerator";
import useTour from "@/hooks/useTour";

export default function HomePage() {

  useTour("tourHome", [
  {
    popover: {
      title: "Tudo Pronto!",
      description:
        "Isto é tudo que você precisa saber para administrar a loja! Explore as seções, gerencie suas sacolas e acompanhe os pedidos!",
      side: "center",
      popoverClass: "esconder-botao-anterior",
    },
  },
]);

  return (
    <>
      <meta charSet="UTF-8" />
      <title>La Casa de Sacola — Sacolas Personalizadas para sua Marca</title>
      <meta name="description" content="Gráfica familiar especializada em sacolas personalizadas: kraft, papel, plástica e com alça de cordão. Qualidade garantida com entrega em todo o Brasil." />
      <link
        href="https://fonts.googleapis.com/css2?family=Manrope:wght@400;500;600;700;800&family=Quicksand:wght@500;600;700;800&display=swap"
        rel="stylesheet"
      />
      <div className="min-h-screen bg-white">
        <Hero />
        <Benefits />
        <AboutSection />
        <HowItWorks />
        {/* <BagCategories /> */}
        <MockupGenerator />
        <Reviews />
        <CTABanner />
        <Footer />
      </div>
    </>
  );
}
