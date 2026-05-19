import Link from "next/link";

type ServiceCardProps = {
  title: string;
  description: string;
  href: string;
  accent: string;
  meta: string;
};

export default function ServiceCard({ title, description, href, accent, meta }: ServiceCardProps) {
  return (
    <article className="service-card">
      <div className="service-accent" style={{ background: accent }} />
      <div>
        <span className="eyebrow">{meta}</span>
        <h2>{title}</h2>
        <p className="muted">{description}</p>
      </div>
      <Link className="button" href={href}>
        Open
      </Link>
    </article>
  );
}
