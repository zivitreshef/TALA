# Hebrew RTL Formatting Rule

Whenever you write responses or sections in Hebrew to the user:
1. Always align the Hebrew text to the right (`dir="rtl"` and right-aligned) by wrapping your Hebrew response content in `<div dir="rtl" align="right">` ... `</div>`.
2. Ensure lists, headings, and paragraphs in Hebrew are inside the `<div dir="rtl" align="right">` container so they render right-to-left and aligned to the right.
