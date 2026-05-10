## 2025-05-10 - Logo Accessibility and Redundancy
**Learning:** Redundant alt text on logos (e.g., "JBay BFF logo") when adjacent to brand text (e.g., "JBay BFF") creates a repetitive and noisy experience for screen reader users.
**Action:** Always set `alt=""` on logo images when the brand name is explicitly provided in the same link or adjacent text. Ensure logo components support an `alt` prop to override default values in these contexts.

## 2025-05-10 - Mobile Menu Interaction
**Learning:** Abrupt appearance of mobile navigation menus can feel jarring and break the sense of spatial continuity. Using a standard slide-down and fade transition makes the interface feel more responsive and high-quality.
**Action:** Wrap mobile menu containers in Vue's `<Transition>` component with Tailwind classes like `enter-active-class="transition duration-200 ease-out"` and `enter-from-class="-translate-y-2 opacity-0"`.
