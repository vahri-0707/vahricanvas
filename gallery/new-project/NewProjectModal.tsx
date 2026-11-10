"use client";

import { useEffect, useId, useRef, useState, type CSSProperties } from "react";

export type ProjectSettings = { name: string; format: string; frameRate: string; folder: string };
export type ProjectTheme = "light" | "dark";
export const projectThemes: Record<ProjectTheme, CSSProperties> = {
  dark: { colorScheme: "dark", "--project-surface": "#171717", "--project-text": "#fafafa", "--project-muted": "#a3a3a3", "--project-input": "#101113", "--project-subtle": "#1c2023", "--project-line": "#262626", "--project-hover": "#262a2e" } as CSSProperties,
  light: { colorScheme: "light", "--project-surface": "#ffffff", "--project-text": "#171717", "--project-muted": "#626575", "--project-input": "#f8f9fc", "--project-subtle": "#f1f5fd", "--project-line": "#d6dce8", "--project-hover": "#e4ecf7" } as CSSProperties,
};
const formats = [
  { ratio: "16:9", channel: "YouTube", quality: "4k", shape: "w-[52px] h-8" },
  { ratio: "9:16", channel: "Reels", quality: "1080p", shape: "w-5 h-8" },
  { ratio: "1:1", channel: "Feed", quality: "1080p", shape: "size-8" },
];

export function ProjectForm({ onCancel, onCreate, theme = "dark" }: {
  theme?: ProjectTheme;
  onCancel: () => void;
  onCreate: (settings: ProjectSettings) => void;
}) {
  const id = useId();
  const [format, setFormat] = useState("16:9");
  return (
    <form style={projectThemes[theme]} data-theme={theme} className="flex flex-col gap-4 text-left text-[14px] leading-5 tracking-[-0.5px] text-[color:var(--project-text)] [font-family:Inter,sans-serif]" onSubmit={(event) => {
      event.preventDefault();
      const values = new FormData(event.currentTarget);
      onCreate({ name: String(values.get("name")).trim(), format, frameRate: String(values.get("frameRate")), folder: String(values.get("folder")) });
    }}>
      <header className="flex h-[84px] shrink-0 items-center max-[420px]:h-auto max-[420px]:min-h-[84px] justify-between gap-5 px-5 py-5 [box-shadow:inset_0_-1px_0_var(--project-line)]">
        <div><h2 id={`${id}-title`} className="m-0 text-[16px] leading-[22px] font-medium">New Project</h2><p className="mt-0.5 text-[color:var(--project-muted)]">Start blank or from a template</p></div>
        <button type="button" onClick={onCancel} aria-label="Close new project" className="flex size-10 shrink-0 cursor-pointer items-center justify-center rounded-full bg-[var(--project-subtle)] hover:bg-[var(--project-hover)] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-500"><img style={{ filter: theme === "light" ? "brightness(.65)" : undefined }} src="/gallery/new-project/close.svg" width="20" height="20" alt="" /></button>
      </header>
      <div className="space-y-4 px-5">
        <div className="space-y-1.5"><label htmlFor={`${id}-name`} className="block text-xs leading-4 font-medium text-[color:var(--project-muted)]">Project Name</label><input id={`${id}-name`} name="name" required maxLength={80} autoFocus defaultValue="Summer drop testing" className="h-10 w-full rounded-xl border border-[var(--project-line)] bg-[var(--project-input)] px-3.5 text-[14px] leading-5 text-[color:var(--project-text)] outline-none focus:border-[#2563eb] focus:ring-[0.5px] focus:ring-[#2563eb]" /></div>
        <fieldset className="min-w-0"><legend className="mb-1.5 text-xs leading-4 font-medium text-[color:var(--project-muted)]">Format</legend><div className="grid grid-cols-3 gap-2.5">
          {formats.map((item) => <label key={item.ratio} className="relative min-w-0 cursor-pointer">
            <input type="radio" name="format" value={item.ratio} checked={format === item.ratio} onChange={() => setFormat(item.ratio)} className="peer sr-only" />
            <span className="flex h-[116px] flex-col justify-center gap-3 rounded-xl max-[420px]:h-auto max-[420px]:min-h-[116px] max-[420px]:gap-2 max-[420px]:px-2 border border-[var(--project-line)] bg-[var(--project-subtle)] px-3.5 py-2.5 shadow-sm peer-checked:border-[#2563eb] peer-checked:bg-[#2563eb]/10 peer-checked:ring-[0.5px] peer-checked:ring-[#2563eb] peer-focus-visible:outline-2 peer-focus-visible:outline-offset-2 peer-focus-visible:outline-blue-400">
              <span aria-hidden="true" className={`${item.shape} block max-w-full rounded-md border-[1.5px] ${format === item.ratio ? "border-[#2563eb]" : "border-[var(--project-muted)]"}`} />
              <span className="block"><span className="block font-medium">{item.ratio}</span><span className="mt-1 flex flex-wrap gap-x-3 text-xs max-[420px]:flex-col max-[420px]:gap-0 leading-4 text-[color:var(--project-muted)] [font-family:ui-monospace,SFMono-Regular,monospace]"><span>{item.channel}</span><span aria-hidden="true" className="max-[420px]:hidden">·</span><span>{item.quality}</span></span></span>
            </span>
          </label>)}
        </div></fieldset>
        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1.5"><label htmlFor={`${id}-fps`} className="block text-xs leading-4 font-medium text-[color:var(--project-muted)]">Frame Rate</label><div className="relative"><select id={`${id}-fps`} name="frameRate" defaultValue="25" className="h-10 w-full appearance-none rounded-[10px] border border-[var(--project-line)] bg-[var(--project-input)] py-2.5 pr-11 pl-3.5 text-[14px] leading-5 text-[color:var(--project-text)] outline-none focus:border-[#2563eb] focus:ring-1 focus:ring-[#2563eb]"><option value="24">24 fps</option><option value="25">25 fps</option><option value="30">30 fps</option><option value="60">60 fps</option></select><img className="pointer-events-none absolute top-2.5 right-3.5" src="/gallery/new-project/chevron.svg" width="20" height="20" alt="" /></div></div>
          <div className="space-y-1.5"><label htmlFor={`${id}-folder`} className="block text-xs leading-4 font-medium text-[color:var(--project-muted)]">Folder</label><div className="relative"><span aria-hidden="true" className="pointer-events-none absolute top-[15px] left-3.5 size-2.5 rounded-xs bg-[#2563eb]" /><select id={`${id}-folder`} name="folder" defaultValue="Summer drop testing" className="h-10 w-full appearance-none truncate rounded-[10px] border border-[var(--project-line)] bg-[var(--project-input)] py-2.5 pr-10 pl-[30px] text-[14px] leading-5 text-[color:var(--project-text)] outline-none focus:border-[#2563eb] focus:ring-1 focus:ring-[#2563eb]"><option>Summer drop testing</option><option>Brand campaigns</option><option>Personal projects</option></select><img className="pointer-events-none absolute top-2.5 right-3.5" src="/gallery/new-project/chevron.svg" width="20" height="20" alt="" /></div></div>
        </div>
      </div>
      <footer className="flex min-h-[76px] flex-wrap items-center justify-between gap-3 px-5 py-5 [box-shadow:inset_0_1px_0_var(--project-line)]">
        <p className="text-[color:var(--project-muted)]">Saved to brand campaigns</p>
        <div className="ml-auto flex items-center gap-2"><button type="button" onClick={onCancel} className="h-9 cursor-pointer rounded-[10px] px-3.5 font-medium text-[color:var(--project-muted)] hover:bg-[var(--project-line)] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-500">Cancel</button><button type="submit" className="h-9 cursor-pointer rounded-[10px] bg-[#2563eb] px-3.5 font-medium text-white shadow-sm hover:bg-blue-700 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-400">Create Project</button></div>
      </footer>
    </form>
  );
}

export function NewProjectModal({ open, onClose, onCreate, theme = "dark" }: {
  theme?: ProjectTheme;
  open: boolean;
  onClose: () => void;
  onCreate: (settings: ProjectSettings) => void;
}) {
  const ref = useRef<HTMLDialogElement>(null);
  useEffect(() => {
    const dialog = ref.current;
    if (open && dialog && !dialog.open) {
      dialog.showModal();
      dialog.querySelector<HTMLInputElement>('input[name="name"]')?.focus();
    }
    if (!open && dialog?.open) dialog.close();
  }, [open]);
  return <dialog ref={ref} style={projectThemes[theme]} data-theme={theme} aria-label="New project" onClose={onClose} onClick={(event) => { if (event.target === event.currentTarget) ref.current?.close(); }} className="m-auto max-h-[calc(100dvh-32px)] w-[564px] max-w-[calc(100vw-32px)] overflow-auto rounded-3xl border-0 bg-[var(--project-surface)] p-0 text-[color:var(--project-text)] shadow-2xl backdrop:bg-black/25">
    <ProjectForm theme={theme} onCancel={() => ref.current?.close()} onCreate={(settings) => { onCreate(settings); ref.current?.close(); }} />
  </dialog>;
}

export default function NewProjectDemo({ theme = "dark" }: { theme?: ProjectTheme }) {
  const [open, setOpen] = useState(false);
  const [created, setCreated] = useState<ProjectSettings | null>(null);
  return <div style={projectThemes[theme]} className="flex flex-col items-center gap-4 p-4 text-center text-[14px] text-[color:var(--project-muted)] [font-family:Inter,sans-serif]">
    <button onClick={() => setOpen(true)} className="h-10 cursor-pointer rounded-[10px] bg-[#2563eb] px-4 font-medium text-white hover:bg-blue-700 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-400">New project</button>
    <p role="status">{created ? `Created “${created.name}” · ${created.format} · ${created.frameRate} fps` : "Choose the settings for your next project."}</p>
    <NewProjectModal theme={theme} open={open} onClose={() => setOpen(false)} onCreate={setCreated} />
  </div>;
}
