import joplin from 'api';
import { ContentScriptType, ToolbarButtonLocation } from 'api/types';

// Escape text so it can be safely placed inside HTML attributes / textarea
const escapeHtml = (text: string): string =>
	text
		.replace(/&/g, '&amp;')
		.replace(/</g, '&lt;')
		.replace(/>/g, '&gt;')
		.replace(/"/g, '&quot;');

// Dialog texts. The language comes from Joplin's own `locale` setting.
// English is the fallback; add a language by adding an entry here.
const dialogStrings = {
	en: { title: 'Title', content: 'Content', defaultTitle: 'Spoiler', defaultBody: 'Content' },
	ru: { title: 'Заголовок', content: 'Содержимое', defaultTitle: 'Спойлер', defaultBody: 'Содержимое' },
};

const getDialogStrings = async () => {
	try {
		const locale = String((await joplin.settings.globalValue('locale')) || 'en').toLowerCase();
		return locale.startsWith('ru') ? dialogStrings.ru : dialogStrings.en;
	} catch (error) {
		return dialogStrings.en;
	}
};

joplin.plugins.register({
	onStart: async function() {

		// Dialog for entering title and body of a new spoiler block
		const dialogHandle = await joplin.views.dialogs.create('spoiler_block_dialog');

		// Spoiler block command
		await joplin.commands.register({
			name: 'insert_spoiler_block',
			label: 'Spoiler block',
			iconName: 'fas fa-eye-slash',
			execute: async () => {

				// If the user selected text, prefill the body with it
				const selectedText = (await joplin.commands.execute('selectedText') as string) || '';

				const t = await getDialogStrings();

				await joplin.views.dialogs.setHtml(dialogHandle, `
					<div class="wrap">
						<form name="spoiler">
							<label class="field-label" for="title">${t.title}</label>
							<input type="text" id="title" name="title" value="${escapeHtml(t.defaultTitle)}" autofocus />
							<label class="field-label" for="body">${t.content}</label>
							<textarea id="body" name="body">${escapeHtml(selectedText)}</textarea>
						</form>
					</div>
					<style>
						/* Joplin sizes the dialog by #joplin-plugin-content, so the width
						   is set on it and the padding lives INSIDE it (padding on body
						   is not measured, which is what clipped the fields before). */
						#joplin-plugin-content { min-width: 520px; }
						.wrap { padding: 16px; box-sizing: border-box; }
						form { display: flex; flex-direction: column; gap: 6px; }
						.field-label { font-size: 12px; opacity: 0.65; margin-top: 6px; }
						input, textarea {
							width: 100%;
							box-sizing: border-box;
							margin: 0;
							font: inherit;
							padding: 7px 9px;
							color: inherit;
							background: transparent;
							border: 1px solid rgba(128, 128, 128, 0.45);
							border-radius: 5px;
							outline: none;
						}
						input:focus, textarea:focus { border-color: rgba(128, 128, 128, 0.95); }
						textarea { height: 170px; resize: none; display: block; }
					</style>
				`);

				await joplin.views.dialogs.setButtons(dialogHandle, [
					{ id: 'ok' },
					{ id: 'cancel' },
				]);

				const result = await joplin.views.dialogs.open(dialogHandle);
				if (result.id !== 'ok') return;

				const form = result.formData?.spoiler || {};

				// Title must be one line, body must not be empty (the parser needs it)
				const title = (form.title || t.defaultTitle).replace(/\s*\n\s*/g, ' ').trim() || t.defaultTitle;
				const body = (form.body || '').trim() || t.defaultBody;

				const spoilerText = `:[\n${title}\n\n${body}\n\n]:`;
				if (selectedText) {
					// Remove the selected text first; its content is already in the dialog
					await joplin.commands.execute('replaceSelection', '');
				}
				await joplin.commands.execute('insertText', spoilerText);
			}
		});


		// Toolbar button and keyboard shortcut for the spoiler block
		await joplin.views.toolbarButtons.create('insert_spoiler_block', 'insert_spoiler_block', ToolbarButtonLocation.EditorToolbar);

		await joplin.views.menus.create('spoiler_block', 'Insert spoiler block', [
			{
				commandName: 'insert_spoiler_block',
				accelerator: 'Ctrl+Alt+P'
			}
		]);

		// Register the Markdown-it plugin (renders the spoiler blocks)
		await joplin.contentScripts.register(
			ContentScriptType.MarkdownItPlugin,
			'Spoilers',
			'./spoilers.js'
		);
	},
});
