"use client";
import { useEffect } from "react";
import { driver } from "driver.js";
import "driver.js/dist/driver.css";
import { useRouter } from "next/navigation";

function esperarElemento(seletor, callback, tentativasMax = 20) {
  let tentativas = 0;
  const intervalo = setInterval(() => {
    tentativas++;
    const el = document.querySelector(seletor);
    if (el) {
      clearInterval(intervalo);
      callback();
    } else if (tentativas >= tentativasMax) {
      clearInterval(intervalo);
      console.warn(`[useTour] Elemento "${seletor}" não encontrado após ${tentativasMax} tentativas.`);
    }
  }, 200);
  return intervalo;
}

export default function useTour(
  chavePagina,
  steps,
  proximaPaginaUrl = null,
  proximaChave = null,
  chaveVisto,
) {
  const router = useRouter();

  useEffect(() => {
    const tourAtivo = localStorage.getItem("tourGlobalAtivo");
    if (tourAtivo !== chavePagina) return;

    const stepsProcessados = steps.map((step, index) => {
      if (!step.onNextClick) return step;
      const proximoSeletor = steps[index + 1]?.element;
      return {
        ...step,
        onNextClick: () => {
          step.onNextClick();
          if (proximoSeletor) {
            esperarElemento(proximoSeletor, () => tour.moveNext());
          } else {
            setTimeout(() => tour.moveNext(), 600);
          }
        },
      };
    });

    const tour = driver({
      showProgress: true,
      progressText: "{{current}} de {{total}}",
      nextBtnText: "Próximo →",
      prevBtnText: "← Anterior",
      doneBtnText: proximaPaginaUrl ? "Próximo →" : "Entendido!",
      steps: stepsProcessados,
      onCloseClick: () => {
        localStorage.removeItem("tourGlobalAtivo");
        tour.destroy();
      },
      onDestroyStarted: () => {
        if (!tour.isLastStep()) return;
        localStorage.setItem(chaveVisto, "true");
        if (proximaPaginaUrl && proximaChave) {
          localStorage.setItem("tourGlobalAtivo", proximaChave);
          tour.destroy();
          router.push(proximaPaginaUrl);
        } else {
          localStorage.removeItem("tourGlobalAtivo");
          tour.destroy();
        }
      },
    });

    const primeiroSeletor = steps[0]?.element;
    if (primeiroSeletor) {
      const intervalo = esperarElemento(primeiroSeletor, () => {
        document?.activeElement?.blur();
        tour.drive();
      });
      return () => clearInterval(intervalo);
    } else {
      document?.activeElement?.blur();
      tour.drive();
    }
  }, [chavePagina]);
}