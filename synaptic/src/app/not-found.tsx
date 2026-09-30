import { LinkButton } from "@/components/ui/Button";

export const metadata = { title: "Сторінку не знайдено — Synaptic" };

export default function NotFound() {
  return (
    <main className="nf">
      <p className="eyebrow">404</p>
      <h1 className="h2">Такої сторінки немає.</h1>
      <p className="lead">Перейдіть на головну, щоб побачити, як Synaptic допомагає від даних дійти до дії.</p>
      <LinkButton href="/">На головну</LinkButton>
    </main>
  );
}
