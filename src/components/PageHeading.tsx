import { ReactNode } from "react";
import { Icon } from "./Icon";

export function PageHeading({ eyebrow, title, description, icon, children }: { eyebrow: string; title: string; description: string; icon: string; children?: ReactNode }) {
  return <div className="flex flex-col gap-5"><div className="flex items-start gap-4"><span className="hidden h-14 w-14 shrink-0 items-center justify-center rounded-2xl border border-blue-100 bg-blue-50 text-secondary sm:flex"><Icon name={icon} className="text-2xl" /></span><div><p className="eyebrow">{eyebrow}</p><h1 className="mt-1 font-heading text-3xl font-bold tracking-tight text-primary md:text-4xl">{title}</h1><p className="mt-2 max-w-2xl text-sm leading-relaxed text-on-surface-variant">{description}</p></div></div>{children}</div>;
}
