# Joplin Plugin - Spoilers blocks

> **This is a fork.** The original plugin, *Spoilers* by Martin Korelič
> ([martinkorelic/joplin-plugin-spoilers](https://github.com/martinkorelic/joplin-plugin-spoilers)),
> is MIT licensed. This fork removes inline spoilers, keeps only the spoiler block,
> and changes its look and the way it is inserted.

This Joplin plugin adds spoiler blocks: a title that expands to show an extendable body.
The block adapts to light and dark themes.

**Note**: Requires Joplin 2.9+. Tested with Joplin 3.7.

![Spoiler blocks, collapsed and expanded](https://github.com/agteamdev/joplin-plugin-spoiler-blocks/blob/main/docs/spoilers-blocks-preview.png)

## Installation

- Download `joplin.plugin.spoiler.blocks.jpl` from the releases page
- In Joplin open `Tools > Options > Plugins > Install from file` and select the file
- Restart Joplin

### Uninstall

- Open Joplin and navigate to `Tools > Options > Plugins`
- Find `Spoilers blocks`, press `Delete` to remove it or `Disable` to turn it off
- Restart Joplin

## Usage

### Spoiler block

To create a spoiler block, you can:
- press the `Spoiler block` button in the editor toolbar, or
- use the shortcut `Ctrl + Alt + P`

A dialog opens with two fields: **Title** and **Content**. If you selected text
before opening it, the selection is placed into the Content field and replaced when you insert.
After insertion you can edit the block directly in the note.

You can also write the block by hand in this format:

```
:[
Spoiler title here...

Spoiler body text here...

]:
```

The empty line above and below the body is **required**.
The title and body support Markdown formatting.

**Example**:
````
:[
3 ways to check if an Object has a property in JS

Using:
1. `hasOwnProperty()` method
2. `in` operator
3. Comparing with `undefined`
* * *
1) `hasOwnProperty()`
~~~js
const hero = {
  name: 'Batman'
};

hero.hasOwnProperty('toString'); // => false
~~~

]:
````

### Editing and the Rich Text editor

- **Markdown view and preview**: click the title to expand or collapse the block.
- **Rich Text editor**: blocks are always shown expanded.
- To change a block, edit its text in the Markdown editor (the lines between `:[` and `]:`).

## Custom styles

To change the look of the blocks, add the following to your `userstyle.css`:

```css
/* The whole block */
.spoiler-block {}

/* The clickable title row */
.summary-title {}

/* The expandable body */
.summary-content {}
```

### Exporting and printing

When printing or exporting, blocks are shown expanded and the arrow is hidden.
To change this, use the following in your `userstyle.css`:

```css
@media print {

  /* Hides the arrow in the title */
  .summary-title::before {
    content: "";
  }

  /* Shows the body contents */
  .summary-content {
    display: block;
    animation: none;
  }

}
```

## Changes from the original plugin

- Inline spoilers (`%%spoiler%%`) are removed.
- The block is restyled: smaller, with colours that follow the Joplin theme.
- A dialog for the title and content opens on insertion.
- The plugin is renamed to `Spoilers blocks` with the id `joplin.plugin.spoiler.blocks`.

Existing blocks in the `:[ ]:` format keep working.

## Credits

- Original plugin: Martin Korelič, MIT license.
- Fork and changes: agteamdev.

## Notes

- **There might be bugs**. Report them in the [issues of this repository](https://github.com/agteamdev/joplin-plugin-spoiler/issues).
