import { createFileRoute } from "@tanstack/react-router";
import { BrandHeader } from "@/components/brand-header";
import { AutoPlayer, QueueCard } from "@/components/radio/auto-player";
import {
  CampaignsCard,
  ClockCard,
  NextMessageCard,
  StatusCard,
  WeatherCard,
} from "@/components/radio/side-cards";

export const Route = createFileRoute("/radio")({
  head: () => ({
    meta: [
      { title: "Rádio — Retail Radio AI" },
      { name: "description", content: "Tela operacional da rádio inteligente do seu estabelecimento." },
    ],
  }),
  component: RadioScreen,
});

function RadioScreen() {
  return (
    <div className="min-h-screen">
      <BrandHeader />
      <main className="mx-auto grid max-w-[1400px] grid-cols-1 gap-5 px-6 pb-10 md:px-10 lg:grid-cols-3">
        <section className="lg:col-span-2 space-y-5">
          <AutoPlayer />
          <QueueCard />
          <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
            <NextMessageCard />
            <CampaignsCard />
          </div>
        </section>
        <aside className="space-y-5">
          <ClockCard />
          <WeatherCard />
          <StatusCard />
        </aside>
      </main>
    </div>
  );
}
