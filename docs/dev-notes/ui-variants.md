# UI Variant Testing

Guide for iterating on UI by creating multiple variants of a component, screenshotting each, and letting the user pick the best one. Works for both web (`apps/web`) and mobile (`apps/mobile`).

## Workflow

### 1. Create variant files

For the component you're restyling (e.g. `MessageBubble.tsx`), create 3–5 variant files as siblings:

```
src/components/MessageBubble.tsx              ← original (don't modify)
src/components/MessageBubble.variant-a.tsx
src/components/MessageBubble.variant-b.tsx
src/components/MessageBubble.variant-c.tsx
```

Each variant should export the same component name and props interface as the original. Make meaningful visual changes between variants — don't just tweak one color. Try genuinely different approaches (spacing, layout, typography, borders, shadows, etc.).

### 2. Screenshot each variant

For each variant:

1. **Swap the import** in the screen/page that uses the component. Change the import path to point at the variant file.
2. **Wait for hot reload** to pick up the change (Vite HMR for web, Expo fast refresh for mobile — just wait a moment).
3. **Navigate to the screen** showing the component. Use the appropriate CLI tool to interact if needed:

   **Web (agent-browser):**
   ```bash
   # Navigate to the page
   agent-browser navigate http://localhost:3000/path

   # Accessibility tree (find click targets)
   agent-browser snapshot

   # Click an element by ref
   agent-browser click ref:42

   # Type into an input
   agent-browser type ref:15 "hello"
   ```

   **Mobile (idb):**
   ```bash
   # See what's on screen
   idb ui describe-all

   # Tap at coordinates
   idb ui tap X Y

   # Input text
   idb ui text "hello"
   ```

4. **Take a screenshot** with a descriptive filename:

   **Web:**
   ```bash
   agent-browser screenshot /tmp/ui-variants/MessageBubble-variant-a.png
   ```

   **Mobile:**
   ```bash
   idb screenshot /tmp/ui-variants/MessageBubble-variant-a.png
   ```

### 3. Restore original import

After screenshotting all variants, **restore the original import** in the screen/page file so the app is back to its baseline state.

### 4. Deliver screenshots to the user

Tell the user where the screenshots are and what each variant changed:

```
Screenshots saved to /tmp/ui-variants/:
  - MessageBubble-variant-a.png — rounded cards with subtle shadow, more padding
  - MessageBubble-variant-b.png — flat design, tighter spacing, left accent border
  - MessageBubble-variant-c.png — Slack-style compact with hover-revealed actions
```

## Rules

- **Create 3–5 meaningfully different variants.** Don't make trivial changes.
- **Keep all variant files until the user reviews every screenshot.** Do not delete any variant file until the user tells you which one to keep.
- **Name screenshot files clearly**: `{ComponentName}-variant-{a,b,c,...}.png`. If screenshotting multiple components, use subfolders: `/tmp/ui-variants/{ComponentName}/variant-a.png`.
- **Always screenshot the original too** as `{ComponentName}-original.png` so the user can compare against the current state.
- **Restore the original import** after all screenshots are taken so the running app isn't left pointing at a variant.
- **Keep a summary** of what each variant changed so the user can match screenshots to design intent without opening files.

## Tool Reference

### agent-browser (Web)

```bash
# Navigate to a URL
agent-browser navigate <url>

# Take a screenshot
agent-browser screenshot <dest_path.png>

# Accessibility tree (find click targets)
agent-browser snapshot

# Click, type, scroll
agent-browser click ref:<id>
agent-browser type ref:<id> "<input>"
agent-browser scroll down
```

### idb (Mobile)

```bash
# Take a screenshot
idb screenshot <dest_path.png>

# Accessibility tree (find tap targets)
idb ui describe-all

# Tap, type, swipe
idb ui tap <x> <y>
idb ui text "<input>"
idb ui swipe <start_x> <start_y> <end_x> <end_y>
```

## After the user picks a winner

1. Copy the winning variant's changes into the original component file.
2. Delete all variant files (`*.variant-*.tsx`).
3. Verify the app renders correctly with the final version.
