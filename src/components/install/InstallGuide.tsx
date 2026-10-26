import { Fragment } from "react";
import { Check, Compass, Download, ExternalLink, MoreVertical, Share, SquarePlus } from "lucide-react";
import { installSteps, type InstallPlatform, type InstallStep } from "@/lib/install-platform";

const ICONS: Record<InstallStep["icon"], typeof Share> = {
  share: Share,
  plus: SquarePlus,
  menu: MoreVertical,
  download: Download,
  check: Check,
  external: ExternalLink,
  compass: Compass,
};

/** Renders the **bold** markers used in the step texts. */
const withBold = (text: string) =>
  text.split(/\*\*(.+?)\*\*/g).map((part, i) =>
    i % 2 ? <strong key={i} className="font-black text-foreground">{part}</strong> : <Fragment key={i}>{part}</Fragment>
  );

/** Numbered, illustrated install steps for one platform. */
const InstallGuide = ({ platform }: { platform: InstallPlatform }) => (
  <ol className="space-y-3">
    {installSteps(platform).map((step, i) => {
      const Icon = ICONS[step.icon];
      return (
        <li key={i} className="flex items-start gap-3 text-sm text-muted-foreground">
          <span className="relative w-10 h-10 rounded-xl bg-primary/10 text-primary flex items-center justify-center shrink-0">
            <Icon size={18} />
            <span className="absolute -top-1.5 -left-1.5 w-5 h-5 rounded-full bg-primary text-primary-foreground text-[10px] font-black flex items-center justify-center">
              {i + 1}
            </span>
          </span>
          <span className="pt-2 leading-snug">{withBold(step.text)}</span>
        </li>
      );
    })}
  </ol>
);

export default InstallGuide;
