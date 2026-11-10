# New project modal

A complete React + Tailwind interface from Vahri's Figma design.

## Use

1. Use a React + TypeScript project with Tailwind CSS 4 configured.
2. Copy `NewProjectModal.tsx` into your components directory.
3. Copy the `public` directory into your project's public directory. It contains
   the two SVG icons exported from the original Figma design.
4. Load Inter 400 and 500 in your app to match the design.

```tsx
import NewProjectDemo from "./components/NewProjectModal";

export default function App() {
  return <NewProjectDemo theme="light" />;
}
```

For your own trigger and save behavior, use the named `NewProjectModal` export:

```tsx
<NewProjectModal
  theme="light"
  open={isOpen}
  onClose={() => setIsOpen(false)}
  onCreate={(settings) => saveProject(settings)}
/>
```

Set `theme="light"` or `theme="dark"` on either export. Switching theme preserves the current form choices.

`onCreate` receives `{ name, format, frameRate, folder }`. The demo keeps the result
in browser memory. Connect the callback to your own application. Native dialog
provides focus trapping, Escape handling, and return focus; format radios and
form fields retain native keyboard behavior.

Design: https://www.figma.com/design/gYcAmFRax6OW5UyiWvqm8g/Documentation-for-Components?node-id=2123-446

No component registry, CLI, icon package, or custom UI library is required.
