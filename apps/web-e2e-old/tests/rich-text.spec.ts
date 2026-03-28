import { expect } from "@playwright/test";
import { sharedTest as test, addMemberViaInvite } from "./helpers/test-workspace";
import { setupMockAuth } from "./helpers/mock-auth";
import { SHOWCASE_ALICE, SHOWCASE_BOB } from "./helpers/api";
import { refreshChannel } from "./helpers/chat-ui";

test.describe("Rich text formatting", () => {
  test("bold text", async ({ page, testWorkspace }) => {
    await setupMockAuth(page);
    await page.goto(`/w/${testWorkspace.slug}`);
    await page.getByText("# general").click();
    await expect(page.locator(".tiptap")).toBeVisible();

    const ts = Date.now();
    const editor = page.locator(".tiptap");
    // Focus editor first, then toggle bold via keyboard shortcut
    // (using shortcut instead of toolbar button avoids focus-loss flakiness)
    await editor.click();
    await page.keyboard.press("Meta+b");
    await page.keyboard.type(`bold-${ts}`);

    const sent = page.waitForResponse(
      (res) => res.url().includes("/messages") && res.request().method() === "POST" && res.status() === 201,
    );
    await page.keyboard.press("Enter");
    await sent;

    await refreshChannel(page, "general");

    // Verify the message renders with <strong>
    await expect(page.locator("strong").filter({ hasText: `bold-${ts}` })).toBeVisible();
  });

  test("italic, strikethrough, and inline code render correctly", async ({ page, testWorkspace }) => {
    const channel = await testWorkspace.api.getChannelByName("general");
    const ts = Date.now();

    // Create messages with markdown formatting via API
    await testWorkspace.api.createMessage(channel.id, `*italic-${ts}*`);
    await testWorkspace.api.createMessage(channel.id, `~~struck-${ts}~~`);
    await testWorkspace.api.createMessage(channel.id, "`code-" + ts + "`");

    await setupMockAuth(page);
    await page.goto(`/w/${testWorkspace.slug}`);
    await page.getByText("# general").click();

    // Verify italic renders as <em>
    await expect(page.locator("em").filter({ hasText: `italic-${ts}` })).toBeVisible();

    // Verify strikethrough renders as <del>
    await expect(page.locator("del").filter({ hasText: `struck-${ts}` })).toBeVisible();

    // Verify inline code renders as <code>
    await expect(page.locator("code").filter({ hasText: `code-${ts}` })).toBeVisible();
  });

  test("code block renders with pre element", async ({ page, testWorkspace }) => {
    const channel = await testWorkspace.api.getChannelByName("general");
    const ts = Date.now();

    await testWorkspace.api.createMessage(channel.id, "```\ncodeblock-" + ts + "\n```");

    await setupMockAuth(page);
    await page.goto(`/w/${testWorkspace.slug}`);
    await page.getByText("# general").click();

    // Verify code block renders inside <pre>
    await expect(page.locator("pre").filter({ hasText: `codeblock-${ts}` })).toBeVisible();
  });

  test("bullet and ordered lists render correctly", async ({ page, testWorkspace }) => {
    const channel = await testWorkspace.api.getChannelByName("general");
    const ts = Date.now();

    await testWorkspace.api.createMessage(channel.id, `- bullet-${ts}\n- second-item`);
    await testWorkspace.api.createMessage(channel.id, `1. ordered-${ts}\n2. second-item`);

    await setupMockAuth(page);
    await page.goto(`/w/${testWorkspace.slug}`);
    await page.getByText("# general").click();

    // Verify unordered list
    await expect(page.locator("ul").filter({ hasText: `bullet-${ts}` })).toBeVisible();

    // Verify ordered list
    await expect(page.locator("ol").filter({ hasText: `ordered-${ts}` })).toBeVisible();
  });

  test("link insertion via toolbar", async ({ page, testWorkspace }) => {
    await setupMockAuth(page);
    await page.goto(`/w/${testWorkspace.slug}`);
    await page.getByText("# general").click();
    await expect(page.locator(".tiptap")).toBeVisible();

    const ts = Date.now();
    const editor = page.locator(".tiptap");
    await editor.click();
    await page.keyboard.type(`linktext-${ts}`);

    // Select all text in editor (triple-click selects the paragraph)
    await editor.click({ clickCount: 3 });

    // Click link button to open the link dialog
    await page.locator("button").filter({ hasText: "🔗" }).click();

    // Wait for link dialog to appear, fill in the URL and save
    await expect(page.getByTestId("link-dialog-url")).toBeVisible();
    await page.getByTestId("link-dialog-url").fill("https://example.com");
    await page.getByTestId("link-dialog-save").click();

    // Wait for dialog to close and editor to regain focus
    await expect(page.getByTestId("link-dialog-url")).not.toBeVisible();
    await editor.click();

    // Send the message
    const sent = page.waitForResponse(
      (res) => res.url().includes("/messages") && res.request().method() === "POST" && res.status() === 201,
    );
    await page.keyboard.press("Enter");
    await sent;

    await refreshChannel(page, "general");

    // Verify link renders as <a>
    const link = page.locator("a").filter({ hasText: `linktext-${ts}` });
    await expect(link).toBeVisible();
    await expect(link).toHaveAttribute("href", "https://example.com");
  });

  test("italic, strikethrough, and code via toolbar buttons", async ({ page, testWorkspace }) => {
    await setupMockAuth(page);
    await page.goto(`/w/${testWorkspace.slug}`);
    await page.getByText("# general").click();
    await expect(page.locator(".tiptap")).toBeVisible();
    const editor = page.locator(".tiptap");
    const ts = Date.now();

    // Italic via toolbar button
    await editor.click();
    await page.locator(".editor-toolbar-btn").filter({ hasText: /^I$/ }).click();
    await page.keyboard.type(`ital-${ts}`);
    const sent1 = page.waitForResponse(
      (res) => res.url().includes("/messages") && res.request().method() === "POST" && res.status() === 201,
    );
    await page.keyboard.press("Enter");
    await sent1;

    // Strikethrough via toolbar button
    await editor.click();
    await page.locator(".editor-toolbar-btn").filter({ hasText: /^S$/ }).click();
    await page.keyboard.type(`struck-${ts}`);
    const sent2 = page.waitForResponse(
      (res) => res.url().includes("/messages") && res.request().method() === "POST" && res.status() === 201,
    );
    await page.keyboard.press("Enter");
    await sent2;

    // Inline code via toolbar button
    await editor.click();
    await page.locator(".editor-toolbar-btn").filter({ hasText: /^<>$/ }).click();
    await page.keyboard.type(`code-${ts}`);
    const sent3 = page.waitForResponse(
      (res) => res.url().includes("/messages") && res.request().method() === "POST" && res.status() === 201,
    );
    await page.keyboard.press("Enter");
    await sent3;

    await refreshChannel(page, "general");

    await expect(page.locator("em").filter({ hasText: `ital-${ts}` })).toBeVisible();
    await expect(page.locator("del").filter({ hasText: `struck-${ts}` })).toBeVisible();
    await expect(page.locator("code").filter({ hasText: `code-${ts}` })).toBeVisible();
  });

  test("blockquote and list buttons", async ({ page, testWorkspace }) => {
    await setupMockAuth(page);
    await page.goto(`/w/${testWorkspace.slug}`);
    await page.getByText("# general").click();
    await expect(page.locator(".tiptap")).toBeVisible();
    const editor = page.locator(".tiptap");
    const ts = Date.now();

    // Blockquote via toolbar button — use Send button (Enter adds lines in blockquote)
    await editor.click();
    await page.locator(".editor-toolbar-btn").filter({ hasText: /^>$/ }).click();
    await page.keyboard.type(`quote-${ts}`);
    const sent1 = page.waitForResponse(
      (res) => res.url().includes("/messages") && res.request().method() === "POST" && res.status() === 201,
    );
    await page.getByRole("button", { name: "Send message" }).click();
    await sent1;

    await refreshChannel(page, "general");
    await expect(page.locator("blockquote").filter({ hasText: `quote-${ts}` })).toBeVisible();

    // Bullet list via toolbar button — use Send button (Enter adds list items)
    await editor.click();
    await page.locator(".editor-toolbar-btn").filter({ hasText: /^•$/ }).click();
    await page.keyboard.type(`bullet-${ts}`);
    const sent2 = page.waitForResponse(
      (res) => res.url().includes("/messages") && res.request().method() === "POST" && res.status() === 201,
    );
    await page.getByRole("button", { name: "Send message" }).click();
    await sent2;

    await refreshChannel(page, "general");
    await expect(page.locator("ul").filter({ hasText: `bullet-${ts}` })).toBeVisible();

    // Ordered list via toolbar button — use Send button
    await editor.click();
    await page.locator(".editor-toolbar-btn").filter({ hasText: /^1\.$/ }).click();
    await page.keyboard.type(`ordered-${ts}`);
    const sent3 = page.waitForResponse(
      (res) => res.url().includes("/messages") && res.request().method() === "POST" && res.status() === 201,
    );
    await page.getByRole("button", { name: "Send message" }).click();
    await sent3;

    await refreshChannel(page, "general");
    await expect(page.locator("ol").filter({ hasText: `ordered-${ts}` })).toBeVisible();
  });

  test("syntax-highlighted code block with language label", async ({ page, testWorkspace }) => {
    const channel = await testWorkspace.api.getChannelByName("general");
    const ts = Date.now();

    await testWorkspace.api.createMessage(channel.id, "```ts\nconst x: number = " + ts + ";\n```");

    await setupMockAuth(page);
    await page.goto(`/w/${testWorkspace.slug}`);
    await page.getByText("# general").click();

    // Wait for Shiki-highlighted code block (async via MarkdownHooks)
    const codeBlock = page.locator("pre.shiki").filter({ hasText: String(ts) });
    await expect(codeBlock).toBeVisible({ timeout: 15000 });
    // Verify syntax highlighting produces styled spans inside <code>
    await expect(codeBlock.locator("code.language-ts span.line").first()).toBeVisible();
    // Verify language label
    await expect(page.getByTestId("code-language").filter({ hasText: "typescript" })).toBeVisible();
  });

  test("code block copy button", async ({ page, testWorkspace }) => {
    const channel = await testWorkspace.api.getChannelByName("general");
    const ts = Date.now();
    const codeContent = `const y = ${ts};`;

    await testWorkspace.api.createMessage(channel.id, "```js\n" + codeContent + "\n```");

    await setupMockAuth(page);
    await page.goto(`/w/${testWorkspace.slug}`);
    await page.getByText("# general").click();

    // Wait for Shiki-highlighted code block
    const codeBlock = page.locator("pre.shiki").filter({ hasText: String(ts) });
    await expect(codeBlock).toBeVisible({ timeout: 15000 });

    // The code wrapper div (group/code) is the parent of the <pre>
    const codeWrapper = codeBlock.locator("xpath=..");
    const copyBtn = codeWrapper.getByText("Copy");
    await expect(async () => {
      await codeWrapper.hover();
      await expect(copyBtn).toBeVisible({ timeout: 2000 });
    }).toPass({ timeout: 10000 });

    // Click copy and verify "Copied!" feedback
    await copyBtn.click();
    await expect(codeWrapper.getByText("Copied!")).toBeVisible();
  });

  test("code block via toolbar button", async ({ page, testWorkspace }) => {
    await setupMockAuth(page);
    await page.goto(`/w/${testWorkspace.slug}`);
    await page.getByText("# general").click();
    await expect(page.locator(".tiptap")).toBeVisible();
    const editor = page.locator(".tiptap");
    const ts = Date.now();

    // Click code block "{ }" toolbar button
    await editor.click();
    await page.locator(".editor-toolbar-btn").filter({ hasText: /^\{ \}$/ }).click();
    await page.keyboard.type(`codeblock-${ts}`);
    const sent = page.waitForResponse(
      (res) => res.url().includes("/messages") && res.request().method() === "POST" && res.status() === 201,
    );
    await page.getByRole("button", { name: "Send message" }).click();
    await sent;

    await refreshChannel(page, "general");
    await expect(page.locator("pre").filter({ hasText: `codeblock-${ts}` })).toBeVisible();
  });

  test("emoji via toolbar button", async ({ page, testWorkspace }) => {
    await setupMockAuth(page);
    await page.goto(`/w/${testWorkspace.slug}`);
    await page.getByText("# general").click();
    await expect(page.locator(".tiptap")).toBeVisible();
    const editor = page.locator(".tiptap");

    // Click in editor first
    await editor.click();

    // Click emoji toolbar button to open picker
    await page.getByTestId("emoji-toolbar-button").click();

    // Emoji picker should appear
    const emojiPicker = page.locator("em-emoji-picker");
    await expect(emojiPicker).toBeVisible();

    // Type to search and pick an emoji
    const searchInput = page.locator("em-emoji-picker input");
    await searchInput.fill("thumbsup");
    await page.getByRole("button", { name: "👍", exact: true }).click();

    // The emoji should be inserted into the editor
    await expect(editor).toContainText("👍");
  });

  test("link dialog with custom text replaces selection", async ({ page, testWorkspace }) => {
    await setupMockAuth(page);
    await page.goto(`/w/${testWorkspace.slug}`);
    await page.getByText("# general").click();
    await expect(page.locator(".tiptap")).toBeVisible();
    const editor = page.locator(".tiptap");
    const ts = Date.now();

    // Type some text in editor
    await editor.click();
    await page.keyboard.type(`replace-me-${ts}`);

    // Select all text
    await editor.click({ clickCount: 3 });

    // Open link dialog
    await page.locator("button").filter({ hasText: "🔗" }).click();
    await expect(page.getByTestId("link-dialog-url")).toBeVisible();

    // Modify the text and URL
    const textInput = page.getByTestId("link-dialog-text");
    await textInput.fill(`custom-link-${ts}`);
    await page.getByTestId("link-dialog-url").fill("https://custom.example.com");
    await page.getByTestId("link-dialog-save").click();

    // Send the message
    const sent = page.waitForResponse(
      (res) => res.url().includes("/messages") && res.request().method() === "POST" && res.status() === 201,
    );
    await page.keyboard.press("Enter");
    await sent;

    await refreshChannel(page, "general");

    // Verify the link renders with custom text
    const link = page.locator("a").filter({ hasText: `custom-link-${ts}` });
    await expect(link).toBeVisible();
    await expect(link).toHaveAttribute("href", "https://custom.example.com");
  });

  test("link remove button unsets link", async ({ page, testWorkspace }) => {
    await setupMockAuth(page);
    await page.goto(`/w/${testWorkspace.slug}`);
    await page.getByText("# general").click();
    await expect(page.locator(".tiptap")).toBeVisible();
    const editor = page.locator(".tiptap");
    const ts = Date.now();

    // Type text, select it, and add a link
    await editor.click();
    await page.keyboard.type(`unlink-${ts}`);
    await editor.click({ clickCount: 3 });
    await page.locator("button").filter({ hasText: "🔗" }).click();
    await page.getByTestId("link-dialog-url").fill("https://remove.example.com");
    await page.getByTestId("link-dialog-save").click();

    // Now select the link text and open link dialog again to remove it
    await editor.click({ clickCount: 3 });
    await page.locator("button").filter({ hasText: "🔗" }).click();

    // "Remove link" button should be visible since it's editing an existing link
    await page.getByTestId("link-dialog-remove").click();

    // Send the message — the text should still be there but without a link
    const sent = page.waitForResponse(
      (res) => res.url().includes("/messages") && res.request().method() === "POST" && res.status() === 201,
    );
    await page.keyboard.press("Enter");
    await sent;

    await refreshChannel(page, "general");
    await expect(page.getByText(`unlink-${ts}`)).toBeVisible();
  });

  test("Enter key in code block adds newline instead of sending", async ({ page, testWorkspace }) => {
    await setupMockAuth(page);
    await page.goto(`/w/${testWorkspace.slug}`);
    await page.getByText("# general").click();
    await expect(page.locator(".tiptap")).toBeVisible();
    const editor = page.locator(".tiptap");

    // Activate code block via toolbar
    await editor.click();
    await page.locator(".editor-toolbar-btn").filter({ hasText: /^\{ \}$/ }).click();

    // Type some code
    await page.keyboard.type("line1");

    // Press Enter — should add a newline in the code block, NOT send the message
    await page.keyboard.press("Enter");
    await page.keyboard.type("line2");

    // Both lines should be in the editor (not sent as a message)
    await expect(editor).toContainText("line1");
    await expect(editor).toContainText("line2");

    // Now send via Send button to confirm content wasn't lost
    const sent = page.waitForResponse(
      (res) => res.url().includes("/messages") && res.request().method() === "POST" && res.status() === 201,
    );
    await page.getByRole("button", { name: "Send message" }).click();
    await sent;

    await refreshChannel(page, "general");
    await expect(page.locator("pre").filter({ hasText: "line1" })).toBeVisible();
    await expect(page.locator("pre").filter({ hasText: "line2" })).toBeVisible();
  });

  test("VS Code paste creates code block with language", async ({ page, testWorkspace }) => {
    await setupMockAuth(page);
    await page.goto(`/w/${testWorkspace.slug}`);
    await page.getByText("# general").click();
    await expect(page.locator(".tiptap")).toBeVisible();
    const editor = page.locator(".tiptap");
    const ts = Date.now();

    await editor.click();

    // Simulate VS Code paste: dispatch a ClipboardEvent with vscode-editor-data
    const codeText = `const x: number = ${ts};`;
    await page.evaluate((text) => {
      const editorEl = document.querySelector(".tiptap");
      if (!editorEl) throw new Error("Editor not found");
      const dt = new DataTransfer();
      dt.setData("text/plain", text);
      dt.setData("vscode-editor-data", JSON.stringify({ mode: "typescriptreact" }));
      const event = new ClipboardEvent("paste", {
        clipboardData: dt,
        bubbles: true,
        cancelable: true,
      });
      editorEl.dispatchEvent(event);
    }, codeText);

    // Verify a code block was inserted in the editor
    await expect(editor.locator("pre")).toBeVisible();
    await expect(editor).toContainText(String(ts));

    // Send it
    const sent = page.waitForResponse(
      (res) => res.url().includes("/messages") && res.request().method() === "POST" && res.status() === 201,
    );
    await page.getByRole("button", { name: "Send message" }).click();
    await sent;

    await refreshChannel(page, "general");

    // The message should render as a code block
    await expect(page.locator("pre").filter({ hasText: String(ts) })).toBeVisible();
  });

  test("close link dialog without saving restores editor focus", async ({ page, testWorkspace }) => {
    await setupMockAuth(page);
    await page.goto(`/w/${testWorkspace.slug}`);
    await page.getByText("# general").click();
    await expect(page.locator(".tiptap")).toBeVisible();
    const editor = page.locator(".tiptap");

    await editor.click();
    await page.keyboard.type("some text");
    await editor.click({ clickCount: 3 });

    // Open link dialog
    await page.locator("button").filter({ hasText: "🔗" }).click();
    await expect(page.getByTestId("link-dialog-url")).toBeVisible();

    // Close without saving by pressing Escape
    await page.keyboard.press("Escape");

    // Link dialog should be closed
    await expect(page.getByTestId("link-dialog-url")).not.toBeVisible();

    // Editor should regain focus — type to verify
    await page.keyboard.type(" appended");
    await expect(editor).toContainText("appended");
  });

  test("showcase: channel with rich markdown messages", async ({ page, testWorkspace }) => {
    const channel = await testWorkspace.api.getChannelByName("general");
    const [alice, bob] = await Promise.all([
      addMemberViaInvite(testWorkspace.api, SHOWCASE_ALICE, testWorkspace.slug),
      addMemberViaInvite(testWorkspace.api, SHOWCASE_BOB, testWorkspace.slug),
    ]);

    // Seed messages covering various markdown types
    await alice.createMessage(channel.id, "Hey team! **Welcome to the new project channel** 🎉");
    await bob.createMessage(channel.id, "Thanks Alice! Here's the *initial setup* we discussed:");
    await alice.createMessage(channel.id, "```ts\nfunction greet(name: string) {\n  return `Hello, ${name}!`;\n}\n```");
    await bob.createMessage(channel.id, "> The best code is no code at all.\n\nWise words to live by.");
    await alice.createMessage(channel.id, "Here's our task list:\n- Set up CI pipeline\n- Write unit tests\n- Deploy to staging");
    await bob.createMessage(channel.id, "Sprint priorities:\n1. Fix the ~~login bug~~ authentication flow\n2. Add `dark mode` support\n3. Update API docs");
    await alice.createMessage(channel.id, "Check out the docs at [OpenSlaq Guide](https://example.com/guide)");
    await bob.createMessage(channel.id, "Looks great! Let's ship it 🚀");

    await setupMockAuth(page, { id: SHOWCASE_ALICE.userId, displayName: SHOWCASE_ALICE.displayName, email: SHOWCASE_ALICE.email });
    await page.goto(`/w/${testWorkspace.slug}`);
    await page.getByText("# general").click();

    // Wait for messages to load
    await expect(page.getByText("Welcome to the new project channel")).toBeVisible();
    await expect(page.getByText("Let's ship it")).toBeVisible();
    // Wait for Shiki code blocks to render (async highlighting)
    await expect(page.locator("pre.shiki").first()).toBeVisible({ timeout: 15000 });

    await page.screenshot({ path: "test-results/channel-rich-text.png" });
  });
});
